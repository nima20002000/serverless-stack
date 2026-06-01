import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import {
  getProductVariants,
  createProductVariant,
  batchCreateProductVariants,
  batchUpdateProductVariants,
} from '@/services/product-service';

export const dynamic = 'force-dynamic';
const MAX_ID_LENGTH = 64;

export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'شناسه محصول نامعتبر است' },
        { status: 400 }
      );
    }

    const variants = await getProductVariants(params.id);
    return NextResponse.json({ variants });
  } catch (error) {
    console.error('Get product variants error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در دریافت انواع محصول',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products/[id]/variants
 * Supports both single variant creation and batch creation
 * - Single: { name, sku, ... } -> { variant }
 * - Batch: { variants: [...] } -> { variants, idMapping }
 */
export async function POST(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'شناسه محصول نامعتبر است' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();

    // Check if this is a batch request
    if (Array.isArray(body.variants)) {
      // Batch creation - validate each variant
      const variantsToCreate = body.variants;

      for (const variant of variantsToCreate) {
        if (!variant.name) {
          return NextResponse.json(
            { error: 'نام نوع محصول الزامی است' },
            { status: 400 }
          );
        }
        if (variant.stock === undefined || variant.stock < 0) {
          return NextResponse.json(
            { error: 'موجودی باید صفر یا بیشتر باشد' },
            { status: 400 }
          );
        }
        if (!variant.tempId) {
          return NextResponse.json(
            { error: 'شناسه موقت واریانت الزامی است' },
            { status: 400 }
          );
        }
      }

      const result = await batchCreateProductVariants(
        params.id,
        variantsToCreate.map(
          (v: {
            tempId: string;
            name: string;
            sku?: string;
            color?: string;
            size?: string;
            material?: string;
            priceAdjust?: number;
            stock: number;
            order?: number;
            isActive?: boolean;
          }) => ({
            tempId: v.tempId,
            name: v.name,
            sku: v.sku || undefined,
            color: v.color || undefined,
            size: v.size || undefined,
            material: v.material || undefined,
            priceAdjust: v.priceAdjust || 0,
            stock: v.stock,
            order: v.order,
            isActive: v.isActive,
          })
        )
      );

      return NextResponse.json(result, { status: 201 });
    }

    // Single variant creation (backward compatibility)
    const { name, sku, color, size, material, priceAdjust, stock, isActive } =
      body;

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
      {
        error:
          error instanceof Error ? error.message : 'خطا در ایجاد نوع محصول',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]/variants
 * Batch update multiple variants in a single request
 * OPTIMIZED: Updates all variants in parallel and recalculates stock only once
 */
export async function PATCH(
  req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ id: string }> }
) {
  try {
    const params = await paramsPromise;
    if (!params.id || params.id.length > MAX_ID_LENGTH) {
      return NextResponse.json(
        { error: 'شناسه محصول نامعتبر است' },
        { status: 400 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const body = await req.json();
    const { variants } = body;

    if (!Array.isArray(variants)) {
      return NextResponse.json(
        { error: 'variants باید آرایه‌ای باشد' },
        { status: 400 }
      );
    }

    // Validate each variant
    for (const variant of variants) {
      if (!variant.id) {
        return NextResponse.json(
          { error: 'شناسه واریانت الزامی است' },
          { status: 400 }
        );
      }
      if (!variant.name) {
        return NextResponse.json(
          { error: 'نام نوع محصول الزامی است' },
          { status: 400 }
        );
      }
      if (variant.stock === undefined || variant.stock < 0) {
        return NextResponse.json(
          { error: 'موجودی باید صفر یا بیشتر باشد' },
          { status: 400 }
        );
      }
    }

    const result = await batchUpdateProductVariants(
      params.id,
      variants.map(
        (v: {
          id: string;
          name: string;
          sku?: string;
          color?: string;
          size?: string;
          material?: string;
          priceAdjust?: number;
          stock: number;
          isActive?: boolean;
        }) => ({
          id: v.id,
          name: v.name,
          sku: v.sku || undefined,
          color: v.color || undefined,
          size: v.size || undefined,
          material: v.material || undefined,
          priceAdjust: v.priceAdjust || 0,
          stock: v.stock,
          isActive: v.isActive,
        })
      )
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Batch update product variants error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'خطا در به‌روزرسانی واریانت‌ها',
      },
      { status: 500 }
    );
  }
}
