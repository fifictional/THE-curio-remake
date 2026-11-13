import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { MockExamLog } from "@/lib/types/mock-exam";
import { useSubscription } from "../use-subscription";
import { useQueryClient } from "@tanstack/react-query";
import { PaginatedQueryResult } from "@/lib/types/paginated-query";

type RequestType = Schema['MockExamLog']['type'];

type SubscriptionInputType = {
  mockExamUuid: string | null;
}

export function useMockExamsAttemptsByMockExam({ 
  mockExamUuid,
  options,
}: {
  mockExamUuid: string | null;
  options?: ByUserApiOptions;
}) {
  const client = useAmplifyApiClient();
  const [mockExamLogs, setMockExamLogs] = useState<MockExamLog[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExamLog.onCreate({
      filter: { mockExamUuid: { eq: input.mockExamUuid! } },
    }).subscribe({
      next: (data) => {
        setMockExamLogs((prev) => [...prev, data as unknown as MockExamLog]);
      },
    });
  }, []);

  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExamLog.onUpdate({
      filter: { mockExamUuid: { eq: input.mockExamUuid! } },
    }).subscribe({
      next: (data) => {
        setMockExamLogs((prev) => prev.map((mockExamLog) => mockExamLog.mockExamLogUuid === data.mockExamLogUuid ? data as unknown as MockExamLog : mockExamLog));
      },
    });
  }, []);

  const deleteSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExamLog.onDelete({
      filter: { mockExamUuid: { eq: input.mockExamUuid! } },
    }).subscribe({
      next: (data) => {
        setMockExamLogs((prev) => prev.filter((mockExamLog) => mockExamLog.mockExamLogUuid !== data.mockExamLogUuid));
      },
    });
  }, []);

  const subInput = useMemo(() => ({ mockExamUuid }), [mockExamUuid]);
  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.mockExamUuid;
  }, []);

  useSubscription<SubscriptionInputType>({
    subscriptions: 'all',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const getMockExamLogs = useCallback(async (mockExamUuid: string, perPage: number, pageToken: string) => {
    const response = await client.models.MockExamLog.listMockExamLogByMockExamUuidAndStartedAt({
      mockExamUuid,
    }, {
      limit: perPage,
      nextToken: !pageToken ? undefined : pageToken,
      sortDirection: "DESC"
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    setMockExamLogs(data as unknown as MockExamLog[]);
  }, []);

  const { isLoading, hasNextPage, loadNextPage } = usePaginatedQuery<RequestType>({
    queryKey: ['mockExamLogs', mockExamUuid!, options?.key || 'default'],
    queryFn: (nextPageToken) => getMockExamLogs(mockExamUuid!, options?.perPage || 50, nextPageToken),
    options: {
      enabled: !!mockExamUuid,
      onData,
    },
  });

  return {
    isLoading,
    mockExamLogs,
    hasNextPage,
    loadNextPage,
  };
}