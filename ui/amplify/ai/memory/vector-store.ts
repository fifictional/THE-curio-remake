import { embedText } from './embed-text';
import {
  getReadVectorStore,
  getWriteVectorStore,
  isVectorStoreConfigured,
} from '../../utils/vector-store';
import type { MemoryBlockRecord, MemoryScope } from './types';

export const MEMORY_SOURCE_TYPE = 'memory_block';
const VECTOR_OP_TIMEOUT_MS = 8000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function memorySearchText(block: {
  topic: string;
  blockType: string;
  payload?: Record<string, unknown> | { description?: string };
}): string {
  const desc =
    typeof block.payload?.description === 'string'
      ? block.payload.description
      : '';
  return `${block.blockType}: ${block.topic}. ${desc}`.trim();
}

export async function indexMemoryBlock(block: MemoryBlockRecord): Promise<void> {
  if (!isVectorStoreConfigured()) return;

  const text = memorySearchText(block);
  const embedding = await embedText(text);
  const store = getWriteVectorStore();
  await store.ensureCollection(embedding.length);

  await store.upsert({
    id: block.memoryBlockUuid,
    vector: embedding,
    payload: {
      userUuid: block.ownerUuid,
      chunkId: block.memoryBlockUuid,
      chunkText: text,
      sourceType: MEMORY_SOURCE_TYPE,
      memoryBlockUuid: block.memoryBlockUuid,
      blockType: block.blockType,
      topic: block.topic,
      scope: block.scope,
      scopeId: block.scopeId,
      createdAt: block.updatedAt,
    },
  });
}

export async function deleteMemoryBlockFromIndex(
  memoryBlockUuid: string
): Promise<void> {
  if (!isVectorStoreConfigured()) return;
  await getWriteVectorStore().deleteById(memoryBlockUuid);
}

export async function deleteAllMemoryBlocksForUser(
  ownerUuid: string
): Promise<void> {
  if (!isVectorStoreConfigured()) return;
  try {
    await getWriteVectorStore().deleteByFilter({
      userUuid: ownerUuid,
      sourceType: MEMORY_SOURCE_TYPE,
    });
  } catch (err) {
    console.error('[memory-vector] deleteByFilter failed', err);
  }
}

export async function searchMemoryBlocksVector(input: {
  ownerUuid: string;
  query: string;
  scopes: Array<{ scope: MemoryScope; scopeId: string }>;
  blockType?: string;
  k?: number;
}): Promise<Array<{ block: Partial<MemoryBlockRecord>; score: number }>> {
  if (!isVectorStoreConfigured()) return [];

  const k = input.k ?? 8;
  const embedding = await withTimeout(
    embedText(input.query),
    VECTOR_OP_TIMEOUT_MS,
    'memory embed'
  );

  const store = getReadVectorStore();
  const hits = await withTimeout(
    store.search(
      embedding,
      {
        userUuid: input.ownerUuid,
        sourceType: MEMORY_SOURCE_TYPE,
        blockType: input.blockType,
        memoryScopes: input.scopes.map((s) => ({
          scope: s.scope,
          scopeId: s.scopeId,
        })),
      },
      k,
    ),
    VECTOR_OP_TIMEOUT_MS,
    'memory vector search'
  );

  return hits.map((hit) => ({
    block: {
      memoryBlockUuid: String(hit.payload.memoryBlockUuid ?? hit.id),
      topic: String(hit.payload.topic ?? ''),
      blockType: String(hit.payload.blockType ?? ''),
      scope: hit.payload.scope as MemoryScope,
      scopeId: String(hit.payload.scopeId ?? ''),
    },
    score: hit.score,
  }));
}

export async function findSimilarMemoryBlockVector(input: {
  ownerUuid: string;
  blockType: string;
  topic: string;
  minScore?: number;
}): Promise<string | null> {
  if (!isVectorStoreConfigured()) return null;

  const results = await searchMemoryBlocksVector({
    ownerUuid: input.ownerUuid,
    query: input.topic,
    scopes: [],
    blockType: input.blockType,
    k: 3,
  });

  const minScore = input.minScore ?? 0.82;
  const match = results.find((r) => r.score >= minScore);
  return match?.block.memoryBlockUuid ?? null;
}
