import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { getUserTransactions } from '@/services/user-service';

export const dynamic = 'force-dynamic';

// GET /api/user/transactions - Get current user's transaction history
async function getHandler(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'برای دسترسی به این صفحه باید وارد شوید' },
        { status: 401 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status') as 'PENDING' | 'COMPLETED' | 'FAILED' | null;

    // Get transactions using service
    const result = await getUserTransactions(session.user.id, {
      limit,
      offset,
      ...(status && { status }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در بارگذاری تراکنش‌ها' },
      { status: 500 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/user/transactions');
