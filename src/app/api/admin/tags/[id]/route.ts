import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getTagById, updateTag, deleteTag } from '@/services/tag-service';

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

    const tag = await getTagById(params.id);

    if (!tag) {
      return NextResponse.json({ error: 'برچسب یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Get tag error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در دریافت برچسب';
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
    const tag = await updateTag(params.id, body);

    return NextResponse.json({ tag });
  } catch (error) {
    console.error('Update tag error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در به‌روزرسانی برچسب';
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

    await deleteTag(params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete tag error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در حذف برچسب';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
