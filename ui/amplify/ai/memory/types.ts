export type MemoryScope = 'user' | 'folder' | 'file' | 'system';

export type MemoryBlockType = 'knowledge_gap' | 'mastered_topic' | string;

/** Which surface the memory came from (chat, quiz, etc.). Immutable after create. */
export type MemoryAddedFrom = 'chat' | 'quiz' | 'mock_exam' | 'flashcard';

export type MemoryCandidateDecision = 'created' | 'merged' | 'rejected';

export type MemoryEvidence =
  | 'quiz_below_60'
  | 'quiz_mastered'
  | 'repeated_question'
  | 'explicit_confusion'
  | 'llm_reflection'
  | 'document_ingest';

export interface KnowledgeGapPayload {
  topic: string;
  subject?: string;
  documentUuid?: string;
  documentName?: string;
  askedCount?: number;
  evidence: MemoryEvidence;
  description?: string;
}

export interface MasteredTopicPayload {
  topic: string;
  subject?: string;
  materials?: string[];
  confirmedAt?: string;
  accuracy?: number;
  evidence: MemoryEvidence;
  description?: string;
}

export interface MemoryBlockRecord {
  memoryBlockUuid: string;
  ownerUuid: string;
  scope: MemoryScope;
  scopeId: string;
  blockType: MemoryBlockType;
  payload: KnowledgeGapPayload | MasteredTopicPayload | Record<string, unknown>;
  topic: string;
  subject?: string | null;
  documentUuid?: string | null;
  confidence: number;
  frequency: number;
  attemptScores?: number[] | null;
  attemptDates?: string[] | null;
  firstSeenAt: string;
  lastReinforcedAt: string;
  version: number;
  sources?: string[] | null;
  addedFrom?: MemoryAddedFrom | null;
  /** True when created by a batch migration/backfill job rather than live activity. */
  isBackfill?: boolean | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryCandidateInput {
  ownerUuid: string;
  scope: MemoryScope;
  scopeId: string;
  blockType: MemoryBlockType;
  topic: string;
  subject?: string;
  documentUuid?: string;
  payload: KnowledgeGapPayload | MasteredTopicPayload | Record<string, unknown>;
  confidence: number;
  sources?: string[];
  messageUuid?: string;
  chatUuid?: string;
  /** When the underlying learning event happened (chat message, quiz attempt, etc.). */
  occurredAt?: string;
  addedFrom?: MemoryAddedFrom;
  isBackfill?: boolean;
}

export type MemoryQueueEvent =
  | {
      type: 'chat_interaction';
      ownerUuid: string;
      chatUuid: string;
      messageUuid: string;
      userTurn: string;
      assistantTurn: string;
      spaceUuid?: string | null;
      documentUuids?: string[];
      occurredAt?: string;
      addedFrom?: MemoryAddedFrom;
      isBackfill?: boolean;
    }
  | {
      type: 'quiz_attempt';
      ownerUuid: string;
      quizUuid: string;
      quizAttemptUuid: string;
      score: number;
      total: number;
      topic: string;
      subject?: string;
      documentUuid?: string | null;
      spaceUuid?: string | null;
      occurredAt?: string;
      addedFrom?: MemoryAddedFrom;
      isBackfill?: boolean;
    };

export interface MemoryRetrievalContext {
  ownerUuid: string;
  query: string;
  spaceUuid?: string | null;
  documentUuids?: string[];
  k?: number;
}
