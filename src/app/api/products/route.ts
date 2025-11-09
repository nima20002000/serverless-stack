import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts, createProduct } from '@/services/product-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/products - List active products (public)
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');

    const result = await getActiveProducts({ page, perPage });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت محصولات' },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, description, price, stock, images, isActive } = body;

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
      stock: parseInt(stock),
      images: images || [],
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
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در ایجاد محصول' },
      { status: 400 }
    );
  }
}
