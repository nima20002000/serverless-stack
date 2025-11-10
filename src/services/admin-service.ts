import prisma from '@/lib/prisma/client';
import { Role, TransactionStatus } from '@prisma/client';

/**
 * Admin Service
 * Handles admin-specific operations for managing users, transactions, and dashboard stats
 */

// ============ User Management ============

export async function getAllUsers(page: number = 1, limit: number = 20, search?: string, role?: string) {
  const skip = (page - 1) * limit;

  const where: any = {};

  // Search filter
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' as const } },
      { email: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  // Role filter
  if (role && (role === 'USER' || role === 'ADMIN')) {
    where.role = role;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            transactions: true,
            promoCodes: true,
          },
        },
      },
    }),
    prisma.user.count({ where: Object.keys(where).length > 0 ? where : undefined }),
  ]);

  return {
    users,
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      },
      promoCodes: true,
    },
  });

  if (!user) {
    throw new Error('کاربر یافت نشد');
  }

  // Don't return password
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function updateUserRole(id: string, role: Role) {
  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  });

  return user;
}

export async function deleteUser(id: string) {
  // Check if user exists
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    throw new Error('کاربر یافت نشد');
  }

  // Don't allow deleting admin users (safety measure)
  if (user.role === 'ADMIN') {
    throw new Error('امکان حذف کاربران مدیر وجود ندارد');
  }

  // Delete user (cascade will handle related records)
  await prisma.user.delete({
    where: { id },
  });

  return { success: true };
}

// ============ Transaction Management ============

export async function getAllTransactions(
  page: number = 1,
  limit: number = 20,
  status?: TransactionStatus,
  search?: string,
  dateFrom?: string,
  dateTo?: string
) {
  const skip = (page - 1) * limit;

  const where: any = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { transactionCode: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      // Add one day to include the entire end date
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      where.createdAt.lt = endDate;
    }
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        invoice: true,
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTransactionById(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
      invoice: true,
    },
  });

  if (!transaction) {
    throw new Error('تراکنش یافت نشد');
  }

  return transaction;
}

// ============ Dashboard Statistics ============

export async function getDashboardStats() {
  // Get counts
  const [
    totalUsers,
    totalProducts,
    totalTransactions,
    pendingTransactions,
    completedTransactions,
    failedTransactions,
    activeProducts,
    newUsersThisMonth,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    prisma.transaction.count({ where: { status: 'FAILED' } }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ]);

  // Calculate revenue
  const completedTransactionsData = await prisma.transaction.findMany({
    where: { status: 'COMPLETED' },
    select: { amount: true, createdAt: true },
  });

  const totalRevenue = completedTransactionsData.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );

  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyRevenue = completedTransactionsData
    .filter((t) => t.createdAt >= thisMonth)
    .reduce((sum, t) => sum + Number(t.amount), 0);

  // Get recent transactions
  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    users: {
      total: totalUsers,
      new: newUsersThisMonth,
    },
    products: {
      total: totalProducts,
      active: activeProducts,
    },
    transactions: {
      total: totalTransactions,
      pending: pendingTransactions,
      completed: completedTransactions,
      failed: failedTransactions,
    },
    revenue: {
      total: totalRevenue,
      thisMonth: monthlyRevenue,
    },
    recentTransactions,
  };
}
