import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts, createProduct } from '@/services/product-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { withCache } from '@/lib/api/with-cache';

export const dynamic = 'force-dynamic';

// GET /api/products - List active products (public)
async function getHandler(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    const result = await getActiveProducts({ page, perPage });

    // Serialize Decimal prices to numbers and ensure discount fields are included
    const serializedProducts = result.data.map((product: typeof result.data[number]) => ({
      ...product,
      price: Number(product.price),
      discountPercent: product.discountPercent,
      isFeatured: product.isFeatured,
    }));

    return NextResponse.json({
      ...result,
      data: serializedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت محصولات' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product (admin only)
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, price, discountPercent, stock, images, isFeatured, isActive } = body;

    if (!name || !description || price === undefined || stock === undefined) {
      return NextResponse.json(
        { error: 'تمام فیلدهای الزامی را وارد کنید' },
        { status: 400 }
      );
    }

    const product = await createProduct({
      name,
      description,
      price: parseFloat(price),
      discountPercent: discountPercent !== undefined && discountPercent !== null ? parseInt(discountPercent) : null,
      stock: parseInt(stock),
      images: images || [],
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'محصول با موفقیت ایجاد شد',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در ایجاد محصول' },
      { status: 400 }
    );
  }
}

export const GET = withLogging(
  withCache(
    getHandler,
    (req) => {
      const page = req.nextUrl.searchParams.get('page') || '1';
      const perPage = req.nextUrl.searchParams.get('perPage') || '20';
      return `products:active:page:${page}:limit:${perPage}`;
    },
    3600 // 60 minutes (1 hour)
  ),
  'GET /api/products'
);
export const POST = withLogging(postHandler, 'POST /api/products');
