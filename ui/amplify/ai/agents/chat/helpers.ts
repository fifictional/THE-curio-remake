import { Schema } from "@database-schema";
import { generateClient } from "aws-amplify/data";
import { ChatAgentInput, UserInfo, RateLimitInfo, GenerationLimits } from "./types";
import { createFlashcardTool } from "@ai-tools/create-flashcard-tool";
import { createMockExamTool } from "@ai-tools/create-mock-exam-tool";
import { createQuizTool } from "@ai-tools/create-quiz-tool";
import { webSearchTool } from "@ai-tools/web-search-tool";
import { UpdateMessageCommand, UpdateStatusCommand, CreateCitationCommand, CreateUserActionLogCommand, UpdateChatCommand, UpdateDocumentSummaryCommand } from "../commands";
import { UnifiedTool } from "@ai-tools/types";
import { v4 as uuidv4 } from "uuid";
import { 
  UnifiedResponseOutputItem, 
  UnifiedStreamEvent,
  UnifiedOutputItemAddedEvent,
  UnifiedTextDeltaEvent,
  UnifiedAudioChunkEvent,
  UnifiedResponseMessage,
  UnifiedImageOutput
} from "@ai-providers/unified-types";

const TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS = Number(process.env.TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS || 1);
const MAX_PREMIUM_MESSAGES = Number(process.env.MAX_PREMIUM_MESSAGES || 5);
const MAX_NORMAL_MESSAGES = Number(process.env.MAX_NORMAL_MESSAGES || 25);
const MAX_FREE_FLASHCARD_GENERATIONS = Number(process.env.MAX_FREE_FLASHCARD_GENERATIONS || 5);
const MAX_FREE_QUIZ_GENERATIONS = Number(process.env.MAX_FREE_QUIZ_GENERATIONS || 5);
const MAX_FREE_WEB_SEARCH_GENERATIONS = Number(process.env.MAX_FREE_WEB_SEARCH_GENERATIONS || 5);
const MAX_FREE_PRACTICE_TEST_GENERATIONS = Number(process.env.MAX_FREE_PRACTICE_TEST_GENERATIONS || 5);

/**
 * Get daily message count and rate limit info
 */
export async function getDailyMessageCount(
  client: ReturnType<typeof generateClient<Schema>>,
  userUuid: string
): Promise<RateLimitInfo> {
  const messages = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid },
    {
      filter: {
        actionType: { eq: 'sent_chat_message' },
      },
      limit: 50,
      sortDirection: 'DESC',
    }
  );

  const lastMessage = messages.data?.[0];

  if (!lastMessage) {
    return {
      messageCount: 0,
      messageCountInTheHourBlock: 0,
      nextMessageResetAt: null,
      allowed: true,
    };
  }

  const startOfHour = new Date(
    new Date(lastMessage.createdAt).getTime() - TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS * 60 * 60 * 1000
  ).toISOString();
  const messagesInTheLastHourOfTheLastMessage = messages.data?.filter((message) => message.createdAt > startOfHour);
  const nextMessageResetAt = new Date(
    new Date(lastMessage.createdAt).getTime() + TIME_TO_RESET_MESSAGE_LIMIT_IN_HOURS * 60 * 60 * 1000
  );
  const now = new Date();

  const messageCount = messages.data?.length ?? 0;
  const messageCountInTheHourBlock =
    now > nextMessageResetAt ? 0 : messagesInTheLastHourOfTheLastMessage?.length ?? 0;

  // Check if rate limited
  const allowed = messageCountInTheHourBlock < MAX_NORMAL_MESSAGES;

  return {
    messageCount,
    messageCountInTheHourBlock,
    nextMessageResetAt: nextMessageResetAt.toISOString(),
    allowed,
  };
}

/**
 * Get daily generation request counts
 */
