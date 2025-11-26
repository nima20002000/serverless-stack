import { NextRequest, NextResponse } from 'next/server';
import { getActiveCategories, getCategoryTree } from '@/services/category-service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree');

    const categories = tree === 'true'
      ? await getCategoryTree()
      : await getActiveCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    const errorMessage = error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی‌ها';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
