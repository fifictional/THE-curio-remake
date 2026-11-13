import { describe, expect, it } from 'vitest';
import type { MemoryBlock } from '@/lib/types/memory-block';
import { dedupeMemoryBlocksForDisplay } from './dedupe-memory-blocks';

function block(
  topic: string,
  blockType: MemoryBlock['blockType'],
  confidence = 0.8,
): MemoryBlock {
  return {
    memoryBlockUuid: `${blockType}-${topic}`,
    ownerUuid: 'user-1',
    scope: 'user',
    scopeId: 'user-1',
    blockType,
    payload: {},
    topic,
    confidence,
    frequency: 1,
    lastReinforcedAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('dedupeMemoryBlocksForDisplay', () => {
  it('removes similar topics within the same category', () => {
    const result = dedupeMemoryBlocksForDisplay(
      [
        block('past consideration rule', 'knowledge_gap'),
        block('past consideration in contract law', 'knowledge_gap', 0.9),
      ],
      [],
    );

    expect(result.gaps).toHaveLength(1);
    expect(result.gaps[0].topic).toBe('past consideration in contract law');
  });

  it('hides knowledge gaps when a mastered topic matches', () => {
    const result = dedupeMemoryBlocksForDisplay(
      [block('past consideration rule', 'knowledge_gap')],
      [block('past consideration in contract law', 'mastered_topic')],
    );

    expect(result.gaps).toHaveLength(0);
    expect(result.mastered).toHaveLength(1);
  });
});
