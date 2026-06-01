import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { createClient } from '@/lib/supabase/server';
import { bulkDeleteUsers, bulkUpdateUsers } from '@/services/admin-service';

export const dynamic = 'force-dynamic';

interface BulkDeleteRequest {
  userIds: string[];
}

interface BulkUpdateRequest {
  userIds: string[];
  updates: {
    role?: 'USER' | 'ADMIN';
  };
}

// POST /api/admin/users/bulk - Bulk operations on users
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case 'delete':
        return await handleBulkDelete(body as BulkDeleteRequest);
      case 'update':
        return await handleBulkUpdate(
          session.user.id,
          body as BulkUpdateRequest
        );
      default:
        return NextResponse.json(
          { error: 'Invalid bulk action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'Unable to complete bulk operation' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(
  data: BulkDeleteRequest
): Promise<NextResponse> {
  const { userIds } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: 'User IDs are required' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkDeleteUsers(userIds);

    if (result.count === 0) {
      return NextResponse.json(
        {
          error: 'No users were found to delete',
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: `${result.count} users deleted successfully`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to delete users';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}

async function handleBulkUpdate(
  adminUserId: string,
  data: BulkUpdateRequest
): Promise<NextResponse> {
  const { userIds, updates } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: 'User IDs are required' },
      { status: 400 }
    );
  }

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'Invalid update action' },
      { status: 400 }
    );
  }

  if (updates.role === 'USER') {
    if (userIds.includes(adminUserId)) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 403 }
      );
    }

    const supabase = createClient();
    const { data: adminTargets, error } = await supabase
      .from('users')
      .select('id')
      .in('id', userIds)
      .eq('role', 'ADMIN');

    if (error) {
      return NextResponse.json(
        { error: 'Unable to update users' },
        { status: 500 }
      );
    }

    if (adminTargets && adminTargets.length > 0) {
      return NextResponse.json(
        { error: 'Admin roles cannot be changed in bulk' },
        { status: 403 }
      );
    }
  }

  try {
    const result = await bulkUpdateUsers(userIds, updates);

    return NextResponse.json({
      message: `${result.count} users updated successfully`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to update users';
    return NextResponse.json({ error: errorMessage }, { status: 400 });
  }
}
