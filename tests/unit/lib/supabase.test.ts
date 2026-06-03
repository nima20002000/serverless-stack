import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('supabase clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    vi.resetModules();
  });

  it('throws when server env vars are missing', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    expect(() => createClient()).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required'
    );
  });

  it('creates server client when env vars are set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_SECRET_KEY = 'secret';

    const { createClient } = await import('@/lib/supabase/server');
    const client = createClient();

    expect(typeof client.from).toBe('function');
    expect(typeof client.rpc).toBe('function');
  });
});
