/**
 * Integration Tests for SMS Service
 *
 * Validates SMS delivery and input validation via Kavenegar.
 */

import { describe, it, expect } from 'vitest';
import { sendOrderConfirmation } from '../../src/services/sms-service';

function createTestPhone() {
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `091200000${suffix}`;
}

describe('SMS Service Integration Tests', () => {
  it('should reject invalid phone numbers', async () => {
    const result = await sendOrderConfirmation('12345', 'KT-TEST0001');

    expect(result.success).toBe(false);
    expect(result.error).toBe('فرمت شماره تلفن نامعتبر است');
  });

  it('should send order confirmation SMS successfully', async () => {
    const phone =
      process.env.TEST_SMS_PHONE ||
      process.env.TEST_USER_PHONE ||
      createTestPhone();

    const result = await sendOrderConfirmation(phone, 'KT-TEST0002');

    if (!result.success) {
      if (process.env.TEST_SMS_ALLOW_FAIL === 'true') {
        expect(typeof result.error).toBe('string');
        expect(result.error!.length).toBeGreaterThan(0);
        return;
      }

      throw new Error(
        `SMS delivery failed unexpectedly: ${result.error || 'unknown error'}`
      );
    }

    expect(typeof result.messageId).toBe('number');
    expect(result.messageId!).toBeGreaterThan(0);
  });
});
