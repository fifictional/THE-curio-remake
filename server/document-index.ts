/**
 * Document indexing and retrieval.
 *
 * The old stack pushed a document through S3 events → SQS → an embedding ECS
 * task. Here the polling worker already has the text, so it indexes inline.
 *
 * Two indexes, one chunk list:
 *   - **Postgres full text** — always. `to_tsvector('english', text)` with a GIN
 *     index; keyword search over study material is good, and it needs no
 *     provider, so retrieval works on a fresh clone with no keys at all.
 *   - **Qdrant vectors** — only when an embedding key is set. Paraphrase-level
 *     matching, at the cost of a provider.
 *
 * Chunk ids are deterministic (derived from document + chunk index), so
 * re-indexing overwrites instead of duplicating.
 */

import { createHash } from 'node:crypto';

import { eq, sql } from 'drizzle-orm';

import { embed, hasAiKey } from './ai';
import { serviceDb } from './db/service-client';
import { documentChunks } from './db/schema';
import {
  deleteDocumentChunks,
  upsertDocumentChunks,
  type DocumentChunkPoint,
} from './qdrant';

/** ~1200 chars is a few paragraphs: enough context, small enough to rank. */
export const CHUNK_SIZE = Number(process.env.RAG_CHUNK_SIZE ?? 1200);
export const CHUNK_OVERLAP = Number(process.env.RAG_CHUNK_OVERLAP ?? 200);

/**
 * Split on paragraph boundaries where possible, then hard-wrap. Overlap keeps a
 * sentence that straddles a boundary retrievable from both sides.
 */
export function chunkText(text: string, size = CHUNK_SIZE, overlap = CHUNK_OVERLAP): string[] {
  // Control characters (NUL included) are invalid in Postgres text; drop them
  // before they reach either index.
  const clean = text
    // eslint-disable-next-line no-control-regex -- stripping control bytes is the point
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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
 * Index one document's text. Postgres first (always), then vectors when a
 * provider is available. Throws on database failure; callers treat indexing as
 * best-effort, so a Qdrant outage must not fail the document pipeline.
 */
export async function indexDocumentText(input: IndexDocumentInput): Promise<number> {
  const chunks = chunkText(input.text);
  if (!chunks.length) return 0;

  // Replace this document's chunks: a re-index may be shorter than the last one.
  await serviceDb.delete(documentChunks).where(eq(documentChunks.documentUuid, input.documentUuid));
  await serviceDb.insert(documentChunks).values(
    chunks.map((text, chunkIndex) => ({
      id: chunkId(input.documentUuid, chunkIndex),
      documentUuid: input.documentUuid,
      userUuid: input.userUuid,
      chunkIndex,
      documentName: input.documentName,
      text,
    })),
  );

  if (hasAiKey()) {
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

    await deleteDocumentChunks(input.userUuid, input.documentUuid);
    await upsertDocumentChunks(points);
  }

  return chunks.length;
}

export interface TextHit {
  score: number;
  documentUuid: string;
  documentName: string;
  chunkIndex: number;
  text: string;
}

/**
 * Full-text retrieval: Postgres ranks the caller's own chunks. `websearch_to_tsquery`
 * means a student can type a sentence and still get matches, and the user filter
 * is applied in SQL (the owner connection bypasses RLS, so it is explicit here).
 */
export async function searchDocumentText(input: {
  userUuid: string;
  query: string;
  limit?: number;
}): Promise<TextHit[]> {
  const query = input.query.trim();
  if (!query) return [];

  const limit = input.limit ?? 5;

  /*
   * Two passes, because a student types questions, not search syntax:
   *   1. `websearch_to_tsquery` — every term must match (precise)
   *   2. if that finds nothing, the same terms OR'd together, ranked — a
   *      question like "what does the policy require for consent" would
   *      otherwise match nothing because of "what"/"does"/"require"
   */
  const queryFor = (joiner: 'and' | 'or') => sql`
    select string_agg(quote_literal(lexeme), ${joiner === 'or' ? ' | ' : ' & '}) as q
    from unnest(tsvector_to_array(to_tsvector('english', ${query}))) as lexeme
  `;

  const search = async (joiner: 'and' | 'or') =>
    serviceDb.execute(sql`
      with terms as (${queryFor(joiner)})
      select c.document_uuid as "documentUuid",
             c.document_name as "documentName",
             c.chunk_index as "chunkIndex",
             c.text,
             ts_rank_cd(
               to_tsvector('english', c.text),
               to_tsquery('english', (select q from terms))
             ) as rank
      from document_chunks c, terms
      where c.user_uuid = ${input.userUuid}
        and terms.q is not null
        and to_tsvector('english', c.text) @@ to_tsquery('english', terms.q)
      order by rank desc
      limit ${limit}
    `);

  let rows = await search('and');
  if (rows.length === 0) rows = await search('or');

  return (rows as unknown as Array<Record<string, unknown>>).map((row) => ({
    score: Number(row.rank ?? 0),
    documentUuid: String(row.documentUuid),
    documentName: String(row.documentName ?? ''),
    chunkIndex: Number(row.chunkIndex ?? 0),
    text: String(row.text ?? ''),
  }));
}
