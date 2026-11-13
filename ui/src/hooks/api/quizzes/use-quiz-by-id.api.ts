import { useAmplifyApiClient } from "@/providers";
import { useCallback, useEffect, useState } from "react";
import { QuizQuestion } from "@/lib/types";
import { mapQuestionToQuizQuestion } from "../spaces/utils";

export function useQuizByIdApi({ quizUuid }: { quizUuid: string | null }) {
  const client = useAmplifyApiClient();
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchQuiz = useCallback(async (quizUuid: string) => {
    setIsLoading(true);
    try {
      const res: any = await client.models.QuizQuestion.listQuizQuestionByQuizUuid(
        { quizUuid },
        {
          limit: 500,
          selectionSet: [
            'quizQuestionUuid',
            'questionContent',
            'questionReferences.*',
            'options',
            'hint',
            'answerExplanations'
          ]
        }
      );
      const items = (res.data || []) as any[];
      const mapped = items.map((it) => mapQuestionToQuizQuestion(it));
      setQuestions(mapped);
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (!quizUuid) {
      setQuestions([]);
      return;
    }
    fetchQuiz(quizUuid);
  }, [quizUuid, fetchQuiz]);

  return {
    isLoading,
    questions,
    refetch: () => quizUuid ? fetchQuiz(quizUuid) : Promise.resolve(),
  };
}
