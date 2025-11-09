import prisma from '@/lib/prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a unique transaction code
 * Format: KT-XXXXXX (e.g., KT-A1B2C3)
 */
export function generateTransactionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'KT-';

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return code;
}

/**
 * Create a new transaction with items
 */
export async function createTransaction(data: {
  userId: string;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  amount: number;
}) {
  const transactionCode = generateTransactionCode();

  // Create transaction with items in a single transaction
  const transaction = await prisma.$transaction(async (tx) => {
    // Create the transaction
    const newTransaction = await tx.transaction.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        status: 'PENDING',
        transactionCode,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    return newTransaction;
  });

  return transaction;
}

/**
 * Update transaction status and Zarinpal authority
 */
export async function updateTransactionStatus(
  id: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED',
  zarinpalAuthority?: string,
  refId?: number
) {
  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      status,
      zarinpalAuthority,
      ...(refId && { zarinpalRefId: refId.toString() }),
    },
    include: {
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  return transaction;
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(id: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
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

/**
 * Get transaction by transaction code
 */
export async function getTransactionByCode(code: string) {
  const transaction = await prisma.transaction.findUnique({
    where: { transactionCode: code },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
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

/**
 * Get transaction by Zarinpal authority
 */
export async function getTransactionByAuthority(authority: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { zarinpalAuthority: authority },
    include: {
      items: {
        include: {
          product: true,
        },
      },
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  if (!transaction) {
    throw new Error('تراکنش یافت نشد');
  }

  return transaction;
}

/**
 * Get all transactions for a user
 */
export async function getUserTransactions(userId: string, options?: {
  page?: number;
  perPage?: number;
}) {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const skip = (page - 1) * perPage;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId },
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        invoice: true,
      },
    }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  return {
    transactions,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * Reduce product stock after successful payment
 */
export async function reduceProductStock(transactionId: string) {
  const transaction = await getTransactionById(transactionId);

  if (transaction.status !== 'COMPLETED') {
    throw new Error('فقط برای تراکنش‌های موفق امکان کاهش موجودی وجود دارد');
  }

  // Update stock for each product in the transaction
  await prisma.$transaction(
    transaction.items.map((item) =>
      prisma.product.update({
        where: { id: item.productId },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      })
    )
  );
}

/**
 * Verify stock availability for cart items
 */
export async function verifyStockAvailability(
  items: Array<{ productId: string; quantity: number }>
): Promise<{ available: boolean; errors: string[] }> {
  const errors: string[] = [];

  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { stock: true, name: true, isActive: true },
    });

    if (!product) {
      errors.push(`محصول یافت نشد`);
      continue;
    }

    if (!product.isActive) {
      errors.push(`محصول ${product.name} غیرفعال است`);
      continue;
    }

    if (product.stock < item.quantity) {
      errors.push(
        `موجودی کافی برای ${product.name} وجود ندارد (موجودی: ${product.stock}، درخواستی: ${item.quantity})`
      );
    }
  }

  return {
    available: errors.length === 0,
    errors,
  };
}
