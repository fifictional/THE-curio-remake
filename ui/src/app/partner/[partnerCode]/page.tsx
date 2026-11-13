"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { usePaddleCommon, useSKUUtils } from "@/hooks/use-paddle-common";
import { usePartnershipByCode } from "@/hooks/api/partnerships/use-partnerships.api";
import { PartnerImageSection } from "@/components/partner/partner-image-section";
import { PartnerStep1Hero } from "@/components/partner/partner-step-1-hero";
import { PartnerStep2UseCases } from "@/components/partner/partner-step-2-use-cases";
import { PartnerStep3Pricing } from "@/components/partner/partner-step-3-pricing";
import Link from "next/link";
import { PricingDisplayMode } from "@/components/exam-bundles/pricing-display";

type Step = 1 | 2 | 3;

type CustomPriceOverrides = {
  displayMode?: PricingDisplayMode;
  customPrices: Record<string, string>;
};

export default function PartnerPricingPage() {
  const params = useParams();
  const partnerCode = params?.partnerCode as string;
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Fetch partnership by code
  const { data: partnership, isLoading: isLoadingPartnership } = usePartnershipByCode(partnerCode);
  const customPriceOverrides: CustomPriceOverrides = partnership?.priceRecordOverrides ? JSON.parse(partnership.priceRecordOverrides) : undefined;

  const { getPriceIdForSku } = useSKUUtils(customPriceOverrides?.customPrices);

  const { fetchedPricesBySku, isPricesLoading } = usePaddleCommon({ 
    defaultBillingPeriod: 'annually',
    priceRecordOverrides: customPriceOverrides?.customPrices,
  });

  // Show loading state
  if (isLoadingPartnership) {
    return (
      <main className="relative flex h-full flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading partner pricing...</p>
        </div>
      </main>
    );
  }

  // Show error if partnership not found
  if (!partnership) {
    return (
      <main className="relative flex h-full flex-col items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-semibold">Partner Not Found</h1>
          <p className="text-gray-600">The partner code "{partnerCode}" does not exist.</p>
          <Link href="/exam-bundles" className="text-blue-600 hover:underline">
            View Standard Pricing
          </Link>
        </div>
      </main>
    );
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  return (
    <div className="flex w-full min-h-screen text-gray-700">
      {/* Left side - Step Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-1/2 min-h-screen p-6 md:p-10">
        {currentStep === 1 && (
          <PartnerStep1Hero partnerCode={partnerCode} onNext={handleNext} />
        )}
        {currentStep === 2 && (
          <PartnerStep2UseCases 
            partnerCode={partnerCode} 
            onNext={handleNext} 
            onBack={handleBack} 
          />
        )}
        {currentStep === 3 && (
          <PartnerStep3Pricing
            partnerCode={partnerCode}
            fetchedPricesBySku={fetchedPricesBySku}
            isPricesLoading={isPricesLoading}
            getPriceIdForSku={getPriceIdForSku}
            onBack={handleBack}
            availablePlans={['super-curio']}
            defaultBillingPeriod="annually"
            customDisplayMode={customPriceOverrides?.displayMode}
          />
        )}
      </div>

      {/* Right side - Image with Partner Logo */}
      <PartnerImageSection partnerCode={partnerCode} />
    </div>
  );
}

