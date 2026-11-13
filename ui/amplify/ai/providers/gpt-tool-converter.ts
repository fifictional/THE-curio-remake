import OpenAI from "openai";
import { UnifiedTool, FunctionTool, CodeInterpreterTool, WebSearchTool, JSONSchemaProperty } from "@ai-tools/types";

/**
 * Convert unified tool structure to OpenAI.Responses.Tool format (internal to GPT providers)
 */
export function convertToOpenAITool(tool: UnifiedTool): OpenAI.Responses.Tool {
  if (tool.type === 'function') {
    return convertFunctionTool(tool);
  } else if (tool.type === 'code_interpreter') {
    return convertCodeInterpreterTool(tool);
  } else if (tool.type === 'web_search') {
    return convertWebSearchTool(tool);
  } else {
    throw new Error(`Unknown tool type: ${(tool as any).type}`);
  }
}

function convertFunctionTool(tool: FunctionTool): OpenAI.Responses.FunctionTool {
  return {
    type: 'function',
    name: tool.name,
    description: tool.description,
    strict: true,
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: convertProperties(tool.parameters),
      required: Object.keys(tool.parameters),
    },
  };
}

function convertCodeInterpreterTool(tool: CodeInterpreterTool): OpenAI.Responses.Tool.CodeInterpreter {
  return {
    type: 'code_interpreter',
    container: tool.container || { type: 'auto' },
  };
}

function convertWebSearchTool(tool: WebSearchTool): OpenAI.Responses.WebSearchTool {
  return {
    type: 'web_search',
  };
}

function convertProperties(properties: Record<string, JSONSchemaProperty>): Record<string, any> {
  const result: Record<string, any> = {};
  
  for (const [key, property] of Object.entries(properties)) {
    result[key] = convertProperty(property);
  }
  
  return result;
}

function convertProperty(property: JSONSchemaProperty): any {
  const base: any = {
    type: property.type,
    description: property.description,
  };

  if (property.type === 'string' && 'enum' in property && property.enum) {
    base.enum = property.enum;
  }

  if (property.type === 'array') {
    if (property.items) {
      if (typeof property.items === 'object' && 'type' in property.items) {
        base.items = convertProperty(property.items as JSONSchemaProperty);
      } else {
        base.items = property.items;
      }
    }
    if (property.minItems !== undefined) {
      base.minItems = property.minItems;
    }
    if (property.maxItems !== undefined) {
      base.maxItems = property.maxItems;
    }
  }

  if (property.type === 'object') {
    base.additionalProperties = false;
    if (property.properties) {
      base.properties = convertProperties(property.properties);
      base.required = Object.keys(property.properties);
    }
  }

  return base;
}

export function convertToOpenAITools(tools: UnifiedTool[] | undefined): OpenAI.Responses.Tool[] | undefined {
  if (!tools) {
    return undefined;
  }
  return tools.map(convertToOpenAITool);
}

/**
 * Convert unified tool structure to OpenAI Chat Completions format (internal to GPT providers)
 */
export function convertToOpenAIChatCompletionTool(tool: UnifiedTool): OpenAI.Chat.ChatCompletionTool {
  if (tool.type === 'function') {
    return {
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: convertProperties(tool.parameters),
      },
    };
  } else {
    throw new Error(`Unsupported tool type for Chat Completions: ${(tool as any).type}`);
  }
}

export function convertToOpenAIChatCompletionTools(tools: UnifiedTool[] | undefined): OpenAI.Chat.ChatCompletionTool[] | undefined {
  if (!tools) {
    return undefined;
  }
  return tools.map(convertToOpenAIChatCompletionTool);
}
