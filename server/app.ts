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
import { createAiChatRoute, type AiChatDeps } from './routes/ai-chat';
import { createRagRoutes } from './routes/rag';
import { handleDbRequest, modelCount } from './routes/db';
import { deleteFile, downloadFile, uploadFile } from './routes/files';
import { createDocument, createDocumentValidate } from './routes/documents';
import { limits } from './middleware/rate-limit';
import { requireAuth } from './middleware/require-auth';
import { deleteAccount, exportAccount } from './routes/account';
import type { HonoEnv } from './types';

export interface AppOptions {
  /** Resolve a Better Auth session per request. Disabled in unit tests. */
  auth?: boolean;
  /** Build the data client for this request. Defaults to the in-memory fake. */
  clientFactory?: (userId: string | null) => HonoDataClient;
  /** Retrieval seam for /aiChat. Tests inject chunks; production uses Qdrant. */
  aiChat?: AiChatDeps;
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

  // Password guessing is the one auth risk we can throttle without touching the
  // auth library: cap the credential endpoints per IP, leave session reads alone.
  for (const path of [
    '/api/auth/sign-in/email',
    '/api/auth/sign-up/email',
    '/api/auth/request-password-reset',
    '/api/auth/reset-password',
  ]) {
    app.use(path, limits.auth);
  }

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

  /**
   * Dev-only relay for browser errors from the legacy UI.
   *
   * Requires a session: an unauthenticated logging endpoint is free storage for
   * anyone who finds it. Pre-login errors simply are not relayed.
   */
  app.post('/log', async (c) => {
    if (!c.var.identity) return c.json({ error: 'Not signed in' }, 401);
    const body = await c.req.json().catch(() => ({}));
    const text = JSON.stringify(body).slice(0, 4000);
    console.error('[browser]', text);
    return c.json({ ok: true });
  });

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
  app.get('/messages', requireAuth, messagesRoute.list);
  app.post('/messages', requireAuth, messagesRoute.createValidate, messagesRoute.create);

  const moveChat = createMoveChatRoute();
  app.post('/moveChat', requireAuth, moveChat.validate, moveChat.handler);

  const aiChat = createAiChatRoute(opts.aiChat);
  app.post('/aiChat', limits.aiChat, requireAuth, aiChat.validate, aiChat.handler);

  // Local object storage + document creation (the S3 + pipeline replacement).
  app.post('/files', requireAuth, limits.upload, uploadFile);
  app.get('/files', requireAuth, downloadFile);
  app.delete('/files', requireAuth, deleteFile);
  app.post('/documents', requireAuth, createDocumentValidate, createDocument);
  // Same handler under the API prefix: the new UI's own routes include
  // `/documents/<uuid>`, so its dev proxy cannot forward that prefix wholesale.
  app.post('/api/documents', requireAuth, createDocumentValidate, createDocument);

  /*
   * The bridge answers anonymous callers itself, with `{data: []}`: several
   * legacy hooks run before the session resolves and read `response.data.length`
   * without checking the status, so a differently shaped 401 crashes the shell.
   * That is why this one route deliberately has no `requireAuth`.
   */
  app.post('/db', handleDbRequest);
  app.get('/db/health', (c) => c.json({ ok: true, models: modelCount }));

  app.get('/account/export', requireAuth, exportAccount);
  app.delete('/account', requireAuth, limits.account, deleteAccount);

  const rag = createRagRoutes();
  app.get('/rag/search', limits.ragSearch, requireAuth, rag.search);
  app.post('/rag/reindex', limits.ragReindex, requireAuth, rag.reindex);

  return { app, calls };
}
