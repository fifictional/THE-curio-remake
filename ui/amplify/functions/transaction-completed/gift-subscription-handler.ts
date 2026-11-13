/**
 * Main gift subscription handler for transaction.completed events
 */

import { FunctionUrlEvent, TransactionCompletedBody, LambdaResponse } from './types';
import { Schema } from '../../data/resource';
import { extractPaddleSignature, validatePaddleSignature } from '../common/paddle';
import { getMixpanel } from '../../utils/mixpanel';
import { getUserPoolId, getUser } from '../../utils/lambda-utils';
import { Analytics } from '@customerio/cdp-analytics-node';
import { getCustomerEmail, type CustomerData } from '../common/paddle';
import { trackMetaConversion } from '../../utils/meta';
import crypto from 'crypto';

/**
 * Dependencies interface for dependency injection (enables testing)
 */
export interface HandlerDependencies {
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>;
  env: {
    PADDLE_SECRET: string;
    PADDLE_API_KEY: string;
    ENVIRONMENT: string;
    ULTRA_CURIO_PRODUCT_ID: string;
    CUSTOMERIO_API_KEY?: string;
    MIXPANEL_TOKEN?: string;
  };
  getMixpanel: typeof getMixpanel;
  getUserPoolId: typeof getUserPoolId;
  getUser: typeof getUser;
}

/**
 * Determines subscription tier based on SKU
 */
function determineTierFromSku(sku: string): 'super' | 'ultra' {
  return sku.startsWith('ULTRA_CURIO') ? 'ultra' : 'super';
}

/**
 * Determines if subscription is monthly or yearly based on SKU
 */
function determineBillingPeriod(sku: string): 'monthly' | 'yearly' {
  return sku.includes('MONTH') ? 'monthly' : 'yearly';
}

/**
 * Validates if a date is a valid date
 */
function isValidDate(date: string): boolean {
  return !isNaN(new Date(date).getTime());
}

/**
 * Calculates end date based on start date and billing period
 */
function calculateEndDate(startDate: string, billingPeriod: 'monthly' | 'yearly'): string {
  const start = new Date(startDate);
  const end = new Date(start);
  
  if (billingPeriod === 'monthly') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setFullYear(end.getFullYear() + 1);
  }
  
  return end.toISOString();
}

/**
 * Finds user by email in Cognito
 */
async function findUserByEmail(
  userPoolId: string,
  email: string,
  getUserFn: typeof getUser
): Promise<{ userId: string; email: string } | null> {
  // Note: This is a simplified approach. In production, you might want to
  // maintain an email-to-userId mapping or use a different lookup method
  // For now, we'll need to list users or use a different approach
  // This is a placeholder - you may need to implement a proper email lookup
  return null;
}

/**
 * Creates a FutureUser for gift recipient (standard pattern for gifts)
 * The subscription will be granted when the user signs up
 */
