/**
 * The data seam.
 *
 * `HonoDataClient` is the ONLY thing a route knows about the database. In the
 * old AWS build this type was `Client<Schema>` (a GraphQL client for AppSync).
 * Here it is a structural interface; `postgres-data.ts` implements it over
 * Drizzle, `fake-data.ts` implements it in memory for tests.
 *
 * Two Amplify-isms are preserved deliberately so the ported route
 * (`routes/move-chat.ts`) runs unchanged:
 *   1. results are `{ data, errors }`, not throw-on-error
 *   2. read-by-index methods are named after the old index
 *      (`listFlashcardByChatUuidAndCreatedAt`)
 *
 * They are worth removing later — see docs/adr/0001 "the seam" note.
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
  hideInRecent?: boolean | null;
  titleChangedByTheUser?: boolean | null;
  isWebSearchCalled?: boolean | null;
  hasFlashcardsOrQuizzes?: boolean | null;
  flashcardDeckUuid?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}

export interface MessageRecord {
  messageUuid: string;
  chatUuid: string;
  role: 'user' | 'assistant';
  type?: 'text' | 'tool' | null;
  content: string;
  isCompleted?: boolean | null;
  agentStatus?: string | null;
  createdAt?: Date | string | null;
}

export interface CitationRecord {
  chatCitationUuid: string;
  chatUuid: string;
  messageUuid: string;
  type: string;
  title: string;
  url: string;
  startIndex: number;
  endIndex: number;
  createdAt?: Date | string | null;
}

export interface FlashcardRecord {
  flashcardUuid: string;
  createdAt: Date | string;
  spaceUuid?: string | null;
}

export interface QuestionRecord {
  questionUuid: string;
  createdAt: Date | string;
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
    Message: {
      listByChat(
        input: { chatUuid: string },
        options?: { limit?: number },
      ): Promise<AmplifyResult<MessageRecord[]>>;
      create(input: {
        chatUuid: string;
        role: 'user' | 'assistant';
        content: string;
        type?: 'text' | 'tool';
        isCompleted?: boolean;
        toolName?: string | null;
        toolArguments?: unknown;
      }): Promise<AmplifyResult<MessageRecord>>;
    };
    ChatCitation: {
      create(input: {
        chatUuid: string;
        messageUuid: string;
        userUuid?: string | null;
        type: string;
        title: string;
        url: string;
        startIndex?: number;
        endIndex?: number;
      }): Promise<AmplifyResult<CitationRecord>>;
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
