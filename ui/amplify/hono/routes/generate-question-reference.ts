/**
 * `generateQuestionReference` mutation route — P3-8.
 *
 * Source: `amplify/functions/generate-question-reference/handler.ts`.
 *
 * Validates generated question + needsReference, deletes stale S3 object,
 * clears reference fields, runs the shared `generate-question-reference` util,
 * then marks status EXTRACTED. On failure, updates status FAILED before rethrow.
 *
 * Env/IAM (P3-14 partial): `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
 * `AI_TUTOR_STORAGE_BUCKET_NAME`, Cognito list/admin-groups, storage grant on
 * `generated-references/*`.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1523-1533`):
 *
 *   generateQuestionReference(extractedQuestionUuid: ID!):
 *     { success: Boolean!, s3Key: String }
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-8.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { generateQuestionReference as generateRef } from '../../common/utils/generate-question-reference';
import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

export const GenerateQuestionReferenceArgs = z.object({
  extractedQuestionUuid: z.string().min(1, 'extractedQuestionUuid is required'),
});

export interface GenerateQuestionReferenceRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export interface GenerateQuestionReferenceDeps {
  cloudwatchClient?: CloudWatchClient;
  s3Client?: S3Client;
  generateRefFn?: typeof generateRef;
  bucketName?: () => string;
}

function resolveBucketName(): string {
  return (
    process.env.AI_TUTOR_STORAGE_BUCKET_NAME ||
    process.env.AWS_BUCKET_NAME ||
    ''
  );
}

export function createGenerateQuestionReferenceRoute(
  client: HonoDataClient,
  deps: GenerateQuestionReferenceDeps = {},
): GenerateQuestionReferenceRoute {
  const validate = validateBody(GenerateQuestionReferenceArgs);
  const cloudwatchClient = deps.cloudwatchClient ?? new CloudWatchClient({});
  const s3Client = deps.s3Client ?? new S3Client({});
  const runGenerateRef = deps.generateRefFn ?? generateRef;
  const resolveBucket = deps.bucketName ?? resolveBucketName;

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { extractedQuestionUuid } =
      getValidatedBody<typeof GenerateQuestionReferenceArgs>(c);

    console.log('Generating reference for question:', extractedQuestionUuid);

    try {
      const questionResponse = await client.models.ExtractedQuestion.get({
        extractedQuestionUuid,
      });

      if (!questionResponse.data) {
        throw new Error('Question not found');
      }

      const question = questionResponse.data;

      if (!question.isGenerated) {
        throw new Error(
          'This question is not a generated question. Use extractQuestionReferences for extracted questions.',
        );
      }

      if (!question.needsReference) {
        throw new Error('This question does not need a reference');
      }

      const bucketName = resolveBucket();

      if (question.questionReference?.s3Key) {
        try {
          console.log(
            'Deleting old reference file:',
            question.questionReference.s3Key,
          );
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: question.questionReference.s3Key,
            }),
          );
          console.log('Successfully deleted old reference file');
        } catch (deleteError) {
          console.error('Error deleting old reference file:', deleteError);
        }
      }

      const clearedQuestionReference = question.questionReference
        ? {
            referenceType: question.questionReference.referenceType || 'none',
            page: question.questionReference.page ?? 0,
            boundingBox: question.questionReference.boundingBox ?? [],
            s3Key: null,
            text: null,
          }
        : null;

      await client.models.ExtractedQuestion.update({
        extractedQuestionUuid,
        questionReference: clearedQuestionReference,
        referenceExtractionStatus: 'EXTRACTING',
        referenceExtractionError: null,
      });

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

      const result = await runGenerateRef({
        client,
        question: {
          extractedQuestionUuid: question.extractedQuestionUuid,
          referenceGenerationPrompt: question.referenceGenerationPrompt || null,
          questionReference: clearedQuestionReference,
        },
        userUuid,
        cloudwatchClient,
        s3Client,
        bucketName,
        logProgress: async (message: string, currentLogs?: string) => {
          console.log(message);
          return currentLogs || message;
        },
      });

      if (!result.success) {
        throw new Error(result.error || 'Reference generation failed');
      }

      await client.models.ExtractedQuestion.update({
        extractedQuestionUuid,
        referenceExtractionStatus: 'EXTRACTED',
        referenceExtractionError: null,
      });

      return c.json({ success: true, s3Key: result.s3Key });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Error generating question reference:', error);

      try {
        await client.models.ExtractedQuestion.update({
          extractedQuestionUuid,
          referenceExtractionStatus: 'FAILED',
          referenceExtractionError: message,
        });
      } catch (updateError) {
        console.error('Failed to update question status:', updateError);
      }

      throw error;
    }
  };

  return { validate, handler };
}
