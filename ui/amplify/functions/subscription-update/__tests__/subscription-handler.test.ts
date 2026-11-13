/**
 * Unit tests for subscription handler orchestration logic
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { handleSubscriptionUpdate, HandlerDependencies } from '../subscription-handler';
import { FunctionUrlEvent, SubscriptionUpdateBody } from '../types';
import * as validationModule from '../../common/paddle';
import * as subscriptionServiceModule from '../subscription-service';
import * as futureUserServiceModule from '../future-user-service';
import * as paddleClientModule from '../paddle-client';

// Mock all modules
vi.mock('../../functions/subscription-update/validation');
vi.mock('../../functions/subscription-update/subscription-service');
vi.mock('../../functions/subscription-update/future-user-service');
vi.mock('../../functions/subscription-update/paddle-client');
vi.mock('../../utils/mixpanel');
vi.mock('../../utils/meta');
vi.mock('../../utils/lambda-utils');

describe('handleSubscriptionUpdate', () => {
  const mockDependencies: HandlerDependencies = {
    client: {} as any,
    env: {
      PADDLE_SECRET: 'test-secret',
      PADDLE_API_KEY: 'test-api-key',
      ENVIRONMENT: 'sandbox',
      ULTRA_CURIO_PRODUCT_ID: 'prod_ultra',
    },
    getMixpanel: vi.fn().mockResolvedValue(null),
    getUserPoolId: vi.fn().mockReturnValue('pool_123'),
    getUser: vi.fn(),
  };

  const createMockEvent = (body: any): FunctionUrlEvent => ({
    version: '1.0',
    rawPath: '/',
    rawQueryString: '',
    headers: {
      'paddle-signature': 'ts=1234567890;h1=valid-hash',
    },
    requestContext: {},
    body: JSON.stringify(body),
    isBase64Encoded: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 400 when signature is missing', async () => {
    const event = createMockEvent({});
    delete event.headers['paddle-signature'];

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('');

    const result = await handleSubscriptionUpdate(event, mockDependencies);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toEqual({
      success: false,
      message: 'Missing Paddle signature',
    });
  });

  test('should return 401 when signature is invalid', async () => {
    const event = createMockEvent({});
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: 'user_123',
          envIdentifier: 'test',
        },
        items: [],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.updated',
    };
    event.body = JSON.stringify(body);

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('invalid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(false);

    const result = await handleSubscriptionUpdate(event, mockDependencies);

    expect(result.statusCode).toBe(401);
    expect(JSON.parse(result.body)).toEqual({
      success: false,
      message: 'Invalid Paddle signature',
    });
  });

  test('should create future user when userId is missing', async () => {
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: '',
          envIdentifier: 'test',
          partnerCode: 'partner123',
        },
        items: [],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.created',
    };
    const event = createMockEvent(body);

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
    vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
    vi.spyOn(futureUserServiceModule, 'createFutureUser').mockResolvedValue(undefined);

    const result = await handleSubscriptionUpdate(event, mockDependencies);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: 'Future user created',
    });
    expect(futureUserServiceModule.createFutureUser).toHaveBeenCalled();
  });

  test('should update existing subscription', async () => {
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: 'user_123',
          envIdentifier: 'test',
        },
        items: [{
          price: {
            id: 'price_123',
            product_id: 'prod_super',
            unit_price: {
              amount: 5000,
              currency_code: 'USD',
            },
          },
        }],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.updated',
    };
    const event = createMockEvent(body);

    const mockSubscription = { subscriptionId: 'sub_123', userId: 'user_123' };
    const mockUser = {
      Attributes: [
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'given_name', Value: 'John' },
        { Name: 'family_name', Value: 'Doe' },
      ],
    };

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
    vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(mockSubscription as any);
    vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
    vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(5000);
    vi.spyOn(subscriptionServiceModule, 'updateSubscription').mockResolvedValue(mockSubscription as any);
    (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const result = await handleSubscriptionUpdate(event, mockDependencies);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: 'Subscription updated',
    });
    expect(subscriptionServiceModule.updateSubscription).toHaveBeenCalled();
  });

  test('should create new subscription when not exists', async () => {
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: 'user_123',
          envIdentifier: 'test',
        },
        items: [{
          price: {
            id: 'price_123',
            product_id: 'prod_ultra',
            unit_price: {
              amount: 10000,
              currency_code: 'USD',
            },
          },
        }],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.created',
    };
    const event = createMockEvent(body);

    const mockUser = {
      Attributes: [
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'given_name', Value: 'John' },
        { Name: 'family_name', Value: 'Doe' },
      ],
    };
    const mockCreated = { subscriptionId: 'sub_new', userId: 'user_123' };

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
    vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
    vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('ultra');
    vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(10000);
    vi.spyOn(subscriptionServiceModule, 'createSubscription').mockResolvedValue(mockCreated as any);
    (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

    const result = await handleSubscriptionUpdate(event, mockDependencies);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({
      success: true,
      message: 'Subscription created',
    });
    expect(subscriptionServiceModule.createSubscription).toHaveBeenCalled();
  });

  test('should throw error when user pool ID is not set', async () => {
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: 'user_123',
          envIdentifier: 'test',
        },
        items: [],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.updated',
    };
    const event = createMockEvent(body);

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
    vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
    (mockDependencies.getUserPoolId as ReturnType<typeof vi.fn>).mockReturnValue(null);

    await expect(
      handleSubscriptionUpdate(event, mockDependencies)
    ).rejects.toThrow('User pool ID is not set');
  });

  test('should throw error when user not found', async () => {
    const body: SubscriptionUpdateBody = {
      data: {
        id: 'sub_123',
        status: 'active',
        started_at: '2024-01-01T00:00:00Z',
        custom_data: {
          sku: 'sku_123',
          userId: 'user_123',
          envIdentifier: 'test',
        },
        items: [],
        customer_id: 'cust_123',
        next_billed_at: '2024-02-01T00:00:00Z',
        canceled_at: '',
        paused_at: '',
        current_billing_period: {
          starts_at: '2024-01-01T00:00:00Z',
          ends_at: '2024-02-01T00:00:00Z',
        },
      },
      event_name: 'subscription.updated',
    };
    const event = createMockEvent(body);

    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
    vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
    (mockDependencies.getUserPoolId as ReturnType<typeof vi.fn>).mockReturnValue('pool_123');
    (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      handleSubscriptionUpdate(event, mockDependencies)
    ).rejects.toThrow('User not found');
  });
});

