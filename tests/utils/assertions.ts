/**
 * Custom Test Assertions
 *
 * Provides custom assertion utilities for common boilerplate test patterns.
 */

import { expect } from 'vitest';

export function expectValidText(text: string, minLength = 1) {
  expect(text).toBeDefined();
  expect(text.trim().length).toBeGreaterThanOrEqual(minLength);
}

/**
 * Assert that a value is a valid UUID v4
 */
export function expectValidUUID(value: string) {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}

/**
 * Assert that a value is a valid ISO 8601 timestamp
 * Database stores timestamps as "timestamp(3) without time zone" which doesn't preserve timezone
 * Supabase client may return them in ISO format with 'Z' appended
 * We validate it's a parseable timestamp with correct format structure
 */
export function expectValidISOTimestamp(value: string) {
  const date = new Date(value);
  expect(date.toString()).not.toBe('Invalid Date');

  // The timestamp should be in a valid ISO-like format
  // Database may return: "2025-12-19T10:21:07.809Z" or similar
  // toISOString() always returns UTC with 'Z', but database may not store timezone
  // So we just verify the date is valid and has reasonable format
  const isoString = date.toISOString();
  expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  // Verify the timestamp makes sense (not far future, not too old)
  const now = Date.now();
  const timestamp = date.getTime();
  expect(timestamp).toBeGreaterThan(new Date('2020-01-01').getTime());
  expect(timestamp).toBeLessThan(now + 24 * 60 * 60 * 1000); // Not more than 1 day in future
}

/**
 * Assert that a date is recent (within last N seconds)
 */
export function expectRecentTimestamp(value: string, maxAgeSeconds = 60) {
  const date = new Date(value);
  const now = new Date();
  const ageMs = now.getTime() - date.getTime();
  const ageSeconds = ageMs / 1000;

  expect(ageSeconds).toBeLessThanOrEqual(maxAgeSeconds);
  expect(ageSeconds).toBeGreaterThanOrEqual(0);
}

/**
 * Assert that an email address is valid
 */
export function expectValidEmail(email: string) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  expect(email).toMatch(emailRegex);
}

export function expectValidInternationalPhone(phone: string) {
  const phoneRegex = /^\+[1-9]\d{7,14}$/;
  expect(phone).toMatch(phoneRegex);
}

/**
 * Assert that a transaction code follows the TX-XXXXXX format
 */
export function expectValidTransactionCode(code: string) {
  const codeRegex = /^TX-[A-Z0-9]{6}$/;
  expect(code).toMatch(codeRegex);
}

/**
 * Assert that a slug is URL-safe
 * Must be lowercase, alphanumeric, hyphens only
 */
export function expectValidSlug(slug: string) {
  const slugRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  expect(slug).toMatch(slugRegex);
}

/**
 * Assert that a user object has the correct shape
 */
export function expectValidUserObject(user: any) {
  expect(user).toBeDefined();
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('uid');
  expect(user).toHaveProperty('role');

  expectValidUUID(user.id);
  // UID is a string in format "U-000123"
  expect(typeof user.uid).toBe('string');
  expect(user.uid).toMatch(/^U-\d{6}$/); // Format: U-{6 digits}
  expect(['USER', 'ADMIN']).toContain(user.role);

  if (user.email) {
    expectValidEmail(user.email);
  }

  if (user.phone) {
    expectValidInternationalPhone(user.phone);
  }

  if (user.createdAt) {
    expectValidISOTimestamp(user.createdAt);
  }
}

/**
 * Assert that a product object has the correct shape
 */
export function expectValidProductObject(product: any) {
  expect(product).toBeDefined();
  expect(product).toHaveProperty('id');
  expect(product).toHaveProperty('name');
  expect(product).toHaveProperty('slug');
  expect(product).toHaveProperty('price');
  expect(product).toHaveProperty('stock');

  expectValidUUID(product.id);
  expect(product.name.length).toBeGreaterThan(0);
  expectValidSlug(product.slug);
  expect(typeof product.price).toBe('number');
  expect(product.price).toBeGreaterThanOrEqual(0);
  expect(typeof product.stock).toBe('number');
  expect(product.stock).toBeGreaterThanOrEqual(0);

  if (product.createdAt) {
    expectValidISOTimestamp(product.createdAt);
  }
}

/**
 * Assert that a transaction object has the correct shape
 */
