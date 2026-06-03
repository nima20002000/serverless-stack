import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getTransactionById } from '@/services/admin-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const transaction = await getTransactionById(params.id);
    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Error fetching transaction:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to load transaction';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
