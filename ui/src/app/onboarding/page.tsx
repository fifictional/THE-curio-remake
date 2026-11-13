'use client';

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { useCallback } from "react";
import { useRouter } from "next/navigation";

// EOPRD-814: The onboarding A/B test (extended personalisation) now runs on the
// post-signup `/welcome` page instead of this pre-signup marketing funnel, so that
// the real paywall is part of the flow and the collected data can be persisted
// directly against the authenticated user's profile. This page therefore renders
// the legacy flow only, with no variant split.
export default function OnboardingPage() {
  const router = useRouter();

  const onFinish = useCallback((params?: Record<string, string> | undefined) => {
    if (params?.docUuid) {
      router.push(`/onboarding/demo/${params.docUuid}`);
    } else {
      router.push('/signup');
    }
  }, [router]);

  const onSkip = useCallback(() => {
    router.push('/signup');
  }, [router]);

  return <OnboardingFlow onFinish={onFinish} onSkip={onSkip} />;
}
