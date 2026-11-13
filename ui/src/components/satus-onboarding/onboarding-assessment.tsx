"use client";

import { useState, useMemo, useCallback, useEffect } from 'react';
import { SAT_QUESTION_BANK, type AssessmentQuestion } from '@/lib/data/sat-assessment-question-bank';
import { SAT_TOPIC_GROUPS, SAT_MATH_CONCEPT_IDS, SAT_RW_CONCEPT_IDS } from '@/lib/data/sat-assessment-questions';
import { motion } from 'framer-motion';
import { MockExamSingleQuestion } from '@/components/mock-exams/flow/mock-exam-single-question';
import { type SelfEvaluation } from './onboarding-self-evaluation';
import { applyMasteryAdjustment, getMasteryAdjustment, type QuestionDifficulty } from '@/lib/utils/mastery-adjustment';
import { useAnalytics } from '@/providers/analytics-provider';

interface OnboardingAssessmentProps {
  selfEvaluation?: SelfEvaluation | null;
  onComplete: (results: AssessmentResults) => void;
}

export interface SubtopicMastery {
  subtopic: string;
  mastery: number; // 0-100
  questionsAnswered: number;
  questionsCorrect: number;
}

export interface LearningProfile {
  subtopicMasteries: Record<string, SubtopicMastery>;
  lastUpdated: string;
  totalQuestionsAnswered: number;
}

export interface AssessmentResults {
  totalQuestions: number;
  correctAnswers: number;
  predictedSATScore: number;
  mathScore: number;
  rwScore: number;
  weakTopics: string[];
  strongTopics: string[];
  detailedResults: {
    questionId: string;
    topic: string;
    subtopic: string;
    concept: string; // Concept ID for mastery tracking
    difficulty: string;
    correct: boolean;
    module: number;
    givenAnswer?: number; // User's answer index
    correctAnswer: number; // Correct answer index
  }[];
  learningProfile: LearningProfile;
  adaptiveDifficulty?: Record<number, string>; // Module number -> difficulty level
}

type ModuleType = 'module1-rw' | 'module2-math' | 'module3-mh-rw' | 'module3-em-rw' | 'module4-mh-math' | 'module4-em-math';

