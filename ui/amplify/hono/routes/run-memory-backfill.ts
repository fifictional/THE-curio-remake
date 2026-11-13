/**
 * `runMemoryBackfill` mutation route — P2-6.
 *
 * Source: `amplify/functions/memory-backfill/handler.ts` (42 LOC).
 *
 * Migration parity:
 *   - **Memory-disabled short-circuit** preserved — returns `{success:true,
 *     skipped:true, gapsCreated:0, masteredCreated:0}` without invoking the
 *     backfill when the user has memory disabled.
 *   - **Happy path** delegates to `runQuizHistoryBackfill(client, memory, userUuid)`
 *     from `@ai-memory/index` — same helper as the original Lambda.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1498-1510`):
 *
 *   runMemoryBackfill(userUuid: ID!): {
 *     success: Boolean!, skipped: Boolean,
 *     gapsCreated: Int, masteredCreated: Int,
 *   }
 *
 * Same security gap as clearUserMemory (no caller-vs-target identity check) —
 * preserved deliberately to match existing handler. See route header of
 * `clear-user-memory.ts` for full rationale.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.4 P2-6.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { MemoryService, runQuizHistoryBackfill } from '@ai-memory/index';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const RunMemoryBackfillArgs = z.object({
  userUuid: z.string().min(1, 'userUuid is required'),
});

export interface RunMemoryBackfillRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createRunMemoryBackfillRoute(
  client: HonoDataClient,
): RunMemoryBackfillRoute {
  const validate = validateBody(RunMemoryBackfillArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { userUuid } = getValidatedBody<typeof RunMemoryBackfillArgs>(c);

    const memory = new MemoryService(client);

    if (!(await memory.isMemoryEnabledForUser(userUuid))) {
      return c.json({
        success: true,
        skipped: true,
        gapsCreated: 0,
        masteredCreated: 0,
      });
    }

    const result = await runQuizHistoryBackfill(client, memory, userUuid);
    const consolidated = await memory.consolidateBlocksForOwner(userUuid);
    return c.json({
      success: true,
      skipped: result.skipped,
      gapsCreated: result.gapsCreated,
      masteredCreated: result.masteredCreated,
      removedDuplicates: consolidated.removedDuplicates,
      resolvedCrossCategory: consolidated.resolvedCrossCategory,
    });
  };

  return { validate, handler };
}
