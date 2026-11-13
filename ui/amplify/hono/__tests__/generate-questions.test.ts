/**
 * Unit tests for generateQuestions route validation (P4-6).
 */

import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildDirectInvokeEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createGenerateQuestionsRoute } from '../routes/generate-questions';
import type { HonoDataClient } from '../shared/data-client';

vi.mock('../../functions/generate-questions/run-generate-questions', () => ({
  runGenerateQuestions: vi.fn().mockResolvedValue({ success: true, questionsGenerated: 3 }),
}));

function buildApp() {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createGenerateQuestionsRoute({} as HonoDataClient);
  app.post('/generate-questions', route.validate, route.handler);
  return app;
}

describe('generateQuestions route', () => {
  it('accepts direct-invoke with job uuid', async () => {
    const app = buildApp();
    const handler = directInvokeAdapter(app);
    const event = buildDirectInvokeEvent('generate-questions', {
      questionGenerationJobUuid: 'job-123',
    });

    const result = await handler(event, buildLambdaContext());

    expect(result).toEqual({ success: true, questionsGenerated: 3 });
  });

  it('returns 400 when job uuid missing', async () => {
    const app = buildApp();
    const handler = directInvokeAdapter(app);
    const event = buildDirectInvokeEvent('generate-questions', {});

    const result = await handler(event, buildLambdaContext());

    expect(result).toMatchObject({
      success: false,
      status: 400,
    });
  });
});
