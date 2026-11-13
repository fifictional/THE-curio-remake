import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState, useEffect } from "react";

interface SATMiniQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  questionReference?: {
    referenceType: string;
    externalKey?: string;
    text?: string;
  }[];
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

export interface SATMiniExamLog {
  satMiniExamLogUuid: string;
  userUuid: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  modules: SATMiniModule[];
  totalCorrect: number;
  totalQuestions: number;
  predictedSATScore: number;
  readingWritingScore: number;
  mathScore: number;
  conceptPerformance: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to manage a single SAT MINI exam with real-time subscription updates
 */
export function useSATMiniExam(examLogUuid: string | null, userUuid: string | null) {
  const client = useAmplifyApiClient();
  const [examLog, setExamLog] = useState<SATMiniExamLog | null>(null);
  const [modules, setModules] = useState<SATMiniModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load exam log
  const loadExamLog = useCallback(async () => {
    if (!examLogUuid) {
      setError('No exam log UUID provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.models.SATMiniExamLog.get({
        satMiniExamLogUuid: examLogUuid,
      });

      if (!response.data) {
        setError('Exam log not found');
        setIsLoading(false);
        return;
      }

      // Check if this exam belongs to the current user
      if (userUuid && response.data.userUuid !== userUuid) {
        setError('Unauthorized access to this exam');
        setIsLoading(false);
        return;
      }

      // Parse modules
      const parsedModules = typeof response.data.modules === 'string' 
        ? JSON.parse(response.data.modules) 
        : response.data.modules;

      const log: SATMiniExamLog = {
        ...response.data,
        modules: parsedModules,
      } as SATMiniExamLog;

      setExamLog(log);
      setModules(parsedModules);
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading exam log:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exam');
      setIsLoading(false);
    }
  }, [examLogUuid, userUuid, client]);

  // Subscribe to exam log updates
  useEffect(() => {
    if (!examLogUuid) return;

    // Initial load
    loadExamLog();

    // Set up subscription
    const subscription = client.models.SATMiniExamLog.observeQuery({
      filter: {
        satMiniExamLogUuid: { eq: examLogUuid },
      },
    }).subscribe({
      next: ({ items }) => {
        if (items.length > 0) {
          const updatedLog = items[0];
          
          // Parse modules
          const parsedModules = typeof updatedLog.modules === 'string' 
            ? JSON.parse(updatedLog.modules) 
            : updatedLog.modules;

          const log: SATMiniExamLog = {
            ...updatedLog,
            modules: parsedModules,
          } as SATMiniExamLog;

          setExamLog(log);
          setModules(parsedModules);
        }
      },
      error: (err) => {
        console.error('Subscription error:', err);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [examLogUuid, loadExamLog, client]);

  // Update exam log
  const updateExamLog = useCallback(async (updates: Partial<SATMiniExamLog>) => {
    if (!examLogUuid) return false;

    try {
      await client.models.SATMiniExamLog.update({
        satMiniExamLogUuid: examLogUuid,
        ...updates,
        updatedAt: new Date().toISOString(),
      } as any);

      return true;
    } catch (err) {
      console.error('Error updating exam log:', err);
      return false;
    }
  }, [examLogUuid, client]);

  return {
    examLog,
    modules,
    isLoading,
    error,
    updateExamLog,
    refetch: loadExamLog,
  };
}

