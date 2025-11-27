import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { createFirstTimePromoCode } from "./promo-service";
import { Role } from "@prisma/client";
import { log } from "@/lib/logger";

type UserWithoutPassword = Omit<{
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}, never>;

type UserInfo = {
  id: string;
  email: string;
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
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
}): Promise<UserWithoutPassword> {
  const { email, password, name } = data;

  log.info('Creating user', { email, name });

  try {
    // Validate email
    if (!validateEmail(email)) {
      log.warn('Invalid email format', { email });
      throw new Error("فرمت ایمیل نامعتبر است");
    }

    // Validate password
    if (!validatePassword(password)) {
      log.warn('Invalid password length', { email });
      throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      log.warn('User already exists', { email });
      throw new Error("کاربری با این ایمیل قبلاً ثبت‌نام کرده است");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: "USER",
      },
    });

    log.info('User created successfully', {
      userId: user.id,
      email: user.email,
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
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return user;
}
