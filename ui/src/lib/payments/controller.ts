import { paddleDriver } from './providers/paddle';

export type PaymentProvider = 'paddle';

export interface CreateCheckoutInput {
  provider: PaymentProvider;
  sku: string; // e.g., SATUS-001 (default) with additional: ["paddle:pro_..."]
  user: {
    userPoolId: string;
    email?: string;
    givenName?: string;
    familyName?: string;
  };
  successUrl: string;
  cancelUrl: string;
  currency?: string; // default USD
  bundleUuid?: string; // for webhook passthrough
}

export interface CreateCheckoutResult {
  token: string; // client token for overlay
  items: Array<{ priceId: string; quantity?: number }>;
  customer?: { email?: string; firstName?: string; lastName?: string };
  settings?: { successUrl?: string; cancelUrl?: string };
  // Include both, as Paddle variations have used either
  customData?: Record<string, unknown>;
  passthrough?: Record<string, unknown> | string;
}

export async function createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
  switch (input.provider) {
    case 'paddle':
      return paddleDriver.createCheckout(input);
    default:
      throw new Error(`Unsupported provider: ${input.provider}`);
  }
}


