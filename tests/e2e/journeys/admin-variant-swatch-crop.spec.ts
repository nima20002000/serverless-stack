import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'test-secret';
const productId = 'e2e-swatch-product';
const variantId = 'e2e-swatch-variant';
const swatchUrl = 'https://cdn.example.test/products/blue-swatch.jpg';
const brokenSwatchUrl = 'https://cdn.example.test/products/broken-swatch.jpg';
const imagePng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
  'base64'
);

type SavedVariant = {
  tempId?: string;
  id?: string;
  name: string;
  color?: string;
  stock: number;
  swatchImageUrl?: string | null;
  swatchCrop?: { x: number; y: number; zoom: number } | null;
};

async function addAdminSession(context: BrowserContext) {
  const adminSessionToken = await encode({
    secret: nextAuthSecret,
    token: {
      sub: 'e2e-swatch-admin',
      id: 'e2e-swatch-admin',
      uid: 'e2e-swatch-admin',
      name: 'Swatch Admin',
      email: 'swatch-admin@example.com',
      role: 'ADMIN',
    },
  });

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: adminSessionToken,
      url: 'http://localhost:3000',
    },
  ]);
}

async function mockSwatchApis(
  page: Page,
  saved: {
    createdVariant?: SavedVariant;
    mediaSynced?: boolean;
    patchedVariant?: SavedVariant;
  },
  options: {
    mediaObjects?: Array<{
      key: string;
      url: string;
      size?: number;
    }>;
    brokenImageUrls?: string[];
  } = {}
) {
  const mediaObjects = options.mediaObjects || [
    {
      key: 'products/blue-swatch.jpg',
      size: 1200,
      url: swatchUrl,
    },
  ];
  const brokenImageUrls = new Set(options.brokenImageUrls || []);

  await page.route('**/api/categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: [] }),
    });
  });

  await page.route('**/api/admin/r2-browser**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        prefixes: [],
        objects: mediaObjects.map((object) => ({
          key: object.key,
          size: object.size || 1200,
          lastModified: '2026-06-06T00:00:00.000Z',
          url: object.url,
        })),
        nextContinuationToken: null,
        isTruncated: false,
      }),
    });
  });

  for (const object of mediaObjects) {
    await page.route(object.url, async (route) => {
      if (brokenImageUrls.has(object.url)) {
        await route.fulfill({ status: 404, body: '' });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: imagePng,
      });
    });
  }

  await page.route('**/api/products', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ product: { id: productId } }),
      });
      return;
    }

    await route.continue();
  });

  await page.route(`**/api/products/${productId}/variants`, async (route) => {
    const method = route.request().method();

    if (method === 'POST') {
      const payload = route.request().postDataJSON() as {
        variants: SavedVariant[];
      };
      saved.createdVariant = payload.variants[0];

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          variants: [{ ...saved.createdVariant, id: variantId }],
          idMapping: {
            [saved.createdVariant.tempId || 'variant-temp']: variantId,
          },
        }),
      });
      return;
    }

    if (method === 'PATCH') {
      const payload = route.request().postDataJSON() as {
        variants: SavedVariant[];
      };
      saved.patchedVariant = payload.variants[0];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ updated: 1 }),
      });
      return;
    }

    await route.continue();
  });

  await page.route(`**/api/products/${productId}/media`, async (route) => {
    saved.mediaSynced = true;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route(`**/api/products/${productId}?**`, async (route) => {
    const variant = saved.patchedVariant ||
      saved.createdVariant || {
        id: variantId,
        name: 'Blue',
        color: '#2563eb',
        stock: 6,
        swatchImageUrl: swatchUrl,
        swatchCrop: { x: 24, y: 68, zoom: 2.2 },
      };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        product: {
          id: productId,
          name: 'Swatch product',
          description: 'Product with swatch crop.',
          price: 49,
          discountPercent: null,
          stock: 6,
          images: [],
          hasVariants: true,
          isFeatured: false,
          isActive: true,
          categoryId: null,
          tags: [],
          media: [],
          variants: [
            {
              id: variantId,
              name: variant.name,
              sku: '',
              color: variant.color || '#2563eb',
              size: '',
              material: '',
              priceAdjust: 0,
              stock: variant.stock,
              order: 0,
              isActive: true,
              media: [
                {
                  id: 'media-blue',
                  type: 'IMAGE',
                  url: swatchUrl,
                  alt: 'Blue swatch',
                  order: 0,
                  isDefault: true,
                  variantId,
                },
              ],
              swatchImageUrl: variant.swatchImageUrl,
              swatchCrop: variant.swatchCrop,
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/admin/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        total: 0,
        page: 1,
        perPage: 20,
        totalPages: 0,
      }),
    });
  });
}

