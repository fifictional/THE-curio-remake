import { useState, useCallback } from 'react';
import { useAnalytics } from '@/providers';

export type BillingPeriod = 'monthly' | 'annually';

export function useBillingPeriod(defaultPeriod: BillingPeriod = 'monthly') {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>(defaultPeriod);
  const { track } = useAnalytics();

  const handleSetBillingPeriod = useCallback((period: BillingPeriod) => {
    setBillingPeriod(period);
    track('billing_period_changed', { billingPeriod: period });
  }, [track]);

  return {
    billingPeriod,
    setBillingPeriod: handleSetBillingPeriod,
  };
}

