/**
 * COPY of `amplify/hono/routes/move-chat.ts`.
 *
 * ONLY the three import paths changed:
 *   ../shared/data-client        -> ../data-client
 *   ../shared/middleware/validate-> ../middleware/validate
 *   ../shared/types              -> ../types
 *
 * Every line of business logic below — the empty-string→null fallback, the
 * cascade to Flashcards and Questions, the double Space update, `return true` —
 * is unchanged from the repo's production route. That is the point: if this
 * file runs over plain HTTP, the same file runs without Lambda.
 */
import type { Context, MiddlewareHandler } from 'hono';
import { z } from 'zod';

import { getValidatedBody, validateBody } from '../middleware/validate';
import type { HonoEnv } from '../types';

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

export function createMoveChatRoute(): MoveChatRoute {
  const validate = validateBody(MoveChatArgs);

  const handler = async (c: Context<HonoEnv>): Promise<Response> => {
    const client = c.var.db;
    const { chatUuid, spaceUuid } = getValidatedBody<typeof MoveChatArgs>(c);

    const targetSpaceUuid =
      spaceUuid && spaceUuid.trim() !== '' ? spaceUuid : null;

    const identity = c.var.identity as { sub: string } | null;
    if (!identity) return c.json({ success: false, error: 'Not signed in' }, 401);

    const chat = await client.models.Chat.get({ chatUuid });
    // Deviation from the old Lambda: it threw, which surfaced as a GraphQL
    // error. A missing (or foreign) chat is a 404 here.
    if (!chat || !chat.data) {
      return c.json({ success: false, error: 'Chat not found' }, 404);
    }
    if (chat.data.userUuid && chat.data.userUuid !== identity.sub) {
      return c.json({ success: false, error: 'Chat not found' }, 404);
    }

    const originalSpaceUuid = chat.data.spaceUuid;

    await client.models.Chat.update(
      { chatUuid, spaceUuid: targetSpaceUuid },
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
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }
    if (originalSpaceUuid) {
      await client.models.Space.update(
        { spaceUuid: originalSpaceUuid },
        { selectionSet: SPACE_SELECTION_SET as any },
      );
    }

    return c.json(true);
  };

  return { validate, handler };
}
