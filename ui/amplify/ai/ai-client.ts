import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import { Schema } from "@database-schema";
import { ProviderRateLimitError, UserContentItem, ModelProvider } from "@ai-providers/types";
import { UnifiedStreamEvent } from "@ai-providers/unified-types";
import { AllModels } from "@ai-providers/all-models";
import { ProviderResolver } from "@ai-providers/provider-resolver";
import { UnifiedTool } from "@ai-tools/types";
import { getModelsForIntent, IntentName, UserTier as IntentUserTier } from "./intents";

import "@ai-providers/index"; // Import to ensure providers are registered

/**
 * Rate limit error for retry handling
 */
class RateLimitError extends Error {
  constructor(
    public status: number,
    public model: AllModels,
    public headers: Headers
  ) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

export interface AIMessageContent {
  role: "user" | "model" | "developer";
  content: string;
}

/**
 * Configuration for AI calls
 */
export interface AICallConfig {
  /**
   * Intent determines which provider/model will be used
   * The AI client automatically selects the best model based on intent and user tier
   */
  intent: IntentName;
  /**
   * User tier determines which specific models are available
   */
  userTier: IntentUserTier;
  /**
   * System prompt/instructions
   */
  prompt: string;
  /**
   * User content (text, image, etc.) as a list of content items
   * Each item has a mimeType and either content (inline) or contentURL (external)
   */
  userContent: UserContentItem[];
  /**
   * Category for analytics
   */
  category: 'chat' | 'document' | 'generation' | 'extraction';
  /**
   * Feature name for analytics
   */
  feature: string;
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
  messages?: Array<AIMessageContent>;
  /**
   * Image generation options (for image generation models)
   */
  imageGenerationOptions?: {
    aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
    resolution?: '1K' | '2K' | '4K';
  };

  generateRawEvents?: boolean;
}

/**
 * Result from an AI call
 */
export interface AICallResult {
  /**
   * Response text from the AI
   */
  responseText?: string;
  /**
   * Raw output items (function calls, messages, etc.)
   */
  output?: any[];
  /**
   * Error message if the call failed
   */
  error?: string;
}

/**
 * Internal context for AI client (handled automatically)
 */
interface AIClientContext {
  userUuid: string;
  saveTokenData: (tokenData: Schema['UserRequest']['createType']) => Promise<void>;
  cloudwatchClient: CloudWatchClient;
  documentUuid?: string;
}


/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 5,
  retryCount: number = 0
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retryCount >= maxRetries) {
      throw error;
    }

    // Check if it's a rate limit error
    if (error instanceof RateLimitError || error instanceof ProviderRateLimitError) {
      const backoffMs = 1000 * Math.pow(2, retryCount);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
      return retryWithBackoff(fn, maxRetries, retryCount + 1);
    }

    throw error;
  }
}

/**
 * Store analytics data
 */
async function storeAnalytics(
  context: AIClientContext,
  model: AllModels,
  category: string,
  feature: string,
  retryCount: number,
  tokenData: {
    totalTokenCount: number;
    promptTokenCount: number;
    candidatesTokenCount: number;
    thoughtsTokenCount: number;
    toolUsePromptTokenCount: number;
    cachedContentTokenCount: number;
  },
  xRequestData: {
    requestStatus: number;
    latency: number;
    xRequestId: string;
    xRateLimitLimitRequests: number;
    xRateLimitLimitTokens: number;
    xRateLimitRemainingRequests: number;
    xRateLimitRemainingTokens: number;
    xRateLimitResetRequests: string;
    xRateLimitResetTokens: string;
  },
  webSearchCalled: boolean = false
): Promise<void> {
  const now = new Date().toISOString();

  // Save to database
  await context.saveTokenData({
    userUuid: context.userUuid,
    model: model,
    retryCount: retryCount,
    category: category as 'chat' | 'document' | 'generation' | 'extraction',
    feature: feature,
    totalTokenCount: tokenData.totalTokenCount,
    promptTokenCount: tokenData.promptTokenCount,
    candidatesTokenCount: tokenData.candidatesTokenCount,
    thoughtsTokenCount: tokenData.thoughtsTokenCount,
    toolUsePromptTokenCount: tokenData.toolUsePromptTokenCount,
    cachedContentTokenCount: tokenData.cachedContentTokenCount,
    image: false,
    documentUuid: context.documentUuid,
    requestStatus: xRequestData.requestStatus,
    latency: xRequestData.latency,
    xRequestId: xRequestData.xRequestId,
    xRateLimitLimitRequests: xRequestData.xRateLimitLimitRequests,
    xRateLimitLimitTokens: xRequestData.xRateLimitLimitTokens,
    xRateLimitRemainingRequests: xRequestData.xRateLimitRemainingRequests,
    xRateLimitRemainingTokens: xRequestData.xRateLimitRemainingTokens,
    xRateLimitResetRequests: xRequestData.xRateLimitResetRequests,
    xRateLimitResetTokens: xRequestData.xRateLimitResetTokens,
    webSearchCalled: webSearchCalled,
    createdAt: now,
    updatedAt: now,
  } as Schema['UserRequest']['createType']);

  // Send CloudWatch metrics
  const requestsCommand = new PutMetricDataCommand({
    MetricData: [
      {
        MetricName: 'Requests',
        Unit: 'Count',
        Value: 1,
        Dimensions: [
          {
            Name: 'model',
            Value: model,
          },
        ],
      },
    ],
    Namespace: 'Curio',
  });
  await context.cloudwatchClient.send(requestsCommand);

  const tokensCommand = new PutMetricDataCommand({
    MetricData: [
      {
        MetricName: 'Tokens',
        Unit: 'Count',
        Dimensions: [
          {
            Name: 'model',
            Value: model,
          },
        ],
        Value: tokenData.totalTokenCount,
      },
    ],
    Namespace: 'Curio',
  });
  await context.cloudwatchClient.send(tokensCommand);
}

