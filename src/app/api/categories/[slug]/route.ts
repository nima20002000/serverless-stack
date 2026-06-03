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
        { error: 'Invalid category ID' },
        { status: 400 }
      );
    }

    const category = await getCategoryBySlug(slug);

    if (!category) {
      return NextResponse.json(
        { error: 'Category not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Get category error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unable to load category',
      },
      { status: 500 }
    );
  }
}
