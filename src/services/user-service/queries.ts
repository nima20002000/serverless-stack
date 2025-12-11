import prisma from "@/lib/prisma/client";
import { Role } from "@prisma/client";

/**
 * User information type (without password)
 */
export type UserInfo = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Standard user select object (excludes password)
 */
export const userSelectWithoutPassword = {
  id: true,
  email: true,
  phone: true,
  name: true,
  role: true,
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Generic user query function
 * Reduces duplication in getUserById, getUserByEmail, getUserByPhone
 */
export async function queryUser(
  where: { id?: string; email?: string; phone?: string }
): Promise<UserInfo | null> {
  const user = await prisma.user.findUnique({
    where: where as { id: string } | { email: string } | { phone: string },
    select: userSelectWithoutPassword,
  });

  return user;
}

/**
 * Check if a user exists with the given identifier
 * Used for uniqueness validation
 */
export async function checkUserExists(
  identifier: { email?: string; phone?: string },
  excludeUserId?: string
): Promise<boolean> {
  const conditions = [];

  if (identifier.email) {
    conditions.push({ email: identifier.email });
  }

  if (identifier.phone) {
    conditions.push({ phone: identifier.phone });
  }

  if (conditions.length === 0) {
    return false;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: conditions,
      ...(excludeUserId && { NOT: { id: excludeUserId } }),
    },
    select: { id: true },
  });

  return user !== null;
}
