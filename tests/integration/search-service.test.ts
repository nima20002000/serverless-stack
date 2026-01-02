/**
 * Integration Tests for Search Service
 *
 * Tests real search behavior across products and categories.
 * These tests validate real behavior against the Supabase database.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Uses real persisted data
 * - Validates positive and negative matches
 * - Ensures inactive records are excluded unless requested
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient } from '../utils/test-client';
import { cleanupTestCategories, cleanupTestProducts } from '../utils/cleanup';
import { searchAll } from '../../src/services/search-service';

const supabase = createTestSupabaseClient();

async function createTestCategory(params: {
  name: string;
  slug: string;
  description?: string;
  isActive: boolean;
}) {
  const categoryId = randomUUID();
  const { error } = await supabase.from('categories').insert({
    id: categoryId,
    name: params.name,
    slug: params.slug,
    description: params.description,
    isActive: params.isActive,
  });

  if (error) {
    throw new Error(`Failed to create test category: ${error.message}`);
  }

  return categoryId;
}

async function createTestProduct(params: {
  name: string;
  description: string;
  isActive: boolean;
  categoryId?: string;
}) {
  const productId = randomUUID();
  const { error } = await supabase.from('products').insert({
    id: productId,
    name: params.name,
    description: params.description,
    price: 120000,
    stock: 4,
    isActive: params.isActive,
    categoryId: params.categoryId,
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test product: ${error.message}`);
  }

  return productId;
}

describe('Search Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestProducts();
    await cleanupTestCategories();
  });

  afterEach(async () => {
    await cleanupTestProducts();
    await cleanupTestCategories();
  });

  it('should return empty results for blank queries', async () => {
    const response = await searchAll('   ');

    expect(response.total).toBe(0);
    expect(response.products).toHaveLength(0);
    expect(response.categories).toHaveLength(0);
  });

  it('should return active products and categories that match the query', async () => {
    const query = `pineapple-${Date.now()}`;
    const activeCategoryId = await createTestCategory({
      name: `TEST-Search-Category-${Date.now()}`,
      slug: `test-search-category-${Date.now()}`,
      description: `Category for ${query}`,
      isActive: true,
    });

    const inactiveCategoryId = await createTestCategory({
      name: `TEST-Search-Category-Inactive-${Date.now()}`,
      slug: `test-search-category-inactive-${Date.now()}`,
      description: `Inactive ${query}`,
      isActive: false,
    });

    const activeProductId = await createTestProduct({
      name: `TEST-Search-Product-${Date.now()}`,
      description: `Active product ${query}`,
      isActive: true,
      categoryId: activeCategoryId,
    });

    const inactiveProductId = await createTestProduct({
      name: `TEST-Search-Product-Inactive-${Date.now()}`,
      description: `Inactive product ${query}`,
      isActive: false,
      categoryId: activeCategoryId,
    });

    const response = await searchAll(query.toUpperCase(), { limit: 10 });

    expect(response.total).toBe(2);
    expect(response.products.map((p) => p.id)).toContain(activeProductId);
    expect(response.categories.map((c) => c.id)).toContain(activeCategoryId);
    expect(response.products.map((p) => p.id)).not.toContain(inactiveProductId);
    expect(response.categories.map((c) => c.id)).not.toContain(
      inactiveCategoryId
    );

    const matchedProduct = response.products.find(
      (product) => product.id === activeProductId
    );
    if (!matchedProduct) {
      throw new Error('Expected active product to be returned');
    }
    expect(matchedProduct.categoryName).toBe(
      response.categories.find((category) => category.id === activeCategoryId)
        ?.name || null
    );
  });

  it('should include inactive results when includeInactive is true', async () => {
    const query = `dragonfruit-${Date.now()}`;
    const activeCategoryId = await createTestCategory({
      name: `TEST-Search-Active-Category-${Date.now()}`,
      slug: `test-search-active-category-${Date.now()}`,
      description: `Active ${query}`,
      isActive: true,
    });

    const inactiveCategoryId = await createTestCategory({
      name: `TEST-Search-Inactive-Category-${Date.now()}`,
      slug: `test-search-inactive-category-${Date.now()}`,
      description: `Inactive ${query}`,
      isActive: false,
    });

    const activeProductId = await createTestProduct({
      name: `TEST-Search-Active-Product-${Date.now()}`,
      description: `Active product ${query}`,
      isActive: true,
      categoryId: activeCategoryId,
    });

    const inactiveProductId = await createTestProduct({
      name: `TEST-Search-Inactive-Product-${Date.now()}`,
      description: `Inactive product ${query}`,
      isActive: false,
      categoryId: inactiveCategoryId,
    });

    const response = await searchAll(query, {
      limit: 10,
      includeInactive: true,
    });

    expect(response.total).toBe(4);
    expect(response.products.map((p) => p.id)).toContain(activeProductId);
    expect(response.products.map((p) => p.id)).toContain(inactiveProductId);
    expect(response.categories.map((c) => c.id)).toContain(activeCategoryId);
    expect(response.categories.map((c) => c.id)).toContain(inactiveCategoryId);
  });
});
