import { getGeminiApiKey } from "../../custom/ProcessDocument/common/secrets/get-gemini-apikey";
import { GenerateContentResponse, GenerateContentParameters, GenerateContentConfig, ImageConfig, GoogleGenAI, Part, SafetySetting, HarmCategory, HarmBlockThreshold  } from "@google/genai";
import { GEMINI } from "./gemini-models";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  ProviderRateLimitError,
  ModelProvider,
} from "./types";
import {
  UnifiedStreamEvent,
  UnifiedImageOutput,
  UnifiedTextDeltaEvent,
  UnifiedCompletionEvent,
  UnifiedOutputItemAddedEvent,
  UnifiedRawEvent,
  UnifiedResponseMessage,
  UnifiedResponseOutputItem,
} from "./unified-types";
import { ProviderResolver } from "./provider-resolver";
import { resolveBinaryContent } from "./utils";

/**
 * Rate limit error for Gemini Image provider
 */
class GeminiImageRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: string, headers: Headers) {
    super(status, model, headers);
    this.name = 'GeminiImageRateLimitError';
  }
}

/**
 * Gemini Image Provider - handles image generation using Gemini image models
 */
export class GeminiImageProvider implements ModelProvider {
  /**
   * Models supported by this provider with their display labels
   */
  private static readonly MODELS = [
    { model: GEMINI.GEMINI_2_5_FLASH_IMAGE, label: 'Gemini-2.5 Flash Image', inputFeatures: 'TI', outputFeatures: 'TI' },
    { model: GEMINI.GEMINI_3_PRO_IMAGE_PREVIEW, label: 'Gemini-3 Pro Image Preview', inputFeatures: 'TI', outputFeatures: 'TI' },
  ] as const;

  constructor() {
    // Register this provider with the resolver
    ProviderResolver.getInstance().register(this, GeminiImageProvider.MODELS);
  }

