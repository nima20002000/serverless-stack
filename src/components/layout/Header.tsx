'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import CartIcon from '@/components/cart/CartIcon';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchBar from '@/components/ui/SearchBar';
import { WishlistIcon } from '@/components/wishlist/WishlistIcon';
import { siteConfig } from '@/config/site';

const HEADER_HIDDEN_PATHS = ['/checkout'];

const publicLinks = [
  { href: '/products', label: 'Products' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export default function Header() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const isHeaderHidden = HEADER_HIDDEN_PATHS.some((path) =>
    pathname.startsWith(path)
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  if (isHeaderHidden) {
    return null;
  }

  return (
    <>
      <header
        className={`fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur transition-shadow dark:border-slate-800 dark:bg-slate-950/90 ${
          isScrolled ? 'shadow-sm' : 'shadow-none'
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-4">
            <Link
              href="/"
              className="min-w-0 shrink-0 text-lg font-bold text-slate-950 dark:text-slate-50"
            >
              {siteConfig.displayName}
            </Link>

            <div className="hidden flex-1 md:block">
              <SearchBar />
            </div>

            <nav className="hidden items-center gap-1 md:flex">
              {publicLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              <WishlistIcon />
              <CartIcon onClick={() => setIsCartOpen(true)} />
              {status === 'loading' ? (
                <span className="px-3 py-2 text-sm text-slate-500">
                  Loading...
                </span>
              ) : session ? (
                <>
                  <Link
                    href="/profile"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    Account
                  </Link>
                  {session.user?.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-300"
                    >
                      Admin
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => signOut({ callbackUrl: '/' })}
                  >
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      Create account
                    </Button>
                  </Link>
                </>
              )}
            </nav>

            <div className="flex items-center gap-1 md:hidden">
              <WishlistIcon />
              <CartIcon onClick={() => setIsCartOpen(true)} />
              <button
                onClick={() => setIsMobileMenuOpen((value) => !value)}
                className="rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Toggle navigation menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <XMarkIcon className="h-6 w-6" />
                ) : (
                  <Bars3Icon className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>

          <div
            className={`overflow-hidden transition-all duration-200 md:hidden ${
              isMobileMenuOpen ? 'max-h-[640px] pb-4' : 'max-h-0'
            }`}
          >
            <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
              <SearchBar onResultClick={() => setIsMobileMenuOpen(false)} />
              <nav className="mt-4 flex flex-col gap-1">
                {publicLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {link.label}
                  </Link>
                ))}
                {session ? (
                  <>
                    <Link
                      href="/profile"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      Account
                    </Link>
                    {session.user?.role === 'ADMIN' && (
                      <Link
                        href="/admin"
                        className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        Admin
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="justify-start"
                      onClick={() => signOut({ callbackUrl: '/' })}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <Link href="/login">
                      <Button variant="secondary" size="sm" fullWidth>
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button variant="primary" size="sm" fullWidth>
                        Create account
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </div>
        </div>
      </header>

      <div className="h-16" aria-hidden="true" />
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </>
  );
}
