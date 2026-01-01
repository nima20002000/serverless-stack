import { NextResponse } from 'next/server';
import { searchAll } from '@/services/search-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/search
 * Search products and categories
 * Query params: q (search query), limit (optional, default 5)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const rawLimit = parseInt(searchParams.get('limit') || '5', 10);
    const limit = Number.isFinite(rawLimit)
      ? Math.min(Math.max(rawLimit, 1), 20)
      : 5;

    // Validate query
    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        {
          products: [],
          categories: [],
          total: 0,
        },
        { status: 200 }
      );
    }

    // Perform search
    const results = await searchAll(query, { limit });

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    log.error('Search API error', { error });
    return NextResponse.json({ error: 'خطا در جستجو' }, { status: 500 });
  }
}
