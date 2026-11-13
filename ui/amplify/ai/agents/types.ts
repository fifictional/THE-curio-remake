import { Schema } from "@database-schema";
import { CloudWatchClient } from "@aws-sdk/client-cloudwatch";
import { DBCommand } from "./commands";
import { UserTier } from "../intents";

/**
 * Base input that all agents receive
 */
export interface BaseAgentInput {
  userUuid: string;
  userTier: UserTier;
  [key: string]: any; // Allow agents to extend with specific inputs
}

/**
 * Agent output can include:
 * - A direct response to the user
 * - A request to delegate to another agent
 * - Both (response + delegation)
 * - Database commands to be executed by the handler
 */
export interface AgentOutput {
  /**
   * Direct response text to return to the user
   * This can be provided even when delegating to another agent
   */
  response?: string;

  /**
   * Request to delegate work to another agent
   * If provided, the orchestrator will call the specified agent
   */
  nextAgent?: {
    /**
     * Name of the agent to call next
     */
    agentName: string;
    /**
     * Input to pass to the next agent
     */
    input: BaseAgentInput;
    /**
     * Whether to merge the response from nextAgent with this response
     * If true, the final response will combine both outputs
     */
    mergeResponse?: boolean;
  };

  /**
   * Additional metadata that can be passed between agents
   */
  metadata?: Record<string, any>;

  /**
   * Database commands to be executed by the handler
   * Non-streaming agents return commands here
   */
  commands?: DBCommand[];

  /**
   * Indicates if this is the final output (no more agent calls needed)
   * If not set, defaults to true when nextAgent is not provided
   */
  isFinal?: boolean;
}

/**
 * Agent execution context passed to agents
 * Note: Database client and updateMessageStatus removed - agents yield commands instead
 */
export interface AgentContext {
  /**
   * Function to save token usage data
   */
  saveTokenData: (tokenData: Schema['UserRequest']['createType']) => Promise<void>;
  /**
   * CloudWatch client for metrics
   */
  cloudwatchClient: CloudWatchClient;
  /**
   * Current execution depth (to prevent infinite loops)
   */
  depth: number;
  /**
   * Maximum allowed depth
   */
  maxDepth: number;
  /**
   * Call another agent (for agent-to-agent communication)
   */
  callAgent: (agentName: string, input: BaseAgentInput) => Promise<AgentOutput>;
  /**
   * Yield a database command to the orchestrator stream
   * Streaming agents use this to yield commands as they process
   */
  yieldCommand: (command: DBCommand) => void;
}

/**
 * Agent interface that all agents must implement
 */
export interface Agent {
  /**
   * Unique name identifying this agent
   */
  name: string;

  /**
   * Description of what this agent does
   */
  description: string;

  /**
   * Execute the agent with given input and context
   */
  execute(input: BaseAgentInput, context: AgentContext): Promise<AgentOutput>;
}

/**
 * Configuration for agent execution
 */
export interface AgentExecutionConfig {
  /**
   * Maximum depth for agent delegation (prevents infinite loops)
   * Default: 10
   */
  maxDepth?: number;
  /**
   * Whether to throw errors or return them in output
   * Default: false (throw errors)
   */
  allowErrors?: boolean;
}

