import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';
import {
  createTransaction,
  verifyStockAvailability,
} from '@/services/transaction-service';
import { getProductById } from '@/services/product-service';
import { updateUserShippingInfo } from '@/services/user-service';
import {
  createPaymentRequest,
  getCallbackUrl,
} from '@/lib/zarinpal/client';
import { withLogging } from '@/lib/api/with-logging';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { apiLimiter } from '@/lib/rate-limit';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/transactions/create - Create transaction and initiate payment
async function postHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { items, shippingInfo, paymentMethod } = body;

    log.info('Transaction creation started', {
      userId: session?.user?.id || 'guest',
      itemCount: items?.length || 0,
      paymentMethod: paymentMethod || 'ZARINPAL',
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'سبد خرید خالی است' },
        { status: 400 }
      );
    }

    // Validate shipping info
    if (!shippingInfo) {
      return NextResponse.json(
        { error: 'اطلاعات ارسال الزامی است' },
        { status: 400 }
      );
    }

    const { fullName, phone, email, shippingAddress, postalCode, createAccount } = shippingInfo;

    if (!fullName || !phone || !shippingAddress) {
      return NextResponse.json(
        { error: 'لطفاً تمام فیلدهای الزامی را پر کنید' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!phone.match(/^09\d{9}$/)) {
      return NextResponse.json(
        { error: 'فرمت شماره تلفن نامعتبر است' },
        { status: 400 }
      );
    }

    // Verify stock availability
    const stockCheck = await verifyStockAvailability(items);
    if (!stockCheck.available) {
      return NextResponse.json(
        {
          error: 'موجودی کافی نیست',
          details: stockCheck.errors,
        },
        { status: 400 }
      );
    }

    // Calculate total and prepare transaction items
    let totalAmount = 0;
    const transactionItems: Array<{ productId: string; quantity: number; price: number }> = [];

    for (const item of items) {
      const product = await getProductById(item.productId);

      if (!product.isActive) {
        return NextResponse.json(
          { error: `محصول ${product.name} غیرفعال است` },
          { status: 400 }
        );
      }

      // Calculate price with discount if applicable
      const basePrice = Number(product.price);
      const discountPercent = product.discountPercent || 0;
      const finalPrice = discountPercent > 0
        ? basePrice * (1 - discountPercent / 100)
        : basePrice;

      const itemTotal = finalPrice * item.quantity;
      totalAmount += itemTotal;

      transactionItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: finalPrice,
      });
    }

    // Validate payment method
    const validPaymentMethod = paymentMethod === 'DIGIPAY' ? 'DIGIPAY' : 'ZARINPAL';

    // Create transaction in database with shipping info
    const transaction = await createTransaction({
      userId: session?.user?.id, // Optional for guest users
      items: transactionItems,
      amount: totalAmount,
      paymentMethod: validPaymentMethod,
      shippingInfo: {
        fullName,
        phone,
        email: email || undefined,
        shippingAddress,
        postalCode: postalCode || undefined,
        createAccount: createAccount && !session, // Only for guest users
      },
    });

    // If logged-in user, update their profile with shipping info
    if (session?.user) {
      await updateUserShippingInfo(session.user.id, {
        shippingAddress,
        postalCode: postalCode || undefined,
      });
    }

    // Create payment request with Zarinpal
    const paymentRequest = await createPaymentRequest({
      amount: totalAmount, // In Tomans
      description: `خرید از فروشگاه کیتیا - کد تراکنش: ${transaction.transactionCode}`,
      email: email || session?.user?.email || undefined,
      mobile: phone,
      callbackUrl: getCallbackUrl(req.url), // Pass request URL for dynamic origin (preview deployments)
    });

    // Update transaction with Zarinpal authority
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { zarinpalAuthority: paymentRequest.authority },
    });

    log.info('Transaction created successfully', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: totalAmount,
      authority: paymentRequest.authority,
      userId: session?.user?.id || 'guest',
      elapsedMs: Date.now() - startTime,
    });

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: totalAmount,
      paymentUrl: paymentRequest.url,
      authority: paymentRequest.authority,
    });
  } catch (error) {
    log.error('Error creating transaction', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    console.error('Error creating transaction:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در ایجاد تراکنش' },
      { status: 500 }
    );
  }
}

export const POST = withLogging(
  withRateLimit(postHandler, apiLimiter),
  'POST /api/transactions/create'
);
