import { getAnthropicApiKey } from "../../custom/ProcessDocument/common/secrets/get-anthropic-apikey";
import {
  ProviderResult,
  ProviderStreamingResult,
  ProviderCallConfig,
  UnifiedStreamEvent,
  ProviderRateLimitError,
  UserContentItem,
  ModelProvider,
} from "./types";
import {
  UnifiedResponseOutputItem,
  UnifiedResponseMessage,
  UnifiedFunctionCall,
  UnifiedTextDeltaEvent,
  UnifiedOutputItemAddedEvent,
  UnifiedCompletionEvent,
  UnifiedRawEvent,
} from "./unified-types";
import { ProviderResolver } from "./provider-resolver";
import { AnthropicModel, ANTHROPIC } from "./anthropic-models";
import {
  resolveTextContent,
  resolveBinaryContent,
  resolveContentURL,
  MIME_TYPES,
} from "./utils";
import { convertToAnthropicTools } from "./anthropic-tool-converter";

const ANTHROPIC_API_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = 8192;

class AnthropicRateLimitError extends ProviderRateLimitError {
  constructor(status: number, model: AnthropicModel, headers: Headers) {
    super(status, model, headers);
    this.name = 'AnthropicRateLimitError';
  }
}

/**
 * Build user content blocks for the Anthropic Messages API
 */
async function buildAnthropicContent(userContent: UserContentItem[]): Promise<any[]> {
  const content: any[] = [];

  for (const item of userContent) {
    const { mimeType } = item;
    const isText = mimeType.startsWith('text/');
    const isImage = mimeType.startsWith('image/');
    const isPdf = mimeType === MIME_TYPES.APPLICATION_PDF;

    if (isText) {
      const textContent = await resolveTextContent(item, 'AnthropicProvider');
      if (textContent !== null) {
        content.push({ type: 'text', text: textContent });
      }
    } else if (isImage) {
      const url = resolveContentURL(item);
      if (url !== null) {
        content.push({
          type: 'image',
          source: { type: 'url', url },
        });
      } else {
        const base64Data = await resolveBinaryContent(item, 'AnthropicProvider');
        if (base64Data !== null) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Data,
            },
          });
        }
      }
    } else if (isPdf) {
      const url = resolveContentURL(item);
      if (url !== null) {
        content.push({
          type: 'document',
          source: { type: 'url', url },
        });
      } else {
        const base64Data = await resolveBinaryContent(item, 'AnthropicProvider');
        if (base64Data !== null) {
          content.push({
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Data,
            },
          });
        }
      }
    } else {
      // For unsupported types, try to resolve as text
      const textContent = await resolveTextContent(item, 'AnthropicProvider');
      if (textContent !== null) {
        content.push({ type: 'text', text: textContent });
      }
    }
  }

  return content;
}

/**
 * Build messages array for Anthropic Messages API
 */
async function buildAnthropicMessages(
  messages: ProviderCallConfig['messages'],
  userContent: UserContentItem[],
): Promise<any[]> {
  const anthropicMessages: any[] = [];

  if (messages && messages.length > 0) {
    for (const msg of messages) {
      if (msg.role === 'developer') continue;
      const role = msg.role === 'model' ? 'assistant' : 'user';
      anthropicMessages.push({
        role,
        content: msg.content,
      });
    }
  }

  if (userContent && userContent.length > 0) {
    const contentBlocks = await buildAnthropicContent(userContent);
    if (contentBlocks.length > 0) {
      anthropicMessages.push({
        role: 'user',
        content: contentBlocks,
      });
    }
  }

  return anthropicMessages;
}

/**
 * Extract text from unified response output
 */
