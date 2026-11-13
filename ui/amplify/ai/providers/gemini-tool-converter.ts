import { ToolListUnion } from "@google/genai";
import { UnifiedTool, FunctionTool, JSONSchemaProperty } from "@ai-tools/types";

/**
 * Convert unified tool structure to Gemini ToolListUnion format
 */
export function convertToGeminiTools(tools: UnifiedTool[] | undefined): ToolListUnion | undefined {
  if (!tools) {
    return undefined;
  }
  
  const geminiTools: any[] = [];

  // Group function tools together (Gemini uses a single Tool object with functionDeclarations array)
  const functionTools: FunctionTool[] = [];
  let hasCodeExecution = false;
  let hasWebSearch = false;

  for (const tool of tools) {
    if (tool.type === 'function') {
      functionTools.push(tool);
    } else if (tool.type === 'code_interpreter') {
      hasCodeExecution = true;
    } else if (tool.type === 'web_search') {
      hasWebSearch = true;
    }
  }

  // Create a single Tool object with all function declarations
  if (functionTools.length > 0 || hasCodeExecution || hasWebSearch) {
    const geminiTool: any = {};

    if (functionTools.length > 0) {
      geminiTool.functionDeclarations = functionTools.map(convertFunctionTool);
    }

    if (hasCodeExecution) {
      geminiTool.codeExecution = {};
    }

    if (hasWebSearch) {
      geminiTool.googleSearch = {};
    }

    geminiTools.push(geminiTool);
  }

  return geminiTools as ToolListUnion;
}

/**
 * Convert function tool to Gemini FunctionDeclaration format
 */
function convertFunctionTool(tool: FunctionTool): any {
  return {
    name: tool.name,
    description: tool.description,
    parameters: convertParametersToGeminiSchema(tool.parameters),
  };
}

/**
 * Convert parameters record to Gemini Schema format
 */
function convertParametersToGeminiSchema(parameters: Record<string, JSONSchemaProperty>): any {
  const schema: any = {
    type: 'OBJECT',
    properties: {},
    required: [],
  };

  for (const [key, property] of Object.entries(parameters)) {
    schema.properties[key] = convertPropertyToGeminiSchema(property);
    // In Gemini, we don't infer required from properties - it's optional
    // If needed, we could add logic here to determine required fields
  }

  return schema;
}

/**
 * Convert a single JSON Schema property to Gemini Schema format
 */
function convertPropertyToGeminiSchema(property: JSONSchemaProperty): any {
  const geminiType = convertTypeToGemini(property.type);

  const result: any = {
    type: geminiType,
  };

  if (property.type === 'string' && 'enum' in property && property.enum) {
    result.enum = property.enum;
  }

  if (property.type === 'array') {
    if (property.items) {
      if (typeof property.items === 'object' && 'type' in property.items) {
        result.items = convertPropertyToGeminiSchema(property.items as JSONSchemaProperty);
      } else {
        result.items = { type: convertTypeToGemini((property.items as any).type) };
      }
    }
  }

  if (property.type === 'object') {
    if (property.properties) {
      result.properties = {};
      for (const [key, prop] of Object.entries(property.properties)) {
        result.properties[key] = convertPropertyToGeminiSchema(prop);
      }
    }
  }

  return result;
}

/**
 * Convert JSON Schema type to Gemini Schema type
 */
function convertTypeToGemini(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'STRING',
    'number': 'NUMBER',
    'integer': 'INTEGER',
    'boolean': 'BOOLEAN',
    'array': 'ARRAY',
    'object': 'OBJECT',
  };

  return typeMap[type] || 'STRING';
}

