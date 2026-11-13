import { getGeminiApiKey } from "../../custom/ProcessDocument/common/secrets/get-gemini-apikey";
import { GoogleGenAI, createPartFromUri, GenerateContentConfig, VoiceConfig, SpeechConfig, GenerateContentParameters, Content, Part } from "@google/genai";
import { GenerateContentResponse, PrebuiltVoiceConfig } from "@google/genai";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  ProviderRateLimitError,
  UserContentItem,
  ModelProvider,
} from "./types";
import {
  UnifiedResponseOutputItem,
  UnifiedResponseMessage,
  UnifiedFunctionCall,
  UnifiedReasoningItem,
  UnifiedTextDeltaEvent,
  UnifiedOutputItemAddedEvent,
  UnifiedStreamEvent,
  UnifiedAudioChunkEvent,
  UnifiedRawEvent,
  UnifiedAudioOutput,
  UnifiedCompletionEvent,
} from "./unified-types";
import { resolveTextContent, resolveBinaryContent } from "./utils";
import { ProviderResolver } from "./provider-resolver";
import { convertToGeminiTools } from "./gemini-tool-converter";
import { GEMINI } from "./gemini-models";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

/**
 * Debug logging function for Gemini provider
 */
function debugLog(message: string, data?: any) {
  console.log(`[Gemini Provider] ${message}`, data || '');
}

/**
 * Rate limit error for Gemini provider
 */
class GeminiRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: string, headers: Headers) {
    super(status, model, headers);
    this.name = 'GeminiRateLimitError';
  }
}

const roleMap = {
  user: "user",
  developer: "model",
  assistant: "model",
} as const;

/**
 * Extract text from unified response output (excluding reasoning/thinking content)
 */
function extractOutputText(output: UnifiedResponseOutputItem[]): string {
  if (!output || output.length === 0) {
    return '';
  }

  for (const item of output) {
    if (item.type === 'reasoning') {
      continue;
    }

    if (item.type === 'message') {
      const message = item as UnifiedResponseMessage;
      
      if (message.status !== 'completed') {
        continue;
      }

      const content = message.content;
      
      if (content && Array.isArray(content) && content.length > 0) {
        for (const contentItem of content) {
          if (contentItem.type === 'output_text' && contentItem.text) {
            return contentItem.text;
          }
        }
      }
    }

    if (item.type === 'function_call') {
      const functionCall = item as UnifiedFunctionCall;
      if (functionCall.arguments) {
        return functionCall.arguments;
      }
    }
  }

  return '';
}

/**
 * Convert Gemini GenerateContentResponse to UnifiedResponseOutputItem array
 * Audio data is included directly in the unified output array
 */
function convertGeminiResponseToUnified(
  response: GenerateContentResponse
): UnifiedResponseOutputItem[] {
  const items: UnifiedResponseOutputItem[] = [];
  
  if (!response.candidates || response.candidates.length === 0) {
    return items;
  }
  
  for (const candidate of response.candidates) {
    if (!candidate.content || !candidate.content.parts) {
      continue;
    }
    
    // Create a unified message for this candidate
    const content: UnifiedResponseMessage['content'] = [];
    
    for (const part of candidate.content.parts) {
      // Check if this is a thinking/reasoning chunk
      if (part.thought === true) {
        // Create a reasoning item for thinking chunks
        items.push({
          type: 'reasoning',
          id: `reasoning-${Date.now()}-${Math.random()}`,
        } as UnifiedReasoningItem);
        // Skip processing text from thinking chunks - they're handled separately
        continue;
      }
      
      if (part.text) {
        content.push({
          type: 'output_text',
          text: part.text,
        });
      } else if (part.inlineData) {
        // Handle audio data from audio output models - add directly to unified output
        const mimeType = part.inlineData.mimeType || '';
        if (mimeType.startsWith('audio/')) {
          items.push({
            type: 'audio_output',
            id: `audio-${Date.now()}-${Math.random()}`,
            audioBase64: part.inlineData.data,
            mimeType: mimeType,
            status: 'completed',
          } as UnifiedAudioOutput);
        }
      } else if (part.functionCall) {
        // Create a separate function call item
        items.push({
          type: 'function_call',
          id: part.functionCall.name || '',
          call_id: part.functionCall.name || '',
          name: part.functionCall.name || '',
          arguments: JSON.stringify(part.functionCall.args || {}),
          status: 'completed',
        } as UnifiedFunctionCall);
      }
    }
    
    // Only add message if there's text content
    if (content.length > 0) {
      // For non-streaming responses, consider the response completed if we have content
      // finishReason can be 'STOP', 'MAX_TOKENS', 'SAFETY', etc. - all indicate we got a response
      const isCompleted = candidate.finishReason === 'STOP' || 
                         candidate.finishReason === 'MAX_TOKENS' ||
                         candidate.finishReason === 'RECITATION' ||
                         (candidate.finishReason !== 'SAFETY' && candidate.finishReason !== undefined);
      
      items.push({
        type: 'message',
        id: candidate.finishReason || 'completed',
        role: 'assistant',
        content,
        status: isCompleted ? 'completed' : 'in_progress',
      } as UnifiedResponseMessage);
    }
  }
  
  return items;
}


