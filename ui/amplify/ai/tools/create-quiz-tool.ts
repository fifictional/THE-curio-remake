import { FunctionTool } from "@ai-tools/types";

export const createQuizTool: FunctionTool = {
  type: 'function',
  name: 'create_quiz',
  description: 'Creates a quiz',
  parameters: {
    quiz: {
      type: 'object',
      description: 'Quiz details',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the quiz',
        },
        description: {
          type: 'string',
          description: 'Write a short, fun, and slightly challenging description (2-3 lines) in Markdown format for a quiz. The description should match the theme of the chosen topic, and build excitement for the learner. Use an engaging tone that feels playful yet motivating.',
        },
        difficulty: {
          type: 'string',
          description: 'The difficulty of the quiz',
        },
        questionCount: {
          type: 'integer',
          description: 'The number of questions in the quiz. Typically 5, 10, or 20.',
        },
      },
    },
  },
};

