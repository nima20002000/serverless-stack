import prisma from '@/lib/prisma/client';
import { Prisma } from '@prisma/client';

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
}) {
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
    }),
    prisma.product.count({ where }),
  ]);

  return {
    products,
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
}) {
  return getAllProducts({ ...options, includeInactive: false });
}

/**
 * Get product by ID
 */
export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
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
}) {
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
    products,
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
  stock: number;
  images?: string[];
  isActive?: boolean;
}) {
  // Validate required fields
  if (!data.name || !data.description) {
    throw new Error('نام و توضیحات محصول الزامی است');
  }

  if (data.price <= 0) {
    throw new Error('قیمت باید بیشتر از صفر باشد');
  }

  if (data.stock < 0) {
    throw new Error('موجودی نمی‌تواند منفی باشد');
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      description: data.description,
      price: data.price,
      stock: data.stock,
      images: data.images || [],
      isActive: data.isActive !== undefined ? data.isActive : true,
    },
  });

  return product;
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
    stock: number;
    images: string[];
    isActive: boolean;
  }>
) {
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

  const product = await prisma.product.update({
    where: { id },
    data,
  });

  return product;
}

/**
 * Delete product (admin only)
 */
export async function deleteProduct(id: string) {
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

  return { success: true };
}

/**
 * Update product stock
 */
export async function updateStock(id: string, quantity: number) {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    throw new Error('محصول یافت نشد');
  }

  const newStock = product.stock + quantity;

  if (newStock < 0) {
    throw new Error('موجودی کافی نیست');
  }

  const updated = await prisma.product.update({
    where: { id },
    data: { stock: newStock },
  });

  return updated;
}

/**
 * Format price to Persian/Toman format
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
}
