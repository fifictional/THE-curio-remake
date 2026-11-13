import type { MemoryBlockRecord } from './types';
import { BLOCK_TYPE_KNOWLEDGE_GAP, BLOCK_TYPE_MASTERED_TOPIC } from './constants';

function formatGap(block: MemoryBlockRecord): string {
  const p = block.payload as { description?: string; documentName?: string; askedCount?: number };
  const parts = [`- ${block.topic}`];
  if (p.description) parts.push(`  ${p.description}`);
  else if (p.askedCount) parts.push(`  Asked about this ${p.askedCount} time(s).`);
  if (p.documentName) parts.push(`  Source: ${p.documentName}`);
  return parts.join('\n');
}

function formatMastered(block: MemoryBlockRecord): string {
  const p = block.payload as { description?: string; accuracy?: number };
  const parts = [`- ${block.topic} (mastered)`];
  if (p.description) parts.push(`  ${p.description}`);
  if (p.accuracy != null) parts.push(`  Accuracy: ${Math.round(p.accuracy * 100)}%`);
  return parts.join('\n');
}

export function formatMemoryBlocksForPrompt(blocks: MemoryBlockRecord[]): {
  memoryContext: string;
  masteryContext: string;
} {
  const gaps = blocks.filter((b) => b.blockType === BLOCK_TYPE_KNOWLEDGE_GAP);
  const mastered = blocks.filter((b) => b.blockType === BLOCK_TYPE_MASTERED_TOPIC);

  const memoryContext =
    gaps.length === 0
      ? ''
      : `The student has these knowledge gaps:\n${gaps.map(formatGap).join('\n')}`;

  const masteryContext =
    mastered.length === 0
      ? ''
      : `The student has mastered:\n${mastered.map(formatMastered).join('\n')}`;

  return { memoryContext, masteryContext };
}