async function setRangeValue(page: Page, label: string, value: string) {
  await page.getByLabel(label).evaluate((element, nextValue) => {
    const input = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    valueSetter?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(page.getByLabel(label)).toHaveValue(value);
}

test.describe('admin variant swatch crop', () => {
  test('creates and reloads a cropped variant image swatch', async ({
    context,
    page,
  }) => {
    const saved: {
      createdVariant?: SavedVariant;
      mediaSynced?: boolean;
      patchedVariant?: SavedVariant;
    } = {};
    await addAdminSession(context);
    await mockSwatchApis(page, saved);

    await page.goto('/admin/products/new');
    await expect(
      page.getByRole('heading', { name: 'Add product' })
    ).toBeVisible();

    await page.getByLabel('Product name').fill('Swatch product');
    await page
      .locator('textarea[name="description"]')
      .fill('Product with swatch crop.');
    await page.getByLabel(/Price/).fill('49');
    await page.getByLabel(/^Stock$/).fill('6');

    await page.getByRole('button', { name: '+ Add variant' }).click();
    await page.getByLabel('Variant name').fill('Blue');
    await page.locator('input[name="stock"]').last().fill('6');

    await page
      .getByRole('button', { name: '+ Select from media library' })
      .nth(1)
      .click();
    await expect(
      page.getByRole('heading', { name: 'Media library' })
    ).toBeVisible();
    await page.getByText('blue-swatch.jpg').click();
    await page.getByRole('button', { name: 'Select (1)' }).click();

    await page
      .getByRole('button', {
        name: /Use image blue-swatch\.jpg as swatch/,
      })
      .click();
    await setRangeValue(page, 'Horizontal crop', '24');
    await setRangeValue(page, 'Vertical crop', '68');
    await setRangeValue(page, 'Zoom', '2.2');

    await page.getByRole('button', { name: /^Add$/ }).click();
    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);

    expect(saved.createdVariant).toEqual(
      expect.objectContaining({
        name: 'Blue',
      })
    );
    expect(saved.createdVariant).not.toHaveProperty('swatchImageUrl');
    expect(saved.createdVariant).not.toHaveProperty('swatchCrop');
    expect(saved.mediaSynced).toBe(true);
    expect(saved.patchedVariant).toEqual(
      expect.objectContaining({
        name: 'Blue',
        swatchImageUrl: swatchUrl,
        swatchCrop: { x: 24, y: 68, zoom: 2.2 },
      })
    );

    await page.goto(`/admin/products/${productId}/edit`);
    await expect(
      page.getByRole('heading', { name: 'Edit product' })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Edit' }).click();
    const preview = page.getByLabel('Variant swatch preview');
    await expect(preview).toBeVisible();
    await expect(preview).toHaveCSS(
      'background-image',
      new RegExp('blue-swatch\\.jpg')
    );
    await expect(preview).toHaveCSS('background-position', '24% 68%');
    await expect(preview).toHaveCSS('background-size', '220%');
  });

  test('supports keyboard swatch selection, clear flow, and mobile RTL layout', async ({
    context,
    page,
  }) => {
    const saved: {
      createdVariant?: SavedVariant;
      mediaSynced?: boolean;
      patchedVariant?: SavedVariant;
    } = {};
    await page.setViewportSize({ width: 390, height: 844 });
    await addAdminSession(context);
    await mockSwatchApis(page, saved);

    await page.goto('/admin/products/new');
    await page.evaluate(() => {
      document.documentElement.dir = 'rtl';
    });

    await page.getByLabel('Product name').fill('Swatch product');
    await page
      .locator('textarea[name="description"]')
      .fill('Product with swatch crop.');
    await page.getByLabel(/Price/).fill('49');
    await page.getByLabel(/^Stock$/).fill('6');

    await page.getByRole('button', { name: '+ Add variant' }).click();
    await page.getByLabel('Variant name').fill('Blue');
    await page.locator('input[name="stock"]').last().fill('6');

    await page
      .getByRole('button', { name: '+ Select from media library' })
      .nth(1)
      .click();
    await page.getByText('blue-swatch.jpg').click();
    await page.getByRole('button', { name: 'Select (1)' }).click();

    const swatchChoice = page.getByRole('button', {
      name: /Use image blue-swatch\.jpg as swatch/,
    });
    await swatchChoice.focus();
    await page.keyboard.press('Enter');
    await expect(swatchChoice).toHaveAttribute('aria-pressed', 'true');

    await expect(page.getByLabel('Horizontal crop')).toBeVisible();
    await expect(page.getByLabel('Vertical crop')).toBeVisible();
    await expect(page.getByLabel('Zoom')).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeEnabled();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(swatchChoice).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByLabel('Horizontal crop')).toBeHidden();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeEnabled();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      )
      .toBe(true);
  });

  test('blocks saving and shows an admin warning for a broken swatch image', async ({
    context,
    page,
  }) => {
    const saved: {
      createdVariant?: SavedVariant;
      mediaSynced?: boolean;
      patchedVariant?: SavedVariant;
    } = {};
    await addAdminSession(context);
    await mockSwatchApis(page, saved, {
      mediaObjects: [
        {
          key: 'products/broken-swatch.jpg',
          url: brokenSwatchUrl,
        },
      ],
      brokenImageUrls: [brokenSwatchUrl],
    });

    await page.goto('/admin/products/new');
    await page.getByLabel('Product name').fill('Swatch product');
    await page
      .locator('textarea[name="description"]')
      .fill('Product with broken swatch.');
    await page.getByLabel(/Price/).fill('49');
    await page.getByLabel(/^Stock$/).fill('6');

    await page.getByRole('button', { name: '+ Add variant' }).click();
    await page.getByLabel('Variant name').fill('Broken');
    await page.locator('input[name="stock"]').last().fill('6');

    await page
      .getByRole('button', { name: '+ Select from media library' })
      .nth(1)
      .click();
    await page.getByText('broken-swatch.jpg').click();
    await page.getByRole('button', { name: 'Select (1)' }).click();

    await page
      .getByRole('button', {
        name: /Use image broken-swatch\.jpg as swatch/,
      })
      .click();

    await expect(
      page.getByText('Selected swatch image could not be loaded')
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeDisabled();
    await expect(page.getByLabel('Horizontal crop')).toBeDisabled();

    await page.getByRole('button', { name: 'Clear' }).click();
    await expect(
      page.getByText('Selected swatch image could not be loaded')
    ).toBeHidden();
    await expect(page.getByRole('button', { name: /^Add$/ })).toBeEnabled();
  });
});
