import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createClient } from '@/lib/supabase/server';
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

    // For logged-in users, merge profile data with form data
    // Use profile data for non-null fields, allow form data to fill in null fields
    let finalFullName: string;
    let finalPhone: string;
    let finalEmail: string | undefined;
    let shouldUpdateProfile = false;

    if (session?.user) {
      // Use session data (already fresh from NextAuth)
      const { fullName, phone, email } = shippingInfo;

      // For logged-in users: Use session data if available, otherwise allow form data
      // Priority: Session data > Form data > Error for required fields
      finalFullName = session.user.name || fullName || '';
      finalPhone = session.user.phone || phone || '';
      finalEmail = session.user.email || email || undefined;

      // Validate required fields
      if (!finalFullName) {
        return NextResponse.json(
          { error: 'لطفاً نام و نام خانوادگی خود را وارد کنید' },
          { status: 400 }
        );
      }

      if (!finalPhone) {
        return NextResponse.json(
          { error: 'لطفاً شماره تلفن خود را وارد کنید' },
          { status: 400 }
        );
      }

      // Check if we need to update profile with new values from form
      if (!session.user.name && fullName) {
        shouldUpdateProfile = true;
      }
      if (!session.user.phone && phone) {
        shouldUpdateProfile = true;
      }
      if (!session.user.email && email) {
        shouldUpdateProfile = true;
      }

      log.info('Using merged user data for transaction', {
        userId: session.user.id,
        finalPhone,
        finalEmail,
        fromProfile: {
          name: !!session.user.name,
          phone: !!session.user.phone,
          email: !!session.user.email,
        },
        fromForm: {
          name: !session.user.name && !!fullName,
          phone: !session.user.phone && !!phone,
          email: !session.user.email && !!email,
        },
        willUpdateProfile: shouldUpdateProfile,
      });
    } else {
      // For guest users, use form data
      const { fullName, phone, email } = shippingInfo;

      if (!fullName || !phone) {
        return NextResponse.json(
          { error: 'لطفاً تمام فیلدهای الزامی را پر کنید' },
          { status: 400 }
        );
      }

      finalFullName = fullName;
      finalPhone = phone;
      finalEmail = email || undefined;
    }

    // Validate shipping address (both logged-in and guest users)
    const { shippingAddress, postalCode, createAccount } = shippingInfo;

    if (!shippingAddress) {
      return NextResponse.json(
        { error: 'لطفاً آدرس ارسال را وارد کنید' },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!finalPhone.match(/^09\d{9}$/)) {
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
    const transactionItems: Array<{ productId: string; variantId?: string; quantity: number; price: number }> = [];

    for (const item of items) {
      const product = await getProductById(item.productId);

      if (!product.isActive) {
        return NextResponse.json(
          { error: `محصول ${product.name} غیرفعال است` },
          { status: 400 }
        );
      }

      // Calculate base price with discount if applicable
      const basePrice = Number(product.price);
      const discountPercent = product.discountPercent || 0;
      let finalPrice = discountPercent > 0
        ? basePrice * (1 - discountPercent / 100)
        : basePrice;

      // If variant is specified, add variant's price adjustment
      if (item.variantId) {
        const supabase = createClient();
        const { data: variant, error: variantError } = await supabase
          .from('product_variants')
          .select('priceAdjust, isActive')
          .eq('id', item.variantId)
          .single();

        if (variantError || !variant) {
          return NextResponse.json(
            { error: `واریانت محصول ${product.name} یافت نشد` },
            { status: 400 }
          );
        }

        if (!variant.isActive) {
          return NextResponse.json(
            { error: `واریانت محصول ${product.name} غیرفعال است` },
            { status: 400 }
          );
        }

        // Add variant price adjustment to the final price
        finalPrice += Number(variant.priceAdjust);
      }

      const itemTotal = finalPrice * item.quantity;
      totalAmount += itemTotal;

      transactionItems.push({
        productId: product.id,
        variantId: item.variantId, // Pass variant ID if present
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
        fullName: finalFullName,
        phone: finalPhone,
        email: finalEmail,
        shippingAddress,
        postalCode: postalCode || undefined,
        createAccount: createAccount && !session, // Only for guest users
      },
    });

    // If logged-in user, update their profile with shipping info and any new contact info
    if (session?.user) {
      // Always update shipping info
      await updateUserShippingInfo(session.user.id, {
        shippingAddress,
        postalCode: postalCode || undefined,
      });

      // Update profile with new contact info if user filled in null fields
      if (shouldUpdateProfile) {
        const { fullName, phone, email } = shippingInfo;
        const updateData: { name?: string; phone?: string; email?: string | null } = {};

        // Only update fields that were null in profile (use session data for checking)
        if (!session.user.name && fullName) {
          updateData.name = fullName;
        }
        if (!session.user.phone && phone) {
          updateData.phone = phone;
        }
        if (!session.user.email && email) {
          updateData.email = email;
        }

        // Only perform update if there are fields to update
        if (Object.keys(updateData).length > 0) {
          const supabase = createClient();
          const { error: updateError } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', session.user.id);

          if (updateError) {
            log.error('Failed to update user profile from checkout', { userId: session.user.id, error: updateError });
          } else {
            log.info('Updated user profile with new contact info from checkout', {
              userId: session.user.id,
              updatedFields: Object.keys(updateData),
            });
          }
        }
      }
    }

    // Create payment request with Zarinpal
    const paymentRequest = await createPaymentRequest({
      amount: totalAmount, // In Tomans
      description: `خرید از فروشگاه کیتیا - کد تراکنش: ${transaction.transactionCode}`,
      email: finalEmail,
      mobile: finalPhone,
      callbackUrl: getCallbackUrl(req.url), // Pass request URL for dynamic origin (preview deployments)
    });

    // Update transaction with Zarinpal authority
    const supabaseTx = createClient();
    await supabaseTx
      .from('transactions')
      .update({ zarinpalAuthority: paymentRequest.authority })
      .eq('id', transaction.id);

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
