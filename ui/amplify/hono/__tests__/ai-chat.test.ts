/**
 * Unit tests for `aiChat` route (P3-12).
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
import { createAiChatRoute } from '../routes/ai-chat';
import type { HonoDataClient } from '../shared/data-client';

const { runAiChatMock } = vi.hoisted(() => ({
  runAiChatMock: vi.fn(),
}));

vi.mock('../../functions/ai-chat/run-ai-chat', () => ({
  runAiChat: runAiChatMock,
}));

const client = {} as HonoDataClient;

const baseArgs = {
  chatUuid: 'chat-1',
  userUuid: 'user-1',
  message: 'Hello',
  messageUuid: 'msg-1',
  taskUuid: 'task-1',
  chatType: 'main' as const,
  chatArgs: {},
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('aiChat route (P3-12)', () => {
  it('dispatches via ProcessDocument direct-invoke /ai-chat path', async () => {
    runAiChatMock.mockResolvedValue({ success: true });
    const app = new Hono<HonoEnv>();
    app.onError(errorBoundary);
    app.use('*', authIdentity);
    const route = createAiChatRoute(client);
    app.post('/ai-chat', route.validate, route.handler);

    const event = buildDirectInvokeEvent('ai-chat', baseArgs);
    const result = await directInvokeAdapter(app)(event, buildLambdaContext());

    expect(result).toEqual({ success: true });
    expect(runAiChatMock).toHaveBeenCalledWith(client, baseArgs);
  });
});
