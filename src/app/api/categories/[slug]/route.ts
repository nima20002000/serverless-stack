import { NextRequest, NextResponse } from 'next/server';
import { getCategoryBySlug } from '@/services/category-service';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const category = await getCategoryBySlug(params.slug);

    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی' },
      { status: 500 }
    );
  }
}
