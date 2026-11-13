'use client';

import { useState } from 'react';
import { useAnalytics } from '@/providers';
import { OnboardingHeader } from '@/design-system/onboarding-header';
import { OnboardingSubtitle } from '@/design-system/onboarding-subtitle';
import { CurioButton } from '@/design-system/curio-button';

const dateOptions = [
  { value: 'this_week', label: 'This week' },
  { value: 'next_week', label: 'Next week' },
  { value: 'this_month', label: 'This month' },
  { value: 'one_to_three_months', label: 'In 1-3 months' },
  { value: 'three_to_six_months', label: 'In 3-6 months' },
  { value: 'six_plus_months', label: 'In 6+ months' },
  { value: 'multiple_dates', label: 'Multiple dates / Not sure' },
];

export interface ExamFollowupProps {
  variant?: string;
  onContinue: (examName: string, examDate: string) => void;
}

export function ExamFollowup({ variant, onContinue }: ExamFollowupProps) {
  const [examName, setExamName] = useState('');
  const [examDate, setExamDate] = useState('');
  const { track } = useAnalytics();

  const isValid = examName.trim().length > 0 && examDate.length > 0;

  const handleContinue = () => {
    if (!isValid) return;
    const trimmed = examName.trim();
    track('onboarding_user_exam_updated', {
      userExam: trimmed,
      userExamDate: examDate,
      ...(variant ? { variant } : {}),
    });
    onContinue(trimmed, examDate);
  };

  return (
    <div className="w-full max-w-96 flex flex-col justify-start items-center gap-6">
      <div className="self-stretch flex flex-col justify-start items-start gap-3">
        <OnboardingHeader>What exam are you preparing for?</OnboardingHeader>
        <OnboardingSubtitle>This helps us focus on the right topics.</OnboardingSubtitle>
      </div>

      <form
        className="self-stretch flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          handleContinue();
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="exam-name" className="text-sm font-medium text-card-foreground font-['Lexend']">
            Exam name
          </label>
          <input
            id="exam-name"
            type="text"
            value={examName}
            onChange={(e) => setExamName(e.target.value)}
            placeholder="e.g., SAT, A-Level Biology"
            maxLength={100}
            autoFocus
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-card-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors font-['Lexend']"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="exam-date" className="text-sm font-medium text-card-foreground font-['Lexend']">
            When is your exam?
          </label>
          <select
            id="exam-date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-card-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors font-['Lexend']"
          >
            <option value="">Select timeframe...</option>
            {dateOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <CurioButton type="submit" size="full" color="primary" disabled={!isValid}>
          Continue
        </CurioButton>
      </form>
    </div>
  );
}
