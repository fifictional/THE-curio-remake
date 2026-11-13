/**
 * `batchCreator` mutation route — P3-9.
 *
 * Source: `amplify/functions/batch-processor/batch-creator/handler.ts`
 * Core logic: `run-batch-creator.ts`.
 *
 * AppSync: `POST /batchCreator`
 * EventBridge cron (via scheduled adapter): `POST /__cron/batch-creator`
 *
 * Side-effect job creator imports live in `hono/batch-creator-side-effects.ts`
 * and MUST be loaded from `hono-heavy/index.ts` before the Hono app starts.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-9.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { runBatchCreator } from '../../functions/batch-processor/batch-creator/run-batch-creator';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const BatchCreatorArgs = z.object({
  // AppSync sends `null` for omitted optional GraphQL args — use nullish(), not optional().
  jobType: z.string().nullish(),
  jobName: z.string().nullish(),
});

export interface BatchCreatorRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createBatchCreatorRoute(
  client: HonoDataClient,
  queueUrl: () => string = () => process.env.BATCH_QUEUE_URL || '',
): BatchCreatorRoute {
  const validate = validateBody(BatchCreatorArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const raw = getValidatedBody<typeof BatchCreatorArgs>(c);
    const input = {
      jobType: raw.jobType ?? undefined,
      jobName: raw.jobName ?? undefined,
    };
    const result = await runBatchCreator(client, input, {
      queueUrl: queueUrl(),
    });
    return c.json(result);
  };

  return { validate, handler };
}
