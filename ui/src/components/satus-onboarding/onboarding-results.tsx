"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, TrendingUp, Lock } from 'lucide-react';
import { type AssessmentResults } from './onboarding-assessment';
import { type SelfEvaluation } from './onboarding-self-evaluation';
import { SAT_TOPIC_GROUPS } from '@/lib/data/sat-assessment-questions';

interface OnboardingResultsProps {
  currentScore: number;
  targetScore: number;
  assessmentResults: AssessmentResults;
  selfEvaluation: SelfEvaluation | null;
  onComplete: () => void;
  isSaving?: boolean;
  isAuthenticated?: boolean;
  examLogUuid?: string | null;
}

export function OnboardingResults({
  currentScore,
  targetScore,
  assessmentResults,
  selfEvaluation,
  onComplete,
  isSaving = false,
  isAuthenticated = false,
  examLogUuid = null
}: OnboardingResultsProps) {
  const router = useRouter();
  const { 
    totalQuestions, 
    correctAnswers, 
    predictedSATScore, 
    mathScore, 
    rwScore,
    weakTopics, 
    strongTopics 
  } = assessmentResults;
  const percentage = Math.round((correctAnswers / totalQuestions) * 100);
  const targetAchieved = predictedSATScore >= targetScore;

  // Get topic group names for display
  const strugglingTopicNames = selfEvaluation?.strugglingTopics.map(id => 
    SAT_TOPIC_GROUPS.find(g => g.id === id)?.name
  ).filter(Boolean) || [];

  const handleSignup = () => {
    const redirectPath = '/satus';
    localStorage.setItem('post_auth_redirect', redirectPath);
    router.push(`/signup?redirect=${encodeURIComponent(redirectPath)}`);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-900 rounded-full mb-4">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Assessment Complete!</h2>
        <p className="text-lg text-gray-600">
          Here's your personalized learning plan
        </p>
      </div>

      {/* Signup CTA for unauthenticated users */}
      {!isAuthenticated && (
        <div className="mb-6 bg-linear-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-2xl font-bold mb-2">Unlock Your Full Results</h3>
          <p className="text-blue-100 mb-4">
            Sign up to see your complete SAT score breakdown, detailed strengths and weaknesses, and get your personalized study plan.
          </p>
          <Button
            onClick={handleSignup}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold h-12 text-base"
          >
            Sign Up to See Your Results
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {/* Predicted SAT Score - Hero Section */}
        <div className="bg-gray-900 rounded-2xl shadow-lg p-8 text-white relative">
          <div className="text-center">
            <p className="text-lg font-semibold mb-2 opacity-90">Your Predicted SAT Score</p>
            {isAuthenticated ? (
              <>
                <div className="text-6xl font-bold mb-4">{predictedSATScore}</div>
                <p className="text-sm opacity-90 mb-4">Out of 1600</p>
                
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">{mathScore}</div>
                    <p className="text-sm opacity-90">Math</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
                    <div className="text-3xl font-bold">{rwScore}</div>
                    <p className="text-sm opacity-90">Reading & Writing</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-6xl font-bold mb-4 flex items-center justify-center gap-3">
                  {predictedSATScore}
                </div>
                {/* <p className="text-sm opacity-90 mb-4">Sign up to see your score</p> */}
                
                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mt-6">
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 opacity-50">
                    <div className="text-3xl font-bold flex items-center justify-center">
                      <Lock className="w-8 h-8" />
                    </div>
                    <p className="text-sm opacity-90">Math</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 opacity-50">
                    <div className="text-3xl font-bold flex items-center justify-center">
                      <Lock className="w-8 h-8" />
                    </div>
                    <p className="text-sm opacity-90">Reading & Writing</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Assessment Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-4xl font-bold text-gray-900 mb-2">
                {correctAnswers}/{totalQuestions}
              </div>
              <p className="text-sm text-gray-600">Questions Correct</p>
              <div className="mt-2">
                <span className="inline-block bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">
                  {percentage}% Accuracy
                </span>
              </div>
            </div>

            <div className={`text-center p-4 rounded-lg ${targetAchieved ? 'bg-blue-50' : 'bg-green-50'}`}>
              <div className="flex items-center justify-center mb-2">
                <TrendingUp className={`w-6 h-6 mr-2 ${targetAchieved ? 'text-blue-600' : 'text-green-600'}`} />
                <div className={`text-2xl font-bold ${targetAchieved ? 'text-blue-600' : 'text-green-600'}`}>
                  {isAuthenticated ? (
                    targetAchieved ? '🎉' : `${targetScore - predictedSATScore > 0 ? '+' : ''}${targetScore - predictedSATScore}`
                  ) : (
                    targetAchieved ? '✓' : '✗'
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {isAuthenticated ? (
                  targetAchieved ? 'Target Achieved!' : 'Points to Target'
                ) : (
                  targetAchieved ? 'Target Achieved!' : 'Target Not Achieved'
                )}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {isAuthenticated ? (
                  targetAchieved 
                    ? `You scored ${predictedSATScore - targetScore} points above your target!` 
                    : `Target: ${targetScore}`
                ) : (
                  'Sign up to see the exact difference'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Strong Topics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {strongTopics.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 relative">
              {!isAuthenticated && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Sign up to see your strengths</p>
                  </div>
                </div>
              )}
              <div className="flex items-center mb-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Your Strengths</h3>
              </div>
              <p className="text-gray-600 mb-4">
                You're performing well in these areas:
              </p>
              <div className="flex flex-col gap-2 text-center">
                {strongTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="bg-green-100 text-green-800 text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weak Topics */}
          {weakTopics.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 relative">
              {!isAuthenticated && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                  <div className="text-center">
                    <Lock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600 font-medium">Sign up to see areas to focus on</p>
                  </div>
                </div>
              )}
              <div className="flex items-center mb-4">
                <XCircle className="w-6 h-6 text-orange-600 mr-3" />
                <h3 className="text-xl font-bold text-gray-900">Areas to Focus On</h3>
              </div>
              <p className="text-gray-600 mb-4">
                We'll help you improve in these areas:
              </p>
              <div className="flex flex-col gap-2 text-center">
                {weakTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="bg-orange-100 text-orange-800 text-sm font-medium px-4 py-2 rounded-lg"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-900 rounded-2xl p-8 text-white">
          <h3 className="text-2xl font-bold mb-4">Your Personalized Plan</h3>
          <ul className="space-y-3 mb-6">
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
              <span>Access to hundreds of questions tailored to your weaknesses</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
              <span>Detailed explanations and hints for every question</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
              <span>Progress tracking to help you reach your {targetScore} goal</span>
            </li>
            <li className="flex items-start">
              <CheckCircle2 className="w-5 h-5 text-green-400 mr-3 mt-0.5" />
              <span>Practice tests to measure your improvement</span>
            </li>
          </ul>

          <Button
            onClick={isAuthenticated ? onComplete : handleSignup}
            disabled={isSaving}
            className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold h-12 text-base"
          >
            {isAuthenticated 
              ? (isSaving ? 'Saving Your Profile...' : 'Start Your Preparation')
              : 'Sign Up to Unlock Your Results'
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
