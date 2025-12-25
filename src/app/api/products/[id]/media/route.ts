import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { getProductMedia, addProductMedia } from '@/services/product-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const media = await getProductMedia(params.id);
    return NextResponse.json({ media });
  } catch (error) {
    console.error('Get product media error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در دریافت رسانه‌ها',
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { variantId, type, url, alt, order, isDefault } = body;

    if (!type || !url) {
      return NextResponse.json(
        { error: 'نوع و آدرس رسانه الزامی است' },
        { status: 400 }
      );
    }

    const media = await addProductMedia({
      productId: params.id,
      variantId,
      type,
      url,
      alt,
      order,
      isDefault,
    });

    return NextResponse.json({ media }, { status: 201 });
  } catch (error) {
    console.error('Add product media error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در افزودن رسانه' },
      { status: 500 }
    );
  }
}
