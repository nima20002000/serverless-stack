import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllTransactions } from '@/services/admin-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    log.info('Admin transactions request', {
      hasSession: !!session,
      role: session?.user?.role,
    });

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as
      | 'PENDING'
      | 'COMPLETED'
      | 'FAILED'
      | null;
    const search = searchParams.get('search') || undefined;
    const dateFrom = searchParams.get('dateFrom') || undefined;
    const dateTo = searchParams.get('dateTo') || undefined;

    // Get transactions
    const result = await getAllTransactions(
      page,
      limit,
      status || undefined,
      search,
      dateFrom,
      dateTo
    );

    log.info('Admin transactions fetched', {
      count: result.data?.length,
      total: result.total,
    });

    return NextResponse.json(result);
  } catch (error) {
    log.error('Error fetching transactions', { error });
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to load transactions';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
