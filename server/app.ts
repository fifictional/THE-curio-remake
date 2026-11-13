/**
 * App factory — the Hono app with its routes, with no listener attached.
 *
 * Kept separate from `index.ts` so tests can call `app.request(...)` directly
 * without opening a port (same pattern the repo's own tests use:
 * `amplify/hono/__tests__/*.test.ts` build a Hono app and invoke it in-process).
 */

import { Hono } from 'hono';

import { createFakeDataClient, type RecordedCall } from './fake-data';
import { createMoveChatRoute } from './routes/move-chat';
import type { HonoEnv } from './types';

export function createApp() {
  const calls: RecordedCall[] = [];
  const client = createFakeDataClient(calls);

  const app = new Hono<HonoEnv>();

  // Stand-in for shared/middleware/auth-identity.ts (no AppSync here).
  app.use('*', async (c, next) => {
    c.set('identity', null);
    c.set('invocationType', 'direct');
    c.set('requestId', crypto.randomUUID());
    await next();
  });

  // Stand-in for shared/middleware/error-boundary.ts (same JSON failure shape,
  // without the Sentry dependency).
  app.onError((err, c) => {
    console.error('[server] route error:', err.message);
    return c.json({ success: false, error: err.message }, 500);
  });

  app.get('/__hello', (c) =>
    c.json({
      success: true,
      runtime: 'node (no lambda)',
      invocationType: c.var.invocationType,
      identityPresent: c.var.identity !== null,
      requestId: c.var.requestId,
    }),
  );

  app.get('/__calls', (c) => c.json(calls));

  app.post('/__reset', (c) => {
    calls.length = 0;
    return c.json({ success: true, cleared: true });
  });

  const moveChat = createMoveChatRoute(client);
  app.post('/moveChat', moveChat.validate, moveChat.handler);

  return { app, calls };
}
