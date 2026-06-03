'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  Bars3Icon,
  XMarkIcon,
  FolderIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: HomeIcon },
  { name: 'Users', href: '/admin/users', icon: UsersIcon },
  { name: 'Products', href: '/admin/products', icon: ShoppingBagIcon },
  { name: 'Categories', href: '/admin/categories', icon: FolderIcon },
  { name: 'Transactions', href: '/admin/transactions', icon: CreditCardIcon },
  { name: 'Site settings', href: '/admin/settings', icon: Cog6ToothIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(true)}
        className="lg:hidden fixed bottom-4 left-4 z-40 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors dark:bg-slate-800 dark:hover:bg-slate-700"
        aria-label="Open admin menu"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 dark:bg-slate-950/70 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          w-64 flex-shrink-0
          lg:block
          ${isMobileMenuOpen ? 'block' : 'hidden'}
          lg:relative fixed inset-y-0 left-0 z-50
          lg:z-auto
        `}
      >
        <nav className="bg-white dark:bg-slate-900 dark:border dark:border-slate-800 rounded-lg shadow-md dark:shadow-none p-4 sticky top-4 lg:top-4 mt-4 lg:mt-0 ml-4 lg:ml-0">
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-between items-center mb-4">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 p-1"
              aria-label="Close admin menu"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">
              Admin panel Commerce Starter
            </h2>
          </div>

          {/* Desktop Header */}
          <h2 className="hidden lg:block text-lg font-bold text-gray-900 dark:text-slate-100 mb-4 text-left">
            Admin panel Commerce Starter
          </h2>

          <ul className="space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-left transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-medium dark:bg-slate-800 dark:text-slate-100'
                        : item.disabled
                          ? 'text-gray-400 dark:text-slate-500 cursor-not-allowed'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
