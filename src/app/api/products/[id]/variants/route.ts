import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getProductVariants,
  createProductVariant,
} from '@/services/product-service';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const variants = await getProductVariants(params.id);
    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Get product variants error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت انواع محصول' },
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
    const { name, sku, color, size, material, priceAdjust, stock, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'نام نوع محصول الزامی است' },
        { status: 400 }
      );
    }

    if (stock === undefined || stock < 0) {
      return NextResponse.json(
        { error: 'موجودی باید صفر یا بیشتر باشد' },
        { status: 400 }
      );
    }

    const variant = await createProductVariant({
      productId: params.id,
      name,
      sku,
      color,
      size,
      material,
      priceAdjust: priceAdjust || 0,
      stock,
      isActive,
    });

    return NextResponse.json({ variant }, { status: 201 });
  } catch (error) {
    console.error('Create product variant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در ایجاد نوع محصول' },
      { status: 500 }
    );
  }
}
