import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getProductMedia,
  addProductMedia,
  batchSyncProductMedia,
} from '@/services/product-service';

export const dynamic = 'force-dynamic';
const MAX_ID_LENGTH = 64;

export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const media = await getProductMedia(params.id);
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Get product media error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to complete request',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { variantId, type, url, alt, order, isDefault } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: 'Product ID and media URL are required' },
        { status: 400 }
      );
    }

    const media = await addProductMedia({
      productId: params.id,
      variantId,
      type,
      url,
      alt,
      order,
      isDefault,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    console.error('Add product media error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to add product media',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/products/[id]/media - Batch sync all media for a product
 * This endpoint handles bulk deletions, additions, and updates in a single request
 * to prevent timeout issues when updating multiple variant images
 */
export async function PUT(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'Invalid product ID' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { delete: toDelete = [], add = [], update = [] } = body;

    // Validate operations structure
    if (
      !Array.isArray(toDelete) ||
      !Array.isArray(add) ||
      !Array.isArray(update)
    ) {
      return NextResponse.json({ error: 'Invalid IDs' }, { status: 400 });
    }

    const result = await batchSyncProductMedia(params.id, {
      delete: toDelete,
      add,
      update,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch sync media error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to sync product media',
      },
      { status: 500 }
    );
  }
}
