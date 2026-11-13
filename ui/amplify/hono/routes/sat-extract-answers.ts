/**
 * `satExtractAnswers` mutation route — P3-11.
 *
 * Source: `amplify/functions/sat-extract-answers/handler.ts`
 * Core logic: `run-sat-extract-answers.ts`.
 *
 * Business failures return `{ success: false, error, matchedCount: 0 }` with
 * HTTP 200 — the original handler never throws on extraction errors.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1422-1433`):
 *
 *   satExtractAnswers(questionExtractJobUuid: ID!):
 *     { success: Boolean!, matchedCount: Int!, error: String }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-11.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { S3Client } from '@aws-sdk/client-s3';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { createAIClient } from '@ai-client';

import {
  runSatExtractAnswers,
  type SatExtractAnswersDeps,
} from '../../functions/sat-extract-answers/run-sat-extract-answers';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const SatExtractAnswersArgs = z.object({
  questionExtractJobUuid: z.string().min(1, 'questionExtractJobUuid is required'),
});

export interface SatExtractAnswersRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface SatExtractAnswersRouteDeps {
  s3Client?: S3Client;
  cloudwatchClient?: CloudWatchClient;
  createAIClientFn?: SatExtractAnswersDeps['createAIClient'];
  bucketName?: () => string;
}

function resolveBucketName(): string {
  return (
    process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    ''
  );
}

export function createSatExtractAnswersRoute(
  client: HonoDataClient,
  deps: SatExtractAnswersRouteDeps = {},
): SatExtractAnswersRoute {
  const validate = validateBody(SatExtractAnswersArgs);
  const s3Client =
    deps.s3Client ?? new S3Client({ region: process.env.AWS_REGION });
  const cloudwatchClient = deps.cloudwatchClient ?? new CloudWatchClient({});
  const createAIClientFn = deps.createAIClientFn ?? createAIClient;
  const bucketName = deps.bucketName ?? resolveBucketName;

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof SatExtractAnswersArgs>(c);
    const result = await runSatExtractAnswers(client, input, {
      s3Client,
      cloudwatchClient,
      bucketName: bucketName(),
      createAIClient: createAIClientFn,
    });
    return c.json(result);
  };

  return { validate, handler };
}
