import { generateClient } from 'aws-amplify/data';
import { type Schema } from '@amplify/data/resource';
import outputs from '@/../amplify_outputs.json';
import { Amplify } from 'aws-amplify';

// Configure Amplify for server-side use
Amplify.configure(outputs, { ssr: true });

// Create API key authenticated client for server-side operations
const client = generateClient<Schema>({ authMode: 'apiKey' });

type FulfillmentArgs = {
  sku: string;
  userId: string;
  provider: 'manual' | 'stripe' | 'paddle' | 'google' | 'apple' | 'other';
  receiptPayload?: Record<string, unknown> | null;
};

/**
 * Fulfills a purchase by looking up the bundle SKU and creating Purchase/Receipt records
 */
export async function fulfillPurchase(args: FulfillmentArgs): Promise<{ success: boolean; bundleUuid?: string }> {
  const { sku, userId, provider, receiptPayload } = args;

  if (!sku || !userId) {
    throw new Error('Missing required fields: sku and userId');
  }

  // 1. Look up bundle by SKU (check defaultSku first, then additionalSkus)
  const bundlesResponse = await client.models.Bundle.list({
    filter: { defaultSku: { eq: sku } },
    selectionSet: ['bundleUuid', 'name', 'defaultSku', 'additionalSkus'],
  });

  let bundle = bundlesResponse.data?.[0];

  // If not found by defaultSku, scan for additionalSkus (client-side filter)
  if (!bundle) {
    const allBundlesResponse = await client.models.Bundle.list({
      selectionSet: ['bundleUuid', 'name', 'defaultSku', 'additionalSkus'],
    });
    const allBundles = allBundlesResponse.data || [];
    for (const b of allBundles) {
      if (b.additionalSkus?.includes(sku)) {
        bundle = b;
        break;
      }
    }
  }

  if (!bundle) {
    throw new Error(`No bundle found for SKU: ${sku}`);
  }

  // Call the fulfillPurchase Lambda function via custom query
  // This function has resource-level authorization to create Purchase/Receipt records
  const queryArgs: any = {
    sku,
    userId,
    provider,
  };
  
  // Only include receiptPayload if it exists
  if (receiptPayload) {
    queryArgs.receiptPayload = receiptPayload;
  }
  
  const result = await client.queries.fulfillPurchase(queryArgs);

  if (result.errors) {
    throw new Error(`Fulfillment failed: ${result.errors[0].message}`);
  }

  if (!result.data) {
    throw new Error('Fulfillment failed: No data returned');
  }

  console.log('[fulfillment] Purchase fulfilled', {
    userId,
    bundleUuid: result.data.bundleUuid,
    sku,
    provider,
    receiptId: result.data.receiptId,
    warning: result.data.warning,
  });

  return {
    success: result.data.success,
    bundleUuid: result.data.bundleUuid || undefined,
  };
}


