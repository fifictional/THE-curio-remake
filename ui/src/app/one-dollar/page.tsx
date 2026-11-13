"use client";

import { useEffect } from "react";
import { usePaddleCommon, useSKUUtils } from "@/hooks/use-paddle-common";
import { bundles } from "@/components/exam-bundles/bundles-data";
import { BundleCard, type BundleCardProps } from "@/components/exam-bundles/bundle-card";
import { type Bundle } from "@/components/exam-bundles/types";
import { motion } from "framer-motion";
import { PaddlePriceData } from "@/lib/types/paddle";
import { GiftingImageSection } from "@/components/gifting/gifting-image-section";
import { useAnalytics, useSessionContext } from "@/providers";

const DISCOUNT_CODE = 'ONEDPROMO';

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

export default function OneDollarPage() {
  const { getPriceIdForSku } = useSKUUtils();
  const { track } = useAnalytics();
  const userAttributes = useSessionContext((ctx) => ctx.userAttributes);
  const isLoggedIn = !!userAttributes;

  // Apply ONEDPROMO discount code by default
  const { fetchedPricesBySku, isPricesLoading } = usePaddleCommon({ 
    defaultBillingPeriod: 'monthly',
    discountCode: DISCOUNT_CODE,
  });

  // Track page view on mount
  useEffect(() => {
    track('one_dollar_page_viewed', {
      isLoggedIn,
      discountCode: DISCOUNT_CODE,
      ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
    });

    // Track pricing viewed
    track('one_dollar_pricing_viewed', {
      isLoggedIn,
      discountCode: DISCOUNT_CODE,
      ...(userAttributes?.userUuid && { userId: userAttributes.userUuid }),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bundlesToShow = bundles
    .filter((b: Bundle) => ['super-curio'].includes(planToAlias(b.title)))
    .filter((b: Bundle) => b.title !== 'Curio')
    .map(bundle => ({
      ...bundle,
      owned: false,
    }));

  return (
    <div className="flex w-full min-h-screen text-gray-700">
      {/* Left side - Pricing Content */}
      <div className="flex flex-col items-center justify-center flex-1 w-1/2 min-h-screen p-6 md:p-10">
        <div className="flex flex-col items-center justify-center w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="w-full text-center space-y-3">
            <h2 className="text-3xl md:text-4xl font-semibold text-gray-900">
              Choose your plan
            </h2>
            <p className="text-sm text-gray-600">
              Cancel anytime. No commitment.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
            {bundlesToShow.map((b: Bundle, bundleIndex: number) => {
              const billingPeriod = 'monthly';
              const bundleProps: BundleCardProps = {
                ...b,
                billingPeriod: billingPeriod as 'monthly' | 'annually',
                fetchedPrices: fetchedPricesBySku ? fetchedPricesBySku as Map<string, PaddlePriceData> : undefined,
                isPricesLoading,
                showSkeleton: isPricesLoading,
                getPriceIdForSku,
                discountCode: DISCOUNT_CODE,
                customDisplayMode: b.title.includes('Super') ? 'one-dollar-promo' : undefined,
              };
              
              return (
                <motion.div
                  key={`${b.title}-${billingPeriod}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: bundleIndex * 0.06 }}
                >
                  <BundleCard 
                    {...bundleProps} 
                    title={b.title}
                    variant={bundleIndex === 0 ? 'light' : 'dark'} 
                    badgeRight={bundleIndex === 0 ? 'Most Popular' : undefined} 
                    successUrl={`${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST}/one-dollar/success`}
                  />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side - Image with Quote */}
      <GiftingImageSection />
    </div>
  );
}

