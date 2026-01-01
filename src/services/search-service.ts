import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import type {
  ProductSearchResult,
  CategorySearchResult,
  SearchResult,
  SearchResponse,
} from '@/types/search';

// Re-export types for backwards compatibility
export type {
  ProductSearchResult,
  CategorySearchResult,
  SearchResult,
  SearchResponse,
};

const MAX_QUERY_LENGTH = 100;
const MAX_SEARCH_LIMIT = 20;

function sanitizeSearchQuery(rawQuery: string): string {
  return rawQuery
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/[%_\\]/g, '');
}

/**
 * Search products and categories by query
 * Returns combined results for real-time search suggestions
 */
export async function searchAll(
  query: string,
  options?: {
    limit?: number;
    includeInactive?: boolean;
  }
): Promise<SearchResponse> {
  const requestedLimit = options?.limit || 5;
  const limit = Math.min(Math.max(requestedLimit, 1), MAX_SEARCH_LIMIT);
  const includeInactive = options?.includeInactive || false;

  if (!query || query.trim().length === 0) {
    return {
      products: [],
      categories: [],
      total: 0,
    };
  }

  const supabase = createClient();
  const searchQuery = sanitizeSearchQuery(query);

  if (searchQuery.length === 0) {
    return {
      products: [],
      categories: [],
      total: 0,
    };
  }

  try {
    // Search products
    let productsQuery = supabase
      .from('products')
      .select(
        'id, name, description, price, discountPercent, images, categoryId, category:categories(name)'
      )
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (!includeInactive) {
      productsQuery = productsQuery.eq('isActive', true);
    }

    const { data: products, error: productsError } = await productsQuery
      .order('name', { ascending: true })
      .limit(limit);

    if (productsError) {
      log.error('Error searching products', {
        query: searchQuery,
        error: productsError,
      });
    }

    // Search categories
    let categoriesQuery = supabase
      .from('categories')
      .select('id, name, slug, description, image')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (!includeInactive) {
      categoriesQuery = categoriesQuery.eq('isActive', true);
    }

    const { data: categories, error: categoriesError } = await categoriesQuery
      .order('name', { ascending: true })
      .limit(limit);

    if (categoriesError) {
      log.error('Error searching categories', {
        query: searchQuery,
        error: categoriesError,
      });
    }

    // Map results to typed interfaces
    const productResults: ProductSearchResult[] = (products || []).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      discountPercent: p.discountPercent,
      images: p.images || [],
      categoryId: p.categoryId,
      categoryName: (p.category as { name: string } | null)?.name || null,
      type: 'product' as const,
    }));

    const categoryResults: CategorySearchResult[] = (categories || []).map(
      (c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        image: c.image,
        type: 'category' as const,
      })
    );

    const total = productResults.length + categoryResults.length;

    return {
      products: productResults,
      categories: categoryResults,
      total,
    };
  } catch (error) {
    log.error('Error in searchAll', { query: searchQuery, error });
    return {
      products: [],
      categories: [],
      total: 0,
    };
  }
}
