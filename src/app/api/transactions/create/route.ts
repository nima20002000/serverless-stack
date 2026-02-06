import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createClient } from '@/lib/supabase/server';
import {
  createTransaction,
  verifyStockAvailability,
} from '@/services/transaction-service';
import { updateUserShippingInfo } from '@/services/user-service';
import { validatePromoCode } from '@/services/promo-service';
import {
  createStripeCheckoutSession,
  getStripeCurrency,
} from '@/lib/stripe/client';
import { createPayPalOrder, getPayPalCurrency } from '@/lib/paypal/client';
import { withLogging } from '@/lib/api/with-logging';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { apiLimiter } from '@/lib/rate-limit';
import { getClientInfo } from '@/lib/request-utils';
import { log } from '@/lib/logger';
import { getAppBaseUrl } from '@/lib/utils/url';

export const dynamic = 'force-dynamic';

// POST /api/transactions/create - Create transaction and initiate payment
async function postHandler(req: NextRequest) {
  const startTime = Date.now();
  // Extract client info for storing in transaction
  const { ipAddress, userAgent } = getClientInfo(req);

  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { items, shippingInfo, paymentMethod, promoCode } = body;

    log.info('Transaction creation started', {
      userId: session?.user?.id || 'guest',
      itemCount: items?.length || 0,
      paymentMethod: paymentMethod || 'STRIPE',
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
    });

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'سبد خرید خالی است' }, { status: 400 });
    }

    for (const item of items) {
      if (!item || typeof item.productId !== 'string' || !item.productId) {
        return NextResponse.json(
          { error: 'آیتم‌های سبد خرید نامعتبر است' },
          { status: 400 }
        );
      }

      if (
        item.variantId !== undefined &&
        item.variantId !== null &&
        typeof item.variantId !== 'string'
      ) {
        return NextResponse.json(
          { error: 'شناسه نوع محصول نامعتبر است' },
          { status: 400 }
        );
      }

      const quantity = Number(item.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        return NextResponse.json(
          { error: 'تعداد باید عدد صحیح بزرگتر از صفر باشد' },
          { status: 400 }
        );
      }

      item.quantity = quantity;
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
        unavailableProductIds: stockCheck.unavailableProductIds,
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
          unavailableProductIds: stockCheck.unavailableProductIds,
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

    // BATCH: Fetch all products in one query to avoid N+1
    const supabaseBatch = createClient();
    const productIds = [...new Set(items.map((i) => i.productId))];
    const { data: products, error: productsError } = await supabaseBatch
      .from('products')
      .select('id, name, price, discountPercent, isActive, hasVariants')
      .in('id', productIds);

    if (productsError || !products) {
      log.error('Failed to fetch products for transaction', {
        error: productsError,
      });
      return NextResponse.json(
        { error: 'خطا در دریافت اطلاعات محصولات' },
        { status: 500 }
      );
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // BATCH: Fetch all variants in one query if any items have variants
    const variantIds = items
      .filter((i) => i.variantId)
      .map((i) => i.variantId as string);
    const variantMap = new Map<
      string,
      { priceAdjust: number; isActive: boolean; productId: string }
    >();

    if (variantIds.length > 0) {
      const { data: variants, error: variantsError } = await supabaseBatch
        .from('product_variants')
        .select('id, priceAdjust, isActive, productId')
        .in('id', variantIds);

      if (variantsError) {
        log.error('Failed to fetch variants for transaction', {
          error: variantsError,
        });
        return NextResponse.json(
          { error: 'خطا در دریافت اطلاعات واریانت‌ها' },
          { status: 500 }
        );
      }

      if (variants) {
        for (const v of variants) {
          variantMap.set(v.id, {
            priceAdjust: v.priceAdjust,
            isActive: v.isActive,
            productId: v.productId,
          });
        }
      }
    }

    // Now process items using the pre-fetched data
    for (const item of items) {
      const product = productMap.get(item.productId);

      if (!product) {
        return NextResponse.json({ error: 'محصول یافت نشد' }, { status: 400 });
      }

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
        const variant = variantMap.get(item.variantId);

        if (!variant) {
          log.error('Variant not found', {
            variantId: item.variantId,
            productId: product.id,
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

        if (variant.productId !== product.id) {
          log.warn('Variant does not belong to product', {
            variantId: item.variantId,
            productId: product.id,
            variantProductId: variant.productId,
          });
          return NextResponse.json(
            { error: `واریانت محصول ${product.name} نامعتبر است` },
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

    // Store subtotal before any promo discount
    const subtotal = totalAmount;

    // Validate and apply promo code if provided
    let promoCodeId: string | undefined;
    let discountAmount = 0;

    if (promoCode) {
      const promoResult = await validatePromoCode(
        promoCode,
        subtotal,
        session?.user?.id
      );

      if (!promoResult.valid) {
        return NextResponse.json(
          { error: promoResult.error || 'کد تخفیف نامعتبر است' },
          { status: 400 }
        );
      }

      if (promoResult.promoCode) {
        promoCodeId = promoResult.promoCode.id;
        discountAmount = promoResult.discountAmount || 0;
        totalAmount = subtotal - discountAmount;

        log.info('Promo code applied', {
          code: promoCode,
          promoCodeId,
          subtotal,
          discountAmount,
          finalAmount: totalAmount,
          discountType: promoResult.promoCode.discountType,
          discountValue: promoResult.promoCode.discountValue,
        });
      }
    }

    // Enforce strict payment contract for active providers only.
    const requestedGateway =
      typeof paymentMethod === 'string'
        ? paymentMethod.trim().toUpperCase()
        : 'STRIPE';
    const validPaymentMethod =
      requestedGateway === 'PAYPAL' ? 'PAYPAL' : 'STRIPE';

    if (requestedGateway !== 'STRIPE' && requestedGateway !== 'PAYPAL') {
      return NextResponse.json(
        { error: 'روش پرداخت نامعتبر است' },
        { status: 400 }
      );
    }

    // Active providers currently have no gateway surcharge.
    const gatewayFee = 0;
    const paymentGatewayAmount = totalAmount;

    log.info('Payment amount calculation', {
      baseAmount: totalAmount,
      gatewayFee,
      paymentGatewayAmount,
      paymentMethod: validPaymentMethod,
    });

    // Create transaction in database with shipping info
    // Store the amount and provider metadata for webhook reconciliation.
    const transaction = await createTransaction({
      userId: session?.user?.id, // Optional for guest users
      items: transactionItems,
      amount: totalAmount,
      gatewayFee,
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
      // Promo code fields
      promoCodeId,
      discountAmount,
      subtotal,
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
    let paymentIdentifier: string; // checkout session ID or PayPal order ID

    if (requestedGateway === 'STRIPE') {
      const stripeCurrency = getStripeCurrency();
      const stripeSession = await createStripeCheckoutSession({
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: paymentGatewayAmount,
        currency: stripeCurrency,
        customerEmail: finalEmail,
      });

      if (!stripeSession.url) {
        log.error('Stripe Checkout session missing redirect URL', {
          transactionId: transaction.id,
          transactionCode: transaction.transactionCode,
          sessionId: stripeSession.id,
        });
        throw new Error('خطا در ایجاد لینک پرداخت استرایپ');
      }

      const stripePaymentIntentId =
        typeof stripeSession.payment_intent === 'string'
          ? stripeSession.payment_intent
          : null;

      const supabaseTx = createClient();
      const { error: stripeUpdateError } = await supabaseTx
        .from('transactions')
        .update({
          paymentProviderRef: stripeSession.id,
          stripeCheckoutSessionId: stripeSession.id,
          stripePaymentIntentId,
          paymentMetadata: {
            provider: 'STRIPE',
            checkoutSessionId: stripeSession.id,
            paymentIntentId: stripePaymentIntentId,
            currency: stripeCurrency.toUpperCase(),
          },
        })
        .eq('id', transaction.id);

      if (stripeUpdateError) {
        log.error('Failed to persist Stripe provider identifiers', {
          transactionId: transaction.id,
          transactionCode: transaction.transactionCode,
          sessionId: stripeSession.id,
          error: stripeUpdateError,
        });
        throw new Error('خطا در ثبت اطلاعات پرداخت استرایپ');
      }

      paymentUrl = stripeSession.url;
      paymentIdentifier = stripeSession.id;

      log.info('Stripe transaction created successfully', {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: totalAmount,
        paymentGatewayAmount,
        checkoutSessionId: stripeSession.id,
        paymentIntentId: stripePaymentIntentId,
        userId: session?.user?.id || 'guest',
        elapsedMs: Date.now() - startTime,
      });
    } else if (requestedGateway === 'PAYPAL') {
      const paypalCurrency = getPayPalCurrency();
      const appBaseUrl = getAppBaseUrl().replace(/\/$/, '');
      const returnUrl = `${appBaseUrl}/api/transactions/paypal/capture?transactionId=${encodeURIComponent(transaction.id)}`;
      const cancelUrl = `${appBaseUrl}/payment/failure?code=${encodeURIComponent(transaction.transactionCode)}&provider=paypal&status=cancelled`;

      const paypalOrder = await createPayPalOrder({
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: paymentGatewayAmount,
        currency: paypalCurrency,
        returnUrl,
        cancelUrl,
        description: `Kitia order ${transaction.transactionCode}`,
      });

      const supabaseTx = createClient();
      const { error: paypalUpdateError } = await supabaseTx
        .from('transactions')
        .update({
          paymentProviderRef: paypalOrder.id,
          paypalOrderId: paypalOrder.id,
          paymentMetadata: {
            provider: 'PAYPAL',
            orderId: paypalOrder.id,
            currency: paypalCurrency,
          },
        })
        .eq('id', transaction.id);

      if (paypalUpdateError) {
        log.error('Failed to persist PayPal provider identifiers', {
          transactionId: transaction.id,
          transactionCode: transaction.transactionCode,
          orderId: paypalOrder.id,
          error: paypalUpdateError,
        });
        throw new Error('خطا در ثبت اطلاعات پرداخت پی‌پال');
      }

      paymentUrl = paypalOrder.approvalUrl;
      paymentIdentifier = paypalOrder.id;

      log.info('PayPal transaction created successfully', {
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        amount: totalAmount,
        paymentGatewayAmount,
        orderId: paypalOrder.id,
        orderStatus: paypalOrder.status,
        userId: session?.user?.id || 'guest',
        elapsedMs: Date.now() - startTime,
      });
    } else {
      return NextResponse.json(
        { error: 'روش پرداخت نامعتبر است' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      amount: totalAmount, // Return base amount (without gateway fee) to frontend
      paymentMethod: validPaymentMethod,
      paymentUrl,
      checkoutSessionId:
        requestedGateway === 'STRIPE' ? paymentIdentifier : undefined,
      orderId: requestedGateway === 'PAYPAL' ? paymentIdentifier : undefined,
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
