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
  expectValidIranianPhone,
  expectValidUUID,
  expectValidBcryptHash,
} from '../utils/assertions';
import {
  createUser,
  getUserById,
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
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `091200000${suffix}`;
}

async function fetchUserPassword(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('password')
    .eq('id', userId)
    .single();

  expect(error).toBeNull();
  expect(data).not.toBeNull();
  return data!.password as string | null;
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
  expect(data).not.toBeNull();
  return data!;
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
    const name = 'کاربر ایمیل تست';

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
    expect(user.isVerified).toBe(false);
    expect(user.createdAt).toBeInstanceOf(Date);

    const storedPassword = await fetchUserPassword(user.id);
    expect(storedPassword).not.toBeNull();
    expect(storedPassword).not.toBe('TestPassword123!');
    expectValidBcryptHash(storedPassword!);
    expect(await bcrypt.compare('TestPassword123!', storedPassword!)).toBe(true);

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
      name: 'کاربر موبایل تست',
    });

    expectValidUUID(user.id);
    expect(user.email).toBeNull();
    expect(user.phone).toBe(phone);
    expectValidIranianPhone(user.phone!);
    expect(user.isVerified).toBe(true);

    const storedPassword = await fetchUserPassword(user.id);
    expect(storedPassword).toBeNull();

    const fetched = await getUserByPhone(phone);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(user.id);
  });

  it('should retrieve user by email, phone, and identifier', async () => {
    const email = createTestEmail('lookup');
    const phone = createTestPhone();

    const user = await createUser({
      email,
      phone,
      password: 'LookupPassword123!',
      name: 'کاربر جستجو',
    });

    const byEmail = await getUserByEmail(email);
    expect(byEmail).not.toBeNull();
    expect(byEmail!.id).toBe(user.id);
    expectValidEmail(byEmail!.email!);

    const byPhone = await getUserByPhone(phone);
    expect(byPhone).not.toBeNull();
    expect(byPhone!.id).toBe(user.id);
    expectValidIranianPhone(byPhone!.phone!);

    const byIdentifierEmail = await getUserByIdentifier(email);
    expect(byIdentifierEmail).not.toBeNull();
    expect(byIdentifierEmail!.id).toBe(user.id);

    const byIdentifierPhone = await getUserByIdentifier(phone);
    expect(byIdentifierPhone).not.toBeNull();
    expect(byIdentifierPhone!.id).toBe(user.id);

    const invalidIdentifier = await getUserByIdentifier('not-valid');
    expect(invalidIdentifier).toBeNull();
  });

  it('should reject creating a duplicate user by email', async () => {
    const email = createTestEmail('duplicate');

    await createUser({
      email,
      password: 'DuplicatePassword123!',
      name: 'کاربر اول',
    });

    await expect(
      createUser({
        email,
        password: 'DuplicatePassword123!',
        name: 'کاربر دوم',
      })
    ).rejects.toThrow('کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است');
  });

  it('should update user profile fields and persist changes', async () => {
    const email = createTestEmail('profile');
    const phone = createTestPhone();

    const user = await createUser({
      email,
      phone,
      password: 'ProfilePassword123!',
      name: 'کاربر اولیه',
    });

    const updated = await updateUserProfile(user.id, {
      name: 'کاربر به‌روز',
      email: createTestEmail('updated'),
      phone: createTestPhone(),
      shippingAddress: 'تهران، خیابان تست، پلاک ۱۲',
      postalCode: '1234567890',
    });

    expect(updated.id).toBe(user.id);
    expect(updated.name).toBe('کاربر به‌روز');
    expectValidEmail(updated.email!);
    expectValidIranianPhone(updated.phone!);
    expect(updated.shippingAddress).toContain('تهران');
    expect(updated.postalCode).toBe('1234567890');
    expect(updated.updatedAt.getTime()).toBeGreaterThan(user.updatedAt.getTime());
  });

  it('should prevent profile update with duplicate email', async () => {
    const emailA = createTestEmail('a');
    const emailB = createTestEmail('b');

    const userA = await createUser({
      email: emailA,
      password: 'Password123!',
      name: 'کاربر A',
    });

    const userB = await createUser({
      email: emailB,
      password: 'Password123!',
      name: 'کاربر B',
    });

    await expect(
      updateUserProfile(userB.id, {
        email: userA.email!,
      })
    ).rejects.toThrow('این ایمیل قبلاً استفاده شده است');
  });

  it('should change password when current password is valid', async () => {
    const email = createTestEmail('password');

    const user = await createUser({
      email,
      password: 'OldPassword123!',
      name: 'کاربر رمز',
    });

    await changeUserPassword(user.id, 'OldPassword123!', 'NewPassword123!');

    const updatedHash = await fetchUserPassword(user.id);
    expect(updatedHash).not.toBeNull();
    expect(await bcrypt.compare('NewPassword123!', updatedHash!)).toBe(true);
  });

  it('should reject password change with incorrect current password', async () => {
    const email = createTestEmail('wrong-password');

    const user = await createUser({
      email,
      password: 'CorrectPassword123!',
      name: 'کاربر رمز',
    });

    await expect(
      changeUserPassword(user.id, 'WrongPassword123!', 'NewPassword123!')
    ).rejects.toThrow('رمز عبور فعلی نادرست است');
  });

  it('should set password for OTP-only users and prevent reuse', async () => {
    const phone = createTestPhone();

    const user = await createUser({
      phone,
      name: 'کاربر OTP',
    });

    await setUserPassword(user.id, 'SetPassword123!');

    const storedPassword = await fetchUserPassword(user.id);
    expect(storedPassword).not.toBeNull();
    expect(await bcrypt.compare('SetPassword123!', storedPassword!)).toBe(true);

    await expect(setUserPassword(user.id, 'AnotherPassword123!')).rejects.toThrow(
      'این کاربر قبلاً رمز عبور دارد. از گزینه تغییر رمز عبور استفاده کنید'
    );
  });

  it('should reset password via OTP flow', async () => {
    const email = createTestEmail('reset');

    const user = await createUser({
      email,
      password: 'InitialPassword123!',
      name: 'کاربر ریست',
    });

    await resetPasswordWithOTP(user.id, 'ResetPassword123!');

    const updatedHash = await fetchUserPassword(user.id);
    expect(updatedHash).not.toBeNull();
    expect(await bcrypt.compare('ResetPassword123!', updatedHash!)).toBe(true);
  });

  it('should link orphaned guest transactions to the user', async () => {
    const phone = createTestPhone();

    const user = await createUser({
      phone,
      name: 'کاربر تراکنش',
    });

    const transactionId = randomUUID();
    const transactionCode = `TEST-${Date.now()}`;

    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        userId: null,
        amount: 250000,
        status: 'PENDING',
        transactionCode,
        paymentMethod: 'ZARINPAL',
        isGuest: true,
        fullName: 'مهمان تست',
        phone,
        shippingAddress: 'آدرس تست',
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
    expect(updatedTx).not.toBeNull();
    expect(updatedTx!.userId).toBe(user.id);
    expect(updatedTx!.isGuest).toBe(true);
  });
});
