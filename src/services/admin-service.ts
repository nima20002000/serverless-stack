import prisma from '@/lib/prisma/client';
import { Role, TransactionStatus, Prisma } from '@prisma/client';
import { PaginatedResponse, DeleteResult, DashboardStats } from '@/types/api';

/**
 * Admin Service
 * Handles admin-specific operations for managing users, transactions, and dashboard stats
 */

// User type without password
type UserWithCount = {
  id: string;
  uid: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: Role;
  createdAt: Date;
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
  role: Role;
};

// Transaction types for admin
type TransactionWithDetails = Prisma.TransactionGetPayload<{
  include: {
    user: { select: { id: true; uid: true; name: true; email: true; phone: true } };
    items: {
      include: {
        product: { select: { id: true; name: true } };
        variant: { select: { id: true; name: true; color: true; size: true; material: true } };
      }
    };
    invoice: true;
  };
}>;

type UserWithDetails = Omit<Prisma.UserGetPayload<{
  include: {
    transactions: { include: { items: { include: { product: true } } } };
    promoCodes: true;
  };
}>, 'password'>;

// ============ User Management ============

export async function getAllUsers(page: number = 1, limit: number = 20, search?: string, role?: string): Promise<PaginatedResponse<UserWithCount>> {
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

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
      orderBy: [
        { uid: 'desc' }, // Order by UID first (latest users have higher UIDs)
        { createdAt: 'desc' }, // Then by creation date
      ],
      select: {
        id: true,
        uid: true,
        email: true,
        phone: true,
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
    data: users,
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUserById(id: string): Promise<UserWithDetails> {
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

  // Don't return password - destructure to exclude it
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function updateUserRole(id: string, role: Role): Promise<UserBasic> {
  const user = await prisma.user.update({
    where: { id },
    data: { role },
    select: {
      id: true,
      uid: true,
      email: true,
      phone: true,
      name: true,
      role: true,
    },
  });

  return user;
}

export async function deleteUser(id: string): Promise<DeleteResult> {
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
): Promise<PaginatedResponse<TransactionWithDetails>> {
  const skip = (page - 1) * limit;

  const where: Prisma.TransactionWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { transactionCode: { contains: search, mode: 'insensitive' } },
      { user: { name: { contains: search, mode: 'insensitive' } } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
      { user: { phone: { contains: search, mode: 'insensitive' } } },
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
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
            uid: true,
            name: true,
            email: true,
            phone: true,
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
            variant: {
              select: {
                id: true,
                name: true,
                color: true,
                size: true,
                material: true,
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
    data: transactions,
    total,
    page,
    perPage: limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getTransactionById(id: string): Promise<TransactionWithDetails> {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      items: {
        include: {
          product: true,
          variant: {
            select: {
              id: true,
              name: true,
              color: true,
              size: true,
              material: true,
            },
          },
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

export async function getDashboardStats(): Promise<DashboardStats> {
  const thisMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  // Optimize: Run all independent queries in parallel
  const [
    totalUsers,
    totalProducts,
    totalTransactions,
    completedTransactions,
    newUsersThisMonth,
    activeProducts,
    pendingTransactions,
    failedTransactions,
    // Use database-level aggregation instead of fetching all records
    totalRevenueResult,
    monthlyRevenueResult,
    recentTransactions,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.product.count(),
    prisma.transaction.count(),
    prisma.transaction.count({ where: { status: 'COMPLETED' } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: thisMonth,
        },
      },
    }),
    prisma.product.count({
      where: { isActive: true },
    }),
    prisma.transaction.count({ where: { status: 'PENDING' } }),
    prisma.transaction.count({ where: { status: 'FAILED' } }),
    // Database-level aggregation for total revenue
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED' },
      _sum: {
        amount: true,
      },
    }),
    // Database-level aggregation for monthly revenue
    prisma.transaction.aggregate({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: thisMonth,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.transaction.findMany({
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
    }),
  ]);

  // Extract revenue sums (handle null case when no completed transactions exist)
  const totalRevenue = totalRevenueResult._sum.amount
    ? Number(totalRevenueResult._sum.amount)
    : 0;
  const monthlyRevenue = monthlyRevenueResult._sum.amount
    ? Number(monthlyRevenueResult._sum.amount)
    : 0;

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
    recentTransactions: recentTransactions.map(t => ({
      id: t.id,
      transactionCode: t.transactionCode,
      amount: Number(t.amount),
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      user: t.user ? {
        name: t.user.name,
        email: t.user.email || '',
      } : {
        name: t.fullName,
        email: t.email || 'مهمان',
      },
    })),
  };
}
