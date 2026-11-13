"use client";

import { Button } from '@/components/ui/button';
import { CheckCircle2, TrendingUp, Target, Zap, ArrowLeft } from 'lucide-react';

interface OnboardingAssessmentIntroProps {
  onStart: () => void;
  onBack: () => void;
}

export function OnboardingAssessmentIntro({ onStart, onBack }: OnboardingAssessmentIntroProps) {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>
      
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">SAT Mini Assessment</h2>
        <p className="text-lg text-gray-600">
          A quick 12-question test to predict your SAT score
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
        {/* Overview */}
        <div className="border-l-4 border-gray-900 pl-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">What is this?</h3>
          <p className="text-gray-700">
            This is a <strong>mini SAT assessment</strong> with just 12 questions (instead of the full 120). 
            We'll use your performance to predict your current SAT score and identify areas for improvement.
          </p>
        </div>

        {/* How it works */}
        <div>
          <div className="space-y-4 md:px-8">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Modules 1 & 2: Warm-up (6 questions)</h4>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Modules 3 & 4: Challenge mode (6 questions)</h4>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Your predicted score</h4>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cheating Notice */}
        {/* <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-gray-700 text-center">
            <span className="font-semibold">Quick heads up:</span> Yes, you <em>could</em> Google the answers... but you'd only be fooling yourself. 🤷‍♂️ 
            We need your <strong>real</strong> level to create a study plan that actually helps you improve. 
            So maybe save the detective work for later?
          </p>
        </div> */}

        {/* CTA */}
        <div className="text-center pt-4">
          <Button
            onClick={onStart}
            className="px-12 py-6 text-lg w-full"
          >
            Start My 10-Minute SAT Assessment
          </Button>
          {/* <p className="text-sm text-gray-500 mt-3">
            This will take approximately 10 minutes
          </p> */}
        </div>
      </div>
    </div>
  );
}

