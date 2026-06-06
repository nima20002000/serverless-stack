import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getTransactionWithVariants,
  linkTransactionToUser,
  reduceProductStock,
} from '@/services/transaction-service';
import { recordPromoUsage } from '@/services/promo-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { log } from '@/lib/logger';

vi.mock('@/services/transaction-service', () => ({
  getTransactionWithVariants: vi.fn(),
  linkTransactionToUser: vi.fn(),
  reduceProductStock: vi.fn(),
}));

vi.mock('@/services/promo-service', () => ({
  recordPromoUsage: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByPhone: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({
  sendAdminOrderConfirmation: vi.fn(),
  sendBuyerOrderConfirmation: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('finalizeSuccessfulTransaction email notifications', () => {
  const getTransactionWithVariantsMock = vi.mocked(getTransactionWithVariants);
  const reduceProductStockMock = vi.mocked(reduceProductStock);
  const recordPromoUsageMock = vi.mocked(recordPromoUsage);
  const sendAdminOrderConfirmationMock = vi.mocked(sendAdminOrderConfirmation);
  const sendBuyerOrderConfirmationMock = vi.mocked(sendBuyerOrderConfirmation);
  const getUserByPhoneMock = vi.mocked(getUserByPhone);
  const createUserMock = vi.mocked(createUser);
  const linkTransactionToUserMock = vi.mocked(linkTransactionToUser);
  const logMock = vi.mocked(log);

  const transaction = {
    id: 'tx-1',
    transactionCode: 'KT-ABC123',
    promoCodeId: null,
    userId: 'user-1',
    createAccount: false,
    phone: '+12025556789',
    email: 'buyer@example.com',
    fullName: 'Buyer',
  };

  const fullTransaction = {
    ...transaction,
    amount: 1000,
    paymentMethod: 'STRIPE',
    shippingAddress: 'Addr',
    postalCode: '12345',
    createdAt: '2024-01-01T00:00:00.000Z',
    isGuest: false,
    items: [],
  };

  const loadFinalize = async () => {
    const { finalizeSuccessfulTransaction } =
      await import('@/lib/payments/finalize-successful-transaction');
    return finalizeSuccessfulTransaction;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    reduceProductStockMock.mockResolvedValue(undefined as any);
    recordPromoUsageMock.mockResolvedValue(undefined as any);
    getTransactionWithVariantsMock.mockResolvedValue(fullTransaction as any);
    sendAdminOrderConfirmationMock.mockResolvedValue({
      success: true,
      messageId: 'admin-msg',
    });
    sendBuyerOrderConfirmationMock.mockResolvedValue({
      success: true,
      messageId: 'buyer-msg',
    });
    getUserByPhoneMock.mockResolvedValue(null as any);
    createUserMock.mockResolvedValue({ id: 'new-user' } as any);
    linkTransactionToUserMock.mockResolvedValue(undefined as any);
  });

  it('sends admin and buyer confirmations after successful finalization', async () => {
    const finalizeSuccessfulTransaction = await loadFinalize();

    await finalizeSuccessfulTransaction({
      transaction,
      source: 'stripe-webhook',
      adminRefId: 12345,
    });

    expect(reduceProductStockMock).toHaveBeenCalledWith('tx-1');
    expect(getTransactionWithVariantsMock).toHaveBeenCalledWith('tx-1');
    expect(sendAdminOrderConfirmationMock).toHaveBeenCalledWith(
      fullTransaction,
      12345
    );
    expect(sendBuyerOrderConfirmationMock).toHaveBeenCalledWith(
      fullTransaction
    );
    expect(logMock.info).toHaveBeenCalledWith(
      'Admin confirmation email sent successfully',
      expect.objectContaining({
        source: 'stripe-webhook',
        transactionId: 'tx-1',
        messageId: 'admin-msg',
      })
    );
    expect(logMock.info).toHaveBeenCalledWith(
      'Buyer confirmation email sent successfully',
      expect.objectContaining({
        source: 'stripe-webhook',
        transactionId: 'tx-1',
        email: 'buyer@example.com',
        messageId: 'buyer-msg',
      })
    );
  });

  it('skips notification sends when skipNotifications is true', async () => {
    const finalizeSuccessfulTransaction = await loadFinalize();

    await finalizeSuccessfulTransaction({
      transaction,
      source: 'manual-retry',
      skipNotifications: true,
    });

    expect(sendAdminOrderConfirmationMock).not.toHaveBeenCalled();
    expect(sendBuyerOrderConfirmationMock).not.toHaveBeenCalled();
    expect(logMock.info).toHaveBeenCalledWith(
      'Skipping order notifications in finalization',
      {
        source: 'manual-retry',
        transactionId: 'tx-1',
      }
    );
  });

  it('logs skipped or failed notification side effects without aborting finalization', async () => {
    getTransactionWithVariantsMock.mockResolvedValue({
      ...fullTransaction,
      email: null,
    } as any);
    sendAdminOrderConfirmationMock.mockResolvedValue({
      success: false,
      error: 'ADMIN_EMAIL not configured',
    });
    const finalizeSuccessfulTransaction = await loadFinalize();

    await finalizeSuccessfulTransaction({
      transaction,
      source: 'paypal-webhook',
    });

    expect(sendAdminOrderConfirmationMock).toHaveBeenCalledTimes(1);
    expect(sendBuyerOrderConfirmationMock).not.toHaveBeenCalled();
    expect(logMock.warn).toHaveBeenCalledWith(
      'Admin confirmation email not sent',
      {
        source: 'paypal-webhook',
        transactionId: 'tx-1',
        error: 'ADMIN_EMAIL not configured',
      }
    );
    expect(logMock.info).toHaveBeenCalledWith(
      'No buyer email provided, skipping buyer confirmation email',
      {
        source: 'paypal-webhook',
        transactionId: 'tx-1',
      }
    );
    expect(logMock.info).toHaveBeenCalledWith(
      'Post-payment finalization completed',
      {
        source: 'paypal-webhook',
        transactionId: 'tx-1',
        transactionCode: 'KT-ABC123',
      }
    );
  });
});
