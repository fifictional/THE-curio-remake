/**
 * `enqueueMemoryEvent` mutation route — P2-3.
 *
 * Source: `amplify/functions/enqueue-memory-event/handler.ts` (33 LOC).
 *
 * Migration parity:
 *   - **Identity check preserved exactly** — the existing handler enforces
 *     `parsed.ownerUuid === userUuid` (the userUuid arg must match the
 *     payload's owner). This is the consistency check called out by §10.4
 *     P2-3; we mirror it byte-for-byte rather than tightening to a
 *     Cognito-identity match (that would be a separate behaviour change).
 *   - **Memory-disabled short-circuit preserved** — when the user has memory
 *     disabled, returns `{success:true, skipped:true}` WITHOUT publishing.
 *   - **SQS publish path** — uses `publishMemoryEvent` from `@ai-memory/index`,
 *     same import as the original. The queue URL is supplied via
 *     `MEMORY_REFLECTION_QUEUE_URL` env var (added to Hono-Light in
 *     `amplify/backend.ts` alongside the existing `memoryQueue.grantSendMessages`
 *     IAM grant).
 *
 * AppSync field shape (from `amplify/data/resource.ts:1462-1473`):
 *
 *   enqueueMemoryEvent(userUuid: ID!, payload: String!): { success: Boolean!, skipped: Boolean }
 *
 * `payload` is a JSON-encoded `MemoryQueueEvent` (string at the GraphQL
 * boundary, parsed inside the route).
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-3.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { MemoryService, publishMemoryEvent, type MemoryQueueEvent } from '@ai-memory/index';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const EnqueueMemoryEventArgs = z.object({
  userUuid: z.string().min(1, 'userUuid is required'),
  payload: z.string().min(1, 'payload is required'),
});

export interface EnqueueMemoryEventRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createEnqueueMemoryEventRoute(
  client: HonoDataClient,
): EnqueueMemoryEventRoute {
  const validate = validateBody(EnqueueMemoryEventArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid, payload } = getValidatedBody<typeof EnqueueMemoryEventArgs>(c);

    const memory = new MemoryService(client);
    if (!(await memory.isMemoryEnabledForUser(userUuid))) {
      return c.json({ success: true, skipped: true });
    }

    // JSON.parse may throw on malformed payload — errorBoundary catches and
    // returns invocation-type-appropriate response.
    const parsed = JSON.parse(payload) as MemoryQueueEvent;

    // Identity-consistency check: caller-supplied userUuid MUST match the
    // payload's ownerUuid. Preserves existing handler behaviour exactly; do
    // NOT tighten or relax during migration.
    if (parsed.ownerUuid !== userUuid) {
      throw new Error('ownerUuid must match authenticated user');
    }

    await publishMemoryEvent(parsed);
    return c.json({ success: true, skipped: false });
  };

  return { validate, handler };
}
