import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { MockExam } from "@/lib/types/mock-exam";
import { useSubscription } from "../use-subscription";

type RequestType = Schema['MockExam']['type'];

type SubscriptionInputType = {
  userUuid: string | null;
}

const selectionSet = ['mockExamUuid', 'userUuid', 'title', 'createdAt', 'updatedAt', 'mockExamInfo.*', 'questions.*', 'mockExamLogs.*', 'creationStatus'];

export function useMockExamsByUserApi({ 
  userUuid,
  options,
}: {
  userUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();
  const [mockExams, setMockExams] = useState<MockExam[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExam.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setMockExams((prev) => [data as unknown as MockExam, ...prev]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExam.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setMockExams((prev) => prev.map((mockExam) => mockExam.mockExamUuid === data.mockExamUuid ? data as unknown as MockExam : mockExam));
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExam.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: selectionSet as any,
    }).subscribe({
      next: (data) => {
        setMockExams((prev) => prev.filter((mockExam) => mockExam.mockExamUuid !== data.mockExamUuid));
      },
    });
  }, []);

  const subInput = useMemo(() => ({ userUuid }), [userUuid]);
  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.userUuid;
  }, []);

  useSubscription<SubscriptionInputType>({
    subscriptions: 'all',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const getMockExams = useCallback(async (userUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.MockExam.listMockExamByUserUuidAndCreatedAt({
      userUuid,
    }, {
      selectionSet: selectionSet as any,
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    // add elements to prev, but remove the duplicates
    setMockExams(data as unknown as MockExam[]);
  }, []);

  const { isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['mockExams', userUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getMockExams(userUuid!, options?.perPage || 10, nextPageToken),
    options: {
      enabled: !!userUuid,
      onData,
    },
  });

  return {
    isLoading,
    mockExams,
    hasNextPage,
    loadNextPage,
  };
}