import { Agent, BaseAgentInput, AgentOutput, AgentContext, AgentExecutionConfig } from "./types";
import { Schema } from "@database-schema";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { DBCommand } from "./commands";

/**
 * Input accessor function type
 * Fetches required data for an agent before execution
 */
export type InputAccessor = (baseInput: BaseAgentInput) => Promise<BaseAgentInput>;

/**
 * Agent registration with optional input accessor
 */
export interface AgentRegistration {
  agent: Agent;
  inputAccessor?: InputAccessor;
}

/**
 * Agent registry to store and retrieve agents with their input accessors
 */
class AgentRegistry {
  private agents: Map<string, Agent> = new Map();
  private accessors: Map<string, InputAccessor> = new Map();

  /**
   * Register an agent with optional input accessor
   */
  register(registration: AgentRegistration | Agent): void {
    const agent = 'agent' in registration ? registration.agent : registration;
    const inputAccessor = 'agent' in registration ? registration.inputAccessor : undefined;
    
    if (this.agents.has(agent.name)) {
      throw new Error(`Agent with name "${agent.name}" is already registered`);
    }
    this.agents.set(agent.name, agent);
    if (inputAccessor) {
      this.accessors.set(agent.name, inputAccessor);
    }
  }

  /**
   * Register multiple agents
   */
  registerAll(registrations: Array<AgentRegistration | Agent>): void {
    registrations.forEach(reg => this.register(reg));
  }

  /**
   * Get an agent by name
   */
  get(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Get input accessor for an agent
   */
  getAccessor(name: string): InputAccessor | undefined {
    return this.accessors.get(name);
  }

  /**
   * Check if an agent exists
   */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * Get all registered agent names
   */
  getAllNames(): string[] {
    return Array.from(this.agents.keys());
  }
}

/**
 * Agent orchestrator that manages agent execution and delegation
 */
export class AgentOrchestrator {
  private registry: AgentRegistry = new AgentRegistry();
  private defaultConfig: Required<AgentExecutionConfig> = {
    maxDepth: 10,
    allowErrors: false,
  };

  /**
   * Register an agent with optional input accessor
   */
  register(registration: AgentRegistration | Agent): void {
    this.registry.register(registration);
  }

  /**
   * Register multiple agents
   */
  registerAll(registrations: Array<AgentRegistration | Agent>): void {
    this.registry.registerAll(registrations);
  }

  /**
   * Execute an agent with given input (non-streaming, returns final output)
   * @deprecated Use executeWithStream for command stream support
   */
  async execute(
    agentName: string,
    input: BaseAgentInput,
    context: {
      saveTokenData: (tokenData: Schema['UserRequest']['createType']) => Promise<void>;
      cloudwatchClient: CloudWatchClient;
    },
    config?: AgentExecutionConfig
  ): Promise<AgentOutput> {
    const executionConfig = { ...this.defaultConfig, ...config };
    const executionDepth = 0;
    const commands: DBCommand[] = [];

    // Create the agent context with recursive call capability
    const agentContext: AgentContext = {
      saveTokenData: context.saveTokenData,
      cloudwatchClient: context.cloudwatchClient,
      depth: executionDepth,
      maxDepth: executionConfig.maxDepth,
      callAgent: async (name: string, agentInput: BaseAgentInput) => {
        return this.executeAgent(name, agentInput, agentContext, executionConfig, executionDepth + 1, commands);
      },
      yieldCommand: (command: DBCommand) => {
        commands.push(command);
      },
    };

    // Fetch input data via accessor if available
    const enrichedInput = await this.enrichInput(agentName, input);
    
    const output = await this.executeAgent(agentName, enrichedInput, agentContext, executionConfig, executionDepth, commands);
    
    // Include commands in output
    if (commands.length > 0) {
      output.commands = [...(output.commands || []), ...commands];
    }
    
    return output;
  }

