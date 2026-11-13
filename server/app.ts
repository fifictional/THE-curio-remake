/**
 * App factory — routes with no listener attached, so tests can call
 * `app.request(...)` without opening a port.
 *
 * The data client is injected: `postgres-data.ts` in dev/production,
 * `fake-data.ts` in tests.
 */

import { Hono } from 'hono';

import type { HonoDataClient } from './data-client';
import { createFakeDataClient, type RecordedCall } from './fake-data';
import { createMessagesRoute } from './routes/messages';
import { createMoveChatRoute } from './routes/move-chat';
import type { HonoEnv } from './types';

export function createApp(injectedClient?: HonoDataClient) {
  const calls: RecordedCall[] = [];
  const client = injectedClient ?? createFakeDataClient(calls);

  const app = new Hono<HonoEnv>();

  // Stand-in for the old auth-identity middleware. Replaced by Better Auth.
  app.use('*', async (c, next) => {
    c.set('identity', null);
    c.set('invocationType', 'direct');
    c.set('requestId', crypto.randomUUID());
    await next();
  });

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
