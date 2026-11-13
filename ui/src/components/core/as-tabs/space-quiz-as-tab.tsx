import { usePanelQuizzes } from "@/hooks/use-panel-quizzes";
import { SpaceQuizzes } from "../space-quizzes";
import { useChatContext } from "@/providers/chat-provider";
import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmPopover } from "@/components/ui/confirm-popover";
import { Trash2Icon } from "lucide-react";
import { CurioLoading } from "@/components/ui/curio-loading";
import { useAnalytics } from "@/providers/analytics-provider";
import { useAmplifyApiClient, useCommonContext, useCoreContext, useSessionContext, useSpaceContext } from "@/providers";
import { v4 as uuidv4 } from 'uuid';
import { useQuizByIdApi } from "@/hooks/api/quizzes/use-quiz-by-id.api";
import { useQuizzesBySourceApi } from "@/hooks/api/quizzes/use-quizzes-by-source.api";
import { useQuizzesBySpaceApi } from "@/hooks/api/spaces/use-quizzes-by-space.api";
import { QuizAttempt } from "@/lib/types/quiz";
import { CurioMarkdown } from "../curio-markdown";
import { useUserActionLog } from "@/hooks/api/user-action-log/useUserActionLog.api";
import { CurioLoadingWithSearch } from "@/components/ui/curio-loading-search";
import { useLoadingMessage } from "@/hooks/use-loading-message";
import { useEnqueueQuizMemoryApi } from "@/hooks/api/memory/use-enqueue-quiz-memory.api";

const MAX_FREE_QUESTIONS = process.env.NEXT_PUBLIC_MAX_FREE_QUESTIONS ? Number(process.env.NEXT_PUBLIC_MAX_FREE_QUESTIONS) : 5;

