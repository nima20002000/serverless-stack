import { createClient } from '@/lib/supabase/server';
import { PaginatedResponse, DeleteResult, DashboardStats } from '@/types/api';
import { log } from '@/lib/logger';

/**
 * Admin Service (Supabase)
 * Handles admin-specific operations for managing users, transactions, and dashboard stats
 */

// User type without password
type UserWithCount = {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  _count: {
    transactions: number;
    promoCodes: number;
  };
};

type UserBasic = {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
};

// Transaction types for admin
type TransactionWithDetails = {
  id: string;
  userId: string | null;
  transactionCode: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  fullName: string;
  email: string | null;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  zarinpalAuthority: string | null;
  zarinpalRefId: string | null;
  paymentMethod: 'zarinpal' | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    uid: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    transactionId: string;
    productId: string;
    variantId: string | null;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
    } | null;
    variant: {
      id: string;
      name: string;
      color: string | null;
      size: string | null;
      material: string | null;
    } | null;
  }>;
  invoice: {
    id: string;
    transactionId: string;
    invoiceNumber: string;
    generatedAt: string;
  } | null;
};

type UserWithDetails = {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  updatedAt: string;
  transactions: Array<{
    id: string;
    transactionCode: string;
    amount: number;
    status: string;
    createdAt: string;
    items: Array<{
      id: string;
      quantity: number;
      price: number;
      product: {
        id: string;
        name: string;
      } | null;
    }>;
  }>;
  promoCodes: Array<{
    id: string;
    code: string;
    isUsed: boolean;
    expiresAt: string;
    createdAt: string;
  }>;
};

// ============ User Management ============

export async function getAllUsers(
  page: number = 1,
  limit: number = 20,
  search?: string,
  role?: string
): Promise<PaginatedResponse<UserWithCount>> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  try {
    // Build the base query
    let query = supabase
      .from('users')
      .select(
        `
        id,
        uid,
        email,
        phone,
        name,
        role,
        createdAt
      `,
        { count: 'exact' }
      );

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply role filter
    if (role && (role === 'USER' || role === 'ADMIN')) {
      query = query.eq('role', role);
    }

    // Apply ordering and pagination
    query = query
      .order('uid', { ascending: false }) // Order by UID first
      .order('createdAt', { ascending: false }) // Then by creation date
      .range(offset, offset + limit - 1);

    const { data: users, error, count } = await query;

    if (error) {
      log.error('Error fetching users', { error });
      throw new Error('خطا در دریافت کاربران');
    }

    // Get transaction and promo code counts for each user
    const usersWithCounts: UserWithCount[] = await Promise.all(
      (users || []).map(async (user) => {
        const [transactionCountResult, promoCodeCountResult] = await Promise.all([
          supabase
            .from('transactions')
            .select('id', { count: 'exact', head: true })
            .eq('userId', user.id),
          supabase
            .from('promo_codes')
            .select('id', { count: 'exact', head: true })
            .eq('userId', user.id),
        ]);

        return {
          ...user,
          _count: {
            transactions: transactionCountResult.count || 0,
            promoCodes: promoCodeCountResult.count || 0,
          },
        };
      })
    );

    const total = count || 0;

    return {
      data: usersWithCounts,
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    log.error('Error in getAllUsers', { error });
    throw error;
  }
}

export async function getUserById(id: string): Promise<UserWithDetails> {
  const supabase = await createClient();

  try {
    // Get user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, uid, email, phone, name, role, createdAt, updatedAt')
      .eq('id', id)
      .single();

    if (userError || !user) {
      log.error('User not found', { id, error: userError });
      throw new Error('کاربر یافت نشد');
    }

    // Get user's transactions with items and products
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(
        `
        id,
        transactionCode,
        amount,
        status,
        createdAt,
        items:transaction_items(
          id,
          quantity,
          price,
          product:products(id, name)
        )
      `
      )
      .eq('userId', id)
      .order('createdAt', { ascending: false })
      .limit(10);

    if (transactionsError) {
      log.error('Error fetching transactions', { error: transactionsError });
    }

    // Get user's promo codes
    const { data: promoCodes, error: promoError } = await supabase
      .from('promo_codes')
      .select('id, code, isUsed, expiresAt, createdAt')
      .eq('userId', id);

    if (promoError) {
      log.error('Error fetching promo codes', { error: promoError });
    }

    return {
      ...user,
      transactions: transactions || [],
      promoCodes: promoCodes || [],
    };
  } catch (error) {
    log.error('Error in getUserById', { id, error });
    throw error;
  }
}

