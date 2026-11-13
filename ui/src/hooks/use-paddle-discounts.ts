import { useQuery } from '@tanstack/react-query';
import { PaddleDiscountRequest } from '@/lib/types/paddle';

interface UsePaddleDiscountsParams {
  discountCodes: string[];
  enabled?: boolean;
}

interface UsePaddleDiscountsResult {
  discounts: Map<string, string> | null; // Map of code -> discountId
  isLoading: boolean;
  error: Error | null;
}

async function fetchPaddleDiscounts(
  discountCodes: string[]
): Promise<Map<string, string>> {
  const requestBody: PaddleDiscountRequest = {
    discountCodes,
  };

  const response = await fetch('/api/paddle/discounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to fetch discount codes');
  }

  const data = await response.json();

  // Convert the plain object back to a Map
  const discountsMap = new Map<string, string>();
  if (data.discounts) {
    Object.entries(data.discounts).forEach(([code, discountId]) => {
      discountsMap.set(code, discountId as string);
    });
  }

  // Log warnings if any
  if (data.warnings && data.warnings.length > 0) {
    console.warn('[usePaddleDiscounts] Warnings:', data.warnings);
  }

  return discountsMap;
}

export function usePaddleDiscounts({
  discountCodes,
  enabled = true,
}: UsePaddleDiscountsParams): UsePaddleDiscountsResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['paddle-discounts', discountCodes],
    queryFn: () => fetchPaddleDiscounts(discountCodes),
    enabled: enabled && discountCodes.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes (discounts change less frequently than prices)
    retry: 2,
    retryDelay: 1000,
  });

  return {
    discounts: data || null,
    isLoading,
    error: error as Error | null,
  };
}

