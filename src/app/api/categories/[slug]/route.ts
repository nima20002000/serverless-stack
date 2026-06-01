import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBySlug } from '@/services/category-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params: paramsPromise }: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await paramsPromise;
    const slug = params.slug;
    if (!slug || slug.length > 120) {
      return NextResponse.json(
        { error: 'شناسه دسته‌بندی نامعتبر است' },
        { status: 400 }
      );
    }

    const category = await getCategoryBySlug(slug);

    if (!category) {
      return NextResponse.json(
        { error: 'دسته‌بندی یافت نشد' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی',
      },
      { status: 500 }
    );
  }
}
