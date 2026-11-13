/**
 * `generateQuestionAnswer` mutation route — P3-7.
 *
 * Source: `amplify/functions/generate-question-answer/handler.ts`.
 *
 * Loads the ExtractedQuestion, validates `isGenerated`, resolves `userUuid`
 * from QuestionGenerationJob, then delegates to the shared
 * `generate-question-answer` util (Anthropic + CloudWatch metrics).
 *
 * AppSync field shape (from `amplify/data/resource.ts:1534-1543`):
 *
 *   generateQuestionAnswer(extractedQuestionUuid: ID!): { success: Boolean! }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-7.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

import { generateQuestionAnswer as generateAnswer } from '../../common/utils/generate-question-answer';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const GenerateQuestionAnswerArgs = z.object({
  extractedQuestionUuid: z.string().min(1, 'extractedQuestionUuid is required'),
});

export interface GenerateQuestionAnswerRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface GenerateQuestionAnswerDeps {
  cloudwatchClient?: CloudWatchClient;
  generateAnswerFn?: typeof generateAnswer;
}

export function createGenerateQuestionAnswerRoute(
  client: HonoDataClient,
  deps: GenerateQuestionAnswerDeps = {},
): GenerateQuestionAnswerRoute {
  const validate = validateBody(GenerateQuestionAnswerArgs);
  const cloudwatchClient = deps.cloudwatchClient ?? new CloudWatchClient({});
  const runGenerateAnswer = deps.generateAnswerFn ?? generateAnswer;

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { extractedQuestionUuid } =
      getValidatedBody<typeof GenerateQuestionAnswerArgs>(c);

    console.log('Generating answer for question:', extractedQuestionUuid);

    const questionResponse = await client.models.ExtractedQuestion.get({
      extractedQuestionUuid,
    });

    if (!questionResponse.data) {
      throw new Error('Question not found');
    }

    const question = questionResponse.data;

    if (!question.isGenerated) {
      throw new Error(
        'This question is not a generated question. Answer generation retry is only available for generated questions.',
      );
    }

    let userUuid: string;
    if (question.questionGenerationJobUuid) {
      const jobResponse = await client.models.QuestionGenerationJob.get({
        questionGenerationJobUuid: question.questionGenerationJobUuid,
      });
      if (!jobResponse.data) {
        throw new Error('Question generation job not found');
      }
      userUuid = jobResponse.data.userUuid;
    } else {
      throw new Error('Question generation job UUID not found');
    }

    const result = await runGenerateAnswer({
      client,
      question: {
        extractedQuestionUuid: question.extractedQuestionUuid,
        questionContent: question.questionContent,
        questionType: question.questionType as 'MULTIPLE_CHOICE' | 'TEXT_INPUT',
        questionOptions: question.questionOptions,
        questionReference: question.questionReference,
        needsCodeInterpreterForAnswer: question.needsCodeInterpreterForAnswer,
      },
      userUuid,
      cloudwatchClient,
    });

    if (!result.success) {
      throw new Error(result.error || 'Answer generation failed');
    }

    return c.json({ success: true });
  };

  return { validate, handler };
}
