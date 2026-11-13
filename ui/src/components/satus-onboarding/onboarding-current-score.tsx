"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SAT_SCORE_RANGES } from '@/lib/data/sat-assessment-questions';

interface OnboardingCurrentScoreProps {
  onComplete: (currentScore: number) => void;
}

// Score descriptions for different ranges
const SCORE_DESCRIPTIONS: Record<number, string> = {
  400: "Perfect starting point - lots of room to grow! 🌱",
  500: "Solid foundation to build on! 💪",
  600: "Not bad at all - ready to level up? 🏃",
  700: "Good baseline - let's make it great! 🔥",
  800: "Nice! We can definitely work with this ✨",
  900: "Strong start - but you want more, right? 😏",
  1000: "Decent score - let's push it higher! 🎯",
  1100: "Good, but you didn't come here to stay 'good' 📈",
  1200: "Solid score - Ivy League dreams? Let's go! 🎓",
  1300: "Impressive! But there's still room at the top 🚀",
  1400: "Wow, starting strong! Let's get you to elite level 🏆",
  1500: "Seriously impressive! Aiming for perfect? 🤓",
  1600: "Perfect score already? Let's keep it that way! 😎"
};

const getScoreDescription = (score: number): string => {
  // Round to nearest 100
  const roundedScore = Math.floor(score / 100) * 100;
  return SCORE_DESCRIPTIONS[roundedScore] || SCORE_DESCRIPTIONS[1200];
};

export function OnboardingCurrentScore({ onComplete }: OnboardingCurrentScoreProps) {
  const [currentScore, setCurrentScore] = useState<number>(1000);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Let's Get Started</h2>
        <p className="text-lg text-gray-600">
          Tell us about your current SAT level
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-8 space-y-8">
        {/* Current Score Slider */}
        <div>
          <Label className="text-base font-semibold text-gray-900 mb-2 block">
            What's your current SAT score?
          </Label>
          <p className="text-sm text-gray-600 mb-6">
            Don’t worry if you haven’t taken the SAT yet. We’ll start from 1000 and refine it together.
          </p>
          
          {/* Score Display */}
          <div className="bg-blue-50 rounded-xl p-8 mb-6 text-center border border-blue-200">
            <div className="text-6xl font-bold text-blue-600 mb-3">
              {currentScore}
            </div>
            <p className="text-lg text-blue-800 font-medium">
              {getScoreDescription(currentScore)}
            </p>
          </div>

          {/* Slider */}
          <div className="px-2">
            <input
              type="range"
              min={SAT_SCORE_RANGES.min}
              max={SAT_SCORE_RANGES.max}
              step={10}
              value={currentScore}
              onChange={(e) => {
                setCurrentScore(parseInt(e.target.value));
              }}
              className="w-full h-3 bg-blue-200 rounded-lg appearance-none cursor-pointer slider-thumb"
            />
            <div className="flex justify-between text-sm text-gray-600 mt-2">
              <span>{SAT_SCORE_RANGES.min}</span>
              <span>{SAT_SCORE_RANGES.max}</span>
            </div>
          </div>
        </div>

        <Button
          onClick={() => onComplete(currentScore)}
          className="w-full h-12 text-base font-semibold"
        >
          Continue
        </Button>
      </div>

      {/* Custom Slider Styles */}
      <style jsx>{`
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .slider-thumb::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #2563eb;
          cursor: pointer;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}

