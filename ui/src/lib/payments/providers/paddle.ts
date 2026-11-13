import type { CreateCheckoutInput, CreateCheckoutResult } from '../controller';

/**
 * Builds the full Paddle API URL for the given path.
 * @param path - API path without leading slash (e.g., 'pricing-preview', 'prices', 'client-tokens')
 */
export function buildPaddleApiUrl(path: string): string {
  const paddleEnv = (process.env.NEXT_PUBLIC_PADDLE_ENV || '').toLowerCase();
  const base = paddleEnv === 'sandbox'
    ? 'https://sandbox-api.paddle.com'
    : 'https://api.paddle.com';
  return `${base}/${path}`;
}

function maskKey(key?: string) {
  if (!key) return 'none';
  if (key.length <= 8) return `${key.slice(0, 4)}...`;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[paddle] HTTP error', {
      url,
      status: res.status,
      body: text,
    });
    throw new Error(`Paddle API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

async function getPriceIdForProduct({
  productId,
  currency,
}: {
  productId: string;
  currency: string;
}): Promise<string> {
  // List prices for product and pick the matching currency
  const data = await fetchJson<any>(
    buildPaddleApiUrl(`prices?product_id=${encodeURIComponent(productId)}`),
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    },
  );
  const prices = (data?.data || []) as Array<any>;
  const currencies = prices.map((p) => p.currency_code || p.unit_price?.currency_code);
  console.log('[paddle] resolved prices for product', { productId, currency, count: prices.length, currencies });
  const match = prices.find((p) => (p.currency_code || p.unit_price?.currency_code)?.toUpperCase() === currency.toUpperCase());
  if (!match) {
    console.error('[paddle] no matching price for currency', { productId, currency });
    throw new Error(`No price for product ${productId} in ${currency}`);
  }
  console.log('[paddle] price match', { priceId: match.id, currency: match.currency_code || match.unit_price?.currency_code });
  return match.id; // pri_...
}

async function generateClientToken(name: string): Promise<string> {
  console.log('[paddle] generating client token', { key: maskKey(process.env.PADDLE_API_KEY), name });
  // Create a short-lived client token for overlay
  const data = await fetchJson<{ data: { token: string } }>(buildPaddleApiUrl('client-tokens'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name })
  });
  return data.data.token;
}

function pickPaddleSku(additional: string[] | undefined): string | null {
  if (!additional) return null;
  const paddleSku = additional.find((s) => s.toLowerCase().startsWith('paddle:'));
  if (!paddleSku) return null;
  return paddleSku.split(':', 2)[1] || null; // may be pro_... or pri_...
}

export const paddleDriver = {
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const currency = (input.currency || 'USD').toUpperCase();

    // Resolve sku to paddle product/price id
    // For v1, we hard-code mapping: fetch Bundle by sku default 'SATUS-001'? The UI provides known sku.
    // The Bundle schema stores additional: ["paddle:<id>"] where <id> may be pro_... or pri_...

    // Fetch bundle by sku default via public API to read sku.additional
    // Minimal: the client will pass the paddle id directly later; for now read from server via Data API

    // Since we don't have a direct server fetch helper here, accept that input.sku === default sku and query via public API would need client context.
    // KISS: Require caller to also pass the paddle id via input.sku if it contains a colon; otherwise treat as bundleUuid or default sku key not resolvable here.

    let paddleId = input.sku.includes(':') ? input.sku.split(':', 2)[1] : input.sku;

    // If product id (pro_), resolve to price id (pri_) for currency
    if (paddleId.startsWith('pro_')) {
      console.log('[paddle] resolving product to price', { productId: paddleId, currency });
      paddleId = await getPriceIdForProduct({ productId: paddleId, currency });
    }

    if (!paddleId.startsWith('pri_')) {
      throw new Error('Expected a Paddle price id pri_* after resolution');
    }

    const token = await generateClientToken(input.user.userPoolId || 'overlay');
    console.log('[paddle] checkout ready', { priceId: paddleId, successUrl: input.successUrl, cancelUrl: input.cancelUrl });

    // Prepare custom_data for webhook processing
    // bundleUuid contains the original SKU (e.g., "SATUS-001") before paddle ID resolution
    const customData = {
      sku: input.bundleUuid || input.sku, // Original SKU for bundle lookup
      userId: input.user.userPoolId,
      envIdentifier: process.env.NEXT_PUBLIC_ENVIRONMENT_IDENTIFIER || '',
    };

    return {
      token,
      items: [{ priceId: paddleId }],
      customer: {
        email: input.user.email,
        firstName: input.user.givenName,
        lastName: input.user.familyName,
      },
      settings: {
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
      },
      customData,
      passthrough: customData, // Include as passthrough for compatibility
    };
  },
};


