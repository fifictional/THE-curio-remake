import { getOpenaiApiKey } from "../../custom/ProcessDocument/common/secrets/get-openai-apikey";
import OpenAI from "openai";
import { ResponseInputMessageContentList } from "openai/resources/responses/responses.mjs";
import { extractDataFromBuffer } from "./gpt-extract-data-from-buffer";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  UnifiedStreamEvent,
  ProviderRateLimitError,
  TokenData,
  XRequestData,
  UserContentItem,
  ModelProvider,
} from "./types";
import {
  UnifiedResponseOutputItem,
  UnifiedResponseMessage,
  UnifiedFunctionCall,
  UnifiedWebSearchCall,
  UnifiedReasoningItem,
  UnifiedCodeInterpreterCall,
  UnifiedFileSearchCall,
  UnifiedTextDeltaEvent,
  UnifiedOutputItemAddedEvent,
  UnifiedAnnotationAddedEvent,
  UnifiedCompletionEvent,
  UnifiedAnnotation,
  UnifiedRawEvent,
} from "./unified-types";
import { ProviderResolver } from "./provider-resolver";
import { OpenAIModel } from "@ai-providers/openai-models";
import {
  getFileExtension,
  resolveTextContent,
  resolveBinaryContent,
  resolveContentURL,
  MIME_TYPES,
  FILE_EXTENSIONS,
} from "./utils";
import { convertToOpenAITools } from "./gpt-tool-converter";
import { OPENAI } from "./openai-models";

/**
 * Rate limit error for GPT provider
 */
class GPTRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: OpenAIModel, headers: Headers) {
    super(status, model, headers);
    this.name = 'GPTRateLimitError';
  }
}

/**
 * Download text data from a URL (legacy wrapper for backward compatibility)
 */
async function getData(url: string): Promise<string> {
  const { downloadTextFromURL } = await import('./utils');
  return downloadTextFromURL(url, 'GPTProvider');
}

/**
 * Upload file to OpenAI Files API and return file URL
 */
async function uploadFileToOpenAI(
  base64: string,
  fileName: string,
  mimeType: string,
  openaiKey: string
): Promise<string> {
  // Convert base64 to buffer
  const buffer = Buffer.from(base64, 'base64');
  
  // Construct multipart/form-data manually for Node.js compatibility
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2)}`;
  const formDataParts: Buffer[] = [];
  
  // Add file field
  formDataParts.push(Buffer.from(`--${boundary}\r\n`));
  formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n`));
  formDataParts.push(Buffer.from(`Content-Type: ${mimeType}\r\n\r\n`));
  formDataParts.push(buffer);
  formDataParts.push(Buffer.from(`\r\n`));
  
  // Add purpose field
  formDataParts.push(Buffer.from(`--${boundary}\r\n`));
  formDataParts.push(Buffer.from(`Content-Disposition: form-data; name="purpose"\r\n\r\n`));
  formDataParts.push(Buffer.from(`assistants\r\n`));
  formDataParts.push(Buffer.from(`--${boundary}--\r\n`));
  
  const formDataBody = Buffer.concat(formDataParts);
  
  // Upload to OpenAI Files API
  const uploadRes = await fetch('https://api.openai.com/v1/files', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body: formDataBody,
  });
  
  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Failed to upload file to OpenAI: HTTP ${uploadRes.status}: ${errorText}`);
  }
  
  const uploadData = await uploadRes.json();
  const fileId = uploadData.id;
  
  if (!fileId) {
    throw new Error('OpenAI Files API did not return a file ID');
  }
  
  // Return file URL format: https://api.openai.com/v1/files/{file_id}
  return `https://api.openai.com/v1/files/${fileId}`;
}


/**
 * Upload file to OpenAI and return file URL
 * Fetches API key once and reuses it for multiple uploads
 */
async function uploadFileIfNeeded(
  item: UserContentItem,
  openaiKey: string
): Promise<string> {
  const url = resolveContentURL(item);
  if (url) {
    return url;
  }
  
  const base64Data = await resolveBinaryContent(item, 'GPTProvider');
  if (!base64Data) {
    throw new Error('No content or URL provided for file upload');
  }
  
  const extension = getFileExtension(item.mimeType) || FILE_EXTENSIONS.BIN;
  const fileName = `file.${extension}`;
  
  return await uploadFileToOpenAI(base64Data, fileName, item.mimeType, openaiKey);
}

