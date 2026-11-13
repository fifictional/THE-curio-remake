import { getOpenaiApiKey } from "../../custom/ProcessDocument/common/secrets/get-openai-apikey";
import OpenAI from "openai";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  UnifiedStreamEvent,
  ProviderRateLimitError,
  ModelProvider,
} from "./types";
import { UnifiedAudioChunkEvent, UnifiedTextDeltaEvent, UnifiedRawEvent } from "./unified-types";
import { ProviderResolver } from "./provider-resolver";
import { resolveTextContent, resolveBinaryContent, resolveContentURL, MIME_TYPES } from "./utils";
import { convertToOpenAIChatCompletionTools } from "./gpt-tool-converter";
import { OPENAI } from "./openai-models";
//import { truncateBase64ForLogging } from "./utils";

/**
 * Audio conversation model types
 */
export type AudioCompletionModel = 
  | typeof OPENAI.GPT_AUDIO
  | typeof OPENAI.GPT_AUDIO_MINI
  | typeof OPENAI.GPT_4O_AUDIO_PREVIEW
  | typeof OPENAI.GPT_4O_MINI_AUDIO_PREVIEW
  | typeof OPENAI.GPT_4O_SEARCH_PREVIEW
  | typeof OPENAI.GPT_4O_MINI_SEARCH_PREVIEW;

/**
 * Rate limit error for GPT Completion provider
 */
class GPTCompletionRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: AudioCompletionModel, headers: Headers) {
    super(status, model, headers);
    this.name = 'GPTCompletionRateLimitError';
  }
}

/**
 * Extended config for audio completions that includes audio file support
 */
export interface AudioCompletionCallConfig extends ProviderCallConfig {
  audioFile?: File | Buffer | string; // Optional audio file
  audioBase64?: string; // Optional base64 encoded audio (alternative to audioFile)
  audioMimeType?: string; // MIME type for audio (e.g., 'audio/mpeg', 'audio/wav')
  voice?: string; // Voice to use for audio output (e.g., 'alloy', 'echo', 'fable', etc.). If provided, enables audio output.
}

/**
 * Convert audio file to base64 data URL
 */