function extractOutputText(output: UnifiedResponseOutputItem[]): string {
  if (!output || output.length === 0) {
    return '';
  }

  for (const item of output) {
    if (item.type === 'message') {
      const message = item as UnifiedResponseMessage;
      if (message.status !== 'completed') continue;
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
 * Convert Anthropic API response to unified output format
 */
function convertAnthropicResponseToUnified(data: any): UnifiedResponseOutputItem[] {
  const items: UnifiedResponseOutputItem[] = [];
  const textParts: string[] = [];

  if (data.content && Array.isArray(data.content)) {
    for (const block of data.content) {
      if (block.type === 'text') {
        textParts.push(block.text);
      } else if (block.type === 'tool_use') {
        items.push({
          type: 'function_call',
          id: block.id,
          call_id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
          status: 'completed',
        } as UnifiedFunctionCall);
      }
    }
  }

  if (textParts.length > 0) {
    items.push({
      type: 'message',
      id: data.id || 'msg',
      role: 'assistant',
      content: [{
        type: 'output_text',
        text: textParts.join(''),
      }],
      status: 'completed',
    } as UnifiedResponseMessage);
  }

  return items;
}

/**
 * Anthropic Provider - handles Claude model interactions via the Messages API
 */
export class AnthropicProvider implements ModelProvider {
  private static readonly MODELS = [
    { model: ANTHROPIC.CLAUDE_SONNET_4, label: 'Claude Sonnet 4', inputFeatures: 'TI', outputFeatures: 'T' },
  ] as const;

  constructor() {
    ProviderResolver.getInstance().register(this, AnthropicProvider.MODELS);
  }

  /**
   * Call Anthropic Messages API (non-streaming)
   */
  async call(
    model: string,
    config: ProviderCallConfig
  ): Promise<ProviderResult> {
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const startTime = Date.now();
    const { prompt, userContent, messages, temperature, tools } = config;

    const anthropicMessages = await buildAnthropicMessages(messages, userContent);

    if (anthropicMessages.length === 0 && prompt) {
      anthropicMessages.push({
        role: 'user',
        content: prompt,
      });
    }

    const body: any = {
      model,
      messages: anthropicMessages,
      max_tokens: DEFAULT_MAX_TOKENS,
    };

    if (prompt) {
      body.system = prompt;
    }
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    const anthropicTools = convertToAnthropicTools(tools);
    if (anthropicTools) {
      body.tools = anthropicTools;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    const latency = Date.now() - startTime;

    const requestId = res.headers.get('request-id') || '';
    const rateLimitRequests = Number(res.headers.get('anthropic-ratelimit-requests-limit')) || 0;
    const rateLimitTokens = Number(res.headers.get('anthropic-ratelimit-tokens-limit')) || 0;
    const rateLimitRemainingRequests = Number(res.headers.get('anthropic-ratelimit-requests-remaining')) || 0;
    const rateLimitRemainingTokens = Number(res.headers.get('anthropic-ratelimit-tokens-remaining')) || 0;
    const rateLimitResetRequests = res.headers.get('anthropic-ratelimit-requests-reset') || '';
    const rateLimitResetTokens = res.headers.get('anthropic-ratelimit-tokens-reset') || '';

    if (res.status === 429) {
      throw new AnthropicRateLimitError(429, model as AnthropicModel, res.headers);
    }

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const unifiedOutput = convertAnthropicResponseToUnified(data);
    const responseText = extractOutputText(unifiedOutput);

    return {
      responseText,
      output: unifiedOutput,
      tokenData: {
        totalTokenCount: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
        promptTokenCount: data.usage?.input_tokens || 0,
        candidatesTokenCount: data.usage?.output_tokens || 0,
        thoughtsTokenCount: 0,
        toolUsePromptTokenCount: 0,
        cachedContentTokenCount: data.usage?.cache_read_input_tokens || 0,
      },
      xRequestData: {
        requestStatus: res.status,
        latency,
        xRequestId: requestId,
        xRateLimitLimitRequests: rateLimitRequests,
        xRateLimitLimitTokens: rateLimitTokens,
        xRateLimitRemainingRequests: rateLimitRemainingRequests,
        xRateLimitRemainingTokens: rateLimitRemainingTokens,
        xRateLimitResetRequests: rateLimitResetRequests,
        xRateLimitResetTokens: rateLimitResetTokens,
      },
    };
  }

  /**
   * Stream Anthropic Messages API responses
   */
  async *stream(
    model: string,
    config: ProviderCallConfig
  ): AsyncGenerator<UnifiedStreamEvent, ProviderStreamingResult> {
    const apiKey = await getAnthropicApiKey();
    if (!apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const startTime = Date.now();
    const { prompt, userContent, messages, temperature, tools, generateRawEvents } = config;
    let latency = 0;

    const anthropicMessages = await buildAnthropicMessages(messages, userContent);

    if (anthropicMessages.length === 0 && prompt) {
      anthropicMessages.push({
        role: 'user',
        content: prompt,
      });
    }

    const body: any = {
      model,
      messages: anthropicMessages,
      max_tokens: DEFAULT_MAX_TOKENS,
      stream: true,
    };

    if (prompt) {
      body.system = prompt;
    }
    if (temperature !== undefined) {
      body.temperature = temperature;
    }

    const anthropicTools = convertToAnthropicTools(tools);
    if (anthropicTools) {
      body.tools = anthropicTools;
    }

    if (generateRawEvents) {
      yield {
        type: 'raw_event',
        provider: 'anthropic',
        rawData: { type: 'request', model, body },
        timestamp: Date.now(),
      } as UnifiedRawEvent;
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
    });

    const requestId = res.headers.get('request-id') || '';
    const rateLimitRequests = Number(res.headers.get('anthropic-ratelimit-requests-limit')) || 0;
    const rateLimitTokens = Number(res.headers.get('anthropic-ratelimit-tokens-limit')) || 0;
    const rateLimitRemainingRequests = Number(res.headers.get('anthropic-ratelimit-requests-remaining')) || 0;
    const rateLimitRemainingTokens = Number(res.headers.get('anthropic-ratelimit-tokens-remaining')) || 0;
    const rateLimitResetRequests = res.headers.get('anthropic-ratelimit-requests-reset') || '';
    const rateLimitResetTokens = res.headers.get('anthropic-ratelimit-tokens-reset') || '';

    if (res.status === 429) {
      throw new AnthropicRateLimitError(429, model as AnthropicModel, res.headers);
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
    let textDeltaSequenceCounter = 0;
    let outputItemSequenceCounter = 0;

    const usage = {
      input_tokens: 0,
      output_tokens: 0,
      cache_read_input_tokens: 0,
    };

    // Track tool_use blocks being accumulated during streaming
    const activeToolUseBlocks = new Map<number, { id: string; name: string; partialJson: string }>();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === '[DONE]') continue;

            try {
              const data = JSON.parse(dataStr);

              if (generateRawEvents) {
                yield {
                  type: 'raw_event',
                  provider: 'anthropic',
                  rawData: data,
                  timestamp: Date.now(),
                } as UnifiedRawEvent;
              }

              switch (data.type) {
                case 'message_start': {
                  if (data.message?.usage) {
                    usage.input_tokens = data.message.usage.input_tokens || 0;
                    usage.cache_read_input_tokens = data.message.usage.cache_read_input_tokens || 0;
                  }
                  break;
                }

                case 'content_block_start': {
                  if (latency === 0) {
                    latency = Date.now() - startTime;
                  }
                  const block = data.content_block;
                  if (block?.type === 'tool_use') {
                    activeToolUseBlocks.set(data.index, {
                      id: block.id,
                      name: block.name,
                      partialJson: '',
                    });
                  }
                  break;
                }

                case 'content_block_delta': {
                  if (latency === 0) {
                    latency = Date.now() - startTime;
                  }

                  const delta = data.delta;
                  if (delta?.type === 'text_delta' && delta.text) {
                    yield {
                      type: 'text_delta',
                      delta: delta.text,
                      sequenceNumber: textDeltaSequenceCounter++,
                    } as UnifiedTextDeltaEvent;
                  } else if (delta?.type === 'input_json_delta' && delta.partial_json !== undefined) {
                    const activeBlock = activeToolUseBlocks.get(data.index);
                    if (activeBlock) {
                      activeBlock.partialJson += delta.partial_json;
                    }
                  }
                  break;
                }

                case 'content_block_stop': {
                  const activeBlock = activeToolUseBlocks.get(data.index);
                  if (activeBlock) {
                    let parsedArgs = '{}';
                    try {
                      parsedArgs = activeBlock.partialJson || '{}';
                      JSON.parse(parsedArgs);
                    } catch {
                      parsedArgs = '{}';
                    }

                    yield {
                      type: 'output_item_added',
                      item: {
                        type: 'function_call',
                        id: activeBlock.id,
                        call_id: activeBlock.id,
                        name: activeBlock.name,
                        arguments: parsedArgs,
                        status: 'completed',
                      } as UnifiedFunctionCall,
                      outputIndex: data.index,
                      sequenceNumber: outputItemSequenceCounter++,
                    } as UnifiedOutputItemAddedEvent;

                    activeToolUseBlocks.delete(data.index);
                  }
                  break;
                }

                case 'message_delta': {
                  if (data.usage) {
                    usage.output_tokens = data.usage.output_tokens || 0;
                  }
                  break;
                }

                case 'message_stop': {
                  yield {
                    type: 'completion',
                    usage: {
                      totalTokens: usage.input_tokens + usage.output_tokens,
                      inputTokens: usage.input_tokens,
                      outputTokens: usage.output_tokens,
                      cachedTokens: usage.cache_read_input_tokens,
                    },
                  } as UnifiedCompletionEvent;
                  break;
                }

                case 'error': {
                  const errorMsg = data.error?.message || 'Unknown Anthropic error';
                  yield {
                    type: 'completion',
                    status: 'failed',
                    error: errorMsg,
                  } as UnifiedCompletionEvent;
                  break;
                }
              }
            } catch {
              // Ignore parse errors for incomplete lines
            }
          }
        }
      }

      const totalLatency = Date.now() - startTime;

      return {
        tokenData: {
          totalTokenCount: usage.input_tokens + usage.output_tokens,
          promptTokenCount: usage.input_tokens,
          candidatesTokenCount: usage.output_tokens,
          thoughtsTokenCount: 0,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: usage.cache_read_input_tokens,
        },
        xRequestData: {
          requestStatus: res.status,
          latency: totalLatency,
          xRequestId: requestId,
          xRateLimitLimitRequests: rateLimitRequests,
          xRateLimitLimitTokens: rateLimitTokens,
          xRateLimitRemainingRequests: rateLimitRemainingRequests,
          xRateLimitRemainingTokens: rateLimitRemainingTokens,
          xRateLimitResetRequests: rateLimitResetRequests,
          xRateLimitResetTokens: rateLimitResetTokens,
        },
      };
    } catch (error: any) {
      throw error;
    }
  }
}
