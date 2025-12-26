import { describe, it, expect, vi } from 'vitest';
import { getAppBaseUrl, createRedirectUrl } from '@/lib/utils/url';

describe('url utils', () => {
  it('uses app url env vars in order of priority', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir';
    process.env.NEXTAUTH_URL = 'https://auth.kitia.ir';

    expect(getAppBaseUrl()).toBe('https://kitia.ir');

    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(getAppBaseUrl()).toBe('https://auth.kitia.ir');
  });

  it('normalizes redirect URLs', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://kitia.ir/';

    expect(createRedirectUrl('checkout')).toBe('https://kitia.ir/checkout');
    expect(createRedirectUrl('/cart')).toBe('https://kitia.ir/cart');
  });
});
