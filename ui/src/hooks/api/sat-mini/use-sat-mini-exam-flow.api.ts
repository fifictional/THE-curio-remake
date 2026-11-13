import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAmplifyApiClient } from '@/providers/amplify-provider';
import { useGenerateAdaptiveQuestions } from './use-generate-adaptive-questions.api';
import { useCompleteSATMiniExam } from './use-complete-sat-mini-exam.api';
import { useSATMiniExam } from './use-sat-mini-exam.api';
import { useSATMiniExamLogs } from './use-sat-mini-exam-logs.api';

interface SATMiniQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  questionReference?: Array<{
    referenceType: string;
    externalKey?: string;
    text?: string;
  }>;
  concept: string;
  subtopic: string;
  difficulty?: string;
  givenAnswer?: number | null;
}

interface SATMiniModule {
  moduleNumber: number;
  moduleType: 'reading_writing' | 'math';
  difficulty: 'easy_medium' | 'medium_hard';
  questions: SATMiniQuestion[];
  correctCount: number;
  totalQuestions: number;
  score?: number;
}

interface ExamResults {
  predictedSATScore: number;
  readingWritingScore: number;
  mathScore: number;
  totalCorrect: number;
  masteryUpdates?: Record<string, { oldValue: number; newValue: number }>;
}

interface UseSATMiniExamFlowProps {
  examLogUuid: string | null;
  userUuid: string | null;
}

