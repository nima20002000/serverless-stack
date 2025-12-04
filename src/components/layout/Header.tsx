'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import CartIcon from '@/components/cart/CartIcon';
import CartDrawer from '@/components/cart/CartDrawer';

export default function Header() {
  const { data: session, status } = useSession();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">کیتیا</h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4">
              <Link
                href="/products"
                className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
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
                    className="text-gray-700 hover:text-gray-900 font-medium transition-colors"
                  >
                    پروفایل
                  </Link>
                  {session.user && session.user.role === 'ADMIN' && (
                    <Link
                      href="/admin/products"
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
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

            {/* Mobile Menu Button & Cart */}
            <div className="flex md:hidden items-center gap-2">
              <CartIcon onClick={() => setIsCartOpen(true)} />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="منوی موبایل"
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <nav className="flex flex-col gap-3">
                <Link
                  href="/products"
                  className="text-gray-700 hover:text-gray-900 font-medium py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  محصولات
                </Link>

                {status === 'loading' ? (
                  <div className="text-gray-500 py-2 px-3">در حال بارگذاری...</div>
                ) : session ? (
                  <>
                    <Link
                      href="/profile"
                      className="text-gray-700 hover:text-gray-900 font-medium py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      پروفایل
                    </Link>
                    {session.user && session.user.role === 'ADMIN' && (
                      <Link
                        href="/admin/products"
                        className="text-blue-600 hover:text-blue-700 font-medium py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        پنل ادمین
                      </Link>
                    )}
                    <button
                      className="text-start text-gray-700 hover:text-gray-900 font-medium py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOut({ callbackUrl: '/login' });
                      }}
                    >
                      خروج
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-3">
                    <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full">
                        ورود
                      </Button>
                    </Link>
                    <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                      <Button variant="primary" size="sm" className="w-full">
                        ثبت‌نام
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-16" />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
