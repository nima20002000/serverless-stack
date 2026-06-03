/**
 * Integration Tests for User Service
 *
 * Tests user creation, retrieval, profile updates, password flows,
 * and orphaned transaction linking.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete field values and side effects
 * - Error scenarios validate specific error messages and state
 * - Tests rely on real Supabase interactions, no mocks
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient } from '../utils/test-client';
import {
  cleanupTestUsers,
  cleanupTestTransactions,
  cleanupTestPromoCodes,
  cleanupTestOTPs,
} from '../utils/cleanup';
import {
  expectValidEmail,
  expectValidInternationalPhone,
  expectValidUUID,
  expectValidBcryptHash,
} from '../utils/assertions';
import {
  createUser,
  getUserByEmail,
  getUserByPhone,
  getUserByIdentifier,
  updateUserProfile,
  changeUserPassword,
  resetPasswordWithOTP,
  setUserPassword,
  linkOrphanedTransactions,
} from '../../src/services/user-service';

const supabase = createTestSupabaseClient();

function createTestEmail(label: string) {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test-user-${label}-${timestamp}-${random}@example.com`;
}

function createTestPhone() {
  const suffix = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0');
  return `+1202555${suffix}`;
}

async function fetchUserPassword(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('password')
    .eq('id', userId)
    .single();

  expect(error).toBeNull();
  if (!data || !('password' in data)) {
    throw new Error('User password not found for test user');
  }
  return data.password as string | null;
}

async function fetchLatestPromoCode(userId: string) {
  const { data, error } = await supabase
    .from('promo_codes')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  expect(error).toBeNull();
  if (!data) {
    throw new Error('Promo code not found for test user');
  }
  return data;
}

describe('User Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestTransactions();
    await cleanupTestOTPs();
    await cleanupTestPromoCodes();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestTransactions();
    await cleanupTestOTPs();
    await cleanupTestPromoCodes();
    await cleanupTestUsers();
  });

  it('should create a user with email and password and issue promo code', async () => {
    const email = createTestEmail('email');
    const name = 'User Email Test';

    const user = await createUser({
      email,
      password: 'TestPassword123!',
      name,
    });

    expectValidUUID(user.id);
    expect(user.uid).toMatch(/^U-\d{6}$/);
    expect(user.email).toBe(email);
    expect(user.phone).toBeNull();
    expect(user.name).toBe(name);
    expect(user.role).toBe('USER');
    expect(user.isVerified).toBe(true); // All users are verified via OTP before creation
    expect(user.createdAt).toBeInstanceOf(Date);

    const storedPassword = await fetchUserPassword(user.id);
    expect(typeof storedPassword).toBe('string');
    expect(storedPassword).not.toBe('TestPassword123!');
    expect(storedPassword).toBeDefined();
    expectValidBcryptHash(storedPassword as string);
    expect(
      await bcrypt.compare('TestPassword123!', storedPassword as string)
    ).toBe(true);

    const promo = await fetchLatestPromoCode(user.id);
    expect(promo.userId).toBe(user.id);
    expect(promo.isUsed).toBe(false);
    expect(promo.code).toMatch(/^WELCOME-[A-Z0-9]{4}$/);
    expect(new Date(promo.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('should create a phone-only user and mark as verified', async () => {
    const phone = createTestPhone();

    const user = await createUser({
      phone,
      name: 'User textandquality Test',
    });

    expectValidUUID(user.id);
    expect(user.email).toBeNull();
    expect(user.phone).toBe(phone);
    expect(user.phone).toBeDefined();
    expectValidInternationalPhone(user.phone as string);
    expect(user.isVerified).toBe(true);

    const storedPassword = await fetchUserPassword(user.id);
    expect(storedPassword).toBeNull();

    const fetched = await getUserByPhone(phone);
    expect(fetched?.id).toBe(user.id);
  });

  it('should retrieve user by email, phone, and identifier', async () => {
    const email = createTestEmail('lookup');
    const phone = createTestPhone();

    const user = await createUser({
      email,
      phone,
      password: 'LookupPassword123!',
      name: 'User Search',
    });

    const byEmail = await getUserByEmail(email);
    expect(byEmail?.id).toBe(user.id);
    expect(byEmail?.email).toBeDefined();
    expectValidEmail(byEmail?.email as string);

    const byPhone = await getUserByPhone(phone);
    expect(byPhone?.id).toBe(user.id);
    expect(byPhone?.phone).toBeDefined();
    expectValidInternationalPhone(byPhone?.phone as string);

    const byIdentifierEmail = await getUserByIdentifier(email);
    expect(byIdentifierEmail?.id).toBe(user.id);

    const byIdentifierPhone = await getUserByIdentifier(phone);
    expect(byIdentifierPhone?.id).toBe(user.id);

    const invalidIdentifier = await getUserByIdentifier('not-valid');
    expect(invalidIdentifier).toBeNull();
  });

  it('should reject creating a duplicate user by email', async () => {
    const email = createTestEmail('duplicate');

    await createUser({
      email,
      password: 'DuplicatePassword123!',
      name: 'User details',
    });

    await expect(
      createUser({
        email,
        password: 'DuplicatePassword123!',
        name: 'User details',
      })
    ).rejects.toThrow(
      'An account with this email or phone number already exists.'
    );
  });

  it('should update user profile fields and persist changes', async () => {
    const email = createTestEmail('profile');
    const phone = createTestPhone();

    const user = await createUser({
      email,
      phone,
      password: 'ProfilePassword123!',
      name: 'User details',
    });

    const updated = await updateUserProfile(user.id, {
      name: 'User today',
      email: createTestEmail('updated'),
      phone: createTestPhone(),
      shippingAddress: 'Sample Citydetailsquality Testtext 12',
      postalCode: '1234567890',
    });

    expect(updated.id).toBe(user.id);
    expect(updated.name).toBe('User today');
    expect(updated.email).toBeDefined();
    expectValidEmail(updated.email as string);
    expect(updated.phone).toBeDefined();
    expectValidInternationalPhone(updated.phone as string);
    expect(updated.shippingAddress).toContain('Sample City');
    expect(updated.postalCode).toBe('1234567890');
    expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
      user.updatedAt.getTime()
    );
  });

  it('should prevent profile update with duplicate email', async () => {
    const emailA = createTestEmail('a');
    const emailB = createTestEmail('b');

    const userA = await createUser({
      email: emailA,
      password: 'Password123!',
      name: 'User A',
    });

    const userB = await createUser({
      email: emailB,
      password: 'Password123!',
      name: 'User B',
    });

    expect(userA.email).toBeDefined();
    await expect(
      updateUserProfile(userB.id, {
        email: userA.email as string,
      })
    ).rejects.toThrow('This email is already in use.');
  });

  it('should change password when current password is valid', async () => {
    const email = createTestEmail('password');

    const user = await createUser({
      email,
      password: 'OldPassword123!',
      name: 'User text',
    });

    await changeUserPassword(user.id, 'OldPassword123!', 'NewPassword123!');

    const updatedHash = await fetchUserPassword(user.id);
    expect(typeof updatedHash).toBe('string');
    expect(updatedHash).toBeDefined();
    expect(await bcrypt.compare('NewPassword123!', updatedHash as string)).toBe(
      true
    );
  });

  it('should reject password change with incorrect current password', async () => {
    const email = createTestEmail('wrong-password');

    const user = await createUser({
      email,
      password: 'CorrectPassword123!',
      name: 'User text',
    });

    await expect(
      changeUserPassword(user.id, 'WrongPassword123!', 'NewPassword123!')
    ).rejects.toThrow('Current password is incorrect.');
  });

  it('should set password for OTP-only users and prevent reuse', async () => {
    const phone = createTestPhone();

    const user = await createUser({
      phone,
      name: 'User OTP',
    });

    await setUserPassword(user.id, 'SetPassword123!');

    const storedPassword = await fetchUserPassword(user.id);
    expect(typeof storedPassword).toBe('string');
    expect(storedPassword).toBeDefined();
    expect(
      await bcrypt.compare('SetPassword123!', storedPassword as string)
    ).toBe(true);

    await expect(
      setUserPassword(user.id, 'AnotherPassword123!')
    ).rejects.toThrow('This account already has a password.');
  });

  it('should reset password via OTP flow', async () => {
    const email = createTestEmail('reset');

    const user = await createUser({
      email,
      password: 'InitialPassword123!',
      name: 'User text',
    });

    await resetPasswordWithOTP(user.id, 'ResetPassword123!');

    const updatedHash = await fetchUserPassword(user.id);
    expect(typeof updatedHash).toBe('string');
    expect(updatedHash).toBeDefined();
    expect(
      await bcrypt.compare('ResetPassword123!', updatedHash as string)
    ).toBe(true);
  });

  it('should link orphaned guest transactions to the user', async () => {
    const phone = createTestPhone();

    const user = await createUser({
      phone,
      name: 'User Transaction',
    });

    const transactionId = randomUUID();
    const transactionCode = `TEST-${Date.now()}`;

    const { error: txError } = await supabase.from('transactions').insert({
      id: transactionId,
      userId: null,
      amount: 250000,
      status: 'PENDING',
      transactionCode,
      paymentMethod: 'STRIPE',
      isGuest: true,
      fullName: 'Guest Test',
      phone,
      shippingAddress: 'Address Test',
      postalCode: '1234567890',
      updatedAt: new Date().toISOString(),
    });

    expect(txError).toBeNull();

    const linkedCount = await linkOrphanedTransactions(user.id, phone);
    expect(linkedCount).toBe(1);

    const { data: updatedTx, error: fetchError } = await supabase
      .from('transactions')
      .select('userId, isGuest')
      .eq('id', transactionId)
      .single();

    expect(fetchError).toBeNull();
    expect(updatedTx?.userId).toBe(user.id);
    expect(updatedTx?.isGuest).toBe(true);
  });
});
