/**
 * Example agent demonstrating the agent system usage
 * This file can be used as a template for creating new agents
 */

import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from "./index";
import { INTENT } from "../intents";

/**
 * Example agent that demonstrates basic usage
 */
export class ExampleAgent extends BaseAgent {
  name = 'example-agent';
  description = 'An example agent that demonstrates the agent system';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    // Example: Call AI with simple configuration
    // Note: userTier is automatically taken from input, analytics are handled internally
    const result = await this.callAI(input, context, {
      intent: INTENT.CHAT,
      category: 'chat',
      feature: 'example-agent',
      prompt: 'You are a helpful assistant. Respond to the user\'s query.',
      temperature: 0.7,
    });

    if (result.error) {
      return this.createResponse(`Error occurred: ${result.error}`);
    }

    return this.createResponse(result.responseText || 'No response generated');
  }
}

/**
 * Example agent that demonstrates delegation
 */
export class ExampleDelegatingAgent extends BaseAgent {
  name = 'example-delegating-agent';
  description = 'An example agent that delegates to another agent';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    // Example: Provide initial response and delegate to another agent
    return this.createCombinedResponse(
      'Initial processing complete. Delegating to specialized agent...',
      {
        agentName: 'example-agent',
        input: {
          ...input,
          additionalData: 'passed from delegating agent',
        },
        mergeResponse: true, // Merge responses from both agents
      },
      {
        originalAgent: this.name,
      }
    );
  }
}

/**
 * Example agent that demonstrates conditional delegation
 */
export class ExampleConditionalAgent extends BaseAgent {
  name = 'example-conditional-agent';
  description = 'An example agent that conditionally delegates based on input';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    // Example: Conditionally delegate based on input
    if (input.needsSpecialHandling) {
      // Delegate to specialized agent
      return this.delegateToAgent('example-agent', {
        ...input,
        context: 'special-handling',
      });
    }

    // Handle directly
    const result = await this.callAI(input, context, {
      intent: INTENT.CHAT,
      category: 'chat',
      feature: 'example-conditional-agent',
      prompt: 'Handle this request directly.',
    });

    return this.createResponse(result.responseText || 'Handled directly');
  }
}

