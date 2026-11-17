/**
 * Postgres implementation of the data seam.
 *
 * This is the file that answers "which database?" — everything else in
 * `server/` is unchanged by that answer. Drizzle + postgres.js.
 *
 * The only interesting detail: `{ data, errors }` is preserved (rather than
 * letting errors throw) because the ported route from the old repo checks
 * `if (!chat || !chat.data)`.
 */

import { asc, desc, eq } from 'drizzle-orm';

import type {
  AmplifyResult,
  ChatRecord,
  FlashcardRecord,
  HonoDataClient,
  MessageRecord,
  QuestionRecord,
  UpdateOptions,
} from './data-client';
import { asUser } from './db/scope';
import { chatCitations, chats, flashcards, messages, questions, spaces } from './db/schema';

const iso = (d: Date | string | null | undefined) =>
  d instanceof Date ? d.toISOString() : (d ?? null);

function ok<T>(data: T | null): AmplifyResult<T> {
  return { data, errors: undefined };
}

function toChatRecord(row: typeof chats.$inferSelect): ChatRecord {
  return {
    chatUuid: row.chatUuid,
    userUuid: row.userUuid,
    spaceUuid: row.spaceUuid,
    documentUuid: row.documentUuid,
    name: row.name,
    hideInRecent: row.hideInRecent,
    titleChangedByTheUser: row.titleChangedByTheUser,
    isWebSearchCalled: row.isWebSearchCalled,
    hasFlashcardsOrQuizzes: row.hasFlashcardsOrQuizzes,
    flashcardDeckUuid: row.flashcardDeckUuid,
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  };
}

/**
 * Every method runs inside `asUser(...)`, so Postgres RLS — not this file —
 * decides which rows exist. Passing `null` means "no user": the policies match
 * nothing and every read returns empty.
 */
