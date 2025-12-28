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
import { createPaymentRequest, getCallbackUrl } from '@/lib/zarinpal/client';
import { withLogging } from '@/lib/api/with-logging';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { apiLimiter } from '@/lib/rate-limit';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';
import { DIGIPAY_CONFIG } from '@/config/constants';

export const dynamic = 'force-dynamic';

// POST /api/transactions/create - Create transaction and initiate payment
async function postHandler(req: NextRequest) {
  const startTime = Date.now();
  // Extract client info for storing in transaction
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { items, shippingInfo, paymentMethod } = body;

    log.info('Transaction creation started', {
      userId: session?.user?.id || 'guest',
      itemCount: items?.length || 0,
      paymentMethod: paymentMethod || 'ZARINPAL',
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
    });

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'سبد خرید خالی است' }, { status: 400 });
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
      log.warn('Stock verification failed', {
        userId: session?.user?.id || 'guest',
        errors: stockCheck.errors,
        items: items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
        })),
      });
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
    const transactionItems: Array<{
      productId: string;
      variantId?: string;
      quantity: number;
      price: number;
    }> = [];

    log.info('Starting price calculation for transaction items', {
      userId: session?.user?.id || 'guest',
      itemCount: items.length,
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      })),
    });

    for (const item of items) {
      const product = await getProductById(item.productId);

      log.debug('Product fetched for transaction', {
        productId: product.id,
        productName: product.name,
        isActive: product.isActive,
        hasVariants: product.hasVariants,
        itemVariantId: item.variantId,
      });

      if (!product.isActive) {
        return NextResponse.json(
          { error: `محصول ${product.name} غیرفعال است` },
          { status: 400 }
        );
      }

      // Calculate base price with discount if applicable
      const basePrice = Number(product.price);
      const discountPercent = product.discountPercent || 0;
      let finalPrice =
        discountPercent > 0
          ? basePrice * (1 - discountPercent / 100)
          : basePrice;

      // If variant is specified, add variant's price adjustment
      if (item.variantId) {
        const supabaseVariant = createClient();
        const { data: variant, error: variantError } = await supabaseVariant
          .from('product_variants')
          .select('priceAdjust, isActive')
          .eq('id', item.variantId)
          .single();

        if (variantError || !variant) {
          log.error('Variant not found or error fetching variant', {
            variantId: item.variantId,
            productId: product.id,
            error: variantError,
          });
          return NextResponse.json(
            { error: `واریانت محصول ${product.name} یافت نشد` },
            { status: 400 }
          );
        }

        if (!variant.isActive) {
          log.warn('Inactive variant attempted in transaction', {
            variantId: item.variantId,
            productId: product.id,
          });
          return NextResponse.json(
            { error: `واریانت محصول ${product.name} غیرفعال است` },
            { status: 400 }
          );
        }

        // Add variant price adjustment to the final price
        finalPrice += Number(variant.priceAdjust || 0);
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
    let validPaymentMethod: 'ZARINPAL' | 'DIGIPAY' | 'ZIBAL' = 'ZARINPAL';
    if (paymentMethod === 'DIGIPAY') {
      validPaymentMethod = 'DIGIPAY';
    } else if (paymentMethod === 'ZIBAL') {
      validPaymentMethod = 'ZIBAL';
    }

    // Calculate surcharge for Digipay payments (12%)
    const digipaySurcharge =
      validPaymentMethod === 'DIGIPAY'
        ? Math.round(totalAmount * (DIGIPAY_CONFIG.SURCHARGE_PERCENT / 100))
        : 0;
    const finalPaymentAmount = totalAmount + digipaySurcharge;

    log.info('Payment amount calculation', {
      baseAmount: totalAmount,
      digipaySurcharge,
      finalPaymentAmount,
      paymentMethod: validPaymentMethod,
      surchargePercent:
        validPaymentMethod === 'DIGIPAY' ? DIGIPAY_CONFIG.SURCHARGE_PERCENT : 0,
    });

    // Create transaction in database with shipping info
    // Note: We store the final amount including surcharge for Digipay
    const transaction = await createTransaction({
      userId: session?.user?.id, // Optional for guest users
      items: transactionItems,
      amount: finalPaymentAmount, // Includes surcharge for Digipay
      paymentMethod: validPaymentMethod,
      shippingInfo: {
        fullName: finalFullName,
        phone: finalPhone,
        email: finalEmail,
        shippingAddress,
        postalCode: postalCode || undefined,
        createAccount: createAccount && !session, // Only for guest users
      },
      // Include client info for tracking
      ipAddress,
      userAgent,
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
        const updateData: {
          name?: string;
          phone?: string;
          email?: string | null;
        } = {};

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
            log.error('Failed to update user profile from checkout', {
              userId: session.user.id,
              error: updateError,
            });
          } else {
            log.info(
              'Updated user profile with new contact info from checkout',
              {
                userId: session.user.id,
                updatedFields: Object.keys(updateData),
              }
            );
          }
        }
      }
    }

    // Create payment request with selected payment gateway
    let paymentUrl: string;
    let paymentIdentifier: string; // authority for Zarinpal, ticket for Digipay, trackId for Zibal

    if (validPaymentMethod === 'DIGIPAY') {
      // Digipay payment flow
      const digipayClient = await import('@/lib/digipay/client');

      const digipayRequest = await digipayClient.createPaymentRequest({
        amount: finalPaymentAmount, // In Tomans - includes 12% surcharge
        description: `خرید از فروشگاه کیتیا - کد تراکنش: ${transaction.transactionCode}`,
        cellNumber: finalPhone,
        providerId: transaction.transactionCode, // Use transactionCode as unique providerId
        callbackUrl: `${digipayClient.getCallbackUrl(req.url)}?ticket=${transaction.id}`,
        // Optional: Allow user to select preferred gateway in UI
        // preferredGateway: 'IPG' | 'WALLET'
      });

      // Update transaction with Digipay ticket
      const supabaseTx = createClient();
      await supabaseTx
        .from('transactions')
        .update({ digipayTicket: digipayRequest.ticket })
        .eq('id', transaction.id);

      paymentUrl = digipayRequest.redirectUrl;
      paymentIdentifier = digipayRequest.ticket;

      log.info('Digipay transaction created successfully', {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        baseAmount: totalAmount,
        surcharge: digipaySurcharge,
        finalAmount: finalPaymentAmount,
        ticket: digipayRequest.ticket,
        userId: session?.user?.id || 'guest',
        elapsedMs: Date.now() - startTime,
      });
    } else if (validPaymentMethod === 'ZIBAL') {
      // Zibal payment flow
      const zibalClient = await import('@/lib/zibal/client');

      const zibalRequest = await zibalClient.createPaymentRequest({
        amount: finalPaymentAmount, // In Tomans (no surcharge for Zibal)
        description: `خرید از فروشگاه کیتیا - کد تراکنش: ${transaction.transactionCode}`,
        mobile: finalPhone,
        orderId: transaction.transactionCode, // Use transactionCode as orderId
        callbackUrl: zibalClient.getCallbackUrl(req.url),
      });

      // Update transaction with Zibal trackId
      const supabaseTx = createClient();
      await supabaseTx
        .from('transactions')
        .update({ zibalTrackId: String(zibalRequest.trackId) })
        .eq('id', transaction.id);

      paymentUrl = zibalRequest.redirectUrl;
      paymentIdentifier = String(zibalRequest.trackId);

      log.info('Zibal transaction created successfully', {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: finalPaymentAmount,
        trackId: zibalRequest.trackId,
        userId: session?.user?.id || 'guest',
        elapsedMs: Date.now() - startTime,
      });
    } else {
      // Zarinpal payment flow (default)
      const paymentRequest = await createPaymentRequest({
        amount: finalPaymentAmount, // In Tomans (no surcharge for Zarinpal)
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

      paymentUrl = paymentRequest.url;
      paymentIdentifier = paymentRequest.authority;

      log.info('Zarinpal transaction created successfully', {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: finalPaymentAmount,
        authority: paymentRequest.authority,
        userId: session?.user?.id || 'guest',
        elapsedMs: Date.now() - startTime,
      });
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: finalPaymentAmount,
      paymentMethod: validPaymentMethod,
      paymentUrl,
      // For compatibility, include identifiers based on payment method
      authority:
        validPaymentMethod === 'ZARINPAL' ? paymentIdentifier : undefined,
      ticket: validPaymentMethod === 'DIGIPAY' ? paymentIdentifier : undefined,
      trackId: validPaymentMethod === 'ZIBAL' ? paymentIdentifier : undefined,
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
