import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getDashboardStats } from '@/services/admin-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const stats = await getDashboardStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to complete request';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
