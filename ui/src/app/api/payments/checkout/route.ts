import { NextRequest, NextResponse } from 'next/server';
import { createCheckout } from '@/lib/payments/controller';
import { getUserId, cookieBasedClient } from '@/lib/ssr/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provider = 'paddle', sku, currency } = body || {} as { provider?: 'paddle'; sku: string; currency?: string };

    if (!sku) return NextResponse.json({ error: 'Missing sku' }, { status: 400 });

    const userPoolId = await getUserId();
    if (!userPoolId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    // Prefill user profile if available
    let email: string | undefined;
    let givenName: string | undefined;
    let familyName: string | undefined;
    try {
      const tokens = await (await import('aws-amplify/auth')).fetchAuthSession();
      email = tokens?.tokens?.idToken?.payload?.email as string | undefined;
      givenName = tokens?.tokens?.idToken?.payload?.given_name as string | undefined;
      familyName = tokens?.tokens?.idToken?.payload?.family_name as string | undefined;
    } catch {}

    // Build success/cancel URLs server-side
    const base = process.env.NEXT_PUBLIC_APP_BASE_URL || '';
    let successUrl = `${base}/payments/${provider}/success`;
    let cancelUrl = `${base}/payments/${provider}/cancel`;

    // Resolve sku: if not a paddle id, map from Bundle.additionalSkus -> 'paddle:*'
    let effectiveSku = sku as string | undefined;
    if (!effectiveSku) {
      return NextResponse.json({ error: 'Invalid sku' }, { status: 400 });
    }

    if (!effectiveSku.toLowerCase().startsWith('paddle:')) {
      try {
        const bundles = await cookieBasedClient.models.Bundle.list({ selectionSet: ['bundleUuid', 'name', 'defaultSku', 'additionalSkus'] as any });
        const bundle = (bundles.data || []).find((b: any) => b?.defaultSku === effectiveSku);
        if (!bundle) {
          return NextResponse.json({ error: 'Invalid sku' }, { status: 400 });
        }
        const additional = bundle?.additionalSkus || [];
        for (const s of additional) {
          if (s?.toLowerCase().startsWith('paddle:pro_')) {
            effectiveSku = s;
            break;
          }
        }
        console.log('[checkout] sku mapping', { requested: sku, matchedBundle: bundle?.bundleUuid, name: bundle?.name, effectiveSku });
        if (process.env.NEXT_PADDLE_SUCCESS_HOOK_PATH) {
          successUrl = `${base}/${process.env.NEXT_PADDLE_SUCCESS_HOOK_PATH}`
        }
        if (process.env.NEXT_PADDLE_CANCEL_HOOK_PATH) {
          cancelUrl = `${base}/${process.env.NEXT_PADDLE_CANCEL_HOOK_PATH}`
        }
      } catch {}
    }

    if (!effectiveSku) {
      return NextResponse.json({ error: 'Invalid sku' }, { status: 400 });
    }
  
    console.log('[checkout] creating checkout', { provider, sku: effectiveSku, originalSku: sku, currency: currency || 'USD' });
    const result = await createCheckout({
      provider,
      sku: effectiveSku,
      currency,
      user: { userPoolId, email, givenName, familyName },
      successUrl,
      cancelUrl,
      bundleUuid: sku, // v1 passthrough; original sku used as bundle id
    });
    console.log('[checkout] created checkout');

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Checkout failed' }, { status: 500 });
  }
}


