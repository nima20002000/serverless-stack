import { Product, Category, Tag, ProductMedia, ProductVariant, MediaType } from '@prisma/client';

// Product with all relations
export type ProductWithRelations = Product & {
  category?: Category | null;
  tags?: Tag[];
  media?: ProductMedia[];
  variants?: ProductVariant[];
};

// Product with media
export type ProductWithMedia = Product & {
  media: ProductMedia[];
};

// Product variant with media
export type VariantWithMedia = ProductVariant & {
  media: ProductMedia[];
};

// Full product (all relations)
export type FullProduct = Product & {
  category: Category | null;
  tags: Tag[];
  media: ProductMedia[];
  variants: VariantWithMedia[];
};

// Category with hierarchy
export type CategoryWithHierarchy = Category & {
  parent?: Category | null;
  children?: Category[];
  _count?: {
    products: number;
  };
};

// Tag with product count
export type TagWithCount = Tag & {
  _count?: {
    products: number;
  };
};

// Media upload response
export interface MediaUploadResponse {
  success: boolean;
  url?: string;
  type?: MediaType;
  error?: string;
}

// Product form data for admin
export interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  categoryId?: string;
  tagIds?: string[];
  isActive: boolean;
}

// Variant form data
export interface VariantFormData {
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  material?: string;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
}

// Media form data
export interface MediaFormData {
  productId: string;
  variantId?: string;
  type: MediaType;
  url: string;
  alt?: string;
  order: number;
}

// Category form data
export interface CategoryFormData {
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
}

// Tag form data
export interface TagFormData {
  name: string;
  slug: string;
}
