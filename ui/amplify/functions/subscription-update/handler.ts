/**
 * Lambda entry point for Paddle subscription update webhooks
 * 
 * This is a minimal entry point that:
 * 1. Initializes Amplify and dependencies
 * 2. Delegates to the main handler function
 * 3. Handles top-level errors
 */

import { Schema } from '../../data/resource';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { env } from '$amplify/env/subscription-update';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/api';
import { FunctionUrlEvent } from './types';
import { handleSubscriptionUpdate, HandlerDependencies } from './subscription-handler';
import { getMixpanel } from '../../utils/mixpanel';
import { getUserPoolId, getUser } from '../../utils/lambda-utils';
import { withSentryLambdaHandler } from '../common/sentry-lambda';

// Initialize Amplify and GraphQL client
const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
  env as any
);

Amplify.configure(resourceConfig, libraryOptions);
const client = generateClient<Schema>();

/**
 * Lambda handler entry point
 * 
 * Initializes dependencies and delegates to the main handler function
 */
const subscriptionUpdateHandler = async (event: FunctionUrlEvent) => {
  const dependencies: HandlerDependencies = {
    client,
    env: {
      PADDLE_SECRET: env.PADDLE_SECRET,
      PADDLE_API_KEY: env.PADDLE_API_KEY,
      ENVIRONMENT: env.ENVIRONMENT,
      ULTRA_CURIO_PRODUCT_ID: env.ULTRA_CURIO_PRODUCT_ID,
      CUSTOMERIO_API_KEY: process.env.CUSTOMERIO_API_KEY,
      LOOPS_API_KEY: process.env.LOOPS_API_KEY,
    },
    getMixpanel,
    getUserPoolId,
    getUser,
  };

  try {
    return await handleSubscriptionUpdate(event, dependencies);
  } catch (error) {
    console.error('[subscription-update] Unhandled error', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
      }),
    };
  }
};

export const handler = withSentryLambdaHandler(subscriptionUpdateHandler);