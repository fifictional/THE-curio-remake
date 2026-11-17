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

export interface DocumentRow {
  documentUuid: string;
  fileName?: string | null;
  type?: string | null;
  key?: string | null;
  spaceUuid?: string | null;
  createdAt?: string | null;
}

export interface DocumentSummaryRow {
  documentSummaryUuid: string;
  documentUuid: string;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface SpaceRow {
  spaceUuid: string;
  name?: string | null;
}
