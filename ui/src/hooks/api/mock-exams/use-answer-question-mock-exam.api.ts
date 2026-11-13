import { MockExam, MockExamLog, QuestionAnswer } from "@/lib/types/mock-exam";
import { useAmplifyApiClient } from "@/providers";
import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";

interface AnswerQuestionMockExamProps {
  mockExam: MockExam;
  mockExamLog: MockExamLog;
  questionIndex: number;
  givenAnswer: number;
  isLastQuestion: boolean;
  timeToAnswerInMilliseconds: number;
}

export const useAnswerQuestionMockExam = () => {
  const client = useAmplifyApiClient();

  const answerQuestionMockExam = useCallback(async ({ mockExam, mockExamLog, questionIndex, givenAnswer, isLastQuestion, timeToAnswerInMilliseconds }: AnswerQuestionMockExamProps) => {
    const questionAnswers: QuestionAnswer[] = mockExamLog.questionAnswers;
    // if question answer already exists, update it
    const questionAnswer = questionAnswers.find((qa) => qa!.index === questionIndex);
    if (questionAnswer) {
      questionAnswer.givenAnswer = givenAnswer;
      questionAnswer.answerTimeInMilliseconds = timeToAnswerInMilliseconds;
      questionAnswer.answerAt = new Date().toISOString();
    } else {
      questionAnswers.push({
        index: questionIndex,
        givenAnswer,
        answerTimeInMilliseconds: timeToAnswerInMilliseconds,
        answerAt: new Date().toISOString(),
        chatUuid: null,
      });
    }

    // default marking scheme is 100 point for each correct answer
    const correctCount = mockExamLog.questionAnswers.reduce((acc, qa) => acc + ((qa?.givenAnswer || -1) === (mockExam.questions[qa.index].answer || -1) ? 1 : 0), 0);
    const score = correctCount * 100;

    if (isLastQuestion) {
      const response = await client.models.MockExamLog.update({
        mockExamLogUuid: mockExamLog.mockExamLogUuid,
        questionAnswers,
        status: 'COMPLETED',
        score,
        completedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (!response.data) {
        throw new Error('Failed to complete mock exam');
      }

      return response;
    } else {
      const response = await client.models.MockExamLog.update({
        mockExamLogUuid: mockExamLog.mockExamLogUuid,
        questionAnswers,
        score,
        updatedAt: new Date().toISOString(),
      });

      if (!response.data) {
        throw new Error('Failed to start mock exam');
      }

      return response;
    }
  }, []); 

  const finishMockExam = useCallback(async ({ mockExamLogUuid }: { mockExamLogUuid: string }) => {
    const response = await client.models.MockExamLog.update({
      mockExamLogUuid,
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (response.errors) {
      throw new Error('Failed to finish mock exam');
    }
    return response;
  }, []);

  const { mutateAsync: answerQuestionMockExamMutation } = useMutation({
    mutationFn: answerQuestionMockExam,
  });

  const { mutateAsync: finishMockExamMutation } = useMutation({
    mutationFn: finishMockExam,
  });

  return {
    answerQuestionMockExam: answerQuestionMockExamMutation,
    finishMockExam: finishMockExamMutation,
  };
};