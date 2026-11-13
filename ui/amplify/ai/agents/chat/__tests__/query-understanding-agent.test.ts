/**
 * Unit tests for Query Understanding Agent
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { QueryUnderstandingAgent } from "@ai-agents/chat/query-understanding-agent";
import { ChatAgentInput } from "@ai-agents/chat/types";
import { AgentContext } from "@ai-agents/types";
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import OpenAI from 'openai';

// Mock the AIClient used by BaseAgent
const mockAIClientInstance = {
  call: vi.fn(),
  streamChunks: vi.fn(),
};

// Mock both the alias path and the relative path used by BaseAgent
vi.mock('@ai-client', () => ({
  AIClient: vi.fn().mockImplementation(() => mockAIClientInstance),
  createAIClient: vi.fn().mockImplementation(() => mockAIClientInstance),
}));

vi.mock('../../ai-client', () => ({
  AIClient: vi.fn().mockImplementation(() => mockAIClientInstance),
  createAIClient: vi.fn().mockImplementation(() => mockAIClientInstance),
}));

describe('QueryUnderstandingAgent', () => {
  let agent: QueryUnderstandingAgent;
  let mockContext: AgentContext;
  let mockYieldCommand: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    agent = new QueryUnderstandingAgent();
    mockYieldCommand = vi.fn();
    
    mockContext = {
      saveTokenData: vi.fn().mockResolvedValue(undefined),
      cloudwatchClient: {
        send: vi.fn().mockResolvedValue({}),
      } as any as CloudWatchClient,
      depth: 0,
      maxDepth: 10,
      callAgent: vi.fn(),
      yieldCommand: mockYieldCommand,
    };

    // Reset mocks
    vi.clearAllMocks();
  });

  const createMockInput = (overrides?: Partial<ChatAgentInput>): ChatAgentInput => ({
    userUuid: 'test-user-uuid',
    userTier: 'ultra',
    message: 'Test message',
    messageUuid: 'test-message-uuid',
    chatUuid: 'test-chat-uuid',
    taskUuid: 'test-task-uuid',
    chatType: 'main',
    chatArgs: {},
    history: [],
      userInfo: {
        userDescription: '',
        userHelp: '',
        userTier: 'ultra',
        isAdmin: false,
      },
    featureFlags: [],
    ...overrides,
  });

  const createFunctionCallOutput = (
    intent: string,
    preliminaryMessage: string = '',
    suggestedTitle: string = 'Test Chat'
  ) => {
    return {
      responseText: undefined,
      output: [
        {
          type: 'function_call',
          name: 'determine_intent',
          arguments: JSON.stringify({
            intent,
            preliminaryMessage,
            suggestedTitle,
          }),
        } as OpenAI.Responses.ResponseFunctionToolCall,
      ],
    };
  };

  describe('routing to specific agents', () => {
    test('should route to flashcard-agent when intent is create_flashcard', async () => {
      const input = createMockInput({ message: 'Create flashcards about biology' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('create_flashcard', 'Creating flashcards...', 'Biology Flashcards')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('flashcard-agent');
      expect(output.response).toBe('Creating flashcards...');
      expect(output.metadata?.intent).toBe('create_flashcard');
      expect(output.isFinal).toBe(false);
    });

    test('should route to quiz-agent when intent is create_quiz', async () => {
      const input = createMockInput({ message: 'Make a quiz about history' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('create_quiz', 'Creating quiz...', 'History Quiz')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('quiz-agent');
      expect(output.response).toBe('Creating quiz...');
      expect(output.metadata?.intent).toBe('create_quiz');
    });

    test('should route to mock-exam-chat-agent when intent is create_mock_exam', async () => {
      const input = createMockInput({ message: 'Create a practice test' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('create_mock_exam', 'Creating practice test...', 'Practice Test')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('mock-exam-chat-agent');
      expect(output.response).toBe('Creating practice test...');
      expect(output.metadata?.intent).toBe('create_mock_exam');
    });

    test('should route to generic-chat-agent when intent is generic_chat', async () => {
      const input = createMockInput({ message: 'What is the weather today?' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('generic_chat', '', 'Weather Chat')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('generic-chat-agent');
      expect(output.metadata?.intent).toBe('generic_chat');
    });

    describe('image generation routing with feature flags', () => {
      test('should route to tutor-chat-agent when feature flag is off', async () => {
        const input = createMockInput({
          message: 'Generate an image of a cat',
      userInfo: {
        userDescription: '',
        userHelp: '',
        userTier: 'ultra',
        isAdmin: false,
      },
          featureFlags: [], // No img_gen flag
        });
        
        // Even if AI returns generate_image intent, it should be filtered out
        // But since the tool won't include generate_image, AI shouldn't return it
        // So we'll mock it returning tutor_chat instead
        mockAIClientInstance.call.mockResolvedValue(
          createFunctionCallOutput('tutor_chat', '', 'Image Request')
        );

        const output = await agent.execute(input, mockContext);

        expect(output.nextAgent).toBeDefined();
        expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      });

      test('should route to tutor-chat-agent when feature flag is admin_only and user is not admin', async () => {
        const input = createMockInput({
          message: 'Generate an image of a cat',
      userInfo: {
        userDescription: '',
        userHelp: '',
        userTier: 'ultra',
        isAdmin: false,
      },
          featureFlags: [
            { flagName: 'img_gen', flagValue: 'admin_only' },
          ],
        });
        
        // AI should not return generate_image since tool doesn't include it for non-admin
        mockAIClientInstance.call.mockResolvedValue(
          createFunctionCallOutput('tutor_chat', '', 'Image Request')
        );

        const output = await agent.execute(input, mockContext);

        expect(output.nextAgent).toBeDefined();
        expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      });

      test('should route to image-generation-agent when feature flag is admin_only and user is admin', async () => {
        const input = createMockInput({
          message: 'Generate an image of a cat',
          userInfo: {
            userDescription: '',
            userHelp: '',
            userTier: 'ultra',
            isAdmin: true,
          },
          featureFlags: [
            { flagName: 'img_gen', flagValue: 'admin_only' },
          ],
        });
        
        mockAIClientInstance.call.mockResolvedValue(
          createFunctionCallOutput('generate_image', 'Generating image...', 'Image Generation')
        );

        const output = await agent.execute(input, mockContext);

        expect(output.nextAgent).toBeDefined();
        expect(output.nextAgent?.agentName).toBe('image-generation-agent');
        expect(output.response).toBe('Generating image...');
        expect(output.metadata?.intent).toBe('generate_image');
      });

      test('should route to image-generation-agent when feature flag is active and user is not admin', async () => {
        const input = createMockInput({
          message: 'Generate an image of a cat',
      userInfo: {
        userDescription: '',
        userHelp: '',
        userTier: 'ultra',
        isAdmin: false,
      },
          featureFlags: [
            { flagName: 'img_gen', flagValue: 'active' },
          ],
        });
        
        mockAIClientInstance.call.mockResolvedValue(
          createFunctionCallOutput('generate_image', 'Generating image...', 'Image Generation')
        );

        const output = await agent.execute(input, mockContext);

        expect(output.nextAgent).toBeDefined();
        expect(output.nextAgent?.agentName).toBe('image-generation-agent');
        expect(output.response).toBe('Generating image...');
        expect(output.metadata?.intent).toBe('generate_image');
      });
    });

    test('should route to tutor-chat-agent when intent is tutor_chat', async () => {
      const input = createMockInput({ message: 'How do I solve this math problem?' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('tutor_chat', '', 'Math Help')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });
  });

  describe('default routing', () => {
    test('should route to tutor-chat-agent (default) when no function call is returned', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning no function call
      mockAIClientInstance.call.mockResolvedValue({
        responseText: undefined,
        output: [
          {
            type: 'message',
            status: 'completed',
            content: [{ type: 'output_text', text: 'Hello there!' }],
          },
        ],
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });

    test('should route to tutor-chat-agent (default) when output is empty', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning empty output
      mockAIClientInstance.call.mockResolvedValue({
        responseText: undefined,
        output: [],
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });

    test('should route to tutor-chat-agent (default) when no output is returned', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning no output property
      mockAIClientInstance.call.mockResolvedValue({
        responseText: 'Some response',
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });

    test('should route to tutor-chat-agent (default) when function call has invalid intent', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning invalid intent
      mockAIClientInstance.call.mockResolvedValue({
        responseText: undefined,
        output: [
          {
            type: 'function_call',
            name: 'determine_intent',
            arguments: JSON.stringify({
              intent: 'invalid_intent',
              preliminaryMessage: '',
              suggestedTitle: 'Test',
            }),
          } as OpenAI.Responses.ResponseFunctionToolCall,
        ],
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });

    test('should route to tutor-chat-agent (default) when function call parsing fails', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning invalid JSON in function call arguments
      mockAIClientInstance.call.mockResolvedValue({
        responseText: undefined,
        output: [
          {
            type: 'function_call',
            name: 'determine_intent',
            arguments: 'invalid json',
          } as OpenAI.Responses.ResponseFunctionToolCall,
        ],
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
      expect(output.metadata?.intent).toBe('tutor_chat');
    });

    test('should route to tutor-chat-agent (default) when AI call fails', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call returning an error
      mockAIClientInstance.call.mockResolvedValue({
        error: 'AI call failed',
      });

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
    });

    test('should route to tutor-chat-agent (default) when AI call throws', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      // Mock AI call throwing an error
      mockAIClientInstance.call.mockRejectedValue(new Error('Network error'));

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.agentName).toBe('tutor-chat-agent');
    });
  });

  describe('input enrichment', () => {
    test('should pass enriched input with intent and history to next agent', async () => {
      const input = createMockInput({
        message: 'Create flashcards',
        history: [
          { role: 'user', content: 'Previous message' },
          { role: 'assistant', content: 'Previous response' },
        ],
      });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('create_flashcard', 'Creating...', 'Flashcards')
      );

      const output = await agent.execute(input, mockContext);

      expect(output.nextAgent).toBeDefined();
      expect(output.nextAgent?.input.intent).toBe('create_flashcard');
      expect(output.nextAgent?.input.history).toEqual(input.history);
      expect(output.nextAgent?.input.message).toBe('Create flashcards');
      expect(output.nextAgent?.input.userUuid).toBe('test-user-uuid');
    });
  });

  describe('status updates', () => {
    test('should yield status update command', async () => {
      const input = createMockInput({ message: 'Hello' });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('tutor_chat', '', 'Test')
      );

      await agent.execute(input, mockContext);

      expect(mockYieldCommand).toHaveBeenCalled();
      const statusCommand = mockYieldCommand.mock.calls.find(
        (call) => call[0].type === 'updateStatus'
      );
      expect(statusCommand).toBeDefined();
      expect(statusCommand).not.toBeUndefined();
      expect(statusCommand![0].payload.status).toBe('understanding');
      expect(statusCommand![0].payload.messageUuid).toBe('test-message-uuid');
    });
  });

  describe('chat title updates', () => {
    test('should yield update chat command when title is provided and not changed by user', async () => {
      const input = createMockInput({
        message: 'Hello',
        chatUuid: 'test-chat-uuid',
        titleChangedByTheUser: false,
      });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('tutor_chat', '', 'New Chat Title')
      );

      await agent.execute(input, mockContext);

      const updateChatCommand = mockYieldCommand.mock.calls.find(
        (call) => call[0].type === 'updateChat'
      );
      expect(updateChatCommand).toBeDefined();
      expect(updateChatCommand).not.toBeUndefined();
      expect(updateChatCommand![0].payload.chatUuid).toBe('test-chat-uuid');
      expect(updateChatCommand![0].payload.name).toBe('New Chat Title');
    });

    test('should not yield update chat command when title changed by user', async () => {
      const input = createMockInput({
        message: 'Hello',
        chatUuid: 'test-chat-uuid',
        titleChangedByTheUser: true,
      });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('tutor_chat', '', 'New Chat Title')
      );

      await agent.execute(input, mockContext);

      const updateChatCommand = mockYieldCommand.mock.calls.find(
        (call) => call[0].type === 'updateChat'
      );
      expect(updateChatCommand).toBeUndefined();
    });

    test('should not yield update chat command when title is empty', async () => {
      const input = createMockInput({
        message: 'Hello',
        chatUuid: 'test-chat-uuid',
        titleChangedByTheUser: false,
      });
      
      mockAIClientInstance.call.mockResolvedValue(
        createFunctionCallOutput('tutor_chat', '', '')
      );

      await agent.execute(input, mockContext);

      const updateChatCommand = mockYieldCommand.mock.calls.find(
        (call) => call[0].type === 'updateChat'
      );
      expect(updateChatCommand).toBeUndefined();
    });
  });
});

