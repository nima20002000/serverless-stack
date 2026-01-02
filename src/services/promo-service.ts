import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/types';
import { log } from '@/lib/logger';
import { randomUUID } from 'crypto';

type PromoCode = Tables<'promo_codes'>;
type PromoCodeUsage = Tables<'promo_code_usages'>;

export type DiscountType = 'PERCENT' | 'FIXED';

export interface PromoCodeValidationResult {
  valid: boolean;
  error?: string;
  promoCode?: PromoCode;
  discountAmount?: number;
}

export interface CreatePromoCodeInput {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  expiresAt: string;
  maxUsageCount?: number;
  description?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  userId?: string; // If set, code is user-specific
  isActive?: boolean;
}

export interface UpdatePromoCodeInput {
  code?: string;
  discountType?: DiscountType;
  discountValue?: number;
  expiresAt?: string;
  maxUsageCount?: number | null;
  description?: string | null;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  isActive?: boolean;
}

function maskPromoCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.length <= 4) {
    return '****';
  }
  return `${trimmed.slice(0, 3)}...${trimmed.slice(-4)}`;
}

/**
 * Promo Service (Supabase)
 * Handles promo code generation, validation, usage tracking, and admin CRUD
 */

// =============================================================================
// PROMO CODE VALIDATION
// =============================================================================

/**
 * Validate a promo code for use
 * Checks: exists, active, not expired, usage limit not reached, min order amount
 */
export async function validatePromoCode(
  code: string,
  orderTotal: number,
  userId?: string
): Promise<PromoCodeValidationResult> {
  const supabase = await createClient();

  try {
    // Fetch promo code
    const { data: promoCode, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle();

    if (error) {
      log.error('Error fetching promo code', { error, code });
      return { valid: false, error: 'خطا در بررسی کد تخفیف' };
    }

    if (!promoCode) {
      return { valid: false, error: 'کد تخفیف یافت نشد' };
    }

    // Check if active
    if (promoCode.isActive === false) {
      return { valid: false, error: 'کد تخفیف غیرفعال است' };
    }

    // Check if expired
    if (new Date(promoCode.expiresAt) < new Date()) {
      return { valid: false, error: 'کد تخفیف منقضی شده است' };
    }

    // Check usage limit
    if (
      promoCode.maxUsageCount !== null &&
      (promoCode.currentUsageCount ?? 0) >= promoCode.maxUsageCount
    ) {
      return {
        valid: false,
        error: 'سقف استفاده از این کد تخفیف تکمیل شده است',
      };
    }

    // Check if user-specific code
    if (promoCode.userId && promoCode.userId !== userId) {
      return { valid: false, error: 'این کد تخفیف برای شما قابل استفاده نیست' };
    }

    // Check minimum order amount
    if (
      promoCode.minOrderAmount !== null &&
      orderTotal < promoCode.minOrderAmount
    ) {
      const formattedMin = promoCode.minOrderAmount.toLocaleString('fa-IR');
      return {
        valid: false,
        error: `حداقل مبلغ سفارش برای استفاده از این کد ${formattedMin} تومان است`,
      };
    }

    // Check if user already used this code (for general codes)
    if (userId && !promoCode.userId) {
      const { data: existingUsage } = await supabase
        .from('promo_code_usages')
        .select('id')
        .eq('promoCodeId', promoCode.id)
        .eq('userId', userId)
        .limit(1)
        .maybeSingle();

      if (existingUsage) {
        return {
          valid: false,
          error: 'شما قبلاً از این کد تخفیف استفاده کرده‌اید',
        };
      }
    }

    // Calculate discount
    const discountAmount = calculateDiscount(promoCode, orderTotal);

    log.info('Promo code validated', {
      code,
      discountAmount,
      orderTotal,
      userId,
    });

    return {
      valid: true,
      promoCode,
      discountAmount,
    };
  } catch (error) {
    log.error('Error in validatePromoCode', { code, error });
    return { valid: false, error: 'خطا در بررسی کد تخفیف' };
  }
}

/**
 * Calculate discount amount based on promo code type
 */
export function calculateDiscount(
  promoCode: PromoCode,
  subtotal: number
): number {
  let discountAmount: number;

  if (promoCode.discountType === 'PERCENT') {
    discountAmount = Math.round(subtotal * (promoCode.discountValue / 100));

    // Apply max discount cap for percentage discounts
    if (
      promoCode.maxDiscountAmount !== null &&
      discountAmount > promoCode.maxDiscountAmount
    ) {
      discountAmount = promoCode.maxDiscountAmount;
    }
  } else {
    // FIXED discount
    discountAmount = Math.min(promoCode.discountValue, subtotal);
  }

  return discountAmount;
}

// =============================================================================
// PROMO USAGE TRACKING
// =============================================================================

/**
 * Record promo code usage after successful payment
 */
export async function recordPromoUsage(
  promoCodeId: string,
  transactionId: string,
  userId?: string
): Promise<PromoCodeUsage | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('promo_code_usages')
      .insert({
        promoCodeId,
        transactionId,
        userId: userId || null,
      })
      .select()
      .single();

    if (error) {
      log.error('Error recording promo usage', {
        error,
        promoCodeId,
        transactionId,
      });
      return null;
    }

    // Increment usage count
    await incrementUsageCount(promoCodeId);

    log.info('Promo usage recorded', { promoCodeId, transactionId, userId });
    return data;
  } catch (error) {
    log.error('Error in recordPromoUsage', {
      promoCodeId,
      transactionId,
      error,
    });
    return null;
  }
}

