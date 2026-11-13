"use client";

import { cn } from "@/lib/utils";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export type PricingDisplayMode = 'free' | 'one-time' | 'monthly' | '6_months' | 'annually' | 'yearly' | 'one-dollar-promo';

export interface PricingDisplayProps {
  displayMode: PricingDisplayMode;
  price?: string;
  originalPrice?: string;
  perMonthPrice?: string;
  variant?: 'light' | 'dark';
  isPricesLoading?: boolean;
}

export function PricingDisplay({
  displayMode,
  price,
  originalPrice,
  perMonthPrice,
  variant = 'light',
  isPricesLoading = false,
}: PricingDisplayProps) {
  const isDark = variant === 'dark';
  
  // Format price to remove decimals
  const formatPrice = (priceStr?: string): string => {
    // remove symbol (it's in position 0)
    // but save it to put it back later
    const symbol = priceStr?.slice(0, 1);
    const num = parseFloat(priceStr?.slice(1) || '');
    if (isNaN(num)) return '';
    return symbol + Math.ceil(num).toString();
  };
  
  // Theme the skeleton loaders based on card variant
  const skeletonBaseColor = isDark ? '#374151' : '#e5e5e5';
  const skeletonHighlightColor = isDark ? '#4b5563' : '#f0f0f0';

  // Free mode - just display "Free" in orange
  if (displayMode === 'free') {
    return (
      <div className="mb-1">
        <div className="text-4xl font-semibold text-orange-400 tracking-tight">Free</div>
      </div>
    );
  }

  // Show loading state for paid modes
  if (isPricesLoading) {
    return (
      <div className="mb-1">
        <Skeleton 
          width="100%" 
          height={48} 
          baseColor={skeletonBaseColor}
          highlightColor={skeletonHighlightColor}
        />
      </div>
    );
  }

  // One-time payment mode
  if (displayMode === 'one-time') {
    return (
      <div className="mb-1">
        <div className="flex flex-shrink-0 justify-between items-baseline">
          <div className="text-5xl font-semibold text-orange-400 tracking-tight">
            {price}
          </div>
          {originalPrice && (
            <div className="text-3xl font-semibold tracking-tight opacity-40 line-through">
              {originalPrice}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Monthly subscription mode
  if (displayMode === 'monthly') {
    return (
      <div className="mb-1">
        <div className="flex flex-shrink-0 justify-between items-baseline">
          <div className="flex items-baseline gap-1">
            <div className="text-4xl font-semibold text-orange-400 tracking-tight">
              {formatPrice(price)}
            </div>
            <span className={cn("text-lg", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
              /month
            </span>
          </div>
          {originalPrice && (
            <div className="text-2xl font-semibold tracking-tight opacity-40 line-through">
              {formatPrice(originalPrice)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 6 months subscription mode
  if (displayMode === '6_months') {
    return (
      <div className="mb-1">
        <div className="flex flex-shrink-0 justify-between items-baseline">
          <div className="flex items-baseline gap-1">
            <div className="text-4xl font-semibold text-orange-400 tracking-tight">
              {perMonthPrice}
            </div>
            <span className={cn("text-lg", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
              /month
            </span>
          </div>
          {originalPrice && (
            <div className="text-2xl font-semibold tracking-tight opacity-40 line-through">
              {originalPrice}
            </div>
          )}
        </div>
        {price && (
          <div className={cn("text-sm mt-1", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
            billed every 6 months ({price}/6 months)
          </div>
        )}
      </div>
    );
  }

  // Annual subscription mode (shows per-month price)
  if (displayMode === 'annually') {
    return (
      <div className="mb-1">
        <div className="flex flex-shrink-0 justify-between items-baseline">
          <div className="flex items-baseline gap-1">
            <div className="text-4xl font-semibold text-orange-400 tracking-tight">
              {formatPrice(perMonthPrice)}
            </div>
            <span className={cn("text-lg", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
              /mo
            </span>
          </div>
          {originalPrice && (
            <div className="text-2xl font-semibold tracking-tight opacity-40 line-through">
              {formatPrice(originalPrice)}
            </div>
          )}
        </div>
        {price && (
          <div className={cn("text-sm mt-1", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
            billed annually ({formatPrice(price)}/year)
          </div>
        )}
      </div>
    );
  }

  // Yearly subscription mode (shows yearly price prominently, no monthly breakdown)
  if (displayMode === 'yearly') {
    return (
      <div className="mb-1">
        <div className="flex shrink-0 justify-between items-baseline">
          <div className="text-5xl font-semibold text-orange-400 tracking-tight">
            {formatPrice(price)}
            <span className={cn("text-sm mt-1", isDark ? 'text-gray-300' : 'text-gray-900')}>
              /year
            </span>
          </div>
        </div>
      </div>
    );
  }

  // One dollar promo mode - shows $1 for first billing period, then original price after
  if (displayMode === 'one-dollar-promo') {
    return (
      <div className="mb-1">
        <div className="flex shrink-0 justify-between items-baseline">
          <div className="flex items-baseline gap-1">
            <div className="text-4xl font-semibold text-orange-400 tracking-tight">
              {formatPrice(price) || '$1'}
            </div>
            <span className={cn("text-lg", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
              / 1st month
            </span>
          </div>
        </div>
        <div className={cn("text-sm mt-1", isDark ? 'text-gray-300' : 'text-muted-foreground')}>
          Then {formatPrice('$12.99')}/month
        </div>
      </div>
    );
  }

  return null;
}

