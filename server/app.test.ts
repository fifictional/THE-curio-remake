/**
 * Walking-skeleton tests.
 *
 * These assert the claim the skeleton exists to test: the unmodified repo route
 * `amplify/hono/routes/move-chat.ts` (copied to `./routes/move-chat.ts`) runs
 * against a plain interface object, with no Lambda, no AppSync and no AWS.
 *
 * Run: npx vitest run server
 */

import { describe, expect, it } from 'vitest';

import { createApp } from './app';
import type { RecordedCall } from './fake-data';

interface MoveChatResult {
  res: Response;
  calls: RecordedCall[];
  json: unknown;
}

const postMoveChat = async (body: unknown): Promise<MoveChatResult> => {
  const { app, calls } = createApp(undefined, { auth: false });
  const res = await app.request('/moveChat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { res, calls, json: await res.json() };
};

describe('moveChat over plain HTTP', () => {
  it('returns true and performs the full cascade', async () => {
    const { res, json, calls } = await postMoveChat({
      chatUuid: 'chat-abc',
      spaceUuid: 'space-new',
    });

    expect(res.status).toBe(200);
    expect(json).toBe(true);

    // Same nine calls production makes, in the same order.
    expect(calls.map((c) => c.op)).toEqual([
      'Chat.get',
      'Chat.update',
      'Flashcard.listFlashcardByChatUuidAndCreatedAt',
      'Question.listQuestionByChatUuidAndCreatedAt',
      'Flashcard.update',
      'Flashcard.update',
      'Question.update',
      'Space.update', // target space
      'Space.update', // original space (the "refresh" the original handler relies on)
    ]);
  });

  it('passes createdAt on child updates (composite identifier)', async () => {
    const { calls } = await postMoveChat({ chatUuid: 'chat-abc', spaceUuid: 'space-new' });

    const flashcardUpdate = calls.find((c) => c.op === 'Flashcard.update');
    expect(flashcardUpdate?.args).toMatchObject({
      flashcardUuid: 'flashcard-1',
      createdAt: '2026-11-01T09:01:00Z',
      spaceUuid: 'space-new',
    });
  });

  it('treats an empty spaceUuid as "remove from folder" (null)', async () => {
    const { calls } = await postMoveChat({ chatUuid: 'chat-abc', spaceUuid: '' });

    const chatUpdate = calls.find((c) => c.op === 'Chat.update');
    expect(chatUpdate?.args).toMatchObject({ chatUuid: 'chat-abc', spaceUuid: null });

    // No target space → only the original space gets refreshed.
    expect(calls.filter((c) => c.op === 'Space.update')).toHaveLength(1);
  });

  it('rejects an empty chatUuid with the production error shape', async () => {
    const { res, json } = await postMoveChat({ chatUuid: '', spaceUuid: 'space-new' });

    expect(res.status).toBe(400);
    expect(json).toMatchObject({ success: false, error: 'Validation failed' });
  });
});

describe('auth boundary', () => {
  it('rejects message reads without a session', async () => {
    const { app } = createApp(undefined, { auth: false });
    const res = await app.request('/messages?chat=44444444-4444-4444-8444-444444444444');
    expect(res.status).toBe(401);
  });
});
