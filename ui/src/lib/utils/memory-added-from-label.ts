import type { MemoryBlock } from '@/lib/types/memory-block';

const ADDED_FROM_LABELS: Record<NonNullable<MemoryBlock['addedFrom']>, string> = {
  chat: 'Chat',
  quiz: 'Quiz',
  mock_exam: 'Practice test',
  flashcard: 'Flashcards',
};

export function formatMemoryAddedFromLabel(block: MemoryBlock): string | null {
  if (!block.addedFrom) {
    return null;
  }
  const surface = ADDED_FROM_LABELS[block.addedFrom] ?? block.addedFrom;
  if (block.isBackfill) {
    return `From ${surface} · Migration`;
  }
  return `From ${surface}`;
}
