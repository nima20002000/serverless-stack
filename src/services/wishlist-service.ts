import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { Tables } from '@/lib/supabase/types';

// ========== TYPE DEFINITIONS ==========

type Product = Tables<'products'>;
type ProductVariant = Tables<'product_variants'>;

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  variantId: string | null;
  createdAt: string;
  product?: WishlistProductInfo;
  variant?: WishlistVariantInfo | null;
}

export interface WishlistProductInfo {
  id: string;
  name: string;
  price: number;
  discountPercent: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
}

export interface WishlistVariantInfo {
  id: string;
  name: string;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
}

export interface WishlistResponse {
  items: WishlistItem[];
  total: number;
}

// ========== HELPER FUNCTIONS ==========

/**
 * Get first image for a product from product_media or images array
 */
async function getProductImages(productId: string): Promise<string[]> {
  const supabase = createClient();

  // First try product_media
  const { data: media } = await supabase
    .from('product_media')
    .select('url')
    .eq('productId', productId)
    .is('variantId', null)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true })
    .limit(3);

  if (media && media.length > 0) {
    return media.map((m) => m.url);
  }

  // Fallback to product.images array
  const { data: product } = await supabase
    .from('products')
    .select('images')
    .eq('id', productId)
    .single();

  return product?.images || [];
}

/**
 * Batch fetch images for multiple products to avoid N+1 queries
 * Returns a map of productId -> images array
 */
async function getBatchProductImages(
  productIds: string[]
): Promise<Map<string, string[]>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const supabase = createClient();
  const productImagesMap = new Map<string, string[]>();

  // Batch fetch all product_media for these products
  const { data: allMedia } = await supabase
    .from('product_media')
    .select('productId, url, isDefault, order')
    .in('productId', productIds)
    .is('variantId', null)
    .order('isDefault', { ascending: false })
    .order('order', { ascending: true });

  // Group media by productId, taking up to 3 images per product
  if (allMedia) {
    const mediaByProduct = new Map<
      string,
      Array<{ url: string; isDefault: boolean | null; order: number }>
    >();
    for (const m of allMedia) {
      if (!mediaByProduct.has(m.productId)) {
        mediaByProduct.set(m.productId, []);
      }
      const arr = mediaByProduct.get(m.productId);
      if (arr && arr.length < 3) {
        arr.push({ url: m.url, isDefault: m.isDefault, order: m.order });
      }
    }

    for (const [productId, mediaArr] of mediaByProduct) {
      productImagesMap.set(
        productId,
        mediaArr.map((m) => m.url)
      );
    }
  }

  // For products without media, fetch their images array
  const productsWithoutMedia = productIds.filter(
    (id) => !productImagesMap.has(id)
  );
  if (productsWithoutMedia.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, images')
      .in('id', productsWithoutMedia);

    if (products) {
      for (const product of products) {
        productImagesMap.set(product.id, product.images || []);
      }
    }
  }

  return productImagesMap;
}

// ========== WISHLIST QUERIES ==========

/**
 * Get all wishlist items for a user
 * Includes product relations (name, price, images, stock, discount)
 * Filters out inactive products
 * Orders by created_at DESC
 */
