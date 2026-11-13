import { useAmplifyApiClient } from "@/providers";
import { QuizQuestion } from "@/lib/types";
import { useCallback, useMemo, useState } from "react";
import { ByUserApiOptions } from "../types";
import { useSubscription } from "../use-subscription";
import { usePaginatedQuery } from "../use-paginated-query.api";
import { Schema } from "@amplify/data/resource";
import { emitter } from "@/hooks/use-events";
import { mapQuestionToQuizQuestion } from "./utils";

type RequestType = Schema['Question']['type'];

type SubscriptionInputType = {
  spaceUuid: string | null;
}

export function useQuestionsBySpaceApi({ 
  spaceUuid,
  options,
}: {
  spaceUuid: string | null;
  options?: Pick<ByUserApiOptions, 'key'>;
}) {
  const client = useAmplifyApiClient();

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);

  const createSubscription = useCallback((input: SubscriptionInputType) => {
    return client.models.Question.onCreate({
      filter: { spaceUuid: { eq: input.spaceUuid! } },
    }).subscribe({
      next: (data) => {
        // add element on top of the list, and remove the last if over the limit;
        setQuestions((prev) => [mapQuestionToQuizQuestion(data), ...prev]);
        emitter.emit('core:new-quiz', mapQuestionToQuizQuestion(data));
      },
    });
  }, []);

  const onValidate = useCallback((input: SubscriptionInputType) => {
    return !!input.spaceUuid;
  }, []);

  const subInput = useMemo(() => ({ spaceUuid }), [spaceUuid]);
  useSubscription<SubscriptionInputType>({
    subscriptions: 'create',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
  });

  const getQuestions = useCallback(async (spaceUuid: string) => {
    const response = await client.models.Question.listQuestionBySpaceUuidAndCreatedAt({
      spaceUuid,
    }, {
      // use big limit to get all the data
      // and avoid pagination
      limit: 500,
    });

    return response;
  }, []);

  const onData = useCallback((data: RequestType[]) => {
    const mapped = data.map((d) => mapQuestionToQuizQuestion(d));
    setQuestions(mapped);
  }, []);

  const { isLoading } = usePaginatedQuery<RequestType>({
    queryKey: ['questions', spaceUuid!, options?.key || 'default'],
    queryFn: () => getQuestions(spaceUuid!),
    options: {
      enabled: !!spaceUuid,
      onData,
    },
  });

  return {
    isLoading,
    questions,
  };
}
