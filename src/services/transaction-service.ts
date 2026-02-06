import 'server-only';
import { randomUUID } from 'crypto';
import { createClient } from '@/lib/supabase/server';
import { PaginatedResponse, StockVerificationResult } from '@/types/api';
import { log } from '@/lib/logger';

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
    variantId?: string;
    quantity: number;
    price: number;
  }>;
  amount: number;
  gatewayFee?: number; // Payment gateway fee (e.g., Digipay 12% surcharge)
  paymentMethod?: 'STRIPE' | 'PAYPAL';
  shippingInfo: {
    fullName: string;
    phone: string;
    email?: string;
    shippingAddress: string;
    postalCode?: string;
    createAccount?: boolean;
  };
  // Optional client info for tracking
  ipAddress?: string | null;
  userAgent?: string | null;
  // Promo code fields
  promoCodeId?: string;
  discountAmount?: number;
  subtotal?: number;
}) {
  const transactionCode = generateTransactionCode();
  const supabase = createClient();
  const now = new Date().toISOString();

  log.info('Creating transaction', {
    userId: data.userId || 'guest',
    amount: data.amount,
    gatewayFee: data.gatewayFee || 0,
    itemCount: data.items.length,
    transactionCode,
    hasShippingInfo: !!data.shippingInfo,
    promoCodeId: data.promoCodeId,
    discountAmount: data.discountAmount || 0,
    subtotal: data.subtotal,
  });

  try {
    // Step 1: Create the transaction
    const { data: newTransaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        id: randomUUID(),
        userId: data.userId || null,
        amount: Number(data.amount),
        gateway_fee: data.gatewayFee || 0, // Store gateway fee separately
        status: 'PENDING',
        transactionCode,
        paymentMethod: data.paymentMethod || 'STRIPE',
        isGuest: !data.userId,
        fullName: data.shippingInfo.fullName,
        phone: data.shippingInfo.phone,
        email: data.shippingInfo.email || null,
        shippingAddress: data.shippingInfo.shippingAddress,
        postalCode: data.shippingInfo.postalCode || null,
        createAccount: data.shippingInfo.createAccount || false,
        // Client tracking info
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        // Promo code fields
        promoCodeId: data.promoCodeId || null,
        discountAmount: data.discountAmount || 0,
        subtotal: data.subtotal || null,
        updatedAt: now,
      })
      .select()
      .single();

    if (txError || !newTransaction) {
      log.error('Failed to create transaction', { error: txError });
      throw new Error('خطا در ایجاد تراکنش');
    }

    // Step 2: Create transaction items
    const items = data.items.map((item) => ({
      id: randomUUID(),
      transactionId: newTransaction.id,
      productId: item.productId,
      variantId: item.variantId || null,
      quantity: item.quantity,
      price: Number(item.price),
    }));

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert(items);

    if (itemsError) {
      // Rollback: delete transaction
      log.error('Failed to create transaction items, rolling back', {
        error: itemsError,
      });
      await supabase.from('transactions').delete().eq('id', newTransaction.id);
      throw new Error('خطا در ایجاد آیتم‌های تراکنش');
    }

    // Step 3: Fetch complete transaction with relations
    const { data: fullTransaction, error: fetchError } = await supabase
      .from('transactions')
      .select(
        `
        *,
        items:transaction_items(
          *,
          product:products(*)
        )
      `
      )
      .eq('id', newTransaction.id)
      .single();

    if (fetchError || !fullTransaction) {
      log.error('Failed to fetch created transaction', { error: fetchError });
      throw new Error('خطا در دریافت تراکنش');
    }

    log.info('Transaction created successfully', {
      transactionId: fullTransaction.id,
      transactionCode: fullTransaction.transactionCode,
      amount: fullTransaction.amount,
      isGuest: !data.userId,
    });

    return fullTransaction;
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
 * Update transaction status and provider reference data
 */
export async function updateTransactionStatus(
  id: string,
  status: 'PENDING' | 'COMPLETED' | 'FAILED',
  paymentProviderRef?: string,
  providerReferenceId?: number,
  providerFields?: {
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    stripeChargeId?: string;
    paypalOrderId?: string;
    paypalCaptureId?: string;
  }
) {
  const supabase = createClient();
  const now = new Date().toISOString();
  const selectClause = `
    *,
    items:transaction_items(
      *,
      product:products(*)
    )
  `;

  log.info('Updating transaction status', {
    transactionId: id,
    status,
    providerReferenceId,
  });

  try {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (paymentProviderRef) {
      updateData.paymentProviderRef = paymentProviderRef;
    }

    if (providerReferenceId) {
      updateData.paymentMetadata = {
        providerReferenceId,
      };
    }

    if (providerFields?.stripePaymentIntentId) {
      updateData.stripePaymentIntentId = providerFields.stripePaymentIntentId;
    }

    if (providerFields?.stripeCheckoutSessionId) {
      updateData.stripeCheckoutSessionId =
        providerFields.stripeCheckoutSessionId;
    }

    if (providerFields?.stripeChargeId) {
      updateData.stripeChargeId = providerFields.stripeChargeId;
    }

    if (providerFields?.paypalOrderId) {
      updateData.paypalOrderId = providerFields.paypalOrderId;
    }

    if (providerFields?.paypalCaptureId) {
      updateData.paypalCaptureId = providerFields.paypalCaptureId;
      updateData.paymentMetadata = {
        ...(typeof updateData.paymentMetadata === 'object' &&
        updateData.paymentMetadata !== null
          ? (updateData.paymentMetadata as Record<string, unknown>)
          : {}),
        paypalCaptureId: providerFields.paypalCaptureId,
      };
    }

    let updateQuery = supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id);

    // Idempotent guards:
    // - COMPLETED transitions are one-way and should not re-apply.
    // - FAILED transitions only apply while transaction is still pending.
    if (status === 'COMPLETED') {
      updateQuery = updateQuery.neq('status', 'COMPLETED');
    } else if (status === 'FAILED') {
      updateQuery = updateQuery.eq('status', 'PENDING');
    }

    const { data: transaction, error } = await updateQuery
      .select(selectClause)
      .maybeSingle();

    if (!error && transaction) {
      log.info('Transaction status updated successfully', {
        transactionId: id,
        newStatus: status,
      });

      return {
        ...transaction,
        statusChanged: true,
      };
    }

    // If update was skipped by guard conditions, return current state as a no-op.
    const { data: currentTransaction, error: currentError } = await supabase
      .from('transactions')
      .select(selectClause)
      .eq('id', id)
      .maybeSingle();

    if (currentError || !currentTransaction) {
      log.error('Failed to update transaction status', { id, error });
      throw new Error('خطا در بروزرسانی وضعیت تراکنش');
    }

    log.info('Transaction status update skipped (idempotent no-op)', {
      transactionId: id,
      requestedStatus: status,
      currentStatus: currentTransaction.status,
    });

    return {
      ...currentTransaction,
      statusChanged: false,
    };
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
export async function getTransactionById(id: string) {
  const supabase = createClient();

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        product:products(*)
      ),
      invoice:invoices(
        invoiceNumber,
        generatedAt,
        pdfUrl
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !transaction) {
    log.error('Transaction not found', { id, error });
    throw new Error('تراکنش یافت نشد');
  }

  // Supabase returns invoice as array, get first element
  const invoiceData = Array.isArray(transaction.invoice)
    ? transaction.invoice[0]
    : transaction.invoice;

  return {
    ...transaction,
    invoice: invoiceData || null,
  };
}

/**
 * Get transaction by transaction code
 */
export async function getTransactionByCode(code: string) {
  const supabase = createClient();

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        product:products(*)
      ),
      invoice:invoices(
        invoiceNumber,
        generatedAt,
        pdfUrl
      )
    `
    )
    .eq('transactionCode', code)
    .single();

  if (error || !transaction) {
    log.error('Transaction not found', { code, error });
    throw new Error('تراکنش یافت نشد');
  }

  // Supabase returns invoice as array, get first element
  const invoiceData = Array.isArray(transaction.invoice)
    ? transaction.invoice[0]
    : transaction.invoice;

  return {
    ...transaction,
    invoice: invoiceData || null,
  };
}

/**
 * Get transaction by provider reference
 */
export async function getTransactionByProviderRef(providerRef: string) {
  const supabase = createClient();

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        product:products(*),
        variant:product_variants(*)
      ),
      user:users(
        id,
        email,
        name,
        phone
      )
    `
    )
    .eq('paymentProviderRef', providerRef)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error || !transaction) {
    log.error('Transaction not found by provider reference', {
      providerRef,
      error,
    });
    throw new Error('تراکنش یافت نشد');
  }

  const userData = Array.isArray(transaction.user)
    ? transaction.user[0]
    : transaction.user;

  return {
    ...transaction,
    user: userData || null,
  };
}

