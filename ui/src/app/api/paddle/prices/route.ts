import { NextRequest, NextResponse } from 'next/server';
import { PaddlePricePreviewRequest, PaddlePricePreviewResponse, PaddleApiPricePreviewResponse, PaddlePriceData, PaddleApiLineItem } from '@/lib/types/paddle';
import { buildPaddleApiUrl } from '@/lib/payments/providers/paddle';

export async function POST(request: NextRequest) {
  try {
    const body: PaddlePricePreviewRequest = await request.json();
    const { priceIds, countryCode, discountId } = body;

    if (!priceIds || priceIds.length === 0) {
      return NextResponse.json(
        { error: 'priceIds array is required' },
        { status: 400 }
      );
    }

    const paddleApiKey = process.env.PADDLE_PRICING_API_KEY;
    if (!paddleApiKey) {
      console.error('[Paddle API] PADDLE_PRICING_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const paddleApiUrl = buildPaddleApiUrl('pricing-preview');

    // Build the request body for Paddle's Price Preview API
    const paddleRequestBody: any = {
      items: priceIds.map(priceId => ({
        price_id: priceId,
        quantity: 1,
      })),
    };

    // Add customer address if country code is provided
    if (countryCode) {
      paddleRequestBody.address = {
          country_code: countryCode,
      };
    }

    // Add discount ID if provided
    if (discountId) {
      paddleRequestBody.discount_id = discountId;
    }

    console.log("[paddle] request body", JSON.stringify(paddleRequestBody, null, 2));

    // Call Paddle's Price Preview API
    const paddleResponse = await fetch(paddleApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${paddleApiKey}`,
      },
      body: JSON.stringify(paddleRequestBody),
    });

    if (!paddleResponse.ok) {
      const errorText = await paddleResponse.text();
      console.error('[Paddle API] Error response:', {
        status: paddleResponse.status,
        statusText: paddleResponse.statusText,
        body: errorText,
        priceIds,
        countryCode,
      });
      return NextResponse.json(
        { error: 'Failed to fetch prices from Paddle', details: errorText },
        { status: paddleResponse.status }
      );
    }

    const paddleData: PaddleApiPricePreviewResponse = await paddleResponse.json();

    // Transform Paddle's response to our format
    const prices: PaddlePriceData[] = paddleData.data.details.line_items.map(item => ({
      priceId: item.price.id,
      amount: item.totals.total,
      currencyCode: paddleData.data.currency_code,
      formattedPrice: item.formatted_totals.total,
    }));
    
    // Log the transformed prices for debugging
    const response: PaddlePricePreviewResponse = { prices };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[Paddle API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error?.message },
      { status: 500 }
    );
  }
}
