import { describe, it, expect, vi, beforeEach } from 'vitest';

const supabaseServerMock = vi.fn();
const supabaseBrowserMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: supabaseServerMock,
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: supabaseBrowserMock,
}));

describe('supabase clients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    vi.resetModules();
  });

  it('throws when server env vars are missing', async () => {
    const { createClient } = await import('@/lib/supabase/server');

    expect(() => createClient()).toThrow(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required'
    );
  });

  it('creates server client with required options', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.SUPABASE_SECRET_KEY = 'secret';

    const { createClient } = await import('@/lib/supabase/server');

    createClient();

    expect(supabaseServerMock).toHaveBeenCalledWith(
      'https://supabase.test',
      'secret',
      expect.objectContaining({
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    );
  });

  it('throws when browser env vars are missing', async () => {
    await expect(import('@/lib/supabase/client')).rejects.toThrow(
      'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variables are required'
    );
  });

  it('creates browser client when env vars are set', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://supabase.test';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-key';

    await import('@/lib/supabase/client');

    expect(supabaseBrowserMock).toHaveBeenCalledWith(
      'https://supabase.test',
      'public-key'
    );
  });
});
