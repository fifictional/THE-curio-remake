import { QdrantClient } from '@qdrant/js-client-rest';
import { resolveQdrantConfig, resetQdrantConfigForTests } from '../qdrant-secrets';
import { getQdrantCollectionName } from './collection-name';
import { payloadToQdrant, toQdrantFilter } from './qdrant-filter';
import type { VectorFilter, VectorPoint, VectorSearchHit, VectorStore } from './types';

export { isQdrantConfigured } from '../qdrant-secrets';

const PAYLOAD_INDEX_FIELDS = [
  'userUuid',
  'documentUuid',
  'spaceUuid',
  'sourceType',
  'chunkId',
  'memoryBlockUuid',
  'blockType',
  'scope',
  'scopeId',
] as const;

let cachedClient: QdrantClient | undefined;
const ensuredCollections = new Set<string>();

export async function createQdrantClient(): Promise<QdrantClient> {
  const config = await resolveQdrantConfig();
  return new QdrantClient({
    url: config.url,
    apiKey: config.apiKey,
  });
}

export async function getQdrantClient(): Promise<QdrantClient> {
  if (!cachedClient) {
    cachedClient = await createQdrantClient();
  }
  return cachedClient;
}

export class QdrantVectorStore implements VectorStore {
  readonly name = 'qdrant' as const;

  private readonly clientOverride?: QdrantClient;
  private readonly collectionName: string;

  constructor(client?: QdrantClient, collectionName?: string) {
    this.clientOverride = client;
    this.collectionName = collectionName ?? getQdrantCollectionName();
  }

  private async client(): Promise<QdrantClient> {
    return this.clientOverride ?? getQdrantClient();
  }

  async ensureCollection(dims: number): Promise<void> {
    const cacheKey = `${this.collectionName}:${dims}`;
    if (ensuredCollections.has(cacheKey)) return;

    const client = await this.client();
    const { collections } = await client.getCollections();
    const exists = collections.some((c) => c.name === this.collectionName);

    if (!exists) {
      await client.createCollection(this.collectionName, {
        vectors: {
          size: dims,
          distance: 'Cosine',
        },
      });
    }

    for (const field of PAYLOAD_INDEX_FIELDS) {
      try {
        await client.createPayloadIndex(this.collectionName, {
          field_name: field,
          field_schema: 'keyword',
          wait: true,
        });
      } catch (err) {
        console.warn(
          `[QdrantVectorStore] createPayloadIndex ${field} on ${this.collectionName}:`,
          err,
        );
      }
    }

    ensuredCollections.add(cacheKey);
  }

  async upsert(point: VectorPoint): Promise<void> {
    await this.upsertMany([point]);
  }

  async upsertMany(points: VectorPoint[]): Promise<void> {
    if (points.length === 0) return;

    const client = await this.client();
    await client.upsert(this.collectionName, {
      wait: true,
      points: points.map((point) => ({
        id: point.id,
        vector: point.vector,
        payload: payloadToQdrant(point.payload),
      })),
    });
  }

  async deleteById(id: string): Promise<void> {
    try {
      const client = await this.client();
      await client.delete(this.collectionName, {
        wait: true,
        points: [id],
      });
    } catch {
      // Point may not exist.
    }
  }

  async deleteByFilter(filter: VectorFilter): Promise<number> {
    const qdrantFilter = toQdrantFilter(filter);
    if (!qdrantFilter) return 0;

    const before = await this.countByFilter(filter);
    if (before === 0) return 0;

    const client = await this.client();
    await client.delete(this.collectionName, {
      wait: true,
      filter: qdrantFilter,
    });
    return before;
  }

  async countByFilter(filter: VectorFilter): Promise<number> {
    const qdrantFilter = toQdrantFilter(filter);
    const client = await this.client();
    const result = await client.count(this.collectionName, {
      filter: qdrantFilter,
      exact: true,
    });
    return result.count;
  }

  async search(
    vector: number[],
    filter: VectorFilter,
    k: number,
  ): Promise<VectorSearchHit[]> {
    const qdrantFilter = toQdrantFilter(filter);
    const client = await this.client();
    const results = await client.search(this.collectionName, {
      vector,
      limit: k,
      filter: qdrantFilter,
      with_payload: true,
    });

    return results.map((hit) => ({
      id: String(hit.id),
      score: hit.score ?? 0,
      payload: (hit.payload ?? {}) as unknown as VectorSearchHit['payload'],
    }));
  }
}

export function resetQdrantClientForTests(): void {
  cachedClient = undefined;
  ensuredCollections.clear();
  resetQdrantConfigForTests();
}
