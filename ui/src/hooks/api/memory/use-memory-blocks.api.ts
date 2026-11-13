'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { MemoryBlock, MemoryBlockType } from '@/lib/types/memory-block';
import { useCallback, useEffect, useState } from 'react';

export function useMemoryBlocksApi(blockType?: MemoryBlockType) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [blocks, setBlocks] = useState<MemoryBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userUuid = userAttributes?.userUuid;

  const refresh = useCallback(async () => {
    if (!userUuid) return;
    setIsLoading(true);
    setError(null);
    try {
      const result =
        await client.models.MemoryBlock.listMemoryBlockByOwnerUuidAndUpdatedAt(
          { ownerUuid: userUuid },
          {
            sortDirection: 'DESC',
            limit: 100,
            ...(blockType
              ? { filter: { blockType: { eq: blockType } } }
              : {}),
          }
        );
      setBlocks((result.data ?? []) as MemoryBlock[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load memory');
    } finally {
      setIsLoading(false);
    }
  }, [client, userUuid, blockType]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const deleteBlock = useCallback(
    async (memoryBlockUuid: string) => {
      await client.models.MemoryBlock.delete({ memoryBlockUuid });
      setBlocks((prev) => prev.filter((b) => b.memoryBlockUuid !== memoryBlockUuid));
    },
    [client]
  );

  return { blocks, isLoading, error, refresh, deleteBlock };
}
