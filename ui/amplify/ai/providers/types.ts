import { UnifiedTool } from "@ai-tools/types";
import { UnifiedResponseOutputItem, UnifiedStreamEvent } from "./unified-types";

// Re-export UnifiedStreamEvent for convenience
export type { UnifiedStreamEvent };

/**
 * Token usage data from AI provider
 */
export interface TokenData {
  totalTokenCount: number;
  promptTokenCount: number;
  candidatesTokenCount: number;
  thoughtsTokenCount: number;
  toolUsePromptTokenCount: number;
  cachedContentTokenCount: number;
}

/**
 * Request metadata from AI provider
 */
export interface XRequestData {
  requestStatus: number;
  latency: number;
  xRequestId: string;
  xRateLimitLimitRequests: number;
  xRateLimitLimitTokens: number;
  xRateLimitRemainingRequests: number;
  xRateLimitRemainingTokens: number;
  xRateLimitResetRequests: string;
  xRateLimitResetTokens: string;
}

/**
 * Result from a provider call
 */
export interface ProviderResult {
  responseText: string;
  output: UnifiedResponseOutputItem[];
  tokenData: TokenData;
  xRequestData: XRequestData;
  webSearchCalled?: boolean;
}

/**
 * Result from a provider streaming call
 * Does not include responseText or output as those are handled by the consumer
 * processing the stream events
 */
export interface ProviderStreamingResult {
  tokenData: TokenData;
  xRequestData: XRequestData;
  webSearchCalled?: boolean;
}

/**
 * User content item - unified format for all content types
 */
export interface UserContentItem {
  /**
   * MIME type of the content (e.g., 'text/plain', 'image/png', 'application/pdf')
   */
  mimeType: string;
  /**
   * Content data (base64 encoded for binary, plain text for text)
   * Required if contentURL is not provided
   */
  content?: string;
  /**
   * URL to the content if it's hosted externally
   * Required if content is not provided
   */
  contentURL?: string;
}

interface ProviderMessageContent {
  role: "user" | "model" | "developer";
  content: string;
}

/**
 * Configuration for provider calls
 * This is the unified configuration interface used by all providers.
 * Providers should throw errors if they don't support specific fields.
 */
export interface ProviderCallConfig {
  prompt: string;
  /**
   * User content as a list of content items
   * Each item has a mimeType and either content (inline) or contentURL (external)
   */
  userContent: UserContentItem[];
  messages?: Array<ProviderMessageContent>;
  temperature?: number;
  tools?: UnifiedTool[];
  
  // Audio completion fields (for audio completion providers)
  /**
   * Generic voice identifier for audio output (e.g., 'voice-1', 'voice-2', etc.)
   * Providers will map this generic identifier to their provider-specific voice names
   * If provided, enables audio output for audio completion models
   */
  voice?: string;
  
  // Transcription fields (for GPTTranscriptionProvider)
  /**
   * Transcription options for audio transcription models
   */
  transcriptOptions?: TranscriptOptions;
  
  // Image generation fields (for GeminiImageProvider)
  /**
   * Image generation options for image generation models
   */
  imageGenerationOptions?: ImageGenerationOptions;
  
  /**
   * Whether to generate raw events for debugging (provider-specific)
   * When true, providers will yield raw_event events containing unprocessed data from the API
   */
  generateRawEvents?: boolean;
}

/**
 * Options for image generation models
 */
export interface ImageGenerationOptions {
  /**
   * Aspect ratio for the generated image
   */
  aspectRatio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9';
  /**
   * Resolution (only for Gemini 3 Pro Image)
   */
  resolution?: '1K' | '2K' | '4K';
}

/**
 * Options for transcription models
 */
export interface TranscriptOptions {
  /**
   * Language code for transcription (e.g., 'en', 'es')
   */
  language?: string;
  /**
   * Response format for transcription
   */
  responseFormat?: 'json' | 'text' | 'verbose_json' | 'srt' | 'vtt';
  /**
   * Timestamp granularities for transcription
   */
  timestampGranularities?: ('word' | 'segment')[];
}

/**
 * Rate limit error for providers
 */
export class ProviderRateLimitError extends Error {
  constructor(
    public status: number,
    public model: string,
    public headers: Headers
  ) {
    super('Rate limit exceeded');
    this.name = 'ProviderRateLimitError';
  }
}

/**
 * Provider interface that all providers must implement
 * All providers should accept ProviderCallConfig as their config parameter
 */
export interface ModelProvider {
  call(model: string, config: ProviderCallConfig): Promise<ProviderResult>;
  stream(model: string, config: ProviderCallConfig): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult>;
  
  /**
   * Map Curio voice identifier to provider-specific voice name
   * Returns undefined if the provider doesn't support voice output for this model
   * @param curioVoiceId - Curio voice identifier (e.g., 'neutral-balanced')
   * @param model - Model name to check if voice is supported
   * @returns Provider-specific voice name, or undefined if not supported
   */
  mapGenericVoiceToProvider?(curioVoiceId: string, model: string): string | undefined;
}

