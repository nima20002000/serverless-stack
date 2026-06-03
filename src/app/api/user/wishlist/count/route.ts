import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { getWishlistCount } from '@/services/wishlist-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/user/wishlist/count - Get wishlist item count
async function getHandler() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication is required' },
        { status: 401 }
      );
    }

    const count = await getWishlistCount(session.user.id);

    return NextResponse.json({ count });
  } catch (error) {
    log.error('Error getting wishlist count', { error });
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to load wishlist count',
      },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/wishlist/count');
