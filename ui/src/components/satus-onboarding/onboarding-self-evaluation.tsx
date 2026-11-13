"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { SAT_TOPIC_GROUPS } from '@/lib/data/sat-assessment-questions';
import { motion } from 'framer-motion';
import { Check, ArrowLeft } from 'lucide-react';

interface OnboardingSelfEvaluationProps {
  onComplete: (evaluation: SelfEvaluation) => void;
  onBack: () => void;
}

export interface SelfEvaluation {
  strugglingTopics: string[]; // Group IDs - will be set to 35% mastery
  // All other topics will default to 50% mastery
}

export function OnboardingSelfEvaluation({ onComplete, onBack }: OnboardingSelfEvaluationProps) {
  const [strugglingTopics, setStrugglingTopics] = useState<Set<string>>(new Set());

  const handleTopicToggle = (groupId: string) => {
    setStrugglingTopics(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleContinue = () => {
    onComplete({
      strugglingTopics: Array.from(strugglingTopics),
    });
  };

  // Group by category
  const mathTopics = SAT_TOPIC_GROUPS.filter(g => g.category === 'Math');
  const rwTopics = SAT_TOPIC_GROUPS.filter(g => g.category === 'Reading & Writing');

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
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Where would you like to improve?
        </h2>
        <p className="text-lg text-gray-600">
          Select the topics where you'd like extra help. We'll focus your practice on these areas.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Don't worry — you can skip this and we'll personalize as you practice.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-6">

        {/* Reading & Writing Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            📚 Reading & Writing
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {rwTopics.map((group) => {
              const isSelected = strugglingTopics.has(group.id);
              return (
                <motion.button
                  key={group.id}
                  onClick={() => handleTopicToggle(group.id)}
                  className={`relative text-left rounded-lg border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-lg">{group.emoji}</span>
                        <span className="font-semibold text-sm text-gray-900">{group.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {group.subtopics.map(s => s.display).join(' • ')}
                      </p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Math Section */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            📐 Math
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {mathTopics.map((group) => {
              const isSelected = strugglingTopics.has(group.id);
              return (
                <motion.button
                  key={group.id}
                  onClick={() => handleTopicToggle(group.id)}
                  className={`relative text-left rounded-lg border-2 p-3 transition-all ${
                    isSelected
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-lg">{group.emoji}</span>
                        <span className="font-semibold text-sm text-gray-900">{group.name}</span>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-1">
                        {group.subtopics.map(s => s.display).join(' • ')}
                      </p>
                    </div>
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex-shrink-0"
                      >
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-white" />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            onClick={handleContinue}
            className="px-8 w-full"
          >
            Continue
          </Button>
          {strugglingTopics.size === 0 && (
            <p className="text-center text-sm text-gray-500">
              No topics selected? That's okay! We'll personalize as you practice.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

