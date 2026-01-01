'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AdminThemeGate() {
  const pathname = usePathname();

  useEffect(() => {
    const isAdmin = pathname.startsWith('/admin');
    document.documentElement.classList.toggle('dark', isAdmin);
  }, [pathname]);

  return null;
}
