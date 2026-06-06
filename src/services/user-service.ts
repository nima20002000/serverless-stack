import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { randomUUID } from 'crypto';
import { createFirstTimePromoCode } from './promo-service';
import { log } from '@/lib/logger';
import {
  getPhoneLookupCandidates,
  normalizePhoneNumber,
} from '@/lib/utils/text';
import {
  normalizeShippingAddress,
  type ShippingAddressFields,
} from '@/lib/shipping-address';

// Import utilities from modular structure
import {
  queryUser,
  checkUserExists,
  type UserInfo,
} from './user-service/queries';
import {
  validatePassword,
  hashPassword,
  updatePassword,
  verifyCurrentPassword,
  ensureNoPassword,
  getUserWithPassword,
} from './user-service/password';
import {
  validateEmail,
  validatePhone,
  detectIdentifierType,
  validateEmailUniqueness,
  validatePhoneUniqueness,
} from './user-service/validation';

type UserWithoutPassword = Omit<
  {
    id: string;
    uid: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: 'USER' | 'ADMIN';
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
  },
  never
>;

// Re-export for backward compatibility
export type { UserInfo };
export { validateEmail, validatePassword, validatePhone, detectIdentifierType };

function cleanAddressPart(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

/**
 * Generate next available UID for new user
 * Format: U-{6-digit sequential number}
 *
 * IMPORTANT: Orders by UID (not createdAt) to prevent race conditions
 * where users created at similar times could get duplicate UIDs
 */
export async function generateNextUID(): Promise<string> {
  const supabase = createClient();

  // Get the user with the highest UID number (ordered DESC by uid field)
  const { data, error } = await supabase
    .from('users')
    .select('uid')
    .order('uid', { ascending: false })
    .limit(1)
    .maybeSingle(); // Use maybeSingle() instead of single() to handle 0 rows gracefully

  let nextNumber = 1;

  if (!error && data?.uid) {
    // Extract number from UID (e.g., "U-000123" -> 123)
    // Only match exactly 6-digit UIDs to avoid timestamp-based UIDs
    const match = data.uid.match(/^U-(\d{6})$/);
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
  const { email, password, name } = data;
  const rawPhone = data.phone;
  const phone = rawPhone ? normalizePhoneNumber(rawPhone) : rawPhone;

  log.info('Creating user', { email, phone, name });

  try {
    // Validate at least one identifier
    if (!email && !phone) {
      throw new Error('Email or phone number is required.');
    }

    // Validate email if provided
    if (email && !validateEmail(email)) {
      log.warn('Invalid email format', { email });
      throw new Error('Invalid email format.');
    }

    // Validate phone if provided
    if (phone && !validatePhone(phone)) {
      log.warn('Invalid phone format', { phone });
      throw new Error('Invalid phone number format.');
    }

    // Validate password (required for email, optional for phone)
    if (password && !validatePassword(password)) {
      log.warn('Invalid password length', { email, phone });
      throw new Error('Password must be at least 8 characters.');
    }

    // Check if user already exists
    const exists = await checkUserExists({ email, phone });
    if (exists) {
      log.warn('User already exists', { email, phone });
      throw new Error(
        'An account with this email or phone number already exists.'
      );
    }

    // Hash password if provided
    const hashedPassword = password ? await hashPassword(password) : null;

    const supabase = createClient();

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
            role: 'USER',
            isVerified: true, // All users are verified via OTP (email or phone)
            updatedAt: now,
          })
          .select()
          .single();

        if (createError) {
          // Check if error is due to unique constraint violation on UID
          if (
            createError.code === '23505' &&
            createError.message?.includes('uid')
          ) {
            // UID conflict - retry with new UID
            retries++;
            log.warn('UID conflict detected, retrying', {
              retries,
              email,
              phone,
            });

            if (retries >= maxRetries) {
              log.error('Max retries reached for UID generation', {
                email,
                phone,
              });
              throw new Error('Unable to create user ID.');
            }

            // Wait a bit before retrying to reduce collision probability
            await new Promise((resolve) => setTimeout(resolve, 100 * retries));
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
        if (
          retries >= maxRetries ||
          !(error instanceof Error && error.message?.includes('uid'))
        ) {
          throw error;
        }
      }
    }

    if (!user) {
      throw new Error('Unable to create user.');
    }

    log.info('User created successfully', {
      userId: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    // Link any orphaned guest transactions with this phone number
    if (phone) {
      try {
        const linkedCount = await linkOrphanedTransactions(
          user.id,
          rawPhone ?? phone
        );
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
      log.error('Failed to create promo code', {
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
  for (const lookupPhone of getPhoneLookupCandidates(phone)) {
    const user = await queryUser({ phone: lookupPhone });
    if (user) return user;
  }

  return null;
}

/**
 * Get user by identifier (email or phone)
 */
export async function getUserByIdentifier(
  identifier: string
): Promise<UserInfo | null> {
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
export async function updateUserShippingInfo(
  userId: string,
  data: ShippingAddressFields
): Promise<void> {
  log.info('Updating user shipping info', { userId });

  try {
    const supabase = createClient();
    const address = normalizeShippingAddress(data);

    const { error } = await supabase
      .from('users')
      .update({
        shippingAddress: address.shippingAddress,
        shippingCountry: address.shippingCountry || null,
        shippingRegion: address.shippingRegion || null,
        shippingCity: address.shippingCity || null,
        shippingAddressLine1: address.shippingAddressLine1 || null,
        shippingAddressLine2: address.shippingAddressLine2 || null,
        postalCode: address.postalCode || null,
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
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    shippingAddress?: string;
    shippingCountry?: string;
    shippingRegion?: string;
    shippingCity?: string;
    shippingAddressLine1?: string;
    shippingAddressLine2?: string;
    postalCode?: string;
  }
): Promise<UserInfo> {
  log.info('Updating user profile', { userId, fields: Object.keys(data) });

  try {
    // Validate email uniqueness
    await validateEmailUniqueness(data.email, userId);

    const phone = data.phone ? normalizePhoneNumber(data.phone) : data.phone;

    // Validate phone uniqueness
    await validatePhoneUniqueness(phone, userId);

    const supabase = createClient();

    // Build update object
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email || null;
    if (data.phone !== undefined) updateData.phone = phone || null;
    if (
      data.shippingAddress !== undefined ||
      data.shippingCountry !== undefined ||
      data.shippingRegion !== undefined ||
      data.shippingCity !== undefined ||
      data.shippingAddressLine1 !== undefined ||
      data.shippingAddressLine2 !== undefined ||
      data.postalCode !== undefined
    ) {
      const existingUser = await queryUser({ id: userId });
      const existingLegacyAddress = cleanAddressPart(
        existingUser?.shippingAddress
      );
      const explicitLine1 = cleanAddressPart(data.shippingAddressLine1);
      const hasExplicitStructuredAddressField =
        cleanAddressPart(data.shippingCountry) !== '' ||
        cleanAddressPart(data.shippingRegion) !== '' ||
        cleanAddressPart(data.shippingCity) !== '' ||
        cleanAddressPart(data.shippingAddressLine2) !== '' ||
        (explicitLine1 !== '' && explicitLine1 !== existingLegacyAddress);
      const mergedAddress: ShippingAddressFields = {
        shippingAddress: existingUser?.shippingAddress ?? undefined,
        shippingCountry: existingUser?.shippingCountry ?? undefined,
        shippingRegion: existingUser?.shippingRegion ?? undefined,
        shippingCity: existingUser?.shippingCity ?? undefined,
        shippingAddressLine1: existingUser?.shippingAddressLine1 ?? undefined,
        shippingAddressLine2: existingUser?.shippingAddressLine2 ?? undefined,
        postalCode: existingUser?.postalCode ?? undefined,
      };

      if (data.shippingAddress !== undefined) {
        mergedAddress.shippingAddress = data.shippingAddress;
      }
      if (data.shippingCountry !== undefined) {
        mergedAddress.shippingCountry = data.shippingCountry;
      }
      if (data.shippingRegion !== undefined) {
        mergedAddress.shippingRegion = data.shippingRegion;
      }
      if (data.shippingCity !== undefined) {
        mergedAddress.shippingCity = data.shippingCity;
      }
      if (data.shippingAddressLine1 !== undefined) {
        mergedAddress.shippingAddressLine1 = data.shippingAddressLine1;
      }
      if (data.shippingAddressLine2 !== undefined) {
        mergedAddress.shippingAddressLine2 = data.shippingAddressLine2;
      }
      if (data.postalCode !== undefined) {
        mergedAddress.postalCode = data.postalCode;
      }

      const hasStoredStructuredAddress = Boolean(
        existingUser?.shippingCountry ||
        existingUser?.shippingRegion ||
        existingUser?.shippingCity ||
        existingUser?.shippingAddressLine2
      );
      if (!hasExplicitStructuredAddressField && !hasStoredStructuredAddress) {
        mergedAddress.shippingAddressLine1 = undefined;
      }

      const address = normalizeShippingAddress(mergedAddress);
      updateData.shippingAddress = address.shippingAddress || null;
      updateData.shippingCountry = address.shippingCountry || null;
      updateData.shippingRegion = address.shippingRegion || null;
      updateData.shippingCity = address.shippingCity || null;
      updateData.shippingAddressLine1 = address.shippingAddressLine1 || null;
      updateData.shippingAddressLine2 = address.shippingAddressLine2 || null;
      updateData.postalCode = address.postalCode || null;
    }

    // Update user
    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select(
        'id, uid, email, phone, name, role, isVerified, shippingAddress, shippingCountry, shippingRegion, shippingCity, shippingAddressLine1, shippingAddressLine2, postalCode, createdAt, updatedAt'
      )
      .single();

    if (error || !updatedUser) {
      log.error('Failed to update user profile', { userId, error });
      throw new Error('Unable to update profile.');
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
      throw new Error('User not found.');
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
export async function setUserPassword(
  userId: string,
  newPassword: string
): Promise<void> {
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
export async function linkOrphanedTransactions(
  userId: string,
  phone: string
): Promise<number> {
  const normalizedPhone = normalizePhoneNumber(phone);
  const phoneLookupCandidates = getPhoneLookupCandidates(phone);

  log.info('Linking orphaned guest transactions to user', {
    userId,
    phone: normalizedPhone,
  });

  try {
    const supabase = createClient();

    // Find all guest transactions with this phone that don't have a userId
    const { data: orphanedTransactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, transactionCode')
      .in('phone', phoneLookupCandidates)
      .is('userId', null)
      .eq('isGuest', true);

    if (fetchError) {
      log.error('Failed to fetch orphaned transactions', {
        userId,
        phone: normalizedPhone,
        error: fetchError,
      });
      return 0;
    }

    if (!orphanedTransactions || orphanedTransactions.length === 0) {
      log.info('No orphaned transactions found for user', {
        userId,
        phone: normalizedPhone,
      });
      return 0;
    }

    // Update all orphaned transactions to link them to the user
    // Keep isGuest=true to indicate these were originally guest transactions
    const { error: updateError } = await supabase
      .from('transactions')
      .update({ userId })
      .in('phone', phoneLookupCandidates)
      .is('userId', null)
      .eq('isGuest', true);

    if (updateError) {
      log.error('Failed to update orphaned transactions', {
        userId,
        phone: normalizedPhone,
        error: updateError,
      });
      return 0;
    }

    log.info('Orphaned transactions linked successfully', {
      userId,
      phone: normalizedPhone,
      count: orphanedTransactions.length,
      transactionCodes: orphanedTransactions.map((t) => t.transactionCode),
    });

    return orphanedTransactions.length;
  } catch (error) {
    log.error('Failed to link orphaned transactions', {
      userId,
      phone: normalizedPhone,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - this is a best-effort operation
    return 0;
  }
}

/**
 * Get user's transaction history with details
 * Also includes guest transactions that match the user's phone or email
 */
export async function getUserTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  }
) {
  log.info('Fetching user transactions', { userId, options });

  try {
    const { limit = 10, offset = 0, status } = options || {};

    const supabase = createClient();

    // First, get the user's phone and email to also fetch matching guest transactions
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('phone, email')
      .eq('id', userId)
      .single();

    if (userError) {
      log.error('Failed to fetch user for transactions query', {
        userId,
        error: userError,
      });
      throw new Error('Unable to load user');
    }

    // Build OR conditions for matching transactions:
    // 1. Transactions directly linked to user via userId
    // 2. Guest transactions (userId is null) that match user's phone
    // 3. Guest transactions (userId is null) that match user's email
    const orConditions: string[] = [`userId.eq.${userId}`];

    if (user?.phone) {
      // Match guest transactions by phone (userId is null AND phone matches)
      orConditions.push(`and(userId.is.null,phone.eq.${user.phone})`);
    }

    if (user?.email) {
      // Match guest transactions by email (userId is null AND email matches)
      orConditions.push(`and(userId.is.null,email.eq.${user.email})`);
    }

    const orFilter = orConditions.join(',');

    // Build query for count
    let countQuery = supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .or(orFilter);

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    // Build query for data with relations
    let dataQuery = supabase
      .from('transactions')
      .select(
        `
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
      `
      )
      .or(orFilter)
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
      throw new Error('Unable to load user transactions');
    }

    // Process transactions to include only first image for each product
    const processedTransactions = (transactions || []).map((transaction) => {
      // Supabase returns invoice as an array due to the join, get first element
      const invoiceData = Array.isArray(transaction.invoice)
        ? transaction.invoice[0]
        : transaction.invoice;

      return {
        ...transaction,
        createdAt: new Date(transaction.createdAt),
        updatedAt: new Date(transaction.updatedAt),
        items:
          transaction.items?.map((item) => ({
            ...item,
            product: item.product
              ? {
                  ...item.product,
                  media:
                    item.product.media
                      ?.filter((m: { type: string }) => m.type === 'IMAGE')
                      .sort(
                        (a: { order: number }, b: { order: number }) =>
                          a.order - b.order
                      )
                      .slice(0, 1) || [],
                }
              : null,
          })) || [],
        invoice: invoiceData
          ? {
              ...invoiceData,
              generatedAt: new Date(invoiceData.generatedAt),
            }
          : null,
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
