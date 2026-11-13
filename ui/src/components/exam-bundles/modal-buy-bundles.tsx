"use client";

import { Dialog, VisuallyHidden } from '@radix-ui/themes';
import { bundles } from "@/components/exam-bundles/bundles-data";
import { BundleCard } from "@/components/exam-bundles/bundle-card";
import { type Bundle } from "@/components/exam-bundles/types";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useFreeSATMockExam } from "@/hooks/api/mock-exams/use-free-sat-mock-exam.api";
import { useAnalytics, useSessionContext } from '@/providers';
import { usePaddlePrices } from "@/hooks/use-paddle-prices";
import { useMemo, useCallback } from "react";
import { PaddlePriceData } from "@/lib/types/paddle";
import { useSKUUtils } from '@/hooks/use-paddle-common';

interface ModalBuyBundlesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ModalBuyBundles({ open, onOpenChange }: ModalBuyBundlesProps) {
  const router = useRouter();
  const { getOrCreateFreeSATMockExam, isCreating } = useFreeSATMockExam();
  const { track } = useAnalytics();
  const { userProfile } = useSessionContext();
  
  // Filter out subscriptions - only show one-time purchase bundles
  const oneTimeBundles = bundles.filter(bundle => !bundle.isSubscription && !bundle.disabled);

  const { getPriceIdForSku } = useSKUUtils();

  // Helper function to get sku from a price ID
  const getSkuForPriceId = useCallback((priceId: string) => {
    const priceIdMap: Record<string, string> = {
      [process.env.NEXT_PUBLIC_PADDLE_SATS_PRICE_CODE || '']: 'SATUS-001',
      [process.env.NEXT_PUBLIC_PADDLE_SATS_ORIGINAL_PRICE_CODE || '']: 'SATUS-001-ORIGINAL',
    };
    return priceIdMap[priceId];
  }, []);

  // Collect all price IDs from one-time bundles for dynamic price fetching
  const allPriceIds = useMemo(() => {
    const priceIds: string[] = [];
    oneTimeBundles.forEach(bundle => {
      if (bundle.sku) {
        const priceId = getPriceIdForSku(bundle.sku);
        if (priceId) priceIds.push(priceId);
      }
      if (bundle.originalSku) {
        const priceId = getPriceIdForSku(bundle.originalSku);
        if (priceId) priceIds.push(priceId);
      }
    });
    return Array.from(new Set(priceIds)); // Remove duplicates
  }, [oneTimeBundles, getPriceIdForSku]);

  // Fetch prices from Paddle based on user's country
  const { prices: fetchedPrices, isLoading: isPricesLoading } = usePaddlePrices({
    priceIds: allPriceIds,
    countryCode: userProfile?.country,
    enabled: allPriceIds.length > 0,
  });

  // A collection of all prices in fetchedPrices, indexed by sku
  const fetchedPricesBySku = useMemo(() => {
    if (!fetchedPrices) return new Map<string, PaddlePriceData>();
    const priceMap = new Map<string, PaddlePriceData>();
    fetchedPrices.forEach((price) => {
      const sku = getSkuForPriceId(price.priceId);
      if (sku) {
        priceMap.set(sku, price);
      }
    });
    return priceMap;
  }, [fetchedPrices, getSkuForPriceId]);

  const handleFreeTrial = useCallback(async () => {
    // Close modal
    onOpenChange(false);

    track('modal_buy_bundles_free_trial_clicked');
    
    // Get or create free SAT mock exam
    const mockExamUuid = await getOrCreateFreeSATMockExam();
    
    if (mockExamUuid) {
      // Navigate to the mock exam page
      router.push(`/mock-exams/${mockExamUuid}`);
    } else {
      // If creation failed, fall back to practice tests page
      router.push('/mock-exams');
    }
  }, [onOpenChange, track, getOrCreateFreeSATMockExam, router]);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <VisuallyHidden>
        <Dialog.Title>Buy Exam Bundles</Dialog.Title>
      </VisuallyHidden>
      <Dialog.Content style={{ maxWidth: '980px' }}>
        <div className="w-full">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold">Buy Exam Bundles</h2>
            <div className="text-xs text-muted-foreground">Exams can be used in our Practice Tests</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {oneTimeBundles.map((b: Bundle, i: number) => {
              const { key, ...rest } = b as any;
              // Add onFreeTrial callback if the bundle has showFreeTrialButton
              const bundleProps = {
                ...rest,
                ...(rest.showFreeTrialButton && { onFreeTrial: handleFreeTrial }),
                ...(fetchedPricesBySku && { fetchedPrices: fetchedPricesBySku }),
                isPricesLoading,
                showSkeleton: isPricesLoading || !userProfile,
              };
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.06 }}
                >
                  <BundleCard {...bundleProps} getPriceIdForSku={getPriceIdForSku} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}


