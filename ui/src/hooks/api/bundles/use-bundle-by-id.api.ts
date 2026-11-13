import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useQuery } from "@tanstack/react-query";
import { useCallback } from "react";
import type { PublicBundle } from "@/lib/types/bundle";
import { Schema } from "@amplify/data/resource";

type PublicBundleKeys = 'bundleUuid' | 'name' | 'description' | 'order' | 'defaultSku' | 'additionalSkus' | 'modules' | 'published';
type PublicBundleRequest = Pick<Schema['Bundle']['type'], PublicBundleKeys>;

const publicBundleSelectionSet = [
  'bundleUuid',
  'name',
  'description',
  'order',
  'defaultSku',
  'additionalSkus',
  'modules',
  'published',
];

export const useBundleByIdApi = (bundleUuid: string | null) => {
  const client = useAmplifyApiClient();

  const getBundle = useCallback(async (): Promise<PublicBundle | null> => {
    if (!bundleUuid) return null;
    const response = await client.models.Bundle.get({ bundleUuid }, {
      selectionSet: publicBundleSelectionSet as any,
    });
    const b = response.data as PublicBundleRequest | null;
    if (!b) return null;
    if (!b.published) return null; // customer-facing: hide drafts
    return b as unknown as PublicBundle;
  }, [bundleUuid]);

  const { data, isLoading } = useQuery({ queryKey: ['bundleById', bundleUuid], queryFn: getBundle, enabled: !!bundleUuid });

  return {
    bundle: (data || null) as PublicBundle | null,
    isLoading,
  };
};


