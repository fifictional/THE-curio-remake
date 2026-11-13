'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useAnalytics } from '@/providers/analytics-provider';

type Variant = 'A' | 'B';

interface ABTestContextValue {
  variant: Variant | null;
  testName: string;
}

const ABTestContext = createContext<ABTestContextValue>({ variant: null, testName: '' });

interface ABTestProviderProps {
  children: React.ReactNode;
  testName: string;
}

export function ABTestProvider({ children, testName }: ABTestProviderProps) {
  const { track } = useAnalytics();
  const [variant, setVariant] = useState<Variant | null>(null);

  useEffect(() => {
    try {
      const localStorageKey = `ab_test_${testName}`;
      const search = typeof window !== 'undefined' ? window.location.search : '';
      const enforced = search ? new URLSearchParams(search).get('variant') : null;
      
      if (enforced === 'A' || enforced === 'B') {
        if (typeof window !== 'undefined') localStorage.setItem(localStorageKey, enforced);
        setVariant(enforced);
        track('ab_test_variant_assigned', { testName, variant: enforced });
        return;
      }
      
      const existing = typeof window !== 'undefined' ? localStorage.getItem(localStorageKey) : null;
      if (existing === 'A' || existing === 'B') {
        setVariant(existing);
        return;
      }
      
      const v: Variant = Math.random() < 0.5 ? 'A' : 'B';
      if (typeof window !== 'undefined') localStorage.setItem(localStorageKey, v);
      setVariant(v);
      track('ab_test_variant_assigned', { testName, variant: v });
    } catch {
      setVariant('A');
    }
  }, [testName, track]);

  // Don't render children until variant is determined
  if (!variant) {
    return null;
  }

  return (
    <ABTestContext.Provider value={{ variant, testName }}>
      {children}
    </ABTestContext.Provider>
  );
}

export function useABTest(): { variant: Variant; testName: string } {
  const ctx = useContext(ABTestContext);
  if (!ctx.variant) {
    throw new Error('useABTest must be used within ABTestProvider and variant must be determined');
  }
  // At this point, variant is guaranteed to be non-null because provider waits before rendering
  return {
    variant: ctx.variant,
    testName: ctx.testName,
  };
}