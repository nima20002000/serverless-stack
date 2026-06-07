import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  expect,
  test,
  type Page,
} from '@playwright/test';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

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

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const manifestPath = path.join(
  repoRoot,
  'docs/presentation-snapshots/manifest.json'
);
const appBaseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const snapshotTimestamp = '2026-01-15T12:00:00.000Z';

const adminUser = {
  id: 'e2e-presentation-admin-user',
  uid: 'e2e-presentation-admin-uid',
  email: 'presentation-admin@example.com',
  phone: '+12025550191',
  name: 'Presentation Admin',
  password: 'Snapshot123!@#',
};

const customerUser = {
  id: 'e2e-presentation-admin-customer',
  uid: 'e2e-presentation-admin-customer-uid',
  email: 'presentation-customer@example.com',
  phone: '+12025550192',
  name: 'Presentation Customer',
  password: 'Snapshot123!@#',
};

const categoryId = 'e2e-presentation-admin-category';
const tagId = 'e2e-presentation-admin-tag';
const productId = 'e2e-presentation-admin-product';
const secondProductId = 'e2e-presentation-admin-accessory';
const variantId = 'e2e-presentation-admin-variant-navy';
const secondVariantId = 'e2e-presentation-admin-variant-sage';
const mediaIds = [
  'e2e-presentation-admin-media-default',
  'e2e-presentation-admin-media-variant',
];
const transactionIds = [
  'e2e-presentation-admin-tx-completed',
  'e2e-presentation-admin-tx-pending',
  'e2e-presentation-admin-tx-failed',
];
const invoiceId = 'e2e-presentation-admin-invoice';
const snapshotSalesRange = {
  startDate: '2026-06-01',
  endDate: '2026-06-30',
  groupBy: 'day',
};

function getDashboardStatsResponse() {
  return {
    users: {
      total: 2,
      new: 2,
    },
    products: {
      total: 2,
      active: 1,
    },
    transactions: {
      total: 3,
      pending: 1,
      completed: 1,
      failed: 1,
    },
    revenue: {
      total: 192,
      thisMonth: 192,
    },
    recentTransactions: [
      {
        id: transactionIds[0],
        transactionCode: 'TX-PRESENT-ADMIN-001',
        amount: 192,
        status: 'COMPLETED',
        createdAt: '2026-06-05T10:00:00.000Z',
        user: {
          name: customerUser.name,
          email: customerUser.email,
        },
      },
      {
        id: transactionIds[1],
        transactionCode: 'TX-PRESENT-ADMIN-002',
        amount: 48,
        status: 'PENDING',
        createdAt: '2026-06-06T10:00:00.000Z',
        user: {
          name: 'Presentation Guest',
          email: 'presentation-guest@example.com',
        },
      },
    ],
  };
}