/**
 * Maximum file size for inline data (20MB as per Gemini API documentation)
 * Base64 encoding increases size by ~33%, so we use 20MB as a conservative limit
 */
const MAX_INLINE_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/**
 * All 30 Gemini TTS voices
 * Source: https://ai.google.dev/gemini-api/docs/speech-generation
 */
const ALL_GEMINI_VOICES = [
  'Aoede', 'Charon', 'Fenrir', 'Kore', 'Leda', 'Puck', 'Orus', 'Zephyr',
  'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus', 'Umbriel', 'Algieba',
  'Despina', 'Erinome', 'Algenib', 'Rasalgethi', 'Laomedeia', 'Achernar',
  'Alnilam', 'Schedar', 'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
  'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
] as const;

/**
 * Map Curio voice to Gemini voice
 * Maps all 30 Curio voices to Gemini's 30 voices
 */
function mapCurioVoiceToGemini(curioVoiceId: string): string {
  const mapping: Record<string, string> = {
    'neutral-balanced': 'Aoede',
    'clear-resonant': 'Charon',
    'expressive-storytelling': 'Fenrir',
    'deep-rich': 'Kore',
    'bright-energetic': 'Leda',
    'soft-gentle': 'Puck',
    'firm-commanding': 'Orus',
    'breezy-midrange': 'Zephyr',
    'informative-lower': 'Callirrhoe',
    'excitable-midrange': 'Autonoe',
    'youthful-higher': 'Enceladus',
    'upbeat-midrange': 'Iapetus',
    'warm-conversational': 'Umbriel',
    'confident-assertive': 'Algieba',
    'smooth-flowing': 'Despina',
    'crisp-clear': 'Erinome',
    'mellow-relaxed': 'Algenib',
    'dynamic-vibrant': 'Rasalgethi',
    'calm-steady': 'Laomedeia',
    'lively-animated': 'Achernar',
    'serene-peaceful': 'Alnilam',
    'bold-strong': 'Schedar',
    'graceful-elegant': 'Gacrux',
    'cheerful-upbeat': 'Pulcherrima',
    'grounded-stable': 'Achird',
    'radiant-bright': 'Zubenelgenubi',
    'sophisticated-polished': 'Vindemiatrix',
    'friendly-approachable': 'Sadachbia',
    'majestic-grand': 'Sadaltager',
    'harmonious-balanced': 'Sulafat',
  };
  
  return mapping[curioVoiceId] || 'Aoede';
}

/**
 * Get file extension from mimeType for temporary file naming
 */
function getFileExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
    'audio/m4a': 'm4a',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
  };
  
  // Try direct mapping first
  if (mimeToExt[mimeType]) {
    return mimeToExt[mimeType];
  }
  
  // Extract from mimeType (e.g., 'application/pdf' -> 'pdf')
  const parts = mimeType.split('/');
  if (parts.length === 2) {
    const subtype = parts[1];
    // Remove common prefixes
    return subtype.replace(/^(vnd\.|x-)/, '').split('.').pop() || 'bin';
  }
  
  return 'bin';
}

/**
 * Convert UserContentItem[] to Gemini parts format
 * @param userContent - Array of user content items
 * @param ai - GoogleGenAI instance for uploading files to Gemini Files API
 */
async function buildGeminiParts(
  userContent: UserContentItem[],
  ai: GoogleGenAI
): Promise<any[]> {
  const parts: any[] = [];
  const tempFilesToCleanup: string[] = [];

  try {
    for (const item of userContent) {
      const { mimeType } = item;

      if (mimeType.startsWith('text/')) {
        // Handle text content
        const textContent = await resolveTextContent(item, 'GeminiProvider');
        if (textContent) {
          parts.push({ text: textContent });
        }
      } else {
        // Handle all file types (images, PDFs, audio, video, office docs, etc.)
        // resolveBinaryContent handles URL-based files by downloading and converting to base64
        const binaryData = await resolveBinaryContent(item, 'GeminiProvider');
        if (!binaryData) {
          continue;
        }

        // Calculate approximate binary size from base64
        // Base64 encoding increases size by ~33%, so we estimate: binarySize ≈ base64Length * 3/4
        // For size check, we use the base64 string length as a conservative estimate
        const base64SizeBytes = Buffer.byteLength(binaryData, 'utf8');
        const estimatedBinarySize = Math.floor(base64SizeBytes * 0.75);
        
        if (estimatedBinarySize <= MAX_INLINE_FILE_SIZE_BYTES) {
          // Use inline data for smaller files (< 20MB)
          parts.push({
            inlineData: {
              data: binaryData,
              mimeType: mimeType,
            }
          });
        } else {
          // Upload larger files to Gemini Files API
          // Convert base64 to buffer
          const buffer = Buffer.from(binaryData, 'base64');
          
          // Create temporary file for upload (Gemini SDK expects file paths)
          const fileExt = getFileExtensionFromMimeType(mimeType);
          const tempFilePath = join(
            tmpdir(), 
            `gemini-file-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
          );
          writeFileSync(tempFilePath, buffer);
          tempFilesToCleanup.push(tempFilePath);

          try {
            // Upload to Gemini Files API
            const uploadedFile = await ai.files.upload({
              file: tempFilePath,
              config: {
                mimeType: mimeType,
              },
            });

            // Use createPartFromUri to create a part that references the uploaded file
            if (!uploadedFile.uri) {
              throw new Error('Gemini Files API did not return a file URI');
            }
            const fileUri: string = uploadedFile.uri;
            const fileMimeType = uploadedFile.mimeType || mimeType;
            const filePart = createPartFromUri(fileUri, fileMimeType);
            parts.push(filePart);
          } catch (error) {
            console.error(`Failed to upload ${mimeType} file to Gemini Files API:`, error);
            // Clean up temp file on error
            try {
              unlinkSync(tempFilePath);
              const index = tempFilesToCleanup.indexOf(tempFilePath);
              if (index > -1) {
                tempFilesToCleanup.splice(index, 1);
              }
            } catch (cleanupError) {
              console.error('Failed to clean up temporary file:', cleanupError);
            }
            // Skip this file and continue with others
            continue;
          }
        }
      }
    }

    return parts;
  } finally {
    // Clean up temporary files
    for (const tempFile of tempFilesToCleanup) {
      try {
        unlinkSync(tempFile);
      } catch (error) {
        console.error(`Failed to clean up temporary file ${tempFile}:`, error);
      }
    }
  }
}

/**
 * Build GenerateContentParameters from ProviderCallConfig
 * Shared function for both call and stream methods
 */
async function buildGenerateContentParameters(
  ai: GoogleGenAI,
  model: string,
  config: ProviderCallConfig,
  supportsAudioOutput: boolean
): Promise<GenerateContentParameters> {
  const { prompt, userContent, messages, tools, voice } = config;
  
  // Build config
  const generateConfig: GenerateContentConfig = {};
    
  // Build contents array
  let contents: Content[] | Part = [];
  
  if (!messages && userContent.length === 1) {
    contents = { text: userContent[0].content }
  } else {
    // Ensure contents is an array for pushing
    contents = [] as Content[];
    
    // Add chat history if messages exist
    if (messages && messages.length > 0) {
      for (const message of messages) {
        const text = message.content?.trim();
        if (!text) continue;
        (contents as Content[]).push({
          role: roleMap[message.role as keyof typeof roleMap],
          parts: [{ text }],
        });
      }
    }
    
    // Add user content as the final user message
    const userContentParts = await buildGeminiParts(userContent, ai);
    if (userContentParts.length > 0) {
      (contents as Content[]).push({
        role: 'user',
        parts: userContentParts,
      });
    }
  }  
  // Add system instruction (prompt)
  if (prompt) {
    generateConfig.systemInstruction = { text: prompt } as Part;
  }
  
  // Add tools configuration
  const convertedTools = convertToGeminiTools(tools);
  if (convertedTools) {
    generateConfig.tools = convertedTools;
    generateConfig.toolConfig = {
      functionCallingConfig: { mode: 'ANY' as any },
    };
  }
  
  // Add audio configuration
  if (supportsAudioOutput && voice) {
    const geminiVoice = mapCurioVoiceToGemini(voice) || 'Aoede';
    generateConfig.responseModalities = ['audio'];
    const prebuiltVoiceConfig: PrebuiltVoiceConfig = { voiceName: geminiVoice };
    const voiceConfig: VoiceConfig = { prebuiltVoiceConfig: prebuiltVoiceConfig };
    const speechConfig: SpeechConfig = { voiceConfig: voiceConfig };
    generateConfig.speechConfig = speechConfig;
  }
  
  // Validate that we have content to send
  const hasContents = Array.isArray(contents) 
    ? contents.length > 0 
    : (contents as Part).text !== undefined;
  
  if (!hasContents && !prompt) {
    throw new Error('No content provided: either prompt, userContent, or messages must be provided');
  }
  
  return {
    model,
    contents,
    config: generateConfig,
  };
}

/**
 * Gemini Provider - handles all Gemini API interactions
 */
export class GeminiProvider implements ModelProvider {
  /**
   * Models supported by this provider with their display labels
   * 
   * Note for AI Agent: When you are asked to update the available models, you should:
   * 1. Check https://ai.google.dev/gemini-api/docs/models.md.txt for available models
   * 2. Check https://ai.google.dev/gemini-api/docs/deprecations.md.txt for deprecated/shutdown models
   * 3. For each model, carefully read the "Supported data types" section to determine:
   *    - inputFeatures: Based on the "Inputs" field (T=Text, I=Image, V=Video, A=Audio)
   *    - outputFeatures: Based on the "Output" field (T=Text, I=Image, V=Video, A=Audio)
   *    - IMPORTANT: Do NOT assume outputFeatures matches inputFeatures. Most models only output Text (T)
   *      even if they accept multiple input types. Only specialized models output Audio (A) or Images (I).
   *    - IMPORTANT: Image generation models should NOT be included here, but updated in gemini-image-provider.ts instead.
   * 4. Remove any deprecated/shutdown models from the MODELS array
   * 5. Add any new models with correct inputFeatures and outputFeatures from the documentation
   */
  private static readonly MODELS = [
    { model: GEMINI.GEMINI_3_PRO_PREVIEW, label: 'Gemini-3 Pro Preview', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_3_FLASH_PREVIEW, label: 'Gemini-3 Flash Preview', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_3_1_FLASH_LITE_PREVIEW, label: 'Gemini-3.1 Flash Lite Preview', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_2_5_PRO, label: 'Gemini-2.5 Pro', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_2_5_PRO_PREVIEW_TTS, label: 'Gemini-2.5 Pro Preview TTS', inputFeatures: 'T', outputFeatures: 'A' },
    { model: GEMINI.GEMINI_2_5_FLASH, label: 'Gemini-2.5 Flash', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_2_5_FLASH_PREVIEW_09_2025, label: 'Gemini-2.5 Flash Preview', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_2_5_FLASH_NATIVE_AUDIO_PREVIEW_12_2025, label: 'Gemini-2.5 Flash Live', inputFeatures: 'TVA', outputFeatures: 'TA' },
    { model: GEMINI.GEMINI_2_5_FLASH_PREVIEW_TTS, label: 'Gemini-2.5 Flash TTS', inputFeatures: 'T', outputFeatures: 'A' },
    { model: GEMINI.GEMINI_2_5_FLASH_LITE, label: 'Gemini-2.5 Flash Lite', inputFeatures: 'TIVA', outputFeatures: 'T' },
    { model: GEMINI.GEMINI_2_5_FLASH_LITE_PREVIEW_09_2025, label: 'Gemini-2.5 Flash Lite Preview', inputFeatures: 'TIVA', outputFeatures: 'T' },
  ] as const;

  constructor() {
    // Register this provider with the resolver
    ProviderResolver.getInstance().register(this, GeminiProvider.MODELS);
  }

  /**
   * Map Curio voice to Gemini voice
   * Returns undefined if model doesn't support audio output
   */
  mapGenericVoiceToProvider(curioVoiceId: string, model: string): string | undefined {
    // Check if model supports audio output
    const modelData = GeminiProvider.MODELS.find(m => m.model === model);
    if (!modelData || !modelData.outputFeatures.includes('A')) {
      return undefined;
    }
    
    return mapCurioVoiceToGemini(curioVoiceId);
  }

  /**
   * Call Gemini API (non-streaming)
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
    
    // Check if model supports audio output based on features
    const modelData = GeminiProvider.MODELS.find(m => m.model === model);
    const supportsAudioOutput = modelData?.outputFeatures?.includes('A') || false;

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    // Build GenerateContentParameters from config
    const params = await buildGenerateContentParameters(ai, model, config, supportsAudioOutput);

    console.info('[GeminiProvider] call start', {
      model,
      contentCount: Array.isArray(params.contents) ? params.contents.length : 0,
      toolCount: Array.isArray((params.config as any)?.tools)
        ? (params.config as any).tools.length
        : 0,
    });

    let response;
    try {
      response = await ai.models.generateContent(params);
    } catch (err: any) {
      console.error('[GeminiProvider] call threw', {
        model,
        durationMs: Date.now() - startTime,
        errorStatus: err?.status || err?.code,
        errorMessage: err?.message || String(err),
      });
      throw err;
    }

    const latency = Date.now() - startTime;
    const output = convertGeminiResponseToUnified(response);

    console.info('[GeminiProvider] call done', {
      model,
      durationMs: latency,
      outputItemCount: output?.length ?? 0,
      candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
    });

    // Extract text from unified output (excludes thinking/reasoning content)
    // Fall back to response.text if no unified output, or for audio-only responses
    let responseText = extractOutputText(output);
    if (!responseText) {
      // Fallback: use response.text if available, or default message for audio
      const hasAudio = output.some(item => item.type === 'audio_output');
      responseText = response.text || (hasAudio ? 'Audio response generated' : '');
    }

    return {
      responseText: responseText,
      output: output,
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
   * Stream Gemini responses using the streaming API
   */
  async *stream(
    model: string,
    config: ProviderCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const geminiApiKey = await getGeminiApiKey();
    if (!geminiApiKey) {
      throw new Error('Gemini API key is required');
    }

    const startTime = Date.now();
    
    // Check if model supports audio output based on features
    const modelData = GeminiProvider.MODELS.find(m => m.model === model);
    const supportsAudioOutput = modelData?.outputFeatures?.includes('A') || false;

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
    });

    const generateRawEvents = config.generateRawEvents;
    let lastUsageMetadata: any = null;
    let latency = 0;

    // Build GenerateContentParameters from config
    const params = await buildGenerateContentParameters(ai, model, config, supportsAudioOutput);

    console.info('[GeminiProvider] stream start', {
      model,
      contentCount: Array.isArray(params.contents) ? params.contents.length : 0,
      systemInstructionLen: typeof params.config?.systemInstruction === 'string'
        ? params.config.systemInstruction.length
        : 0,
      toolCount: Array.isArray((params.config as any)?.tools)
        ? (params.config as any).tools.length
        : 0,
    });

    // Yield raw request event for debugging (if enabled)
    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'gemini',
        rawData: {
          type: 'request',
          model: params.model,
          contents: params.contents,
          config: params.config,
        },
        timestamp: Date.now(),
      } as UnifiedRawEvent;
    }

    let textDeltaSequenceCounter = 0;
    let outputItemSequenceCounter = 0;
    let audioChunkSequenceCounter = 0;
    let chunkCount = 0;

    try {
      // Create the stream
      const stream = await ai.models.generateContentStream(params);

      // Process each chunk from the stream
      for await (const chunk of stream) {
        chunkCount++;
        if (latency === 0) {
          latency = Date.now() - startTime;
          console.info('[GeminiProvider] first chunk received', {
            model,
            firstChunkMs: latency,
          });
        }

        // Yield raw event FIRST for debugging (if enabled)
        if (generateRawEvents) {
          yield {
            type: 'raw_event',
            provider: 'gemini',
            rawData: chunk,
            timestamp: Date.now(),
          } as UnifiedRawEvent;
        }

        // Check promptFeedback FIRST for blockReason or safetyRatings
        if (chunk.promptFeedback) {
          const blockReason = (chunk.promptFeedback as any).blockReason;
          const safetyRatings = (chunk.promptFeedback as any).safetyRatings;
          
          if (blockReason) {
            yield {
              type: 'completion',
              status: 'failed',
              error: `Prompt blocked: ${blockReason}`,
              usage: lastUsageMetadata ? {
                totalTokens: lastUsageMetadata.totalTokenCount || 0,
                inputTokens: lastUsageMetadata.promptTokenCount || 0,
                outputTokens: lastUsageMetadata.candidatesTokenCount || 0,
                reasoningTokens: lastUsageMetadata.thoughtsTokenCount,
                cachedTokens: lastUsageMetadata.cachedContentTokenCount,
              } : undefined,
            } as UnifiedCompletionEvent;
            
            return {
              tokenData: {
                totalTokenCount: lastUsageMetadata?.totalTokenCount || 0,
                promptTokenCount: lastUsageMetadata?.promptTokenCount || 0,
                candidatesTokenCount: lastUsageMetadata?.candidatesTokenCount || 0,
                thoughtsTokenCount: lastUsageMetadata?.thoughtsTokenCount || 0,
                toolUsePromptTokenCount: lastUsageMetadata?.toolUsePromptTokenCount || 0,
                cachedContentTokenCount: lastUsageMetadata?.cachedContentTokenCount || 0,
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
          
          if (safetyRatings && Array.isArray(safetyRatings) && safetyRatings.length > 0) {
            const blockedRatings = safetyRatings.filter((rating: any) => rating.blocked);
            if (blockedRatings.length > 0) {
              const reasons = blockedRatings.map((r: any) => 
                `${r.category}: ${r.probability}`
              ).join(', ');
              
              yield {
                type: 'completion',
                status: 'failed',
                error: `Content blocked by safety filters: ${reasons}`,
                usage: lastUsageMetadata ? {
                  totalTokens: lastUsageMetadata.totalTokenCount || 0,
                  inputTokens: lastUsageMetadata.promptTokenCount || 0,
                  outputTokens: lastUsageMetadata.candidatesTokenCount || 0,
                  reasoningTokens: lastUsageMetadata.thoughtsTokenCount,
                  cachedTokens: lastUsageMetadata.cachedContentTokenCount,
                } : undefined,
              } as UnifiedCompletionEvent;
              
              return {
                tokenData: {
                  totalTokenCount: lastUsageMetadata?.totalTokenCount || 0,
                  promptTokenCount: lastUsageMetadata?.promptTokenCount || 0,
                  candidatesTokenCount: lastUsageMetadata?.candidatesTokenCount || 0,
                  thoughtsTokenCount: lastUsageMetadata?.thoughtsTokenCount || 0,
                  toolUsePromptTokenCount: lastUsageMetadata?.toolUsePromptTokenCount || 0,
                  cachedContentTokenCount: lastUsageMetadata?.cachedContentTokenCount || 0,
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
          }
        }

        // Track usage metadata from each chunk
        if (chunk.usageMetadata) {
          lastUsageMetadata = chunk.usageMetadata;
        }

        // Check if this is a final chunk based on finishReason
        let isFinalChunk = false;
        for (const candidate of chunk.candidates || []) {
          const finishReason = candidate.finishReason;
          if (finishReason === 'STOP' || 
              finishReason === 'MAX_TOKENS' ||
              finishReason === 'RECITATION' ||
              (finishReason !== 'SAFETY' && finishReason !== undefined)) {
            isFinalChunk = true;
            break;
          }
        }

        // Process each candidate in the chunk
        // Extract text deltas directly from parts (Gemini provides delta text, not accumulated)
        // Only process non-text parts through convertGeminiResponseToUnified
        let outputIndex = 0;
        for (const candidate of chunk.candidates || []) {
          if (!candidate.content || !candidate.content.parts) {
            continue;
          }

          for (const part of candidate.content.parts) {
            // Handle text deltas directly (skip in convertGeminiResponseToUnified for streaming)
            if (part.text) {
              yield {
                type: 'text_delta',
                delta: part.text,
                sequenceNumber: textDeltaSequenceCounter++,
              } as UnifiedTextDeltaEvent;
              continue;
            }

            // Handle thinking/reasoning chunks
            if (part.thought === true) {
              yield {
                type: 'output_item_added',
                item: {
                  type: 'reasoning',
                  id: `reasoning-${Date.now()}-${Math.random()}`,
                } as UnifiedReasoningItem,
                outputIndex: outputIndex++,
                sequenceNumber: outputItemSequenceCounter++,
              } as UnifiedOutputItemAddedEvent;
              continue;
            }

            // Handle audio output items - yield as audio_chunk events
            if (part.inlineData) {
              const mimeType = part.inlineData.mimeType || '';
              if (mimeType.startsWith('audio/')) {
                const audioFormat = mimeType.includes('pcm') ? 'pcm16' : 'mp3';
                yield {
                  type: 'audio_chunk',
                  audio: part.inlineData.data,
                  format: audioFormat,
                  sequenceNumber: audioChunkSequenceCounter++,
                  finished: isFinalChunk,
                } as UnifiedAudioChunkEvent;
                
                // Also yield as output item
                yield {
                  type: 'output_item_added',
                  item: {
                    type: 'audio_output',
                    id: `audio-${Date.now()}-${Math.random()}`,
                    audioBase64: part.inlineData.data,
                    mimeType: mimeType,
                    status: 'completed',
                  } as UnifiedAudioOutput,
                  outputIndex: outputIndex++,
                  sequenceNumber: outputItemSequenceCounter++,
                } as UnifiedOutputItemAddedEvent;
              }
              continue;
            }

            // Handle function calls
            if (part.functionCall) {
              yield {
                type: 'output_item_added',
                item: {
                  type: 'function_call',
                  id: part.functionCall.name || '',
                  call_id: part.functionCall.name || '',
                  name: part.functionCall.name || '',
                  arguments: JSON.stringify(part.functionCall.args || {}),
                  status: 'completed',
                } as UnifiedFunctionCall,
                outputIndex: outputIndex++,
                sequenceNumber: outputItemSequenceCounter++,
              } as UnifiedOutputItemAddedEvent;
              continue;
            }
          }
        }
      }
    } catch (error: any) {
      // Handle errors from stream creation or processing
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      const errorStatus = error?.status || error?.code || error?.response?.status || 500;
      console.error('[GeminiProvider] stream error', {
        model,
        chunkCount,
        durationMs: Date.now() - startTime,
        errorStatus,
        errorMessage,
      });
      
      // Try to extract more detailed error information
      let detailedError = errorMessage;
      
      // Try multiple ways to extract error message
      if (error?.response?.data) {
        try {
          const errorData = typeof error.response.data === 'string' 
            ? JSON.parse(error.response.data) 
            : error.response.data;
          detailedError = errorData?.error?.message || errorData?.message || errorData?.error || errorMessage;
        } catch {
          // If parsing fails, try to use the string directly
          if (typeof error.response.data === 'string') {
            detailedError = error.response.data;
          }
        }
      } else if (error?.error) {
        // Handle nested error objects
        try {
          const errorObj = typeof error.error === 'string' 
            ? JSON.parse(error.error) 
            : error.error;
          detailedError = errorObj?.error?.message || errorObj?.message || errorObj?.error || errorMessage;
        } catch {
          detailedError = typeof error.error === 'string' ? error.error : errorMessage;
        }
      } else if (error?.details) {
        // Handle Google API error details
        try {
          const details = Array.isArray(error.details) 
            ? error.details.map((d: any) => d.message || d).join('; ')
            : error.details;
          detailedError = details || errorMessage;
        } catch {
          // Use original message
        }
      }

      // Yield failed completion event
      yield {
        type: 'completion',
        status: 'failed',
        error: detailedError,
      } as UnifiedCompletionEvent;

      // Return failed result
      return {
        tokenData: {
          totalTokenCount: lastUsageMetadata?.totalTokenCount || 0,
          promptTokenCount: lastUsageMetadata?.promptTokenCount || 0,
          candidatesTokenCount: lastUsageMetadata?.candidatesTokenCount || 0,
          thoughtsTokenCount: lastUsageMetadata?.thoughtsTokenCount || 0,
          toolUsePromptTokenCount: lastUsageMetadata?.toolUsePromptTokenCount || 0,
          cachedContentTokenCount: lastUsageMetadata?.cachedContentTokenCount || 0,
        },
        xRequestData: {
          requestStatus: errorStatus,
          latency: latency || Date.now() - startTime,
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

    console.info('[GeminiProvider] stream done', {
      model,
      chunkCount,
      durationMs: Date.now() - startTime,
      firstChunkMs: latency,
      candidatesTokenCount: lastUsageMetadata?.candidatesTokenCount || 0,
      promptTokenCount: lastUsageMetadata?.promptTokenCount || 0,
    });

    // Yield successful completion event with usage metadata
    yield {
      type: 'completion',
      status: 'completed',
      usage: lastUsageMetadata ? {
        totalTokens: lastUsageMetadata.totalTokenCount || 0,
        inputTokens: lastUsageMetadata.promptTokenCount || 0,
        outputTokens: lastUsageMetadata.candidatesTokenCount || 0,
        reasoningTokens: lastUsageMetadata.thoughtsTokenCount,
        cachedTokens: lastUsageMetadata.cachedContentTokenCount,
      } : undefined,
    } as UnifiedCompletionEvent;

    // Return final result with usage metadata
    return {
      tokenData: {
        totalTokenCount: lastUsageMetadata?.totalTokenCount || 0,
        promptTokenCount: lastUsageMetadata?.promptTokenCount || 0,
        candidatesTokenCount: lastUsageMetadata?.candidatesTokenCount || 0,
        thoughtsTokenCount: lastUsageMetadata?.thoughtsTokenCount || 0,
        toolUsePromptTokenCount: lastUsageMetadata?.toolUsePromptTokenCount || 0,
        cachedContentTokenCount: lastUsageMetadata?.cachedContentTokenCount || 0,
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
}
