import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getReadVectorStore,
  getVectorStoreMode,
  getWriteVectorStore,
} from '../get-vector-store';
import { getOpenSearchIndexName, getQdrantCollectionName } from '../collection-name';
import { resetOpensearchClientForTests } from '../../opensearch-lazy-client';
import { resetQdrantClientForTests } from '../qdrant-store';

describe('get-vector-store', () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    resetOpensearchClientForTests();
    resetQdrantClientForTests();
    vi.restoreAllMocks();
  });

  it('defaults to opensearch mode', () => {
    delete process.env.VECTOR_STORE;
    expect(getVectorStoreMode()).toBe('opensearch');
  });

  it('returns OpenSearchVectorStore when VECTOR_STORE=opensearch', () => {
    process.env.VECTOR_STORE = 'opensearch';
    process.env.OPENSEARCH_ENDPOINT = 'https://search.example.com';
    delete process.env.QDRANT_URL;

    expect(getReadVectorStore().name).toBe('opensearch');
    expect(getWriteVectorStore().name).toBe('opensearch');
  });

  it('returns QdrantVectorStore when VECTOR_STORE=qdrant', () => {
    process.env.VECTOR_STORE = 'qdrant';
    process.env.QDRANT_URL = 'https://qdrant.example.com';
    delete process.env.OPENSEARCH_ENDPOINT;

    expect(getReadVectorStore().name).toBe('qdrant');
  });

  it('dual-write wraps both stores when both are configured', () => {
    process.env.VECTOR_STORE = 'dual';
    process.env.OPENSEARCH_ENDPOINT = 'https://search.example.com';
    process.env.OPENSEARCH_INDEX = 'rag-documents';
    process.env.QDRANT_COLLECTION = 'curio-vectors';
    process.env.QDRANT_URL = 'https://qdrant.example.com';

    const writeStore = getWriteVectorStore();
    expect(writeStore.name).toBe('opensearch');
    expect(writeStore.constructor.name).toBe('CompositeVectorStore');
  });

  it('warns when dual mode falls back to a single store', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    process.env.VECTOR_STORE = 'dual';
    process.env.OPENSEARCH_ENDPOINT = 'https://search.example.com';
    delete process.env.QDRANT_URL;
    delete process.env.QDRANT_SECRET_NAME;

    const writeStore = getWriteVectorStore();
    expect(writeStore.name).toBe('opensearch');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('VECTOR_STORE=dual but only opensearch is configured'),
    );
    warn.mockRestore();
  });

  it('uses separate index and collection names per store', () => {
    process.env.OPENSEARCH_INDEX = 'rag-documents';
    process.env.QDRANT_COLLECTION = 'curio-vectors';
    expect(getOpenSearchIndexName()).toBe('rag-documents');
    expect(getQdrantCollectionName()).toBe('curio-vectors');
  });
});
