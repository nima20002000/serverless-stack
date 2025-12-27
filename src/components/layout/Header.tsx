'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import CartIcon from '@/components/cart/CartIcon';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchBar from '@/components/ui/SearchBar';

const BANNER_HIDDEN_PATHS = ['/cart', '/checkout'];

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Check if banner is visible (not on cart/checkout pages)
  const isBannerVisible = !BANNER_HIDDEN_PATHS.some((path) =>
    pathname.startsWith(path)
  );

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
        className={`fixed left-0 right-0 z-50 bg-white border-b border-gray-200 transition-shadow duration-300 ${
          isScrolled ? 'shadow-md' : 'shadow-sm'
        } ${isBannerVisible ? 'top-9 sm:top-10' : 'top-0'}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">کیتیا</h1>
            </Link>

            {/* Search Bar - Desktop */}
            <div className="hidden md:block flex-1 max-w-lg mx-6">
              <SearchBar />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-4 flex-shrink-0">
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
                      href="/admin"
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      پنل ادمین
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/' })}
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

          {/* Mobile Menu - Animated Dropdown */}
          <div
            className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
              isMobileMenuOpen
                ? 'max-h-[600px] opacity-100'
                : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-gray-200 py-3 bg-gradient-to-b from-gray-50 to-white">
              {/* Search Bar - Mobile */}
              <div className="px-4 mb-3">
                <SearchBar onResultClick={() => setIsMobileMenuOpen(false)} />
              </div>

              <nav className="flex flex-col gap-2 px-2">
                {/* Products Link */}
                <Link
                  href="/products"
                  className="group relative text-gray-700 hover:text-purple-600 font-medium py-3 px-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center justify-between"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="flex items-center gap-3">
                    <svg
                      className="w-5 h-5 text-purple-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                      />
                    </svg>
                    محصولات
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </Link>

                {status === 'loading' ? (
                  <div className="flex items-center justify-center py-4 text-gray-500">
                    <svg
                      className="animate-spin h-5 w-5 ml-2"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    در حال بارگذاری...
                  </div>
                ) : session ? (
                  <>
                    {/* User Profile Section */}
                    <div className="my-2 py-3 px-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                          {session.user?.name?.charAt(0) || 'ک'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">
                            {session.user?.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {session.user?.email || session.user?.phone}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Profile Link */}
                    <Link
                      href="/profile"
                      className="group relative text-gray-700 hover:text-purple-600 font-medium py-3 px-4 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 flex items-center justify-between"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5 text-purple-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        پروفایل
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </Link>

                    {/* Admin Panel Link */}
                    {session.user && session.user.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="group relative text-blue-600 hover:text-blue-700 font-medium py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 hover:shadow-md transition-all duration-200 flex items-center justify-between border border-blue-200"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <span className="flex items-center gap-3">
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                          پنل ادمین
                        </span>
                        <svg
                          className="w-4 h-4 text-blue-400 group-hover:text-blue-600 transition-colors"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </Link>
                    )}

                    {/* Logout Button */}
                    <button
                      className="group relative text-red-600 hover:text-red-700 font-medium py-3 px-4 rounded-xl hover:bg-red-50 hover:shadow-md transition-all duration-200 flex items-center justify-between border border-transparent hover:border-red-200 mt-2"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        signOut({ callbackUrl: '/login' });
                      }}
                    >
                      <span className="flex items-center gap-3">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        خروج
                      </span>
                      <svg
                        className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col gap-2 px-2 mt-2">
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-center shadow-sm hover:shadow-md transition-shadow"
                      >
                        <svg
                          className="w-5 h-5 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                          />
                        </svg>
                        ورود
                      </Button>
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Button
                        variant="primary"
                        size="sm"
                        className="w-full justify-center shadow-md hover:shadow-lg transition-shadow"
                      >
                        <svg
                          className="w-5 h-5 ml-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                          />
                        </svg>
                        ثبت‌نام
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      </header>

      {/* Spacer to prevent content from hiding under fixed header */}
      <div className="h-16" />

      {/* Cart Drawer */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
