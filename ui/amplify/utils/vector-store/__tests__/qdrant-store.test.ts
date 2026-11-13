import { afterEach, describe, expect, it, vi } from 'vitest';
import { QdrantVectorStore } from '../qdrant-store';

describe('QdrantVectorStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('upserts points with collection filter payload', async () => {
    const upsert = vi.fn().mockResolvedValue(undefined);
    const getCollections = vi.fn().mockResolvedValue({ collections: [{ name: 'curio-vectors' }] });
    const createPayloadIndex = vi.fn().mockResolvedValue(undefined);
    const client = {
      getCollections,
      createPayloadIndex,
      upsert,
    };

    const store = new QdrantVectorStore(client as any, 'curio-vectors');
    await store.upsert({
      id: 'chunk-1',
      vector: [0.5, 0.6],
      payload: {
        userUuid: 'user-1',
        chunkId: 'chunk-1',
        chunkText: 'hello',
        documentUuid: 'doc-1',
      },
    });

    expect(upsert).toHaveBeenCalledWith(
      'curio-vectors',
      expect.objectContaining({
        wait: true,
        points: [
          expect.objectContaining({
            id: 'chunk-1',
            payload: expect.objectContaining({
              userUuid: 'user-1',
              documentUuid: 'doc-1',
            }),
          }),
        ],
      }),
    );
  });

  it('deleteByFilter returns count before delete', async () => {
    const count = vi.fn().mockResolvedValue({ count: 3 });
    const del = vi.fn().mockResolvedValue(undefined);
    const getCollections = vi.fn().mockResolvedValue({ collections: [{ name: 'curio-vectors' }] });
    const createPayloadIndex = vi.fn().mockResolvedValue(undefined);
    const client = {
      getCollections,
      createPayloadIndex,
      count,
      delete: del,
    };

    const store = new QdrantVectorStore(client as any, 'curio-vectors');
    const deleted = await store.deleteByFilter({
      userUuid: 'user-1',
      documentUuid: 'doc-1',
    });

    expect(deleted).toBe(3);
    expect(del).toHaveBeenCalled();
  });
});
