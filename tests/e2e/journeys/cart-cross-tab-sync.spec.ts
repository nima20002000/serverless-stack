import { expect, test, type Page } from '@playwright/test';

const syncEventKey = 'cart-sync-event';

type SyncEvent = {
  id: string;
  sourceId: string;
  createdAt: number;
  type: string;
  item?: {
    productId: string;
    name: string;
    price: number;
    image: string;
    stock: number;
    variantId?: string;
    variantName?: string;
  };
  quantity?: number;
  productId?: string;
  variantId?: string;
};

async function emitCartSyncEvent(page: Page, event: SyncEvent) {
  await page.evaluate(
    ({ key, payload }) => {
      localStorage.setItem(key, JSON.stringify(payload));
    },
    { key: syncEventKey, payload: event }
  );
}

function addEvent(id: string, quantity: number): SyncEvent {
  return {
    id,
    sourceId: 'playwright-source-tab',
    createdAt: Date.now(),
    type: 'add',
    item: {
      productId: 'sync-product',
      variantId: 'red-medium',
      variantName: 'Red / Medium',
      name: 'Sync Hoodie',
      price: 49,
      image: '',
      stock: 5,
    },
    quantity,
  };
}

test.describe('Cart cross-tab synchronization', () => {
  test('updates another cart page from add, duplicate, update, remove, and clear events', async ({
    context,
  }) => {
    const sourcePage = await context.newPage();
    const cartPage = await context.newPage();

    await sourcePage.goto('/cart');
    await sourcePage.evaluate(() => {
      localStorage.removeItem('cart-storage');
      localStorage.removeItem('cart-sync-event');
    });
    await cartPage.goto('/cart');
    await cartPage.reload();

    await expect(
      cartPage.getByRole('heading', { name: /Your cart is empty/i })
    ).toBeVisible();

    await emitCartSyncEvent(sourcePage, addEvent('add-sync-hoodie-1', 2));
    await expect(cartPage.getByText('Sync Hoodie')).toBeVisible();
    await expect(cartPage.getByText('2 items in your cart')).toBeVisible();

    await emitCartSyncEvent(sourcePage, addEvent('add-sync-hoodie-2', 4));
    await expect(
      cartPage.locator('h3', { hasText: 'Sync Hoodie' })
    ).toHaveCount(1);
    await expect(cartPage.getByText('5 items in your cart')).toBeVisible();

    await emitCartSyncEvent(sourcePage, {
      id: 'add-sync-mug',
      sourceId: 'playwright-source-tab',
      createdAt: Date.now(),
      type: 'add',
      item: {
        productId: 'sync-mug',
        name: 'Sync Mug',
        price: 12,
        image: '',
        stock: 3,
      },
      quantity: 1,
    });
    await expect(cartPage.getByText('Sync Mug')).toBeVisible();
    await expect(cartPage.getByText('6 items in your cart')).toBeVisible();

    await emitCartSyncEvent(sourcePage, {
      id: 'update-sync-hoodie',
      sourceId: 'playwright-source-tab',
      createdAt: Date.now(),
      type: 'updateQuantity',
      productId: 'sync-product',
      variantId: 'red-medium',
      quantity: 3,
    });
    await expect(cartPage.getByText('4 items in your cart')).toBeVisible();

    await emitCartSyncEvent(sourcePage, {
      id: 'remove-sync-hoodie',
      sourceId: 'playwright-source-tab',
      createdAt: Date.now(),
      type: 'remove',
      productId: 'sync-product',
      variantId: 'red-medium',
    });
    await expect(cartPage.getByText('Sync Hoodie')).toHaveCount(0);
    await expect(cartPage.getByText('1 item in your cart')).toBeVisible();

    await emitCartSyncEvent(sourcePage, {
      id: 'clear-cart',
      sourceId: 'playwright-source-tab',
      createdAt: Date.now(),
      type: 'clear',
    });
    await expect(
      cartPage.getByRole('heading', { name: /Your cart is empty/i })
    ).toBeVisible();
  });
});
