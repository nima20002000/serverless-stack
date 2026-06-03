'use client';

import { useState, useEffect } from 'react';
import StatsCard from '@/components/admin/StatsCard';
import NavigationCard from '@/components/admin/NavigationCard';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { formatDateTime, formatNumber, formatPrice } from '@/lib/utils/format';
import {
  UsersIcon,
  ShoppingBagIcon,
  CreditCardIcon,
  BanknotesIcon,
  FolderIcon,
  Cog6ToothIcon,
  TicketIcon,
} from '@heroicons/react/24/outline';

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
      if (!response.ok) throw new Error('Unable to load dashboard stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unable to load dashboard stats';
      setError(errorMessage);
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      COMPLETED:
        'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200',
      PENDING:
        'bg-yellow-100 text-yellow-800 dark:bg-amber-900/40 dark:text-amber-200',
      FAILED: 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200',
    };
    const labels = {
      COMPLETED: 'Completed',
      PENDING: 'Pending',
      FAILED: 'Failed',
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
        <div className="text-gray-600 dark:text-slate-400">Loading...</div>
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
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-slate-400 text-left mt-1 sm:mt-2">
          Monitor store activity, catalog health, and recent orders.
        </p>
      </div>

      {/* Quick Navigation Cards - Mobile First */}
      <div className="mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 text-left">
          Quick actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <NavigationCard
            title="Products"
            description="Add, edit, and organize catalog items."
            href="/admin/products"
            icon={<ShoppingBagIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="blue"
          />
          <NavigationCard
            title="Users"
            description="Review customers and manage admin access."
            href="/admin/users"
            icon={<UsersIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="green"
          />
          <NavigationCard
            title="Transactions"
            description="Track Stripe and PayPal orders."
            href="/admin/transactions"
            icon={<CreditCardIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="purple"
          />
          <NavigationCard
            title="Categories"
            description="Organize products into storefront groups."
            href="/admin/categories"
            icon={<FolderIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="orange"
          />
          <NavigationCard
            title="Site settings"
            description="Manage logo, favicon, and site identity."
            href="/admin/settings"
            icon={<Cog6ToothIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="indigo"
          />
          <NavigationCard
            title="Promo codes"
            description="Create and manage checkout discounts."
            href="/admin/promo-codes"
            icon={<TicketIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
            color="purple"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 text-left">
          Store overview
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Total users"
          value={formatNumber(stats.users.total)}
          subtitle={`${formatNumber(stats.users.new)} new this month`}
          icon={<UsersIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="Products"
          value={formatNumber(stats.products.total)}
          subtitle={`${formatNumber(stats.products.active)} Product Active`}
          icon={<ShoppingBagIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="Total transactions"
          value={formatNumber(stats.transactions.total)}
          subtitle={`${formatNumber(stats.transactions.completed)} completed, ${formatNumber(stats.transactions.failed)} failed`}
          icon={<CreditCardIcon className="w-6 h-6" />}
        />
        <StatsCard
          title="Revenue"
          value={formatPrice(stats.revenue.total)}
          subtitle={`${formatPrice(stats.revenue.thisMonth)} this month`}
          icon={<BanknotesIcon className="w-6 h-6" />}
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard
          title="Pending transactions"
          value={formatNumber(stats.transactions.pending)}
        />
        <StatsCard
          title="Completed transactions"
          value={formatNumber(stats.transactions.completed)}
        />
        <StatsCard
          title="Failed transactions"
          value={formatNumber(stats.transactions.failed)}
        />
      </div>

      {/* Recent Transactions */}
      <Card padding="sm">
        <div className="sm:p-2">
          <h2 className="text-base sm:text-xl font-bold text-gray-900 dark:text-slate-100 mb-3 sm:mb-4 text-left">
            Recent transactions
          </h2>
          {stats.recentTransactions.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-sm sm:text-base text-gray-500 dark:text-slate-500">
              No transactions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Status
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Date
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Amount
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100 hidden sm:table-cell">
                      User
                    </th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Transaction code
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {stats.recentTransactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium whitespace-nowrap">
                        {formatPrice(Number(transaction.amount))}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-left hidden sm:table-cell">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium text-gray-900 dark:text-slate-100">
                            {transaction.user.name}
                          </div>
                          <div className="text-gray-500 dark:text-slate-500">
                            {transaction.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-left">
                        <code className="text-[10px] sm:text-xs bg-gray-100 dark:bg-slate-800 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded break-all">
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