/**
 * Build user content for OpenAI API from array of UserContentItem
 */
async function buildUserContent(userContent: UserContentItem[]): Promise<ResponseInputMessageContentList> {
  const content: ResponseInputMessageContentList = [];
  
  // Fetch API key once if we might need it for file uploads
  let openaiKey: string | undefined = undefined;
  const needsFileUpload = userContent.some(item => {
    const isText = item.mimeType.startsWith('text/');
    const isImage = item.mimeType.startsWith('image/');
    return !isText && !isImage && !item.contentURL;
  });
  
  if (needsFileUpload) {
    openaiKey = await getOpenaiApiKey();
    if (!openaiKey) {
      throw new Error('OpenAI API key is required for file uploads');
    }
  }

  for (const item of userContent) {
    const { mimeType } = item;
    const isText = mimeType.startsWith('text/');
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === MIME_TYPES.APPLICATION_PDF;
    const isAudio = mimeType.startsWith('audio/');

    if (isText) {
      // Handle text content
      const textContent = await resolveTextContent(item, 'GPTProvider');
      if (textContent !== null) {
        content.push({ type: 'input_text', text: textContent });
      }
    } else if (isImage) {
      // Handle image content
      const url = resolveContentURL(item);
      if (url !== null) {
        content.push({ type: 'input_image', detail: 'auto', image_url: url });
      } else {
        const base64Data = await resolveBinaryContent(item, 'GPTProvider');
        if (base64Data !== null) {
          const imageUrl = `data:${mimeType};base64,${base64Data}`;
          content.push({ type: 'input_image', detail: 'auto', image_url: imageUrl });
        }
      }
    } else if (isPdf || isAudio) {
      // Handle PDF or audio files - need to upload if base64, or use URL directly
      if (!openaiKey) {
        openaiKey = await getOpenaiApiKey();
        if (!openaiKey) {
          throw new Error('OpenAI API key is required for file uploads');
        }
      }
      const fileUrl = await uploadFileIfNeeded(item, openaiKey);
      content.push({ type: 'input_file', file_url: fileUrl });
    } else {
      // Handle other file types (markdown, etc.)
      const extension = getFileExtension(item.contentURL || mimeType);
      
      if (extension === FILE_EXTENSIONS.MD || extension === FILE_EXTENSIONS.TXT) {
        // For markdown/text-like files, download and convert to text
        const textContent = await resolveTextContent(item, 'GPTProvider');
        if (textContent !== null) {
          content.push({ type: 'input_text', text: textContent });
        }
      } else {
        // For other file types, upload if base64 or use URL
        if (!openaiKey) {
          openaiKey = await getOpenaiApiKey();
          if (!openaiKey) {
            throw new Error('OpenAI API key is required for file uploads');
          }
        }
        const fileUrl = await uploadFileIfNeeded(item, openaiKey);
        content.push({ type: 'input_file', file_url: fileUrl });
      }
    }
  }

  return content;
}

/**
 * Build input messages for OpenAI API
 */
async function buildInputMessages(
  messages: ProviderCallConfig['messages'],
  userContent: UserContentItem[],
  previousOutput?: OpenAI.Responses.ResponseOutputItem[],
  functionCallOutput?: any
): Promise<any[]> {
  const inputMessages: any[] = [];

  if (messages && messages.length > 0) {
    for (const msg of messages) {
      const role = msg.role === 'developer' ? 'developer' : msg.role === 'model' ? 'assistant' : 'user';
      
      if (role === 'assistant') {
        const msgContent = msg.content || '';
        inputMessages.push({
          role: 'assistant',
          content: [{ type: 'output_text', text: msgContent }],
        });
      } else {
        // Convert message content to UserContentItem format
        const messageContent: UserContentItem[] = msg.content 
          ? [{ mimeType: 'text/plain', content: msg.content }]
          : [];
        inputMessages.push({
          role: role,
          content: await buildUserContent(messageContent),
        });
      }
    }
  }

  if (previousOutput && previousOutput.length > 0) {
    inputMessages.push(...previousOutput);
  }

  if (functionCallOutput) {
    inputMessages.push(functionCallOutput);
  }

  // Add user content if any items exist
  if (userContent && userContent.length > 0) {
    inputMessages.push({
      role: 'user',
      content: await buildUserContent(userContent),
    });
  }

  return inputMessages;
}

/**
 * Extract text from unified response output
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
 * Convert a single OpenAI ResponseOutputItem to UnifiedResponseOutputItem
 */
