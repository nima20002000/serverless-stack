import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getTagById, updateTag, deleteTag } from '@/services/tag-service';

export async function GET(
  req: NextRequest,
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
  } catch (error: any) {
    console.error('Get tag error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در دریافت برچسب' },
      { status: 500 }
    );
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
  } catch (error: any) {
    console.error('Update tag error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در به‌روزرسانی برچسب' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteTag(params.id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete tag error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در حذف برچسب' },
      { status: 500 }
    );
  }
}
