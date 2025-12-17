'use client';

import { useState, useEffect } from 'react';
import StatsCard from '@/components/admin/StatsCard';
import NavigationCard from '@/components/admin/NavigationCard';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { formatPrice } from '@/services/product-service';
import {
  UsersIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon,
  FolderIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns-jalali';

interface DashboardStats {
  users: {
    total: number;
    new: number;
  };
  products: {
    total: number;
    active: number;
  };
  transactions: {
    total: number;
    pending: number;
    completed: number;
    failed: number;
  };
  revenue: {
    total: number;
    thisMonth: number;
  };
  recentTransactions: Array<{
    id: string;
    transactionCode: string;
    amount: number;
    status: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('خطا در دریافت آمار');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'خطا در دریافت آمار';
      setError(errorMessage);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED: 'bg-green-100 text-green-800',
      PENDING: 'bg-yellow-100 text-yellow-800',
      FAILED: 'bg-red-100 text-red-800',
    };
    const labels = {
      COMPLETED: 'موفق',
      PENDING: 'در انتظار',
      FAILED: 'ناموفق',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert type="error" onClose={() => setError('')}>
        {error}
      </Alert>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <div className="mb-4 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 text-right">داشبورد مدیریت</h1>
        <p className="text-sm sm:text-base text-gray-600 text-right mt-1 sm:mt-2">
          خلاصه آمار و فعالیت‌های سیستم
        </p>
      </div>

      {/* Quick Navigation Cards - Mobile First */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 text-right">دسترسی سریع</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <NavigationCard
            title="محصولات"
            description="مدیریت محصولات، افزودن و ویرایش"
            href="/admin/products"
            icon={<ShoppingBagIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="blue"
          />
          <NavigationCard
            title="کاربران"
            description="مشاهده و مدیریت کاربران سیستم"
            href="/admin/users"
            icon={<UsersIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="green"
          />
          <NavigationCard
            title="تراکنش‌ها"
            description="مشاهده و پیگیری تراکنش‌های مالی"
            href="/admin/transactions"
            icon={<CreditCardIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="purple"
          />
          <NavigationCard
            title="دسته‌بندی‌ها"
            description="مدیریت دسته‌بندی محصولات"
            href="/admin/categories"
            icon={<FolderIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="orange"
          />
          <NavigationCard
            title="تنظیمات سایت"
            description="تنظیمات عمومی و پیکربندی"
            href="/admin/settings"
            icon={<Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="indigo"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 text-right">آمار کلی</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="کل کاربران"
          value={stats.users.total.toLocaleString('fa-IR')}
          subtitle={`${stats.users.new.toLocaleString('fa-IR')} کاربر جدید این ماه`}
          icon={<UsersIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="محصولات"
          value={stats.products.total.toLocaleString('fa-IR')}
          subtitle={`${stats.products.active.toLocaleString('fa-IR')} محصول فعال`}
          icon={<ShoppingBagIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="کل تراکنش‌ها"
          value={stats.transactions.total.toLocaleString('fa-IR')}
          subtitle={`${stats.transactions.completed.toLocaleString('fa-IR')} موفق، ${stats.transactions.failed.toLocaleString('fa-IR')} ناموفق`}
          icon={<CreditCardIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="درآمد کل"
          value={formatPrice(stats.revenue.total)}
          subtitle={`${formatPrice(stats.revenue.thisMonth)} این ماه`}
          icon={<BanknotesIcon className="w-6 h-6" />}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="تراکنش‌های در انتظار"
          value={stats.transactions.pending.toLocaleString('fa-IR')}
        />
        <StatsCard
          title="تراکنش‌های موفق"
          value={stats.transactions.completed.toLocaleString('fa-IR')}
        />
        <StatsCard
          title="تراکنش‌های ناموفق"
          value={stats.transactions.failed.toLocaleString('fa-IR')}
        />
      </div>

      {/* Recent Transactions */}
      <Card padding="sm">
        <div className="sm:p-2">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4 text-right">
            آخرین تراکنش‌ها
          </h2>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500">
              هیچ تراکنشی وجود ندارد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      وضعیت
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      تاریخ
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      مبلغ
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 hidden sm:table-cell">
                      کاربر
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">
                      کد تراکنش
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                        {format(new Date(transaction.createdAt), 'yyyy/MM/dd - HH:mm')}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-medium whitespace-nowrap">
                        {formatPrice(Number(transaction.amount))}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right hidden sm:table-cell">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium text-gray-900">
                            {transaction.user.name}
                          </div>
                          <div className="text-gray-500">
                            {transaction.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                        <code className="text-[10px] sm:text-xs bg-gray-100 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded break-all">
                          {transaction.transactionCode}
                        </code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
