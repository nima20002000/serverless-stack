import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/types';
import { PaginatedResponse, DeleteResult } from '@/types/api';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';
import { Database } from '@/types/supabase';
import { randomUUID } from 'crypto';
import { calculateDiscountedPrice } from '@/lib/utils/format';

// ========== TYPE DEFINITIONS ==========

type Product = Tables<'products'>;
type ProductMedia = Tables<'product_media'>;
type ProductVariant = Tables<'product_variants'>;
type Category = Tables<'categories'>;
type Tag = Tables<'tags'>;

type MediaType = Database['public']['Enums']['MediaType'];

// Product with all relations (matching Prisma's ProductWithRelations)
export interface ProductWithRelations extends Product {
  category?: Category | null;
  tags?: Tag[];
  media?: ProductMedia[];
  variants?: VariantWithMedia[];
}

// Variant with media
export interface VariantWithMedia extends ProductVariant {
  media: ProductMedia[];
}

// ========== HELPER FUNCTIONS ==========

/**
 * Populate images array from media for backward compatibility
 * Handles fallback logic: product.images → product.media → first variant.media
 */
function populateProductImages(
  product: ProductWithRelations
): ProductWithRelations {
  let images = [...(product.images || [])];

  // If no images in legacy field, populate from media
  if (images.length === 0 && product.media && product.variants) {
    // First, try product's direct media
    const productMediaUrls = product.media.map((m) => m.url);

    if (productMediaUrls.length > 0) {
      images = productMediaUrls;
    } else {
      // If no product media, get images from first variant that has media
      const variantWithMedia = product.variants.find(
        (v) => v.media && v.media.length > 0
      );
      if (variantWithMedia) {
        images = variantWithMedia.media.map((m) => m.url);
      }
    }
  }

  return {
    ...product,
    images,
  };
}

/**
 * Populate images for an array of products
 */
function populateProductsImages(
  products: ProductWithRelations[]
): ProductWithRelations[] {
  return products.map(populateProductImages);
}

/**
 * Helper to invalidate all product caches
 * Since Upstash doesn't support pattern matching, we clear common cache keys
 * Now includes all sort options to ensure cache consistency
 */
async function invalidateProductCache(): Promise<void> {
  // Clear common pagination keys (pages 1-10, which covers most traffic)
  // Include all sort options to ensure cache consistency
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

  for (let page = 1; page <= 10; page++) {
    for (const perPage of perPageOptions) {
      for (const sort of sortOptions) {
        cacheKeys.push(
          `products:active:page:${page}:limit:${perPage}:sort:${sort}`
        );
      }
      // Also clear old cache keys without sort parameter for backward compatibility
      cacheKeys.push(`products:active:page:${page}:limit:${perPage}`);
    }
  }

  await clearCachePattern(cacheKeys);
  log.info('Product cache invalidated', { keysCleared: cacheKeys.length });
}

/**
 * Fetch product with all relations
 * @param productId - Product ID
 * @param includeInactiveVariants - Whether to include inactive variants (default: false, for public access)
 */
async function fetchProductWithRelations(
  productId: string,
  includeInactiveVariants = false
): Promise<ProductWithRelations | null> {
  const supabase = createClient();

  // Get product with category
  const { data: product, error } = await supabase
    .from('products')
    .select(
      `
      *,
      category:categories(*)
    `
    )
    .eq('id', productId)
    .single();

  if (error || !product) {
    return null;
  }

  // Get tags via junction table
  const { data: productToTags } = await supabase
    .from('_ProductToTag')
    .select('B')
    .eq('A', productId);

  const tagIds = productToTags?.map((pt) => pt.B) || [];
  let tags: Tag[] = [];

  if (tagIds.length > 0) {
    const { data: tagsData } = await supabase
      .from('tags')
      .select('*')
      .in('id', tagIds);
    tags = tagsData || [];
  }

  // Get product media (excluding variant-specific media)
  const { data: media } = await supabase
    .from('product_media')
    .select('*')
    .eq('productId', productId)
    .is('variantId', null)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  // Get variants with their media
  // Filter by isActive unless includeInactiveVariants is true (admin access)
  let variantsQuery = supabase
    .from('product_variants')
    .select('*')
    .eq('productId', productId);

  if (!includeInactiveVariants) {
    variantsQuery = variantsQuery.eq('isActive', true);
  }

  const { data: variants } = await variantsQuery.order('order', {
    ascending: true,
  });

  // Fetch media for all variants in a single query (OPTIMIZATION)
  const variantsWithMedia: VariantWithMedia[] = [];
  if (variants && variants.length > 0) {
    const variantIds = variants.map((v) => v.id);
    const { data: allVariantMedia } = await supabase
      .from('product_media')
      .select('*')
      .in('variantId', variantIds)
      .order('isDefault', { ascending: false })
      .order('order', { ascending: true });

    // Group media by variantId
    const mediaByVariantId = new Map<string, ProductMedia[]>();
    if (allVariantMedia) {
      for (const media of allVariantMedia) {
        if (media.variantId) {
          if (!mediaByVariantId.has(media.variantId)) {
            mediaByVariantId.set(media.variantId, []);
          }
          const variantMediaArray = mediaByVariantId.get(media.variantId);
          if (variantMediaArray) {
            variantMediaArray.push(media);
          }
        }
      }
    }

    // Attach media to each variant
    for (const variant of variants) {
      variantsWithMedia.push({
        ...variant,
        media: mediaByVariantId.get(variant.id) || [],
      });
    }
  }

  // Calculate stock from variants if product has variants
  let actualStock = product.stock;
  if (variantsWithMedia.length > 0) {
    actualStock = variantsWithMedia.reduce(
      (sum, variant) => sum + variant.stock,
      0
    );
  }

  return {
    ...product,
    stock: actualStock,
    tags,
    media: media || [],
    variants: variantsWithMedia,
  };
}

// ========== PRODUCT QUERIES ==========

/**
 * Get all products with pagination (lightweight for admin list view)
 * For admin product list, we don't need full relations - just basic product info
 * Use getProductById with includeRelations=true for detail views
 */
