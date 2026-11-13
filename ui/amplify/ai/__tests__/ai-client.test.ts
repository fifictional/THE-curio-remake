/**
 * Unit tests for AI Client with provider pattern
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { AIClient } from "@ai-client";
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { ProviderRateLimitError } from "@ai-providers/types";
import { ProviderResolver } from "@ai-providers/provider-resolver";
import * as intentsModule from "@ai-intents/index";

// Mock providers
const mockGPTProviderInstance = {
  call: vi.fn(),
  stream: vi.fn(),
};

const mockGeminiProviderInstance = {
  call: vi.fn(),
  stream: vi.fn(),
};

// Prevent providers from being instantiated
vi.mock('@ai-providers/index', () => ({
  // Empty exports to prevent provider instantiation
}));

describe('AIClient', () => {
  let client: AIClient;
  let mockSaveTokenData: ReturnType<typeof vi.fn>;
  let mockCloudWatchClient: CloudWatchClient;
  let resolver: ProviderResolver;

  beforeEach(() => {
    mockSaveTokenData = vi.fn().mockResolvedValue(undefined);
    mockCloudWatchClient = {
      send: vi.fn().mockResolvedValue({}),
    } as any;

    // Reset provider resolver and register mock providers
    resolver = ProviderResolver.getInstance();
    resolver.clear();
    
    // Register mock providers for the models we'll test
    resolver.register(mockGPTProviderInstance as any, [
      { model: 'gpt-5.1', label: 'GPT-5.1' },
      { model: 'gpt-5.2', label: 'GPT-5.2' },
      { model: 'gpt-4o', label: 'GPT-4o' },
    ]);
    resolver.register(mockGeminiProviderInstance as any, [
      { model: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
    ]);

    // Reset mocks
    vi.clearAllMocks();

    client = new AIClient({
      userUuid: 'test-user-uuid',
      saveTokenData: mockSaveTokenData,
      cloudwatchClient: mockCloudWatchClient,
    });
  });

  describe('call', () => {
    // test('should call GPT provider for GPT model', async () => {
    //   mockGPTProviderInstance.call.mockResolvedValue({
    //     responseText: 'GPT response',
    //     output: [],
    //     tokenData: {
    //       totalTokenCount: 100,
    //       promptTokenCount: 50,
    //       candidatesTokenCount: 50,
    //       thoughtsTokenCount: 0,
    //       toolUsePromptTokenCount: 0,
    //       cachedContentTokenCount: 0,
    //     },
    //     xRequestData: {
    //       requestStatus: 200,
    //       latency: 100,
    //       xRequestId: 'test-id',
    //       xRateLimitLimitRequests: 100,
    //       xRateLimitLimitTokens: 1000,
    //       xRateLimitRemainingRequests: 99,
    //       xRateLimitRemainingTokens: 950,
    //       xRateLimitResetRequests: '1234567890',
    //       xRateLimitResetTokens: '1234567890',
    //     },
    //     webSearchCalled: false,
    //   });

    //   const result = await client.call({
    //     intent: 'chat',
    //     userTier: 'ultra',
    //     prompt: 'Test prompt',
    //     userContent: [
    //       { mimeType: 'text/plain', content: 'Test input' }
    //     ],
    //     category: 'chat',
    //     feature: 'test-feature',
    //   });

    //   expect(result.responseText).toBe('GPT response');
    //   expect(mockGPTProviderInstance.call).toHaveBeenCalledWith(
    //     'gpt-5.1',
    //     expect.objectContaining({
    //       prompt: 'Test prompt',
    //       userContent: [
    //         { mimeType: 'text/plain', content: 'Test input' }
    //       ],
    //     })
    //   );
    //   expect(mockSaveTokenData).toHaveBeenCalled();
    // });

    test('should call Gemini provider for Gemini model', async () => {
      // Mock getModelsForIntent to return Gemini models first
      const getModelsSpy = vi.spyOn(intentsModule, 'getModelsForIntent').mockReturnValue(['gemini-2.5-flash'] as any);

      mockGeminiProviderInstance.call.mockResolvedValue({
        responseText: 'Gemini response',
        output: {},
        tokenData: {
          totalTokenCount: 100,
          promptTokenCount: 50,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 0,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: 0,
        },
        xRequestData: {
          requestStatus: 200,
          latency: 100,
          xRequestId: '',
          xRateLimitLimitRequests: 0,
          xRateLimitLimitTokens: 0,
          xRateLimitRemainingRequests: 0,
          xRateLimitRemainingTokens: 0,
          xRateLimitResetRequests: '',
          xRateLimitResetTokens: '',
        },
      });

      const result = await client.call({
        intent: 'chat',
        userTier: 'ultra',
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
        category: 'chat',
        feature: 'test-feature',
      });

      expect(result.responseText).toBe('Gemini response');
      expect(mockGeminiProviderInstance.call).toHaveBeenCalledWith(
        'gemini-2.5-flash',
        expect.objectContaining({
          prompt: 'Test prompt',
          userContent: [
            { mimeType: 'text/plain', content: 'Test input' }
          ],
        })
      );
      expect(mockSaveTokenData).toHaveBeenCalled();
      
      // Restore the spy so it doesn't affect other tests
      getModelsSpy.mockRestore();
    });

    test('should handle rate limit errors and try next model', async () => {
      // Ensure we're using GPT models for this test
      const getModelsSpy = vi.spyOn(intentsModule, 'getModelsForIntent').mockReturnValue(['gpt-5.1', 'gpt-5.2'] as any);
      
      mockGPTProviderInstance.call
        .mockRejectedValueOnce(new ProviderRateLimitError(429, 'gpt-5.1', new Headers()))
        .mockResolvedValueOnce({
          responseText: 'GPT response',
          output: [],
          tokenData: {
            totalTokenCount: 100,
            promptTokenCount: 50,
            candidatesTokenCount: 50,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            cachedContentTokenCount: 0,
          },
          xRequestData: {
            requestStatus: 200,
            latency: 100,
            xRequestId: 'test-id',
            xRateLimitLimitRequests: 100,
            xRateLimitLimitTokens: 1000,
            xRateLimitRemainingRequests: 99,
            xRateLimitRemainingTokens: 950,
            xRateLimitResetRequests: '1234567890',
            xRateLimitResetTokens: '1234567890',
          },
          webSearchCalled: false,
        });

      const result = await client.call({
        intent: 'chat',
        userTier: 'ultra',
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
        category: 'chat',
        feature: 'test-feature',
      });

      expect(result.responseText).toBe('GPT response');
      expect(mockGPTProviderInstance.call).toHaveBeenCalledTimes(2);
      
      getModelsSpy.mockRestore();
    });

    test('should return error if all models fail', async () => {
      // Ensure we're using GPT models and they all fail
      const getModelsSpy = vi.spyOn(intentsModule, 'getModelsForIntent').mockReturnValue(['gpt-5.1'] as any);
      
      mockGPTProviderInstance.call.mockRejectedValue(new Error('API error'));

      const result = await client.call({
        intent: 'chat',
        userTier: 'ultra',
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
        category: 'chat',
        feature: 'test-feature',
      });

      expect(result.error).toBeDefined();
      expect(result.error).toContain('API error');
      
      getModelsSpy.mockRestore();
    });
  });

  describe('streamChunks', () => {
    test('should stream GPT responses', async () => {
      // Ensure we're using GPT models
      const getModelsSpy = vi.spyOn(intentsModule, 'getModelsForIntent').mockReturnValue(['gpt-5.1'] as any);
      
      async function* mockStream() {
        yield { type: 'text_delta', delta: 'Hello' } as any;
        yield { type: 'text_delta', delta: ' World' } as any;
        return {
          responseText: 'Hello World',
          output: [],
          tokenData: {
            totalTokenCount: 100,
            promptTokenCount: 50,
            candidatesTokenCount: 50,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            cachedContentTokenCount: 0,
          },
          xRequestData: {
            requestStatus: 200,
            latency: 100,
            xRequestId: 'test-id',
            xRateLimitLimitRequests: 100,
            xRateLimitLimitTokens: 1000,
            xRateLimitRemainingRequests: 99,
            xRateLimitRemainingTokens: 950,
            xRateLimitResetRequests: '1234567890',
            xRateLimitResetTokens: '1234567890',
          },
          webSearchCalled: false,
        };
      }

      mockGPTProviderInstance.stream.mockReturnValue(mockStream());

      const chunks: string[] = [];
      let accumulatedText = '';
      const generator = client.streamChunks({
        intent: 'chat',
        userTier: 'ultra',
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
        category: 'chat',
        feature: 'test-feature',
      });

      for await (const event of generator) {
        if (event.type === 'text_delta') {
          accumulatedText += event.delta;
          chunks.push(accumulatedText);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1]).toBe('Hello World');
      expect(mockSaveTokenData).toHaveBeenCalled();
      
      getModelsSpy.mockRestore();
    });
  });
});

