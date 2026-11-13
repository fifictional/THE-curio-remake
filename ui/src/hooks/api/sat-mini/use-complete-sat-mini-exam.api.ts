import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState } from "react";
import { useLearningProfileApi } from "@/hooks/api/learning-profile/use-learning-profile.api";
import { applyMasteryAdjustment, QuestionDifficulty } from "@/lib/utils/mastery-adjustment";
import { useSessionContext } from "@/providers/session-provider";

interface CompleteSATMiniExamOptions {
  examLogUuid: string;
  modules: any[];
  userUuid: string;
}

interface CompleteSATMiniExamResult {
  success: boolean;
  predictedSATScore?: number;
  readingWritingScore?: number;
  mathScore?: number;
  totalCorrect?: number;
  masteryUpdates?: Record<string, { oldValue: number; newValue: number }>;
}

/**
 * Calculate SAT score based on correct answers and difficulty
 * Uses weighted scoring: easy=1, medium=2, hard=3 points
 */
function calculateSATScore(modules: any[]): {
  predictedSATScore: number;
  readingWritingScore: number;
  mathScore: number;
  totalCorrect: number;
  conceptPerformance: Record<string, { correct: number; total: number }>;
} {
  let rwPoints = 0;
  let rwTotal = 0;
  let mathPoints = 0;
  let mathTotal = 0;
  let totalCorrect = 0;
  const conceptPerformance: Record<string, { correct: number; total: number }> = {};

  // Calculate points for each module
  modules.forEach(module => {
    const isRW = module.moduleType === 'reading_writing';
    let moduleCorrect = 0;

    module.questions.forEach((q: any) => {
      const isCorrect = q.givenAnswer !== null && q.givenAnswer === q.correctAnswer;
      
      // Weight by difficulty
      let weight = 2; // default medium
      if (q.difficulty === 'easy') weight = 1;
      else if (q.difficulty === 'hard') weight = 3;

      const maxPoints = weight;
      const earnedPoints = isCorrect ? weight : 0;

      if (isRW) {
        rwPoints += earnedPoints;
        rwTotal += maxPoints;
      } else {
        mathPoints += earnedPoints;
        mathTotal += maxPoints;
      }

      if (isCorrect) {
        moduleCorrect++;
        totalCorrect++;
      }

      // Track concept performance
      if (q.concept) {
        if (!conceptPerformance[q.concept]) {
          conceptPerformance[q.concept] = { correct: 0, total: 0 };
        }
        conceptPerformance[q.concept].total++;
        if (isCorrect) {
          conceptPerformance[q.concept].correct++;
        }
      }
    });

    // Update module stats
    module.correctCount = moduleCorrect;
    module.score = isRW ? rwPoints : mathPoints;
  });

  // Calculate percentage scores
  const rwPercentage = rwTotal > 0 ? (rwPoints / rwTotal) : 0;
  const mathPercentage = mathTotal > 0 ? (mathPoints / mathTotal) : 0;

  // Convert to SAT scale (200-800 per section)
  // Linear mapping: 0% = 200, 100% = 800
  const readingWritingScore = Math.round(200 + (rwPercentage * 600));
  const mathScore = Math.round(200 + (mathPercentage * 600));
  const predictedSATScore = readingWritingScore + mathScore;

  return {
    predictedSATScore,
    readingWritingScore,
    mathScore,
    totalCorrect,
    conceptPerformance,
  };
}

/**
 * Hook to complete a SAT MINI exam and calculate final scores
 */
export function useCompleteSATMiniExam(userUuid?: string) {
  const client = useAmplifyApiClient();
  const { userAttributes } = useSessionContext();
  const [isCompleting, setIsCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get learning profile API for updating mastery levels
  const { getMasteryForConcept, createOrUpdateMastery } = useLearningProfileApi(userUuid);

  const completeExam = useCallback(async ({
    examLogUuid,
    modules,
    userUuid,
  }: CompleteSATMiniExamOptions): Promise<CompleteSATMiniExamResult> => {
    setIsCompleting(true);
    setError(null);

    try {
      // Calculate final scores
      const {
        predictedSATScore,
        readingWritingScore,
        mathScore,
        totalCorrect,
        conceptPerformance,
      } = calculateSATScore(modules);

      console.log('Exam Complete:', {
        predictedSATScore,
        readingWritingScore,
        mathScore,
        totalCorrect,
      });

      // Update exam log with final scores
      const response = await client.models.SATMiniExamLog.update({
        satMiniExamLogUuid: examLogUuid,
        modules: modules as any,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
        predictedSATScore,
        readingWritingScore,
        mathScore,
        totalCorrect,
        conceptPerformance: JSON.stringify(conceptPerformance),
        updatedAt: new Date().toISOString(),
      });
      console.log('Response:', response);

      // Update learning profile based on exam performance
      const masteryUpdatesWithOldValues: Record<string, { oldValue: number; newValue: number }> = {};
      
      if (userUuid) {
        console.log('Updating learning profile...');
        
        // Track mastery changes locally to ensure we use the latest values
        const masteryUpdates: Record<string, number> = {};
        
        // Process each question to update mastery levels
        for (const module of modules) {
          for (const question of module.questions) {
            if (!question.concept || !question.difficulty) continue;

            const isCorrect = question.givenAnswer !== null && question.givenAnswer === question.correctAnswer;
            
            // Get current mastery - use local update if available, otherwise from profile
            const currentMastery = masteryUpdates[question.concept] ?? getMasteryForConcept(question.concept);
            
            // Map difficulty from database format (EASY, MEDIUM, HARD) to lowercase
            const difficulty = question.difficulty.toLowerCase() as QuestionDifficulty;
            
            // Calculate new mastery level
            const newMastery = applyMasteryAdjustment(currentMastery, difficulty, isCorrect);
            
            // Store the update locally
            masteryUpdates[question.concept] = newMastery;
            
            // Track old and new values for the first update of each concept
            if (!masteryUpdatesWithOldValues[question.concept]) {
              masteryUpdatesWithOldValues[question.concept] = {
                oldValue: getMasteryForConcept(question.concept),
                newValue: newMastery,
              };
            } else {
              // Update the new value for subsequent questions
              masteryUpdatesWithOldValues[question.concept].newValue = newMastery;
            }
            
            console.log(`Updated ${question.concept}: ${currentMastery} -> ${newMastery} (${isCorrect ? 'correct' : 'incorrect'}, ${difficulty})`);
          }
        }
        
        // Batch update all mastery levels to Neptune for efficiency
        const updates = Object.entries(masteryUpdates).map(([concept, masteryLevel]) => ({
          conceptId: concept,
          masteryLevel,
        }));

        if (updates.length > 0) {
          await client.mutations.learningProfileMutation({
            actionType: 'batchUpdateConceptMastery',
            userUuid,
            updates,
            email: userAttributes?.email || undefined,
            firstName: userAttributes?.givenName || undefined,
            lastName: userAttributes?.familyName || undefined,
          });
        }
        
        console.log('Learning profile updated successfully in Neptune');
      }

      setIsCompleting(false);
      return {
        success: true,
        predictedSATScore,
        readingWritingScore,
        mathScore,
        totalCorrect,
        masteryUpdates: masteryUpdatesWithOldValues,
      };
    } catch (err) {
      console.error('Error completing exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete exam');
      setIsCompleting(false);
      return { success: false };
    }
  }, [client, getMasteryForConcept, userAttributes]);

  return {
    completeExam,
    isCompleting,
    error,
  };
}

