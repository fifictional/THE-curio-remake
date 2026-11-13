'use client';

import { useAnalytics } from "@/providers";
import { PageFlowProps } from "./types";
import { useCallback, useEffect, useState } from "react";
import type { ComponentType } from "react";

interface OnboardingContentProps {
  variant?: string;
  onOnboardingFinished: (params?: Record<string, string> | undefined) => void;
  onOnboardingSkipped: ({ skipAll }: { skipAll: boolean }) => void;
  pages: ComponentType<PageFlowProps>[];
}

export const OnboardingContent = ({ variant, pages, onOnboardingFinished, onOnboardingSkipped }: OnboardingContentProps) => {
  const [currentPage, setCurrentPage] = useState(0);
  const { track } = useAnalytics();

  const onFinishStep = useCallback((params?: Record<string, string> | undefined) => {
    if (currentPage === pages.length - 1) {
      onOnboardingFinished(params);
      track('onboarding_completed', variant ? { variant } : undefined);
    } else {
      setCurrentPage(currentPage + 1);
      track('onboarding_page_completed', { page: currentPage, ...(variant ? { variant } : {}) });
    }
  }, [currentPage, onOnboardingFinished, pages.length, track, variant]);

  const onSkipStep = useCallback(({ skipAll }: { skipAll: boolean }) => {
    if (currentPage === pages.length - 1 || skipAll) {
      onOnboardingSkipped({ skipAll });
      track('onboarding_skipped', variant ? { variant } : undefined);
    } else {
      setCurrentPage(currentPage + 1);
      track('onboarding_page_skipped', { page: currentPage, ...(variant ? { variant } : {}) });
    }
  }, [currentPage, onOnboardingSkipped, pages.length, track, variant]);

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0 rounded-xl" />
      <div className={`relative z-10 flex h-full w-full items-center justify-center ${currentPage === 3 ? 'overflow-y-auto' : ''}`}>
        <div>
          {(() => {
            const Page = pages[currentPage];
            return <Page variant={variant} onFinish={onFinishStep} onSkip={onSkipStep} />;
          })()}
        </div>
      </div>
    </div>
  )
}