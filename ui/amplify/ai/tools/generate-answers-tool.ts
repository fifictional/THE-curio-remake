import { FunctionTool } from "@ai-tools/types";

export const generateAnswersTool: FunctionTool = {
  type: "function",
  name: "generateAnswers",
  description: "Generate correct answers, explanations, and hints for the provided questions.",
  parameters: {
    solvedQuestions: {
      type: "array",
      description: "Array of solved questions with answers, explanations, and hints. You MUST include answers for ALL questions provided - the array length must match the number of questions asked.",
      items: {
        type: "object",
        description: "A solved question with answer, explanations, and hint",
        properties: {
          extractedQuestionUuid: {
            type: "string",
            description: "The UUID of the question being solved"
          },
          correctAnswer: {
            type: "string",
            description: "For multiple choice: 'A', 'B', 'C', or 'D'. For text input: the full answer text."
          },
          answerExplanations: {
            type: "array",
            description: "Array of 4 explanations for all answer choices in A, B, C, D order. For text input questions, provide explanations for the approach.",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "string"
            }
          },
          hint: {
            type: "string",
            description: "A helpful hint for solving the question without giving away the answer"
          }
        }
      }
    }
  }
};


