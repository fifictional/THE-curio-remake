/**
 * `mockExamsGenerateQuestions` query route — P3-6.
 *
 * Source: `amplify/functions/mock-exams-generate-questions/handler.ts`
 * Core logic: `run-mock-exams-generate-questions.ts`.
 *
 * Registered at both AppSync field path (`/mockExamsGenerateQuestions`) and
 * ProcessDocument direct-invoke path (`/mock-exams-generate-questions`).
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-6.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { createAIClient } from '@ai-client';

import { runMockExamsGenerateQuestions } from '../../functions/mock-exams-generate-questions/run-mock-exams-generate-questions';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const MockExamsGenerateQuestionsArgs = z.object({
  mockExamUuid: z.string().min(1),
  userUuid: z.string().min(1),
  taskUuid: z.string().min(1),
});

export interface MockExamsGenerateQuestionsRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createMockExamsGenerateQuestionsRoute(
  client: HonoDataClient,
  deps: {
    cloudwatchClient?: CloudWatchClient;
    createAIClientFn?: typeof createAIClient;
  } = {},
): MockExamsGenerateQuestionsRoute {
  const validate = validateBody(MockExamsGenerateQuestionsArgs);
  const cloudwatchClient = deps.cloudwatchClient ?? new CloudWatchClient({});
  const createAIClientFn = deps.createAIClientFn ?? createAIClient;

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof MockExamsGenerateQuestionsArgs>(c);
    const result = await runMockExamsGenerateQuestions(client, input, {
      cloudwatchClient,
      createAIClientFn,
    });
    return c.json(result);
  };

  return { validate, handler };
}