function convertOpenAIOutputItemToUnified(
  item: OpenAI.Responses.ResponseOutputItem
): UnifiedResponseOutputItem {
  switch (item.type) {
    case 'message':
      return convertOpenAIMessage(item as OpenAI.Responses.ResponseOutputMessage);
    case 'function_call':
      return convertOpenAIFunctionCall(item as OpenAI.Responses.ResponseFunctionToolCall);
    case 'web_search_call':
      return convertOpenAIWebSearch(item as OpenAI.Responses.ResponseFunctionWebSearch);
    case 'reasoning':
      return convertOpenAIReasoning(item as OpenAI.Responses.ResponseReasoningItem);
    case 'code_interpreter_call':
      return convertOpenAICodeInterpreter(item as any);
    case 'file_search_call':
      return convertOpenAIFileSearch(item as any);
    default:
      console.warn(`Unsupported output type: ${(item as any).type}`);
      throw new Error(`Unsupported output type: ${(item as any).type}`);
  }
}

/**
 * Convert OpenAI ResponseOutputItem array to UnifiedResponseOutputItem array
 */
function convertOpenAIOutputToUnified(
  items: OpenAI.Responses.ResponseOutputItem[]
): UnifiedResponseOutputItem[] {
  return items.map(convertOpenAIOutputItemToUnified);
}

function convertOpenAIMessage(
  item: OpenAI.Responses.ResponseOutputMessage
): UnifiedResponseMessage {
  return {
    type: 'message',
    id: item.id,
    role: item.role,
    content: item.content.map(contentItem => {
      if (contentItem.type === 'output_text') {
        return {
          type: 'output_text',
          text: contentItem.text,
          annotations: contentItem.annotations?.map(ann => {
            if (ann.type === 'file_citation') {
              return {
                type: 'file_citation' as const,
                file_id: ann.file_id,
                filename: ann.filename,
                index: ann.index,
              };
            } else if (ann.type === 'url_citation') {
              return {
                type: 'url_citation' as const,
                url: ann.url,
                title: ann.title,
                start_index: ann.start_index,
                end_index: ann.end_index,
              };
            } else if (ann.type === 'container_file_citation') {
              return {
                type: 'container_file_citation' as const,
                container_id: ann.container_id,
                file_id: ann.file_id,
                filename: ann.filename,
                start_index: ann.start_index,
                end_index: ann.end_index,
              };
            } else {
              return {
                type: 'file_citation' as const,
                file_id: (ann as any).file_id,
              };
            }
          }),
        };
      } else {
        return {
          type: 'refusal',
          refusal: (contentItem as any).refusal || '',
        };
      }
    }),
    status: item.status,
  };
}

function convertOpenAIFunctionCall(
  item: OpenAI.Responses.ResponseFunctionToolCall
): UnifiedFunctionCall {
  return {
    type: 'function_call',
    id: item.id || item.call_id,
    call_id: item.call_id,
    name: item.name,
    arguments: item.arguments, // Already JSON string
    status: item.status,
  };
}

function convertOpenAIWebSearch(
  item: OpenAI.Responses.ResponseFunctionWebSearch
): UnifiedWebSearchCall {
  return {
    type: 'web_search_call',
    id: item.id,
    status: item.status,
  };
}

function convertOpenAIReasoning(
  item: OpenAI.Responses.ResponseReasoningItem
): UnifiedReasoningItem {
  return {
    type: 'reasoning',
    id: item.id,
  };
}

function convertOpenAICodeInterpreter(
  item: any
): UnifiedCodeInterpreterCall {
  return {
    type: 'code_interpreter_call',
    id: item.id,
    container_id: item.container_id,
    outputs: item.outputs,
  };
}

function convertOpenAIFileSearch(
  item: any
): UnifiedFileSearchCall {
  return {
    type: 'file_search_call',
    id: item.id,
    vector_store_ids: item.vector_store_ids || [],
    results: item.results,
  };
}

/**
 * GPT Provider - handles all GPT API interactions
 */
