import type { Schema } from '@database-schema';
import { generateClient } from 'aws-amplify/api';
import { Logger } from '@aws-lambda-powertools/logger';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { getUserPoolId, getUserTierInfo } from '../../utils/lambda-utils';
import { getMixpanel } from '../../utils/mixpanel';
import { orchestrator, InputAccessor } from '@ai-agents/orchestrator';
import { QueryUnderstandingAgent, GenericChatAgent, TutorChatAgent, ToolAcknowledgmentAgent, FlashcardAgent, QuizAgent, ValidationAgent, MockExamChatAgent, ImageGenerationAgent } from '@ai-agents/chat';
import { BaseAgentInput } from '@ai-agents/types';
import { ChatAgentInput, UserInfo } from '@ai-agents/chat/types';
import { TIER, UserTier } from '@ai-intents/tier';
import { getDailyMessageCount, getDailyGenerationRequests, getMessageHistory } from '@ai-agents/chat/helpers';
import { fetchDocumentContent, fetchFlashcardContentFromRag, fetchChatSummaryContentFromRag } from './document-content';
import { formatResetTime } from './format-reset-time';
import { DBCommand } from '@ai-agents/commands';
import { executeDBCommand, MessageUpdateBatcher } from '@ai-agents/command-executors';
import { v4 as uuidv4 } from 'uuid';
import { fetchMemoryForChat } from '@ai-memory/fetch-for-chat';
import { MemoryService } from '@ai-memory/memory-service';
import { ADDED_FROM_CHAT } from '@ai-memory/constants';
import { publishMemoryEvent } from '@ai-memory/publish-event';

type DataClient = ReturnType<typeof generateClient<Schema>>;

export interface AiChatInput {
  message: string;
  messageUuid: string;
  userUuid: string;
  image?: string;
  chatUuid: string;
  taskUuid: string;
  chatType: string;
  chatArgs?: Record<string, unknown>;
}

export interface AiChatOutput {
  success: boolean;
  error?: string;
}

const logger = new Logger({
  logLevel: 'INFO',
  serviceName: 'ai-chat-handler',
});

const cloudwatchClient = new CloudWatchClient({});

const MAX_MESSAGE_LENGTH = Number(process.env.MAX_MESSAGE_LENGTH || 255);
const MAX_NORMAL_MESSAGES = Number(process.env.MAX_NORMAL_MESSAGES || 25);
const MAX_RECENT_CHAT_TURNS = Number(process.env.MAX_RECENT_CHAT_TURNS || 20);

let orchestratorInitialized = false;

function ensureOrchestrator(client: DataClient): void {
  if (orchestratorInitialized) {
    return;
  }
  orchestrator.registerAll([
    { agent: new QueryUnderstandingAgent(), inputAccessor: createQueryUnderstandingAccessor(client) },
    { agent: new GenericChatAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new TutorChatAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new ToolAcknowledgmentAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new FlashcardAgent(), inputAccessor: createFlashcardAgentAccessor(client) },
    { agent: new QuizAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new ValidationAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new MockExamChatAgent(), inputAccessor: createChatAgentAccessor(client) },
    { agent: new ImageGenerationAgent(), inputAccessor: createChatAgentAccessor(client) },
  ]);
  orchestratorInitialized = true;
}

let client: DataClient;

/**
 * Input accessor for chat agents (tutor-chat, generic-chat, tool-acknowledgment)
 * Fetches message history and enriches input
 * For document chat type, fetches document markdown from DocumentSummary
 * For question chat type, fetches the question from MockExam
 */
