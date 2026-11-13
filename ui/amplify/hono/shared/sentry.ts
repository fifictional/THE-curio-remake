import type { Context } from 'hono';
import * as Sentry from '@sentry/aws-serverless';

import {
  initLambdaSentry,
  withSentryLambdaHandler,
} from '../../functions/common/sentry-lambda';

import type { HonoEnv } from './types';

/**
 * Sentry integration for Hono Lambdas.
 *
 * Re-uses the existing project-wide pattern in
 * `amplify/functions/common/sentry-lambda.ts` (init + `Sentry.wrapHandler`)
 * so behaviour, sample rates, and PII redaction stay identical to the 22
 * existing Lambdas.
 *
 * Why a thin wrapper rather than a Hono middleware?
 *  - The existing pattern wraps the outermost Lambda handler so it captures
 *    even errors that escape Hono's error boundary (defensive).
 *  - Hono's error-boundary middleware catches and formats errors, which means
 *    they never propagate up to `wrapHandler` — so we explicitly call
 *    `captureHonoException` from within the error boundary to enrich captures
 *    with Hono route context (`route`, `invocationType`, `requestId`, user).
 *
 * Net effect: every unhandled exception either (a) is caught by error-boundary
 * and explicitly reported via `captureHonoException`, or (b) escapes Hono and
 * is auto-reported by `Sentry.wrapHandler` with vanilla context.
 */

export { initLambdaSentry, withSentryLambdaHandler };

/**
 * Capture an exception with Hono route context attached.
 *
 * No-op when Sentry is not initialised (e.g. local sandbox without
 * `SENTRY_DSN`). Errors thrown by Sentry itself are swallowed to avoid masking
 * the underlying handler error.
 */
export function captureHonoException(err: unknown, c: Context<HonoEnv>): void {
  try {
    if (!process.env.SENTRY_DSN) return;

    Sentry.withScope((scope) => {
      scope.setTag('invocation_type', c.var.invocationType);
      scope.setTag('hono_route', c.req.path);
      scope.setTag('hono_method', c.req.method);
      scope.setTag('request_id', c.var.requestId);

      const userId = extractUserId(c.var.identity);
      if (userId) {
        scope.setUser({ id: userId });
      }

      const fieldName = c.req.header('x-appsync-field');
      if (fieldName) {
        scope.setTag('appsync_field', fieldName);
      }

      Sentry.captureException(err);
    });
  } catch (sentryErr) {
    console.error('[sentry] captureHonoException failed', sentryErr);
  }
}

function extractUserId(identity: HonoEnv['Variables']['identity']): string | undefined {
  if (!identity || typeof identity !== 'object') return undefined;
  if ('sub' in identity && typeof (identity as { sub?: unknown }).sub === 'string') {
    return (identity as { sub: string }).sub;
  }
  return undefined;
}
