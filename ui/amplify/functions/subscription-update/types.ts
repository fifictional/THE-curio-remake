/**
 * Type definitions for the subscription-update lambda function
 */

/**
 * Lambda Function URL event structure
 */
export interface FunctionUrlEvent {
  version: string;
  rawPath: string;
  rawQueryString: string;
  headers: {
    [key: string]: string;
  };
  requestContext: any;
  body: string;
  isBase64Encoded: boolean;
}

/**
 * Paddle webhook payload structure for subscription updates
 */
export interface SubscriptionUpdateBody {
  data: {
    id: string;
    status: string;
    started_at: string;
    custom_data: {
      sku: string;
      userId: string;
      envIdentifier: string;
      partnerCode?: string;
      tier?: string;
      recipientEmail?: string;
      recipientMessage?: string;
      email?: string;
    };
    items: {
      price: {
        id: string;
        product_id: string;
        unit_price: {
          amount: number;
          currency_code: string;
        };
      }
    }[];
    customer_id: string;
    next_billed_at: string;
    canceled_at: string;
    paused_at: string;
    current_billing_period: {
      starts_at: string;
      ends_at: string;
    }
  };
  event_name: string;
}

/**
 * Customer data type - re-exported from common paddle utilities
 */
export type { CustomerData } from '../common/paddle';

/**
 * Subscription tier type
 */
export type SubscriptionTier = 'super' | 'ultra';

/**
 * Lambda response structure
 */
export interface LambdaResponse {
  statusCode: number;
  body: string;
}

