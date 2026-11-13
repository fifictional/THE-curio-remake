import { Agent, BaseAgentInput, AgentContext, AgentOutput } from "./types";
import { AIClient, AICallConfig } from "../ai-client";
import { DBCommand } from "./commands";
import { UnifiedTool } from "@ai-tools/types";
import { UnifiedResponseOutputItem, UnifiedStreamEvent } from "@ai-providers/unified-types";
import { IntentName, UserTier as IntentUserTier } from "../intents";

/**
 * Configuration for AI model calls within an agent
 */
export interface AgentAIConfig {
  /**
   * Intent determines which provider/model will be used
   * The AI client automatically selects the best model based on intent and user tier
   */
  intent: IntentName;
  /**
   * Category for analytics
   */
  category: 'chat' | 'document' | 'generation' | 'extraction';
  /**
   * Feature name for analytics
   */
  feature: string;
  /**
   * System prompt/instructions
   */
  prompt: string;
  /**
   * Temperature for generation (optional)
   */
  temperature?: number;
  /**
   * Tools/functions available to the model (optional)
   */
  tools?: UnifiedTool[];
  /**
   * Raw input messages (optional, for chat mode)
   */
  messages?: Array<{
    role: "user" | "developer" | "assistant";
    content: string;
  }>;
  /**
   * Image generation options (for image generation models)
   */
  imageGenerationOptions?: {
    aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
    resolution?: '1K' | '2K' | '4K';
  };
}

/**
 * Base class for agents that need to call AI models
 * Provides helper methods for common AI interactions
 * 
 * @template TInput - The specific input type this agent requires (extends BaseAgentInput)
 */
export abstract class BaseAgent<TInput extends BaseAgentInput = BaseAgentInput> implements Agent {
  abstract name: string;
  abstract description: string;

  /**
   * Execute the agent - must be implemented by subclasses
   * Input is typed to TInput for type safety
   */
  abstract execute(input: TInput, context: AgentContext): Promise<AgentOutput>;

  /**
   * Helper method to prepare AI client and configuration for AI calls
   * Extracts common setup logic shared between callAI and streamAI
   */
  private prepareAICall(
    input: BaseAgentInput,
    context: AgentContext,
    config: AgentAIConfig
  ): {
    aiClient: AIClient;
    callConfig: AICallConfig;
  } {
    const { userUuid, userTier, ...userContent } = input;

    // Create AI client instance (handles analytics internally)
    const aiClient = new AIClient({
      userUuid,
      saveTokenData: context.saveTokenData,
      cloudwatchClient: context.cloudwatchClient,
    });

    // Extract file URL from input (supports both fileUrl and txtFileUrl for backward compatibility)
    const fileUrl = (userContent as any).fileUrl || (userContent as any).txtFileUrl;
    
    // Build UserContentItem[] array
    const userContentItems: AICallConfig['userContent'] = [];
    
    // Add text content: first entry is userContent.text, then other entries as key:value pairs
    const textArray: string[] = [];
    if (userContent.text) {
      textArray.push(userContent.text);
    }
    
    // Add other userContent entries as key:value pairs (excluding image, fileUrl, txtFileUrl)
    const excludedKeys = ['text', 'image', 'fileUrl', 'txtFileUrl'];
    for (const [key, value] of Object.entries(userContent)) {
      if (!excludedKeys.includes(key) && value !== undefined) {
        const formattedValue = typeof value === 'string' ? value : JSON.stringify(value);
        textArray.push(`${key}: ${formattedValue}`);
      }
    }
    
    // Add text items
    for (const textItem of textArray) {
      userContentItems.push({
        mimeType: 'text/plain',
        content: textItem,
      });
    }
    
    // Add image if provided
    if (userContent.image) {
      // Extract base64 from data URL if present (for backward compatibility)
      // Going forward, content should be raw base64
      let imageBase64 = userContent.image;
      if (imageBase64.startsWith('data:')) {
        const match = imageBase64.match(/^data:[^;]+;base64,(.+)$/);
        if (match) {
          imageBase64 = match[1];
        }
      }
      
      userContentItems.push({
        mimeType: 'image/png', // Default, could be improved by detecting from original data URL
        content: imageBase64,
      });
    }
    
    // Add file URL if provided (will be sent as input_file to OpenAI)
    if (fileUrl && typeof fileUrl === 'string' && fileUrl.trim().length > 0) {
      // Determine mimeType from file extension
      const extension = fileUrl.split('?')[0].split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream'; // Default
      
      if (extension === 'pdf') {
        mimeType = 'application/pdf';
      } else if (extension === 'txt' || extension === 'text') {
        mimeType = 'text/plain';
      } else if (extension === 'md' || extension === 'markdown') {
        mimeType = 'text/markdown';
      } else if (extension === 'mp3' || extension === 'mpeg') {
        mimeType = 'audio/mpeg';
      } else if (extension === 'wav') {
        mimeType = 'audio/wav';
      } else if (extension === 'm4a') {
        mimeType = 'audio/m4a';
      }
      
      userContentItems.push({
        mimeType,
        contentURL: fileUrl,
      });
    }
    
    const aiUserContent = userContentItems;

    // Extract continuation data from input if present (for function call continuation)
    const previousOutput = (input as any).previousOutput;
    const functionCallOutput = (input as any).functionCallOutput;
    const messagesWithContinuation = previousOutput || functionCallOutput
      ? [...(config.messages || []), { previousOutput, functionCallOutput } as any]
      : config.messages;

    const callConfig: AICallConfig = {
      intent: config.intent,
      userTier: userTier as IntentUserTier,
      prompt: config.prompt,
      userContent: aiUserContent,
      category: config.category,
      feature: config.feature,
      temperature: config.temperature,
      tools: config.tools,
      messages: messagesWithContinuation,
      imageGenerationOptions: config.imageGenerationOptions,
    };

    return { aiClient, callConfig };
  }

