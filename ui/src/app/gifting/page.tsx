"use client";

import { useState, useEffect } from "react";
import { usePaddleCommon, useSKUUtils } from "@/hooks/use-paddle-common";
import { GiftingStep3Recipient } from "@/components/partner/gifting-step-3-recipient";
import { PartnerStep3Pricing } from "@/components/partner/partner-step-3-pricing";
import { GiftingImageSection } from "@/components/gifting/gifting-image-section";
import { useCommonContext, useAnalytics, useSessionContext } from "@/providers";
import Image from "next/image";

type Step = 1 | 2;

export default function GiftingPage() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [recipientEmail, setRecipientEmail] = useState<string>('');
  const [recipientMessage, setRecipientMessage] = useState<string>('');
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const { isMobile } = useCommonContext();
  const { track } = useAnalytics();
  const userAttributes = useSessionContext((ctx) => ctx.userAttributes);
  const isLoggedIn = !!userAttributes;

  const { getPriceIdForSku } = useSKUUtils();

  const { fetchedPricesBySku, isPricesLoading } = usePaddleCommon({ 
    defaultBillingPeriod: 'annually',
  });

  // Track page view on mount
  useEffect(() => {
    track('gifting_page_viewed', {
      isLoggedIn,
      ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track step changes
  useEffect(() => {
    // Track step 1 (form) on mount
    if (currentStep === 1) {
      track('gifting_step_started', {
        step: currentStep,
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });
    }

    // Track step 2 (pricing) when reached
    if (currentStep === 2) {
      track('gifting_step_started', {
        step: currentStep,
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });

      // Track pricing step view specifically
      track('gifting_pricing_viewed', {
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, isLoggedIn, userAttributes?.userUuid]);

  const handleNext = () => {
    if (currentStep < 2) {
      track('gifting_step_completed', {
        step: currentStep,
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      track('gifting_step_back', {
        step: currentStep,
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  // Track recipient info entry when moving to next step
  const handleRecipientNext = () => {
    if (recipientEmail) {
      track('gifting_recipient_info_entered', {
        hasEmail: !!recipientEmail,
        hasMessage: !!recipientMessage,
        hasStartDate: !!subscriptionStartDate,
        isLoggedIn,
        ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
      });
    }
    handleNext();
  };

  return (
    <div className="flex w-full min-h-screen text-gray-700">
      {/* Left side - Step Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-1/2 min-h-screen p-6 md:p-10">
        {currentStep === 1 && (
          <GiftingStep3Recipient
            recipientEmail={recipientEmail}
            recipientMessage={recipientMessage}
            subscriptionStartDate={subscriptionStartDate}
            onRecipientEmailChange={setRecipientEmail}
            onRecipientMessageChange={setRecipientMessage}
            onSubscriptionStartDateChange={setSubscriptionStartDate}
            onNext={handleRecipientNext}
            onBack={handleBack}
            imageDecoration={<Image src="/xmas-hat.png" alt="Gifting" width={isMobile ? 50 : 75} height={isMobile ? 50 : 75} className={`absolute ${isMobile ? '-top-10 left-20' : '-top-15 left-30'}`} />}
          />
        )}
        {currentStep === 2 && (
          <PartnerStep3Pricing 
            fetchedPricesBySku={fetchedPricesBySku}
            isPricesLoading={isPricesLoading}
            getPriceIdForSku={getPriceIdForSku}
            recipientEmail={recipientEmail}
            recipientMessage={recipientMessage}
            subscriptionStartDate={subscriptionStartDate}
            showBillingPeriodSelector={false}
            defaultBillingPeriod="annually"
            availablePlans={['super-curio', 'ultra-curio']}
            onBack={handleBack}
          />
        )}
      </div>

      {/* Right side - Image with Quote */}
      <GiftingImageSection />
    </div>
  );
}
