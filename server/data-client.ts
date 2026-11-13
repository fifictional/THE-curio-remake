/**
 * The data seam.
 *
 * `HonoDataClient` is the ONLY thing a route knows about the database. In the
 * Amplify build this type is `Client<Schema>` (a GraphQL client for AppSync).
 * Here it is a structural interface listing the five calls that
 * `routes/move-chat.ts` actually makes.
 *
 * This file is the answer to "which database are we using?": swapping Postgres
 * or DynamoDB in means writing a new object with this shape. Nothing else in
 * `server/` changes.
 *
 * Two Amplify-isms leak into this interface and are worth naming, because they
 * are what a future data layer must reproduce (or eliminate):
 *
 *   1. Results are `{ data, errors }`, not throw-on-error.
 *   2. Read-by-index methods are named after the index, e.g.
 *      `listFlashcardByChatUuidAndCreatedAt` — generated from
 *      `.secondaryIndexes((i) => [i('chatUuid').sortKeys(['createdAt'])])`.
 *
 * Methods are typed with `unknown`-ish inputs (matching how the route calls
 * them) rather than Amplify's generated selection-set unions, which are huge
 * enough to blow up `tsc` instantiation (see the comment in move-chat.ts).
 */

export interface AmplifyResult<T> {
  data: T | null;
  errors?: Array<{ message: string }>;
}

export interface UpdateOptions {
  selectionSet?: unknown;
}

export interface ChatRecord {
  chatUuid: string;
  userUuid?: string | null;
  spaceUuid?: string | null;
  documentUuid?: string | null;
  name?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface FlashcardRecord {
  flashcardUuid: string;
  createdAt: string;
  spaceUuid?: string | null;
}

export interface QuestionRecord {
  questionUuid: string;
  createdAt: string;
  spaceUuid?: string | null;
}

export interface HonoDataClient {
  models: {
    Chat: {
      get(input: { chatUuid: string }): Promise<AmplifyResult<ChatRecord>>;
      update(
        input: Record<string, unknown>,
        options?: UpdateOptions,
      ): Promise<AmplifyResult<ChatRecord>>;
    };
    Flashcard: {
      listFlashcardByChatUuidAndCreatedAt(
        input: { chatUuid: string },
        options?: { limit?: number },
      ): Promise<AmplifyResult<FlashcardRecord[]>>;
      update(input: Record<string, unknown>): Promise<AmplifyResult<FlashcardRecord>>;
    };
    Question: {
      listQuestionByChatUuidAndCreatedAt(
        input: { chatUuid: string },
        options?: { limit?: number },
      ): Promise<AmplifyResult<QuestionRecord[]>>;
      update(input: Record<string, unknown>): Promise<AmplifyResult<QuestionRecord>>;
    };
    Space: {
      update(
        input: Record<string, unknown>,
        options?: UpdateOptions,
      ): Promise<AmplifyResult<Record<string, unknown>>>;
    };
  };
}
