import { describe, it, expect } from 'vitest';
import { getAppBaseUrl, createRedirectUrl } from '@/lib/utils/url';

describe('url utils', () => {
  it('uses app url env vars in order of priority', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com';
    process.env.NEXTAUTH_URL = 'https://auth.example.com';

    expect(getAppBaseUrl()).toBe('https://example.com');

    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppBaseUrl()).toBe('https://auth.example.com');
  });

  it('normalizes redirect URLs', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com/';

    expect(createRedirectUrl('checkout')).toBe('https://example.com/checkout');
    expect(createRedirectUrl('/cart')).toBe('https://example.com/cart');
  });
});
