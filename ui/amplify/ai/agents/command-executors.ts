import { Schema } from "@database-schema";
import { generateClient } from "aws-amplify/api";
import { v4 as uuidv4 } from "uuid";
import {
  DBCommand,
  UpdateMessageCommand,
  UpdateStatusCommand,
  CreateFlashcardCommand,
  UpdateChatCommand,
  CreateCitationCommand,
  CreateUserActionLogCommand,
  UpdateMockExamLogCommand,
  UpdateDocumentSummaryCommand,
} from "./commands";

type Client = ReturnType<typeof generateClient<Schema>>;

/**
 * Execute a database command
 * Centralized command execution logic that can be reused
 * @param messageBatcher Optional batcher for updateMessage commands (for throttling during streaming)
 * @param documentSummaryBatcher Optional batcher for updateDocumentSummary commands (for throttling during streaming)
 */
export async function executeDBCommand(
  command: DBCommand,
  client: Client,
  context?: {
    chatUuid?: string;
    messageBatcher?: MessageUpdateBatcher;
    documentSummaryBatcher?: DocumentSummaryUpdateBatcher;
  }
): Promise<void> {
  switch (command.type) {
    case 'updateStatus':
      await executeUpdateStatus(command, client);
      break;
    case 'updateMessage':
      // Use batcher if provided (for streaming), otherwise execute immediately
      if (context?.messageBatcher) {
        await context.messageBatcher.add(command as UpdateMessageCommand, client);
      } else {
        await executeUpdateMessage(command, client);
      }
      break;
    case 'createFlashcard':
      await executeCreateFlashcard(command, client);
      break;
    case 'updateChat':
      await executeUpdateChat(command, client);
      break;
    case 'createCitation':
      await executeCreateCitation(command, client, context?.chatUuid);
      break;
    case 'createUserActionLog':
      await executeCreateUserActionLog(command, client);
      break;
    case 'updateMockExamLog':
      await executeUpdateMockExamLog(command, client);
      break;
    case 'updateDocumentSummary':
      // Use batcher if provided (for streaming), otherwise execute immediately
      if (context?.documentSummaryBatcher) {
        await context.documentSummaryBatcher.add(command as UpdateDocumentSummaryCommand, client);
      } else {
        await executeUpdateDocumentSummary(command, client);
      }
      break;
    default: {
      const _exhaustive: never = command;
      console.warn(`[CommandExecutor] Unknown command type: ${(command as any).type}`);
    }
  }
}

/**
 * Execute updateStatus command
 */
