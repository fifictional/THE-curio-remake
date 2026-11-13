import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from "../index";
import { INTENT } from "@ai-intents/types";
import { TIER, UserTier } from "@ai-intents/tier";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { handleStreamingResponse } from "./helpers";
import { UpdateStatusCommand, CreateUserActionLogCommand, UpdateMessageCommand } from "../commands";
import { v4 as uuidv4 } from "uuid";
import { UnifiedResponseOutputItem, UnifiedFunctionCall } from "@ai-providers/unified-types";
import { mockExamExamBundlesFlagChatPrompt } from "@functions/ai-chat/chat-prompts";
import { createMockExamTool } from "@ai-tools/create-mock-exam-tool";

/**
 * Mock exam chat agent for creating mock exams
 */
export class MockExamChatAgent extends BaseAgent {
  name = 'mock-exam-chat-agent';
  description = 'Handles mock exam creation flow';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    const chatInput = input as ChatAgentInput;
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | { practiceTestGenerationRequests: 0 } as GenerationLimits;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    if (!userInfo) {
      console.error('[MockExamChatAgent] User info not found');
      return this.createResponse('Error: User info not found');
    }

    // Check if user can create mock exams BEFORE calling GPT
    const MAX_FREE_PRACTICE_TEST_GENERATIONS = Number(process.env.MAX_FREE_PRACTICE_TEST_GENERATIONS || 5);
    const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
    const canGenerateMockExam = generationLimits.practiceTestGenerationRequests < MAX_FREE_PRACTICE_TEST_GENERATIONS || hasPremiumFeatures;
    
    // Update status - initial check message (sassy)
    if (chatInput.messageUuid) {
      this.yieldCommand(context, {
        type: 'updateStatus',
        payload: {
          messageUuid: chatInput.messageUuid,
          status: 'generating',
          message: 'Checking information...',
        },
      } as UpdateStatusCommand);
    }

    // If limit reached, return hardcoded message immediately
    if (!canGenerateMockExam) {
      const source = 'mock_exam';
      const limitMessage = `🎓 You've reached your daily limit for creating mock exams.\n\nUpgrade to **Super Curio** for unlimited mock exams, flashcards, quizzes, and more!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=mock_exam_limit_reached)`;
      return this.createResponse(limitMessage);
    }

    // Determine message tier - for mock exam generation, always use user's tier
    const messageTier: UserTier = userInfo.userTier;

    // Prepare prompt with placeholders
    let prompt = mockExamExamBundlesFlagChatPrompt;
    prompt = prompt.replace('{{userBasicInformation}}', `User current situation: ${userInfo.userDescription} User is using Curio for: ${userInfo.userHelp}`);

    // Stream AI response for real-time updates
    const messageUuid = chatInput.messageUuid;
    let finalText = '';
    let finalOutput: UnifiedResponseOutputItem[] = [];

    try {
      const stream = this.streamAI(
        {
          ...input,
          userTier: messageTier,
          text: chatInput.message,
          image: chatInput.image,
        },
        context,
        {
          intent: INTENT.CHAT,
          category: 'chat',
          feature: 'chat_mock_exam',
          prompt: prompt,
          temperature: undefined,
          tools: [createMockExamTool], // Only mock exam tool
          messages: history,
        }
      );

      // Handle streaming with custom function call handler
      const result = await handleStreamingResponse(
        stream,
        { yieldCommand: (cmd) => this.yieldCommand(context, cmd) },
        messageUuid,
        {
          onFunctionCall: (ctx, msgUuid) => {
            // Update status when tool call is detected
            if (msgUuid) {
              ctx.yieldCommand({
                type: 'updateStatus',
                payload: {
                  messageUuid: msgUuid,
                  status: 'generating',
                  message: 'Generating mock exam...',
                },
              } as UpdateStatusCommand);
            }
          },
        },
        {
          yieldFinalUpdate: false, // Don't yield final update here - tool acknowledgment agent will handle it
        }
      );
      
      finalText = result.finalText;
      finalOutput = result.finalOutput;
    } catch (error: any) {
      console.error('[MockExamChatAgent] Error streaming AI response:', error);
      return this.createResponse(`Error: ${error.message || 'Failed to generate response'}`);
    }

