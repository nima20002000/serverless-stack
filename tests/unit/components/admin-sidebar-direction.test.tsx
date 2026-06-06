import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import AdminSidebar from '@/components/admin/AdminSidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/products',
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe('AdminSidebar direction-aware classes', () => {
  it('uses logical start placement and text alignment classes', () => {
    const markup = renderToStaticMarkup(<AdminSidebar />);

    expect(markup).toContain('start-4');
    expect(markup).toContain('start-0');
    expect(markup).toContain('ms-4');
    expect(markup).toContain('text-start');
    expect(markup).not.toContain(' left-0 ');
    expect(markup).not.toContain(' ml-4 ');
    expect(markup).not.toContain(' text-left ');
  });
});
