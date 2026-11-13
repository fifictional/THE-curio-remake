/**
 * Unit tests for Gemini Provider
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { GeminiProvider } from "@ai-providers/gemini-provider";
import { getGeminiApiKey } from '@process-document/common/secrets/get-gemini-apikey';
import { GoogleGenAI } from '@google/genai';

// Mock dependencies
vi.mock('@process-document/common/secrets/get-gemini-apikey');
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn(),
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockAI: any;

  beforeEach(async () => {
    // Reset provider resolver before each test
    const { ProviderResolver } = await import('@ai-providers/provider-resolver');
    ProviderResolver.getInstance().clear();
    
    provider = new GeminiProvider();
    mockAI = {
      models: {
        generateContent: vi.fn(),
        generateContentStream: vi.fn(),
      },
      chats: {
        create: vi.fn(),
      },
    };
    vi.mocked(GoogleGenAI).mockImplementation(() => mockAI as any);
    vi.mocked(getGeminiApiKey).mockResolvedValue('test-api-key');
  });

  describe('call', () => {
    test('should successfully call Gemini API', async () => {
      const mockResponse = {
        text: 'Test response',
        candidates: [
          {
            content: {
              parts: [{ text: 'Test response' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          totalTokenCount: 100,
          promptTokenCount: 50,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 0,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: 0,
        },
      };

      mockAI.models.generateContent.mockResolvedValueOnce(mockResponse);

      const result = await provider.call('gemini-2.5-flash', {
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
      });

      expect(result.responseText).toBe('Test response');
      expect(result.tokenData.totalTokenCount).toBe(100);
      expect(result.xRequestData.requestStatus).toBe(200);
      expect(mockAI.models.generateContent).toHaveBeenCalledTimes(1);
    });

    test('should handle chat mode', async () => {
      const mockResponse = {
        text: 'Chat response',
        candidates: [
          {
            content: {
              parts: [{ text: 'Chat response' }],
            },
            finishReason: 'STOP',
          },
        ],
        usageMetadata: {
          totalTokenCount: 100,
          promptTokenCount: 50,
          candidatesTokenCount: 50,
          thoughtsTokenCount: 0,
          toolUsePromptTokenCount: 0,
          cachedContentTokenCount: 0,
        },
      };

      mockAI.models.generateContent.mockResolvedValueOnce(mockResponse);

      const result = await provider.call('gemini-2.5-flash', {
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
        messages: [
          {
            role: 'user',
            content: 'Hello',
          },
        ],
      });

      expect(result.responseText).toBe('Chat response');
      expect(mockAI.models.generateContent).toHaveBeenCalledTimes(1);
    });

    test('should throw error if API key is missing', async () => {
      vi.mocked(getGeminiApiKey).mockResolvedValue('');

      await expect(
        provider.call('gemini-2.5-flash', {
          prompt: 'Test prompt',
          userContent: [
            { mimeType: 'text/plain', content: 'Test input' }
          ],
        })
      ).rejects.toThrow('Gemini API key is required');
    });
  });

  describe('stream', () => {
    test('should stream Gemini responses (non-streaming fallback)', async () => {
      // Create an async generator that yields streaming chunks
      async function* mockStream() {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: 'Test' }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: ' response' }],
              },
            },
          ],
        };
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: '' }],
              },
              finishReason: 'STOP',
            },
          ],
          usageMetadata: {
            totalTokenCount: 100,
            promptTokenCount: 50,
            candidatesTokenCount: 50,
            thoughtsTokenCount: 0,
            toolUsePromptTokenCount: 0,
            cachedContentTokenCount: 0,
          },
        };
      }

      mockAI.models.generateContentStream.mockReturnValueOnce(mockStream());

      const generator = provider.stream('gemini-2.5-flash', {
        prompt: 'Test prompt',
        userContent: [
          { mimeType: 'text/plain', content: 'Test input' }
        ],
      });

      const chunks: string[] = [];
      let accumulatedText = '';
      for await (const event of generator) {
        if (event.type === 'text_delta') {
          accumulatedText += event.delta;
          chunks.push(accumulatedText);
        }
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[chunks.length - 1]).toBe('Test response');
    });
  });
});