export async function getAllProducts(options?: {
  page?: number;
  perPage?: number;
  includeInactive?: boolean;
  search?: string;
  status?: string;
  stock?: string;
  includeRelations?: boolean; // NEW: Control whether to fetch relations
}): Promise<PaginatedResponse<ProductWithRelations>> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;
  const includeRelations = options?.includeRelations ?? true; // Default true for backward compatibility

  const supabase = createClient();
  let query = supabase.from('products').select('*', { count: 'exact' });

  // Base isActive filter
  if (!options?.includeInactive) {
    query = query.eq('isActive', true);
  } else if (options.status) {
    // Status filter (active/inactive)
    query = query.eq('isActive', options.status === 'active');
  }

  // Search filter
  if (options?.search) {
    query = query.or(
      `name.ilike.%${options.search}%,description.ilike.%${options.search}%`
    );
  }

  // Stock filter
  if (options?.stock) {
    if (options.stock === 'in-stock') {
      query = query.gt('stock', 0);
    } else if (options.stock === 'out-of-stock') {
      query = query.eq('stock', 0);
    }
  }

  // Apply ordering and pagination
  const {
    data: products,
    count,
    error,
  } = await query
    .order('displayOrder', { ascending: true })
    .order('createdAt', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    log.error('Error fetching products', { error });
    throw new Error('Unable to load products');
  }

  // If includeRelations is false, return products without fetching relations
  // This is much faster for admin list views that don't need full product data
  if (!includeRelations) {
    const productsWithEmptyRelations: ProductWithRelations[] = (
      products || []
    ).map((product) => ({
      ...product,
      category: null,
      tags: [],
      media: [],
      variants: [],
    }));

    return {
      data: populateProductsImages(productsWithEmptyRelations),
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  }

  // OPTIMIZED: Batch fetch all relations in 5-6 queries instead of N*5 queries
  // This eliminates the N+1 query problem for admin product listing
  if (!products || products.length === 0) {
    return {
      data: [],
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  }

  // Include inactive variants for admin views (includeInactive option)
  const includeInactiveVariants = options?.includeInactive ?? false;
  const { categoriesMap, tagsMap, mediaMap, variantsMap } =
    await batchFetchProductRelations(products, includeInactiveVariants);

  // Combine products with their relations
  const productsWithRelations: ProductWithRelations[] = products.map(
    (product) => {
      const variants = variantsMap.get(product.id) || [];

      // Calculate actual stock from variants if product has variants
      let actualStock = product.stock;
      if (product.hasVariants && variants.length > 0) {
        actualStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
      }

      // Get category from map
      let category: Category | null = null;
      if (product.categoryId) {
        category = categoriesMap.get(product.categoryId) || null;
      }

      return {
        ...product,
        stock: actualStock,
        category,
        tags: tagsMap.get(product.id) || [],
        media: mediaMap.get(product.id) || [],
        variants,
      };
    }
  );

  return {
    data: populateProductsImages(productsWithRelations),
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  };
}

/**
 * Sorting options for product listing
 */
export type ProductSortOption =
  | 'popular' // display order
  | 'price-asc' // price: low to high
  | 'price-desc' // price: high to low
  | 'featured' // featured products
  | 'discount' // highest discount
  | 'newest'; // newest products

/**
 * Batch fetch all relations for multiple products (OPTIMIZED - eliminates N+1 queries)
 * This function fetches all relations in just 5-6 queries instead of N*5 queries
 * @param products - Array of products to fetch relations for
 * @param includeInactiveVariants - Whether to include inactive variants (for admin views)
 */
async function batchFetchProductRelations(
  products: Product[],
  includeInactiveVariants = false
): Promise<{
  categoriesMap: Map<string, Category>;
  tagsMap: Map<string, Tag[]>;
  mediaMap: Map<string, ProductMedia[]>;
  variantsMap: Map<string, VariantWithMedia[]>;
}> {
  if (products.length === 0) {
    return {
      categoriesMap: new Map(),
      tagsMap: new Map(),
      mediaMap: new Map(),
      variantsMap: new Map(),
    };
  }

  const supabase = createClient();
  const productIds = products.map((p) => p.id);

  // Query 1: Get all categories (single query using categoryIds from already-fetched products)
  const categoriesMap = new Map<string, Category>();
  const uniqueCategoryIds = [
    ...new Set(products.map((p) => p.categoryId).filter(Boolean)),
  ] as string[];

  if (uniqueCategoryIds.length > 0) {
    const { data: categories } = await supabase
      .from('categories')
      .select('*')
      .in('id', uniqueCategoryIds);

    if (categories) {
      for (const cat of categories) {
        categoriesMap.set(cat.id, cat);
      }
    }
  }

  // Query 2: Get all tags via junction table (2 queries total: junction + tags)
  const tagsMap = new Map<string, Tag[]>();
  const { data: productToTags } = await supabase
    .from('_ProductToTag')
    .select('A, B')
    .in('A', productIds);

  if (productToTags && productToTags.length > 0) {
    const uniqueTagIds = [...new Set(productToTags.map((pt) => pt.B))];
    const { data: allTags } = await supabase
      .from('tags')
      .select('*')
      .in('id', uniqueTagIds);

    // Group tags by productId
    const tagsById = new Map<string, Tag>();
    if (allTags) {
      for (const tag of allTags) {
        tagsById.set(tag.id, tag);
      }
    }

    for (const pt of productToTags) {
      if (!tagsMap.has(pt.A)) {
        tagsMap.set(pt.A, []);
      }
      const tag = tagsById.get(pt.B);
      if (tag) {
        const productTags = tagsMap.get(pt.A);
        if (productTags) {
          productTags.push(tag);
        }
      }
    }
  }

  // Query 3: Get all product media (single query)
  const mediaMap = new Map<string, ProductMedia[]>();
  const { data: allMedia } = await supabase
    .from('product_media')
    .select('*')
    .in('productId', productIds)
    .is('variantId', null)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  if (allMedia) {
    for (const media of allMedia) {
      if (!mediaMap.has(media.productId)) {
        mediaMap.set(media.productId, []);
      }
      const productMediaArray = mediaMap.get(media.productId);
      if (productMediaArray) {
        productMediaArray.push(media);
      }
    }
  }

  // Query 4 & 5: Get all variants + their media (2 queries total)
  // Filter by isActive unless includeInactiveVariants is true (for admin views)
  const variantsMap = new Map<string, VariantWithMedia[]>();
  let variantsQuery = supabase
    .from('product_variants')
    .select('*')
    .in('productId', productIds);

  if (!includeInactiveVariants) {
    variantsQuery = variantsQuery.eq('isActive', true);
  }

  const { data: allVariants } = await variantsQuery.order('order', {
    ascending: true,
  });

  if (allVariants && allVariants.length > 0) {
    const variantIds = allVariants.map((v) => v.id);
    const { data: allVariantMedia } = await supabase
      .from('product_media')
      .select('*')
      .in('variantId', variantIds)
      .order('isDefault', { ascending: false })
      .order('order', { ascending: true });

    // Group media by variantId
    const variantMediaMap = new Map<string, ProductMedia[]>();
    if (allVariantMedia) {
      for (const media of allVariantMedia) {
        if (media.variantId) {
          if (!variantMediaMap.has(media.variantId)) {
            variantMediaMap.set(media.variantId, []);
          }
          const variantMediaArray = variantMediaMap.get(media.variantId);
          if (variantMediaArray) {
            variantMediaArray.push(media);
          }
        }
      }
    }

    // Group variants by productId
    for (const variant of allVariants) {
      if (!variantsMap.has(variant.productId)) {
        variantsMap.set(variant.productId, []);
      }
      const productVariantsArray = variantsMap.get(variant.productId);
      if (productVariantsArray) {
        productVariantsArray.push({
          ...variant,
          media: variantMediaMap.get(variant.id) || [],
        });
      }
    }
  }

  return { categoriesMap, tagsMap, mediaMap, variantsMap };
}

/**
 * Get active products only (for public listing)
 * Supports multiple sorting options with optimized database queries
 * OPTIMIZED: Uses batch fetching to eliminate N+1 queries (5 queries total instead of N*5)
 *
 * Filtering behavior:
 * - Only shows products with isActive=true
 * - Hides products with no available stock (stock=0)
 * - For products with variants: hides if no active variants or all active variants are out of stock
 */
export async function getActiveProducts(options?: {
  page?: number;
  perPage?: number;
  sortBy?: ProductSortOption;
  includeOutOfStock?: boolean; // Set to true to include out-of-stock products (for admin/special views)
}): Promise<PaginatedResponse<ProductWithRelations>> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;
  const sortBy = options?.sortBy || 'popular';
  const includeOutOfStock = options?.includeOutOfStock || false;

  const supabase = createClient();

  // Base query for active products only
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('isActive', true);

  // Apply sorting based on selected option
  // All sorting is done at the database level for optimal performance
  switch (sortBy) {
    case 'popular':
      // Popular (Original order based on displayOrder set by admin)
      query = query
        .order('displayOrder', { ascending: true })
        .order('createdAt', { ascending: false });
      break;

    case 'price-asc':
      // Price: Low to High
      query = query.order('price', { ascending: true });
      break;

    case 'price-desc':
      // Price: High to Low
      query = query.order('price', { ascending: false });
      break;

    case 'featured':
      // Featured products first, then by display order
      query = query
        .order('isFeatured', { ascending: false })
        .order('displayOrder', { ascending: true });
      break;

    case 'discount':
      // Highest discount percentage first (products with discount > 0)
      query = query
        .gt('discountPercent', 0)
        .order('discountPercent', { ascending: false });
      break;

    case 'newest':
      // Newest first
      query = query.order('createdAt', { ascending: false });
      break;

    default:
      // Fallback to popular
      query = query
        .order('displayOrder', { ascending: true })
        .order('createdAt', { ascending: false });
      break;
  }

  // Apply pagination
  const {
    data: products,
    count,
    error,
  } = await query.range(offset, offset + perPage - 1);

  if (error) {
    log.error('Error fetching active products', { error, sortBy });
    throw new Error('Unable to load products');
  }

  if (!products || products.length === 0) {
    return {
      data: [],
      total: count || 0,
      page,
      perPage,
      totalPages: Math.ceil((count || 0) / perPage),
    };
  }

  // OPTIMIZED: Batch fetch all relations in just 4 queries instead of N*5 queries
  const { categoriesMap, tagsMap, mediaMap, variantsMap } =
    await batchFetchProductRelations(products);

  // Combine products with their relations and filter out unavailable ones
  const productsWithRelations: ProductWithRelations[] = [];

  for (const product of products) {
    const variants = variantsMap.get(product.id) || [];

    // Calculate actual stock from active variants if product has variants
    let actualStock = product.stock;
    if (product.hasVariants) {
      // For variant-based products, stock is sum of active variant stocks
      actualStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    }

    // Skip products that are effectively unavailable (unless includeOutOfStock is true)
    if (!includeOutOfStock) {
      // Case 1: Product has variants but no active variants available
      if (product.hasVariants && variants.length === 0) {
        continue;
      }

      // Case 2: Product is out of stock or has invalid stock (stock <= 0)
      if (actualStock <= 0) {
        continue;
      }
    }

    // Get category from map
    let category: Category | null = null;
    if (product.categoryId) {
      category = categoriesMap.get(product.categoryId) || null;
    }

    productsWithRelations.push({
      ...product,
      stock: actualStock,
      category,
      tags: tagsMap.get(product.id) || [],
      media: mediaMap.get(product.id) || [],
      variants,
    });
  }

  // Note: The total count from DB includes all active products, but we filter some out
  // For accurate pagination, we should ideally filter at DB level, but this requires
  // more complex queries. For now, return the filtered count.
  const filteredTotal = includeOutOfStock
    ? count || 0
    : productsWithRelations.length;

  return {
    data: populateProductsImages(productsWithRelations),
    total: filteredTotal,
    page,
    perPage,
    totalPages: Math.ceil(filteredTotal / perPage),
  };
}

