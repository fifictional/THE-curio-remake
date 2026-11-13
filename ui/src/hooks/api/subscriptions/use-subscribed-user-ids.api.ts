import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAmplifyUserApiClient } from '@/providers/amplify-provider';

/**
 * Hook to fetch all user IDs that have active or trialing subscriptions.
 * Results are cached via React Query.
 */
export function useSubscribedUserIds() {
  const client = useAmplifyUserApiClient();

  const getSubscribedUserIds = useCallback(async (): Promise<Set<string>> => {
    const subscribedUserIds = new Set<string>();
    let nextToken: string | undefined = undefined;

    do {
      const response: any = await client.models.CurioSubscription.list({
        limit: 1000,
        nextToken,
        selectionSet: ['userId', 'status'],
      });

      if (response.data) {
        response.data.forEach((subscription: any) => {
          // Only include users with active or trialing subscriptions
          if (
            subscription.userId &&
            (subscription.status === 'active' || subscription.status === 'trialing')
          ) {
            subscribedUserIds.add(subscription.userId);
          }
        });
      }

      nextToken = response.nextToken ?? undefined;
    } while (nextToken);

    return subscribedUserIds;
  }, [client]);

  const { data, isLoading, error } = useQuery({
    queryKey: ['subscribed-user-ids'],
    queryFn: getSubscribedUserIds,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return {
    subscribedUserIds: data || new Set<string>(),
    isLoading,
    error,
  };
}
