"use client";

import { MockExamSingleQuestion } from "@/components/mock-exams/flow/mock-exam-single-question";
import { useSATMiniExamFlow } from "@/hooks/api/sat-mini/use-sat-mini-exam-flow.api";
import { useParams } from "next/navigation";
import { useAuthenticator } from "@aws-amplify/ui-react";

export function TakeExamAsTab() {
  const params = useParams();
  const logUuid = params?.logUuid as string;
  const { user } = useAuthenticator(context => [context.user]);

  const {
    currentQuestionIndex,
    currentQuestion,
    allQuestions,
    totalAnswered,
    handleAnswer,
    handleNext,
    isLoading,
  } = useSATMiniExamFlow({
    examLogUuid: logUuid || null,
    userUuid: user?.userId || null,
  });

  if (isLoading || !currentQuestion) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-gray-900">
            SAT MINI Exam
          </h2>
          <div className="text-sm text-gray-600">
            Question {currentQuestionIndex + 1} / {12}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(totalAnswered / 12) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 overflow-y-auto">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <MockExamSingleQuestion
            questionContent={currentQuestion.questionContent}
            options={currentQuestion.options}
            correctAnswer={currentQuestion.correctAnswer}
            hint={currentQuestion.hint}
            answerExplanations={currentQuestion.answerExplanations}
            questionReference={currentQuestion.questionReference}
            onAnswer={handleAnswer}
            onNext={handleNext}
            initialSelected={currentQuestion.givenAnswer ?? null}
            initialHasChecked={currentQuestion.givenAnswer !== null && currentQuestion.givenAnswer !== undefined}
            showQuestionNumber={true}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={allQuestions.length}
          />
        </div>
      </div>
    </div>
  );
}

