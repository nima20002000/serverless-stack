import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/options';

vi.mock('next-auth', () => ({
  default: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: { providers: [] },
}));

describe('/api/auth/[...nextauth]', () => {
  const nextAuthMock = vi.mocked(NextAuth);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports GET and POST handlers from NextAuth', async () => {
    const handler = vi.fn();
    nextAuthMock.mockReturnValue(handler as any);

    const route = await import('@/app/api/auth/[...nextauth]/route');

    expect(nextAuthMock).toHaveBeenCalledWith(authOptions);
    expect(route.GET).toBe(handler);
    expect(route.POST).toBe(handler);
  });
});
