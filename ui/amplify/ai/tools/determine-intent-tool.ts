import { FunctionTool } from "@ai-tools/types";

export const createDetermineIntentTool = (includeImageGeneration: boolean): FunctionTool => {
  const intentEnum = includeImageGeneration
    ? ['generic_chat', 'tutor_chat', 'create_flashcard', 'create_quiz', 'create_mock_exam', 'generate_image']
    : ['generic_chat', 'tutor_chat', 'create_flashcard', 'create_quiz', 'create_mock_exam'];

  return {
    type: 'function',
    name: 'determine_intent',
    description: 'Determines the user\'s intent from their message and optionally suggests a chat title if this is the first analysis',
    parameters: {
      intent: {
        type: 'string',
        description: 'The determined intent of the user\'s message',
        enum: intentEnum,
      },
      preliminaryMessage: {
        type: 'string',
        description: 'Optional brief message to show user before processing (e.g., "Creating flashcards for you..."). Leave empty if not needed.',
      },
      suggestedTitle: {
        type: 'string',
        description: 'A concise, descriptive title for the chat conversation (max 100 characters). REQUIRED: You MUST provide a title. If the conversation has a clear topic (even from just the first message), provide a meaningful title. For generic greetings or unclear topics, provide a generic title like "Chat" or "Conversation". Only use empty string if absolutely no title can be determined (rare).',
      },
    },
  };
};


