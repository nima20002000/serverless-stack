import { NextRequest, NextResponse } from 'next/server';
import { searchTags } from '@/services/tag-service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q') || '';

    if (!query) {
      return NextResponse.json({ tags: [] });
    }

    const tags = await searchTags(query);
    return NextResponse.json({ tags });
  } catch (error: any) {
    console.error('Search tags error:', error);
    return NextResponse.json(
      { error: error.message || 'خطا در جستجوی برچسب‌ها' },
      { status: 500 }
    );
  }
}
