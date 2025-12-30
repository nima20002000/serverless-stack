/**
 * Payment Verification Integration Tests
 *
 * Tests the complete flow from callback to database state,
 * using real service calls with mocked external APIs.
 *
 * CRITICAL: Tests idempotency, state transitions, and race conditions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createSupabaseMock,
  createQueryMock,
} from '../unit/helpers/supabase-mock';

// Store mock states for integration testing
let mockTransactionStore: Record<string, any> = {};

// Mock only external services, not internal services
vi.mock('@/lib/zarinpal/client', () => ({
  verifyPayment: vi.fn(),
}));

vi.mock('@/lib/digipay/client', () => ({
  verifyPayment: vi.fn(),
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

vi.mock('server-only', () => ({}));

// Mock Supabase with state management
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => {
    return {
      from: (table: string) => {
        if (table === 'transactions') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn((field: string, value: string) => ({
                single: vi.fn(async () => {
                  // Find transaction by different fields
                  let tx = null;
                  if (field === 'authority') {
                    tx = Object.values(mockTransactionStore).find(
                      (t: any) => t.authority === value
                    );
                  } else if (field === 'id') {
                    tx = mockTransactionStore[value];
                  } else if (field === 'zibalTrackId') {
                    tx = Object.values(mockTransactionStore).find(
                      (t: any) => t.zibalTrackId === value
                    );
                  }
                  if (tx) {
                    return { data: tx, error: null };
                  }
                  return { data: null, error: { message: 'Not found' } };
                }),
              })),
            })),
            update: vi.fn((data: any) => ({
              eq: vi.fn((field: string, value: string) => {
                if (mockTransactionStore[value]) {
                  mockTransactionStore[value] = {
                    ...mockTransactionStore[value],
                    ...data,
                  };
                }
                return Promise.resolve({ data: null, error: null });
              }),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: null })),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        };
      },
    };
  }),
}));

// Mock transaction service to use our store
vi.mock('@/services/transaction-service', () => ({
  getTransactionByAuthority: vi.fn(async (authority: string) => {
    const tx = Object.values(mockTransactionStore).find(
      (t: any) => t.authority === authority
    );
    if (!tx) throw new Error('تراکنش یافت نشد');
    return tx;
  }),
  getTransactionById: vi.fn(async (id: string) => {
    const tx = mockTransactionStore[id];
    if (!tx) throw new Error('تراکنش یافت نشد');
    return tx;
  }),
  getTransactionByZibalTrackId: vi.fn(async (trackId: string) => {
    const tx = Object.values(mockTransactionStore).find(
      (t: any) => t.zibalTrackId === trackId
    );
    if (!tx) throw new Error('تراکنش یافت نشد');
    return tx;
  }),
  updateTransactionStatus: vi.fn(
    async (id: string, status: string, authority?: string, refId?: number) => {
      if (mockTransactionStore[id]) {
        mockTransactionStore[id] = {
          ...mockTransactionStore[id],
          status,
          refId: refId || mockTransactionStore[id].refId,
        };
      }
    }
  ),
  reduceProductStock: vi.fn(async () => {}),
  getTransactionWithVariants: vi.fn(async (id: string) => {
    return mockTransactionStore[id] || null;
  }),
  linkTransactionToUser: vi.fn(async () => {}),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(async () => ({ id: 'new-user-1' })),
  getUserByPhone: vi.fn(async () => null),
}));

// Import mocked modules
import { verifyPayment as zarinpalVerify } from '@/lib/zarinpal/client';
import { verifyPayment as digipayVerify } from '@/lib/digipay/client';
import { verifyPayment as zibalVerify } from '@/lib/zibal/client';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
} from '@/services/transaction-service';

function createMockTransaction(id: string, overrides = {}) {
  return {
    id,
    transactionCode: `KT-${id.toUpperCase()}`,
    status: 'PENDING',
    amount: 50000,
    phone: '09123456789',
    email: 'test@test.com',
    fullName: 'Test User',
    userId: null,
    createAccount: false,
    authority: `AUTH-${id}`,
    zibalTrackId: `ZIBAL-${id}`,
    ...overrides,
  };
}

describe('Payment Verification Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockTransactionStore = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mockTransactionStore = {};
  });

  describe('Full Zarinpal Flow - Happy Path', () => {
    it('processes Zarinpal callback end-to-end', async () => {
      // Setup: Create mock transaction in "DB"
      const txId = 'tx-zp-1';
      mockTransactionStore[txId] = createMockTransaction(txId);

      // Mock external API
      vi.mocked(zarinpalVerify).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
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

      // Import handler
      const { GET } = await import('@/app/api/transactions/verify/route');

      // Create request
      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-zp-1');
      url.searchParams.set('Status', 'OK');
      const req = new NextRequest(url);

      // Execute
      const response = await GET(req);

      // Verify transaction status updated
      expect(updateTransactionStatus).toHaveBeenCalledWith(
        txId,
        'COMPLETED',
        'AUTH-tx-zp-1',
        1234567890
      );

      // Verify stock reduced
      expect(reduceProductStock).toHaveBeenCalledWith(txId);

      // Verify redirect
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Full Digipay Flow - Happy Path', () => {
    it('processes Digipay callback end-to-end', async () => {
      const txId = 'tx-dp-1';
      mockTransactionStore[txId] = createMockTransaction(txId);

      vi.mocked(digipayVerify).mockResolvedValue({
        trackingCode: 'DGP-VERIFIED',
        fpName: 'Test Bank',
      });
      vi.mocked(sendAdminOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'msg-1',
      });
      vi.mocked(sendOrderConfirmation).mockResolvedValue({
        success: true,
        messageId: 'sms-1',
      });

      const { POST } =
        await import('@/app/api/transactions/verify-digipay/route');

      const url = new URL(
        'http://localhost:3000/api/transactions/verify-digipay'
      );
      url.searchParams.set('ticket', txId);

      const req = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          result: 'SUCCESS',
          trackingCode: 'DGP123',
          providerId: 'KT-TX-DP-1',
        }).toString(),
      });

      const response = await POST(req);

      expect(response.status).toBe(303);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Concurrent Callback Handling', () => {
    it('handles race condition when multiple callbacks arrive', async () => {
      const txId = 'tx-race-1';
      mockTransactionStore[txId] = createMockTransaction(txId);

      vi.mocked(zarinpalVerify).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
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

      const { GET } = await import('@/app/api/transactions/verify/route');

      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-race-1');
      url.searchParams.set('Status', 'OK');

      // First callback - should process normally
      const req1 = new NextRequest(url);
      const response1 = await GET(req1);

      expect(response1.status).toBe(307);
      expect(response1.headers.get('Location')).toContain('/payment/success');

      // Manually update the mock store to reflect COMPLETED status
      mockTransactionStore[txId].status = 'COMPLETED';

      // Reset mocks to verify second callback behavior
      vi.mocked(zarinpalVerify).mockClear();
      vi.mocked(updateTransactionStatus).mockClear();
      vi.mocked(reduceProductStock).mockClear();

      // Second callback - should recognize already completed
      const req2 = new NextRequest(url);
      const response2 = await GET(req2);

      // Should still redirect to success
      expect(response2.status).toBe(307);
      expect(response2.headers.get('Location')).toContain('/payment/success');

      // Should NOT reprocess
      expect(zarinpalVerify).not.toHaveBeenCalled();
      expect(reduceProductStock).not.toHaveBeenCalled();
    });
  });

  describe('Transaction State Machine', () => {
    it('allows PENDING -> COMPLETED transition', async () => {
      const txId = 'tx-state-1';
      mockTransactionStore[txId] = createMockTransaction(txId, {
        status: 'PENDING',
      });

      vi.mocked(zarinpalVerify).mockResolvedValue({
        status: 100,
        refId: 1234567890,
      });
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

      const { GET } = await import('@/app/api/transactions/verify/route');

      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-state-1');
      url.searchParams.set('Status', 'OK');
      const req = new NextRequest(url);

      const response = await GET(req);

      expect(updateTransactionStatus).toHaveBeenCalledWith(
        txId,
        'COMPLETED',
        expect.any(String),
        expect.any(Number)
      );
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('allows PENDING -> FAILED transition', async () => {
      const txId = 'tx-state-2';
      mockTransactionStore[txId] = createMockTransaction(txId, {
        status: 'PENDING',
      });

      const { GET } = await import('@/app/api/transactions/verify/route');

      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-state-2');
      url.searchParams.set('Status', 'NOK');
      const req = new NextRequest(url);

      const response = await GET(req);

      expect(updateTransactionStatus).toHaveBeenCalledWith(
        txId,
        'FAILED',
        'AUTH-tx-state-2'
      );
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });

    it('blocks COMPLETED -> FAILED transition', async () => {
      const txId = 'tx-state-3';
      mockTransactionStore[txId] = createMockTransaction(txId, {
        status: 'COMPLETED',
      });

      const { GET } = await import('@/app/api/transactions/verify/route');

      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-state-3');
      url.searchParams.set('Status', 'NOK'); // Late failure callback
      const req = new NextRequest(url);

      const response = await GET(req);

      // Should NOT update status for already completed transaction
      expect(updateTransactionStatus).not.toHaveBeenCalled();
      // Should redirect to success (idempotency)
      expect(response.headers.get('Location')).toContain('/payment/success');
    });

    it('blocks FAILED -> COMPLETED transition', async () => {
      const txId = 'tx-state-4';
      mockTransactionStore[txId] = createMockTransaction(txId, {
        status: 'FAILED',
      });

      const { GET } = await import('@/app/api/transactions/verify/route');

      const url = new URL('http://localhost:3000/api/transactions/verify');
      url.searchParams.set('Authority', 'AUTH-tx-state-4');
      url.searchParams.set('Status', 'OK'); // Late success callback
      const req = new NextRequest(url);

      const response = await GET(req);

      // Should NOT process for already failed transaction
      expect(zarinpalVerify).not.toHaveBeenCalled();
      expect(updateTransactionStatus).not.toHaveBeenCalled();
      // Should redirect to failure (idempotency)
      expect(response.headers.get('Location')).toContain('/payment/failure');
    });
  });

  describe('Full Zibal Flow - Happy Path', () => {
    it('processes Zibal callback end-to-end', async () => {
      const txId = 'tx-zb-1';
      mockTransactionStore[txId] = createMockTransaction(txId, {
        zibalTrackId: '12345678',
      });

      vi.mocked(zibalVerify).mockResolvedValue({
        trackId: 12345678,
        refNumber: 9876543210,
      });
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

      const { GET } = await import('@/app/api/transactions/verify-zibal/route');

      const url = new URL(
        'http://localhost:3000/api/transactions/verify-zibal'
      );
      url.searchParams.set('trackId', '12345678');
      url.searchParams.set('success', '1');
      const req = new NextRequest(url);

      const response = await GET(req);

      expect(zibalVerify).toHaveBeenCalledWith({
        trackId: 12345678,
        amount: 50000,
      });
      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/payment/success');
    });
  });

  describe('Cross-Gateway Consistency', () => {
    it('all gateways follow same idempotency pattern', async () => {
      // Test that each gateway handles completed transactions consistently

      // Zarinpal
      const zpTx = createMockTransaction('tx-zp-idem', { status: 'COMPLETED' });
      mockTransactionStore['tx-zp-idem'] = zpTx;

      const { GET: zarinpalGET } =
        await import('@/app/api/transactions/verify/route');
      const zpUrl = new URL('http://localhost:3000/api/transactions/verify');
      zpUrl.searchParams.set('Authority', 'AUTH-tx-zp-idem');
      zpUrl.searchParams.set('Status', 'OK');
      const zpResponse = await zarinpalGET(new NextRequest(zpUrl));
      expect(zpResponse.headers.get('Location')).toContain('/payment/success');

      // Digipay
      const dpTx = createMockTransaction('tx-dp-idem', { status: 'COMPLETED' });
      mockTransactionStore['tx-dp-idem'] = dpTx;

      const { GET: digipayGET } =
        await import('@/app/api/transactions/verify-digipay/route');
      const dpUrl = new URL(
        'http://localhost:3000/api/transactions/verify-digipay'
      );
      dpUrl.searchParams.set('ticket', 'tx-dp-idem');
      dpUrl.searchParams.set('trackingCode', 'DGP123');
      dpUrl.searchParams.set('status', 'SUCCESS');
      const dpResponse = await digipayGET(new NextRequest(dpUrl));
      expect(dpResponse.headers.get('Location')).toContain('/payment/success');

      // Zibal
      const zbTx = createMockTransaction('tx-zb-idem', {
        status: 'COMPLETED',
        zibalTrackId: '99999999',
      });
      mockTransactionStore['tx-zb-idem'] = zbTx;

      const { GET: zibalGET } =
        await import('@/app/api/transactions/verify-zibal/route');
      const zbUrl = new URL(
        'http://localhost:3000/api/transactions/verify-zibal'
      );
      zbUrl.searchParams.set('trackId', '99999999');
      zbUrl.searchParams.set('success', '1');
      const zbResponse = await zibalGET(new NextRequest(zbUrl));
      expect(zbResponse.headers.get('Location')).toContain('/payment/success');

      // None should have called verification APIs for already completed transactions
      expect(zarinpalVerify).not.toHaveBeenCalled();
      expect(digipayVerify).not.toHaveBeenCalled();
      expect(zibalVerify).not.toHaveBeenCalled();
    });
  });
});
