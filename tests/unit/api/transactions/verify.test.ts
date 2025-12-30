/**
 * Zarinpal Payment Verification API Route Tests
 *
 * Tests for src/app/api/transactions/verify/route.ts
 * CRITICAL: These tests verify payment callback handling, idempotency,
 * and error resilience for Zarinpal payment gateway.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock all dependencies BEFORE importing the route handler
vi.mock('@/services/transaction-service', () => ({
  getTransactionByAuthority: vi.fn(),
  updateTransactionStatus: vi.fn(),
  reduceProductStock: vi.fn(),
  getTransactionWithVariants: vi.fn(),
  linkTransactionToUser: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByPhone: vi.fn(),
}));

vi.mock('@/lib/zarinpal/client', () => ({
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

vi.mock('server-only', () => ({}));

// Import mocked functions for assertions
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';

import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/zarinpal/client';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';

// Helper function to create mock requests
function createMockRequest(
  authority: string | null,
  status: string = 'OK'
): NextRequest {
  const url = new URL('http://localhost:3000/api/transactions/verify');
  if (authority) {
    url.searchParams.set('Authority', authority);
  }
  url.searchParams.set('Status', status);
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

describe('GET /api/transactions/verify (Zarinpal)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset module cache to ensure clean state
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to import fresh route handler
  async function getHandler() {
    const { GET } = await import('@/app/api/transactions/verify/route');
    return GET;
  }

  describe('Parameter Validation', () => {
    it('returns 400 when Authority parameter is missing', async () => {
      const GET = await getHandler();
      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Status', 'OK');
      // No Authority parameter
      const req = new NextRequest(url);

      const response = await GET(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
      expect(body.error).toContain('Authority');
    });

    it('returns error when transaction with authority does not exist', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockRejectedValue(
        new Error('تراکنش یافت نشد')
      );

      const req = createMockRequest('AUTH123456');
      const response = await GET(req);

      // Should redirect to failure page
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Idempotency - Already Completed Transaction', () => {
    it('redirects to success when transaction is already COMPLETED', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockRequest('AUTH123456');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(response.headers.get('Location')).toContain('code=KT-ABC123');
      // CRITICAL: Should NOT call verifyPayment for already completed transactions
      expect(verifyPayment).not.toHaveBeenCalled();
      expect(updateTransactionStatus).not.toHaveBeenCalled();
    });

    it('does not reprocess notifications for completed transaction', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockRequest('AUTH123456');
      await GET(req);

      expect(sendAdminOrderConfirmation).not.toHaveBeenCalled();
      expect(sendBuyerOrderConfirmation).not.toHaveBeenCalled();
      expect(sendOrderConfirmation).not.toHaveBeenCalled();
      expect(reduceProductStock).not.toHaveBeenCalled();
    });
  });

  describe('Idempotency - Already Failed Transaction', () => {
    it('redirects to failure when transaction is already FAILED', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({ status: 'FAILED' })
      );

      const req = createMockRequest('AUTH123456');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
      expect(response.headers.get('Location')).toContain('code=KT-ABC123');
      expect(verifyPayment).not.toHaveBeenCalled();
      expect(updateTransactionStatus).not.toHaveBeenCalled();
    });
  });

  describe('User Cancelled Payment', () => {
    it('marks transaction as FAILED when status is NOK', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );

      const req = createMockRequest('AUTH123456', 'NOK');
      const response = await GET(req);

      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'FAILED',
        'AUTH123456'
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('marks transaction as FAILED when status is empty', async () => {
      const GET = await getHandler();
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );

      const req = createMockRequest('AUTH123456', '');
      const response = await GET(req);

      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'FAILED',
        'AUTH123456'
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Successful Payment Verification', () => {
    beforeEach(() => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });
    });

    it('verifies payment and updates transaction to COMPLETED', async () => {
      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      expect(verifyPayment).toHaveBeenCalledWith('AUTH123456', 50000);
      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'COMPLETED',
        'AUTH123456',
        1234567890
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(response.headers.get('Location')).toContain('code=KT-ABC123');
      expect(response.headers.get('Location')).toContain('refId=1234567890');
    });

    it('reduces product stock after successful verification', async () => {
      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(reduceProductStock).toHaveBeenCalledWith('tx-1');
    });

    it('sends admin confirmation email after successful verification', async () => {
      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(sendAdminOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'tx-1' }),
        1234567890
      );
    });

    it('sends buyer SMS confirmation after successful verification', async () => {
      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(sendOrderConfirmation).toHaveBeenCalledWith(
        '09123456789',
        'KT-ABC123'
      );
    });

    it('sends buyer email confirmation when email is provided', async () => {
      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(sendBuyerOrderConfirmation).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@test.com' })
      );
    });
  });

  describe('Order Flow Sequence', () => {
    it('executes post-payment actions in correct order', async () => {
      const callOrder: string[] = [];

      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockImplementation(async () => {
        callOrder.push('verifyPayment');
        return { status: 100, refId: 1234567890 };
      });
      vi.mocked(updateTransactionStatus).mockImplementation(async () => {
        callOrder.push('updateTransactionStatus');
      });
      vi.mocked(reduceProductStock).mockImplementation(async () => {
        callOrder.push('reduceProductStock');
      });
      vi.mocked(getTransactionWithVariants).mockImplementation(async () => {
        callOrder.push('getTransactionWithVariants');
        return createMockTransaction({ email: 'test@test.com' });
      });
      vi.mocked(sendAdminOrderConfirmation).mockImplementation(async () => {
        callOrder.push('sendAdminOrderConfirmation');
        return { success: true, messageId: 'msg-1' };
      });
      vi.mocked(sendOrderConfirmation).mockImplementation(async () => {
        callOrder.push('sendOrderConfirmation');
        return { success: true, messageId: 'sms-1' };
      });
      vi.mocked(sendBuyerOrderConfirmation).mockImplementation(async () => {
        callOrder.push('sendBuyerOrderConfirmation');
        return { success: true, messageId: 'msg-2' };
      });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      // Verify correct order of operations
      expect(callOrder).toEqual([
        'verifyPayment',
        'updateTransactionStatus',
        'reduceProductStock',
        'getTransactionWithVariants',
        'sendAdminOrderConfirmation',
        'sendOrderConfirmation',
        'sendBuyerOrderConfirmation',
      ]);
    });
  });

  describe('Error Resilience - Notification Failures', () => {
    beforeEach(() => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
    });

    it('continues to success even when admin email fails', async () => {
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

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // Transaction should still be successful
      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'COMPLETED',
        'AUTH123456',
        1234567890
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('continues to success even when SMS fails', async () => {
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

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('continues to success even when buyer email fails', async () => {
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

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Guest Account Creation', () => {
    beforeEach(() => {
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
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

    it('creates user account when createAccount is true and user does not exist', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
          email: 'test@test.com',
          fullName: 'Test User',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({ id: 'new-user-1' });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(getUserByPhone).toHaveBeenCalledWith('09123456789');
      expect(createUser).toHaveBeenCalledWith({
        phone: '09123456789',
        email: 'test@test.com',
        name: 'Test User',
      });
      expect(linkTransactionToUser).toHaveBeenCalledWith('tx-1', 'new-user-1');
    });

    it('links transaction to existing user when phone already registered', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue({ id: 'existing-user-1' });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(getUserByPhone).toHaveBeenCalledWith('09123456789');
      expect(createUser).not.toHaveBeenCalled();
      expect(linkTransactionToUser).toHaveBeenCalledWith(
        'tx-1',
        'existing-user-1'
      );
    });

    it('continues to success even when account creation fails', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockRejectedValue(new Error('Database error'));

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // Payment should still be successful despite account creation failure
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('does not attempt account creation when createAccount is false', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: false,
          phone: '09123456789',
        })
      );

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(getUserByPhone).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });

    it('does not attempt account creation when userId already exists', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: 'existing-user-1',
          createAccount: true,
          phone: '09123456789',
        })
      );

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(getUserByPhone).not.toHaveBeenCalled();
      expect(createUser).not.toHaveBeenCalled();
    });
  });

  describe('Verification API Error', () => {
    it('marks transaction as FAILED when Zarinpal verification fails', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockRejectedValue(
        new Error('Zarinpal API error')
      );

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'FAILED',
        'AUTH123456'
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Error Handling - Completed Transaction Protection', () => {
    it('does not mark COMPLETED transaction as FAILED on error', async () => {
      // First call returns pending, second call (in catch) returns completed
      vi.mocked(getTransactionByAuthority)
        .mockResolvedValueOnce(createMockTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(createMockTransaction({ status: 'COMPLETED' }));

      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });

      // Simulate error after transaction is completed
      vi.mocked(reduceProductStock).mockRejectedValue(
        new Error('Stock reduction error')
      );

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // updateTransactionStatus should be called once for COMPLETED, not FAILED
      expect(updateTransactionStatus).toHaveBeenCalledTimes(1);
      expect(updateTransactionStatus).toHaveBeenCalledWith(
        'tx-1',
        'COMPLETED',
        'AUTH123456',
        1234567890
      );

      // Should redirect to success since transaction was already completed
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('protects completed transaction when post-processing fails', async () => {
      // First call returns pending for normal flow
      vi.mocked(getTransactionByAuthority)
        .mockResolvedValueOnce(createMockTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(createMockTransaction({ status: 'COMPLETED' }));

      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });

      vi.mocked(getTransactionWithVariants).mockRejectedValue(
        new Error('Database error')
      );

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // In catch block, transaction is already COMPLETED so should redirect to success
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Edge Cases', () => {
    it('handles transaction without phone number for SMS', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({ phone: null })
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ phone: null, email: 'test@test.com' })
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendBuyerOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-2',
      });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // Should skip SMS but still succeed
      expect(sendOrderConfirmation).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('handles transaction without email for buyer confirmation', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction()
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: null })
      );
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      const response = await GET(req);

      // Should skip buyer email but still succeed
      expect(sendBuyerOrderConfirmation).not.toHaveBeenCalled();
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('uses default name when fullName is not provided', async () => {
      vi.mocked(getTransactionByAuthority).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
          fullName: null,
        })
      );
      vi.mocked(verifyPayment).mockResolvedValue({
        status: 100,
        refId: 1234567890,
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
      vi.mocked(getUserByPhone).mockResolvedValue(null);
      vi.mocked(createUser).mockResolvedValue({ id: 'new-user-1' });

      const GET = await getHandler();
      const req = createMockRequest('AUTH123456', 'OK');
      await GET(req);

      expect(createUser).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'کاربر' })
      );
    });
  });
});
