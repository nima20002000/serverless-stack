import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { log } from "@/lib/logger";

/**
 * Validate password strength
 * Minimum 8 characters
 */
export function validatePassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Fetch user with password field (for password operations)
 */
export async function getUserWithPassword(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      password: true,
    },
  });

  return user;
}

/**
 * Update user password in database
 */
export async function updatePassword(
  userId: string,
  newPassword: string
): Promise<void> {
  // Validate new password
  if (!validatePassword(newPassword)) {
    log.warn('Invalid password length', { userId });
    throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
  }

  // Hash password
  const hashedPassword = await hashPassword(newPassword);

  // Update in database
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });
}

/**
 * Verify current password before allowing change
 * Returns true if verification succeeds, throws error otherwise
 */
export async function verifyCurrentPassword(
  userId: string,
  currentPassword: string
): Promise<boolean> {
  const user = await getUserWithPassword(userId);

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

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      log.warn('Invalid current password', { userId });
      throw new Error("رمز عبور فعلی نادرست است");
    }
  }

  return true;
}

/**
 * Check if user already has a password
 * Throws error if password exists (for setPassword operation)
 */
export async function ensureNoPassword(userId: string): Promise<void> {
  const user = await getUserWithPassword(userId);

  if (!user) {
    log.warn('User not found', { userId });
    throw new Error("کاربر یافت نشد");
  }

  if (user.password) {
    log.warn('User already has a password', { userId });
    throw new Error("این کاربر قبلاً رمز عبور دارد. از گزینه تغییر رمز عبور استفاده کنید");
  }
}
