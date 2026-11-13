import { useAmplifyApiClient } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { UserRequest } from "@/lib/types/user-request";

type SelectionSetType = keyof Schema['UserRequest']['type'];

const selectionSet: SelectionSetType[] = [
  'userUuid',
  'category',
  'feature',
  'model',
  'totalTokenCount',
  'promptTokenCount',
  'candidatesTokenCount',
  'cachedContentTokenCount',
  'thoughtsTokenCount',
  'toolUsePromptTokenCount',
  'createdAt',
  'documentUuid',
  'requestStatus',
  'webSearchCalled',
  'latency',
];

type RequestType = Pick<Schema['UserRequest']['type'], SelectionSetType>;

type Category = 'chat' | 'document' | 'generation' | 'extraction';

type SubscriptionInputType = {
  category: Category | null;
  startDate: string;
  endDate: string;
}

export function useUserRequestsByCategoryApi({ 
  category,
  startDate,
  endDate,
  options,
}: {
  category: Category | null;
  startDate: string;
  endDate: string;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();

  const [userRequests, setUserRequests] = useState<UserRequest[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.UserRequest.onCreate({
      filter: { 
        category: { eq: input.category! }, 
        createdAt: { between: [input.startDate, input.endDate] } 
      },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        // add element on top of the list
        setUserRequests((prev) => [data as UserRequest, ...prev]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.UserRequest.onUpdate({
      filter: { 
        category: { eq: input.category! }, 
        createdAt: { between: [input.startDate, input.endDate] } 
      },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setUserRequests((prev) => prev.map((userRequest) => 
          userRequest.userUuid === data.userUuid && userRequest.createdAt === data.createdAt
            ? data as UserRequest 
            : userRequest
        ));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.category;
  }, []);

  const subInput = useMemo(() => ({ 
    category, 
    startDate, 
    endDate 
  }), [category, startDate, endDate]);

  useSubscription<SubscriptionInputType>({
    subscriptions: 'create-update',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
  });

  const getUserRequests = useCallback(async (
    category: Category, 
    startDate: string, 
    endDate: string,
    nextToken?: string
  ) => {
    const response = await client.models.UserRequest.listUserRequestByCategoryAndCreatedAt({
      category,
      createdAt: { between: [startDate, endDate] },
    }, {
      selectionSet: selectionSet as any,
      limit: 100,
      nextToken,
    });

    return {
      data: response.data || [],
      nextToken: response.nextToken,
    };
  }, [client]);

  const onData = useCallback((data: RequestType[]) => {
    setUserRequests(data as UserRequest[]);
  }, []);

  const { isLoading, loadNextPage, hasNextPage, refetch } = usePaginatedQuery<RequestType>({
    queryKey: ['userRequestsByCategory', category!, startDate, endDate, options?.key || 'default'],
    queryFn: (nextPageToken) => getUserRequests(category!, startDate, endDate, nextPageToken),
    options: {
      enabled: !!category,
      onData,
    },
  });

  return {
    isLoading,
    userRequests,
    hasNextPage,
    loadNextPage,
    refetch,
  };
}