  /**
   * Execute an agent with command stream support
   * Returns an async generator that yields DB commands as they are produced
   */
  async *executeWithStream(
    agentName: string,
    input: BaseAgentInput,
    context: {
      saveTokenData: (tokenData: Schema['UserRequest']['createType']) => Promise<void>;
      cloudwatchClient: CloudWatchClient;
    },
    config?: AgentExecutionConfig
  ): AsyncGenerator<DBCommand, AgentOutput> {
    const executionConfig = { ...this.defaultConfig, ...config };
    const executionDepth = 0;
    
    // Command queue for immediate yielding
    const commandQueue: DBCommand[] = [];
    let commandResolver: ((value: void) => void) | null = null;
    let agentExecutionDone = false;
    let agentOutput: AgentOutput | null = null;
    let agentError: Error | null = null;

    // Function to yield a command immediately
    const yieldCommandImmediate = (command: DBCommand) => {
      commandQueue.push(command);
      // Resolve waiting promise if there is one
      if (commandResolver) {
        const resolver = commandResolver;
        commandResolver = null;
        resolver();
      }
    };

    // Create the agent context with recursive call capability
    const agentContext: AgentContext = {
      saveTokenData: context.saveTokenData,
      cloudwatchClient: context.cloudwatchClient,
      depth: executionDepth,
      maxDepth: executionConfig.maxDepth,
      callAgent: async (name: string, agentInput: BaseAgentInput) => {
        return this.executeAgent(name, agentInput, agentContext, executionConfig, executionDepth + 1, []);
      },
      yieldCommand: (command: DBCommand) => {
        yieldCommandImmediate(command);
      },
    };

    // Fetch input data via accessor if available
    const enrichedInput = await this.enrichInput(agentName, input);
    
    console.info('[Orchestrator] executeWithStream start', { agentName });
    const streamStartedAt = Date.now();

    // Start agent execution in parallel
    const agentPromise = this.executeAgent(agentName, enrichedInput, agentContext, executionConfig, executionDepth, [])
      .then(output => {
        agentOutput = output;
        agentExecutionDone = true;
        // Yield any commands from output.metadata.commands (for non-streaming agents)
        if (output.commands && output.commands.length > 0) {
          for (const command of output.commands) {
            yieldCommandImmediate(command);
          }
        }
        // Signal that execution is done
        if (commandResolver) {
          const resolver = commandResolver;
          commandResolver = null;
          resolver();
        }
      })
      .catch(error => {
        console.error(`[Orchestrator] Agent execution failed:`, error);
        agentError = error;
        agentExecutionDone = true;
        if (commandResolver) {
          const resolver = commandResolver;
          commandResolver = null;
          resolver();
        }
      });

    // Yield commands as they come in
    let yieldedCommandCount = 0;
    while (!agentExecutionDone || commandQueue.length > 0) {
      // Yield any commands in the queue
      while (commandQueue.length > 0) {
        const command = commandQueue.shift();
        if (command) {
          yieldedCommandCount++;
          yield command;
        }
      }

      // If execution is done, break
      if (agentExecutionDone) {
        break;
      }

      // Wait for next command or completion
      await new Promise<void>((resolve) => {
        commandResolver = resolve;
        // Also check again immediately in case a command was added between check and promise creation
        if (commandQueue.length > 0 || agentExecutionDone) {
          commandResolver = null;
          resolve();
        }
      });
    }

    // Wait for agent execution to complete
    await agentPromise;

    // Throw error if agent execution failed
    if (agentError) {
      console.error(`[Orchestrator] Throwing error from agent execution: ${agentName}`, {
        agentName,
        durationMs: Date.now() - streamStartedAt,
        error: JSON.stringify(agentError),
      });
      throw agentError;
    }

    const finalOutput = agentOutput as AgentOutput | null;
    console.info('[Orchestrator] executeWithStream done', {
      agentName,
      durationMs: Date.now() - streamStartedAt,
      yieldedCommandCount,
      responseLength: finalOutput?.response?.length ?? 0,
    });

    // Return the final output
    return agentOutput!;
  }

