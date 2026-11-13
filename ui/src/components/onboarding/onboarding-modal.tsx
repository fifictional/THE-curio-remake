"use client";

import * as Dialog from '@radix-ui/react-dialog';
import { useCallback, useEffect, useState } from 'react';
import { VisuallyHidden } from '@radix-ui/themes';
import { OnboardingContent } from './onboarding-content';
import { Page1 } from './modal-pages/page1';
import { Page2 } from './modal-pages/page2';  
import { Page3 } from './modal-pages/page3';
import { Page4 } from './modal-pages/page4';
import { PageFinal } from './modal-pages/page-final';
import { useSessionContext } from '@/providers/session-provider';
import { useAnalytics } from '@/providers';
import { useOnboarding } from '@/hooks/use-onboarding';

export interface OnboardingModalProps {
  forceOpen?: boolean;
  variant?: string;
  onOnboardingFinished?: (params?: Record<string, string> | undefined) => void;
  onOnboardingSkipped?: ({ skipAll }: { skipAll: boolean }) => void;
}

export function OnboardingModal({ forceOpen, variant, onOnboardingFinished, onOnboardingSkipped }: OnboardingModalProps = {}) {
  const [open, setOpen] = useState(false);
  const { isUserSubscribed } = useSessionContext();
  const { track } = useAnalytics();
  const { hasToShowOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();

  useEffect(() => {
    if (forceOpen || hasToShowOnboarding) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [hasToShowOnboarding, forceOpen, track, variant]);

  const handleOnboardingFinished = useCallback(async (params?: Record<string, string> | undefined) => {
    setOpen(false);
    if (onOnboardingFinished) {
      onOnboardingFinished(params);
    } else {
      // Default behavior: complete onboarding if no callback provided
      await completeOnboarding();
    }
  }, [onOnboardingFinished, completeOnboarding]);

  const handleOnboardingSkipped = useCallback(async ({ skipAll }: { skipAll: boolean }) => {
    setOpen(false);
    if (onOnboardingSkipped) {
      onOnboardingSkipped({ skipAll });
    } else {
      // Default behavior: skip onboarding if no callback provided
      await skipOnboarding();
    }
  }, [onOnboardingSkipped, skipOnboarding]);

  const pages = isUserSubscribed ? [Page1, Page2, Page3, PageFinal] : [Page1, Page2, Page3, Page4, PageFinal];

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleOnboardingSkipped({ skipAll: true });
      }
    }}>
      <Dialog.Portal>
        <VisuallyHidden>
          <Dialog.Title>Onboarding</Dialog.Title>
        </VisuallyHidden>
        <Dialog.Content className="absolute left-1/2 top-1/2 h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[#FAF9F4]/50 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <OnboardingContent variant={variant} onOnboardingFinished={handleOnboardingFinished} onOnboardingSkipped={handleOnboardingSkipped} pages={pages} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}