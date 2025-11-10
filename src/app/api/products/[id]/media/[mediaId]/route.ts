import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { deleteProductMedia } from '@/services/product-service';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; mediaId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteProductMedia(params.mediaId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product media error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در حذف رسانه' },
      { status: 500 }
    );
  }
}
