/**
 * Unit tests for Paddle API client functions
 */

import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { getCustomerEmail } from '../paddle-client';

// Mock fetch globally
global.fetch = vi.fn();

describe('getCustomerEmail', () => {
  const customerId = 'cust_test123';
  const apiKey = 'test-api-key';
  const environment = 'sandbox';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should throw error if API key is not set', async () => {
    await expect(
      getCustomerEmail(customerId, '', environment)
    ).rejects.toThrow('PADDLE_API_KEY is not set or is empty');
  });

  test('should fetch customer from sandbox API when environment is sandbox', async () => {
    const mockResponse = {
      data: {
        name: 'John Doe',
        email: 'john@example.com',
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await getCustomerEmail(customerId, apiKey, 'sandbox');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://sandbox-api.paddle.com/customers/cust_test123',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
    });
  });

  test('should fetch customer from production API when environment is prod', async () => {
    const mockResponse = {
      data: {
        name: 'Jane Doe',
        email: 'jane@example.com',
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(mockResponse),
    });

    const result = await getCustomerEmail(customerId, apiKey, 'prod');

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paddle.com/customers/cust_test123',
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    expect(result).toEqual({
      name: 'Jane Doe',
      email: 'jane@example.com',
    });
  });

  test('should throw error when API returns non-OK status', async () => {
    const errorText = 'Customer not found';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: vi.fn().mockResolvedValue(errorText),
    });

    await expect(
      getCustomerEmail(customerId, apiKey, environment)
    ).rejects.toThrow('Failed to get customer email: 404 Not Found - Customer not found');
  });

  test('should throw error when API returns 500 error', async () => {
    const errorText = 'Internal server error';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: vi.fn().mockResolvedValue(errorText),
    });

    await expect(
      getCustomerEmail(customerId, apiKey, environment)
    ).rejects.toThrow('Failed to get customer email: 500 Internal Server Error - Internal server error');
  });

  test('should handle network errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Network error')
    );

    await expect(
      getCustomerEmail(customerId, apiKey, environment)
    ).rejects.toThrow('Network error');
  });

  test('should handle invalid JSON response', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
    });

    await expect(
      getCustomerEmail(customerId, apiKey, environment)
    ).rejects.toThrow('Invalid JSON');
  });
});

