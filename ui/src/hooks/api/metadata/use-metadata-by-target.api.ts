import { useAmplifyApiClient } from "@/providers";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";

export type Metadata = {
  metadataUuid: string;
  targetUuid: string;
  targetType: string;
  name: string;
  value: string;
  createdAt: string;
  updatedAt: string;
};

export function useMetadataByTargetApi(targetUuid: string | null) {
  const client = useAmplifyApiClient();

  const getMetadata = useCallback(async (): Promise<Metadata[]> => {
    if (!targetUuid) return [];

    const response = await client.models.Metadata.list({
      filter: { targetUuid: { eq: targetUuid } },
      selectionSet: [
        'metadataUuid',
        'targetUuid',
        'targetType',
        'name',
        'value',
        'createdAt',
        'updatedAt',
      ],
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return (response.data || []) as Metadata[];
  }, [client, targetUuid]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['metadata', targetUuid],
    queryFn: getMetadata,
    enabled: !!targetUuid,
  });

  return {
    metadata: data || [],
    isLoading,
    error,
    refetch,
  };
}

