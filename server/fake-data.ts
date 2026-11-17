/**
 * Fake data client — the "database" for the walking skeleton.
 *
 * It implements `HonoDataClient` (`./data-client.ts`) with no I/O at all: every
 * call is recorded into the shared `calls` array and answered with canned rows.
 *
 * Why this exists:
 *   - It proves `routes/move-chat.ts` does not depend on AppSync/DynamoDB: the
 *     real route runs against this object unmodified.
 *   - It gives the next person a template for the real repository, and shows
 *     exactly which five calls a `moveChat` needs.
 *
 * When the database decision lands, this file is replaced by a real
 * implementation of the same interface. Nothing else in `server/` changes.
 */

import type { AmplifyResult, HonoDataClient, UpdateOptions } from './data-client';

export interface RecordedCall {
  op: string;
  args: unknown;
  options?: unknown;
}

function ok<T>(data: T): Promise<AmplifyResult<T>> {
  return Promise.resolve({ data, errors: undefined });
}

export function createFakeDataClient(calls: RecordedCall[]): HonoDataClient {
  const record = (op: string, args: unknown, options?: unknown) => {
    calls.push(options === undefined ? { op, args } : { op, args, options });
  };

  return {
    models: {
      Message: {
        listByChat: async ({ chatUuid }, options?: { limit?: number }) => {
          record('Message.listByChat', { chatUuid }, options);
          return ok([
            {
              messageUuid: 'message-1',
              chatUuid,
              role: 'user' as const,
              type: 'text' as const,
              content: 'what is photosynthesis',
              isCompleted: true,
              agentStatus: null,
              createdAt: '2026-11-12T10:00:00Z',
            },
            {
              messageUuid: 'message-2',
              chatUuid,
              role: 'assistant' as const,
              type: 'text' as const,
              content: 'plants making food from light',
              isCompleted: true,
              agentStatus: null,
              createdAt: '2026-11-12T10:00:05Z',
            },
          ]);
        },
        create: async (input) => {
          record('Message.create', input);
          return ok({
            messageUuid: 'message-new',
            chatUuid: input.chatUuid,
            role: input.role,
            type: input.type ?? 'text',
            content: input.content,
            isCompleted: input.isCompleted ?? true,
            agentStatus: null,
            createdAt: '2026-11-12T10:01:00Z',
          });
        },
      },

      Chat: {
        get: async ({ chatUuid }) => {
          record('Chat.get', { chatUuid });
          // A chat that lives in "space-old", so the route has an original space
          // to "refresh" (matching the production double Space update).
          return ok({
            chatUuid,
            userUuid: 'user-1',
            spaceUuid: 'space-old',
            createdAt: '2026-11-01T09:00:00Z',
            updatedAt: '2026-11-01T09:00:00Z',
          });
        },
        update: async (input: Record<string, unknown>, options?: UpdateOptions) => {
          record('Chat.update', input, options);
          return ok({ chatUuid: String(input.chatUuid), spaceUuid: input.spaceUuid as string | null });
        },
      },

      ChatCitation: {
        create: async (input) => {
          record('ChatCitation.create', input);
          return ok({
            chatCitationUuid: 'citation-new',
            chatUuid: input.chatUuid,
            messageUuid: input.messageUuid,
            type: input.type,
            title: input.title,
            url: input.url,
            startIndex: input.startIndex ?? 0,
            endIndex: input.endIndex ?? 0,
            createdAt: '2026-11-12T10:01:05Z',
          });
        },
      },
      Flashcard: {
        listFlashcardByChatUuidAndCreatedAt: async ({ chatUuid }) => {
          record('Flashcard.listFlashcardByChatUuidAndCreatedAt', { chatUuid });
          return ok([
            { flashcardUuid: 'flashcard-1', createdAt: '2026-11-01T09:01:00Z', spaceUuid: 'space-old' },
            { flashcardUuid: 'flashcard-2', createdAt: '2026-11-01T09:02:00Z', spaceUuid: 'space-old' },
          ]);
        },
        update: async (input: Record<string, unknown>) => {
          record('Flashcard.update', input);
          return ok(input as { flashcardUuid: string; createdAt: string });
        },
      },

      Question: {
        listQuestionByChatUuidAndCreatedAt: async ({ chatUuid }) => {
          record('Question.listQuestionByChatUuidAndCreatedAt', { chatUuid });
          return ok([
            { questionUuid: 'question-1', createdAt: '2026-11-01T09:03:00Z', spaceUuid: 'space-old' },
          ]);
        },
        update: async (input: Record<string, unknown>) => {
          record('Question.update', input);
          return ok(input as { questionUuid: string; createdAt: string });
        },
      },

      Space: {
        update: async (input: Record<string, unknown>, options?: UpdateOptions) => {
          record('Space.update', input, options);
          return ok({ spaceUuid: String(input.spaceUuid) });
        },
      },
    },
  };
}
