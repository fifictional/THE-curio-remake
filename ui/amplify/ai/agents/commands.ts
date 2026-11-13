/**
 * Database command types for agent-to-handler communication
 * Agents yield these commands instead of directly accessing the database
 */

export type DBCommand =
  | UpdateMessageCommand
  | UpdateStatusCommand
  | CreateFlashcardCommand
  | UpdateChatCommand
  | CreateCitationCommand
  | CreateUserActionLogCommand
  | UpdateMockExamLogCommand
  | UpdateDocumentSummaryCommand;

/**
 * Update message content and metadata
 */
export interface UpdateMessageCommand {
  type: 'updateMessage';
  payload: {
    messageUuid: string;
    content?: string;
    isCompleted?: boolean;
    agentStatus?: 'thinking' | 'understanding' | 'generating' | 'searching_web' | null;
    agentStatusMessage?: string | null;
    type?: 'tool' | 'text';
    toolName?: string;
    toolArguments?: string;
    toolExtras?: Record<string, any>;
  };
}

/**
 * Update agent status (replaces updateMessageStatus callback)
 */
export interface UpdateStatusCommand {
  type: 'updateStatus';
  payload: {
    messageUuid: string;
    status: 'thinking' | 'understanding' | 'generating' | 'searching_web' | null;
    message: string | null;
  };
}

/**
 * Create flashcards from tool call
 */
export interface CreateFlashcardCommand {
  type: 'createFlashcard';
  payload: {
    userUuid: string;
    chatUuid: string;
    spaceUuid: string | null;
    documentUuid: string | null;
    flashcards: Array<{
      title: string;
      content: string;
    }>;
  };
}

/**
 * Update chat metadata (e.g., title, web search flag)
 */
export interface UpdateChatCommand {
  type: 'updateChat';
  payload: {
    chatUuid: string;
    name?: string;
    isWebSearchCalled?: boolean;
  };
}

/**
 * Create citation for message
 */
export interface CreateCitationCommand {
  type: 'createCitation';
  payload: {
    citationUuid: string;
    messageUuid: string;
    type: string;
    title: string;
    url: string;
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Create user action log entry
 */
export interface CreateUserActionLogCommand {
  type: 'createUserActionLog';
  payload: {
    userActionLogUuid: string;
    userUuid: string;
    actionType: string;
    sourceType: string;
    sourceUuid: string;
    createdAt: string;
  };
}

/**
 * Update mock exam log (for question chat)
 */
export interface UpdateMockExamLogCommand {
  type: 'updateMockExamLog';
  payload: {
    mockExamLogUuid: string;
    questionAnswer?: {
      givenAnswer: string;
      answerTimeInMilliseconds: number;
      answerAt: string;
    };
  };
}

/**
 * Update document summary content during streaming
 */
export interface UpdateDocumentSummaryCommand {
  type: 'updateDocumentSummary';
  payload: {
    documentSummaryUuid: string;
    summary: string;
    status?: 'started' | 'streaming' | 'completed' | 'error';
  };
}

