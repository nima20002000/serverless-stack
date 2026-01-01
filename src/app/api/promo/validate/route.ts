import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { validatePromoCode } from '@/services/promo-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/promo/validate
 * Validate a promo code and return discount preview
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, subtotal } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'کد تخفیف الزامی است' },
        { status: 400 }
      );
    }

    if (!subtotal || subtotal <= 0) {
      return NextResponse.json(
        { error: 'مبلغ سفارش نامعتبر است' },
        { status: 400 }
      );
    }

    // Get user session if available
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    // Validate the promo code
    const result = await validatePromoCode(code, subtotal, userId);

    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Return success with discount info
    return NextResponse.json({
      valid: true,
      code: result.promoCode?.code,
      discountType: result.promoCode?.discountType,
      discountValue: result.promoCode?.discountValue,
      discountAmount: result.discountAmount,
      finalAmount: subtotal - (result.discountAmount || 0),
    });
  } catch (error) {
    console.error('Error validating promo code:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در بررسی کد تخفیف',
      },
      { status: 500 }
    );
  }
}
