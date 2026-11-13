/**
 * Dispatcher direct-invoke payload contract tests (P3-16 / P4-7).
 *
 * Verifies the three Hono-backed task types are reachable via the
 * direct-invoke adapter using the same payload shape dispatch.ts emits.
 */

import { describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import { buildDirectInvokeEvent, buildLambdaContext } from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';

vi.mock('../../functions/ai-chat/run-ai-chat', () => ({
  runAiChat: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../functions/mock-exams-generate-questions/run-mock-exams-generate-questions', () => ({
  runMockExamsGenerateQuestions: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../functions/generate-questions/run-generate-questions', () => ({
  runGenerateQuestions: vi.fn().mockResolvedValue({ success: true, questionsGenerated: 1 }),
}));

import { createAiChatRoute } from '../routes/ai-chat';
import { createMockExamsGenerateQuestionsRoute } from '../routes/mock-exams-generate-questions';
import { createGenerateQuestionsRoute } from '../routes/generate-questions';
import type { HonoDataClient } from '../shared/data-client';

const stubClient = {} as HonoDataClient;

function mountDispatcherRoutes(app: Hono<HonoEnv>) {
  const aiChat = createAiChatRoute(stubClient);
  app.post('/ai-chat', aiChat.validate, aiChat.handler);

  const mockExams = createMockExamsGenerateQuestionsRoute(stubClient);
  app.post('/mock-exams-generate-questions', mockExams.validate, mockExams.handler);

  const generateQuestions = createGenerateQuestionsRoute(stubClient);
  app.post('/generate-questions', generateQuestions.validate, generateQuestions.handler);
}

describe('ProcessDocument dispatcher payload shapes', () => {
  it('CHAT payload reaches /ai-chat', async () => {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    mountDispatcherRoutes(app);

    const event = buildDirectInvokeEvent('ai-chat', {
      chatUuid: 'c1',
      userUuid: 'u1',
      message: 'hi',
      messageUuid: 'm1',
      taskUuid: 't1',
      chatType: 'main',
      chatArgs: {},
    });

    const result = await directInvokeAdapter(app)(event, buildLambdaContext());
    expect(result).toEqual({ success: true });
  });

  it('QUESTION_GENERATION payload reaches /mock-exams-generate-questions', async () => {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    mountDispatcherRoutes(app);

    const event = buildDirectInvokeEvent('mock-exams-generate-questions', {
      mockExamUuid: 'exam-1',
      userUuid: 'u1',
      taskUuid: 't1',
    });

    const result = await directInvokeAdapter(app)(event, buildLambdaContext());
    expect(result).toEqual({ success: true });
  });

  it('GENERATE_QUESTIONS payload reaches /generate-questions', async () => {
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    mountDispatcherRoutes(app);

    const event = buildDirectInvokeEvent('generate-questions', {
      questionGenerationJobUuid: 'job-1',
    });

    const result = await directInvokeAdapter(app)(event, buildLambdaContext());
    expect(result).toEqual({ success: true, questionsGenerated: 1 });
  });
});
