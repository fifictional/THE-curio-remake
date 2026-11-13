import type { MiddlewareHandler } from 'hono';
import type { HonoEnv } from '../types';

/**
 * Structured request logger.
 *
 * Emits one JSON line at request start and one at request end with duration +
 * status. Designed to be picked up cleanly by CloudWatch Logs' built-in JSON
 * parsing (each Hono Lambda is configured with `logging: { format: 'json' }`
 * in its `resource.ts`).
 *
 * Mirrors the prefix-prefixed `console.info(..., { ... })` pattern used by the
 * existing Lambdas (e.g. `ai-chat/handler.ts:79`) but standardises the field
 * names so Logs Insights queries can target every Hono route uniformly.
 *
 * Fields:
 *  - `msg`: `'hono.request.start'` | `'hono.request.finish'`
 *  - `lambda`: from `AWS_LAMBDA_FUNCTION_NAME`
 *  - `route`: Hono path
 *  - `method`: HTTP method
 *  - `invocationType`: appsync | direct | cron
 *  - `requestId`: AWS request id (from auth-identity middleware)
 *  - `userId`: AppSync identity sub if present
 *  - `status`: HTTP status (finish only)
 *  - `durationMs`: elapsed ms (finish only)
 */
export const requestLogger: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const start = Date.now();
  const lambda = process.env.AWS_LAMBDA_FUNCTION_NAME ?? 'unknown';
  const route = c.req.path;
  const method = c.req.method;
  const invocationType = c.var.invocationType;
  const requestId = c.var.requestId;
  const userId = extractUserId(c.var.identity);

  console.info(
    JSON.stringify({
      msg: 'hono.request.start',
      lambda,
      route,
      method,
      invocationType,
      requestId,
      ...(userId ? { userId } : {}),
    }),
  );

  try {
    await next();
  } finally {
    const durationMs = Date.now() - start;
    console.info(
      JSON.stringify({
        msg: 'hono.request.finish',
        lambda,
        route,
        method,
        status: c.res.status,
        durationMs,
        invocationType,
        requestId,
        ...(userId ? { userId } : {}),
      }),
    );
  }
};

function extractUserId(identity: HonoEnv['Variables']['identity']): string | undefined {
  if (!identity) return undefined;
  if (typeof identity === 'object' && identity !== null && 'sub' in identity) {
    const sub = (identity as { sub?: unknown }).sub;
    return typeof sub === 'string' ? sub : undefined;
  }
  return undefined;
}
