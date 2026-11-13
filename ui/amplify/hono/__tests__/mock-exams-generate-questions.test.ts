/**
 * Unit tests for `mockExamsGenerateQuestions` route (P3-6).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createMockExamsGenerateQuestionsRoute } from '../routes/mock-exams-generate-questions';
import type { HonoDataClient } from '../shared/data-client';

const { runMockExamsGenerateQuestionsMock } = vi.hoisted(() => ({
  runMockExamsGenerateQuestionsMock: vi.fn(),
}));

vi.mock('../../functions/mock-exams-generate-questions/run-mock-exams-generate-questions', () => ({
  runMockExamsGenerateQuestions: runMockExamsGenerateQuestionsMock,
}));

const client = {} as HonoDataClient;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('mockExamsGenerateQuestions route (P3-6)', () => {
  it('dispatches via ProcessDocument direct-invoke kebab path', async () => {
    runMockExamsGenerateQuestionsMock.mockResolvedValue({ success: true, output: [] });
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    const route = createMockExamsGenerateQuestionsRoute(client);
    app.post('/mock-exams-generate-questions', route.validate, route.handler);

    const event = buildDirectInvokeEvent('mock-exams-generate-questions', {
      mockExamUuid: 'exam-1',
      userUuid: 'user-1',
      taskUuid: 'task-1',
    });

    const result = await directInvokeAdapter(app)(event, buildLambdaContext());
    expect(result).toEqual({ success: true, output: [] });
  });
});
