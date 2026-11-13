import { FunctionTool } from "@ai-tools/types";

export const createExtractAnswersFromModuleTool = (answerCount: number): FunctionTool => ({
  type: "function",
  name: "extractAnswersFromModule",
  description: `Extract ALL ${answerCount} answers from this module. MUST extract every single answer - no gaps allowed.`,
  parameters: {
    answers: {
      type: "array",
      description: `Complete list of ALL ${answerCount} answers from THIS MODULE. MUST include every answer with no gaps in numbering. Explanations MUST be extracted verbatim from the source (no summarization), after removing any prefixes like 'Choice X is correct/incorrect'.`,
      minItems: answerCount,
      maxItems: answerCount,
      items: {
        type: "object",
        description: "An answer extracted from the module",
        properties: {
          questionNumber: {
            type: "integer",
            description: "The question number within the module (1, 2, 3, ...)"
          },
          correctAnswer: {
            type: "string",
            description: "The correct answer. For multiple choice: A, B, C, or D (uppercase). For text input: the full answer text."
          },
          answerExplanations: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            description: "Explanations for ALL answer choices in A, B, C, D order (4 items total). VERBATIM extraction: copy the original text exactly as written (no summarization/paraphrasing), only removing prefixes like 'Choice X is correct/incorrect'. Use empty strings for choices that have no explanation.",
            items: {
              type: "string"
            }
          },
          hint: {
            type: "string",
            description: "A hint for solving the question. Empty string if not available."
          }
        }
      }
    }
  }
});


