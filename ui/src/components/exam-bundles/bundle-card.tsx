"use client";

import { Button } from "@/components/ui/button";
import { useCheckout, type CustomerData } from "@/hooks/use-checkout";
import { Check, X, Zap, Flame } from "lucide-react";
import React, { ReactNode, useCallback, useMemo } from "react";
import { type Bundle, type BundleFeature, type PricingOption } from "@/components/exam-bundles/types";
import { cn } from "@/lib/utils";
import { useSessionContext } from "@/providers";
import { type PaddlePriceData } from "@/lib/types/paddle";
import { PricingDisplay, type PricingDisplayMode } from "@/components/exam-bundles/pricing-display";
import { useSKUUtils } from "@/hooks/use-paddle-common";

function TypeIcon ({type, dark}:{type: 'v' | 'x' | 't' | 'f', dark?: boolean}) {
  switch (type) {
    case 'v':
      return <Check className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-emerald-400' : 'text-emerald-600'}`} />
    case 'x':
      return <X className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-red-400' : 'text-red-600'}`} />
    case 't':
      return <Zap className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-yellow-400' : 'text-yellow-600'}`} />
    case 'f':
      return <Flame className={`mt-0.5 h-4 w-4 shrink-0 ${dark ? 'text-orange-400' : 'text-orange-600'}`} />
    default:
      return <></>
  }
}

function Feature({ children, type, dark = false }: { children: React.ReactNode; type: 'v' | 'x' | 't' | 'f'; dark?: boolean }) {
  return (
    <li className={`flex items-start gap-2 ${dark ? 'text-gray-200' : 'text-gray-800'}`}>
      <TypeIcon type={type} dark={dark}/>
      <span>{children}</span>
    </li>
  );
}

export interface BundlePricingOption {
  sku?: string;           // Total price SKU (the one you buy)
  originalSku?: string;   // The displayed original price SKU
  perMonthSku?: string;   // For yearly plans, the per month discounted price SKU
  billingPeriod: 'monthly' | 'annually' | '6_months' | 'one-time';
}

export interface BundleCardProps extends Bundle {
  billingPeriod?: 'monthly' | 'annually' | '6_months';
  discountCode?: string;
  partnerCode?: string;
  fetchedPrices?: Map<string, PaddlePriceData>;
  isPricesLoading?: boolean;
  showSkeleton?: boolean;
  onCustomCheckout?: (sku: string, discountCode?: string) => Promise<void>;
  customLoading?: boolean;
  successUrl?: string;
  recipientEmail?: string;
  recipientMessage?: string;
  subscriptionStartDate?: string;
  customDisplayMode?: PricingDisplayMode;
  getPriceIdForSku: (sku: string) => string | undefined;
  sourcePage?: string;
}

