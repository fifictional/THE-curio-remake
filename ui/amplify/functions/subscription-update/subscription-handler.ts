/**
 * Main subscription update handler orchestration logic
 */

import { FunctionUrlEvent, SubscriptionUpdateBody, LambdaResponse, CustomerData } from './types';
import { Schema } from '../../data/resource';
import { extractPaddleSignature, validatePaddleSignature } from '../common/paddle';
import { findExistingSubscription, determineTier, calculateAmount, updateSubscription, createSubscription } from './subscription-service';
import { createFutureUser } from './future-user-service';
import { getCustomerEmail } from './paddle-client';
import { getMixpanel } from '../../utils/mixpanel';
import { trackMetaConversion } from '../../utils/meta';
import { getUserPoolId, getUser } from '../../utils/lambda-utils';
import { updateGiftSubscriptionAttributes } from './customerio-utils';
import { updateLoopsContact } from '../../auth/utils/loops';
import { updateDataCustomerIO } from '../../auth/utils/customerio';

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
    LOOPS_API_KEY?: string;
  };
  getMixpanel: typeof getMixpanel;
  getUserPoolId: typeof getUserPoolId;
  getUser: typeof getUser;
}

/**
 * Main handler function for processing Paddle subscription update webhooks
 * 
 * Flow:
 * 1. Extract and validate Paddle signature
 * 2. Parse webhook body
 * 3. Check if subscription exists for user
 * 4. Branch A: No userId -> Create future user (user purchased before account creation)
 * 5. Branch B: Has userId -> Process subscription update/create
 *    - Get user from Cognito
 *    - Determine tier and amount
 *    - Update existing subscription OR create new subscription
 *    - Track analytics events
 * 
 * @param event - Lambda Function URL event
 * @param dependencies - Injected dependencies for testing
 * @returns HTTP response with status code and body
 */
