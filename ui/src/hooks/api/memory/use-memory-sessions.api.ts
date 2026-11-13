'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useEffect, useState } from 'react';

export function useMemorySessionsApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [sessionCount, setSessionCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const userUuid = userAttributes?.userUuid;
    if (!userUuid) return;
    const res = await client.models.Chat.listChatByUserUuidAndCreatedAt(
      { userUuid },
      { limit: 500 }
    );
    setSessionCount(res.data?.length ?? 0);
  }, [client, userAttributes?.userUuid]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sessionCount, refresh };
}
