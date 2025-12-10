import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { log } from "@/lib/logger";
import { detectIdentifierType, generateNextUID, linkOrphanedTransactions } from "./user-service";

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

    // Link any orphaned guest transactions with this phone
    try {
      const linkedCount = await linkOrphanedTransactions(user.id, phone);
      if (linkedCount > 0) {
        log.info('Linked orphaned transactions during phone login', {
          userId: user.id,
          phone,
          count: linkedCount,
        });
      }
    } catch (error) {
      log.error('Failed to link orphaned transactions during phone login', {
        userId: user.id,
        phone,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't fail authentication if linking fails
    }

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

    // Create user with retry logic for UID conflicts (race condition handling)
    let user;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        // Generate next UID using centralized function
        const uid = await generateNextUID();

        // Attempt to create user
        user = await prisma.user.create({
          data: {
            uid,
            name,
            email,
            password: hashedPassword,
            role: Role.USER, // Default role
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
          log.warn('UID conflict detected during registration, retrying', { retries, email });

          if (retries >= maxRetries) {
            log.error('Max retries reached for UID generation during registration', { email });
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
      throw new Error('خطا در ثبت‌نام');
    }

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