function getSalesAnalyticsResponse() {
  return {
    filters: {
      ...snapshotSalesRange,
      timezone: 'UTC',
    },
    summary: {
      completedRevenue: 192,
      totalSalesRevenue: 288,
      completedOrders: 1,
      averageOrderValue: 192,
      totalAttempts: 3,
      pendingAttempts: 1,
      failedAttempts: 1,
      paymentSuccessRate: 33.3,
      discountTotal: 0,
    },
    timeline: [
      {
        key: '2026-06-05',
        label: '2026-06-05',
        completedRevenue: 192,
        completedOrders: 1,
        attempts: 1,
      },
      {
        key: '2026-06-06',
        label: '2026-06-06',
        completedRevenue: 0,
        completedOrders: 0,
        attempts: 1,
      },
      {
        key: '2026-06-07',
        label: '2026-06-07',
        completedRevenue: 0,
        completedOrders: 0,
        attempts: 1,
      },
    ],
    breakdowns: {
      status: [
        { key: 'COMPLETED', label: 'Completed', count: 1, amount: 192 },
        { key: 'PENDING', label: 'Pending', count: 1, amount: 48 },
        { key: 'FAILED', label: 'Failed', count: 1, amount: 48 },
      ],
      paymentProvider: [
        { key: 'card', label: 'Card', count: 2, completedRevenue: 192 },
        { key: 'wallet', label: 'Wallet', count: 1, completedRevenue: 0 },
      ],
      customerType: [
        {
          key: 'registered',
          label: 'Registered',
          count: 1,
          completedRevenue: 192,
        },
        { key: 'guest', label: 'Guest', count: 2, completedRevenue: 0 },
      ],
    },
    topProducts: [
      {
        productId,
        name: 'Snapshot Admin Jacket',
        quantity: 1,
        completedRevenue: 192,
      },
      {
        productId: secondProductId,
        name: 'Snapshot Admin Accessory',
        quantity: 0,
        completedRevenue: 0,
      },
    ],
    topVariants: [
      {
        variantId,
        productId,
        name: 'Midnight Navy / Medium',
        productName: 'Snapshot Admin Jacket',
        quantity: 1,
        completedRevenue: 192,
      },
    ],
    attentionList: [
      {
        id: transactionIds[1],
        transactionCode: 'TX-PRESENT-ADMIN-002',
        amount: 48,
        status: 'PENDING',
        paymentProvider: 'Wallet',
        customerName: 'Presentation Guest',
        createdAt: '2026-06-06T10:00:00.000Z',
        reason: 'pending',
      },
      {
        id: transactionIds[2],
        transactionCode: 'TX-PRESENT-ADMIN-003',
        amount: 48,
        status: 'FAILED',
        paymentProvider: 'Card',
        customerName: 'Presentation Failed Guest',
        createdAt: '2026-06-07T10:00:00.000Z',
        reason: 'failed',
      },
    ],
  };
}

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
  const userIds = [adminUser.id, customerUser.id];

  await expectNoSupabaseError(
    'cleanup admin snapshot invoices',
    supabase.from('invoices').delete().in('transactionId', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot transaction items',
    supabase
      .from('transaction_items')
      .delete()
      .in('transactionId', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot transactions',
    supabase.from('transactions').delete().in('id', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot media translations',
    supabase.from('product_media_translations').delete().in('mediaId', mediaIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot product translations',
    supabase
      .from('product_translations')
      .delete()
      .in('productId', [productId, secondProductId])
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot tag translations',
    supabase.from('tag_translations').delete().eq('tagId', tagId)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot category translations',
    supabase.from('category_translations').delete().eq('categoryId', categoryId)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot product tags',
    supabase.from('_ProductToTag').delete().eq('B', tagId)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot media',
    supabase.from('product_media').delete().in('id', mediaIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot variants',
    supabase
      .from('product_variants')
      .delete()
      .in('id', [variantId, secondVariantId])
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot products',
    supabase.from('products').delete().in('id', [productId, secondProductId])
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot tag',
    supabase.from('tags').delete().eq('id', tagId)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot category',
    supabase.from('categories').delete().eq('id', categoryId)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot activity logs',
    supabase.from('user_activity_logs').delete().in('user_id', userIds)
  );
  await expectNoSupabaseError(
    'cleanup admin snapshot users',
    supabase.from('users').delete().in('id', userIds)
  );
}

async function seedSnapshotData() {
  const supabase = createE2ESupabaseClient();
  await cleanupSnapshotData();

  await Promise.all([
    createTestUserInDB({
      ...adminUser,
      isVerified: true,
      role: 'ADMIN',
    }),
    createTestUserInDB({
      ...customerUser,
      isVerified: true,
      role: 'USER',
    }),
  ]);

  await expectNoSupabaseError(
    'seed admin snapshot category',
    supabase.from('categories').insert({
      id: categoryId,
      name: 'Snapshot Admin Category',
      slug: 'snapshot-admin-category',
      description: 'Safe admin presentation category.',
      image: '/images/seed/home-goods.svg',
      isActive: true,
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed admin snapshot tag',
    supabase.from('tags').insert({
      id: tagId,
      name: 'Snapshot Admin Tag',
      slug: 'snapshot-admin-tag',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed admin snapshot products',
    supabase.from('products').insert([
      {
        id: productId,
        name: 'Snapshot Admin Jacket',
        description:
          'Presentation admin product with media, variants, swatches, and localized controls.',
        price: 188,
        stock: 16,
        images: ['/images/seed/canvas-tote.svg'],
        categoryId,
        isActive: true,
        isFeatured: true,
        hasVariants: true,
        discountPercent: 12,
        displayOrder: -4000,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: secondProductId,
        name: 'Snapshot Admin Accessory',
        description:
          'Second safe admin product for list and analytics surfaces.',
        price: 48,
        stock: 0,
        images: ['/images/seed/desk-lamp.svg'],
        categoryId,
        isActive: false,
        isFeatured: false,
        hasVariants: false,
        discountPercent: null,
        displayOrder: -3990,
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed admin snapshot product tag',
    supabase.from('_ProductToTag').insert({ A: productId, B: tagId })
  );

  await expectNoSupabaseError(
    'seed admin snapshot variants',
    supabase.from('product_variants').insert([
      {
        id: variantId,
        productId,
        name: 'Midnight Navy / Medium',
        sku: 'PRESENT-NAVY-M',
        color: '#1f3a5f',
        size: 'M',
        material: 'Organic cotton',
        priceAdjust: 4,
        stock: 7,
        isActive: true,
        order: 0,
        swatchImageUrl: '/images/seed/canvas-tote.svg',
        swatchCrop: { x: 42, y: 45, zoom: 1.7 },
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
      {
        id: secondVariantId,
        productId,
        name: 'Sage Green / Large',
        sku: 'PRESENT-SAGE-L',
        color: '#6f8f72',
        size: 'L',
        material: 'Recycled canvas',
        priceAdjust: 8,
        stock: 4,
        isActive: true,
        order: 1,
        swatchImageUrl: '/images/seed/home-goods.svg',
        swatchCrop: { x: 54, y: 44, zoom: 1.9 },
        createdAt: snapshotTimestamp,
        updatedAt: snapshotTimestamp,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed admin snapshot media',
    supabase.from('product_media').insert([
      {
        id: mediaIds[0],
        productId,
        variantId: null,
        type: 'IMAGE',
        url: '/images/seed/canvas-tote.svg',
        alt: 'Snapshot admin jacket media',
        isDefault: true,
        order: 0,
      },
      {
        id: mediaIds[1],
        productId,
        variantId,
        type: 'IMAGE',
        url: '/images/seed/home-goods.svg',
        alt: 'Snapshot admin variant media',
        isDefault: true,
        order: 1,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed admin snapshot product translation',
    supabase.from('product_translations').insert({
      productId,
      locale: 'de',
      name: 'Snapshot Admin Jacke',
      description: 'Lokalisierte sichere Admin-Demo.',
      seoTitle: 'Snapshot Admin Jacke',
      seoDescription: 'Admin Praesentationsartikel.',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );
  await expectNoSupabaseError(
    'seed admin snapshot media translation',
    supabase.from('product_media_translations').insert({
      mediaId: mediaIds[0],
      locale: 'de',
      alt: 'Snapshot Admin Jacke Bild',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );
  await expectNoSupabaseError(
    'seed admin snapshot category translation',
    supabase.from('category_translations').insert({
      categoryId,
      locale: 'de',
      name: 'Snapshot Admin Kategorie',
      description: 'Sichere Kategorie fuer Admin-Snapshots.',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );
  await expectNoSupabaseError(
    'seed admin snapshot tag translation',
    supabase.from('tag_translations').insert({
      tagId,
      locale: 'de',
      name: 'Snapshot Admin Schlagwort',
      createdAt: snapshotTimestamp,
      updatedAt: snapshotTimestamp,
    })
  );

  await expectNoSupabaseError(
    'seed admin snapshot transactions',
    supabase.from('transactions').insert([
      {
        id: transactionIds[0],
        userId: customerUser.id,
        amount: 192,
        subtotal: 192,
        discountAmount: 0,
        status: 'COMPLETED',
        transactionCode: 'TX-PRESENT-ADMIN-001',
        phone: customerUser.phone,
        fullName: customerUser.name,
        email: customerUser.email,
        shippingAddress: 'Snapshot Demo Address 1, Demo City',
        shippingCountry: 'Demo Country',
        shippingRegion: 'Demo Region',
        shippingCity: 'Demo City',
        shippingAddressLine1: 'Snapshot Demo Address 1',
        shippingAddressLine2: 'Suite 8',
        postalCode: '00000',
        paymentMethod: 'STRIPE',
        paymentProviderRef: null,
        stripePaymentIntentId: null,
        paypalOrderId: null,
        isGuest: false,
        createAccount: false,
        createdAt: '2026-06-05T10:00:00.000Z',
        updatedAt: snapshotTimestamp,
      },
      {
        id: transactionIds[1],
        userId: null,
        amount: 48,
        subtotal: 48,
        discountAmount: 0,
        status: 'PENDING',
        transactionCode: 'TX-PRESENT-ADMIN-002',
        phone: '+12025550193',
        fullName: 'Presentation Guest',
        email: 'presentation-guest@example.com',
        shippingAddress: 'Snapshot Demo Address 2, Demo City',
        shippingCountry: 'Demo Country',
        shippingRegion: 'Demo Region',
        shippingCity: 'Demo City',
        shippingAddressLine1: 'Snapshot Demo Address 2',
        postalCode: '00001',
        paymentMethod: 'PAYPAL',
        paymentProviderRef: null,
        stripePaymentIntentId: null,
        paypalOrderId: null,
        isGuest: true,
        createAccount: true,
        createdAt: '2026-06-06T10:00:00.000Z',
        updatedAt: snapshotTimestamp,
      },
      {
        id: transactionIds[2],
        userId: null,
        amount: 48,
        subtotal: 48,
        discountAmount: 0,
        status: 'FAILED',
        transactionCode: 'TX-PRESENT-ADMIN-003',
        phone: '+12025550194',
        fullName: 'Presentation Failed Guest',
        email: 'presentation-failed@example.com',
        shippingAddress: 'Snapshot Demo Address 3, Demo City',
        shippingCountry: 'Demo Country',
        shippingRegion: 'Demo Region',
        shippingCity: 'Demo City',
        shippingAddressLine1: 'Snapshot Demo Address 3',
        postalCode: '00002',
        paymentMethod: 'STRIPE',
        paymentProviderRef: null,
        stripePaymentIntentId: null,
        paypalOrderId: null,
        isGuest: true,
        createAccount: false,
        createdAt: '2026-06-07T10:00:00.000Z',
        updatedAt: snapshotTimestamp,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed admin snapshot transaction items',
    supabase.from('transaction_items').insert([
      {
        id: 'e2e-presentation-admin-item-completed',
        transactionId: transactionIds[0],
        productId,
        variantId,
        quantity: 1,
        price: 192,
      },
      {
        id: 'e2e-presentation-admin-item-pending',
        transactionId: transactionIds[1],
        productId: secondProductId,
        variantId: null,
        quantity: 1,
        price: 48,
      },
      {
        id: 'e2e-presentation-admin-item-failed',
        transactionId: transactionIds[2],
        productId: secondProductId,
        variantId: null,
        quantity: 1,
        price: 48,
      },
    ])
  );

  await expectNoSupabaseError(
    'seed admin snapshot invoice',
    supabase.from('invoices').insert({
      id: invoiceId,
      transactionId: transactionIds[0],
      invoiceNumber: 'INV-PRESENT-ADMIN-001',
      generatedAt: '2026-06-05T10:05:00.000Z',
    })
  );
}

async function newSnapshotPage(
  browser: Browser,
  entry: SnapshotEntry
): Promise<{ context: BrowserContext; page: Page }> {
  const contextOptions: BrowserContextOptions = {
    viewport: { width: 1440, height: 1100 },
  };
  const context = await browser.newContext({
    ...contextOptions,
    extraHTTPHeaders: { 'x-e2e-test': 'true' },
  });

  return { context, page: await context.newPage() };
}

async function loginAsAdmin(page: Page) {
  await page.goto(new URL('/login', appBaseURL).href);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.locator('input[name="identifier"]').fill(adminUser.email);
  await page.locator('input[name="password"]').fill(adminUser.password);

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

async function mockDeterministicAdminApis(page: Page, entry: SnapshotEntry) {
  await page.route('**/api/admin/stats', async (route) => {
    if (entry.section === 'observability') {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Presentation fallback warning: dashboard stats unavailable.',
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getDashboardStatsResponse()),
    });
  });

  await page.route('**/api/admin/sales**', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(getSalesAnalyticsResponse()),
    });
  });

  await page.route('**/api/admin/languages', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        languages: [
          {
            code: 'en',
            label: 'English',
            nativeLabel: 'English',
            direction: 'ltr',
            isEnabled: true,
            isDefault: true,
            sortOrder: 0,
          },
          {
            code: 'de',
            label: 'German',
            nativeLabel: 'Deutsch',
            direction: 'ltr',
            isEnabled: true,
            isDefault: false,
            sortOrder: 10,
          },
          {
            code: 'ar',
            label: 'Arabic',
            nativeLabel: 'العربية',
            direction: 'rtl',
            isEnabled: true,
            isDefault: false,
            sortOrder: 20,
          },
        ],
      }),
    });
  });

  await page.route('**/api/admin/settings', async (route) => {
    if (route.request().method() !== 'GET') return route.fallback();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        settings: [
          { key: 'site_name', value: 'Presentation Commerce' },
          { key: 'logo', value: '/images/seed/canvas-tote.svg' },
          { key: 'favicon', value: '/images/seed/desk-lamp.svg' },
        ],
      }),
    });
  });

  await page.route('**/api/admin/r2-browser**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        prefixes: ['products/', 'brand/'],
        objects: [
          {
            key: 'products/snapshot-admin-jacket.svg',
            size: 18420,
            lastModified: '2026-01-15T12:00:00.000Z',
            url: '/images/seed/canvas-tote.svg',
          },
          {
            key: 'brand/snapshot-logo.svg',
            size: 9420,
            lastModified: '2026-01-14T12:00:00.000Z',
            url: '/images/seed/desk-lamp.svg',
          },
        ],
        nextContinuationToken: null,
        isTruncated: false,
      }),
    });
  });
}

async function preparePage(page: Page, entry: SnapshotEntry) {
  await mockDeterministicAdminApis(page, entry);
  await page.addInitScript(
    ({ theme }) => {
      window.localStorage.setItem('serverless-stack-theme', theme);
    },
    { theme: entry.theme }
  );

  await loginAsAdmin(page);
  const targetUrl = new URL(entry.route, appBaseURL).href;
  await page.goto(targetUrl);
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('html')).toHaveAttribute('lang', entry.locale);
  await expect(page.locator('html')).toHaveAttribute('dir', entry.direction);
  await expect(page.getByText('Admin console')).toBeVisible({ timeout: 15000 });

  await prepareEntryState(page, entry);
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

async function prepareEntryState(page: Page, entry: SnapshotEntry) {
  if (entry.section === 'dashboard') {
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();
    await expect(page.getByText('Store overview')).toBeVisible();
    return;
  }

  if (entry.section === 'observability') {
    await expect(
      page.getByText('Unable to load dashboard stats')
    ).toBeVisible();
    return;
  }

  if (entry.section === 'products') {
    await expect(page.getByRole('heading', { name: 'Products' })).toBeVisible();
    await page
      .getByPlaceholder('Search products by name...')
      .fill('Snapshot Admin');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByText('Snapshot Admin Jacket')).toBeVisible();
    const row = page.locator('tr', { hasText: 'Snapshot Admin Jacket' });
    await row.locator('input[type="checkbox"]').first().check();
    await expect(
      page.getByRole('button', { name: 'Clear selection' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Activate', exact: true })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'product-editor') {
    await expect(
      page.getByRole('heading', { name: 'Edit Product' })
    ).toBeVisible();
    await expect(page.locator('input[name="name"]')).toHaveValue(
      'Snapshot Admin Jacket'
    );
    const tagTranslation = page.getByTestId(`tag-translation-${tagId}-de-name`);
    await tagTranslation.scrollIntoViewIfNeeded();
    await expect(page.getByText('Localized content')).toBeVisible();
    await expect(page.getByTestId('product-translation-de-name')).toBeVisible();
    await expect(tagTranslation).toBeVisible();
    return;
  }

  if (entry.section === 'product-variants') {
    await expect(
      page.getByRole('heading', { name: 'Edit Product' })
    ).toBeVisible();
    const variantHeading = page.getByRole('heading', {
      name: 'Midnight Navy / Medium',
    });
    await variantHeading.scrollIntoViewIfNeeded();
    await expect(variantHeading).toBeVisible();
    await expect(page.getByText('Sage Green / Large')).toBeVisible();
    const variantRow = variantHeading.locator(
      'xpath=ancestor::div[contains(@class, "rounded-lg")][1]'
    );
    await variantRow.getByRole('button', { name: 'Edit' }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit variant' })
    ).toBeVisible();
    await expect(page.getByText('Variant swatch image')).toBeVisible();
    await expect(page.getByLabel('Variant swatch preview')).toBeVisible();
    await expect(page.getByText('Horizontal crop')).toBeVisible();
    return;
  }

  if (entry.section === 'media-storage') {
    await expect(
      page.getByRole('heading', { name: 'Edit Product' })
    ).toBeVisible();
    await page
      .getByRole('button', { name: '+ Select from media library' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Media library' })
    ).toBeVisible();
    await expect(page.getByText('snapshot-admin-jacket.svg')).toBeVisible();
    return;
  }

  if (entry.section === 'categories-tags') {
    await expect(
      page.getByRole('heading', { name: 'Categories' })
    ).toBeVisible();
    const row = page.locator('tr', { hasText: 'Snapshot Admin Category' });
    await expect(row).toBeVisible();
    await row.getByRole('button', { name: 'Edit' }).click();
    await expect(
      page.getByRole('heading', { name: 'Edit category' })
    ).toBeVisible();
    await expect(
      page.getByTestId('category-translation-de-name')
    ).toBeVisible();
    return;
  }

  if (entry.section === 'settings') {
    await expect(
      page.getByRole('heading', { name: 'Site settings' })
    ).toBeVisible();
    await page.getByText('Website languages').scrollIntoViewIfNeeded();
    await expect(page.getByText('Arabic')).toBeVisible();
    await expect(page.getByText('RTL')).toBeVisible();
    return;
  }

  if (entry.section === 'users') {
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await page
      .getByPlaceholder('Search by name or email...')
      .fill(customerUser.email);
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.locator('tr', { hasText: customerUser.name });
    await expect(row).toBeVisible();
    await row.locator('input[type="checkbox"]').first().check();
    await expect(
      page.getByRole('button', { name: 'Clear selection' })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Promote to Admin' })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'users-transactions') {
    await expect(
      page.getByRole('heading', { name: 'Transactions' })
    ).toBeVisible();
    await page
      .getByPlaceholder('Search transaction code, customer name, or email...')
      .fill('TX-PRESENT-ADMIN-001');
    await page.getByRole('button', { name: 'Search' }).click();
    const row = page.locator('tr', { hasText: 'TX-PRESENT-ADMIN-001' });
    await expect(row).toBeVisible();
    await row.click();
    const dialog = page.getByRole('dialog', { name: 'Transaction details' });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText('INV-PRESENT-ADMIN-001', { exact: true })
    ).toBeVisible();
    return;
  }

  if (entry.section === 'analytics') {
    await expect(
      page.getByRole('heading', { name: 'Sales analytics' })
    ).toBeVisible();
    await page.getByLabel('Start date').fill(snapshotSalesRange.startDate);
    await page.getByLabel('End date').fill(snapshotSalesRange.endDate);
    await expect(
      page.getByText('Snapshot Admin Jacket', { exact: true })
    ).toBeVisible({ timeout: 15000 });
  }
}

async function hidePresentationOnlySensitiveFields(
  page: Page,
  entry: SnapshotEntry
) {
  await page.locator('body').evaluate(() => {
    const sensitivePattern =
      /\b(?:Stripe|PayPal|pi_[A-Za-z0-9_-]+|PAYPAL-[A-Za-z0-9_-]+|provider-ref|secret|token)\b/i;
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.trim();
      const element = node.parentElement;
      if (text && sensitivePattern.test(text) && element) {
        const target =
          element.closest('label, p, span, li, a, button, td, th, div') ??
          element;
        if (target !== document.body) {
          target.setAttribute('data-presentation-hidden', 'sensitive-provider');
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

  const visibleSensitiveTexts = await page.locator('body').evaluate(() => {
    const sensitivePattern =
      /\b(?:Stripe|PayPal|pi_[A-Za-z0-9_-]+|PAYPAL-[A-Za-z0-9_-]+|provider-ref|secret|token)\b/i;
    const visibleTexts: string[] = [];
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.trim();
      const element = node.parentElement;
      if (text && sensitivePattern.test(text) && element) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (
          rect.width > 0 &&
          rect.height > 0 &&
          style.display !== 'none' &&
          style.visibility !== 'hidden' &&
          style.opacity !== '0'
        ) {
          visibleTexts.push(text);
        }
      }
      node = walker.nextNode();
    }

    return visibleTexts;
  });

  expect(
    visibleSensitiveTexts,
    `${entry.id} should not expose payment/provider identifiers or secrets`
  ).toEqual([]);
}

async function expectNoNextJsErrorOverlay(page: Page) {
  await expect(
    page.locator(
      'nextjs-portal [data-nextjs-dialog], [data-nextjs-dialog], [data-nextjs-dialog-overlay]'
    )
  ).toHaveCount(0);
}

test.describe.serial('presentation admin snapshots', () => {
  test.beforeAll(seedSnapshotData);
  test.afterAll(cleanupSnapshotData);

  test('captures NIM-228 admin entries listed in the manifest', async ({
    browser,
  }) => {
    const manifest = await readManifest();
    const entries = manifest.entries.filter(
      (entry) => entry.issue === 'NIM-228' && entry.captureStatus === 'captured'
    );

    expect(entries.length).toBeGreaterThanOrEqual(9);

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
