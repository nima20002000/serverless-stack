import { createClient } from "@/lib/supabase/server";

/**
 * User information type (without password)
 */
export type UserInfo = {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  isVerified: boolean;
  shippingAddress: string | null;
  postalCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Generic user query function
 * Reduces duplication in getUserById, getUserByEmail, getUserByPhone
 */
export async function queryUser(
  where: { id?: string; email?: string; phone?: string }
): Promise<UserInfo | null> {
  const supabase = await createClient();

  let query = supabase
    .from('users')
    .select('id, uid, email, phone, name, role, isVerified, shippingAddress, postalCode, createdAt, updatedAt')
    .limit(1);

  if (where.id) {
    query = query.eq('id', where.id);
  } else if (where.email) {
    query = query.eq('email', where.email);
  } else if (where.phone) {
    query = query.eq('phone', where.phone);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  // Convert string dates to Date objects for type compatibility
  return {
    ...data,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  };
}

/**
 * Check if a user exists with the given identifier
 * Used for uniqueness validation
 */
export async function checkUserExists(
  identifier: { email?: string; phone?: string },
  excludeUserId?: string
): Promise<boolean> {
  const supabase = await createClient();

  // Build OR conditions
  const conditions = [];

  if (identifier.email) {
    conditions.push(`email.eq.${identifier.email}`);
  }

  if (identifier.phone) {
    conditions.push(`phone.eq.${identifier.phone}`);
  }

  if (conditions.length === 0) {
    return false;
  }

  let query = supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .or(conditions.join(','));

  if (excludeUserId) {
    query = query.neq('id', excludeUserId);
  }

  const { count, error } = await query;

  if (error) {
    return false;
  }

  return (count ?? 0) > 0;
}
