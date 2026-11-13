/**
 * Future User service for handling users who purchase before account creation
 */

import { Schema } from '../../data/resource';
import { SubscriptionUpdateBody, CustomerData, SubscriptionTier } from './types';
import { determineTier } from './subscription-service';
import { v4 as uuidv4 } from 'uuid';
import { generateClient } from 'aws-amplify/api';

/**
 * Client type for Amplify GraphQL client
 */
type Client = ReturnType<typeof generateClient<Schema>>;

/**
 * Validates that a partner code is present in the webhook payload
 * 
 * @param partnerCode - The partner code from custom_data
 * @throws Error if partner code is missing
 */
export function validatePartnerCode(partnerCode?: string): asserts partnerCode is string {
  if (!partnerCode) {
    throw new Error('Partner code is not set');
  }
}

/**
 * Validates that either a partner code or recipient email is present
 * 
 * For regular purchases (like one-dollar promo), we fetch email from Paddle API.
 * For gifts, recipientEmail is provided in custom_data.
 * For partners, partnerCode is provided in custom_data.
 * 
 * @param partnerCode - The partner code from custom_data
 * @param recipientEmail - The recipient email from custom_data (for gifts)
 * @throws Error if neither partner code nor recipient email is present
 */
export function validatePartnerCodeOrRecipient(partnerCode?: string, recipientEmail?: string): void {
  // This validation is now optional - regular purchases can create future users
  // by fetching email from Paddle API using customer_id
  // Keeping function for backward compatibility but no longer throwing error
}

/**
 * Finds a partnership by partner code
 * 
 * @param partnerCode - The partner code to search for
 * @param client - Amplify GraphQL client
 * @returns The partnership record if found
 * @throws Error if query fails or partnership not found
 */
export async function findPartnership(
  partnerCode: string,
  client: Client
) {
  const partnership = await client.models.Partnership.listPartnershipByPartnerCode({
    partnerCode,
  });

  if (partnership.errors) {
    console.error('[subscription-update] Error listing partnership', JSON.stringify(partnership.errors));
    throw new Error(partnership.errors[0].message);
  }

  if (!partnership.data || partnership.data.length === 0) {
    throw new Error('Partnership not found');
  }

  return partnership.data[0];
}

/**
 * Checks if a future user already exists for the given email
 * 
 * This makes the operation idempotent - if a future user already exists,
 * we can safely skip creation.
 * 
 * @param email - The email address to check
 * @param client - Amplify GraphQL client
 * @returns true if future user exists, false otherwise
 */
export async function checkExistingFutureUser(
  email: string,
  client: Client
): Promise<boolean> {
  const existingFutureUser = await client.models.FutureUser.listFutureUserByEmail({
    email,
  });

  return !!(existingFutureUser.data && existingFutureUser.data.length > 0);
}

/**
 * Creates a future user record
 * 
 * Future users are created when someone purchases a subscription before
 * creating an account. When they later sign up, their account will be
 * linked to this future user record.
 * 
 * @param email - Customer email from Paddle
 * @param name - Customer name from Paddle
 * @param partnershipUuid - The partnership UUID
 * @param body - The Paddle webhook payload
 * @param client - Amplify GraphQL client
 * @param ultraProductId - The Ultra Curio product ID for tier determination
 * @returns The created future user record
 * @throws Error if creation fails
 */
