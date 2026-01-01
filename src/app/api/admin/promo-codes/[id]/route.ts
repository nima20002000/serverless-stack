import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getPromoCodeById,
  updatePromoCode,
  deletePromoCode,
  togglePromoCodeStatus,
  type UpdatePromoCodeInput,
  type DiscountType,
} from '@/services/promo-service';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/promo-codes/[id]
 * Get single promo code
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;
    const promoCode = await getPromoCodeById(id);

    if (!promoCode) {
      return NextResponse.json({ error: 'کد تخفیف یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ promoCode });
  } catch (error) {
    console.error('Error fetching promo code:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در دریافت کد تخفیف',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/promo-codes/[id]
 * Update promo code
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate discount type if provided
    if (
      body.discountType &&
      !['PERCENT', 'FIXED'].includes(body.discountType)
    ) {
      return NextResponse.json(
        { error: 'نوع تخفیف نامعتبر است' },
        { status: 400 }
      );
    }

    // Validate discount value if provided
    if (body.discountValue !== undefined) {
      const discountValue = parseFloat(body.discountValue);
      if (isNaN(discountValue) || discountValue <= 0) {
        return NextResponse.json(
          { error: 'مقدار تخفیف باید عددی مثبت باشد' },
          { status: 400 }
        );
      }

      // For percentage, max is 100
      const discountType =
        body.discountType || (await getPromoCodeById(id))?.discountType;
      if (discountType === 'PERCENT' && discountValue > 100) {
        return NextResponse.json(
          { error: 'درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد' },
          { status: 400 }
        );
      }
    }

    const input: UpdatePromoCodeInput = {};

    if (body.code !== undefined) input.code = body.code;
    if (body.discountType !== undefined)
      input.discountType = body.discountType as DiscountType;
    if (body.discountValue !== undefined)
      input.discountValue = parseFloat(body.discountValue);
    if (body.expiresAt !== undefined) input.expiresAt = body.expiresAt;
    if (body.maxUsageCount !== undefined)
      input.maxUsageCount = body.maxUsageCount
        ? parseInt(body.maxUsageCount)
        : null;
    if (body.description !== undefined) input.description = body.description;
    if (body.minOrderAmount !== undefined)
      input.minOrderAmount = body.minOrderAmount
        ? parseFloat(body.minOrderAmount)
        : null;
    if (body.maxDiscountAmount !== undefined)
      input.maxDiscountAmount = body.maxDiscountAmount
        ? parseFloat(body.maxDiscountAmount)
        : null;
    if (body.isActive !== undefined) input.isActive = body.isActive;

    const promoCode = await updatePromoCode(id, input);

    return NextResponse.json({
      success: true,
      promoCode,
    });
  } catch (error) {
    console.error('Error updating promo code:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در بروزرسانی کد تخفیف',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/promo-codes/[id]
 * Delete promo code
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;
    await deletePromoCode(id);

    return NextResponse.json({
      success: true,
      message: 'کد تخفیف با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('Error deleting promo code:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در حذف کد تخفیف',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/promo-codes/[id]
 * Toggle active status
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'وضعیت باید true یا false باشد' },
        { status: 400 }
      );
    }

    const promoCode = await togglePromoCodeStatus(id, body.isActive);

    return NextResponse.json({
      success: true,
      promoCode,
    });
  } catch (error) {
    console.error('Error toggling promo code status:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطا در تغییر وضعیت کد تخفیف',
      },
      { status: 500 }
    );
  }
}
