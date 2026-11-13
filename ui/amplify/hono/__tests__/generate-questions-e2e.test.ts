/**
 * generateQuestions end-to-end at the Lambda handler boundary.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { buildPolymorphicHandler } from '../shared/polymorphic-dispatcher';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildDirectInvokeEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createGenerateQuestionsRoute } from '../routes/generate-questions';
import type { HonoDataClient } from '../shared/data-client';

const runGenerateQuestionsMock = vi.hoisted(() => vi.fn());

vi.mock('../../functions/generate-questions/run-generate-questions', () => ({
  runGenerateQuestions: runGenerateQuestionsMock,
}));

function buildTestApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createGenerateQuestionsRoute({} as HonoDataClient);
  app.post('/generateQuestions', route.validate, route.handler);
  app.post('/generate-questions', route.validate, route.handler);
  return app;
}

describe('generateQuestions E2E handler boundary', () => {
  beforeEach(() => {
    runGenerateQuestionsMock.mockReset();
  });

  it('ProcessDocument GENERATE_QUESTIONS payload completes through polymorphic handler', async () => {
    runGenerateQuestionsMock.mockResolvedValueOnce({
      success: true,
      questionsGenerated: 12,
      jobUuid: 'job-e2e-001',
    });

    const handler = buildPolymorphicHandler(buildTestApp());

    const event = buildDirectInvokeEvent('generate-questions', {
      questionGenerationJobUuid: 'job-e2e-001',
    });

    const result = await (handler as (e: unknown, c: unknown) => Promise<unknown>)(
      event,
      buildLambdaContext(),
    );

    expect(result).toEqual({
      success: true,
      questionsGenerated: 12,
      jobUuid: 'job-e2e-001',
    });
    expect(runGenerateQuestionsMock).toHaveBeenCalledWith(
      expect.anything(),
      { questionGenerationJobUuid: 'job-e2e-001' },
    );
  });

  it('returns structured validation error when job uuid missing', async () => {
    const handler = buildPolymorphicHandler(buildTestApp());

    const result = await (handler as (e: unknown, c: unknown) => Promise<unknown>)(
      buildDirectInvokeEvent('generate-questions', {}),
      buildLambdaContext(),
    );

    expect(result).toMatchObject({
      success: false,
      status: 400,
    });
    expect(runGenerateQuestionsMock).not.toHaveBeenCalled();
  });
});
