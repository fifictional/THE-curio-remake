"use client";

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthenticator } from '@/lib/local-auth-react';
import { MockExamSingleQuestion } from '@/components/mock-exams/flow/mock-exam-single-question';
import { ExamResults } from '@/components/satus/exam-results';
import { useCreateGeneralChatApi } from '@/hooks/api/chats/use-create-general-chat.api';
import { useSessionContext, useCommonContext } from '@/providers';
import { useSATMiniExamFlow } from '@/hooks/api/sat-mini/use-sat-mini-exam-flow.api';
import { CoreActionsTabs, Features } from '@/components/core/core-actions-tabs';
import { useAnalytics } from '@/providers/analytics-provider';

export default function TakeSATMiniExamPage() {
  const { route, user } = useAuthenticator(context => [context.route, context.user]);
  const router = useRouter();
  const params = useParams();
  const logUuid = params?.logUuid as string;
  const { track } = useAnalytics();

  const { isUserSubscribed } = useSessionContext();
  const { openRightPanel, closeRightPanel, setCurrentQuestion } = useCommonContext();
  const { onChatStarted } = useCreateGeneralChatApi({ spaceUuid: null });
  const { isMobile } = useCommonContext();
  const hasTrackedExamStart = useRef(false);
  
  // Use custom hook for exam flow
  const {
    currentQuestionIndex,
    currentQuestion,
    allQuestions,
    totalAnswered,
    modules,
    examLog,
    examResults,
    previousScore,
    showResults,
    needsAdaptiveGeneration,
    isLoading,
    isSaving,
    isGenerating,
    isCompleting,
    error,
    handleAnswer,
    handleNext,
    navigateToDashboard,
  } = useSATMiniExamFlow({
    examLogUuid: logUuid || null,
    userUuid: user?.userId || null,
  });

  // Track exam page load (only once)
  useEffect(() => {
    if (!isLoading && examLog && !hasTrackedExamStart.current) {
      hasTrackedExamStart.current = true;
      track('sat_exam_page_loaded', {
        exam_uuid: logUuid,
        status: examLog.status,
        is_resuming: totalAnswered > 0,
        total_answered: totalAnswered,
        total_questions: 12,
        is_subscribed: isUserSubscribed,
        is_mobile: isMobile,
      });
    }
  }, [isLoading, examLog, logUuid, totalAnswered, isUserSubscribed, isMobile, track]);

  // Redirect if not authenticated
  useEffect(() => {
    if (route === 'idle') return;
    
    if (!user) {
      router.replace('/satus-onboarding');
    }
  }, [route, user, router]);

  // Open right panel with SAT question chat and set current question
  useEffect(() => {
    if (!showResults && !isLoading && currentQuestion) {
      // Set the current question in common context
      setCurrentQuestion({
        questionId: currentQuestion.questionId,
        questionContent: currentQuestion.questionContent,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.correctAnswer,
        hint: currentQuestion.hint,
        concept: currentQuestion.concept,
        subtopic: currentQuestion.subtopic,
        difficulty: currentQuestion.difficulty,
      });
      
      // Open right panel with SAT question chat
      openRightPanel({ features: ['sat-question-chat'] });
    }

    // Cleanup: close right panel and clear current question
    return () => {
      setCurrentQuestion(null);
      closeRightPanel();
    };
  }, [showResults, isLoading, currentQuestion, openRightPanel, closeRightPanel, setCurrentQuestion]);

  // Handle starting a new chat from recommended practice
  const handleStartChat = useCallback(async (prompt: string) => {
    if (!user) return;
    track('sat_exam_results_practice_clicked', {
      exam_uuid: logUuid,
      predicted_score: examResults?.predictedSATScore || 0,
      prompt_preview: prompt.substring(0, 50),
      is_subscribed: isUserSubscribed,
    });
    await onChatStarted(prompt);
  }, [user, onChatStarted, track, logUuid, examResults, isUserSubscribed]);

  // Wrap answer handler to emit tracking for correct/wrong answers
  const handleAnswerTracked = useCallback((selectedIndex: number, isCorrect: boolean) => {
    track('sat_exam_answer_submitted', {
      exam_uuid: logUuid,
      is_correct: isCorrect,
      question_id: currentQuestion?.questionId || 'unknown',
      question_index: currentQuestionIndex + 1,
      selected_index: selectedIndex,
      correct_index: currentQuestion?.correctAnswer ?? -1,
      concept: currentQuestion?.concept || 'unknown',
      difficulty: currentQuestion?.difficulty || 'unknown',
    });
    // Call original handler
    handleAnswer(selectedIndex, isCorrect);
  }, [track, logUuid, currentQuestion, currentQuestionIndex, handleAnswer]);

  // Wrap navigation with tracking
  const handleBackToDashboard = useCallback(() => {
    track('sat_exam_back_to_dashboard_clicked', {
      exam_uuid: logUuid,
      status: examLog?.status || 'unknown',
      total_answered: totalAnswered,
      from_results: showResults,
      is_subscribed: isUserSubscribed,
    });
    navigateToDashboard();
  }, [track, logUuid, examLog, totalAnswered, showResults, isUserSubscribed, navigateToDashboard]);

  // Define features for mobile tabs
  const features = useMemo<Features[]>(() => {
    return ['take-exam', 'sat-question-chat'] as Features[];
  }, []);

  // Track exam completion and show results
  useEffect(() => {
    if (showResults && examResults) {
      track('sat_exam_results_viewed', {
        exam_uuid: logUuid,
        predicted_score: examResults.predictedSATScore,
        math_score: examResults.mathScore,
        rw_score: examResults.readingWritingScore,
        total_correct: examResults.totalCorrect,
        total_questions: 12,
        accuracy: Math.round((examResults.totalCorrect / 12) * 100),
        score_delta: previousScore ? examResults.predictedSATScore - previousScore : 0,
        is_subscribed: isUserSubscribed,
      });
    }
  }, [showResults, examResults, logUuid, previousScore, isUserSubscribed, track]);

  // Show results page if exam is completed
  if (showResults && examResults) {
    return (
      <ExamResults
        predictedSATScore={examResults.predictedSATScore}
        readingWritingScore={examResults.readingWritingScore}
        mathScore={examResults.mathScore}
        totalCorrect={examResults.totalCorrect}
        totalQuestions={12}
        modules={modules}
        previousScore={previousScore}
        masteryUpdates={examResults.masteryUpdates}
        onStartNewChat={handleStartChat}
        userUuid={user?.userId}
        isUserSubscribed={isUserSubscribed}
      />
    );
  }

  // Show loading while checking auth status
  if (route === 'idle' || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Show error state
  if (error || !examLog) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Exam not found'}</p>
          <button
            onClick={handleBackToDashboard}
            className="bg-gray-700 text-white hover:bg-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Show message if no current question, generating adaptive questions, or completing exam
  if (!currentQuestion || isGenerating || isCompleting) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="max-w-md mx-auto px-4 text-center">
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Generating Adaptive Questions...
              </h1>
              <p className="text-gray-600 mb-6">
                Based on your performance, we're selecting the next set of questions tailored to your level.
              </p>
            </>
          ) : isCompleting ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Calculating Your Score...
              </h1>
              <p className="text-gray-600 mb-6">
                Analyzing your performance and generating your predicted SAT score.
              </p>
            </>
          ) : needsAdaptiveGeneration ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Ready for Adaptive Questions
              </h1>
              <p className="text-gray-600 mb-6">
                Click "Next" on the last question to continue with questions matched to your performance.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Exam Complete!
              </h1>
              <p className="text-gray-600 mb-6">
                Great job! You've completed all questions.
              </p>
              <button
                onClick={handleBackToDashboard}
                className="bg-gray-700 text-white hover:bg-gray-900 font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Back to Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Mobile view with tabs
  if (isMobile) {
    return (
      <main className="flex flex-col items-center w-full h-full">
        <div className="w-full max-w-6xl h-full">
          <CoreActionsTabs defaultTab='take-exam' features={features} loadingTabs={[]} />
        </div>
      </main>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToDashboard}
            className="cursor-pointer text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              SAT MINI Exam
            </h1>
            <div className="text-sm text-gray-600">
              Progress: {currentQuestionIndex + 1} / {12}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gray-700 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(totalAnswered / 12) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <MockExamSingleQuestion
            questionContent={currentQuestion.questionContent}
            options={currentQuestion.options}
            correctAnswer={currentQuestion.correctAnswer}
            hint={currentQuestion.hint}
            answerExplanations={currentQuestion.answerExplanations}
            questionReference={currentQuestion.questionReference}
            onAnswer={handleAnswerTracked}
            onNext={handleNext}
            initialSelected={currentQuestion.givenAnswer ?? null}
            initialHasChecked={currentQuestion.givenAnswer !== null && currentQuestion.givenAnswer !== undefined}
            showQuestionNumber={true}
            questionNumber={currentQuestionIndex + 1}
            totalQuestions={allQuestions.length}
          />
        </div>

        {/* Debug Info (temporary) */}
        {needsAdaptiveGeneration && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ After this module, adaptive questions will be generated based on your performance.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

