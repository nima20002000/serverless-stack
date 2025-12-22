import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/services/category-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const category = await getCategoryById(params.id);

    if (!category) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const category = await updateCategory(params.id, body);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در به‌روزرسانی دسته‌بندی';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteCategory(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در حذف دسته‌بندی';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