/**
 * Increment the current usage count of a promo code
 */
export async function incrementUsageCount(promoCodeId: string): Promise<void> {
  const supabase = await createClient();

  try {
    // Get current count
    const { data: promoCode } = await supabase
      .from('promo_codes')
      .select('currentUsageCount')
      .eq('id', promoCodeId)
      .single();

    if (!promoCode) return;

    const currentCount = promoCode.currentUsageCount ?? 0;

    await supabase
      .from('promo_codes')
      .update({ currentUsageCount: currentCount + 1 })
      .eq('id', promoCodeId);

    log.info('Promo code usage count incremented', {
      promoCodeId,
      newCount: currentCount + 1,
    });
  } catch (error) {
    log.error('Error incrementing usage count', { promoCodeId, error });
  }
}

// =============================================================================
// ADMIN CRUD OPERATIONS
// =============================================================================

/**
 * Get all promo codes (admin)
 */
export async function getAllPromoCodes(options?: {
  page?: number;
  perPage?: number;
  activeOnly?: boolean;
}): Promise<{
  data: PromoCode[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}> {
  const supabase = await createClient();
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;

  try {
    let query = supabase.from('promo_codes').select('*', { count: 'exact' });

    if (options?.activeOnly) {
      query = query.eq('isActive', true);
    }

    const { data, error, count } = await query
      .order('createdAt', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) {
      log.error('Error fetching promo codes', { error });
      throw new Error('خطا در دریافت کدهای تخفیف');
    }

    const total = count || 0;

    return {
      data: data || [],
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    };
  } catch (error) {
    log.error('Error in getAllPromoCodes', { error });
    throw error;
  }
}

/**
 * Get single promo code by ID (admin)
 */
export async function getPromoCodeById(id: string): Promise<PromoCode | null> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      log.error('Error fetching promo code', { error, id });
      return null;
    }

    return data;
  } catch (error) {
    log.error('Error in getPromoCodeById', { id, error });
    return null;
  }
}

/**
 * Create a new promo code (admin)
 */
export async function createPromoCode(
  input: CreatePromoCodeInput
): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    const code = input.code.toUpperCase().trim();

    // Check if code already exists
    const { data: existing } = await supabase
      .from('promo_codes')
      .select('id')
      .eq('code', code)
      .maybeSingle();

    if (existing) {
      throw new Error('این کد تخفیف قبلاً وجود دارد');
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        id: randomUUID(),
        code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        expiresAt: input.expiresAt,
        maxUsageCount: input.maxUsageCount || null,
        description: input.description || null,
        minOrderAmount: input.minOrderAmount || null,
        maxDiscountAmount: input.maxDiscountAmount || null,
        userId: input.userId || null,
        isActive: input.isActive ?? true,
        isUsed: false,
        currentUsageCount: 0,
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating promo code', { error, input });
      throw new Error('خطا در ایجاد کد تخفیف');
    }

    log.info('Promo code created', { code, id: data.id });
    return data;
  } catch (error) {
    log.error('Error in createPromoCode', { input, error });
    throw error;
  }
}

/**
 * Update a promo code (admin)
 */
