/** OpenSearch index for RAG + memory vectors (legacy: rag-documents). */
export function getOpenSearchIndexName(): string {
  return process.env.OPENSEARCH_INDEX || 'rag-documents';
}

/** Qdrant collection name (separate from OpenSearch index in dual mode). */
export function getQdrantCollectionName(): string {
  return process.env.QDRANT_COLLECTION || 'curio-vectors';
}

/**
 * @deprecated Use getOpenSearchIndexName() or getQdrantCollectionName() explicitly.
 */
export function getVectorCollectionName(): string {
  return getOpenSearchIndexName();
}