  /**
   * Helper method to call AI models with consistent configuration
   * Analytics are handled automatically - caller doesn't need to know about saveTokenData
   */
  protected async callAI(
    input: BaseAgentInput,
    context: AgentContext,
    config: AgentAIConfig
  ): Promise<{
    responseText?: string;
    output?: UnifiedResponseOutputItem[];
    error?: string;
  }> {
    const { aiClient, callConfig } = this.prepareAICall(input, context, config);
    const startedAt = Date.now();
    console.info('[BaseAgent] callAI start', {
      agent: this.name,
      intent: config.intent,
      feature: config.feature,
      category: config.category,
      promptLength: config.prompt?.length ?? 0,
      messageCount: Array.isArray(config.messages) ? config.messages.length : 0,
      toolCount: config.tools?.length ?? 0,
    });
    const result = await aiClient.call(callConfig);
    console.info('[BaseAgent] callAI done', {
      agent: this.name,
      feature: config.feature,
      durationMs: Date.now() - startedAt,
      responseTextLength: result.responseText?.length ?? 0,
      outputItemCount: result.output?.length ?? 0,
      hasError: !!result.error,
      error: result.error,
    });
    return result;
  }

  /**
   * Helper method to stream AI responses
   * Returns an async generator that yields UnifiedStreamEvent
   */
  protected streamAI(
    input: BaseAgentInput,
    context: AgentContext,
    config: AgentAIConfig
  ): AsyncGenerator<UnifiedStreamEvent, {
    responseText?: string;
    output?: UnifiedResponseOutputItem[];
    error?: string;
  }> {
    const { aiClient, callConfig } = this.prepareAICall(input, context, config);
    const agentName = this.name;
    return (async function* () {
      const startedAt = Date.now();
      console.info('[BaseAgent] streamAI start', {
        agent: agentName,
        intent: config.intent,
        feature: config.feature,
        category: config.category,
        promptLength: config.prompt?.length ?? 0,
        messageCount: Array.isArray(config.messages) ? config.messages.length : 0,
        toolCount: config.tools?.length ?? 0,
      });
      const eventCounts: Record<string, number> = {};
      let textDeltaChars = 0;
      try {
        const inner = aiClient.streamChunks(callConfig);
        let next = await inner.next();
        while (!next.done) {
          const ev = next.value as UnifiedStreamEvent;
          eventCounts[ev.type] = (eventCounts[ev.type] ?? 0) + 1;
          if (ev.type === 'text_delta') {
            textDeltaChars += ev.delta?.length ?? 0;
          }
          yield ev;
          next = await inner.next();
        }
        const ret = next.value as {
          responseText?: string;
          output?: UnifiedResponseOutputItem[];
          error?: string;
        };
        console.info('[BaseAgent] streamAI done', {
          agent: agentName,
          feature: config.feature,
          durationMs: Date.now() - startedAt,
          eventCounts,
          textDeltaChars,
          responseTextLength: ret?.responseText?.length ?? 0,
          outputItemCount: ret?.output?.length ?? 0,
          hasError: !!ret?.error,
          error: ret?.error,
        });
        return ret;
      } catch (err) {
        console.error('[BaseAgent] streamAI threw', {
          agent: agentName,
          feature: config.feature,
          durationMs: Date.now() - startedAt,
          eventCounts,
          textDeltaChars,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    })();
  }

  /**
   * Helper method to create a simple text response
   */
  protected createResponse(text: string, metadata?: Record<string, any>): AgentOutput {
    return {
      response: text,
      isFinal: true,
      metadata,
    };
  }

  /**
   * Helper method to delegate to another agent
   */
  protected delegateToAgent(
    agentName: string,
    input: BaseAgentInput,
    mergeResponse: boolean = false
  ): AgentOutput {
    return {
      nextAgent: {
        agentName,
        input,
        mergeResponse,
      },
      isFinal: false,
    };
  }

  /**
   * Helper method to create a combined response (response + delegation)
   */
  protected createCombinedResponse(
    text: string,
    nextAgent: {
      agentName: string;
      input: BaseAgentInput;
      mergeResponse?: boolean;
    },
    metadata?: Record<string, any>
  ): AgentOutput {
    return {
      response: text,
      nextAgent,
      isFinal: false,
      metadata,
    };
  }

  /**
   * Helper method to yield a database command
   * Agents should use this instead of directly accessing the database
   */
  protected yieldCommand(context: AgentContext, command: DBCommand): void {
    context.yieldCommand(command);
  }
}