export async function updateUserRole(id: string, role: 'USER' | 'ADMIN'): Promise<UserBasic> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select('id, uid, email, phone, name, role')
      .single();

    if (error || !data) {
      log.error('Error updating user role', { id, role, error });
      throw new Error('خطا در بروزرسانی نقش کاربر');
    }

    log.info('User role updated', { id, role });
    return data;
  } catch (error) {
    log.error('Error in updateUserRole', { id, role, error });
    throw error;
  }
}

export async function deleteUser(id: string): Promise<DeleteResult> {
  const supabase = await createClient();

  try {
    // Check if user exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (fetchError || !user) {
      throw new Error('کاربر یافت نشد');
    }

    // Don't allow deleting admin users (safety measure)
    if (user.role === 'ADMIN') {
      throw new Error('امکان حذف کاربران مدیر وجود ندارد');
    }

    // Delete user (cascade will handle related records)
    const { error: deleteError } = await supabase.from('users').delete().eq('id', id);

    if (deleteError) {
      log.error('Error deleting user', { id, error: deleteError });
      throw new Error('خطا در حذف کاربر');
    }

    log.info('User deleted', { id });
    return { success: true };
  } catch (error) {
    log.error('Error in deleteUser', { id, error });
    throw error;
  }
}

/**
 * Bulk delete users (only non-admin users)
 */
export async function bulkDeleteUsers(userIds: string[]): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    // First, get users to delete (only USER role, not ADMIN)
    const { data: usersToDelete, error: fetchError } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds)
      .eq('role', 'USER');

    if (fetchError) {
      log.error('Error fetching users for bulk delete', { error: fetchError });
      throw new Error('خطا در بررسی کاربران');
    }

    if (!usersToDelete || usersToDelete.length === 0) {
      return { count: 0 };
    }

    const idsToDelete = usersToDelete.map((u) => u.id);

    // Delete users (cascade will handle related records)
    const { error: deleteError, count } = await supabase
      .from('users')
      .delete({ count: 'exact' })
      .in('id', idsToDelete);

    if (deleteError) {
      log.error('Error in bulk delete users', { error: deleteError });
      throw new Error('خطا در حذف کاربران');
    }

    log.info('Users bulk deleted', { count });
    return { count: count || 0 };
  } catch (error) {
    log.error('Error in bulkDeleteUsers', { userIds, error });
    throw error;
  }
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(
  userIds: string[],
  updates: { role?: 'USER' | 'ADMIN' }
): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .in('id', userIds)
      .select('id');

    if (error) {
      log.error('Error in bulk update users', { error });
      throw new Error('خطا در بروزرسانی کاربران');
    }

    const count = data?.length || 0;
    log.info('Users bulk updated', { count, updates });
    return { count };
  } catch (error) {
    log.error('Error in bulkUpdateUsers', { userIds, updates, error });
    throw error;
  }
}

// ============ Transaction Management ============

export async function getAllTransactions(
  page: number = 1,
  limit: number = 20,
  status?: 'PENDING' | 'COMPLETED' | 'FAILED',
  search?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<PaginatedResponse<TransactionWithDetails>> {
  const supabase = await createClient();
  const offset = (page - 1) * limit;

  try {
    // Build the base query
    let query = supabase
      .from('transactions')
      .select(
        `
        *,
        user:users!userId(id, uid, name, email, phone),
        items:transaction_items(
          *,
          product:products(id, name),
          variant:product_variants(id, name, color, size, material)
        ),
        invoice:invoices(id, transactionId, invoiceNumber, generatedAt)
      `,
        { count: 'exact' }
      );

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply search filter
    if (search) {
      // For Supabase, we need to handle OR searches differently
      // We'll search in multiple fields
      query = query.or(
        `transactionCode.ilike.%${search}%,fullName.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`
      );
    }

    // Apply date range filter
    if (dateFrom) {
      query = query.gte('createdAt', new Date(dateFrom).toISOString());
    }
    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('createdAt', endDate.toISOString());
    }

    // Apply ordering and pagination
    query = query.order('createdAt', { ascending: false }).range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      log.error('Error fetching transactions', { error });
      throw new Error('خطا در دریافت تراکنش‌ها');
    }

    const total = count || 0;

    // Process transactions to normalize invoice array (Supabase returns it as array)
    const processedTransactions = (transactions || []).map((tx) => {
      const invoiceData = Array.isArray(tx.invoice) ? tx.invoice[0] : tx.invoice;
      return {
        ...tx,
        invoice: invoiceData || null,
      };
    });

    return {
      data: processedTransactions as unknown as TransactionWithDetails[],
      total,
      page,
      perPage: limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    log.error('Error in getAllTransactions', { error });
    throw error;
  }
}

