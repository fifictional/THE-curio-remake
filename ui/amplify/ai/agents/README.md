# Agent System

A clean, type-safe agentic workflow system for orchestrating AI model calls and agent-to-agent communication.

## Overview

The agent system provides:
- **Clear interfaces**: Each agent has well-defined inputs and outputs
- **Agent delegation**: Agents can request other agents to complete tasks
- **Automatic orchestration**: The orchestrator handles agent-to-agent communication and loops
- **Type safety**: Full TypeScript support with clear type definitions
- **AI abstraction**: Unified interface for calling OpenAI, Gemini, and future AI providers

## Core Concepts

### Agent
An agent is a self-contained unit that:
- Has a unique name and description
- Receives structured input (`BaseAgentInput`)
- Returns structured output (`AgentOutput`)
- Can call AI models via the `BaseAgent` helper methods
- Can delegate work to other agents

### Agent Output
An agent can return:
- **Direct response**: Text to return to the user
- **Delegation**: Request another agent to handle the task
- **Combined**: Both response and delegation (for progressive responses)

### Orchestrator
The orchestrator:
- Manages agent registration and lookup
- Executes agents and handles delegation
- Prevents infinite loops with depth limiting
- Merges responses when requested

## Usage

### 1. Create an Agent

Extend `BaseAgent` and implement the `execute` method:

```typescript
import { BaseAgent, BaseAgentInput, AgentContext, AgentOutput } from './agents';

class MyAgent extends BaseAgent {
  name = 'my-agent';
  description = 'Does something useful';

  async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
    // Call AI model
    // Note: userTier is automatically taken from input, analytics are handled internally
    const result = await this.callAI(input, context, {
      model: 'gpt',
      category: 'chat',
      feature: 'my-feature',
      prompt: 'You are a helpful assistant',
      temperature: 0.7,
    });

    if (result.error) {
      return this.createResponse(`Error: ${result.error}`);
    }

    return this.createResponse(result.responseText || 'No response');
  }
}
```

### 2. Register Agents

```typescript
import { orchestrator } from './agents';

orchestrator.register(new MyAgent());
// or register multiple at once
orchestrator.registerAll([new MyAgent(), new AnotherAgent()]);
```

### 3. Execute an Agent

```typescript
import { orchestrator } from './agents';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';

const output = await orchestrator.execute('my-agent', {
  userUuid: 'user-123',
  userTier: 'ultra',
  text: 'Hello!',
  // ... any additional input your agent needs
}, {
  saveTokenData: async (tokenData) => {
    // Save to database
    await client.models.UserRequest.create(tokenData);
  },
  cloudwatchClient: new CloudWatchClient({}),
});

console.log(output.response); // "Hello! How can I help you?"
```

## Agent Delegation

### Simple Delegation

```typescript
async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
  // Delegate entirely to another agent
  return this.delegateToAgent('specialized-agent', {
    ...input,
    additionalContext: 'some data',
  });
}
```

### Progressive Response with Delegation

```typescript
async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
  // Provide initial response, then delegate
  return this.createCombinedResponse(
    'Initial processing complete...',
    {
      agentName: 'next-agent',
      input: { ...input },
      mergeResponse: true, // Merge responses from both agents
    }
  );
}
```

### Conditional Delegation

```typescript
async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
  if (input.complexity === 'high') {
    return this.delegateToAgent('complex-handler', input);
  }
  
  // Handle simple cases directly
  const result = await this.callAI(input, context, { /* ... */ });
  return this.createResponse(result.responseText);
}
```

### Manual Agent Calls

You can also call agents manually from within an agent:

```typescript
async execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput> {
  // Call another agent directly
  const subResult = await context.callAgent('sub-agent', {
    userUuid: input.userUuid,
    userTier: input.userTier,
    task: 'specific-task',
  });

  // Process the result and return
  return this.createResponse(`Sub-agent said: ${subResult.response}`);
}
```

## Advanced Configuration

### Execution Configuration

```typescript
const output = await orchestrator.execute('my-agent', input, context, {
  maxDepth: 5,        // Maximum agent delegation depth (default: 10)
  allowErrors: false, // Throw errors vs return in output (default: false)
});
```

### AI Configuration

When calling AI models, you can configure:

```typescript
await this.callAI(input, context, {
  model: 'gpt',  // 'gpt' for now, can extend later
  category: 'chat' | 'document' | 'generation' | 'extraction',
  feature: 'your-feature-name',
  prompt: 'System instructions',
  // userTier is automatically taken from input.userTier
  temperature: 0.7,              // Optional
  tools: [/* OpenAI tools */],   // Optional
  messages: [/* chat messages */], // Optional, for chat mode
});
```

**Note**: Analytics (token usage, CloudWatch metrics) are automatically stored internally. You don't need to manage `saveTokenData` - it's handled by the `AIClient` behind the scenes.

## Examples

See `example-agent.ts` for complete examples of:
- Basic agent implementation
- Agent delegation
- Conditional delegation
- Response merging

## Migration from `request()`

The agent system wraps the existing `request()` function, so you can gradually migrate:

**Before:**
```typescript
const result = await request({
  saveTokenData,
  cloudwatchClient,
  model: 'gpt',
  userUuid,
  userTier: 'ultra',
  category: 'chat',
  feature: 'my-feature',
  prompt: '...',
  userContent: { text: '...' },
  messages: [],
});
```

**After:**
```typescript
class MyAgent extends BaseAgent {
  async execute(input, context) {
    const result = await this.callAI(input, context, {
  model: 'gpt',
  category: 'chat',
  feature: 'my-feature',
  prompt: '...',
  // userTier is automatically taken from input
  // analytics are handled internally - no need to manage saveTokenData
});
    // result contains responseText, output, or error
  }
}
```

## Best Practices

1. **Keep agents focused**: Each agent should have a single, clear responsibility
2. **Use clear names**: Agent names should be descriptive and unique
3. **Document inputs**: Use TypeScript interfaces to document expected inputs
4. **Handle errors**: Always check for errors and return appropriate responses
5. **Limit delegation depth**: Use reasonable `maxDepth` values to prevent infinite loops
6. **Provide context**: Pass relevant context when delegating to other agents

## Architecture

```
┌─────────────┐
│  User/Code  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Orchestrator│
└──────┬──────┘
       │
       ▼
┌─────────────┐      ┌─────────────┐
│   Agent 1   │─────▶│   Agent 2   │
└─────────────┘      └─────────────┘
       │                     │
       ▼                     ▼
┌─────────────┐      ┌─────────────┐
│   request() │      │   request() │
└──────┬──────┘      └──────┬──────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌─────────────┐
│   OpenAI    │      │   Gemini    │
└─────────────┘      └─────────────┘
```

