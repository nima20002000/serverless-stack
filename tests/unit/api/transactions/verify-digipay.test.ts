/**
 * Digipay Payment Verification API Route Tests
 *
 * Tests for src/app/api/transactions/verify-digipay/route.ts
 * CRITICAL: These tests verify POST/GET callback handling, body parsing,
 * idempotency, and 303 redirect status for Digipay payment gateway.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock all dependencies BEFORE importing the route handler
vi.mock('@/services/transaction-service', () => ({
  getTransactionById: vi.fn(),
  reduceProductStock: vi.fn(),
  getTransactionWithVariants: vi.fn(),
  linkTransactionToUser: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByPhone: vi.fn(),
}));

vi.mock('@/lib/digipay/client', () => ({
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
  getTransactionById,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';

import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/digipay/client';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';

// Helper function to create GET mock request
function createMockGetRequest(
  ticket: string | null,
  trackingCode: string | null,
  status: string = 'SUCCESS'
): NextRequest {
  const url = new URL('http://localhost:3000/api/transactions/verify-digipay');
  if (ticket) url.searchParams.set('ticket', ticket);
  if (trackingCode) url.searchParams.set('trackingCode', trackingCode);
  url.searchParams.set('status', status);
  return new NextRequest(url, { method: 'GET' });
}

// Helper function to create POST mock request with form-encoded body
function createMockPostRequest(
  body: Record<string, string>,
  ticket: string | null,
  contentType: string = 'application/x-www-form-urlencoded'
): NextRequest {
  const url = new URL('http://localhost:3000/api/transactions/verify-digipay');
  if (ticket) url.searchParams.set('ticket', ticket);

  let bodyContent: string;
  if (contentType.includes('application/json')) {
    bodyContent = JSON.stringify(body);
  } else {
    bodyContent = new URLSearchParams(body).toString();
  }

  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'content-type': contentType,
    },
    body: bodyContent,
  });
}

// Helper for multipart form data
function createMockMultipartRequest(
  body: Record<string, string>,
  ticket: string | null
): NextRequest {
  const url = new URL('http://localhost:3000/api/transactions/verify-digipay');
  if (ticket) url.searchParams.set('ticket', ticket);

  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => {
    formData.append(key, value);
  });

  return new NextRequest(url, {
    method: 'POST',
    body: formData,
  });
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

describe('POST/GET /api/transactions/verify-digipay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to import fresh route handlers
  async function getHandlers() {
    const { GET, POST } =
      await import('@/app/api/transactions/verify-digipay/route');
    return { GET, POST };
  }

  describe('POST Body Parsing', () => {
    it('parses form-encoded POST body correctly', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
          providerId: 'KT-ABC123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(verifyPayment).toHaveBeenCalledWith({
        trackingCode: 'DGP123',
        amount: 50000,
        providerId: 'KT-ABC123',
      });
      expect(response.status).toBe(303);
    });

    it('parses multipart/form-data POST body', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP456',
        fpName: 'Test Bank',
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

      const req = createMockMultipartRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP456',
          providerId: 'KT-ABC123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(verifyPayment).toHaveBeenCalled();
      expect(response.status).toBe(303);
    });

    it('parses JSON body when content-type is application/json', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP789',
        fpName: 'Test Bank',
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP789',
          providerId: 'KT-ABC123',
        },
        'tx-1',
        'application/json'
      );

      const response = await POST(req);

      expect(verifyPayment).toHaveBeenCalled();
      expect(response.status).toBe(303);
    });

    it('attempts URL parsing for unknown content types', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGPXXX',
        fpName: 'Test Bank',
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

      const url = new URL(
        'http://localhost:3000/api/transactions/verify-digipay'
      );
      url.searchParams.set('ticket', 'tx-1');

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'text/plain',
        },
        body: 'result=SUCCESS&trackingCode=DGPXXX&providerId=KT-ABC123',
      });

      const response = await POST(req);

      expect(response.status).toBe(303);
    });
  });

  describe('Parameter Validation', () => {
    it('returns 400 when trackingCode is missing', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          // No trackingCode
          providerId: 'KT-ABC123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });

    it('returns 400 when ticket query param is missing', async () => {
      const { POST } = await getHandlers();

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
          providerId: 'KT-ABC123',
        },
        null // No ticket
      );

      const response = await POST(req);

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBeDefined();
    });
  });

  describe('Transaction Lookup', () => {
    it('finds transaction using ticket as transaction ID', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
          providerId: 'KT-ABC123',
        },
        'tx-unique-id-123'
      );

      await POST(req);

      // CRITICAL: Uses ticket as transaction ID, not authority
      expect(getTransactionById).toHaveBeenCalledWith('tx-unique-id-123');
    });
  });

  describe('Idempotency', () => {
    it('redirects to success when transaction already COMPLETED', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      // CRITICAL: Uses 303 to force GET on redirect
      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(verifyPayment).not.toHaveBeenCalled();
    });

    it('redirects to failure when transaction already FAILED', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
        createMockTransaction({ status: 'FAILED' })
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/failure');
      expect(verifyPayment).not.toHaveBeenCalled();
    });
  });

  describe('Digipay FAILURE Status', () => {
    it('marks transaction as FAILED when result is FAILURE', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());

      const req = createMockPostRequest(
        {
          result: 'FAILURE',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      // Should redirect to failure without calling verifyPayment
      expect(verifyPayment).not.toHaveBeenCalled();
      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('marks transaction as FAILED when result is lowercase failure', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());

      const req = createMockPostRequest(
        {
          result: 'failure', // lowercase
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Digipay Verification Success', () => {
    beforeEach(() => {
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP-VERIFIED-123',
        fpName: 'Test Bank',
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

    it('verifies payment with Digipay and processes order', async () => {
      const { POST } = await getHandlers();

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
          providerId: 'KT-ABC123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(verifyPayment).toHaveBeenCalledWith({
        trackingCode: 'DGP123',
        amount: 50000,
        providerId: 'KT-ABC123',
      });
      expect(reduceProductStock).toHaveBeenCalledWith('tx-1');
      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
      expect(response.headers.get('Location')).toContain(
        'trackingCode=DGP-VERIFIED-123'
      );
    });

    it('sends notifications after successful verification', async () => {
      const { POST } = await getHandlers();

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      await POST(req);

      expect(sendAdminOrderConfirmation).toHaveBeenCalled();
      expect(sendOrderConfirmation).toHaveBeenCalledWith(
        '09123456789',
        'KT-ABC123'
      );
      expect(sendBuyerOrderConfirmation).toHaveBeenCalled();
    });
  });

  describe('303 Redirect for POST', () => {
    it('uses 303 redirect status to force GET on redirect for success', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
        createMockTransaction({ status: 'COMPLETED' })
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      // CRITICAL: Must be 303 (See Other), NOT 307 (Temporary Redirect)
      // 307 preserves POST method which causes 405 on page routes
      expect(response.status).toBe(303);
    });

    it('uses 303 redirect status to force GET on redirect for failure', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
        createMockTransaction({ status: 'FAILED' })
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
    });

    it('uses 303 redirect when verification completes successfully', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
    });
  });

  describe('GET Fallback', () => {
    it('handles GET requests for manual testing', async () => {
      const { GET } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
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

      const req = createMockGetRequest('tx-1', 'DGP123', 'SUCCESS');
      const response = await GET(req);

      expect(getTransactionById).toHaveBeenCalledWith('tx-1');
      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Error Handling', () => {
    it('marks transaction as FAILED when Digipay verification fails', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockRejectedValue(
        new Error('Digipay API error')
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('does not mark COMPLETED transaction as FAILED on error', async () => {
      const { POST } = await getHandlers();
      // First call returns pending, second call (in catch) returns completed
      vi.mocked(getTransactionById)
        .mockResolvedValueOnce(createMockTransaction({ status: 'PENDING' }))
        .mockResolvedValueOnce(createMockTransaction({ status: 'COMPLETED' }));

      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
      });

      vi.mocked(reduceProductStock).mockRejectedValue(
        new Error('Stock reduction error')
      );

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      // Should redirect to success since transaction was already completed
      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Guest Account Creation', () => {
    beforeEach(() => {
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
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
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      await POST(req);

      expect(getUserByPhone).toHaveBeenCalledWith('09123456789');
      expect(createUser).toHaveBeenCalledWith({
        phone: '09123456789',
        email: 'guest@test.com',
        name: 'Guest User',
      });
      expect(linkTransactionToUser).toHaveBeenCalledWith('tx-1', 'new-user-1');
    });

    it('links to existing user when phone is already registered', async () => {
      const { POST } = await getHandlers();
      vi.mocked(getTransactionById).mockResolvedValue(
        createMockTransaction({
          userId: null,
          createAccount: true,
          phone: '09123456789',
        })
      );
      vi.mocked(getUserByPhone).mockResolvedValue({ id: 'existing-user-1' });

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      await POST(req);

      expect(createUser).not.toHaveBeenCalled();
      expect(linkTransactionToUser).toHaveBeenCalledWith(
        'tx-1',
        'existing-user-1'
      );
    });
  });

  describe('Error Resilience - Notification Failures', () => {
    beforeEach(() => {
      vi.mocked(getTransactionById).mockResolvedValue(createMockTransaction());
      vi.mocked(verifyPayment).mockResolvedValue({
        trackingCode: 'DGP123',
        fpName: 'Test Bank',
      });
      vi.mocked(getTransactionWithVariants).mockResolvedValue(
        createMockTransaction({ email: 'test@test.com' })
      );
    });

    it('continues to success even when email fails', async () => {
      const { POST } = await getHandlers();
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('continues to success even when SMS fails', async () => {
      const { POST } = await getHandlers();
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

      const req = createMockPostRequest(
        {
          result: 'SUCCESS',
          trackingCode: 'DGP123',
        },
        'tx-1'
      );

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });
});
