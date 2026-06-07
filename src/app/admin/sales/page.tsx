'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import Alert from '@/components/ui/Alert';
import Card from '@/components/ui/Card';
import StatsCard from '@/components/admin/StatsCard';
import { formatDateTime, formatNumber, formatPrice } from '@/lib/utils/format';
import type {
  SalesAnalyticsGroupBy,
  SalesAnalyticsResult,
} from '@/services/sales-analytics-service';

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultRange() {
  const now = new Date();
  const todayUtc = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const startUtc = new Date(todayUtc.getTime() - 30 * 24 * 60 * 60 * 1000);

  return {
    startDate: toDateInputValue(startUtc),
    endDate: toDateInputValue(todayUtc),
  };
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
      {label}
    </div>
  );
}

export default function AdminSalesPage() {
  const defaultRange = useMemo(() => getDefaultRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [groupBy, setGroupBy] = useState<SalesAnalyticsGroupBy>('day');
  const [analytics, setAnalytics] = useState<SalesAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function fetchAnalytics() {
      setIsLoading(true);
      setError('');

      const params = new URLSearchParams({
        startDate,
        endDate,
        groupBy,
      });

      try {
        const response = await fetch(`/api/admin/sales?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Unable to load sales analytics');
        }

        setAnalytics(payload);
      } catch (fetchError) {
        if (
          fetchError instanceof DOMException &&
          fetchError.name === 'AbortError'
        ) {
          return;
        }

        setAnalytics(null);
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : 'Unable to load sales analytics'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => controller.abort();
  }, [startDate, endDate, groupBy]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          Sales analytics
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review completed revenue, payment attempts, customer mix, and product
          sales in UTC.
        </p>
      </div>

      <Card padding="sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Start date
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              End date
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Group by
            </span>
            <select
              value={groupBy}
              onChange={(event) =>
                setGroupBy(event.target.value as SalesAnalyticsGroupBy)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="day">Day</option>
              <option value="week">Week</option>
              <option value="month">Month</option>
            </select>
          </label>
          <div className="flex items-end">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
              Timezone: {analytics?.filters.timezone || 'UTC'}
            </div>
          </div>
        </div>
      </Card>

      {error && (
        <Alert type="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {isLoading && (
        <div className="py-12 text-center text-sm text-slate-500 dark:text-slate-400">
          Loading sales analytics...
        </div>
      )}

      {!isLoading && analytics && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title="Completed revenue"
              value={formatPrice(analytics.summary.completedRevenue)}
              subtitle={`${formatNumber(analytics.summary.completedOrders)} completed orders`}
              icon={<ChartBarIcon className="h-6 w-6" />}
            />
            <StatsCard
              title="Average order value"
              value={formatPrice(analytics.summary.averageOrderValue)}
              subtitle="Completed orders only"
            />
            <StatsCard
              title="Payment success rate"
              value={`${analytics.summary.paymentSuccessRate.toFixed(1)}%`}
              subtitle={`${formatNumber(analytics.summary.totalAttempts)} total attempts`}
            />
            <StatsCard
              title="Discount total"
              value={formatPrice(analytics.summary.discountTotal)}
              subtitle={`Gross sales ${formatPrice(analytics.summary.totalSalesRevenue)}`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              title="Pending attempts"
              value={formatNumber(analytics.summary.pendingAttempts)}
              icon={<ClockIcon className="h-6 w-6" />}
            />
            <StatsCard
              title="Failed attempts"
              value={formatNumber(analytics.summary.failedAttempts)}
              icon={<ExclamationTriangleIcon className="h-6 w-6" />}
            />
            <StatsCard
              title="Total attempts"
              value={formatNumber(analytics.summary.totalAttempts)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card padding="sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                Revenue timeline
              </h2>
              {analytics.timeline.length === 0 ? (
                <EmptyState label="No transactions in this period." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="text-left text-slate-500 dark:text-slate-400">
                      <tr>
                        <th className="py-2 font-medium">Period</th>
                        <th className="py-2 font-medium">Revenue</th>
                        <th className="py-2 font-medium">Orders</th>
                        <th className="py-2 font-medium">Attempts</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {analytics.timeline.map((period) => (
                        <tr key={period.key}>
                          <td className="py-2 text-slate-900 dark:text-slate-100">
                            {period.label}
                          </td>
                          <td className="py-2 text-slate-700 dark:text-slate-300">
                            {formatPrice(period.completedRevenue)}
                          </td>
                          <td className="py-2 text-slate-700 dark:text-slate-300">
                            {formatNumber(period.completedOrders)}
                          </td>
                          <td className="py-2 text-slate-700 dark:text-slate-300">
                            {formatNumber(period.attempts)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            <Card padding="sm">
              <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
                Attention list
              </h2>
              {analytics.attentionList.length === 0 ? (
                <EmptyState label="No pending, failed, or high-value transactions." />
              ) : (
                <div className="space-y-2">
                  {analytics.attentionList.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="rounded-lg border border-slate-200 p-3 dark:border-slate-800"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {transaction.transactionCode}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {transaction.customerName} ·{' '}
                            {transaction.paymentProvider}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {formatPrice(transaction.amount)}
                          </div>
                          <div className="text-xs capitalize text-slate-500 dark:text-slate-400">
                            {transaction.reason.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        {transaction.status} ·{' '}
                        {formatDateTime(transaction.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <BreakdownTable
              title="Status breakdown"
              rows={analytics.breakdowns.status.map((row) => ({
                key: row.key,
                label: row.label,
                value: formatNumber(row.count),
                detail: formatPrice(row.amount),
              }))}
            />
            <BreakdownTable
              title="Payment providers"
              rows={analytics.breakdowns.paymentProvider.map((row) => ({
                key: row.key,
                label: row.label,
                value: formatNumber(row.count),
                detail: formatPrice(row.completedRevenue),
              }))}
            />
            <BreakdownTable
              title="Customer type"
              rows={analytics.breakdowns.customerType.map((row) => ({
                key: row.key,
                label: row.label,
                value: formatNumber(row.count),
                detail: formatPrice(row.completedRevenue),
              }))}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <BreakdownTable
              title="Top products"
              emptyLabel="No completed product sales in this period."
              rows={analytics.topProducts.map((row) => ({
                key: row.productId,
                label: row.name,
                value: `${formatNumber(row.quantity)} sold`,
                detail: formatPrice(row.completedRevenue),
              }))}
            />
            <BreakdownTable
              title="Top variants"
              emptyLabel="No completed variant sales in this period."
              rows={analytics.topVariants.map((row) => ({
                key: row.variantId,
                label: `${row.productName} · ${row.name}`,
                value: `${formatNumber(row.quantity)} sold`,
                detail: formatPrice(row.completedRevenue),
              }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function BreakdownTable({
  title,
  rows,
  emptyLabel = 'No data in this period.',
}: {
  title: string;
  rows: Array<{ key: string; label: string; value: string; detail: string }>;
  emptyLabel?: string;
}) {
  return (
    <Card padding="sm">
      <h2 className="mb-3 text-base font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h2>
      {rows.length === 0 ? (
        <EmptyState label={emptyLabel} />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {row.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {row.detail}
                </div>
              </div>
              <div className="shrink-0 text-sm font-medium text-slate-700 dark:text-slate-300">
                {row.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
