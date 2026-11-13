import { useAnalytics, useCommonContext, useCoreContext, useSessionContext } from "@/providers";
import { useCallback, useEffect, useState } from "react";
import { QuizQuestion } from "@/lib/types";
import { useSendActivityLogs } from "./useSendActivityLogs";

interface UsePanelQuizzesProps {
  questions: QuizQuestion[];
  sendMessage?: ({ message, image, isExplain }: { message: string, image?: string, isExplain?: boolean }) => Promise<void>;
}

export function usePanelQuizzes({ questions, sendMessage }: UsePanelQuizzesProps) {
  const { document } = useCoreContext();
  const { track } = useAnalytics();

  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState(-1);
  const [isQuizAnswered, setIsQuizAnswered] = useState(false);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [displayQuestions, setDisplayQuestions] = useState<QuizQuestion[]>([]);
  const { sendActivity } = useSendActivityLogs()
  // initialize answers array when questions change, and shuffle options for display
  useEffect(() => {
    const shuffled = (questions || []).map((q: any) => {
      if (!Array.isArray(q.options) || q.options.length !== 4) return q;
      const indices = [0, 1, 2, 3];
      // Fisher-Yates shuffle
      for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
      }
      const options = indices.map((idx) => q.options[idx]);
      const answerExplanations = Array.isArray((q as any).answerExplanations)
        ? (q as any).answerExplanations!.map((_: any, i: number) => (q as any).answerExplanations![indices[i]])
        : (q as any).answerExplanations;
      const answer = indices.indexOf(0); // storage has correct at index 0
      return { ...q, options, answer, answerExplanations } as QuizQuestion;
    });
    setDisplayQuestions(shuffled);

    const count = shuffled.length || 0;
    setSelectedAnswers(Array(count).fill(-1));
    setCurrentQuizIndex(0);
    setSelectedQuizAnswer(-1);
    setIsQuizAnswered(false);
  }, [questions]);

  const { hasReachedDailyLimit, userAttributes } = useSessionContext();
  const { setIsRateLimitModalOpen } = useCommonContext();

  const goToNextQuiz = useCallback(() => {
    const total = displayQuestions?.length || 0;
    if (total === 0) return;
    setCurrentQuizIndex((prev) => {
      const next = Math.min(prev + 1, total - 1);
      const alreadySelected = selectedAnswers[next] ?? -1;
      setIsQuizAnswered(alreadySelected !== -1);
      setSelectedQuizAnswer(alreadySelected);
      return next;
    });
    track('right-panel-quiz-next-clicked', {
      quizIndex: currentQuizIndex + 1,
      totalQuizzes: displayQuestions?.length || 0,
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [displayQuestions?.length, currentQuizIndex, track, selectedAnswers, document]);

  const goToPreviousQuiz = useCallback(() => {
    const total = displayQuestions?.length || 0;
    if (total === 0) return;
    setCurrentQuizIndex((prev) => {
      const next = Math.max(prev - 1, 0);
      const alreadySelected = selectedAnswers[next] ?? -1;
      setIsQuizAnswered(alreadySelected !== -1);
      setSelectedQuizAnswer(alreadySelected);
      return next;
    });
    track('right-panel-quiz-previous-clicked', {
      quizIndex: currentQuizIndex + 1,
      totalQuizzes: displayQuestions?.length || 0,
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [displayQuestions?.length, currentQuizIndex, track, selectedAnswers, document]);

  const handleAnswerSelected = useCallback((idx: number) => {
    // prevent changing an already answered question
    if ((selectedAnswers[currentQuizIndex] ?? -1) !== -1) return;
    setSelectedQuizAnswer(idx);
    setIsQuizAnswered(true);
    setSelectedAnswers((prev) => {
      const next = [...prev];
      next[currentQuizIndex] = idx;
      return next;
    });
    track('right-panel-quiz-answer-selected', {
      answer: displayQuestions?.[currentQuizIndex]?.options?.[idx] || 'Unknown',
      correctIndex: displayQuestions?.[currentQuizIndex]?.answer,
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
    const isCorrect = idx === (displayQuestions?.[currentQuizIndex]?.answer ?? -1);
    track('answer_explanation_shown', {
      question_id: displayQuestions?.[currentQuizIndex]?.questionUuid || 'unknown',
      is_correct: isCorrect,
    });
    sendActivity({
      email: userAttributes?.email ?? '',
      lastActivityDate: new Date().toISOString(),
      traits: {
        lastActivityDate: new Date().toISOString(),
      }
    })
  }, [currentQuizIndex, displayQuestions, selectedAnswers, document, track, sendActivity, userAttributes]);

  const resetQuiz = useCallback(() => {
    setCurrentQuizIndex(0);
    setSelectedAnswers(Array(displayQuestions?.length || 0).fill(-1));
    setIsQuizAnswered(false);
    setSelectedQuizAnswer(-1);
    track('right-panel-quiz-reset', {
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [displayQuestions?.length, document, track]);

  const explainQuiz = useCallback(() => {
    if (!displayQuestions?.[currentQuizIndex] || !sendMessage) return;
    if (hasReachedDailyLimit) {
      setIsRateLimitModalOpen(true);
      return;
    }
    sendMessage({
      message: `Hey Curio, can you explain the question: "${displayQuestions[currentQuizIndex].questionContent}", these are the possible answers: "${displayQuestions[currentQuizIndex].options.join('", "')}"`,
      image: undefined,
    });
    track('right-panel-quiz-explain-clicked', {
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [currentQuizIndex, displayQuestions, sendMessage]);

  const getHint = useCallback(() => {
    if (!displayQuestions?.[currentQuizIndex] || !sendMessage) return;
    if (hasReachedDailyLimit) {
      setIsRateLimitModalOpen(true);
      return;
    }
    sendMessage({
      message: `Hey Curio, can you give me a hint for the question: "${displayQuestions[currentQuizIndex].questionContent}", these are the possible answers: "${displayQuestions[currentQuizIndex].options.join('", "')}"`,
      image: undefined,
    });
    track('right-panel-quiz-hint-clicked', {
      isSpacePage: document === null,
      isDocumentPDF: document?.type !== 'youtube',
    });
  }, [currentQuizIndex, displayQuestions, sendMessage]);

  return {
    questions: displayQuestions,
    currentQuizIndex,
    goToNextQuiz,
    goToPreviousQuiz,
    handleAnswerSelected,
    selectedQuizAnswer,
    isQuizAnswered,
    resetQuiz,
    explainQuiz,
    getHint,
    selectedAnswers,
  }
}