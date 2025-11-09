'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  UsersIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const navigation: NavItem[] = [
  { name: 'داشبورد', href: '/admin', icon: HomeIcon },
  { name: 'کاربران', href: '/admin/users', icon: UsersIcon },
  { name: 'محصولات', href: '/admin/products', icon: ShoppingBagIcon },
  { name: 'تراکنش‌ها', href: '/admin/transactions', icon: CreditCardIcon },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <nav className="bg-white rounded-lg shadow-md p-4 sticky top-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4 text-right">
          پنل مدیریت کیتیا
        </h2>
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-right transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-medium'
                      : item.disabled
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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
  );
}
