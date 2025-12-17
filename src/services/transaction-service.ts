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
 * Create a new transaction with items and shipping information
 */
export async function createTransaction(data: {
  userId?: string;
  items: Array<{
    productId: string;
    variantId?: string; // Optional: which variant was purchased
    quantity: number;
    price: number;
  }>;
  amount: number;
  paymentMethod?: 'ZARINPAL' | 'DIGIPAY';
  shippingInfo: {
    fullName: string;
    phone: string;
    email?: string;
    shippingAddress: string;
    postalCode?: string;
    createAccount?: boolean;
  };
}): Promise<TransactionWithItems> {
  const transactionCode = generateTransactionCode();

  log.info('Creating transaction', {
    userId: data.userId || 'guest',
    amount: data.amount,
    itemCount: data.items.length,
    transactionCode,
    hasShippingInfo: !!data.shippingInfo,
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
          paymentMethod: data.paymentMethod || 'ZARINPAL',
          isGuest: !data.userId, // Auto-determine guest status
          fullName: data.shippingInfo.fullName,
          phone: data.shippingInfo.phone,
          email: data.shippingInfo.email,
          shippingAddress: data.shippingInfo.shippingAddress,
          postalCode: data.shippingInfo.postalCode,
          createAccount: data.shippingInfo.createAccount || false,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId, // Track which variant was purchased
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
          user: data.userId ? {
            select: {
              id: true,
              email: true,
              name: true,
            },
          } : undefined,
        },
      });

      return newTransaction;
    });

    log.info('Transaction created successfully', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: transaction.amount,
      isGuest: !data.userId,
    });

    return transaction;
  } catch (error) {
    log.error('Failed to create transaction', {
      userId: data.userId || 'guest',
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
 * Reduce product/variant stock after successful payment
 */
export async function reduceProductStock(transactionId: string): Promise<void> {
  log.info('Reducing product/variant stock for transaction', { transactionId });

  try {
    const transaction = await getTransactionById(transactionId);

    if (transaction.status !== 'COMPLETED') {
      log.warn('Cannot reduce stock for non-completed transaction', {
        transactionId,
        status: transaction.status,
      });
      throw new Error('فقط برای تراکنش‌های موفق امکان کاهش موجودی وجود دارد');
    }

    // Update stock for each item in the transaction
    // Use a Prisma transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      for (const item of transaction.items) {
        if (item.variantId) {
          // Reduce variant stock
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          // Get all variants for this product to recalculate total stock
          const variants = await tx.productVariant.findMany({
            where: { productId: item.productId },
            select: { stock: true },
          });

          const totalStock = variants.reduce((sum, v) => sum + v.stock, 0);

          // Update product stock to sum of all variant stocks
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: totalStock },
          });

          log.info('Variant stock reduced and product stock recalculated', {
            variantId: item.variantId,
            productId: item.productId,
            quantity: item.quantity,
            newTotalStock: totalStock,
          });
        } else {
          // No variant - reduce product stock directly (backward compatible)
          await tx.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          log.info('Product stock reduced (no variant)', {
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }
    });

    log.info('Product/variant stock reduced successfully', {
      transactionId,
      itemsUpdated: transaction.items.length,
    });
  } catch (error) {
    log.error('Failed to reduce product/variant stock', {
      transactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Verify stock availability for cart items
 * Optimized to batch fetch products and variants to avoid N+1 queries
 */
export async function verifyStockAvailability(
  items: Array<{ productId: string; variantId?: string; quantity: number }>
): Promise<StockVerificationResult> {
  const errors: string[] = [];

  // Step 1: Batch fetch all products in one query
  const productIds = items.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, stock: true, name: true, isActive: true, hasVariants: true },
  });

  // Create a product lookup map for O(1) access
  const productMap = new Map(products.map(p => [p.id, p]));

  // Step 2: Batch fetch all variants in one query (if any items have variantId)
  const variantIds = items
    .filter(item => item.variantId)
    .map(item => item.variantId as string);

  const variants = variantIds.length > 0
    ? await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, stock: true, name: true, isActive: true },
      })
    : [];

  // Create a variant lookup map for O(1) access
  const variantMap = new Map(variants.map(v => [v.id, v]));

  // Step 3: Validate each item using cached data
  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push(`محصول یافت نشد`);
      continue;
    }

    if (!product.isActive) {
      errors.push(`محصول ${product.name} غیرفعال است`);
      continue;
    }

    // If product has variants enabled, variantId is REQUIRED
    if (product.hasVariants && !item.variantId) {
      errors.push(`برای محصول ${product.name} باید یک نوع (رنگ، سایز، ...) انتخاب کنید`);
      continue;
    }

    // Check variant stock if variantId is provided
    if (item.variantId) {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        errors.push(`واریانت محصول ${product.name} یافت نشد`);
        continue;
      }

      if (!variant.isActive) {
        errors.push(`واریانت ${variant.name} از محصول ${product.name} غیرفعال است`);
        continue;
      }

      if (variant.stock < item.quantity) {
        errors.push(
          `موجودی کافی برای ${variant.name} (${product.name}) وجود ندارد (موجودی: ${variant.stock}، درخواستی: ${item.quantity})`
        );
      }
    } else {
      // No variant - check product stock (only if hasVariants is false)
      if (!product.hasVariants && product.stock < item.quantity) {
        errors.push(
          `موجودی کافی برای ${product.name} وجود ندارد (موجودی: ${product.stock}، درخواستی: ${item.quantity})`
        );
      }
    }
  }

  return {
    available: errors.length === 0,
    errors,
  };
}
