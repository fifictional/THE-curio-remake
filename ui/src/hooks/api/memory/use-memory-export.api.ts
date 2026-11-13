'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useState } from 'react';

export function useMemoryExportApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportProfile = useCallback(async () => {
    const userUuid = userAttributes?.userUuid;
    if (!userUuid) return;
    setIsExporting(true);
    setError(null);
    try {
      const result = await client.mutations.exportLearningProfile({ userUuid });
      const data = result.data;
      if (!data?.success || !data.downloadUrl) {
        throw new Error(data?.error ?? 'Export failed');
      }
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [client, userAttributes?.userUuid]);

  return { exportProfile, isExporting, error };
}
