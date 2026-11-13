"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SAT_SCORE_RANGES } from '@/lib/data/sat-assessment-questions';
import { ArrowLeft } from 'lucide-react';

interface OnboardingTargetScoreProps {
  currentScore: number;
  onComplete: (targetScore: number) => void;
  onBack: () => void;
}

// Universities by score range
const UNIVERSITIES_BY_SCORE: Record<number, string[]> = {
  400: ["Community Colleges", "Open Enrollment Programs"],
  600: ["Regional State Universities", "Some State Colleges"],
  800: ["Many State Universities", "Regional Colleges"],
  900: ["Good State Universities", "Some Competitive Colleges"],
  1000: ["Strong State Universities", "Competitive Colleges"],
  1100: ["Top State Universities", "Selective Private Colleges"],
  1200: ["Highly Selective Universities", "Boston University", "Northeastern"],
  1300: ["Very Competitive Universities", "NYU", "USC", "Michigan"],
  1400: ["Elite Universities", "UCLA", "UC Berkeley", "Carnegie Mellon"],
  1500: ["Top-Tier Universities", "Duke", "Northwestern", "Cornell"],
  1600: ["Ivy League", "Stanford", "MIT", "Harvard", "Princeton", "Yale"]
};

const getUniversities = (score: number): string[] => {
  // Round to nearest 100
  const roundedScore = Math.round(score / 100) * 100;
  return UNIVERSITIES_BY_SCORE[roundedScore] || UNIVERSITIES_BY_SCORE[1200];
};

export function OnboardingTargetScore({ currentScore, onComplete, onBack }: OnboardingTargetScoreProps) {
  const [targetScore, setTargetScore] = useState<number>(Math.min(currentScore + 1200, SAT_SCORE_RANGES.max));
  const [error, setError] = useState<string>('');

  // Ensure target score is always at least equal to current score
  useEffect(() => {
    if (targetScore < currentScore) {
      setTargetScore(currentScore);
    }
  }, [currentScore, targetScore]);

  const validateAndSubmit = () => {
    if (currentScore >= targetScore) {
      setError('Target score must be higher than current score');
      return;
    }

    setError('');
    onComplete(targetScore);
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Button */}
      {/* <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button> */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">What's Your Goal?</h2>
        <p className="text-lg text-gray-600">
          Set your target score and see which colleges open up for you
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
        {/* Target Score Slider */}
        <div>
          <Label className="text-base font-semibold text-gray-900 mb-6 block">
            What’s your dream SAT score?
          </Label>
          
          {/* Score Display */}
          <div className="bg-green-50 rounded-xl p-8 mb-6 text-center border border-green-200">
            <div className="text-6xl font-bold text-green-600 mb-2">
              {targetScore}
            </div>
            
            {/* Score Gap - Embedded */}
            {/* {currentScore < targetScore && (
              <div className="inline-block bg-orange-100 border border-orange-300 rounded-full px-6 py-2 mb-4">
                <p className="text-2xl font-bold text-orange-600">
                  +{targetScore - currentScore} points from current
                </p>
              </div>
            )} */}
            
            {/* Universities List */}
            {/* <div className="mt-6">
              <p className="text-sm font-semibold text-green-900 mb-3">Potential Universities:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {getUniversities(targetScore).map((uni, index) => (
                  <span
                    key={index}
                    className="inline-block bg-white text-green-800 text-sm font-medium px-4 py-2 rounded-full border border-green-300"
                  >
                    {uni}
                  </span>
                ))}
              </div>
            </div> */}
          </div>

          {/* Slider */}
          <div className="px-2">
            <input
              type="range"
              min={400}
              max={SAT_SCORE_RANGES.max}
              step={50}
              value={targetScore}
              onChange={(e) => {
                const newTarget = parseInt(e.target.value);
                // Ensure target is never lower than current
                if (newTarget >= currentScore) {
                  setTargetScore(newTarget);
                  setError('');
                }
              }}
              className="w-full h-3 bg-green-200 rounded-lg appearance-none cursor-pointer slider-thumb-green"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>400</span>
              <span>{SAT_SCORE_RANGES.max}</span>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Button
          onClick={validateAndSubmit}
          className="w-full h-12 text-base font-semibold"
        >
          Continue to Assessment
        </Button>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider-thumb-green::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #16a34a;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .slider-thumb-green::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #16a34a;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

