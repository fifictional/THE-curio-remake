"use client";

import { bundles, superCuriobundles } from "@/components/exam-bundles/bundles-data";
import { BundleCard, type BundleCardProps } from "@/components/exam-bundles/bundle-card";
import { type Bundle } from "@/components/exam-bundles/types";
import { BillingPeriodToggle } from "@/components/exam-bundles/billing-period-toggle";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useOwnedBundlesApi } from "@/hooks/api/bundles";
import { useAmplifyApiClient, useAnalytics, useCommonContext, useSessionContext } from "@/providers";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePaddleCommon } from "@/hooks/use-paddle-common";
import Image from "next/image";
import { useFlashSales } from "@/hooks/use-flash-sales";

export default function ExamBundlesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isUserSubscribed, userProfile } = useSessionContext();
  const { isMobile } = useCommonContext();
  const p = searchParams.get("p");
  const client = useAmplifyApiClient();
  const { track } = useAnalytics();
  // get flash sale and redirect to the flash sale page if it exists
  const { getFlashSaleForPage } = useFlashSales();
  const flashSale = getFlashSaleForPage('exam-bundles');

  // Get default billing period from URL params or flash sale
  const defaultBillingPeriod = useMemo(() => {
    const urlBillingPeriod = searchParams.get("billingPeriod");
    if (urlBillingPeriod === 'monthly' || urlBillingPeriod === 'annually') {
      return urlBillingPeriod;
    }
    return flashSale?.defaultBillingPeriod || 'monthly';
  }, [searchParams, flashSale]);

  const { activeDiscountCode, hasDiscount, billingPeriod, setBillingPeriod, fetchedPricesBySku, isPricesLoading, getPriceIdForSku } = usePaddleCommon({
    discountCode: searchParams.get("discountCode") || undefined,
    defaultBillingPeriod,
  });

  useEffect(() => {
    if (flashSale && !activeDiscountCode) {
      const params = new URLSearchParams();
      params.set('discountCode', flashSale.discountCode || '');
      if (flashSale.defaultBillingPeriod) {
        params.set('billingPeriod', flashSale.defaultBillingPeriod);
      }
      router.push(`/exam-bundles?${params.toString()}`);
    }
  }, [flashSale, router, activeDiscountCode]);

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
        console.error('[exam-bundles] Error fetching bundles:', response.errors);
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
  }, [ownedSkus, bundles]);

  // Merge ownership status with static bundles
  const superCuriobundlesWithOwnership = useMemo(() => {
    return superCuriobundles.map(bundle => ({
      ...bundle,
      owned: bundle.sku ? ownedSkus.has(bundle.sku) : false,
    }));
  }, [ownedSkus, superCuriobundles]);

  // Show thank you page when p === 'SATUS-001'
  if (p === "SATUS-001") {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center">
        <div className="w-full max-w-2xl p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center space-y-6"
          >
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold">Thank You for Your Purchase! 🎉</h1>
              <p className="text-lg text-muted-foreground">
                Your question bundle is now ready to use.
              </p>
            </div>

            {/* Practice Tests are not part of this implementation (docs/decisions.md),
                so the post-purchase CTA that pointed at them is gone. */}
          </motion.div>
        </div>
      </main>
    );
  }

  if (p === "SUPER_CURIO_MONTHLY" || p === "SUPER_CURIO_ANNUAL" || p === "SUPER_CURIO_6MONTHS" || p === "ULTRA_CURIO_MONTHLY" || p === "ULTRA_CURIO_ANNUAL" || p === "ULTRA_CURIO_6MONTHS") {
    return (
      <main className="relative flex min-h-full flex-col items-center justify-center">
        <div className="w-full max-w-2xl p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="text-center space-y-6"
          >
            <div className="space-y-4" data-testid="payment-success-message">
              <h1 className="text-4xl font-semibold">Thank You for Your Purchase! 🎉</h1>
              <p className="text-lg text-muted-foreground">
                Your subscription is now active.
              </p>
            </div>

            <div className="space-y-4 pt-6">
              <p className="text-base text-gray-700">
                You have now access to all Curio features.
                You can manage your subscription on your <Link href="/profile" className="underline font-semibold hover:text-green-900">profile page</Link>.
              </p>

              <Link
                href="/"
                className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Go to Curio
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex h-full flex-col items-center">
      <div className="w-full max-w-6xl p-6 md:p-10 h-full">

        {/* Discount Banner */}
        {(hasDiscount && !isUserSubscribed) && (
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-300 rounded-lg p-4 text-center">
              <p className="text-orange-900 font-semibold mb-1 text-lg">
                🎉 50% Discount Applied!
              </p>
              <p className="text-sm text-orange-800">
                Your {activeDiscountCode} discount code has been applied.
              </p>
            </div>
          </div>
        )}

        {/* Already Subscribed Banner */}
        {isUserSubscribed && (
          <div className="mb-8 mx-auto max-w-2xl">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-medium mb-2">
                🎉 You are already subscribed to Super Curio!
              </p>
              <p className="text-sm text-green-700">
                Go to your{" "}
                <Link href="/profile" className="underline font-semibold hover:text-green-900">
                  profile page
                </Link>{" "}
                to manage your subscription.
              </p>
            </div>
          </div>
        )}

        {/* Pricing Cards - Only show if not subscribed */}
        {!isUserSubscribed && (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-3xl font-semibold mb-3">Choose your plan</h1>
              <div className="text-sm text-muted-foreground">Cancel anytime. No commitment.</div>
            </div>
            {/* Billing Period Toggle */}
            {/* <div className="mb-8 flex justify-center">
              <BillingPeriodToggle
                billingPeriod={billingPeriod}
                onBillingPeriodChange={setBillingPeriod}
              />
            </div> */}

            {/* Super Curio Cards Only - Monthly and Annually */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {!isMobile && bundlesWithOwnership
                .filter((b: Bundle) => b.title === 'Curio')
                .map((b: Bundle) => {
                  return (
                    <motion.div
                      key={`${b.title}`}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.06 }}
                    >
                      <BundleCard {...b} variant="light" ctaLabel="" getPriceIdForSku={getPriceIdForSku} />
                    </motion.div>
                  );
                })}
              {superCuriobundlesWithOwnership
                .map((b: Bundle, bundleIndex: number) => {
                  // Use the selected billing period from toggle
                  const selectedPeriod = billingPeriod === 'monthly' ? 'monthly' : 'annually';
                  return ['annually', 'monthly'].map((period, i) => {
                    const bundleProps: BundleCardProps = {
                      ...b,
                      billingPeriod: period as 'monthly' | '6_months' | 'annually',
                      ...(activeDiscountCode && { discountCode: activeDiscountCode }),
                      ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
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
                        <BundleCard {...bundleProps} title={b.title + (period === 'monthly' ? ' (Monthly)' : period === '6_months' ? ' (6 Months)' : ' (Yearly)')} variant={period === 'monthly' ? 'light' : 'dark'} badgeRight={period === 'annually' ? 'Most Popular' : undefined} />
                      </motion.div>
                    );
                  });
                })}
              { /* bundlesWithOwnership, Disabled for utra curio option removed
                .filter((b: Bundle) => b.title !== 'Curio')
                .map((b: Bundle, bundleIndex: number) => {
                  // Use the selected billing period from toggle
                  const selectedPeriod = billingPeriod === 'monthly' ? 'monthly' : 'annually';
                  return [selectedPeriod].map((period, i) => {
                    const bundleProps: BundleCardProps = {
                      ...b,
                      billingPeriod: period as 'monthly' | '6_months' | 'annually',
                      ...(activeDiscountCode && { discountCode: activeDiscountCode }),
                      ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
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
                        <BundleCard {...bundleProps} title={b.title + (period === 'monthly' ? ' (Monthly)' : period === '6_months' ? ' (6 Months)' : ' (Yearly)')} variant={bundleIndex === 1 ? 'light' : 'dark'} badgeRight={bundleIndex === 0 ? 'Most Popular' : undefined} />
                      </motion.div>
                    );
                  });
                })*/}
            </div>

            <div className="rounded-md p-3 text-sm text-gray-700 text-center mx-auto mt-10">
              <div className="max-w-2xl font-semibold text-2xl mx-auto mb-3">
                Trusted by learners globally
              </div>
              <Image src="/uni-logos.png" alt="University Logos" width={1000} height={100} />
            </div>

          </>
        )}

      </div>
    </main>
  );
}