export class GPTProvider implements ModelProvider {
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
    { model: OPENAI.GPT_5_2, label: 'GPT-5.2', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_1, label: 'GPT-5.1', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5, label: 'GPT-5', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_MINI, label: 'GPT-5 Mini', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_NANO, label: 'GPT-5 Nano', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_1_CODEX, label: 'GPT-5.1 Codex', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_1_CODEX_MAX, label: 'GPT-5.1-Codex-Max', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_CODEX, label: 'GPT-5-Codex', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_2_PRO, label: 'GPT-5.2 pro', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_PRO, label: 'GPT-5 pro', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O3_DEEP_RESEARCH, label: 'o3-deep-research', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O4_MINI_DEEP_RESEARCH, label: 'o4-mini-deep-research', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O3_PRO, label: 'o3-pro', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O3, label: 'o3', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O4_MINI, label: 'o4-mini', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4_1, label: 'GPT-4.1', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4_1_MINI, label: 'GPT-4.1 mini', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4_1_NANO, label: 'GPT-4.1 nano', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O1_PRO, label: 'o1-pro', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.COMPUTER_USE_PREVIEW, label: 'computer-use-preview', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.O3_MINI, label: 'o3-mini', inputFeatures: 'T', outputFeatures: 'T' },
    { model: OPENAI.O1, label: 'o1', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4O, label: 'GPT-4o', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4O_MINI, label: 'GPT-4o mini', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_4_TURBO, label: 'GPT-4 Turbo', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.CHATGPT_4O_LATEST, label: 'ChatGPT-4o', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_1_CODEX_MINI, label: 'GPT-5.1 Codex mini', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_3_5_TURBO, label: 'GPT-3.5 Turbo', inputFeatures: 'T', outputFeatures: 'T' },
    { model: OPENAI.GPT_4, label: 'GPT-4', inputFeatures: 'T', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_2_CHAT_LATEST, label: 'GPT-5.2 Chat', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_1_CHAT_LATEST, label: 'GPT-5.1 Chat', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_5_CHAT_LATEST, label: 'GPT-5 Chat', inputFeatures: 'TI', outputFeatures: 'T' },
    { model: OPENAI.GPT_OSS_120B, label: 'gpt-oss-120b', inputFeatures: 'T', outputFeatures: 'T' },
    { model: OPENAI.GPT_OSS_20B, label: 'gpt-oss-20b', inputFeatures: 'T', outputFeatures: 'T' },
  ] as const;

  constructor() {
    // Register this provider with the resolver
    ProviderResolver.getInstance().register(this, GPTProvider.MODELS);
  }

  /**
   * Call GPT API (non-streaming)
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
    const { prompt, userContent, messages, temperature, tools } = config;

    // Extract previousOutput and functionCallOutput from messages if present
    const lastMessage = messages && messages.length > 0 ? (messages[messages.length - 1] as any) : null;
    const previousOutput = lastMessage?.previousOutput;
    const functionCallOutput = lastMessage?.functionCallOutput;
    const cleanMessages = previousOutput || functionCallOutput 
      ? messages?.filter((m: any, i: number) => i < messages.length - 1 || (!m.previousOutput && !m.functionCallOutput)) 
      : messages;

    const inputMessages = await buildInputMessages(cleanMessages, userContent, previousOutput, functionCallOutput);
    
    // If input is empty and we have a prompt, add it as a system message
    // This handles the case where only a system prompt is provided (e.g., in playground)
    // Note: ResponsePrompt is for stored templates (id + variables), not simple strings
    // So we add the prompt string to the input array instead
    // Using 'system' role since this is a system prompt, not user input
    if (inputMessages.length === 0 && prompt) {
      inputMessages.push({
        role: 'system',
        content: [{ type: 'input_text', text: prompt }],
      });
    }
    
    const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: model,
      instructions: prompt,
      input: inputMessages,
      temperature: model.startsWith('gpt-5') ? undefined : temperature,
      tools: convertToOpenAITools(tools),
    };

    const res = await fetch('https://api.openai.com/v1/responses', {
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
      throw new GPTRateLimitError(429, model as OpenAIModel, res.headers);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const openAIOutput = data.output || [];
    const unifiedOutput = convertOpenAIOutputToUnified(openAIOutput);
    const responseText = extractOutputText(unifiedOutput);

    const webSearchCalled = unifiedOutput.some(
      (item) => item.type === 'web_search_call'
    );

    return {
      responseText,
      output: unifiedOutput,
      tokenData: {
        totalTokenCount: data.usage?.total_tokens || 0,
        promptTokenCount: data.usage?.input_tokens || 0,
        candidatesTokenCount: data.usage?.output_tokens || 0,
        thoughtsTokenCount: data.usage?.output_tokens_details?.reasoning_tokens || 0,
        toolUsePromptTokenCount: 0,
        cachedContentTokenCount: data.usage?.input_tokens_details?.cached_tokens || 0,
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
      webSearchCalled,
    };
  }

  /**
   * Stream GPT responses
   */
  async *stream(
    model: OpenAIModel,
    config: ProviderCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const openaiKey = await getOpenaiApiKey();
    if (!openaiKey) {
      throw new Error('OpenAI API key is required');
    }

    const startTime = Date.now();
    const { prompt, userContent, messages, temperature, tools, generateRawEvents } = config;
    let latency = 0;

    const lastMessage = messages && messages.length > 0 ? (messages[messages.length - 1] as any) : null;
    const previousOutput = lastMessage?.previousOutput;
    const functionCallOutput = lastMessage?.functionCallOutput;
    const cleanMessages = (previousOutput || functionCallOutput) && messages
      ? messages.filter((m: any, i: number) => i < (messages?.length || 0) - 1 || (!m.previousOutput && !m.functionCallOutput)) 
      : messages;

    const inputMessages = await buildInputMessages(cleanMessages, userContent, previousOutput, functionCallOutput);
    
    // If input is empty and we have a prompt, add it as a system message
    // This handles the case where only a system prompt is provided (e.g., in playground)
    // Note: ResponsePrompt is for stored templates (id + variables), not simple strings
    // So we add the prompt string to the input array instead
    // Using 'system' role since this is a system prompt, not user input
    if (inputMessages.length === 0 && prompt) {
      inputMessages.push({
        role: 'system',
        content: [{ type: 'input_text', text: prompt }],
      });
    }
    
    const body: OpenAI.Responses.ResponseCreateParamsNonStreaming = {
      model: model,
      instructions: prompt,
      input: inputMessages,
      temperature: model.startsWith('gpt-5') ? undefined : temperature,
      tools: convertToOpenAITools(tools),
    };

    const res = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        ...body,
        stream: true,
      }),
    });

    const xRequestId = res.headers.get('x-request-id') || '';
    const xRateLimitLimitRequests = Number(res.headers.get('x-ratelimit-limit-requests')) || 0;
    const xRateLimitLimitTokens = Number(res.headers.get('x-ratelimit-limit-tokens')) || 0;
    const xRateLimitRemainingRequests = Number(res.headers.get('x-ratelimit-remaining-requests')) || 0;
    const xRateLimitRemainingTokens = Number(res.headers.get('x-ratelimit-remaining-tokens')) || 0;
    const xRateLimitResetRequests = res.headers.get('x-ratelimit-reset-requests') || '';
    const xRateLimitResetTokens = res.headers.get('x-ratelimit-reset-tokens') || '';

    if (res.status === 429) {
      throw new GPTRateLimitError(429, model as OpenAIModel, res.headers);
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
    const messageParts: { delta: string; sequenceNumber: number }[] = [];
    let lastCompletedData: any = null;
    let webSearchCalled = false;
    let textDeltaSequenceCounter = 0;
    let outputItemSequenceCounter = 0;

    const usage = {
      total_tokens: 0,
      input_tokens: 0,
      output_tokens: 0,
      output_tokens_details: {
        reasoning_tokens: 0,
      },
      input_tokens_details: {
        cached_tokens: 0,
      },
    };

    const seenAnnotationKeys = new Set<string>();
    const seenFunctionCallIds = new Set<string>();

    // Yield raw request event for debugging (if enabled)
    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'gpt',
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
        const { events, remainder } = extractDataFromBuffer(buffer);
        buffer = remainder;

        for (const evt of events) {
          // Yield raw event FIRST for debugging (if enabled)
          if (generateRawEvents) {
            yield {
              type: 'raw_event',
              provider: 'gpt',
              rawData: evt,
              timestamp: Date.now(),
            } as UnifiedRawEvent;
          }

          try {
            if (evt.name === 'response.output_text.delta') {
              const json: any = evt.data;
              if (latency === 0) {
                latency = Date.now() - startTime;
              }
              
              const delta = json?.delta;
              // Use provided sequenceNumber or synthesize one
              const sequenceNumber = typeof json?.sequenceNumber === 'number' 
                ? json.sequenceNumber 
                : textDeltaSequenceCounter++;
              
              if (!messageParts.some((p) => p.sequenceNumber === sequenceNumber)) {
                messageParts.push({ delta, sequenceNumber });
                messageParts.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
                
                yield {
                  type: 'text_delta',
                  delta,
                  sequenceNumber,
                } as UnifiedTextDeltaEvent;
              }
            } else if (evt.name === 'response.output_item.added') {
              const json: any = evt.data;
              const openAIItem = json?.item;
              const unifiedItem = convertOpenAIOutputItemToUnified(openAIItem);
              
              if (unifiedItem.type === 'web_search_call') {
                webSearchCalled = true;
              } else if (unifiedItem.type === 'function_call') {
                const callId = unifiedItem.call_id;
                if (callId && !seenFunctionCallIds.has(callId)) {
                  seenFunctionCallIds.add(callId);
                }
              }
              
              // Use provided sequence_number or synthesize one
              const sequenceNumber = typeof json?.sequence_number === 'number'
                ? json.sequence_number
                : outputItemSequenceCounter++;
              
              yield {
                type: 'output_item_added',
                item: unifiedItem,
                outputIndex: json?.output_index || 0,
                sequenceNumber,
              } as UnifiedOutputItemAddedEvent;
            } else if (evt.name === 'response.output_text.annotation.added') {
              const json: any = evt.data;
              const ann = json?.annotation;
              
              if (ann?.type === 'url_citation' || ann?.type === 'file_citation' || ann?.type === 'container_file_citation') {
                const unifiedAnnotation: UnifiedAnnotation = {
                  type: ann.type === 'container_file_citation' ? 'container_file_citation' : ann.type === 'file_citation' ? 'file_citation' : 'url_citation',
                  file_id: ann.file_id,
                  url: ann.url,
                  title: ann.title,
                  filename: ann.filename,
                  start_index: ann.start_index,
                  end_index: ann.end_index,
                  container_id: ann.container_id,
                };
                
                const itemId = json?.item_id ?? '';
                const outputIndex = json?.output_index ?? 0;
                const contentIndex = json?.content_index ?? 0;
                const annotationIndex = json?.annotation_index ?? 0;
                const key = `${itemId}|${outputIndex}|${contentIndex}|${annotationIndex}|${ann.start_index}|${ann.end_index}|${ann.url || ann.file_id}`;
                if (!seenAnnotationKeys.has(key)) {
                  seenAnnotationKeys.add(key);
                  
                  yield {
                    type: 'annotation_added',
                    annotation: unifiedAnnotation,
                    itemId,
                    outputIndex,
                    contentIndex,
                    annotationIndex,
                  } as UnifiedAnnotationAddedEvent;
                }
              }
            } else if (evt.name === 'response.completed') {
              const jsonUsage: any = evt.data;
              lastCompletedData = jsonUsage;
              const u = jsonUsage?.response?.usage;
              if (u) {
                usage.total_tokens = u.total_tokens || usage.total_tokens;
                usage.input_tokens = u.input_tokens || usage.input_tokens;
                usage.output_tokens = u.output_tokens || usage.output_tokens;
                usage.output_tokens_details.reasoning_tokens = u.output_tokens_details?.reasoning_tokens || usage.output_tokens_details.reasoning_tokens;
                usage.input_tokens_details.cached_tokens = u.input_tokens_details?.cached_tokens || usage.input_tokens_details.cached_tokens;
              }
              
              yield {
                type: 'completion',
                usage: {
                  totalTokens: usage.total_tokens,
                  inputTokens: usage.input_tokens,
                  outputTokens: usage.output_tokens,
                  reasoningTokens: usage.output_tokens_details.reasoning_tokens,
                  cachedTokens: usage.input_tokens_details.cached_tokens,
                },
              } as UnifiedCompletionEvent;
            }
          } catch (error) {
            // Error processing event - continue
          }
        }
      }

      let parsedOutput: OpenAI.Responses.ResponseOutputItem[] = [];
      try {
        if (lastCompletedData?.response?.output) {
          parsedOutput = lastCompletedData.response.output;
        }
      } catch (err) {
        // Error parsing - will log final data below
      }

      const totalLatency = Date.now() - startTime;

      return {
        tokenData: {
          totalTokenCount: usage.total_tokens,
          promptTokenCount: usage.input_tokens,
          candidatesTokenCount: usage.output_tokens,
          thoughtsTokenCount: usage.output_tokens_details.reasoning_tokens,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: usage.input_tokens_details.cached_tokens,
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
        webSearchCalled,
      };
    } catch (error: any) {
      throw error;
    }
  }
}

