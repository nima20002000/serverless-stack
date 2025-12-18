import { createClient } from '@/lib/supabase/server';
import { Tables } from '@/lib/supabase/types';
import { PaginatedResponse, DeleteResult } from '@/types/api';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';
import { Database } from '@/types/supabase';
import { randomUUID } from 'crypto';

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
function populateProductImages(product: ProductWithRelations): ProductWithRelations {
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
function populateProductsImages(products: ProductWithRelations[]): ProductWithRelations[] {
  return products.map(populateProductImages);
}

/**
 * Helper to invalidate all product caches
 * Since Upstash doesn't support pattern matching, we clear common cache keys
 */
async function invalidateProductCache(): Promise<void> {
  // Clear common pagination keys (pages 1-10, which covers most traffic)
  const cacheKeys = [];
  for (let page = 1; page <= 10; page++) {
    cacheKeys.push(`products:active:page:${page}:limit:20`);
    cacheKeys.push(`products:active:page:${page}:limit:10`);
    cacheKeys.push(`products:active:page:${page}:limit:50`);
  }
  await clearCachePattern(cacheKeys);
  log.info('Product cache invalidated', { keysCleared: cacheKeys.length });
}

/**
 * Fetch product with all relations
 */
async function fetchProductWithRelations(productId: string): Promise<ProductWithRelations | null> {
  const supabase = await createClient();

  // Get product with category
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      category:categories(*)
    `)
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
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('productId', productId)
    .order('order', { ascending: true });

  // Fetch media for each variant
  const variantsWithMedia: VariantWithMedia[] = [];
  if (variants && variants.length > 0) {
    for (const variant of variants) {
      const { data: variantMedia } = await supabase
        .from('product_media')
        .select('*')
        .eq('variantId', variant.id)
        .order('isDefault', { ascending: false })
        .order('order', { ascending: true });

      variantsWithMedia.push({
        ...variant,
        media: variantMedia || [],
      });
    }
  }

  return {
    ...product,
    tags,
    media: media || [],
    variants: variantsWithMedia,
  };
}

// ========== PRODUCT QUERIES ==========

/**
 * Get all products with pagination
 */
export async function getAllProducts(options?: {
  page?: number;
  perPage?: number;
  includeInactive?: boolean;
  search?: string;
  status?: string;
  stock?: string;
}): Promise<PaginatedResponse<ProductWithRelations>> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();
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
    query = query.or(`name.ilike.%${options.search}%,description.ilike.%${options.search}%`);
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
  const { data: products, count, error } = await query
    .order('displayOrder', { ascending: true })
    .order('createdAt', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    log.error('Error fetching products', { error });
    throw new Error('خطا در دریافت محصولات');
  }

  // Fetch relations for each product
  const productsWithRelations: ProductWithRelations[] = [];
  for (const product of products || []) {
    const fullProduct = await fetchProductWithRelations(product.id);
    if (fullProduct) {
      productsWithRelations.push(fullProduct);
    }
  }

  return {
    data: populateProductsImages(productsWithRelations),
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  };
}

/**
 * Get active products only (for public listing)
 */
export async function getActiveProducts(options?: {
  page?: number;
  perPage?: number;
}): Promise<PaginatedResponse<ProductWithRelations>> {
  return getAllProducts({ ...options, includeInactive: false });
}

/**
 * Get featured products (database-level filtering)
 * Optimized query that directly fetches only featured products
 */
export async function getFeaturedProducts(options?: {
  limit?: number;
}): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('isActive', true)
    .eq('isFeatured', true)
    .order('displayOrder', { ascending: true })
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Error fetching featured products', { error });
    throw new Error('خطا در دریافت محصولات ویژه');
  }

  // Fetch relations for each product
  const productsWithRelations: ProductWithRelations[] = [];
  for (const product of products || []) {
    const fullProduct = await fetchProductWithRelations(product.id);
    if (fullProduct) {
      productsWithRelations.push(fullProduct);
    }
  }

  return populateProductsImages(productsWithRelations);
}

/**
 * Get discounted/sale products (database-level filtering)
 * Optimized query that directly fetches only products with active discounts
 */
export async function getDiscountedProducts(options?: {
  limit?: number;
}): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;
  const supabase = await createClient();

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('isActive', true)
    .gt('discountPercent', 0)
    .order('displayOrder', { ascending: true })
    .order('discountPercent', { ascending: false })
    .order('createdAt', { ascending: false })
    .limit(limit);

  if (error) {
    log.error('Error fetching discounted products', { error });
    throw new Error('خطا در دریافت محصولات تخفیف‌دار');
  }

  // Fetch relations for each product
  const productsWithRelations: ProductWithRelations[] = [];
  for (const product of products || []) {
    const fullProduct = await fetchProductWithRelations(product.id);
    if (fullProduct) {
      productsWithRelations.push(fullProduct);
    }
  }

  return populateProductsImages(productsWithRelations);
}

/**
 * Get product by ID
 * @param id - Product ID
 * @param includeRelations - Whether to include related data (category, tags, media, variants)
 * @param includeInactive - Whether to include inactive products (default: false, for public access)
 */
export async function getProductById(
  id: string,
  includeRelations = false,
  includeInactive = false
): Promise<Product | ProductWithRelations> {
  const supabase = await createClient();

  if (!includeRelations) {
    // Simple query without relations
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !product) {
      throw new Error('محصول یافت نشد');
    }

    // Check if product is active (unless explicitly including inactive products)
    if (!includeInactive && !product.isActive) {
      throw new Error('محصول یافت نشد');
    }

    return product;
  }

  // Fetch with all relations
  const product = await fetchProductWithRelations(id);

  if (!product) {
    throw new Error('محصول یافت نشد');
  }

  // Check if product is active (unless explicitly including inactive products)
  if (!includeInactive && !product.isActive) {
    throw new Error('محصول یافت نشد');
  }

  return product;
}

/**
 * Search products by name or description
 */
export async function searchProducts(query: string, options?: {
  page?: number;
  perPage?: number;
}): Promise<PaginatedResponse<Product>> {
  const page = options?.page || 1;
  const perPage = options?.perPage || 20;
  const offset = (page - 1) * perPage;

  const supabase = await createClient();

  const { data: products, count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('isActive', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .order('createdAt', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (error) {
    log.error('Error searching products', { query, error });
    throw new Error('خطا در جستجوی محصولات');
  }

  return {
    data: products || [],
    total: count || 0,
    page,
    perPage,
    totalPages: Math.ceil((count || 0) / perPage),
  };
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
  log.info('Creating product', { name: data.name, price: data.price, stock: data.stock });

  try {
    // Validate required fields
    if (!data.name || !data.description) {
      log.warn('Missing required product fields', { name: data.name });
      throw new Error('نام و توضیحات محصول الزامی است');
    }

    if (data.price <= 0) {
      log.warn('Invalid product price', { price: data.price });
      throw new Error('قیمت باید بیشتر از صفر باشد');
    }

    if (data.stock < 0) {
      log.warn('Invalid product stock', { stock: data.stock });
      throw new Error('موجودی نمی‌تواند منفی باشد');
    }

    const supabase = await createClient();

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
      throw new Error('خطا در ایجاد محصول');
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
      throw new Error('خطا در دریافت اطلاعات محصول ایجاد شده');
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
  const supabase = await createClient();

  // Check if product exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!existingProduct) {
    throw new Error('محصول یافت نشد');
  }

  // Validate data if provided
  if (data.price !== undefined && data.price <= 0) {
    throw new Error('قیمت باید بیشتر از صفر باشد');
  }

  if (data.stock !== undefined && data.stock < 0) {
    throw new Error('موجودی نمی‌تواند منفی باشد');
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
    throw new Error('خطا در بروزرسانی محصول');
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
    throw new Error('خطا در دریافت اطلاعات محصول بروزرسانی شده');
  }
  return fullProduct;
}

/**
 * Delete product (admin only)
 * NOTE: Products that have been purchased cannot be deleted (to preserve order history).
 * Use soft delete (isActive = false) instead for products with transaction history.
 */
export async function deleteProduct(id: string): Promise<DeleteResult> {
  const supabase = await createClient();

  // Check if product exists
  const { data: existingProduct } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (!existingProduct) {
    throw new Error('محصول یافت نشد');
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
      `این محصول قابل حذف نیست زیرا ${transactionItemsCount} سفارش ثبت شده دارد. برای مخفی کردن محصول، آن را غیرفعال کنید.`
    );
  }

  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error) {
    log.error('Failed to delete product', { id, error });
    throw new Error('خطا در حذف محصول');
  }

  log.info('Product deleted successfully', { productId: id });

  // Invalidate product cache
  await invalidateProductCache();

  return { success: true };
}

/**
 * Update product stock
 */
export async function updateStock(id: string, quantity: number): Promise<Product> {
  log.info('Updating product stock', { productId: id, quantity });

  try {
    const supabase = await createClient();

    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !product) {
      log.warn('Product not found for stock update', { productId: id });
      throw new Error('محصول یافت نشد');
    }

    const newStock = product.stock + quantity;

    if (newStock < 0) {
      log.warn('Insufficient stock', {
        productId: id,
        currentStock: product.stock,
        requestedChange: quantity,
      });
      throw new Error('موجودی کافی نیست');
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
      throw new Error('خطا در بروزرسانی موجودی');
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
 * Format price to Persian/Toman format
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountPercent: number | null | undefined
): number {
  if (!discountPercent || discountPercent <= 0) {
    return basePrice;
  }
  return basePrice * (1 - discountPercent / 100);
}

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
  const supabase = await createClient();

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
  const shouldBeDefault = data.isDefault ?? (existingMediaCount === 0);

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
    throw new Error('خطا در افزودن رسانه');
  }

  return media;
}

/**
 * Get all media for a product
 */
export async function getProductMedia(productId: string): Promise<ProductMedia[]> {
  const supabase = await createClient();

  const { data: media, error } = await supabase
    .from('product_media')
    .select('*')
    .eq('productId', productId)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  if (error) {
    log.error('Failed to fetch product media', { productId, error });
    throw new Error('خطا در دریافت رسانه‌ها');
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
  const supabase = await createClient();

  // Get the media to find its productId and variantId
  const { data: existingMedia, error: fetchError } = await supabase
    .from('product_media')
    .select('productId, variantId')
    .eq('id', id)
    .single();

  if (fetchError || !existingMedia) {
    throw new Error('رسانه یافت نشد');
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
    throw new Error('خطا در بروزرسانی رسانه');
  }

  return media;
}

/**
 * Delete product media
 */
export async function deleteProductMedia(id: string): Promise<DeleteResult> {
  const supabase = await createClient();

  // Get the media being deleted to check if it's the default
  const { data: media, error: fetchError } = await supabase
    .from('product_media')
    .select('productId, variantId, isDefault')
    .eq('id', id)
    .single();

  if (fetchError || !media) {
    throw new Error('رسانه یافت نشد');
  }

  const { error } = await supabase.from('product_media').delete().eq('id', id);

  if (error) {
    log.error('Failed to delete product media', { id, error });
    throw new Error('خطا در حذف رسانه');
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

// ========== PRODUCT VARIANT FUNCTIONS ==========

/**
 * Recalculate and update product stock based on variants
 * If product has variants, stock = sum of all variant stocks
 * If no variants, stock remains as manually set
 */
export async function updateProductStockFromVariants(productId: string): Promise<void> {
  log.info('Updating product stock from variants', { productId });

  const supabase = await createClient();

  // Get all variants for this product
  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('stock')
    .eq('productId', productId);

  if (error) {
    log.error('Failed to fetch variants for stock calculation', { productId, error });
    return;
  }

  // Only update if product has variants
  if (variants && variants.length > 0) {
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

    await supabase
      .from('products')
      .update({
        stock: totalStock,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', productId);

    log.info('Product stock updated from variants', {
      productId,
      variantCount: variants.length,
      totalStock,
    });
  }
}

/**
 * Get all variants for a product (ordered by 'order' field)
 */
export async function getProductVariants(productId: string): Promise<VariantWithMedia[]> {
  const supabase = await createClient();

  const { data: variants, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('productId', productId)
    .order('order', { ascending: true });

  if (error) {
    log.error('Failed to fetch product variants', { productId, error });
    throw new Error('خطا در دریافت واریانت‌ها');
  }

  // Fetch media for each variant
  const variantsWithMedia: VariantWithMedia[] = [];
  for (const variant of variants || []) {
    const { data: media } = await supabase
      .from('product_media')
      .select('*')
      .eq('variantId', variant.id)
      .order('isDefault', { ascending: false })
      .order('order', { ascending: true });

    variantsWithMedia.push({
      ...variant,
      media: media || [],
    });
  }

  return variantsWithMedia;
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
  log.info('Creating product variant', { productId: data.productId, name: data.name, stock: data.stock });

  const supabase = await createClient();

  // Validate SKU uniqueness if provided
  if (data.sku) {
    const { data: existing } = await supabase
      .from('product_variants')
      .select('*')
      .eq('sku', data.sku)
      .single();

    if (existing) {
      throw new Error('SKU قبلاً ثبت شده است');
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
    throw new Error('خطا در ایجاد واریانت');
  }

  // Update parent product stock
  await updateProductStockFromVariants(data.productId);

  log.info('Product variant created successfully', { variantId: variant.id, productId: data.productId, order });

  return {
    ...variant,
    media: [],
  };
}

/**
 * Update product variant
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
  }>
): Promise<VariantWithMedia> {
  log.info('Updating product variant', { variantId: id, data });

  const supabase = await createClient();

  // Get the variant first to know which product to update
  const { data: existingVariant, error: fetchError } = await supabase
    .from('product_variants')
    .select('productId')
    .eq('id', id)
    .single();

  if (fetchError || !existingVariant) {
    throw new Error('واریانت محصول یافت نشد');
  }

  // Validate SKU uniqueness if being updated
  if (data.sku) {
    const { data: existing } = await supabase
      .from('product_variants')
      .select('*')
      .eq('sku', data.sku)
      .single();

    if (existing && existing.id !== id) {
      throw new Error('SKU قبلاً ثبت شده است');
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
    throw new Error('خطا در بروزرسانی واریانت');
  }

  // Update parent product stock if variant stock was changed
  if (data.stock !== undefined) {
    await updateProductStockFromVariants(existingVariant.productId);
  }

  log.info('Product variant updated successfully', { variantId: id, productId: existingVariant.productId });

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
 */
export async function deleteProductVariant(id: string): Promise<DeleteResult> {
  log.info('Deleting product variant', { variantId: id });

  const supabase = await createClient();

  // Get the variant first to know which product to update
  const { data: existingVariant, error: fetchError } = await supabase
    .from('product_variants')
    .select('productId, order')
    .eq('id', id)
    .single();

  if (fetchError || !existingVariant) {
    throw new Error('واریانت محصول یافت نشد');
  }

  // Delete the variant
  const { error } = await supabase.from('product_variants').delete().eq('id', id);

  if (error) {
    log.error('Failed to delete product variant', { id, error });
    throw new Error('خطا در حذف واریانت');
  }

  // Renumber remaining variants to fill the gap
  const { data: remainingVariants } = await supabase
    .from('product_variants')
    .select('id, order')
    .eq('productId', existingVariant.productId)
    .gt('order', existingVariant.order);

  if (remainingVariants && remainingVariants.length > 0) {
    for (const variant of remainingVariants) {
      await supabase
        .from('product_variants')
        .update({
          order: variant.order - 1,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', variant.id);
    }
  }

  // Update parent product stock after deletion
  await updateProductStockFromVariants(existingVariant.productId);

  log.info('Product variant deleted successfully', { variantId: id, productId: existingVariant.productId });

  return { success: true };
}

/**
 * Reorder product variants
 * Updates the order field for multiple variants in a single transaction
 */
export async function reorderProductVariants(
  productId: string,
  variantOrders: Array<{ id: string; order: number }>
): Promise<void> {
  log.info('Reordering product variants', { productId, count: variantOrders.length });

  const supabase = await createClient();

  // Update each variant's order
  for (const { id, order } of variantOrders) {
    await supabase
      .from('product_variants')
      .update({
        order,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);
  }

  log.info('Product variants reordered successfully', { productId });
}

/**
 * Reorder products
 * Updates the displayOrder field for multiple products in a single transaction
 * This affects the display order on product listing pages, featured products, and discounted products sections
 */
export async function reorderProducts(
  productOrders: Array<{ id: string; displayOrder: number }>
): Promise<void> {
  log.info('Reordering products', { count: productOrders.length });

  const supabase = await createClient();

  // Update each product's displayOrder
  for (const { id, displayOrder } of productOrders) {
    await supabase
      .from('products')
      .update({
        displayOrder,
        updatedAt: new Date().toISOString(),
      })
      .eq('id', id);
  }

  // Invalidate product cache after reordering
  await invalidateProductCache();

  log.info('Products reordered successfully', { count: productOrders.length });
}
