'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Header from '@/components/layout/Header';
import Link from 'next/link';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (session && (session.user as any).role !== 'ADMIN') {
      router.push('/');
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!session || (session.user as any).role !== 'ADMIN') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Admin Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-md p-4">
              <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
                پنل مدیریت
              </h2>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/admin/products"
                    className="block px-4 py-2 text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-right transition-colors"
                  >
                    مدیریت محصولات
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/users"
                    className="block px-4 py-2 text-gray-400 rounded-lg text-right cursor-not-allowed"
                  >
                    مدیریت کاربران (به زودی)
                  </Link>
                </li>
                <li>
                  <Link
                    href="/admin/transactions"
                    className="block px-4 py-2 text-gray-400 rounded-lg text-right cursor-not-allowed"
                  >
                    تراکنش‌ها (به زودی)
                  </Link>
                </li>
              </ul>
            </nav>
          </aside>

          {/* Admin Content */}
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
