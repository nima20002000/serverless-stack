/**
 * Digipay Payment Gateway Client Tests
 *
 * Tests for src/lib/digipay/client.ts
 * High-level Digipay wrapper with token caching
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock shell-client
const mockObtainAccessToken = vi.fn();
const mockCreateTicket = vi.fn();
const mockVerifyPurchase = vi.fn();
const mockReversePurchase = vi.fn();
const mockIsSandboxMode = vi.fn();

vi.mock('@/lib/digipay/shell-client', () => ({
  obtainAccessToken: mockObtainAccessToken,
  createTicket: mockCreateTicket,
  verifyPurchase: mockVerifyPurchase,
  reversePurchase: mockReversePurchase,
  isSandboxMode: mockIsSandboxMode,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('server-only', () => ({}));

describe('digipay/client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';

    // Default mock implementations
    mockObtainAccessToken.mockResolvedValue({
      access_token: 'test-access-token',
      token_type: 'bearer',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      scope: 'read write',
      jti: 'test-jti',
    });

    mockIsSandboxMode.mockReturnValue(false);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createPaymentRequest', () => {
    it('creates payment request with correct gateway mapping - WALLET', async () => {
      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      const result = await createPaymentRequest({
        amount: 10000, // Tomans
        description: 'Test payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-ABC123',
        preferredGateway: 'WALLET',
      });

      expect(result.ticket).toBe('ticket-12345');
      expect(result.redirectUrl).toBe('https://digipay.ir/pay/ticket-12345');
      expect(result.status).toBe(100);

      // Verify WALLET maps to gatewayCode 0
      expect(mockCreateTicket).toHaveBeenCalledWith(
        'test-access-token',
        expect.objectContaining({
          preferredGateway: 0, // WALLET -> 0
          amount: 100000, // 10000 * 10 Rials
        })
      );
    });

    it('creates payment request with correct gateway mapping - IPG', async () => {
      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Test payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-ABC123',
        preferredGateway: 'IPG',
      });

      // Verify IPG maps to gatewayCode 2
      expect(mockCreateTicket).toHaveBeenCalledWith(
        'test-access-token',
        expect.objectContaining({
          preferredGateway: 2, // IPG -> 2
        })
      );
    });

    it('creates payment request without gateway preference', async () => {
      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      await createPaymentRequest({
        amount: 10000,
        description: 'Test payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-ABC123',
        // No preferredGateway
      });

      // Verify gatewayCode is undefined when no preference
      expect(mockCreateTicket).toHaveBeenCalledWith(
        'test-access-token',
        expect.objectContaining({
          preferredGateway: undefined,
        })
      );
    });

    it('converts Tomans to Rials correctly (amount * 10)', async () => {
      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      await createPaymentRequest({
        amount: 25000, // Tomans
        description: 'Test payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-ABC123',
      });

      expect(mockCreateTicket).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: 250000, // 25000 * 10 = 250000 Rials
        })
      );
    });

    it('throws error when ticket creation fails', async () => {
      mockCreateTicket.mockRejectedValue(new Error('خطا در ایجاد تیکت پرداخت'));

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      await expect(
        createPaymentRequest({
          amount: 10000,
          description: 'Test payment',
          cellNumber: '09123456789',
          callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('خطا در ایجاد تیکت پرداخت');
    });
  });

  describe('verifyPayment', () => {
    it('verifies payment with amount and providerId validation', async () => {
      mockVerifyPurchase.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        trackingCode: 'TRK123456',
        providerId: 'KT-ABC123',
        amount: 100000, // Rials
        fpName: 'Bank Melli',
        paymentGateway: 2,
      });

      const { verifyPayment } = await import('@/lib/digipay/client');

      const result = await verifyPayment({
        trackingCode: 'TRK123456',
        amount: 10000, // Tomans
        providerId: 'KT-ABC123',
      });

      expect(result.status).toBe(100);
      expect(result.trackingCode).toBe('TRK123456');
      expect(result.amount).toBe(100000);
      expect(result.fpName).toBe('Bank Melli');
    });

    it('throws error when verified amount does not match (CRITICAL security check)', async () => {
      mockVerifyPurchase.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        trackingCode: 'TRK123456',
        providerId: 'KT-ABC123',
        amount: 90000, // Should be 100000 Rials
        fpName: 'Bank Melli',
        paymentGateway: 2,
      });

      const { verifyPayment } = await import('@/lib/digipay/client');

      // Input: 10000 Tomans = 100000 Rials
      // Response: 90000 Rials - mismatch!
      await expect(
        verifyPayment({
          trackingCode: 'TRK123456',
          amount: 10000, // Tomans
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('مبلغ پرداخت شده با مبلغ تراکنش مطابقت ندارد');
    });

    it('throws error when providerId does not match (CRITICAL security check)', async () => {
      mockVerifyPurchase.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        trackingCode: 'TRK123456',
        providerId: 'KT-XYZ789', // Different providerId
        amount: 100000,
        fpName: 'Bank Melli',
        paymentGateway: 2,
      });

      const { verifyPayment } = await import('@/lib/digipay/client');

      await expect(
        verifyPayment({
          trackingCode: 'TRK123456',
          amount: 10000,
          providerId: 'KT-ABC123', // Original providerId
        })
      ).rejects.toThrow('شناسه تراکنش مطابقت ندارد');
    });

    it('throws error when verification fails', async () => {
      mockVerifyPurchase.mockRejectedValue(new Error('تراکنش ناموفق بود'));

      const { verifyPayment } = await import('@/lib/digipay/client');

      await expect(
        verifyPayment({
          trackingCode: 'TRK123456',
          amount: 10000,
          providerId: 'KT-ABC123',
        })
      ).rejects.toThrow('تراکنش ناموفق بود');
    });
  });

  describe('reversePayment', () => {
    it('reverses payment successfully', async () => {
      mockReversePurchase.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        trackingCode: 'REV123456',
        amount: 100000,
      });

      const { reversePayment } = await import('@/lib/digipay/client');

      // Should not throw
      await expect(
        reversePayment('TRK123456', 'KT-ABC123')
      ).resolves.toBeUndefined();

      expect(mockReversePurchase).toHaveBeenCalledWith('test-access-token', {
        purchaseTrackingCode: 'TRK123456',
        providerId: 'KT-ABC123',
      });
    });

    it('throws error when reversal fails', async () => {
      mockReversePurchase.mockRejectedValue(new Error('خطا در برگشت تراکنش'));

      const { reversePayment } = await import('@/lib/digipay/client');

      await expect(reversePayment('TRK123456', 'KT-ABC123')).rejects.toThrow(
        'خطا در برگشت تراکنش'
      );
    });
  });

  describe('getCallbackUrl', () => {
    it('returns Digipay-specific callback URL', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/digipay/client');

      expect(getCallbackUrl()).toBe(
        'https://kitia.ir/api/transactions/verify-digipay'
      );
    });

    it('falls back to NEXTAUTH_URL if NEXT_PUBLIC_APP_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      process.env.NEXTAUTH_URL = 'https://auth.kitia.ir';

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/digipay/client');

      expect(getCallbackUrl()).toBe(
        'https://auth.kitia.ir/api/transactions/verify-digipay'
      );
    });

    it('falls back to localhost if neither URL is set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.NEXTAUTH_URL;

      vi.resetModules();
      const { getCallbackUrl } = await import('@/lib/digipay/client');

      expect(getCallbackUrl()).toBe(
        'http://localhost:3000/api/transactions/verify-digipay'
      );
    });
  });

  describe('token caching (getValidToken)', () => {
    it('returns cached token when not expired', async () => {
      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      // First call - should get new token
      await createPaymentRequest({
        amount: 10000,
        description: 'First payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-001',
      });

      expect(mockObtainAccessToken).toHaveBeenCalledTimes(1);

      // Second call - should use cached token
      await createPaymentRequest({
        amount: 20000,
        description: 'Second payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-002',
      });

      // Should still be 1 call (used cache)
      expect(mockObtainAccessToken).toHaveBeenCalledTimes(1);
    });

    it('obtains new token when cached token is expired', async () => {
      vi.useFakeTimers();

      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      // First call - gets new token
      await createPaymentRequest({
        amount: 10000,
        description: 'First payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-001',
      });

      expect(mockObtainAccessToken).toHaveBeenCalledTimes(1);

      // Advance time past expiration (3600 seconds = 1 hour)
      vi.advanceTimersByTime(3600 * 1000 + 1000);

      // Second call - should get new token due to expiration
      await createPaymentRequest({
        amount: 20000,
        description: 'Second payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-002',
      });

      expect(mockObtainAccessToken).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('refreshes token 5 minutes before expiration', async () => {
      vi.useFakeTimers();

      mockCreateTicket.mockResolvedValue({
        result: { status: 0, message: 'Success' },
        ticket: 'ticket-12345',
        redirectUrl: 'https://digipay.ir/pay/ticket-12345',
      });

      const { createPaymentRequest } = await import('@/lib/digipay/client');

      // First call - gets new token
      await createPaymentRequest({
        amount: 10000,
        description: 'First payment',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-001',
      });

      expect(mockObtainAccessToken).toHaveBeenCalledTimes(1);

      // Token expires in 3600s, advance to 4 minutes before expiration
      // 3600 - 4*60 = 3360s = should still use cache
      vi.advanceTimersByTime(3360 * 1000);

      await createPaymentRequest({
        amount: 15000,
        description: 'Payment at 4min before',
        cellNumber: '09123456789',
        callbackUrl: 'https://kitia.ir/api/transactions/verify-digipay',
        providerId: 'KT-002',
      });

      // Should refresh because we're within 5-minute buffer
      expect(mockObtainAccessToken).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
