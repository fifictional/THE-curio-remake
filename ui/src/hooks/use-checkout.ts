"use client";

import { useAnalytics } from '@/providers';
import { initializePaddle } from '@paddle/paddle-js';
import { useState, useCallback } from 'react';
import { useSendToCio } from './useSendToCio';

export type CustomerData = {
  email: string;
  userId: string;
}

type CheckoutPayload = {
  provider?: 'paddle';
  sku: string;
  currency?: string;
  partnerCode?: string;
  customerData?: CustomerData;
  discountCode?: string;
  countryCode?: string;
  successUrl?: string;
  recipientEmail?: string;
  recipientMessage?: string;
  subscriptionStartDate?: string;
  sourcePage?: string;
};

export function useCheckout(getPriceIdForSku: (sku: string) => string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { track } = useAnalytics();

  const { sendToCio } = useSendToCio();

  const startCheckout = useCallback(async ({ provider = 'paddle', sku, currency, partnerCode, customerData, discountCode, successUrl, countryCode, recipientEmail, recipientMessage, subscriptionStartDate, sourcePage }: CheckoutPayload) => {
    setIsLoading(true);
    setError(null);

    track('checkout_started', { 
      sku, 
      ...(discountCode && { discountCode }), 
      ...(partnerCode && { partnerCode }),
      ...(sourcePage && { sourcePage }),
    });

    // Send checkout open event to Customer.io (same event name as Mixpanel)
    if (customerData?.email) {
      try {
        await sendToCio({
          email: customerData.email,
          event: 'checkout_started',
          eventProperties: {
            sku,
            ...(discountCode && { discountCode }),
            ...(partnerCode && { partnerCode }),
            ...(sourcePage && { sourcePage }),
          },
        })
      } catch (err) {
        // Don't fail checkout if Customer.io call fails
        console.error('[use-checkout] Error sending to Customer.io:', err);
      }
    }

    try {
      if (provider === 'paddle' && getPriceIdForSku(sku)) {
        const paddle = await initializePaddle({
          token: process.env.NEXT_PUBLIC_PADDLE_TOKEN || '',
          environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox' ? "sandbox" : "production",
          ...(customerData && {
            pwCustomer: {
              email: customerData?.email || 'test@test.com',
            }
          }),
        });
        if (!paddle) {
          throw new Error('Failed to initialize Paddle');
        }

        // Build checkout configuration
        const defaultSuccessUrl = `${process.env.NEXT_PUBLIC_ENVIRONMENT_HOST}/exam-bundles?p=${sku}`;
        const checkoutConfig: any = {
          items: [{ priceId: getPriceIdForSku(sku) || '', quantity: 1 }],
          ...(customerData && {
            customer: {
              email: customerData?.email || 'test@test.com',
              ...(countryCode && {
                address: {
                  country_code: countryCode,
                },
              }),
            },
          }),
          settings: {
            displayMode: "overlay",
            variant: "one-page",
            successUrl: successUrl || defaultSuccessUrl || '',
          },
          customData: {
            sku: sku,
            userId: customerData?.userId || '',
            envIdentifier: process.env.NEXT_PUBLIC_ENVIRONMENT_IDENTIFIER || '',
            tier: sku.startsWith('ULTRA_CURIO') ? 'ultra' : 'super',
            partnerCode: partnerCode,
            recipientEmail: recipientEmail,
            recipientMessage: recipientMessage,
            email: customerData?.email,
            subscriptionStartDate: subscriptionStartDate,
          },
        };

        // Add discount code if provided
        if (discountCode) {
          checkoutConfig.discountCode = discountCode;
        }

        paddle.Checkout.open(checkoutConfig);
      }
      /*      const res = await fetch('/api/payments/checkout', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ provider, sku, currency }),
            });
            if (!res.ok) {
              const text = await res.text();
              throw new Error(text || 'Checkout failed');
            }
            const { token, items, customer, settings } = await res.json();
      
            // Lazy load Paddle overlay script if needed
            if (!window.Paddle) {
              await new Promise<void>((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
                script.async = true;
                script.onload = () => resolve();
                script.onerror = () => reject(new Error('Failed to load Paddle'));
                document.body.appendChild(script);
              });
            }
      
            // Initialize with client token
            await window.Paddle?.Initialize({ token });
      
            // Open overlay
            await window.Paddle?.Checkout.open({
              items,
              customer,
              settings,
            });*/
    } catch (e: any) {
      setError(e?.message || 'Checkout error');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, [getPriceIdForSku, sendToCio]);

  return { startCheckout, isLoading, error };
}
