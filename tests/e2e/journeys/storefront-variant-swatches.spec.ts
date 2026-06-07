import { expect, test } from '@playwright/test';
import { cleanupProduct } from '../fixtures/cleanup';
import { createE2ESupabaseClient } from '../utils/database';

const productId = `e2e-product-storefront-swatches-${Date.now()}`;
const now = new Date().toISOString();

test.describe('storefront variant swatches', () => {
  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    await cleanupProduct(productId).catch(() => undefined);

    const { error: productError } = await supabase.from('products').insert({
      id: productId,
      name: 'E2E storefront swatch product',
      description: 'Product detail variant swatch edge coverage.',
      price: 125,
      stock: 10,
      images: ['/e2e/product-legacy.jpg'],
      isActive: true,
      isFeatured: false,
      hasVariants: true,
      discountPercent: null,
      updatedAt: now,
    });

    if (productError) {
      throw new Error(`Failed to seed swatch product: ${productError.message}`);
    }

    const { error: variantsError } = await supabase
      .from('product_variants')
      .insert([
        {
          id: `${productId}-photo-xl`,
          productId,
          name: 'Photo swatch XL',
          size: 'XL',
          material: 'Linen',
          priceAdjust: 5,
          stock: 4,
          isActive: true,
          order: 0,
          swatchImageUrl: '/e2e/photo-swatch-xl.jpg',
          swatchCrop: { x: 24, y: 68, zoom: 2.2 },
          updatedAt: now,
        },
        {
          id: `${productId}-size-m`,
          productId,
          name: 'Size M',
          size: 'M',
          priceAdjust: 0,
          stock: 6,
          isActive: true,
          order: 1,
          updatedAt: now,
        },
        {
          id: `${productId}-cotton`,
          productId,
          name: 'Cotton',
          material: 'Cotton',
          priceAdjust: 0,
          stock: 5,
          isActive: true,
          order: 2,
          updatedAt: now,
        },
        {
          id: `${productId}-sold-out`,
          productId,
          name: 'Sold out photo swatch',
          priceAdjust: 0,
          stock: 0,
          isActive: true,
          order: 3,
          swatchImageUrl: '/e2e/sold-out-swatch.jpg',
          swatchCrop: { x: 50, y: 50, zoom: 1 },
          updatedAt: now,
        },
      ]);

    if (variantsError) {
      throw new Error(
        `Failed to seed swatch variants: ${variantsError.message}`
      );
    }

    const { error: mediaError } = await supabase.from('product_media').insert({
      id: `${productId}-media-default`,
      productId,
      variantId: null,
      type: 'IMAGE',
      url: '/e2e/product-default.jpg',
      alt: 'Default product image',
      order: 0,
      isDefault: true,
    });

    if (mediaError) {
      throw new Error(`Failed to seed swatch media: ${mediaError.message}`);
    }
  });

  test.afterAll(async () => {
    await cleanupProduct(productId);
  });

  test('renders and selects a no-color image swatch without duplicate size controls', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('serverless-stack-theme', 'dark');
    });

    await page.goto(`/products/${productId}`);

    await expect(
      page.getByRole('heading', { name: 'E2E storefront swatch product' })
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute(
      'data-resolved-theme',
      'dark'
    );
    await expect(page.locator('html')).toHaveAttribute('dir', /^(ltr|rtl)$/);

    const photoSwatch = page.getByRole('button', {
      name: 'Photo swatch XL',
    });
    await expect(photoSwatch).toHaveCount(1);
    await expect(photoSwatch).toBeVisible();
    await expect(photoSwatch).toHaveAttribute('aria-pressed', 'true');
    await expect(photoSwatch).toHaveClass(/focus-visible:ring-blue-500/);

    const swatchStyle = await photoSwatch.evaluate((button) => {
      const style = window.getComputedStyle(button);
      return {
        backgroundImage: style.backgroundImage,
        backgroundPosition: style.backgroundPosition,
        backgroundSize: style.backgroundSize,
      };
    });
    expect(swatchStyle.backgroundImage).toContain('/e2e/photo-swatch-xl.jpg');
    expect(swatchStyle.backgroundPosition).toBe('24% 68%');
    expect(swatchStyle.backgroundSize).toBe('220%');

    await expect(
      page.getByRole('button', { name: 'XL', exact: true })
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Size M' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Cotton' })).toBeVisible();

    const soldOutSwatch = page.getByRole('button', {
      name: 'Sold out photo swatch (Out of stock)',
    });
    await expect(soldOutSwatch).toBeDisabled();

    await page.getByRole('button', { name: 'Size M' }).click();
    await expect(photoSwatch).toHaveAttribute('aria-pressed', 'false');
    await expect(
      page.getByText('In stock (6 available)', { exact: true })
    ).toBeVisible();

    await photoSwatch.click();
    await expect(photoSwatch).toHaveAttribute('aria-pressed', 'true');
    await expect(
      page.getByText('In stock (4 available)', { exact: true })
    ).toBeVisible();
    await expect(page.getByText('Selected option')).toBeVisible();
    await expect(page.getByText('Photo swatch XL')).toBeVisible();
  });
});
