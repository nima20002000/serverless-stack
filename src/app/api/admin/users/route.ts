import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getAllUsers } from '@/services/admin-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Get query params
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;

    // Get users
    const result = await getAllUsers(page, limit, search, role);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching users:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در دریافت کاربران';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
