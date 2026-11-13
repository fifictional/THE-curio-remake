import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { useSubscription } from "../use-subscription";
import { endOfDay, startOfDay } from 'date-fns';
export type SubscriptionInputType = {
  userUuid: string;
};

export type UserActionLog = {
  userActionLogUuid: string;
  userUuid: string;
  actionType: string;
  sourceType: string;
  sourceUuid: string;
  createdAt: string;
};

export function useUserActionLog(actionType: string, todayOnly?: boolean, limit?: number) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const queryClient = useQueryClient();

  const getUserActionLog = useCallback(async (userUuid: string, actionType: string) => {
    const now = new Date();
    
    let keyCondition: any = { userUuid };
    
    // 👉 Add createdAt BETWEEN if todayOnly enabled
    if (todayOnly) {
      keyCondition.createdAt = {
        between: [startOfDay(now).toISOString(), endOfDay(now).toISOString()]
      };
    }

    const response = await client.models.UserActionLog.listUserActionLogByUserUuidAndCreatedAt({
      ...keyCondition
    }, {
      filter: { actionType: { eq: actionType } },
      limit: limit ?? 50,
      sortDirection: "DESC"
    });

    return response.data as UserActionLog[];
  }, []);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.UserActionLog.onCreate({
      filter: { userUuid: { eq: input.userUuid! }, actionType: { eq: actionType } },
    }).subscribe({
      next: (data) => {
        queryClient.setQueryData(['userActionLog', actionType], (old: UserActionLog[]) => [data as UserActionLog, ...old ?? []]);
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userUuid;
  }, []);

  const subInput = useMemo(() => ({ userUuid: userAttributes?.userUuid || '' }), [userAttributes?.userUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
  });

  const { isLoading, data, error } = useQuery<UserActionLog[]>({
    queryKey: ['userActionLog', actionType],
    queryFn: () => getUserActionLog(userAttributes?.userUuid || '', actionType),
    enabled: !!userAttributes?.userUuid,
  });

  return {
    isLoading,
    userActionLogs: data as UserActionLog[] || [],
    error,
  };
}