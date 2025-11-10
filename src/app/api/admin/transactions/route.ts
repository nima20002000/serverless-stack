import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllTransactions } from '@/services/admin-service';
import { TransactionStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status') as TransactionStatus | null;
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

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در دریافت تراکنش‌ها' },
      { status: 500 }
    );
  }
}