function createChatAgentAccessor(client: ReturnType<typeof generateClient<Schema>>): InputAccessor {
  return async (baseInput: BaseAgentInput): Promise<ChatAgentInput> => {
    const chatInput = baseInput as ChatAgentInput;
    
    // Fetch message history
    let history = await getMessageHistory(client, chatInput.chatUuid);
    
    // Fetch document content - prioritize document chats over space chats
    let documentMarkdown: string | undefined;
    
    // Get chat data to check for documentUuid and spaceUuid
    let chatDocumentUuid: string | undefined;
    let spaceUuid: string | null = null;
    try {
      const chatData = await client.models.Chat.get({ chatUuid: chatInput.chatUuid });
      chatDocumentUuid = chatData.data?.documentUuid || undefined;
      spaceUuid = chatData.data?.spaceUuid || null;
    } catch (error) {
      console.error('[createChatAgentAccessor] Error fetching chat:', error);
    }
    
    // Priority 1: If chat is for a document (documentUuid from chat or chatArgs), use only that document
    const documentUuid = chatDocumentUuid || chatInput.chatArgs?.documentUuid;
    if (documentUuid) {
      documentMarkdown = await fetchDocumentContent(
        client,
        [documentUuid],
        chatInput.userUuid,
        chatInput.message
      );
    } 
    // Priority 2: If chat is for a space (no documentUuid but has spaceUuid), get all documents in space
    else if (spaceUuid) {
      try {
        // Fetch ALL documents in the space (with fileName for listing, hasRagEmbeddings for RAG)
        const spaceDocuments = await client.models.Document.listDocumentBySpaceUuidAndCreatedAt({
          spaceUuid,
        }, {
          selectionSet: ['documentUuid', 'fileName', 'hasRagEmbeddings'],
          limit: 500, // Reasonable limit for space documents
        });
        
        const allSpaceDocs = spaceDocuments.data || [];
        const documentUuidsForRag = allSpaceDocs
          .map(doc => doc.documentUuid)
          .filter(Boolean) as string[];
        
        // Always build document list so AI can answer "what files do you have" (EOPRD-808)
        const documentListSection = allSpaceDocs.length > 0
          ? `## Documents in this folder\n\nThe following ${allSpaceDocs.length} file(s) are available for this conversation:\n\n` +
            allSpaceDocs
              .map(doc => `- ${doc.fileName || `Document ${(doc.documentUuid || '').slice(0, 8)}`}`)
              .join('\n') +
            '\n\nWhen asked what documents you have access to, list the files above. Prioritise information from these documents when answering queries.\n\n'
          : '';
        
        // Try RAG: pass all documents - fetchDocumentContent checks OpenSearch per-doc and skips those without embeddings
        let ragContent: string | undefined;
        if (documentUuidsForRag.length > 0) {
          ragContent = await fetchDocumentContent(
            client,
            documentUuidsForRag,
            chatInput.userUuid,
            chatInput.message
          );
        }

        // EOPRD-813: Fetch flashcard and chat-summary RAG for space context
        const flashcardRag = await fetchFlashcardContentFromRag(
          chatInput.userUuid,
          spaceUuid,
          chatInput.message
        );
        const chatSummaryRag = await fetchChatSummaryContentFromRag(
          chatInput.userUuid,
          spaceUuid,
          chatInput.message
        );

        // Truncate history to most recent N turns for space chat (avoid token bloat)
        if (history.length > MAX_RECENT_CHAT_TURNS) {
          history = history.slice(-MAX_RECENT_CHAT_TURNS);
        }

        // Combine: document list + document RAG + flashcard RAG + chat summary RAG
        const parts: string[] = [
          documentListSection,
          ragContent,
          flashcardRag,
          chatSummaryRag,
        ].filter((s): s is string => !!s);
        if (parts.length > 0) {
          documentMarkdown = parts.join('\n\n---\n\n');
        }
      } catch (error) {
        console.error('[createChatAgentAccessor] Error fetching space documents:', error);
      }
    }
    
    // For question chat, fetch the question from MockExam
    let questionText: string | undefined;
    if (chatInput.chatType === 'question' && chatInput.chatArgs?.mockExamLogUuid && typeof chatInput.chatArgs.questionIndex === 'number') {
      try {
        const mockExamLogUuid = chatInput.chatArgs.mockExamLogUuid;
        const questionIndex = chatInput.chatArgs.questionIndex;
        
        // Fetch MockExamLog to get mockExamUuid
        const mockExamLog = await client.models.MockExamLog.get({
          mockExamLogUuid,
        }, {
          selectionSet: ['mockExamUuid'],
        });
        
        if (mockExamLog.data?.mockExamUuid) {
          // Fetch MockExam to get questions
          const mockExam = await client.models.MockExam.get({
            mockExamUuid: mockExamLog.data.mockExamUuid,
          }, {
            selectionSet: ['questions.*'],
          });
          
          // Get the question at the specified index
          const questions = mockExam.data?.questions || [];
          const question = questions.find((q: any) => q?.index === questionIndex);
          
          if (question) {
            // Format question text for the prompt
            let formattedQuestion = `## Current Question\n\n${question.questionContent || ''}\n\n`;
            
            if (question.options && question.options.length > 0) {
              formattedQuestion += `**Options:**\n`;
              question.options.forEach((option: string | null, idx: number) => {
                if (option) {
                  const label = String.fromCharCode(65 + idx); // A, B, C, D, etc.
                  formattedQuestion += `${label}. ${option}\n`;
                }
              });
              formattedQuestion += '\n';
            }
            
            if (question.hint) {
              formattedQuestion += `**Hint:** ${question.hint}\n\n`;
            }
            
            questionText = formattedQuestion;
          }
        }
      } catch (error) {
        console.error('[createChatAgentAccessor] Error fetching question from MockExam:', error);
        // Continue without question if fetch fails
      }
    }
    
    const documentUuids = documentUuid
      ? [documentUuid]
      : chatInput.chatArgs?.spaceDocumentUuids;

    let memoryContext = '';
    let masteryContext = '';
    const memStartedAt = Date.now();
    try {
      const mem = await fetchMemoryForChat(client, {
        ownerUuid: chatInput.userUuid,
        query: chatInput.message,
        spaceUuid,
        documentUuids,
      });
      memoryContext = mem.memoryContext;
      masteryContext = mem.masteryContext;
      console.info('[createChatAgentAccessor] memory fetched', {
        userUuid: chatInput.userUuid,
        memoryMs: Date.now() - memStartedAt,
        memoryContextLength: memoryContext.length,
        masteryContextLength: masteryContext.length,
      });
    } catch (memErr) {
      console.error('[createChatAgentAccessor] memory fetch failed:', memErr);
    }

    return {
      ...chatInput,
      history,
      documentMarkdown, // Pass markdown to be included in prompt
      questionText, // Pass question text to be included in prompt
      memoryContext,
      masteryContext,
    };
  };
}

