import { describe, expect, it } from 'vitest';
import { formatMemoryAddedFromLabel } from './memory-added-from-label';
import type { MemoryBlock } from '../types/memory-block';

function block(partial: Partial<MemoryBlock>): MemoryBlock {
  return {
    memoryBlockUuid: 'b1',
    ownerUuid: 'u1',
    scope: 'user',
    scopeId: 'u1',
    blockType: 'knowledge_gap',
    payload: {},
    topic: 'Topic',
    confidence: 0.8,
    frequency: 1,
    lastReinforcedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('formatMemoryAddedFromLabel', () => {
  it('labels live chat memory', () => {
    expect(formatMemoryAddedFromLabel(block({ addedFrom: 'chat', isBackfill: false }))).toBe(
      'From Chat',
    );
  });

  it('labels migrated quiz memory', () => {
    expect(formatMemoryAddedFromLabel(block({ addedFrom: 'quiz', isBackfill: true }))).toBe(
      'From Quiz · Migration',
    );
  });

  it('labels live practice test memory', () => {
    expect(
      formatMemoryAddedFromLabel(block({ addedFrom: 'mock_exam', isBackfill: false })),
    ).toBe('From Practice test');
  });

  it('returns null for legacy blocks without addedFrom', () => {
    expect(formatMemoryAddedFromLabel(block({}))).toBeNull();
  });
});
