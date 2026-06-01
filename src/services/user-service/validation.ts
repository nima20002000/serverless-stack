import { log } from '@/lib/logger';
import { isValidPhoneNumber, normalizePhoneNumber } from '@/lib/utils/text';
import { checkUserExists } from './queries';

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  return isValidPhoneNumber(phone);
}

/**
 * Detect if input is email or phone
 */
export function detectIdentifierType(
  identifier: string
): 'email' | 'phone' | 'invalid' {
  if (validateEmail(identifier)) return 'email';
  if (validatePhone(identifier)) return 'phone';
  return 'invalid';
}

/**
 * Validate and check uniqueness for email
 * Throws error if invalid or already exists
 */
export async function validateEmailUniqueness(
  email: string | undefined,
  excludeUserId?: string
): Promise<void> {
  if (email === undefined) return;

  // Validate format
  if (email && !validateEmail(email)) {
    log.warn('Invalid email format', { email });
    throw new Error('فرمت ایمیل نامعتبر است');
  }

  // Check uniqueness
  if (email) {
    const exists = await checkUserExists({ email }, excludeUserId);
    if (exists) {
      log.warn('Email already in use', { email });
      throw new Error('این ایمیل قبلاً استفاده شده است');
    }
  }
}

/**
 * Validate and check uniqueness for phone
 * Throws error if invalid or already exists
 */
export async function validatePhoneUniqueness(
  phone: string | undefined,
  excludeUserId?: string
): Promise<void> {
  if (phone === undefined) return;

  const normalizedPhone = phone ? normalizePhoneNumber(phone) : undefined;

  if (phone && !validatePhone(phone)) {
    log.warn('Invalid phone format', { phone });
    throw new Error('فرمت شماره تلفن نامعتبر است');
  }

  if (normalizedPhone) {
    const exists = await checkUserExists(
      { phone: normalizedPhone },
      excludeUserId
    );
    if (exists) {
      log.warn('Phone already in use', { phone: normalizedPhone });
      throw new Error('این شماره تلفن قبلاً استفاده شده است');
    }
  }
}
