"use client";

import { useCommonContext } from "@/providers/common-provider";
import { PageFlowProps } from "../types";
import { useAnalytics, useSessionContext } from "@/providers";
import { useCallback, useMemo, useEffect } from "react";
import { OnboardingPage } from "../onboarding-page";
import { motion } from "framer-motion";
import { bundles } from "@/components/exam-bundles/bundles-data";
import { type Bundle } from "@/components/exam-bundles/types";
import { BillingPeriodToggle } from "@/components/exam-bundles/billing-period-toggle";
import { BundleCard } from "@/components/exam-bundles/bundle-card";
import { useBillingPeriod } from "@/hooks/use-billing-period";
import { useOwnedBundlesApi } from "@/hooks/api/bundles";
import { useAmplifyApiClient } from "@/providers";
import { useQuery } from "@tanstack/react-query";
import { useCheckout, type CustomerData } from "@/hooks/use-checkout";
import { useRouter } from "next/navigation";
import { usePaddleCommon, useSKUUtils } from "@/hooks/use-paddle-common";
import Image from "next/image";
import { useFlashSales } from "@/hooks/use-flash-sales";

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.4 } },
} as const;

export const Page4 = ({ variant, onFinish, onSkip }: PageFlowProps) => {
  const { isMobile } = useCommonContext();
    const { track } = useAnalytics();
  const { billingPeriod, setBillingPeriod } = useBillingPeriod('annually');
  const client = useAmplifyApiClient();
  const { userAttributes, isUserSubscribed, userProfile } = useSessionContext();
  const { getPriceIdForSku } = useSKUUtils();
  const { startCheckout, isLoading: isCheckoutLoading } = useCheckout(getPriceIdForSku);
  const router = useRouter();
  const { getFlashSaleForPage } = useFlashSales();
  const flashSale = getFlashSaleForPage('exam-bundles');

  // Fetch owned bundles to get their UUIDs
  const { ownedBundleUuids, isLoading: isLoadingOwned } = useOwnedBundlesApi();

  // Listen for successful checkout completion via URL parameter
  useEffect(() => {
    const checkPurchaseCompletion = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const purchaseParam = urlParams.get('p');
      
      if (purchaseParam && (purchaseParam === 'SUPER_CURIO_MONTHLY' || purchaseParam === 'SUPER_CURIO_ANNUAL' || purchaseParam === 'SUPER_CURIO_6MONTHS' || purchaseParam === 'SATUS-001')) {
        // User completed a purchase, complete onboarding
        track('onboarding_purchase_completed', { sku: purchaseParam, ...(variant ? { variant } : {}) });
        // Small delay to show success before closing
        setTimeout(() => {
          onFinish();
        }, 1000);
      }
    };
    
    // Check immediately and also set up interval to check periodically
    // This handles the case where user returns from Paddle checkout
    checkPurchaseCompletion();
    const interval = setInterval(checkPurchaseCompletion, 1000);
    
    return () => clearInterval(interval);
  }, [track, onFinish, variant]);

  // Hide modal overlay when checkout is loading to allow Paddle interaction (backup)
  useEffect(() => {
    if (isCheckoutLoading) {
      // Hide the onboarding modal overlay to allow Paddle checkout interaction
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) {
        (overlay as HTMLElement).style.pointerEvents = 'none';
        (overlay as HTMLElement).style.opacity = '0';
      }
      const content = document.querySelector('[data-radix-dialog-content]');
      if (content) {
        (content as HTMLElement).style.pointerEvents = 'none';
        (content as HTMLElement).style.opacity = '0';
      }
    } else {
      // Restore overlay when checkout is not loading
      const overlay = document.querySelector('[data-radix-dialog-overlay]');
      if (overlay) {
        (overlay as HTMLElement).style.pointerEvents = '';
        (overlay as HTMLElement).style.opacity = '';
      }
      const content = document.querySelector('[data-radix-dialog-content]');
      if (content) {
        (content as HTMLElement).style.pointerEvents = '';
        (content as HTMLElement).style.opacity = '';
      }
    }
  }, [isCheckoutLoading]);


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

  // Handle free plan selection (first bundle)
  const handleFreePlanClick = useCallback(async () => {
    track('onboarding_free_plan_selected', variant ? { variant } : undefined);
    onFinish();
  }, [track, onFinish, variant]);

  // Handle paid plan checkout with custom success URL
  const handlePaidPlanCheckout = useCallback(async (sku: string, discountCode?: string) => {
    const customerData: CustomerData = { 
      email: userAttributes?.email || '', 
      userId: userAttributes?.userUuid || '' 
    };

    track('onboarding_paid_plan_checkout_started', { sku, ...(variant ? { variant } : {}) });

    // Hide the modal overlay immediately to allow Paddle checkout interaction
    const overlay = document.querySelector('[data-radix-dialog-overlay]');
    const content = document.querySelector('[data-radix-dialog-content]');
    if (overlay) {
      (overlay as HTMLElement).style.pointerEvents = 'none';
      (overlay as HTMLElement).style.opacity = '0';
    }
    if (content) {
      (content as HTMLElement).style.pointerEvents = 'none';
      (content as HTMLElement).style.opacity = '0';
    }

    // Don't close modal yet - wait for payment to complete
    // The useEffect will handle calling onFinish() when payment is complete

    try {
      // Use custom success URL that redirects to /welcome/end with purchase parameter
      // The useEffect will detect this and call onFinish() to complete onboarding
      const customSuccessUrl = `${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST || window.location.origin}/welcome/end?p=${sku}`;

      await startCheckout({ 
        provider: 'paddle', 
        sku, 
        currency: 'USD', 
        customerData,
        successUrl: customSuccessUrl,
        ...(flashSale?.discountCode && { discountCode: flashSale?.discountCode }),
      });
    } catch (error) {
      // Restore overlay if checkout fails
      if (overlay) {
        (overlay as HTMLElement).style.pointerEvents = '';
        (overlay as HTMLElement).style.opacity = '';
      }
      if (content) {
        (content as HTMLElement).style.pointerEvents = '';
        (content as HTMLElement).style.opacity = '';
      }
      console.error('Checkout error:', error);
      throw error;
    }
  }, [userAttributes, track, startCheckout, flashSale, variant]);


  const { fetchedPricesBySku, isPricesLoading } = usePaddleCommon({ discountCode: flashSale?.discountCode });
  
  return (
    <div className="flex flex-col justify-between max-w-[1200px] py-32 h-screen">
      <motion.div key="p4" variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <OnboardingPage 
          line1="Choose your plan"
          line2=""
          withCurio={false}
          bubbleText="almost done!"
          onFinished={() => {}} 
          isMobile={isMobile} 
          bubbleRightMobile={10} 
          bubbleRightDesktop={350} 
        />
        
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut', delay: 0.4 }}
          className="mt-8 px-4"
        >
          {/* Billing Period Toggle - Only show for subscription options */}
          {/* <div className="mb-6">
            <BillingPeriodToggle
              billingPeriod={billingPeriod}
              onBillingPeriodChange={setBillingPeriod}
            />
          </div> */}

          {/* Bundles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {bundlesWithOwnership
            .filter((b: Bundle) => b.title === 'Curio')
            .map((b: Bundle) => {
              return (
                <motion.div
                  key={`${b.title}`}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
                >
                  <BundleCard {...b} variant="light" ctaLabel="Continue for free" disabled={false} onCustomCheckout={handleFreePlanClick} customLoading={false} getPriceIdForSku={getPriceIdForSku} />
                </motion.div>
              );
            })}
          {bundlesWithOwnership
            .filter((b: Bundle) => b.title === 'Super Curio')
            .map((b: Bundle) => {
              // Create two cards: one for monthly, one for annually
              return ['monthly', 'annually'].map((period, i) => {
                const bundleProps = {
                  ...b,
                  billingPeriod: period as 'monthly' | 'annually',
                  // ...(activeDiscountCode && { discountCode: activeDiscountCode }),
                  ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
                  onCustomCheckout: handlePaidPlanCheckout,
                  isPricesLoading,
                  showSkeleton: isPricesLoading || !userProfile,
                  getPriceIdForSku,
                };
                return (
                  <motion.div
                    key={`${b.title}-${period}`}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
                  >
                    <BundleCard {...bundleProps} title={b.title + (period === 'monthly' ? ' (Monthly)' : ' (Yearly)')} variant={i === 0 ? 'light' : 'dark'} badgeRight={i === 1 ? 'Most Popular' : undefined} />
                  </motion.div>
                );
              });
            })}
          </div>

          <div className="rounded-md p-3 text-sm text-gray-700 text-center mx-auto mt-10">
            <div className="max-w-2xl font-semibold text-2xl mx-auto mb-3">
              Trusted by learners globally
            </div>
            <Image src="/uni-logos.png" alt="University Logos" width={1000} height={100} />
          </div>
        </motion.div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut', delay: 0.6 }}
        className="mt-8 px-4"
      >
        <div className="mt-6 text-center text-xs text-gray-600">
          You can always upgrade or change your plan later
        </div>
      </motion.div>
    </div>
  );
};

