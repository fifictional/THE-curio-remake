/**
 * `moveChat` mutation route — P3-1.
 *
 * Source: `amplify/functions/move-chat/handler.ts` (101 LOC).
 *
 * Migration parity:
 *   - Moves a chat to a target space (or out of any space when `spaceUuid` is
 *     null/empty/whitespace → `targetSpaceUuid = null`).
 *   - Cascades the same `spaceUuid` to all of the chat's Flashcards and
 *     Questions (paginated at limit 1000, same as original).
 *   - "Fake updates" both the target space and the original space to refresh
 *     their derived counts (the original relies on the update touching the
 *     space record to trigger downstream subscriptions).
 *   - Returns `true` (AppSync `Boolean`).
 *
 * The original used a Powertools `Logger`; here we use `console.*` so logs flow
 * through Hono-Heavy's existing JSON CloudWatch stream alongside the
 * request-logger middleware. Error messages preserved verbatim ('Chat UUID is
 * required', 'Chat not found') so existing alerts keep matching.
 *
 * AppSync field shape (from `amplify/data/resource.ts:1043-1051`):
 *
 *   moveChat(chatUuid: ID!, spaceUuid: ID!): Boolean
 *
 * Note: schema marks `spaceUuid` required, but the handler explicitly supports
 * empty-string to mean "remove from folder" — preserved.
 *
 * @see docs/2026-05-27-amplify-to-hono-migration-plan.md §10.5 P3-1.
 */

import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import type { HonoDataClient } from '../shared/data-client';
import {
  getValidatedBody,
  validateBody,
} from '../shared/middleware/validate';
import type { HonoEnv } from '../shared/types';

const SPACE_SELECTION_SET = [
  'spaceUuid',
  'name',
  'userUuid',
  'updatedAt',
  'createdAt',
  'documents.documentUuid',
  'chats.chatUuid',
] as const;

const CHAT_SELECTION_SET = [
  'chatUuid',
  'userUuid',
  'spaceUuid',
  'documentUuid',
  'name',
  'createdAt',
  'updatedAt',
  'space.name',
] as const;

export const MoveChatArgs = z.object({
  chatUuid: z.string().min(1, 'Chat UUID is required'),
  // Schema marks required, but empty string is a valid "remove from folder"
  // signal; accept nullish so direct-invoke callers match AppSync semantics.
  spaceUuid: z.string().nullish(),
});

export interface MoveChatRoute {
  validate: MiddlewareHandler<HonoEnv>;
  handler: (c: Context<HonoEnv>) => Promise<Response>;
}

export function createMoveChatRoute(client: HonoDataClient): MoveChatRoute {
  const validate = validateBody(MoveChatArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const { chatUuid, spaceUuid } = getValidatedBody<typeof MoveChatArgs>(c);

    const targetSpaceUuid =
      spaceUuid && spaceUuid.trim() !== '' ? spaceUuid : null;

    const chat = await client.models.Chat.get({ chatUuid });
    if (!chat || !chat.data) {
      throw new Error('Chat not found');
    }

    const originalSpaceUuid = chat.data.spaceUuid;

    await client.models.Chat.update(
      { chatUuid, spaceUuid: targetSpaceUuid },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Amplify
      // selectionSet union is 100k+ members; `as any` matches the original
      // handler and avoids a multi-minute tsc type-instantiation blowup.
      { selectionSet: CHAT_SELECTION_SET as any },
    );

    const flashcards = await client.models.Flashcard.listFlashcardByChatUuidAndCreatedAt(
      { chatUuid },
      { limit: 1000 },
    );
    const questions = await client.models.Question.listQuestionByChatUuidAndCreatedAt(
      { chatUuid },
      { limit: 1000 },
    );

    const flashcardsPromises = flashcards.data?.map((flashcard) =>
      client.models.Flashcard.update({
        flashcardUuid: flashcard.flashcardUuid,
        spaceUuid: targetSpaceUuid,
        createdAt: flashcard.createdAt,
      }),
    );
    const questionsPromises = questions.data?.map((question) =>
      client.models.Question.update({
        questionUuid: question.questionUuid,
        spaceUuid: targetSpaceUuid,
        createdAt: question.createdAt,
      }),
    );

    await Promise.all([
      ...(flashcardsPromises || []),
      ...(questionsPromises || []),
    ]);

    if (targetSpaceUuid) {
      await client.models.Space.update(
        { spaceUuid: targetSpaceUuid },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }
    if (originalSpaceUuid) {
      await client.models.Space.update(
        { spaceUuid: originalSpaceUuid },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }

    return c.json(true);
  };

  return { validate, handler };
}