/**
 * AI Client that handles AI calls with automatic analytics and retries
 * Supports intent-based model selection
 * Analytics are stored internally without exposing them to callers
 */
export class AIClient {
  private context: AIClientContext;
  private resolver: ProviderResolver;

  constructor(context: AIClientContext) {
    this.context = context;
    this.resolver = ProviderResolver.getInstance();
  }

  /**
   * Get the provider instance for a given model using the ProviderResolver
   */
  private getProviderForModel(model: string): ModelProvider {
    const provider = this.resolver.getProviderForModel(model);
    if (!provider) {
      throw new Error(`No provider found for model: ${model}`);
    }
    return provider;
  }

  /**
   * Call AI with the given configuration (non-streaming)
   * Automatically handles retries, analytics, and model selection based on intent
   */
  async call(config: AICallConfig): Promise<AICallResult> {
    const { intent, userTier, prompt, userContent, category, feature, temperature, tools, messages, imageGenerationOptions } = config;
    const { userUuid, saveTokenData, cloudwatchClient, documentUuid } = this.context;

    // Get available models based on intent and user tier
    const availableModels = getModelsForIntent(intent, userTier);
    let retryCount = 0;
    let selectedModel: AllModels = availableModels[0];

    try {
      // Try each model in order (with retries for rate limits)
      for (const model of availableModels) {
        selectedModel = model;

        try {
          const result = await retryWithBackoff(async () => {
            const modelProvider = this.getProviderForModel(model);
            return await modelProvider.call(model, {
              prompt,
              userContent,
              messages,
              temperature,
              tools,
              imageGenerationOptions,
              generateRawEvents: config.generateRawEvents,
            });
          });
          const outputArray = Array.isArray(result.output) ? result.output : [result.output];

          // Store analytics automatically (caller doesn't need to know).
          // Analytics MUST NOT fail the call — the LLM response is the
          // primary value here. A CloudWatch outage or missing IAM permission
          // should not discard a successful generation.
          try {
            await storeAnalytics(
              this.context,
              model,
              category,
              feature,
              retryCount,
              result.tokenData,
              result.xRequestData,
              result.webSearchCalled
            );
          } catch (analyticsErr: any) {
            console.warn('[AIClient] storeAnalytics failed (non-fatal)', {
              model,
              feature,
              error: analyticsErr?.message || String(analyticsErr),
            });
          }

          return {
            responseText: result.responseText,
            output: outputArray,
          };
        } catch (error) {
          // Convert ProviderRateLimitError to RateLimitError for consistency
          if (error instanceof ProviderRateLimitError) {
            const rateLimitError = new RateLimitError(error.status, error.model as AllModels, error.headers);
            // If rate limited, try next model
            if (model !== availableModels[availableModels.length - 1]) {
              retryCount++;
              continue;
            }
            throw rateLimitError;
          }
          // If last model or other error, throw
          throw error;
        }
      }

      throw new Error('All models failed');
    } catch (error: any) {
      return {
        error: error.message || 'Failed to call AI',
      };
    }
  }

  /**
   * Stream AI responses - returns an async iterable of message chunks
   * Client can loop through and handle DB updates themselves
   * Yields all content in events as they arrive
   */
  async *streamChunks(config: AICallConfig): AsyncGenerator<UnifiedStreamEvent, AICallResult> {
    const { intent, userTier, prompt, userContent, category, feature, temperature, tools, messages, imageGenerationOptions } = config;

    // Get available models based on intent and user tier
    const availableModels = getModelsForIntent(intent, userTier);
    let retryCount = 0;
    let selectedModel: AllModels = availableModels[0];

    try {
      // Try each model in order (with retries for rate limits)
      for (const model of availableModels) {
        selectedModel = model;

        try {
          // Yield chunks and events from the stream
          const modelProvider = this.getProviderForModel(model);
          const result = yield* modelProvider.stream(model, {
            prompt,
            userContent,
            messages,
            temperature,
            tools,
            imageGenerationOptions,
            generateRawEvents: config.generateRawEvents,
          });

          // Store analytics automatically (caller doesn't need to know).
          // Analytics MUST NOT fail the call — see comment in call() above.
          try {
            await storeAnalytics(
              this.context,
              model,
              category,
              feature,
              retryCount,
              result.tokenData,
              result.xRequestData,
              result.webSearchCalled
            );
          } catch (analyticsErr: any) {
            console.warn('[AIClient] storeAnalytics failed (non-fatal)', {
              model,
              feature,
              error: analyticsErr?.message || String(analyticsErr),
            });
          }

          return {};
        } catch (error) {
          // Convert ProviderRateLimitError to RateLimitError for consistency
          if (error instanceof ProviderRateLimitError) {
            const rateLimitError = new RateLimitError(error.status, error.model as AllModels, error.headers);
            // If rate limited, try next model
            if (model !== availableModels[availableModels.length - 1]) {
              retryCount++;
              continue;
            }
            throw rateLimitError;
          }
          // If last model or other error, throw
          throw error;
        }
      }

      throw new Error('All models failed');
    } catch (error: any) {
      return {
        error: error.message || 'Failed to call AI',
      };
    }
  }
}

/**
 * Create a new AI client instance
 */
export function createAIClient(context: AIClientContext): AIClient {
  return new AIClient(context);
}
