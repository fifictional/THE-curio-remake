'use client';

import { CurioLoading } from "../ui/curio-loading";
import Image from "next/image";
import { QuizItem } from "./quiz-item";
import { Pagination } from "../ui/pagination";
import { QuizQuestion } from "@/lib/types";
import { Button } from "../ui/button";
import { useEffect, useState } from "react";
import { useAnalytics } from "@/providers/analytics-provider";

interface SpaceQuizzesProps {
  isStillProcessingQuizzes: boolean;
  questions: QuizQuestion[];
  currentQuizIndex: number;
  goToNextQuiz: () => void;
  goToPreviousQuiz: () => void;
  handleAnswerSelected: (idx: number) => void;
  selectedQuizAnswer: number;
  isQuizAnswered: boolean;
}

export function SpaceQuizzes({ isStillProcessingQuizzes, questions, currentQuizIndex, goToNextQuiz, goToPreviousQuiz, handleAnswerSelected, selectedQuizAnswer, isQuizAnswered }: SpaceQuizzesProps) {
  const [showHint, setShowHint] = useState(false);
  const { track } = useAnalytics();

  useEffect(() => {
    setShowHint(false);
  }, [currentQuizIndex]);
  return (
    <div className="p-4 flex flex-col h-full">
      {isStillProcessingQuizzes && questions.length === 0 && <CurioLoading />}
      {questions.length === 0 && !isStillProcessingQuizzes && (
        <div className="flex-1 flex flex-col gap-10 justify-center items-center">
          <p className="text-baseline text-gray-500">No relevant quizzes found</p>
          <p className="flex justify-center items-center">
            <Image src="/no-flash-no-quiz.png" alt="No relevant quizzes found" width={200} height={400} />
          </p>
        </div>
      )}
      {questions.length > 0 && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 flex flex-col">
            <QuizItem
              key={questions[currentQuizIndex].questionUuid}
              quiz={questions[currentQuizIndex]}
              onAnswerSelected={handleAnswerSelected}
              selectedAnswer={selectedQuizAnswer}
              isAnswered={isQuizAnswered}
            />
            {/* Pagination */}
            <Pagination
              currentIndex={currentQuizIndex}
              total={questions?.length || 0}
              onNext={goToNextQuiz}
              onPrevious={goToPreviousQuiz}
              canGoPrevious={questions.length > 0}
              canGoNext={isQuizAnswered}
              testIdPrefix="quiz"
            />
            {/* Answer response / Hint area (below nav) */}
            {isQuizAnswered ? (
              <div className={`mt-2 mx-2 rounded-md text-sm px-3 py-2 border ${selectedQuizAnswer === questions[currentQuizIndex].answer ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}> 
                {(
                  Array.isArray(questions[currentQuizIndex].answerExplanations) &&
                  questions[currentQuizIndex].answerExplanations![selectedQuizAnswer]
                )
                  ? questions[currentQuizIndex].answerExplanations![selectedQuizAnswer]
                  : (selectedQuizAnswer === questions[currentQuizIndex].answer ? 'Correct' : 'Incorrect')}
              </div>
            ) : (
              !!questions[currentQuizIndex].hint && (
                <div className="mt-2 mx-2">
                  {!showHint ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowHint(true);
                        track('hint_clicked', { question_id: questions[currentQuizIndex].questionUuid });
                      }}
                    >
                      Hint
                    </Button>
                  ) : (
                    <div className="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">{questions[currentQuizIndex].hint}</div>
                  )}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}