/**
 * Input accessor for query-understanding-agent
 * Fetches chat title and message history
 */
function createQueryUnderstandingAccessor(client: ReturnType<typeof generateClient<Schema>>): InputAccessor {
  return async (baseInput: BaseAgentInput): Promise<ChatAgentInput> => {
    const chatInput = baseInput as ChatAgentInput;
    
    // Fetch message history
    const history = await getMessageHistory(client, chatInput.chatUuid);
    
    // Fetch chat info for title suggestion
    let chatTitle: string | null = null;
    let titleChangedByTheUser = false;
    try {
      const chatData = await client.models.Chat.get({ chatUuid: chatInput.chatUuid });
      chatTitle = chatData.data?.name || null;
      titleChangedByTheUser = chatData.data?.titleChangedByTheUser || false;
    } catch (error) {
      console.error('[Handler] Error fetching chat:', error);
    }
    
    return {
      ...chatInput,
      history,
      chatTitle: chatTitle || undefined,
      titleChangedByTheUser,
    };
  };
}

/**
 * Input accessor for flashcard-agent
 * Fetches chat data for spaceUuid and document content if available
 */
function createFlashcardAgentAccessor(client: ReturnType<typeof generateClient<Schema>>): InputAccessor {
  return async (baseInput: BaseAgentInput): Promise<ChatAgentInput> => {
    const chatInput = baseInput as ChatAgentInput;
    
    // Fetch message history
    const history = await getMessageHistory(client, chatInput.chatUuid);
    
    // Fetch chat data for spaceUuid and documentUuid
    let spaceUuid: string | null = null;
    let documentUuid: string | undefined;
    try {
      const chatData = await client.models.Chat.get({ chatUuid: chatInput.chatUuid });
      spaceUuid = chatData.data?.spaceUuid || null;
      documentUuid = chatData.data?.documentUuid || undefined;
    } catch (error) {
      console.error('[Handler] Error fetching chat for spaceUuid:', error);
    }
    
    // Fetch document content if documentUuid is available (from chat or chatArgs)
    let documentMarkdown: string | undefined;
    const docUuid = documentUuid || chatInput.chatArgs?.documentUuid;
    if (docUuid) {
      documentMarkdown = await fetchDocumentContent(
        client,
        [docUuid],
        chatInput.userUuid,
        chatInput.message
      );
    }
    
    return {
      ...chatInput,
      history,
      spaceUuid,
      documentMarkdown,
      // Ensure documentUuid is in chatArgs if we found it from chat
      chatArgs: {
        ...chatInput.chatArgs,
        documentUuid: docUuid || chatInput.chatArgs?.documentUuid,
      },
    };
  };
}