/**
 * Get featured products (database-level filtering)
 * Optimized query that directly fetches only featured products
 * Filters out unavailable products (out of stock or no active variants)
 */
export async function getFeaturedProducts(options?: {
  limit?: number;
}): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;
  const supabase = createClient();

  // Fetch more products than needed since we filter out unavailable ones
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('isActive', true)
    .eq('isFeatured', true)
    .order('displayOrder', { ascending: true })
    .order('createdAt', { ascending: false })
    .limit(limit * 2); // Fetch extra to account for filtering

  if (error) {
    log.error('Error fetching featured products', { error });
    throw new Error('Unable to load featured products');
  }

  if (!products || products.length === 0) {
    return [];
  }

  // Use batch fetching for better performance
  const { categoriesMap, tagsMap, mediaMap, variantsMap } =
    await batchFetchProductRelations(products);

  // Filter out unavailable products and build result
  const productsWithRelations: ProductWithRelations[] = [];

  for (const product of products) {
    // Stop once we have enough products
    if (productsWithRelations.length >= limit) break;

    const variants = variantsMap.get(product.id) || [];

    // Calculate actual stock from active variants if product has variants
    let actualStock = product.stock;
    if (product.hasVariants) {
      actualStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    }

    // Skip products that are effectively unavailable (stock <= 0 includes negative stock)
    if (product.hasVariants && variants.length === 0) continue;
    if (actualStock <= 0) continue;

    // Get category from map
    let category: Category | null = null;
    if (product.categoryId) {
      category = categoriesMap.get(product.categoryId) || null;
    }

    productsWithRelations.push({
      ...product,
      stock: actualStock,
      category,
      tags: tagsMap.get(product.id) || [],
      media: mediaMap.get(product.id) || [],
      variants,
    });
  }

  return populateProductsImages(productsWithRelations);
}

/**
 * Get discounted/sale products (database-level filtering)
 * Optimized query that directly fetches only products with active discounts
 * Filters out unavailable products (out of stock or no active variants)
 */
export async function getDiscountedProducts(options?: {
  limit?: number;
}): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;
  const supabase = createClient();

  // Fetch more products than needed since we filter out unavailable ones
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('isActive', true)
    .gt('discountPercent', 0)
    .order('displayOrder', { ascending: true })
    .order('discountPercent', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(limit * 2); // Fetch extra to account for filtering

  if (error) {
    log.error('Error fetching discounted products', { error });
    throw new Error('Unable to load discounted products');
  }

  if (!products || products.length === 0) {
    return [];
  }

  // Use batch fetching for better performance
  const { categoriesMap, tagsMap, mediaMap, variantsMap } =
    await batchFetchProductRelations(products);

  // Filter out unavailable products and build result
  const productsWithRelations: ProductWithRelations[] = [];

  for (const product of products) {
    // Stop once we have enough products
    if (productsWithRelations.length >= limit) break;

    const variants = variantsMap.get(product.id) || [];

    // Calculate actual stock from active variants if product has variants
    let actualStock = product.stock;
    if (product.hasVariants) {
      actualStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
    }

    // Skip products that are effectively unavailable (stock <= 0 includes negative stock)
    if (product.hasVariants && variants.length === 0) continue;
    if (actualStock <= 0) continue;

    // Get category from map
    let category: Category | null = null;
    if (product.categoryId) {
      category = categoriesMap.get(product.categoryId) || null;
    }

    productsWithRelations.push({
      ...product,
      stock: actualStock,
      category,
      tags: tagsMap.get(product.id) || [],
      media: mediaMap.get(product.id) || [],
      variants,
    });
  }

  return populateProductsImages(productsWithRelations);
}

/**
 * Get product by ID
 * @param id - Product ID
 * @param includeRelations - Whether to include related data (category, tags, media, variants)
 * @param includeInactive - Whether to include inactive products AND inactive variants (default: false, for public access)
 */
