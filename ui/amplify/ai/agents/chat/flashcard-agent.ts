import { BaseAgent, AgentContext, AgentOutput } from "../index";
import { INTENT, TIER, UserTier } from "../../intents";
import { ChatAgentInput, UserInfo, GenerationLimits } from "./types";
import { handleStreamingResponse } from "./helpers";
import { createFlashcardTool } from "@ai-tools/create-flashcard-tool";
import { CreateFlashcardCommand, UpdateStatusCommand, CreateUserActionLogCommand, UpdateMessageCommand } from "../commands";
import { v4 as uuidv4 } from "uuid";
import { UnifiedResponseOutputItem, UnifiedFunctionCall } from "@ai-providers/unified-types";

const FLASHCARD_PROMPT = `You are a flashcard creation agent. Your job is to create flashcards based on the user's request.

The user wants to create flashcards. Analyze their message and conversation history to understand:
1. What topic/concept they want flashcards for
2. How many flashcards they want (if specified)
3. Any specific requirements (difficulty, format, etc.)

You MUST use the create_flashcard tool to generate the flashcards. Do not provide a chat response - only call the tool.

Rules:
- Generate 1-50 flashcards based on the user's request
- Each flashcard should have a clear title (question/concept) and content (answer/explanation)
- Make flashcards useful for spaced repetition learning
- If the user doesn't specify a topic clearly, infer it from the conversation context
- If the user asks for a specific number, create that many (up to 50 max)
- Format the flashcards to be clear and educational`;

/**
 * Agent that creates flashcards using the create_flashcard tool
 */
export class FlashcardAgent extends BaseAgent<ChatAgentInput> {
  name = 'flashcard-agent';
  description = 'Creates flashcards using the create_flashcard tool (no chat)';

