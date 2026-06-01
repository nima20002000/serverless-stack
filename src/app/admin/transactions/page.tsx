'use client';

import { useState, useEffect, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Button from '@/components/ui/Button';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import TransactionDetailModal from '@/components/admin/TransactionDetailModal';
import { formatDateTime, formatNumber, formatPrice } from '@/lib/utils/format';

interface Transaction {
  id: string;
  transactionCode: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  paymentMethod: 'STRIPE' | 'PAYPAL';
  isGuest: boolean;
  createdAt: string;
  paymentProviderRef?: string | null;
  stripePaymentIntentId?: string | null;
  paypalOrderId?: string | null;
  fullName: string;
  phone: string;
  email: string | null;
  shippingAddress: string;
  postalCode: string | null;
  createAccount: boolean;
  user: {
    id: string;
    uid: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      name: string;
    };
    variant: {
      id: string;
      name: string;
      color: string | null;
      size: string | null;
      material: string | null;
    } | null;
  }>;
  invoice: {
    id: string;
    invoiceNumber: string;
    generatedAt: string;
  } | null;
}

interface TransactionsResponse {
  data: Transaction[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

const getPaymentProviderLabel = (method: Transaction['paymentMethod']) =>
  method === 'PAYPAL' ? 'PayPal' : 'Stripe';

export default function TransactionsManagementPage() {
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingTransaction, setLoadingTransaction] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const statusParam =
        statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const searchParam = searchQuery
        ? `&search=${encodeURIComponent(searchQuery)}`
        : '';
      const dateFromParam = dateFrom ? `&dateFrom=${dateFrom}` : '';
      const dateToParam = dateTo ? `&dateTo=${dateTo}` : '';
      const response = await fetch(
        `/api/admin/transactions?page=${currentPage}&limit=20${statusParam}${searchParam}${dateFromParam}${dateToParam}`
      );
      if (!response.ok) throw new Error('Unable to load transactions');
      const result = await response.json();
      setData(result);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Unable to load transactions'
      );
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, statusFilter, searchQuery, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

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

  const handleTransactionClick = async (transactionId: string) => {
    try {
      setLoadingTransaction(true);
      const response = await fetch(`/api/admin/transactions/${transactionId}`);
      if (!response.ok) throw new Error('Unable to load transaction details');
      const transactionData = await response.json();
      setSelectedTransaction(transactionData);
      setIsModalOpen(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load transaction details'
      );
    } finally {
      setLoadingTransaction(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
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
        className={`px-3 py-1 rounded-full text-xs font-medium ${
          styles[status as keyof typeof styles]
        }`}
      >
        {labels[status as keyof typeof labels]}
      </span>
    );
  };

  const getPaymentMethodBadge = (method: string) => {
    return (
      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
        {method === 'PAYPAL' || method === 'STRIPE'
          ? getPaymentProviderLabel(method)
          : 'Unknown'}
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

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Transactions' }]} />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Transactions
        </h1>
        <p className="text-gray-600 dark:text-slate-400 text-left mt-2">
          Review Stripe and PayPal orders, payment references, and fulfillment
          details.
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
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-2"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transaction code, customer name, or email..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left order-2 sm:order-1 dark:bg-slate-900 dark:text-slate-100"
            />
            <Button
              type="submit"
              variant="primary"
              className="w-full sm:w-auto order-1 sm:order-2"
            >
              Search
            </Button>
          </form>
        </div>
      </Card>

      {/* Date Range Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <label className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap order-1">
                From:
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 order-2 dark:bg-slate-900 dark:text-slate-100"
              />
              <span className="text-sm text-gray-600 dark:text-slate-400 text-center order-3">
                to
              </span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 order-4 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <Button
              variant="secondary"
              onClick={clearFilters}
              size="sm"
              className="w-full sm:w-auto"
            >
              Clear filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Status Filter */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex items-center gap-2 justify-start">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-left dark:text-slate-100"
            >
              <option value="all">All statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300 whitespace-nowrap">
              Status:
            </label>
          </div>
        </div>
      </Card>

      {data && (
        <>
          <Card>
            <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-900/60">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Showing {formatNumber(data.data.length)} of{' '}
                  {formatNumber(data.total)} transactions
                </div>
                <div className="text-sm text-gray-600 dark:text-slate-400">
                  Page {formatNumber(data.page)} of{' '}
                  {formatNumber(data.totalPages)}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden lg:table-cell">
                      Products
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden md:table-cell">
                      Provider
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden sm:table-cell">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Transaction code
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {data.data.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900/60 cursor-pointer transition-colors"
                      onClick={() => handleTransactionClick(transaction.id)}
                    >
                      <td className="px-4 py-3 text-left hidden lg:table-cell">
                        <div className="text-sm text-gray-600 dark:text-slate-400">
                          {formatNumber(transaction.items.length)} Product
                          {transaction.items.length > 0 && (
                            <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                              {transaction.items.slice(0, 2).map((item) => (
                                <div key={item.id}>
                                  {item.product.name}
                                  {item.variant && (
                                    <span className="text-blue-600 dark:text-blue-300">
                                      {' '}
                                      ({item.variant.name})
                                    </span>
                                  )}{' '}
                                  (x{formatNumber(item.quantity)})
                                </div>
                              ))}
                              {transaction.items.length > 2 && (
                                <div>
                                  and{' '}
                                  {formatNumber(transaction.items.length - 2)}
                                  more...
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left hidden md:table-cell">
                        {getPaymentMethodBadge(transaction.paymentMethod)}
                      </td>
                      <td className="px-4 py-3 text-left">
                        {getStatusBadge(transaction.status)}
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-400 whitespace-nowrap hidden sm:table-cell">
                        {formatDateTime(transaction.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-left font-medium">
                        {formatPrice(Number(transaction.amount))}
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
                            <span>
                              {transaction.user
                                ? transaction.user.name
                                : transaction.fullName}
                            </span>
                            {transaction.isGuest && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 rounded">
                                Guest
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 dark:text-slate-500 text-xs">
                            {transaction.user
                              ? transaction.user.email
                              : transaction.email || transaction.phone}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <code className="text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded">
                          {transaction.transactionCode}
                        </code>
                        {transaction.paymentProviderRef && (
                          <div className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                            Ref: {transaction.paymentProviderRef}
                          </div>
                        )}
                        {transaction.stripePaymentIntentId && (
                          <div
                            className="text-xs text-indigo-600 dark:text-indigo-300 mt-1 break-all"
                            dir="ltr"
                          >
                            PI: {transaction.stripePaymentIntentId}
                          </div>
                        )}
                        {transaction.paypalOrderId && (
                          <div
                            className="text-xs text-sky-600 dark:text-sky-300 mt-1 break-all"
                            dir="ltr"
                          >
                            PO: {transaction.paypalOrderId}
                          </div>
                        )}
                        {transaction.invoice && (
                          <div className="text-xs text-green-600 dark:text-emerald-300 mt-1">
                            Invoice: {transaction.invoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {data.data.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-slate-500">
                  No transactions found.
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
                Previous
              </Button>
              <span className="text-sm text-gray-600 dark:text-slate-400">
                Page {formatNumber(currentPage)} of{' '}
                {formatNumber(data.totalPages)}
              </span>
              <Button
                variant="secondary"
                onClick={() =>
                  setCurrentPage((p) => Math.min(data.totalPages, p + 1))
                }
                disabled={currentPage === data.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />

      {/* Loading indicator for modal */}
      {loadingTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-slate-950/70">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 shadow-xl dark:shadow-none">
            <div className="text-gray-600 dark:text-slate-400">
              Loading details...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
