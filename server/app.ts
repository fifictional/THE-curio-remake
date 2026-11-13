/**
 * App factory — routes with no listener attached, so tests can call
 * `app.request(...)` without opening a port.
 *
 * The data client is injected: `postgres-data.ts` in dev/production,
 * `fake-data.ts` in tests.
 */

import { Hono } from 'hono';

import { auth } from './auth';
import type { HonoDataClient } from './data-client';
import { createFakeDataClient, type RecordedCall } from './fake-data';
import { createMessagesRoute } from './routes/messages';
import { createMoveChatRoute } from './routes/move-chat';
import type { HonoEnv } from './types';

export interface AppOptions {
  /** Resolve a Better Auth session per request. Disabled in unit tests. */
  auth?: boolean;
}

export function createApp(injectedClient?: HonoDataClient, opts: AppOptions = {}) {
  const authEnabled = opts.auth ?? true;
  const calls: RecordedCall[] = [];
  const client = injectedClient ?? createFakeDataClient(calls);

  const app = new Hono<HonoEnv>();

  app.use('*', async (c, next) => {
    c.set('invocationType', 'direct');
    c.set('requestId', crypto.randomUUID());

    if (!authEnabled) {
      c.set('identity', null);
      await next();
      return;
    }

    // Replaces the old AppSync identity: a Better Auth session cookie.
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    c.set(
      'identity',
      session
        ? { sub: session.user.id, email: session.user.email, name: session.user.name }
        : null,
    );
    await next();
  });

  // Better Auth endpoints: /api/auth/sign-up/email, /sign-in/email, /sign-out, /get-session
  app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  app.onError((err, c) => {
    console.error('[server] route error:', err.message);
    return c.json({ success: false, error: err.message }, 500);
  });

  app.get('/__hello', (c) =>
    c.json({
      success: true,
      runtime: 'node',
      dataClient: injectedClient ? 'injected' : 'fake',
      invocationType: c.var.invocationType,
      requestId: c.var.requestId,
    }),
  );

  app.get('/me', (c) => {
    const identity = c.var.identity as
      | { sub: string; email?: string; name?: string | null }
      | null;
    if (!identity) return c.json({ authenticated: false }, 401);
    return c.json({ authenticated: true, user: identity });
  });

  app.get('/__calls', (c) => c.json(calls));

  app.post('/__reset', (c) => {
    calls.length = 0;
    return c.json({ success: true, cleared: true });
  });

  const messagesRoute = createMessagesRoute(client);
  app.get('/messages', messagesRoute.list);
  app.post('/messages', messagesRoute.createValidate, messagesRoute.create);

  const moveChat = createMoveChatRoute(client);
  app.post('/moveChat', moveChat.validate, moveChat.handler);

  return { app, calls };
}
