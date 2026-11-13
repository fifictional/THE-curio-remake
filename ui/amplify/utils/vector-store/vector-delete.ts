import {
  getWriteVectorStore,
  isVectorStoreConfigured,
} from './get-vector-store';

const MEMORY_SOURCE_TYPE = 'memory_block';

export async function deleteVectorsForDocument(
  documentUuid: string,
): Promise<number> {
  if (!isVectorStoreConfigured()) return 0;

  const store = getWriteVectorStore();
  return store.deleteByFilter({ documentUuid });
}

export async function deleteVectorsForUser(userUuid: string): Promise<number> {
  if (!isVectorStoreConfigured()) return 0;

  const store = getWriteVectorStore();
  return store.deleteByFilter({ userUuid });
}

export async function deleteMemoryVectorsForUser(
  ownerUuid: string,
): Promise<number> {
  if (!isVectorStoreConfigured()) return 0;

  const store = getWriteVectorStore();
  return store.deleteByFilter({
    userUuid: ownerUuid,
    sourceType: MEMORY_SOURCE_TYPE,
  });
}