export async function getDailyGenerationRequests(
  client: ReturnType<typeof generateClient<Schema>>,
  userUuid: string
): Promise<GenerationLimits> {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const flashcardGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'generated_flashcards' } }, limit: 10, sortDirection: 'DESC' }
  );

  const quizGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'generated_quiz' } }, limit: 10, sortDirection: 'DESC' }
  );

  const practiceTestGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'generated_practice_test' } }, limit: 10, sortDirection: 'DESC' }
  );

  const webSearchGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'web_searched' } }, limit: 10, sortDirection: 'DESC' }
  );

  const flashImageGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'generated_image_flash' } }, limit: 100, sortDirection: 'DESC' }
  );

  const proImageGenerationRequests = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt(
    { userUuid, createdAt: { ge: startOfDay } },
    { filter: { actionType: { eq: 'generated_image_pro' } }, limit: 100, sortDirection: 'DESC' }
  );

  return {
    flashcardGenerationRequests: flashcardGenerationRequests.data?.length ?? 0,
    quizGenerationRequests: quizGenerationRequests.data?.length ?? 0,
    practiceTestGenerationRequests: practiceTestGenerationRequests.data?.length ?? 0,
    webSearchGenerationRequests: webSearchGenerationRequests.data?.length ?? 0,
    flashImageGenerationRequests: flashImageGenerationRequests.data?.length ?? 0,
    proImageGenerationRequests: proImageGenerationRequests.data?.length ?? 0,
  };
}

/**
 * Prepare agent input with all necessary context
 */
export async function prepareAgentInput(
  client: ReturnType<typeof generateClient<Schema>>,
  chatInput: ChatAgentInput,
  userInfo: UserInfo,
  rateLimitInfo: RateLimitInfo,
  generationLimits: GenerationLimits
) {
  // Get message history
  const messages = await client.models.Message.listMessageByChatUuidAndCreatedAt(
    { chatUuid: chatInput.chatUuid },
    { limit: 50, sortDirection: 'DESC' }
  );

  const orderedMessages = messages.data?.reverse() || [];
  const history = orderedMessages.map((message) => ({
    role: message.role === "user" ? "user" as const : "assistant" as const,
    content: message.type === 'tool'
      ? `This message was response from a tool call with these arguments: ${message.toolArguments} and this text: ${message.content}`
      : message.content,
  }));

  return {
    ...chatInput,
    userTier: userInfo.userTier,
    client,
    userInfo,
    rateLimitInfo,
    generationLimits,
    history,
    messageCount: rateLimitInfo.messageCount,
  };
}

/**
 * Replaces placeholder text in prompts with actual tool descriptions based on limits
 */
export function replacePromptPlaceholders(
  prompt: string,
  generationLimits: GenerationLimits,
  isUserSubscribed: boolean,
  source: string
): string {
  // Replace flashcard tool description
  if (generationLimits.flashcardGenerationRequests < MAX_FREE_FLASHCARD_GENERATIONS || isUserSubscribed) {
    prompt = prompt.replace(
      '{{createFlashcardsToolDescription}}',
      `Create flashcards: Create space recall flashcards using the create_flashcard tool. Everytime you teach a new concept or explain a new thing, ask the user if they want to create a flashcard about it and you can generate up to 50 flashcards at a time.`
    );
  } else {
    prompt = prompt.replace(
      '{{createFlashcardsToolDescription}}',
      `The user has reached the daily limit of creating flashcards. You will not generate any flashcards for the user, but you will let him know that they can subscribe for Super Curio to unlock unlimited flashcards at the link: https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=flashcard_limit_reached.`
    );
  }

  // Replace quiz tool description
  if (generationLimits.quizGenerationRequests < MAX_FREE_QUIZ_GENERATIONS || isUserSubscribed) {
    prompt = prompt.replace(
      '{{createQuizzesToolDescription}}',
      `Create quizzes: Create quizzes using the create_quiz tool. Everytime you teach a new concept or explain a new thing, ask the user if they want to create a quiz about it and you can generate up to 1 quiz at a time.`
    );
  } else {
    prompt = prompt.replace(
      '{{createQuizzesToolDescription}}',
      `The user has reached the daily limit of creating quizzes. You will not generate any quizzes for the user, but you will let him know that they can subscribe for Super Curio to unlock unlimited quizzes at the link: https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=quiz_limit_reached.`
    );
  }

  // Replace web search tool description
  if (generationLimits.webSearchGenerationRequests < MAX_FREE_WEB_SEARCH_GENERATIONS || isUserSubscribed) {
    prompt = prompt.replace(
      '{{webSearchToolDescription}}',
      `Web search: Search the web using the web_search tool. Everytime you need to search the web, ask the user if they want to search the web and you can search the web at a time.`
    );
  } else {
    prompt = prompt.replace(
      '{{webSearchToolDescription}}',
      `The user has reached the daily limit of searching the web. You will not search the web for the user, but you will let him know that they can subscribe for Super Curio to unlock unlimited web searches at the link: https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=web_search_limit_reached.`
    );
  }

  // Replace mock exam tool description
  if (generationLimits.practiceTestGenerationRequests < MAX_FREE_PRACTICE_TEST_GENERATIONS || isUserSubscribed) {
    prompt = prompt.replace(
      '{{createMockExamToolDescription}}',
      `Create mock exam: Create mock exams using the create_mock_exam tool. Everytime you teach a new concept or explain a new thing, ask the user if they want to create a mock exam about it and you can generate up to 1 mock exam at a time.`
    );
  } else {
    prompt = prompt.replace(
      '{{createMockExamToolDescription}}',
      `The user has reached the daily limit of creating mock exams. You will not generate any mock exams for the user, but you will let him know that they can subscribe for Super Curio to unlock unlimited mock exams at the link: https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=mock_exam_limit_reached.`
    );
  }

  return prompt;
}

