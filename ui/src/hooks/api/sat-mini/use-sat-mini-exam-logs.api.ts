import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState, useEffect } from "react";

export interface SATMiniExamLogSummary {
  satMiniExamLogUuid: string;
  predictedSATScore: number;
  totalCorrect: number;
  totalQuestions: number;
  totalAnswered: number; // Number of questions answered (for in-progress exams)
  readingWritingScore?: number;
  mathScore?: number;
  startedAt: string;
  completedAt?: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CREATED';
}

export interface SATProgressData {
  date: string; // ISO date string
  score: number;
  examLogUuid: string;
}

export function useSATMiniExamLogs(userUuid: string | null) {
  const client = useAmplifyApiClient();
  const [examLogs, setExamLogs] = useState<SATMiniExamLogSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExamLogs = useCallback(async () => {
    if (!userUuid) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await client.models.SATMiniExamLog.listSATMiniExamLogByUserUuidAndStartedAt({
        userUuid,
      }, {
        sortDirection: 'DESC',
      });

      const logs = (response.data || []).map(log => {
        // Calculate total answered questions from modules for in-progress exams
        let totalAnswered = 0;
        if (log.status !== 'COMPLETED' && log.modules) {
          try {
            const modules = typeof log.modules === 'string' ? JSON.parse(log.modules) : log.modules;
            for (const module of modules) {
              if (module.questions) {
                totalAnswered += module.questions.filter((q: any) => 
                  q.givenAnswer !== null && q.givenAnswer !== undefined
                ).length;
              }
            }
          } catch (err) {
            console.error('Error parsing modules:', err);
          }
        }

        return {
          satMiniExamLogUuid: log.satMiniExamLogUuid,
          predictedSATScore: log.predictedSATScore,
          totalCorrect: log.totalCorrect,
          totalQuestions: log.totalQuestions,
          totalAnswered: log.status === 'COMPLETED' ? log.totalQuestions : totalAnswered,
          readingWritingScore: log.readingWritingScore || undefined,
          mathScore: log.mathScore || undefined,
          startedAt: log.startedAt,
          completedAt: log.completedAt || undefined,
          status: log.status as 'IN_PROGRESS' | 'COMPLETED' | 'CREATED',
        };
      });

      setExamLogs(logs);
    } catch (err) {
      console.error('Error loading SAT MINI exam logs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exam logs');
    } finally {
      setIsLoading(false);
    }
  }, [client, userUuid]);

  useEffect(() => {
    loadExamLogs();
  }, [loadExamLogs]);

  // Filter logs by date range
  const getLogsByDateRange = useCallback((startDate: Date, endDate: Date): SATProgressData[] => {
    return examLogs
      .filter(log => {
        const logDate = new Date(log.startedAt);
        return logDate >= startDate && logDate <= endDate && log.status === 'COMPLETED';
      })
      .map(log => ({
        date: log.startedAt,
        score: log.predictedSATScore,
        examLogUuid: log.satMiniExamLogUuid,
      }));
  }, [examLogs]);

  // Get logs for the current week (Monday to Sunday)
  const getWeeklyLogs = useCallback((): SATProgressData[] => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return getLogsByDateRange(monday, sunday);
  }, [getLogsByDateRange]);

  // Get logs for the last 30 days
  const getLast30DaysLogs = useCallback((): SATProgressData[] => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    return getLogsByDateRange(thirtyDaysAgo, now);
  }, [getLogsByDateRange]);

  // Get logs for the current month
  const getMonthlyLogs = useCallback((): SATProgressData[] => {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDayOfMonth.setHours(0, 0, 0, 0);

    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDayOfMonth.setHours(23, 59, 59, 999);

    return getLogsByDateRange(firstDayOfMonth, lastDayOfMonth);
  }, [getLogsByDateRange]);

  return {
    examLogs,
    isLoading,
    error,
    refetch: loadExamLogs,
    getWeeklyLogs,
    getLast30DaysLogs,
    getMonthlyLogs,
    getLogsByDateRange,
  };
}

