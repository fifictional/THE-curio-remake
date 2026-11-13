'use client';

import { useState } from 'react';
import { useAnalytics } from '@/providers';
import { OnboardingHeader } from '@/design-system/onboarding-header';
import { OnboardingSubtitle } from '@/design-system/onboarding-subtitle';
import { CurioButton } from '@/design-system/curio-button';
import type { Lifestage } from './variant-b-context';

interface CourseQuestionConfig {
  question: string;
  placeholder: string;
}

const courseQuestions: Record<Lifestage, CourseQuestionConfig> = {
  'high-school': { question: 'What are you studying?', placeholder: 'e.g., English, Mathematics' },
  'college': { question: 'What is your major? Which year?', placeholder: 'e.g., Computer Science, Year 2' },
  'graduate': {
    question: 'What subject or topic are you pursuing this degree in?',
    placeholder: 'e.g., Mechanical Engineering, Quantum Physics',
  },
  'teacher': { question: 'What do you teach?', placeholder: 'e.g., High School Biology' },
  'professional': { question: 'What industry do you work in?', placeholder: 'e.g., Software Engineering, Healthcare' },
  'other': { question: 'What would you like to learn about?', placeholder: 'Tell us more...' },
};

export interface CourseScreenProps {
  lifestage: Lifestage;
  variant?: string;
  onContinue: (course: string) => void;
}

export function CourseScreen({ lifestage, variant, onContinue }: CourseScreenProps) {
  const [course, setCourse] = useState('');
  const { track } = useAnalytics();
  const config = courseQuestions[lifestage];

  const handleContinue = () => {
    const trimmed = course.trim();
    if (!trimmed) return;
    track('onboarding_user_course_updated', {
      userCourse: trimmed,
      lifestage,
      ...(variant ? { variant } : {}),
    });
    onContinue(trimmed);
  };

  return (
    <div className="w-full max-w-96 flex flex-col justify-start items-center gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-3">
        <OnboardingHeader>{config.question}</OnboardingHeader>
        <OnboardingSubtitle>This helps us tailor content to your needs.</OnboardingSubtitle>
      </div>

      <form
        className="self-stretch flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <input
          type="text"
          value={course}
          onChange={(e) => setCourse(e.target.value)}
          placeholder={config.placeholder}
          maxLength={100}
          autoFocus
          className="w-full px-4 py-3 rounded-lg border border-border bg-background text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors font-['Lexend']"
        />
        <CurioButton
          type="submit"
          size="full"
          color="primary"
          disabled={!course.trim()}
        >
          Continue
        </CurioButton>
      </form>
    </div>
  );
}
