import { FunctionTool } from "@ai-tools/types";

export const createQuestionsTool = (minItems: number = 1, maxItems: number = 50): FunctionTool => ({
  type: 'function',
  name: 'create_questions',
  description: 'Creates questions',
  parameters: {
    questions: {
      type: 'array',
      description: 'Array of questions to create',
      items: {
        type: 'object',
        description: 'A question with content, options, hint, and explanations',
        properties: {
          questionContent: {
            type: 'string',
            description: "The question, Use LaTeX for formulas in style \\(f(x) = x^2\\). Don't use '$' for LaTeX formulas. All backslashes must be doubled.",
          },
          options: {
            type: "array",
            description: 'The options for the question, should be 4 options, with LaTeX for formulas in style \\(f(x) = x^2\\). Don\'t use "$" for LaTeX formulas. All backslashes must be doubled.  The correct answer *MUST* be the first option.',
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
          },
          hint: {
            type: "string",
            description: "Concise hint (<=100 chars) that doesn't give away the answer, with LaTeX for formulas in style \\(f(x) = x^2\\). Don't use '$' for LaTeX formulas. All backslashes must be doubled.",
          },
          answerExplanations: {
            type: "array",
            description: "Per-option explanations (<=150 chars each), index-aligned with options, with LaTeX for formulas in style \\(f(x) = x^2\\). Don't use '$' for LaTeX formulas. All backslashes must be doubled.",
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
          },
        },
      },
      minItems: minItems,
      maxItems: maxItems,
    },
  },
});

