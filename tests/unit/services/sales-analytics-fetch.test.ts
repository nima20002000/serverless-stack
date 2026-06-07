import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { getSalesAnalytics } from '@/services/sales-analytics-service';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

function makeTransaction(id: number) {
  return {
    id: `tx-${id}`,
    transactionCode: `TX-${id}`,
    amount: 1,
    status: 'PENDING',
    paymentMethod: 'STRIPE',
    userId: null,
    isGuest: true,
    discountAmount: 0,
    subtotal: null,
    fullName: 'Guest',
    email: null,
    phone: null,
    createdAt: '2026-06-01T00:00:00.000',
    items: [],
  };
}

describe('sales analytics Supabase fetch', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches additional ranges when the first page reaches the Supabase row cap', async () => {
    const pages = [
      {
        data: Array.from({ length: 1000 }, (_, index) =>
          makeTransaction(index)
        ),
        error: null,
      },
      { data: [makeTransaction(1000)], error: null },
    ];
    const ranges: Array<[number, number]> = [];
    const range = vi.fn((from: number, to: number) => {
      ranges.push([from, to]);
      return Promise.resolve(pages.shift());
    });
    const order = vi.fn(() => ({ range }));
    const lt = vi.fn(() => ({ order }));
    const gte = vi.fn(() => ({ lt }));
    const select = vi.fn(() => ({ gte }));
    const from = vi.fn(() => ({ select }));

    createClientMock.mockReturnValue({ from } as any);

    const result = await getSalesAnalytics({
      startDate: '2026-06-01',
      endDate: '2026-06-02',
      groupBy: 'day',
    });

    expect(result.summary.totalAttempts).toBe(1001);
    expect(ranges).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });
});
