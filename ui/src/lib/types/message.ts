export type Message = {
  messageUuid: string;
  chatUuid: string;
  content: string;
  image?: string | null;
  role: 'user' | 'assistant' | null;
  createdAt: string;
  updatedAt: string;
  type?: 'text' | 'tool' | null;
  toolName?: string | null;
  toolArguments?: any | null;
  toolExtras?: MessageToolExtra | null;
  isCompleted?: boolean | null;
  vote?: 'up' | 'down' | null;
  agentStatus?: 'thinking' | 'understanding' | 'generating' | 'searching_web' | null;
  agentStatusMessage?: string | null;
};

export type MessageToolExtra = {
  userAction: boolean;
  isLoading: boolean;
  success: boolean;
  errors: string[] | null;
};
