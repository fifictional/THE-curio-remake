import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState, useEffect } from "react";

export interface ConceptMistake {
  conceptId: string;
  wrongCount: number;
  totalCount: number;
  errorRate: number; // percentage of wrong answers
  lastMistakeDate: string;
}

/**
 * Hook to analyze recent SAT MINI exam mistakes by concept
 * Uses the new SATMiniExamLog table structure
 */
export function useRecentMistakes(userUuid: string | null, limit: number = 3) {
  const client = useAmplifyApiClient();
  const [mistakes, setMistakes] = useState<ConceptMistake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeMistakes = useCallback(async () => {
    if (!userUuid) {
      setMistakes([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get recent SAT MINI exams (last 3 exams)
      const response = await client.models.SATMiniExamLog.listSATMiniExamLogByUserUuidAndStartedAt({
        userUuid,
      }, {
        sortDirection: 'DESC',
        limit: 3,
      });

      const satMiniExams = (response.data || []).filter(
        exam => exam.status === 'COMPLETED'
      );

      if (satMiniExams.length === 0) {
        setMistakes([]);
        setIsLoading(false);
        return;
      }

      // Analyze concept performance across all modules
      const conceptStats = new Map<string, {
        wrong: number;
        total: number;
        lastDate: string;
      }>();

      for (const exam of satMiniExams) {
        const modules = exam.modules || [];

        modules.forEach(module => {
          if (!module || !module.questions) return;

          module.questions.forEach(question => {
            if (!question || !question.concept) return;

            const stats = conceptStats.get(question.concept) || {
              wrong: 0,
              total: 0,
              lastDate: exam.startedAt,
            };

            stats.total += 1;
            if (question.givenAnswer !== question.correctAnswer) {
              stats.wrong += 1;
            }

            // Update last date if this exam is more recent
            if (new Date(exam.startedAt) > new Date(stats.lastDate)) {
              stats.lastDate = exam.startedAt;
            }

            conceptStats.set(question.concept, stats);
          });
        });
      }

      // Convert to array and calculate error rates
      const mistakesList: ConceptMistake[] = Array.from(conceptStats.entries())
        .filter(([_, stats]) => stats.wrong > 0) // Only concepts with mistakes
        .map(([conceptId, stats]) => ({
          conceptId,
          wrongCount: stats.wrong,
          totalCount: stats.total,
          errorRate: (stats.wrong / stats.total) * 100,
          lastMistakeDate: stats.lastDate,
        }))
        .sort((a, b) => {
          // Sort by error rate first (descending), then by recency
          if (Math.abs(a.errorRate - b.errorRate) > 5) {
            return b.errorRate - a.errorRate;
          }
          return new Date(b.lastMistakeDate).getTime() - new Date(a.lastMistakeDate).getTime();
        })
        .slice(0, limit);

      setMistakes(mistakesList);
    } catch (err) {
      console.error('Error analyzing recent mistakes:', err);
      setError(err instanceof Error ? err.message : 'Failed to analyze mistakes');
    } finally {
      setIsLoading(false);
    }
  }, [client, userUuid, limit]);

  useEffect(() => {
    analyzeMistakes();
  }, [analyzeMistakes]);

  return {
    mistakes,
    isLoading,
    error,
    refetch: analyzeMistakes,
  };
}

