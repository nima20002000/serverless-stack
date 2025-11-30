import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";
import { log } from "@/lib/logger";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

/**
 * Authenticate user with email and password
 * @param email User email
 * @param password User password
 * @returns Authenticated user data
 * @throws Error if authentication fails
 */
export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthUser> {
  if (!email || !password) {
    throw new Error("ایمیل و رمز عبور الزامی است");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      log.warn("Login attempt with non-existent email", { email });
      throw new Error("کاربری با این ایمیل یافت نشد");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      log.warn("Login attempt with invalid password", { email, userId: user.id });
      throw new Error("رمز عبور اشتباه است");
    }

    log.info("User authenticated successfully", { email, userId: user.id });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    log.error("Authentication error", { email, error });
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
