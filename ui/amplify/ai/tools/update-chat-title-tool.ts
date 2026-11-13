import { FunctionTool } from "@ai-tools/types";

export const updateChatTitleTool: FunctionTool = {
  type: 'function',
  name: 'update_chat_title',
  description: 'Updates the chat title based on the conversation content. Use this to provide a concise, descriptive title for the chat.',
  parameters: {
    title: {
      type: 'string',
      description: 'A concise, descriptive title for the chat conversation (max 100 characters)',
    },
  },
};
