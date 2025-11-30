import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { log } from "@/lib/logger";
import { detectIdentifierType } from "./user-service";

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
}

/**
 * Authenticate user with identifier (email or phone) and password
 * @param identifier User email or phone number
 * @param password User password
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUser(
  identifier: string,
  password: string
): Promise<AuthUser> {
  if (!identifier || !password) {
    throw new Error("ایمیل/شماره تلفن و رمز عبور الزامی است");
  }

  try {
    const identifierType = detectIdentifierType(identifier);

    if (identifierType === 'invalid') {
      throw new Error("فرمت ایمیل یا شماره تلفن نامعتبر است");
    }

    // Find user by email or phone
    const user = await prisma.user.findFirst({
      where: identifierType === 'email'
        ? { email: identifier }
        : { phone: identifier }
    });

    if (!user) {
      log.warn("Login attempt with non-existent identifier", { identifier, identifierType });
      throw new Error("کاربری با این مشخصات یافت نشد");
    }

    // Check if user has a password (phone-only users might not have password)
    if (!user.password) {
      log.warn("Login attempt for user without password", { identifier, userId: user.id });
      throw new Error("برای این حساب کاربری از ورود با کد تایید استفاده کنید");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      log.warn("Login attempt with invalid password", { identifier, userId: user.id });
      throw new Error("رمز عبور اشتباه است");
    }

    log.info("User authenticated successfully", { identifier, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error("Authentication error", { identifier, error });
    throw new Error("خطا در احراز هویت");
  }
}

/**
 * Authenticate user by phone (OTP-verified, no password)
 * This is called after OTP verification
 * @param phone User phone number
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUserByPhone(phone: string): Promise<AuthUser> {
  if (!phone) {
    throw new Error("شماره تلفن الزامی است");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      log.warn("Login attempt with non-existent phone", { phone });
      throw new Error("کاربری با این شماره تلفن یافت نشد");
    }

    log.info("User authenticated successfully via phone", { phone, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error("Phone authentication error", { phone, error });
    throw new Error("خطا در احراز هویت");
  }
}

/**
 * Register a new user
 * @param name User name
 * @param email User email
 * @param password User password
 * @returns Created user data
 * @throws Error if registration fails
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  if (!name || !email || !password) {
    throw new Error("تمام فیلدها الزامی است");
  }

  try {
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
        name,
        email,
        password: hashedPassword,
        role: Role.USER, // Default role
      },
    });

    log.info("User registered successfully", { email, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error("Registration error", { email, error });
    throw new Error("خطا در ثبت‌نام");
  }
}
