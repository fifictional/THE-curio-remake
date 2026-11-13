/** Space-scoped RAG content stored in the vector index. */
export type RagSourceType = 'flashcard' | 'chat_summary';

export type MemorySourceType = 'memory_block';

export type VectorSourceType = RagSourceType | MemorySourceType;

/** Payload stored alongside each vector (mirrors OpenSearch _source). */
export interface VectorPayload {
  userUuid: string;
  chunkId: string;
  chunkText: string;
  documentUuid?: string;
  sourceType?: VectorSourceType;
  spaceUuid?: string;
  memoryBlockUuid?: string;
  blockType?: string;
  topic?: string;
  scope?: string;
  scopeId?: string;
  createdAt?: string;
}

export interface VectorPoint {
  /** UUID string — chunkId or memoryBlockUuid. */
  id: string;
  vector: number[];
  payload: VectorPayload;
}

export interface MemoryScopeFilter {
  scope: string;
  scopeId: string;
}

export interface VectorFilter {
  userUuid?: string;
  documentUuid?: string | string[];
  spaceUuid?: string;
  sourceType?: string;
  memoryBlockUuid?: string;
  blockType?: string;
  memoryScopes?: MemoryScopeFilter[];
}

export interface VectorSearchHit {
  id: string;
  score: number;
  payload: VectorPayload;
}

export interface VectorStore {
  readonly name: 'opensearch' | 'qdrant';

  ensureCollection(dims: number): Promise<void>;

  upsert(point: VectorPoint): Promise<void>;

  upsertMany(points: VectorPoint[]): Promise<void>;

  deleteById(id: string): Promise<void>;

  deleteByFilter(filter: VectorFilter): Promise<number>;

  countByFilter(filter: VectorFilter): Promise<number>;

  search(
    vector: number[],
    filter: VectorFilter,
    k: number,
  ): Promise<VectorSearchHit[]>;
}

export type VectorStoreMode = 'opensearch' | 'qdrant' | 'dual';
