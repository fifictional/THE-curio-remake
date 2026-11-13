'use client';

import { OnboardingContent } from "./onboarding-content";
import { PageFlowProps } from "./types";
import { Page1 } from "./flow-pages/page1";
import { Page2 } from "./flow-pages/page2";
import { Page3 } from "./flow-pages/page3";
import { PageFinal } from "./flow-pages/page-final";
import { OnBoardingTopBar } from "./onboarding-top-bar";
import { useCallback } from "react";

export const OnboardingFlow = ({ onFinish, onSkip }: PageFlowProps) => {
  const pages = [Page1, Page2, Page3, PageFinal];

  const onSkipCallback = useCallback(({ skipAll }: { skipAll: boolean }) => {
    onSkip?.({ skipAll });
  }, [onSkip]);

  return <div className="flex flex-col justify-center items-center h-screen">
    <OnBoardingTopBar />

    <OnboardingContent pages={pages} onOnboardingFinished={onFinish} onOnboardingSkipped={onSkipCallback} />
  </div>;
};