export async function getTransactionById(id: string): Promise<TransactionWithDetails> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select(
        `
        *,
        user:users!userId(id, uid, name, email, phone),
        items:transaction_items(
          *,
          product:products(*),
          variant:product_variants(id, name, color, size, material)
        ),
        invoice:invoices(id, transactionId, invoiceNumber, generatedAt)
      `
      )
      .eq('id', id)
      .single();

    if (error || !data) {
      log.error('Transaction not found', { id, error });
      throw new Error('تراکنش یافت نشد');
    }

    // Supabase returns invoice as array, get first element
    const rawData = data as Record<string, unknown>;
    const invoiceData = Array.isArray(rawData.invoice)
      ? rawData.invoice[0]
      : rawData.invoice;

    return {
      ...data,
      invoice: invoiceData || null,
    } as unknown as TransactionWithDetails;
  } catch (error) {
    log.error('Error in getTransactionById', { id, error });
    throw error;
  }
}

// ============ Dashboard Statistics ============

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await createClient();

  try {
    const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const thisMonthISO = thisMonth.toISOString();

    // Run all independent queries in parallel
    const [
      totalUsersResult,
      totalProductsResult,
      totalTransactionsResult,
      completedTransactionsResult,
      newUsersThisMonthResult,
      activeProductsResult,
      pendingTransactionsResult,
      failedTransactionsResult,
      totalRevenueResult,
      monthlyRevenueResult,
      recentTransactionsResult,
    ] = await Promise.all([
      // Total users count
      supabase.from('users').select('id', { count: 'exact', head: true }),

      // Total products count
      supabase.from('products').select('id', { count: 'exact', head: true }),

      // Total transactions count
      supabase.from('transactions').select('id', { count: 'exact', head: true }),

      // Completed transactions count
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'COMPLETED'),

      // New users this month
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .gte('createdAt', thisMonthISO),

      // Active products count
      supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('isActive', true),

      // Pending transactions count
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'PENDING'),

      // Failed transactions count
      supabase
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'FAILED'),

      // Total revenue (sum of completed transactions)
      supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'COMPLETED'),

      // Monthly revenue (sum of completed transactions this month)
      supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'COMPLETED')
        .gte('createdAt', thisMonthISO),

      // Recent transactions
      supabase
        .from('transactions')
        .select(
          `
          id,
          transactionCode,
          amount,
          status,
          createdAt,
          fullName,
          email,
          user:users!userId(name, email)
        `
        )
        .order('createdAt', { ascending: false })
        .limit(5),
    ]);

    // Calculate total revenue
    const totalRevenue =
      totalRevenueResult.data?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    // Calculate monthly revenue
    const monthlyRevenue =
      monthlyRevenueResult.data?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

    return {
      users: {
        total: totalUsersResult.count || 0,
        new: newUsersThisMonthResult.count || 0,
      },
      products: {
        total: totalProductsResult.count || 0,
        active: activeProductsResult.count || 0,
      },
      transactions: {
        total: totalTransactionsResult.count || 0,
        pending: pendingTransactionsResult.count || 0,
        completed: completedTransactionsResult.count || 0,
        failed: failedTransactionsResult.count || 0,
      },
      revenue: {
        total: totalRevenue,
        thisMonth: monthlyRevenue,
      },
      recentTransactions:
        recentTransactionsResult.data?.map((t) => {
          const userName: string = t.user
            ? (t.user as { name: string | null; email: string | null }).name || 'بدون نام'
            : (t.fullName || 'مهمان');
          const userEmail: string = t.user
            ? (t.user as { name: string | null; email: string | null }).email || ''
            : (t.email || 'مهمان');

          return {
            id: t.id,
            transactionCode: t.transactionCode,
            amount: Number(t.amount),
            status: t.status as 'PENDING' | 'COMPLETED' | 'FAILED',
            createdAt: t.createdAt,
            user: {
              name: userName,
              email: userEmail,
            },
          };
        }) || [],
    };
  } catch (error) {
    log.error('Error in getDashboardStats', { error });
    throw new Error('خطا در دریافت آمار داشبورد');
  }
}
