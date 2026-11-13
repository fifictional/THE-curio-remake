import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from "../index";
import { INTENT } from "../../intents";
import { ChatAgentInput, ValidationResult, QueryIntent } from "./types";
import { UpdateMessageCommand } from "../commands";

const VALIDATION_PROMPT = `You are a validation agent. Your job is to evaluate whether the user's request has been properly fulfilled.

Evaluate the response based on these criteria:

1. **Completeness** (0-1): Did the response fully answer the user's query? Was the request completed?
   - For "generic_chat" or "tutor_chat" intent: Did it answer the question or address the conversation?
   - For "create_flashcard": Were flashcards actually created (tool called)?
   - For "create_quiz": Was a quiz actually created (tool called)?
   - For "create_mock_exam": Was a mock exam actually created (tool called)?

2. **Quality** (0-1): Is the response high quality?
   - Is it accurate and informative?
   - Is it well-structured and clear?
   - Does it meet educational standards?

3. **Relevance** (0-1): Is the response relevant to the user's query?
   - Does it address what the user asked for?
   - Is it on-topic?

4. **Rule-following** (0-1): Did the response follow the user's instructions?
   - If user asked for "short answer", was it short?
   - If user asked for "explain in detail", was it detailed?
   - Did it follow any specific format requirements?
   - Did it respect user preferences mentioned in the conversation?

Respond with ONLY a JSON object in this exact format:
{
  "completeness": 0.0-1.0,
  "quality": 0.0-1.0,
  "relevance": 0.0-1.0,
  "ruleFollowing": 0.0-1.0,
  "isFulfilled": true/false,
  "feedback": "brief explanation if not fulfilled, empty string if fulfilled"
}

Consider the response fulfilled (isFulfilled: true) if:
- All scores are >= 0.7, AND
- The request was actually completed (for tool-based intents, tool must have been called)
- The response adequately addresses the user's query

If not fulfilled, provide brief feedback on what's missing or needs improvement.`;

/**
 * Agent that validates whether the user's request has been fulfilled
 */
export class ValidationAgent extends BaseAgent {
  name = 'validation-agent';
  description = 'Validates completeness, quality, relevance, and rule-following of responses';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    const chatInput = input as ChatAgentInput;
    const originalQuery = chatInput.message;
    const agentResponse = (input.agentResponse as string) || '';
    const intent = (input.intent as QueryIntent) || 'chat';
    const toolCalls = (input.toolCalls as Array<{ name: string; arguments: string }>) || [];
    const history = (input.history as Array<{ role: "user" | "assistant"; content: string }>) || [];
    
    // Don't set status for validation - no status needed