  async execute(input: ChatAgentInput, context: AgentContext): Promise<AgentOutput> {
    const userInfo = input.userInfo as UserInfo | undefined;
    const generationLimits = input.generationLimits as GenerationLimits | undefined;
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    if (!userInfo || !generationLimits) {
      console.error('[FlashcardAgent] Missing userInfo or generationLimits');
      return this.createResponse('Error: User info or generation limits not provided');
    }

    // Check if user can create flashcards BEFORE calling GPT
    const MAX_FREE_FLASHCARD_GENERATIONS = Number(process.env.MAX_FREE_FLASHCARD_GENERATIONS || 5);
    const hasPremiumFeatures = userInfo.userTier === TIER.SUPER || userInfo.userTier === TIER.ULTRA || userInfo.userTier === TIER.TECHNICAL;
    const canGenerateFlashcards = generationLimits.flashcardGenerationRequests < MAX_FREE_FLASHCARD_GENERATIONS || hasPremiumFeatures;
    
    // Update status - initial check message
    if (input.messageUuid) {
      this.yieldCommand(context, {
        type: 'updateStatus',
        payload: {
          messageUuid: input.messageUuid,
          status: 'generating',
          message: 'Checking information...',
        },
      } as UpdateStatusCommand);
    }

    // If limit reached, return hardcoded message immediately
    if (!canGenerateFlashcards) {
      const source = input.chatType === 'document' ? 'document' :
                    input.chatType === 'question' ? 'question' :
                    input.chatType === 'mock_exam' ? 'mock_exam' : 'chat';
      const limitMessage = `🎓 You've reached your daily limit for creating flashcards.\n\nUpgrade to **Super Curio** for unlimited flashcards, quizzes, mock exams, and more!\n\n✨ [Upgrade now at app.curio.to/exam-bundles](https://app.curio.to/exam-bundles?utm_source=${source}&utm_medium=chat&utm_campaign=flashcard_limit_reached)`;
      return this.createResponse(limitMessage);
    }

    // Determine message tier - for flashcard generation, always use user's tier
    const messageTier: UserTier = userInfo.userTier;

    // Stream AI response for real-time updates
    const messageUuid = input.messageUuid;
    let finalText = '';
    let finalOutput: UnifiedResponseOutputItem[] = [];

    try {
      const stream = this.streamAI(
        {
          ...input,
          userTier: messageTier,
          text: input.message,
          image: input.image,
        },
        context,
        {
          intent: INTENT.GENERATE_FLASHCARDS,
          category: 'generation',
          feature: 'flashcard_generation',
          prompt: FLASHCARD_PROMPT,
          temperature: 0.7,
          tools: [createFlashcardTool],
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
                  message: 'Generating flashcards...',
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
      console.error('[FlashcardAgent] Error streaming AI response:', error);
      return this.createResponse(`Error: ${error.message || 'Failed to generate response'}`);
    }

    // Extract tool calls from final output
    const toolCalls: Array<{ name: string; arguments: string }> = [];

    if (finalOutput) {
      for (const item of finalOutput) {
        if (item.type === 'function_call') {
          const fnCall = item as UnifiedFunctionCall;
          if (fnCall.name === 'create_flashcard') {
            toolCalls.push({
              name: fnCall.name,
              arguments: fnCall.arguments,
            });
          }
        }
      }
    }

    if (toolCalls.length === 0) {
      console.warn('[FlashcardAgent] No flashcard tool call found in response');
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
      return this.createResponse(finalText || 'No flashcards were generated. Please try again.', {
        toolCalls: [],
        output: finalOutput,
        intent: 'create_flashcard',
      });
    }

    
    // Extract flashcard data and yield create command
    let flashcardCount = 0;
    let flashcardData: { flashcards: Array<{ title: string; content: string }> } | null = null;
    
    if (toolCalls.length > 0) {
      console.log('[FlashcardAgent] Processing tool call arguments for flashcard creation', toolCalls);
      try {
        flashcardData = toolCalls[0].arguments ? JSON.parse(toolCalls[0].arguments): null;
        flashcardCount = flashcardData?.flashcards?.length || 0;
        
        // Yield createFlashcard command instead of creating directly
        if (flashcardData && flashcardData.flashcards && flashcardData.flashcards.length > 0) {
          
          // spaceUuid should come from input (via accessor)
          const spaceUuid = (input.spaceUuid as string | null) || null;
          
          this.yieldCommand(context, {
            type: 'createFlashcard',
            payload: {
              userUuid: input.userUuid,
              chatUuid: input.chatUuid,
              spaceUuid: spaceUuid,
              documentUuid: input.chatArgs?.documentUuid || null,
              flashcards: flashcardData.flashcards,
            },
          } as CreateFlashcardCommand);
          
          // Yield user action log for flashcard generation
          const now = new Date().toISOString();
          this.yieldCommand(context, {
            type: 'createUserActionLog',
            payload: {
              userActionLogUuid: uuidv4(),
              userUuid: input.userUuid,
              actionType: 'generated_flashcards',
              sourceType: 'chat',
              sourceUuid: input.chatUuid,
              createdAt: now,
            },
          } as CreateUserActionLogCommand);
          
          // Yield message update with tool metadata
          if (input.messageUuid) {
            this.yieldCommand(context, {
              type: 'updateMessage',
              payload: {
                messageUuid: input.messageUuid,
                type: 'tool',
                isCompleted: true,
                toolName: 'create_flashcard',
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
      } catch (e) {
        console.error('[FlashcardAgent] Error parsing flashcard data:', e);
        // Continue anyway - handler will handle tool call processing
      }
    }
    
    // Build input with function call continuation pattern (OpenAI Responses API)
    const previousOutput = finalOutput || [];
    let functionCallOutput: any = null;
    
    if (toolCalls.length > 0 && finalOutput) {
      const functionCallItem = finalOutput.find((item) => item.type === 'function_call') as UnifiedFunctionCall | undefined;
      if (functionCallItem) {
        const fnCall = functionCallItem;
        
        // Create function_call_output item with completion status
        // This indicates the function has been executed and completed
        functionCallOutput = {
          type: 'function_call_output',
          call_id: fnCall.call_id || fnCall.id || '',
          output: JSON.stringify({
            success: true,
            completed: true, // Mark as completed since we've created the flashcards
            flashcards: flashcardData?.flashcards || [],
            count: flashcardCount,
          }),
        };
      }
    }
    
    // Prepare input for tool acknowledgment agent
    // The acknowledgment agent will generate a friendly message about the completed tool execution
    const acknowledgmentInput = {
      ...input,
      message: '', // Empty message - acknowledgment agent will generate message
      intent: 'create_flashcard',
      toolCalls,
      output: finalOutput,
      history: history, // Original conversation history
      previousOutput: previousOutput, // Previous response output (includes function_call)
      functionCallOutput: functionCallOutput, // Function call result (completed)
    };
    
    // Delegate to tool acknowledgment agent to send friendly acknowledgment message
    return this.delegateToAgent('tool-acknowledgment-agent', acknowledgmentInput);
  }
}

