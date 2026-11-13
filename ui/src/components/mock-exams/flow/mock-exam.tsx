import { useCallback, useEffect, useMemo } from "react";
import { MockExamIntro } from "./mock-exam-intro";
import { MockExamQuiz } from "./mock-exam-quiz";
import { MockExamEnd } from "./mock-exam-end";
import { MockExamInfo, MockExamQuestion, QuestionAnswer } from "@/lib/types/mock-exam";
import { QuizScreen } from "@/hooks/use-take-exam";
import { useCommonContext } from "@/providers/common-provider";
import { Features } from "@/components/core/core-actions-tabs";
import { useRouter } from "next/navigation";
import { MockExamQuizRecap } from "./mock-exam-quiz-recap";
import { useAnalytics } from "@/providers";

interface MockExamProps {
  screen: QuizScreen;
  setScreen: (screen: QuizScreen) => void;
  title?: string;
  info?: MockExamInfo;
  questions: MockExamQuestion[];
  answers: QuestionAnswer[];
  onStart: () => Promise<boolean>;
  onFinish: () => Promise<boolean>;
  onQuestionAnswered: (score: { givenAnswer: number; questionIndex: number }) => void;
  hasQuestionsGenerated: boolean;
  score: number;
  questionCount: number;
  setLastQuestionStartTime: (time: number) => void;
  isFreeTrial?: boolean;
}

function parseTimeToMs(time?: string | null): number | undefined {
  if (!time) return undefined;
  const m = time.match(/^(\d+)(m|s|min)$/i);
  if (!m) return undefined;
  const val = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  if (unit === 'm' || unit === 'min') return val * 60_000;
  if (unit === 's') return val * 1_000;
  return undefined;
}

export function MockExam({ screen, setScreen, title, info, questions, onStart, onFinish, hasQuestionsGenerated, score, onQuestionAnswered, questionCount, answers, setLastQuestionStartTime, isFreeTrial }: MockExamProps) {
  const timeLimitMs = useMemo(() => parseTimeToMs(info?.time?.toString() || undefined), [info?.time]);
  const { openRightPanel, closeRightPanel, collapseSidebar, uncollapseSidebar } = useCommonContext();
  const timed = !!timeLimitMs;
  const { track } = useAnalytics();
  const router = useRouter();

  const handleRestart = useCallback(() => {
    setScreen('intro');
  }, [setScreen]);

  const handleStart = useCallback(async () => {
    const response = await onStart();
    if (response) {
      track('mock-exam-start-clicked', {
        title: title || '',
        isFreeTrial: isFreeTrial || false,
      });
      setScreen('quiz');
      router.push('?question=0');
    }
  }, [onStart]);

  useEffect(() => {
    if (screen === 'quiz' || screen === 'end') {
      openRightPanel({ features: ['question-list', 'question-chat'] as Features[] });
      collapseSidebar();
      return () => {
        closeRightPanel();
        uncollapseSidebar();
      }
    } else {
      closeRightPanel();
      uncollapseSidebar();
    }
  }, [screen]);


  return (
    <div className="flex-1 flex flex-col">
      {screen === 'intro' && (
        <div className="flex flex-col justify-center items-center flex-1 gap-10">
          <MockExamIntro
            title={title}
            description={info?.description || undefined}
            instructions={info?.instructions || undefined}
            questionCount={info?.questionCount ?? questionCount}
            time={info?.time?.toString() || null}
            canStart={hasQuestionsGenerated}
            onStart={handleStart}
          />
        </div>
      )}

      {screen === 'quiz' && (
        <div className="flex flex-col gap-10 w-full mx-auto h-full">
          <div className="flex flex-col flex-1 gap-10">
            <MockExamQuiz
              questions={questions}
              answers={answers}
              timed={timed}
              timeLimitMs={timeLimitMs}
              onQuestionAnswered={onQuestionAnswered}
              onFinish={onFinish}
              setLastQuestionStartTime={setLastQuestionStartTime}
            />
          </div>
        </div>
      )}

      {screen === 'end' && (
        <div className="flex flex-col justify-center items-center flex-1 gap-10">
          <MockExamEnd title={title} answers={answers} score={score} questions={questions} onRestart={handleRestart} isFreeTrial={isFreeTrial} />

          {/* show all the questions and answers */}
          <MockExamQuizRecap questions={questions} answers={answers} isFreeTrial={isFreeTrial} />
        </div>
      )}
    </div>
  );
}
