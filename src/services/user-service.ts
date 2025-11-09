import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { createFirstTimePromoCode } from "./promo-service";

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
}) {
  const { email, password, name } = data;

  // Validate email
  if (!validateEmail(email)) {
    throw new Error("فرمت ایمیل نامعتبر است");
  }

  // Validate password
  if (!validatePassword(password)) {
    throw new Error("رمز عبور باید حداقل ۸ کاراکتر باشد");
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
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

  // Create first-time promo code for new user
  try {
    await createFirstTimePromoCode(user.id);
  } catch (error) {
    console.error("Failed to create promo code:", error);
    // Don't fail user creation if promo code fails
  }

  // Return user without password
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string) {
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
export async function getUserByEmail(email: string) {
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
