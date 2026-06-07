import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveProducts,
  createProduct,
  ProductSortOption,
} from '@/services/product-service';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { withLogging } from '@/lib/api/with-logging';
import { withCache } from '@/lib/api/with-cache';
import { localeHeaderName } from '@/lib/i18n/config';
import {
  getLocaleCacheBucket,
  normalizeLocaleForDataFetch,
} from '@/lib/i18n/locale-cache';

export const dynamic = 'force-dynamic';

// Valid sort options for validation
const VALID_SORT_OPTIONS: ProductSortOption[] = [
  'price-asc',
  'price-desc',
  'featured',
  'discount',
  'newest',
];

// GET /api/products - List active products (public)
async function getHandler(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('perPage') || '20');
    const sortByParam = searchParams.get('sortBy');
    const locale = normalizeLocaleForDataFetch(
      searchParams.get('locale') || req.headers.get(localeHeaderName)
    );

    // Validate sortBy parameter
    let sortBy: ProductSortOption = 'newest';
    if (
      sortByParam &&
      VALID_SORT_OPTIONS.includes(sortByParam as ProductSortOption)
    ) {
      sortBy = sortByParam as ProductSortOption;
    }

    const result = await getActiveProducts({ page, perPage, sortBy, locale });

    // Serialize Decimal prices to numbers and ensure discount fields are included
    const serializedProducts = result.data.map(
      (product: (typeof result.data)[number]) => ({
        ...product,
        price: Number(product.price),
        discountPercent: product.discountPercent,
        isFeatured: product.isFeatured,
        variants: product.variants?.map((v) => ({
          ...v,
          priceAdjust: Number(v.priceAdjust),
        })),
      })
    );

    return NextResponse.json({
      ...result,
      data: serializedProducts,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to load products',
      },
      { status: 500 }
    );
  }
}

// POST /api/products - Create product (admin only)
async function postHandler(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      name,
      description,
      price,
      discountPercent,
      stock,
      images,
      categoryId,
      tagIds,
      hasVariants,
      isFeatured,
      isActive,
    } = body;

    if (!name || !description || price === undefined || stock === undefined) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      );
    }

    const product = await createProduct({
      name,
      description,
      price: parseFloat(price),
      discountPercent:
        discountPercent !== undefined && discountPercent !== null
          ? parseInt(discountPercent)
          : null,
      stock: parseInt(stock),
      images: images || [],
      categoryId: categoryId || undefined,
      tagIds: Array.isArray(tagIds) ? tagIds : undefined,
      hasVariants: hasVariants !== undefined ? hasVariants : false,
      isFeatured: isFeatured !== undefined ? isFeatured : false,
      isActive: isActive !== undefined ? isActive : true,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Product created successfully',
        product,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to create product',
      },
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
      const sortBy = req.nextUrl.searchParams.get('sortBy') || 'newest';
      const locale = getLocaleCacheBucket(
        req.nextUrl.searchParams.get('locale') ||
          req.headers.get(localeHeaderName)
      );
      return `products:active:page:${page}:limit:${perPage}:sort:${sortBy}:locale:${locale}`;
    },
    3600 // 60 minutes (1 hour)
  ),
  'GET /api/products'
);
export const POST = withLogging(postHandler, 'POST /api/products');
