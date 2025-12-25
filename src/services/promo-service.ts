import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/types';
import { log } from '@/lib/logger';
import { randomUUID } from 'crypto';

type PromoCode = Tables<'promo_codes'>;

/**
 * Promo Service (Supabase)
 * Handles promo code generation, validation, and usage tracking
 */

/**
 * Generate a unique promo code for first-time users
 * Code format: WELCOME-XXXX where X is random alphanumeric
 */
export async function generatePromoCode(): Promise<string> {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WELCOME-${randomPart}`;
}

/**
 * Create a promo code for a new user
 * Expires in 24 hours
 */
export async function createFirstTimePromoCode(
  userId: string
): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    const code = await generatePromoCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        id: randomUUID(),
        code,
        userId,
        expiresAt: expiresAt.toISOString(),
        isUsed: false,
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating promo code', { error, userId });
      throw new Error('خطا در ایجاد کد تخفیف');
    }

    log.info('Promo code created', { code, userId });
    return data;
  } catch (error) {
    log.error('Error in createFirstTimePromoCode', { userId, error });
    throw error;
  }
}

/**
 * Get active promo code for a user
 */
export async function getActivePromoCode(
  userId: string
): Promise<PromoCode | null> {
  const supabase = await createClient();

  try {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('userId', userId)
      .eq('isUsed', false)
      .gte('expiresAt', now) // Not expired
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle(); // Use maybeSingle to handle no results gracefully

    if (error) {
      log.error('Error fetching active promo code', { error, userId });
      throw new Error('خطا در دریافت کد تخفیف');
    }

    return data;
  } catch (error) {
    log.error('Error in getActivePromoCode', { userId, error });
    throw error;
  }
}

/**
 * Mark promo code as used
 */
export async function usePromoCode(code: string): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    // First, fetch the promo code to validate it
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError || !promoCode) {
      log.warn('Promo code not found', { code });
      throw new Error('کد تخفیف یافت نشد');
    }

    if (promoCode.isUsed) {
      log.warn('Promo code already used', { code });
      throw new Error('این کد تخفیف قبلاً استفاده شده است');
    }

    if (new Date(promoCode.expiresAt) < new Date()) {
      log.warn('Promo code expired', { code, expiresAt: promoCode.expiresAt });
      throw new Error('کد تخفیف منقضی شده است');
    }

    // Mark as used
    const { data: updatedPromoCode, error: updateError } = await supabase
      .from('promo_codes')
      .update({ isUsed: true })
      .eq('code', code)
      .select()
      .single();

    if (updateError || !updatedPromoCode) {
      log.error('Error updating promo code', { error: updateError, code });
      throw new Error('خطا در استفاده از کد تخفیف');
    }

    log.info('Promo code used', { code });
    return updatedPromoCode;
  } catch (error) {
    log.error('Error in usePromoCode', { code, error });
    throw error;
  }
}
