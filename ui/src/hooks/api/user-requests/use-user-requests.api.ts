import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { UserRequest } from "@/lib/types/user-request";

type SelectionSetType = 'userUuid' | 'totalTokenCount' | 'createdAt' | 'documentUuid' | 'requestStatus' | 'model' | 'createdAt' | 'webSearchCalled';
const selectionSet = ['userUuid', 'totalTokenCount', 'createdAt', 'documentUuid', 'requestStatus', 'model', 'createdAt', 'webSearchCalled'];

type RequestType = Pick<Schema['UserRequest']['type'], SelectionSetType>;

type SubscriptionInputType = {
  userUuid: string | null;
}

export function useUserRequestsApi({ 
  userUuid,
  startDate,
  endDate,
  options,
}: {
  userUuid: string | null;
  startDate: string;
  endDate: string;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();

  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.UserRequest.onCreate({
      filter: { userUuid: { eq: input.userUuid! }, createdAt: { between: [startDate, endDate] } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        setUserRequests((prev) => [data as UserRequest, ...prev]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.UserRequest.onUpdate({
      filter: { userUuid: { eq: input.userUuid! }, createdAt: { between: [startDate, endDate] } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setUserRequests((prev) => prev.map((userRequest) => userRequest.userUuid === data.userUuid ? {
          ...data,
        } as UserRequest : userRequest));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userUuid;
  }, []);

  const subInput = useMemo(() => ({ userUuid }), [userUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create-update',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
  });

  const getUserRequests = useCallback(async (userUuid: string, startDate: string, endDate: string) => {
    const response = await client.models.UserRequest.listUserRequestByUserUuidAndCreatedAt({
      userUuid,
      createdAt: { between: [startDate, endDate] },
    }, {
      selectionSet: selectionSet as any,
      limit: 100,
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setUserRequests(data as UserRequest[]);
  }, []);

  const { isLoading, loadNextPage, hasNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['userRequests', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getUserRequests(userUuid!, startDate, endDate),
    options: {
      enabled: !!userUuid,
      onData,
    },
  });

  return {
    isLoading,
    userRequests,
    hasNextPage,
    loadNextPage,
  };
}
