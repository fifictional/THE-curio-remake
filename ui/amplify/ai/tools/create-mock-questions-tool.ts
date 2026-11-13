import { FunctionTool } from "@ai-tools/types";

export const createMockQuestionsTool = (minItems: number = 1, maxItems: number = 50): FunctionTool => ({
  type: 'function',
  name: 'create_mock_questions',
  description: 'Creates questions',
  parameters: {
    questions: {
      type: 'array',
      description: 'Array of questions to create',
      items: {
        type: 'object',
        description: 'A question with index, content, options, answer, hint, and explanations',
        properties: {
          index: {
            type: 'integer',
            description: 'The ordered index of the question in the quiz. 0 = first question, 1 = second question, etc.',
          },
          questionContent: {
            type: 'string',
            description: 'The question, with LaTeX for formulas in style \\(f(x) = x^2\\). Don\'t use "$" for LaTeX formulas. All backslashes must be doubled.',
          },
          options: {
            type: "array",
            description: 'The options for the question, should be 4 options, with LaTeX for formulas in style \\(f(x) = x^2\\). Don\'t use "$" for LaTeX formulas. All backslashes must be doubled.',
            items: { type: "string" },
            minItems: 4,
            maxItems: 4,
          },
          answer: {
            type: 'integer',
            description: 'The index of the correct answer for the question, from 0 to 3',
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

