/**
 * Zibal Payment Verification API Route Tests
 *
 * Tests for src/app/api/transactions/verify-zibal/route.ts
 * CRITICAL: These tests verify callback handling with trackId parameter,
 * idempotency, and error resilience for Zibal payment gateway.
 *
 * Note: Zibal uses different parameters than Zarinpal:
 * - trackId instead of Authority
 * - success (1/0) instead of Status (OK/NOK)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock all dependencies BEFORE importing the route handler
vi.mock('@/services/transaction-service', () => ({
  getTransactionByZibalTrackId: vi.fn(),
  reduceProductStock: vi.fn(),
  getTransactionWithVariants: vi.fn(),
  linkTransactionToUser: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByPhone: vi.fn(),
}));

vi.mock('@/lib/zibal/client', () => ({
  verifyPayment: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({
  sendAdminOrderConfirmation: vi.fn(),
  sendBuyerOrderConfirmation: vi.fn(),
}));

vi.mock('@/services/sms-service', () => ({
  sendOrderConfirmation: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/utils/url', () => ({
  createRedirectUrl: (path: string) => `https://kitia.ir${path}`,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: { status: 'COMPLETED' }, error: null })
          ),
        })),
      })),
    })),
  })),
}));

vi.mock('server-only', () => ({}));

// Import mocked functions for assertions
import {
  getTransactionByZibalTrackId,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';

import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/zibal/client';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';

// Helper function to create mock request with Zibal parameters
function createMockRequest(
  trackId: string | null,
  success: string = '1',
  status: string = '2'
): NextRequest {
  const url = new URL('http://localhost:3000/api/transactions/verify-zibal');
  if (trackId) url.searchParams.set('trackId', trackId);
  url.searchParams.set('success', success);
  url.searchParams.set('status', status);
  return new NextRequest(url);
}

// Create a mock transaction object
function createMockTransaction(overrides = {}) {
  return {
    id: 'tx-1',
    transactionCode: 'KT-ABC123',
    status: 'PENDING',
    amount: 50000,
    phone: '09123456789',
    email: 'test@test.com',
    fullName: 'Test User',
    userId: null,
    createAccount: false,
    ...overrides,
  };
}

describe('GET /api/transactions/verify-zibal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to import fresh route handler
  async function getHandler() {
    const { GET } = await import('@/app/api/transactions/verify-zibal/route');
    return GET;
  }

  describe('Parameter Validation', () => {
    it('returns 400 when trackId is missing', async () => {
      const GET = await getHandler();
      const url = new URL(
        'http://localhost:3000/api/transactions/verify-zibal'
      );
      url.searchParams.set('success', '1');
      // No trackId parameter
      const req = new NextRequest(url);

      const response = await GET(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns error when transaction with trackId does not exist', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockRejectedValue(
        new Error('تراکنش یافت نشد')
      );

      const req = createMockRequest('12345678');
      const response = await GET(req);

      // Should redirect to failure page
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Transaction Lookup', () => {
    it('finds transaction using trackId', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const req = createMockRequest('12345678');
      await GET(req);

      // Uses getTransactionByZibalTrackId, NOT getTransactionByAuthority
      expect(getTransactionByZibalTrackId).toHaveBeenCalledWith('12345678');
    });
  });

  describe('Idempotency', () => {
    it('redirects to success when transaction already COMPLETED', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockRequest('12345678');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(response.headers.get('Location')).toContain('code=KT-ABC123');
      expect(verifyPayment).not.toHaveBeenCalled();
    });

    it('redirects to failure when transaction already FAILED and callback is not success', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({ status: 'FAILED' })
      );

      const req = createMockRequest('12345678', '0');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
      expect(verifyPayment).not.toHaveBeenCalled();
    });

    it('re-verifies when failed transaction receives success callback', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({ status: 'FAILED' })
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(verifyPayment).toHaveBeenCalledWith({
        trackId: 12345678,
        amount: 50000,
      });
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('does not reprocess for completed transaction even if success=1', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockRequest('12345678', '1');
      await GET(req);

      expect(verifyPayment).not.toHaveBeenCalled();
      expect(reduceProductStock).not.toHaveBeenCalled();
      expect(sendAdminOrderConfirmation).not.toHaveBeenCalled();
    });
  });

  describe('Zibal Failure Status', () => {
    it('redirects to failure when success is 0', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );

      const req = createMockRequest('12345678', '0');
      const response = await GET(req);

      // Should redirect to failure without calling verifyPayment
      expect(verifyPayment).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('redirects to failure when success is empty', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );

      const req = createMockRequest('12345678', '');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('redirects to failure when success is -1', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );

      const req = createMockRequest('12345678', '-1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Zibal Verification Success', () => {
    beforeEach(() => {
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });
    });

    it('verifies payment with Zibal and processes order', async () => {
      const GET = await getHandler();

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      // Zibal uses numeric trackId
      expect(verifyPayment).toHaveBeenCalledWith({
        trackId: 12345678,
        amount: 50000,
      });
      expect(reduceProductStock).toHaveBeenCalledWith('tx-1');
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(response.headers.get('Location')).toContain('refId=9876543210');
    });

    it('sends all notifications after successful verification', async () => {
      const GET = await getHandler();

      const req = createMockRequest('12345678', '1');
      await GET(req);

      expect(sendAdminOrderConfirmation).toHaveBeenCalled();
      expect(sendOrderConfirmation).toHaveBeenCalledWith(
        '09123456789',
        'KT-ABC123'
      );
      expect(sendBuyerOrderConfirmation).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('handles verification errors gracefully', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockRejectedValue(new Error('Zibal API error'));

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('does not mark COMPLETED transaction as FAILED on error', async () => {
      const GET = await getHandler();
      // First call returns pending, second call (in catch) returns completed
      vi.mocked(getTransactionByZibalTrackId)
        .mockResolvedValueOnce(createMockTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(createMockTransaction({ status: 'COMPLETED' }));

      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });

      vi.mocked(reduceProductStock).mockRejectedValue(
        new Error('Stock reduction error')
      );

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      // Should redirect to success since transaction was already completed
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Error Resilience - Notification Failures', () => {
    beforeEach(() => {
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
    });

    it('continues to success even when admin email fails', async () => {
      const GET = await getHandler();
      vi.mocked(sendAdminOrderConfirmation).mockRejectedValue(
        new Error('Email service down')
      );
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('continues to success even when SMS fails', async () => {
      const GET = await getHandler();
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockRejectedValue(
        new Error('SMS service down')
      );
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('continues to success even when buyer email fails', async () => {
      const GET = await getHandler();
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockRejectedValue(
        new Error('Email service down')
      );

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Guest Account Creation', () => {
    beforeEach(() => {
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });
    });

    it('creates user account for guest checkout when requested', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
          email: 'guest@test.com',
          fullName: 'Guest User',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({ id: 'new-user-1' });

      const req = createMockRequest('12345678', '1');
      await GET(req);

      expect(getUserByPhone).toHaveBeenCalledWith('09123456789');
      expect(createUser).toHaveBeenCalledWith({
        phone: '09123456789',
        email: 'guest@test.com',
        name: 'Guest User',
      });
      expect(linkTransactionToUser).toHaveBeenCalledWith('tx-1', 'new-user-1');
    });

    it('links to existing user when phone is already registered', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue({ id: 'existing-user-1' });

      const req = createMockRequest('12345678', '1');
      await GET(req);

      expect(createUser).not.toHaveBeenCalled();
      expect(linkTransactionToUser).toHaveBeenCalledWith(
        'tx-1',
        'existing-user-1'
      );
    });

    it('continues to success even when account creation fails', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });
    });

    it('handles transaction without phone number for SMS', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({ phone: null })
      );
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ phone: null, email: 'test@test.com' })
      );

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      // Should skip SMS but still succeed
      expect(sendOrderConfirmation).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('handles transaction without email for buyer confirmation', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: null })
      );
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });

      const req = createMockRequest('12345678', '1');
      const response = await GET(req);

      // Should skip buyer email but still succeed
      expect(sendBuyerOrderConfirmation).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('uses default name when fullName is not provided', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
          fullName: null,
        })
      );
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({ id: 'new-user-1' });

      const req = createMockRequest('12345678', '1');
      await GET(req);

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'کاربر' })
      );
    });
  });

  describe('Numeric trackId Handling', () => {
    it('parses trackId as integer for Zibal API call', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByZibalTrackId).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });

      const req = createMockRequest('12345678', '1');
      await GET(req);

      // trackId should be parsed as integer
      expect(verifyPayment).toHaveBeenCalledWith({
        trackId: 12345678, // Numeric, not string
        amount: 50000,
      });
    });
  });
});
