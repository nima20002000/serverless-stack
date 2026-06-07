import { NextRequest, NextResponse } from 'next/server';
import {
  getActiveCategories,
  getCategoryTree,
} from '@/services/category-service';
import { withLogging } from '@/lib/api/with-logging';
import { withCache } from '@/lib/api/with-cache';
import { localeHeaderName } from '@/lib/i18n/config';
import {
  getLocaleCacheBucket,
  normalizeLocaleForDataFetch,
} from '@/lib/i18n/locale-cache';

export const dynamic = 'force-dynamic';

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree');
    const locale = normalizeLocaleForDataFetch(
      searchParams.get('locale') || req.headers.get(localeHeaderName)
    );

    const categories =
      tree === 'true'
        ? await getCategoryTree({ locale })
        : await getActiveCategories({ locale });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unable to load categories';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export const GET = withLogging(
  withCache(
    getHandler,
    (req) => {
      const tree = req.nextUrl.searchParams.get('tree');
      const locale = getLocaleCacheBucket(
        req.nextUrl.searchParams.get('locale') ||
          req.headers.get(localeHeaderName)
      );
      return tree === 'true'
        ? `categories:tree:locale:${locale}`
        : `categories:active:locale:${locale}`;
    },
    600 // 10 minutes
  ),
  'GET /api/categories'
);
