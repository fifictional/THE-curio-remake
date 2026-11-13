/**
 * Unit tests for subscription service functions
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  findExistingSubscription,
  determineTier,
  calculateAmount,
  updateSubscription,
  createSubscription,
} from '../subscription-service';
import { SubscriptionUpdateBody } from '../types';

describe('determineTier', () => {
  const ultraProductId = 'prod_ultra_123';

  test('should return ultra when product_id matches Ultra Curio', () => {
    const items: SubscriptionUpdateBody['data']['items'] = [
      {
        price: {
          id: 'price_123',
          product_id: ultraProductId,
          unit_price: {
            amount: 10000,
            currency_code: 'USD',
          },
        },
      },
    ];

    expect(determineTier(items, ultraProductId)).toBe('ultra');
  });

  test('should return super when product_id does not match Ultra Curio', () => {
    const items: SubscriptionUpdateBody['data']['items'] = [
      {
        price: {
          id: 'price_123',
          product_id: 'prod_super_123',
          unit_price: {
            amount: 5000,
            currency_code: 'USD',
          },
        },
      },
    ];

    expect(determineTier(items, ultraProductId)).toBe('super');
  });

  test('should return super when items array is empty', () => {
    expect(determineTier([], ultraProductId)).toBe('super');
  });

  test('should return super when first item product_id is different', () => {
    const items: SubscriptionUpdateBody['data']['items'] = [
      {
        price: {
          id: 'price_123',
          product_id: 'prod_other_123',
          unit_price: {
            amount: 3000,
            currency_code: 'USD',
          },
        },
      },
    ];

    expect(determineTier(items, ultraProductId)).toBe('super');
  });
});

describe('calculateAmount', () => {
  test('should return amount from first item', () => {
    const items: SubscriptionUpdateBody['data']['items'] = [
      {
        price: {
          id: 'price_123',
          product_id: 'prod_123',
          unit_price: {
            amount: 10000,
            currency_code: 'USD',
          },
        },
      },
    ];

    expect(calculateAmount(items)).toBe(10000);
  });

  test('should return 0 when items array is empty', () => {
    expect(calculateAmount([])).toBe(0);
  });

  test('should return amount even with multiple items', () => {
    const items: SubscriptionUpdateBody['data']['items'] = [
      {
        price: {
          id: 'price_123',
          product_id: 'prod_123',
          unit_price: {
            amount: 5000,
            currency_code: 'USD',
          },
        },
      },
      {
        price: {
          id: 'price_456',
          product_id: 'prod_456',
          unit_price: {
            amount: 3000,
            currency_code: 'USD',
          },
        },
      },
    ];

    // Should return first item's amount
    expect(calculateAmount(items)).toBe(5000);
  });
});

describe('findExistingSubscription', () => {
  const mockClient = {
    models: {
      CurioSubscription: {
        listCurioSubscriptionByUserIdAndCreatedAt: vi.fn(),
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return subscription when found', async () => {
    const mockSubscription = {
      subscriptionId: 'sub_123',
      userId: 'user_123',
      tier: 'super',
    };

    mockClient.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt.mockResolvedValue({
      data: [mockSubscription],
      errors: null,
    });

    const result = await findExistingSubscription('user_123', mockClient);

    expect(result).toEqual(mockSubscription);
    expect(mockClient.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt).toHaveBeenCalledWith({
      userId: 'user_123',
    });
  });

  test('should return null when subscription not found', async () => {
    mockClient.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt.mockResolvedValue({
      data: [],
      errors: null,
    });

    const result = await findExistingSubscription('user_123', mockClient);

    expect(result).toBeNull();
  });

  test('should throw error when query fails', async () => {
    const mockError = { message: 'Database error' };
    mockClient.models.CurioSubscription.listCurioSubscriptionByUserIdAndCreatedAt.mockResolvedValue({
      data: null,
      errors: [mockError],
    });

    await expect(
      findExistingSubscription('user_123', mockClient)
    ).rejects.toThrow('Database error');
  });
});

describe('updateSubscription', () => {
  const mockClient = {
    models: {
      CurioSubscription: {
        update: vi.fn(),
      },
    },
  } as any;

  const mockBody: SubscriptionUpdateBody = {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should update subscription successfully', async () => {
    const mockUpdated = { subscriptionId: 'sub_123', tier: 'super' };
    mockClient.models.CurioSubscription.update.mockResolvedValue({
      data: mockUpdated,
      errors: null,
    });

    const result = await updateSubscription('sub_123', mockBody, 'super', mockClient);

    expect(result).toEqual(mockUpdated);
    expect(mockClient.models.CurioSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: 'sub_123',
        provider: 'paddle',
        status: 'active',
        tier: 'super',
      })
    );
  });

  test('should throw error when update fails', async () => {
    const mockError = { message: 'Update failed' };
    mockClient.models.CurioSubscription.update.mockResolvedValue({
      data: null,
      errors: [mockError],
    });

    await expect(
      updateSubscription('sub_123', mockBody, 'super', mockClient)
    ).rejects.toThrow('Update failed');
  });
});

describe('createSubscription', () => {
  const mockClient = {
    models: {
      CurioSubscription: {
        create: vi.fn(),
      },
    },
  } as any;

  const mockBody: SubscriptionUpdateBody = {
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
    event_name: 'subscription.created',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should create subscription successfully', async () => {
    const mockCreated = { subscriptionId: 'sub_new', userId: 'user_123' };
    mockClient.models.CurioSubscription.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    const result = await createSubscription(mockBody, 'super', mockClient);

    expect(result).toEqual(mockCreated);
    expect(mockClient.models.CurioSubscription.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_123',
        provider: 'paddle',
        status: 'active',
        tier: 'super',
        providerSubscriptionId: 'sub_123',
        providerCustomerId: 'cust_123',
      })
    );
  });

  test('should throw error when create fails', async () => {
    const mockError = { message: 'Create failed' };
    mockClient.models.CurioSubscription.create.mockResolvedValue({
      data: null,
      errors: [mockError],
    });

    await expect(
      createSubscription(mockBody, 'super', mockClient)
    ).rejects.toThrow('Create failed');
  });

  test('should generate UUID for subscriptionId', async () => {
    mockClient.models.CurioSubscription.create.mockResolvedValue({
      data: { subscriptionId: 'generated-uuid' },
      errors: null,
    });

    await createSubscription(mockBody, 'super', mockClient);

    const createCall = mockClient.models.CurioSubscription.create.mock.calls[0][0];
    expect(createCall.subscriptionId).toBeDefined();
    expect(typeof createCall.subscriptionId).toBe('string');
    expect(createCall.subscriptionId.length).toBeGreaterThan(0);
  });
});