/**
 * Get transaction by ID with variants (for email confirmations)
 */
export async function getTransactionWithVariants(id: string) {
  const supabase = createClient();

  const { data: transaction, error } = await supabase
    .from('transactions')
    .select(
      `
      *,
      items:transaction_items(
        *,
        product:products(*),
        variant:product_variants(*)
      ),
      user:users(
        id,
        email,
        name,
        phone
      )
    `
    )
    .eq('id', id)
    .single();

  if (error || !transaction) {
    log.error('Transaction not found', { id, error });
    throw new Error('تراکنش یافت نشد');
  }

  // Flatten user array if returned
  const userData = Array.isArray(transaction.user)
    ? transaction.user[0]
    : transaction.user;

  return {
    ...transaction,
    user: userData || null,
  };
}

/**
 * Link transaction to user (for guest checkout account creation)
 */
export async function linkTransactionToUser(
  transactionId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  log.info('Linking transaction to user', { transactionId, userId });

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        userId,
        updatedAt: now,
      })
      .eq('id', transactionId);

    if (error) {
      log.error('Failed to link transaction to user', { error });
      throw new Error('خطا در ارتباط تراکنش با کاربر');
    }

    log.info('Transaction linked to user successfully', {
      transactionId,
      userId,
    });
  } catch (error) {
    log.error('Failed to link transaction to user', {
      transactionId,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Get all transactions for a user
 */
export async function getUserTransactions(
  userId: string,
  options?: {
    page?: number;
    perPage?: number;
  }
): Promise<PaginatedResponse<Record<string, unknown>>> {
  const supabase = createClient();
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;

  const [{ count }, { data: transactions, error }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('userId', userId),
    supabase
      .from('transactions')
      .select(
        `
        *,
        items:transaction_items(
          *,
          product:products(*)
        ),
        invoice:invoices(
          invoiceNumber,
          generatedAt,
          pdfUrl
        )
      `
      )
      .eq('userId', userId)
      .order('createdAt', { ascending: false })
      .range(offset, offset + perPage - 1),
  ]);

  if (error) {
    log.error('Failed to fetch user transactions', { userId, error });
    throw new Error('خطا در دریافت تراکنش‌های کاربر');
  }

  // Process invoices (convert array to single object)
  const processedTransactions = (transactions || []).map((tx) => {
    const invoiceData = Array.isArray(tx.invoice) ? tx.invoice[0] : tx.invoice;
    return {
      ...tx,
      invoice: invoiceData || null,
    };
  });

  const total = count || 0;

  return {
    data: processedTransactions,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * Reduce product/variant stock after successful payment
 * Uses batched queries to avoid N+1 patterns
 */
export async function reduceProductStock(transactionId: string): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  log.info('Reducing product/variant stock for transaction', { transactionId });

  try {
    // Get transaction with items
    const transaction = await getTransactionById(transactionId);

    if (transaction.status !== 'COMPLETED') {
      log.warn('Cannot reduce stock for non-completed transaction', {
        transactionId,
        status: transaction.status,
      });
      throw new Error('فقط برای تراکنش‌های موفق امکان کاهش موجودی وجود دارد');
    }

    // Separate items by whether they have variants
    const variantItems = transaction.items.filter(
      (item) => item.variantId
    ) as Array<{
      productId: string;
      variantId: string;
      quantity: number;
    }>;
    const productOnlyItems = transaction.items.filter(
      (item) => !item.variantId
    );

    // Track which products need stock recalculation (those with variants)
    const productsNeedingRecalc = new Set<string>(
      variantItems.map((item) => item.productId)
    );

    // BATCH 1: Fetch all variant stocks in one query
    if (variantItems.length > 0) {
      const variantIds = variantItems.map((item) => item.variantId);
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, stock')
        .in('id', variantIds);

      if (variants) {
        const variantStockMap = new Map(variants.map((v) => [v.id, v.stock]));

        // Calculate new stocks and update each variant
        // (Supabase doesn't support bulk conditional updates, so we update individually but without re-fetching)
        for (const item of variantItems) {
          const currentStock = variantStockMap.get(item.variantId);
          if (currentStock !== undefined) {
            const newStock = Math.max(0, currentStock - item.quantity);
            await supabase
              .from('product_variants')
              .update({
                stock: newStock,
                updatedAt: now,
              })
              .eq('id', item.variantId);

            log.info('Variant stock reduced', {
              variantId: item.variantId,
              productId: item.productId,
              quantity: item.quantity,
              newStock,
            });
          }
        }
      }
    }

    // BATCH 2: Fetch all product stocks (for non-variant items) in one query
    if (productOnlyItems.length > 0) {
      const productIds = productOnlyItems.map((item) => item.productId);
      const { data: products } = await supabase
        .from('products')
        .select('id, stock')
        .in('id', productIds);

      if (products) {
        const productStockMap = new Map(products.map((p) => [p.id, p.stock]));

        // Update each product's stock
        for (const item of productOnlyItems) {
          const currentStock = productStockMap.get(item.productId);
          if (currentStock !== undefined) {
            const newStock = Math.max(0, currentStock - item.quantity);
            await supabase
              .from('products')
              .update({
                stock: newStock,
                updatedAt: now,
              })
              .eq('id', item.productId);

            log.info('Product stock reduced (no variant)', {
              productId: item.productId,
              quantity: item.quantity,
              newStock,
            });
          }
        }
      }
    }

    // BATCH 3: Recalculate product stocks for products with variants
    // Fetch ALL variants for ALL products needing recalc in ONE query
    if (productsNeedingRecalc.size > 0) {
      const productIds = Array.from(productsNeedingRecalc);

      const { data: allVariants } = await supabase
        .from('product_variants')
        .select('productId, stock')
        .in('productId', productIds);

      if (allVariants) {
        // Group variants by productId and calculate totals
        const stockByProduct = new Map<string, number>();
        for (const variant of allVariants) {
          const current = stockByProduct.get(variant.productId) || 0;
          stockByProduct.set(variant.productId, current + variant.stock);
        }

        // Update each product's total stock
        for (const [productId, totalStock] of stockByProduct) {
          await supabase
            .from('products')
            .update({
              stock: totalStock,
              updatedAt: now,
            })
            .eq('id', productId);

          log.info('Product stock recalculated from variants', {
            productId,
            newTotalStock: totalStock,
          });
        }
      }
    }

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
 */
export async function verifyStockAvailability(
  items: Array<{ productId: string; variantId?: string; quantity: number }>
): Promise<StockVerificationResult> {
  const supabase = createClient();
  const errors: string[] = [];
  const unavailableProductIds: string[] = [];

  // Batch fetch all products
  const productIds = items.map((item) => item.productId);
  const { data: products } = await supabase
    .from('products')
    .select('id, stock, name, isActive, hasVariants')
    .in('id', productIds);

  const productMap = new Map((products || []).map((p) => [p.id, p]));

  // Batch fetch all variants
  const variantIds = items
    .filter((item) => item.variantId)
    .map((item) => item.variantId as string);
  const { data: variants } =
    variantIds.length > 0
      ? await supabase
          .from('product_variants')
          .select('id, stock, name, isActive, productId')
          .in('id', variantIds)
      : { data: [] };

  const variantMap = new Map((variants || []).map((v) => [v.id, v]));

  // Validate each item
  for (const item of items) {
    const product = productMap.get(item.productId);

    if (!product) {
      errors.push('محصول یافت نشد');
      unavailableProductIds.push(item.productId);
      continue;
    }

    if (!product.isActive) {
      errors.push(`محصول ${product.name} غیرفعال است`);
      unavailableProductIds.push(item.productId);
      continue;
    }

    if (product.hasVariants && !item.variantId) {
      errors.push(
        `برای محصول ${product.name} باید یک نوع (رنگ، سایز، ...) انتخاب کنید`
      );
      unavailableProductIds.push(item.productId);
      continue;
    }

    if (item.variantId) {
      const variant = variantMap.get(item.variantId);

      if (!variant) {
        errors.push(`واریانت محصول ${product.name} یافت نشد`);
        unavailableProductIds.push(item.productId);
        continue;
      }

      if (variant.productId !== item.productId) {
        errors.push(`واریانت محصول ${product.name} نامعتبر است`);
        unavailableProductIds.push(item.productId);
        continue;
      }

      if (!variant.isActive) {
        errors.push(
          `واریانت ${variant.name} از محصول ${product.name} غیرفعال است`
        );
        unavailableProductIds.push(item.productId);
        continue;
      }

      if (variant.stock < item.quantity) {
        errors.push(
          `موجودی کافی برای ${variant.name} (${product.name}) وجود ندارد (موجودی: ${variant.stock}، درخواستی: ${item.quantity})`
        );
        unavailableProductIds.push(item.productId);
      }
    } else {
      if (!product.hasVariants && product.stock < item.quantity) {
        errors.push(
          `موجودی کافی برای ${product.name} وجود ندارد (موجودی: ${product.stock}، درخواستی: ${item.quantity})`
        );
        unavailableProductIds.push(item.productId);
      }
    }
  }

  return {
    available: errors.length === 0,
    errors,
    unavailableProductIds,
  };
}