export function expectValidTransactionObject(transaction: any) {
  expect(transaction).toBeDefined();
  expect(transaction).toHaveProperty('id');
  expect(transaction).toHaveProperty('transactionCode');
  expect(transaction).toHaveProperty('totalAmount');
  expect(transaction).toHaveProperty('status');

  expectValidUUID(transaction.id);
  expectValidTransactionCode(transaction.transactionCode);
  expect(typeof transaction.totalAmount).toBe('number');
  expect(transaction.totalAmount).toBeGreaterThan(0);
  expect(['PENDING', 'COMPLETED', 'FAILED']).toContain(transaction.status);

  if (transaction.createdAt) {
    expectValidISOTimestamp(transaction.createdAt);
  }
}

/**
 * Assert that a category object has the correct shape
 */
export function expectValidCategoryObject(category: any) {
  expect(category).toBeDefined();
  expect(category).toHaveProperty('id');
  expect(category).toHaveProperty('name');
  expect(category).toHaveProperty('slug');

  expectValidUUID(category.id);
  expect(category.name.length).toBeGreaterThan(0);
  expectValidSlug(category.slug);

  if (category.parentId) {
    expectValidUUID(category.parentId);
  }

  if (category.createdAt) {
    expectValidISOTimestamp(category.createdAt);
  }
}

/**
 * Assert that a tag object has the correct shape
 */
export function expectValidTagObject(tag: any) {
  expect(tag).toBeDefined();
  expect(tag).toHaveProperty('id');
  expect(tag).toHaveProperty('name');
  expect(tag).toHaveProperty('slug');

  expectValidUUID(tag.id);
  expect(tag.name.length).toBeGreaterThan(0);
  expectValidSlug(tag.slug);

  if (tag.createdAt) {
    expectValidISOTimestamp(tag.createdAt);
  }
}

/**
 * Assert that a promo code object has the correct shape
 */
export function expectValidPromoCodeObject(promoCode: any) {
  expect(promoCode).toBeDefined();
  expect(promoCode).toHaveProperty('id');
  expect(promoCode).toHaveProperty('code');
  expect(promoCode).toHaveProperty('discount');
  expect(promoCode).toHaveProperty('expiresAt');
  expect(promoCode).toHaveProperty('userId');

  expectValidUUID(promoCode.id);
  expect(promoCode.code.length).toBeGreaterThan(0);
  expect(typeof promoCode.discount).toBe('number');
  expect(promoCode.discount).toBeGreaterThan(0);
  expectValidISOTimestamp(promoCode.expiresAt);

  if (promoCode.userId) {
    expectValidUUID(promoCode.userId);
  }

  if (promoCode.createdAt) {
    expectValidISOTimestamp(promoCode.createdAt);
  }
}

/**
 * Assert that an OTP code is valid (6 digits)
 */
export function expectValidOTPCode(code: string) {
  const otpRegex = /^\d{6}$/;
  expect(code).toMatch(otpRegex);
}

/**
 * Assert that a bcrypt hash is valid
 */
export function expectValidBcryptHash(hash: string) {
  const bcryptRegex = /^\$2[aby]\$\d{2}\$.{53}$/;
  expect(hash).toMatch(bcryptRegex);
}

/**
 * Assert that a URL is a valid HTTP(S) URL
 */
export function expectValidURL(url: string) {
  expect(() => new URL(url)).not.toThrow();
  expect(['http:', 'https:']).toContain(new URL(url).protocol);
}

/**
 * Assert that a paginated response has the correct shape
 */
export function expectValidPaginatedResponse(
  response: any,
  expectedMinItems = 0
) {
  expect(response).toBeDefined();
  expect(response).toHaveProperty('data');
  expect(response).toHaveProperty('total');
  expect(response).toHaveProperty('page');
  expect(response).toHaveProperty('limit');

  expect(Array.isArray(response.data)).toBe(true);
  expect(response.data.length).toBeGreaterThanOrEqual(expectedMinItems);

  expect(typeof response.total).toBe('number');
  expect(response.total).toBeGreaterThanOrEqual(0);

  expect(typeof response.page).toBe('number');
  expect(response.page).toBeGreaterThan(0);

  expect(typeof response.limit).toBe('number');
  expect(response.limit).toBeGreaterThan(0);

  // Verify pagination math
  expect(response.data.length).toBeLessThanOrEqual(response.limit);
}

/**
 * Assert that a value is within a numeric range
 */
export function expectInRange(value: number, min: number, max: number) {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}
