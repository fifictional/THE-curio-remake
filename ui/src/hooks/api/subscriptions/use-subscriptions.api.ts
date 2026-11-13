import { useAmplifyUserApiClient } from "@/providers";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useSubscription } from "../use-subscription";

export interface Subscription {
  subscriptionId: string;
  userId: string;
  provider: 'paddle' | 'stripe' | 'apple' | 'google' | 'manual';
  status: 'active' | 'paused' | 'cancelled' | 'past_due' | 'trialing';
  tier?: 'super' | 'ultra' | null;
  providerSubscriptionId?: string | null;
  providerCustomerId?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelledAt?: string | null;
  pausedAt?: string | null;
  nextBillingDate?: string | null;
  scheduledChangeDate?: string | null;
  scheduledChangeAction?: string | null;
  createdAt: string;
  updatedAt: string;
}

const subscriptionSelectionSet = [
  'subscriptionId',
  'userId',
  'provider',
  'status',
  'tier',
  'providerSubscriptionId',
  'providerCustomerId',
  'currentPeriodStart',
  'currentPeriodEnd',
  'cancelledAt',
  'pausedAt',
  'nextBillingDate',
  'scheduledChangeDate',
  'scheduledChangeAction',
  'createdAt',
  'updatedAt',
] as const;

type SubscriptionInputType = {
  userId: string | null;
}

export const useSubscriptionsApi = (targetUserId: string | null) => {
  const userClient = useAmplifyUserApiClient();
  const queryClient = useQueryClient();

  const getSubscriptions = useCallback(async (): Promise<Subscription[]> => {
    if (!targetUserId) return [];

    const response = await userClient.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({
      userId: targetUserId,
    });

    if (response.errors) {
      throw new Error(response.errors[0].message);
    }

    return (response.data || []) as Subscription[];
  }, [userClient, targetUserId]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return userClient.models.CurioSubscription.onCreate({
      filter: { userId: { eq: input.userId! } },
    }).subscribe({
      next: (data) => {
        queryClient.setQueryData(['subscriptions', targetUserId], (old: Subscription[]) => [data, ...old ?? []]);
      },
    });
  }, [queryClient, targetUserId]);
  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return userClient.models.CurioSubscription.onUpdate({
      filter: { userId: { eq: input.userId! } },
    }).subscribe({
      next: (data) => {
        queryClient.setQueryData(['subscriptions', targetUserId], (old: Subscription[]) => old.map((sub) => sub.subscriptionId === data.subscriptionId ? data : sub));
      },
    });
  }, [queryClient, targetUserId]);
  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userId;
  }, []);
  const subInput = useMemo(() => ({ userId: targetUserId }), [targetUserId]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create-update',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['subscriptions', targetUserId],
    queryFn: getSubscriptions,
    enabled: !!targetUserId,
  });

  const activeSubscriptions = useMemo(
    () => data?.filter((sub) => sub.status === 'active' || sub.status === 'trialing') ?? [],
    [data]
  );

  // Grant a subscription (manual source)
  const grantSubscription = useCallback(
    async ({
      months,
      tier,
      status = 'active',
    }: {
      months: number;
      tier: 'super' | 'ultra';
      status?: 'active' | 'trialing';
    }) => {
      if (!targetUserId) throw new Error('No user selected');

      // Check for existing manual subscription for this user
      // If found, we'll update it (upgrade/downgrade tier and extend period)
      const existingSubscriptions = await getSubscriptions();
      const existingSubscription = existingSubscriptions.find(
        (sub) => sub.userId === targetUserId && sub.provider === 'manual'
      );

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + months);

      if (existingSubscription) {
        // Update existing subscription (upgrade/downgrade)
        const response = await userClient.models.CurioSubscription.update({
          subscriptionId: existingSubscription.subscriptionId,
          tier,
          status,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: endDate.toISOString(),
          nextBillingDate: endDate.toISOString(),
          cancelledAt: null,
          pausedAt: null,
          updatedAt: now.toISOString(),
        } as any);

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data;
      } else {
        // Create new subscription
        const response = await userClient.models.CurioSubscription.create({
          subscriptionId: uuidv4(),
          userId: targetUserId,
          provider: 'manual',
          status,
          tier,
          currentPeriodStart: now.toISOString(),
          currentPeriodEnd: endDate.toISOString(),
          nextBillingDate: endDate.toISOString(),
          createdAt: now.toISOString(),
          updatedAt: now.toISOString(),
        } as any);

        if (response.errors) {
          throw new Error(response.errors[0].message);
        }

        return response.data;
      }
    },
    [userClient, targetUserId, getSubscriptions]
  );

  // Cancel a subscription
  const cancelSubscription = useCallback(
    async ({ subscriptionId }: { subscriptionId: string }) => {
      const now = new Date().toISOString();
      const response = await userClient.models.CurioSubscription.update({
        subscriptionId,
        status: 'cancelled',
        cancelledAt: now,
        updatedAt: now,
      } as any);

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data;
    },
    [userClient]
  );

  // Pause a subscription
  const pauseSubscription = useCallback(
    async ({ subscriptionId }: { subscriptionId: string }) => {
      const now = new Date().toISOString();
      const response = await userClient.models.CurioSubscription.update({
        subscriptionId,
        status: 'paused',
        pausedAt: now,
        updatedAt: now,
      } as any);

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data;
    },
    [userClient]
  );

  // Reactivate a subscription
  const reactivateSubscription = useCallback(
    async ({ subscriptionId }: { subscriptionId: string }) => {
      const now = new Date().toISOString();
      const response = await userClient.models.CurioSubscription.update({
        subscriptionId,
        status: 'active',
        pausedAt: null,
        cancelledAt: null,
        updatedAt: now,
      } as any);

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data;
    },
    [userClient]
  );

  // Delete a subscription
  const deleteSubscription = useCallback(
    async ({ subscriptionId }: { subscriptionId: string }) => {
      const response = await userClient.models.CurioSubscription.delete({
        subscriptionId,
      } as any);

      if (response.errors) {
        throw new Error(response.errors[0].message);
      }

      return response.data;
    },
    [userClient]
  );

  const { mutateAsync: grant } = useMutation({
    mutationFn: grantSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', targetUserId] }),
  });

  const { mutateAsync: cancel } = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', targetUserId] }),
  });

  const { mutateAsync: pause } = useMutation({
    mutationFn: pauseSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', targetUserId] }),
  });

  const { mutateAsync: reactivate } = useMutation({
    mutationFn: reactivateSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', targetUserId] }),
  });

  const { mutateAsync: remove } = useMutation({
    mutationFn: deleteSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions', targetUserId] }),
  });

  return {
    subscriptions: data ?? [],
    activeSubscriptions,
    isLoading,
    grant,
    cancel,
    pause,
    reactivate,
    remove,
    refetch,
  };
};

