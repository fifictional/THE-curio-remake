"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthenticator } from '@/lib/local-auth-react';
import { OnboardingCurrentScore } from '@/components/satus-onboarding/onboarding-current-score';
import { OnboardingTargetScore } from '@/components/satus-onboarding/onboarding-target-score';
import { OnboardingSelfEvaluation, type SelfEvaluation } from '@/components/satus-onboarding/onboarding-self-evaluation';
import { OnboardingAssessmentIntro } from '@/components/satus-onboarding/onboarding-assessment-intro';
import { OnboardingAssessment, type AssessmentResults } from '@/components/satus-onboarding/onboarding-assessment';
import { OnboardingResults } from '@/components/satus-onboarding/onboarding-results';
import { TopBar } from '@/components/layout/top-bar';
import { useSaveLearningProfile } from '@/hooks/api/learning-profile/use-save-learning-profile.api';
import { useSaveSATMiniExam } from '@/hooks/api/sat-mini/use-save-sat-mini-exam.api';
import { useCommonContext } from '@/providers/common-provider';
import { useAnalytics } from '@/providers/analytics-provider';

type OnboardingStep = 'auth' | 'current-score' | 'target-score' | 'self-eval' | 'assessment-intro' | 'assessment' | 'results';

export default function SatusOnboardingPage() {
  const { route, user } = useAuthenticator(context => [context.route, context.user]);
  const router = useRouter();
  const { track } = useAnalytics();
  const { saveLearningProfile, isSaving: isSavingProfile, loadFromLocalStorage: loadProfileFromLS } = useSaveLearningProfile();
  const { saveSATMiniExam, isSaving: isSavingExam, loadFromLocalStorage: loadExamFromLS } = useSaveSATMiniExam();
  
  const [step, setStep] = useState<OnboardingStep>('auth');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [targetScore, setTargetScore] = useState<number>(0);
  const [selfEvaluation, setSelfEvaluation] = useState<SelfEvaluation | null>(null);
  const [assessmentResults, setAssessmentResults] = useState<AssessmentResults | null>(null);
  const [examLogUuid, setExamLogUuid] = useState<string | null>(null);

  const isUserAuthenticated = useMemo(() => {
    return !!user;
  }, [route]);

  const { collapseSidebar, isSidebarOpen, uncollapseSidebar } = useCommonContext();
  
  useEffect(() => {
    collapseSidebar();
    return () => {
      uncollapseSidebar();
    }
  }, []);

  useEffect(() => {
    // Wait for auth to be determined
    if (route === 'idle') return;

    // Only set to 'current-score' if we haven't started the onboarding yet
    if (step === 'auth') {
      // Check if user has already completed the assessment
      const existingExamLogs = loadExamFromLS();
      const existingProfile = loadProfileFromLS();
      
      if (existingExamLogs.length > 0 && existingProfile) {
        console.log('📋 Found existing completed assessment, loading results...');
        track('sat_onboarding_existing_assessment_loaded', {
          is_authenticated: !!user,
          total_concepts: Array.isArray(existingProfile) ? existingProfile.length : 0,
        });
        
        // Reconstruct the assessment results from localStorage
        const examLog = existingExamLogs[0];
        
        // Extract all questions from modules
        const allQuestions: any[] = [];
        examLog.modules?.forEach((module: any) => {
          if (module.questions) {
            allQuestions.push(...module.questions);
          }
        });
        
        // Build detailed results
        const detailedResults = allQuestions.map((q, index) => ({
          questionId: q.questionId,
          topic: q.subtopic?.includes('Math') ? 'Math' : 'Reading & Writing',
          subtopic: q.subtopic,
          concept: q.concept,
          difficulty: q.difficulty || 'medium',
          correct: q.givenAnswer === q.correctAnswer,
          module: Math.floor(index / 3) + 1,
          givenAnswer: q.givenAnswer,
          correctAnswer: q.correctAnswer,
        }));
        
        const results: AssessmentResults = {
          totalQuestions: examLog.totalQuestions || 12,
          correctAnswers: examLog.totalCorrect || 0,
          predictedSATScore: examLog.predictedSATScore || 1000,
          mathScore: examLog.mathScore || 500,
          rwScore: examLog.readingWritingScore || 500,
          weakTopics: [],
          strongTopics: [],
          detailedResults,
          learningProfile: existingProfile,
          adaptiveDifficulty: {},
        };
        
        setAssessmentResults(results);
        // Set dummy values for current/target score since we don't store them
        setCurrentScore(results.predictedSATScore);
        setTargetScore(1600);
        
        // Get exam UUID from localStorage if available
        const examLogs = loadExamFromLS();
        if (examLogs.length > 0 && examLogs[0].satMiniExamLogUuid) {
          setExamLogUuid(examLogs[0].satMiniExamLogUuid);
        }
        
        // scroll to the top of the page
        window.scrollTo(0, 0);
        setStep('results');
        return;
      }
      
      // No existing assessment, start fresh
      // scroll to the top of the page
      window.scrollTo(0, 0);
      setStep('target-score');
    }
  }, [route, user, step, loadExamFromLS, loadProfileFromLS]);

  const handleCurrentScoreSubmit = (current: number) => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    track('sat_onboarding_current_score_submitted', {
      current_score: current,
      is_authenticated: isUserAuthenticated,
    });
    setCurrentScore(current);
    setStep('target-score');
  };

  const handleTargetScoreSubmit = (target: number) => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    track('sat_onboarding_target_score_submitted', {
      current_score: currentScore,
      target_score: target,
      score_gap: target - currentScore,
      is_authenticated: isUserAuthenticated,
    });
    setTargetScore(target);
    // set dummy self evaluation for assessment intro
    setSelfEvaluation({ strugglingTopics: [] });
    setCurrentScore(1000);
    setStep('assessment-intro');
  };

  const handleSelfEvaluationComplete = (evaluation: SelfEvaluation) => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    track('sat_onboarding_self_eval_submitted', {
      struggling_topics_count: evaluation.strugglingTopics.length,
      is_authenticated: isUserAuthenticated,
    });
    setSelfEvaluation(evaluation);
    setStep('assessment-intro');
  };

  const handleAssessmentIntroComplete = () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    track('sat_onboarding_assessment_started', {
      current_score: currentScore,
      target_score: targetScore,
      struggling_topics_count: selfEvaluation?.strugglingTopics.length || 0,
      is_authenticated: isUserAuthenticated,
    });
    setStep('assessment');
  };

  // Back handlers
  const handleBackToCurrentScore = () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    setStep('current-score');
  };

  const handleBackToTargetScore = () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    setStep('target-score');
  };

  const handleBackToSelfEval = () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    setStep('self-eval');
  };

  const handleAssessmentComplete = async (results: AssessmentResults) => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    setAssessmentResults(results);
    
    track('sat_onboarding_assessment_completed', {
      predicted_score: results.predictedSATScore,
      math_score: results.mathScore,
      rw_score: results.rwScore,
      total_correct: results.correctAnswers,
      total_questions: results.totalQuestions,
      accuracy: Math.round((results.correctAnswers / results.totalQuestions) * 100),
      weak_topics_count: results.weakTopics.length,
      strong_topics_count: results.strongTopics.length,
      current_score: currentScore,
      target_score: targetScore,
      is_authenticated: isUserAuthenticated,
    });
    
    // Save learning profile immediately after assessment
    const { learningProfile } = results;
    const userUuid = user?.userId;

    // Save learning profile (to database if authenticated, localStorage otherwise)
    await saveLearningProfile(learningProfile, userUuid);

    // Save assessment as a SAT MINI exam (to database if authenticated, localStorage otherwise)
    const savedExamLogUuid = await saveSATMiniExam(results, userUuid);
    
    // Store exam UUID for redirect after signup/login
    if (savedExamLogUuid) {
      setExamLogUuid(savedExamLogUuid);
    }

    track('sat_onboarding_data_saved', {
      is_authenticated: isUserAuthenticated,
      storage_type: userUuid ? 'database' : 'local_storage',
      concepts_saved: Array.isArray(learningProfile) ? learningProfile.length : 0,
    });

    // Show results page
    setStep('results');
  };

  const handleOnboardingComplete = () => {
    // scroll to the top of the page
    window.scrollTo(0, 0);
    
    track('sat_onboarding_completed', {
      predicted_score: assessmentResults?.predictedSATScore || 0,
      current_score: currentScore,
      target_score: targetScore,
      is_authenticated: isUserAuthenticated,
      next_action: user ? 'dashboard' : 'signup',
    });
    
    // Navigate based on authentication status
    if (user) {
      // Authenticated user - redirect to exam page if we have UUID, otherwise dashboard
      const redirectPath = examLogUuid ? `/satus/take/${examLogUuid}` : '/satus';
      router.push(redirectPath);
    } else {
      // Unauthenticated user - store redirect URI with exam UUID
      const redirectPath = examLogUuid ? `/satus/take/${examLogUuid}` : '/satus';
      localStorage.setItem('post_auth_redirect', redirectPath);
      router.push(`/signup?redirect=${encodeURIComponent(redirectPath)}`);
    }
  };

  // Main onboarding flow
  return (
    <>
      {!isUserAuthenticated && <TopBar title="SAT" noUpgrade />}
      <div className="h-full bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 text-gray-700">
        {step === 'current-score' && (
          <OnboardingCurrentScore onComplete={handleCurrentScoreSubmit} />
        )}
        
        {step === 'target-score' && (
          <OnboardingTargetScore 
            currentScore={currentScore} 
            onComplete={handleTargetScoreSubmit}
            onBack={handleBackToCurrentScore}
          />
        )}
        
        {step === 'self-eval' && (
          <OnboardingSelfEvaluation 
            onComplete={handleSelfEvaluationComplete}
            onBack={handleBackToTargetScore}
          />
        )}
        
        {step === 'assessment-intro' && (
          <OnboardingAssessmentIntro 
            onStart={handleAssessmentIntroComplete}
            onBack={handleBackToTargetScore}
          />
        )}
        
        {step === 'assessment' && (
          <OnboardingAssessment 
            selfEvaluation={selfEvaluation}
            onComplete={handleAssessmentComplete} 
          />
        )}
        
        {/* Show loading while saving profile and exam */}
        {(isSavingProfile || isSavingExam) && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-lg text-gray-700 font-medium">Saving your assessment...</p>
            <p className="text-sm text-gray-500 mt-2">This will only take a moment</p>
          </div>
        )}
        
        {step === 'results' && assessmentResults && !isSavingProfile && !isSavingExam && (
          <OnboardingResults
            currentScore={currentScore}
            targetScore={targetScore}
            assessmentResults={assessmentResults}
            selfEvaluation={selfEvaluation}
            onComplete={handleOnboardingComplete}
            isAuthenticated={isUserAuthenticated}
            examLogUuid={examLogUuid}
          />
        )}
        
        {step === 'results' && !assessmentResults && (
          <div className="text-center py-12">
            <p className="text-red-600">Error: No assessment results available</p>
          </div>
        )}
      </div>
    </>
  );
}
