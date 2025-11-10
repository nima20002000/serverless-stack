import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  updateProductVariant,
  deleteProductVariant,
} from '@/services/product-service';

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
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

    const variant = await updateProductVariant(params.variantId, {
      name,
      sku,
      color,
      size,
      material,
      priceAdjust: priceAdjust || 0,
      stock,
      isActive,
    });

    return NextResponse.json({ variant });
  } catch (error: any) {
    console.error('Update product variant error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در به‌روزرسانی نوع محصول' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; variantId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    await deleteProductVariant(params.variantId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete product variant error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در حذف نوع محصول' },
      { status: 500 }
    );
  }
}
