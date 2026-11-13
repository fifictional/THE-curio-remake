/**
 * Comprehensive tests for the 4 main subscription update flows
 * 
 * Flow 1: Normal payment from an existing user
 * Flow 2: Subscription update from existing user
 * Flow 3: Payment from a partner
 * Flow 4: Payment from a gift
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import { handleSubscriptionUpdate, HandlerDependencies } from '../subscription-handler';
import { FunctionUrlEvent, SubscriptionUpdateBody } from '../types';
import * as validationModule from '../../common/paddle';
import * as subscriptionServiceModule from '../subscription-service';
import * as futureUserServiceModule from '../future-user-service';
import * as paddleClientModule from '../paddle-client';
import * as customerioModule from '../customerio-utils';

// Mock all modules
vi.mock('../../functions/subscription-update/validation');
vi.mock('../../functions/subscription-update/subscription-service');
vi.mock('../../functions/subscription-update/future-user-service');
vi.mock('../../functions/subscription-update/paddle-client');
vi.mock('../../functions/subscription-update/customerio-utils');
vi.mock('../../utils/mixpanel');
vi.mock('../../utils/meta');
vi.mock('../../utils/lambda-utils');

describe('Subscription Update Flows', () => {
  const mockDependencies: HandlerDependencies = {
    client: {} as any,
    env: {
      PADDLE_SECRET: 'test-secret',
      PADDLE_API_KEY: 'test-api-key',
      ENVIRONMENT: 'sandbox',
      ULTRA_CURIO_PRODUCT_ID: 'prod_ultra',
      CUSTOMERIO_API_KEY: 'test-customerio-key',
    },
    getMixpanel: vi.fn().mockResolvedValue({
      people: { set: vi.fn() },
      track: vi.fn(),
    }),
    getUserPoolId: vi.fn().mockReturnValue('pool_123'),
    getUser: vi.fn(),
  };

  const createMockEvent = (body: SubscriptionUpdateBody): FunctionUrlEvent => ({
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
    vi.spyOn(validationModule, 'extractPaddleSignature').mockReturnValue('valid-signature');
    vi.spyOn(validationModule, 'validatePaddleSignature').mockReturnValue(true);
  });

  describe('Flow 1: Normal payment from an existing user', () => {
    test('should create subscription for existing user with super tier', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_new_123',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: 'user_existing_123',
            envIdentifier: 'test',
          },
          items: [{
            price: {
              id: 'price_super',
              product_id: 'prod_super',
              unit_price: {
                amount: 5000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_123',
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockUser = {
        Attributes: [
          { Name: 'email', Value: 'user@example.com' },
          { Name: 'given_name', Value: 'John' },
          { Name: 'family_name', Value: 'Doe' },
        ],
      };
      const mockCreated = { subscriptionId: 'sub_new_123', userId: 'user_existing_123', tier: 'super' };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
      vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(5000);
      vi.spyOn(subscriptionServiceModule, 'createSubscription').mockResolvedValue(mockCreated as any);
      (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      // Verify response
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: 'Subscription created',
      });

      // Verify subscription was created with correct tier
      expect(subscriptionServiceModule.createSubscription).toHaveBeenCalledWith(
        body,
        'super',
        mockDependencies.client
      );

      // Verify user was fetched from Cognito
      expect(mockDependencies.getUser).toHaveBeenCalledWith('pool_123', 'user_existing_123');

      // Verify analytics tracking
      const mixpanelClient = await mockDependencies.getMixpanel();
      expect(mixpanelClient?.track).toHaveBeenCalledWith(
        'subscription_created',
        expect.objectContaining({
          distinct_id: 'user_existing_123',
          tier: 'super',
          amount: 50, // 5000 cents / 100
        })
      );
    });

    test('should create subscription for existing user with ultra tier', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_new_456',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_ultra_annual',
            userId: 'user_existing_456',
            envIdentifier: 'test',
          },
          items: [{
            price: {
              id: 'price_ultra',
              product_id: 'prod_ultra',
              unit_price: {
                amount: 10000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_456',
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockUser = {
        Attributes: [
          { Name: 'email', Value: 'user2@example.com' },
          { Name: 'given_name', Value: 'Jane' },
          { Name: 'family_name', Value: 'Smith' },
        ],
      };
      const mockCreated = { subscriptionId: 'sub_new_456', userId: 'user_existing_456', tier: 'ultra' };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('ultra');
      vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(10000);
      vi.spyOn(subscriptionServiceModule, 'createSubscription').mockResolvedValue(mockCreated as any);
      (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      expect(result.statusCode).toBe(200);
      expect(subscriptionServiceModule.createSubscription).toHaveBeenCalledWith(
        body,
        'ultra',
        mockDependencies.client
      );
    });
  });

  describe('Flow 2: Subscription update from existing user', () => {
    test('should update existing subscription with new status and dates', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_existing_123',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: 'user_existing_123',
            envIdentifier: 'test',
          },
          items: [{
            price: {
              id: 'price_super',
              product_id: 'prod_super',
              unit_price: {
                amount: 5000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_123',
          next_billed_at: '2025-02-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-02-01T00:00:00Z',
            ends_at: '2025-02-01T00:00:00Z',
          },
        },
        event_name: 'subscription.updated',
      };
      const event = createMockEvent(body);

      const mockSubscription = {
        subscriptionId: 'sub_existing_123',
        userId: 'user_existing_123',
        tier: 'super',
      };
      const mockUser = {
        Attributes: [
          { Name: 'email', Value: 'user@example.com' },
        ],
      };
      const mockUpdated = { ...mockSubscription, status: 'active' };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(mockSubscription as any);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
      vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(5000);
      vi.spyOn(subscriptionServiceModule, 'updateSubscription').mockResolvedValue(mockUpdated as any);
      (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      // Verify response
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: 'Subscription updated',
      });

      // Verify subscription was updated with new dates
      expect(subscriptionServiceModule.updateSubscription).toHaveBeenCalledWith(
        'sub_existing_123',
        body,
        'super',
        mockDependencies.client
      );

      // Verify update call includes new billing period dates
      const updateCall = vi.mocked(subscriptionServiceModule.updateSubscription).mock.calls[0];
      expect(updateCall[1].data.current_billing_period.starts_at).toBe('2024-02-01T00:00:00Z');
      expect(updateCall[1].data.current_billing_period.ends_at).toBe('2025-02-01T00:00:00Z');

      // Verify analytics tracking
      const mixpanelClient = await mockDependencies.getMixpanel();
      expect(mixpanelClient?.track).toHaveBeenCalledWith(
        'subscription_updated',
        expect.objectContaining({
          distinct_id: 'user_existing_123',
          subscription_id: 'sub_existing_123',
          tier: 'super',
          status: 'active',
        })
      );
    });

    test('should update subscription when status changes to canceled', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_existing_123',
          status: 'canceled',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: 'user_existing_123',
            envIdentifier: 'test',
          },
          items: [],
          customer_id: 'cust_123',
          next_billed_at: '',
          canceled_at: '2024-06-01T00:00:00Z',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.updated',
      };
      const event = createMockEvent(body);

      const mockSubscription = {
        subscriptionId: 'sub_existing_123',
        userId: 'user_existing_123',
      };
      const mockUser = {
        Attributes: [{ Name: 'email', Value: 'user@example.com' }],
      };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(mockSubscription as any);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
      vi.spyOn(subscriptionServiceModule, 'calculateAmount').mockReturnValue(0);
      vi.spyOn(subscriptionServiceModule, 'updateSubscription').mockResolvedValue(mockSubscription as any);
      (mockDependencies.getUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      expect(result.statusCode).toBe(200);
      const updateCall = vi.mocked(subscriptionServiceModule.updateSubscription).mock.calls[0];
      expect(updateCall[1].data.status).toBe('canceled');
      expect(updateCall[1].data.canceled_at).toBe('2024-06-01T00:00:00Z');
    });
  });

  describe('Flow 3: Payment from a partner', () => {
    test('should create future user when partnerCode is present and userId is missing', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_partner_123',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: '', // No userId - user hasn't created account yet
            envIdentifier: 'test',
            partnerCode: 'partner_abc',
            tier: 'super',
          },
          items: [{
            price: {
              id: 'price_super',
              product_id: 'prod_super',
              unit_price: {
                amount: 5000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_partner_123',
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockCustomer = {
        name: 'Partner User',
        email: 'partner.user@example.com',
      };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(paddleClientModule, 'getCustomerEmail').mockResolvedValue(mockCustomer);
      vi.spyOn(futureUserServiceModule, 'createFutureUser').mockResolvedValue(undefined);
      vi.spyOn(customerioModule, 'updateGiftSubscriptionAttributes').mockResolvedValue(undefined);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      // Verify response
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: 'Future user created',
      });

      // Verify future user was created
      expect(futureUserServiceModule.createFutureUser).toHaveBeenCalledWith(
        body,
        mockDependencies.client,
        expect.any(Function),
        mockDependencies.env.ULTRA_CURIO_PRODUCT_ID
      );

      // Verify Customer.io was NOT updated (not a gift)
      expect(customerioModule.updateGiftSubscriptionAttributes).not.toHaveBeenCalled();
    });
  });

  describe('Flow 4: Payment from a gift', () => {
    test('should create future user and update Customer.io with gift attributes', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_gift_123',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_ultra_annual',
            userId: '', // No userId - recipient hasn't created account yet
            envIdentifier: 'test',
            recipientEmail: 'recipient@example.com',
            recipientMessage: 'Happy learning!',
            tier: 'ultra',
          },
          items: [{
            price: {
              id: 'price_ultra',
              product_id: 'prod_ultra',
              unit_price: {
                amount: 10000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_sender_123', // Sender's customer ID
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockSender = {
        name: 'John Sender',
        email: 'sender@example.com',
      };
      const mockRecipient = {
        name: 'Jane Recipient',
        email: 'recipient@example.com',
      };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('ultra');
      
      // Mock Paddle API call for sender info (for Customer.io)
      // Note: For gifts, createFutureUser uses recipientEmail directly, so no Paddle call needed for recipient
      vi.spyOn(paddleClientModule, 'getCustomerEmail').mockResolvedValue(mockSender);
      
      vi.spyOn(futureUserServiceModule, 'createFutureUser').mockResolvedValue(undefined);
      vi.spyOn(customerioModule, 'updateGiftSubscriptionAttributes').mockResolvedValue(undefined);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      // Verify response
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toEqual({
        success: true,
        message: 'Future user created',
      });

      // Verify future user was created for recipient
      expect(futureUserServiceModule.createFutureUser).toHaveBeenCalledWith(
        body,
        mockDependencies.client,
        expect.any(Function),
        mockDependencies.env.ULTRA_CURIO_PRODUCT_ID
      );

      // Verify Customer.io was updated with gift attributes
      expect(customerioModule.updateGiftSubscriptionAttributes).toHaveBeenCalledWith(
        'recipient@example.com', // Recipient email
        'sender@example.com', // Sender email
        'John Sender', // Sender name
        'ultra', // Tier
        'Happy learning!', // Message
        'test-customerio-key' // API key
      );
    });

    test('should handle gift without message', async () => {
      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_gift_456',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: '',
            envIdentifier: 'test',
            recipientEmail: 'recipient2@example.com',
            // No recipientMessage
            tier: 'super',
          },
          items: [{
            price: {
              id: 'price_super',
              product_id: 'prod_super',
              unit_price: {
                amount: 5000,
                currency_code: 'USD',
              },
            },
          }],
          customer_id: 'cust_sender_456',
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockSender = {
        name: 'Alice Sender',
        email: 'alice@example.com',
      };
      const mockRecipient = {
        name: 'Bob Recipient',
        email: 'recipient2@example.com',
      };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
      // For gifts, createFutureUser uses recipientEmail directly, so only need sender for Customer.io
      vi.spyOn(paddleClientModule, 'getCustomerEmail').mockResolvedValue(mockSender);
      vi.spyOn(futureUserServiceModule, 'createFutureUser').mockResolvedValue(undefined);
      vi.spyOn(customerioModule, 'updateGiftSubscriptionAttributes').mockResolvedValue(undefined);

      const result = await handleSubscriptionUpdate(event, mockDependencies);

      expect(result.statusCode).toBe(200);

      // Verify Customer.io was called with empty message
      expect(customerioModule.updateGiftSubscriptionAttributes).toHaveBeenCalledWith(
        'recipient2@example.com',
        'alice@example.com',
        'Alice Sender',
        'super',
        undefined, // No message
        'test-customerio-key'
      );
    });

    test('should skip Customer.io update if API key is not set', async () => {
      const dependenciesWithoutCustomerIO: HandlerDependencies = {
        ...mockDependencies,
        env: {
          ...mockDependencies.env,
          CUSTOMERIO_API_KEY: undefined,
        },
      };

      const body: SubscriptionUpdateBody = {
        data: {
          id: 'sub_gift_789',
          status: 'active',
          started_at: '2024-01-01T00:00:00Z',
          custom_data: {
            sku: 'sku_super_annual',
            userId: '',
            envIdentifier: 'test',
            recipientEmail: 'recipient3@example.com',
            recipientMessage: 'Test message',
          },
          items: [],
          customer_id: 'cust_sender_789',
          next_billed_at: '2025-01-01T00:00:00Z',
          canceled_at: '',
          paused_at: '',
          current_billing_period: {
            starts_at: '2024-01-01T00:00:00Z',
            ends_at: '2025-01-01T00:00:00Z',
          },
        },
        event_name: 'subscription.created',
      };
      const event = createMockEvent(body);

      const mockSender = { name: 'Sender', email: 'sender@example.com' };
      const mockRecipient = { name: 'Recipient', email: 'recipient3@example.com' };

      vi.spyOn(subscriptionServiceModule, 'findExistingSubscription').mockResolvedValue(null);
      vi.spyOn(subscriptionServiceModule, 'determineTier').mockReturnValue('super');
      vi.spyOn(paddleClientModule, 'getCustomerEmail')
        .mockResolvedValueOnce(mockSender)
        .mockResolvedValueOnce(mockRecipient);
      vi.spyOn(futureUserServiceModule, 'createFutureUser').mockResolvedValue(undefined);

      const result = await handleSubscriptionUpdate(event, dependenciesWithoutCustomerIO);

      expect(result.statusCode).toBe(200);
      // Customer.io should not be called when API key is missing
      expect(customerioModule.updateGiftSubscriptionAttributes).not.toHaveBeenCalled();
    });
  });
});