    // Extract tool calls from final output
    const toolCalls: Array<{ name: string; arguments: string }> = [];

    if (finalOutput) {
      for (const item of finalOutput) {
        if (item.type === 'function_call') {
          const fnCall = item as UnifiedFunctionCall;
          toolCalls.push({
            name: fnCall.name,
            arguments: fnCall.arguments,
          });
        }
      }
    }

    // Only yield user action log and message update commands if there's a tool call
    if (toolCalls.length > 0 && chatInput.userUuid && chatInput.chatUuid) {
      const now = new Date().toISOString();
      // Yield user action log for mock exam generation
      this.yieldCommand(context, {
        type: 'createUserActionLog',
        payload: {
          userActionLogUuid: uuidv4(),
          userUuid: chatInput.userUuid,
          actionType: 'generated_practice_test',
          sourceType: 'chat',
          sourceUuid: chatInput.chatUuid,
          createdAt: now,
        },
      } as CreateUserActionLogCommand);
      
      // Yield message update with tool metadata
      if (chatInput.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            type: 'tool',
            isCompleted: true,
            toolName: 'create_mock_exam',
            toolArguments: toolCalls[0].arguments,
            toolExtras: {
              isLoading: false,
              success: false,
              userAction: false,
            },
          },
        } as UpdateMessageCommand);
      }
    }
    
    // If there are tool calls, delegate to tool acknowledgment agent
    if (toolCalls.length > 0) {
      console.log('[MockExamChatAgent] Detected tool calls, delegating to acknowledgment agent:', toolCalls);
      // Build input with function call continuation pattern (OpenAI Responses API)
      const previousOutput = finalOutput || [];
      let functionCallOutput: any = null;
      
      if (toolCalls.length > 0 && finalOutput) {
        const functionCallItem = finalOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
        if (functionCallItem) {
          const fnCall = functionCallItem;
          
          // Extract mock exam details for confirmation message
          let examTitle = 'mock exam';
          try {
            const examData = toolCalls[0]?.arguments ? JSON.parse(toolCalls[0].arguments) : {};
            examTitle = examData.mockExam?.title || 'mock exam';
          } catch (e) {
            // Ignore parse errors
          }
          
          functionCallOutput = {
            type: 'function_call_output',
            call_id: fnCall.call_id || fnCall.id || '',
            output: JSON.stringify({
              success: true,
              mockExam: toolCalls[0].arguments ? JSON.parse(toolCalls[0].arguments).mockExam: {},
              title: examTitle,
            }),
          };
        }
      }

      // Prepare input for tool acknowledgment agent
      const acknowledgmentInput = {
        ...input,
        message: '', // Empty message - acknowledgment agent will generate message
        intent: 'create_mock_exam',
        toolCalls,
        output: finalOutput,
        history: history, // Original conversation history
        previousOutput: previousOutput, // Previous response output (includes function_call)
        functionCallOutput: functionCallOutput, // Function call result
      };
      
      // Delegate to tool acknowledgment agent to send friendly acknowledgment message
      return this.delegateToAgent('tool-acknowledgment-agent', acknowledgmentInput);
    }
    
    // If no tool calls, return the AI response directly (agent is asking questions)
    // Yield final message update with accumulated text
    if (messageUuid && finalText) {
      this.yieldCommand(context, {
        type: 'updateMessage',
        payload: {
          messageUuid,
          content: finalText,
          isCompleted: true,
          agentStatus: null,
          agentStatusMessage: null,
        },
      } as UpdateMessageCommand);
    }
    
    return this.createResponse(finalText || 'I need more information to create your mock exam. What subject or exam would you like to practice?');
  }
}

