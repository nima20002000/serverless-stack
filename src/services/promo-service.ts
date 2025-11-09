import { v4 as uuidv4 } from "uuid";
import prisma from "@/lib/prisma/client";

/**
 * Generate a unique promo code for first-time users
 * Code format: WELCOME-XXXX where X is random alphanumeric
 */
export async function generatePromoCode(): Promise<string> {
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `WELCOME-${randomPart}`;
}

/**
 * Create a promo code for a new user
 * Expires in 24 hours
 */
export async function createFirstTimePromoCode(userId: string) {
  const code = await generatePromoCode();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours from now

  const promoCode = await prisma.promoCode.create({
    data: {
      code,
      userId,
      expiresAt,
      isUsed: false,
    },
  });

  return promoCode;
}

/**
 * Get active promo code for a user
 */
export async function getActivePromoCode(userId: string) {
  const promoCode = await prisma.promoCode.findFirst({
    where: {
      userId,
      isUsed: false,
      expiresAt: {
        gte: new Date(), // Not expired
      },
    },
  });

  return promoCode;
}

/**
 * Mark promo code as used
 */
export async function usePromoCode(code: string) {
  const promoCode = await prisma.promoCode.findUnique({
    where: { code },
  });

  if (!promoCode) {
    throw new Error("کد تخفیف یافت نشد");
  }

  if (promoCode.isUsed) {
    throw new Error("این کد تخفیف قبلاً استفاده شده است");
  }

  if (promoCode.expiresAt < new Date()) {
    throw new Error("کد تخفیف منقضی شده است");
  }

  const updated = await prisma.promoCode.update({
    where: { code },
    data: { isUsed: true },
  });

  return updated;
}
