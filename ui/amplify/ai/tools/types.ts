/**
 * Unified tool structure for AI providers.
 * Based on actual usage in the codebase - we only use function, code_interpreter, and web_search tools.
 */
export type UnifiedTool = FunctionTool | CodeInterpreterTool | WebSearchTool;

/**
 * JSON Schema property definition (recursive)
 */
export type JSONSchemaProperty =
  | JSONSchemaString
  | JSONSchemaArray
  | JSONSchemaObject
  | JSONSchemaBoolean
  | JSONSchemaInteger
  | JSONSchemaNumber;

export interface JSONSchemaString {
  type: 'string';
  description: string;
  enum?: string[];
}

export interface JSONSchemaArray {
  type: 'array';
  description: string;
  items: JSONSchemaProperty | { type: string };
  minItems?: number;
  maxItems?: number;
}

export interface JSONSchemaObject {
  type: 'object';
  description: string;
  properties: Record<string, JSONSchemaProperty>;
}

export interface JSONSchemaBoolean {
  type: 'boolean';
  description: string;
}

export interface JSONSchemaInteger {
  type: 'integer';
  description: string;
}

export interface JSONSchemaNumber {
  type: 'number';
  description: string;
}

/**
 * Function tool - the most common tool type
 */
export interface FunctionTool {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, JSONSchemaProperty>;
}

/**
 * Code interpreter tool for executing code
 */
export interface CodeInterpreterTool {
  type: 'code_interpreter';
  container?: string;
}

/**
 * Web search tool
 */
export interface WebSearchTool {
  type: 'web_search';
}


/*
 * Questions tool output
 */
export type QuestionsToolOutput = {
  questions: QuestionsToolQuestionOutput[];
}

export type QuestionsToolQuestionOutput = {
  index: number;
  questionContent: string;
  options: string[];
  answer: number;
  hint: string;
  answerExplanations: string[];
}

