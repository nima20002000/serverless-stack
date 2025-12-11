import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { reorderProductVariants } from '@/services/product-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/products/[id]/variants/reorder
 * Reorder product variants (Admin only)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const productId = params.id;
    const body = await req.json();
    const { variantOrders } = body;

    // Validate input
    if (!Array.isArray(variantOrders)) {
      return NextResponse.json(
        { error: 'variantOrders باید آرایه‌ای از {id, order} باشد' },
        { status: 400 }
      );
    }

    for (const item of variantOrders) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'هر آیتم باید شامل id و order باشد' },
          { status: 400 }
        );
      }
    }

    // Reorder variants
    await reorderProductVariants(productId, variantOrders);

    log.info('Variants reordered successfully', {
      productId,
      count: variantOrders.length,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'ترتیب واریانت‌ها با موفقیت به‌روز شد',
    });
  } catch (error) {
    log.error('Failed to reorder variants', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: params.id,
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'خطا در به‌روزرسانی ترتیب واریانت‌ها',
      },
      { status: 500 }
    );
  }
}
