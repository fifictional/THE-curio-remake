import { CompositeVectorStore } from './composite-store';
import { OpenSearchVectorStore } from './opensearch-store';
import { QdrantVectorStore } from './qdrant-store';
import { isQdrantConfigured } from '../qdrant-secrets';
import { isOpensearchConfigured } from '../opensearch-lazy-client';
import type { VectorStore, VectorStoreMode } from './types';

export function getVectorStoreMode(): VectorStoreMode {
  const mode = (process.env.VECTOR_STORE ?? 'opensearch').toLowerCase();
  if (mode === 'qdrant' || mode === 'dual') return mode;
  return 'opensearch';
}

export function isVectorStoreConfigured(): boolean {
  const mode = getVectorStoreMode();
  if (mode === 'qdrant') return isQdrantConfigured();
  if (mode === 'dual') return isOpensearchConfigured() || isQdrantConfigured();
  return isOpensearchConfigured();
}

function buildOpenSearchStore(): OpenSearchVectorStore | null {
  if (!isOpensearchConfigured()) return null;
  return new OpenSearchVectorStore();
}

function buildQdrantStore(): QdrantVectorStore | null {
  if (!isQdrantConfigured()) return null;
  return new QdrantVectorStore();
}

/** Store used for reads (single backend). */
export function getReadVectorStore(): VectorStore {
  const mode = getVectorStoreMode();

  if (mode === 'qdrant') {
    const store = buildQdrantStore();
    if (!store) {
      throw new Error('VECTOR_STORE=qdrant but QDRANT_URL is not configured');
    }
    return store;
  }

  const opensearch = buildOpenSearchStore();
  if (!opensearch) {
    throw new Error('VECTOR_STORE=opensearch but OPENSEARCH_ENDPOINT is not configured');
  }
  return opensearch;
}

/** Store(s) used for writes — dual mode writes to both backends when configured. */
export function getWriteVectorStore(): VectorStore {
  const mode = getVectorStoreMode();

  if (mode === 'dual') {
    const stores: VectorStore[] = [];
    const opensearch = buildOpenSearchStore();
    const qdrant = buildQdrantStore();
    if (opensearch) stores.push(opensearch);
    if (qdrant) stores.push(qdrant);
    if (stores.length === 0) {
      throw new Error('VECTOR_STORE=dual but neither OpenSearch nor Qdrant is configured');
    }
    if (stores.length === 1) {
      const missing = opensearch ? 'Qdrant' : 'OpenSearch';
      console.warn(
        `[vector-store] VECTOR_STORE=dual but only ${stores[0].name} is configured — writes are single-store (${missing} missing)`,
      );
      return stores[0];
    }
    return new CompositeVectorStore(stores, 'opensearch');
  }

  return getReadVectorStore();
}