export async function updatePromoCode(
  id: string,
  input: UpdatePromoCodeInput
): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    // Build update object
    const updateData: Record<string, unknown> = {};

    if (input.code !== undefined) {
      const code = input.code.toUpperCase().trim();
      // Check if new code already exists (if changing)
      const { data: existing } = await supabase
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .neq('id', id)
        .maybeSingle();

      if (existing) {
        throw new Error('این کد تخفیف قبلاً وجود دارد');
      }
      updateData.code = code;
    }

    if (input.discountType !== undefined) {
      updateData.discountType = input.discountType;
    }
    if (input.discountValue !== undefined) {
      updateData.discountValue = input.discountValue;
    }
    if (input.expiresAt !== undefined) {
      updateData.expiresAt = input.expiresAt;
    }
    if (input.maxUsageCount !== undefined) {
      updateData.maxUsageCount = input.maxUsageCount;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.minOrderAmount !== undefined) {
      updateData.minOrderAmount = input.minOrderAmount;
    }
    if (input.maxDiscountAmount !== undefined) {
      updateData.maxDiscountAmount = input.maxDiscountAmount;
    }
    if (input.isActive !== undefined) {
      updateData.isActive = input.isActive;
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Error updating promo code', { error, id, input });
      throw new Error('خطا در بروزرسانی کد تخفیف');
    }

    log.info('Promo code updated', { id });
    return data;
  } catch (error) {
    log.error('Error in updatePromoCode', { id, input, error });
    throw error;
  }
}

/**
 * Delete a promo code (admin)
 */
export async function deletePromoCode(id: string): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase.from('promo_codes').delete().eq('id', id);

    if (error) {
      log.error('Error deleting promo code', { error, id });
      throw new Error('خطا در حذف کد تخفیف');
    }

    log.info('Promo code deleted', { id });
  } catch (error) {
    log.error('Error in deletePromoCode', { id, error });
    throw error;
  }
}

/**
 * Toggle promo code active status (admin)
 */
export async function togglePromoCodeStatus(
  id: string,
  isActive: boolean
): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .update({ isActive })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      log.error('Error toggling promo code status', { error, id });
      throw new Error('خطا در تغییر وضعیت کد تخفیف');
    }

    log.info('Promo code status toggled', { id, isActive });
    return data;
  } catch (error) {
    log.error('Error in togglePromoCodeStatus', { id, error });
    throw error;
  }
}

// =============================================================================
// LEGACY FUNCTIONS (for welcome codes - backwards compatibility)
// =============================================================================

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
 * Expires in 24 hours, 10% discount
 */
export async function createFirstTimePromoCode(
  userId: string
): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    const code = await generatePromoCode();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('promo_codes')
      .insert({
        id: randomUUID(),
        code,
        userId,
        expiresAt: expiresAt.toISOString(),
        isUsed: false,
        discountType: 'PERCENT',
        discountValue: 10,
        maxUsageCount: 1,
        currentUsageCount: 0,
        isActive: true,
        description: 'کد تخفیف خوش‌آمدگویی',
      })
      .select()
      .single();

    if (error) {
      log.error('Error creating promo code', { error, userId });
      throw new Error('خطا در ایجاد کد تخفیف');
    }

    log.info('Promo code created', { code: maskPromoCode(code), userId });
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
      .eq('isActive', true)
      .gte('expiresAt', now)
      .order('createdAt', { ascending: false })
      .limit(1)
      .maybeSingle();

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
 * Mark promo code as used (legacy - for welcome codes)
 */
export async function usePromoCode(code: string): Promise<PromoCode> {
  const supabase = await createClient();

  try {
    const { data: promoCode, error: fetchError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', code)
      .single();

    if (fetchError || !promoCode) {
      log.warn('Promo code not found', { code: maskPromoCode(code) });
      throw new Error('کد تخفیف یافت نشد');
    }

    if (promoCode.isUsed) {
      log.warn('Promo code already used', { code: maskPromoCode(code) });
      throw new Error('این کد تخفیف قبلاً استفاده شده است');
    }

    if (new Date(promoCode.expiresAt) < new Date()) {
      log.warn('Promo code expired', {
        code: maskPromoCode(code),
        expiresAt: promoCode.expiresAt,
      });
      throw new Error('کد تخفیف منقضی شده است');
    }

    const { data: updatedPromoCode, error: updateError } = await supabase
      .from('promo_codes')
      .update({ isUsed: true })
      .eq('code', code)
      .select()
      .single();

    if (updateError || !updatedPromoCode) {
      log.error('Error updating promo code', {
        error: updateError,
        code: maskPromoCode(code),
      });
      throw new Error('خطا در استفاده از کد تخفیف');
    }

    log.info('Promo code used', { code: maskPromoCode(code) });
    return updatedPromoCode;
  } catch (error) {
    log.error('Error in usePromoCode', { code: maskPromoCode(code), error });
    throw error;
  }
}
