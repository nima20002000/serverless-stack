/**
 * SEO-optimized Alt Text Generation
 *
 * This module provides utilities for generating SEO-friendly alt text
 * for images across the e-commerce platform.
 */

interface ProductAltTextOptions {
  productName: string;
  variantName?: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  imageIndex?: number;
  totalImages?: number;
}

interface CategoryAltTextOptions {
  categoryName: string;
}

/**
 * Generate SEO-optimized alt text for product images
 *
 * Strategy:
 * - Product images: "{productName} - {variantDetails}"
 * - Include variant details (color, size, material) when available
 * - Add image position for multiple images (e.g., "تصویر 1 از 3")
 *
 * Examples:
 * - "لیوان سفری استیل - نقره‌ای، 500 میلی‌لیتر"
 * - "ماگ سرامیکی - رنگ سفید"
 * - "لیوان شیشه‌ای - تصویر 1 از 3"
 */
export function generateProductAltText(options: ProductAltTextOptions): string {
  const {
    productName,
    variantName,
    color,
    size,
    material,
    imageIndex,
    totalImages
  } = options;

  // Start with product name
  let altText = productName;

  // Build variant details array
  const variantDetails: string[] = [];

  // Add variant name if available and not redundant with product name
  if (variantName && !productName.includes(variantName)) {
    variantDetails.push(variantName);
  }

  // Add color if available
  if (color) {
    variantDetails.push(color);
  }

  // Add size if available
  if (size) {
    variantDetails.push(size);
  }

  // Add material if available
  if (material) {
    variantDetails.push(material);
  }

  // Append variant details if any
  if (variantDetails.length > 0) {
    altText += ` - ${variantDetails.join('، ')}`;
  }

  // Add image position for galleries (only if there are multiple images)
  if (imageIndex !== undefined && totalImages !== undefined && totalImages > 1) {
    altText += ` - تصویر ${imageIndex + 1} از ${totalImages}`;
  }

  return altText;
}

/**
 * Generate SEO-optimized alt text for category images
 *
 * Strategy: "دسته‌بندی {categoryName}"
 *
 * Example: "دسته‌بندی لیوان‌های سفری"
 */
export function generateCategoryAltText(options: CategoryAltTextOptions): string {
  const { categoryName } = options;
  return `دسته‌بندی ${categoryName}`;
}

/**
 * Generate alt text for hero/banner images
 * Keep descriptive and meaningful
 */
export function generateHeroAltText(description: string): string {
  return description;
}

/**
 * Fallback alt text when no better option is available
 * Use product/category name only
 */
export function generateFallbackAltText(name: string): string {
  return name;
}
