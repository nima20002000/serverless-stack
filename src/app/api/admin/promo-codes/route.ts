import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getAllPromoCodes,
  createPromoCode,
  type CreatePromoCodeInput,
  type DiscountType,
} from '@/services/promo-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/promo-codes
 * List all promo codes with pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const result = await getAllPromoCodes({ page, perPage, activeOnly });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching promo codes:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در دریافت کدهای تخفیف',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/promo-codes
 * Create a new promo code
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await request.json();

    // Validate required fields
    if (
      !body.code ||
      !body.discountType ||
      !body.discountValue ||
      !body.expiresAt
    ) {
      return NextResponse.json(
        { error: 'لطفاً تمام فیلدهای ضروری را پر کنید' },
        { status: 400 }
      );
    }

    // Validate discount type
    if (!['PERCENT', 'FIXED'].includes(body.discountType)) {
      return NextResponse.json(
        { error: 'نوع تخفیف نامعتبر است' },
        { status: 400 }
      );
    }

    // Validate discount value
    const discountValue = parseFloat(body.discountValue);
    if (isNaN(discountValue) || discountValue <= 0) {
      return NextResponse.json(
        { error: 'مقدار تخفیف باید عددی مثبت باشد' },
        { status: 400 }
      );
    }

    // For percentage, max is 100
    if (body.discountType === 'PERCENT' && discountValue > 100) {
      return NextResponse.json(
        { error: 'درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد' },
        { status: 400 }
      );
    }

    const input: CreatePromoCodeInput = {
      code: body.code,
      discountType: body.discountType as DiscountType,
      discountValue,
      expiresAt: body.expiresAt,
      maxUsageCount: body.maxUsageCount
        ? parseInt(body.maxUsageCount)
        : undefined,
      description: body.description || undefined,
      minOrderAmount: body.minOrderAmount
        ? parseFloat(body.minOrderAmount)
        : undefined,
      maxDiscountAmount: body.maxDiscountAmount
        ? parseFloat(body.maxDiscountAmount)
        : undefined,
      isActive: body.isActive ?? true,
    };

    const promoCode = await createPromoCode(input);

    return NextResponse.json({
      success: true,
      promoCode,
    });
  } catch (error) {
    console.error('Error creating promo code:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در ایجاد کد تخفیف',
      },
      { status: 500 }
    );
  }
}
