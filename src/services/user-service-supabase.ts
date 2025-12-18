import { createClient } from "@/lib/supabase/server";
import { randomUUID } from "crypto";
import { createFirstTimePromoCode } from "./promo-service";
import { log } from "@/lib/logger";

// Import utilities from modular structure
import {
  queryUser,
  checkUserExists,
  type UserInfo,
} from "./user-service-supabase/queries";
import {
  validatePassword,
  hashPassword,
  updatePassword,
  verifyCurrentPassword,
  ensureNoPassword,
  getUserWithPassword,
} from "./user-service-supabase/password";
import {
  validateEmail,
  validatePhone,
  detectIdentifierType,
  validateEmailUniqueness,
  validatePhoneUniqueness,
} from "./user-service-supabase/validation";

type UserWithoutPassword = Omit<{
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}, never>;

// Re-export for backward compatibility
export type { UserInfo };
export { validateEmail, validatePassword, validatePhone, detectIdentifierType };

/**
 * Generate next available UID for new user
 * Format: U-{6-digit sequential number}
 *
 * IMPORTANT: Orders by UID (not createdAt) to prevent race conditions
 * where users created at similar times could get duplicate UIDs
 */
export async function generateNextUID(): Promise<string> {
  const supabase = await createClient();

  // Get the user with the highest UID number (ordered DESC by uid field)
  const { data, error } = await supabase
    .from('users')
    .select('uid')
    .order('uid', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;

  if (!error && data?.uid) {
    // Extract number from UID (e.g., "U-000123" -> 123)
    const match = data.uid.match(/^U-(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1;
    }
  }

  // Format as U-{6-digit number}
  return `U-${nextNumber.toString().padStart(6, '0')}`;
}

/**
 * Create a new user
 * Supports both email and phone registration
 */
export async function createUser(data: {
  email?: string;
  phone?: string;
  password?: string;
  name: string;
}): Promise<UserWithoutPassword> {
  const { email, phone, password, name } = data;

  log.info('Creating user', { email, phone, name });

  try {
    // Validate at least one identifier
    if (!email && !phone) {
      throw new Error('ایمیل یا شماره تلفن الزامی است');
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      log.warn('Invalid email format', { email });
      throw new Error("فرمت ایمیل نامعتبر است");
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      log.warn('Invalid phone format', { phone });
      throw new Error("فرمت شماره تلفن نامعتبر است");
    }

    // Validate password (required for email, optional for phone)
    if (password && !validatePassword(password)) {
      log.warn('Invalid password length', { email, phone });
      throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    // Check if user already exists
    const exists = await checkUserExists({ email, phone });
    if (exists) {
      log.warn('User already exists', { email, phone });
      throw new Error("کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است");
    }

    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    const supabase = await createClient();

    // Create user with retry logic for UID conflicts (race condition handling)
    let user;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Generate next UID
        const uid = await generateNextUID();

        // Attempt to create user
        const now = new Date().toISOString();
        const { data: createdUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: randomUUID(),
            uid,
            email: email || null,
            phone: phone || null,
            password: hashedPassword,
            name,
            role: "USER",
            isVerified: !!phone, // Phone users are verified via OTP
            updatedAt: now,
          })
          .select()
          .single();

        if (createError) {
          // Check if error is due to unique constraint violation on UID
          if (createError.code === '23505' && createError.message?.includes('uid')) {
            // UID conflict - retry with new UID
            retries++;
            log.warn('UID conflict detected, retrying', { retries, email, phone });

            if (retries >= maxRetries) {
              log.error('Max retries reached for UID generation', { email, phone });
              throw new Error('خطا در ایجاد شناسه کاربری. لطفا دوباره تلاش کنید');
            }

            // Wait a bit before retrying to reduce collision probability
            await new Promise(resolve => setTimeout(resolve, 100 * retries));
            continue;
          }

          // Other error - throw
          throw createError;
        }

        user = createdUser;
        // Success - break out of retry loop
        break;
      } catch (error) {
        // If it's not a UID conflict error, rethrow
        if (retries >= maxRetries || !(error instanceof Error && error.message?.includes('uid'))) {
          throw error;
        }
      }
    }

    if (!user) {
      throw new Error('خطا در ایجاد کاربر');
    }

    log.info('User created successfully', {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    // Clean up OTP records for this identifier
    // This prevents rate limiting issues when user tries to use OTP again
    const identifier = phone || email;
    if (identifier) {
      try {
        const { count, error: deleteError } = await supabase
          .from('otp_verifications')
          .delete({ count: 'exact' })
          .eq('identifier', identifier);

        if (!deleteError && count && count > 0) {
          log.info('Cleaned up OTP records after user creation', {
            userId: user.id,
            identifier,
            count,
          });
        }
      } catch (error) {
        log.error('Failed to clean up OTP records during user creation', {
          userId: user.id,
          identifier,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail user creation if OTP cleanup fails
      }
    }

    // Link any orphaned guest transactions with this phone number
    if (phone) {
      try {
        const linkedCount = await linkOrphanedTransactions(user.id, phone);
        if (linkedCount > 0) {
          log.info('Linked orphaned transactions to new user', {
            userId: user.id,
            phone,
            count: linkedCount,
          });
        }
      } catch (error) {
        log.error('Failed to link orphaned transactions during user creation', {
          userId: user.id,
          phone,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail user creation if linking fails
      }
    }

    // Create first-time promo code for new user
    try {
      await createFirstTimePromoCode(user.id);
    } catch (error) {
      log.error("Failed to create promo code", {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail user creation if promo code fails
    }

    // Return user without password - convert dates to Date objects
    return {
      id: user.id,
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: new Date(user.createdAt),
      updatedAt: new Date(user.updatedAt),
    };
  } catch (error) {
    log.error('Failed to create user', {
      email,
      phone,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<UserInfo | null> {
  return queryUser({ id: userId });
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserInfo | null> {
  return queryUser({ email });
}

/**
 * Get user by phone
 */
export async function getUserByPhone(phone: string): Promise<UserInfo | null> {
  return queryUser({ phone });
}

/**
 * Get user by identifier (email or phone)
 */
export async function getUserByIdentifier(identifier: string): Promise<UserInfo | null> {
  const type = detectIdentifierType(identifier);

  if (type === 'email') {
    return getUserByEmail(identifier);
  } else if (type === 'phone') {
    return getUserByPhone(identifier);
  }

  return null;
}

/**
 * Update user's shipping information
 */
export async function updateUserShippingInfo(userId: string, data: {
  shippingAddress: string;
  postalCode?: string;
}): Promise<void> {
  log.info('Updating user shipping info', { userId });

  try {
    const supabase = await createClient();

    const { error } = await supabase
      .from('users')
      .update({
        shippingAddress: data.shippingAddress,
        postalCode: data.postalCode,
      })
      .eq('id', userId);

    if (error) {
      log.error('Failed to update user shipping info', { userId, error });
      // Don't throw error - this is a non-critical update
      return;
    }

    log.info('User shipping info updated successfully', { userId });
  } catch (error) {
    log.error('Failed to update user shipping info', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw error - this is a non-critical update
  }
}

/**
 * Update user profile information
 */
export async function updateUserProfile(userId: string, data: {
  name?: string;
  email?: string;
  phone?: string;
  shippingAddress?: string;
  postalCode?: string;
}): Promise<UserInfo> {
  log.info('Updating user profile', { userId, fields: Object.keys(data) });

  try {
    // Validate email uniqueness
    await validateEmailUniqueness(data.email, userId);

    // Validate phone uniqueness
    await validatePhoneUniqueness(data.phone, userId);

    const supabase = await createClient();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.shippingAddress !== undefined) updateData.shippingAddress = data.shippingAddress;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, uid, email, phone, name, role, isVerified, shippingAddress, postalCode, createdAt, updatedAt')
      .single();

    if (error || !updatedUser) {
      log.error('Failed to update user profile', { userId, error });
      throw new Error('خطا در بروزرسانی پروفایل کاربر');
    }

    log.info('User profile updated successfully', { userId });

    // Convert dates
    return {
      ...updatedUser,
      createdAt: new Date(updatedUser.createdAt),
      updatedAt: new Date(updatedUser.updatedAt),
    };
  } catch (error) {
    log.error('Failed to update user profile', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Change user password
 * SECURITY: Always requires current password verification if user has a password
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  log.info('Changing user password', { userId });

  try {
    // Verify current password (security check)
    await verifyCurrentPassword(userId, currentPassword);

    // Update password
    await updatePassword(userId, newPassword);

    log.info('User password changed successfully', { userId });
  } catch (error) {
    log.error('Failed to change user password', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Reset password via OTP verification (for users who don't know their current password)
 * This is for users who registered via OTP checkout with auto-generated passwords
 */
export async function resetPasswordWithOTP(
  userId: string,
  newPassword: string
): Promise<void> {
  log.info('Resetting password via OTP', { userId });

  try {
    // Verify user exists
    const user = await getUserWithPassword(userId);
    if (!user) {
      log.warn('User not found', { userId });
      throw new Error("کاربر یافت نشد");
    }

    // Update password (validation happens inside)
    await updatePassword(userId, newPassword);

    log.info('Password reset successfully via OTP', { userId });
  } catch (error) {
    log.error('Failed to reset password', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Set password for OTP-only users
 */
export async function setUserPassword(userId: string, newPassword: string): Promise<void> {
  log.info('Setting user password', { userId });

  try {
    // Ensure user doesn't already have a password
    await ensureNoPassword(userId);

    // Update password (validation happens inside)
    await updatePassword(userId, newPassword);

    log.info('User password set successfully', { userId });
  } catch (error) {
    log.error('Failed to set user password', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Link orphaned guest transactions to a user account
 * This is called when a user registers/logs in with OTP to ensure
 * any previous guest transactions with their phone are linked to their account
 */
export async function linkOrphanedTransactions(userId: string, phone: string): Promise<number> {
  log.info('Linking orphaned guest transactions to user', { userId, phone });

  try {
    const supabase = await createClient();

    // Find all guest transactions with this phone that don't have a userId
    const { data: orphanedTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, transactionCode')
      .eq('phone', phone)
      .is('userId', null)
      .eq('isGuest', true);

    if (fetchError) {
      log.error('Failed to fetch orphaned transactions', { userId, phone, error: fetchError });
      return 0;
    }

    if (!orphanedTransactions || orphanedTransactions.length === 0) {
      log.info('No orphaned transactions found for user', { userId, phone });
      return 0;
    }

    // Update all orphaned transactions to link them to the user
    // Keep isGuest=true to indicate these were originally guest transactions
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ userId })
      .eq('phone', phone)
      .is('userId', null)
      .eq('isGuest', true);

    if (updateError) {
      log.error('Failed to update orphaned transactions', { userId, phone, error: updateError });
      return 0;
    }

    log.info('Orphaned transactions linked successfully', {
      userId,
      phone,
      count: orphanedTransactions.length,
      transactionCodes: orphanedTransactions.map(t => t.transactionCode),
    });

    return orphanedTransactions.length;
  } catch (error) {
    log.error('Failed to link orphaned transactions', {
      userId,
      phone,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - this is a best-effort operation
    return 0;
  }
}

/**
 * Get user's transaction history with details
 */
export async function getUserTransactions(userId: string, options?: {
  limit?: number;
  offset?: number;
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
}) {
  log.info('Fetching user transactions', { userId, options });

  try {
    const { limit = 10, offset = 0, status } = options || {};

    const supabase = await createClient();

    // Build query for count
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    // Build query for data with relations
    let dataQuery = supabase
      .from('transactions')
      .select(`
        *,
        items:transaction_items(
          *,
          product:products(
            id,
            name,
            price,
            media:product_media(url, alt, type, order)
          ),
          variant:product_variants(
            id,
            name,
            color,
            size,
            material
          )
        ),
        invoice:invoices(
          invoiceNumber,
          generatedAt,
          pdfUrl
        )
      `)
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      dataQuery = dataQuery.eq('status', status);
    }

    const [{ count }, { data: transactions, error }] = await Promise.all([
      countQuery,
      dataQuery,
    ]);

    if (error) {
      log.error('Failed to fetch user transactions', { userId, error });
      throw new Error('خطا در دریافت تراکنش‌های کاربر');
    }

    // Process transactions to include only first image for each product
    const processedTransactions = (transactions || []).map(transaction => {
      // Supabase returns invoice as an array due to the join, get first element
      const invoiceData = Array.isArray(transaction.invoice) ? transaction.invoice[0] : transaction.invoice;

      return {
        ...transaction,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
        items: transaction.items?.map(item => ({
          ...item,
          product: item.product ? {
            ...item.product,
            media: item.product.media
              ?.filter((m: { type: string }) => m.type === 'IMAGE')
              .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
              .slice(0, 1) || []
          } : null
        })) || [],
        invoice: invoiceData ? {
          ...invoiceData,
          generatedAt: new Date(invoiceData.generatedAt),
        } : null,
      };
    });

    const total = count || 0;

    log.info('User transactions fetched successfully', {
      userId,
      count: processedTransactions.length,
      total,
    });

    return {
      transactions: processedTransactions,
      total,
      hasMore: offset + processedTransactions.length < total,
    };
  } catch (error) {
    log.error('Failed to fetch user transactions', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
