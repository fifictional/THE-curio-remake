import { useAmplifyApiClient } from "@/providers/amplify-provider";
import { useCallback, useState } from "react";
import { v4 as uuid } from 'uuid';
import { 
  getInitialModuleCriteria, 
  selectQuestions, 
  convertToSATMiniQuestions 
} from '@/lib/sat-mini/question-selector';
import { useSessionContext } from "@/providers/session-provider";
import { ExamModule } from "@/lib/types/exam-module";

interface CreateSATMiniExamOptions {
  userUuid: string;
}

/**
 * Hook to create a new SAT MINI exam
 * Picks 3 Reading & Writing questions (2 easy, 1 medium) and 3 Math questions (2 easy, 1 medium)
 * Questions are marked as verified and are multiple choice
 * Excludes questions the user answered correctly today
 */
export function useCreateSATMiniExam() {
  const client = useAmplifyApiClient();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isUserSubscribed } = useSessionContext();

  const createExam = useCallback(async ({ userUuid }: CreateSATMiniExamOptions): Promise<string | null> => {
    setIsCreating(true);
    setError(null);

    try {
      // Get today's start and end timestamps
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();

      // Fetch today's completed exams to get questions answered correctly
      const todayExamsResponse = await client.models.SATMiniExamLog.listSATMiniExamLogByUserUuidAndStartedAt({
        userUuid,
        startedAt: { ge: todayStart },
      });

      // Extract question IDs that were answered correctly today
      const correctlyAnsweredQuestionIds = new Set<string>();
      (todayExamsResponse.data || []).forEach(exam => {
        if (exam.status === 'COMPLETED' && exam.modules) {
          try {
            const modules = typeof exam.modules === 'string' ? JSON.parse(exam.modules) : exam.modules;
            modules.forEach((module: any) => {
              module.questions?.forEach((q: any) => {
                if (q.givenAnswer !== null && q.givenAnswer === q.correctAnswer) {
                  // Extract the original question ID (remove module prefix like "1-" or "2-")
                  const questionId = q.questionId.split('-').slice(1).join('-');
                  if (questionId) {
                    correctlyAnsweredQuestionIds.add(questionId);
                  }
                }
              });
            });
          } catch (err) {
            console.error('Error parsing exam modules:', err);
          }
        }
      });

      // Fetch all verified multiple choice questions
      // get the free module uuid from the db
      const freeModuleResponse = await client.models.ExamModule.list({
        filter: {
          moduleName: { eq: 'SAT Free' },
        },
      });
      const freeModule = freeModuleResponse.data?.[0] as ExamModule | undefined;
      if (!freeModule) {
        throw new Error('Free module not found');
      }

      const allQuestionsResponse = await client.models.ExtractedQuestion.list({
        filter: {
          verified: { eq: true },
          questionType: { eq: 'MULTIPLE_CHOICE' },
          ...(!isUserSubscribed ? { examModuleUuid: { eq: freeModule?.examModuleUuid } } : {}),
        },
        limit: 1000,
      });

      const allQuestions = (allQuestionsResponse.data || [])
        .filter(q => !correctlyAnsweredQuestionIds.has(q.extractedQuestionUuid));

      // Get selection criteria for initial modules
      const criteria = getInitialModuleCriteria();

      // Select questions based on criteria
      const selectedQuestions = selectQuestions(
        allQuestions as any,
        criteria,
        correctlyAnsweredQuestionIds
      );

      // Split into RW and Math questions
      const selectedRW = selectedQuestions
        .filter(q => q.module === 'Reading and Writing')
        .sort(() => Math.random() - 0.5);
      
      const selectedMath = selectedQuestions
        .filter(q => q.module === 'Math')
        .sort(() => Math.random() - 0.5);

      // Convert to SAT MINI question format
      const module1Questions = convertToSATMiniQuestions(selectedRW as any, '1');
      const module2Questions = convertToSATMiniQuestions(selectedMath as any, '2');

      // Create the modules
      const modules = [
        {
          moduleNumber: 1,
          moduleType: 'reading_writing' as const,
          difficulty: 'easy_medium' as const,
          questions: module1Questions,
          correctCount: 0,
          totalQuestions: 3,
          score: 0,
        },
        {
          moduleNumber: 2,
          moduleType: 'math' as const,
          difficulty: 'easy_medium' as const,
          questions: module2Questions,
          correctCount: 0,
          totalQuestions: 3,
          score: 0,
        },
      ];

      // Create the SAT MINI exam log
      const examLogUuid = uuid();
      const now = new Date().toISOString();

      await client.models.SATMiniExamLog.create({
        satMiniExamLogUuid: examLogUuid,
        userUuid,
        status: 'IN_PROGRESS',
        startedAt: now,
        modules: modules as any, // Amplify will handle the custom type serialization
        totalCorrect: 0,
        totalQuestions: 12,
        predictedSATScore: 0,
        readingWritingScore: 0,
        mathScore: 0,
        createdAt: now,
        updatedAt: now,
      });

      return examLogUuid;
    } catch (err) {
      console.error('Error creating SAT MINI exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to create exam');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [client, isUserSubscribed]);

  return {
    createExam,
    isCreating,
    error,
  };
}

