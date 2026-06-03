import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  bulkDeleteProducts,
  bulkUpdateProducts,
} from '@/services/product-service';

export const dynamic = 'force-dynamic';

interface BulkDeleteRequest {
  productIds: string[];
}

interface BulkUpdateRequest {
  productIds: string[];
  updates: {
    isActive?: boolean;
    stock?: number;
  };
}

// POST /api/admin/products/bulk - Bulk operations on products
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case 'delete':
        return await handleBulkDelete(body as BulkDeleteRequest);
      case 'update':
        return await handleBulkUpdate(body as BulkUpdateRequest);
      default:
        return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Unable to complete bulk operation' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(
  data: BulkDeleteRequest
): Promise<NextResponse> {
  const { productIds } = data;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { error: 'Product IDs are required' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkDeleteProducts(productIds);

    return NextResponse.json({
      message: `${result.count} Product deleted successfully`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to delete products';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

async function handleBulkUpdate(
  data: BulkUpdateRequest
): Promise<NextResponse> {
  const { productIds, updates } = data;

  if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
    return NextResponse.json(
      { error: 'Product IDs are required' },
      { status: 400 }
    );
  }

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Invalid update action' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkUpdateProducts(productIds, updates);

    return NextResponse.json({
      message: `${result.count} Product updated successfully`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to update products';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
