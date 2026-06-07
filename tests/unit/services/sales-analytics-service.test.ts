import { describe, expect, it } from 'vitest';
import {
  buildSalesAnalytics,
  parseSalesAnalyticsFilters,
  type SalesAnalyticsTransaction,
} from '@/services/sales-analytics-service';

function tx(
  overrides: Partial<SalesAnalyticsTransaction>
): SalesAnalyticsTransaction {
  return {
    id: 'tx-default',
    transactionCode: 'TX-DEFAULT',
    amount: 0,
    status: 'PENDING',
    paymentMethod: 'STRIPE',
    userId: null,
    isGuest: true,
    discountAmount: 0,
    subtotal: null,
    fullName: 'Guest Customer',
    email: null,
    phone: '+15550000000',
    createdAt: '2026-06-01T12:00:00.000Z',
    items: [],
    ...overrides,
  };
}

describe('sales analytics service', () => {
  it('validates date and grouping filters with UTC defaults', () => {
    expect(
      parseSalesAnalyticsFilters(
        new URLSearchParams(
          'startDate=2026-05-01&endDate=2026-05-31&groupBy=week'
        )
      )
    ).toEqual({
      startDate: '2026-05-01',
      endDate: '2026-05-31',
      groupBy: 'week',
    });

    expect(() =>
      parseSalesAnalyticsFilters(new URLSearchParams('groupBy=hour'))
    ).toThrow('groupBy must be day, week, or month');
    expect(() =>
      parseSalesAnalyticsFilters(
        new URLSearchParams('startDate=2026-06-02&endDate=2026-06-01')
      )
    ).toThrow('startDate must be on or before endDate');
  });

  it('calculates revenue, attempts, discounts, customer mix, and product rankings from transactions', () => {
    const analytics = buildSalesAnalytics(
      [
        tx({
          id: 'tx-1',
          transactionCode: 'TX-1',
          amount: '90',
          subtotal: '100',
          discountAmount: '10',
          status: 'COMPLETED',
          paymentMethod: 'STRIPE',
          userId: 'user-1',
          isGuest: false,
          fullName: 'Registered Buyer',
          createdAt: '2026-06-01T10:00:00.000Z',
          items: [
            {
              id: 'item-1',
              productId: 'product-1',
              variantId: 'variant-1',
              quantity: 2,
              price: '50',
              product: { id: 'product-1', name: 'Analytics Jacket' },
              variant: {
                id: 'variant-1',
                name: 'Blue XL',
                size: 'XL',
                color: 'Blue',
                material: null,
              },
            },
          ],
        }),
        tx({
          id: 'tx-2',
          transactionCode: 'TX-2',
          amount: 60,
          subtotal: 75,
          discountAmount: 15,
          status: 'COMPLETED',
          paymentMethod: 'PAYPAL',
          userId: null,
          isGuest: true,
          fullName: 'Guest Buyer',
          createdAt: '2026-06-02T10:00:00.000Z',
          items: [
            {
              id: 'item-2',
              productId: 'product-2',
              variantId: null,
              quantity: 3,
              price: 25,
              product: { id: 'product-2', name: 'Analytics Socks' },
              variant: null,
            },
          ],
        }),
        tx({
          id: 'tx-3',
          transactionCode: 'TX-3',
          amount: 40,
          status: 'FAILED',
          paymentMethod: 'APPLE_PAY',
          fullName: 'Failed Buyer',
          createdAt: '2026-06-02T11:00:00.000Z',
        }),
        tx({
          id: 'tx-4',
          transactionCode: 'TX-4',
          amount: 30,
          status: 'PENDING',
          paymentMethod: null,
          fullName: '',
          email: 'pending@example.com',
          createdAt: '2026-06-03T11:00:00.000Z',
        }),
      ],
      {
        startDate: '2026-06-01',
        endDate: '2026-06-03',
        groupBy: 'day',
      }
    );

    expect(analytics.summary).toEqual({
      completedRevenue: 150,
      totalSalesRevenue: 175,
      completedOrders: 2,
      averageOrderValue: 75,
      totalAttempts: 4,
      pendingAttempts: 1,
      failedAttempts: 1,
      paymentSuccessRate: 50,
      discountTotal: 25,
    });
    expect(analytics.breakdowns.paymentProvider).toEqual([
      { key: 'STRIPE', label: 'Stripe', count: 1, completedRevenue: 90 },
      { key: 'PAYPAL', label: 'PayPal', count: 1, completedRevenue: 60 },
      { key: 'APPLE_PAY', label: 'Apple Pay', count: 1, completedRevenue: 0 },
      {
        key: 'UNKNOWN',
        label: 'Unknown provider',
        count: 1,
        completedRevenue: 0,
      },
    ]);
    expect(analytics.breakdowns.customerType).toEqual([
      {
        key: 'guest',
        label: 'Guest customers',
        count: 3,
        completedRevenue: 60,
      },
      {
        key: 'registered',
        label: 'Registered customers',
        count: 1,
        completedRevenue: 90,
      },
    ]);
    expect(analytics.topProducts).toEqual([
      {
        productId: 'product-1',
        name: 'Analytics Jacket',
        quantity: 2,
        completedRevenue: 90,
      },
      {
        productId: 'product-2',
        name: 'Analytics Socks',
        quantity: 3,
        completedRevenue: 60,
      },
    ]);
    expect(analytics.topVariants).toEqual([
      {
        variantId: 'variant-1',
        productId: 'product-1',
        name: 'Blue XL',
        productName: 'Analytics Jacket',
        quantity: 2,
        completedRevenue: 90,
      },
    ]);
    expect(analytics.attentionList.map((item) => item.reason)).toEqual([
      'failed',
      'pending',
      'high_value',
      'high_value',
    ]);
  });

  it('groups offsetless database timestamps as UTC dates', () => {
    const analytics = buildSalesAnalytics(
      [
        tx({
          id: 'tx-utc',
          transactionCode: 'TX-UTC',
          amount: 10,
          status: 'COMPLETED',
          createdAt: '2026-06-01T00:30:00.000',
        }),
      ],
      {
        startDate: '2026-06-01',
        endDate: '2026-06-01',
        groupBy: 'day',
      }
    );

    expect(analytics.timeline).toEqual([
      {
        key: '2026-06-01',
        label: '2026-06-01',
        completedRevenue: 10,
        completedOrders: 1,
        attempts: 1,
      },
    ]);
  });
});
