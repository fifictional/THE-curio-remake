import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState, useEffect } from "react";

export interface WeeklyProgressData {
  averageSATScore: number;
  accuracy: number; // 10% per exam taken (max 100%)
  examsCompleted: number;
}

/**
 * Hook to calculate weekly SAT MINI progress
 * Uses the new SATMiniExamLog table structure
 */
export function useWeeklyProgress(userUuid: string | null, hasProfile: boolean) {
  const client = useAmplifyApiClient();
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgressData>({
    averageSATScore: 0,
    accuracy: 0,
    examsCompleted: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateWeeklyProgress = useCallback(async () => {
    if (!userUuid || !hasProfile) {
      setWeeklyProgress({ averageSATScore: 0, accuracy: 0, examsCompleted: 0 });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate current week boundaries (Monday to Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
      const monday = new Date(now);
      monday.setDate(now.getDate() - diff);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      // Get all SAT MINI exams for this user
      const response = await client.models.SATMiniExamLog.listSATMiniExamLogByUserUuidAndStartedAt({
        userUuid,
      }, {
        sortDirection: 'DESC',
      });

      // Filter for completed exams in the current week
      const weeklyExams = (response.data || []).filter(exam => {
        if (exam.status !== 'COMPLETED') return false;
        const examDate = new Date(exam.startedAt);
        return examDate >= monday && examDate <= sunday;
      });

      if (weeklyExams.length === 0) {
        setWeeklyProgress({ averageSATScore: 0, accuracy: 0, examsCompleted: 0 });
        setIsLoading(false);
        return;
      }

      // Calculate average SAT score
      const totalScore = weeklyExams.reduce((sum, exam) => sum + exam.predictedSATScore, 0);
      const averageSATScore = Math.round(totalScore / weeklyExams.length);

      // Calculate accuracy: 10% per exam taken (max 100%)
      const accuracy = Math.min(weeklyExams.length * 10, 100);

      setWeeklyProgress({
        averageSATScore,
        accuracy,
        examsCompleted: weeklyExams.length,
      });
    } catch (err) {
      console.error('Error calculating weekly progress:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate progress');
    } finally {
      setIsLoading(false);
    }
  }, [client, userUuid, hasProfile]);

  useEffect(() => {
    calculateWeeklyProgress();
  }, [calculateWeeklyProgress]);

  return {
    weeklyProgress,
    isLoading,
    error,
    refetch: calculateWeeklyProgress,
  };
}

