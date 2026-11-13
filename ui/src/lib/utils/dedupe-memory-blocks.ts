import type { MemoryBlock } from '@/lib/types/memory-block';
import { areSimilarTopics } from '../../../amplify/ai/memory/topic-similarity';

function pickPreferredBlock(blocks: MemoryBlock[]): MemoryBlock {
  return [...blocks].sort((left, right) => {
    const confidenceDiff = (right.confidence ?? 0) - (left.confidence ?? 0);
    if (confidenceDiff !== 0) return confidenceDiff;

    const leftTime =
      Date.parse(left.updatedAt ?? left.lastReinforcedAt ?? left.createdAt) || 0;
    const rightTime =
      Date.parse(right.updatedAt ?? right.lastReinforcedAt ?? right.createdAt) || 0;
    return rightTime - leftTime;
  })[0];
}

function dedupeWithinCategory(blocks: MemoryBlock[]): MemoryBlock[] {
  const groups: MemoryBlock[][] = [];

  for (const block of blocks) {
    const existingGroup = groups.find((group) =>
      areSimilarTopics(group[0].topic, block.topic),
    );
    if (existingGroup) {
      existingGroup.push(block);
    } else {
      groups.push([block]);
    }
  }

  return groups.map((group) => pickPreferredBlock(group));
}

export function dedupeMemoryBlocksForDisplay(
  gaps: MemoryBlock[],
  mastered: MemoryBlock[],
): { gaps: MemoryBlock[]; mastered: MemoryBlock[] } {
  const dedupedMastered = dedupeWithinCategory(mastered);
  const dedupedGaps = dedupeWithinCategory(gaps).filter(
    (gap) =>
      !dedupedMastered.some((masteredBlock) =>
        areSimilarTopics(gap.topic, masteredBlock.topic),
      ),
  );

  return {
    gaps: dedupedGaps,
    mastered: dedupedMastered,
  };
}

export function countUniqueTrackedTopics(
  gaps: MemoryBlock[],
  mastered: MemoryBlock[],
): number {
  const deduped = dedupeMemoryBlocksForDisplay(gaps, mastered);
  return deduped.gaps.length + deduped.mastered.length;
}
