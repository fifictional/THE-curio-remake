import type { MemoryAddedFrom } from '../../../amplify/ai/memory/types';

export type MemoryBlockType = 'knowledge_gap' | 'mastered_topic';

export interface MemoryBlock {
  memoryBlockUuid: string;
  ownerUuid: string;
  scope: 'user' | 'folder' | 'file' | 'system';
  scopeId: string;
  blockType: string;
  payload: Record<string, unknown>;
  topic: string;
  subject?: string | null;
  documentUuid?: string | null;
  confidence: number;
  frequency: number;
  firstSeenAt?: string;
  lastReinforcedAt: string;
  createdAt: string;
  updatedAt: string;
  addedFrom?: MemoryAddedFrom | null;
  isBackfill?: boolean | null;
}
