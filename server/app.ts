/**
 * App factory — routes with no listener attached, so tests can call
 * `app.request(...)` without opening a port.
 *
 * Two injected seams:
 *   - `clientFactory(userId)` builds the data client per request, so the
 *     Postgres implementation can scope queries to the signed-in user (RLS).
 *   - `auth` can be disabled for unit tests, which keeps them hermetic.
 */

import { Hono } from 'hono';

import { auth } from './auth';
import { createFakeDataClient, type RecordedCall } from './fake-data';
import type { HonoDataClient } from './data-client';
import { createMessagesRoute } from './routes/messages';
import { createMoveChatRoute } from './routes/move-chat';
import { createAiChatRoute } from './routes/ai-chat';
import { createRagRoutes } from './routes/rag';
import type { HonoEnv } from './types';

export interface AppOptions {
  /** Resolve a Better Auth session per request. Disabled in unit tests. */
  auth?: boolean;
  /** Build the data client for this request. Defaults to the in-memory fake. */
  clientFactory?: (userId: string | null) => HonoDataClient;
}

export function createApp(opts: AppOptions = {}) {
  const authEnabled = opts.auth ?? true;
  const calls: RecordedCall[] = [];

  const app = new Hono<HonoEnv>();

  app.use('*', async (c, next) => {
    c.set('invocationType', 'direct');
    c.set('requestId', crypto.randomUUID());

    let userId: string | null = null;

    if (!authEnabled) {
      // Tests only: a header stands in for a session cookie.
      const devUser = c.req.header('x-dev-user');
      c.set('identity', devUser ? { sub: devUser } : null);
    } else {
      // Replaces the old AppSync identity: a Better Auth session cookie.
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (session) {
        userId = session.user.id;
        c.set('identity', {
          sub: session.user.id,
          email: session.user.email,
          name: session.user.name,
        });
      }
    }

    if (!c.var.identity) c.set('identity', null);

    c.set(
      'db',
      opts.clientFactory
        ? opts.clientFactory(userId)
        : createFakeDataClient(calls),
    );

    await next();
  });

  app.onError((err, c) => {
    console.error('[server] route error:', err.message);
    return c.json({ success: false, error: err.message }, 500);
  });

  // Better Auth endpoints: /api/auth/sign-up/email, /sign-in/email, /sign-out, /get-session
  app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw));

  app.get('/__hello', (c) =>
    c.json({
      success: true,
      runtime: 'node',
      invocationType: c.var.invocationType,
      requestId: c.var.requestId,
    }),
  );

  app.get('/__calls', (c) => c.json(calls));

  app.post('/__reset', (c) => {
    calls.length = 0;
    return c.json({ success: true, cleared: true });
  });

  app.get('/me', (c) => {
    const identity = c.var.identity as
      | { sub: string; email?: string; name?: string | null }
      | null;
    if (!identity) return c.json({ authenticated: false }, 401);
    return c.json({ authenticated: true, user: identity });
  });

  const messagesRoute = createMessagesRoute();
  app.get('/messages', messagesRoute.list);
  app.post('/messages', messagesRoute.createValidate, messagesRoute.create);

  const moveChat = createMoveChatRoute();
  app.post('/moveChat', moveChat.validate, moveChat.handler);

  const aiChat = createAiChatRoute();
  app.post('/aiChat', aiChat.validate, aiChat.handler);

  const rag = createRagRoutes();
  app.get('/rag/search', rag.search);
  app.post('/rag/reindex', rag.reindex);

  return { app, calls };
}
