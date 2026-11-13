/**
 * Unit tests for future user service functions
 */

import { describe, test, expect, beforeEach, vi } from 'vitest';
import {
  findPartnership,
  checkExistingFutureUser,
  createFutureUserRecord,
  createFutureUser,
  validatePartnerCodeOrRecipient,
} from '../future-user-service';
import { SubscriptionUpdateBody } from '../types';

describe('validatePartnerCodeOrRecipient', () => {
  test('should not throw when partner code is present', () => {
    expect(() => {
      validatePartnerCodeOrRecipient('partner123', undefined);
    }).not.toThrow();
  });

  test('should not throw when recipient email is present', () => {
    expect(() => {
      validatePartnerCodeOrRecipient(undefined, 'recipient@example.com');
    }).not.toThrow();
  });

  test('should not throw when both are present', () => {
    expect(() => {
      validatePartnerCodeOrRecipient('partner123', 'recipient@example.com');
    }).not.toThrow();
  });

  test('should not throw when both are missing (regular purchases can fetch from Paddle)', () => {
    expect(() => {
      validatePartnerCodeOrRecipient(undefined, undefined);
    }).not.toThrow();
  });

  test('should not throw when both are empty strings (regular purchases can fetch from Paddle)', () => {
    expect(() => {
      validatePartnerCodeOrRecipient('', '');
    }).not.toThrow();
  });
});

describe('findPartnership', () => {
  const mockClient = {
    models: {
      Partnership: {
        listPartnershipByPartnerCode: vi.fn(),
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return partnership when found', async () => {
    const mockPartnership = {
      partnershipUuid: 'part_123',
      partnerCode: 'partner123',
      partnerName: 'Test Partner',
    };

    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [mockPartnership],
      errors: null,
    });

    const result = await findPartnership('partner123', mockClient);

    expect(result).toEqual(mockPartnership);
    expect(mockClient.models.Partnership.listPartnershipByPartnerCode).toHaveBeenCalledWith({
      partnerCode: 'partner123',
    });
  });

  test('should throw error when partnership not found', async () => {
    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [],
      errors: null,
    });

    await expect(
      findPartnership('partner123', mockClient)
    ).rejects.toThrow('Partnership not found');
  });

  test('should throw error when query fails', async () => {
    const mockError = { message: 'Database error' };
    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: null,
      errors: [mockError],
    });

    await expect(
      findPartnership('partner123', mockClient)
    ).rejects.toThrow('Database error');
  });
});

describe('checkExistingFutureUser', () => {
  const mockClient = {
    models: {
      FutureUser: {
        listFutureUserByEmail: vi.fn(),
      },
    },
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return true when future user exists', async () => {
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: [{ futureUserUuid: 'fu_123', email: 'test@example.com' }],
    });

    const result = await checkExistingFutureUser('test@example.com', mockClient);

    expect(result).toBe(true);
    expect(mockClient.models.FutureUser.listFutureUserByEmail).toHaveBeenCalledWith({
      email: 'test@example.com',
    });
  });

  test('should return false when future user does not exist', async () => {
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: [],
    });

    const result = await checkExistingFutureUser('test@example.com', mockClient);

    expect(result).toBe(false);
  });

  test('should return false when data is null', async () => {
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: null,
    });

    const result = await checkExistingFutureUser('test@example.com', mockClient);

    expect(result).toBe(false);
  });
});

