/**
 * Hono error handler.
 *
 * Wire via `app.onError(errorBoundary)` (NOT `app.use('*', ...)`).
 *
 * IMPORTANT (gotcha worth its own comment): Hono's compose pipeline catches
 * exceptions thrown by route handlers and middleware **internally** in
 * `dispatch()` and routes them to whatever function is set via `app.onError`.
 * A middleware that does `try { await next() } catch { ... }` will therefore
 * NEVER see those exceptions — they don't propagate up the middleware stack.
 * See `node_modules/hono/dist/compose.js:21-31` + the default
 * `errorHandler` in `hono-base.js:10-17`. This module is the project's
 * replacement for that default.
 *
 * Each of the 3 Hono Lambdas calls `app.onError(errorBoundary)` once so
 * uncaught exceptions in route handlers are converted into structured
 * responses appropriate to the invocation type:
 *
 *   - **AppSync** (`x-invocation-type: appsync`): set HTTP status 500 (so the
 *     AppSync adapter throws and AppSync surfaces a GraphQL error to the
 *     client). Response body: `{ error: <message>, errorName }`.
 *
 *   - **Direct invoke** (`x-invocation-type: direct`): keep status 200 with
 *     `{ success: false, error: <message>, errorName }` payload. The
 *     dispatcher inspects the body to decide retry vs terminal. Re-raising as
 *     a 5xx would just become an "Unhandled" Lambda failure, which the
 *     dispatcher can't differentiate from infrastructure failures.
 *
 *   - **Cron** (`x-invocation-type: cron`): swallow + log only with status 200.
 *     EventBridge would retry on Lambda failure, but for most cron handlers
 *     we'd rather not retry (idempotency is hard); a 200 with structured
 *     error logs gives ops a signal without thrashing.
 *
 * In all cases the original error is logged in JSON-compatible format so
 * CloudWatch Logs Insights can parse it, AND forwarded to Sentry via
 * `captureHonoException` with route + identity context (P1-8). Init of Sentry
 * itself is handled by `withSentryLambdaHandler` wrapping each Lambda entry.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-5.
 */

import type { ErrorHandler } from 'hono';
import { captureHonoException } from '../sentry';
import type { HonoEnv } from '../types';

interface ErrorJson {
  error: string;
  errorName?: string;
  stack?: string;
  route: string;
  requestId?: string;
  invocationType?: string;
}

export const errorBoundary: ErrorHandler<HonoEnv> = (err, c) => {
  const message = err instanceof Error ? err.message : String(err);
  const errorName = err instanceof Error ? err.name : 'UnknownError';
  const stack = err instanceof Error ? err.stack : undefined;

  const invocationType =
    c.req.header('x-invocation-type') ?? c.var.invocationType ?? 'appsync';

  const payload: ErrorJson = {
    error: message,
    errorName,
    stack,
    route: c.req.path,
    requestId: c.req.header('x-aws-request-id') ?? c.var.requestId,
    invocationType,
  };

  console.error(
    JSON.stringify({
      level: 'error',
      msg: 'hono.route.unhandled-error',
      ...payload,
    }),
  );

  captureHonoException(err, c);

  if (invocationType === 'cron') {
    return c.json({ success: false, error: message }, 200);
  }
  if (invocationType === 'direct') {
    return c.json({ success: false, error: message, errorName }, 200);
  }
  return c.json({ error: message, errorName }, 500);
};
