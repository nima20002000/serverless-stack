import 'server-only';

import { clearCachePattern } from '@/lib/redis/client';
import { supportedLocales } from '@/lib/i18n/config';
import { log } from '@/lib/logger';

export async function invalidateProductCache(): Promise<void> {
  const cacheKeys: string[] = [];
  const sortOptions = [
    'popular',
    'newest',
    'price-asc',
    'price-desc',
    'featured',
    'discount',
  ];
  const perPageOptions = [10, 20, 50];
  const localeOptions = ['default', ...supportedLocales];

  for (let page = 1; page <= 10; page++) {
    for (const perPage of perPageOptions) {
      for (const sort of sortOptions) {
        const baseKey = `products:active:page:${page}:limit:${perPage}:sort:${sort}`;
        cacheKeys.push(baseKey);
        for (const locale of localeOptions) {
          cacheKeys.push(`${baseKey}:locale:${locale}`);
        }
      }
      cacheKeys.push(`products:active:page:${page}:limit:${perPage}`);
    }
  }

  await clearCachePattern(cacheKeys);
  log.info('Product cache invalidated', { keysCleared: cacheKeys.length });
}

export async function invalidateCategoryCache(): Promise<void> {
  const cacheKeys = ['categories:active', 'categories:tree'];
  const localeOptions = ['default', ...supportedLocales];

  for (const locale of localeOptions) {
    cacheKeys.push(`categories:active:locale:${locale}`);
    cacheKeys.push(`categories:tree:locale:${locale}`);
  }

  await clearCachePattern(cacheKeys);
  log.info('Category cache invalidated', { keysCleared: cacheKeys.length });
}
