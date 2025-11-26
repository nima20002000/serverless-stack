import { NextResponse } from 'next/server';
import { getAllTags } from '@/services/tag-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tags = await getAllTags();
    return NextResponse.json({ tags });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در دریافت برچسب‌ها' },
      { status: 500 }
    );
  }
}
