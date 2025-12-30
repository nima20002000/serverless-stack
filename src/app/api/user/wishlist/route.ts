import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlistByProduct,
} from '@/services/wishlist-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/user/wishlist - Get user's wishlist
async function getHandler() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const wishlist = await getUserWishlist(session.user.id);

    return NextResponse.json(wishlist);
  } catch (error) {
    log.error('Error fetching wishlist', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطا در دریافت علاقه‌مندی‌ها',
      },
      { status: 500 }
    );
  }
}

// POST /api/user/wishlist - Add item to wishlist
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId, variantId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'شناسه محصول الزامی است' },
        { status: 400 }
      );
    }

    const wishlistItem = await addToWishlist(
      session.user.id,
      productId,
      variantId || null
    );

    return NextResponse.json(wishlistItem, { status: 201 });
  } catch (error) {
    log.error('Error adding to wishlist', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطا در افزودن به علاقه‌مندی‌ها',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/user/wishlist - Remove item from wishlist by product/variant
// Body: { productId: string, variantId?: string }
async function deleteHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { productId, variantId } = body;

    if (!productId) {
      return NextResponse.json(
        { error: 'شناسه محصول الزامی است' },
        { status: 400 }
      );
    }

    const result = await removeFromWishlistByProduct(
      session.user.id,
      productId,
      variantId
    );

    return NextResponse.json(result);
  } catch (error) {
    log.error('Error removing from wishlist', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطا در حذف از علاقه‌مندی‌ها',
      },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/wishlist');
export const POST = withLogging(postHandler, 'POST /api/user/wishlist');
export const DELETE = withLogging(deleteHandler, 'DELETE /api/user/wishlist');
