'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import CartIcon from '@/components/cart/CartIcon';
import CartDrawer from '@/components/cart/CartDrawer';

export default function Header() {
  const { data: session, status } = useSession();
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <>
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">کیتیا</h1>
            </Link>

            {/* Navigation */}
            <nav className="flex items-center gap-4">
              <Link
                href="/products"
                className="text-gray-700 hover:text-gray-900 font-medium"
              >
                محصولات
              </Link>

              {/* Cart Icon */}
              <CartIcon onClick={() => setIsCartOpen(true)} />

              {status === 'loading' ? (
                <div className="text-gray-500">در حال بارگذاری...</div>
              ) : session ? (
                <>
                  <Link
                    href="/profile"
                    className="text-gray-700 hover:text-gray-900 font-medium"
                  >
                    پروفایل
                  </Link>
                  {session.user && (session.user as any).role === 'ADMIN' && (
                    <Link
                      href="/admin/products"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      پنل ادمین
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/login' })}
                  >
                    خروج
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      ورود
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      ثبت‌نام
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
