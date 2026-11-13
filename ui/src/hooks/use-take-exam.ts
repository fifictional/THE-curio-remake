import { useAmplifyApiClient } from "@/providers";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useStartMockExamApi } from "@/hooks/api/mock-exams/use-start-mock-exam.api";
import { useMockExamByIdApi } from "./api/mock-exams/use-mock-exam-by-id.api";
import { useMockExamsAttemptsByMockExam } from "./api/mock-exams/use-mock-exam-logs-by-mock-exam.api";
import { MockExam, MockExamLog } from "@/lib/types/mock-exam";
import { useAnswerQuestionMockExam } from "./api/mock-exams/use-answer-question-mock-exam.api";
import { useCommonContext } from "@/providers/common-provider";
import { useAnalytics } from "@/providers";
import { useEnqueueQuizMemoryApi } from "@/hooks/api/memory/use-enqueue-quiz-memory.api";

export type QuizScreen = 'intro' | 'quiz' | 'end';

export const useTakeExam = ({ mockExamUuid, isFreeTrial }: { mockExamUuid: string, isFreeTrial: boolean }) => {
  const { setPageTitle } = useCommonContext();
  const [screen, setScreen] = useState<QuizScreen>('intro');
  const [loadingQuizPage, setLoadingQuizPage] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [mockExamLog, setMockExamLog] = useState<MockExamLog | null>(null);
  const { track } = useAnalytics();
  const [lastQuestionStartTime, setLastQuestionStartTime] = useState<number | null>(null);

  const { startMockExam } = useStartMockExamApi();
  const { answerQuestionMockExam, finishMockExam } = useAnswerQuestionMockExam();
  const { data: mockExam } = useMockExamByIdApi({ mockExamUuid });
  const { mockExamLogs } = useMockExamsAttemptsByMockExam({ mockExamUuid });
  const { enqueueQuizMemory } = useEnqueueQuizMemoryApi();

  const isThereAnyMockExamLog = useMemo(() => {
    return mockExamLogs?.length && mockExamLogs.length > 0;
  }, [mockExamLogs]);

  useEffect(() => {
    setPageTitle(mockExam?.title || '');
    return () => {
      setPageTitle('');
    }
  }, [mockExam]);

  useEffect(() => {
    if (isThereAnyMockExamLog && mockExam?.creationStatus === 'GENERATED') {
      setMockExamLog(mockExamLogs?.[0] as unknown as MockExamLog);
      if (mockExamLogs?.[0].status === 'COMPLETED') {
        setScreen('end');
        track('mock_exam_end_page_viewed', {
          title: mockExam?.title || '',
          isFreeTrial: isFreeTrial || false,
        });
      } else {
        setScreen('quiz');
      }
    } else {
      setScreen('intro');
    }
  }, [isThereAnyMockExamLog, mockExamLogs, mockExam]);

  const handleStartMockExam = useCallback(async () => {
    const response = await startMockExam(mockExamUuid);
    if (!response) {
      setError('Failed to start mock exam');
      return false;
    }

    return true;
  }, [startMockExam, mockExamUuid]);

  const handleFinishMockExam = useCallback(async () => {
    if (!mockExamLog?.mockExamLogUuid) {
      setError('No mock exam attempt id');
      return false;
    }

    const response = await finishMockExam({ mockExamLogUuid: mockExamLog?.mockExamLogUuid });
    if (!response) {
      setError('Failed to finish mock exam');
      return false;
    }

    // Report the result to the memory system so a strong score can register a
    // mastered topic (and clear a matching knowledge gap) instead of leaving
    // stale gaps created by the chat that set up this practice test.
    const questions = mockExam?.questions ?? [];
    const total = questions.length;
    if (total > 0) {
      const indexToAnswer = new Map<number, number>(questions.map((q) => [q.index, q.answer]));
      const correct = (mockExamLog.questionAnswers ?? []).reduce((acc, a) => {
        const expected = indexToAnswer.get(a.index);
        if (expected == null) return acc;
        return acc + (a.givenAnswer != null && a.givenAnswer === expected ? 1 : 0);
      }, 0);

      void enqueueQuizMemory({
        quizUuid: mockExamUuid,
        quizAttemptUuid: mockExamLog.mockExamLogUuid,
        score: correct,
        total,
        topic: mockExam?.title || mockExam?.mockExamInfo?.topic || 'Practice test',
        subject: mockExam?.mockExamInfo?.topic || undefined,
        spaceUuid: mockExam?.spaceUuid ?? null,
        occurredAt: mockExamLog.completedAt ?? mockExamLog.createdAt,
        addedFrom: 'mock_exam',
      }).catch(() => {});
    }

    return true;
  }, [finishMockExam, mockExamLog, mockExam, mockExamUuid, enqueueQuizMemory]);

  const handleAnswerQuestionMockExam = useCallback((answer: { givenAnswer: number; questionIndex: number }) => {
    if (!mockExamLog?.mockExamLogUuid) {
      setError('No mock exam attempt id');
      return;
    }

    answerQuestionMockExam({ 
      mockExam: mockExam as MockExam,
      mockExamLog, 
      givenAnswer: answer.givenAnswer, 
      questionIndex: answer.questionIndex, 
      isLastQuestion: false, 
      timeToAnswerInMilliseconds: lastQuestionStartTime ? new Date().getTime() - lastQuestionStartTime : 0 
    });
  }, [mockExamLog, answerQuestionMockExam]);

  const orderedQuestions = useMemo(() => {
    const questions = [...mockExam?.questions || []]
    questions.sort((a, b) => a.index - b.index);
    return questions;
  }, [mockExam]);

  return {
    screen,
    setScreen,
    loadingQuizPage,
    error,
    isFetching,
    mockExam,
    handleStartMockExam,
    handleFinishMockExam,
    handleAnswerQuestionMockExam,
    orderedQuestions,
    answers: mockExamLog?.questionAnswers || [],
    score: mockExamLog?.score || 0,
    hasQuestionsGenerated: (mockExam?.questions?.length || 0) > 0,
    questionsCount: mockExam?.questions?.length || 0,
    setLastQuestionStartTime,
  }
}