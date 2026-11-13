'use client';

import { bundles } from "@/components/exam-bundles/bundles-data";
import { BundleCard, type BundleCardProps } from "@/components/exam-bundles/bundle-card";
import { type Bundle } from "@/components/exam-bundles/types";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { PartnerLogo } from "./partner-logo";
import { PaddlePriceData } from "@/lib/types/paddle";
import { useBillingPeriod } from "@/hooks/use-billing-period";
import { BillingPeriodToggle } from "../exam-bundles/billing-period-toggle";
import { PricingDisplayMode } from "../exam-bundles/pricing-display";

interface PartnerStep3PricingProps {
  partnerCode?: string;
  fetchedPricesBySku?: Record<string, any>;
  isPricesLoading: boolean;
  getPriceIdForSku: (sku: string) => string | undefined;
  recipientEmail?: string;
  recipientMessage?: string;
  subscriptionStartDate?: string;
  onBack: () => void;
  availablePlans: ('super-curio' | 'ultra-curio')[];
  showBillingPeriodSelector?: boolean;
  defaultBillingPeriod?: 'monthly' | 'annually';
  customDisplayMode?: PricingDisplayMode;
}

const planToAlias = (plan: string): 'super-curio' | 'ultra-curio' => {
  switch (plan.toLowerCase()) {
    case 'super curio':
      return 'super-curio';
    case 'ultra curio':
      return 'ultra-curio';
    default:
      return 'super-curio';
  }
};

export function PartnerStep3Pricing({ 
  partnerCode, 
  fetchedPricesBySku, 
  isPricesLoading,
  getPriceIdForSku,
  recipientEmail,
  recipientMessage,
  subscriptionStartDate,
  onBack,
  showBillingPeriodSelector,
  defaultBillingPeriod,
  availablePlans,
  customDisplayMode,
}: PartnerStep3PricingProps) {
  const { billingPeriod, setBillingPeriod } = useBillingPeriod(defaultBillingPeriod);

  const bundlesWithOwnership = bundles
    .filter((b: Bundle) => availablePlans?.includes(planToAlias(b.title)))
    .filter((b: Bundle) => b.title !== 'Curio')
    .map(bundle => ({
      ...bundle,
      owned: false,
    }));

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-2xl space-y-8">
      {/* Partner Logo */}
      <PartnerLogo partnerCode={partnerCode} />

      {/* Header */}
      <div className="w-full text-center space-y-3">
        <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
          Choose your plan
        </h2>
        <p className="text-sm text-gray-600">
          Cancel anytime. No commitment.
        </p>
      </div>

      {showBillingPeriodSelector && (
        <BillingPeriodToggle
          billingPeriod={billingPeriod}
          onBillingPeriodChange={setBillingPeriod}
        />
      )}

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
        {bundlesWithOwnership.map((b: Bundle, bundleIndex: number) => {
          return [billingPeriod].map((period, i) => {
            // Check if this bundle has a one-time option for this billing period
            const hasOneTimeOption = b.pricingOptions?.some(
              opt => opt.oneTime === true && opt.billingPeriod === period
            );
            const isGiftingFlow = !!recipientEmail;
            
            // Determine title suffix
            let titleSuffix = '';
            if (isGiftingFlow && hasOneTimeOption) {
              // For gifts, show duration but indicate it's a one-time payment
              titleSuffix = period === 'monthly' ? ' Gift (1 Month)' : ' Gift (1 Year)';
            } else if (!isGiftingFlow) {
              // For regular subscriptions, show billing period
              titleSuffix = period === 'monthly' ? ' (Monthly)' : ' (Yearly)';
            }
            
            const bundleProps: BundleCardProps = {
              ...b,
              billingPeriod: period as 'monthly' | 'annually',
              fetchedPrices: fetchedPricesBySku ? fetchedPricesBySku as Map<string, PaddlePriceData> : undefined,
              isPricesLoading,
              showSkeleton: isPricesLoading,
              getPriceIdForSku,
              customDisplayMode,
            };
            return (
              <motion.div
                key={`${b.title}-${period}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
              >
                <BundleCard 
                  partnerCode={partnerCode}
                  {...bundleProps} 
                  title={b.title + titleSuffix}
                  variant={bundleIndex === 0 ? 'light' : 'dark'} 
                  badgeRight={bundleIndex === 0 ? 'Most Popular' : undefined} 
                  successUrl={partnerCode ? `${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST}/partner/success/${partnerCode}` : `${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST}/gifting/success`}
                  recipientEmail={recipientEmail}
                  recipientMessage={recipientMessage}
                  subscriptionStartDate={subscriptionStartDate}
                  sourcePage={typeof window !== 'undefined' ? window.location.href : undefined}
                />
              </motion.div>
            );
          });
        })}
      </div>

      {/* Back Button */}
      <Button
        onClick={onBack}
        variant="ghost"
        size="lg"
        className="text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="mr-2 w-5 h-5" />
        {recipientEmail ? 'Back to gift details' : 'Back to features'}
      </Button>
    </div>
  );
}

