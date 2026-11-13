'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { PricingHeader } from '@/design-system/pricing-header';
import { bundles } from '@/components/exam-bundles/bundles-data';
import { type Bundle } from '@/components/exam-bundles/types';
import { BundleCard } from '@/components/exam-bundles/bundle-card';
import { useSessionContext, useAmplifyApiClient, useAnalytics } from '@/providers';
import { useOwnedBundlesApi } from '@/hooks/api/bundles';
import { useQuery } from '@tanstack/react-query';
import { useCheckout, type CustomerData } from '@/hooks/use-checkout';
import { useRouter } from 'next/navigation';
import { usePaddleCommon, useSKUUtils } from '@/hooks/use-paddle-common';
import { useFlashSales } from '@/hooks/use-flash-sales';
import Image from 'next/image';
import { motion } from 'framer-motion';

export interface OnboardingPricingProps {
  userName?: string;
  variant?: string;
  onContinue?: () => void;
}

export function OnboardingPricing({ userName, variant, onContinue }: OnboardingPricingProps) {
  const { userAttributes, userProfile } = useSessionContext();
  const { track } = useAnalytics();
  const client = useAmplifyApiClient();
  const { getPriceIdForSku } = useSKUUtils();
  const { startCheckout, isLoading: isCheckoutLoading } = useCheckout(getPriceIdForSku);
  const router = useRouter();
  const { getFlashSaleForPage } = useFlashSales();
  const flashSale = getFlashSaleForPage('exam-bundles');

  // Fetch owned bundles to get their UUIDs
  const { ownedBundleUuids, isLoading: isLoadingOwned } = useOwnedBundlesApi();


  // Fetch all bundles to get their SKUs
  const { data: allBundles } = useQuery({
    queryKey: ['bundles:all-skus'],
    queryFn: async () => {
      const response = await client.models.Bundle.list({
        selectionSet: ['bundleUuid', 'defaultSku', 'additionalSkus'],
      });
      if (response.errors) {
        console.error('[onboarding] Error fetching bundles:', response.errors);
        return [];
      }
      return response.data || [];
    },
  });

  // Create a set of owned SKUs for quick lookup
  const ownedSkus = useMemo(() => {
    if (!allBundles || !ownedBundleUuids) return new Set<string>();
    const skus = new Set<string>();
    allBundles.forEach(bundle => {
      if (ownedBundleUuids.includes(bundle.bundleUuid)) {
        if (bundle.defaultSku) skus.add(bundle.defaultSku);
        if (bundle.additionalSkus) {
          bundle.additionalSkus.filter((sku): sku is string => !!sku).forEach(sku => skus.add(sku));
        }
      }
    });
    return skus;
  }, [allBundles, ownedBundleUuids]);

  // Merge ownership status with static bundles
  const bundlesWithOwnership = useMemo(() => {
    return bundles.map(bundle => ({
      ...bundle,
      owned: bundle.sku ? ownedSkus.has(bundle.sku) : false,
    }));
  }, [ownedSkus]);

  // Handle free plan selection
  const handleFreePlanClick = useCallback(async () => {
    track('onboarding_free_plan_selected', variant ? { variant } : undefined);
    onContinue?.();
  }, [track, onContinue, variant]);

  // Handle paid plan checkout
  const handlePaidPlanCheckout = useCallback(async (sku: string, discountCode?: string) => {
    const customerData: CustomerData = { 
      email: userAttributes?.email || '', 
      userId: userAttributes?.userUuid || '' 
    };

    track('onboarding_paid_plan_checkout_started', { sku, ...(variant ? { variant } : {}) });

    try {
      // Use custom success URL to redirect back to welcome page with purchase param
      const customSuccessUrl = `${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST || window.location.origin}/welcome/end`;

      await startCheckout({ 
        provider: 'paddle', 
        sku, 
        currency: 'USD', 
        customerData,
        successUrl: customSuccessUrl,
        ...(flashSale?.discountCode && { discountCode: flashSale?.discountCode }),
      });
    } catch (error) {
      console.error('Checkout error:', error);
      throw error;
    }
  }, [userAttributes, track, startCheckout, flashSale, variant]);

  const { fetchedPricesBySku, isPricesLoading } = usePaddleCommon({ discountCode: flashSale?.discountCode });

  // Filter bundles to show: Curio (free) and Super Curio (monthly + yearly)
  const bundlesToShow = useMemo(() => {
    const curioBundle = bundlesWithOwnership.find((b: Bundle) => b.title === 'Curio');
    const superCurioBundle = bundlesWithOwnership.find((b: Bundle) => b.title === 'Super Curio');
    
    const result: Array<Bundle & { billingPeriod?: 'monthly' | 'annually' }> = [];
    
    if (curioBundle) {
      result.push({
        ...curioBundle,
        billingPeriod: 'monthly' as const,
      });
    }
    
    if (superCurioBundle) {
      // Add monthly and yearly versions
      result.push({
        ...superCurioBundle,
        billingPeriod: 'annually' as const,
      });
      result.push({
        ...superCurioBundle,
        billingPeriod: 'monthly' as const,
      });
    }
    
    return result;
  }, [bundlesWithOwnership]);

  return (
    <div className="w-full flex flex-col justify-center items-center gap-6">
      <div className="self-stretch flex flex-col justify-center items-center gap-3">
        <PricingHeader>
          <span>Choose your Curio plan</span>
        </PricingHeader>
      </div>

      <div className="self-stretch flex flex-col justify-start items-start gap-6">
        {/* Bundles List */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {bundlesToShow.map((bundle, index: number) => {
            const isFree = bundle.title === 'Curio';
            const billingPeriod = bundle.billingPeriod || 'annually';
            const isMonthly = billingPeriod === 'monthly';
            const isYearly = billingPeriod === 'annually';
            
            const bundleProps = {
              ...bundle,
              disabled: false,
              billingPeriod: billingPeriod as 'monthly' | 'annually',
              ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
              onCustomCheckout: isFree ? handleFreePlanClick : handlePaidPlanCheckout,
              isPricesLoading,
              showSkeleton: isPricesLoading || !userProfile,
              getPriceIdForSku,
              ctaLabel: isFree ? 'Continue for free' : bundle.ctaLabel,
              variant: (isFree ? 'light' : isYearly ? 'dark' : 'light') as 'light' | 'dark',
              badgeLeft: isYearly ? 'Most Popular' : undefined,
              title: isFree ? bundle.title : bundle.title + (isMonthly ? ' (Monthly)' : ' (Yearly)'),
            };

            return (
              <motion.div
                key={`${bundle.title}-${billingPeriod}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut', delay: index * 0.06 }}
              >
                <BundleCard
                  key={`${bundle.title}-${billingPeriod}`}
                  {...bundleProps}
                />
              </motion.div>
            );
          })}
        </div>

        {/* Trusted by section */}
        <div className="rounded-md p-3 text-sm text-gray-700 text-center mx-auto mt-4">
          <div className="max-w-2xl font-semibold text-2xl mx-auto mb-3">
            Trusted by learners globally
          </div>
          <Image src="/uni-logos.png" alt="University Logos" width={1000} height={100} />
        </div>
      </div>
    </div>
  );
}
