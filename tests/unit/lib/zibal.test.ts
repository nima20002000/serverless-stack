/**
 * Zibal Payment Gateway Client Tests
 *
 * Tests for src/lib/zibal/client.ts
 * Critical payment gateway - handles real money transactions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';

// Mock axios
vi.mock('axios', () => {
  const mockPost = vi.fn();
  return {
    default: {
      create: vi.fn(() => ({
        post: mockPost,
      })),
      __mockPost: mockPost,
    },
  };
});

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('server-only', () => ({}));

// Helper to access mock post function
function getMockPost() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (axios as any).__mockPost;
}

function getMockCreate() {
  return axios.create;
}

describe('zibal/client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.ZIBAL_MERCHANT = 'test-merchant';
    process.env.ZIBAL_SANDBOX = 'true';
    process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isSandboxMode', () => {
    it('returns true when ZIBAL_SANDBOX is "true"', async () => {
      process.env.ZIBAL_SANDBOX = 'true';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zibal/client');

      expect(isSandboxMode()).toBe(true);
    });

    it('returns false when ZIBAL_SANDBOX is "false"', async () => {
      process.env.ZIBAL_SANDBOX = 'false';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zibal/client');

      expect(isSandboxMode()).toBe(false);
    });

    it('returns false when ZIBAL_SANDBOX is undefined', async () => {
      delete process.env.ZIBAL_SANDBOX;

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zibal/client');

      expect(isSandboxMode()).toBe(false);
    });
  });

  describe('getZibalConfig (via createPaymentRequest)', () => {
    it('throws error when merchant is not configured', async () => {
      delete process.env.ZIBAL_MERCHANT;

      vi.resetModules();
      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('Zibal merchant not configured');
    });
  });

  describe('createPaymentRequest', () => {
    it('creates payment request and returns trackId and redirectUrl', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          trackId: 123456789,
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      const result = await createPaymentRequest({
        amount: 10000, // Tomans
        description: 'Test payment',
        mobile: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        orderId: 'KT-ABC123',
      });

      expect(result.trackId).toBe(123456789);
      expect(result.status).toBe(100);
      // CRITICAL: Redirect URL should be https://gateway.zibal.ir/start/{trackId} (NOT /v1/start/)
      expect(result.redirectUrl).toBe(
        'https://gateway.zibal.ir/start/123456789'
      );
    });

    it('converts Tomans to Rials correctly (amount * 10)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          trackId: 123456789,
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await createPaymentRequest({
        amount: 25000, // Tomans
        callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
      });

      // Verify axios post was called with amount in Rials
      expect(mockPost).toHaveBeenCalledWith(
        '/request',
        expect.objectContaining({
          amount: 250000, // 25000 * 10 = 250000 Rials
          merchant: 'test-merchant',
        })
      );
    });

    it('includes optional fields in request body', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          trackId: 123456789,
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Purchase from Kitia',
        mobile: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        orderId: 'KT-ABC123',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/request',
        expect.objectContaining({
          description: 'Purchase from Kitia',
          mobile: '09123456789',
          orderId: 'KT-ABC123',
        })
      );
    });

    it('throws error with result code 102 (merchant not found)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 102,
          message: 'merchant not found',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('merchant یافت نشد.');
    });

    it('throws error with result code 103 (merchant inactive)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 103,
          message: 'merchant inactive',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('merchant غیرفعال');
    });

    it('throws error with result code 105 (amount too small)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 105,
          message: 'amount too small',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 50, // 500 Rials - too small
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('amount بایستی بزرگتر از 1,000 ریال باشد.');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('ECONNREFUSED'));

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('uses correct API base URL (https://gateway.zibal.ir/v1)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          trackId: 123456789,
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await createPaymentRequest({
        amount: 10000,
        callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
      });

      expect(getMockCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://gateway.zibal.ir/v1',
        })
      );
    });
  });

  describe('verifyPayment', () => {
    it('verifies payment and returns refNumber', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          paidAt: '2024-01-15T10:30:00Z',
          amount: 100000, // Rials
          refNumber: 987654321,
          cardNumber: '6037-99**-****-1234',
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      const result = await verifyPayment({
        trackId: 123456789,
        amount: 10000, // Tomans
      });

      expect(result.status).toBe(100);
      expect(result.refNumber).toBe(987654321);
      expect(result.trackId).toBe(123456789);
      expect(result.amount).toBe(100000);
      expect(result.cardNumber).toBe('6037-99**-****-1234');
    });

    it('sends only merchant and trackId to verify endpoint', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          amount: 100000,
          refNumber: 987654321,
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      await verifyPayment({
        trackId: 123456789,
        amount: 10000,
      });

      expect(mockPost).toHaveBeenCalledWith('/verify', {
        merchant: 'test-merchant',
        trackId: 123456789,
      });
    });

    it('throws error when verified amount does not match (CRITICAL security check)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 100,
          message: 'success',
          amount: 50000, // Should be 100000 Rials
          refNumber: 987654321,
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      // Input: 10000 Tomans = 100000 Rials
      // Response: 50000 Rials - mismatch!
      await expect(
        verifyPayment({
          trackId: 123456789,
          amount: 10000, // Tomans
        })
      ).rejects.toThrow('مبلغ پرداخت شده با مبلغ تراکنش مطابقت ندارد');
    });

    it('throws error with result code 201 (already verified)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 201,
          message: 'already verified',
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      await expect(
        verifyPayment({
          trackId: 123456789,
          amount: 10000,
        })
      ).rejects.toThrow('قبلا تایید شده.');
    });

    it('throws error with result code 202 (unpaid/failed)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 202,
          message: 'not paid',
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      await expect(
        verifyPayment({
          trackId: 123456789,
          amount: 10000,
        })
      ).rejects.toThrow('سفارش پرداخت نشده یا ناموفق بوده است.');
    });

    it('throws error with result code 203 (invalid trackId)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 203,
          message: 'invalid trackId',
        },
      });

      const { verifyPayment } = await import('@/lib/zibal/client');

      await expect(
        verifyPayment({
          trackId: 999999999,
          amount: 10000,
        })
      ).rejects.toThrow('trackId نامعتبر می‌باشد.');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Connection timeout'));

      const { verifyPayment } = await import('@/lib/zibal/client');

      await expect(
        verifyPayment({
          trackId: 123456789,
          amount: 10000,
        })
      ).rejects.toThrow('Connection timeout');
    });
  });

  describe('getCallbackUrl', () => {
    it('returns Zibal-specific callback URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zibal/client');

      expect(getCallbackUrl()).toBe(
        'https://kitia.ir/api/transactions/verify-zibal'
      );
    });

    it('falls back to NEXTAUTH_URL if NEXT_PUBLIC_APP_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXTAUTH_URL = 'https://auth.kitia.ir';

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zibal/client');

      expect(getCallbackUrl()).toBe(
        'https://auth.kitia.ir/api/transactions/verify-zibal'
      );
    });

    it('falls back to localhost if neither URL is set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zibal/client');

      expect(getCallbackUrl()).toBe(
        'http://localhost:3000/api/transactions/verify-zibal'
      );
    });

    it('ignores requestUrl parameter (uses env vars for reverse proxy compatibility)', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zibal/client');

      expect(getCallbackUrl('http://localhost:3001')).toBe(
        'https://kitia.ir/api/transactions/verify-zibal'
      );
    });
  });

  describe('result code mapping', () => {
    it('maps result code 104 to merchant invalid message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 104,
          message: 'merchant invalid',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('merchant نامعتبر');
    });

    it('maps result code 106 to invalid callback URL message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 106,
          message: 'invalid callback',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'invalid-url',
        })
      ).rejects.toThrow('callbackUrl نامعتبر می‌باشد');
    });

    it('maps result code 113 to amount exceeds limit message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 113,
          message: 'amount exceeds limit',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 999999999,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('amount بیشتر از سقف مجاز است.');
    });

    it('returns generic error for unknown result codes', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: 999,
          message: 'unknown error',
        },
      });

      const { createPaymentRequest } = await import('@/lib/zibal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          callbackUrl: 'https://kitia.ir/api/transactions/verify-zibal',
        })
      ).rejects.toThrow('خطای نامشخص');
    });
  });
});
