import { BaseAgent, AgentContext, AgentOutput } from "../index";
import { INTENT, TIER, UserTier } from "../../intents";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { buildPrompt, handleStreamingResponse } from "./helpers";
import { generalChatPrompt } from "@functions/ai-chat/chat-prompts";
import { UpdateMessageCommand } from "../commands";

/**
 * Tutor chat agent for educational conversations
 * Uses educational/tutoring prompt to help users learn
 * Note: Does not handle flashcard/quiz creation - those are handled by specialized agents
 */
export class TutorChatAgent extends BaseAgent<ChatAgentInput> {
  name = 'tutor-chat-agent';
  description = 'Handles educational/tutoring chat conversations with optional reference context';

  async execute(input: ChatAgentInput, context: AgentContext): Promise<AgentOutput> {
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | undefined;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];

    if (!userInfo || !generationLimits) {
      console.error('[ChatAgent] User info or generation limits not found');
      return this.createResponse('Error: User info or generation limits not found');
    }

    // Build prompt and tools (only web search, no flashcard/quiz tools)
    // Use generalChatPrompt for tutor chat
    const { prompt, tools } = await buildPrompt(generalChatPrompt, input, userInfo, generationLimits);

    // Filter out flashcard and quiz tools - those are handled by specialized agents
    const chatTools = tools.filter(tool => {
      if (tool.type === 'function' && 'name' in tool) {
        return tool.name === 'web_search' || tool.name === 'webSearch';
      }
      return tool.type === 'web_search';
    });


    // Determine message tier based on message count
    // If user has premium features (super/ultra/technical), always use their tier
    // Otherwise, if they've exceeded free message limit, downgrade to free
    const MAX_PREMIUM_MESSAGES = Number(process.env.MAX_PREMIUM_MESSAGES || 5);
    const messageCount = input.messageCount as number || 0;
    const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
    const messageTier: UserTier = (messageCount >= MAX_PREMIUM_MESSAGES && !hasPremiumFeatures) ? TIER.FREE : userInfo.userTier;

    // Stream AI with chat configuration
    const toolCalls: Array<{ name: string; arguments: string }> = [];
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
          feature: 'chat_main',
          prompt: prompt,
          temperature: undefined, // Use default
          tools: chatTools.length > 0 ? chatTools : undefined,
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
      console.error('[ChatAgent] Error streaming AI:', error);

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

