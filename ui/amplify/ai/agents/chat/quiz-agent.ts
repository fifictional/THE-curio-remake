import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from "../index";
import { INTENT, TIER, UserTier } from "../../intents";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { handleStreamingResponse } from "./helpers";
import { createQuizTool } from "@ai-tools/create-quiz-tool";
import { CreateUserActionLogCommand, UpdateMessageCommand, UpdateStatusCommand } from "../commands";
import { v4 as uuidv4 } from "uuid";
import { UnifiedResponseOutputItem, UnifiedFunctionCall } from "@ai-providers/unified-types";

const QUIZ_PROMPT = `You are a quiz creation agent. Your job is to create quizzes based on the user's request.

The user wants to create a quiz. Analyze their message and conversation history to understand:
1. What topic/subject they want a quiz for
2. How many questions they want (if specified)
3. Difficulty level (if specified)
4. Any specific requirements

You MUST use the create_quiz tool to generate the quiz. Do not provide a chat response - only call the tool.

Rules:
- Create exactly 1 quiz (the tool accepts only 1 quiz at a time)
- The quiz should have a clear title, description, difficulty, and questionCount
- If the user doesn't specify details clearly, infer them from the conversation context
- Make the quiz educational and appropriate for the topic
- The description should be engaging and in Markdown format (2-3 lines)`;

/**
 * Agent that creates quizzes using the create_quiz tool
 */
export class QuizAgent extends BaseAgent {
  name = 'quiz-agent';
  description = 'Creates quizzes using the create_quiz tool (no chat)';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    const chatInput = input as ChatAgentInput;
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | undefined;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    if (!userInfo || !generationLimits) {
      console.error('[QuizAgent] Missing userInfo or generationLimits');
      return this.createResponse('Error: User info or generation limits not provided');
    }

    // Check if user can create quizzes BEFORE calling GPT
    const MAX_FREE_QUIZ_GENERATIONS = Number(process.env.MAX_FREE_QUIZ_GENERATIONS || 5);
    const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
    const canGenerateQuiz = generationLimits.quizGenerationRequests < MAX_FREE_QUIZ_GENERATIONS || hasPremiumFeatures;
    
    // Update status - initial check message
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
    if (!canGenerateQuiz) {
      const source = chatInput.chatType === 'document' ? 'document' :
                    chatInput.chatType === 'question' ? 'question' :
                    chatInput.chatType === 'mock_exam' ? 'mock_exam' : 'chat';
      const limitMessage = `🎓 You've reached your daily limit for creating quizzes.\n\nUpgrade to **Super Curio** for unlimited quizzes, flashcards, mock exams, and more!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=quiz_limit_reached)`;
      return this.createResponse(limitMessage);
    }

    // Determine message tier - for quiz generation, always use user's tier
    const messageTier: UserTier = userInfo.userTier;

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
          intent: INTENT.GENERATE_QUESTIONS,
          category: 'generation',
          feature: 'quiz_generation',
          prompt: QUIZ_PROMPT,
          temperature: 0.7,
          tools: [createQuizTool],
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
                  message: 'Generating quiz...',
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
      console.error('[QuizAgent] Error streaming AI response:', error);
      return this.createResponse(`Error: ${error.message || 'Failed to generate response'}`);
    }

    // Extract tool calls from final output
    const toolCalls: Array<{ name: string; arguments: string }> = [];

    if (finalOutput) {
      for (const item of finalOutput) {
        if (item.type === 'function_call') {
          const fnCall = item as UnifiedFunctionCall;
          if (fnCall.name === 'create_quiz') {
            toolCalls.push({
              name: fnCall.name,
              arguments: fnCall.arguments,
            });
          }
        }
      }
    }

    if (toolCalls.length === 0) {
      console.warn('[QuizAgent] No quiz tool call found in response');
      // If no tool call, return the text response and delegate to validation
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
      return this.createResponse(finalText || 'No quiz was generated. Please try again.', {
        toolCalls: [],
        output: finalOutput,
        intent: 'create_quiz',
      });
    }

    
    // Yield user action log and message update commands
    if (chatInput.userUuid && chatInput.chatUuid) {
      const now = new Date().toISOString();
      // Yield user action log for quiz generation
      this.yieldCommand(context, {
        type: 'createUserActionLog',
        payload: {
          userActionLogUuid: uuidv4(),
          userUuid: chatInput.userUuid,
          actionType: 'generated_quiz',
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
            toolName: 'create_quiz',
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
    
    // Extract quiz details for confirmation message
    let quizTitle = 'quiz';
    if (toolCalls.length > 0) {
      try {
        const quizData = JSON.parse(toolCalls[0].arguments);
        quizTitle = quizData.quiz?.title || 'quiz';
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Build input with function call continuation pattern (OpenAI Responses API)
    const previousOutput = finalOutput || [];
    let functionCallOutput: any = null;
    
    if (toolCalls.length > 0 && finalOutput) {
      const functionCallItem = finalOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
      if (functionCallItem) {
        const fnCall = functionCallItem;
        
        functionCallOutput = {
          type: 'function_call_output',
          call_id: fnCall.call_id || fnCall.id || '',
          output: JSON.stringify({
            success: true,
            quiz: JSON.parse(toolCalls[0].arguments).quiz,
            title: quizTitle,
          }),
        };
      }
    }
    
    // Prepare input for tool acknowledgment agent
    const acknowledgmentInput = {
      ...input,
      message: '', // Empty message - acknowledgment agent will generate message
      intent: 'create_quiz',
      toolCalls,
      output: finalOutput,
      history: history, // Original conversation history
      previousOutput: previousOutput, // Previous response output (includes function_call)
      functionCallOutput: functionCallOutput, // Function call result
    };
    
    // Delegate to tool acknowledgment agent to send friendly acknowledgment message
    return this.delegateToAgent('tool-acknowledgment-agent', acknowledgmentInput);
  }
}

