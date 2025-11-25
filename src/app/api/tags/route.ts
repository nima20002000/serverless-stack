import { NextRequest, NextResponse } from 'next/server';
import { getAllTags } from '@/services/tag-service';

export async function GET(req: NextRequest) {
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
