import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  devices,
  expect,
  test,
  type Page,
} from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createTestUserInDB, createE2ESupabaseClient } from '../utils/database';

type SnapshotEntry = {
  id: string;
  issue: string;
  section: string;
  route: string;
  outputPath: string;
  viewport: 'desktop' | 'mobile';
  theme: 'dark' | 'light' | 'system';
  locale: string;
  direction: 'ltr' | 'rtl';
  authState: string;
  captureStatus: 'captured' | 'planned' | 'sample';
};

type SnapshotManifest = {
  entries: SnapshotEntry[];
};

type CartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  variantId?: string;
  variantName?: string;
};

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const manifestPath = path.join(
  repoRoot,
  'docs/presentation-snapshots/manifest.json'
);
const appBaseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const snapshotTimestamp = '2026-01-15T12:00:00.000Z';

const productId = 'e2e-presentation-snapshot-product';
const lampProductId = 'e2e-presentation-snapshot-lamp';
const toteProductId = 'e2e-presentation-snapshot-tote';
const variantId = `${productId}-navy-medium`;
const secondVariantId = `${productId}-sage-large`;
const soldOutVariantId = `${productId}-sold-out`;
const categoryId = 'e2e-presentation-snapshot-category';
const userId = 'e2e-user-presentation-snapshot';
const transactionId = 'e2e-tx-presentation-snapshot';
const transactionCode = 'TX-E2E-SNAPSHOT';
const invoiceId = 'e2e-invoice-presentation-snapshot';
const snapshotProductIds = [productId, lampProductId, toteProductId];

const cartItems: CartItem[] = [
  {
    productId,
    variantId,
    variantName: 'Midnight Navy / Medium',
    name: 'Snapshot Field Jacket - Midnight Navy / Medium',
    price: 152,
    quantity: 1,
    image: '/images/seed/canvas-tote.svg',
    stock: 9,
  },
  {
    productId: lampProductId,
    name: 'Snapshot Desk Lamp',
    price: 86,
    quantity: 2,
    image: '/images/seed/desk-lamp.svg',
    stock: 12,
  },
];

const wishlistItems = [
  {
    productId,
    variantId,
    name: 'Snapshot Field Jacket',
    price: 149,
    image: '/images/seed/canvas-tote.svg',
    stock: 9,
    discountPercent: 10,
    variantName: 'Midnight Navy / Medium',
    addedAt: snapshotTimestamp,
  },
];

async function readManifest(): Promise<SnapshotManifest> {
  return JSON.parse(
    await fs.readFile(manifestPath, 'utf8')
  ) as SnapshotManifest;
}

async function expectNoSupabaseError(
  label: string,
  request: PromiseLike<{ error: { message: string } | null }>
) {
  const { error } = await request;
  if (error) throw new Error(`${label}: ${error.message}`);
}