export async function handleSubscriptionUpdate(
  event: FunctionUrlEvent,
  dependencies: HandlerDependencies
): Promise<LambdaResponse> {
  console.log('[subscription-update] Starting subscription update', {
    headers: event.headers,
    hasBody: !!event.body
  });

  // Step 1: Extract Paddle signature from headers (case-insensitive)
  const paddleSignature = extractPaddleSignature(event.headers);
  if (!paddleSignature) {
    console.error('[subscription-update] Missing Paddle signature header');
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
      console.error('[subscription-update] Invalid Paddle signature');
      return {
        statusCode: 401,
        body: JSON.stringify({
          success: false,
          message: 'Invalid Paddle signature',
        }),
      };
    }
  } catch (error) {
    console.error('[subscription-update] Signature validation error', error);
    return {
      statusCode: 401,
      body: JSON.stringify({
        success: false,
        message: 'Invalid Paddle signature',
      }),
    };
  }

  // Step 3: Parse webhook body
  const body = JSON.parse(event.body) as SubscriptionUpdateBody;

  // Note: If we have recipientEmail, the customer who made the purchase
  // is not the same as the user who is receiving the gift

  // Step 4: Check if subscription already exists
  const existingSubscription = await findExistingSubscription(
    body.data.custom_data.userId,
    dependencies.client
  );

  // Branch A: No userId - User purchased before creating account
  // This can be either:
  // 1. Partner purchase (has partnerCode) - create future user for partner
  // 2. Gift purchase (has recipientEmail) - create future user for recipient and update Customer.io
  if (!body.data.custom_data.userId) {
    console.log('[subscription-update] Creating future user', JSON.stringify(body));

    // Create a wrapper function that uses dependencies.env for API key and environment
    const getCustomerEmailWithDeps = async (
      customerId: string
    ): Promise<CustomerData> => {
      return getCustomerEmail(
        customerId,
        dependencies.env.PADDLE_API_KEY,
        dependencies.env.ENVIRONMENT
      );
    };

    // Create future user (for partner or gift recipient)
    await createFutureUser(
      body,
      dependencies.client,
      getCustomerEmailWithDeps,
      dependencies.env.ULTRA_CURIO_PRODUCT_ID
    );

    // If this is a gift (has recipientEmail), update Customer.io with gift attributes
    if (body.data.custom_data.recipientEmail) {
      const recipientEmail = body.data.custom_data.recipientEmail;
      const recipientMessage = body.data.custom_data.recipientMessage;
      const tier = determineTier(body.data.items, dependencies.env.ULTRA_CURIO_PRODUCT_ID);

      // Get sender information from Paddle API (customer_id is the sender's ID for gifts)
      const sender = await getCustomerEmailWithDeps(body.data.customer_id);

      if (dependencies.env.CUSTOMERIO_API_KEY) {
        await updateGiftSubscriptionAttributes(
          recipientEmail,
          sender.email,
          sender.name,
          tier,
          recipientMessage,
          dependencies.env.CUSTOMERIO_API_KEY
        );
      } else {
        console.warn('[subscription-update] CUSTOMERIO_API_KEY not set, skipping gift attributes update');
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Future user created',
      }),
    };
  }

  // Branch B: Has userId - Process subscription update/create
  // Step 5: Initialize analytics
  const mixpanelClient = await dependencies.getMixpanel();
  if (mixpanelClient) {
    mixpanelClient.people.set(body.data.custom_data.userId, {});
  }

  // Step 6: Get user from Cognito
  const userPoolId = dependencies.getUserPoolId();
  if (!userPoolId) {
    throw new Error('User pool ID is not set');
  }

  const user = await dependencies.getUser(userPoolId, body.data.custom_data.userId);
  if (!user) {
    console.error('[subscription-update] User not found', body.data.custom_data.userId);
    throw new Error('User not found');
  }

  // Step 7: Determine subscription tier and amount
  const tier = determineTier(body.data.items, dependencies.env.ULTRA_CURIO_PRODUCT_ID);
  const amount = calculateAmount(body.data.items);

  // Step 8: Update existing subscription OR create new subscription
  if (existingSubscription) {
    // Update existing subscription
    if (mixpanelClient) {
      mixpanelClient.track('subscription_updated', {
        distinct_id: body.data.custom_data.userId,
        subscription_id: existingSubscription.subscriptionId,
        provider: 'paddle',
        tier,
        amount: amount / 100,
        sku: body.data.custom_data.sku,
        status: body.data.status,
        event_name: body.event_name,
      });
    }

    await updateSubscription(
      existingSubscription.subscriptionId,
      body,
      tier,
      dependencies.client
    );

    const updateData = { plan: tier, planPurchaseDate: new Date().toISOString(), planCancelDate: body.data.canceled_at }
    await updateLoopsContact({ email: body.data.custom_data.recipientEmail ?? body.data.custom_data.email, ...updateData })
    await updateDataCustomerIO({email: body.data.custom_data.recipientEmail ?? body.data.custom_data.email ?? '', ...updateData} )

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Subscription updated',
      }),
    };
  } else {
    // Create new subscription
    if (mixpanelClient) {
      mixpanelClient.track('subscription_created', {
        distinct_id: body.data.custom_data.userId,
        provider: 'paddle',
        tier,
        amount: amount / 100,
        sku: body.data.custom_data.sku,
        status: body.data.status,
        event_name: body.event_name,
      });
    }

    // Track Meta conversion event
    const userEmail = user.Attributes?.find((attr) => attr.Name === 'email')?.Value || '';
    const givenName = user.Attributes?.find((attr) => attr.Name === 'given_name')?.Value || '';
    const familyName = user.Attributes?.find((attr) => attr.Name === 'family_name')?.Value || '';

    trackMetaConversion(
      userEmail,
      body.data.custom_data.userId,
      'Purchase',
      givenName,
      familyName,
      {
        tier,
        amount: amount / 100,
        sku: body.data.custom_data.sku,
        status: body.data.status,
      }
    );

    await createSubscription(body, tier, dependencies.client);
    const updateData = { plan: tier, planPurchaseDate: new Date().toISOString(), planCancelDate: body.data.canceled_at }
    await updateLoopsContact({ email: body.data.custom_data.recipientEmail ?? body.data.custom_data.email, ...updateData})
    await updateDataCustomerIO({email: body.data.custom_data.recipientEmail ?? body.data.custom_data.email ?? '', ...updateData} )
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Subscription created',
      }),
    };
  }
}

