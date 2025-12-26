/**
 * Integration Tests for Promo Service
 *
 * Tests promo code creation, retrieval, and usage tracking.
 * These tests validate real behavior against the Supabase database.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient, generateTestUID } from '../utils/test-client';
import {
  cleanupTestPromoCodes,
  cleanupTestUsers,
} from '../utils/cleanup';
import {
  generatePromoCode,
  createFirstTimePromoCode,
  getActivePromoCode,
  usePromoCode,
} from '../../src/services/promo-service';

const supabase = createTestSupabaseClient();

async function createTestUser() {
  const userId = randomUUID();
  const uid = await generateTestUID();
  const email = `test-promo-${Date.now()}-${Math.floor(Math.random() * 1000)}@example.com`;
  const phoneSuffix = Math.floor(Math.random() * 90 + 10);
  const phone = `091200000${phoneSuffix}`;

  const { error } = await supabase.from('users').insert({
    id: userId,
    uid,
    email,
    phone,
    name: 'کاربر تست پرومو',
    role: 'USER',
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return { userId, email, phone };
}

describe('Promo Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestPromoCodes();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupTestPromoCodes();
    await cleanupTestUsers();
  });

  it('should generate promo codes in WELCOME-XXXX format', async () => {
    const code = await generatePromoCode();

    expect(code.startsWith('WELCOME-')).toBe(true);
    const suffix = code.replace('WELCOME-', '');
    expect(suffix.length).toBe(4);
    expect(suffix).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('should create a first-time promo code with ~24h expiry window', async () => {
    const { userId } = await createTestUser();
    const created = await createFirstTimePromoCode(userId);

    expect(created.userId).toBe(userId);
    expect(created.isUsed).toBe(false);
    expect(created.code).toMatch(/^WELCOME-[A-Z0-9]{4}$/);

    const createdAtMs = new Date(created.createdAt).getTime();
    const expiresAtMs = new Date(created.expiresAt).getTime();
    const ttlMs = expiresAtMs - createdAtMs;
    expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
    expect(ttlMs).toBeLessThan(25 * 60 * 60 * 1000);

    const { data: stored, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', created.id)
      .single();

    if (error) {
      throw new Error(`Failed to fetch promo code: ${error.message}`);
    }

    expect(stored.id).toBe(created.id);
    expect(stored.code).toBe(created.code);
  });

  it('should return active promo code for a user and ignore used ones', async () => {
    const { userId } = await createTestUser();

    const latest = await createFirstTimePromoCode(userId);
    const active = await getActivePromoCode(userId);

    if (!active) {
      throw new Error('Expected active promo code but received null');
    }

    expect(active.id).toBe(latest.id);
    expect(active.code).toBe(latest.code);
    expect(active.isUsed).toBe(false);

    const { error: updateError } = await supabase
      .from('promo_codes')
      .update({ isUsed: true })
      .eq('id', latest.id);

    if (updateError) {
      throw new Error(`Failed to mark promo code as used: ${updateError.message}`);
    }

    const afterUse = await getActivePromoCode(userId);
    expect(afterUse).toBeNull();
  });

  it('should mark promo codes as used and reject reuse or expired codes', async () => {
    const { userId } = await createTestUser();

    const activeCode = `TEST-USE-${Date.now()}`;
    const { error: insertError } = await supabase.from('promo_codes').insert({
      id: randomUUID(),
      code: activeCode,
      userId,
      isUsed: false,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      throw new Error(`Failed to insert active promo code: ${insertError.message}`);
    }

    const used = await usePromoCode(activeCode);
    expect(used.code).toBe(activeCode);
    expect(used.isUsed).toBe(true);

    let reuseError: Error | null = null;
    try {
      await usePromoCode(activeCode);
    } catch (error) {
      reuseError = error as Error;
    }

    if (!reuseError) {
      throw new Error('Expected reuse of promo code to throw');
    }
    expect(reuseError.message).toBe('این کد تخفیف قبلاً استفاده شده است');

    const { userId: expiredUserId } = await createTestUser();
    const expiredCode = `TEST-EXPIRED-${Date.now()}`;
    const { error: expiredInsertError } = await supabase.from('promo_codes').insert({
      id: randomUUID(),
      code: expiredCode,
      userId: expiredUserId,
      isUsed: false,
      expiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });

    if (expiredInsertError) {
      throw new Error(`Failed to insert expired promo code: ${expiredInsertError.message}`);
    }

    let expiredError: Error | null = null;
    try {
      await usePromoCode(expiredCode);
    } catch (error) {
      expiredError = error as Error;
    }

    if (!expiredError) {
      throw new Error('Expected expired promo code to throw');
    }
    expect(expiredError.message).toBe('کد تخفیف منقضی شده است');
  });
});
