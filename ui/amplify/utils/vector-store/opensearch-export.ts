import type { Client } from '@opensearch-project/opensearch';
import { getOpenSearchIndexName } from './collection-name';
import type { VectorPayload, VectorPoint } from './types';

const SCROLL_TTL = '5m';
const PAGE_SIZE = 500;

export { getOpenSearchIndexName };

export function openSearchHitToVectorPoint(hit: {
  _id?: string;
  _source?: Record<string, unknown>;
}): VectorPoint | null {
  const src = hit._source;
  if (!src || !Array.isArray(src.embedding)) return null;

  const embedding = src.embedding as number[];
  const chunkId = String(src.chunkId ?? hit._id ?? '');
  if (!chunkId) return null;

  const payload: VectorPayload = {
    userUuid: String(src.userUuid ?? ''),
    chunkId,
    chunkText: String(src.chunkText ?? ''),
    documentUuid: src.documentUuid ? String(src.documentUuid) : undefined,
    sourceType: src.sourceType ? (String(src.sourceType) as VectorPayload['sourceType']) : undefined,
    spaceUuid: src.spaceUuid ? String(src.spaceUuid) : undefined,
    memoryBlockUuid: src.memoryBlockUuid ? String(src.memoryBlockUuid) : undefined,
    blockType: src.blockType ? String(src.blockType) : undefined,
    topic: src.topic ? String(src.topic) : undefined,
    scope: src.scope ? String(src.scope) : undefined,
    scopeId: src.scopeId ? String(src.scopeId) : undefined,
    createdAt: src.createdAt ? String(src.createdAt) : undefined,
  };

  return {
    id: chunkId,
    vector: embedding,
    payload,
  };
}

export async function countOpenSearchDocuments(client: Client): Promise<number> {
  const index = getOpenSearchIndexName();
  const res = await client.count({ index });
  const body = res.body as { count?: number };
  return body.count ?? 0;
}

export async function exportOpenSearchSlice(
  client: Client,
  sliceId: number,
  maxSlices: number,
  onBatch: (points: VectorPoint[]) => Promise<void>,
): Promise<{ exported: number; skipped: number }> {
  const index = getOpenSearchIndexName();
  let scrollId: string | undefined;
  let exported = 0;
  let skipped = 0;

  try {
    let response = await client.search({
      index,
      scroll: SCROLL_TTL,
      size: PAGE_SIZE,
      body: {
        slice: { id: sliceId, max: maxSlices },
        query: { match_all: {} },
      },
    });

    while (true) {
      scrollId = response.body._scroll_id;
      const hits = response.body.hits?.hits ?? [];
      if (hits.length === 0) break;

      const points: VectorPoint[] = [];
      for (const hit of hits) {
        const point = openSearchHitToVectorPoint(
          hit as { _id?: string; _source?: Record<string, unknown> },
        );
        if (point) {
          points.push(point);
        } else {
          skipped += 1;
        }
      }

      if (points.length > 0) {
        await onBatch(points);
        exported += points.length;
      }

      response = await client.scroll({
        scroll_id: scrollId,
        scroll: SCROLL_TTL,
      });
    }
  } finally {
    if (scrollId) {
      try {
        await client.clearScroll({ scroll_id: scrollId });
      } catch {
        // Best-effort scroll cleanup.
      }
    }
  }

  return { exported, skipped };
}

export function computeExportSliceCount(
  totalDocuments: number,
  targetPerSlice = 5000,
  maxSlices = 50,
): number {
  if (totalDocuments <= 0) return 1;
  return Math.min(maxSlices, Math.max(1, Math.ceil(totalDocuments / targetPerSlice)));
}
