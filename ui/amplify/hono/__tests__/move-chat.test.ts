/**
 * Unit tests for the `moveChat` route (P3-1).
 *
 * Builds a fake data client with stubbed Chat/Flashcard/Question/Space model
 * methods. Verifies the move + cascade + fake-update behaviour and the
 * empty-string "remove from folder" semantics.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Hono } from 'hono';

import { appsyncAdapter } from '../shared/hono-appsync-adapter';
import { directInvokeAdapter } from '../shared/hono-direct-invoke-adapter';
import { authIdentity } from '../shared/middleware/auth-identity';
import { errorBoundary } from '../shared/middleware/error-boundary';
import {
  buildAppSyncEvent,
  buildCognitoIdentity,
  buildDirectInvokeEvent,
  buildLambdaContext,
} from '../shared/test-utils';
import type { HonoEnv } from '../shared/types';
import { createMoveChatRoute } from '../routes/move-chat';
import type { HonoDataClient } from '../shared/data-client';

interface ClientMocks {
  chatGet: ReturnType<typeof vi.fn>;
  chatUpdate: ReturnType<typeof vi.fn>;
  flashcardList: ReturnType<typeof vi.fn>;
  flashcardUpdate: ReturnType<typeof vi.fn>;
  questionList: ReturnType<typeof vi.fn>;
  questionUpdate: ReturnType<typeof vi.fn>;
  spaceUpdate: ReturnType<typeof vi.fn>;
}

function buildClient(overrides: {
  chat?: { data: { spaceUuid?: string | null } } | null;
  flashcards?: Array<{ flashcardUuid: string; createdAt: string }>;
  questions?: Array<{ questionUuid: string; createdAt: string }>;
}): { client: HonoDataClient; mocks: ClientMocks } {
  const mocks: ClientMocks = {
    chatGet: vi.fn().mockResolvedValue(
      overrides.chat === undefined ? { data: { spaceUuid: 'orig-space' } } : overrides.chat,
    ),
    chatUpdate: vi.fn().mockResolvedValue({ data: {} }),
    flashcardList: vi.fn().mockResolvedValue({ data: overrides.flashcards ?? [] }),
    flashcardUpdate: vi.fn().mockResolvedValue({ data: {} }),
    questionList: vi.fn().mockResolvedValue({ data: overrides.questions ?? [] }),
    questionUpdate: vi.fn().mockResolvedValue({ data: {} }),
    spaceUpdate: vi.fn().mockResolvedValue({ data: {} }),
  };

  const client = {
    models: {
      Chat: { get: mocks.chatGet, update: mocks.chatUpdate },
      Flashcard: {
        listFlashcardByChatUuidAndCreatedAt: mocks.flashcardList,
        update: mocks.flashcardUpdate,
      },
      Question: {
        listQuestionByChatUuidAndCreatedAt: mocks.questionList,
        update: mocks.questionUpdate,
      },
      Space: { update: mocks.spaceUpdate },
    },
  } as unknown as HonoDataClient;

  return { client, mocks };
}

function buildApp(client: HonoDataClient) {
  const app = new Hono<HonoEnv>();
  app.onError(errorBoundary);
  app.use('*', authIdentity);
  const route = createMoveChatRoute(client);
  app.post('/moveChat', route.validate, route.handler);
  return app;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('moveChat route (P3-1)', () => {
  it('moves chat + cascades flashcards/questions, fake-updates both spaces, returns true', async () => {
    const { client, mocks } = buildClient({
      chat: { data: { spaceUuid: 'orig-space' } },
      flashcards: [{ flashcardUuid: 'f1', createdAt: 't1' }],
      questions: [{ questionUuid: 'q1', createdAt: 't2' }],
    });
    const adapter = appsyncAdapter(buildApp(client));

    const event = buildAppSyncEvent({
      fieldName: 'moveChat',
      args: { chatUuid: 'chat-1', spaceUuid: 'target-space' },
      identity: buildCognitoIdentity(),
    });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toBe(true);
    expect(mocks.chatUpdate).toHaveBeenCalledWith(
      { chatUuid: 'chat-1', spaceUuid: 'target-space' },
      expect.anything(),
    );
    expect(mocks.flashcardUpdate).toHaveBeenCalledWith({
      flashcardUuid: 'f1',
      spaceUuid: 'target-space',
      createdAt: 't1',
    });
    expect(mocks.questionUpdate).toHaveBeenCalledWith({
      questionUuid: 'q1',
      spaceUuid: 'target-space',
      createdAt: 't2',
    });
    // both target + original spaces fake-updated
    expect(mocks.spaceUpdate).toHaveBeenCalledTimes(2);
  });

  it('treats empty-string spaceUuid as "remove from folder" (null), skips target-space update', async () => {
    const { client, mocks } = buildClient({
      chat: { data: { spaceUuid: 'orig-space' } },
    });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveChat', { chatUuid: 'chat-1', spaceUuid: '   ' });
    const result = await adapter(event, buildLambdaContext());

    expect(result).toBe(true);
    expect(mocks.chatUpdate).toHaveBeenCalledWith(
      { chatUuid: 'chat-1', spaceUuid: null },
      expect.anything(),
    );
    // only the original space is fake-updated (no target)
    expect(mocks.spaceUpdate).toHaveBeenCalledTimes(1);
  });

  it('throws "Chat not found" when the chat does not exist', async () => {
    const { client } = buildClient({ chat: null });
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveChat', { chatUuid: 'missing', spaceUuid: 's' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      error: string;
    };

    expect(result.success).toBe(false);
    expect(result.error).toBe('Chat not found');
  });

  it('400 on missing chatUuid', async () => {
    const { client, mocks } = buildClient({});
    const adapter = directInvokeAdapter(buildApp(client));

    const event = buildDirectInvokeEvent('moveChat', { spaceUuid: 's' });
    const result = (await adapter(event, buildLambdaContext())) as {
      success: boolean;
      status: number;
    };

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(mocks.chatGet).not.toHaveBeenCalled();
  });
});
