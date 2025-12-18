import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { deleteProductMedia, updateProductMedia } from '@/services/product-service-supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { alt, order, isDefault } = body;

    const media = await updateProductMedia(params.mediaId, {
      alt,
      order,
      isDefault,
    });

    return NextResponse.json({ media });
  } catch (error) {
    console.error('Update product media error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در بروزرسانی رسانه' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteProductMedia(params.mediaId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete product media error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در حذف رسانه' },
      { status: 500 }
    );
  }
}
