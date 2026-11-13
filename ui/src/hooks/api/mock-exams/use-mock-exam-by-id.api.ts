import { useAmplifyApiClient } from "@/providers";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { MockExam } from "@/lib/types/mock-exam";
import { useSubscription } from "../use-subscription";

interface SubscriptionInputType {
  mockExamUuid: string;
}

export const useMockExamByIdApi = ({ mockExamUuid }: { mockExamUuid: string }) => {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();

  const subInput = useMemo(() => ({ mockExamUuid }), [mockExamUuid]);
  const onValidate = useCallback((input: SubscriptionInputType) => !!input.mockExamUuid, []);
  const updateSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.MockExam.onUpdate({
      filter: { mockExamUuid: { eq: input.mockExamUuid! } },
    }).subscribe({
      next: (data) => {
        queryClient.setQueryData(['mockExam', mockExamUuid], data as unknown as MockExam);
      },
    });
  }, []);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'update',
    input: subInput,
    onValidate,
    updateFunc: updateSubscription,
  });

  const getMockExam = useCallback(async () => {
    const response = await client.models.MockExam.get({ mockExamUuid });

    if (response.errors) {
      console.error(response.errors);
      return null;
    }

    return response.data as unknown as MockExam;
  }, [mockExamUuid]);

  return useQuery<MockExam | null>({
    queryKey: ['mockExam', mockExamUuid],
    queryFn: getMockExam,
    enabled: !!mockExamUuid,
  });
};