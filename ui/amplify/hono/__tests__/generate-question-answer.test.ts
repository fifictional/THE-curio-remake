/**
 * Unit tests for `generateQuestionAnswer` route (P3-7).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';
import type { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createGenerateQuestionAnswerRoute } from '../routes/generate-question-answer';
import type { HonoDataClient } from '../shared/data-client';

function buildClient(question: Record<string, unknown> | null, job: Record<string, unknown> | null) {
  const questionGet = vi.fn().mockResolvedValue(
    question === null ? { data: null } : { data: question },
  );
  const jobGet = vi.fn().mockResolvedValue(
    job === null ? { data: null } : { data: job },
  );

  const client = {
    models: {
      ExtractedQuestion: { get: questionGet },
      QuestionGenerationJob: { get: jobGet },
    },
  } as unknown as HonoDataClient;

  return { client, questionGet, jobGet };
}

function buildApp(
  client: HonoDataClient,
  generateAnswerFn: ReturnType<typeof vi.fn>,
) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createGenerateQuestionAnswerRoute(client, {
    cloudwatchClient: {} as CloudWatchClient,
    generateAnswerFn,
  });
  app.post('/generateQuestionAnswer', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('generateQuestionAnswer route (P3-7)', () => {
  it('generates answer for a valid generated question', async () => {
    const generateAnswerFn = vi.fn().mockResolvedValue({ success: true });
    const { client } = buildClient(
      {
        extractedQuestionUuid: 'q-1',
        isGenerated: true,
        questionGenerationJobUuid: 'job-1',
        questionContent: 'What is 2+2?',
        questionType: 'TEXT_INPUT',
        questionOptions: null,
        questionReference: null,
        needsCodeInterpreterForAnswer: false,
      },
      { userUuid: 'user-1' },
    );
    const app = buildApp(client, generateAnswerFn);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionAnswer',
      args: { extractedQuestionUuid: 'q-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: true });
    expect(generateAnswerFn).toHaveBeenCalledWith(
      expect.objectContaining({ userUuid: 'user-1' }),
    );
  });

  it('throws when question is not generated', async () => {
    const generateAnswerFn = vi.fn();
    const { client } = buildClient(
      { extractedQuestionUuid: 'q-1', isGenerated: false },
      null,
    );
    const app = buildApp(client, generateAnswerFn);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionAnswer',
      args: { extractedQuestionUuid: 'q-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await expect(
      appsyncAdapter(app)(event, buildLambdaContext()),
    ).rejects.toThrow(/not a generated question/);
    expect(generateAnswerFn).not.toHaveBeenCalled();
  });

  it('throws when question not found', async () => {
    const generateAnswerFn = vi.fn();
    const { client } = buildClient(null, null);
    const app = buildApp(client, generateAnswerFn);

    const event = buildAppSyncEvent({
      fieldName: 'generateQuestionAnswer',
      args: { extractedQuestionUuid: 'missing' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    await expect(
      appsyncAdapter(app)(event, buildLambdaContext()),
    ).rejects.toThrow('Question not found');
  });
});
