/**
 * Common Paddle utilities for webhook validation and API client functions
 */

import crypto from 'crypto';

/**
 * Paddle API customer response structure
 * Actual type has more fields, but we only need the name and email
 * @see https://developer.paddle.com/api-reference/customers/get-customer
 */
export interface GetCustomerResponse {
  data: {
    name: string;
    email: string;
  }
}

/**
 * Customer data extracted from Paddle API
 */
export interface CustomerData {
  name: string;
  email: string;
}

/**
 * Extracts the Paddle signature from request headers (case-insensitive)
 * 
 * @param headers - Request headers object
 * @returns The Paddle signature string, or empty string if not found
 */
export function extractPaddleSignature(headers: { [key: string]: string }): string {
  return Object.keys(headers).reduce((acc, key) => {
    if (key.toLowerCase() === 'paddle-signature') {
      return headers[key];
    }
    return acc;
  }, '');
}

/**
 * Validates a Paddle webhook signature to ensure the request is authentic
 * 
 * This function implements Paddle's signature verification algorithm:
 * 1. Extracts timestamp (ts) and signature hash (h1) from the signature header
 * 2. Validates timestamp is not older than 5 seconds (prevents replay attacks)
 * 3. Computes HMAC SHA256 of "ts:rawBody" using the secret
 * 4. Compares computed signature with provided signature using timing-safe comparison
 * 
 * @param signature - The Paddle-Signature header value (format: "ts=1234567890;h1=abc123...")
 * @param body - The raw request body (must not be transformed/parsed)
 * @param secret - The Paddle webhook secret from environment
 * @returns true if signature is valid, false otherwise
 * @throws Error if secret is not set or signature format is invalid
 */
export function validatePaddleSignature(signature: string, body: string, secret: string): boolean {
  if (!secret) {
    throw new Error('PADDLE_SECRET is not set');
  }
  if (!signature) {
    throw new Error('Paddle-Signature is not set');
  }

  // Parse signature header: format is "ts=1234567890;h1=abc123..."
  const parts = signature.split(';');
  let ts: string | null = null;
  let h1: string | null = null;

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') {
      ts = value;
    } else if (key === 'h1') {
      h1 = value;
    }
  }

  // Both timestamp and signature hash are required
  if (!ts || !h1) {
    return false;
  }

  // Check timestamp to prevent replay attacks (5 second tolerance)
  const currentTime = Math.floor(Date.now() / 1000);
  const timestampAge = currentTime - parseInt(ts);
  if (timestampAge > 5) {
    return false; // Reject events older than 5 seconds
  }

  // Build signed payload: ts:rawBody (don't transform the raw body!)
  const signedPayload = `${ts}:${body}`;

  // Hash the signed payload using HMAC SHA256
  const computedSignature = crypto.createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  // Compare signatures using timing-safe comparison to prevent timing attacks
  // Note: timingSafeEqual requires buffers of equal length, so we check length first
  // This is still secure as we're not leaking information about the actual hash values
  const computedBuffer = Buffer.from(computedSignature, 'hex');
  const providedBuffer = Buffer.from(h1, 'hex');
  
  if (computedBuffer.length !== providedBuffer.length) {
    return false; // Different lengths mean invalid signature
  }

  return crypto.timingSafeEqual(computedBuffer, providedBuffer);
}

/**
 * Fetches customer information from Paddle API
 * 
 * Paddle webhooks don't include customer email in the payload, so we need to
 * fetch it separately from their API when creating future users.
 * 
 * @param customerId - The Paddle customer ID
 * @param apiKey - The Paddle API key
 * @param environment - Environment ('prod' or 'sandbox') to determine API base URL
 * @returns Customer data (name and email)
 * @throws Error if API key is missing, API request fails, or response is invalid
 */
export async function getCustomerEmail(
  customerId: string,
  apiKey: string,
  environment: string
): Promise<CustomerData> {
  if (!apiKey) {
    throw new Error('PADDLE_API_KEY is not set or is empty');
  }

  // Determine API base URL based on environment
  const baseUrl = environment === 'prod' 
    ? 'https://api.paddle.com' 
    : 'https://sandbox-api.paddle.com';
  const fetchUrl = `${baseUrl}/customers/${customerId}`;

  console.log('[paddle] Fetching customer', { 
    customerId, 
    secretLength: apiKey.length, 
    secretPrefix: apiKey.substring(0, 10) 
  });

  const response = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[paddle] Failed to get customer email', {
      status: response.status,
      statusText: response.statusText,
      url: fetchUrl,
      errorBody: errorText,
    });
    throw new Error(
      `Failed to get customer email: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json() as GetCustomerResponse;
  return data.data;
}

