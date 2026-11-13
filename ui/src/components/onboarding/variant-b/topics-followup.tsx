'use client';

import { useState } from 'react';
import { useAnalytics } from '@/providers';
import { OnboardingHeader } from '@/design-system/onboarding-header';
import { OnboardingSubtitle } from '@/design-system/onboarding-subtitle';
import { CurioButton } from '@/design-system/curio-button';

const MAX_TOPICS_LENGTH = 200;

export interface TopicsFollowupProps {
  variant?: string;
  onContinue: (topics: string) => void;
}

export function TopicsFollowup({ variant, onContinue }: TopicsFollowupProps) {
  const [topics, setTopics] = useState('');
  const { track } = useAnalytics();

  const handleContinue = () => {
    const trimmed = topics.trim();
    track('onboarding_user_topics_updated', {
      userTopics: trimmed,
      ...(variant ? { variant } : {}),
    });
    onContinue(trimmed);
  };

  return (
    <div className="w-full max-w-96 flex flex-col justify-start items-center gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-3">
        <OnboardingHeader>What topics would you like to explore?</OnboardingHeader>
        <OnboardingSubtitle>You can list multiple topics, separated by commas.</OnboardingSubtitle>
      </div>

      <form
        className="self-stretch flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <textarea
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          placeholder="e.g., Quantum mechanics, linear algebra, thermodynamics"
          maxLength={MAX_TOPICS_LENGTH}
          rows={4}
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors resize-none font-['Lexend']"
        />
        <div className="text-xs text-muted-foreground self-end font-['Lexend']">
          {topics.length} / {MAX_TOPICS_LENGTH} characters
        </div>
        <CurioButton type="submit" size="full" color="primary">
          Continue
        </CurioButton>
      </form>
    </div>
  );
}