  /**
   * Enrich input with data from accessor if available
   */
  private async enrichInput(agentName: string, input: BaseAgentInput): Promise<BaseAgentInput> {
    const accessor = this.registry.getAccessor(agentName);
    if (accessor) {
      const startedAt = Date.now();
      try {
        const enriched = await accessor(input);
        console.info('[Orchestrator] enrichInput done', {
          agentName,
          durationMs: Date.now() - startedAt,
        });
        return enriched;
      } catch (err) {
        console.error('[Orchestrator] enrichInput failed', {
          agentName,
          durationMs: Date.now() - startedAt,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
    }
    return input;
  }

  /**
   * Internal method to execute an agent (recursive)
   */
  private async executeAgent(
    agentName: string,
    input: BaseAgentInput,
    parentContext: AgentContext,
    config: Required<AgentExecutionConfig>,
    depth: number,
    commandCollector: DBCommand[]
  ): Promise<AgentOutput> {
    // Check depth limit
    if (depth >= config.maxDepth) {
      console.error(`[Orchestrator] Maximum depth exceeded for agent: ${agentName}`);
      throw new Error(`Maximum agent execution depth (${config.maxDepth}) exceeded. Possible infinite loop detected.`);
    }

    // Get the agent
    const agent = this.registry.get(agentName);
    if (!agent) {
      const availableAgents = this.registry.getAllNames().join(', ');
      console.error(`[Orchestrator] Agent not found: ${agentName}. Available: ${availableAgents}`);
      throw new Error(`Agent "${agentName}" not found. Available agents: ${availableAgents}`);
    }

    // Enrich input with accessor if available
    const enrichedInput = await this.enrichInput(agentName, input);

    // Create context for this execution with command collector
    const context: AgentContext = {
      ...parentContext,
      depth,
      callAgent: async (name: string, agentInput: BaseAgentInput) => {
        return this.executeAgent(name, agentInput, context, config, depth + 1, commandCollector);
      },
      yieldCommand: (command: DBCommand) => {
        commandCollector.push(command);
        parentContext.yieldCommand(command);
      },
    };

    try {
      const agentStartedAt = Date.now();
      console.info('[Orchestrator] agent.execute start', {
        agentName,
        depth,
      });
      // Execute the agent
      const output = await agent.execute(enrichedInput, context);
      console.info('[Orchestrator] agent.execute done', {
        agentName,
        depth,
        durationMs: Date.now() - agentStartedAt,
        responseLength: output.response?.length ?? 0,
        hasNextAgent: !!output.nextAgent,
        nextAgentName: output.nextAgent?.agentName,
        isFinal: output.isFinal,
        commandCount: output.commands?.length ?? 0,
      });

      // If agent wants to delegate, execute the next agent
      if (output.nextAgent) {
        const availableAgents = this.registry.getAllNames();
        const agentExists = this.registry.has(output.nextAgent.agentName);
        
        if (!agentExists) {
          console.error(`[Orchestrator] Delegated agent "${output.nextAgent.agentName}" not found. Available: ${availableAgents.join(', ')}`);
          throw new Error(`Delegated agent "${output.nextAgent.agentName}" not found. Available agents: ${availableAgents.join(', ')}`);
        }
        
        // Enrich input for next agent
        const nextAgentEnrichedInput = await this.enrichInput(output.nextAgent.agentName, output.nextAgent.input);
        
        const nextOutput = await this.executeAgent(
          output.nextAgent.agentName,
          nextAgentEnrichedInput,
          context,
          config,
          depth + 1,
          commandCollector
        );

        // Merge responses if requested
        if (output.nextAgent.mergeResponse) {
          const merged = {
            response: output.response
              ? `${output.response}\n\n${nextOutput.response || ''}`
              : nextOutput.response,
            metadata: {
              ...output.metadata,
              ...nextOutput.metadata,
            },
            commands: [
              ...(output.commands || []),
              ...(nextOutput.commands || []),
            ],
            isFinal: nextOutput.isFinal ?? true,
          };
          return merged;
        }

        // Otherwise, return the next agent's output
        return nextOutput;
      }

      // Return the agent's output
      return {
        ...output,
        isFinal: output.isFinal ?? true,
      };
    } catch (error: any) {
      console.error(`[Orchestrator] Error executing agent ${agentName}:`, error);
      if (config.allowErrors) {
        return {
          response: `Error: ${error.message}`,
          isFinal: true,
          metadata: { error: error.message },
        };
      }
      throw error;
    }
  }

  /**
   * Get all registered agents
   */
  getRegisteredAgents(): string[] {
    return this.registry.getAllNames();
  }
}

/**
 * Singleton instance of the orchestrator
 * Agents should be registered during initialization
 */
export const orchestrator = new AgentOrchestrator();

