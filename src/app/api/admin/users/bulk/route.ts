import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import prisma from '@/lib/prisma/client';

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

    if (!session?.user || (session.user as { role: string }).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      case 'delete':
        return await handleBulkDelete(body as BulkDeleteRequest);
      case 'update':
        return await handleBulkUpdate(body as BulkUpdateRequest);
      default:
        return NextResponse.json(
          { error: 'عملیات نامعتبر است' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error in bulk operation:', error);
    return NextResponse.json(
      { error: 'خطا در انجام عملیات گروهی' },
      { status: 500 }
    );
  }
}

async function handleBulkDelete(data: BulkDeleteRequest): Promise<NextResponse> {
  const { userIds } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: 'شناسه کاربران نامعتبر است' },
      { status: 400 }
    );
  }

  // Prevent deleting admin users
  const usersToDelete = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      role: 'USER', // Only allow deleting non-admin users
    },
    select: { id: true },
  });

  if (usersToDelete.length === 0) {
    return NextResponse.json(
      { error: 'هیچ کاربری برای حذف یافت نشد (فقط کاربران عادی قابل حذف هستند)' },
      { status: 400 }
    );
  }

  const result = await prisma.user.deleteMany({
    where: {
      id: {
        in: usersToDelete.map(u => u.id),
      },
    },
  });

  return NextResponse.json({
    message: `${result.count} کاربر با موفقیت حذف شد`,
    count: result.count,
  });
}

async function handleBulkUpdate(data: BulkUpdateRequest): Promise<NextResponse> {
  const { userIds, updates } = data;

  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json(
      { error: 'شناسه کاربران نامعتبر است' },
      { status: 400 }
    );
  }

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'داده‌های به‌روزرسانی نامعتبر است' },
      { status: 400 }
    );
  }

  const result = await prisma.user.updateMany({
    where: {
      id: {
        in: userIds,
      },
    },
    data: updates,
  });

  return NextResponse.json({
    message: `${result.count} کاربر با موفقیت به‌روزرسانی شد`,
    count: result.count,
  });
}
