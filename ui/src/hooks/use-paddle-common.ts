import { bundles } from "@/components/exam-bundles/bundles-data";
import { PaddlePriceData } from "@/lib/types/paddle";
import { useCallback, useMemo } from "react";
import { useSessionContext } from "@/providers";
import { usePaddlePrices } from "./use-paddle-prices";
import { useSearchParams } from "next/navigation";
import { usePaddleDiscounts } from "./use-paddle-discounts";
import { useBillingPeriod } from "./use-billing-period";
import { trackMixpanelBrowserEvent } from "@/lib/analytics/mixpanel-env";

// use this to send overrides to the paddle prices api
// [SUPER_CURIO_ANNUAL]: 'diff-price-id'
type PriceRecordOverrides = Record<string, string>;

export function useSKUUtils(priceRecordOverrides?: PriceRecordOverrides) {
  const skuMap = useMemo(() => {
    const map = new Map<string, string>([
      ['SATUS-001', process.env.NEXT_PUBLIC_PADDLE_SATS_PRICE_CODE || ''],
      ['SATUS-001-ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_SATS_ORIGINAL_PRICE_CODE || ''],

      ['SUPER_CURIO_MONTHLY', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_MONTHLY_PRICE_CODE || ''],
      ['SUPER_CURIO_MONTHLY_ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_MONTHLY_ORIGINAL_PRICE_CODE || ''],

      ['SUPER_CURIO_ANNUAL', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_ANNUAL_PRICE_CODE || ''],
      ['SUPER_CURIO_ANNUAL_ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_ANNUAL_ORIGINAL_PRICE_CODE || ''],
      ['SUPER_CURIO_ANNUAL_PER_MONTH', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_ANNUAL_PER_MONTH_PRICE_CODE || ''],

      ['SUPER_CURIO_6MONTHS', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_6MONTHS_PRICE_CODE || ''],
      ['SUPER_CURIO_6MONTHS_ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_6MONTHS_ORIGINAL_PRICE_CODE || ''],
      ['SUPER_CURIO_6MONTHS_PER_MONTH', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_6MONTHS_PER_MONTH_PRICE_CODE || ''],

      ['ULTRA_CURIO_MONTHLY', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_MONTHLY_PRICE_CODE || ''],
      ['ULTRA_CURIO_MONTHLY_ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_MONTHLY_ORIGINAL_PRICE_CODE || ''],

      ['ULTRA_CURIO_ANNUAL', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_ANNUAL_PRICE_CODE || ''],
      ['ULTRA_CURIO_ANNUAL_ORIGINAL', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_ANNUAL_ORIGINAL_PRICE_CODE || ''],
      ['ULTRA_CURIO_ANNUAL_PER_MONTH', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_ANNUAL_PER_MONTH_PRICE_CODE || ''],

      ['SUPER_CURIO_MONTH_GIFT', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_MONTH_GIFT_PRICE_CODE || ''],
      ['SUPER_CURIO_ANNUAL_GIFT', process.env.NEXT_PUBLIC_PADDLE_SUPER_CURIO_ANNUAL_GIFT_PRICE_CODE || ''],

      ['ULTRA_CURIO_MONTH_GIFT', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_MONTH_GIFT_PRICE_CODE || ''],
      ['ULTRA_CURIO_ANNUAL_GIFT', process.env.NEXT_PUBLIC_PADDLE_ULTRA_CURIO_ANNUAL_GIFT_PRICE_CODE || ''],
    ]);

    if (priceRecordOverrides) {
      Object.entries(priceRecordOverrides).forEach(([sku, priceId]) => {
        // if price is not in the map, log it
        if (!map.has(sku)) {
          console.warn(`[usePaddleCommon] Price record override for sku ${sku} not found in map`);
        } else {
          map.set(sku, priceId as string);
        }
      });
    }

    return map;
  }, [priceRecordOverrides]);

  const priceIdMap = useMemo(() => {
    // reverse the skuMap
    const map = new Map<string, string>();
    skuMap.forEach((value, key) => {
      map.set(value, key);
    });
    return map;
  }, [skuMap]);

    // Helper function to get a single price ID for a sku
  const getPriceIdForSku = useCallback((sku: string) => {
    return skuMap.get(sku);
  }, [skuMap]);

  // Helper function to get sku from a 
  const getSkuForPriceId = useCallback((priceId: string) => {
    return priceIdMap.get(priceId);
  }, [priceIdMap]);

  return {
    getPriceIdForSku,
    getSkuForPriceId,
  }
}

export function usePaddleCommon({ discountCode, defaultBillingPeriod, priceRecordOverrides }: { discountCode?: string; defaultBillingPeriod?: 'monthly' | 'annually'; priceRecordOverrides?: PriceRecordOverrides }) {
  const { userProfile } = useSessionContext();
  const searchParams = useSearchParams();
  const internalDiscountCode = discountCode || searchParams.get("discountCode");
  const { billingPeriod, setBillingPeriod } = useBillingPeriod(defaultBillingPeriod || 'monthly');

  const { discounts, isLoading: isLoadingDiscounts } = usePaddleDiscounts({
    discountCodes: [internalDiscountCode || ''],
    enabled: true,
  });

  const { getPriceIdForSku, getSkuForPriceId } = useSKUUtils(priceRecordOverrides);

  // Collect all price IDs from bundles for dynamic price fetching
  const allPriceIds = useMemo(() => {
    const priceIds: string[] = [];
    bundles.forEach(bundle => {
      // Add SKU from one-time purchases
      if (bundle.sku) {
        const priceId = getPriceIdForSku(bundle.sku);
        if (priceId) priceIds.push(priceId);
      }
      if (bundle.originalSku) {
        const priceId = getPriceIdForSku(bundle.originalSku);
        if (priceId) priceIds.push(priceId);
      }
      // Add SKUs from pricing options
      if (bundle.pricingOptions) {
        bundle.pricingOptions.forEach(option => {
          if (option.sku) {
            const priceId = getPriceIdForSku(option.sku);
            if (priceId && priceId.trim()) priceIds.push(priceId.trim());
          }
          if (option.originalSku) {
            const priceId = getPriceIdForSku(option.originalSku);
            if (priceId && priceId.trim()) priceIds.push(priceId.trim());
          }
          if (option.perMonthSku) {
            const priceId = getPriceIdForSku(option.perMonthSku);
            if (priceId && priceId.trim()) priceIds.push(priceId.trim());
          }
        });
      }
    });
    return Array.from(new Set(priceIds)); // Remove duplicates
  }, [bundles, getPriceIdForSku]);

  // Check if discount is valid
  const hasDiscount = !!discounts && !!discounts.size && discounts.size > 0;
  
  // Determine which discount code to use based on billing period
  const activeDiscountCode = useMemo(() => {
    if (!hasDiscount) return undefined;
    return internalDiscountCode;
  }, [hasDiscount, internalDiscountCode]);

  // Get the discount id for the active discount code
  const activeDiscountId = useMemo(() => {
    if (!activeDiscountCode) return undefined;
    if (isLoadingDiscounts) return undefined;
    if (!discounts) return undefined;
    return discounts.get(activeDiscountCode) || undefined;
  }, [activeDiscountCode, discounts, isLoadingDiscounts]);

  // Fetch prices from Paddle based on user's country
  const { prices: fetchedPrices, isLoading: isPricesLoading } = usePaddlePrices({
    priceIds: allPriceIds,
    countryCode: userProfile?.country,
    enabled: allPriceIds.length > 0,
    discountId: activeDiscountId,
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

  const wrapperSetBillingPeriod = useCallback((period: 'monthly' | 'annually') => {
    setBillingPeriod(period);
    trackMixpanelBrowserEvent('billing_period_changed', { billingPeriod: period });
  }, [setBillingPeriod]);
   
  return {
    getPriceIdForSku,
    getSkuForPriceId,
    allPriceIds,
    fetchedPricesBySku,
    isPricesLoading,
    activeDiscountCode,
    activeDiscountId,
    hasDiscount,
    billingPeriod,
    setBillingPeriod: wrapperSetBillingPeriod,
    discounts,
    isLoadingDiscounts,
  }
}