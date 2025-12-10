import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { createFirstTimePromoCode } from "./promo-service";
import { Role } from "@prisma/client";
import { log } from "@/lib/logger";

type UserWithoutPassword = Omit<{
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}, never>;

type UserInfo = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Minimum 8 characters
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate Iranian phone number
 * Format: 09xxxxxxxxx (11 digits starting with 09)
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^09\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Detect if input is email or phone
 */
export function detectIdentifierType(identifier: string): 'email' | 'phone' | 'invalid' {
  if (validateEmail(identifier)) return 'email';
  if (validatePhone(identifier)) return 'phone';
  return 'invalid';
}

/**
 * Generate next available UID for new user
 * Format: U-{6-digit sequential number}
 *
 * IMPORTANT: Orders by UID (not createdAt) to prevent race conditions
 * where users created at similar times could get duplicate UIDs
 */
export async function generateNextUID(): Promise<string> {
  // Get the user with the highest UID number (ordered DESC by uid field)
  const lastUser = await prisma.user.findFirst({
    orderBy: { uid: 'desc' },
    select: { uid: true },
  });

  let nextNumber = 1;

  if (lastUser?.uid) {
    // Extract number from UID (e.g., "U-000123" -> 123)
    const match = lastUser.uid.match(/^U-(\d+)$/);
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
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          email ? { email } : { id: undefined },
          phone ? { phone } : { id: undefined }
        ].filter(condition => condition.id === undefined ? Object.keys(condition).length > 0 : true)
      }
    });

    if (existingUser) {
      log.warn('User already exists', { email, phone });
      throw new Error("کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است");
    }

    // Hash password if provided
    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    // Create user with retry logic for UID conflicts (race condition handling)
    let user;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Generate next UID
        const uid = await generateNextUID();

        // Attempt to create user
        user = await prisma.user.create({
          data: {
            uid,
            email: email || null,
            phone: phone || null,
            password: hashedPassword,
            name,
            role: "USER",
            isVerified: !!phone, // Phone users are verified via OTP
          },
        });

        // Success - break out of retry loop
        break;
      } catch (error) {
        // Check if error is due to unique constraint violation on UID
        if (error instanceof Error &&
            'code' in error &&
            error.code === 'P2002' &&
            'meta' in error &&
            typeof error.meta === 'object' &&
            error.meta !== null &&
            'target' in error.meta &&
            Array.isArray(error.meta.target) &&
            error.meta.target.includes('uid')) {
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

        // Other error - rethrow
        throw error;
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

    // Return user without password - destructure to exclude it
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<UserInfo | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}

/**
 * Get user by phone
 */
export async function getUserByPhone(phone: string): Promise<UserInfo | null> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      email: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user as UserInfo | null;
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
    await prisma.user.update({
      where: { id: userId },
      data: {
        shippingAddress: data.shippingAddress,
        postalCode: data.postalCode,
      },
    });

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
    // Validate email if provided
    if (data.email !== undefined) {
      if (data.email && !validateEmail(data.email)) {
        log.warn('Invalid email format', { email: data.email });
        throw new Error("فرمت ایمیل نامعتبر است");
      }

      // Check if email already exists for another user
      if (data.email) {
        const existingUser = await prisma.user.findFirst({
          where: {
            email: data.email,
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          log.warn('Email already in use', { email: data.email });
          throw new Error("این ایمیل قبلاً استفاده شده است");
        }
      }
    }

    // Validate phone if provided
    if (data.phone !== undefined) {
      if (data.phone && !validatePhone(data.phone)) {
        log.warn('Invalid phone format', { phone: data.phone });
        throw new Error("فرمت شماره تلفن نامعتبر است");
      }

      // Check if phone already exists for another user
      if (data.phone) {
        const existingUser = await prisma.user.findFirst({
          where: {
            phone: data.phone,
            NOT: { id: userId }
          }
        });

        if (existingUser) {
          log.warn('Phone already in use', { phone: data.phone });
          throw new Error("این شماره تلفن قبلاً استفاده شده است");
        }
      }
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.shippingAddress !== undefined && { shippingAddress: data.shippingAddress }),
        ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info('User profile updated successfully', { userId });
    return updatedUser;
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
    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      log.warn('User not found', { userId });
      throw new Error("کاربر یافت نشد");
    }

    // SECURITY: If user has a password, current password is REQUIRED
    if (user.password) {
      if (!currentPassword) {
        log.warn('Current password required but not provided', { userId });
        throw new Error("رمز عبور فعلی الزامی است");
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidPassword) {
        log.warn('Invalid current password', { userId });
        throw new Error("رمز عبور فعلی نادرست است");
      }
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      log.warn('Invalid new password length', { userId });
      throw new Error("رمز عبور جدید باید حداقل ۸ کاراکتر باشد");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

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
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      log.warn('User not found', { userId });
      throw new Error("کاربر یافت نشد");
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      log.warn('Invalid password length', { userId });
      throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

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
    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user) {
      log.warn('User not found', { userId });
      throw new Error("کاربر یافت نشد");
    }

    // Check if user already has a password
    if (user.password) {
      log.warn('User already has a password', { userId });
      throw new Error("این کاربر قبلاً رمز عبور دارد. از گزینه تغییر رمز عبور استفاده کنید");
    }

    // Validate new password
    if (!validatePassword(newPassword)) {
      log.warn('Invalid password length', { userId });
      throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

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

    const where = {
      userId,
      ...(status && { status }),
    };

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                  media: {
                    where: { type: 'IMAGE' },
                    orderBy: { order: 'asc' },
                    take: 1,
                    select: {
                      url: true,
                      alt: true,
                    },
                  },
                },
              },
            },
          },
          invoice: {
            select: {
              invoiceNumber: true,
              generatedAt: true,
              pdfUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.transaction.count({ where }),
    ]);

    log.info('User transactions fetched successfully', {
      userId,
      count: transactions.length,
      total,
    });

    return {
      transactions,
      total,
      hasMore: offset + transactions.length < total,
    };
  } catch (error) {
    log.error('Failed to fetch user transactions', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
