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
  onboardingCompleted?: boolean;
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

export interface ProfileRow {
  id: string;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  country?: string | null;
  userDescription?: string | null;
  createdAt?: string | null;
}

export interface FlashcardRow {
  flashcardUuid: string;
  title?: string | null;
  content?: string | null;
  createdAt?: string | null;
}

export interface QuizRow {
  quizUuid: string;
  title?: string | null;
  description?: string | null;
  difficulty?: string | null;
  questionCount?: number | null;
  lastScore?: number | null;
  lastTotal?: number | null;
  createdAt?: string | null;
}

export interface CitationRow {
  chatCitationUuid: string;
  chatUuid: string;
  messageUuid: string;
  type: string;
  title: string;
  url: string;
  createdAt?: string | null;
}

export interface SubscriptionRow {
  subscriptionId: string;
  provider?: string | null;
  status?: string | null;
  tier?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
}

export interface MetadataRow {
  metadataUuid: string;
  targetUuid?: string | null;
  targetType?: string | null;
  name?: string | null;
  value?: string | null;
  createdAt?: string | null;
}

export interface SpaceMember {
  userUuid: string;
  email?: string | null;
  name?: string | null;
  level: number;
  createdAt?: string | null;
}

export interface MemoryBlockView {
  memoryBlockUuid: string;
  scope?: string | null;
  blockType?: string | null;
  topic?: string | null;
  subject?: string | null;
  description?: string | null;
  evidence?: string | null;
  askedCount?: number | null;
  updatedAt?: string | null;
}

export interface MemoryState {
  enabled: boolean;
  blocks: MemoryBlockView[];
}
