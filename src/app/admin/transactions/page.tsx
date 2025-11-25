'use client';

import { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import { formatPrice } from '@/services/product-service';
import { format } from 'date-fns-jalali';

interface Transaction {
  id: string;
  transactionCode: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  zarinpalRefId: string | null;
  user: {
    id: string;
    name: string;
    email: string;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
    };
  }>;
  invoice: {
    id: string;
    invoiceNumber: string;
  } | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export default function TransactionsManagementPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, [currentPage, statusFilter, searchQuery, dateFrom, dateTo]);

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const dateFromParam = dateFrom ? `&dateFrom=${dateFrom}` : '';
      const dateToParam = dateTo ? `&dateTo=${dateTo}` : '';
      const response = await fetch(
        `/api/admin/transactions?page=${currentPage}&limit=20${statusParam}${searchParam}${dateFromParam}${dateToParam}`
      );
      if (!response.ok) throw new Error('خطا در دریافت تراکنش‌ها');
      const result = await response.json();
      setData(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطا در دریافت تراکنش‌ها');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTransactions();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setStatusFilter('all');
    setCurrentPage(1);
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
        className={`px-3 py-1 rounded-full text-xs font-medium ${
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

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت تراکنش‌ها' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 text-right">
          مدیریت تراکنش‌ها
        </h1>
        <p className="text-gray-600 text-right mt-2">
          مشاهده و مدیریت تراکنش‌های سیستم
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Search Bar */}
      <Card className="mb-6">
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <Button type="submit" variant="primary">
              جستجو
            </Button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو بر اساس کد تراکنش، نام کاربر یا ایمیل..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </form>
        </div>
      </Card>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex gap-2 items-center">
              <Button
                variant="secondary"
                onClick={clearFilters}
                size="sm"
              >
                پاک کردن فیلترها
              </Button>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">تا</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">بازه تاریخ:</label>
            </div>
          </div>
        </div>
      </Card>

      {/* Status Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center gap-2 justify-end">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
            >
              <option value="all">همه</option>
              <option value="COMPLETED">موفق</option>
              <option value="PENDING">در انتظار</option>
              <option value="FAILED">ناموفق</option>
            </select>
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">وضعیت:</label>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card>
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  نمایش {data.transactions.length.toLocaleString('fa-IR')} تراکنش از{' '}
                  {data.total.toLocaleString('fa-IR')} تراکنش
                </div>
                <div className="text-sm text-gray-600">
                  صفحه {data.page.toLocaleString('fa-IR')} از{' '}
                  {data.totalPages.toLocaleString('fa-IR')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                      محصولات
                    </th>
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
                  {data.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm text-gray-600">
                          {transaction.items.length.toLocaleString('fa-IR')} محصول
                          {transaction.items.length > 0 && (
                            <div className="text-xs text-gray-500 mt-1">
                              {transaction.items.slice(0, 2).map((item) => (
                                <div key={item.id}>
                                  {item.product.name} (×{item.quantity.toLocaleString('fa-IR')})
                                </div>
                              ))}
                              {transaction.items.length > 2 && (
                                <div>و {(transaction.items.length - 2).toLocaleString('fa-IR')} مورد دیگر...</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
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
                          <div className="text-gray-500 text-xs">
                            {transaction.user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {transaction.transactionCode}
                        </code>
                        {transaction.zarinpalRefId && (
                          <div className="text-xs text-gray-500 mt-1">
                            Ref: {transaction.zarinpalRefId}
                          </div>
                        )}
                        {transaction.invoice && (
                          <div className="text-xs text-green-600 mt-1">
                            فاکتور: {transaction.invoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.transactions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هیچ تراکنشی یافت نشد
                </div>
              )}
            </div>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                قبلی
              </Button>
              <span className="text-sm text-gray-600">
                صفحه {currentPage.toLocaleString('fa-IR')} از{' '}
                {data.totalPages.toLocaleString('fa-IR')}
              </span>
              <Button
                variant="secondary"
                onClick={() => setCurrentPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={currentPage === data.totalPages}
              >
                بعدی
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
