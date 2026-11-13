/**
 * Unit tests for `generateQuestionReference` route (P3-8).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import type { S3Client } from '@aws-sdk/client-s3';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createGenerateQuestionReferenceRoute } from '../routes/generate-question-reference';
import type { HonoDataClient } from '../shared/data-client';

function buildClient(
  question: Record<string, unknown> | null,
  job: Record<string, unknown> | null,
) {
  const questionGet = vi.fn().mockResolvedValue(
    question === null ? { data: null } : { data: question },
  );
  const questionUpdate = vi.fn().mockResolvedValue({ data: {} });
  const jobGet = vi.fn().mockResolvedValue(
    job === null ? { data: null } : { data: job },
  );

  const client = {
    models: {
      ExtractedQuestion: { get: questionGet, update: questionUpdate },
      QuestionGenerationJob: { get: jobGet },
    },
  } as unknown as HonoDataClient;

  return { client, questionGet, questionUpdate, jobGet };
}

function buildApp(
  client: HonoDataClient,
  generateRefFn: ReturnType<typeof vi.fn>,
  s3Send = vi.fn().mockResolvedValue({}),
) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createGenerateQuestionReferenceRoute(client, {
    cloudwatchClient: {} as CloudWatchClient,
    s3Client: { send: s3Send } as unknown as S3Client,
    generateRefFn,
    bucketName: () => 'test-bucket',
  });
  app.post('/generateQuestionReference', route.validate, route.handler);
  return app;
}

const baseQuestion = {
  extractedQuestionUuid: 'q-1',
  isGenerated: true,
  needsReference: true,
  questionGenerationJobUuid: 'job-1',
  referenceGenerationPrompt: 'Draw a diagram',
  questionReference: {
    referenceType: 'image',
    page: 1,
    boundingBox: [],
    s3Key: 'generated-references/old.pdf',
    text: 'old',
  },
};

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('generateQuestionReference route (P3-8)', () => {
  it('generates reference and returns s3Key', async () => {
    const generateRefFn = vi.fn().mockResolvedValue({
      success: true,
      s3Key: 'generated-references/new.pdf',
    });
    const { client, questionUpdate } = buildClient(baseQuestion, { userUuid: 'user-1' });
    const s3Send = vi.fn().mockResolvedValue({});
    const app = buildApp(client, generateRefFn, s3Send);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionReference',
      args: { extractedQuestionUuid: 'q-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({
      success: true,
      s3Key: 'generated-references/new.pdf',
    });
    expect(s3Send).toHaveBeenCalled();
    expect(generateRefFn).toHaveBeenCalled();
    expect(questionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ referenceExtractionStatus: 'EXTRACTED' }),
    );
  });

  it('throws when question does not need reference', async () => {
    const generateRefFn = vi.fn();
    const { client } = buildClient(
      { ...baseQuestion, needsReference: false },
      { userUuid: 'user-1' },
    );
    const app = buildApp(client, generateRefFn);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionReference',
      args: { extractedQuestionUuid: 'q-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await expect(
      appsyncAdapter(app)(event, buildLambdaContext()),
    ).rejects.toThrow(/does not need a reference/);
    expect(generateRefFn).not.toHaveBeenCalled();
  });

  it('marks question FAILED on generation error', async () => {
    const generateRefFn = vi.fn().mockResolvedValue({
      success: false,
      error: 'Model timeout',
    });
    const { client, questionUpdate } = buildClient(baseQuestion, { userUuid: 'user-1' });
    const app = buildApp(client, generateRefFn);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionReference',
      args: { extractedQuestionUuid: 'q-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await expect(
      appsyncAdapter(app)(event, buildLambdaContext()),
    ).rejects.toThrow('Model timeout');

    expect(questionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        referenceExtractionStatus: 'FAILED',
        referenceExtractionError: 'Model timeout',
      }),
    );
  });
});
