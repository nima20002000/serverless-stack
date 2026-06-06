import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function configuredPrice(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    currencyDisplay: 'code',
  }).format(amount);
}

function expectMarkupCurrency(markup: string, amount: number): void {
  expect(markup).toContain(configuredPrice(amount));
}

function expectMarkupCurrencyCount(
  markup: string,
  amount: number,
  count: number
): void {
  expect(markup.split(configuredPrice(amount)).length - 1).toBe(count);
}

async function loadCurrencySurfaces() {
  process.env.NEXT_PUBLIC_SITE_CURRENCY = 'JPY';
  process.env.NEXT_PUBLIC_SITE_LOCALE = 'ja-JP';
  process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY = 'code';

  vi.doMock('next/image', () => ({
    default: ({ src, alt }: { src?: string; alt?: string }) =>
      React.createElement('img', { src: src || '', alt: alt || '' }),
  }));
  vi.doMock('next/link', () => ({
    default: ({
      href,
      children,
    }: {
      href: string;
      children: React.ReactNode;
    }) => React.createElement('a', { href }, children),
  }));
  vi.doMock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  }));
  vi.doMock('next-auth/react', () => ({
    useSession: () => ({ data: null, status: 'unauthenticated' }),
  }));
  vi.doMock('@/components/wishlist/WishlistButton', () => ({
    WishlistButton: () =>
      React.createElement('button', { type: 'button' }, 'Wishlist'),
  }));
  vi.doMock('@/components/ui/Modal', () => ({
    default: ({
      isOpen,
      title,
      children,
    }: {
      isOpen: boolean;
      title: string;
      children: React.ReactNode;
    }) =>
      isOpen
        ? React.createElement('section', { 'aria-label': title }, children)
        : null,
  }));

  const [
    { default: ProductCard },
    { WishlistItemCard },
    { default: TransactionHistory },
    { default: TransactionDetailModal },
  ] = await Promise.all([
    import('@/components/products/ProductCard'),
    import('@/components/wishlist/WishlistItemCard'),
    import('@/components/profile/TransactionHistory'),
    import('@/components/admin/TransactionDetailModal'),
  ]);

  return {
    ProductCard,
    WishlistItemCard,
    TransactionHistory,
    TransactionDetailModal,
  };
}

describe('configured currency display surfaces', () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_CURRENCY;
    delete process.env.NEXT_PUBLIC_SITE_LOCALE;
    delete process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY;
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders product card sale prices with the configured store currency', async () => {
    const { ProductCard } = await loadCurrencySurfaces();

    const markup = renderToStaticMarkup(
      React.createElement(ProductCard, {
        product: {
          id: 'product-jpy-card',
          name: 'JPY Product Card',
          description: 'A product rendered under JPY config',
          price: 1234,
          discountPercent: 10,
          stock: 5,
          images: [],
          isActive: true,
        },
      })
    );

    expect(markup).toContain('JPY Product Card');
    expectMarkupCurrency(markup, 1234);
    expectMarkupCurrency(markup, 1110.6);
  });

  it('renders wishlist base and discounted prices with the configured store currency', async () => {
    const { WishlistItemCard } = await loadCurrencySurfaces();

    const markup = renderToStaticMarkup(
      React.createElement(WishlistItemCard, {
        item: {
          productId: 'wishlist-jpy-product',
          name: 'JPY Wishlist Item',
          price: 3035,
          image: '',
          stock: 4,
          discountPercent: 20,
        },
        onRemove: vi.fn(),
        onAddToCart: vi.fn(),
        isAddingToCart: false,
      })
    );

    expect(markup).toContain('JPY Wishlist Item');
    expectMarkupCurrency(markup, 3035);
    expectMarkupCurrency(markup, 2428);
  });

  it('renders profile transaction history line items and totals with the configured store currency', async () => {
    const { TransactionHistory } = await loadCurrencySurfaces();

    const markup = renderToStaticMarkup(
      React.createElement(TransactionHistory, {
        isLoading: false,
        transactions: [
          {
            id: 'tx-profile-jpy',
            amount: '3035',
            status: 'COMPLETED',
            paymentMethod: 'STRIPE',
            paymentProviderRef: 'pi_profile_jpy',
            stripePaymentIntentId: null,
            paypalOrderId: null,
            isGuest: false,
            transactionCode: 'TX-PROFILE',
            createdAt: '2024-01-01T00:00:00.000Z',
            shippingAddress:
              'Invalidenstrasse 117\nFloor 2\nBerlin, Berlin, 10115\nGermany',
            shippingCountry: 'Germany',
            shippingRegion: 'Berlin',
            shippingCity: 'Berlin',
            shippingAddressLine1: 'Invalidenstrasse 117',
            shippingAddressLine2: 'Floor 2',
            postalCode: '10115',
            items: [
              {
                id: 'item-profile-jpy',
                quantity: 2,
                price: '1234',
                product: {
                  id: 'product-profile-jpy',
                  name: 'Profile Product',
                  price: '1234',
                  media: [],
                },
                variant: null,
              },
            ],
            invoice: null,
          },
        ],
      })
    );

    expect(markup).toContain('TX-PROFILE');
    expect(markup).toContain('Invalidenstrasse 117');
    expect(markup).toContain('Germany');
    expectMarkupCurrency(markup, 1234);
    expectMarkupCurrency(markup, 3035);
  });

  it('renders admin transaction details line items and totals with the configured store currency', async () => {
    const { TransactionDetailModal } = await loadCurrencySurfaces();

    const markup = renderToStaticMarkup(
      React.createElement(TransactionDetailModal, {
        isOpen: true,
        onClose: vi.fn(),
        transaction: {
          id: 'tx-admin-jpy',
          transactionCode: 'TX-ADMIN',
          amount: 3035,
          status: 'COMPLETED',
          paymentMethod: 'PAYPAL',
          isGuest: true,
          createdAt: '2024-01-01T00:00:00.000Z',
          paymentProviderRef: 'paypal-admin-jpy',
          stripePaymentIntentId: null,
          paypalOrderId: 'paypal-order-jpy',
          fullName: 'Admin Buyer',
          phone: '+12025550123',
          email: 'buyer@example.com',
          shippingAddress:
            'Invalidenstrasse 117\nFloor 2\nBerlin, Berlin, 10115\nGermany',
          shippingCountry: 'Germany',
          shippingRegion: 'Berlin',
          shippingCity: 'Berlin',
          shippingAddressLine1: 'Invalidenstrasse 117',
          shippingAddressLine2: 'Floor 2',
          postalCode: '10115',
          createAccount: false,
          user: null,
          items: [
            {
              id: 'item-admin-jpy',
              quantity: 2,
              price: 1234,
              product: {
                id: 'product-admin-jpy',
                name: 'Admin Product',
              },
              variant: null,
            },
          ],
          invoice: null,
        },
      })
    );

    expect(markup).toContain('TX-ADMIN');
    expect(markup).toContain('Invalidenstrasse 117');
    expect(markup).toContain('Germany');
    expectMarkupCurrency(markup, 1234);
    expectMarkupCurrency(markup, 2468);
    expectMarkupCurrencyCount(markup, 3035, 2);
  });
});
