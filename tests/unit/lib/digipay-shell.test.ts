/**
 * Digipay Shell Client Tests
 *
 * Tests for src/lib/digipay/shell-client.ts
 * Low-level Digipay API client with OAuth and direct API calls
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

// Mock FormData
vi.mock('form-data', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      append: vi.fn(),
      getHeaders: vi.fn(() => ({
        'content-type': 'multipart/form-data; boundary=---formdata-boundary',
      })),
    })),
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

describe('digipay/shell-client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Set up required environment variables
    process.env = { ...originalEnv };
    process.env.DIGIPAY_CLIENT_ID = 'test-client-id';
    process.env.DIGIPAY_CLIENT_SECRET = 'test-client-secret';
    process.env.DIGIPAY_USERNAME = 'test-username';
    process.env.DIGIPAY_PASSWORD = 'test-password';
    process.env.DIGIPAY_SANDBOX = 'true';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isSandboxMode', () => {
    it('returns true when DIGIPAY_SANDBOX is "true"', async () => {
      process.env.DIGIPAY_SANDBOX = 'true';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/digipay/shell-client');

      expect(isSandboxMode()).toBe(true);
    });

    it('returns false when DIGIPAY_SANDBOX is "false"', async () => {
      process.env.DIGIPAY_SANDBOX = 'false';

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/digipay/shell-client');

      expect(isSandboxMode()).toBe(false);
    });

    it('returns false when DIGIPAY_SANDBOX is undefined', async () => {
      delete process.env.DIGIPAY_SANDBOX;

      vi.resetModules();
      const { isSandboxMode } = await import('@/lib/digipay/shell-client');

      expect(isSandboxMode()).toBe(false);
    });
  });

  describe('getDigipayConfig (via obtainAccessToken)', () => {
    it('throws error when credentials are not configured', async () => {
      delete process.env.DIGIPAY_CLIENT_ID;

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await expect(obtainAccessToken()).rejects.toThrow(
        'Digipay credentials not configured'
      );
    });

    it('throws error when client secret is missing', async () => {
      delete process.env.DIGIPAY_CLIENT_SECRET;

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await expect(obtainAccessToken()).rejects.toThrow(
        'Digipay credentials not configured'
      );
    });

    it('throws error when username is missing', async () => {
      delete process.env.DIGIPAY_USERNAME;

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await expect(obtainAccessToken()).rejects.toThrow(
        'Digipay credentials not configured'
      );
    });

    it('throws error when password is missing', async () => {
      delete process.env.DIGIPAY_PASSWORD;

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await expect(obtainAccessToken()).rejects.toThrow(
        'Digipay credentials not configured'
      );
    });

    it('uses UAT URL when DIGIPAY_SANDBOX is true', async () => {
      process.env.DIGIPAY_SANDBOX = 'true';
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: 'read write',
          jti: 'test-jti',
        },
      });

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await obtainAccessToken();

      expect(getMockCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://uat.mydigipay.info',
        })
      );
    });

    it('uses production URL when DIGIPAY_SANDBOX is false', async () => {
      process.env.DIGIPAY_SANDBOX = 'false';
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: 'read write',
          jti: 'test-jti',
        },
      });

      vi.resetModules();
      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await obtainAccessToken();

      expect(getMockCreate()).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://api.mydigipay.com',
        })
      );
    });
  });

  describe('obtainAccessToken', () => {
    it('obtains OAuth token with Basic auth header', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-access-token-12345',
          token_type: 'bearer',
          refresh_token: 'test-refresh-token',
          expires_in: 3600,
          scope: 'read write',
          jti: 'test-jti-123',
        },
      });

      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      const result = await obtainAccessToken();

      expect(result.access_token).toBe('test-access-token-12345');
      expect(result.expires_in).toBe(3600);
      expect(result.token_type).toBe('bearer');

      // Verify the request was made to the correct endpoint
      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/oauth/token',
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringMatching(/^Basic /),
          }),
        })
      );
    });

    it('sends Basic auth with correct base64 encoding', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'bearer',
          refresh_token: 'test-refresh',
          expires_in: 3600,
          scope: 'read write',
          jti: 'test-jti',
        },
      });

      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await obtainAccessToken();

      // Expected: base64(test-client-id:test-client-secret)
      const expectedBasic = Buffer.from(
        'test-client-id:test-client-secret'
      ).toString('base64');

      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/oauth/token',
        expect.anything(),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${expectedBasic}`,
          }),
        })
      );
    });

    it('throws error on authentication failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Unauthorized'));

      const { obtainAccessToken } = await import('@/lib/digipay/shell-client');

      await expect(obtainAccessToken()).rejects.toThrow(
        'خطا در دریافت توکن احراز هویت از دیجی‌پی'
      );
    });
  });

  describe('createTicket', () => {
    it('creates ticket with correct headers and body', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: { status: 0, message: 'Success', title: 'OK', level: 'INFO' },
          ticket: 'test-ticket-12345',
          redirectUrl: 'https://digipay.ir/pay/test-ticket-12345',
        },
      });

      const { createTicket } = await import('@/lib/digipay/shell-client');

      const result = await createTicket('access-token-abc', {
        cellNumber: '09123456789',
        amount: 100000, // Rials
        providerId: 'KT-ABC123',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
      });

      expect(result.ticket).toBe('test-ticket-12345');
      expect(result.redirectUrl).toBe(
        'https://digipay.ir/pay/test-ticket-12345'
      );

      // Verify correct endpoint and headers
      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/tickets/business?type=11',
        expect.objectContaining({
          cellNumber: '09123456789',
          amount: 100000,
          providerId: 'KT-ABC123',
          callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Agent: 'WEB',
            'Digipay-Version': '2022-02-02',
            'Content-Type': 'application/json',
            Authorization: 'Bearer access-token-abc',
          }),
        })
      );
    });

    it('includes additionalInfo when preferredGateway is specified', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: { status: 0, message: 'Success', title: 'OK', level: 'INFO' },
          ticket: 'test-ticket-12345',
          redirectUrl: 'https://digipay.ir/pay/test-ticket-12345',
        },
      });

      const { createTicket } = await import('@/lib/digipay/shell-client');

      await createTicket('access-token-abc', {
        cellNumber: '09123456789',
        amount: 100000,
        providerId: 'KT-ABC123',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        preferredGateway: 2, // IPG
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/tickets/business?type=11',
        expect.objectContaining({
          additionalInfo: { preferredGateway: 2 },
        }),
        expect.anything()
      );
    });

    it('does not include additionalInfo when preferredGateway is undefined', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: { status: 0, message: 'Success', title: 'OK', level: 'INFO' },
          ticket: 'test-ticket-12345',
          redirectUrl: 'https://digipay.ir/pay/test-ticket-12345',
        },
      });

      const { createTicket } = await import('@/lib/digipay/shell-client');

      await createTicket('access-token-abc', {
        cellNumber: '09123456789',
        amount: 100000,
        providerId: 'KT-ABC123',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
      });

      // The call should NOT include additionalInfo
      const callArgs = mockPost.mock.calls[0];
      expect(callArgs[1].additionalInfo).toBeUndefined();
    });

    it('throws error when ticket creation fails', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 5,
            message: 'خطا در ایجاد تیکت پرداخت', // Persian error message
            title: 'Error',
            level: 'ERROR',
          },
          ticket: '',
          redirectUrl: '',
        },
      });

      const { createTicket } = await import('@/lib/digipay/shell-client');

      await expect(
        createTicket('access-token-abc', {
          cellNumber: '09123456789',
          amount: 100000,
          providerId: 'KT-ABC123',
          callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        })
      ).rejects.toThrow('خطا در ایجاد تیکت');
    });

    it('throws generic error when ticket creation fails without message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 99,
            message: '',
            title: 'Error',
            level: 'ERROR',
          },
          ticket: '',
          redirectUrl: '',
        },
      });

      const { createTicket } = await import('@/lib/digipay/shell-client');

      await expect(
        createTicket('access-token-abc', {
          cellNumber: '09123456789',
          amount: 100000,
          providerId: 'KT-ABC123',
          callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        })
      ).rejects.toThrow('خطا در ایجاد تیکت پرداخت');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Network error'));

      const { createTicket } = await import('@/lib/digipay/shell-client');

      await expect(
        createTicket('access-token-abc', {
          cellNumber: '09123456789',
          amount: 100000,
          providerId: 'KT-ABC123',
          callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        })
      ).rejects.toThrow('خطا در اتصال به درگاه پرداخت دیجی‌پی');
    });
  });

  describe('verifyPurchase', () => {
    it('verifies purchase with tracking code', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: { status: 0, message: 'Success', level: 'INFO' },
          trackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
          fpCode: 'FP001',
          fpName: 'Bank Melli',
          amount: 100000,
          paymentGateway: 2,
        },
      });

      const { verifyPurchase } = await import('@/lib/digipay/shell-client');

      const result = await verifyPurchase('access-token-abc', {
        trackingCode: 'TRK123456',
        providerId: 'KT-ABC123',
      });

      expect(result.trackingCode).toBe('TRK123456');
      expect(result.providerId).toBe('KT-ABC123');
      expect(result.amount).toBe(100000);
      expect(result.fpName).toBe('Bank Melli');

      // Verify correct endpoint
      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/purchases/verify?type=5',
        { trackingCode: 'TRK123456', providerId: 'KT-ABC123' },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token-abc',
          }),
        })
      );
    });

    it('throws error when verification status is not 0', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 3,
            message: 'تراکنش ناموفق بود', // Persian error message
            level: 'ERROR',
          },
          trackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
          amount: 100000,
        },
      });

      const { verifyPurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        verifyPurchase('access-token-abc', {
          trackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('تراکنش ناموفق');
    });

    it('throws generic error when verification fails without message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 99,
            message: '',
            level: 'ERROR',
          },
        },
      });

      const { verifyPurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        verifyPurchase('access-token-abc', {
          trackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('تراکنش ناموفق بود');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Network timeout'));

      const { verifyPurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        verifyPurchase('access-token-abc', {
          trackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('خطا در تأیید پرداخت');
    });
  });

  describe('reversePurchase', () => {
    it('reverses purchase with tracking code', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: { status: 0, message: 'Success', level: 'INFO' },
          trackingCode: 'REV123456',
          providerId: 'KT-ABC123',
          amount: 100000,
          paymentGateway: 2,
        },
      });

      const { reversePurchase } = await import('@/lib/digipay/shell-client');

      const result = await reversePurchase('access-token-abc', {
        purchaseTrackingCode: 'TRK123456',
        providerId: 'KT-ABC123',
      });

      expect(result.trackingCode).toBe('REV123456');
      expect(result.amount).toBe(100000);

      // Verify correct endpoint
      expect(mockPost).toHaveBeenCalledWith(
        '/digipay/api/reverse',
        { purchaseTrackingCode: 'TRK123456', providerId: 'KT-ABC123' },
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer access-token-abc',
          }),
        })
      );
    });

    it('throws error when reverse status is not 0', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 5,
            message: 'خطا در برگشت تراکنش', // Persian error message
            level: 'ERROR',
          },
        },
      });

      const { reversePurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        reversePurchase('access-token-abc', {
          purchaseTrackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('خطا در برگشت تراکنش');
    });

    it('throws generic error when reverse fails without message', async () => {
      const mockPost = getMockPost();
      mockPost.mockResolvedValue({
        data: {
          result: {
            status: 99,
            message: '',
            level: 'ERROR',
          },
        },
      });

      const { reversePurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        reversePurchase('access-token-abc', {
          purchaseTrackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('خطا در برگشت تراکنش');
    });

    it('throws error on network failure', async () => {
      const mockPost = getMockPost();
      mockPost.mockRejectedValue(new Error('Connection refused'));

      const { reversePurchase } = await import('@/lib/digipay/shell-client');

      await expect(
        reversePurchase('access-token-abc', {
          purchaseTrackingCode: 'TRK123456',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('خطا در برگشت تراکنش');
    });
  });
});
