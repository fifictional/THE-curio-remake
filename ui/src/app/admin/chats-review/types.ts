export type AdminChatRow = {
  chatUuid: string;
  documentUuid: string;
  spaceUuid: string;
  isOpenChat: boolean;
  name: string;
  createdAt: string;
  updatedAt: string;
  spaceName: string;
  isWebSearchCalled: boolean;
  hasThumbsDown: boolean;
  hasThumbsUp: boolean;
  messages: Array<MessageRow>;
};

export type MessageRow = {
  messageUuid: string;
  createdAt: string;
  content: string;
  type: string;
  toolName?: string;
  role: string;
  updatedAt: string;
  vote?: 'up' | 'down';
};