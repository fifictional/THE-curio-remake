'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useState } from 'react';

export function useMemoryBackfillApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isRunning, setIsRunning] = useState(false);

  const runBackfill = useCallback(async () => {
    const userUuid = userAttributes?.userUuid;
    if (!userUuid) return null;
    setIsRunning(true);
    try {
      const result = await client.mutations.runMemoryBackfill({ userUuid });
      return result.data;
    } finally {
      setIsRunning(false);
    }
  }, [client, userAttributes?.userUuid]);

  return { runBackfill, isRunning };
}
