export interface Message {
  messageUuid: string;
  chatUuid: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

export interface SessionUser {
  sub: string;
  email?: string;
  name?: string | null;
}

export interface Chat {
  chatUuid: string;
  name?: string | null;
}
