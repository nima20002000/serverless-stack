/**
 * Integration Tests for OTP Service
 *
 * Tests OTP generation, rate limiting, verification, and attempt limits.
 * These tests validate real behavior against the Supabase database and
 * exercise the actual OTP service implementation.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete values (codes, attempts, timestamps)
 * - Error scenarios are validated with specific messages and state checks
 * - Tests verify side effects (DB records created/updated/deleted)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient } from '../utils/test-client';
import { cleanupTestOTPs } from '../utils/cleanup';
import { expectValidOTPCode, expectInRange } from '../utils/assertions';
import { sendOTP, verifyOTP } from '../../src/services/otp-service';

const supabase = createTestSupabaseClient();

type OTPPurpose = 'register' | 'login' | 'checkout';

function createTestEmail(label: string) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test-otp-${label}-${timestamp}-${random}@example.com`;
}

function createTestPhone() {
  const seed = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const suffix = seed.slice(-9);
  return `09${suffix}`; // 11 digits, matches cleanup prefix
}

async function fetchLatestOTP(identifier: string, purpose: OTPPurpose) {
  const { data, error } = await supabase
    .from('otp_verifications')
    .select('*')
    .eq('identifier', identifier)
    .eq('purpose', purpose)
    .order('createdAt', { ascending: false })
    .limit(1);

  if (error) {
    throw new Error(`Failed to fetch OTP record: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('OTP record not found');
  }

  return data[0];
}

async function countOTPs(identifier: string, purpose: OTPPurpose) {
  const { count, error } = await supabase
    .from('otp_verifications')
    .select('id', { count: 'exact' })
    .eq('identifier', identifier)
    .eq('purpose', purpose);

  if (error) {
    throw new Error(`Failed to count OTP records: ${error.message}`);
  }
  return count || 0;
}

async function insertOTPRecord(params: {
  identifier: string;
  code: string;
  purpose: OTPPurpose;
  expiresAt: string;
  createdAt: string;
  attempts?: number;
  maxAttempts?: number;
}) {
  const { error } = await supabase
    .from('otp_verifications')
    .insert({
      id: randomUUID(),
      identifier: params.identifier,
      code: params.code,
      purpose: params.purpose,
      expiresAt: params.expiresAt,
      createdAt: params.createdAt,
      attempts: params.attempts ?? 0,
      maxAttempts: params.maxAttempts ?? 3,
    });

  if (error) {
    throw new Error(`Failed to seed OTP record: ${error.message}`);
  }
}

describe('OTP Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestOTPs();
  });

  afterEach(async () => {
    await cleanupTestOTPs();
  });

  it('should send OTP via email and store a valid OTP record', async () => {
    const email = createTestEmail('email');
    const startTime = Date.now();

    const result = await sendOTP(email, 'login');

    expect(result.success).toBe(true);
    expect(result.expiresAt).toBeGreaterThan(startTime);

    const record = await fetchLatestOTP(email, 'login');

    expect(record.identifier).toBe(email);
    expect(record.purpose).toBe('login');
    expectValidOTPCode(record.code);
    expect(record.attempts).toBe(0);
    expect(record.maxAttempts).toBe(3);
    const createdAtMs = new Date(
      record.createdAt.endsWith('Z') ? record.createdAt : `${record.createdAt}Z`
    ).getTime();
    expectInRange(createdAtMs, startTime - 60 * 1000, startTime + 5 * 60 * 1000);

    const expiresAtMs = new Date(record.expiresAt + 'Z').getTime();
    expectInRange(
      expiresAtMs,
      startTime + 4 * 60 * 1000,
      startTime + 6 * 60 * 1000
    );
  });

  it('should attempt SMS delivery and persist or clean up OTP accordingly', async () => {
    const phone =
      process.env.TEST_SMS_PHONE ||
      process.env.TEST_USER_PHONE ||
      createTestPhone();
    const startTime = Date.now();

    const result = await sendOTP(phone, 'register');

    if (result.success) {
      expect(result.expiresAt).toBeGreaterThan(startTime);

      const record = await fetchLatestOTP(phone, 'register');

      expect(record.identifier).toBe(phone);
      expect(record.purpose).toBe('register');
      expectValidOTPCode(record.code);
      expect(record.attempts).toBe(0);
      expect(record.maxAttempts).toBe(3);

      const expiresAtMs = new Date(record.expiresAt + 'Z').getTime();
      expectInRange(
        expiresAtMs,
        startTime + 4 * 60 * 1000,
        startTime + 6 * 60 * 1000
      );
    } else {
      expect(result.errorCode).toBe('SEND_FAILED');
      expect(result.error).toContain('پیامک');
      const otpCount = await countOTPs(phone, 'register');
      expect(otpCount).toBe(0);
    }
  });

  it('should reject invalid identifiers and remove OTP records', async () => {
    const identifier = 'invalid-identifier';

    const result = await sendOTP(identifier, 'register');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SEND_FAILED');
    expect(result.error).toContain('فرمت');

    const otpCount = await countOTPs(identifier, 'register');
    expect(otpCount).toBe(0);
  });

  it('should return SEND_FAILED when email delivery fails', async () => {
    const email = createTestEmail('send-fail');
    const previous = process.env.TEST_OTP_FORCE_SEND_FAIL;

    process.env.TEST_OTP_FORCE_SEND_FAIL = 'email';

    try {
      const result = await sendOTP(email, 'login');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SEND_FAILED');
      expect(result.error).toContain('ایمیل');

      const otpCount = await countOTPs(email, 'login');
      expect(otpCount).toBe(0);
    } finally {
      if (previous === undefined) {
        delete process.env.TEST_OTP_FORCE_SEND_FAIL;
      } else {
        process.env.TEST_OTP_FORCE_SEND_FAIL = previous;
      }
    }
  });

  it('should enforce rate limiting when a recent OTP exists', async () => {
    const email = createTestEmail('rate');
    const now = new Date();

    await insertOTPRecord({
      identifier: email,
      code: '123456',
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    });

    const result = await sendOTP(email, 'login');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT');
    expect(result.error).toContain('لطفاً');
    expect(result.expiresAt).toBeGreaterThan(Date.now());
    expect(result.expiresAt).toBeLessThanOrEqual(Date.now() + 2 * 60 * 1000);

    const otpCount = await countOTPs(email, 'login');
    expect(otpCount).toBe(1);
  });

  it('should verify OTP successfully and delete the record', async () => {
    const email = createTestEmail('verify');
    const code = '654321';
    const now = new Date();

    await insertOTPRecord({
      identifier: email,
      code,
      purpose: 'checkout',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    });

    const result = await verifyOTP(email, code, 'checkout');

    expect(result.success).toBe(true);

    const otpCount = await countOTPs(email, 'checkout');
    expect(otpCount).toBe(0);
  });

  it('should track invalid attempts and keep OTP until max attempts exceeded', async () => {
    const email = createTestEmail('attempts');
    const now = new Date();

    await insertOTPRecord({
      identifier: email,
      code: '987654',
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    });

    const firstAttempt = await verifyOTP(email, '000000', 'login');
    expect(firstAttempt.success).toBe(false);
    expect(firstAttempt.attemptsLeft).toBe(2);
    expect(firstAttempt.error).toContain('کد تایید اشتباه است');

    let record = await fetchLatestOTP(email, 'login');
    expect(record.attempts).toBe(1);

    const secondAttempt = await verifyOTP(email, '111111', 'login');
    expect(secondAttempt.success).toBe(false);
    expect(secondAttempt.attemptsLeft).toBe(1);

    record = await fetchLatestOTP(email, 'login');
    expect(record.attempts).toBe(2);
  });

  it('should reject verification after max attempts and delete the OTP', async () => {
    const email = createTestEmail('max-attempts');
    const now = new Date();

    await insertOTPRecord({
      identifier: email,
      code: '222222',
      purpose: 'login',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      attempts: 3,
      maxAttempts: 3,
    });

    const result = await verifyOTP(email, '222222', 'login');

    expect(result.success).toBe(false);
    expect(result.error).toContain('حداکثر');

    const otpCount = await countOTPs(email, 'login');
    expect(otpCount).toBe(0);
  });

  it('should reject expired OTPs and delete the record', async () => {
    const email = createTestEmail('expired');
    const now = new Date();

    await insertOTPRecord({
      identifier: email,
      code: '333333',
      purpose: 'register',
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() - 60 * 1000).toISOString(),
    });

    const result = await verifyOTP(email, '333333', 'register');

    expect(result.success).toBe(false);
    expect(result.error).toContain('منقضی');

    const otpCount = await countOTPs(email, 'register');
    expect(otpCount).toBe(0);
  });
});
