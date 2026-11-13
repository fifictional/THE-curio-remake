/**
 * Type definitions for the transaction-completed lambda function
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
 * Paddle webhook payload structure for transaction.completed events
 */
export interface TransactionCompletedBody {
  event_id: string;
  event_type: string;
  occurred_at: string;
  notification_id: string;
  data: {
    id: string;
    status: string;
    custom_data: {
      sku: string;
      userId?: string;
      envIdentifier: string;
      partnerCode?: string;
      tier?: string;
      recipientEmail?: string;
      recipientMessage?: string;
      subscriptionStartDate?: string;
      email?: string;
    };
    items: {
      price: {
        id: string;
        product_id: string;
        unit_price: {
          amount: string;
          currency_code: string;
        };
        billing_cycle?: {
          interval: string;
          frequency: number;
        } | null;
      };
      quantity: number;
    }[];
    customer_id: string;
    billing_period?: {
      starts_at: string;
      ends_at: string;
    };
    subscription_id?: string;
  };
}

/**
 * Lambda response structure
 */
export interface LambdaResponse {
  statusCode: number;
  body: string;
}

