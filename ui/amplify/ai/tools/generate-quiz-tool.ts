import { FunctionTool } from "@ai-tools/types";

export const generateQuizTool: FunctionTool = {
  type: "function",
  name: "generate_quiz",
  description: "Generate quiz questions from a document summary",
  parameters: {
    questions: {
      type: "array",
      description: "Array of quiz questions to generate",
      minItems: 10,
      items: {
        type: "object",
        description: "A quiz question with content, options, answer, hint, and explanations",
        properties: {
          question: {
            type: "object",
            description: "The question content and references",
            properties: {
              question_content: {
                type: "string",
                description: "The content of the question"
              },
              question_references: {
                type: "array",
                description: "Array of references for the question",
                minItems: 1,
                items: {
                  type: "object",
                  description: "A reference for the question",
                  properties: {
                    reference_type: {
                      type: "string",
                      enum: ["text", "visual-element"],
                      description: "Type of reference"
                    },
                    reference_name: {
                      type: "string",
                      description: "Heading id, e.g. #SECTION_HEADER2"
                    },
                    reference_content: {
                      type: "string",
                      description: "Content if text type, empty string otherwise"
                    },
                    reference_url: {
                      type: "string",
                      description: "URL if visual-element type, empty string otherwise"
                    }
                  }
                }
              }
            }
          },
          options: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
            description: "Array of 4 answer options"
          },
          answer: {
            type: "integer",
            description: "Index of the correct answer (0-based)"
          },
          hint: {
            type: "string",
            description: "Concise hint (<=100 chars)"
          },
          answerExplanations: {
            type: "array",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
            description: "Per-option explanations (<=150 chars each), index-aligned with options"
          }
        }
      }
    }
  }
};


