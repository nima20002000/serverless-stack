import { NextResponse } from 'next/server';
import { getAllTags } from '@/services/tag-service-supabase';
import { withLogging } from '@/lib/api/with-logging';
import { withCache } from '@/lib/api/with-cache';

export const dynamic = 'force-dynamic';

async function getHandler() {
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

export const GET = withLogging(
  withCache(
    getHandler,
    () => 'tags:all',
    600 // 10 minutes
  ),
  'GET /api/tags'
);
