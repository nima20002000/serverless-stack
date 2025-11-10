import { NextRequest, NextResponse } from 'next/server';
import { getActiveCategories, getCategoryTree } from '@/services/category-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree');

    const categories = tree === 'true'
      ? await getCategoryTree()
      : await getActiveCategories();

    return NextResponse.json({ categories });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در دریافت دسته‌بندی‌ها' },
      { status: 500 }
    );
  }
}