    // For tool-based intents, check if tool was called
    if (intent === 'create_flashcard' && toolCalls.length === 0) {
      // Yield error message update
      if (chatInput.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            content: 'Flashcards were not created. Please try again.',
            isCompleted: true,
          },
        } as UpdateMessageCommand);
      }
      return this.createResponse('', {
        validationResult: {
          completeness: 0,
          quality: 0,
          relevance: 0,
          ruleFollowing: 0,
          isFulfilled: false,
          feedback: 'Flashcards were not created. Please try again.',
        } as ValidationResult,
        isFinal: false,
      });
    }

    if (intent === 'create_quiz' && toolCalls.length === 0) {
      // Yield error message update
      if (chatInput.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            content: 'Quiz was not created. Please try again.',
            isCompleted: true,
          },
        } as UpdateMessageCommand);
      }
      return this.createResponse('', {
        validationResult: {
          completeness: 0,
          quality: 0,
          relevance: 0,
          ruleFollowing: 0,
          isFulfilled: false,
          feedback: 'Quiz was not created. Please try again.',
        } as ValidationResult,
        isFinal: false,
      });
    }

    if (intent === 'create_mock_exam' && toolCalls.length === 0) {
      // Yield error message update
      if (chatInput.messageUuid) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            content: 'Mock exam was not created. Please try again.',
            isCompleted: true,
          },
        } as UpdateMessageCommand);
      }
      return this.createResponse('', {
        validationResult: {
          completeness: 0,
          quality: 0,
          relevance: 0,
          ruleFollowing: 0,
          isFulfilled: false,
          feedback: 'Mock exam was not created. Please try again.',
        } as ValidationResult,
        isFinal: false,
      });
    }

    // Skip validation for tool acknowledgment - it's already final
    if (intent === 'create_flashcard' || intent === 'create_quiz' || intent === 'create_mock_exam') {
      // Yield updateMessage command with final response
      if (chatInput.messageUuid && agentResponse) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            content: agentResponse,
            isCompleted: true,
            agentStatus: null,
            agentStatusMessage: null,
          },
        } as UpdateMessageCommand);
      }
      return this.createResponse(agentResponse, {
        validationResult: {
          completeness: 1,
          quality: 1,
          relevance: 1,
          ruleFollowing: 1,
          isFulfilled: true,
          feedback: '',
        } as ValidationResult,
        toolCalls,
        isFinal: true,
      });
    }

    // Build context for validation
    const recentHistory = history.slice(-5); // Last 5 messages for context
    const validationContext = {
      originalQuery,
      agentResponse,
      intent,
      toolCalls: toolCalls.map(tc => ({ name: tc.name, hasArguments: !!tc.arguments })),
      recentHistory: recentHistory.map(m => ({ role: m.role, content: m.content.substring(0, 200) })), // Truncate for context
    };

    try {
      // Call AI to validate
      const result = await this.callAI(
        {
          ...input,
          userTier: 'free',
          text: JSON.stringify(validationContext),
        },
        context,
        {
          intent: INTENT.CHAT,
          category: 'chat',
          feature: 'response_validation',
          prompt: VALIDATION_PROMPT,
          temperature: 0.3, // Lower temperature for more consistent validation
          messages: [
            ...recentHistory,
            { role: 'user', content: `Original query: ${originalQuery}` },
            { role: 'assistant', content: agentResponse || (toolCalls.length > 0 ? `Tool called: ${toolCalls[0].name}` : 'No response') },
            { role: 'user', content: 'Please validate this response according to the criteria.' },
          ],
        }
      );

      if (result.error) {
        console.error('[ValidationAgent] AI call failed:', result.error);
        // Default to fulfilled on error to avoid infinite loops
        return this.createResponse('', {
          validationResult: {
            completeness: 1,
            quality: 1,
            relevance: 1,
            ruleFollowing: 1,
            isFulfilled: true,
            feedback: '',
          } as ValidationResult,
          isFinal: true,
        });
      }

      // Parse the JSON response
      let validationResult: ValidationResult = {
        completeness: 1,
        quality: 1,
        relevance: 1,
        ruleFollowing: 1,
        isFulfilled: true,
        feedback: '',
      };

      try {
        const responseText = result.responseText || '';
        
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          validationResult = {
            completeness: Number(parsed.completeness) || 0,
            quality: Number(parsed.quality) || 0,
            relevance: Number(parsed.relevance) || 0,
            ruleFollowing: Number(parsed.ruleFollowing) || 0,
            isFulfilled: Boolean(parsed.isFulfilled),
            feedback: parsed.feedback || '',
          };
        } else {
          console.warn('[ValidationAgent] No JSON found in response, defaulting to fulfilled');
        }
      } catch (parseError: any) {
        console.error('[ValidationAgent] Error parsing validation result:', parseError.message);
        // Default to fulfilled on parse error
        validationResult.isFulfilled = true;
      }

      // If not fulfilled, delegate back to query-understanding-agent with feedback
      // BUT: Check if we've already tried once to prevent infinite loops
      if (!validationResult.isFulfilled) {
        const previousAttempt = (input.previousAttempt as any);
        const retryCount = (input.retryCount as number) || 0;
        const MAX_RETRIES = 1; // Only allow one retry to prevent infinite loops
        
        // If we've already retried, mark as final to break the loop
        if (retryCount >= MAX_RETRIES || previousAttempt) {
          console.warn('[ValidationAgent] Maximum retries reached or previous attempt exists. Marking as final to prevent infinite loop.');
          
          // Yield updateMessage command with final response (even if not perfect)
          if (chatInput.messageUuid && agentResponse) {
            this.yieldCommand(context, {
              type: 'updateMessage',
              payload: {
                messageUuid: chatInput.messageUuid,
                content: agentResponse,
                isCompleted: true,
                agentStatus: null,
                agentStatusMessage: null,
              },
            } as UpdateMessageCommand);
          }
          
          // Mark as final to break the loop
          return this.createResponse(agentResponse, {
            validationResult: {
              ...validationResult,
              isFulfilled: true, // Force fulfilled to break loop
              feedback: validationResult.feedback || 'Response provided after retry limit reached.',
            } as ValidationResult,
            toolCalls,
            isFinal: true,
          });
        }
        
        // First retry - delegate back with retry count
        const enrichedInput = {
          ...input,
          validationFeedback: validationResult.feedback,
          previousAttempt: {
            intent,
            response: agentResponse,
            toolCalls,
          },
          retryCount: retryCount + 1,
        };
        
        return this.delegateToAgent('query-understanding-agent', enrichedInput);
      }

      // Request is fulfilled
      
      // Yield updateMessage command with final response
      if (chatInput.messageUuid && agentResponse) {
        this.yieldCommand(context, {
          type: 'updateMessage',
          payload: {
            messageUuid: chatInput.messageUuid,
            content: agentResponse,
            isCompleted: true,
            agentStatus: null,
            agentStatusMessage: null,
          },
        } as UpdateMessageCommand);
      }
      
      return this.createResponse(agentResponse, {
        validationResult,
        toolCalls,
        isFinal: true,
      });
    } catch (error: any) {
      console.error('[ValidationAgent] Error validating response:', error);
      // Default to fulfilled on error to avoid infinite loops
      return this.createResponse(agentResponse, {
        validationResult: {
          completeness: 1,
          quality: 1,
          relevance: 1,
          ruleFollowing: 1,
          isFulfilled: true,
          feedback: '',
        } as ValidationResult,
        toolCalls,
        isFinal: true,
      });
    }
  }
}

