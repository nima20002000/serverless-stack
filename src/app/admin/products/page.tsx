'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, { BulkAction } from '@/components/admin/BulkActionsToolbar';
import { formatPrice } from '@/services/product-service';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, statusFilter, stockFilter]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const stockParam = stockFilter !== 'all' ? `&stock=${stockFilter}` : '';
      const response = await fetch(`/api/admin/products?${searchParam}${statusParam}${stockParam}`);
      if (!response.ok) throw new Error('خطا در دریافت محصولات');
      const data = await response.json();
      setProducts(data.products);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setStockFilter('all');
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف محصول "${name}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('خطا در حذف محصول');

      setSuccessMessage('محصول با موفقیت حذف شد');
      fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('خطا در به‌روزرسانی محصول');

      setSuccessMessage('وضعیت محصول به‌روزرسانی شد');
      fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelectProduct = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          productIds: Array.from(selectedProducts),
        }),
      });

      if (!response.ok) throw new Error('خطا در حذف محصولات');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkActivate = async () => {
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          productIds: Array.from(selectedProducts),
          updates: { isActive: true },
        }),
      });

      if (!response.ok) throw new Error('خطا در فعال‌سازی محصولات');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const response = await fetch('/api/admin/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          productIds: Array.from(selectedProducts),
          updates: { isActive: false },
        }),
      });

      if (!response.ok) throw new Error('خطا در غیرفعال‌سازی محصولات');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedProducts(new Set());
      fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const bulkActions: BulkAction[] = [
    {
      label: 'حذف',
      variant: 'danger',
      onClick: handleBulkDelete,
      requiresConfirmation: true,
      confirmationMessage: `آیا از حذف ${selectedProducts.size} محصول انتخاب‌شده اطمینان دارید؟`,
    },
    {
      label: 'فعال‌سازی',
      variant: 'primary',
      onClick: handleBulkActivate,
    },
    {
      label: 'غیرفعال‌سازی',
      variant: 'secondary',
      onClick: handleBulkDeactivate,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت محصولات' }]} />

      <div className="flex items-center justify-between mb-6">
        <Link href="/admin/products/new">
          <Button variant="primary">افزودن محصول جدید</Button>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">مدیریت محصولات</h1>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert type="success" className="mb-4" onClose={() => setSuccessMessage('')}>
          {successMessage}
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
              placeholder="جستجو بر اساس نام محصول..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
            />
          </form>
        </div>
      </Card>

      {/* Filters */}
      <Card className="mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <Button
              variant="secondary"
              onClick={clearFilters}
              size="sm"
            >
              پاک کردن فیلترها
            </Button>

            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
                >
                  <option value="all">همه</option>
                  <option value="active">فعال</option>
                  <option value="inactive">غیرفعال</option>
                </select>
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">وضعیت:</label>
              </div>

              {/* Stock Filter */}
              <div className="flex items-center gap-2">
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
                >
                  <option value="all">همه</option>
                  <option value="in-stock">موجود</option>
                  <option value="out-of-stock">ناموجود</option>
                </select>
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">موجودی:</label>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={products.length > 0 && selectedProducts.size === products.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">عملیات</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">وضعیت</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">موجودی</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">قیمت</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">نام محصول</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <Button variant="secondary" size="sm">
                          ویرایش
                        </Button>
                      </Link>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(product.id, product.name)}
                      >
                        حذف
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => toggleActive(product.id, product.isActive)}
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {product.isActive ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={product.stock === 0 ? 'text-red-600' : 'text-gray-900'}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {formatPrice(Number(product.price))}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      {product.name}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {products.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              هیچ محصولی وجود ندارد
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedProducts.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedProducts(new Set())}
      />
    </div>
  );
}