export async function createFutureUserRecord(
  email: string,
  name: string,
  partnershipUuid: string | undefined,
  body: SubscriptionUpdateBody,
  client: Client,
  ultraProductId: string
) {
  // Determine tier from product_id in Paddle items (most reliable)
  // Fallback to custom_data.tier if items are not available
  const tier: SubscriptionTier = body.data.items && body.data.items.length > 0
    ? determineTier(body.data.items, ultraProductId)
    : ((body.data.custom_data.tier || 'super') as SubscriptionTier);

  // Check and log current_billing_period
  console.log('[subscription-update] Creating future user - current_billing_period value:', JSON.stringify(body.data.current_billing_period));
  
  if (!body.data.current_billing_period) {
    console.warn('[subscription-update] current_billing_period is null or undefined while creating future user', {
      operation: 'createFutureUser',
      email,
      subscriptionId: body.data.id,
      status: body.data.status,
      eventName: body.event_name,
    });
  }

  const futureUserData: any = {
    futureUserUuid: uuidv4(),
    email,
    firstName: name || '',
    lastName: '',
    partnershipUuid: partnershipUuid || null, // null if no partnership (for gifts)
    provider: 'paddle',
    tier,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Only set billing period fields if provided
  if (body.data.current_billing_period) {
    futureUserData.subStartDate = body.data.current_billing_period.starts_at;
    futureUserData.subEndDate = body.data.current_billing_period.ends_at;
  }

  const futureUser = await client.models.FutureUser.create(futureUserData);

  if (futureUser.errors) {
    console.error('[subscription-update] Error creating future user', JSON.stringify(futureUser.errors));
    throw new Error(futureUser.errors[0].message);
  }

  return futureUser.data;
}

/**
 * Main function to create a future user from a Paddle webhook
 * 
 * Flow:
 * 1. Determine email and partnership based on purchase type:
 *    - If recipientEmail is set: Use recipientEmail directly (for gifts and regular purchases)
 *    - If partnerCode is set (but no recipientEmail): Find partnership and fetch customer email from Paddle API
 * 2. Check if future user already exists (idempotency)
 * 3. Create future user record if needed
 * 
 * @param body - The Paddle webhook payload
 * @param client - Amplify GraphQL client
 * @param getCustomerEmailFn - Function to fetch customer data from Paddle API (takes only customerId)
 * @param ultraProductId - The Ultra Curio product ID for tier determination
 * @throws Error at any step if validation or creation fails
 */
export async function createFutureUser(
  body: SubscriptionUpdateBody,
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>,
  getCustomerEmailFn: (customerId: string) => Promise<CustomerData>,
  ultraProductId: string
): Promise<void> {
  // Step 1: Determine email and partnership based on purchase type
  let email: string;
  let name: string;
  let partnershipUuid: string | undefined;

  if (body.data.custom_data.recipientEmail) {
    // Gift flow: Use recipientEmail directly from custom_data
    email = body.data.custom_data.recipientEmail;
    // For gifts, we don't have the recipient's name from Paddle, so use empty string
    name = '';
    // Gifts don't have a partnership
    partnershipUuid = undefined;
  } else if (body.data.custom_data.partnerCode) {
    // Partner flow: Find partnership and fetch customer email from Paddle API
    const partnership = await findPartnership(body.data.custom_data.partnerCode!, client);
    partnershipUuid = partnership.partnershipUuid;

    // Fetch customer email from Paddle API
    const customer = await getCustomerEmailFn(body.data.customer_id);
    if (!customer || !customer.email) {
      throw new Error('Failed to get customer email');
    }
    email = customer.email;
    name = customer.name;
  } else {
    // Regular purchase flow (like one-dollar promo): Fetch customer email from Paddle API
    const customer = await getCustomerEmailFn(body.data.customer_id);
    if (!customer || !customer.email) {
      throw new Error('Failed to get customer email from Paddle API');
    }
    email = customer.email;
    name = customer.name;
    // Regular purchases don't have a partnership
    partnershipUuid = undefined;
  }

  // Step 3: Check if future user already exists (idempotency)
  const exists = await checkExistingFutureUser(email, client);
  if (exists) {
    console.log('[subscription-update] User already in future user table', { email });
    return; // Idempotent - already exists, no need to create again
  }

  // Step 4: Create future user record
  const futureUser = await createFutureUserRecord(
    email,
    name,
    partnershipUuid || '', // Empty string if no partnership (for gifts)
    body,
    client,
    ultraProductId
  );

  console.log('[subscription-update] Future user created', JSON.stringify(futureUser));
}

