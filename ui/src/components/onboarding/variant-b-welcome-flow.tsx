'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TwoPanelLayout } from '@/design-system/two-panel-layout';
import { OnboardingLifestage } from './onboarding-lifestage';
import { OnboardingIntent, type OnboardingIntentOption } from './onboarding-intent';
import { OnboardingPricing } from './onboarding-pricing';
import { CourseScreen } from './variant-b/course-screen';
import { ExamFollowup } from './variant-b/exam-followup';
import { TopicsFollowup } from './variant-b/topics-followup';
import { VariantBProvider, useVariantB, type Lifestage } from './variant-b/variant-b-context';
import { useAnalytics, useSessionContext } from '@/providers';
import { useOnboarding } from '@/hooks/use-onboarding';

const VARIANT = 'variant_b';

// EOPRD-814 spec: intents that trigger the follow-up screens. Keep the exact label
// strings in sync with the lifestage-specific option lists below.
const EXAM_INTENTS = new Set<string>(['Ace my exams', 'Prepare for exams or certification']);
const RESEARCH_INTENTS = new Set<string>([
  'Learn something new',
  'Understand a tough topic',
  'Explore something new',
  'Do deep research',
  'Prepare lessons',
  'Explain concepts better to students',
]);

const intentsByLifestage: Record<Lifestage, string[]> = {
  'high-school': [
    'Ace my exams',
    'Understand a tough topic',
    'Finish homework',
    'Organise my notes',
    'Learn something new',
  ],
  'college': [
    'Ace my exams',
    'Understand a tough topic',
    'Finish homework',
    'Research for essay/project',
    'Organise my notes',
    'Learn something new',
  ],
  'graduate': [
    'Ace my exams',
    'Understand a tough topic',
    'Work on assignment or papers',
    'Do deep research',
    'Organise my papers/notes/sources',
    'Learn something new',
  ],
  'teacher': [
    'Prepare lessons',
    'Explain concepts better to students',
    'Create practice questions or quizzes',
    'Organise study resources',
    'Learn something new',
  ],
  'professional': [
    'Prepare for exams or certification',
    'Understand a tough topic',
    'Organise my resources',
    'Work on a project',
    'Explore something new',
    'Do deep research',
  ],
  'other': [
    'Ace my exams',
    'Understand a tough topic',
    'Work on a project',
    'Do deep research',
    'Organise my resources',
    'Explore something new',
  ],
};

type Step = 'lifestage' | 'course' | 'intent' | 'exam' | 'topics' | 'pricing';

const backgroundImages: Record<Exclude<Step, 'pricing'>, string> = {
  lifestage: 'onboarding/cat_notes.png',
  course: 'onboarding/cat_notes.png',
  intent: 'onboarding/cat_thinking.png',
  exam: 'onboarding/cat_thinking.png',
  topics: 'onboarding/cat_thinking.png',
};

