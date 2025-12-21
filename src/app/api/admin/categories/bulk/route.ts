import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { bulkDeleteCategories, bulkUpdateCategories } from '@/services/category-service';

export const dynamic = 'force-dynamic';

interface BulkDeleteRequest {
  categoryIds: string[];
}

interface BulkUpdateRequest {
  categoryIds: string[];
  updates: {
    isActive?: boolean;
  };
}

// POST /api/admin/categories/bulk - Bulk operations on categories
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
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
  const { categoryIds } = data;

  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return NextResponse.json(
      { error: 'شناسه دسته‌بندی‌ها نامعتبر است' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkDeleteCategories(categoryIds);

    return NextResponse.json({
      message: `${result.count} دسته‌بندی با موفقیت حذف شد`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطا در حذف دسته‌بندی‌ها';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}

async function handleBulkUpdate(data: BulkUpdateRequest): Promise<NextResponse> {
  const { categoryIds, updates } = data;

  if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
    return NextResponse.json(
      { error: 'شناسه دسته‌بندی‌ها نامعتبر است' },
      { status: 400 }
    );
  }

  if (!updates || Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'داده‌های به‌روزرسانی نامعتبر است' },
      { status: 400 }
    );
  }

  try {
    const result = await bulkUpdateCategories(categoryIds, updates);

    return NextResponse.json({
      message: `${result.count} دسته‌بندی با موفقیت به‌روزرسانی شد`,
      count: result.count,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'خطا در بروزرسانی دسته‌بندی‌ها';
    return NextResponse.json(
      { error: errorMessage },
      { status: 400 }
    );
  }
}
