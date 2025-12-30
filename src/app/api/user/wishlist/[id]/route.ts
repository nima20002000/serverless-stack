import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { removeFromWishlist } from '@/services/wishlist-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// DELETE /api/user/wishlist/[id] - Remove item from wishlist by ID
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'شناسه آیتم الزامی است' },
        { status: 400 }
      );
    }

    const result = await removeFromWishlist(session.user.id, id);

    log.info('DELETE /api/user/wishlist/[id]', {
      userId: session.user.id,
      wishlistItemId: id,
      duration: `${Date.now() - startTime}ms`,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Error removing from wishlist by ID', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${Date.now() - startTime}ms`,
    });
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
