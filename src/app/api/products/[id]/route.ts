import { NextRequest, NextResponse } from 'next/server';
import { getProductById, updateProduct, deleteProduct } from '@/services/product-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

export const dynamic = 'force-dynamic';

// GET /api/products/[id] - Get single product (public)
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const includeRelations = searchParams.get('includeRelations') === 'true';

    const product = await getProductById(params.id, includeRelations);

    // Serialize Decimal to number and handle nested relations
    const serializedProduct = {
      ...product,
      price: Number(product.price),
      ...(('variants' in product && Array.isArray(product.variants)) && {
        variants: product.variants.map((v) => ({
          ...v,
          priceAdjust: Number(v.priceAdjust),
        })),
      }),
    };

    return NextResponse.json({ product: serializedProduct });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'محصول یافت نشد' },
      { status: 404 }
    );
  }
}

// PUT /api/products/[id] - Update product (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, price, discountPercent, stock, images, isFeatured, isActive, categoryId, tagIds } = body;

    type UpdateData = {
      name?: string;
      description?: string;
      price?: number;
      discountPercent?: number | null;
      stock?: number;
      images?: string[];
      isFeatured?: boolean;
      isActive?: boolean;
      categoryId?: string | null;
      tagIds?: string[];
    };

    const updateData: UpdateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent !== null ? parseInt(discountPercent) : null;
    if (stock !== undefined) updateData.stock = parseInt(stock);
    if (images !== undefined) updateData.images = images;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (tagIds !== undefined) updateData.tagIds = tagIds;

    const product = await updateProduct(params.id, updateData);

    return NextResponse.json({
      success: true,
      message: 'محصول با موفقیت به‌روزرسانی شد',
      product,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در به‌روزرسانی محصول' },
      { status: 400 }
    );
  }
}

// DELETE /api/products/[id] - Delete product (admin only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    await deleteProduct(params.id);

    return NextResponse.json({
      success: true,
      message: 'محصول با موفقیت حذف شد',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در حذف محصول' },
      { status: 400 }
    );
  }
}
