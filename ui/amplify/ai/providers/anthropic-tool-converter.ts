import { UnifiedTool, FunctionTool, JSONSchemaProperty } from "@ai-tools/types";

/**
 * Anthropic tool format for the Messages API
 */
interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
}

/**
 * Convert unified tool structure to Anthropic Messages API format
 */
export function convertToAnthropicTool(tool: UnifiedTool): AnthropicTool | null {
  if (tool.type === 'function') {
    return convertFunctionTool(tool);
  }
  // Anthropic doesn't support code_interpreter or web_search as built-in tools
  return null;
}

function convertFunctionTool(tool: FunctionTool): AnthropicTool {
  return {
    name: tool.name,
    description: tool.description,
    input_schema: {
      type: 'object',
      properties: convertProperties(tool.parameters),
      required: Object.keys(tool.parameters),
    },
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
    if (property.properties) {
      base.properties = convertProperties(property.properties);
      base.required = Object.keys(property.properties);
    }
  }

  return base;
}

export function convertToAnthropicTools(tools: UnifiedTool[] | undefined): AnthropicTool[] | undefined {
  if (!tools) {
    return undefined;
  }
  const converted = tools.map(convertToAnthropicTool).filter((t): t is AnthropicTool => t !== null);
  return converted.length > 0 ? converted : undefined;
}
