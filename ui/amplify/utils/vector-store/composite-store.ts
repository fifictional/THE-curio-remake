import type { VectorFilter, VectorPoint, VectorSearchHit, VectorStore } from './types';

/** Writes to every configured backend; reads from the first store only. */
export class CompositeVectorStore implements VectorStore {
  readonly name: VectorStore['name'];

  constructor(
    private readonly stores: VectorStore[],
    primary: VectorStore['name'] = stores[0]?.name ?? 'opensearch',
  ) {
    if (stores.length === 0) {
      throw new Error('CompositeVectorStore requires at least one store');
    }
    this.name = primary;
  }

  private primaryStore(): VectorStore {
    const primary = this.stores.find((s) => s.name === this.name);
    return primary ?? this.stores[0];
  }

  private async fanOutVoid(
    operation: string,
    fn: (store: VectorStore) => Promise<void>,
  ): Promise<void> {
    const results = await Promise.allSettled(this.stores.map(fn));
    const primaryIdx = this.stores.findIndex((s) => s.name === this.primaryStore().name);

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.warn(
          `[vector-store] ${operation} failed on ${this.stores[i].name}:`,
          (results[i] as PromiseRejectedResult).reason,
        );
      }
    }

    if (primaryIdx >= 0 && results[primaryIdx].status === 'rejected') {
      throw (results[primaryIdx] as PromiseRejectedResult).reason;
    }
  }

  private async fanOutCount(
    operation: string,
    fn: (store: VectorStore) => Promise<number>,
  ): Promise<number> {
    const primary = this.primaryStore();
    const results = await Promise.allSettled(this.stores.map(fn));

    for (let i = 0; i < results.length; i++) {
      if (results[i].status === 'rejected') {
        console.warn(
          `[vector-store] ${operation} failed on ${this.stores[i].name}:`,
          (results[i] as PromiseRejectedResult).reason,
        );
      }
    }

    const primaryIdx = this.stores.indexOf(primary);
    const primaryResult = results[primaryIdx];
    if (primaryResult.status === 'rejected') {
      throw (primaryResult as PromiseRejectedResult).reason;
    }
    return (primaryResult as PromiseFulfilledResult<number>).value;
  }

  async ensureCollection(dims: number): Promise<void> {
    await this.fanOutVoid('ensureCollection', (store) => store.ensureCollection(dims));
  }

  async upsert(point: VectorPoint): Promise<void> {
    await this.fanOutVoid('upsert', (store) => store.upsert(point));
  }

  async upsertMany(points: VectorPoint[]): Promise<void> {
    await this.fanOutVoid('upsertMany', (store) => store.upsertMany(points));
  }

  async deleteById(id: string): Promise<void> {
    await this.fanOutVoid('deleteById', (store) => store.deleteById(id));
  }

  async deleteByFilter(filter: VectorFilter): Promise<number> {
    return this.fanOutCount('deleteByFilter', (store) => store.deleteByFilter(filter));
  }

  async countByFilter(filter: VectorFilter): Promise<number> {
    return this.primaryStore().countByFilter(filter);
  }

  async search(
    vector: number[],
    filter: VectorFilter,
    k: number,
  ): Promise<VectorSearchHit[]> {
    return this.primaryStore().search(vector, filter, k);
  }
}
