import { BaseAgent, AgentContext, AgentOutput } from "../index";
import { INTENT, TIER, UserTier } from "../../intents";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { buildPrompt, handleStreamingResponse } from "./helpers";
import { webSearchTool } from "@ai-tools/web-search-tool";
import { UpdateMessageCommand } from "../commands";
import { UnifiedTool } from "@ai-tools/types";

const GENERIC_CHAT_PROMPT = `You are a helpful AI assistant. You provide clear, concise, and informative responses to user questions.

Guidelines:
- Be conversational and friendly
- Provide accurate information
- Be concise but thorough
- If you don't know something, say so
- Use simple language when possible
- Answer in the same language as the user's messages

You can use web search if needed to provide up-to-date information.

## Provided Document Content
{{data}}

{{memoryContext}}

{{masteryContext}}

## User Basic Information
{{userBasicInformation}}
`;

/**
 * Generic chat agent for standard GPT-like conversations
 * Used for general questions that don't require educational/tutoring approach
 */
export class GenericChatAgent extends BaseAgent<ChatAgentInput> {
  name = 'generic-chat-agent';
  description = 'Handles generic chat conversations (standard GPT-like, non-educational)';

  async execute(input: ChatAgentInput, context: AgentContext): Promise<AgentOutput> {
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | undefined;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];

    if (!userInfo || !generationLimits) {
      console.error('[GenericChatAgent] User info or generation limits not found');
      return this.createResponse('Error: User info or generation limits not found');
    }

    // Build tools (only web search for generic chat)
    const webSearchTools: UnifiedTool[] = [];
    if (input.chatArgs?.webSearch) {
      const MAX_FREE_WEB_SEARCH_GENERATIONS = Number(process.env.MAX_FREE_WEB_SEARCH_GENERATIONS || 5);
      const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
      if (generationLimits.webSearchGenerationRequests < MAX_FREE_WEB_SEARCH_GENERATIONS || hasPremiumFeatures) {
        webSearchTools.push(webSearchTool);
      }
    }

    // Determine message tier based on message count
    // If user has premium features (super/ultra/technical), always use their tier
    // Otherwise, if they've exceeded free message limit, downgrade to free
    const MAX_PREMIUM_MESSAGES = Number(process.env.MAX_PREMIUM_MESSAGES || 5);
    const messageCount = input.messageCount as number || 0;
    const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
    const messageTier: UserTier = (messageCount >= MAX_PREMIUM_MESSAGES && !hasPremiumFeatures) ? TIER.FREE : userInfo.userTier;

    // Build prompt; ignore the tools from buildPrompt because they include
    // create_flashcard / create_quiz which this agent does not handle.
    // Routing to those agents is already done by QueryUnderstandingAgent.
    // Leaving those tools exposed makes Gemini sometimes emit a function_call
    // for short/ambiguous inputs (e.g. "hello"), which produces 0 text and
    // triggers the empty-response fallback.
    const { prompt, tools: promptTools } = await buildPrompt(GENERIC_CHAT_PROMPT, input, userInfo, generationLimits);
    const safePromptTools = promptTools.filter((tool) => {
      if (tool.type === 'function' && 'name' in tool) {
        return tool.name === 'web_search' || tool.name === 'webSearch';
      }
      return tool.type === 'web_search';
    });
    const allTools: UnifiedTool[] = [...safePromptTools, ...webSearchTools];

    // Stream AI with generic chat configuration
    const messageUuid = input.messageUuid;

    try {
      // Stream chunks and yield commands
      const stream = this.streamAI(
        {
          ...input,
          userTier: messageTier,
          text: input.message,
          image: input.image,
        },
        context,
        {
          intent: INTENT.CHAT,
          category: 'chat',
          feature: 'chat_generic',
          prompt: prompt,
          temperature: undefined, // Use default
          tools: allTools.length > 0 ? allTools : undefined,
          messages: history,
        }
      );

      // Handle streaming with common event handling
      const { finalText, finalOutput } = await handleStreamingResponse(
        stream,
        { yieldCommand: (cmd) => this.yieldCommand(context, cmd) },
        messageUuid,
        {}, // Use default handlers for web search and reasoning
        {
          yieldWebSearchCommands: input.chatUuid ? {
            chatUuid: input.chatUuid,
            userUuid: input.userUuid,
          } : undefined,
          yieldFinalUpdate: true,
        }
      );

      // Return final response directly (validation agent removed from loop)
      return this.createResponse(finalText, {
        output: finalOutput,
        isFinal: true,
      });
    } catch (error: any) {
      console.error('[GenericChatAgent] Error streaming AI:', error);

      // Yield error update command
      if (messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid,
            content: `Error: ${error.message || 'Failed to generate response'}`,
            isCompleted: true,
          },
        } as UpdateMessageCommand);
      }

      return this.createResponse(`Error: ${error.message || 'Failed to generate response'}`);
    }
  }
}

