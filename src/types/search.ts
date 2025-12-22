/**
 * Search types shared between client and server
 * This file is safe to import in client components
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
