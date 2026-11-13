import { PaddlePriceData } from '@/lib/types/paddle';

export type BundleFeature = {
  text: string;
  type: 'v' | 'x' | 'f' | 't';
};

export type PricingOption = {
  sku?: string;           // Total price SKU (the one you buy)
  originalSku?: string;   // The displayed original price SKU
  perMonthSku?: string;   // For yearly plans, the per month discounted price SKU
  billingPeriod: 'monthly' | 'annually' | '6_months';
  oneTime?: boolean;
};

export type Bundle = {
  hideOnMobile: boolean;
  order: number;
  title: string;
  pricingOptions?: PricingOption[]; // For subscription plans with multiple billing options
  sku?: string;           // The displayed price SKU for one time purchases (the one you buy)
  originalSku?: string;   // The displayed original price SKU for one-time purchases
  subtitle?: string;
  description?: string;
  features: BundleFeature[];
  ctaLabel: string;
  oneTimeCtaLabel?: string;
  disabled?: boolean;
  owned?: boolean;
  variant?: 'light' | 'dark';
  badgeLeft?: string;
  badgeRight?: string;
  isSubscription?: boolean; // True for subscription plans
  // Free trial button
  showFreeTrialButton?: boolean; // If true, shows a "Try for Free" button
  freeTrialLabel?: string; // Label for the free trial button
  onFreeTrial?: () => void; // Callback for free trial button
  note?: string;
};


