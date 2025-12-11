import prisma from '@/lib/prisma/client';
import { Prisma, Product, ProductMedia } from '@prisma/client';
import { ProductWithRelations, VariantWithMedia } from '@/types/product';
import { PaginatedResponse, DeleteResult } from '@/types/api';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';

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
  const skip = (page - 1) * perPage;

  const where: Prisma.ProductWhereInput = {};

  // Base isActive filter
  if (!options?.includeInactive) {
    where.isActive = true;
  } else if (options.status) {
    // Status filter (active/inactive)
    where.isActive = options.status === 'active';
  }

  // Search filter
  if (options?.search) {
    where.OR = [
      { name: { contains: options.search, mode: 'insensitive' } },
      { description: { contains: options.search, mode: 'insensitive' } },
    ];
  }

  // Stock filter
  if (options?.stock) {
    if (options.stock === 'in-stock') {
      where.stock = { gt: 0 };
    } else if (options.stock === 'out-of-stock') {
      where.stock = 0;
    }
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        media: {
          where: { variantId: null },
          orderBy: { order: 'asc' },
        },
        variants: {
          include: {
            media: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  // Populate images array with media URLs for backward compatibility
  const productsWithImages = products.map((product) => {
    let images = [...product.images]; // Start with existing images

    // If no images in the legacy field, populate from media
    if (images.length === 0) {
      // First, try to get images from product's direct media
      const productMediaUrls = product.media.map((m) => m.url);

      if (productMediaUrls.length > 0) {
        images = productMediaUrls;
      } else {
        // If no product media, get images from the first variant that has media
        const variantWithMedia = product.variants.find((v) => v.media.length > 0);
        if (variantWithMedia) {
          images = variantWithMedia.media.map((m) => m.url);
        }
      }
    }

    return {
      ...product,
      images,
    };
  });

  return {
    data: productsWithImages,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
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

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      isFeatured: true,
    },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      media: {
        where: { variantId: null },
        orderBy: { order: 'asc' },
      },
      variants: {
        include: {
          media: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  // Populate images array with media URLs for backward compatibility
  const productsWithImages = products.map((product) => {
    let images = [...product.images];

    if (images.length === 0) {
      const productMediaUrls = product.media.map((m) => m.url);

      if (productMediaUrls.length > 0) {
        images = productMediaUrls;
      } else {
        const variantWithMedia = product.variants.find((v) => v.media.length > 0);
        if (variantWithMedia) {
          images = variantWithMedia.media.map((m) => m.url);
        }
      }
    }

    return {
      ...product,
      images,
    };
  });

  return productsWithImages;
}

/**
 * Get discounted/sale products (database-level filtering)
 * Optimized query that directly fetches only products with active discounts
 */
export async function getDiscountedProducts(options?: {
  limit?: number;
}): Promise<ProductWithRelations[]> {
  const limit = options?.limit || 4;

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      discountPercent: {
        gt: 0,
      },
    },
    take: limit,
    orderBy: { discountPercent: 'desc' }, // Sort by highest discount first
    include: {
      media: {
        where: { variantId: null },
        orderBy: { order: 'asc' },
      },
      variants: {
        include: {
          media: {
            orderBy: { order: 'asc' },
          },
        },
      },
    },
  });

  // Populate images array with media URLs for backward compatibility
  const productsWithImages = products.map((product) => {
    let images = [...product.images];

    if (images.length === 0) {
      const productMediaUrls = product.media.map((m) => m.url);

      if (productMediaUrls.length > 0) {
        images = productMediaUrls;
      } else {
        const variantWithMedia = product.variants.find((v) => v.media.length > 0);
        if (variantWithMedia) {
          images = variantWithMedia.media.map((m) => m.url);
        }
      }
    }

    return {
      ...product,
      images,
    };
  });

  return productsWithImages;
}

/**
 * Get product by ID
 */
export async function getProductById(id: string, includeRelations = false): Promise<Product | ProductWithRelations> {
  const product = await prisma.product.findUnique({
    where: { id },
    ...(includeRelations && {
      include: {
        category: true,
        tags: true,
        media: {
          orderBy: { order: 'asc' },
        },
        variants: {
          include: {
            media: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    }),
  });

  if (!product) {
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
  const skip = (page - 1) * perPage;

  const where: Prisma.ProductWhereInput = {
    isActive: true,
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ],
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    data: products,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  };
}

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

    const product = await prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        discountPercent: data.discountPercent,
        stock: data.stock,
        images: data.images || [],
        categoryId: data.categoryId,
        isFeatured: data.isFeatured !== undefined ? data.isFeatured : false,
        isActive: data.isActive !== undefined ? data.isActive : true,
        ...(data.tagIds && data.tagIds.length > 0 && {
          tags: {
            connect: data.tagIds.map((id) => ({ id })),
          },
        }),
      },
      include: {
        category: true,
        tags: true,
        media: true,
        variants: true,
      },
    });

    log.info('Product created successfully', {
      productId: product.id,
      name: product.name,
      price: product.price,
    });

    // Invalidate product cache
    await invalidateProductCache();

    return product;
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
    isFeatured: boolean;
    isActive: boolean;
  }>
): Promise<ProductWithRelations> {
  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

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
  const updateData: Prisma.ProductUpdateInput = { ...data };
  delete (updateData as Record<string, unknown>).tagIds;

  // If tagIds provided, update tag connections
  if (tagIds !== undefined) {
    // First, disconnect all existing tags
    await prisma.product.update({
      where: { id },
      data: {
        tags: {
          set: [],
        },
      },
    });

    // Then connect new tags
    if (tagIds.length > 0) {
      updateData.tags = {
        connect: tagIds.map((tagId) => ({ id: tagId })),
      };
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    include: {
      category: true,
      tags: true,
      media: true,
      variants: true,
    },
  });

  // Invalidate product cache
  await invalidateProductCache();

  return product;
}

