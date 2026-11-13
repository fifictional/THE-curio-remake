import { FunctionTool } from "@ai-tools/types";

export const createFlashcardTool: FunctionTool = {
  type: 'function',
  name: 'create_flashcard',
  description: 'Creates a flashcard following the user instructions',
  parameters: {
    flashcards: {
      type: 'array',
      description: 'Array of flashcards to create',
      items: {
        type: 'object',
        description: 'A flashcard with title and content',
        properties: {
          title: {
            type: 'string',
            description: 'The part A of the flashcard, either the question or the concept',
          },
          content: {
            type: 'string',
            description: 'The part B of the flashcard, either the answer or the explanation',
          },
        },
      },
      minItems: 1,
      maxItems: 50,
    },
  },
};