describe('createFutureUserRecord', () => {
  const mockClient = {
    models: {
      FutureUser: {
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
        userId: '',
        envIdentifier: 'test',
        tier: 'super',
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

  test('should create future user successfully', async () => {
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'test@example.com',
    };

    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    const ultraProductId = 'prod_ultra_123';
    const result = await createFutureUserRecord(
      'test@example.com',
      'John Doe',
      'part_123',
      mockBody,
      mockClient,
      ultraProductId
    );

    expect(result).toEqual(mockCreated);
    expect(mockClient.models.FutureUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        firstName: 'John Doe',
        lastName: '',
        partnershipUuid: 'part_123',
        provider: 'paddle',
        tier: 'super',
      })
    );
  });

  test('should use empty string for name when not provided', async () => {
    mockClient.models.FutureUser.create.mockResolvedValue({
      data: { futureUserUuid: 'fu_123' },
      errors: null,
    });

    const ultraProductId = 'prod_ultra_123';
    await createFutureUserRecord('test@example.com', '', 'part_123', mockBody, mockClient, ultraProductId);

    const createCall = mockClient.models.FutureUser.create.mock.calls[0][0];
    expect(createCall.firstName).toBe('');
  });

  test('should throw error when create fails', async () => {
    const mockError = { message: 'Create failed' };
    mockClient.models.FutureUser.create.mockResolvedValue({
      data: null,
      errors: [mockError],
    });

    const ultraProductId = 'prod_ultra_123';
    await expect(
      createFutureUserRecord('test@example.com', 'John', 'part_123', mockBody, mockClient, ultraProductId)
    ).rejects.toThrow('Create failed');
  });

  test('should determine tier as ultra when product_id matches Ultra Curio', async () => {
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'test@example.com',
    };

    const ultraProductId = 'prod_ultra_123';
    const bodyWithUltraItems: SubscriptionUpdateBody = {
      ...mockBody,
      data: {
        ...mockBody.data,
        items: [
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
        ],
      },
    };

    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    await createFutureUserRecord(
      'test@example.com',
      'John Doe',
      'part_123',
      bodyWithUltraItems,
      mockClient,
      ultraProductId
    );

    expect(mockClient.models.FutureUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'ultra',
      })
    );
  });

  test('should determine tier as super when product_id does not match Ultra Curio', async () => {
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'test@example.com',
    };

    const ultraProductId = 'prod_ultra_123';
    const bodyWithSuperItems: SubscriptionUpdateBody = {
      ...mockBody,
      data: {
        ...mockBody.data,
        items: [
          {
            price: {
              id: 'price_123',
              product_id: 'prod_super_123', // Different product ID
              unit_price: {
                amount: 5000,
                currency_code: 'USD',
              },
            },
          },
        ],
      },
    };

    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    await createFutureUserRecord(
      'test@example.com',
      'John Doe',
      'part_123',
      bodyWithSuperItems,
      mockClient,
      ultraProductId
    );

    expect(mockClient.models.FutureUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'super',
      })
    );
  });

  test('should fallback to custom_data.tier when items are empty', async () => {
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'test@example.com',
    };

    const ultraProductId = 'prod_ultra_123';
    const bodyWithEmptyItems: SubscriptionUpdateBody = {
      ...mockBody,
      data: {
        ...mockBody.data,
        items: [],
        custom_data: {
          ...mockBody.data.custom_data,
          tier: 'ultra', // Should use this as fallback
        },
      },
    };

    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    await createFutureUserRecord(
      'test@example.com',
      'John Doe',
      'part_123',
      bodyWithEmptyItems,
      mockClient,
      ultraProductId
    );

    expect(mockClient.models.FutureUser.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tier: 'ultra',
      })
    );
  });
});

