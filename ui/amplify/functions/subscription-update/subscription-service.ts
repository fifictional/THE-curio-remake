/**
 * Subscription service for managing CurioSubscription records
 */

import { Schema } from '../../data/resource';
import { SubscriptionUpdateBody, SubscriptionTier } from './types';
import crypto from 'crypto';

/**
 * Maps Paddle subscription status to our schema enum values
 * 
 * Paddle uses "canceled" (American spelling) but our schema uses "cancelled" (British spelling)
 * 
 * @param paddleStatus - The status string from Paddle webhook
 * @returns A valid status enum value for CurioSubscription
 */
function mapPaddleStatusToSchemaStatus(paddleStatus: string): 'active' | 'paused' | 'cancelled' | 'past_due' | 'trialing' {
  const statusLower = paddleStatus.toLowerCase().trim();
  
  // Log the original status for debugging
  console.log('[subscription-update] Mapping Paddle status to schema status', { 
    originalStatus: paddleStatus,
    normalizedStatus: statusLower 
  });
  
  // Map Paddle statuses to our schema enum values
  // Note: Paddle uses "canceled" but our schema uses "cancelled"
  if (statusLower === 'active') {
    return 'active';
  }
  if (statusLower === 'paused' || statusLower === 'pause') {
    return 'paused';
  }
  if (statusLower === 'cancelled' || statusLower === 'canceled') {
    return 'cancelled'; // Map American "canceled" to British "cancelled"
  }
  if (statusLower === 'past_due' || statusLower === 'pastdue') {
    return 'past_due';
  }
  if (statusLower === 'trialing' || statusLower === 'trial') {
    return 'trialing';
  }
  
  // Default to active if status is unknown
  console.warn('[subscription-update] Unknown Paddle status, defaulting to active', { paddleStatus });
  return 'active';
}

/**
 * Finds an existing subscription for a user
 * 
 * @param userId - The user ID to search for
 * @param client - Amplify GraphQL client
 * @returns The existing subscription if found, null otherwise
 * @throws Error if the database query fails
 */
export async function findExistingSubscription(
  userId: string,
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>
) {
  const result = await client.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt({
    userId,
  });

  if (result.errors) {
    console.error('[subscription-update] Error listing subscriptions', JSON.stringify(result.errors));
    throw new Error(result.errors[0].message);
  }

  return result.data && result.data.length > 0 ? result.data[0] : null;
}

/**
 * Determines the subscription tier based on product ID
 * 
 * Compares the first item's product_id against the Ultra Curio product ID
 * to determine if the subscription is 'ultra' or 'super'.
 * 
 * @param items - Array of subscription items from Paddle
 * @param ultraProductId - The product ID for Ultra Curio tier
 * @returns 'ultra' if product matches Ultra Curio, 'super' otherwise
 */
export function determineTier(
  items: SubscriptionUpdateBody['data']['items'],
  ultraProductId: string
): SubscriptionTier {
  const isUltraCurio = items.length > 0 && items[0].price.product_id === ultraProductId;
  return isUltraCurio ? 'ultra' : 'super';
}

/**
 * Calculates the subscription amount from items
 * 
 * @param items - Array of subscription items from Paddle
 * @returns The amount in cents, or 0 if no items
 */
export function calculateAmount(
  items: SubscriptionUpdateBody['data']['items']
): number {
  return items.length > 0 ? items[0].price.unit_price.amount : 0;
}

/**
 * Updates an existing subscription record
 * 
 * @param subscriptionId - The subscription ID to update
 * @param body - The Paddle webhook payload
 * @param tier - The subscription tier ('super' or 'ultra')
 * @param client - Amplify GraphQL client
 * @throws Error if the update operation fails
 */
export async function updateSubscription(
  subscriptionId: string,
  body: SubscriptionUpdateBody,
  tier: SubscriptionTier,
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>
) {
  // Check and log current_billing_period
  console.log('[subscription-update] Updating subscription - body value:', JSON.stringify(body));
  console.log('[subscription-update] Updating subscription - current_billing_period value:', JSON.stringify(body.data.current_billing_period));
  
  if (!body.data.current_billing_period) {
    console.warn('[subscription-update] current_billing_period is null or undefined while updating subscription', {
      operation: 'updateSubscription',
      subscriptionId,
      status: body.data.status,
      eventName: body.event_name,
    });
  }

  const updateData: any = {
    subscriptionId,
    provider: 'paddle',
    status: mapPaddleStatusToSchemaStatus(body.data.status),
    tier,
    cancelledAt: body.data.canceled_at,
    pausedAt: body.data.paused_at,
    updatedAt: new Date().toISOString(),
  };

  // Only update billing period fields if provided
  // When subscription is canceled, current_billing_period is null, so we don't update end dates
  // This preserves the existing end date, allowing access until the period ends
  if (body.data.current_billing_period) {
    updateData.currentPeriodStart = body.data.current_billing_period.starts_at;
    updateData.currentPeriodEnd = body.data.current_billing_period.ends_at;
    updateData.nextBillingDate = body.data.current_billing_period.ends_at;
  }

  const response = await client.models.CurioSubscription.update(updateData);

  if (response.errors) {
    console.error('[subscription-update] Error updating subscription', JSON.stringify(response.errors));
    throw new Error(response.errors[0].message);
  }

  return response.data;
}

/**
 * Creates a new subscription record
 * 
 * @param body - The Paddle webhook payload
 * @param tier - The subscription tier ('super' or 'ultra')
 * @param client - Amplify GraphQL client
 * @returns The created subscription record
 * @throws Error if the create operation fails
 */
export async function createSubscription(
  body: SubscriptionUpdateBody,
  tier: SubscriptionTier,
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>
) {
  // Check and log current_billing_period
  console.log('[subscription-update] Creating subscription - current_billing_period value:', JSON.stringify(body.data.current_billing_period));
  
  if (!body.data.current_billing_period) {
    console.warn('[subscription-update] current_billing_period is null or undefined while creating subscription', {
      operation: 'createSubscription',
      userId: body.data.custom_data.userId,
      subscriptionId: body.data.id,
      status: body.data.status,
      eventName: body.event_name,
    });
  }

  const createData: any = {
    subscriptionId: crypto.randomUUID(),
    userId: body.data.custom_data.userId,
    provider: 'paddle',
    status: mapPaddleStatusToSchemaStatus(body.data.status),
    tier,
    providerSubscriptionId: body.data.id,
    providerCustomerId: body.data.customer_id,
    cancelledAt: body.data.canceled_at,
    pausedAt: body.data.paused_at,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Only set billing period fields if provided
  if (body.data.current_billing_period) {
    createData.currentPeriodStart = body.data.current_billing_period.starts_at;
    createData.currentPeriodEnd = body.data.current_billing_period.ends_at;
    createData.nextBillingDate = body.data.current_billing_period.ends_at;
  }

  const response = await client.models.CurioSubscription.create(createData);

  if (response.errors) {
    console.error('[subscription-update] Error creating subscription', JSON.stringify(response.errors));
    throw new Error(response.errors[0].message);
  }

  return response.data;
}

