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

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email || null,
        phone: phone || null,
        password: hashedPassword,
        name,
        role: "USER",
        isVerified: !!phone, // Phone users are verified via OTP
      },
    });

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
