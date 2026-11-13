import { useQuery } from '@tanstack/react-query';
import { PaddlePriceData, PaddlePricePreviewRequest, PaddlePricePreviewResponse } from '@/lib/types/paddle';

interface UsePaddlePricesParams {
  priceIds: string[];
  countryCode?: string | null;
  discountId?: string | undefined;
  enabled?: boolean;
}

interface UsePaddlePricesResult {
  prices: Map<string, PaddlePriceData> | null;
  isLoading: boolean;
  error: Error | null;
}

async function fetchPaddlePrices(
  priceIds: string[],
  countryCode?: string | null,
  discountId?: string | undefined
): Promise<Map<string, PaddlePriceData>> {
  if (!priceIds || priceIds.length === 0) {
    return new Map<string, PaddlePriceData>();
  }
  const requestBody: PaddlePricePreviewRequest = {
    priceIds,
    countryCode: countryCode || undefined,
    discountId: discountId || undefined,
  };

  const response = await fetch('/api/paddle/prices', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || 'Failed to fetch prices');
  }

  const data: PaddlePricePreviewResponse = await response.json();

  // Convert array to Map for easy lookup by priceId
  const pricesMap = new Map<string, PaddlePriceData>();
  data.prices.forEach(price => {
    pricesMap.set(price.priceId, price);
  });

  return pricesMap;
}

export function usePaddlePrices({
  priceIds,
  countryCode,
  discountId = undefined,
  enabled = true,
}: UsePaddlePricesParams): UsePaddlePricesResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ['paddle-prices', priceIds, countryCode, discountId ],
    queryFn: () => fetchPaddlePrices(priceIds, countryCode, discountId),
    enabled: enabled && priceIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });

  return {
    prices: data || null,
    isLoading,
    error: error as Error | null,
  };
}

