import { BaseAgent, AgentContext, AgentOutput } from "../index";
import { INTENT } from "../../intents";
import { ChatAgentInput, QueryIntent, UserInfo } from "./types";
import { UpdateChatCommand, UpdateStatusCommand } from "../commands";
import { UnifiedTool } from "@ai-tools/types";
import { UnifiedFunctionCall } from "@ai-providers/unified-types";

const QUERY_UNDERSTANDING_PROMPT_BASE = (includeImageGeneration: boolean) => `You are a query understanding agent. Your job is to analyze the user's message and determine their intent.

Available intents:
- "generic_chat": Generic questions, general information requests, or casual conversation (like standard GPT)
- "tutor_chat": Educational questions, studying help, homework assistance, learning concepts, or anything related to studying/education
- "create_flashcard": User wants to create flashcards (e.g., "make flashcards about X", "create flashcard for Y", "I want flashcards")
- "create_quiz": User wants to create a quiz (e.g., "make a quiz about X", "create quiz for Y", "I want a quiz")
- "create_mock_exam": User wants to create a mock exam/practice test (e.g., "create mock exam", "practice test", "exam for X");
${includeImageGeneration ? `- "generate_image": User wants to generate/create an image (e.g., "generate an image of X", "create a picture of Y", "draw Z", "make an image", "show me an image of")` : ''}`;

const QUERY_UNDERSTANDING_PROMPT = (includeImageGeneration: boolean) => `${QUERY_UNDERSTANDING_PROMPT_BASE(includeImageGeneration)}

CRITICAL: The LAST message in the conversation is the MOST IMPORTANT for determining intent. The user's most recent message represents what they want to do RIGHT NOW. Previous messages provide context, but the final message takes precedence.

Important rules:
1. PRIORITIZE THE LAST MESSAGE: The user's most recent message is the primary source for intent determination. Previous messages provide context but should not override the intent expressed in the final message.
2. Only analyze the user's CURRENT message and conversation history (text only - ignore any file attachments or images)
3. STRICT RULE FOR CREATION INTENTS - ONLY use "create_flashcard", "create_quiz", or "create_mock_exam" if the user EXPLICITLY uses BOTH a creation verb ("create", "make", "generate", "I want") AND the item name ("flashcard", "quiz", "exam", "test")
4. For "chat" intent, distinguish between:
   - "generic_chat": General questions, information requests, lists, factual queries, casual conversation
   - "tutor_chat": Educational/studying context where the user wants to learn or understand, homework help, concept explanations

EXAMPLES FOR EACH INTENT:

generic_chat examples:
- "What's the weather today?" → generic_chat
- "Tell me about the Eiffel Tower" → generic_chat
- "List all European countries" → generic_chat
- "What are the capitals of European countries?" → generic_chat
- "write a list of countries in Europe" → generic_chat
- "What is photosynthesis?" → generic_chat (general information request)
- "Who was the first president of the United States?" → generic_chat

tutor_chat examples:
- "How do I solve this math problem?" → tutor_chat
- "Can you explain the water cycle to me?" → tutor_chat
- "Help me understand photosynthesis" → tutor_chat
- "I don't understand this concept, can you help?" → tutor_chat
- "What's the best way to study for this exam?" → tutor_chat
- "Can you walk me through solving this equation step by step?" → tutor_chat

create_flashcard examples:
- "Create 5 flashcards about photosynthesis" → create_flashcard
- "make flashcards for me about the water cycle" → create_flashcard
- "generate flashcards about European history" → create_flashcard
- "I want flashcards about math formulas" → create_flashcard
- "create flashcard for me" → create_flashcard
- "make me flashcards about biology" → create_flashcard

create_quiz examples:
- "create a quiz about world history" → create_quiz
- "make a quiz for me about science" → create_quiz
- "generate quiz about geography" → create_quiz
- "I want a quiz about math" → create_quiz
- "create quiz about European countries" → create_quiz

create_mock_exam examples:
- "create mock exam for SAT" → create_mock_exam
- "make a practice test for me" → create_mock_exam
- "generate exam about biology" → create_mock_exam
${includeImageGeneration ? `
generate_image examples:
- "generate an image of a sunset" → generate_image
- "create a picture of a cat" → generate_image
- "draw a landscape" → generate_image
- "make an image of a house" → generate_image
- "show me an image of mountains" → generate_image
` : ''}
MULTI-MESSAGE EXAMPLES (showing intent changes):

Example 1 - Educational chat then flashcard creation:
User: "What is photosynthesis?"
Assistant: [explains photosynthesis]
User: "Can you explain more about the light-dependent reactions?"
Assistant: [explains further]
User: "Create 5 flashcards about photosynthesis"
→ Intent: create_flashcard (the last message explicitly asks to create flashcards)

Example 2 - List request (should NOT create flashcards):
User: "What is photosynthesis?"
Assistant: [explains photosynthesis]
User: "list all European countries"
→ Intent: generic_chat (asking for a list, not creating flashcards)

Example 3 - Educational question (should NOT create flashcards):
User: "Tell me about the water cycle"
Assistant: [explains water cycle]
User: "what are the main stages?"
→ Intent: generic_chat (asking for information, not creating anything)

Example 4 - Tutor chat then quiz creation:
User: "How do I solve quadratic equations?"
Assistant: [helps solve]
User: "Can you explain factoring?"
Assistant: [explains]
User: "create a quiz about quadratic equations"
→ Intent: create_quiz (the last message explicitly asks to create a quiz)

Example 5 - General chat then image generation:
User: "What's the weather like?"
Assistant: [responds]
User: "generate an image of a sunny beach"
→ Intent: generate_image (the last message explicitly asks to generate an image)
${includeImageGeneration ? '' : ''}

REMEMBER:
- The LAST message determines the intent
- Previous messages provide context but don't override the final message
- Only use creation intents when the user EXPLICITLY asks to create/make/generate flashcards/quizzes/exams/images
- Lists, questions, and information requests should use generic_chat or tutor_chat

{{CHAT_TITLE_SECTION}}

Use the determine_intent function to specify the intent and any preliminary message.`;

