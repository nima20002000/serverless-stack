/**
 * Shared types for product admin pages (new & edit)
 */

export interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
  isDefault?: boolean;
  variantId?: string | null;
  isNew?: boolean;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Variant {
  id: string;
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  material?: string;
  priceAdjust: string;
  stock: string;
  isActive: boolean;
  media?: MediaItem[];
}

export interface ProductFormData {
  name: string;
  description: string;
  price: string;
  discountPercent: string;
  stock: string;
  hasVariants: boolean;
  isFeatured: boolean;
  isActive: boolean;
  categoryId: string | null;
}

export interface VariantFormData {
  name: string;
  sku: string;
  color: string;
  size: string;
  material: string;
  priceAdjust: string;
  stock: string;
  isActive: boolean;
}