export async function getUserWishlist(
  userId: string
): Promise<WishlistResponse> {
  log.info('Getting user wishlist', { userId });

  if (!userId) {
    log.warn('getUserWishlist called with empty userId');
    return { items: [], total: 0 };
  }

  const supabase = createClient();

  try {
    // Get wishlist items with product and variant data
    const { data: wishlistItems, error } = await supabase
      .from('wishlists')
      .select(
        `
        id,
        user_id,
        product_id,
        variant_id,
        created_at,
        products!wishlists_product_id_fkey (
          id,
          name,
          price,
          discountPercent,
          stock,
          images,
          isActive
        )
      `
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      log.error('Error fetching user wishlist', { userId, error });
      throw new Error('خطا در دریافت لیست علاقه‌مندی‌ها');
    }

    if (!wishlistItems || wishlistItems.length === 0) {
      return { items: [], total: 0 };
    }

    // Get variant info for items that have variants
    const variantIds = wishlistItems
      .map((item) => item.variant_id)
      .filter((id): id is string => id !== null);

    const variantsMap = new Map<string, ProductVariant>();
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('*')
        .in('id', variantIds);

      if (variants) {
        for (const variant of variants) {
          variantsMap.set(variant.id, variant);
        }
      }
    }

    // Get product images for all products in a single batch query
    const productIds = [
      ...new Set(wishlistItems.map((item) => item.product_id)),
    ];
    const productImagesMap = await getBatchProductImages(productIds);

    // Transform to WishlistItem format
    const items: WishlistItem[] = wishlistItems
      .filter((item) => {
        // Filter out items where product is inactive or deleted
        const product = item.products as unknown as Product | null;
        return product && product.isActive;
      })
      .map((item) => {
        const product = item.products as unknown as Product;
        const variant = item.variant_id
          ? variantsMap.get(item.variant_id)
          : null;
        const images =
          productImagesMap.get(item.product_id) || product.images || [];

        return {
          id: item.id,
          userId: item.user_id,
          productId: item.product_id,
          variantId: item.variant_id,
          createdAt: item.created_at || new Date().toISOString(),
          product: {
            id: product.id,
            name: product.name,
            price: product.price,
            discountPercent: product.discountPercent,
            stock: variant ? variant.stock : product.stock,
            images,
            isActive: product.isActive,
          },
          variant: variant
            ? {
                id: variant.id,
                name: variant.name,
                priceAdjust: variant.priceAdjust,
                stock: variant.stock,
                isActive: variant.isActive,
              }
            : null,
        };
      });

    log.info('User wishlist retrieved', { userId, count: items.length });
    return { items, total: items.length };
  } catch (error) {
    log.error('Error in getUserWishlist', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Add a product to user's wishlist
 * Validates:
 * - Product exists and is active
 * - Variant exists (if variantId provided) and is active
 * - Item not already in wishlist (handles gracefully, returns existing)
 */
export async function addToWishlist(
  userId: string,
  productId: string,
  variantId?: string | null
): Promise<WishlistItem> {
  log.info('Adding to wishlist', { userId, productId, variantId });

  if (!userId) {
    throw new Error('کاربر یافت نشد');
  }

  if (!productId) {
    throw new Error('محصول یافت نشد');
  }

  const supabase = createClient();

  try {
    // Validate product exists and is active
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, name, price, discountPercent, stock, images, isActive')
      .eq('id', productId)
      .single();

    if (productError || !product) {
      log.warn('Product not found for wishlist', { productId });
      throw new Error('محصول یافت نشد');
    }

    if (!product.isActive) {
      log.warn('Attempted to add inactive product to wishlist', { productId });
      throw new Error('محصول در دسترس نیست');
    }

    // Validate variant if provided
    let variant: ProductVariant | null = null;
    if (variantId) {
      const { data: variantData, error: variantError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('id', variantId)
        .eq('productId', productId)
        .single();

      if (variantError || !variantData) {
        log.warn('Variant not found for wishlist', { productId, variantId });
        throw new Error('واریانت محصول یافت نشد');
      }

      if (!variantData.isActive) {
        log.warn('Attempted to add inactive variant to wishlist', {
          variantId,
        });
        throw new Error('واریانت محصول در دسترس نیست');
      }

      variant = variantData;
    }

    // Check if already in wishlist (handle duplicate gracefully)
    let query = supabase
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (variantId) {
      query = query.eq('variant_id', variantId);
    } else {
      query = query.is('variant_id', null);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      log.info('Item already in wishlist, returning existing', {
        userId,
        productId,
        variantId,
      });

      // Return existing item
      const images = await getProductImages(productId);
      return {
        id: existing.id,
        userId: existing.user_id,
        productId: existing.product_id,
        variantId: existing.variant_id,
        createdAt: existing.created_at || new Date().toISOString(),
        product: {
          id: product.id,
          name: product.name,
          price: product.price,
          discountPercent: product.discountPercent,
          stock: variant ? variant.stock : product.stock,
          images,
          isActive: product.isActive,
        },
        variant: variant
          ? {
              id: variant.id,
              name: variant.name,
              priceAdjust: variant.priceAdjust,
              stock: variant.stock,
              isActive: variant.isActive,
            }
          : null,
      };
    }

    // Insert new wishlist item
    const { data: wishlistItem, error: insertError } = await supabase
      .from('wishlists')
      .insert({
        user_id: userId,
        product_id: productId,
        variant_id: variantId || null,
      })
      .select()
      .single();

    if (insertError) {
      log.error('Error inserting wishlist item', { insertError });
      throw new Error('خطا در افزودن به علاقه‌مندی‌ها');
    }

    log.info('Item added to wishlist', { userId, productId, variantId });

    const images = await getProductImages(productId);
    return {
      id: wishlistItem.id,
      userId: wishlistItem.user_id,
      productId: wishlistItem.product_id,
      variantId: wishlistItem.variant_id,
      createdAt: wishlistItem.created_at || new Date().toISOString(),
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        discountPercent: product.discountPercent,
        stock: variant ? variant.stock : product.stock,
        images,
        isActive: product.isActive,
      },
      variant: variant
        ? {
            id: variant.id,
            name: variant.name,
            priceAdjust: variant.priceAdjust,
            stock: variant.stock,
            isActive: variant.isActive,
          }
        : null,
    };
  } catch (error) {
    log.error('Error in addToWishlist', {
      userId,
      productId,
      variantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove a product from user's wishlist by wishlist item ID
 * Validates user owns the wishlist item
 */
export async function removeFromWishlist(
  userId: string,
  wishlistItemId: string
): Promise<{ success: boolean }> {
  log.info('Removing from wishlist by ID', { userId, wishlistItemId });

  if (!userId || !wishlistItemId) {
    return { success: true }; // Idempotent
  }

  const supabase = createClient();

  try {
    // Check ownership
    const { data: existing } = await supabase
      .from('wishlists')
      .select('user_id')
      .eq('id', wishlistItemId)
      .single();

    if (existing && existing.user_id !== userId) {
      log.warn('Unauthorized wishlist removal attempt', {
        userId,
        wishlistItemId,
      });
      throw new Error('دسترسی غیرمجاز');
    }

    const { error } = await supabase
      .from('wishlists')
      .delete()
      .eq('id', wishlistItemId)
      .eq('user_id', userId);

    if (error) {
      log.error('Error removing from wishlist', { error });
      throw new Error('خطا در حذف از علاقه‌مندی‌ها');
    }

    log.info('Item removed from wishlist', { userId, wishlistItemId });
    return { success: true };
  } catch (error) {
    log.error('Error in removeFromWishlist', {
      userId,
      wishlistItemId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Remove by product (and optionally variant)
 * For use when user clicks "remove" on product card
 */
export async function removeFromWishlistByProduct(
  userId: string,
  productId: string,
  variantId?: string | null
): Promise<{ success: boolean }> {
  log.info('Removing from wishlist by product', {
    userId,
    productId,
    variantId,
  });

  if (!userId || !productId) {
    return { success: true }; // Idempotent
  }

  const supabase = createClient();

  try {
    let query = supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (variantId !== undefined) {
      if (variantId === null) {
        query = query.is('variant_id', null);
      } else {
        query = query.eq('variant_id', variantId);
      }
    }

    const { error } = await query;

    if (error) {
      log.error('Error removing from wishlist by product', { error });
      throw new Error('خطا در حذف از علاقه‌مندی‌ها');
    }

    log.info('Item removed from wishlist by product', {
      userId,
      productId,
      variantId,
    });
    return { success: true };
  } catch (error) {
    log.error('Error in removeFromWishlistByProduct', {
      userId,
      productId,
      variantId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Check if a product is in user's wishlist
 * Used for UI state (heart icon filled/unfilled)
 */
export async function isInWishlist(
  userId: string,
  productId: string,
  variantId?: string | null
): Promise<boolean> {
  if (!userId || !productId) {
    return false;
  }

  const supabase = createClient();

  try {
    let query = supabase
      .from('wishlists')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (variantId !== undefined) {
      if (variantId === null) {
        query = query.is('variant_id', null);
      } else {
        query = query.eq('variant_id', variantId);
      }
    }

    const { data, error } = await query.maybeSingle();

    if (error) {
      log.error('Error checking wishlist status', { error });
      return false;
    }

    return !!data;
  } catch (error) {
    log.error('Error in isInWishlist', {
      userId,
      productId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return false;
  }
}

/**
 * Get wishlist count for a user
 * Used for header badge count
 */
export async function getWishlistCount(userId: string): Promise<number> {
  if (!userId) {
    return 0;
  }

  const supabase = createClient();

  try {
    const { count, error } = await supabase
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      log.error('Error getting wishlist count', { error });
      return 0;
    }

    return count || 0;
  } catch (error) {
    log.error('Error in getWishlistCount', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return 0;
  }
}

/**
 * Bulk check if products are in wishlist
 * For product listing pages (avoid N+1 queries)
 */
export async function getWishlistProductIds(
  userId: string
): Promise<Set<string>> {
  if (!userId) {
    return new Set();
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id, variant_id')
      .eq('user_id', userId);

    if (error) {
      log.error('Error getting wishlist product IDs', { error });
      return new Set();
    }

    // Return set of "productId" or "productId:variantId" keys for exact matching
    const ids = new Set<string>();
    for (const item of data || []) {
      if (item.variant_id) {
        ids.add(`${item.product_id}:${item.variant_id}`);
      } else {
        ids.add(item.product_id);
      }
    }

    return ids;
  } catch (error) {
    log.error('Error in getWishlistProductIds', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Set();
  }
}

/**
 * Clear all items from wishlist
 */
export async function clearWishlist(
  userId: string
): Promise<{ count: number }> {
  log.info('Clearing user wishlist', { userId });

  if (!userId) {
    return { count: 0 };
  }

  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('wishlists')
      .delete()
      .eq('user_id', userId)
      .select('id');

    if (error) {
      log.error('Error clearing wishlist', { error });
      throw new Error('خطا در پاک کردن علاقه‌مندی‌ها');
    }

    const count = data?.length || 0;
    log.info('Wishlist cleared', { userId, count });
    return { count };
  } catch (error) {
    log.error('Error in clearWishlist', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Merge local (guest) wishlist items with server wishlist
 * Called when a guest user logs in to transfer their local wishlist
 * Only adds items that don't already exist in server wishlist
 * Uses batch queries to avoid N+1 patterns
 */
export async function mergeWishlist(
  userId: string,
  localItems: Array<{ productId: string; variantId?: string | null }>
): Promise<{ added: number; skipped: number }> {
  log.info('Merging local wishlist with server', {
    userId,
    localItemCount: localItems.length,
  });

  if (!userId || !localItems || localItems.length === 0) {
    return { added: 0, skipped: 0 };
  }

  const supabase = createClient();

  let added = 0;
  let skipped = 0;

  try {
    // Get existing wishlist items for user
    const { data: existingItems } = await supabase
      .from('wishlists')
      .select('product_id, variant_id')
      .eq('user_id', userId);

    // Create a set of existing items for quick lookup
    const existingSet = new Set<string>();
    if (existingItems) {
      for (const item of existingItems) {
        const key = item.variant_id
          ? `${item.product_id}:${item.variant_id}`
          : item.product_id;
        existingSet.add(key);
      }
    }

    // Filter out items that already exist
    const newItems = localItems.filter((localItem) => {
      const itemKey = localItem.variantId
        ? `${localItem.productId}:${localItem.variantId}`
        : localItem.productId;
      return !existingSet.has(itemKey);
    });

    // Count skipped due to existing
    const skippedDueToExisting = localItems.length - newItems.length;

    if (newItems.length === 0) {
      return { added: 0, skipped: skippedDueToExisting };
    }

    // BATCH: Fetch all products in one query
    const productIds = [...new Set(newItems.map((item) => item.productId))];
    const { data: products } = await supabase
      .from('products')
      .select('id, isActive')
      .in('id', productIds);

    const activeProductIds = new Set(
      (products || []).filter((p) => p.isActive).map((p) => p.id)
    );

    // BATCH: Fetch all variants in one query
    const variantIds = newItems
      .filter((item) => item.variantId)
      .map((item) => item.variantId as string);

    const activeVariantMap = new Map<string, string>(); // variantId -> productId
    if (variantIds.length > 0) {
      const { data: variants } = await supabase
        .from('product_variants')
        .select('id, productId, isActive')
        .in('id', variantIds);

      if (variants) {
        for (const v of variants) {
          if (v.isActive) {
            activeVariantMap.set(v.id, v.productId);
          }
        }
      }
    }

    // Collect valid items for batch insert
    const validItems: Array<{
      user_id: string;
      product_id: string;
      variant_id: string | null;
    }> = [];

    for (const localItem of newItems) {
      // Check if product is active
      if (!activeProductIds.has(localItem.productId)) {
        skipped++;
        continue;
      }

      // Check variant if provided
      if (localItem.variantId) {
        const variantProductId = activeVariantMap.get(localItem.variantId);
        // Variant must exist, be active, and belong to the correct product
        if (variantProductId !== localItem.productId) {
          skipped++;
          continue;
        }
      }

      validItems.push({
        user_id: userId,
        product_id: localItem.productId,
        variant_id: localItem.variantId || null,
      });
    }

    // BATCH: Insert all valid items at once
    if (validItems.length > 0) {
      const { error: insertError, data: insertedData } = await supabase
        .from('wishlists')
        .insert(validItems)
        .select('id');

      if (insertError) {
        log.warn('Failed to batch insert wishlist items', {
          userId,
          error: insertError.message,
          attemptedCount: validItems.length,
        });
        // Fall back to individual inserts for better error handling
        for (const item of validItems) {
          const { error: singleError } = await supabase
            .from('wishlists')
            .insert(item);

          if (singleError) {
            skipped++;
          } else {
            added++;
          }
        }
      } else {
        added = insertedData?.length || validItems.length;
      }
    }

    // Add skipped due to existing to total
    skipped += skippedDueToExisting;

    log.info('Wishlist merge completed', { userId, added, skipped });
    return { added, skipped };
  } catch (error) {
    log.error('Error in mergeWishlist', {
      userId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

/**
 * Prepare wishlist item for cart
 * Validates product is in stock and returns data for cart store to add
 */
export async function prepareWishlistItemForCart(
  userId: string,
  wishlistItemId: string
): Promise<{
  productId: string;
  name: string;
  price: number;
  image: string;
  stock: number;
  variantId?: string;
  variantName?: string;
}> {
  log.info('Preparing wishlist item for cart', { userId, wishlistItemId });

  const supabase = createClient();

  try {
    // Get wishlist item with product data
    const { data: wishlistItem, error } = await supabase
      .from('wishlists')
      .select(
        `
        id,
        user_id,
        product_id,
        variant_id,
        products!wishlists_product_id_fkey (
          id,
          name,
          price,
          discountPercent,
          stock,
          images,
          isActive
        )
      `
      )
      .eq('id', wishlistItemId)
      .eq('user_id', userId)
      .single();

    if (error || !wishlistItem) {
      throw new Error('آیتم علاقه‌مندی یافت نشد');
    }

    const product = wishlistItem.products as unknown as Product;

    if (!product || !product.isActive) {
      throw new Error('محصول در دسترس نیست');
    }

    // Get variant if applicable
    let variant: ProductVariant | null = null;
    if (wishlistItem.variant_id) {
      const { data: variantData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('id', wishlistItem.variant_id)
        .single();

      if (variantData && variantData.isActive) {
        variant = variantData;
      }
    }

    const stock = variant ? variant.stock : product.stock;
    if (stock <= 0) {
      throw new Error('محصول ناموجود است');
    }

    // Calculate effective price
    let effectivePrice = product.price;
    if (variant) {
      effectivePrice += variant.priceAdjust;
    }
    if (product.discountPercent && product.discountPercent > 0) {
      effectivePrice = effectivePrice * (1 - product.discountPercent / 100);
    }

    // Get image
    const images = await getProductImages(wishlistItem.product_id);
    const image = images[0] || '';

    return {
      productId: product.id,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      price: Math.round(effectivePrice),
      image,
      stock,
      variantId: variant?.id,
      variantName: variant?.name,
    };
  } catch (error) {
    log.error('Error in prepareWishlistItemForCart', {
      userId,
      wishlistItemId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}
