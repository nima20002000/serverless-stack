import { NextRequest, NextResponse } from 'next/server';
import { getAllProducts } from '@/services/product-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';

// GET /api/admin/products - List all products including inactive (admin only)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'دسترسی غیرمجاز' },
        { status: 403 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '50');
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const stock = searchParams.get('stock') || undefined;

    const result = await getAllProducts({
      page,
      perPage,
      includeInactive: true,
      search,
      status,
      stock
    });

    // Serialize Decimal prices to numbers
    const serializedProducts = result.products.map((product) => ({
      ...product,
      price: Number(product.price),
    }));

    return NextResponse.json({
      ...result,
      products: serializedProducts,
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'خطا در دریافت محصولات' },
      { status: 500 }
    );
  }
}
