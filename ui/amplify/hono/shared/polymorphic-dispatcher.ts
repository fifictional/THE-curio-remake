/**
 * Polymorphic Lambda handler for Hono apps.
 *
 * Each Hono Lambda (Light, Heavy, Neptune) exposes a single `handler` that
 * receives one of three event shapes:
 *
 *   - AppSyncResolverEvent  (from a GraphQL resolver)
 *   - EventBridge scheduled (cron — only Hono-Heavy hosts `batchCreator`)
 *   - Direct-invoke payload (from ProcessDocument dispatcher per PF-1)
 *
 * This dispatcher classifies the event, picks the right adapter, and
 * forwards. Unknown event shapes are logged and rejected with a structured
 * error.
 *
 * See `docs/2026-05-27-amplify-to-hono-migration-plan.md` §10.3 P1-15.
 */

import type { Hono } from 'hono';
import type { Context, Handler } from 'aws-lambda';
import {
  isAppSyncEvent,
  isScheduledEvent,
  isDirectInvoke,
  isBatchCreatorCronEvent,
  classifyEvent,
} from './event-discriminator';
import { appsyncAdapter } from './hono-appsync-adapter';
import { directInvokeAdapter } from './hono-direct-invoke-adapter';
import { scheduledAdapter } from './hono-scheduled-adapter';
import { withSentryLambdaHandler } from './sentry';
import type { HonoEnv } from './types';

/**
 * Build a polymorphic Lambda handler from a Hono app. The returned function
 * is the `handler` to export from each Lambda's entry file.
 *
 * The handler is wrapped with `withSentryLambdaHandler` (P1-8) which:
 *   - Calls `initLambdaSentry()` once at module load — pulls DSN/release/env
 *     from the same env vars as every other Lambda in the codebase.
 *   - Wraps the dispatcher with `Sentry.wrapHandler` for auto-tracing and
 *     fallback exception capture if anything escapes Hono's error boundary.
 *
 * Enriched per-route capture (route, identity, invocationType tags) happens
 * inside `errorBoundary` via `captureHonoException`, so most errors get the
 * better-tagged path.
 *
 * The cron adapter (P1-3) routes EventBridge scheduled events and the
 * batchCreator custom cron payload to `/__cron/batch-creator`.
 */
export function buildPolymorphicHandler(app: Hono<HonoEnv>): Handler<unknown, unknown> {
  const appsync = appsyncAdapter(app);
  const direct = directInvokeAdapter(app);
  const scheduled = scheduledAdapter(app);

  const dispatcher: Handler<unknown, unknown> = async (event: unknown, context: Context): Promise<unknown> => {
    if (isAppSyncEvent(event)) {
      return appsync(event, context);
    }
    if (isDirectInvoke(event)) {
      return direct(event, context);
    }
    if (isScheduledEvent(event) || isBatchCreatorCronEvent(event)) {
      return scheduled(event, context);
    }

    const keys =
      event && typeof event === 'object' ? Object.keys(event as object) : null;
    console.error(
      JSON.stringify({
        level: 'error',
        msg: 'hono.dispatcher.unknown-event-shape',
        classification: classifyEvent(event),
        keys,
        requestId: context.awsRequestId,
      }),
    );

    // AppSync treats a returned object as a successful resolver result. Throw so
    // GraphQL surfaces an error instead of silently returning `{ success: false }`
    // on mutations like runMemoryBackfill / deleteUser.
    if (event && typeof event === 'object') {
      const e = event as Record<string, unknown>;
      if (typeof e.fieldName === 'string' || typeof e.typeName === 'string') {
        throw new Error(
          `Unrecognized AppSync handler event for field "${String(e.fieldName ?? 'unknown')}"`,
        );
      }
    }

    return {
      success: false,
      error:
        'Unknown event shape — expected AppSync resolver, EventBridge scheduled, or direct-invoke',
    };
  };

  return withSentryLambdaHandler(dispatcher);
}
