import { useAmplifyApiClient, useAmplifyUserApiClient } from "@/providers";
import { useSessionContext } from "@/providers/session-provider";
import { Bundle, BundlePurchaseSource, Purchase, Receipt } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { Schema } from "@amplify/data/resource";
import { v4 as uuidv4 } from "uuid";
import { ExamModule } from "@/lib/types/exam-module";

type PurchaseSelectionSet =
  | 'userId'
  | 'bundleUuid'
  | 'purchasedAt'
  | 'source'
  | 'receiptId'
  | 'revokedAt'
  | 'revokedBy'
  | 'revokeReason'
  | 'createdAt'
  | 'updatedAt';

type PurchaseRequest = Pick<Schema['Purchase']['type'], PurchaseSelectionSet>;

const purchaseSelectionSet: PurchaseSelectionSet[] = [
  'userId',
  'bundleUuid',
  'purchasedAt',
  'source',
  'receiptId',
  'revokedAt',
  'revokedBy',
  'revokeReason',
  'createdAt',
  'updatedAt',
];

const isActivePurchase = (purchase: Purchase) => !purchase.revokedAt;

export type PurchaseWithBundle = Purchase & { bundle?: Bundle | null; receipt?: Receipt | null };

export const usePurchasedBundlesApi = (targetUserId?: string | null) => {
  const client = useAmplifyApiClient();
  const userClient = useAmplifyUserApiClient();
  const queryClient = useQueryClient();

  const getPurchases = useCallback(async (): Promise<Purchase[]> => {
    if (!targetUserId) return [];
    // Purchase reads now require authentication; use userClient for read
    const response = await userClient.models.Purchase.list({
      filter: { userId: { eq: targetUserId } },
      selectionSet: purchaseSelectionSet as any,
    });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    const rawPurchases = (response.data || []) as PurchaseRequest[];

    const receiptIds = rawPurchases
      .map((purchase) => purchase.receiptId)
      .filter((id): id is string => !!id);

    let receiptsById = new Map<string, Receipt>();
    if (receiptIds.length > 0) {
      const uniqueReceiptIds = Array.from(new Set(receiptIds));
      const receiptResponses = await Promise.all(
        uniqueReceiptIds.map(async (receiptId) => {
          const receiptResponse = await userClient.models.Receipt.get({ receiptId });
          if (receiptResponse.data) {
            return receiptResponse.data as unknown as Receipt;
          }
          return null;
        })
      );
      receiptsById = new Map(
        receiptResponses.filter((receipt): receipt is Receipt => !!receipt).map((receipt) => [receipt.receiptId, receipt])
      );
    }

    return rawPurchases.map((purchase) => ({
      ...purchase,
      receipt: purchase.receiptId ? receiptsById.get(purchase.receiptId) ?? null : null,
    })) as PurchaseWithBundle[];
  }, [userClient, targetUserId]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['purchases', targetUserId],
    queryFn: getPurchases,
    enabled: !!targetUserId,
  });

  const purchases = useMemo(() => (data || []) as PurchaseWithBundle[], [data]);
  const activePurchases = useMemo(() => purchases.filter(isActivePurchase), [purchases]);

  const grantPurchase = useCallback(async (payload: {
    bundleUuid: string;
    modifyingUserId: string;
    source?: BundlePurchaseSource;
    purchasedAt?: string;
    receiptId?: string | null;
    receiptPayload?: Record<string, unknown> | null;
  }) => {
    if (!targetUserId) throw new Error('Missing target user uuid');
    const now = new Date().toISOString();
    const { bundleUuid, modifyingUserId, source = 'manual', purchasedAt = now, receiptId, receiptPayload } = payload;

    let receiptResult: { createdReceiptId: string | null } = { createdReceiptId: null };
    if (receiptPayload) {
      const receiptResponse = await userClient.models.Receipt.create({
        receiptId: receiptId || uuidv4(),
        userId: targetUserId,
        provider: source,
        payload: receiptPayload as any,
        createdAt: now,
        updatedAt: now,
      });
      if (receiptResponse.errors) {
        throw new Error(receiptResponse.errors[0].message);
      }
      receiptResult = { createdReceiptId: receiptResponse.data?.receiptId ?? null };
    }

    const response = await userClient.models.Purchase.create({
      userId: targetUserId,
      bundleUuid,
      purchasedAt,
      source,
      receiptId: receiptResult.createdReceiptId || receiptId || null,
      createdAt: now,
      updatedAt: now,
    });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    await refetch();
  }, [targetUserId, refetch, userClient]);

  const revokePurchase = useCallback(async ({ bundleUuid, modifyingUserId, revokeReason }: { bundleUuid: string; modifyingUserId: string; revokeReason?: string | null; }) => {
    if (!targetUserId) throw new Error('Missing target user uuid');
    const now = new Date().toISOString();
    const response = await userClient.models.Purchase.update({
      userId: targetUserId,
      bundleUuid,
      revokedAt: now,
      revokedBy: modifyingUserId,
      revokeReason: revokeReason || null,
      updatedAt: now,
    });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    await refetch();
  }, [targetUserId, refetch, userClient]);

  const deletePurchase = useCallback(async ({ bundleUuid }: { bundleUuid: string }) => {
    if (!targetUserId) throw new Error('Missing target user uuid');
    const response = await userClient.models.Purchase.delete({
      userId: targetUserId,
      bundleUuid,
    });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    await refetch();
  }, [targetUserId, refetch, userClient]);

  const reinstatePurchase = useCallback(async ({ bundleUuid }: { bundleUuid: string }) => {
    if (!targetUserId) throw new Error('Missing target user uuid');
    const now = new Date().toISOString();
    const response = await userClient.models.Purchase.update({
      userId: targetUserId,
      bundleUuid,
      revokedAt: null,
      revokedBy: null,
      revokeReason: null,
      updatedAt: now,
    });
    if (response.errors) {
      throw new Error(response.errors[0].message);
    }
    await refetch();
  }, [targetUserId, refetch, userClient]);

  const { mutateAsync: grant } = useMutation({ mutationFn: grantPurchase, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases', targetUserId] }) });
  const { mutateAsync: revoke } = useMutation({ mutationFn: revokePurchase, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases', targetUserId] }) });
  const { mutateAsync: remove } = useMutation({ mutationFn: deletePurchase, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases', targetUserId] }) });
  const { mutateAsync: reinstate } = useMutation({ mutationFn: reinstatePurchase, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['purchases', targetUserId] }) });

  return {
    purchases,
    activePurchases,
    isLoading,
    refetch,
    grant,
    revoke,
    reinstate,
    remove,
  };
};

const ownedBundleSelectionSet = ['bundleUuid', 'modules', 'published'] as const;

export const useOwnedBundlesApi = () => {
  const { userAttributes } = useSessionContext();
  const { isUserSubscribed } = useSessionContext();

  const userId = userAttributes?.userUuid || null;
  const { purchases, activePurchases, isLoading } = usePurchasedBundlesApi(userId);
  const client = useAmplifyApiClient();

  const { data: bundles } = useQuery({
    queryKey: ['bundles:public'],
    queryFn: async () => {
      const response = await client.models.Bundle.list({
        selectionSet: ownedBundleSelectionSet as any,
      });
      if (response.errors) {
        throw new Error(response.errors[0].message);
      }
      return (response.data || []) as Bundle[];
    },
  });

  const { data: modules } = useQuery({
    queryKey: ['modules:all'],
    queryFn: async () => {
      const response = await client.models.ExamModule.list({ limit: 1000 });
      return response.data || [] as ExamModule[];
    },
  });

  const ownedBundleUuids = useMemo(() => !isUserSubscribed ? activePurchases.map((purchase) => purchase.bundleUuid) : bundles?.map((bundle) => bundle.bundleUuid) || [], [activePurchases, bundles, isUserSubscribed]);

  const ownedBundles = useMemo(() => {
    if (!bundles) return [];
    const map = new Map(bundles.map((bundle) => [bundle.bundleUuid, bundle]));
    return ownedBundleUuids
      .map((bundleUuid) => map.get(bundleUuid))
      .filter(Boolean) as Bundle[];
  }, [bundles, ownedBundleUuids]);

  const ownedModules = useMemo(() => {
    // return a list of names from the modules this user owns
    if (!modules) return [];
    return ownedBundles.flatMap((bundle) => bundle.modules || []).map((moduleUuid) => modules.find((module) => module.examModuleUuid === moduleUuid)?.moduleName || 'Unknown module name');
  }, [ownedBundles, modules]);

  return {
    isLoading,
    purchases,
    activePurchases,
    ownedBundleUuids,
    ownedBundles,
    ownedModules,
    userId: userAttributes?.userUuid || null,
  };
};

