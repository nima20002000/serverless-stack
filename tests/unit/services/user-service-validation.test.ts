import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateEmail,
  validatePhone,
  detectIdentifierType,
  validateEmailUniqueness,
  validatePhoneUniqueness,
} from '@/services/user-service/validation';
import * as queries from '@/services/user-service/queries';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('user-service validation', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates email and phone formats', () => {
    expect(validateEmail('user@example.com')).toBe(true);
    expect(validateEmail('not-an-email')).toBe(false);

    expect(validatePhone('+12125551234')).toBe(true);
    expect(validatePhone('12345')).toBe(false);
  });

  it('detects identifier types', () => {
    expect(detectIdentifierType('user@example.com')).toBe('email');
    expect(detectIdentifierType('+12125551234')).toBe('phone');
    expect(detectIdentifierType('invalid')).toBe('invalid');
  });

  it('rejects invalid or duplicate email', async () => {
    await expect(
      validateEmailUniqueness('bad-email')
    ).rejects.toThrow('فرمت ایمیل نامعتبر است');

    vi.spyOn(queries, 'checkUserExists').mockResolvedValue(true);
    await expect(
      validateEmailUniqueness('dup@example.com')
    ).rejects.toThrow('این ایمیل قبلاً استفاده شده است');
  });

  it('rejects invalid or duplicate phone', async () => {
    await expect(
      validatePhoneUniqueness('12345')
    ).rejects.toThrow('فرمت شماره تلفن نامعتبر است');

    vi.spyOn(queries, 'checkUserExists').mockResolvedValue(true);
    await expect(validatePhoneUniqueness('+12125551234')).rejects.toThrow(
      'این شماره تلفن قبلاً استفاده شده است'
    );
  });

  it('passes when email/phone are undefined', async () => {
    await expect(validateEmailUniqueness(undefined)).resolves.toBeUndefined();
    await expect(validatePhoneUniqueness(undefined)).resolves.toBeUndefined();
  });
});
