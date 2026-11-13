import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from "../index";
import { INTENT } from "../../intents";

const TOOL_ACKNOWLEDGMENT_PROMPT = `You are a helpful assistant that acknowledges when tools have been successfully used.

Your job is to provide a friendly, brief acknowledgment message when flashcards, quizzes, or mock exams have been created.

Guidelines:
- Be warm and friendly
- Keep it brief (1-2 sentences)
- Mention what was created (flashcards, quiz, or mock exam)
- Let the user know they can find it in their account
- Be conversational and natural

Examples:
- "I've created 5 flashcards for you! You can find them in your flashcard collection."
- "Your quiz has been created! Check it out in your quizzes section."
- "The mock exam is ready! You can start it from your practice tests page."`;

/**
 * Agent that acknowledges tool generation/usage
 * Called after tools like create_flashcard, create_quiz, create_mock_exam have been executed
 */
export class ToolAcknowledgmentAgent extends BaseAgent {
  name = 'tool-acknowledgment-agent';
  description = 'Acknowledges successful tool execution with a friendly message';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    // History should come from input accessor
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    // Don't set status for acknowledgment - no status needed
    

    const toolCalls = (input.toolCalls as Array<{ name: string; arguments: string }>) || [];
    const intent = (input.intent as string) || '';
    const functionCallOutput = (input as any).functionCallOutput;

    // Extract tool information from function call output
    let toolInfo = '';
    let itemCount = 0;
    
    if (functionCallOutput) {
      try {
        const outputData = JSON.parse(functionCallOutput.output);
        if (outputData.flashcards) {
          toolInfo = 'flashcards';
          itemCount = outputData.count || outputData.flashcards.length || 0;
        } else if (outputData.quiz) {
          toolInfo = 'quiz';
          itemCount = 1;
        } else if (outputData.mockExam) {
          toolInfo = 'mock exam';
          itemCount = 1;
        }
      } catch (e) {
        // Fallback to intent-based detection
        if (intent === 'create_flashcard') {
          toolInfo = 'flashcards';
          if (toolCalls.length > 0) {
            try {
              const args = JSON.parse(toolCalls[0].arguments);
              itemCount = args.flashcards?.length || 0;
            } catch (e) {
              // Ignore
            }
          }
        } else if (intent === 'create_quiz') {
          toolInfo = 'quiz';
          itemCount = 1;
        } else if (intent === 'create_mock_exam') {
          toolInfo = 'mock exam';
          itemCount = 1;
        }
      }
    }

    // Build context for acknowledgment
    const acknowledgmentContext = {
      toolType: toolInfo,
      itemCount,
      intent,
    };

    try {
      // Call AI to generate acknowledgment message
      const result = await this.callAI(
        {
          ...input,
          userTier: 'free',
          text: JSON.stringify(acknowledgmentContext),
        },
        context,
        {
          intent: INTENT.CHAT,
          category: 'chat',
          feature: 'tool_acknowledgment',
          prompt: TOOL_ACKNOWLEDGMENT_PROMPT,
          temperature: 0.7,
          messages: [
            ...history.slice(-5), // Last 5 messages for context
            { role: 'user', content: `A ${toolInfo}${itemCount > 1 ? ` (${itemCount} items)` : ''} was just created. Please provide a brief acknowledgment message.` },
          ],
        }
      );

      if (result.error) {
        console.error('[ToolAcknowledgmentAgent] AI call failed:', result.error);
        // Fallback to simple message
        const fallbackMessage = toolInfo 
          ? `I've created ${itemCount > 1 ? `${itemCount} ` : 'a '}${toolInfo} for you!`
          : 'Done!';
        // Return final response directly (validation agent removed from loop)
        return this.createResponse(fallbackMessage, {
          output: result.output,
          isFinal: true,
        });
      }

      const acknowledgmentText = result.responseText || (toolInfo 
        ? `I've created ${itemCount > 1 ? `${itemCount} ` : 'a '}${toolInfo} for you!`
        : 'Done!');

      // Return final response directly (validation agent removed from loop)
      return this.createResponse(acknowledgmentText, {
        output: result.output,
        isFinal: true,
      });
    } catch (error: any) {
      console.error('[ToolAcknowledgmentAgent] Error generating acknowledgment:', error);
      // Fallback to simple message
      const fallbackMessage = toolInfo 
        ? `I've created ${itemCount > 1 ? `${itemCount} ` : 'a '}${toolInfo} for you!`
        : 'Done!';
      // Return final response directly (validation agent removed from loop)
      return this.createResponse(fallbackMessage, {
        isFinal: true,
      });
    }
  }
}

