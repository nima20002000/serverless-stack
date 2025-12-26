import { vi } from 'vitest';

type SupabaseResponse<T> = {
  data?: T | null;
  error?: unknown;
  count?: number | null;
};

export function createQueryMock<T>(response: SupabaseResponse<T>) {
  const query: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(response),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };

  query.then = (resolve: any, reject: any) =>
    Promise.resolve(response).then(resolve, reject);

  return query;
}

export function createSupabaseMock() {
  return {
    from: vi.fn(),
  };
}