export async function runAiChat(
  dataClient: DataClient,
  input: AiChatInput,
): Promise<AiChatOutput> {
  client = dataClient;
  ensureOrchestrator(dataClient);

  const handlerStartedAt = Date.now();
  const { message, messageUuid, userUuid, image, chatUuid, taskUuid, chatType, chatArgs } = input;

  console.info('[Handler] start', {
    messageUuid,
    chatUuid,
    chatType,
    userUuid,
    messageLength: message?.length ?? 0,
    hasImage: !!image,
    chatArgsKeys: chatArgs ? Object.keys(chatArgs) : [],
  });

  // Validation
  if (!chatType) {
    console.error('[Handler] Chat type is required');
    throw new Error('Chat type is required');
  }
  if (!message) {
    console.error('[Handler] Message is required');
    throw new Error('Message is required');
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    console.error(`[Handler] Message is too long: ${message.length} > ${MAX_MESSAGE_LENGTH}`);
    throw new Error(`Message cannot be longer than ${MAX_MESSAGE_LENGTH} characters`);
  }

  // Update task status to PROCESSING
  await client.models.Task.update({
    taskUuid,
    status: 'PROCESSING',
  });

  try {
    // Get user information
    const userBasicInformation = await client.models.UserProfile.get(
      { userUuid }, 
      { selectionSet: ['userDescription', 'userHelp'] }
    );

    const userPoolId = getUserPoolId();
    if (!userPoolId) {
      throw new Error('User pool ID is required');
    }

    // Get user tier and subscription information
    const { userTier, userIsAdmin, subscriptionTier, isUserSubscribed } = await getUserTierInfo(client, userUuid);

    // Get rate limit info
    const rateLimitInfo = await getDailyMessageCount(client, userUuid);

    // Get feature flags
    let featureFlags: Array<{ flagName: string; flagValue: 'active' | 'inactive' | 'admin_only' }> = [];
    try {
      const appSettings = await client.models.AppSettings.list({
        selectionSet: ['featureFlags.*'],
      });
      
      if (appSettings.data && appSettings.data.length > 0) {
        const flags = appSettings.data[0].featureFlags || [];
        // Filter to only active flags for non-admin users, or all flags for admins
        featureFlags = flags.filter((flag): flag is { flagName: string; flagValue: 'active' | 'inactive' | 'admin_only' } => {
          if (!flag) return false;
          if (userIsAdmin) {
            // Admins see all flags (active, inactive, admin_only)
            return flag.flagValue === 'active' || flag.flagValue === 'admin_only';
          } else {
            // Non-admin users only see active flags
            return flag.flagValue === 'active';
          }
        });
      }
    } catch (error) {
      console.error('[Handler] Error fetching feature flags:', error);
      // Continue with empty feature flags array
    }

    // Check rate limit before proceeding
    if (!rateLimitInfo.allowed && !isUserSubscribed) {
      const utmSource = chatType === 'document' ? 'document' : 
                       chatType === 'question' ? 'question' : 
                       chatType === 'mock_exam' ? 'mock_exam' : 'chat';

      const mixpanelClient = await getMixpanel();
      if (mixpanelClient) {
        mixpanelClient.people.set(userUuid, {});
        mixpanelClient.track('free_message_limit_reached', {
          distinct_id: userUuid,
          messageCountInTheHourBlock: rateLimitInfo.messageCountInTheHourBlock,
          chatType,
        });
      }

      const now = new Date().toISOString();
      const resetTimeFormatted = formatResetTime(rateLimitInfo.nextMessageResetAt);
      
      await client.models.Message.update({
        messageUuid,
        content: `🎓 You've reached your free message limit for this hour.\n\nUpgrade to **Super Curio** for unlimited messages, practice tests, flashcards, and more!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=${utmSource}&utm_medium=chat&utm_campaign=free_message_limit_reached)\n\nYour free messages will reset ${resetTimeFormatted}.`,
        isCompleted: true,
        updatedAt: now,
      });

      await client.models.Task.update({
        taskUuid,
        status: 'COMPLETED',
      });

      return {
        success: true,
      };
    }

    // Get generation limits
    const generationLimits = await getDailyGenerationRequests(client, userUuid);

    // Prepare user info
    const userInfo: UserInfo = {
      userDescription: userBasicInformation.data?.userDescription || '',
      userHelp: userBasicInformation.data?.userHelp || '',
      userTier,
      subscriptionTier: subscriptionTier as 'super' | 'ultra' | null,
      isAdmin: userIsAdmin,
    };

    // Prepare agent input (base input - accessors will enrich it)
    const chatInput: ChatAgentInput = {
      userUuid,
      userTier,
      message,
      messageUuid,
      chatUuid,
      taskUuid,
      chatType: chatType as 'main' | 'document' | 'question' | 'mock_exam',
      chatArgs: chatArgs || {},
      image,
      userInfo,
      rateLimitInfo,
      generationLimits,
      messageCount: rateLimitInfo.messageCount,
      featureFlags,
    };

    // Command execution state - use batcher for updateMessage commands
    const messageUpdateBatcher = new MessageUpdateBatcher(2000);
    
    // Command execution function
    async function executeCommand(command: DBCommand): Promise<void> {
      try {
        await executeDBCommand(command, client, { chatUuid, messageBatcher: messageUpdateBatcher });
      } catch (error: any) {
        console.error(`[Handler] Error executing command ${command.type}:`, error);
      }
    }

    console.info('[Handler] starting orchestrator', {
      messageUuid,
      chatType,
      userTier,
      historyAvailable: false,
      featureFlagsCount: featureFlags.length,
      preflightMs: Date.now() - handlerStartedAt,
    });

    // Execute orchestrator with command stream - start with query-understanding-agent
    const orchestratorStartedAt = Date.now();
    const commandStream = orchestrator.executeWithStream(
      'query-understanding-agent',
      chatInput,
      {
        saveTokenData: async (tokenData) => {
          await client.models.UserRequest.create(tokenData);
        },
        cloudwatchClient,
      }
    );

    // Process commands from stream and get final result
    let result: any = null;
    let commandIterator = commandStream[Symbol.asyncIterator]();
    let next: IteratorResult<DBCommand, any> = await commandIterator.next();
    let commandCount = 0;
    const commandTypeCounts: Record<string, number> = {};
    
    while (!next.done) {
      // Yielded command
      if (next.value) {
        commandCount++;
        const cmdType = (next.value as DBCommand).type || 'unknown';
        commandTypeCounts[cmdType] = (commandTypeCounts[cmdType] ?? 0) + 1;
        await executeCommand(next.value);
      }
      next = await commandIterator.next();
    }
    
    // After done, the return value is available
    if (next.done && next.value) {
      result = next.value;
    }

    console.info('[Handler] orchestrator finished', {
      messageUuid,
      orchestratorMs: Date.now() - orchestratorStartedAt,
      commandCount,
      commandTypeCounts,
      responseLength: result?.response?.length ?? 0,
      hasNextAgent: !!result?.nextAgent,
      metadataKeys: result?.metadata ? Object.keys(result.metadata) : [],
    });

    // Flush any pending message updates
    await messageUpdateBatcher.flush(client);

    // Handle rate limit response
    if (result.metadata?.allowed === false) {

      const now = new Date().toISOString();
      await client.models.Message.update({
        messageUuid,
        content: result.response || '',
        isCompleted: true,
        updatedAt: now,
      });

      await client.models.Task.update({
        taskUuid,
        status: 'COMPLETED',
      });

      return {
        success: true,
      };
    }

    const now = new Date().toISOString();
    const responseText = result?.response || '';

    // Fallback: ensure assistant message completes if streaming produced no content
    if (!responseText?.trim()) {
      const msgRow = await client.models.Message.get({ messageUuid });
      const existing = msgRow.data?.content?.trim() ?? '';
      console.warn('[Handler] empty response from orchestrator, applying fallback path', {
        messageUuid,
        existingContentLength: existing.length,
        existingIsCompleted: msgRow.data?.isCompleted ?? null,
        commandCount,
        commandTypeCounts,
      });
      if (!existing) {
        await client.models.Message.update({
          messageUuid,
          content:
            'Sorry, I could not generate a response. Please try sending your message again.',
          isCompleted: true,
          updatedAt: now,
        });
      } else if (msgRow.data?.isCompleted !== true) {
        await client.models.Message.update({
          messageUuid,
          isCompleted: true,
          updatedAt: now,
        });
      }
    } else {
      console.info('[Handler] response generated', {
        messageUuid,
        responseLength: responseText.length,
      });
    }

    // Note: Tool calls, web search, and citations are now handled via commands yielded by agents
    // All DB operations for these are executed via the command stream above

    // Log user action for sending chat message
    await client.models.UserActionLog.create({
      userActionLogUuid: uuidv4(),
      userUuid,
      actionType: 'sent_chat_message',
      sourceType: 'chat',
      sourceUuid: chatUuid,
      createdAt: now,
    });

    // Enqueue async memory reflection only when memory is enabled (admin + user)
    try {
      const memorySvc = new MemoryService(client);
      if (await memorySvc.isMemoryEnabledForUser(userUuid)) {
        let assistantTurn = responseText;
        if (!assistantTurn) {
          const msg = await client.models.Message.get({ messageUuid });
          assistantTurn = msg.data?.content ?? '';
        }
        const chatRow = await client.models.Chat.get({ chatUuid });
        const docIds: string[] | undefined = chatRow.data?.documentUuid
          ? [chatRow.data.documentUuid]
          : (chatArgs?.spaceDocumentUuids as string[] | undefined);

        await publishMemoryEvent({
          type: 'chat_interaction',
          ownerUuid: userUuid,
          chatUuid,
          messageUuid,
          userTurn: message,
          assistantTurn,
          spaceUuid: chatRow.data?.spaceUuid ?? null,
          documentUuids: docIds,
          occurredAt: now,
          addedFrom: ADDED_FROM_CHAT,
          isBackfill: false,
        });
      }
    } catch (memEnqueueErr) {
      console.error('[Handler] memory enqueue failed:', memEnqueueErr);
    }

    // Update task status
    await client.models.Task.update({
      taskUuid,
      status: 'COMPLETED',
    });

    console.info('[Handler] done', {
      messageUuid,
      totalMs: Date.now() - handlerStartedAt,
    });

    return {
      success: true,
    };
  } catch (error: any) {
    console.error('Error in ai-chat handler:', error, {
      messageUuid,
      totalMs: Date.now() - handlerStartedAt,
    });

    const now = new Date().toISOString();
    const errorText =
      'Sorry, something went wrong while generating a reply. Please try again in a moment.';

    try {
      await client.models.Message.update({
        messageUuid,
        content: errorText,
        isCompleted: true,
        updatedAt: now,
      });
    } catch (updateErr) {
      console.error('[Handler] Failed to mark assistant message complete after error:', updateErr);
    }

    await client.models.Task.update({
      taskUuid,
      status: 'FAILED',
      error: error.message || 'Unknown error',
    });

    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

