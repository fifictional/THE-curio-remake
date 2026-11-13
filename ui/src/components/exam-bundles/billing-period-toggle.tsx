import { cn } from "@/lib/utils";
import { BillingPeriod } from "@/hooks/use-billing-period";

interface BillingPeriodToggleProps {
  billingPeriod: BillingPeriod;
  onBillingPeriodChange: (period: BillingPeriod) => void;
  showMostPopularBadge?: boolean;
  showSavingsBadge?: boolean;
}

export function BillingPeriodToggle({
  billingPeriod,
  onBillingPeriodChange,
  showMostPopularBadge = true,
  showSavingsBadge = true,
}: BillingPeriodToggleProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
        <button
          onClick={() => onBillingPeriodChange('monthly')}
          className={cn(
            "px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
            billingPeriod === 'monthly'
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          )}
        >
          Monthly
        </button>
        <div className="relative">
          {showMostPopularBadge && (
            <div className="absolute -top-3 -right-5 bg-orange-400 text-white text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
              Most Popular
            </div>
          )}
          <button
            onClick={() => onBillingPeriodChange('annually')}
            className={cn(
              "px-6 py-2 rounded-full text-sm font-medium transition-all cursor-pointer",
              billingPeriod === 'annually'
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            )}
          >
            Annually
            {showSavingsBadge && (
              <span className="ml-2 text-xs text-green-600 font-semibold">Save 40%</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

