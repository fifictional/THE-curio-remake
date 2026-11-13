import type { Client } from '@opensearch-project/opensearch';
import { getOpensearchClient } from '../opensearch-lazy-client';
import { getOpenSearchIndexName } from './collection-name';
import type { VectorFilter, VectorPoint, VectorSearchHit, VectorStore } from './types';

function buildOpensearchFilters(filter: VectorFilter): object[] {
  const filters: object[] = [];

  if (filter.userUuid) {
    filters.push({ term: { userUuid: filter.userUuid } });
  }
  if (filter.spaceUuid) {
    filters.push({ term: { spaceUuid: filter.spaceUuid } });
  }
  if (filter.sourceType) {
    filters.push({ term: { sourceType: filter.sourceType } });
  }
  if (filter.memoryBlockUuid) {
    filters.push({ term: { memoryBlockUuid: filter.memoryBlockUuid } });
  }
  if (filter.blockType) {
    filters.push({ term: { blockType: filter.blockType } });
  }
  if (filter.documentUuid) {
    if (Array.isArray(filter.documentUuid)) {
      if (filter.documentUuid.length > 0) {
        filters.push({ terms: { documentUuid: filter.documentUuid } });
      }
    } else {
      filters.push({ term: { documentUuid: filter.documentUuid } });
    }
  }
  if (filter.memoryScopes && filter.memoryScopes.length > 0) {
    filters.push({
      bool: {
        should: filter.memoryScopes.map((scope) => ({
          bool: {
            must: [
              { term: { scope: scope.scope } },
              { term: { scopeId: scope.scopeId } },
            ],
          },
        })),
        minimum_should_match: 1,
      },
    });
  }

  return filters;
}

export class OpenSearchVectorStore implements VectorStore {
  readonly name = 'opensearch' as const;

  private readonly clientOverride?: Client;
  private readonly indexName: string;

  constructor(client?: Client, indexName?: string) {
    this.clientOverride = client;
    this.indexName = indexName ?? getOpenSearchIndexName();
  }

  private get client(): Client {
    return this.clientOverride ?? getOpensearchClient();
  }

  async ensureCollection(dims: number): Promise<void> {
    const existsResponse = await this.client.indices.exists({ index: this.indexName });
    const exists =
      typeof existsResponse === 'boolean'
        ? existsResponse
        : existsResponse.statusCode === 200 || existsResponse.body === true;

    if (exists) return;

    await this.client.indices.create({
      index: this.indexName,
      body: {
        settings: {
          index: { knn: true },
        },
        mappings: {
          properties: {
            userUuid: { type: 'keyword' },
            chunkId: { type: 'keyword' },
            documentUuid: { type: 'keyword' },
            chunkText: { type: 'text' },
            sourceType: { type: 'keyword' },
            spaceUuid: { type: 'keyword' },
            memoryBlockUuid: { type: 'keyword' },
            blockType: { type: 'keyword' },
            topic: { type: 'keyword' },
            scope: { type: 'keyword' },
            scopeId: { type: 'keyword' },
            embedding: {
              type: 'knn_vector',
              dimension: dims,
              method: {
                name: 'hnsw',
                engine: 'faiss',
                space_type: 'innerproduct',
              },
            },
            createdAt: { type: 'date' },
          },
        },
      },
    });
  }

  async upsert(point: VectorPoint): Promise<void> {
    await this.client.index({
      index: this.indexName,
      id: point.id,
      body: {
        ...point.payload,
        embedding: point.vector,
      },
      refresh: true,
    });
  }

  async upsertMany(points: VectorPoint[]): Promise<void> {
    for (const point of points) {
      await this.upsert(point);
    }
  }

  async deleteById(id: string): Promise<void> {
    try {
      await this.client.delete({ index: this.indexName, id });
    } catch {
      // id may not exist
    }
  }

  async deleteByFilter(filter: VectorFilter): Promise<number> {
    const filters = buildOpensearchFilters(filter);
    if (filters.length === 0) return 0;

    const res = await this.client.deleteByQuery({
      index: this.indexName,
      body: {
        query: {
          bool: { filter: filters },
        },
      },
      refresh: true,
    });
    return (res.body as { deleted?: number }).deleted ?? 0;
  }

  async countByFilter(filter: VectorFilter): Promise<number> {
    const filters = buildOpensearchFilters(filter);
    if (filters.length === 0) return 0;

    const res = await this.client.search({
      index: this.indexName,
      body: {
        size: 0,
        query: {
          bool: { filter: filters },
        },
      },
    });
    const totalHits = res.body.hits?.total;
    return typeof totalHits === 'number' ? totalHits : totalHits?.value ?? 0;
  }

  async search(
    vector: number[],
    filter: VectorFilter,
    k: number,
  ): Promise<VectorSearchHit[]> {
    const filters = buildOpensearchFilters(filter);

    const res = await this.client.search({
      index: this.indexName,
      body: {
        size: k,
        query: {
          bool: {
            filter: filters,
            must: [
              {
                knn: {
                  embedding: { vector, k },
                },
              },
            ],
          },
        },
      },
    });

    const hitsArray = res.body.hits?.hits ?? [];
    return hitsArray.map((hit) => {
      const src = (hit._source ?? {}) as Record<string, unknown>;
      return {
        id: String(hit._id ?? src.chunkId ?? ''),
        score: typeof hit._score === 'number' ? hit._score : Number(hit._score ?? 0),
        payload: src as unknown as VectorSearchHit['payload'],
      };
    });
  }
}

export { isOpensearchConfigured } from '../opensearch-lazy-client';
