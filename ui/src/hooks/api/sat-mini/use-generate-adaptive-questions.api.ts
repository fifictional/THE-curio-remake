import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState } from "react";
import { 
  getAdaptiveModuleCriteria, 
  selectQuestions, 
  convertToSATMiniQuestions,
  calculateAccuracy 
} from '@/lib/sat-mini/question-selector';

interface GenerateAdaptiveQuestionsOptions {
  examLogUuid: string;
  modules: any[]; // Current modules with answered questions
  excludedQuestionIds: Set<string>;
}

/**
 * Hook to generate adaptive questions (modules 3 & 4) based on performance
 */
export function useGenerateAdaptiveQuestions() {
  const client = useAmplifyApiClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateAdaptiveQuestions = useCallback(async ({
    examLogUuid,
    modules,
    excludedQuestionIds,
  }: GenerateAdaptiveQuestionsOptions): Promise<boolean> => {
    setIsGenerating(true);
    setError(null);

    try {
      // Calculate accuracy from first 2 modules
      const allAnsweredQuestions = modules.flatMap(m => m.questions);
      const accuracy = calculateAccuracy(allAnsweredQuestions);

      console.log(`Accuracy: ${accuracy.toFixed(1)}% - Selecting ${accuracy < 67 ? 'easy-medium' : 'medium-hard'} questions`);

      // Get adaptive criteria based on accuracy
      const criteria = getAdaptiveModuleCriteria(accuracy);
      const difficulty = accuracy < 67 ? 'easy_medium' : 'medium_hard';

      // Fetch all verified multiple choice questions
      const allQuestionsResponse = await client.models.ExtractedQuestion.list({
        filter: {
          verified: { eq: true },
          questionType: { eq: 'MULTIPLE_CHOICE' },
        },
        limit: 1000,
      });

      const allQuestions = (allQuestionsResponse.data || [])
        .filter(q => !excludedQuestionIds.has(q.extractedQuestionUuid));

      // Select questions based on adaptive criteria
      const selectedQuestions = selectQuestions(
        allQuestions as any,
        criteria,
        excludedQuestionIds
      );

      // Split into RW and Math questions
      const selectedRW = selectedQuestions
        .filter(q => q.module === 'Reading and Writing')
        .sort(() => Math.random() - 0.5);
      
      const selectedMath = selectedQuestions
        .filter(q => q.module === 'Math')
        .sort(() => Math.random() - 0.5);

      // Convert to SAT MINI question format
      const module3Questions = convertToSATMiniQuestions(selectedRW as any, '3');
      const module4Questions = convertToSATMiniQuestions(selectedMath as any, '4');

      // Create new modules
      const module3 = {
        moduleNumber: 3,
        moduleType: 'reading_writing' as const,
        difficulty,
        questions: module3Questions,
        correctCount: 0,
        totalQuestions: 3,
        score: 0,
      };

      const module4 = {
        moduleNumber: 4,
        moduleType: 'math' as const,
        difficulty,
        questions: module4Questions,
        correctCount: 0,
        totalQuestions: 3,
        score: 0,
      };

      // Update exam log with new modules
      const updatedModules = [...modules, module3, module4];

      await client.models.SATMiniExamLog.update({
        satMiniExamLogUuid: examLogUuid,
        modules: updatedModules as any,
        totalQuestions: 12,
        updatedAt: new Date().toISOString(),
      });

      setIsGenerating(false);
      return true;
    } catch (err) {
      console.error('Error generating adaptive questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate adaptive questions');
      setIsGenerating(false);
      return false;
    }
  }, [client]);

  return {
    generateAdaptiveQuestions,
    isGenerating,
    error,
  };
}

