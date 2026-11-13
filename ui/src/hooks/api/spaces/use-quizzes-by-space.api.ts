import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useMemo } from "react";
import { Schema } from "@amplify/data/resource";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "../use-subscription";

type RequestType = Schema['Quiz']['type'];

const spaceSelectionSet = [
  'spaceUuid',
  // document quizzes within the space
  'documents.documentUuid',
  'documents.quizzes.quizUuid',
  'documents.quizzes.state',
  'documents.quizzes.questionCount',
  'documents.quizzes.createdAt',
  'documents.quizzes.sourceUuid',
  'documents.quizzes.sourceType',
  'documents.quizzes.attempts.*',
  // chat quizzes within the space
  'chats.chatUuid',
  'chats.quizzes.quizUuid',
  'chats.quizzes.state',
  'chats.quizzes.questionCount',
  'chats.quizzes.createdAt',
  'chats.quizzes.sourceUuid',
  'chats.quizzes.sourceType',
  'chats.quizzes.attempts.*',
] as const;

export function useQuizzesBySpaceApi(spaceUuid: string | null) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const queryClient = useQueryClient();

  const fetchQuizzes = useCallback(async () => {
    if (!spaceUuid) return [] as RequestType[];

    const res = await client.models.Space.get(
      { spaceUuid },
      { selectionSet: spaceSelectionSet as any }
    );

    const currentUserUuid = userAttributes?.userUuid;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const documents = (res.data?.documents || []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chats = (res.data?.chats || []) as any[];
    
    // Extract quizzes and filter attempts by current user
    const allQuizzes = [
      ...documents.flatMap((d) => (d.quizzes || []).map((quiz: any) => {
        const userAttempts = currentUserUuid 
          ? (quiz.attempts || []).filter((attempt: any) => attempt.userUuid === currentUserUuid)
          : [];
        return {
          ...quiz,
          attempts: userAttempts.length > 0 ? [userAttempts[0]] : [], // Get the first matching attempt
        };
      })),
      ...chats.flatMap((c) => (c.quizzes || []).map((quiz: any) => {
        const userAttempts = currentUserUuid 
          ? (quiz.attempts || []).filter((attempt: any) => attempt.userUuid === currentUserUuid)
          : [];
        return {
          ...quiz,
          attempts: userAttempts.length > 0 ? [userAttempts[0]] : [], // Get the first matching attempt
        };
      })),
    ] as RequestType[];

    allQuizzes.sort((a: any, b: any) => (b.createdAt || '').localeCompare(a.createdAt || ''));
    return allQuizzes;
  }, [client, spaceUuid, userAttributes?.userUuid]);

  // Live updates scoped to the user; filter by space via joined relations
  type SubInput = { spaceUuid: string | null; userUuid: string | null };
  const subInput = useMemo<SubInput>(() => ({ spaceUuid, userUuid: userAttributes?.userUuid || null }), [spaceUuid, userAttributes?.userUuid]);

  const createSubscription = useCallback((input: SubInput) => {
    return client.models.Quiz.onCreate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: ['quizUuid','userUuid','state','questionCount','createdAt','sourceUuid','sourceType','attempts.*'] as any,
    }).subscribe({
      next: (data) => {
        // Shallow payload; we can't reliably know space here.
        // Invalidate for current space to stay consistent.
        queryClient.invalidateQueries({ queryKey: ['quizzes', input.spaceUuid] });
      },
    });
  }, [client, queryClient]);

  const updateSubscription = useCallback((input: SubInput) => {
    return client.models.Quiz.onUpdate({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: ['quizUuid','userUuid','state','questionCount','createdAt','sourceUuid','sourceType','attempts.*'] as any,
    }).subscribe({
      next: (data) => {
        queryClient.invalidateQueries({ queryKey: ['quizzes', input.spaceUuid] });
      },
    });
  }, [client, queryClient]);

  const deleteSubscription = useCallback((input: SubInput) => {
    return client.models.Quiz.onDelete({
      filter: { userUuid: { eq: input.userUuid! } },
      selectionSet: ['quizUuid','userUuid','sourceUuid','sourceType'] as any,
    }).subscribe({
      next: (data) => {
        queryClient.invalidateQueries({ queryKey: ['quizzes', input.spaceUuid] });
      },
    });
  }, [client, queryClient]);

  const onValidate = useCallback((input: SubInput) => {
    return !!(input.spaceUuid && input.userUuid);
  }, []);

  useSubscription<SubInput>({
    subscriptions: 'all',
    input: subInput,
    onValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  const { data, isLoading } = useQuery<RequestType[]>({
    queryKey: ['quizzes', spaceUuid],
    queryFn: fetchQuizzes,
    enabled: !!spaceUuid,
  });

  return {
    isLoading,
    quizzes: data || [],
  };
}
