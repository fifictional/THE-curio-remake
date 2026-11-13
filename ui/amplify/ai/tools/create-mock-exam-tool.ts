import { FunctionTool } from "@ai-tools/types";

export const createMockExamTool: FunctionTool = {
  type: 'function',
  name: 'create_mock_exam',
  description: 'Creates a mock exam',
  parameters: {
    mockExam: {
      type: 'object',
      description: 'Mock exam details',
      properties: {
        title: {
          type: 'string',
          description: 'The title of the mock exam',
        },
        description: {
          type: 'string',
          description: 'Write a short, fun, and slightly challenging description (2-3 lines) in Markdown format for a quiz. The description should match the theme of the chosen topic, and build excitement for the learner. Use an engaging tone that feels playful yet motivating.',
        },
        topic: {
          type: 'string',
          description: 'The topic of the mock exam',
        },
        difficulty: {
          type: 'string',
          description: 'The difficulty of the mock exam',
        },
        time: {
          type: 'integer',
          description: 'The time of the mock exam in seconds',
        },
        questionCount: {
          type: 'integer',
          description: 'The number of questions in the mock exam',
        },
        instructions: {
          type: 'string',
          description: 'The instructions of the mock exam in markdown format',
        },
        moduleUuids: {
          type: 'array',
          description: 'The module uuids we can get the questions from. use the uuid from the provided list in the prompt. Empty array if no module is needed. Only match the module that are relevant to the topic. Example: for SAT Math, we can use the module uuids for SAT Math, but not the module uuids for SAT Reading & Writing.',
          items: { type: 'string' },
        },
      },
    },
  },
};

