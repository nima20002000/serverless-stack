import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/options';
import { reorderProducts } from '@/services/product-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/products/reorder
 * Reorder products by updating displayOrder field
 * Admin only
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { productOrders } = body;

    // Validate input
    if (!Array.isArray(productOrders) || productOrders.length === 0) {
      return NextResponse.json({ error: 'داده‌های نامعتبر' }, { status: 400 });
    }

    // Validate each order item
    for (const item of productOrders) {
      if (!item.id || typeof item.displayOrder !== 'number') {
        return NextResponse.json(
          { error: 'فرمت داده‌های نامعتبر' },
          { status: 400 }
        );
      }
    }

    // Reorder products
    await reorderProducts(productOrders);

    log.info('Products reordered via API', {
      adminId: session.user.id,
      count: productOrders.length,
    });

    return NextResponse.json({
      success: true,
      message: 'ترتیب محصولات با موفقیت به‌روزرسانی شد',
    });
  } catch (error) {
    log.error('Failed to reorder products', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'خطا در به‌روزرسانی ترتیب محصولات' },
      { status: 500 }
    );
  }
}