async function createGiftFutureUser(
  recipientEmail: string,
  subscriptionStartDate: string,
  billingPeriod: 'monthly' | 'yearly',
  tier: 'super' | 'ultra',
  transactionId: string,
  client: ReturnType<typeof import('aws-amplify/api').generateClient<Schema>>
): Promise<void> {
  // validate subscriptionStartDate is a valid date and convert to ISO string
  if (!isValidDate(subscriptionStartDate)) {
    throw new Error('Invalid subscriptionStartDate');
  }
  subscriptionStartDate = new Date(subscriptionStartDate).toISOString();

  const endDate = calculateEndDate(subscriptionStartDate, billingPeriod);
  
  // Check if future user already exists
  const existingFutureUser = await client.models.FutureUser.listFutureUserByEmail({
    email: recipientEmail,
  });

  if (existingFutureUser.data && existingFutureUser.data.length > 0) {
    console.log('[transaction-completed] Future user already exists for gift recipient', { recipientEmail });
    // Update the existing future user with new subscription dates
    const futureUser = existingFutureUser.data[0];
    await client.models.FutureUser.update({
      futureUserUuid: futureUser.futureUserUuid,
      subStartDate: subscriptionStartDate,
      subEndDate: endDate,
      tier,
      provider: 'flylane',
      subscriptionGranted: false,
      updatedAt: new Date().toISOString(),
    } as any);
    return;
  }

  // Create new future user
  const response = await client.models.FutureUser.create({
    futureUserUuid: crypto.randomUUID(),
    email: recipientEmail,
    firstName: '',
    lastName: '',
    partnershipUuid: null,
    subStartDate: subscriptionStartDate,
    subEndDate: endDate,
    provider: 'flylane',
    tier,
    subscriptionGranted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as any);

  if (response.errors) {
    console.error('[transaction-completed] Error creating gift future user', JSON.stringify(response.errors));
    throw new Error(response.errors[0].message);
  }

  console.log('[transaction-completed] Gift future user created', { recipientEmail, futureUserUuid: response.data?.futureUserUuid });
}

/**
 * Sends gift event to Customer.io
 */
async function sendGiftEventToCustomerIO(
  recipientEmail: string,
  senderEmail: string,
  senderName: string,
  tier: 'super' | 'ultra',
  message: string | undefined,
  subscriptionStartDate: string,
  billingPeriod: 'monthly' | 'yearly',
  apiKey: string
): Promise<void> {
  if (!apiKey) {
    console.warn('[transaction-completed] CUSTOMERIO_API_KEY not set, skipping Customer.io event');
    return;
  }

  try {
    const analytics = new Analytics({
      writeKey: apiKey,
      host: 'https://cdp-eu.customer.io',
    });

    await analytics.track({
      userId: recipientEmail,
      event: 'paddle_gift',
      properties: {
        tier,
        billingPeriod,
        subscriptionStartDate,
        message: message || '',
        senderEmail,
        senderName,
      }
    }, (err: any) => {
      if (err) {
        console.error('[transaction-completed] Error sending gift event to Customer.io:', err);
      } else {
        console.log('[transaction-completed] Gift event sent to Customer.io for:', recipientEmail);
      }
    });

    await analytics.closeAndFlush();
  } catch (error) {
    console.error('[transaction-completed] Error sending gift event to Customer.io:', error);
    // Don't throw - we don't want Customer.io failures to break the flow
  }
}

/**
 * Sends gift event to Mixpanel
 */
async function sendGiftEventToMixpanel(
  recipientEmail: string,
  senderEmail: string,
  tier: 'super' | 'ultra',
  billingPeriod: 'monthly' | 'yearly',
  subscriptionStartDate: string,
  transactionId: string,
  getMixpanelFn: typeof getMixpanel
): Promise<void> {
  try {
    const mixpanelClient = await getMixpanelFn();
    if (!mixpanelClient) {
      console.warn('[transaction-completed] Mixpanel client not available, skipping event');
      return;
    }

    mixpanelClient.track('paddle_gift', {
      distinct_id: recipientEmail,
      recipient_email: recipientEmail,
      sender_email: senderEmail,
      tier,
      billing_period: billingPeriod,
      subscription_start_date: subscriptionStartDate,
      transaction_id: transactionId,
    });
  } catch (error) {
    console.error('[transaction-completed] Error sending gift event to Mixpanel:', error);
    // Don't throw - we don't want Mixpanel failures to break the flow
  }
}

/**
 * Main handler function for processing Paddle transaction.completed webhooks for gifts
 * 
 * Flow:
 * 1. Extract and validate Paddle signature
 * 2. Parse webhook body
 * 3. Extract gift information from custom_data
 * 4. Determine tier and billing period from SKU
 * 5. Create single-period subscription
 * 6. Send events to Customer.io and Mixpanel
 * 
 * @param event - Lambda Function URL event
 * @param dependencies - Injected dependencies for testing
 * @returns HTTP response with status code and body
 */
export async function handleTransactionCompleted(
  event: FunctionUrlEvent,
  dependencies: HandlerDependencies
): Promise<LambdaResponse> {
  console.log('[transaction-completed] Starting transaction completed handler', {
    headers: event.headers,
    hasBody: !!event.body
  });

  // Step 1: Extract Paddle signature from headers
  const paddleSignature = extractPaddleSignature(event.headers);
  if (!paddleSignature) {
    console.error('[transaction-completed] Missing Paddle signature header');
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Missing Paddle signature',
      }),
    };
  }

  // Step 2: Validate signature
  try {
    const isValid = validatePaddleSignature(
      paddleSignature,
      event.body,
      dependencies.env.PADDLE_SECRET
    );
    if (!isValid) {
      console.error('[transaction-completed] Invalid Paddle signature');
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: 'Invalid Paddle signature',
        }),
      };
    }
  } catch (error) {
    console.error('[transaction-completed] Signature validation error', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: 'Invalid Paddle signature',
      }),
    };
  }

  // Step 3: Parse webhook body
  const body = JSON.parse(event.body) as TransactionCompletedBody;

  // Step 4: Check if this is a gift transaction
  if (!body.data.custom_data.recipientEmail) {
    console.log('[transaction-completed] Not a gift transaction, skipping');
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Not a gift transaction',
      }),
    };
  }

  const recipientEmail = body.data.custom_data.recipientEmail;
  const recipientMessage = body.data.custom_data.recipientMessage;
  const subscriptionStartDate = body.data.custom_data.subscriptionStartDate;
  const sku = body.data.custom_data.sku;

  if (!subscriptionStartDate) {
    console.error('[transaction-completed] Missing subscriptionStartDate in custom_data');
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        message: 'Missing subscriptionStartDate',
      }),
    };
  }

  // Step 5: Determine tier and billing period from SKU
  const tier = determineTierFromSku(sku);
  const billingPeriod = determineBillingPeriod(sku);

  // Step 6: Get sender information (customer_id is the sender)
  let senderEmail = body.data.custom_data.email || '';
  let senderName = '';
  
  try {
    const sender = await getCustomerEmail(
      body.data.customer_id,
      dependencies.env.PADDLE_API_KEY,
      dependencies.env.ENVIRONMENT
    );
    senderEmail = sender.email;
    senderName = sender.name;
  } catch (error) {
    console.error('[transaction-completed] Error fetching sender info from Paddle', error);
    // Continue with email from custom_data if available
  }

  // Step 7: Create gift future user (subscription will be granted when user signs up)
  try {
    await createGiftFutureUser(
      recipientEmail,
      subscriptionStartDate,
      billingPeriod,
      tier,
      body.data.id,
      dependencies.client
    );
  } catch (error) {
    console.error('[transaction-completed] Error creating gift future user', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Failed to create gift future user',
      }),
    };
  }
  

  // Step 8: Send events to Customer.io, Mixpanel, and Meta
  if (dependencies.env.CUSTOMERIO_API_KEY) {
    await sendGiftEventToCustomerIO(
      recipientEmail,
      senderEmail,
      senderName,
      tier,
      recipientMessage,
      subscriptionStartDate,
      billingPeriod,
      dependencies.env.CUSTOMERIO_API_KEY
    );
  }

  // Track Meta conversion event for the sender (purchaser)
  // Calculate amount from items (same as subscription-update handler)
  const amount = body.data.items && body.data.items.length > 0 
    ? parseInt(body.data.items[0].price.unit_price.amount, 10) 
    : 0;
  const senderUserId = body.data.custom_data.userId || '';
  const senderNameParts = senderName.split(' ');
  const senderGivenName = senderNameParts[0] || '';
  const senderFamilyName = senderNameParts.slice(1).join(' ') || '';

  await trackMetaConversion(
    senderEmail,
    senderUserId,
    'Purchase',
    senderGivenName,
    senderFamilyName,
    {
      tier,
      amount: amount / 100,
      sku: body.data.custom_data.sku,
      status: body.data.status,
      is_gift: true,
      recipient_email: recipientEmail,
    }
  );

  // Send Mixpanel events
  if (dependencies.env.MIXPANEL_TOKEN) {
    const mixpanelClient = await dependencies.getMixpanel();
    
    if (mixpanelClient) {
      // Track gift event (for recipient)
      await sendGiftEventToMixpanel(
        recipientEmail,
        senderEmail,
        tier,
        billingPeriod,
        subscriptionStartDate,
        body.data.id,
        dependencies.getMixpanel
      );

      // Track purchase event (for sender)
      mixpanelClient.track('purchase', {
        distinct_id: senderUserId || senderEmail,
        email: senderEmail,
        tier,
        amount: amount / 100,
        sku: body.data.custom_data.sku,
        status: body.data.status,
        is_gift: true,
        recipient_email: recipientEmail,
      });
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      success: true,
      message: 'Gift subscription created',
    }),
  };
}

