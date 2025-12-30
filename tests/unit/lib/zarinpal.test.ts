/**
 * Zarinpal Payment Gateway Client Tests
 *
 * Tests for src/lib/zarinpal/client.ts
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
      __mockPost: mockPost, // Export for test access
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

describe('zarinpal/client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Create a clean copy of the original environment
    process.env = { ...originalEnv };
    process.env.ZARINPAL_MERCHANT_ID = 'test-merchant-id';
    process.env.ZARINPAL_SANDBOX = 'true';
    process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
    // Ensure E2E mock mode is off by default
    delete process.env.E2E_MOCK_PAYMENTS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createPaymentRequest', () => {
    it('creates payment request and returns authority and URL', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { authority: 'A00000000000000000000000000123456789' } },
      });

      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      const result = await createPaymentRequest({
        amount: 10000, // Tomans
        description: 'Test payment',
        email: 'test@example.com',
        mobile: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify',
      });

      expect(result.authority).toBe('A00000000000000000000000000123456789');
      expect(result.status).toBe(100);
      expect(result.url).toContain('/pg/StartPay/');
      expect(result.url).toContain('A00000000000000000000000000123456789');
    });

    it('converts Tomans to Rials correctly (amount * 10)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { authority: 'A00000000000000000000000000123456789' } },
      });

      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await createPaymentRequest({
        amount: 10000, // Tomans
        description: 'Test payment',
        callbackUrl: 'https://kitia.ir/api/transactions/verify',
      });

      // Verify the axios post was called with amount in Rials (10000 * 10 = 100000)
      expect(mockPost).toHaveBeenCalledWith(
        '/pg/v4/payment/request.json',
        expect.objectContaining({
          amount: 100000, // Rials
          merchant_id: 'test-merchant-id',
          callback_url: 'https://kitia.ir/api/transactions/verify',
          description: 'Test payment',
        })
      );
    });

    it('uses sandbox URL when ZARINPAL_SANDBOX is true', async () => {
      process.env.ZARINPAL_SANDBOX = 'true';
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { authority: 'A00000000000000000000000000123456789' } },
      });

      vi.resetModules();
      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Test payment',
        callbackUrl: 'https://kitia.ir/api/transactions/verify',
      });

      expect(getMockCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://sandbox.zarinpal.com',
        })
      );
    });

    it('uses production URL when ZARINPAL_SANDBOX is false', async () => {
      process.env.ZARINPAL_SANDBOX = 'false';
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { authority: 'A00000000000000000000000000123456789' } },
      });

      vi.resetModules();
      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Test payment',
        callbackUrl: 'https://kitia.ir/api/transactions/verify',
      });

      expect(getMockCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://payment.zarinpal.com',
        })
      );
    });

    it('throws error when Zarinpal returns no authority', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: {}, errors: [{ code: -9, message: 'Invalid amount' }] },
      });

      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          description: 'Test payment',
          callbackUrl: 'https://kitia.ir/api/transactions/verify',
        })
      ).rejects.toThrow('خطا در ایجاد درخواست پرداخت');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('ECONNREFUSED'));

      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          description: 'Test payment',
          callbackUrl: 'https://kitia.ir/api/transactions/verify',
        })
      ).rejects.toThrow('ECONNREFUSED');
    });

    it('includes optional email and mobile in request body', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { authority: 'A00000000000000000000000000123456789' } },
      });

      const { createPaymentRequest } = await import('@/lib/zarinpal/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Test payment',
        email: 'customer@example.com',
        mobile: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify',
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/pg/v4/payment/request.json',
        expect.objectContaining({
          email: 'customer@example.com',
          mobile: '09123456789',
        })
      );
    });
  });

  describe('verifyPayment', () => {
    it('verifies payment and returns refId', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { ref_id: 1234567890 } },
      });

      const { verifyPayment } = await import('@/lib/zarinpal/client');

      const result = await verifyPayment(
        'A00000000000000000000000000123456789',
        50000 // Tomans
      );

      expect(result.status).toBe(100);
      expect(result.refId).toBe(1234567890);
    });

    it('sends amount in Rials to Zarinpal API', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: { ref_id: 1234567890 } },
      });

      const { verifyPayment } = await import('@/lib/zarinpal/client');

      await verifyPayment(
        'A00000000000000000000000000123456789',
        50000 // Tomans
      );

      // Verify the axios post was called with amount in Rials (50000 * 10 = 500000)
      expect(mockPost).toHaveBeenCalledWith(
        '/pg/v4/payment/verify.json',
        expect.objectContaining({
          amount: 500000, // Rials
          authority: 'A00000000000000000000000000123456789',
          merchant_id: 'test-merchant-id',
        })
      );
    });

    it('returns mock success when E2E_MOCK_PAYMENTS is true', async () => {
      process.env.E2E_MOCK_PAYMENTS = 'true';
      const mockPost = getMockPost();

      vi.resetModules();
      const { verifyPayment } = await import('@/lib/zarinpal/client');

      const result = await verifyPayment(
        'A00000000000000000000000000123456789',
        50000
      );

      expect(result.status).toBe(100);
      expect(typeof result.refId).toBe('number');
      // Should NOT call axios in mock mode
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('throws error when verification fails (no ref_id)', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: { data: {} },
      });

      const { verifyPayment } = await import('@/lib/zarinpal/client');

      await expect(
        verifyPayment('A00000000000000000000000000123456789', 50000)
      ).rejects.toThrow('تراکنش ناموفق بود');
    });

    it('throws error on network failure during verification', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Connection timeout'));

      const { verifyPayment } = await import('@/lib/zarinpal/client');

      await expect(
        verifyPayment('A00000000000000000000000000123456789', 50000)
      ).rejects.toThrow('Connection timeout');
    });
  });

  describe('isSandboxMode', () => {
    it('returns true when ZARINPAL_SANDBOX is "true"', async () => {
      process.env.ZARINPAL_SANDBOX = 'true';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zarinpal/client');

      expect(isSandboxMode()).toBe(true);
    });

    it('returns false when ZARINPAL_SANDBOX is "false"', async () => {
      process.env.ZARINPAL_SANDBOX = 'false';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zarinpal/client');

      expect(isSandboxMode()).toBe(false);
    });

    it('returns false when ZARINPAL_SANDBOX is undefined', async () => {
      delete process.env.ZARINPAL_SANDBOX;

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/zarinpal/client');

      expect(isSandboxMode()).toBe(false);
    });
  });

  describe('getCallbackUrl', () => {
    it('returns callback URL using NEXT_PUBLIC_APP_URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zarinpal/client');

      expect(getCallbackUrl()).toBe('https://kitia.ir/api/transactions/verify');
    });

    it('falls back to NEXTAUTH_URL if NEXT_PUBLIC_APP_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXTAUTH_URL = 'https://auth.kitia.ir';

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zarinpal/client');

      expect(getCallbackUrl()).toBe(
        'https://auth.kitia.ir/api/transactions/verify'
      );
    });

    it('falls back to localhost if neither URL is set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zarinpal/client');

      expect(getCallbackUrl()).toBe(
        'http://localhost:3000/api/transactions/verify'
      );
    });

    it('ignores requestUrl parameter (uses env vars for reverse proxy compatibility)', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/zarinpal/client');

      // Even when a requestUrl is passed, it should use env vars
      expect(getCallbackUrl('http://localhost:3001')).toBe(
        'https://kitia.ir/api/transactions/verify'
      );
    });
  });
});
