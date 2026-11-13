import { NextRequest, NextResponse } from 'next/server';
import { PaddleDiscountRequest, PaddleDiscountResponse, PaddleApiDiscountResponse } from '@/lib/types/paddle';
import { buildPaddleApiUrl } from '@/lib/payments/providers/paddle';

export async function POST(request: NextRequest) {
  try {
    const body: PaddleDiscountRequest = await request.json();
    const { discountCodes } = body;

    if (!discountCodes || discountCodes.length === 0) {
      return NextResponse.json(
        { error: 'discountCodes array is required' },
        { status: 400 }
      );
    }

    const paddleApiKey = process.env.PADDLE_PRICING_API_KEY;
    if (!paddleApiKey) {
      console.error('[Paddle Discounts API] PADDLE_PRICING_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Build a map to store code -> discountId
    const discountsMap = new Map<string, string>();
    const errors: string[] = [];

    // Fetch each discount code from Paddle
    // Note: Paddle's discount API requires fetching by code as a query parameter
    for (const code of discountCodes) {
      try {
        const paddleApiUrl = buildPaddleApiUrl(`discounts?code=${encodeURIComponent(code)}`);

        const paddleResponse = await fetch(paddleApiUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${paddleApiKey}`,
          },
        });

        if (!paddleResponse.ok) {
          const errorText = await paddleResponse.text();
          console.error('[Paddle Discounts API] Error response:', {
            status: paddleResponse.status,
            statusText: paddleResponse.statusText,
            body: errorText,
            code,
          });
          errors.push(`Failed to fetch discount code "${code}": ${paddleResponse.statusText}`);
          continue;
        }

        const paddleData: PaddleApiDiscountResponse = await paddleResponse.json();

        // Find the matching discount in the response
        const matchingDiscount = paddleData.data.find(d => d.code === code);
        if (matchingDiscount) {
          discountsMap.set(code, matchingDiscount.id);
        } else {
          errors.push(`Discount code "${code}" not found in response`);
        }
      } catch (error: any) {
        console.error('[Paddle Discounts API] Error fetching code:', { code, error: error?.message });
        errors.push(`Error fetching discount code "${code}": ${error?.message}`);
      }
    }

    // Convert Map to plain object for JSON serialization
    const discountsObject: Record<string, string> = {};
    discountsMap.forEach((value, key) => {
      discountsObject[key] = value;
    });

    const response: PaddleDiscountResponse = {
      discounts: discountsMap,
    };

    // Log any errors but still return successful ones
    if (errors.length > 0) {
      console.warn('[Paddle Discounts API] Some discount codes could not be fetched:', errors);
    }

    // Serialize the Map manually since NextResponse.json doesn't handle Maps well
    return NextResponse.json({
      discounts: discountsObject,
      ...(errors.length > 0 && { warnings: errors }),
    });
  } catch (error: any) {
    console.error('[Paddle Discounts API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}

