import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveCategories,
  getCategoryTree,
} from '@/services/category-service';
import { withLogging } from '@/lib/api/with-logging';
import { withCache } from '@/lib/api/with-cache';

export const dynamic = 'force-dynamic';

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree');

    const categories =
      tree === 'true' ? await getCategoryTree() : await getActiveCategories();

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'خطا در دریافت دسته‌بندی‌ها';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const GET = withLogging(
  withCache(
    getHandler,
    (req) => {
      const tree = req.nextUrl.searchParams.get('tree');
      return tree === 'true' ? 'categories:tree' : 'categories:active';
    },
    600 // 10 minutes
  ),
  'GET /api/categories'
);