import { createDetermineIntentTool } from "@ai-tools/determine-intent-tool";

/**
 * Agent that understands user query intent and routes to appropriate agent
 */
export class QueryUnderstandingAgent extends BaseAgent<ChatAgentInput> {
  name = 'query-understanding-agent';
  description = 'Analyzes user message intent and routes to appropriate specialized agent';

  async execute(input: ChatAgentInput, context: AgentContext): Promise<AgentOutput> {
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    // Check if image generation feature is enabled
    const userInfo = input.userInfo as UserInfo | undefined;
    const isAdmin = userInfo?.isAdmin || false;

    // Check feature flags from input (already filtered by handler for admin vs non-admin)
    const featureFlags = input.featureFlags || [];
    const flagImageGen = featureFlags.find((flag) => flag.flagName === 'img_gen');
    const isImageGenFeatureActive = (!!flagImageGen && flagImageGen.flagValue === 'active') ||
      (isAdmin && flagImageGen?.flagValue === 'admin_only');
    
    // Random status messages for query understanding
    const statusMessages = [
      'Firing up neurons...',
      'Analyzing your message...',
      'Decoding intent...',
      'Processing thoughts...',
      'Reading between the lines...',
      'Understanding context...',
      'Scanning for clues...',
      'Connecting the dots...',
      'Digesting information...',
      'Unpacking your request...',
      'Cracking the code...',
    ];
    const randomStatusMessage = statusMessages[Math.floor(Math.random() * statusMessages.length)];
    
    // Yield status update command
    this.yieldCommand(context, {
      type: 'updateStatus',
      payload: {
        messageUuid: input.messageUuid,
        status: 'understanding',
        message: randomStatusMessage,
      },
    } as UpdateStatusCommand);

    // Use history from input (populated by accessor)
    const messageHistory = history;

    // Get chat info for title suggestion from input (populated by accessor)
    const chatTitle = input.chatTitle || null;
    const titleChangedByTheUser = input.titleChangedByTheUser || false;

    // Filter history to text-only (remove any messages with attachments)
    const textOnlyHistory = messageHistory.filter(msg => {
      return typeof msg.content === 'string'
        && msg.content.trim().length > 0
        && !msg.content.includes('[file]')
        && !msg.content.includes('[image]');
    });

    // Build messages for AI call (user message + recent history for context)
    const recentHistory = textOnlyHistory.slice(-10); // Last 10 messages for context
    const messagesForAnalysis: Array<{ role: "user" | "assistant"; content: string }> = [
      ...recentHistory,
      { role: "user", content: input.message },
    ];


    // Build prompt with chat title section if needed
    // Use prompt with or without image generation based on feature flag
    let prompt = QUERY_UNDERSTANDING_PROMPT(isImageGenFeatureActive);
    if (chatTitle) {
      prompt = prompt.replace('{{CHAT_TITLE_SECTION}}', `\n\nCurrent chat title: "${chatTitle}"`);
    } else {
      prompt = prompt.replace('{{CHAT_TITLE_SECTION}}', '');
    }

    // Prepare tools - create tool with or without image generation based on feature flag
    const determineIntentTool = createDetermineIntentTool(isImageGenFeatureActive);
    const tools: UnifiedTool[] = [determineIntentTool];
    if (!titleChangedByTheUser && input.chatUuid) {
      prompt += '\n\nYou MUST provide a suggestedTitle in the determine_intent function call. Analyze the conversation (including message history) and provide a meaningful title. If the conversation has a clear topic, use a specific title. If it\'s just a greeting or unclear, use a generic title like "Chat" or "Conversation". The title helps users identify the chat later.';
    }

    try {
      // Call AI to analyze intent using function calling
      const result = await this.callAI(
        {
          ...input,
          userTier: 'technical',
          text: input.message,
        },
        context,
        {
          intent: INTENT.CHAT,
          category: 'chat',
          feature: 'query_understanding',
          prompt: prompt,
          temperature: 0.1, // Very low temperature for strict intent detection - prevents hallucinating creation intents
          tools: tools,
          messages: messagesForAnalysis,
        }
      );

      if (result.error) {
        console.error('[QueryUnderstandingAgent] AI call failed:', result.error);
        // Default to tutor_chat on error
        return this.delegateToAgent('tutor-chat-agent', input);
      }

      // Extract intent and optional title from function call
      let intent: QueryIntent = 'tutor_chat';
      let preliminaryMessage = '';
      let newChatTitle: string | null = null;

      if (result.output) {
        for (const item of result.output) {
          if (item.type === 'function_call') {
            const fnCall = item as UnifiedFunctionCall;

            if (fnCall.name === 'determine_intent') {
              try {
                const args = JSON.parse(fnCall.arguments);
                intent = args.intent || 'tutor_chat';
                preliminaryMessage = args.preliminaryMessage || '';
                newChatTitle = args.suggestedTitle?.trim() || null;
                
                // Validate intent (should already be validated by OpenAI schema, but double-check)
                const validIntents = isImageGenFeatureActive
                  ? ['generic_chat', 'tutor_chat', 'create_flashcard', 'create_quiz', 'create_mock_exam', 'generate_image']
                  : ['generic_chat', 'tutor_chat', 'create_flashcard', 'create_quiz', 'create_mock_exam'];
                if (!validIntents.includes(intent)) {
                  intent = 'tutor_chat';
                }
              } catch (parseError: any) {
                console.error('[QueryUnderstandingAgent] Error parsing function call arguments:', parseError);
                // Default to tutor_chat on parse error
                intent = 'tutor_chat';
              }
            }
          }
        }
      }

      // Yield update chat title command if provided and user hasn't manually changed it
      // Only update if we have a non-empty title
      if (newChatTitle && newChatTitle.trim().length > 0 && !titleChangedByTheUser && input.chatUuid) {
        this.yieldCommand(context, {
          type: 'updateChat',
          payload: {
            chatUuid: input.chatUuid,
            name: newChatTitle.trim(),
          },
        } as UpdateChatCommand);
      }

      // Prepare input for next agent
      const enrichedInput = {
        ...input,
        intent,
        history: messageHistory,
      };

      // Route to appropriate agent based on intent
      if (intent === 'create_flashcard') {
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'flashcard-agent', input: enrichedInput },
          { intent }
        );
      } else if (intent === 'create_quiz') {
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'quiz-agent', input: enrichedInput },
          { intent }
        );
      } else if (intent === 'create_mock_exam') {
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'mock-exam-chat-agent', input: enrichedInput },
          { intent }
        );
      } else if (intent === 'generic_chat') {
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'generic-chat-agent', input: enrichedInput },
          { intent }
        );
      } else if (intent === 'generate_image') {
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'image-generation-agent', input: enrichedInput },
          { intent }
        );
      } else {
        // Default to tutor_chat
        return this.createCombinedResponse(
          preliminaryMessage,
          { agentName: 'tutor-chat-agent', input: enrichedInput },
          { intent }
        );
      }
    } catch (error: any) {
      console.error('[QueryUnderstandingAgent] Error analyzing intent:', error);
      // Default to tutor_chat on error
      return this.delegateToAgent('tutor-chat-agent', input);
    }
  }
}

