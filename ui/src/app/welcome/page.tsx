'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TwoPanelLayout } from '@/design-system/two-panel-layout';
import { OnboardingLifestage } from '@/components/onboarding/onboarding-lifestage';
import { OnboardingIntent } from '@/components/onboarding/onboarding-intent';
import { OnboardingPricing } from '@/components/onboarding/onboarding-pricing';
import { VariantBWelcomeFlow } from '@/components/onboarding/variant-b-welcome-flow';
import { useSessionContext, useAnalytics } from '@/providers';
import { useOnboarding } from '@/hooks/use-onboarding';
import { ABTestProvider, useABTest } from '@/providers/ab-test-provider';

// EOPRD-814: A/B test for the extended personalisation onboarding flow.
// Control (A) = the existing lifestage -> intent (single-select) -> paywall flow.
// Variant B   = lifestage -> [course] -> intent (multi-select) -> [exam] -> [topics] -> paywall.
const EXPERIMENT_NAME = 'onboarding_extended_personalization';

const backgroundImage: Record<'lifestage' | 'intent', string> = {
  lifestage: 'onboarding/cat_notes.png',
  intent: 'onboarding/cat_thinking.png',
};

function ControlWelcomeFlow() {
  const { userAttributes } = useSessionContext();
  const router = useRouter();
  const { updateOnboardingData, completeOnboarding } = useOnboarding();
  const [currentStep, setCurrentStep] = useState<'lifestage' | 'intent' | 'pricing'>('lifestage');

  const handleLifestageContinue = async (selectedValue: string) => {
    await updateOnboardingData({ lifestage: selectedValue }, 'control');
    setCurrentStep('intent');
  };

  const handleIntentContinue = async (selectedValues: string[]) => {
    await updateOnboardingData({ intents: selectedValues }, 'control');
    setCurrentStep('pricing');
  };

  const handlePricingContinue = async () => {
    await completeOnboarding('control');
    router.push('/welcome/end');
  };

  if (currentStep === 'pricing') {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-accent overflow-y-auto">
        <div className="w-full max-w-6xl px-4 py-8">
          <OnboardingPricing
            userName={userAttributes?.givenName}
            variant="control"
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
        {currentStep === 'lifestage' ? (
          <OnboardingLifestage
            userName={userAttributes?.givenName}
            variant="control"
            onContinue={handleLifestageContinue}
          />
        ) : (
          <OnboardingIntent
            userName={userAttributes?.givenName}
            variant="control"
            onFinish={handleIntentContinue}
          />
        )}
      </div>
    </>
  );

  const rightPanel = (
    <div
      className="w-full h-full z-10 pointer-events-none relative"
      style={{
        backgroundImage: `url(${backgroundImage[currentStep as keyof typeof backgroundImage]})`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center center',
      }}
    />
  );

  return <TwoPanelLayout leftPanel={leftPanel} rightPanel={rightPanel} ghostPanel="right" />;
}

function WelcomePageContent() {
  const { variant } = useABTest();
  const { track } = useAnalytics();

  // EOPRD-814: fire the experiment assignment event once per session, for both arms.
  // (The previous implementation fired it only from inside VariantBFlow, so the control
  // bucket was empty in Mixpanel.) Maps the provider's A/B into the spec's
  // `control` / `variant_b` contract.
  useEffect(() => {
    const assignedVariant = variant === 'B' ? 'variant_b' : 'control';
    track('onboarding_experiment_assigned', { variant: assignedVariant });
    track('onboarding_started', { variant: assignedVariant });
  }, [variant, track]);

  if (variant === 'B') {
    return <VariantBWelcomeFlow />;
  }
  return <ControlWelcomeFlow />;
}

export default function WelcomePage() {
  return (
    <ABTestProvider testName={EXPERIMENT_NAME}>
      <WelcomePageContent />
    </ABTestProvider>
  );
}