export function SpaceQuizAsTab() {
  const [activeQuizUuid, setActiveQuizUuid] = useState<string | null>(null);
  const { questions: activeQuizQuestions, isLoading: isLoadingQuizById } = useQuizByIdApi({ quizUuid: activeQuizUuid });
  const { questions, currentQuizIndex, goToNextQuiz, goToPreviousQuiz, handleAnswerSelected, selectedQuizAnswer, isQuizAnswered, resetQuiz, selectedAnswers } = usePanelQuizzes({ questions: activeQuizQuestions || [] });
  const { userActionLogs, isLoading: isLoadingUserActionLogs } = useUserActionLog('generated_questions', true);
  const { isUserSubscribed } = useSessionContext();
  const { chat } = useChatContext();
  const { enqueueQuizMemory } = useEnqueueQuizMemoryApi();
  const { document, documentSummary } = useCoreContext();
  const { processingDocumentsUuids } = useCommonContext();
  const { spaceUuid } = useSpaceContext();
  const { track } = useAnalytics();
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const { message } = useLoadingMessage()
  type Phase = 'intro' | 'loading' | 'quiz' | 'outro';
  const [phase, setPhase] = useState<Phase>('intro');
  const [introError, setIntroError] = useState<string | null>(null);

  const { quizzes: allQuizzes, isLoading: isLoadingQuizzes } = useQuizzesBySourceApi({ sourceUuid: document?.documentUuid || chat?.chatUuid || null });
  const showGenerateQuizButton = useMemo(() => !!(document?.documentUuid || chat?.chatUuid), [document?.documentUuid, chat?.chatUuid]);
  const showSpaceQuizzes = useMemo(() => !showGenerateQuizButton && !!spaceUuid, [showGenerateQuizButton, spaceUuid]);
  const { quizzes: spaceQuizzes, isLoading: isLoadingSpaceQuizzes } = useQuizzesBySpaceApi(spaceUuid);
  const quizzesSource = useMemo(() => showSpaceQuizzes ? spaceQuizzes : allQuizzes, [allQuizzes, spaceQuizzes, showSpaceQuizzes]);
  const generatingQuizzes = useMemo(() => quizzesSource.filter((q) => q.state === 'generating'), [quizzesSource]);
  const quizzes = useMemo(() => quizzesSource.filter((q) => q.state !== 'generating'), [quizzesSource]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [showOutroScore, setShowOutroScore] = useState(false);

  // Document is loading if it's processing or summary is not completed
  const isDocumentLoading = (processingDocumentsUuids.length > 0
    && processingDocumentsUuids.some(taskDocUuid => taskDocUuid === document?.documentUuid || '')) || (documentSummary?.status !== 'completed' && !documentSummary?.summary);


  // Sync outro score fade-in with ring animation when phase switches to 'outro'
  useEffect(() => {
    if (phase === 'outro') {
      setShowOutroScore(false);
      const t = setTimeout(() => setShowOutroScore(true), 2100);
      return () => clearTimeout(t);
    } else {
      setShowOutroScore(false);
    }
  }, [phase]);

  // If we're in loading and the quiz questions finish loading, move to quiz
  useEffect(() => {
    if (phase === 'loading' && !isLoadingQuizById) {
      setPhase('quiz');
    }
  }, [phase, isLoadingQuizById]);

  // Loading timeout -> back to intro with message
  useEffect(() => {
    if (phase !== 'loading') return;
    const timer = setTimeout(() => {
      setPhase('intro');
      setIntroError("Couldn't start quiz. Try again.");
    }, 30000);
    return () => clearTimeout(timer);
  }, [phase]);

  // A Generic function to start a quiz
  const startQuiz = (quizUuid: string) => {
    setActiveQuizUuid(quizUuid);
    setPhase('loading');
    track('quiz_loading', { quizUuid });
  }

  // Generate a quiz
  const generateQuiz = async (count: number) => {
    try {
      // UX: stay on intro list and show a generating placeholder
      setIntroError(null);
      setIsGenerating(true);
      const res = await fetch('/api/quizzes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userUuid: chat?.userUuid || document?.userUuid || '',
          sourceType: document?.documentUuid ? 'document' : 'chat',
          sourceUuid: document?.documentUuid || chat?.chatUuid || null,
          quiz: {
            questionCount: count,
            title: '',
            description: '',
            difficulty: '',
          },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate quiz');
      }

      track('quiz_generated', { chat_id: chat?.chatUuid || null, doc_id: chat?.documentUuid || null, question_count: count });

      // If user is still on the list, auto-start the newly created quiz
      if (phase === 'intro') {
        startQuiz(data.quizUuid);
      }
    } catch (e) {
      setIntroError('Failed to generate quiz. Please try again.');
    }

    setIsGenerating(false);
  };

  const onNextGated = async () => {
    if (!isQuizAnswered) return; // gate forward until answered
    const isLast = currentQuizIndex === (questions?.length || 0) - 1;
    if (isLast) {
      // compute score and persist to QuizAttempt (if taking a saved quiz)
      const total = questions?.length || 0;
      const correct = questions.reduce((acc, q, idx) => acc + ((selectedAnswers[idx] ?? -1) === q.answer ? 1 : 0), 0);
      track('quiz_completed', { chat_id: chat?.chatUuid || null, doc_id: chat?.documentUuid || null, correct_count: correct, total_count: total });
      if (activeQuizUuid && userAttributes?.userUuid) {
        // Find existing attempt for this quiz and user
        const quiz = quizzes.find(q => q.quizUuid === activeQuizUuid);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const attemptsArray = Array.isArray(quiz?.attempts) ? quiz.attempts : (quiz?.attempts as any) ? [(quiz?.attempts as any)] : [];
        const existingAttempt = attemptsArray[0] as QuizAttempt | undefined;
        
        const now = new Date().toISOString();
        
        const topic =
          documentSummary?.title ||
          chat?.name ||
          quiz?.title ||
          'Quiz topic';
        const subject = documentSummary?.tags?.[0] || undefined;

        if (existingAttempt?.quizAttemptUuid) {
          await client.models.QuizAttempt.update({
            quizAttemptUuid: existingAttempt.quizAttemptUuid,
            score: correct,
            total: total,
            updatedAt: now,
          });
          void enqueueQuizMemory({
            quizUuid: activeQuizUuid,
            quizAttemptUuid: existingAttempt.quizAttemptUuid,
            score: correct,
            total,
            topic,
            subject,
            documentUuid: chat?.documentUuid ?? document?.documentUuid ?? null,
            spaceUuid: chat?.spaceUuid ?? null,
            occurredAt: now,
          }).catch(() => {});
        } else {
          const quizAttemptUuid = uuidv4();
          await client.models.QuizAttempt.create({
            quizAttemptUuid,
            quizUuid: activeQuizUuid,
            userUuid: userAttributes.userUuid,
            score: correct,
            total: total,
            createdAt: now,
            updatedAt: now,
          });
          void enqueueQuizMemory({
            quizUuid: activeQuizUuid,
            quizAttemptUuid,
            score: correct,
            total,
            topic,
            subject,
            documentUuid: chat?.documentUuid ?? document?.documentUuid ?? null,
            spaceUuid: chat?.spaceUuid ?? null,
            occurredAt: now,
          }).catch(() => {});
        }
      }
      setPhase('outro');
      return;
    }
    goToNextQuiz();
  };

  const onPreviousUngated = () => {
    // If on first question, return to intro instead of staying in quiz
    if ((currentQuizIndex || 0) <= 0) {
      resetQuiz();
      setActiveQuizUuid(null);
      setPhase('intro');
      return;
    }
    goToPreviousQuiz();
  };

  const hasReachedDailyLimitForQuestions = useMemo(() => (userActionLogs?.filter((log) => log.actionType === 'generated_questions').length || 0) >= MAX_FREE_QUESTIONS && !isUserSubscribed, [userActionLogs, isUserSubscribed]);

  if (isDocumentLoading && document?.documentUuid) {
    return <CurioLoadingWithSearch message={message} />
  }

  if (phase === 'intro') {
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center gap-4 text-center">
        {introError && <div className="text-sm text-red-600">{introError}</div>}
        {isLoadingUserActionLogs && <div className="text-sm text-gray-500">Loading...</div>}
        {hasReachedDailyLimitForQuestions && <div className="max-w-md">
          <CurioMarkdown content={`🎓 **You've reached your daily limit for quiz generation!**

You can come back tomorrow to generate more quizzes, or upgrade to **Super Curio** for unlimited quiz generation, flashcards, practice tests, and more.

✨ [Upgrade to Super Curio](https://app.curio.to/exam-bundles?utm_source=space_quiz_as_tab&utm_medium=space_quiz_as_tab&utm_campaign=quiz_generation_limit_reached)

Your limit will reset tomorrow at midnight.`} />
        </div>}
        {showGenerateQuizButton && !hasReachedDailyLimitForQuestions && (
          <div className="flex flex-col items-center gap-2" data-testid="quiz-generate-buttons">
            <div className="text-sm text-gray-500">Ready for a challenge? How many questions do you want?</div>
            <div className="flex gap-3">
              {[3, 5, 7].map((n) => (
                <Button
                  key={n}
                  disabled={isGenerating}
                  onClick={() => generateQuiz(n)}
                  className="px-4"
                  data-testid={`generate-quiz-${n}-button`}
                >
                  {n} Questions
                </Button>
              ))}
            </div>
          </div>
        )}
        {isGenerating && generatingQuizzes.length > 0 && (
          <div className="mt-6 w-full max-w-md text-left">
            <div className="text-sm text-gray-500 mb-2">Generating</div>
            <div className="flex flex-col gap-2">
              {generatingQuizzes.map(q => {
                return (
                  <div className="flex items-center justify-between w-full border rounded px-3 py-2 text-left bg-gray-50 text-gray-500 select-none cursor-not-allowed">
                    <span className="text-sm">{q.title || new Date(q.createdAt).toLocaleString()}</span>
                    <span className="text-sm">Generating{` (${q.questionCount})`}…</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!!quizzes?.length && (
          <div className="mt-6 w-full max-w-md text-left" data-testid="previous-quizzes-list">
            <div className="text-sm text-gray-500 mb-2">Previous quizzes</div>
            <div className="flex flex-col gap-2">
              {quizzes.map(q => {
                const created = q.createdAt ? new Date(q.createdAt).toLocaleString() : '';
                // Get score from first attempt (if exists), otherwise show 0/questionCount
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const attemptsArray = Array.isArray(q.attempts) ? q.attempts : (q.attempts as any) ? [(q.attempts as any)] : [];
                const attempt = attemptsArray[0] as QuizAttempt | undefined;
                const scoreText = attempt ? `${attempt.score}/${attempt.total}` : `0/${q.questionCount}`;
                const isDeletingRow = deletingIds.has(q.quizUuid);
                return (
                  <div key={q.quizUuid} className={`flex items-center justify-between w-full border rounded px-3 py-2 bg-gray-50 hover:bg-gray-100 hover:border-gray-300 ${isDeletingRow ? 'opacity-50 pointer-events-none' : ''}`} data-testid={`quiz-item-${q.quizUuid}`}>
                    <button onClick={() => { if (isDeletingRow) return; setActiveQuizUuid(q.quizUuid); setPhase('loading'); }} className="flex-1 text-left" data-testid={`quiz-start-button-${q.quizUuid}`}>
                      <span className="text-sm text-gray-800">{q.title || created}</span>
                    </button>
                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className="text-sm text-gray-500">{scoreText}</span>
                      <ConfirmPopover
                        confirmLabel="Delete this quiz?"
                        label="Delete"
                        onConfirm={async () => {
                          setDeletingIds(prev => new Set(prev).add(q.quizUuid));
                          await fetch('/api/quizzes/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ quizUuid: q.quizUuid }) });
                          if (activeQuizUuid === q.quizUuid) { setActiveQuizUuid(null); setPhase('intro'); }
                        }}
                      >
                        <button
                          aria-label="Delete quiz"
                          className={`h-8 w-8 flex items-center justify-center rounded transition-colors ${isDeletingRow ? 'pointer-events-none opacity-50' : 'text-red-600 hover:text-white hover:bg-red-600'}`}
                          title="Delete"
                        >
                          <Trash2Icon className="w-4 h-4" />
                        </button>
                      </ConfirmPopover>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <CurioLoading />
      </div>
    );
  }

  if (phase === 'outro') {
    const total = questions?.length || 0;
    const correct = questions.reduce((acc, q, idx) => acc + (((selectedAnswers[idx] ?? -1) === q.answer) ? 1 : 0), 0);
    const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <div className="p-6 h-full flex flex-col items-center justify-center gap-4 text-center" data-testid="quiz-outro">
        <div className="text-lg font-semibold text-gray-800">Quiz complete!</div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            {/* Replaced gradient ring with reusable SVG ring */}
            {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
            {(() => {
              const { ScoreRing } = require("@/components/ui/score-ring");
              return <ScoreRing percent={percent} />;
            })()}
            <div className={`text-sm text-gray-600 transition-opacity duration-300 ${showOutroScore ? 'opacity-100' : 'opacity-0'}`} data-testid="quiz-score">{`You got ${correct} out of ${total}`}</div>
          </div>
        </div>
        <Button onClick={() => { track('quiz_finish_clicked', { chat_id: chat?.chatUuid || null }); resetQuiz(); setActiveQuizUuid(null); setPhase('intro'); }} className="px-6" data-testid="quiz-finish-button">Finish</Button>
      </div>
    );
  }

  return <SpaceQuizzes
    isStillProcessingQuizzes={isLoadingQuizzes || isLoadingQuizById || isLoadingSpaceQuizzes}
    questions={questions}
    currentQuizIndex={currentQuizIndex}
    goToNextQuiz={onNextGated}
    goToPreviousQuiz={onPreviousUngated}
    handleAnswerSelected={handleAnswerSelected}
    selectedQuizAnswer={selectedQuizAnswer}
    isQuizAnswered={isQuizAnswered} />
}
