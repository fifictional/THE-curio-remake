import { getOpenaiApiKey } from "../../custom/ProcessDocument/common/secrets/get-openai-apikey";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  UnifiedStreamEvent,
  ProviderRateLimitError,
  ModelProvider,
} from "./types";
import { UnifiedTextDeltaEvent, UnifiedCompletionEvent, UnifiedRawEvent } from "./unified-types";
import { ProviderResolver } from "./provider-resolver";
import { resolveBinaryContent } from "./utils";
import { OPENAI } from "./openai-models";

/**
 * Transcription model types
 */
export type TranscriptionModel = 
  | typeof OPENAI.GPT_4O_TRANSCRIBE
  | typeof OPENAI.GPT_4O_TRANSCRIBE_DIARIZE
  | typeof OPENAI.GPT_4O_MINI_TRANSCRIBE
  | typeof OPENAI.WHISPER_1;

/**
 * Rate limit error for GPT Transcription provider
 */
class GPTTranscriptionRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: string, headers: Headers) {
    super(status, model, headers);
    this.name = 'GPTTranscriptionRateLimitError';
  }
}

/**
 * GPT Transcription Provider - handles audio transcription via /v1/audio/transcriptions
 */
export class GPTTranscriptionProvider implements ModelProvider {
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
    { model: OPENAI.GPT_4O_TRANSCRIBE, label: 'GPT-4o Transcribe', inputFeatures: 'TA', outputFeatures: 'T' },
    { model: OPENAI.GPT_4O_TRANSCRIBE_DIARIZE, label: 'GPT-4o Transcribe Diarize', inputFeatures: 'TA', outputFeatures: 'T' },
    { model: OPENAI.GPT_4O_MINI_TRANSCRIBE, label: 'GPT-4o Mini Transcribe', inputFeatures: 'TA', outputFeatures: 'T' },
    { model: OPENAI.WHISPER_1, label: 'Whisper', inputFeatures: 'A', outputFeatures: 'T' },
  ] as const;

  constructor() {
    // Register this provider with the resolver
    ProviderResolver.getInstance().register(this, GPTTranscriptionProvider.MODELS);
  }

  /**
   * Call Transcription API (non-streaming)
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
    
    // Extract audio from userContent
    const audioItem = config.userContent.find(item => item.mimeType.startsWith('audio/'));
    if (!audioItem) {
      throw new Error('Audio file is required for transcription. Please provide an audio file in userContent.');
    }

    // Extract transcription options
    const transcriptOptions = config.transcriptOptions || {};
    const language = transcriptOptions.language;
    const responseFormat = transcriptOptions.responseFormat;
    const timestampGranularities = transcriptOptions.timestampGranularities;
    const prompt = config.prompt;
    const temperature = config.temperature;

    // Prepare audio file for upload
    let fileBuffer: Buffer;
    let fileName: string;

    // Resolve audio content from userContent
    const audioBase64 = await resolveBinaryContent(audioItem, 'GPTTranscriptionProvider');
    if (!audioBase64) {
      throw new Error('Failed to resolve audio content from userContent');
    }

    // Convert base64 to Buffer
    fileBuffer = Buffer.from(audioBase64, 'base64');
    
    // Determine file name from mimeType or use default
    const mimeType = audioItem.mimeType;
    if (mimeType.includes('mp3') || mimeType.includes('mpeg')) {
      fileName = 'audio.mp3';
    } else if (mimeType.includes('wav')) {
      fileName = 'audio.wav';
    } else if (mimeType.includes('m4a')) {
      fileName = 'audio.m4a';
    } else {
      // Extract extension from mimeType or use default
      const extension = mimeType.split('/')[1]?.split(';')[0] || 'mp3';
      fileName = `audio.${extension}`;
    }

    // Construct multipart/form-data
    const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
    const formDataParts: Buffer[] = [];

    // Add model field
    formDataParts.push(Buffer.from(`--${boundary}\r\n`));
    formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="model"\r\n\r\n`));
    formDataParts.push(Buffer.from(`${model}\r\n`));

    // Add file field
    formDataParts.push(Buffer.from(`--${boundary}\r\n`));
    formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
    formDataParts.push(Buffer.from(`Content-Type: audio/mpeg\r\n\r\n`));
    formDataParts.push(fileBuffer);
    formDataParts.push(Buffer.from(`\r\n`));

    // Add optional fields
    if (language) {
      formDataParts.push(Buffer.from(`--${boundary}\r\n`));
      formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="language"\r\n\r\n`));
      formDataParts.push(Buffer.from(`${language}\r\n`));
    }

    if (prompt) {
      formDataParts.push(Buffer.from(`--${boundary}\r\n`));
      formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="prompt"\r\n\r\n`));
      formDataParts.push(Buffer.from(`${prompt}\r\n`));
    }

    if (responseFormat) {
      formDataParts.push(Buffer.from(`--${boundary}\r\n`));
      formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="response_format"\r\n\r\n`));
      formDataParts.push(Buffer.from(`${responseFormat}\r\n`));
    }

    if (temperature !== undefined) {
      formDataParts.push(Buffer.from(`--${boundary}\r\n`));
      formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="temperature"\r\n\r\n`));
      formDataParts.push(Buffer.from(`${temperature}\r\n`));
    }

    if (timestampGranularities && timestampGranularities.length > 0) {
      for (const granularity of timestampGranularities) {
        formDataParts.push(Buffer.from(`--${boundary}\r\n`));
        formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="timestamp_granularities[]"\r\n\r\n`));
        formDataParts.push(Buffer.from(`${granularity}\r\n`));
      }
    }

    formDataParts.push(Buffer.from(`--${boundary}--\r\n`));
    const formDataBody = Buffer.concat(formDataParts);

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: formDataBody,
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
      throw new GPTTranscriptionRateLimitError(429, model, res.headers);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    
    // Extract transcription text based on response format
    let responseText = '';
    if (typeof data === 'string') {
      responseText = data;
    } else if (data.text) {
      responseText = data.text;
    } else if (data.transcript) {
      responseText = data.transcript;
    }

    return {
      responseText,
      output: data, // Raw response data
      tokenData: {
        totalTokenCount: 0, // Transcription API doesn't return token usage
        promptTokenCount: 0,
        candidatesTokenCount: 0,
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
   * Stream transcription (if supported by the API)
   * Note: Transcription API doesn't support streaming, but we implement for consistency
   */
  async *stream(
    model: string,
    config: ProviderCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const { generateRawEvents } = config;
    
    // Transcription API doesn't support streaming, so we just call and yield the result
    const result = await this.call(model, config);
    
    // Yield raw event for debugging (if enabled)
    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'gpt-transcription',
        rawData: {
          type: 'response',
          model: model,
          result: result,
        },
        timestamp: Date.now(),
      } as UnifiedRawEvent;
    }
    
    if (result.responseText) {
      yield {
        type: 'text_delta',
        delta: result.responseText,
        sequenceNumber: 0,
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