describe('createFutureUser', () => {
  const mockClient = {
    models: {
      Partnership: {
        listPartnershipByPartnerCode: vi.fn(),
      },
      FutureUser: {
        listFutureUserByEmail: vi.fn(),
        create: vi.fn(),
      },
    },
  } as any;

  const mockGetCustomerEmail = vi.fn();

  const mockBody: SubscriptionUpdateBody = {
    data: {
      id: 'sub_123',
      status: 'active',
      started_at: '2024-01-01T00:00:00Z',
      custom_data: {
        sku: 'sku_123',
        userId: '',
        envIdentifier: 'test',
        partnerCode: 'partner123',
        tier: 'super',
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
    process.env.PADDLE_API_KEY = 'test-api-key';
    process.env.ENVIRONMENT = 'sandbox';
  });

  test('should create future user when not exists', async () => {
    const mockPartnership = {
      partnershipUuid: 'part_123',
      partnerCode: 'partner123',
    };
    const mockCustomer = {
      name: 'John Doe',
      email: 'test@example.com',
    };
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'test@example.com',
    };

    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [mockPartnership],
      errors: null,
    });
    mockGetCustomerEmail.mockResolvedValue(mockCustomer);
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: [],
    });
    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    const ultraProductId = 'prod_ultra_123';
    await createFutureUser(mockBody, mockClient, mockGetCustomerEmail, ultraProductId);

    expect(mockGetCustomerEmail).toHaveBeenCalledWith('cust_123');
    expect(mockClient.models.FutureUser.create).toHaveBeenCalled();
  });

  test('should skip creation when future user already exists (idempotency)', async () => {
    const mockPartnership = {
      partnershipUuid: 'part_123',
      partnerCode: 'partner123',
    };
    const mockCustomer = {
      name: 'John Doe',
      email: 'test@example.com',
    };

    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [mockPartnership],
      errors: null,
    });
    mockGetCustomerEmail.mockResolvedValue(mockCustomer);
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: [{ futureUserUuid: 'fu_existing' }],
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const ultraProductId = 'prod_ultra_123';
    await createFutureUser(mockBody, mockClient, mockGetCustomerEmail, ultraProductId);

    expect(mockClient.models.FutureUser.create).not.toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[subscription-update] User already in future user table',
      expect.objectContaining({ email: 'test@example.com' })
    );

    consoleSpy.mockRestore();
  });

  test('should create future user for regular purchase (no partner code or recipientEmail)', async () => {
    const bodyWithoutPartnerCode = {
      ...mockBody,
      data: {
        ...mockBody.data,
        custom_data: {
          ...mockBody.data.custom_data,
          partnerCode: undefined,
          recipientEmail: undefined,
        },
      },
    };

    const mockCustomer = {
      name: 'John Doe',
      email: 'regular@example.com',
    };
    const mockCreated = {
      futureUserUuid: 'fu_123',
      email: 'regular@example.com',
    };

    mockGetCustomerEmail.mockResolvedValue(mockCustomer);
    mockClient.models.FutureUser.listFutureUserByEmail.mockResolvedValue({
      data: [],
    });
    mockClient.models.FutureUser.create.mockResolvedValue({
      data: mockCreated,
      errors: null,
    });

    const ultraProductId = 'prod_ultra_123';
    await createFutureUser(bodyWithoutPartnerCode, mockClient, mockGetCustomerEmail, ultraProductId);

    expect(mockGetCustomerEmail).toHaveBeenCalledWith('cust_123');
    expect(mockClient.models.FutureUser.create).toHaveBeenCalled();
  });

  test('should throw error when customer email fetch fails', async () => {
    const mockPartnership = {
      partnershipUuid: 'part_123',
      partnerCode: 'partner123',
    };

    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [mockPartnership],
      errors: null,
    });
    mockGetCustomerEmail.mockResolvedValue(null);

    const ultraProductId = 'prod_ultra_123';
    await expect(
      createFutureUser(mockBody, mockClient, mockGetCustomerEmail, ultraProductId)
    ).rejects.toThrow('Failed to get customer email');
  });

  test('should throw error when customer email is empty', async () => {
    const mockPartnership = {
      partnershipUuid: 'part_123',
      partnerCode: 'partner123',
    };
    const mockCustomer = {
      name: 'John Doe',
      email: '',
    };

    mockClient.models.Partnership.listPartnershipByPartnerCode.mockResolvedValue({
      data: [mockPartnership],
      errors: null,
    });
    mockGetCustomerEmail.mockResolvedValue(mockCustomer);

    const ultraProductId = 'prod_ultra_123';
    await expect(
      createFutureUser(mockBody, mockClient, mockGetCustomerEmail, ultraProductId)
    ).rejects.toThrow('Failed to get customer email');
  });
});

