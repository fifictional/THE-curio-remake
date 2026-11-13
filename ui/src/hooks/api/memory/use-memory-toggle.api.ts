'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useEffect, useState } from 'react';

export function useMemoryToggleApi() {
  const client = useAmplifyApiClient();
  const { userAttributes, userProfile } = useSessionContext();
  const [memoryEnabled, setMemoryEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setMemoryEnabled(userProfile?.memoryDisabled !== true);
  }, [userProfile?.memoryDisabled]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const userUuid = userAttributes?.userUuid;
      if (!userUuid) return;
      setIsSaving(true);
      try {
        await client.models.UserProfile.update({
          userUuid,
          memoryDisabled: !enabled,
        });
        setMemoryEnabled(enabled);
      } finally {
        setIsSaving(false);
      }
    },
    [client, userAttributes?.userUuid]
  );

  return { memoryEnabled, setEnabled, isSaving };
}
