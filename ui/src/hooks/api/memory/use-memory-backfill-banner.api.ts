'use client';

import { useAmplifyApiClient, useSessionContext } from '@/providers';
import { useCallback, useEffect, useState } from 'react';

export interface MemoryBackfillBanner {
  gaps: number;
  mastered: number;
}

const BANNER_META = 'memory_backfill_banner';

export function useMemoryBackfillBannerApi() {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [banner, setBanner] = useState<MemoryBackfillBanner | null>(null);

  const userUuid = userAttributes?.userUuid;

  const loadBanner = useCallback(async () => {
    if (!userUuid) return;
    const res = await client.models.Metadata.list({
      filter: {
        targetUuid: { eq: userUuid },
        targetType: { eq: 'user' },
        name: { eq: BANNER_META },
      },
      limit: 1,
    });
    const row = res.data?.[0];
    if (!row?.value) {
      setBanner(null);
      return;
    }
    try {
      setBanner(JSON.parse(row.value) as MemoryBackfillBanner);
    } catch {
      setBanner(null);
    }
  }, [client, userUuid]);

  const dismissBanner = useCallback(async () => {
    if (!userUuid) return;
    const res = await client.models.Metadata.list({
      filter: {
        targetUuid: { eq: userUuid },
        targetType: { eq: 'user' },
        name: { eq: BANNER_META },
      },
      limit: 1,
    });
    const row = res.data?.[0];
    if (row?.metadataUuid) {
      await client.models.Metadata.delete({ metadataUuid: row.metadataUuid });
    }
    setBanner(null);
  }, [client, userUuid]);

  useEffect(() => {
    void loadBanner();
  }, [loadBanner]);

  return { banner, dismissBanner, refreshBanner: loadBanner };
}
