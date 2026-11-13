import { useAmplifyApiClient, useAmplifyUserApiClient } from "@/providers/amplify-provider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { v4 as uuidv4 } from 'uuid';
import type { Bundle, BundleFormType } from "@/lib/types/bundle";
import { useSessionContext } from "@/providers/session-provider";
import { Schema } from "@amplify/data/resource";

const combineProviderSku = (provider: string, id: string) => `${provider}:${id}`;

type BundleSelectionSetType =
  | 'bundleUuid' | 'name' | 'description' | 'order'
  | 'defaultSku' | 'additionalSkus' | 'modules' | 'published'
  | 'createdAt' | 'updatedAt' | 'publishedAt' | 'createdBy' | 'updatedBy';

type AdminBundleRequest = Pick<Schema['Bundle']['type'], BundleSelectionSetType>;

const bundleSelectionSet = [
  'bundleUuid',
  'name',
  'description',
  'order',
  'defaultSku',
  'additionalSkus',
  'modules',
  'published',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'createdBy',
  'updatedBy',
];

export const useBundlesApi = () => {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const userClient = useAmplifyUserApiClient();
  const { userAttributes } = useSessionContext();

  const getBundles = useCallback(async (): Promise<Bundle[]> => {
    const response = await client.models.Bundle.list({
      selectionSet: bundleSelectionSet as any,
    });
    
    if (response.errors) {
      console.error('[use-bundles-api] Errors fetching bundles:', response.errors);
      throw new Error(response.errors[0].message);
    }
    
    const items = (response.data || []) as AdminBundleRequest[];
    // Client-side sort by order asc then name asc
    return [...items].sort((a: any, b: any) => {
      const byOrder = (a.order ?? 0) - (b.order ?? 0);
      if (byOrder !== 0) return byOrder;
      return (a.name || '').localeCompare(b.name || '');
    }) as unknown as Bundle[];
  }, []);

  const deleteBundleFunc = useCallback(async (bundleUuid: string) => {
    const response = await userClient.models.Bundle.delete({ bundleUuid });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    queryClient.invalidateQueries({ queryKey: ['bundles'] });
  }, []);

  const createBundleFunc = useCallback(async (form: BundleFormType) => {
    const now = new Date().toISOString();
    const payload: any = {
      bundleUuid: uuidv4(),
      name: form.name,
      description: form.description || null,
      order: Number.isFinite(form.order as any) ? form.order : 0,
      defaultSku: form.skuDefault || null,
      additionalSkus: (form.skuAdditional || [])
        .filter((p) => p.provider && p.id)
        .map((p) => combineProviderSku(p.provider.toLowerCase(), p.id)),
      modules: Array.from(new Set(form.modules || [])),
      published: !!form.published,
      createdAt: now,
      updatedAt: now,
      publishedAt: form.published ? now : null,
      createdBy: userAttributes?.userUuid || null,
      updatedBy: userAttributes?.userUuid || null,
    };

    const response = await userClient.models.Bundle.create(payload);
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    queryClient.invalidateQueries({ queryKey: ['bundles'] });
  }, [userAttributes?.userUuid]);

  const updateBundleFunc = useCallback(async (bundleUuid: string, form: BundleFormType & Partial<Bundle>) => {
    const now = new Date().toISOString();
    const payload: any = {
      bundleUuid,
      name: form.name,
      description: form.description || null,
      order: Number.isFinite(form.order as any) ? form.order : 0,
      defaultSku: form.skuDefault || null,
      additionalSkus: (form.skuAdditional || [])
        .filter((p) => p.provider && p.id)
        .map((p) => combineProviderSku(p.provider.toLowerCase(), p.id)),
      modules: Array.from(new Set(form.modules || [])),
      published: !!form.published,
      updatedAt: now,
      publishedAt: form.published ? (form.publishedAt || now) : null,
      updatedBy: userAttributes?.userUuid || null,
    };
    const response = await userClient.models.Bundle.update(payload);
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    queryClient.invalidateQueries({ queryKey: ['bundles'] });
  }, [userAttributes?.userUuid]);

  const { mutateAsync: createBundle } = useMutation({ mutationFn: createBundleFunc });
  const { mutateAsync: updateBundle } = useMutation({ mutationFn: ({ bundleUuid, form }: { bundleUuid: string; form: BundleFormType & Partial<Bundle> }) => updateBundleFunc(bundleUuid, form) });
  const { mutateAsync: deleteBundle } = useMutation({ mutationFn: deleteBundleFunc });

  const { data, isLoading } = useQuery({ queryKey: ['bundles'], queryFn: getBundles });

  const duplicateNameChecker = useMemo(() => {
    const names = new Set((data || []).map((b) => (b.name || '').trim().toLowerCase()));
    return (candidate: string) => names.has((candidate || '').trim().toLowerCase());
  }, [data]);

  // TODO: listPurchased(userUuid): return bundles purchased by user
  // Needs implementing later when entitlement system is wired

  return {
    bundles: data as Bundle[] | undefined,
    isLoading,
    createBundle,
    updateBundle,
    deleteBundle,
    isDuplicateName: duplicateNameChecker,
  };
};



