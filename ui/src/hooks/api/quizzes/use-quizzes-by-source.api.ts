import { useAmplifyApiClient, useSessionContext } from "@/providers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Schema } from "@amplify/data/resource";
import { useSubscription } from "../use-subscription";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type RequestType = {
  quizUuid: string;

  state: 'GENERATING' | 'GENERATED' | 'FAILED';
  title: string;

  questionCount: number;

  createdAt: string;

  attempts: {
    quizAttemptUuid: string;
    userUuid: string;
    score: number;
    total: number;
  }[];
};

type QuizSubscriptionInputType = {
  sourceUuid: string | null;
}

type QuizAttemptSubscriptionInputType = {
  userUuid: string | null;
  sourceUuid: string | null;
}

const quizSelectionSet = ['quizUuid','state','title','questionCount','createdAt'];
const quizAttemptSelectionSet = ['quizAttemptUuid','quizUuid','userUuid','score','total'];

export function useQuizzesBySourceApi({
  sourceUuid,
}: { sourceUuid: string | null }) {
  const client = useAmplifyApiClient();
  const queryClient = useQueryClient();
  const { userAttributes } = useSessionContext();

  // Quiz subscriptions - only update quiz data, not attempts
  const createSubscription = useCallback((input: QuizSubscriptionInputType) => {
    return client.models.Quiz.onCreate({
      filter: { 
        sourceUuid: { eq: input.sourceUuid! },
      },
      selectionSet: quizSelectionSet as any,
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quizData = data as any;
        
        const quiz: RequestType = {
          quizUuid: quizData.quizUuid,
          state: quizData.state,
          title: quizData.title,
          questionCount: quizData.questionCount,
          createdAt: quizData.createdAt,
          attempts: [], // Attempts will be populated by QuizAttempt subscription
        };
        
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) => [quiz, ...(prev ?? [])]);
      },
    });
  }, [client, queryClient]);

  const updateSubscription = useCallback((input: QuizSubscriptionInputType) => {
    return client.models.Quiz.onUpdate({
      filter: { 
        sourceUuid: { eq: input.sourceUuid! },
      },
      selectionSet: quizSelectionSet as any,
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const quizData = data as any;
        
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) =>
          (prev ?? []).map((q) => {
            if (q.quizUuid === quizData.quizUuid) {
              return {
                ...q,
                state: quizData.state,
                title: quizData.title,
                questionCount: quizData.questionCount,
                createdAt: quizData.createdAt,
                // Keep existing attempts
              };
            }
            return q;
          })
        );
      },
    });
  }, [client, queryClient]);

  const deleteSubscription = useCallback((input: QuizSubscriptionInputType) => {
    return client.models.Quiz.onDelete({
      filter: { 
        sourceUuid: { eq: input.sourceUuid! },
      },
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) =>
          (prev ?? []).filter((q) => q.quizUuid !== data.quizUuid)
        );
      },
    });
  }, [client, queryClient]);

  const quizOnValidate = useCallback((input: QuizSubscriptionInputType) => {
    return !!input.sourceUuid;
  }, []);

  const quizSubInput = useMemo(() => ({ 
    sourceUuid: sourceUuid ?? null,
  }), [sourceUuid]);

  useSubscription<QuizSubscriptionInputType>({
    subscriptions: 'all',
    input: quizSubInput,
    onValidate: quizOnValidate,
    createFunc: createSubscription,
    updateFunc: updateSubscription,
    deleteFunc: deleteSubscription,
  });

  // QuizAttempt subscriptions - update quiz's attempts array
  const attemptCreateSubscription = useCallback((input: QuizAttemptSubscriptionInputType) => {
    return client.models.QuizAttempt.onCreate({
      filter: { 
        userUuid: { eq: input.userUuid! },
      },
      selectionSet: quizAttemptSelectionSet as any,
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptData = data as any;
        
        // Update the quiz's attempts array
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) =>
          (prev ?? []).map((q) => {
            if (q.quizUuid === attemptData.quizUuid) {
              // Check if attempt already exists
              const existingAttemptIndex = q.attempts.findIndex(
                (a) => a.quizAttemptUuid === attemptData.quizAttemptUuid
              );
              
              // Only process attempts for the current user
              if (attemptData.userUuid === input.userUuid) {
                if (existingAttemptIndex >= 0) {
                  // Update existing attempt
                  const updatedAttempts = [...q.attempts];
                  updatedAttempts[existingAttemptIndex] = {
                    quizAttemptUuid: attemptData.quizAttemptUuid,
                    userUuid: attemptData.userUuid,
                    score: attemptData.score,
                    total: attemptData.total,
                  };
                  return { ...q, attempts: updatedAttempts };
                } else {
                  // Add new attempt (replace any existing attempts for this user, since we only keep one)
                  return {
                    ...q,
                    attempts: [{
                      quizAttemptUuid: attemptData.quizAttemptUuid,
                      userUuid: attemptData.userUuid,
                      score: attemptData.score,
                      total: attemptData.total,
                    }],
                  };
                }
              }
            }
            return q;
          })
        );
      },
    });
  }, [client, queryClient]);

  const attemptUpdateSubscription = useCallback((input: QuizAttemptSubscriptionInputType) => {
    return client.models.QuizAttempt.onUpdate({
      filter: { 
        userUuid: { eq: input.userUuid! },
      },
      selectionSet: quizAttemptSelectionSet as any,
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptData = data as any;
        
        // Update the quiz's attempts array
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) =>
          (prev ?? []).map((q) => {
            if (q.quizUuid === attemptData.quizUuid) {
              const attemptIndex = q.attempts.findIndex(
                (a) => a.quizAttemptUuid === attemptData.quizAttemptUuid
              );
              
              if (attemptIndex >= 0) {
                // Update existing attempt
                const updatedAttempts = [...q.attempts];
                updatedAttempts[attemptIndex] = {
                  quizAttemptUuid: attemptData.quizAttemptUuid,
                  userUuid: attemptData.userUuid,
                  score: attemptData.score,
                  total: attemptData.total,
                };
                return { ...q, attempts: updatedAttempts };
              }
            }
            return q;
          })
        );
      },
    });
  }, [client, queryClient]);

  const attemptDeleteSubscription = useCallback((input: QuizAttemptSubscriptionInputType) => {
    return client.models.QuizAttempt.onDelete({
      filter: { 
        userUuid: { eq: input.userUuid! },
      },
      selectionSet: ['quizAttemptUuid', 'quizUuid'] as any,
    }).subscribe({
      next: (data) => {
        const keyId = input.sourceUuid || '';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptData = data as any;
        
        // Remove the attempt from the quiz's attempts array
        queryClient.setQueryData(['quizzes', keyId], (prev?: RequestType[]) =>
          (prev ?? []).map((q) => {
            if (q.quizUuid === attemptData.quizUuid) {
              return {
                ...q,
                attempts: q.attempts.filter(
                  (a) => a.quizAttemptUuid !== attemptData.quizAttemptUuid
                ),
              };
            }
            return q;
          })
        );
      },
    });
  }, [client, queryClient]);

  const attemptOnValidate = useCallback((input: QuizAttemptSubscriptionInputType) => {
    return !!(input.userUuid && input.sourceUuid);
  }, []);

  const attemptSubInput = useMemo(() => ({ 
    userUuid: userAttributes?.userUuid || null,
    sourceUuid: sourceUuid ?? null,
  }), [userAttributes?.userUuid, sourceUuid]);

  useSubscription<QuizAttemptSubscriptionInputType>({
    subscriptions: 'all',
    input: attemptSubInput,
    onValidate: attemptOnValidate,
    createFunc: attemptCreateSubscription,
    updateFunc: attemptUpdateSubscription,
    deleteFunc: attemptDeleteSubscription,
  });

  const fetchQuizzes = useCallback(async (sourceUuid: string | null): Promise<RequestType[]> => {
    if (!sourceUuid) return [];
    const res = await client.models.Quiz.listQuizBySourceUuidAndCreatedAt(
      { sourceUuid },
      { limit: 100, sortDirection: 'DESC', selectionSet: ['quizUuid','state','title','questionCount','createdAt','attempts.quizAttemptUuid','attempts.userUuid','attempts.score','attempts.total'] as any}
    );

    const currentUserUuid = userAttributes?.userUuid;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const quizData: any[] = res.data || [];
    
    // Filter attempts to only include the current user's attempts, and get the first one
    const quizzes: RequestType[] = quizData.map((quiz: any) => {
      const userAttempts = currentUserUuid 
        ? (quiz.attempts || []).filter((attempt: any) => attempt.userUuid === currentUserUuid)
        : [];
      
      return {
        quizUuid: quiz.quizUuid,
        state: quiz.state,
        title: quiz.title,
        questionCount: quiz.questionCount,
        createdAt: quiz.createdAt,
        attempts: userAttempts.length > 0 ? [userAttempts[0]] : [], // Get the first matching attempt
      };
    });

    return quizzes;
  }, [client, userAttributes?.userUuid]);

  const { data, isLoading } = useQuery<RequestType[]>({
    queryKey: ['quizzes', sourceUuid],
    queryFn: () => fetchQuizzes(sourceUuid),
  });

  return {
    isLoading,
    quizzes: data || [],
  };
}