function VariantBWelcomeFlowInner() {
  const router = useRouter();
  const { userAttributes } = useSessionContext();
  const { track } = useAnalytics();
  const { updateOnboardingData, completeOnboarding, skipOnboarding } = useOnboarding();
  const { state, updateLifestage, updateCourse, updateIntents, updateExam, updateTopics } = useVariantB();

  const [step, setStep] = useState<Step>('lifestage');

  const intentOptions: OnboardingIntentOption[] = useMemo(() => {
    const list = state.lifestage ? intentsByLifestage[state.lifestage] : [];
    return list.map((label) => ({ value: label, label }));
  }, [state.lifestage]);

  const hasExamIntent = useMemo(
    () => state.userIntents.some((intent) => EXAM_INTENTS.has(intent)),
    [state.userIntents],
  );
  const hasResearchIntent = useMemo(
    () => state.userIntents.some((intent) => RESEARCH_INTENTS.has(intent)),
    [state.userIntents],
  );

  // Lifestage -> either Course (for most lifestages) or Intent (high-school/other).
  const handleLifestageContinue = useCallback(
    (value: string) => {
      const lifestage = value as Lifestage;
      updateLifestage(lifestage);
      updateOnboardingData({ lifestage }, VARIANT).catch((err) => {
        console.error('[EOPRD-814] Failed to persist lifestage', err);
      });
      if (lifestage === 'high-school' || lifestage === 'other') {
        setStep('intent');
      } else {
        setStep('course');
      }
    },
    [updateLifestage, updateOnboardingData],
  );

  const handleCourseContinue = useCallback(
    (course: string) => {
      updateCourse(course);
      updateOnboardingData({ course }, VARIANT).catch((err) => {
        console.error('[EOPRD-814] Failed to persist course', err);
      });
      setStep('intent');
    },
    [updateCourse, updateOnboardingData],
  );

  const advanceAfterIntent2 = useCallback(
    (intents: string[]) => {
      const exam = intents.some((i) => EXAM_INTENTS.has(i));
      const research = intents.some((i) => RESEARCH_INTENTS.has(i));
      if (exam) setStep('exam');
      else if (research) setStep('topics');
      else setStep('pricing');
    },
    [],
  );

  const handleIntentContinue = useCallback(
    (selectedValues: string[]) => {
      updateIntents(selectedValues);
      updateOnboardingData({ intents: selectedValues }, VARIANT).catch((err) => {
        console.error('[EOPRD-814] Failed to persist intents', err);
      });
      // Spec: "Ace my exams" path fires first, then topics path. The explicit
      // `onboarding_user_intents_updated` event carries the full array.
      track('onboarding_user_intents_updated', {
        userIntents: selectedValues,
        intentCount: selectedValues.length,
        ...(state.lifestage ? { lifestage: state.lifestage } : {}),
        variant: VARIANT,
      });
      advanceAfterIntent2(selectedValues);
    },
    [updateIntents, updateOnboardingData, track, state.lifestage, advanceAfterIntent2],
  );

  const handleExamContinue = useCallback(
    (examName: string, examDate: string) => {
      updateExam(examName, examDate);
      updateOnboardingData({ exam: examName, examDate }, VARIANT).catch((err) => {
        console.error('[EOPRD-814] Failed to persist exam', err);
      });
      // If the user also picked a research-style intent, topics screen comes next,
      // otherwise go straight to paywall.
      setStep(hasResearchIntent ? 'topics' : 'pricing');
    },
    [updateExam, updateOnboardingData, hasResearchIntent],
  );

  const handleTopicsContinue = useCallback(
    (topics: string) => {
      updateTopics(topics);
      updateOnboardingData({ topics }, VARIANT).catch((err) => {
        console.error('[EOPRD-814] Failed to persist topics', err);
      });
      setStep('pricing');
    },
    [updateTopics, updateOnboardingData],
  );

  const handlePricingContinue = useCallback(async () => {
    try {
      await completeOnboarding(VARIANT);
    } finally {
      router.push('/welcome/end');
    }
  }, [completeOnboarding, router]);

  // Full-screen paywall (same pattern as control flow).
  if (step === 'pricing') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-accent overflow-y-auto">
        <div className="w-full max-w-6xl px-4 py-8">
          <OnboardingPricing
            userName={userAttributes?.givenName}
            variant={VARIANT}
            onContinue={handlePricingContinue}
          />
        </div>
      </div>
    );
  }

  const leftPanel = (
    <>
      <div className="w-28 h-8 left-[24px] top-[15px] md:left-[56px] md:top-[39px] absolute">
        <Link href="/">
          <Image src="/logo.svg" alt="Curio Logo" width={109} height={31} className="w-auto h-auto" priority />
        </Link>
      </div>
      <div className="h-full relative flex flex-col justify-center">
        {step === 'lifestage' && (
          <OnboardingLifestage
            userName={userAttributes?.givenName}
            variant={VARIANT}
            onContinue={handleLifestageContinue}
          />
        )}
        {step === 'course' && state.lifestage && (
          <CourseScreen lifestage={state.lifestage} variant={VARIANT} onContinue={handleCourseContinue} />
        )}
        {step === 'intent' && (
          <OnboardingIntent
            userName={userAttributes?.givenName}
            variant={VARIANT}
            title="What can Curio help you do? (pick any)"
            options={intentOptions}
            onFinish={handleIntentContinue}
          />
        )}
        {step === 'exam' && <ExamFollowup variant={VARIANT} onContinue={handleExamContinue} />}
        {step === 'topics' && <TopicsFollowup variant={VARIANT} onContinue={handleTopicsContinue} />}
      </div>
    </>
  );

  const rightPanel = (
    <div
      className="w-full h-full z-10 pointer-events-none relative"
      style={{
        backgroundImage: `url(${backgroundImages[step]})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}
    />
  );

  return <TwoPanelLayout leftPanel={leftPanel} rightPanel={rightPanel} ghostPanel="right" />;
}

export function VariantBWelcomeFlow() {
  return (
    <VariantBProvider>
      <VariantBWelcomeFlowInner />
    </VariantBProvider>
  );
}
