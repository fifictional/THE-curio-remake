'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { OnboardingLoading } from '@/components/onboarding/onboarding-loading';
import { useOnboarding } from '@/hooks/use-onboarding';
import { useAnalytics } from '@/providers';

export default function WelcomeEndPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { completeOnboarding } = useOnboarding();
  const { track } = useAnalytics();

  useEffect(() => {
    const handleCompletion = async () => {
      // Check if this is a payment redirect (has purchase parameter)
      const purchaseParam = searchParams.get('p');
      
      if (purchaseParam) {
        // Track purchase completion
        track('onboarding_purchase_completed', { sku: purchaseParam });
      }

      // Complete onboarding with minimum 1.5s delay
      const startTime = Date.now();
      await completeOnboarding();
      const elapsedTime = Date.now() - startTime;
      const minDelay = 1500; // 1.5 seconds
      
      if (elapsedTime < minDelay) {
        await new Promise(resolve => setTimeout(resolve, minDelay - elapsedTime));
      }
      
      // Redirect to home page
      router.push('/');
    };

    handleCompletion();
  }, [searchParams, completeOnboarding, router, track]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <OnboardingLoading />
    </div>
  );
}