export function OnboardingAssessment({ selfEvaluation, onComplete }: OnboardingAssessmentProps) {
  const [currentModule, setCurrentModule] = useState<ModuleType>('module1-rw');
  const [currentQuestionIndexInModule, setCurrentQuestionIndexInModule] = useState(0);
  const [answers, setAnswers] = useState<Map<string, { givenAnswer: number; isCorrect: boolean }>>(new Map());
  const [adaptiveLevel, setAdaptiveLevel] = useState<string>('easy-medium');
  const { track } = useAnalytics();

  // Build ALL possible questions upfront (both adaptive paths)
  // Modules 1-2: 3 RW (2 easy, 1 medium) + 3 Math (2 easy, 1 medium) = 6 questions
  // Easy-Medium path: 3 RW (1 easy, 2 medium) + 3 Math (1 easy, 2 medium) = 6 questions
  // Medium-Hard path: 3 RW (2 medium, 1 hard) + 3 Math (2 medium, 1 hard) = 6 questions
  // Total: 12 questions = 4 easy + 6 medium + 2 hard
  const { allQuestions, moduleInfo } = useMemo(() => {
    // Module 1: RW - 2 easy, 1 medium (3 questions)
    const module1Questions: AssessmentQuestion[] = [];
    const module1Easy = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'easy').sort(() => Math.random() - 0.5).slice(0, 2);
    const module1Medium = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'medium').sort(() => Math.random() - 0.5).slice(0, 1);
    module1Questions.push(...module1Easy, ...module1Medium);

    // Module 2: Math - 2 easy, 1 medium (3 questions)
    const module2Questions: AssessmentQuestion[] = [];
    const module2Easy = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'easy').sort(() => Math.random() - 0.5).slice(0, 2);
    const module2Medium = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'medium').sort(() => Math.random() - 0.5).slice(0, 1);
    module2Questions.push(...module2Easy, ...module2Medium);

    // Track used question IDs to ensure uniqueness
    const usedIds = new Set([...module1Questions.map(q => q.id), ...module2Questions.map(q => q.id)]);

    // Module 3: RW - Easy/Medium path: 1 easy, 2 medium (3 questions)
    const module3EmQuestions: AssessmentQuestion[] = [];
    const module3EmEasy = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'easy' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 1);
    const module3EmMedium = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'medium' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 2);
    module3EmQuestions.push(...module3EmEasy, ...module3EmMedium);
    module3EmQuestions.forEach(q => usedIds.add(q.id));

    // Module 3: RW - Medium/Hard path: 2 medium, 1 hard (3 questions)
    const module3MhQuestions: AssessmentQuestion[] = [];
    const module3MhMedium = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'medium' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 2);
    const module3MhHard = SAT_QUESTION_BANK.filter(q => q.topic === 'Reading & Writing' && q.difficulty === 'hard' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 1);
    module3MhQuestions.push(...module3MhMedium, ...module3MhHard);
    module3MhQuestions.forEach(q => usedIds.add(q.id));

    // Module 4: Math - Easy/Medium path: 1 easy, 2 medium (3 questions)
    const module4EmQuestions: AssessmentQuestion[] = [];
    const module4EmEasy = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'easy' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 1);
    const module4EmMedium = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'medium' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 2);
    module4EmQuestions.push(...module4EmEasy, ...module4EmMedium);
    module4EmQuestions.forEach(q => usedIds.add(q.id));

    // Module 4: Math - Medium/Hard path: 2 medium, 1 hard (3 questions)
    const module4MhQuestions: AssessmentQuestion[] = [];
    const module4MhMedium = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'medium' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 2);
    const module4MhHard = SAT_QUESTION_BANK.filter(q => q.topic === 'Math' && q.difficulty === 'hard' && !usedIds.has(q.id)).sort(() => Math.random() - 0.5).slice(0, 1);
    module4MhQuestions.push(...module4MhMedium, ...module4MhHard);

    return {
      allQuestions: {
        'module1-rw': module1Questions,
        'module2-math': module2Questions,
        'module3-em-rw': module3EmQuestions,
        'module3-mh-rw': module3MhQuestions,
        'module4-em-math': module4EmQuestions,
        'module4-mh-math': module4MhQuestions,
      },
      moduleInfo: {
        'module1-rw': { number: 1, name: 'Reading & Writing', totalQuestions: 3 },
        'module2-math': { number: 2, name: 'Math', totalQuestions: 3 },
        'module3-em-rw': { number: 3, name: 'Reading & Writing', totalQuestions: 3 },
        'module3-mh-rw': { number: 3, name: 'Reading & Writing', totalQuestions: 3 },
        'module4-em-math': { number: 4, name: 'Math', totalQuestions: 3 },
        'module4-mh-math': { number: 4, name: 'Math', totalQuestions: 3 },
      }
    };
  }, []);

  // Determine adaptive level based on performance in modules 1-2
  const calculatePerformance = useCallback((answers: Map<string, { givenAnswer: number; isCorrect: boolean }>) => {
    const firstModuleAnswers = Array.from(answers.entries()).slice(0, 6);
    const correctCount = firstModuleAnswers.filter(([_, answerData]) => answerData.isCorrect).length;
    const performance = correctCount / 6;
    
    return performance >= 0.67 ? 'medium-hard' : 'easy-medium';
  }, []);

  // Get the current questions based on module and adaptive level
  const getCurrentModuleQuestions = (): AssessmentQuestion[] => {
    if (currentModule === 'module1-rw') return allQuestions['module1-rw'];
    if (currentModule === 'module2-math') return allQuestions['module2-math'];
    if (currentModule === 'module3-mh-rw' || currentModule === 'module3-em-rw') {
      return allQuestions[currentModule];
    }
    if (currentModule === 'module4-mh-math' || currentModule === 'module4-em-math') {
      return allQuestions[currentModule];
    }
    return [];
  };

  const currentModuleQuestions = getCurrentModuleQuestions();
  const currentQuestion = currentModuleQuestions[currentQuestionIndexInModule] || null;
  
  const currentModuleInfo = moduleInfo[currentModule];
  
  // Calculate overall progress (out of 12 questions)
  const totalAnswered = answers.size;
  const progress = (totalAnswered / 12) * 100;

  const handleAnswer = (selectedIndex: number, isCorrect: boolean) => {
    if (!currentQuestion) return;
    setAnswers(prev => {
      const newAnswers = new Map(prev).set(currentQuestion.id, { givenAnswer: selectedIndex, isCorrect });
      console.log(`📝 Answer recorded for question ${currentQuestion.id}. Total answers: ${newAnswers.size}`);
      return newAnswers;
    });
  };

  const handleNext = async () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log(`🔄 handleNext called. Current module: ${currentModule}, Question index: ${currentQuestionIndexInModule}, Module length: ${currentModuleQuestions.length}, Total answers: ${answers.size}`);

    track('sat_exam_next_question_clicked', {
      exam_uuid: 'onboarding',
      question_id: currentQuestion?.id || 'unknown',
      question_index: currentQuestionIndexInModule + 1,
      module: currentModule,
      total_questions: 12,
    });

    // Check if we're at the end of current module
    if (currentQuestionIndexInModule < currentModuleQuestions.length - 1) {
      console.log('➡️ Moving to next question in module');
      setCurrentQuestionIndexInModule(prev => prev + 1);
    } else {
      // Move to next module
      if (currentModule === 'module1-rw') {
        console.log('📚 Moving to Module 2 (Math)');
        setCurrentModule('module2-math');
        setCurrentQuestionIndexInModule(0);
      } else if (currentModule === 'module2-math') {
        // calculate adaptive level 
        const performance = calculatePerformance(answers);
        setAdaptiveLevel(performance);
        console.log(`📊 Adaptive level determined: ${performance}`);
        if (performance === 'medium-hard') {
          setCurrentModule('module3-mh-rw');
        } else {
          setCurrentModule('module3-em-rw');
        }
        setCurrentQuestionIndexInModule(0);
      } else if (currentModule === 'module3-mh-rw' || currentModule === 'module3-em-rw') {
        console.log('📚 Moving to Module 4 (Math)');
        if (adaptiveLevel === 'medium-hard') {
          setCurrentModule('module4-mh-math');
        } else {
          setCurrentModule('module4-em-math');
        }
        setCurrentQuestionIndexInModule(0);
      } else if (currentModule === 'module4-mh-math' || currentModule === 'module4-em-math') {
        // Module 4 complete - finish assessment
        console.log(`✅ Assessment complete! Total answers recorded: ${answers.size}`);
        const results = calculateResults();
        onComplete(results);
      }
    }
  };

  const calculateResults = (): AssessmentResults => {
    // Get the actual questions that were shown (based on adaptive path)
    const module3Questions = adaptiveLevel === 'medium-hard' 
      ? allQuestions['module3-mh-rw'] 
      : allQuestions['module3-em-rw'];
    const module4Questions = adaptiveLevel === 'medium-hard' 
      ? allQuestions['module4-mh-math'] 
      : allQuestions['module4-em-math'];

    const allQuestionsFlat = [
      ...allQuestions['module1-rw'],
      ...allQuestions['module2-math'],
      ...module3Questions,
      ...module4Questions,
    ];

    const detailedResults = allQuestionsFlat.map((q, index) => {
      // Module 1: 0-2 (3 RW), Module 2: 3-5 (3 Math), Module 3: 6-8 (3 RW), Module 4: 9-11 (3 Math)
      const moduleNum = index < 3 ? 1 : index < 6 ? 2 : index < 9 ? 3 : 4;
      const answerData = answers.get(q.id);
      return {
        questionId: q.id,
        topic: q.topic,
        subtopic: q.subtopic,
        concept: q.concept,
        difficulty: q.difficulty,
        correct: answerData?.isCorrect || false,
        module: moduleNum,
        givenAnswer: answerData?.givenAnswer,
        correctAnswer: q.answer,
      };
    });

    // Weighted scoring based on difficulty
    // Total possible: 4 easy + 6 medium + 2 hard = 12 questions
    // Points: easy = 1, medium = 2, hard = 3
    // Max points = (4 * 1) + (6 * 2) + (2 * 3) = 4 + 12 + 6 = 22 points
    const DIFFICULTY_POINTS = {
      easy: 1,
      medium: 2,
      hard: 3,
    };
    const MAX_POINTS = 22; // 4 easy + 12 medium + 6 hard

    let totalPointsEarned = 0;
    let rwPointsEarned = 0;
    let mathPointsEarned = 0;
    let rwMaxPoints = 0;
    let mathMaxPoints = 0;

    detailedResults.forEach(result => {
      const points = DIFFICULTY_POINTS[result.difficulty as keyof typeof DIFFICULTY_POINTS] || 1;
      
      if (result.topic === 'Reading & Writing') {
        rwMaxPoints += points;
        if (result.correct) rwPointsEarned += points;
      } else {
        mathMaxPoints += points;
        if (result.correct) mathPointsEarned += points;
      }
      
      if (result.correct) totalPointsEarned += points;
    });

    const correctAnswers = detailedResults.filter(r => r.correct).length;

    // Calculate SAT score prediction (200-800 per section)
    // Scale based on weighted points, not just correct count
    const rwScore = Math.round(200 + (rwPointsEarned / rwMaxPoints) * 600);
    const mathScore = Math.round(200 + (mathPointsEarned / mathMaxPoints) * 600);
    const predictedSATScore = rwScore + mathScore;

    // Calculate weak and strong topics
    const topicPerformance = new Map<string, { correct: number; total: number }>();
    
    detailedResults.forEach(result => {
      const key = result.subtopic;
      const current = topicPerformance.get(key) || { correct: 0, total: 0 };
      topicPerformance.set(key, {
        correct: current.correct + (result.correct ? 1 : 0),
        total: current.total + 1,
      });
    });

    const weakTopics: string[] = [];
    const strongTopics: string[] = [];

    topicPerformance.forEach((perf, topic) => {
      if (perf.correct === 0) {
        weakTopics.push(topic);
      } else if (perf.correct === perf.total) {
        strongTopics.push(topic);
      }
    });

    // Calculate learning profile with mastery scores
    const learningProfile = calculateLearningProfile(detailedResults, selfEvaluation);

    // Track adaptive difficulty for modules 3 and 4
    const adaptiveDifficulty: Record<number, string> = {
      3: adaptiveLevel === 'medium-hard' ? 'hard' : 'easy',
      4: adaptiveLevel === 'medium-hard' ? 'hard' : 'easy',
    };

    return {
      totalQuestions: 12,
      correctAnswers,
      predictedSATScore,
      mathScore,
      rwScore,
      adaptiveDifficulty,
      weakTopics,
      strongTopics,
      detailedResults,
      learningProfile,
    };
  };

  // Apply amplified mastery adjustments for onboarding (5x multiplier)
  // This creates a stronger baseline since this is the user's first assessment
  const applyOnboardingMasteryAdjustment = (
    currentMastery: number,
    difficulty: QuestionDifficulty,
    isCorrect: boolean
  ): number => {
    const adjustment = getMasteryAdjustment(currentMastery, difficulty);
    const baseChange = isCorrect ? adjustment.correct : adjustment.incorrect;
    
    // Apply 5x multiplier for onboarding to create a more accurate baseline
    const amplifiedChange = Math.round(baseChange * 5);
    const newMastery = currentMastery + amplifiedChange;
    
    // Clamp between 0 and 100
    return Math.max(0, Math.min(100, newMastery));
  };

  // Helper function to calculate learning profile
  const calculateLearningProfile = (
    detailedResults: AssessmentResults['detailedResults'],
    selfEval?: SelfEvaluation | null
  ): LearningProfile => {
    // Get all subtopics from both Math and Reading & Writing
    const allSubtopics = [...SAT_MATH_CONCEPT_IDS, ...SAT_RW_CONCEPT_IDS];

    // Get struggling subtopics from self-evaluation
    const strugglingSubtopics = new Set<string>();

    if (selfEval) {
      // Map group IDs to their concept IDs
      SAT_TOPIC_GROUPS.forEach(group => {
        if (selfEval.strugglingTopics.includes(group.id)) {
          group.subtopics.forEach(subtopic => strugglingSubtopics.add(subtopic.id));
        }
      });
    }

    // Initialize mastery scores for all subtopics
    const subtopicMasteries: Record<string, SubtopicMastery> = {};
    
    allSubtopics.forEach(subtopic => {
      // Struggling topics start at 35%, everything else at 50%
      let initialMastery = strugglingSubtopics.has(subtopic) ? 35 : 50;

      subtopicMasteries[subtopic] = {
        subtopic,
        mastery: initialMastery,
        questionsAnswered: 0,
        questionsCorrect: 0,
      };
    });

    // Apply adjustments based on assessment results
    detailedResults.forEach(result => {
      const mastery = subtopicMasteries[result.concept];
      if (!mastery) {
        console.warn(`Mastery not found for concept: ${result.concept}`);
        return;
      }

      mastery.questionsAnswered++;
      
      if (result.correct) {
        mastery.questionsCorrect++;
      }

      // Apply AMPLIFIED mastery adjustment for onboarding (5x stronger)
      // This creates a more accurate baseline since it's the first assessment
      mastery.mastery = applyOnboardingMasteryAdjustment(
        mastery.mastery,
        result.difficulty as QuestionDifficulty,
        result.correct
      );
    });

    const profile: LearningProfile = {
      subtopicMasteries,
      lastUpdated: new Date().toISOString(),
      totalQuestionsAnswered: detailedResults.length,
    };

    // Store in localStorage
    try {
      localStorage.setItem('sat_learning_profile', JSON.stringify(profile));
      console.log('Learning profile saved to localStorage:', profile);
    } catch (error) {
      console.error('Failed to save learning profile to localStorage:', error);
    }

    return profile;
  };

  if (!currentQuestion) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const moduleNumber = currentModuleInfo.number;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Module {currentModuleInfo.number}: {currentModuleInfo.name}
            </h2>
          </div>
          <span className="text-sm font-medium text-gray-600">
            Question {currentQuestionIndexInModule + 1 + (3 * (moduleNumber - 1))} of 12
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            className="bg-blue-600 h-2 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Module indicator */}
        {/* <div className="flex items-center gap-2 mt-3">
          {[1, 2, 3, 4].map(num => (
            <div
              key={num}
              className={`flex-1 h-1 rounded-full ${
                num <= currentModuleInfo.number
                  ? 'bg-blue-600'
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div> */}
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-4">
        {/* Use the shared component */}
        <MockExamSingleQuestion
          questionContent={currentQuestion.questionContent}
          options={currentQuestion.options}
          correctAnswer={currentQuestion.answer}
          hint={currentQuestion.hint}
          answerExplanations={currentQuestion.answerExplanations}
          onAnswer={handleAnswer}
          onNext={handleNext}
          showQuestionNumber={false}
        />
      </div>
    </div>
  );
}
