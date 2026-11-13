import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { MockExamQuestion, QuestionAnswer } from "@/lib/types/mock-exam";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAnalytics, useCommonContext } from "@/providers";
import { MockExamSingleQuestion } from "./mock-exam-single-question";

interface MockExamQuizProps {
  questions: MockExamQuestion[];
  answers: QuestionAnswer[];
  timed?: boolean;
  timeLimitMs?: number;
  onQuestionAnswered: (score: { givenAnswer: number; questionIndex: number }) => void;
  onFinish: () => Promise<boolean>;
  setLastQuestionStartTime: (time: number) => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PreparedQuestion = MockExamQuestion & { optionOrigIndices: number[] };

export function MockExamQuiz({ questions, answers, onFinish, timed, timeLimitMs, onQuestionAnswered, setLastQuestionStartTime }: MockExamQuizProps) {
   // Stable shuffle per question index across refetches/rerenders during component lifetime
  const searchParams = useSearchParams();
  const { track } = useAnalytics();
  const { isMobile } = useCommonContext();
  const router = useRouter();
  const pathname = usePathname();
  const currentQuestionIndex = searchParams.get('question') || 0;

  const isAnsweringRef = useRef(false);

  const mappingRef = useRef<Record<number, number[]>>({});
  const preparedQuestions = useMemo<PreparedQuestion[]>(() => {
    return questions.map((q) => {
      let mapping = mappingRef.current[q.index];
      const needNewMapping = !mapping || mapping.length !== q.options.length;
      if (needNewMapping) {
        mapping = shuffle(Array.from({ length: q.options.length }, (_, i) => i));
        mappingRef.current[q.index] = mapping;
      }
      const newOptions = mapping.map((orig) => q.options[orig]);
      const newExpls = mapping.map((orig) => q.answerExplanations?.[orig] ?? "");
      const correctIndex = mapping.findIndex((orig) => orig === q.answer);
      const optionOrigIndices = mapping.slice();
      return { ...q, options: newOptions, answerExplanations: newExpls, answer: correctIndex, optionOrigIndices, questionReference: q.questionReference };
    });
  }, [questions]);

  const [index, setIndex] = useState(currentQuestionIndex ? parseInt(currentQuestionIndex as string) : answers.length);
  const [selected, setSelected] = useState<number | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const total = preparedQuestions.length;

  const current = preparedQuestions[index];
  const [hasChecked, setHasChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {    
    const targetIndex = currentQuestionIndex ? parseInt(currentQuestionIndex as string) : answers.length;
    setIndex(targetIndex);

    // if we already answered the question, restore UI state using the shuffled mapping
    const answer = answers.find((a) => a.index === targetIndex);
    if (answer?.givenAnswer != null) {
      const originalIdx = answer.givenAnswer;
      const uiIdx = current?.optionOrigIndices?.findIndex((orig) => orig === originalIdx);
      if (uiIdx != null && uiIdx >= 0) {
        setSelected(uiIdx);
        setHasChecked(true);
        setIsCorrect(uiIdx === current.answer);
        setLastQuestionStartTime(new Date().getTime());
        return;
      }
    }

    setSelected(null);
    setHasChecked(false);
    setIsCorrect(null);
    setLastQuestionStartTime(new Date().getTime());
  }, [currentQuestionIndex, answers.length, current, setLastQuestionStartTime]);

  // simple timer
  const [remainingMs, setRemainingMs] = useState(timeLimitMs || 0);
  useEffect(() => {
    if (!timed || !timeLimitMs) return;
    setRemainingMs(timeLimitMs);
    const id = setInterval(() => {
      setRemainingMs((ms) => {
        if (ms <= 1000) {
          clearInterval(id);
          // time's up
          onFinish();
          return 0;
        }
        return ms - 1000;
      });
    }, 1000);
      return () => clearInterval(id);
  }, [timed, timeLimitMs, onFinish]);

  const minutes = useMemo(() => Math.floor(remainingMs / 60000), [remainingMs]);
  const seconds = useMemo(() => Math.floor((remainingMs % 60000) / 1000), [remainingMs]);

  // compute next unanswered index (after current)
  const nextUnansweredIndex = useMemo(() => {
    if (!current) return null;

    const answeredSet = new Set<number>(answers.filter((a) => a.givenAnswer != null).map((a) => a.index));
    if (hasChecked) answeredSet.add(current.index);
    for (let i = current.index === preparedQuestions.length - 1 ? 0 : index + 1; i < preparedQuestions.length; i++) {
      if (!answeredSet.has(preparedQuestions[i].index)) return i;
    }
    return null;
  }, [answers, hasChecked, index, preparedQuestions, current]);

  useEffect(() => {
    if (typeof currentQuestionIndex !== 'string') {
      // navigate to the first question
      if (!nextUnansweredIndex) {
        router.push(`?question=0`);
        return;
      };

      router.push(`?question=${nextUnansweredIndex-1}`);
    };
  }, [currentQuestionIndex, router, nextUnansweredIndex]);

  if (!current) {
    return (
      <div className="flex flex-col gap-6 p-4">
        <div className="text-lg font-medium mb-3">Loading next question</div>
      </div>
    );
  };

  const handleAnswer = useCallback((selectedIndex: number, correct: boolean) => {
    setIsCorrect(correct);
    setHasChecked(true);
    if (correct) setCorrectCount((c) => c + 1);
    const originalGivenIndex = current.optionOrigIndices[selectedIndex];
    onQuestionAnswered({ givenAnswer: originalGivenIndex, questionIndex: current.index });
  }, [current, onQuestionAnswered]);

  const handleNext = useCallback(() => {
    if (nextUnansweredIndex != null) {
      track('mock-exam-quiz-next-question-clicked');
      const url = `${pathname}?question=${nextUnansweredIndex}`;
      router.push(url);
    } else {
      onFinish();
    }
  }, [nextUnansweredIndex, track, pathname, router, onFinish]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="w-full"
      >
        {timed && !!timeLimitMs && (
          <div className="self-end text-sm text-muted-foreground pb-2">
            Time left: {minutes}:{seconds.toString().padStart(2, '0')}
          </div>
        )}

        <MockExamSingleQuestion
          questionContent={current.questionContent}
          options={current.options}
          correctAnswer={current.answer}
          hint={current.hint}
          answerExplanations={current.answerExplanations}
          questionReference={current.questionReference}
          onAnswer={handleAnswer}
          onNext={nextUnansweredIndex != null ? handleNext : onFinish}
          initialSelected={selected}
          initialHasChecked={hasChecked}
          showQuestionNumber={true}
          questionNumber={index + 1}
          totalQuestions={total}
          isMobile={isMobile}
          nextUnansweredIndex={nextUnansweredIndex}
        />
      </motion.div>
    </AnimatePresence>
  );
}
