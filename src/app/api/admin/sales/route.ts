import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getSalesAnalytics,
  parseSalesAnalyticsFilters,
} from '@/services/sales-analytics-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const filters = parseSalesAnalyticsFilters(request.nextUrl.searchParams);
    const analytics = await getSalesAnalytics(filters);

    return NextResponse.json(analytics);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load sales analytics';
    const status =
      message.includes('startDate') ||
      message.includes('endDate') ||
      message.includes('groupBy') ||
      message.includes('Date range')
        ? 400
        : 500;

    log.error('Error fetching sales analytics', { error, status });
    return NextResponse.json({ error: message }, { status });
  }
}
