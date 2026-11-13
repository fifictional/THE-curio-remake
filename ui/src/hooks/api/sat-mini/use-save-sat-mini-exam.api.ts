import { useState, useCallback } from 'react';
import type { AssessmentResults } from '@/components/satus-onboarding/onboarding-assessment';
import type { AssessmentQuestion } from '@/lib/data/sat-assessment-questions';
import { SAT_QUESTION_BANK } from '@/lib/data/sat-assessment-question-bank';
import { v4 as uuid } from 'uuid';
import { useAmplifyApiClient } from '@/providers/amplify-provider';

const SAT_MINI_EXAM_STORAGE_KEY = 'sat_mini_exam_log';

interface SATMiniQuestion {
  questionId: string;
  questionContent: string;
  options: string[];
  correctAnswer: number;
  hint?: string;
  answerExplanations?: string[];
  concept: string;
  subtopic: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  givenAnswer?: number;
}

interface SATMiniModule {
  moduleNumber: number;
  moduleType: 'reading_writing' | 'math';
  difficulty?: 'easy_medium' | 'medium_hard';
  questions: SATMiniQuestion[];
  correctCount: number;
  totalQuestions: number;
  score?: number;
}

interface ConceptPerformance {
  correct: number;
  total: number;
}

export function useSaveSATMiniExam() {
  const client = useAmplifyApiClient();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveSATMiniExam = useCallback(async (
    assessmentResults: AssessmentResults,
    userUuid?: string
  ): Promise<string | null> => {
    setIsSaving(true);
    setError(null);

    try {
      const satMiniExamLogUuid = uuid();
      const now = new Date().toISOString();

      // Create a map of question IDs to question data for quick lookup
      const questionMap = new Map<string, AssessmentQuestion>();
      SAT_QUESTION_BANK.forEach(q => questionMap.set(q.id, q));

      // Group questions by module
      // Module structure: 1=RW, 2=Math, 3=RW(adaptive), 4=Math(adaptive)
      const modules: SATMiniModule[] = [];
      
      // Process each module from the assessment results
      for (let moduleNum = 1; moduleNum <= 4; moduleNum++) {
        const moduleQuestions = assessmentResults.detailedResults.filter(
          result => result.module === moduleNum
        );

        if (moduleQuestions.length === 0) continue;

        const moduleType: 'reading_writing' | 'math' = moduleNum % 2 === 1 ? 'reading_writing' : 'math';
        const isAdaptive = moduleNum > 2;
        
        const questions: SATMiniQuestion[] = moduleQuestions.map(result => {
          const questionData = questionMap.get(result.questionId);
          
          if (!questionData) {
            console.warn(`Question not found in bank: ${result.questionId}`);
            // Return a placeholder
            return {
              questionId: result.questionId,
              questionContent: `Question ${result.questionId}`,
              options: [],
              correctAnswer: result.correctAnswer,
              concept: result.subtopic || 'unknown',
              subtopic: result.subtopic || 'Unknown',
              difficulty: result.difficulty as 'easy' | 'medium' | 'hard',
              givenAnswer: result.givenAnswer,
            };
          }

          return {
            questionId: questionData.id,
            questionContent: questionData.questionContent,
            options: questionData.options,
            correctAnswer: result.correctAnswer,
            hint: questionData.hint,
            answerExplanations: questionData.answerExplanations,
            concept: questionData.concept,
            subtopic: questionData.subtopic,
            difficulty: questionData.difficulty as 'easy' | 'medium' | 'hard',
            givenAnswer: result.givenAnswer,
          };
        });

        const correctCount = questions.filter(q => q.givenAnswer === q.correctAnswer).length;
        const totalQuestions = questions.length;

        modules.push({
          moduleNumber: moduleNum,
          moduleType,
          difficulty: isAdaptive ? (assessmentResults.adaptiveDifficulty?.[moduleNum] === 'hard' ? 'medium_hard' : 'easy_medium') : undefined,
          questions,
          correctCount,
          totalQuestions,
          score: undefined, // Can be calculated based on weighted scoring
        });
      }

      // Calculate concept performance
      const conceptPerformance: Record<string, ConceptPerformance> = {};
      
      modules.forEach(module => {
        module.questions.forEach(question => {
          if (!conceptPerformance[question.concept]) {
            conceptPerformance[question.concept] = { correct: 0, total: 0 };
          }
          conceptPerformance[question.concept].total += 1;
          // Check if the given answer matches the correct answer
          if (question.givenAnswer !== undefined && question.givenAnswer === question.correctAnswer) {
            conceptPerformance[question.concept].correct += 1;
          }
        });
      });

      // Calculate subject scores (simplified - can be enhanced with proper SAT scoring)
      const rwModules = modules.filter(m => m.moduleType === 'reading_writing');
      const mathModules = modules.filter(m => m.moduleType === 'math');
      
      const rwCorrect = rwModules.reduce((sum, m) => sum + m.correctCount, 0);
      const rwTotal = rwModules.reduce((sum, m) => sum + m.totalQuestions, 0);
      const mathCorrect = mathModules.reduce((sum, m) => sum + m.correctCount, 0);
      const mathTotal = mathModules.reduce((sum, m) => sum + m.totalQuestions, 0);
      
      const readingWritingScore = Math.round(200 + (rwCorrect / rwTotal) * 600);
      const mathScore = Math.round(200 + (mathCorrect / mathTotal) * 600);

      const satMiniExamLogData = {
        satMiniExamLogUuid,
        userUuid: userUuid || '',
        status: 'COMPLETED' as const,
        startedAt: now,
        completedAt: now,
        modules,
        totalCorrect: assessmentResults.correctAnswers,
        totalQuestions: assessmentResults.totalQuestions,
        predictedSATScore: assessmentResults.predictedSATScore,
        readingWritingScore,
        mathScore,
        conceptPerformance: JSON.stringify(conceptPerformance),
        createdAt: now,
        updatedAt: now,
      };

      if (userUuid) {
        // Save to database
        await client.models.SATMiniExamLog.create(satMiniExamLogData);
      } else {
        // Save to local storage for unauthenticated users
        // For onboarding, always replace with the latest assessment (don't append)
        localStorage.setItem(SAT_MINI_EXAM_STORAGE_KEY, JSON.stringify([satMiniExamLogData]));
        console.log('✓ Saved onboarding assessment to localStorage (replaced any existing)');
      }

      return satMiniExamLogUuid;
    } catch (err) {
      console.error('Error saving SAT MINI exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to save exam');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [client]);

  const loadFromLocalStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(SAT_MINI_EXAM_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.error('Error loading SAT MINI exam from local storage:', err);
      return [];
    }
  }, []);

  const clearLocalStorage = useCallback(() => {
    localStorage.removeItem(SAT_MINI_EXAM_STORAGE_KEY);
  }, []);

  const migrateToDatabase = useCallback(async (userUuid: string): Promise<boolean> => {
    try {
      const localLogs = loadFromLocalStorage();
      
      if (localLogs.length === 0) {
        return true;
      }

      // Save all local logs to database
      for (const log of localLogs) {
        await client.models.SATMiniExamLog.create({
          ...log,
          userUuid,
        });
      }

      // Clear local storage after successful migration
      clearLocalStorage();
      return true;
    } catch (err) {
      console.error('Error migrating SAT MINI exam to database:', err);
      return false;
    }
  }, [client, loadFromLocalStorage, clearLocalStorage]);

  return {
    saveSATMiniExam,
    isSaving,
    error,
    loadFromLocalStorage,
    clearLocalStorage,
    migrateToDatabase,
  };
}

