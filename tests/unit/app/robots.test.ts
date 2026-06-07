import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/seo/config', () => ({
  getAbsoluteUrl: (path: string) => `https://shop.example.com${path}`,
}));

describe('robots route', () => {
  const loadRobots = async () => {
    const { default: robots } = await import('@/app/robots');
    return robots;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('allows public routes and excludes private/admin surfaces', async () => {
    const robots = await loadRobots();

    expect(robots()).toEqual({
      rules: [
        {
          userAgent: '*',
          allow: '/',
          disallow: ['/admin', '/api', '/profile'],
        },
      ],
      sitemap: 'https://shop.example.com/sitemap.xml',
    });
  });
});