async function cleanupSnapshotData() {
  const supabase = createE2ESupabaseClient();

  await expectNoSupabaseError(
    'cleanup snapshot invoice',
    supabase.from('invoices').delete().eq('id', invoiceId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot transaction items',
    supabase
      .from('transaction_items')
      .delete()
      .eq('transactionId', transactionId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot transaction',
    supabase.from('transactions').delete().eq('id', transactionId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot wishlist',
    supabase.from('wishlists').delete().eq('user_id', userId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot activity logs',
    supabase.from('user_activity_logs').delete().eq('user_id', userId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot user',
    supabase.from('users').delete().eq('id', userId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot media translations',
    supabase
      .from('product_media_translations')
      .delete()
      .in('mediaId', [
        `${productId}-media-default`,
        `${productId}-media-sage`,
        `${lampProductId}-media-default`,
        `${toteProductId}-media-default`,
      ])
  );
  await expectNoSupabaseError(
    'cleanup snapshot product translations',
    supabase
      .from('product_translations')
      .delete()
      .in('productId', snapshotProductIds)
  );
  await expectNoSupabaseError(
    'cleanup snapshot category translations',
    supabase.from('category_translations').delete().eq('categoryId', categoryId)
  );
  await expectNoSupabaseError(
    'cleanup snapshot media',
    supabase.from('product_media').delete().in('productId', snapshotProductIds)
  );
  await expectNoSupabaseError(
    'cleanup snapshot variants',
    supabase
      .from('product_variants')
      .delete()
      .in('productId', snapshotProductIds)
  );
  await expectNoSupabaseError(
    'cleanup snapshot products',
    supabase.from('products').delete().in('id', snapshotProductIds)
  );
  await expectNoSupabaseError(
    'cleanup snapshot category',
    supabase.from('categories').delete().eq('id', categoryId)
  );
}

async function assertSnapshotLanguagesAvailable() {
  const supabase = createE2ESupabaseClient();
  const { data, error } = await supabase
    .from('supported_languages')
    .select('code, isEnabled, direction')
    .in('code', ['en', 'de']);

  if (error) {
    throw new Error(`fetch snapshot language rows: ${error.message}`);
  }

  const rowsByCode = new Map((data ?? []).map((row) => [row.code, row]));

  for (const code of ['en', 'de']) {
    const row = rowsByCode.get(code);
    if (!row?.isEnabled) {
      throw new Error(
        `presentation snapshots require enabled ${code} supported_languages row`
      );
    }
    if (row.direction !== 'ltr') {
      throw new Error(
        `presentation snapshots expect ${code} direction to be ltr`
      );
    }
  }
}

async function seedSnapshotData() {
  const supabase = createE2ESupabaseClient();
  await cleanupSnapshotData();
  await assertSnapshotLanguagesAvailable();

  await expectNoSupabaseError(
    'seed snapshot category',
    supabase.from('categories').insert({
      id: categoryId,
      name: 'Snapshot Outerwear',
      slug: 'snapshot-outerwear',
      description: 'Safe demo category for presentation snapshots.',
      isActive: true,
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed German category translation',
    supabase.from('category_translations').insert({
      categoryId,
      locale: 'de',
      name: 'Snapshot Oberbekleidung',
      description: 'Sichere Demo-Kategorie fuer Praesentations-Snapshots.',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed snapshot products',
    supabase.from('products').insert([
      {
        id: productId,
        name: 'Snapshot Field Jacket',
        description:
          'A deterministic presentation product with media, swatches, stock, and localized content.',
        price: 149,
        stock: 24,
        images: ['/images/seed/canvas-tote.svg'],
        categoryId,
        isActive: true,
        isFeatured: true,
        hasVariants: true,
        discountPercent: 10,
        displayOrder: -3000,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: lampProductId,
        name: 'Snapshot Desk Lamp',
        description: 'A second safe demo product for cart and catalog states.',
        price: 86,
        stock: 12,
        images: ['/images/seed/desk-lamp.svg'],
        categoryId,
        isActive: true,
        isFeatured: true,
        hasVariants: false,
        discountPercent: null,
        displayOrder: -2990,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: toteProductId,
        name: 'Snapshot Canvas Tote',
        description: 'A third safe demo product for populated catalog grids.',
        price: 42,
        stock: 18,
        images: ['/images/seed/canvas-tote.svg'],
        categoryId,
        isActive: true,
        isFeatured: false,
        hasVariants: false,
        discountPercent: null,
        displayOrder: -2980,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed snapshot variants',
    supabase.from('product_variants').insert([
      {
        id: variantId,
        productId,
        name: 'Midnight Navy / Medium',
        sku: 'SNAP-NAVY-M',
        color: '#1f3a5f',
        size: 'M',
        material: 'Organic cotton',
        priceAdjust: 3,
        stock: 9,
        isActive: true,
        order: 0,
        swatchImageUrl: '/images/seed/canvas-tote.svg',
        swatchCrop: { x: 38, y: 44, zoom: 1.8 },
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: secondVariantId,
        productId,
        name: 'Sage Green / Large',
        sku: 'SNAP-SAGE-L',
        color: '#6f8f72',
        size: 'L',
        material: 'Recycled canvas',
        priceAdjust: 8,
        stock: 6,
        isActive: true,
        order: 1,
        swatchImageUrl: '/images/seed/home-goods.svg',
        swatchCrop: { x: 55, y: 45, zoom: 2 },
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: soldOutVariantId,
        productId,
        name: 'Archive Black / Small',
        sku: 'SNAP-BLACK-S',
        color: '#111827',
        size: 'S',
        material: 'Cotton twill',
        priceAdjust: 0,
        stock: 0,
        isActive: true,
        order: 2,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed snapshot media',
    supabase.from('product_media').insert([
      {
        id: `${productId}-media-default`,
        productId,
        variantId: null,
        type: 'IMAGE',
        url: '/images/seed/canvas-tote.svg',
        alt: 'Snapshot field jacket default media',
        isDefault: true,
        order: 0,
      },
      {
        id: `${productId}-media-sage`,
        productId,
        variantId: secondVariantId,
        type: 'IMAGE',
        url: '/images/seed/home-goods.svg',
        alt: 'Snapshot field jacket sage media',
        isDefault: false,
        order: 1,
      },
      {
        id: `${lampProductId}-media-default`,
        productId: lampProductId,
        variantId: null,
        type: 'IMAGE',
        url: '/images/seed/desk-lamp.svg',
        alt: 'Snapshot desk lamp',
        isDefault: true,
        order: 0,
      },
      {
        id: `${toteProductId}-media-default`,
        productId: toteProductId,
        variantId: null,
        type: 'IMAGE',
        url: '/images/seed/canvas-tote.svg',
        alt: 'Snapshot canvas tote',
        isDefault: true,
        order: 0,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed German product translations',
    supabase.from('product_translations').insert({
      productId,
      locale: 'de',
      name: 'Snapshot Feldjacke',
      description:
        'Lokalisierter Demo-Artikel mit Medien, Varianten, Lagerbestand und sicheren Präsentationsdaten.',
      seoTitle: 'Snapshot Feldjacke',
      seoDescription: 'Lokalisierter Demo-Artikel fuer Praesentationen.',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed German media translation',
    supabase.from('product_media_translations').insert({
      mediaId: `${productId}-media-default`,
      locale: 'de',
      alt: 'Snapshot Feldjacke Standardbild',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await createTestUserInDB({
    id: userId,
    uid: 'e2e-presentation-snapshot-user',
    email: 'presentation-snapshot@example.com',
    phone: '+12025550127',
    name: 'Presentation Snapshot User',
    password: 'Snapshot123!@#',
    isVerified: true,
    role: 'USER',
    shippingAddress: 'Snapshot Demo Address 1',
    postalCode: '00000',
  });

  await expectNoSupabaseError(
    'freeze snapshot user timestamps',
    supabase
      .from('users')
      .update({
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
        shippingCountry: 'Demo Country',
        shippingRegion: 'Demo Region',
        shippingCity: 'Demo City',
        shippingAddressLine1: 'Snapshot Demo Address 1',
        shippingAddressLine2: 'Suite 4',
      })
      .eq('id', userId)
  );

  await expectNoSupabaseError(
    'seed snapshot wishlist',
    supabase.from('wishlists').insert({
      user_id: userId,
      product_id: productId,
      variant_id: variantId,
      created_at: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed snapshot transaction',
    supabase.from('transactions').insert({
      id: transactionId,
      userId,
      amount: 152,
      subtotal: 152,
      discountAmount: 0,
      status: 'COMPLETED',
      transactionCode,
      phone: '+12025550127',
      fullName: 'Presentation Snapshot User',
      email: 'presentation-snapshot@example.com',
      shippingAddress: 'Snapshot Demo Address 1, Demo City, Demo Country',
      shippingCountry: 'Demo Country',
      shippingRegion: 'Demo Region',
      shippingCity: 'Demo City',
      shippingAddressLine1: 'Snapshot Demo Address 1',
      shippingAddressLine2: 'Suite 4',
      postalCode: '00000',
      paymentMethod: 'STRIPE',
      paymentProviderRef: null,
      stripePaymentIntentId: null,
      isGuest: false,
      createAccount: false,
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed snapshot transaction item',
    supabase.from('transaction_items').insert({
      id: 'e2e-item-presentation-snapshot',
      transactionId,
      productId,
      variantId,
      quantity: 1,
      price: 152,
    })
  );

  await expectNoSupabaseError(
    'seed snapshot invoice',
    supabase.from('invoices').insert({
      id: invoiceId,
      transactionId,
      invoiceNumber: 'INV-E2E-SNAPSHOT',
      generatedAt: snapshotTimestamp,
    })
  );
}

async function cleanupSnapshotRun() {
  await cleanupSnapshotData();
}

async function newSnapshotPage(
  browser: Browser,
  entry: SnapshotEntry
): Promise<{ context: BrowserContext; page: Page }> {
  const contextOptions: BrowserContextOptions =
    entry.viewport === 'mobile'
      ? { ...devices['Pixel 5'] }
      : { viewport: { width: 1440, height: 1100 } };
  const context = await browser.newContext({
    ...contextOptions,
    extraHTTPHeaders: { 'x-e2e-test': 'true' },
  });

  return { context, page: await context.newPage() };
}

async function loginDemoUser(page: Page) {
  await page.goto(new URL('/login', appBaseURL).href);
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page
    .locator('input[name="identifier"]')
    .fill('presentation-snapshot@example.com');
  await page.locator('input[name="password"]').fill('Snapshot123!@#');
  const submitButton = page.locator('button[type="submit"]');
  await expect(submitButton).toBeEnabled();
  await Promise.all([
    page.waitForURL(
      (url) => /^\/(?:[a-z]{2}\/?)?$/.test(new URL(url).pathname),
      { timeout: 30000 }
    ),
    submitButton.click(),
  ]);
}

async function seedCart(page: Page) {
  await page.addInitScript((items) => {
    window.localStorage.setItem(
      'cart-storage',
      JSON.stringify({ state: { items }, version: 0 })
    );
  }, cartItems);
}

async function seedWishlist(page: Page) {
  await page.addInitScript((items) => {
    window.localStorage.setItem(
      'wishlist-storage',
      JSON.stringify({ state: { items }, version: 0 })
    );
  }, wishlistItems);
}

async function setCartStorage(page: Page) {
  await page.evaluate((items) => {
    window.localStorage.setItem(
      'cart-storage',
      JSON.stringify({ state: { items }, version: 0 })
    );
  }, cartItems);
}

async function preparePage(page: Page, entry: SnapshotEntry) {
  await page.addInitScript(
    ({ theme }) => {
      window.localStorage.setItem('serverless-stack-theme', theme);
    },
    { theme: entry.theme }
  );

  if (entry.id.includes('cart') || entry.id.includes('checkout')) {
    await seedCart(page);
  }

  if (entry.section === 'wishlist') {
    await seedWishlist(page);
  }

  if (entry.authState === 'demo-user') {
    await loginDemoUser(page);
  }

  const targetUrl = new URL(entry.route, appBaseURL).href;
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');

  if (entry.id.includes('cart') || entry.id.includes('checkout')) {
    await setCartStorage(page);
    await page.goto(targetUrl);
    await page.waitForLoadState('domcontentloaded');
  }

  await expect(page.locator('html')).toHaveAttribute('lang', entry.locale);
  await expect(page.locator('html')).toHaveAttribute('dir', entry.direction);

  if (entry.id.includes('checkout')) {
    await page.locator('#fullName').fill('Snapshot Checkout User');
    await page.locator('#phone').fill('+12025550199');
    await page.locator('#email').fill('checkout-snapshot@example.com');
    await page.locator('#shippingCountry').fill('Demo Country');
    await page.locator('#shippingRegion').fill('Demo Region');
    await page.locator('#shippingCity').fill('Demo City');
    await page.locator('#shippingAddressLine1').fill('Snapshot Demo Address 1');
    await page.locator('#shippingAddressLine2').fill('Demo suite');
    await page.locator('#postalCode').fill('00000');
  }

  if (entry.id === 'storefront-home-mobile-dark-en') {
    await page.getByRole('button', { name: /Toggle navigation menu/i }).click();
  }

  if (entry.authState === 'guest' && entry.section !== 'checkout') {
    await expect(
      page.getByRole('link', {
        name: entry.locale === 'de' ? 'Anmelden' : 'Sign in',
      })
    ).toBeVisible({ timeout: 15000 });
  }

  await assertSnapshotState(page, entry);
  await hidePresentationOnlySensitiveFields(page, entry);
  await expectNoNextJsErrorOverlay(page);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0s !important;
        animation-delay: 0s !important;
        transition-duration: 0s !important;
        transition-delay: 0s !important;
      }
      nextjs-portal {
        display: none !important;
        visibility: hidden !important;
      }
    `,
  });
  await expectNoNextJsErrorOverlay(page);
}

async function hidePresentationOnlySensitiveFields(
  page: Page,
  entry: SnapshotEntry
) {
  if (entry.section === 'checkout') {
    const paymentMethodCard = page
      .getByRole('heading', { name: 'Payment method' })
      .locator('xpath=ancestor::div[contains(@class, "rounded-xl")][1]');

    if ((await paymentMethodCard.count()) > 0) {
      await paymentMethodCard.evaluate((element) => {
        element.setAttribute(
          'data-presentation-hidden',
          'payment-provider-controls'
        );
        element.setAttribute('aria-hidden', 'true');
        element.setAttribute('hidden', '');
        (element as HTMLElement).style.setProperty(
          'display',
          'none',
          'important'
        );
      });
    }
  }

  await page.locator('body').evaluate((body) => {
    const providerPattern = /\b(?:Stripe|PayPal)\b/i;
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);

    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.trim();
      const element = node.parentElement;

      if (text && providerPattern.test(text) && element) {
        const target =
          element.closest('label, p, span, li, a, button, div') ?? element;

        if (target !== body) {
          target.setAttribute('data-presentation-hidden', 'payment-provider');
          target.setAttribute('aria-hidden', 'true');
          target.setAttribute('hidden', '');
          (target as HTMLElement).style.setProperty(
            'display',
            'none',
            'important'
          );
        }
      }

      node = walker.nextNode();
    }
  });

  await expectNoVisibleProviderIdentifiers(page, entry);
}

async function expectNoVisibleProviderIdentifiers(
  page: Page,
  entry: SnapshotEntry
) {
  const visibleProviderTexts = await page.locator('body').evaluate((body) => {
    const providerPattern = /\b(?:Stripe|PayPal)\b/i;
    const visibleTexts: string[] = [];
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);

    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.trim();
      const element = node.parentElement;

      if (text && providerPattern.test(text) && element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        const isVisible =
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0';

        if (isVisible) visibleTexts.push(text);
      }

      node = walker.nextNode();
    }

    return visibleTexts;
  });

  expect(
    visibleProviderTexts,
    `${entry.id} should not expose payment provider identifiers`
  ).toEqual([]);
}

async function assertSnapshotState(page: Page, entry: SnapshotEntry) {
  if (entry.section === 'home' || entry.section === 'mobile-home') {
    await expect(
      page.getByRole('heading', {
        name: /production-minded commerce storefront/i,
      })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'products') {
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await expect(page.getByText('Snapshot Field Jacket').first()).toBeVisible();
    return;
  }

  if (entry.section === 'product-detail' && entry.locale === 'de') {
    await expect(
      page.getByRole('heading', { name: 'Snapshot Feldjacke' })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'product-detail') {
    await expect(
      page.getByRole('heading', { name: 'Snapshot Field Jacket' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Sage Green/ })
    ).toBeVisible();
    await expect(page.getByText(/In stock/)).toBeVisible();
    return;
  }

  if (entry.section === 'cart') {
    await expect(
      page.getByRole('heading', { name: 'Cart', exact: true })
    ).toBeVisible();
    await expect(page.getByText('Snapshot Desk Lamp')).toBeVisible();
    return;
  }

  if (entry.section === 'checkout') {
    await expect(
      page.getByRole('heading', { name: 'Shipping information' })
    ).toBeVisible();
    await expect(page.getByText('Snapshot Desk Lamp')).toBeVisible();
    await expect(page.locator('#shippingCountry')).toHaveValue('Demo Country');
    return;
  }

  if (entry.section === 'payment-status') {
    await expect(
      page.getByRole('heading', { name: 'Zahlung abgebrochen' })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'profile') {
    await expect(
      page.getByRole('heading', { name: 'Account profile' })
    ).toBeVisible();
    await expect(page.getByText(transactionCode)).toBeVisible();
    return;
  }

  if (entry.section === 'wishlist') {
    await expect(
      page.getByRole('heading', { name: 'Wishlist (1)' })
    ).toBeVisible();
    await expect(page.getByText('Snapshot Field Jacket')).toBeVisible();
    await expect(page.getByText('Midnight Navy / Medium')).toBeVisible();
  }
}

async function expectNoNextJsErrorOverlay(page: Page) {
  await expect(
    page.locator(
      'nextjs-portal [data-nextjs-dialog], [data-nextjs-dialog], [data-nextjs-dialog-overlay]'
    )
  ).toHaveCount(0);
}

test.describe.serial('presentation storefront snapshots', () => {
  test.beforeAll(seedSnapshotData);
  test.afterAll(cleanupSnapshotRun);

  test('captures NIM-227 storefront entries listed in the manifest', async ({
    browser,
  }) => {
    const manifest = await readManifest();
    const entries = manifest.entries.filter(
      (entry) => entry.issue === 'NIM-227' && entry.captureStatus === 'captured'
    );

    expect(entries.length).toBeGreaterThanOrEqual(8);

    for (const entry of entries) {
      const { context, page } = await newSnapshotPage(browser, entry);
      const outputPath = path.resolve(repoRoot, entry.outputPath);

      try {
        await preparePage(page, entry);
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await page.screenshot({ path: outputPath });
      } finally {
        await context.close();
      }

      const stats = await fs.stat(outputPath);
      expect(
        stats.size,
        `${entry.outputPath} should be non-empty`
      ).toBeGreaterThan(20_000);
    }
  });
});
