"use client";

import { MockExam } from "@/components/mock-exams/flow/mock-exam";
import { useTakeExam } from "@/hooks/use-take-exam";
import { CoreActionsTabs, Features } from "../core/core-actions-tabs";
import { useEffect, useMemo } from "react";
import { useCommonContext } from "@/providers/common-provider";
import { useSessionContext } from "@/providers/session-provider";

export function MockExamViewerItem({ mockExamUuid }: { mockExamUuid: string }) {
  const { isMobile, collapseSidebar, uncollapseSidebar } = useCommonContext();
  const { userProfile } = useSessionContext();

  useEffect(() => {
    collapseSidebar();
    return () => {
      uncollapseSidebar();
    }
  }, [collapseSidebar, uncollapseSidebar]);

  const isFreeTrial = useMemo(() => {
    return userProfile?.freeSATMockExamUuid === mockExamUuid;
  }, [userProfile?.freeSATMockExamUuid, mockExamUuid]);
  
  const {
    screen,
    setScreen,
    error,
    mockExam,
    handleStartMockExam,
    handleFinishMockExam,
    handleAnswerQuestionMockExam,
    hasQuestionsGenerated,
    orderedQuestions,
    answers,
    score,
    questionsCount,
    setLastQuestionStartTime,
  } = useTakeExam({ mockExamUuid, isFreeTrial });

  const features = useMemo<Features[]>(() => {
    return ['practice-question', 'question-chat', 'question-list'] as Features[];
  }, []);

  if (isMobile) {
    return (
      <main className="flex flex-col items-center pt-3 w-full h-full">
        <div className="w-full max-w-6xl h-full">
          <CoreActionsTabs defaultTab='practice-question' features={features} loadingTabs={[]} />
        </div>
      </main>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto px-4 max-w-4xl mx-auto">
      {error && <div className="h-full flex flex-col justify-center items-center flex-1 gap-10">
        <span className="text-red-500 text-3xl font-bold">{error}</span>
      </div>}
      {!error && (
        <MockExam
          screen={screen}
          setScreen={setScreen}
          title={mockExam?.title}
          info={mockExam?.mockExamInfo}
          questions={orderedQuestions}
          answers={answers || []}
          hasQuestionsGenerated={hasQuestionsGenerated}
          questionCount={questionsCount}
          score={score}
          onStart={handleStartMockExam}
          onFinish={handleFinishMockExam}
          onQuestionAnswered={handleAnswerQuestionMockExam}
          setLastQuestionStartTime={setLastQuestionStartTime}
          isFreeTrial={isFreeTrial}
        />
      )}
    </div>
  );
}