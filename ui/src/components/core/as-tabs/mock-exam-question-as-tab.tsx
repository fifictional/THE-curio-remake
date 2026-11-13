import { MockExam } from "@/components/mock-exams/flow/mock-exam";
import { useTakeExam } from "@/hooks/use-take-exam";
import { useParams } from "next/navigation";
import { useSessionContext } from "@/providers/session-provider";
import { useMemo } from "react";

export function MockExamQuestionAsTab() {
  const { mockExamUuid } = useParams();
  const { userProfile } = useSessionContext();
  
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
  } = useTakeExam({ mockExamUuid: mockExamUuid as string, isFreeTrial });

  return (
    <div className="h-full flex flex-col">
      {error && <div className="flex flex-col justify-center items-center flex-1 gap-10">
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