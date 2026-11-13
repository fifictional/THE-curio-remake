/**
 * Unit tests for `satExtractAnswers` route (P3-11).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createSatExtractAnswersRoute } from '../routes/sat-extract-answers';
import type { HonoDataClient } from '../shared/data-client';

const { runSatExtractAnswersMock } = vi.hoisted(() => ({
  runSatExtractAnswersMock: vi.fn(),
}));

vi.mock('../../functions/sat-extract-answers/run-sat-extract-answers', () => ({
  runSatExtractAnswers: runSatExtractAnswersMock,
}));

const client = {} as HonoDataClient;

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createSatExtractAnswersRoute(client, {
    s3Client: {} as never,
    cloudwatchClient: {} as never,
    createAIClientFn: vi.fn() as never,
    bucketName: () => 'test-bucket',
  });
  app.post('/satExtractAnswers', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('satExtractAnswers route (P3-11)', () => {
  it('returns matched count on success', async () => {
    runSatExtractAnswersMock.mockResolvedValue({
      success: true,
      matchedCount: 42,
    });
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'satExtractAnswers',
      args: { questionExtractJobUuid: 'job-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: true, matchedCount: 42 });
    expect(runSatExtractAnswersMock).toHaveBeenCalledWith(
      client,
      { questionExtractJobUuid: 'job-1' },
      expect.objectContaining({ bucketName: 'test-bucket' }),
    );
  });

  it('returns success:false without throwing on business error', async () => {
    runSatExtractAnswersMock.mockResolvedValue({
      success: false,
      matchedCount: 0,
      error: 'No answer key uploaded',
    });
    const app = buildApp();
    const event = buildAppSyncEvent({
      fieldName: 'satExtractAnswers',
      args: { questionExtractJobUuid: 'job-1' },
      identity: buildCognitoIdentity(),
      parentTypeName: 'Mutation',
    });

    const result = await appsyncAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({
      success: false,
      matchedCount: 0,
      error: 'No answer key uploaded',
    });
  });
});
