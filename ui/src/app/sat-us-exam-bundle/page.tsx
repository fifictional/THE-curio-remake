'use client';

import { BundleCard } from "@/components/exam-bundles/bundle-card";
import { bundles } from "@/components/exam-bundles/bundles-data";
import { useRouter } from "next/navigation";
import { useFreeSATMockExam } from "@/hooks/api/mock-exams/use-free-sat-mock-exam.api";
import { useCheckout } from "@/hooks/use-checkout";
import { useSessionContext } from "@/providers/session-provider";
import { motion } from "framer-motion";
import { usePaddlePrices } from "@/hooks/use-paddle-prices";
import { useMemo, useCallback } from "react";
import { useAnalytics } from "@/providers";
import { useSKUUtils } from "@/hooks/use-paddle-common";

export default function SATUSExamBundlePage() {
  const router = useRouter();
  const { getOrCreateFreeSATMockExam, isCreating } = useFreeSATMockExam();
  const { getPriceIdForSku } = useSKUUtils();
  const { startCheckout, isLoading: isCheckoutLoading } = useCheckout(getPriceIdForSku);
  const { track } = useAnalytics();
  const { userAttributes, userProfile } = useSessionContext();
  
  // Find the SAT US bundle
  const satBundle = bundles.find(bundle => bundle.title === 'SAT US Bundle');
  
  // Get price IDs for SATUS-001
  const satPriceId = useMemo(() => {
    return process.env.NEXT_PUBLIC_PADDLE_SATS_PRICE_CODE || '';
  }, []);

  const satOriginalPriceId = useMemo(() => {
    return process.env.NEXT_PUBLIC_PADDLE_SATS_ORIGINAL_PRICE_CODE || '';
  }, []);

  // Collect all price IDs
  const allPriceIds = useMemo(() => {
    const priceIds: string[] = [];
    if (satPriceId) priceIds.push(satPriceId);
    if (satOriginalPriceId) priceIds.push(satOriginalPriceId);
    return priceIds;
  }, [satPriceId, satOriginalPriceId]);
  
  // Fetch prices from Paddle based on user's country
  const { prices: fetchedPrices, isLoading: isPricesLoading } = usePaddlePrices({
    priceIds: allPriceIds,
    countryCode: userProfile?.country,
    enabled: allPriceIds.length > 0,
  });

  // Convert prices to a map indexed by SKU
  const fetchedPricesBySku = useMemo(() => {
    if (!fetchedPrices) return new Map();
    const priceMap = new Map();
    const priceData = fetchedPrices.get(satPriceId);
    if (priceData) {
      priceMap.set('SATUS-001', priceData);
    }
    const originalPriceData = fetchedPrices.get(satOriginalPriceId);
    if (originalPriceData) {
      priceMap.set('SATUS-001-ORIGINAL', originalPriceData);
    }
    return priceMap;
  }, [fetchedPrices, satPriceId, satOriginalPriceId]);
  
  // Get the fetched price for display in button
  const fetchedPrice = fetchedPrices?.get(satPriceId);
  const displayPrice = fetchedPrice?.formattedPrice || '$49';

  const handleFreeTrial = useCallback(async () => {
    // Get or create free SAT mock exam
    const mockExamUuid = await getOrCreateFreeSATMockExam();

    track('sat_us_exam_bundle_free_trial_clicked');
    
    if (mockExamUuid) {
      // Navigate to the mock exam page
      router.push(`/mock-exams/${mockExamUuid}`);
    } else {
      // If creation failed, fall back to practice tests page
      router.push('/mock-exams');
    }
  }, [getOrCreateFreeSATMockExam, track, router]);

  const handleBuyNow = useCallback(async () => {
    track('sat_us_exam_bundle_buy_now_clicked');
    
    await startCheckout({
      provider: 'paddle',
      sku: 'SATUS-001',
      currency: 'USD',
      customerData: {
        email: userAttributes?.email || '',
        userId: userAttributes?.userUuid || '',
      },
      ...(userProfile?.country && { countryCode: userProfile.country }),
    });
  }, [track, startCheckout, userAttributes, userProfile]);

  if (!satBundle) {
    return <div>Bundle not found</div>;
  }

  const { key, ...bundleProps } = satBundle as any;
  const bundleWithCallback = {
    ...bundleProps,
    onFreeTrial: handleFreeTrial,
    ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
    isPricesLoading,
    showSkeleton: isPricesLoading || !userProfile,
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            SAT US Exam Bundle
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Master the SAT with our comprehensive question bank and AI-powered practice tests. 
            Try it free before you buy!
          </p>
        </motion.div>

        {/* Bundle Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="max-w-md mx-auto"
        >
          <BundleCard {...bundleWithCallback} getPriceIdForSku={getPriceIdForSku} />
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 grid md:grid-cols-3 gap-8"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Verified Questions</h3>
            <p className="text-sm text-muted-foreground">
              Real SAT-style questions verified by educators
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">AI-Powered Explanations</h3>
            <p className="text-sm text-muted-foreground">
              Detailed explanations and hints for every question
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-semibold mb-2">Lifetime Access</h3>
            <p className="text-sm text-muted-foreground">
              One-time purchase with unlimited question access
            </p>
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-8 md:p-12 text-center border border-purple-100"
        >
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to ace the SAT?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Start with a free practice test to experience our SAT question bank, or unlock full access with a one-time purchase.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={handleFreeTrial}
              disabled={isCreating}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {isCreating ? 'Creating...' : 'Try for Free'}
            </button>
            <button
              onClick={handleBuyNow}
              disabled={isCheckoutLoading}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-purple-600 bg-white rounded-lg hover:bg-purple-50 transition-all border-2 border-purple-200 hover:border-purple-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {isCheckoutLoading ? 'Processing...' : `Buy Now - ${displayPrice}`}
              {!isCheckoutLoading && <span className="text-sm line-through text-muted-foreground">$99</span>}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            No credit card required for free trial • One-time purchase, lifetime access
          </p>
        </motion.div>
      </div>
    </div>
  );
}