export function useSATMiniExamFlow({ examLogUuid, userUuid }: UseSATMiniExamFlowProps) {
  const router = useRouter();
  const client = useAmplifyApiClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [examResults, setExamResults] = useState<ExamResults | null>(null);

  // Fetch exam data with subscription
  const { examLog, modules, isLoading, error } = useSATMiniExam(examLogUuid, userUuid);
  
  // Hooks for exam operations
  const { generateAdaptiveQuestions, isGenerating } = useGenerateAdaptiveQuestions();
  const { completeExam, isCompleting } = useCompleteSATMiniExam(userUuid || undefined);
  const { examLogs } = useSATMiniExamLogs(userUuid);

  // Initialize current question index based on answered questions (only once on load)
  useEffect(() => {
    if (!modules || modules.length === 0 || hasInitialized || !examLog) return;

    // Check if exam is already completed
    if (examLog.status === 'COMPLETED') {
      setExamResults({
        predictedSATScore: examLog.predictedSATScore,
        readingWritingScore: examLog.readingWritingScore,
        mathScore: examLog.mathScore,
        totalCorrect: examLog.totalCorrect,
        masteryUpdates: undefined,
      });
      setShowResults(true);
      setHasInitialized(true);
      return;
    }

    let answeredCount = 0;
    for (const module of modules) {
      for (const question of module.questions) {
        if (question.givenAnswer !== null && question.givenAnswer !== undefined) {
          answeredCount++;
        } else {
          // Found first unanswered question
          setCurrentQuestionIndex(answeredCount);
          setHasInitialized(true);
          return;
        }
      }
    }
    
    // All questions answered
    setCurrentQuestionIndex(answeredCount);
    setHasInitialized(true);
  }, [modules, hasInitialized, examLog]);

  // When adaptive questions are generated (modules increase from 2 to 4), move to question 7
  useEffect(() => {
    if (hasInitialized && modules.length === 4 && currentQuestionIndex < 6) {
      setCurrentQuestionIndex(6);
    }
  }, [modules.length, hasInitialized, currentQuestionIndex]);

  // Get all questions in a flat array
  const allQuestions = useMemo(() => 
    modules.flatMap(module => module.questions),
    [modules]
  );
  
  const currentQuestion = useMemo(() => 
    allQuestions[currentQuestionIndex],
    [allQuestions, currentQuestionIndex]
  );
  
  // Calculate progress
  const totalAnswered = useMemo(() => 
    allQuestions.filter(q => q.givenAnswer !== null && q.givenAnswer !== undefined).length,
    [allQuestions]
  );
  
  const needsAdaptiveGeneration = useMemo(() => 
    totalAnswered === 6 && modules.length === 2,
    [totalAnswered, modules.length]
  );

  // Get previous exam score for delta calculation
  const previousScore = useMemo(() => {
    if (!examLogs || examLogs.length === 0) return undefined;
    
    const completedExams = examLogs
      .filter(log => log.status === 'COMPLETED' && log.satMiniExamLogUuid !== examLogUuid)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return completedExams.length > 0 ? completedExams[0].predictedSATScore : undefined;
  }, [examLogs, examLogUuid]);

  // Handle answer submission
  const handleAnswer = useCallback(async (selectedIndex: number, isCorrect: boolean) => {
    if (!examLog || !currentQuestion || isSaving || modules.length === 0) return;

    setIsSaving(true);
    try {
      // Update the question in the modules
      const updatedModules = JSON.parse(JSON.stringify(modules)); // Deep clone
      let questionFound = false;
      
      for (const module of updatedModules) {
        const questionIndex = module.questions.findIndex((q: any) => q.questionId === currentQuestion.questionId);
        if (questionIndex !== -1) {
          module.questions[questionIndex].givenAnswer = selectedIndex;
          questionFound = true;
          break;
        }
      }

      if (!questionFound) {
        console.error('Question not found in modules');
        setIsSaving(false);
        return;
      }

      // Calculate total correct answers
      let totalCorrect = 0;
      for (const module of updatedModules) {
        for (const question of module.questions) {
          if (question.givenAnswer !== null && question.givenAnswer !== undefined) {
            if (question.givenAnswer === question.correctAnswer) {
              totalCorrect++;
            }
          }
        }
      }

      // Update the exam log in the database
      const newStatus = examLog.status === 'CREATED' ? 'IN_PROGRESS' as const : undefined;
      await client.models.SATMiniExamLog.update({
        satMiniExamLogUuid: examLog.satMiniExamLogUuid,
        modules: updatedModules as any,
        totalCorrect,
        ...(newStatus && { status: newStatus }),
        updatedAt: new Date().toISOString(),
      });

      setIsSaving(false);
    } catch (err) {
      console.error('Error saving answer:', err);
      setIsSaving(false);
    }
  }, [examLog, currentQuestion, modules, isSaving, client]);

  // Handle next question
  const handleNext = useCallback(async () => {
    if (currentQuestionIndex < allQuestions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Exam complete or need adaptive generation
      if (needsAdaptiveGeneration) {
        if (!examLog || isGenerating) return;

        // Get all question IDs that have been used
        const usedQuestionIds = new Set<string>();
        modules.forEach(module => {
          module.questions.forEach(q => {
            const uuid = q.questionId.split('-').slice(1).join('-');
            if (uuid) usedQuestionIds.add(uuid);
          });
        });

        await generateAdaptiveQuestions({
          examLogUuid: examLog.satMiniExamLogUuid,
          modules,
          excludedQuestionIds: usedQuestionIds,
        });
      } else {
        // All 12 questions completed - finalize exam
        if (!examLog || isCompleting || !userUuid) return;

        const result = await completeExam({
          examLogUuid: examLog.satMiniExamLogUuid,
          modules,
          userUuid,
        });

        if (result.success && result.predictedSATScore) {
          setExamResults({
            predictedSATScore: result.predictedSATScore,
            readingWritingScore: result.readingWritingScore!,
            mathScore: result.mathScore!,
            totalCorrect: result.totalCorrect!,
            masteryUpdates: result.masteryUpdates,
          });
          setShowResults(true);
        }
      }
    }
  }, [
    currentQuestionIndex,
    allQuestions.length,
    needsAdaptiveGeneration,
    examLog,
    modules,
    isGenerating,
    isCompleting,
    userUuid,
    generateAdaptiveQuestions,
    completeExam,
  ]);

  return {
    // State
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
    
    // Loading states
    isLoading,
    isSaving,
    isGenerating,
    isCompleting,
    
    // Error
    error,
    
    // Actions
    handleAnswer,
    handleNext,
    navigateToQuestion: setCurrentQuestionIndex,
    navigateToDashboard: () => router.push('/satus'),
  };
}

