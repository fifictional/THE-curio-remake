/**
 * Document indexing for retrieval.
 *
 * The old stack pushed a document through S3 events → SQS → an embedding ECS
 * task. Here the polling worker already has the text, so it indexes inline:
 * chunk → embed → Qdrant, scoped by `userUuid`.
 *
 * Chunk ids are deterministic (derived from document + chunk index), so
 * re-indexing overwrites instead of duplicating.
 */

import { createHash } from 'node:crypto';

import { embed } from './ai';
import { upsertDocumentChunks, type DocumentChunkPoint } from './qdrant';

/** ~1200 chars is a few paragraphs: enough context, small enough to rank. */
export const CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE ?? 1200);
export const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP ?? 200);

/**
 * Split on paragraph boundaries where possible, then hard-wrap. Overlap keeps a
 * sentence that straddles a boundary retrievable from both sides.
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= size) return clean ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(clean.length, start + size);

    // Prefer ending on a sentence, then a word, without shrinking too far.
    if (end < clean.length) {
      const stop = clean.lastIndexOf('. ', end);
      if (stop > start + size * 0.5) end = stop + 1;
      else {
        const space = clean.lastIndexOf(' ', end);
        if (space > start + size * 0.5) end = space;
      }
    }

    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }

  return chunks.filter(Boolean);
}

/** Deterministic UUID so re-running the index updates the same points. */
export function chunkId(documentUuid: string, chunkIndex: number): string {
  const hex = createHash('sha1').update(`${documentUuid}\u0000${chunkIndex}`).digest('hex');
  const variant = ((parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

export interface IndexDocumentInput {
  userUuid: string;
  documentUuid: string;
  documentName: string;
  text: string;
}

/**
 * Index one document's text. Throws if Qdrant or the provider fails; callers
 * treat indexing as best-effort (a document is still usable without vectors).
 */
export async function indexDocumentText(input: IndexDocumentInput): Promise<number> {
  const chunks = chunkText(input.text);
  if (!chunks.length) return 0;

  const points: DocumentChunkPoint[] = [];
  for (const [chunkIndex, text] of chunks.entries()) {
    points.push({
      id: chunkId(input.documentUuid, chunkIndex),
      vector: await embed(text),
      payload: {
        userUuid: input.userUuid,
        documentUuid: input.documentUuid,
        documentName: input.documentName,
        chunkIndex,
        text,
      },
    });
  }

  await upsertDocumentChunks(points);
  return points.length;
}