export async function getProductById(
  id: string,
  includeRelations = false,
  includeInactive = false
): Promise<Product | ProductWithRelations> {
  const supabase = createClient();

  if (!includeRelations) {
    // Simple query without relations
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      throw new Error('Product not found');
    }

    // Check if product is active (unless explicitly including inactive products)
    if (!includeInactive && !product.isActive) {
      throw new Error('Product not found');
    }

    return product;
  }

  // Fetch with all relations
  // Pass includeInactive to control variant filtering
  const product = await fetchProductWithRelations(id, includeInactive);

  if (!product) {
    throw new Error('Product not found');
  }

  // Check if product is active (unless explicitly including inactive products)
  if (!includeInactive && !product.isActive) {
    throw new Error('Product not found');
  }

  return product;
}

/**
 * Search products by name or description
 */
export async function searchProducts(
  query: string,
  options?: {
    page?: number;
    perPage?: number;
  }
): Promise<PaginatedResponse<Product>> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;

  const supabase = createClient();

  const {
    data: products,
    count,
    error,
  } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('isActive', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('createdAt', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    log.error('Error searching products', { query, error });
    throw new Error('Unable to search products');
  }

  return {
    data: products || [],
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  };
}

/**
 * Get related products based on same category or tags
 * Strategy: First try to find products in same category, then by shared tags
 */
export async function getRelatedProducts(
  productId: string,
  options?: {
    limit?: number;
  }
): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;
  const supabase = createClient();

  // Get the current product to find its category and tags
  const currentProduct = await fetchProductWithRelations(productId);

  if (!currentProduct) {
    return [];
  }

  let relatedProducts: Product[] = [];

  // Strategy 1: Get products from the same category
  if (currentProduct.categoryId) {
    const { data: categoryProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('isActive', true)
      .eq('categoryId', currentProduct.categoryId)
      .neq('id', productId)
      .order('displayOrder', { ascending: true })
      .order('createdAt', { ascending: false })
      .limit(limit);

    if (!error && categoryProducts && categoryProducts.length >= limit) {
      relatedProducts = categoryProducts;
    } else if (!error && categoryProducts) {
      relatedProducts = categoryProducts;
    }
  }

  // Strategy 2: If we don't have enough products, supplement with products sharing tags
  if (
    relatedProducts.length < limit &&
    currentProduct.tags &&
    currentProduct.tags.length > 0
  ) {
    const tagIds = currentProduct.tags.map((tag) => tag.id);

    // Get products that share tags
    const { data: productToTags } = await supabase
      .from('_ProductToTag')
      .select('A')
      .in('B', tagIds)
      .neq('A', productId);

    if (productToTags && productToTags.length > 0) {
      const productIds = [...new Set(productToTags.map((pt) => pt.A))];

      // Filter out already included products
      const existingIds = relatedProducts.map((p) => p.id);
      const newProductIds = productIds.filter(
        (id) => !existingIds.includes(id)
      );

      if (newProductIds.length > 0) {
        const { data: tagProducts, error: tagError } = await supabase
          .from('products')
          .select('*')
          .eq('isActive', true)
          .in('id', newProductIds)
          .order('displayOrder', { ascending: true })
          .order('createdAt', { ascending: false })
          .limit(limit - relatedProducts.length);

        if (!tagError && tagProducts) {
          relatedProducts = [...relatedProducts, ...tagProducts];
        }
      }
    }
  }

  // Strategy 3: If still not enough, get recent active products
  if (relatedProducts.length < limit) {
    const existingIds = relatedProducts.map((p) => p.id);
    const { data: recentProducts, error: recentError } = await supabase
      .from('products')
      .select('*')
      .eq('isActive', true)
      .neq('id', productId)
      .not('id', 'in', `(${existingIds.join(',')})`)
      .order('createdAt', { ascending: false })
      .limit(limit - relatedProducts.length);

    if (!recentError && recentProducts) {
      relatedProducts = [...relatedProducts, ...recentProducts];
    }
  }

  // Fetch relations for all related products and filter out unavailable ones
  const relatedProductsWithRelations: ProductWithRelations[] = [];
  if (relatedProducts.length > 0) {
    const { categoriesMap, tagsMap, mediaMap, variantsMap } =
      await batchFetchProductRelations(relatedProducts);

    for (const product of relatedProducts) {
      const variants = variantsMap.get(product.id) || [];

      // Calculate actual stock from active variants if product has variants
      let actualStock = product.stock;
      if (product.hasVariants) {
        // For variant-based products, stock is sum of active variant stocks
        actualStock = variants.reduce((sum, variant) => sum + variant.stock, 0);
      }

      // Skip products that are effectively unavailable
      // Case 1: Product has variants but no active variants available
      if (product.hasVariants && variants.length === 0) {
        continue;
      }

      // Case 2: Product is out of stock or has invalid stock (stock <= 0)
      if (actualStock <= 0) {
        continue;
      }

      // Get category from map
      let category: Category | null = null;
      if (product.categoryId) {
        category = categoriesMap.get(product.categoryId) || null;
      }

      relatedProductsWithRelations.push({
        ...product,
        stock: actualStock,
        category,
        tags: tagsMap.get(product.id) || [],
        media: mediaMap.get(product.id) || [],
        variants,
      });
    }
  }

  return populateProductsImages(relatedProductsWithRelations);
}

// ========== PRODUCT MUTATIONS ==========

/**
 * Create a new product (admin only)
 */
