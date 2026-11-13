/**
 * `generateQuestions` mutation route.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { runGenerateQuestions } from '../../functions/generate-questions/run-generate-questions';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const GenerateQuestionsArgs = z.object({
  questionGenerationJobUuid: z.string().min(1),
});

export interface GenerateQuestionsRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createGenerateQuestionsRoute(
  client: HonoDataClient,
): GenerateQuestionsRoute {
  const validate = validateBody(GenerateQuestionsArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const input = getValidatedBody<typeof GenerateQuestionsArgs>(c);
    const result = await runGenerateQuestions(client, input);
    return c.json(result);
  };

  return { validate, handler };
}
