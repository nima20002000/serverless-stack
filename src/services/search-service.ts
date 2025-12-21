import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

/**
 * Search Service
 * Handles real-time search for products and categories
 */

export interface ProductSearchResult {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discountPercent: number | null;
  images: string[];
  categoryId: string | null;
  categoryName: string | null;
  type: 'product';
}

export interface CategorySearchResult {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  type: 'category';
}

export type SearchResult = ProductSearchResult | CategorySearchResult;

export interface SearchResponse {
  products: ProductSearchResult[];
  categories: CategorySearchResult[];
  total: number;
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
  const limit = options?.limit || 5;
  const includeInactive = options?.includeInactive || false;

  if (!query || query.trim().length === 0) {
    return {
      products: [],
      categories: [],
      total: 0,
    };
  }

  const supabase = createClient();
  const searchQuery = query.trim();

  try {
    // Search products
    let productsQuery = supabase
      .from('products')
      .select('id, name, description, price, discountPercent, images, categoryId, category:categories(name)')
      .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);

    if (!includeInactive) {
      productsQuery = productsQuery.eq('isActive', true);
    }

    const { data: products, error: productsError } = await productsQuery
      .order('name', { ascending: true })
      .limit(limit);

    if (productsError) {
      log.error('Error searching products', { query: searchQuery, error: productsError });
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
      log.error('Error searching categories', { query: searchQuery, error: categoriesError });
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

    const categoryResults: CategorySearchResult[] = (categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      image: c.image,
      type: 'category' as const,
    }));

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
