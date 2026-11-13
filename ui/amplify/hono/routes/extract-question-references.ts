/**
 * `extractQuestionReferences` mutation route — P3-10.
 *
 * Source: `amplify/functions/extract-question-references/handler.ts`
 * Core logic: `run-extract-question-references.ts`.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1410-1421`):
 *
 *   extractQuestionReferences(questionExtractJobUuid: ID!, questionUuids: [ID]):
 *     { success: Boolean!, processedCount: Int! }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-10.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { runExtractQuestionReferences } from '../../functions/extract-question-references/run-extract-question-references';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const ExtractQuestionReferencesArgs = z.object({
  questionExtractJobUuid: z.string().min(1, 'questionExtractJobUuid is required'),
  questionUuids: z.array(z.string()).optional(),
});

export interface ExtractQuestionReferencesRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

function resolveBucketName(): string {
  return (
    process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    ''
  );
}

export function createExtractQuestionReferencesRoute(
  client: HonoDataClient,
  bucketName: () => string = resolveBucketName,
): ExtractQuestionReferencesRoute {
  const validate = validateBody(ExtractQuestionReferencesArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof ExtractQuestionReferencesArgs>(c);
    const result = await runExtractQuestionReferences(
      client,
      bucketName(),
      input,
    );
    return c.json(result);
  };

  return { validate, handler };
}