/**
 * Delete product (admin only)
 */
export async function deleteProduct(id: string): Promise<DeleteResult> {
  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id },
  });

  if (!existingProduct) {
    throw new Error('محصول یافت نشد');
  }

  await prisma.product.delete({
    where: { id },
  });

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
    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
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

    const updated = await prisma.product.update({
      where: { id },
      data: { stock: newStock },
    });

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
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order?: number;
}): Promise<ProductMedia> {
  const media = await prisma.productMedia.create({
    data: {
      productId: data.productId,
      variantId: data.variantId,
      type: data.type,
      url: data.url,
      alt: data.alt,
      order: data.order ?? 0,
    },
  });

  return media;
}

/**
 * Get all media for a product
 */
export async function getProductMedia(productId: string): Promise<ProductMedia[]> {
  const media = await prisma.productMedia.findMany({
    where: { productId },
    orderBy: { order: 'asc' },
  });

  return media;
}

/**
 * Update media order or alt text
 */
export async function updateProductMedia(
  id: string,
  data: Partial<{ alt: string; order: number }>
): Promise<ProductMedia> {
  const media = await prisma.productMedia.update({
    where: { id },
    data,
  });

  return media;
}

/**
 * Delete product media
 */
export async function deleteProductMedia(id: string): Promise<DeleteResult> {
  await prisma.productMedia.delete({
    where: { id },
  });

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

  // Get all variants for this product
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: { stock: true },
  });

  // Only update if product has variants
  if (variants.length > 0) {
    const totalStock = variants.reduce((sum, variant) => sum + variant.stock, 0);

    await prisma.product.update({
      where: { id: productId },
      data: { stock: totalStock },
    });

    log.info('Product stock updated from variants', {
      productId,
      variantCount: variants.length,
      totalStock
    });
  }
}

/**
 * Get all variants for a product
 */
export async function getProductVariants(productId: string): Promise<VariantWithMedia[]> {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    include: {
      media: {
        orderBy: { order: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return variants;
}

/**
 * Create product variant
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
  isActive?: boolean;
}): Promise<VariantWithMedia> {
  log.info('Creating product variant', { productId: data.productId, name: data.name, stock: data.stock });

  // Validate SKU uniqueness if provided
  if (data.sku) {
    const existing = await prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      throw new Error('SKU قبلاً ثبت شده است');
    }
  }

  const variant = await prisma.productVariant.create({
    data: {
      productId: data.productId,
      name: data.name,
      sku: data.sku,
      color: data.color,
      size: data.size,
      material: data.material,
      priceAdjust: data.priceAdjust || 0,
      stock: data.stock,
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
    include: {
      media: true,
    },
  });

  // Update parent product stock
  await updateProductStockFromVariants(data.productId);

  log.info('Product variant created successfully', { variantId: variant.id, productId: data.productId });

  return variant;
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

  // Get the variant first to know which product to update
  const existingVariant = await prisma.productVariant.findUnique({
    where: { id },
    select: { productId: true },
  });

  if (!existingVariant) {
    throw new Error('واریانت محصول یافت نشد');
  }

  // Validate SKU uniqueness if being updated
  if (data.sku) {
    const existing = await prisma.productVariant.findUnique({
      where: { sku: data.sku },
    });

    if (existing && existing.id !== id) {
      throw new Error('SKU قبلاً ثبت شده است');
    }
  }

  const variant = await prisma.productVariant.update({
    where: { id },
    data,
    include: {
      media: true,
    },
  });

  // Update parent product stock if variant stock was changed
  if (data.stock !== undefined) {
    await updateProductStockFromVariants(existingVariant.productId);
  }

  log.info('Product variant updated successfully', { variantId: id, productId: existingVariant.productId });

  return variant;
}

/**
 * Delete product variant
 */
export async function deleteProductVariant(id: string): Promise<DeleteResult> {
  log.info('Deleting product variant', { variantId: id });

  // Get the variant first to know which product to update
  const existingVariant = await prisma.productVariant.findUnique({
    where: { id },
    select: { productId: true },
  });

  if (!existingVariant) {
    throw new Error('واریانت محصول یافت نشد');
  }

  await prisma.productVariant.delete({
    where: { id },
  });

  // Update parent product stock after deletion
  await updateProductStockFromVariants(existingVariant.productId);

  log.info('Product variant deleted successfully', { variantId: id, productId: existingVariant.productId });

  return { success: true };
}