/**
 * Get message history for a chat
 */
export async function getMessageHistory(
  client: Awaited<ReturnType<typeof generateClient<Schema>>>,
  chatUuid: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {

  try {
    // Get past messages (limit 50, sorted by createdAt DESC)
    const messages = await client.models.Message.listMessageByChatUuidAndCreatedAt(
      { chatUuid },
      { limit: 50, sortDirection: 'DESC' }
    );

    if (!messages.data) {
      console.error('[getMessageHistory] Error getting messages:', messages.errors);
      return [];
    }

    // an empty assistant message is added to the history immediately after the user message
    // so we need to remove it
    // also the user message is added to the history immediately after the assistant message
    // so we need to remove that as well
    // remove first message if it's assistant (it would be empty and it should be the user message)
    messages.data.shift();
    messages.data.shift();

    // Reverse to get chronological order
    const orderedMessages = messages.data.reverse();

    // Format messages for AI model; drop empty turns (Gemini rejects parts with no text)
    const history = orderedMessages
      .map((message) => ({
        role: message.role === "user" ? "user" as const : "assistant" as const,
        content: message.content?.trim() ?? '',
      }))
      .filter((message) => message.content.length > 0);

    return history;
  } catch (error: any) {
    console.error('[getMessageHistory] Error retrieving history:', error.message, error.stack);
    return [];
  }
}

/**
 * Build prompt and tools based on chat type and user context
 * Accepts a base prompt from the agent and handles placeholder replacements and tool selection
 */
export async function buildPrompt(
  basePrompt: string,
  chatInput: ChatAgentInput,
  userInfo: UserInfo,
  generationLimits: GenerationLimits
): Promise<{ prompt: string; tools: UnifiedTool[] }> {
  const chatType = chatInput.chatType;
  let prompt = basePrompt;
  const tools: UnifiedTool[] = [];

  // Determine source for UTM parameters
  const source = chatType === 'document' ? 'document' :
    chatType === 'question' ? 'question' :
      chatType === 'mock_exam' ? 'mock_exam' : 'chat';

  // Replace user basic information
  prompt = prompt.replace('{{userBasicInformation}}', `User current situation: ${userInfo.userDescription} User is using Curio for: ${userInfo.userHelp}`);

  const memorySection = chatInput.memoryContext?.trim()
    ? `\n\n## What I remember about your learning\n${chatInput.memoryContext}\n`
    : '';
  const masterySection = chatInput.masteryContext?.trim()
    ? `\n\n## Topics you have mastered\n${chatInput.masteryContext}\n`
    : '';
  prompt = prompt.replace('{{memoryContext}}', memorySection);
  prompt = prompt.replace('{{masteryContext}}', masterySection);

  // Handle reference data if provided (for main chat type)
  if (chatType === 'main') {
    const { referenceData } = chatInput.chatArgs;
    if (referenceData && Array.isArray(referenceData) && referenceData.length > 0) {
      let referenceContext = '\n\n## Reference Context\n';
      for (const ref of referenceData) {
        if (ref.type === 'text') {
          referenceContext += `### ${ref.name}\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
        }
      }
      prompt = prompt.replace('{{referenceContext}}', referenceContext);
    } else {
      prompt = prompt.replace('{{referenceContext}}', '');
    }
  } else {
    prompt = prompt.replace('{{referenceContext}}', '');
  }

  // Handle document markdown - available for document chats or any chat with document context
  // The documentMarkdown is now set by the accessor (either RAG hits or markdown/summary)
  if (chatInput.documentMarkdown) {
    prompt = prompt.replace('{{data}}', `\n\n${chatInput.documentMarkdown}`);
  } else {
    prompt = prompt.replace('{{data}}', '');
  }

  // Replace prompt placeholders (tool descriptions, limits, etc.)
  const hasPremiumFeatures = userInfo.userTier === 'super' || userInfo.userTier === 'ultra' || userInfo.userTier === 'technical';
  prompt = replacePromptPlaceholders(prompt, generationLimits, hasPremiumFeatures, source);

  // Add tools based on chat type and limits
  if (chatType === 'main' || chatType === 'document') {
    // Add flashcard tool
    if (generationLimits.flashcardGenerationRequests < MAX_FREE_FLASHCARD_GENERATIONS || hasPremiumFeatures) {
      tools.push(createFlashcardTool);
    }
    // Add quiz tool
    if (generationLimits.quizGenerationRequests < MAX_FREE_QUIZ_GENERATIONS || hasPremiumFeatures) {
      tools.push(createQuizTool);
    }
    // Add web search tool if enabled
    if (chatInput.chatArgs.webSearch) {
      if (generationLimits.webSearchGenerationRequests < MAX_FREE_WEB_SEARCH_GENERATIONS || hasPremiumFeatures) {
        tools.push(webSearchTool);
      }
    }
  } else if (chatType === 'mock_exam') {
    // Only mock exam tool for mock exam chat
    if (generationLimits.practiceTestGenerationRequests < MAX_FREE_PRACTICE_TEST_GENERATIONS || hasPremiumFeatures) {
      tools.push(createMockExamTool);
    }
  }
  // Question chat doesn't use tools

  // Append question text at the bottom for question chat type
  if (chatType === 'question' && chatInput.questionText) {
    prompt += `\n\n${chatInput.questionText}`;
  }

  return { prompt, tools };
}

/**
 * Helper function to handle throttled content updates during streaming
 * Yields update command every 2 seconds when content is streaming
 * Works for both messages and document summaries
 * 
 * @param context - Agent context for yielding commands
 * @param uuid - UUID of the message or document summary to update
 * @param content - Current accumulated text content
 * @param lastCommandYield - Timestamp of last command yield (will be updated)
 * @param hasNewText - Whether there's new text in the current chunk
 * @param shouldUpdate - Optional condition to check before updating (default: true)
 * @param commandType - Type of command to yield ('message' or 'summary')
 * @returns Updated lastCommandYield timestamp if update was yielded, otherwise original timestamp
 */
export function handleThrottledUpdate(
  context: { yieldCommand: (command: UpdateMessageCommand | UpdateDocumentSummaryCommand) => void },
  uuid: string | undefined,
  content: string,
  lastCommandYield: number,
  hasNewText: boolean,
  shouldUpdate: boolean = true,
  commandType: 'message' | 'summary' = 'message'
): number {
  const DB_UPDATE_INTERVAL_MS = 1000; // Yield update command every 2 seconds

  if (!shouldUpdate || !uuid || !hasNewText) {
    return lastCommandYield;
  }

  const now = Date.now();
  const timeSinceLastUpdate = now - lastCommandYield;

  if (timeSinceLastUpdate >= DB_UPDATE_INTERVAL_MS) {
    if (commandType === 'message') {
      context.yieldCommand({
        type: 'updateMessage',
        payload: {
          messageUuid: uuid,
          content,
          isCompleted: false,
          agentStatus: null,
          agentStatusMessage: null,
        },
      } as UpdateMessageCommand);
    } else {
      context.yieldCommand({
        type: 'updateDocumentSummary',
        payload: {
          documentSummaryUuid: uuid,
          summary: content,
          isCompleted: false,
        },
      } as UpdateDocumentSummaryCommand);
    }
    return now;
  }

  return lastCommandYield;
}

/**
 * Helper function to handle throttled message content updates during streaming
 * Yields update command every 2 seconds when content is streaming
 * 
 * @deprecated Use handleThrottledUpdate instead
 * @param context - Agent context for yielding commands
 * @param messageUuid - UUID of the message to update
 * @param content - Current accumulated text content
 * @param lastCommandYield - Timestamp of last command yield (will be updated)
 * @param hasNewText - Whether there's new text in the current chunk
 * @param shouldUpdate - Optional condition to check before updating (default: true)
 * @returns Updated lastCommandYield timestamp if update was yielded, otherwise original timestamp
 */
export function handleThrottledMessageUpdate(
  context: { yieldCommand: (command: UpdateMessageCommand) => void },
  messageUuid: string | undefined,
  content: string,
  lastCommandYield: number,
  hasNewText: boolean,
  shouldUpdate: boolean = true
): number {
  return handleThrottledUpdate(
    context as any,
    messageUuid,
    content,
    lastCommandYield,
    hasNewText,
    shouldUpdate,
    'message'
  );
}

/**
 * Configuration for streaming event handlers
 */
export interface StreamingEventHandlers {
  /**
   * Called when a web_search_call event is detected
   */
  onWebSearchCall?: (context: { yieldCommand: (cmd: any) => void }, messageUuid: string | undefined) => void;
  /**
   * Called when a reasoning event is detected
   */
  onReasoning?: (context: { yieldCommand: (cmd: any) => void }, messageUuid: string | undefined) => void;
  /**
   * Called when a function_call event is detected
   */
  onFunctionCall?: (context: { yieldCommand: (cmd: any) => void }, messageUuid: string | undefined, data: any) => void;
  /**
   * Custom handler for output_item.added events (called before default handlers)
   */
  onOutputItemAdded?: (context: { yieldCommand: (cmd: any) => void }, itemType: string, data: any, messageUuid: string | undefined) => boolean; // Return true to skip default handling
}

/**
 * Configuration for post-streaming actions
 */
export interface PostStreamingActions {
  /**
   * Whether to yield web search commands if web search was called
   */
  yieldWebSearchCommands?: {
    chatUuid: string;
    userUuid: string;
  };
  /**
   * Whether to yield final message update with completed status
   */
  yieldFinalUpdate?: boolean;
}

/**
 * Result from streaming handler
 */
export interface StreamingResult {
  finalText: string;
  finalOutput: UnifiedResponseOutputItem[];
  webSearchCalled: boolean;
}

/**
 * Helper function to handle streaming AI responses with common event handling
 * Processes chunks, handles events, and performs post-streaming actions
 * 
 * @param stream - Async generator from streamAI
 * @param context - Agent context for yielding commands
 * @param messageUuid - UUID of the message being updated
 * @param handlers - Optional event handlers for custom behavior
 * @param postActions - Optional post-streaming actions
 * @returns Final text, output, and any tracked state (e.g., webSearchCalled)
 */
export async function handleStreamingResponse(
  stream: AsyncGenerator<UnifiedStreamEvent, {
    responseText?: string;
    output?: UnifiedResponseOutputItem[];
    error?: string;
    webSearchCalled?: boolean;
  }>,
  context: { yieldCommand: (cmd: any) => void },
  messageUuid: string | undefined,
  handlers: StreamingEventHandlers = {},
  postActions: PostStreamingActions = {}
): Promise<StreamingResult> {
  // Accumulate events for stitching at completion
  const accumulatedEvents: UnifiedStreamEvent[] = [];
  
  // Real-time text accumulation for streaming updates
  let streamingText = '';
  let finalOutput: UnifiedResponseOutputItem[] = [];
  let lastCommandYield = Date.now();
  let webSearchCalled = false;
  let functionCallDetected = false;
  let streamReturnValue: any = null;
  let completionReceived = false;
  let streamError: string | undefined;

  // Use for-await but capture return value manually
  const iterator = stream[Symbol.asyncIterator]();
  let done = false;
  
  while (!done) {
    const result = await iterator.next();
    done = result.done || false;
    
    if (done) {
      // Store return value
      streamReturnValue = result.value;
      break;
    }
    
    // Value is now just the event
    const event = result.value as UnifiedStreamEvent;
    
    // Store event for later stitching
    accumulatedEvents.push(event);
    
    // Extract text from text_delta events for real-time streaming updates
    if (event.type === 'text_delta') {
      streamingText += event.delta;
    }

    // Handle events

    if (event.type === 'output_item_added') {
      const itemType = event.item.type;

      // Call custom handler first if provided
      if (handlers.onOutputItemAdded) {
        const skipDefault = handlers.onOutputItemAdded(context, itemType, event.item, messageUuid);
        if (skipDefault) {
          // Custom handler handled it, skip default handling
        } else {
          // Default handling based on item type
          if (itemType === 'web_search_call') {
            webSearchCalled = true;
            if (handlers.onWebSearchCall) {
              handlers.onWebSearchCall(context, messageUuid);
            } else {
              // Default web search handler
              context.yieldCommand({
                type: 'updateStatus',
                payload: {
                  messageUuid,
                  status: 'searching_web',
                  message: 'Searching the web...',
                },
              } as UpdateStatusCommand);
              }
          } else if (itemType === 'reasoning') {
            if (handlers.onReasoning) {
              handlers.onReasoning(context, messageUuid);
            } else {
              // Default reasoning handler
              context.yieldCommand({
                type: 'updateStatus',
                payload: {
                  messageUuid,
                  status: 'thinking',
                  message: 'Thinking...',
                },
              } as UpdateStatusCommand);
            }
          } else if (itemType === 'function_call') {
            if (handlers.onFunctionCall) {
              functionCallDetected = true;
              handlers.onFunctionCall(context, messageUuid, event.item);
            }
          }
        }
      } else {
        // No custom handler, use default handling
        if (itemType === 'web_search_call') {
          webSearchCalled = true;
          context.yieldCommand({
            type: 'updateStatus',
            payload: {
              messageUuid,
              status: 'searching_web',
              message: 'Searching the web...',
            },
          } as UpdateStatusCommand);
        } else if (itemType === 'reasoning') {
          context.yieldCommand({
            type: 'updateStatus',
            payload: {
              messageUuid,
              status: 'thinking',
              message: 'Thinking...',
            },
          } as UpdateStatusCommand);
        } else if (itemType === 'function_call' && handlers.onFunctionCall) {
          functionCallDetected = true;
          handlers.onFunctionCall(context, messageUuid, event.item);
        } else if (itemType === 'function_call') {
          // Unhandled function_call — log loudly so we don't silently swallow
          // the model's output (which produces an empty response and the
          // "Sorry, I could not generate a response" fallback).
          const fn = (event.item as any) || {};
          console.warn('[handleStreamingResponse] unhandled function_call event', {
            messageUuid,
            functionName: fn.name,
            argsLength: typeof fn.arguments === 'string' ? fn.arguments.length : 0,
          });
        }
      }
    } else if (event.type === 'annotation_added') {
      const ann = event.annotation;
      if (ann.type === 'file_citation' || ann.type === 'url_citation') {
        // Yield citation command as we detect it
        context.yieldCommand({
          type: 'createCitation',
          payload: {
            citationUuid: uuidv4(),
            messageUuid,
            type: ann.type === 'file_citation' ? 'file' : 'web',
            title: ann.title || '',
            url: ann.url || ann.file_id || '',
            startIndex: ann.start_index || 0,
            endIndex: ann.end_index || 0,
          },
        } as CreateCitationCommand);
      }
    } else if (event.type === 'completion') {
      completionReceived = true;
      if (event.status === 'failed' && event.error) {
        streamError = event.error;
      }
      // Stitch events together now that we have completion
      finalOutput = stitchOutputFromEvents(accumulatedEvents);
      // Rebuild final text from stitched output, but fall back to streamingText if extraction fails
      const extractedText = extractTextFromOutput(finalOutput);
      streamingText = extractedText || streamingText;
    }

    // Yield update command immediately when content is streaming (batcher will handle timing)
    // Use functionCallDetected to conditionally update (for mock-exam-chat-agent)
    const hasNewText = event.type === 'text_delta' || (event.type === 'output_item_added' && event.item.type === 'message');
    const shouldUpdate = !functionCallDetected;
    
    // Yield command immediately if there's new text (batcher will handle throttling)
    if (shouldUpdate && messageUuid && hasNewText) {
      context.yieldCommand({
        type: 'updateMessage',
        payload: {
          messageUuid,
          content: streamingText,
          isCompleted: false,
          agentStatus: null,
          agentStatusMessage: null,
        },
      } as UpdateMessageCommand);
      lastCommandYield = Date.now();
    }
  }

  // If completion wasn't received, stitch from accumulated events anyway
  if (!completionReceived) {
    finalOutput = stitchOutputFromEvents(accumulatedEvents);
    // Only use extracted text if it's non-empty, otherwise keep accumulated streamingText
    const extractedText = extractTextFromOutput(finalOutput);
    if (extractedText) {
      streamingText = extractedText;
    }
  }

  // After loop completes, use return value if available
  if (streamReturnValue) {
    const returnValue = streamReturnValue as {
      responseText?: string;
      output?: UnifiedResponseOutputItem[];
      error?: string;
      webSearchCalled?: boolean;
    };
    // Use responseText from return value if available (it's the final accumulated text)
    // Prefer it if it's longer than what we have (more complete) or if we have nothing
    if (returnValue.responseText && (returnValue.responseText.length > streamingText.length || !streamingText)) {
      streamingText = returnValue.responseText;
    }
    // Use output from return value if available (it's the final parsed output)
    // Only if we didn't stitch from events
    if (returnValue.output && Array.isArray(returnValue.output) && returnValue.output.length > 0 && !completionReceived) {
      finalOutput = returnValue.output;
      // Try to extract text, but don't overwrite if extraction fails
      const extractedText = extractTextFromOutput(finalOutput);
      if (extractedText && extractedText.length > streamingText.length) {
        streamingText = extractedText;
      }
    }
    // Update webSearchCalled from return value if available
    if (returnValue.webSearchCalled !== undefined) {
      webSearchCalled = returnValue.webSearchCalled;
    }
    if (returnValue.error && !streamError) {
      streamError = returnValue.error;
    }
  }

  if (!streamingText.trim() && streamError) {
    throw new Error(streamError);
  }

  if (!streamingText.trim()) {
    console.warn('[handleStreamingResponse] produced no text', {
      messageUuid,
      accumulatedEventCount: accumulatedEvents.length,
      completionReceived,
      webSearchCalled,
      functionCallDetected,
      streamError,
      finalOutputItemCount: finalOutput.length,
    });
  } else {
    console.info('[handleStreamingResponse] produced text', {
      messageUuid,
      finalTextLength: streamingText.length,
      finalOutputItemCount: finalOutput.length,
      webSearchCalled,
      functionCallDetected,
    });
  }

  // Post-streaming actions
  if (postActions.yieldWebSearchCommands && webSearchCalled) {
    const now = new Date().toISOString();
    context.yieldCommand({
      type: 'createUserActionLog',
      payload: {
        userActionLogUuid: uuidv4(),
        userUuid: postActions.yieldWebSearchCommands.userUuid,
        actionType: 'web_searched',
        sourceType: 'chat',
        sourceUuid: postActions.yieldWebSearchCommands.chatUuid,
        createdAt: now,
      },
    } as CreateUserActionLogCommand);

    context.yieldCommand({
      type: 'updateChat',
      payload: {
        chatUuid: postActions.yieldWebSearchCommands.chatUuid,
        isWebSearchCalled: true,
      },
    } as UpdateChatCommand);
  }

  if (postActions.yieldFinalUpdate && messageUuid) {
    context.yieldCommand({
      type: 'updateMessage',
      payload: {
        messageUuid,
        content: streamingText,
        isCompleted: true,
      },
    } as UpdateMessageCommand);
  }

  return {
    finalText: streamingText,
    finalOutput,
    webSearchCalled,
  };
}

/**
 * Stitch output items from accumulated events using outputIndex and sequenceNumber
 * Excludes reasoning items as per requirements
 */
function stitchOutputFromEvents(events: UnifiedStreamEvent[]): UnifiedResponseOutputItem[] {
  // Group output items by outputIndex
  const outputItemsByIndex = new Map<number, UnifiedOutputItemAddedEvent[]>();
  
  // Group text deltas by sequence number (for ordering)
  const textDeltas: UnifiedTextDeltaEvent[] = [];
  
  // Group audio chunks by sequence number
  const audioChunks: UnifiedAudioChunkEvent[] = [];
  
  // Process all events
  for (const event of events) {
    if (event.type === 'output_item_added') {
      // Skip reasoning items
      if (event.item.type === 'reasoning') {
        continue;
      }
      
      const outputIndex = event.outputIndex;
      if (!outputItemsByIndex.has(outputIndex)) {
        outputItemsByIndex.set(outputIndex, []);
      }
      outputItemsByIndex.get(outputIndex)!.push(event);
    } else if (event.type === 'text_delta') {
      textDeltas.push(event);
    } else if (event.type === 'audio_chunk') {
      audioChunks.push(event);
    }
  }
  
  // Build final output array
  const finalOutput: UnifiedResponseOutputItem[] = [];
  
  // Sort output indices
  const sortedIndices = Array.from(outputItemsByIndex.keys()).sort((a, b) => a - b);
  
  for (const outputIndex of sortedIndices) {
    const items = outputItemsByIndex.get(outputIndex)!;
    // Sort items by sequenceNumber within this outputIndex
    items.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    
    // Add items in order
    for (const itemEvent of items) {
      finalOutput.push(itemEvent.item);
    }
  }
  
  // Add audio output if we have audio chunks
  if (audioChunks.length > 0) {
    // Sort audio chunks by sequence number
    audioChunks.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
    // Accumulate audio data
    const accumulatedAudio = audioChunks.map(chunk => chunk.audio).join('');
    const lastChunk = audioChunks[audioChunks.length - 1];
    
    finalOutput.push({
      type: 'audio_output',
      audioBase64: accumulatedAudio,
      mimeType: lastChunk.format === 'pcm16' ? 'audio/pcm16' : 'audio/mpeg',
    } as any);
  }
  
  return finalOutput;
}

/**
 * Extract text from output items (for final text reconstruction)
 */
function extractTextFromOutput(output: UnifiedResponseOutputItem[]): string {
  let text = '';
  
  for (const item of output) {
    if (item.type === 'message') {
      const messageItem = item as UnifiedResponseMessage;
      if (messageItem.content) {
        for (const content of messageItem.content) {
          if (content.type === 'output_text' && content.text) {
            text += content.text;
          }
        }
      }
    } else if (item.type === 'image_output') {
      const imageItem = item as UnifiedImageOutput;
      if (imageItem.text) {
        text += imageItem.text;
      }
    }
  }
  
  return text;
}