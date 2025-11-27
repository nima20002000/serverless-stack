import prisma from '@/lib/prisma/client';
import { Prisma } from '@prisma/client';
import { PaginatedResponse, StockVerificationResult } from '@/types/api';
import { log } from '@/lib/logger';

// Transaction types
type TransactionWithItems = Prisma.TransactionGetPayload<{
  include: {
    items: { include: { product: true } };
    user: { select: { id: true; email: true; name: true } };
  };
}>;

type TransactionWithFull = Prisma.TransactionGetPayload<{
  include: {
    items: { include: { product: true } };
    user: { select: { id: true; email: true; name: true } };
    invoice: true;
  };
}>;

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
}): Promise<TransactionWithItems> {
  const transactionCode = generateTransactionCode();

  log.info('Creating transaction', {
    userId: data.userId,
    amount: data.amount,
    itemCount: data.items.length,
    transactionCode,
  });

  try {
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

    log.info('Transaction created successfully', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: transaction.amount,
    });

    return transaction;
  } catch (error) {
    log.error('Failed to create transaction', {
      userId: data.userId,
      amount: data.amount,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Update transaction status and Zarinpal authority
 */
export async function updateTransactionStatus(
  id: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED',
  zarinpalAuthority?: string,
  refId?: number
): Promise<Prisma.TransactionGetPayload<{ include: { items: { include: { product: true } } } }>> {
  log.info('Updating transaction status', {
    transactionId: id,
    status,
    refId,
  });

  try {
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

    log.info('Transaction status updated successfully', {
      transactionId: id,
      oldStatus: 'PENDING',
      newStatus: status,
    });

    return transaction;
  } catch (error) {
    log.error('Failed to update transaction status', {
      transactionId: id,
      status,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get transaction by ID
 */
export async function getTransactionById(id: string): Promise<TransactionWithFull> {
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
export async function getTransactionByCode(code: string): Promise<TransactionWithFull> {
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
export async function getTransactionByAuthority(authority: string): Promise<TransactionWithItems> {
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
}): Promise<PaginatedResponse<Prisma.TransactionGetPayload<{ include: { items: { include: { product: true } }; invoice: true } }>>> {
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
    data: transactions,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * Reduce product stock after successful payment
 */
export async function reduceProductStock(transactionId: string): Promise<void> {
  log.info('Reducing product stock for transaction', { transactionId });

  try {
    const transaction = await getTransactionById(transactionId);

    if (transaction.status !== 'COMPLETED') {
      log.warn('Cannot reduce stock for non-completed transaction', {
        transactionId,
        status: transaction.status,
      });
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

    log.info('Product stock reduced successfully', {
      transactionId,
      itemsUpdated: transaction.items.length,
    });
  } catch (error) {
    log.error('Failed to reduce product stock', {
      transactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Verify stock availability for cart items
 */
export async function verifyStockAvailability(
  items: Array<{ productId: string; quantity: number }>
): Promise<StockVerificationResult> {
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