  /**
   * Call Gemini Image API (non-streaming)
   */
  async call(
    model: string,
    config: ProviderCallConfig
  ): Promise<ProviderResult> {
    const geminiApiKey = await getGeminiApiKey();
    if (!geminiApiKey) {
      throw new Error('Gemini API key is required');
    }

    const startTime = Date.now();
    const { prompt, userContent, imageGenerationOptions, generateRawEvents } = config;

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    // Build contents array
    const contents: Part[] = [];

    // Extract reference image from userContent if present
    let referenceImage: string | undefined;
    for (const item of userContent) {
      if (item.mimeType.startsWith('image/')) {
        const imageData = await resolveBinaryContent(item, 'GeminiImageProvider');
        if (imageData) {
          // Remove data URL prefix if present
          referenceImage = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
          contents.push({ inlineData: { data: referenceImage, mimeType: item.mimeType } } as Part);
          break; // Only use the first image
        }
      }
      else if (item.mimeType === 'text/plain') {
        contents.push({ text: item.content } as Part);
      }
    }

    // Add message history
    if ( config.messages) {
      for (const message of config.messages) {
        const messagePart: Part = { text: message.content };
        contents.push(messagePart);
      }
    }

    // Build response config
    const responseConfig: GenerateContentConfig = {
      responseModalities: ['IMAGE'],
    };

    // Add system instruction
    const systemInstructionPart: Part = { text: prompt };
    responseConfig.systemInstruction = systemInstructionPart;

    // Add aspect ratio and resolution if provided
    const imageConfig: ImageConfig = {}
    const supportsResolution = model === GEMINI.GEMINI_3_PRO_IMAGE_PREVIEW;
    if (supportsResolution) {
      // enable image size for Gemini 3 Pro Image Preview
      // @ts-ignore
      imageConfig.imageSize = imageGenerationOptions?.resolution || '1K';
    }

    if (imageGenerationOptions?.aspectRatio) {
      imageConfig.aspectRatio = imageGenerationOptions.aspectRatio;
    }

    responseConfig.imageConfig = imageConfig;

    const safetySettings: SafetySetting[] = [
      {
        category: HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ]
    responseConfig.safetySettings = safetySettings;

    const params: GenerateContentParameters = {
      model: model,
      contents: contents,
      config: responseConfig,
    };

    const outputItems: UnifiedResponseOutputItem[] = [];
    if (generateRawEvents) {
      // If we have outputs but no images, add the whole response as a raw object
      const rawOutput: UnifiedResponseMessage = {
        type: 'message',
        id: `raw-request-${Date.now()}`,
        role: 'assistant',
        content: [{
          type: 'output_text',
          text: JSON.stringify(params, null, 2),
        }],
        status: 'in_progress',
      };
      outputItems.push(rawOutput);
    }

    const response: GenerateContentResponse = await ai.models.generateContent(params);

    // Extract outputs from all candidates
    let allTextResponses: string[] = [];

    if (response.candidates && response.candidates.length > 0) {
      for (let candidateIndex = 0; candidateIndex < response.candidates.length; candidateIndex++) {
        const candidate = response.candidates[candidateIndex];
        let candidateHasIdentifiedParts = false;

        if (candidate.content?.parts) {
          for (const part of candidate.content.parts) {
            if (part.inlineData?.data) {
              // Found image data - create image output
              const imageOutput: UnifiedImageOutput = {
                type: 'image_output',
                id: `image-${Date.now()}-${candidateIndex}-${Math.random()}`,
                imageBase64: part.inlineData.data,
                status: 'completed',
              };
              outputItems.push(imageOutput);
              candidateHasIdentifiedParts = true;
            } else if (part.text) {
              // Found text response - create text output
              allTextResponses.push(part.text);
              const textOutput: UnifiedResponseMessage = {
                type: 'message',
                id: `text-${Date.now()}-${candidateIndex}-${Math.random()}`,
                role: 'assistant',
                content: [{
                  type: 'output_text',
                  text: part.text,
                }],
                status: 'completed',
              };
              outputItems.push(textOutput);
              candidateHasIdentifiedParts = true;
            }
          }
        }

        // If we couldn't identify any parts in this candidate, create a raw output
        if (!candidateHasIdentifiedParts) {
          const rawOutput: UnifiedResponseMessage = {
            type: 'message',
            id: `raw-${Date.now()}-${candidateIndex}-${Math.random()}`,
            role: 'assistant',
            content: [{
              type: 'output_text',
              text: JSON.stringify(candidate, null, 2),
            }],
            status: 'completed',
          };
          outputItems.push(rawOutput);
        }
      }
    }

    // Check if any images were generated
    const hasImageOutput = outputItems.some(item => item.type === 'image_output');

    if (!hasImageOutput && generateRawEvents) {
      // If we have outputs but no images, add the whole response as a raw object
      const rawOutput: UnifiedResponseMessage = {
        type: 'message',
        id: `raw-response-${Date.now()}`,
        role: 'assistant',
        content: [{
          type: 'output_text',
          text: JSON.stringify(response, null, 2),
        }],
        status: 'completed',
      };
      outputItems.push(rawOutput);
    }

    const latency = Date.now() - startTime;

    return {
      responseText: allTextResponses.join('\n\n') || 'Image generated successfully',
      output: outputItems,
      tokenData: {
        totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
        promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
        thoughtsTokenCount: response.usageMetadata?.thoughtsTokenCount || 0,
        toolUsePromptTokenCount: response.usageMetadata?.toolUsePromptTokenCount || 0,
        cachedContentTokenCount: response.usageMetadata?.cachedContentTokenCount || 0,
      },
      xRequestData: {
        requestStatus: 200,
        latency,
        xRequestId: '',
        xRateLimitLimitRequests: 0,
        xRateLimitLimitTokens: 0,
        xRateLimitRemainingRequests: 0,
        xRateLimitRemainingTokens: 0,
        xRateLimitResetRequests: '',
        xRateLimitResetTokens: '',
      },
    };
  }

  /**
   * Stream Gemini Image responses (not yet implemented - image generation doesn't support streaming)
   */
  async *stream(
    model: string,
    config: ProviderCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const { generateRawEvents } = config;
    
    // Image generation doesn't support streaming, call non-streaming and yield the result
    const result = await this.call(model, config);
    
    // Yield raw event for debugging (if enabled)
    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'gemini-image',
        rawData: {
          type: 'response',
          model: model,
          result: result,
        },
        timestamp: Date.now(),
      } as UnifiedRawEvent;
    }
    
    let sequenceCounter = 0;
    
    // Yield output items as they're added
    if (result.output && Array.isArray(result.output)) {
      for (const item of result.output) {
        yield {
          type: 'output_item_added',
          item: item,
          outputIndex: sequenceCounter,
          sequenceNumber: sequenceCounter++,
        } as UnifiedOutputItemAddedEvent;
      }
    }
    
    if (result.responseText) {
      yield {
        type: 'text_delta',
        delta: result.responseText,
        sequenceNumber: sequenceCounter++,
      } as UnifiedTextDeltaEvent;
    }
    
    yield {
      type: 'completion',
    } as UnifiedCompletionEvent;
    return {
      tokenData: result.tokenData,
      xRequestData: result.xRequestData,
    };
  }
}