async function audioToDataUrl(
  audioFile: File | Buffer | string,
  mimeType: string = 'audio/mpeg'
): Promise<string> {
  let buffer: Buffer;

  if (typeof audioFile === 'string') {
    // File path - read from filesystem (Node.js environment)
    const fs = await import('fs/promises');
    buffer = await fs.readFile(audioFile);
  } else if (audioFile instanceof Buffer) {
    buffer = audioFile;
  } else {
    // File object (browser environment)
    buffer = Buffer.from(await (audioFile as File).arrayBuffer());
  }

  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

/**
 * Extract audio format from MIME type for OpenAI API
 */
function getAudioFormatFromMimeType(mimeType: string): string {
  const mimeLower = mimeType.toLowerCase();
  
  if (mimeLower.includes('wav')) return 'wav';
  if (mimeLower.includes('mp3') || mimeLower.includes('mpeg')) return 'mp3';
  if (mimeLower.includes('flac')) return 'flac';
  if (mimeLower.includes('aac')) return 'aac';
  if (mimeLower.includes('ogg')) return 'ogg';
  if (mimeLower.includes('m4a')) return 'm4a';
  if (mimeLower.includes('webm')) return 'webm';
  
  // Default to mp3 if unknown
  return 'mp3';
}

/**
 * Map Curio voice to OpenAI voice
 * GPT only has 6 voices, so multiple Curio voices map to the same GPT voice
 */
function mapCurioVoiceToOpenAI(curioVoiceId: string): string {
  // Map Curio voices to GPT's 6 voices
  // Multiple Curio voices can map to the same GPT voice
  const mapping: Record<string, string> = {
    'neutral-balanced': 'alloy',
    'clear-resonant': 'echo',
    'expressive-storytelling': 'fable',
    'deep-rich': 'onyx',
    'bright-energetic': 'nova',
    'soft-gentle': 'shimmer',
    // Map additional Curio voices to closest GPT voice
    'firm-commanding': 'onyx',
    'breezy-midrange': 'alloy',
    'informative-lower': 'echo',
    'excitable-midrange': 'fable',
    'youthful-higher': 'nova',
    'upbeat-midrange': 'echo',
    'warm-conversational': 'fable',
    'confident-assertive': 'onyx',
    'smooth-flowing': 'alloy',
    'crisp-clear': 'echo',
    'mellow-relaxed': 'shimmer',
    'dynamic-vibrant': 'nova',
    'calm-steady': 'alloy',
    'lively-animated': 'nova',
    'serene-peaceful': 'shimmer',
    'bold-strong': 'onyx',
    'graceful-elegant': 'shimmer',
    'cheerful-upbeat': 'nova',
    'grounded-stable': 'alloy',
    'radiant-bright': 'nova',
    'sophisticated-polished': 'onyx',
    'friendly-approachable': 'fable',
    'majestic-grand': 'onyx',
    'harmonious-balanced': 'alloy',
  };
  
  return mapping[curioVoiceId] || 'alloy';
}

/**
 * Build messages content for Chat Completions API with audio support
 */
async function buildAudioMessagesContent(
  config: AudioCompletionCallConfig
): Promise<any[]> {
  const content: any[] = [];

  // Process userContent array (new format)
  for (const item of config.userContent) {
    const { mimeType } = item;

    if (mimeType.startsWith('text/')) {
      // Handle text content
      const textContent = await resolveTextContent(item, 'GPTCompletionProvider');
      if (textContent) {
        content.push({ type: 'text', text: textContent });
      }
    } else if (mimeType.startsWith('image/')) {
      // Handle image content
      const url = resolveContentURL(item);
      if (url) {
        content.push({
          type: 'image_url',
          image_url: { url: url },
        });
      } else {
        const base64Data = await resolveBinaryContent(item, 'GPTCompletionProvider');
        if (base64Data) {
          const imageUrl = `data:${mimeType};base64,${base64Data}`;
          content.push({
            type: 'image_url',
            image_url: { url: imageUrl },
          });
        }
      }
    } else if (mimeType.startsWith('audio/')) {
      // Handle audio content from userContent array
      const audioBase64 = await resolveBinaryContent(item, 'GPTCompletionProvider');
      if (audioBase64) {
        // Extract format from MIME type
        const format = getAudioFormatFromMimeType(mimeType);
        
        content.push({
          type: 'input_audio',
          input_audio: {
            data: audioBase64, // Just base64 string, not data URL
            format: format,
          },
        });
      }
    }
  }

  // Legacy support: Add audio content from separate fields (for backward compatibility)
  // OpenAI Chat Completions API expects input_audio format, not audio format
  if (config.audioFile) {
    const mimeType = config.audioMimeType || MIME_TYPES.AUDIO_MPEG;
    const buffer = typeof config.audioFile === 'string'
      ? await (await import('fs/promises')).readFile(config.audioFile)
      : config.audioFile instanceof Buffer
      ? config.audioFile
      : Buffer.from(await (config.audioFile as File).arrayBuffer());
    const base64 = buffer.toString('base64');
    
    // Extract format from MIME type (e.g., 'audio/mpeg' -> 'mp3', 'audio/wav' -> 'wav')
    const format = getAudioFormatFromMimeType(mimeType);
    
    content.push({
      type: 'input_audio',
      input_audio: {
        data: base64, // Just base64 string, not data URL
        format: format,
      },
    });
  } else if (config.audioBase64) {
    const mimeType = config.audioMimeType || MIME_TYPES.AUDIO_MPEG;
    
    // Extract format from MIME type
    const format = getAudioFormatFromMimeType(mimeType);
    
    content.push({
      type: 'input_audio',
      input_audio: {
        data: config.audioBase64, // Just base64 string, not data URL
        format: format,
      },
    });
  }

  return content;
}

/**
 * GPT Completion Provider - handles audio conversation models via /v1/chat/completions
 */
export class GPTCompletionProvider implements ModelProvider {
  /**
 * Models supported by this provider with their display labels
   * 
   * Use `npm run scrape:openai-models` to get the latest models and features.
   * 
   * Note for AI Agent: When you are asked to update the available models, you should update the MODELS array with
   * the models listed at docs/OpenAIModels.json
   * 
   * The rules for which provider supports the model are as follows:
   * - The GPT provider works for all models that use the response API and do not have audio in their features
   *   because audio inputs aren't supported by response bracket off.
   * - The GPT Transcription provider works for all models that support the transcription API And are not covered by the previous rules.
   * - The GPT Completion provider works for all models that support the completion API and are not covered by the previous rules.
  */
  private static readonly MODELS = [
    { model: OPENAI.GPT_AUDIO, label: 'gpt-audio', inputFeatures: 'TA', outputFeatures: 'TA' },
    { model: OPENAI.GPT_AUDIO_MINI, label: 'gpt-audio-mini', inputFeatures: 'TA', outputFeatures: 'TA' },
    { model: OPENAI.GPT_4O_AUDIO_PREVIEW, label: 'GPT-4o Audio', inputFeatures: 'TA', outputFeatures: 'TA' },
    { model: OPENAI.GPT_4O_MINI_AUDIO_PREVIEW, label: 'GPT-4o mini Audio', inputFeatures: 'TA', outputFeatures: 'TA' },
    { model: OPENAI.GPT_4O_SEARCH_PREVIEW, label: 'GPT-4o Search Preview', inputFeatures: 'T', outputFeatures: 'T' },
    { model: OPENAI.GPT_4O_MINI_SEARCH_PREVIEW, label: 'GPT-4o mini Search Preview', inputFeatures: 'T', outputFeatures: 'T' },
  ] as const;

  constructor() {
    // Register this provider with the resolver
    ProviderResolver.getInstance().register(this, GPTCompletionProvider.MODELS);
  }

  /**
   * Map Curio voice to OpenAI voice
   * Returns undefined if model doesn't support audio output
   */
  mapGenericVoiceToProvider(curioVoiceId: string, model: string): string | undefined {
    // Check if model supports audio output
    const modelData = GPTCompletionProvider.MODELS.find(m => m.model === model);
    if (!modelData || !modelData.outputFeatures.includes('A')) {
      return undefined;
    }
    
    return mapCurioVoiceToOpenAI(curioVoiceId);
  }

  /**
   * Call Chat Completions API (non-streaming)
   */
  async call(
    model: string,
    config: ProviderCallConfig
  ): Promise<ProviderResult> {
    const openaiKey = await getOpenaiApiKey();
    if (!openaiKey) {
      throw new Error('OpenAI API key is required');
    }

    const startTime = Date.now();
    const { prompt, messages, temperature, tools } = config;

    // Derive modalities from voice: ['text', 'audio'] if voice is set, otherwise ['text']
    const modalities = config.voice ? ['text', 'audio'] : ['text'];

    // Build messages array
    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    // Add system message if prompt is provided
    if (prompt) {
      chatMessages.push({
        role: 'developer',
        content: prompt,
      });
    }

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const role = msg.role === 'model' ? 'assistant' : msg.role;
        chatMessages.push({
          role: role as 'user' | 'assistant' | 'developer',
          content: msg.content,
        });
      }
    }

    // Add current user content (with audio if present)
    const userContent = await buildAudioMessagesContent(config);
    if (userContent.length > 0) {
      chatMessages.push({
        role: 'user',
        content: userContent,
      });
    }

    const body: any = {
      model: model,
      messages: chatMessages,
      temperature: temperature,
      tools: convertToOpenAIChatCompletionTools(tools),
      modalities: modalities,
    };

    // Add audio output config if audio modality is enabled
    if (modalities.includes('audio')) {
      const openAIVoice = config.voice ? this.mapGenericVoiceToProvider(config.voice, model) || 'alloy' : 'alloy';
      body.audio = {
        voice: openAIVoice,
        format: 'pcm16', // Streaming requires pcm16 format
      };
    }

//    console.log(JSON.stringify(truncateBase64ForLogging(body), null, 2));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latency = Date.now() - startTime;

    const xRequestId = res.headers.get('x-request-id') || '';
    const xRateLimitLimitRequests = Number(res.headers.get('x-ratelimit-limit-requests')) || 0;
    const xRateLimitLimitTokens = Number(res.headers.get('x-ratelimit-limit-tokens')) || 0;
    const xRateLimitRemainingRequests = Number(res.headers.get('x-ratelimit-remaining-requests')) || 0;
    const xRateLimitRemainingTokens = Number(res.headers.get('x-ratelimit-remaining-tokens')) || 0;
    const xRateLimitResetRequests = res.headers.get('x-ratelimit-reset-requests') || '';
    const xRateLimitResetTokens = res.headers.get('x-ratelimit-reset-tokens') || '';

    if (res.status === 429) {
      throw new GPTCompletionRateLimitError(429, model as AudioCompletionModel, res.headers);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    
    // Extract response text and audio
    let responseText = '';
    let audioBase64: string | undefined;
    const choice = data.choices?.[0];
    if (choice) {
      if (typeof choice.message.content === 'string') {
        responseText = choice.message.content;
      } else if (Array.isArray(choice.message.content)) {
        // Handle multimodal content
        for (const contentItem of choice.message.content) {
          if (contentItem.type === 'text' && contentItem.text) {
            responseText += contentItem.text;
          } else if (contentItem.type === 'audio' && contentItem.audio) {
            // Extract audio data
            audioBase64 = contentItem.audio;
          }
        }
      }
      
      // Check for audio in message.audio (alternative location)
      if (choice.message.audio) {
        audioBase64 = choice.message.audio;
      }
    }

    // Build output array
    const output: any[] = [];
    if (audioBase64) {
      output.push({
        type: 'audio_output',
        audioBase64: audioBase64,
        mimeType: 'audio/pcm16',
      });
    }

    return {
      responseText,
      output: output,
      tokenData: {
        totalTokenCount: data.usage?.total_tokens || 0,
        promptTokenCount: data.usage?.prompt_tokens || 0,
        candidatesTokenCount: data.usage?.completion_tokens || 0,
        thoughtsTokenCount: 0,
        toolUsePromptTokenCount: 0,
        cachedContentTokenCount: 0,
      },
      xRequestData: {
        requestStatus: res.status,
        latency,
        xRequestId,
        xRateLimitLimitRequests,
        xRateLimitLimitTokens,
        xRateLimitRemainingRequests,
        xRateLimitRemainingTokens,
        xRateLimitResetRequests,
        xRateLimitResetTokens,
      },
    };
  }

  /**
   * Stream Chat Completions responses
   */
  async *stream(
    model: AudioCompletionModel,
    config: AudioCompletionCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const openaiKey = await getOpenaiApiKey();
    if (!openaiKey) {
      throw new Error('OpenAI API key is required');
    }

    const startTime = Date.now();
    const { prompt, messages, temperature, tools, generateRawEvents } = config;
    let latency = 0;

    // Derive modalities from voice: ['text', 'audio'] if voice is set, otherwise ['text']
    const modalities = config.voice ? ['text', 'audio'] : ['text'];

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (prompt) {
      chatMessages.push({
        role: 'system',
        content: prompt,
      });
    }

    if (messages && messages.length > 0) {
      for (const msg of messages) {
        const role = msg.role === 'model' ? 'assistant' : 'user';
        chatMessages.push({
          role: role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    const userContent = await buildAudioMessagesContent(config);
    if (userContent.length > 0) {
      chatMessages.push({
        role: 'user',
        content: userContent,
      });
    }

    const body: any = {
      model: model,
      messages: chatMessages,
      temperature: temperature,
      tools: convertToOpenAIChatCompletionTools(tools),
      modalities: modalities,
      stream: true,
    };

    // add audio output config if voice is set
    if (config.voice) {
      const openAIVoice = this.mapGenericVoiceToProvider(config.voice, model) || 'alloy';
      body.audio = {
        voice: openAIVoice,
        format: 'pcm16', // Streaming requires pcm16 format
      };
    }

    // Log request body (same as call method)
//    console.log(JSON.stringify(truncateBase64ForLogging(body), null, 2));

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify(body),
    });

    const xRequestId = res.headers.get('x-request-id') || '';
    const xRateLimitLimitRequests = Number(res.headers.get('x-ratelimit-limit-requests')) || 0;
    const xRateLimitLimitTokens = Number(res.headers.get('x-ratelimit-limit-tokens')) || 0;
    const xRateLimitRemainingRequests = Number(res.headers.get('x-ratelimit-remaining-requests')) || 0;
    const xRateLimitRemainingTokens = Number(res.headers.get('x-ratelimit-remaining-tokens')) || 0;
    const xRateLimitResetRequests = res.headers.get('x-ratelimit-reset-requests') || '';
    const xRateLimitResetTokens = res.headers.get('x-ratelimit-reset-tokens') || '';

    if (res.status === 429) {
      throw new GPTCompletionRateLimitError(429, model as AudioCompletionModel, res.headers);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';
    let audioChunks: string[] = [];
    let lastData: any = null;
    let textDeltaSequenceCounter = 0;
    let audioChunkSequenceCounter = 0;

    // Yield raw request event for debugging (if enabled)
    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'gpt-completion',
        rawData: {
          type: 'request',
          model: model,
          body: body,
        },
        timestamp: Date.now(),
      } as UnifiedRawEvent;
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Yield raw event FIRST for debugging (if enabled)
              if (generateRawEvents) {
                yield {
                  type: 'raw_event',
                  provider: 'gpt-completion',
                  rawData: data,
                  timestamp: Date.now(),
                } as UnifiedRawEvent;
              }
              
              if (latency === 0) {
                latency = Date.now() - startTime;
              }

              const delta = data.choices?.[0]?.delta;
              
              // Handle text content
              if (delta?.content) {
                fullText += delta.content;
                yield {
                  type: 'text_delta',
                  delta: delta.content,
                  sequenceNumber: textDeltaSequenceCounter++,
                } as UnifiedTextDeltaEvent;
              }
              
              // Handle audio data
              if (delta?.audio?.data) {
                audioChunks.push(delta.audio.data);
                const accumulatedAudio = audioChunks.join('');
                yield {
                  type: 'audio_chunk',
                  audio: accumulatedAudio,
                  format: 'pcm16',
                  sequenceNumber: audioChunkSequenceCounter++,
                } as UnifiedAudioChunkEvent;
              }

              // Check for finish_reason to send final audio
              if (data.choices?.[0]?.finish_reason && audioChunks.length > 0) {
                const finalAudio = audioChunks.join('');
                yield {
                  type: 'audio_chunk',
                  audio: finalAudio,
                  format: 'pcm16',
                  sequenceNumber: audioChunkSequenceCounter++,
                  finished: true,
                } as UnifiedAudioChunkEvent;
              }

              lastData = data;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }

      const totalLatency = Date.now() - startTime;

      return {
        tokenData: {
          totalTokenCount: lastData?.usage?.total_tokens || 0,
          promptTokenCount: lastData?.usage?.prompt_tokens || 0,
          candidatesTokenCount: lastData?.usage?.completion_tokens || 0,
          thoughtsTokenCount: 0,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: 0,
        },
        xRequestData: {
          requestStatus: res.status,
          latency: totalLatency,
          xRequestId,
          xRateLimitLimitRequests,
          xRateLimitLimitTokens,
          xRateLimitRemainingRequests,
          xRateLimitRemainingTokens,
          xRateLimitResetRequests,
          xRateLimitResetTokens,
        },
      };
    } catch (error: any) {
      throw error;
    }
  }
}

