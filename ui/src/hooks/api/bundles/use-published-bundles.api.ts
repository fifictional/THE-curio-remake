import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import type { PublicBundle } from "@/lib/types/bundle";

export const usePublishedBundlesApi = () => {
  const client = useAmplifyApiClient();

  const listPublished = useCallback(async (): Promise<PublicBundle[]> => {
    const response = await client.models.Bundle.list();
    const items = response.data || [];
    const filtered = items.filter((b: any) => !!b.published);
    const sorted = filtered.sort((a: any, b: any) => {
      const byOrder = (a.order ?? 0) - (b.order ?? 0);
      if (byOrder !== 0) return byOrder;
      return (a.name || '').localeCompare(b.name || '');
    });
    // Omit audit fields in return type via mapping to PublicBundle
    return sorted.map((b: any) => ({
      bundleUuid: b.bundleUuid,
      name: b.name,
      description: b.description,
      order: b.order,
      sku: b.sku,
      modules: b.modules,
      published: b.published,
    }));
  }, []);

  const { data, isLoading } = useQuery({ queryKey: ['publishedBundles'], queryFn: listPublished });

  return {
    bundles: (data || []) as PublicBundle[],
    isLoading,
  };
};


