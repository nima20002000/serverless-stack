'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
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

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/products');
      if (!response.ok) throw new Error('خطا در دریافت محصولات');
      const data = await response.json();
      setProducts(data.products);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
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
    } catch (error: any) {
      setError(error.message);
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
    } catch (error: any) {
      setError(error.message);
    }
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

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
                  <td className="px-4 py-3 text-right font-medium text-gray-900">
                    {product.name}
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
    </div>
  );
}
