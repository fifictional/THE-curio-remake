/**
 * EventBridge scheduled / cron → Hono adapter.
 *
 * Handles two cron shapes that target Hono-Heavy's `batchCreator` route:
 *
 *   1. Standard EventBridge scheduled event (`source: aws.events`,
 *      `detail-type: Scheduled Event`) — body is `event.detail`.
 *
 *   2. Custom EventBridge target input used by `chatSummaryRule` in
 *      `backend.ts` — entire event is `{ arguments: { jobType, jobName? } }`.
 *
 * Both are routed to `POST /__cron/batch-creator` with a JSON body of the
 * batch-creator arguments object.
 *
 * Cron errors return HTTP 200 with structured `{ success: false, error }` so
 * EventBridge does not retry indefinitely (see error-boundary cron semantics).
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.3 P1-3.
 */

import type { Hono } from 'hono';
import type { Context } from 'aws-lambda';
import type { ScheduledEvent } from './event-discriminator';
import type { BatchCreatorCronEvent } from './event-discriminator';
import type { HonoEnv } from './types';

export type CronLikeEvent = ScheduledEvent | BatchCreatorCronEvent;

function extractCronBody(event: CronLikeEvent): Record<string, unknown> {
  if ('source' in event && event['detail-type'] === 'Scheduled Event') {
    const detail = event.detail;
    if (detail && typeof detail === 'object' && 'arguments' in detail) {
      const args = (detail as { arguments?: unknown }).arguments;
      if (args && typeof args === 'object') {
        return args as Record<string, unknown>;
      }
    }
    return (detail && typeof detail === 'object' ? detail : {}) as Record<string, unknown>;
  }

  if ('arguments' in event) {
    const args = event.arguments;
    return (args && typeof args === 'object' ? args : {}) as Record<string, unknown>;
  }

  return {};
}

export function scheduledAdapter(app: Hono<HonoEnv>) {
  return async (event: CronLikeEvent, context: Context): Promise<unknown> => {
    const path = '/__cron/batch-creator';
    const url = `https://hono-internal.local${path}`;
    const body = extractCronBody(event);

    const request = new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-invocation-type': 'cron',
        'x-aws-request-id': context.awsRequestId,
      },
      body: JSON.stringify(body),
    });

    let response: Response;
    try {
      response = await app.fetch(request, {});
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Hono app threw during cron dispatch to ${path}: ${message}`,
      };
    }

    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text().catch(() => '');
    }

    if (response.status >= 400) {
      if (responseBody && typeof responseBody === 'object' && 'error' in responseBody) {
        return {
          ...(responseBody as Record<string, unknown>),
          success: false,
        };
      }
      return {
        success: false,
        error: `Hono route ${path} returned status ${response.status}`,
      };
    }

    return responseBody;
  };
}
