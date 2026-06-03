import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { getWishlistProductIds } from '@/services/wishlist-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/user/wishlist/check - Bulk check if products are in wishlist
// Body: { productIds: string[] } or empty to get all
async function postHandler(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication is required' },
        { status: 401 }
      );
    }

    const wishlistSet = await getWishlistProductIds(session.user.id);

    // Convert Set to array for JSON response
    const wishlistProductIds = Array.from(wishlistSet);

    return NextResponse.json({ productIds: wishlistProductIds });
  } catch (error) {
    log.error('Error checking wishlist', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to complete request',
      },
      { status: 500 }
    );
  }
}

// GET version for simpler usage
async function getHandler() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication is required' },
        { status: 401 }
      );
    }

    const wishlistSet = await getWishlistProductIds(session.user.id);
    const wishlistProductIds = Array.from(wishlistSet);

    return NextResponse.json({ productIds: wishlistProductIds });
  } catch (error) {
    log.error('Error checking wishlist', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to complete request',
      },
      { status: 500 }
    );
  }
}

export const POST = withLogging(postHandler, 'POST /api/user/wishlist/check');
export const GET = withLogging(getHandler, 'GET /api/user/wishlist/check');
