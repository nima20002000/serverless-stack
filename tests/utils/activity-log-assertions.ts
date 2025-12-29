/**
 * Assertion helpers for activity log metadata validation
 *
 * These helpers provide strict validation of activity log metadata
 * to ensure tests verify EXACT values, not just presence.
 */

import { expect } from 'vitest';
import type { Json } from '../../src/types/supabase';

/**
 * Validate LOGIN_SUCCESS/LOGIN_FAILED metadata
 */
export function expectLoginMetadata(
  metadata: Json,
  expected: {
    identifierType: 'email' | 'phone';
    method?: 'otp';
    flow?: 'checkout';
  }
) {
  const expectedMeta: Record<string, string> = {
    identifier_type: expected.identifierType,
  };

  if (expected.method) {
    expectedMeta.method = expected.method;
  }

  if (expected.flow) {
    expectedMeta.flow = expected.flow;
  }

  expect(metadata).toEqual(expectedMeta);
}

/**
 * Validate REGISTER metadata
 */
export function expectRegisterMetadata(
  metadata: Json,
  expected: {
    hasEmail?: boolean;
    method?: 'otp';
    identifierType?: 'email' | 'phone';
    flow?: 'checkout';
  }
) {
  const expectedMeta: Record<string, unknown> = {};

  if (expected.hasEmail !== undefined) {
    expectedMeta.has_email = expected.hasEmail;
  }

  if (expected.method) {
    expectedMeta.method = expected.method;
  }

  if (expected.identifierType) {
    expectedMeta.identifier_type = expected.identifierType;
  }

  if (expected.flow) {
    expectedMeta.flow = expected.flow;
  }

  expect(metadata).toEqual(expectedMeta);
}

/**
 * Validate OTP_SENT metadata
 */
export function expectOtpSentMetadata(
  metadata: Json,
  expected: {
    identifierType: 'email' | 'phone';
    purpose: 'register' | 'login' | 'checkout';
    errorCode?: string;
  }
) {
  const expectedMeta: Record<string, unknown> = {
    identifier_type: expected.identifierType,
    purpose: expected.purpose,
  };

  if (expected.errorCode) {
    expectedMeta.errorCode = expected.errorCode;
  }

  expect(metadata).toEqual(expectedMeta);
}

/**
 * Validate OTP_VERIFIED metadata
 */
export function expectOtpVerifiedMetadata(
  metadata: Json,
  expected: {
    identifierType: 'email' | 'phone';
    purpose: string;
    flow?: 'checkout';
  }
) {
  const expectedMeta: Record<string, string> = {
    identifier_type: expected.identifierType,
    purpose: expected.purpose,
  };

  if (expected.flow) {
    expectedMeta.flow = expected.flow;
  }

  expect(metadata).toEqual(expectedMeta);
}

/**
 * Validate OTP_FAILED metadata
 */
export function expectOtpFailedMetadata(
  metadata: Json,
  expected: {
    identifierType: 'email' | 'phone';
    purpose: string;
    attemptsLeft?: number;
    flow?: 'checkout';
  }
) {
  const meta = metadata as Record<string, unknown>;

  expect(meta.identifier_type).toBe(expected.identifierType);
  expect(meta.purpose).toBe(expected.purpose);

  if (expected.attemptsLeft !== undefined) {
    expect(meta.attemptsLeft).toBe(expected.attemptsLeft);
  } else {
    // attemptsLeft should be present for failed OTP
    expect(meta).toHaveProperty('attemptsLeft');
    expect(typeof meta.attemptsLeft).toBe('number');
  }

  if (expected.flow) {
    expect(meta.flow).toBe(expected.flow);
  }
}

/**
 * Validate PROFILE_UPDATE metadata
 */
export function expectProfileUpdateMetadata(
  metadata: Json,
  expected: {
    updatedFields: string[];
  }
) {
  const meta = metadata as Record<string, unknown>;

  expect(meta).toHaveProperty('updated_fields');
  expect(Array.isArray(meta.updated_fields)).toBe(true);

  const actualFields = meta.updated_fields as string[];
  expect(actualFields.sort()).toEqual(expected.updatedFields.sort());
}

/**
 * Validate PASSWORD_CHANGE metadata
 */
export function expectPasswordChangeMetadata(
  metadata: Json,
  expected: {
    action: 'set' | 'change';
  }
) {
  expect(metadata).toEqual({
    action: expected.action,
  });
}

/**
 * Validate that metadata has expected keys and values
 * More flexible than exact match - allows extra keys
 */
export function expectMetadataContains(
  metadata: Json,
  expected: Record<string, unknown>
) {
  const meta = metadata as Record<string, unknown>;

  for (const [key, value] of Object.entries(expected)) {
    expect(meta).toHaveProperty(key);
    expect(meta[key]).toBe(value);
  }
}

/**
 * Validate that metadata is empty or has specific structure
 */
export function expectEmptyMetadata(metadata: Json) {
  expect(metadata).toEqual({});
}

/**
 * Validate activity log has correct client info
 */
export function expectValidClientInfo(
  log: { ip_address: string | null; user_agent: string | null },
  expected: {
    ipAddress?: string;
    userAgent?: string;
    ipAddressPattern?: RegExp;
    userAgentPattern?: RegExp;
  }
) {
  if (expected.ipAddress) {
    expect(log.ip_address).toBe(expected.ipAddress);
  } else if (expected.ipAddressPattern) {
    expect(log.ip_address).toMatch(expected.ipAddressPattern);
  } else {
    expect(log.ip_address).toBeTruthy();
  }

  if (expected.userAgent) {
    expect(log.user_agent).toBe(expected.userAgent);
  } else if (expected.userAgentPattern) {
    expect(log.user_agent).toMatch(expected.userAgentPattern);
  } else {
    expect(log.user_agent).toBeTruthy();
  }
}

/**
 * Validate activity log error message
 */
export function expectActivityLogError(
  log: { success: boolean | null; error_message: string | null },
  expected: {
    success: boolean;
    errorMessage?: string;
    errorPattern?: RegExp;
  }
) {
  expect(log.success).toBe(expected.success);

  if (expected.success === false) {
    expect(log.error_message).toBeTruthy();

    if (expected.errorMessage) {
      expect(log.error_message).toBe(expected.errorMessage);
    } else if (expected.errorPattern) {
      expect(log.error_message).toMatch(expected.errorPattern);
    }
  } else {
    expect(log.error_message).toBeNull();
  }
}