async function executeUpdateStatus(
  command: UpdateStatusCommand,
  client: Client
): Promise<void> {
  await client.models.Message.update({
    messageUuid: command.payload.messageUuid,
    agentStatus: command.payload.status,
    agentStatusMessage: command.payload.message,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Execute updateMessage command
 */
export async function executeUpdateMessage(
  command: UpdateMessageCommand,
  client: Client
): Promise<void> {
  const { messageUuid, ...restPayload } = command.payload;
  await client.models.Message.update({
    messageUuid,
    ...restPayload,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * Execute createFlashcard command
 *
 * Writes to the FlashcardDeck model (what the Flashcards tab reads) — the
 * legacy Flashcard table is no longer read by the UI. The deck is anchored to
 * the chat (chat.flashcardDeckUuid), matching how usePanelFlashcards resolves
 * decks when a chat is open.
 */
async function executeCreateFlashcard(
  command: CreateFlashcardCommand,
  client: Client
): Promise<void> {
  const now = new Date().toISOString();
  const { userUuid, chatUuid, flashcards } = command.payload;

  const newItems = flashcards.map((flashcard) => ({
    flashcardUuid: uuidv4(),
    title: flashcard.title,
    content: flashcard.content,
    references: [],
    createdAt: now,
    updatedAt: now,
  }));

  if (newItems.length === 0) return;

  const chatResponse = await client.models.Chat.get({ chatUuid });
  const existingDeckUuid = chatResponse.data?.flashcardDeckUuid;

  if (existingDeckUuid) {
    const deckResponse = await client.models.FlashcardDeck.get({
      flashcardDeckUuid: existingDeckUuid,
    });
    if (!deckResponse.data) {
      throw new Error(`FlashcardDeck not found: ${existingDeckUuid}`);
    }
    const existing = (deckResponse.data.flashcards || []).filter((f) => f != null);
    await client.models.FlashcardDeck.update({
      flashcardDeckUuid: existingDeckUuid,
      flashcards: [...existing, ...newItems],
      updatedAt: now,
    });
    return;
  }

  const deckUuid = uuidv4();
  await client.models.FlashcardDeck.create({
    flashcardDeckUuid: deckUuid,
    userUuid,
    flashcards: newItems,
    createdAt: now,
    updatedAt: now,
  });
  await client.models.Chat.update({
    chatUuid,
    flashcardDeckUuid: deckUuid,
  });
}

/**
 * Execute updateChat command
 */
async function executeUpdateChat(
  command: UpdateChatCommand,
  client: Client
): Promise<void> {
  const { chatUuid, ...restPayload } = command.payload;
  await client.models.Chat.update({
    chatUuid,
    ...restPayload,
  });
}

/**
 * Execute createCitation command
 */
async function executeCreateCitation(
  command: CreateCitationCommand,
  client: Client,
  chatUuid?: string
): Promise<void> {
  if (!chatUuid) {
    console.error('[CommandExecutor] chatUuid required for createCitation');
    return;
  }
  
  await client.models.ChatCitation.create({
    chatCitationUuid: command.payload.citationUuid,
    chatUuid: chatUuid,
    type: command.payload.type,
    title: command.payload.title,
    url: command.payload.url,
    startIndex: command.payload.startIndex,
    endIndex: command.payload.endIndex,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageUuid: command.payload.messageUuid,
  });
}

/**
 * Execute createUserActionLog command
 */
async function executeCreateUserActionLog(
  command: CreateUserActionLogCommand,
  client: Client
): Promise<void> {
  await client.models.UserActionLog.create({
    userActionLogUuid: command.payload.userActionLogUuid,
    userUuid: command.payload.userUuid,
    actionType: command.payload.actionType as any, // Type assertion needed due to schema enum
    sourceType: command.payload.sourceType as any, // Type assertion needed due to schema enum
    sourceUuid: command.payload.sourceUuid,
    createdAt: command.payload.createdAt,
  } as any);
}

/**
 * Execute updateMockExamLog command
 */
async function executeUpdateMockExamLog(
  command: UpdateMockExamLogCommand,
  client: Client
): Promise<void> {
  await client.models.MockExamLog.update({
    mockExamLogUuid: command.payload.mockExamLogUuid,
    ...(command.payload.questionAnswer && {
      questionAnswer: command.payload.questionAnswer,
    }),
  });
}

/**
 * Execute updateDocumentSummary command
 */
async function executeUpdateDocumentSummary(
  command: UpdateDocumentSummaryCommand,
  client: Client
): Promise<void> {
  // Check if this is the first streaming update (status transitioning from 'started' to 'streaming')
  let shouldUpdateAnalytics = false;
  if (command.payload.status === 'streaming') {
    try {
      const currentSummary = await client.models.DocumentSummary.get({
        documentSummaryUuid: command.payload.documentSummaryUuid,
      });
      if (currentSummary.data?.status === 'started') {
        shouldUpdateAnalytics = true;
      }
    } catch (error) {
      console.error('[executeUpdateDocumentSummary] Error checking summary status:', error);
    }
  }

  await client.models.DocumentSummary.update({
    documentSummaryUuid: command.payload.documentSummaryUuid,
    summary: command.payload.summary,
    markdown: command.payload.summary,
    enrichedMarkdown: command.payload.summary,
    ...(command.payload.status && { status: command.payload.status }),
  });

  // Update analytics if this is the first streaming update
  if (shouldUpdateAnalytics) {
    try {
      // Get documentUuid from DocumentSummary
      const summary = await client.models.DocumentSummary.get({
        documentSummaryUuid: command.payload.documentSummaryUuid,
      });
      const documentUuid = summary.data?.documentUuid;
      
      if (documentUuid) {
        // Try to find existing metadata entry
        const existing = await client.models.Metadata.list({
          filter: {
            targetUuid: { eq: documentUuid },
            targetType: { eq: 'document' },
            name: { eq: 'summaryFirstStreamedTime' },
          },
          limit: 1,
        });

        const now = new Date().toISOString();
        if (existing.data && existing.data.length > 0) {
          // Update existing entry
          await client.models.Metadata.update({
            metadataUuid: existing.data[0].metadataUuid,
            value: now,
            updatedAt: now,
          });
        } else {
          // Create new entry
          await client.models.Metadata.create({
            metadataUuid: uuidv4(),
            targetUuid: documentUuid,
            targetType: 'document',
            name: 'summaryFirstStreamedTime',
            value: now,
            createdAt: now,
            updatedAt: now,
          });
        }
      }
    } catch (error) {
      console.error('[executeUpdateDocumentSummary] Error updating analytics:', error);
      // Don't fail the command execution if analytics update fails
    }
  }
}

/**
 * Generic typed batcher for throttling database update commands
 * Throttles updates to avoid excessive database writes
 * @template T - The command type (UpdateMessageCommand or UpdateDocumentSummaryCommand)
 */
export class UpdateCommandBatcher<T extends UpdateMessageCommand | UpdateDocumentSummaryCommand> {
  private pendingUpdate: T | null = null;
  private lastUpdateTime: number = Date.now();
  private readonly intervalMs: number;
  private readonly executor: (command: T, client: Client) => Promise<void>;
  private readonly getUuid: (command: T) => string;
  private readonly merge: (existing: T, incoming: T) => T;

  constructor(
    executor: (command: T, client: Client) => Promise<void>,
    getUuid: (command: T) => string,
    merge: (existing: T, incoming: T) => T,
    intervalMs: number = 2000
  ) {
    this.executor = executor;
    this.getUuid = getUuid;
    this.merge = merge;
    this.intervalMs = intervalMs;
  }

  /**
   * Add an update command to the batch
   * Returns true if the update was executed immediately, false if batched
   */
  async add(command: T, client: Client): Promise<boolean> {
    const now = Date.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;

    // Merge or set pending command FIRST (before executing, so we always have the latest data)
    if (this.pendingUpdate && this.getUuid(this.pendingUpdate) === this.getUuid(command)) {
      // Merge with existing pending update
      this.pendingUpdate = this.merge(this.pendingUpdate, command);
    } else {
      this.pendingUpdate = command;
    }

    // Execute pending update if interval has passed (now with the latest merged data)
    if (timeSinceLastUpdate >= this.intervalMs && this.pendingUpdate) {
      await this.executor(this.pendingUpdate, client);
      this.pendingUpdate = null;
      this.lastUpdateTime = now;
    }

    return timeSinceLastUpdate >= this.intervalMs;
  }

  /**
   * Execute any pending update
   */
  async flush(client: Client): Promise<void> {
    if (this.pendingUpdate) {
      await this.executor(this.pendingUpdate, client);
      this.pendingUpdate = null;
      this.lastUpdateTime = Date.now();
    }
  }
}

/**
 * Batcher for updateMessage commands
 */
export class MessageUpdateBatcher extends UpdateCommandBatcher<UpdateMessageCommand> {
  constructor(intervalMs: number = 2000) {
    super(
      async (command, client) => executeUpdateMessage(command, client),
      (command) => command.payload.messageUuid,
      (existing, incoming) => {
        const { messageUuid, ...restExistingPayload } = existing.payload;
        const { messageUuid: _, ...restIncomingPayload } = incoming.payload;
        return {
          ...existing,
          payload: {
            messageUuid,
            ...restExistingPayload,
            ...restIncomingPayload,
          },
        };
      },
      intervalMs
    );
  }
}

/**
 * Batcher for updateDocumentSummary commands
 */
export class DocumentSummaryUpdateBatcher extends UpdateCommandBatcher<UpdateDocumentSummaryCommand> {
  private hasExecutedFirstUpdate: boolean = false;
  private readonly FIRST_UPDATE_THRESHOLD_BYTES = 140;

  constructor(intervalMs: number = 2000) {
    super(
      async (command, client) => executeUpdateDocumentSummary(command, client),
      (command) => command.payload.documentSummaryUuid,
      (existing, incoming) => {
        const { documentSummaryUuid, ...restExistingPayload } = existing.payload;
        const { documentSummaryUuid: _, ...restIncomingPayload } = incoming.payload;
        return {
          ...existing,
          payload: {
            documentSummaryUuid,
            ...restExistingPayload,
            ...restIncomingPayload,
          },
        };
      },
      intervalMs
    );
  }

  /**
   * Override add to add special case: execute immediately when first update exceeds 140 bytes
   */
  async add(command: UpdateDocumentSummaryCommand, client: Client): Promise<boolean> {
    // Check if we've already executed the first update
    if (this.hasExecutedFirstUpdate) {
      // Use normal batching behavior
      return await super.add(command, client);
    }

    // This is the first update - merge it first to get the actual length
    const pendingUpdate = (this as any).pendingUpdate;
    let mergedCommand: UpdateDocumentSummaryCommand;
    
    if (pendingUpdate && (this as any).getUuid(pendingUpdate) === (this as any).getUuid(command)) {
      // Merge with existing pending update
      mergedCommand = (this as any).merge(pendingUpdate, command);
    } else {
      // Set as new pending update
      mergedCommand = command;
    }

    const mergedSummaryLength = mergedCommand.payload.summary?.length || 0;

    // Check if merged content exceeds threshold
    if (mergedSummaryLength >= this.FIRST_UPDATE_THRESHOLD_BYTES) {
      // Execute immediately for first update
      await (this as any).executor(mergedCommand, client);
      (this as any).pendingUpdate = null;
      (this as any).lastUpdateTime = Date.now();
      this.hasExecutedFirstUpdate = true;
      return true;
    }

    // Not enough content yet - use normal batching (will merge and wait)
    return await super.add(command, client);
  }
}

