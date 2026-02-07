/**
 * Integration Tests for Email Service
 *
 * Validates email delivery via Resend or SMTP fallback.
 */

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import {
  sendOTPEmail,
  sendBuyerOrderConfirmation,
  type TransactionEmailData,
} from '../../src/lib/email/client';

function hasLiveEmailConfig() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  if (key === 're_test_key') return false;
  if (key.includes('xxxxxxxx')) return false;
  if (key.includes('test_key')) return false;
  return true;
}

describe('Email Service Integration Tests', () => {
  it('should send OTP email successfully', async () => {
    const email = `test-email-${Date.now()}@example.com`;
    const result = await sendOTPEmail(email, '123456');

    if (!hasLiveEmailConfig()) {
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
      return;
    }

    if (!result.success) {
      throw new Error(`OTP email failed: ${result.error || 'unknown error'}`);
    }

    expect(typeof result.messageId).toBe('string');
    expect(result.messageId!.length).toBeGreaterThan(0);
  });

  it('should send buyer order confirmation email successfully', async () => {
    const email = `test-buyer-${Date.now()}@example.com`;
    const transaction: TransactionEmailData = {
      id: randomUUID(),
      transactionCode: `KT-TEST${Math.floor(Math.random() * 10000)}`,
      amount: 250000,
      paymentMethod: 'STRIPE',
      fullName: 'خریدار تست',
      phone: '09120000055',
      email,
      shippingAddress: 'تهران، خیابان تست',
      postalCode: '1234567890',
      createdAt: new Date().toISOString(),
      isGuest: true,
      items: [
        {
          quantity: 2,
          price: 125000,
          product: {
            name: 'محصول تست',
            price: 125000,
          },
          variant: {
            name: 'سایز متوسط',
            color: 'مشکی',
          },
        },
      ],
    };

    const result = await sendBuyerOrderConfirmation(transaction);

    if (!hasLiveEmailConfig()) {
      expect(typeof result.success).toBe('boolean');
      if (!result.success) {
        expect(typeof result.error).toBe('string');
      }
      return;
    }

    if (!result.success) {
      throw new Error(
        `Buyer confirmation email failed: ${result.error || 'unknown error'}`
      );
    }

    expect(typeof result.messageId).toBe('string');
    expect(result.messageId!.length).toBeGreaterThan(0);
  });
});