export async function createProduct(data: {
  name: string;
  description: string;
  price: number;
  discountPercent?: number | null;
  stock: number;
  images?: string[];
  categoryId?: string;
  tagIds?: string[];
  hasVariants?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
}): Promise<ProductWithRelations> {
  log.info('Creating product', {
    name: data.name,
    price: data.price,
    stock: data.stock,
  });

  try {
    // Validate required fields
    if (!data.name || !data.description) {
      log.warn('Missing required product fields', { name: data.name });
      throw new Error('Product name and description are required');
    }

    if (data.price <= 0) {
      log.warn('Invalid product price', { price: data.price });
      throw new Error('Price must be greater than zero');
    }

    if (data.stock < 0) {
      log.warn('Invalid product stock', { stock: data.stock });
      throw new Error('Stock cannot be negative');
    }

    const supabase = createClient();

    // Generate UUID for the product
    const productId = randomUUID();

    // Create product
    const { data: product, error } = await supabase
      .from('products')
      .insert({
        id: productId,
        name: data.name,
        description: data.description,
        price: data.price,
        discountPercent: data.discountPercent || null,
        stock: data.stock,
        images: data.images || [],
        categoryId: data.categoryId || null,
        hasVariants: data.hasVariants !== undefined ? data.hasVariants : false,
        isFeatured: data.isFeatured !== undefined ? data.isFeatured : false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !product) {
      log.error('Failed to create product', { error });
      throw new Error('Unable to create product');
    }

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      const tagConnections = data.tagIds.map((tagId) => ({
        A: productId,
        B: tagId,
      }));

      const { error: tagError } = await supabase
        .from('_ProductToTag')
        .insert(tagConnections);

      if (tagError) {
        log.error('Failed to connect tags', { error: tagError });
      }
    }

    log.info('Product created successfully', {
      productId: product.id,
      name: product.name,
      price: product.price,
    });

    // Invalidate product cache
    await invalidateProductCache();

    // Fetch and return with relations
    const fullProduct = await fetchProductWithRelations(productId);
    if (!fullProduct) {
      throw new Error('Unable to load the created product');
    }
    return fullProduct;
  } catch (error) {
    log.error('Failed to create product', {
      name: data.name,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Update product (admin only)
 */
export async function updateProduct(
  id: string,
  data: Partial<{
    name: string;
    description: string;
    price: number;
    discountPercent: number | null;
    stock: number;
    images: string[];
    categoryId: string | null;
    tagIds: string[];
    hasVariants: boolean;
    isFeatured: boolean;
    isActive: boolean;
  }>
): Promise<ProductWithRelations> {
  const supabase = createClient();

  // Check if product exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Validate data if provided
  if (data.price !== undefined && data.price <= 0) {
    throw new Error('Price must be greater than zero');
  }

  if (data.stock !== undefined && data.stock < 0) {
    throw new Error('Stock cannot be negative');
  }

  // Handle tag updates separately
  const tagIds = data.tagIds;
  const updateData = { ...data };
  delete (updateData as Record<string, unknown>).tagIds;

  // Update product
  const { error } = await supabase
    .from('products')
    .update({
      ...updateData,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    log.error('Failed to update product', { id, error });
    throw new Error('Unable to update product');
  }

  // If tagIds provided, update tag connections
  if (tagIds !== undefined) {
    // First, disconnect all existing tags
    await supabase.from('_ProductToTag').delete().eq('A', id);

    // Then connect new tags
    if (tagIds.length > 0) {
      const tagConnections = tagIds.map((tagId) => ({
        A: id,
        B: tagId,
      }));

      const { error: tagError } = await supabase
        .from('_ProductToTag')
        .insert(tagConnections);

      if (tagError) {
        log.error('Failed to update tags', { error: tagError });
      }
    }
  }

  // Invalidate product cache
  await invalidateProductCache();

  // Fetch and return with relations
  const fullProduct = await fetchProductWithRelations(id);
  if (!fullProduct) {
    throw new Error('Unable to load the updated product');
  }
  return fullProduct;
}

/**
 * Delete product (admin only)
 * NOTE: Products that have been purchased cannot be deleted (to preserve order history).
 * Use soft delete (isActive = false) instead for products with transaction history.
 */
export async function deleteProduct(id: string): Promise<DeleteResult> {
  const supabase = createClient();

  // Check if product exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!existingProduct) {
    throw new Error('Product not found');
  }

  // Check if product has been purchased (has transaction items)
  const { count: transactionItemsCount } = await supabase
    .from('transaction_items')
    .select('*', { count: 'exact', head: true })
    .eq('productId', id);

  if (transactionItemsCount && transactionItemsCount > 0) {
    log.warn('Cannot delete product with transaction history', {
      productId: id,
      transactionItemsCount,
    });
    throw new Error(
      `This product cannot be deleted because it has ${transactionItemsCount} order(s). Deactivate it instead.`
    );
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    log.error('Failed to delete product', { id, error });
    throw new Error('Unable to delete product');
  }

  log.info('Product deleted successfully', { productId: id });

  // Invalidate product cache
  await invalidateProductCache();

  return { success: true };
}

/**
 * Bulk delete products
 */
export async function bulkDeleteProducts(
  productIds: string[]
): Promise<{ count: number }> {
  const supabase = createClient();

  try {
    // Delete products (cascade will handle related records)
    const { error, count } = await supabase
      .from('products')
      .delete({ count: 'exact' })
      .in('id', productIds);

    if (error) {
      log.error('Error in bulk delete products', { error });
      throw new Error('Unable to delete products');
    }

    // Invalidate product cache
    await invalidateProductCache();

    log.info('Products bulk deleted', { count });
    return { count: count || 0 };
  } catch (error) {
    log.error('Error in bulkDeleteProducts', { productIds, error });
    throw error;
  }
}

/**
 * Bulk update products
 */
export async function bulkUpdateProducts(
  productIds: string[],
  updates: { isActive?: boolean; stock?: number }
): Promise<{ count: number }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .in('id', productIds)
      .select('id');

    if (error) {
      log.error('Error in bulk update products', { error });
      throw new Error('Unable to update products');
    }

    // Invalidate product cache
    await invalidateProductCache();

    const count = data?.length || 0;
    log.info('Products bulk updated', { count, updates });
    return { count };
  } catch (error) {
    log.error('Error in bulkUpdateProducts', { productIds, updates, error });
    throw error;
  }
}

/**
 * Update product stock
 */
export async function updateStock(
  id: string,
  quantity: number
): Promise<Product> {
  log.info('Updating product stock', { productId: id, quantity });

  try {
    const supabase = createClient();

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      log.warn('Product not found for stock update', { productId: id });
      throw new Error('Product not found');
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      log.warn('Insufficient stock', {
        productId: id,
        currentStock: product.stock,
        requestedChange: quantity,
      });
      throw new Error('Not enough stock available');
    }

    const { data: updated, error } = await supabase
      .from('products')
      .update({
        stock: newStock,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new Error('Unable to update stock');
    }

    log.info('Stock updated successfully', {
      productId: id,
      oldStock: product.stock,
      newStock: updated.stock,
    });

    return updated;
  } catch (error) {
    log.error('Failed to update stock', {
      productId: id,
      quantity,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ========== PRICE HELPER FUNCTIONS ==========

/**
 * Format prices with the configured locale and currency defaults.
 * Re-exported from utils for server component compatibility
 */
export { formatPrice, calculateDiscountedPrice } from '@/lib/utils/format';

/**
 * Get price display info with discount
 */
export function getPriceDisplay(
  basePrice: number,
  discountPercent: number | null | undefined
): {
  originalPrice: number;
  finalPrice: number;
  hasDiscount: boolean;
  discountAmount: number;
} {
  const hasDiscount = !!discountPercent && discountPercent > 0;
  const finalPrice = hasDiscount
    ? calculateDiscountedPrice(basePrice, discountPercent)
    : basePrice;
  const discountAmount = hasDiscount ? basePrice - finalPrice : 0;

  return {
    originalPrice: basePrice,
    finalPrice,
    hasDiscount,
    discountAmount,
  };
}

// ========== PRODUCT MEDIA FUNCTIONS ==========

/**
 * Add media to product
 */
export async function addProductMedia(data: {
  productId: string;
  variantId?: string;
  type: MediaType;
  url: string;
  alt?: string;
  order?: number;
  isDefault?: boolean;
}): Promise<ProductMedia> {
  const supabase = createClient();

  // Check if there are any existing media for this product/variant
  let query = supabase
    .from('product_media')
    .select('*', { count: 'exact', head: true })
    .eq('productId', data.productId);

  if (data.variantId) {
    query = query.eq('variantId', data.variantId);
  } else {
    query = query.is('variantId', null);
  }

  const { count: existingMediaCount } = await query;

  // If this is the first media, make it default automatically (unless explicitly set to false)
  const shouldBeDefault = data.isDefault ?? existingMediaCount === 0;

  // If this is set as default, unset any existing default for the same product/variant
  if (shouldBeDefault) {
    let updateQuery = supabase
      .from('product_media')
      .update({ isDefault: false })
      .eq('productId', data.productId)
      .eq('isDefault', true);

    if (data.variantId) {
      updateQuery = updateQuery.eq('variantId', data.variantId);
    } else {
      updateQuery = updateQuery.is('variantId', null);
    }

    await updateQuery;
  }

  // Create media
  const mediaId = randomUUID();
  const { data: media, error } = await supabase
    .from('product_media')
    .insert({
      id: mediaId,
      productId: data.productId,
      variantId: data.variantId || null,
      type: data.type,
      url: data.url,
      alt: data.alt || null,
      order: data.order ?? 0,
      isDefault: shouldBeDefault,
    })
    .select()
    .single();

  if (error || !media) {
    log.error('Failed to add product media', { error });
    throw new Error('Unable to add product media');
  }

  return media;
}

/**
 * Get all media for a product
 */
export async function getProductMedia(
  productId: string
): Promise<ProductMedia[]> {
  const supabase = createClient();

  const { data: media, error } = await supabase
    .from('product_media')
    .select('*')
    .eq('productId', productId)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  if (error) {
    log.error('Failed to fetch product media', { productId, error });
    throw new Error('Unable to load product media');
  }

  return media || [];
}

/**
 * Update media order, alt text, or default status
 */
export async function updateProductMedia(
  id: string,
  data: Partial<{ alt: string; order: number; isDefault: boolean }>
): Promise<ProductMedia> {
  const supabase = createClient();

  // Get the media to find its productId and variantId
  const { data: existingMedia, error: fetchError } = await supabase
    .from('product_media')
    .select('productId, variantId')
    .eq('id', id)
    .single();

  if (fetchError || !existingMedia) {
    throw new Error('Product media not found');
  }

  // If setting as default, unset any existing default for the same product/variant
  if (data.isDefault) {
    let updateQuery = supabase
      .from('product_media')
      .update({ isDefault: false })
      .eq('productId', existingMedia.productId)
      .eq('isDefault', true)
      .neq('id', id);

    if (existingMedia.variantId) {
      updateQuery = updateQuery.eq('variantId', existingMedia.variantId);
    } else {
      updateQuery = updateQuery.is('variantId', null);
    }

    await updateQuery;
  }

  const { data: media, error } = await supabase
    .from('product_media')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error || !media) {
    log.error('Failed to update product media', { id, error });
    throw new Error('Unable to update product media');
  }

  return media;
}

/**
 * Delete product media
 */
export async function deleteProductMedia(id: string): Promise<DeleteResult> {
  const supabase = createClient();

  // Get the media being deleted to check if it's the default
  const { data: media, error: fetchError } = await supabase
    .from('product_media')
    .select('productId, variantId, isDefault')
    .eq('id', id)
    .single();

  if (fetchError || !media) {
    throw new Error('Product media not found');
  }

  const { error } = await supabase.from('product_media').delete().eq('id', id);

  if (error) {
    log.error('Failed to delete product media', { id, error });
    throw new Error('Unable to delete product media');
  }

  // If the deleted media was the default, set the first remaining media as default
  if (media.isDefault) {
    let selectQuery = supabase
      .from('product_media')
      .select('*')
      .eq('productId', media.productId);

    if (media.variantId) {
      selectQuery = selectQuery.eq('variantId', media.variantId);
    } else {
      selectQuery = selectQuery.is('variantId', null);
    }

    const { data: firstRemainingMedia } = await selectQuery
      .order('isDefault', { ascending: false })
      .order('order', { ascending: true })
      .limit(1)
      .single();

    if (firstRemainingMedia) {
      await supabase
        .from('product_media')
        .update({ isDefault: true })
        .eq('id', firstRemainingMedia.id);
    }
  }

  return { success: true };
}

/**
 * Batch sync media for a product
 * Handles deletions, additions, and updates in a single operation
 * This is optimized for bulk updates to prevent timeout issues
 */
export async function batchSyncProductMedia(
  productId: string,
  operations: {
    delete: string[]; // Media IDs to delete
    add: Array<{
      variantId?: string;
      type: MediaType;
      url: string;
      alt?: string;
      order?: number;
      isDefault?: boolean;
    }>;
    update: Array<{
      id: string;
      isDefault?: boolean;
      alt?: string;
      order?: number;
    }>;
  }
): Promise<{
  success: boolean;
  added: number;
  deleted: number;
  updated: number;
}> {
  log.info('Batch syncing product media', {
    productId,
    deleteCount: operations.delete.length,
    addCount: operations.add.length,
    updateCount: operations.update.length,
  });

  const supabase = createClient();
  let deleted = 0;
  let added = 0;
  let updated = 0;

  // Step 1: Delete media in bulk
  if (operations.delete.length > 0) {
    const { error, count } = await supabase
      .from('product_media')
      .delete({ count: 'exact' })
      .in('id', operations.delete);

    if (error) {
      log.error('Failed to delete media in batch', { error });
      throw new Error('Unable to delete product media');
    }
    deleted = count || 0;
  }

  // Step 2: Add new media in bulk
  if (operations.add.length > 0) {
    const mediaToInsert = operations.add.map((item, index) => ({
      id: randomUUID(),
      productId,
      variantId: item.variantId || null,
      type: item.type,
      url: item.url,
      alt: item.alt || null,
      order: item.order ?? index,
      isDefault: item.isDefault ?? false,
    }));

    const { error, count } = await supabase
      .from('product_media')
      .insert(mediaToInsert)
      .select();

    if (error) {
      log.error('Failed to add media in batch', { error });
      throw new Error('Unable to add product media');
    }
    added = count || mediaToInsert.length;
  }

  // Step 3: Update existing media
  // OPTIMIZED: Batch fetch variantIds for all updates in one query, then process
  if (operations.update.length > 0) {
    const updateIds = operations.update.map((u) => u.id);

    // Fetch all media variantIds in a single query
    const { data: mediaVariantInfo } = await supabase
      .from('product_media')
      .select('id, variantId')
      .in('id', updateIds);

    // Create a map of id -> variantId
    const variantIdByMediaId = new Map<string, string | null>();
    if (mediaVariantInfo) {
      for (const m of mediaVariantInfo) {
        variantIdByMediaId.set(m.id, m.variantId);
      }
    }

    // Group updates by variantId to handle isDefault correctly
    const updatesByVariant = new Map<string | null, typeof operations.update>();
    for (const update of operations.update) {
      const variantId = variantIdByMediaId.get(update.id) ?? null;
      if (!updatesByVariant.has(variantId)) {
        updatesByVariant.set(variantId, []);
      }
      const updatesList = updatesByVariant.get(variantId);
      if (updatesList) {
        updatesList.push(update);
      }
    }

    // Process each variant group - use Promise.all for parallel execution
    const updatePromises: Promise<void>[] = [];

    for (const [variantId, updates] of updatesByVariant) {
      // Find if any update sets isDefault to true
      const newDefault = updates.find((u) => u.isDefault === true);

      if (newDefault) {
        // Clear all isDefault for this variant group first
        let clearQuery = supabase
          .from('product_media')
          .update({ isDefault: false })
          .eq('productId', productId);

        if (variantId) {
          clearQuery = clearQuery.eq('variantId', variantId);
        } else {
          clearQuery = clearQuery.is('variantId', null);
        }

        updatePromises.push(Promise.resolve(clearQuery).then(() => {}));
      }

      // Apply all updates in parallel
      for (const update of updates) {
        const updateData: Record<string, unknown> = {};
        if (update.isDefault !== undefined)
          updateData.isDefault = update.isDefault;
        if (update.alt !== undefined) updateData.alt = update.alt;
        if (update.order !== undefined) updateData.order = update.order;

        if (Object.keys(updateData).length > 0) {
          updatePromises.push(
            Promise.resolve(
              supabase
                .from('product_media')
                .update(updateData)
                .eq('id', update.id)
            ).then(() => {
              updated++;
            })
          );
        }
      }
    }

    // Wait for all updates to complete
    await Promise.all(updatePromises);
  }

  log.info('Batch sync completed', { productId, deleted, added, updated });
  return { success: true, added, deleted, updated };
}

// ========== PRODUCT VARIANT FUNCTIONS ==========

/**
 * Recalculate and update product stock based on variants
 * If product has variants, stock = sum of all variant stocks
 * If no variants, stock remains as manually set
 */
export async function updateProductStockFromVariants(
  productId: string
): Promise<void> {
  log.info('Updating product stock from variants', { productId });

  const supabase = createClient();

  // Get all variants for this product
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('productId', productId);

  if (error) {
    log.error('Failed to fetch variants for stock calculation', {
      productId,
      error,
    });
    return;
  }

  // Determine hasVariants based on whether variants exist
  const hasVariants = variants && variants.length > 0;

  if (hasVariants) {
    const totalStock = variants.reduce(
      (sum, variant) => sum + variant.stock,
      0
    );

    await supabase
      .from('products')
      .update({
        stock: totalStock,
        hasVariants: true,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', productId);

    log.info('Product stock and hasVariants updated from variants', {
      productId,
      variantCount: variants.length,
      totalStock,
      hasVariants: true,
    });
  } else {
    // No variants - ensure hasVariants is false
    await supabase
      .from('products')
      .update({
        hasVariants: false,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', productId);

    log.info('Product hasVariants set to false (no variants)', {
      productId,
      hasVariants: false,
    });
  }
}

/**
 * Get all variants for a product (ordered by 'order' field)
 * OPTIMIZED: Uses a single batch query to fetch all variant media instead of N+1 queries
 */
export async function getProductVariants(
  productId: string
): Promise<VariantWithMedia[]> {
  const supabase = createClient();

  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('productId', productId)
    .order('order', { ascending: true });

  if (error) {
    log.error('Failed to fetch product variants', { productId, error });
    throw new Error('Unable to load product variants');
  }

  if (!variants || variants.length === 0) {
    return [];
  }

  // OPTIMIZATION: Fetch all variant media in a single query instead of N+1 queries
  const variantIds = variants.map((v) => v.id);
  const { data: allVariantMedia } = await supabase
    .from('product_media')
    .select('*')
    .in('variantId', variantIds)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  // Group media by variantId
  const mediaByVariantId = new Map<string, ProductMedia[]>();
  if (allVariantMedia) {
    for (const media of allVariantMedia) {
      if (media.variantId) {
        if (!mediaByVariantId.has(media.variantId)) {
          mediaByVariantId.set(media.variantId, []);
        }
        const variantMediaArray = mediaByVariantId.get(media.variantId);
        if (variantMediaArray) {
          variantMediaArray.push(media);
        }
      }
    }
  }

  // Build variants with their media
  const variantsWithMedia: VariantWithMedia[] = variants.map((variant) => ({
    ...variant,
    media: mediaByVariantId.get(variant.id) || [],
  }));

  return variantsWithMedia;
}

/**
 * Batch create multiple product variants in a single operation
 * Returns a mapping of tempId -> realId for client-side reference
 * OPTIMIZED: Creates all variants in a single DB insert instead of N+1 queries
 */
export async function batchCreateProductVariants(
  productId: string,
  variants: Array<{
    tempId: string; // Client-side temporary ID for mapping
    name: string;
    sku?: string;
    color?: string;
    size?: string;
    material?: string;
    priceAdjust?: number;
    stock: number;
    order?: number;
    isActive?: boolean;
  }>
): Promise<{
  variants: VariantWithMedia[];
  idMapping: Record<string, string>;
}> {
  if (variants.length === 0) {
    return { variants: [], idMapping: {} };
  }

  log.info('Batch creating product variants', {
    productId,
    count: variants.length,
  });

  const supabase = createClient();

  // Validate SKU uniqueness for all provided SKUs
  const skusToCheck = variants.filter((v) => v.sku).map((v) => v.sku as string);
  if (skusToCheck.length > 0) {
    const { data: existingSkus } = await supabase
      .from('product_variants')
      .select('sku')
      .in('sku', skusToCheck);

    if (existingSkus && existingSkus.length > 0) {
      const duplicateSku = existingSkus[0].sku;
      throw new Error(`SKU "${duplicateSku}" already exists`);
    }
  }

  // Get the current max order for auto-assignment
  const { data: maxOrderVariant } = await supabase
    .from('product_variants')
    .select('order')
    .eq('productId', productId)
    .order('order', { ascending: false })
    .limit(1)
    .single();

  let currentMaxOrder = maxOrderVariant?.order ?? -1;

  // Prepare all variants for bulk insert
  const idMapping: Record<string, string> = {};
  const variantsToInsert = variants.map((variant) => {
    const variantId = randomUUID();
    idMapping[variant.tempId] = variantId;

    // Auto-assign order if not provided
    const order = variant.order ?? ++currentMaxOrder;

    return {
      id: variantId,
      productId,
      name: variant.name,
      sku: variant.sku || null,
      color: variant.color || null,
      size: variant.size || null,
      material: variant.material || null,
      priceAdjust: variant.priceAdjust || 0,
      stock: variant.stock,
      order,
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      updatedAt: new Date().toISOString(),
    };
  });

  // Bulk insert all variants in a single query
  const { data: createdVariants, error } = await supabase
    .from('product_variants')
    .insert(variantsToInsert)
    .select();

  if (error || !createdVariants) {
    log.error('Failed to batch create product variants', { error });
    throw new Error('Unable to create product variants');
  }

  // Update parent product stock
  await updateProductStockFromVariants(productId);

  log.info('Product variants batch created successfully', {
    productId,
    count: createdVariants.length,
  });

  // Return variants with empty media (new variants don't have media yet)
  const variantsWithMedia: VariantWithMedia[] = createdVariants.map((v) => ({
    ...v,
    media: [],
  }));

  return { variants: variantsWithMedia, idMapping };
}

/**
 * Batch update multiple product variants in a single operation
 * OPTIMIZED: Updates all variants in parallel and recalculates stock only once at the end
 * @param productId - Product ID (for stock recalculation)
 * @param variants - Array of variant updates with id and data
 */
export async function batchUpdateProductVariants(
  productId: string,
  variants: Array<{
    id: string;
    name: string;
    sku?: string;
    color?: string;
    size?: string;
    material?: string;
    priceAdjust?: number;
    stock: number;
    isActive?: boolean;
  }>
): Promise<{ updated: number }> {
  if (variants.length === 0) {
    return { updated: 0 };
  }

  log.info('Batch updating product variants', {
    productId,
    count: variants.length,
  });

  const supabase = createClient();

  // Validate all SKUs for uniqueness (batch check)
  const skusToCheck = variants.filter((v) => v.sku).map((v) => v.sku as string);
  if (skusToCheck.length > 0) {
    const { data: existingSkus } = await supabase
      .from('product_variants')
      .select('id, sku')
      .in('sku', skusToCheck);

    if (existingSkus) {
      // Check if any existing SKU belongs to a different variant
      for (const existing of existingSkus) {
        const matchingVariant = variants.find((v) => v.sku === existing.sku);
        if (matchingVariant && matchingVariant.id !== existing.id) {
          throw new Error(`SKU "${existing.sku}" already exists`);
        }
      }
    }
  }

  const updatedAt = new Date().toISOString();

  // Update all variants in parallel, skipping individual stock updates
  await Promise.all(
    variants.map((variant) =>
      supabase
        .from('product_variants')
        .update({
          name: variant.name,
          sku: variant.sku || null,
          color: variant.color || null,
          size: variant.size || null,
          material: variant.material || null,
          priceAdjust: variant.priceAdjust || 0,
          stock: variant.stock,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
          updatedAt,
        })
        .eq('id', variant.id)
    )
  );

  // Recalculate stock only once at the end
  await updateProductStockFromVariants(productId);

  log.info('Product variants batch updated successfully', {
    productId,
    count: variants.length,
  });

  return { updated: variants.length };
}

/**
 * Create product variant with auto-assigned order
 */
export async function createProductVariant(data: {
  productId: string;
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  material?: string;
  priceAdjust?: number;
  stock: number;
  order?: number;
  isActive?: boolean;
}): Promise<VariantWithMedia> {
  log.info('Creating product variant', {
    productId: data.productId,
    name: data.name,
    stock: data.stock,
  });

  const supabase = createClient();

  // Validate SKU uniqueness if provided
  if (data.sku) {
    const { data: existing } = await supabase
      .from('product_variants')
      .select('*')
      .eq('sku', data.sku)
      .single();

    if (existing) {
      throw new Error('SKU already exists');
    }
  }

  // Auto-assign order if not provided (append to end)
  let order = data.order;
  if (order === undefined) {
    const { data: maxOrderVariant } = await supabase
      .from('product_variants')
      .select('order')
      .eq('productId', data.productId)
      .order('order', { ascending: false })
      .limit(1)
      .single();

    order = (maxOrderVariant?.order ?? -1) + 1;
  }

  // Create variant
  const variantId = randomUUID();
  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({
      id: variantId,
      productId: data.productId,
      name: data.name,
      sku: data.sku || null,
      color: data.color || null,
      size: data.size || null,
      material: data.material || null,
      priceAdjust: data.priceAdjust || 0,
      stock: data.stock,
      order,
      isActive: data.isActive !== undefined ? data.isActive : true,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error || !variant) {
    log.error('Failed to create product variant', { error });
    throw new Error('Unable to create product variant');
  }

  // Update parent product stock
  await updateProductStockFromVariants(data.productId);

  log.info('Product variant created successfully', {
    variantId: variant.id,
    productId: data.productId,
    order,
  });

  return {
    ...variant,
    media: [],
  };
}

/**
 * Update product variant
 * @param id - Variant ID
 * @param data - Variant data to update
 * @param options - Optional settings for batch operations
 * @param options.skipStockUpdate - Skip stock recalculation (useful for batch updates where stock is recalculated once at the end)
 * @param options.skipMediaFetch - Skip fetching variant media (useful when caller doesn't need media in response)
 */
export async function updateProductVariant(
  id: string,
  data: Partial<{
    name: string;
    sku: string;
    color: string;
    size: string;
    material: string;
    priceAdjust: number;
    stock: number;
    isActive: boolean;
  }>,
  options?: {
    skipStockUpdate?: boolean;
    skipMediaFetch?: boolean;
  }
): Promise<VariantWithMedia> {
  log.info('Updating product variant', { variantId: id, data });

  const supabase = createClient();

  // Get the variant first to know which product to update
  const { data: existingVariant, error: fetchError } = await supabase
    .from('product_variants')
    .select('productId')
    .eq('id', id)
    .single();

  if (fetchError || !existingVariant) {
    throw new Error('Product variant not found');
  }

  // Validate SKU uniqueness if being updated
  if (data.sku) {
    const { data: existing } = await supabase
      .from('product_variants')
      .select('*')
      .eq('sku', data.sku)
      .single();

    if (existing && existing.id !== id) {
      throw new Error('SKU already exists');
    }
  }

  const { data: variant, error } = await supabase
    .from('product_variants')
    .update({
      ...data,
      updatedAt: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error || !variant) {
    log.error('Failed to update product variant', { id, error });
    throw new Error('Unable to update product variant');
  }

  // Update parent product stock if variant stock was changed (unless skipped for batch ops)
  if (data.stock !== undefined && !options?.skipStockUpdate) {
    await updateProductStockFromVariants(existingVariant.productId);
  }

  log.info('Product variant updated successfully', {
    variantId: id,
    productId: existingVariant.productId,
  });

  // Skip media fetch for batch operations where caller doesn't need the response
  if (options?.skipMediaFetch) {
    return {
      ...variant,
      media: [],
    };
  }

  // Fetch media for the variant
  const { data: media } = await supabase
    .from('product_media')
    .select('*')
    .eq('variantId', id)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  return {
    ...variant,
    media: media || [],
  };
}

/**
 * Delete product variant
 * OPTIMIZED: Uses parallel updates instead of sequential loop for renumbering
 */
export async function deleteProductVariant(id: string): Promise<DeleteResult> {
  log.info('Deleting product variant', { variantId: id });

  const supabase = createClient();

  // Get the variant first to know which product to update
  const { data: existingVariant, error: fetchError } = await supabase
    .from('product_variants')
    .select('productId, order')
    .eq('id', id)
    .single();

  if (fetchError || !existingVariant) {
    throw new Error('Product variant not found');
  }

  // Delete the variant
  const { error } = await supabase
    .from('product_variants')
    .delete()
    .eq('id', id);

  if (error) {
    log.error('Failed to delete product variant', { id, error });
    throw new Error('Unable to delete product variant');
  }

  // Renumber remaining variants to fill the gap
  // OPTIMIZED: Use parallel updates instead of sequential loop
  const { data: remainingVariants } = await supabase
    .from('product_variants')
    .select('id, order')
    .eq('productId', existingVariant.productId)
    .gt('order', existingVariant.order);

  if (remainingVariants && remainingVariants.length > 0) {
    const updatedAt = new Date().toISOString();
    await Promise.all(
      remainingVariants.map((variant) =>
        supabase
          .from('product_variants')
          .update({
            order: variant.order - 1,
            updatedAt,
          })
          .eq('id', variant.id)
      )
    );
  }

  // Update parent product stock after deletion
  await updateProductStockFromVariants(existingVariant.productId);

  log.info('Product variant deleted successfully', {
    variantId: id,
    productId: existingVariant.productId,
  });

  return { success: true };
}

/**
 * Reorder product variants
 * Updates the order field for multiple variants
 * OPTIMIZED: Uses parallel updates instead of sequential loop
 */
export async function reorderProductVariants(
  productId: string,
  variantOrders: Array<{ id: string; order: number }>
): Promise<void> {
  log.info('Reordering product variants', {
    productId,
    count: variantOrders.length,
  });

  const supabase = createClient();
  const updatedAt = new Date().toISOString();

  // OPTIMIZED: Update all variants in parallel instead of sequential loop
  await Promise.all(
    variantOrders.map(({ id, order }) =>
      supabase
        .from('product_variants')
        .update({
          order,
          updatedAt,
        })
        .eq('id', id)
    )
  );

  log.info('Product variants reordered successfully', { productId });
}

/**
 * Reorder products
 * Updates the displayOrder field for multiple products
 * OPTIMIZED: Uses parallel updates instead of sequential loop
 * This affects the display order on product listing pages, featured products, and discounted products sections
 */
export async function reorderProducts(
  productOrders: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  log.info('Reordering products', { count: productOrders.length });

  const supabase = createClient();
  const updatedAt = new Date().toISOString();

  // OPTIMIZED: Update all products in parallel instead of sequential loop
  await Promise.all(
    productOrders.map(({ id, displayOrder }) =>
      supabase
        .from('products')
        .update({
          displayOrder,
          updatedAt,
        })
        .eq('id', id)
    )
  );

  // Invalidate product cache after reordering
  await invalidateProductCache();

  log.info('Products reordered successfully', { count: productOrders.length });
}
