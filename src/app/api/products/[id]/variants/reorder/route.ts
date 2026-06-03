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
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  const params = await paramsPromise;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const productId = params.id;
    const body = await req.json();
    const { variantOrders } = body;

    // Validate input
    if (!Array.isArray(variantOrders)) {
      return NextResponse.json(
        { error: 'variantOrders must be an array of { id, order } objects' },
        { status: 400 }
      );
    }

    for (const item of variantOrders) {
      if (!item.id || typeof item.order !== 'number') {
        return NextResponse.json(
          { error: 'Variant ID and display order are required' },
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
      message: 'Product variants reordered successfully',
    });
  } catch (error) {
    log.error('Failed to reorder variants', {
      error: error instanceof Error ? error.message : 'Unknown error',
      productId: params.id,
    });

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to update product variants',
      },
      { status: 500 }
    );
  }
}
