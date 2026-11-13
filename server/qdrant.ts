/**
 * Qdrant client — REST, no SDK dependency.
 *
 * One collection, `chat_messages`. Payload carries `userUuid` and `chatUuid` so
 * searches can be filtered the same way the database is scoped: a user can only
 * retrieve their own vectors.
 *
 * If Qdrant is unreachable or no embedding key is set, callers treat this as a
 * soft failure — chat still works, retrieval is skipped.
 */

import { EMBED_DIMS } from './ai';

const URL = process.env.QDRANT_URL ?? 'http://localhost:6333';
export const COLLECTION = process.env.QDRANT_COLLECTION ?? 'chat_messages';

async function req(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  return res;
}

export async function ensureCollection(): Promise<void> {
  const existing = await req(`/collections/${COLLECTION}`);
  if (existing.ok) return;

  const created = await req(`/collections/${COLLECTION}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: { size: EMBED_DIMS, distance: 'Cosine' },
    }),
  });

  if (!created.ok && created.status !== 409) {
    throw new Error(`Qdrant create collection failed (${created.status})`);
  }
}

export interface VectorPoint {
  id: string;
  vector: number[];
  payload: {
    userUuid: string;
    chatUuid: string;
    messageUuid: string;
    role: 'user' | 'assistant';
    text: string;
  };
}

export async function upsert(points: VectorPoint[]): Promise<void> {
  if (!points.length) return;
  await ensureCollection();
  const res = await req(`/collections/${COLLECTION}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({ points }),
  });
  if (!res.ok) {
    throw new Error(`Qdrant upsert failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}

export interface SearchHit {
  score: number;
  messageUuid: string;
  chatUuid: string;
  role: string;
  text: string;
}

export async function search(
  vector: number[],
  opts: { userUuid: string; chatUuid?: string; limit?: number },
): Promise<SearchHit[]> {
  const must: Array<Record<string, unknown>> = [
    { key: 'userUuid', match: { value: opts.userUuid } },
  ];
  if (opts.chatUuid) must.push({ key: 'chatUuid', match: { value: opts.chatUuid } });

  const res = await req(`/collections/${COLLECTION}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector,
      limit: opts.limit ?? 5,
      with_payload: true,
      filter: { must },
    }),
  });

  if (!res.ok) {
    throw new Error(`Qdrant search failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    result?: Array<{ score: number; payload?: Record<string, unknown> }>;
  };

  return (json.result ?? []).map((hit) => ({
    score: hit.score,
    messageUuid: String(hit.payload?.messageUuid ?? ''),
    chatUuid: String(hit.payload?.chatUuid ?? ''),
    role: String(hit.payload?.role ?? ''),
    text: String(hit.payload?.text ?? ''),
  }));
}
