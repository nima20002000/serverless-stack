import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { mergeWishlist, getUserWishlist } from '@/services/wishlist-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST /api/user/wishlist/merge - Merge local wishlist items into server wishlist
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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: 'لیست محصولات نامعتبر است' },
        { status: 400 }
      );
    }

    // Validate and sanitize items
    const sanitizedItems = items
      .filter(
        (item: unknown): item is { productId: string; variantId?: string } =>
          typeof item === 'object' &&
          item !== null &&
          'productId' in item &&
          typeof (item as { productId: unknown }).productId === 'string'
      )
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId || null,
      }));

    if (sanitizedItems.length === 0) {
      // No valid items to merge, just return current wishlist
      const wishlist = await getUserWishlist(session.user.id);
      return NextResponse.json({
        merged: { added: 0, skipped: 0 },
        wishlist,
      });
    }

    // Merge the items
    const mergeResult = await mergeWishlist(session.user.id, sanitizedItems);

    // Return the merged wishlist
    const wishlist = await getUserWishlist(session.user.id);

    return NextResponse.json({
      merged: mergeResult,
      wishlist,
    });
  } catch (error) {
    log.error('Error merging wishlist', { error });
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در ادغام علاقه‌مندی‌ها';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const POST = withLogging(postHandler, 'POST /api/user/wishlist/merge');