export function createPostgresDataClient(userId: string | null): HonoDataClient {
  return {
    models: {
      Chat: {
        async get({ chatUuid }) {
          return asUser(userId, async (db) => {
            const [row] = await db
              .select()
              .from(chats)
              .where(eq(chats.chatUuid, chatUuid))
              .limit(1);
            return ok<ChatRecord>(row ? toChatRecord(row) : null);
          });
        },

        async update(input: Record<string, unknown>, _options?: UpdateOptions) {
          return asUser(userId, async (db) => {
          const chatUuid = String(input.chatUuid);
          const patch: Partial<typeof chats.$inferInsert> = {
            updatedAt: new Date(),
          };
          if ('spaceUuid' in input) patch.spaceUuid = (input.spaceUuid as string | null) ?? null;
          if (typeof input.name === 'string') patch.name = input.name;
          for (const flag of [
            'hideInRecent',
            'titleChangedByTheUser',
            'isWebSearchCalled',
            'hasFlashcardsOrQuizzes',
          ] as const) {
            if (typeof input[flag] === 'boolean') patch[flag] = input[flag] as boolean;
          }

          const [row] = await db
            .update(chats)
            .set(patch)
            .where(eq(chats.chatUuid, chatUuid))
            .returning();

          return ok<ChatRecord>(row ? toChatRecord(row) : null);
          });
        },
      },

      Message: {
        async listByChat({ chatUuid }, options) {
          return asUser(userId, async (db) => {
          const rows = await db
            .select()
            .from(messages)
            .where(eq(messages.chatUuid, chatUuid))
            .orderBy(asc(messages.createdAt))
            .limit(options?.limit ?? 200);

          return ok(
            rows.map(
              (r): MessageRecord => ({
                messageUuid: r.messageUuid,
                chatUuid: r.chatUuid,
                role: r.role,
                type: r.type,
                content: r.content,
                isCompleted: r.isCompleted,
                agentStatus: r.agentStatus,
                createdAt: iso(r.createdAt),
              }),
            ),
          );
          });
        },

        async create(input) {
          return asUser(userId, async (db) => {
          const [row] = await db
            .insert(messages)
            .values({
              messageUuid: crypto.randomUUID(),
              chatUuid: input.chatUuid,
              role: input.role,
              type: input.type ?? 'text',
              content: input.content,
              isCompleted: input.isCompleted ?? true,
              toolName: input.toolName ?? null,
              toolArguments: (input.toolArguments ?? null) as never,
            })
            .returning();

          return ok({
            messageUuid: row.messageUuid,
            chatUuid: row.chatUuid,
            role: row.role,
            type: row.type,
            content: row.content,
            isCompleted: row.isCompleted,
            agentStatus: row.agentStatus,
            createdAt: iso(row.createdAt),
          });
          });
        },
      },

      ChatCitation: {
        async create(input) {
          return asUser(userId, async (db) => {
            const [row] = await db
              .insert(chatCitations)
              .values({
                chatCitationUuid: crypto.randomUUID(),
                chatUuid: input.chatUuid,
                messageUuid: input.messageUuid,
                userUuid: input.userUuid ?? userId,
                type: input.type,
                title: input.title,
                url: input.url,
                startIndex: input.startIndex ?? 0,
                endIndex: input.endIndex ?? 0,
              })
              .returning();

            return ok({
              chatCitationUuid: row.chatCitationUuid,
              chatUuid: row.chatUuid,
              messageUuid: row.messageUuid,
              type: row.type,
              title: row.title,
              url: row.url,
              startIndex: row.startIndex,
              endIndex: row.endIndex,
              createdAt: iso(row.createdAt),
            });
          });
        },
      },
      Flashcard: {
        async listFlashcardByChatUuidAndCreatedAt({ chatUuid }, options) {
          return asUser(userId, async (db) => {
          const rows = await db
            .select()
            .from(flashcards)
            .where(eq(flashcards.chatUuid, chatUuid))
            .orderBy(desc(flashcards.createdAt))
            .limit(options?.limit ?? 1000);

          return ok(
            rows.map(
              (r): FlashcardRecord => ({
                flashcardUuid: r.flashcardUuid,
                createdAt: r.createdAt,
                spaceUuid: r.spaceUuid,
              }),
            ),
          );
          });
        },

        async update(input: Record<string, unknown>) {
          return asUser(userId, async (db) => {
          const [row] = await db
            .update(flashcards)
            .set({
              spaceUuid: (input.spaceUuid as string | null) ?? null,
              updatedAt: new Date(),
            })
            .where(eq(flashcards.flashcardUuid, String(input.flashcardUuid)))
            .returning();

          return ok<FlashcardRecord>(
            row
              ? { flashcardUuid: row.flashcardUuid, createdAt: row.createdAt, spaceUuid: row.spaceUuid }
              : null,
          );
          });
        },
      },

      Question: {
        async listQuestionByChatUuidAndCreatedAt({ chatUuid }, options) {
          return asUser(userId, async (db) => {
          const rows = await db
            .select()
            .from(questions)
            .where(eq(questions.chatUuid, chatUuid))
            .orderBy(desc(questions.createdAt))
            .limit(options?.limit ?? 1000);

          return ok(
            rows.map(
              (r): QuestionRecord => ({
                questionUuid: r.questionUuid,
                createdAt: r.createdAt,
                spaceUuid: r.spaceUuid,
              }),
            ),
          );
          });
        },

        async update(input: Record<string, unknown>) {
          return asUser(userId, async (db) => {
          const [row] = await db
            .update(questions)
            .set({
              spaceUuid: (input.spaceUuid as string | null) ?? null,
              updatedAt: new Date(),
            })
            .where(eq(questions.questionUuid, String(input.questionUuid)))
            .returning();

          return ok<QuestionRecord>(
            row
              ? { questionUuid: row.questionUuid, createdAt: row.createdAt, spaceUuid: row.spaceUuid }
              : null,
          );
          });
        },
      },

      Space: {
        async update(input: Record<string, unknown>, _options?: UpdateOptions) {
          return asUser(userId, async (db) => {
          const [row] = await db
            .update(spaces)
            .set({ updatedAt: new Date() })
            .where(eq(spaces.spaceUuid, String(input.spaceUuid)))
            .returning();

          return ok<Record<string, unknown>>(row ? { spaceUuid: row.spaceUuid, updatedAt: row.updatedAt } : null);
          });
        },
      },
    },
  };
}
