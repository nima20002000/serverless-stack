'use client';

import Link from 'next/link';
import { HomeIcon } from '@heroicons/react/24/outline';
import SearchBar from '@/components/ui/SearchBar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-300">404</h1>
          <div className="mt-4 space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">
              صفحه مورد نظر یافت نشد
            </h2>
            <p className="text-gray-600">
              متأسفانه صفحه‌ای که به دنبال آن هستید وجود ندارد یا منتقل شده است.
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <p className="text-sm text-gray-600 mb-3">
            می‌توانید محصول یا دسته‌بندی مورد نظر خود را جستجو کنید:
          </p>
          <SearchBar placeholder="جستجو در کیتیا..." />
        </div>

        <div className="space-y-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <HomeIcon className="w-5 h-5" />
            <span>بازگشت به صفحه اصلی</span>
          </Link>

          <div className="pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-3">صفحات پرکاربرد:</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/products"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                محصولات
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/cart"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                سبد خرید
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/contact"
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                تماس با ما
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