export function BundleCard(props: BundleCardProps) {
  const {
    title,
    sku,
    originalSku,
    pricingOptions,
    isSubscription,
    subtitle,
    description,
    features,
    ctaLabel,
    oneTimeCtaLabel,
    disabled,
    owned,
    variant = 'light',
    badgeLeft,
    badgeRight,
    billingPeriod = 'annually',
    showFreeTrialButton,
    freeTrialLabel = 'Try for Free',
    onFreeTrial,
    discountCode,
    partnerCode,
    fetchedPrices,
    isPricesLoading = false,
    showSkeleton = false,
    onCustomCheckout,
    customLoading = false,
    successUrl,
    recipientEmail,
    recipientMessage,
    subscriptionStartDate,
    getPriceIdForSku,
    customDisplayMode,
    sourcePage,
    note
  } = props;

  // Check if this is a gifting flow (one-time payment)
  const isGiftingFlow = !!recipientEmail;

  // Get the pricing based on billingPeriod
  // If gifting flow, prioritize oneTime pricing options
  const activePricing: PricingOption | null = pricingOptions
    ? (isGiftingFlow
      ? pricingOptions.find(opt => opt.oneTime === true && opt.billingPeriod === billingPeriod) || null
      : isSubscription
        ? pricingOptions.find(opt => opt.billingPeriod === billingPeriod && !opt.oneTime) || null
        : null)
    : null;

  // Determine what to display
  const displaySku = activePricing?.sku || sku;
  
  // Check if this is a one-time payment
  const isOneTimePayment = isGiftingFlow && activePricing?.oneTime === true;

  // Determine display mode
  let displayMode: PricingDisplayMode = 'free';
  if (customDisplayMode) {
    displayMode = customDisplayMode;
  } else if (!sku && !pricingOptions) {
    displayMode = 'free';
  } else if (isOneTimePayment) {
    displayMode = 'one-time';
  } else if (isSubscription && activePricing) {
    displayMode = activePricing.billingPeriod === 'monthly' ? 'monthly' : activePricing.billingPeriod === '6_months' ? '6_months' : 'annually';
  } else {
    displayMode = 'one-time';
  }

  // Get fetched prices
  const mainPriceData = displaySku ? fetchedPrices?.get(displaySku) : undefined;
  const originalPriceData = activePricing?.originalSku ? fetchedPrices?.get(activePricing.originalSku) :
    originalSku ? fetchedPrices?.get(originalSku) : undefined;
  const perMonthPriceData = activePricing?.perMonthSku ? fetchedPrices?.get(activePricing.perMonthSku) : undefined;

  const isDark = variant === 'dark';
  const baseClasses = `rounded-2xl border shadow-lg p-6 relative h-full flex flex-col ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-focus text-gray-900'}`;
  const { startCheckout, isLoading } = useCheckout(getPriceIdForSku);

  const { userAttributes, userProfile } = useSessionContext();

  const customerData: CustomerData | undefined = useMemo(() => {
    // If recipientEmail is provided (gifting flow), use that instead of logged-in user's email
    const email = userAttributes?.email || '';
    if (!email) return undefined;

    return {
      email,
      userId: userAttributes?.userUuid || ''
    };
  }, [userAttributes?.email, userAttributes?.userUuid]);

  const handleCheckout = useCallback(async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event propagation to avoid closing modals/dialogs
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (onCustomCheckout) {
      await onCustomCheckout(displaySku || '', discountCode || '');
      return;
    }

    if (disabled || owned || !displaySku) return;

    // Use provided sourcePage or default to current URL
    const currentSourcePage = sourcePage || (typeof window !== 'undefined' ? window.location.href : undefined);

    await startCheckout({
      provider: 'paddle',
      sku: displaySku,
      currency: 'USD',
      customerData,
      ...(partnerCode && { partnerCode }),
      ...(discountCode && { discountCode }),
      ...(userProfile?.country && { countryCode: userProfile.country }),
      ...(subscriptionStartDate && { subscriptionStartDate }),
      successUrl,
      recipientEmail,
      recipientMessage,
      ...(currentSourcePage && { sourcePage: currentSourcePage }),
    });
  }, [disabled, owned, displaySku, onCustomCheckout, discountCode, startCheckout, customerData, partnerCode, userProfile, subscriptionStartDate, successUrl, recipientEmail, recipientMessage, sourcePage]);

  return (
    <div className={cn(
      baseClasses,
      isOneTimePayment && "ring-2 ring-orange-400 ring-offset-2"
    )}>
      {badgeLeft && (
        <div className={`absolute -top-3 left-6 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'} shadow`}>
          {badgeLeft}
        </div>
      )}
      {badgeRight && (
        <div className={`absolute -top-3 right-6 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-orange-400 text-gray-900' : 'bg-gray-200 text-gray-700'} shadow`}>
          {badgeRight}
        </div>
      )}
      {isOneTimePayment && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full ${isDark ? 'bg-orange-400 text-gray-900' : 'bg-orange-400 text-white'} shadow font-semibold`}>
          Gift
        </div>
      )}
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      <PricingDisplay
        displayMode={displayMode}
        price={mainPriceData?.formattedPrice}
        originalPrice={originalPriceData?.formattedPrice}
        perMonthPrice={perMonthPriceData?.formattedPrice}
        variant={variant}
        isPricesLoading={showSkeleton || isPricesLoading}
      />
      {subtitle && (
        <div className={`text-xs mb-6 ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>{subtitle}</div>
      )}

      {description && (
        <p className={`text-sm mb-6 min-h-[40px] mt-6 ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>{description}</p>
      )}

      {isOneTimePayment && (
        <div className={`text-sm mb-4 px-4 py-2 rounded-lg ${isDark ? 'bg-orange-400/20 text-orange-300' : 'bg-orange-50 text-orange-700'} border ${isDark ? 'border-orange-400/30' : 'border-orange-200'}`}>
          <p className="font-semibold">One-time payment</p>
          <p className="text-xs mt-1">Perfect for gifting - no recurring charges</p>
        </div>
      )}

      <ul className="text-sm space-y-2 mb-6">
        {features.map((f: BundleFeature, i: number) => (
          <Feature key={i} type={f.type} dark={isDark}>{f.text}</Feature>
        ))}
      </ul>

      {note && (
        <p className={`text-sm mb-6 ${isDark ? 'text-gray-300' : 'text-muted-foreground'}`}>{note}</p>
      )}



      {(displayMode !== 'free' || !!ctaLabel) && (
        <div className={cn(
          "flex mt-auto gap-2",
          showFreeTrialButton ? "flex-col" : "justify-center"
        )}>
          {showFreeTrialButton && (
            <Button
              variant="outline"
              className="w-full"
              onClick={onFreeTrial}
            >
              {freeTrialLabel}
            </Button>
          )}
          <Button
            disabled={disabled || owned || isLoading || customLoading}
            variant={disabled || owned ? 'outline' : 'default'}
            className={cn(
              showFreeTrialButton ? "w-full" : "px-6",
              disabled && "bg-gray-800 hover:bg-gray-600 text-gray-100",
              owned && "bg-green-800 hover:bg-green-800 text-green-100 cursor-default",
              isOneTimePayment && !owned && !disabled && "bg-orange-500 hover:bg-orange-600 text-white",
              variant === 'dark' && !owned && !isOneTimePayment && "bg-orange-400 hover:bg-orange-300 text-gray-900",
            )}
            onClick={handleCheckout}
            data-testid={`bundle-card-button-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {owned ? 'Owned' : (disabled ? 'Coming soon' : ((isLoading || customLoading) ? 'Processing…' : (isOneTimePayment ? oneTimeCtaLabel : ctaLabel)))}
          </Button>
        </div>
      )}
    </div>
  );
}
