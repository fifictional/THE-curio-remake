import { useState, useCallback } from 'react';
import type { AssessmentResults } from '@/components/satus-onboarding/onboarding-assessment';
import type { AssessmentQuestion } from '@/lib/data/sat-assessment-questions';
import { SAT_QUESTION_BANK } from '@/lib/data/sat-assessment-question-bank';
import { v4 as uuid } from 'uuid';
import { useAmplifyApiClient } from '@/providers/amplify-provider';

const ASSESSMENT_EXAM_STORAGE_KEY = 'sat_assessment_exam';

export function useSaveAssessmentExam() {
  const client = useAmplifyApiClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveAssessmentExam = useCallback(async (
    assessmentResults: AssessmentResults,
    userUuid?: string
  ): Promise<boolean> => {
    setIsSaving(true);
    setError(null);

    try {
      const mockExamUuid = uuid();
      const chatUuid = uuid();
      const now = new Date().toISOString();

      // Create a map of question IDs to question data for quick lookup
      const questionMap = new Map<string, AssessmentQuestion>();
      SAT_QUESTION_BANK.forEach(q => questionMap.set(q.id, q));

      // Convert assessment results to mock exam format with actual question data
      const questions = assessmentResults.detailedResults.map((result, index) => {
        const questionData = questionMap.get(result.questionId);
        
        if (!questionData) {
          console.warn(`Question not found in bank: ${result.questionId}`);
          return {
            index,
            questionContent: `Question ${index + 1}`,
            options: [],
            answer: 0,
            hint: undefined,
            answerExplanations: undefined,
            vote: undefined,
            questionReference: undefined,
          };
        }

        return {
          index,
          questionContent: questionData.questionContent,
          options: questionData.options,
          answer: questionData.answer,
          hint: questionData.hint,
          answerExplanations: questionData.answerExplanations,
          vote: undefined,
          questionReference: undefined,
          concept: questionData.concept,
          subtopic: questionData.subtopic,
        };
      });

      // Convert detailed results to question answers
      const questionAnswers = assessmentResults.detailedResults.map((result, index) => {
        const questionData = questionMap.get(result.questionId);
        
        // If we have the question data and the answer was correct, use the correct answer index
        // If incorrect, we don't know which wrong answer they chose, so leave as undefined
        const givenAnswer = result.correct && questionData ? questionData.answer : undefined;
        
        return {
          index,
          givenAnswer,
          answerTimeInMilliseconds: undefined,
          answerAt: now,
          chatUuid: undefined,
        };
      });

      const mockExamData = {
        mockExamUuid,
        userUuid: userUuid || '',
        chatUuid,
        title: 'SAT Initial Assessment',
        examName: 'SAT MINI',
        mockExamInfo: {
          description: 'Initial SAT assessment to establish baseline and learning profile',
          topic: 'SAT',
          difficulty: 'mixed',
          time: 0, // No time limit for assessment
          questionCount: assessmentResults.totalQuestions,
          instructions: 'Complete assessment to establish your learning profile',
          moduleUuids: [],
        },
        questions,
        creationStatus: 'GENERATED' as const,
        createdAt: now,
        updatedAt: now,
      };

      const mockExamLogData = {
        mockExamLogUuid: uuid(),
        mockExamUuid,
        questionAnswers,
        status: 'COMPLETED' as const,
        score: assessmentResults.predictedSATScore, // Use the calculated SAT score (400-1600)
        startedAt: now,
        completedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      // If user is authenticated, save to database
      if (userUuid) {
        await client.models.MockExam.create(mockExamData);
        console.log('✓ Created mock exam:', mockExamUuid);

        await client.models.MockExamLog.create(mockExamLogData);
        console.log('✓ Created mock exam log:', mockExamLogData.mockExamLogUuid);
        console.log(`✓ Assessment saved to database with SAT score: ${assessmentResults.predictedSATScore} (${assessmentResults.correctAnswers}/${assessmentResults.totalQuestions} correct)`);
      } else {
        // If user is not authenticated, save to localStorage
        const assessmentData = {
          mockExam: mockExamData,
          mockExamLog: mockExamLogData,
          savedAt: now,
        };
        
        localStorage.setItem(ASSESSMENT_EXAM_STORAGE_KEY, JSON.stringify(assessmentData));
        console.log('✓ Assessment saved to localStorage');
        console.log(`✓ SAT Score: ${assessmentResults.predictedSATScore} (${assessmentResults.correctAnswers}/${assessmentResults.totalQuestions} correct)`);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save assessment exam';
      console.error('Error saving assessment exam:', err);
      setError(errorMessage);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(ASSESSMENT_EXAM_STORAGE_KEY);
      if (!stored) return null;
      
      return JSON.parse(stored);
    } catch (err) {
      console.error('Error loading assessment from localStorage:', err);
      return null;
    }
  }, []);

  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(ASSESSMENT_EXAM_STORAGE_KEY);
      console.log('✓ Cleared assessment from localStorage');
    } catch (err) {
      console.error('Error clearing assessment from localStorage:', err);
    }
  }, []);

  const migrateToDatabase = useCallback(async (userUuid: string): Promise<boolean> => {
    try {
      const storedData = loadFromLocalStorage();
      if (!storedData) {
        console.log('No assessment data in localStorage to migrate');
        return false;
      }

      const { mockExam, mockExamLog } = storedData;

      // Update userUuid in the data
      mockExam.userUuid = userUuid;

      // Save to database
      await client.models.MockExam.create(mockExam);
      console.log('✓ Migrated mock exam to database:', mockExam.mockExamUuid);

      await client.models.MockExamLog.create(mockExamLog);
      console.log('✓ Migrated mock exam log to database:', mockExamLog.mockExamLogUuid);

      // Clear localStorage after successful migration
      clearLocalStorage();

      return true;
    } catch (err) {
      console.error('Error migrating assessment to database:', err);
      return false;
    }
  }, [client, loadFromLocalStorage, clearLocalStorage]);

  return {
    saveAssessmentExam,
    isSaving,
    error,
    loadFromLocalStorage,
    clearLocalStorage,
    migrateToDatabase,
  };
}

