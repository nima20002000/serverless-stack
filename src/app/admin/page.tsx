'use client';

import { useState, useEffect } from 'react';
import StatsCard from '@/components/admin/StatsCard';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { formatPrice } from '@/services/product-service';
import {
  UsersIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon,
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-right">داشبورد مدیریت</h1>
        <p className="text-gray-600 text-right mt-2">
          خلاصه آمار و فعالیت‌های سیستم
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">
            آخرین تراکنش‌ها
          </h2>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              هیچ تراکنشی وجود ندارد
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      وضعیت
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      تاریخ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      مبلغ
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      کاربر
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      کد تراکنش
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {stats.recentTransactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-right">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {format(new Date(transaction.createdAt), 'yyyy/MM/dd - HH:mm')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPrice(Number(transaction.amount))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {transaction.user.name}
                          </div>
                          <div className="text-gray-500">
                            {transaction.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
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
