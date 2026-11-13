'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useState } from 'react';

export function useMemoryClearApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isClearing, setIsClearing] = useState(false);

  const clearAll = useCallback(async () => {
    const userUuid = userAttributes?.userUuid;
    if (!userUuid) return 0;
    setIsClearing(true);
    try {
      const res = await client.mutations.clearUserMemory({ userUuid });
      return res.data?.deletedCount ?? 0;
    } finally {
      setIsClearing(false);
    }
  }, [client, userAttributes?.userUuid]);

  return { clearAll, isClearing };
}
