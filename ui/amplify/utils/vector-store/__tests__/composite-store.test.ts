import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompositeVectorStore } from '../composite-store';
import type { VectorPoint, VectorStore } from '../types';

function mockStore(name: VectorStore['name'], impl: Partial<VectorStore>): VectorStore {
  return {
    name,
    ensureCollection: vi.fn().mockResolvedValue(undefined),
    upsert: vi.fn().mockResolvedValue(undefined),
    upsertMany: vi.fn().mockResolvedValue(undefined),
    deleteById: vi.fn().mockResolvedValue(undefined),
    deleteByFilter: vi.fn().mockResolvedValue(1),
    countByFilter: vi.fn().mockResolvedValue(2),
    search: vi.fn().mockResolvedValue([]),
    ...impl,
  };
}

describe('CompositeVectorStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fans out upserts to both stores', async () => {
    const opensearch = mockStore('opensearch', {});
    const qdrant = mockStore('qdrant', {});
    const composite = new CompositeVectorStore([opensearch, qdrant], 'opensearch');
    const point: VectorPoint = {
      id: 'chunk-1',
      vector: [0.1, 0.2],
      payload: { userUuid: 'u1', chunkId: 'chunk-1', chunkText: 'hello' },
    };

    await composite.upsert(point);

    expect(opensearch.upsert).toHaveBeenCalledWith(point);
    expect(qdrant.upsert).toHaveBeenCalledWith(point);
  });

  it('reads only from the primary store', async () => {
    const opensearch = mockStore('opensearch', {
      search: vi.fn().mockResolvedValue([{ id: 'a', score: 0.9, payload: {} }]),
    });
    const qdrant = mockStore('qdrant', {});
    const composite = new CompositeVectorStore([opensearch, qdrant], 'opensearch');

    const hits = await composite.search([0.1], { userUuid: 'u1' }, 3);

    expect(hits).toHaveLength(1);
    expect(opensearch.search).toHaveBeenCalledOnce();
    expect(qdrant.search).not.toHaveBeenCalled();
  });

  it('succeeds when secondary upsert fails but primary succeeds', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const opensearch = mockStore('opensearch', {});
    const qdrant = mockStore('qdrant', {
      upsert: vi.fn().mockRejectedValue(new Error('qdrant down')),
    });
    const composite = new CompositeVectorStore([opensearch, qdrant], 'opensearch');

    await expect(
      composite.upsert({
        id: 'x',
        vector: [1],
        payload: { userUuid: 'u', chunkId: 'x', chunkText: 't' },
      }),
    ).resolves.toBeUndefined();

    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('throws when primary upsert fails even if secondary succeeds', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const opensearch = mockStore('opensearch', {
      upsert: vi.fn().mockRejectedValue(new Error('opensearch down')),
    });
    const qdrant = mockStore('qdrant', {});
    const composite = new CompositeVectorStore([opensearch, qdrant], 'opensearch');

    await expect(
      composite.upsert({
        id: 'x',
        vector: [1],
        payload: { userUuid: 'u', chunkId: 'x', chunkText: 't' },
      }),
    ).rejects.toThrow('opensearch down');
  });

  it('returns primary delete count from deleteByFilter', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const opensearch = mockStore('opensearch', {
      deleteByFilter: vi.fn().mockResolvedValue(4),
    });
    const qdrant = mockStore('qdrant', {
      deleteByFilter: vi.fn().mockResolvedValue(9),
    });
    const composite = new CompositeVectorStore([opensearch, qdrant], 'opensearch');

    const deleted = await composite.deleteByFilter({ userUuid: 'u1' });

    expect(deleted).toBe(4);
  });
});
