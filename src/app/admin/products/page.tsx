'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, { BulkAction } from '@/components/admin/BulkActionsToolbar';
import ProductTableSkeleton from '@/components/admin/ProductTableSkeleton';
import Pagination from '@/components/ui/Pagination';
import { formatPrice } from '@/lib/utils/format';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent?: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
  isFeatured?: boolean;
  displayOrder: number;
}

interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

/**
 * Sortable product row component with drag handle
 */
function SortableProductRow({
  product,
  selectedProducts,
  onToggleSelect,
  onToggleActive,
  onDelete,
}: {
  product: Product;
  selectedProducts: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="hover:bg-gray-50">
      {/* Drag Handle */}
      <td className="px-2 sm:px-4 py-3 text-center">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="جابجایی محصول"
          type="button"
        >
          <svg
            className="w-4 h-4 sm:w-5 sm:h-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </td>

      {/* Checkbox */}
      <td className="px-2 sm:px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={selectedProducts.has(product.id)}
          onChange={() => onToggleSelect(product.id)}
          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
      </td>

      {/* Actions */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <div className="flex gap-1 sm:gap-2 justify-end">
          <Link href={`/admin/products/${product.id}/edit`}>
            <Button variant="secondary" size="sm" className="text-xs sm:text-sm px-2 sm:px-3">
              ویرایش
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            className="text-xs sm:text-sm px-2 sm:px-3"
            onClick={() => onDelete(product.id, product.name)}
          >
            حذف
          </Button>
        </div>
      </td>

      {/* Status */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <button
          onClick={() => onToggleActive(product.id, product.isActive)}
          className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap ${
            product.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {product.isActive ? 'فعال' : 'غیرفعال'}
        </button>
      </td>

      {/* Features */}
      <td className="px-2 sm:px-4 py-3 text-right hidden md:table-cell">
        <div className="flex gap-1 justify-end flex-wrap">
          {product.isFeatured && (
            <span className="inline-block bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
              ویژه
            </span>
          )}
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="inline-block bg-red-100 text-red-800 text-[10px] sm:text-xs font-medium px-1.5 sm:px-2 py-0.5 sm:py-1 rounded whitespace-nowrap">
              {product.discountPercent}% تخفیف
            </span>
          )}
          {!product.isFeatured && (!product.discountPercent || product.discountPercent === 0) && (
            <span className="text-gray-400 text-xs">-</span>
          )}
        </div>
      </td>

      {/* Stock */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <span className={`text-xs sm:text-sm ${product.stock === 0 ? 'text-red-600' : 'text-gray-900'}`}>
          {product.stock}
        </span>
      </td>

      {/* Price */}
      <td className="px-2 sm:px-4 py-3 text-right">
        <div className="flex flex-col gap-0.5 sm:gap-1">
          {product.discountPercent && product.discountPercent > 0 ? (
            <>
              <span className="text-[10px] sm:text-xs text-gray-500 line-through">
                {formatPrice(Number(product.price))}
              </span>
              <span className="font-semibold text-red-600 text-xs sm:text-sm">
                {formatPrice(Number(product.price) * (1 - product.discountPercent / 100))}
              </span>
            </>
          ) : (
            <span className="text-xs sm:text-sm">{formatPrice(Number(product.price))}</span>
          )}
        </div>
      </td>

      {/* Name */}
      <td className="px-2 sm:px-4 py-3 text-right font-medium">
        <Link
          href={`/products/${product.id}`}
          className="text-blue-600 hover:text-blue-800 hover:underline transition-colors text-xs sm:text-sm line-clamp-2"
        >
          {product.name}
        </Link>
      </td>
    </tr>
  );
}

export default function AdminProductsPage() {
  const [data, setData] = useState<ProductsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [hasOrderChanges, setHasOrderChanges] = useState(false);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Drag and drop sensors - includes TouchSensor for mobile
  // Mobile/tablet: Requires press-and-hold (500ms) to activate drag, preventing scroll conflicts
  // Desktop: Only requires 8px movement to start dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Desktop: Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 500, // Mobile/tablet: 500ms press-and-hold before drag activates (prevents scroll interference)
        tolerance: 8, // Allow 8px of movement during the delay without canceling
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '';
      const statusParam = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const stockParam = stockFilter !== 'all' ? `&stock=${stockFilter}` : '';

      // Ensure minimum skeleton display time (300ms) for better UX
      const [response] = await Promise.all([
        fetch(`/api/admin/products?page=${currentPage}&perPage=20${searchParam}${statusParam}${stockParam}`),
        new Promise(resolve => setTimeout(resolve, 300))
      ]);

      if (!response.ok) throw new Error('خطا در دریافت محصولات');
      const result = await response.json();
      setData(result);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, searchQuery, statusFilter, stockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && data) {
      const oldIndex = data.data.findIndex((p) => p.id === active.id);
      const newIndex = data.data.findIndex((p) => p.id === over.id);

      const reorderedProducts = arrayMove(data.data, oldIndex, newIndex);

      setData({
        ...data,
        data: reorderedProducts,
      });

      setHasOrderChanges(true);
    }
  };

  const handleConfirmOrder = async () => {
    if (!data || !hasOrderChanges) return;

    setIsSavingOrder(true);
    setError('');

    try {
      // Create product order array with new displayOrder values
      const productOrders = data.data.map((product, index) => ({
        id: product.id,
        displayOrder: index,
      }));

      const response = await fetch('/api/admin/products/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productOrders }),
      });

      if (!response.ok) throw new Error('خطا در ذخیره ترتیب محصولات');

      const result = await response.json();
      setSuccessMessage(result.message);
      setHasOrderChanges(false);

      // Refresh products to get updated displayOrder from server
      await fetchProducts();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    } finally {
      setIsSavingOrder(false);
    }
  };

  const handleCancelOrder = () => {
    setHasOrderChanges(false);
    fetchProducts();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setStockFilter('all');
    setCurrentPage(1);
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
    if (!data) return;
    if (selectedProducts.size === data.data.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(data.data.map(p => p.id)));
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
      <div>
        <Breadcrumbs items={[{ label: 'مدیریت محصولات' }]} />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-2 order-2 sm:order-1 w-full sm:w-auto">
            <Link href="/admin/products/new" className="w-full sm:w-auto">
              <Button variant="primary" size="sm" className="w-full sm:w-auto text-sm">افزودن محصول جدید</Button>
            </Link>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 order-1 sm:order-2">مدیریت محصولات</h1>
        </div>
        <Card padding="sm">
          <ProductTableSkeleton rows={20} />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت محصولات' }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div className="flex flex-wrap gap-2 order-2 sm:order-1 w-full sm:w-auto">
          <Link href="/admin/products/new" className="w-full sm:w-auto">
            <Button variant="primary" size="sm" className="w-full sm:w-auto text-sm">افزودن محصول جدید</Button>
          </Link>
          {hasOrderChanges && (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmOrder}
                disabled={isSavingOrder}
                className="flex-1 sm:flex-none text-sm"
              >
                {isSavingOrder ? 'در حال ذخیره...' : 'تأیید ترتیب'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCancelOrder}
                disabled={isSavingOrder}
                className="flex-1 sm:flex-none text-sm"
              >
                لغو
              </Button>
            </>
          )}
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 order-1 sm:order-2">مدیریت محصولات</h1>
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
      <Card className="mb-4 sm:mb-6" padding="sm">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="جستجو بر اساس نام محصول..."
            className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right order-2 sm:order-1"
          />
          <Button type="submit" variant="primary" size="sm" className="w-full sm:w-auto order-1 sm:order-2">
            جستجو
          </Button>
        </form>
      </Card>

      {/* Filters */}
      <Card className="mb-4 sm:mb-6" padding="sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            {/* Status Filter */}
            <div className="flex items-center gap-2 flex-1">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
              >
                <option value="all">همه</option>
                <option value="active">فعال</option>
                <option value="inactive">غیرفعال</option>
              </select>
              <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">وضعیت:</label>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center gap-2 flex-1">
              <select
                value={stockFilter}
                onChange={(e) => {
                  setStockFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-right"
              >
                <option value="all">همه</option>
                <option value="in-stock">موجود</option>
                <option value="out-of-stock">ناموجود</option>
              </select>
              <label className="text-xs sm:text-sm font-medium text-gray-700 whitespace-nowrap">موجودی:</label>
            </div>
          </div>

          <Button
            variant="secondary"
            onClick={clearFilters}
            size="sm"
            className="w-full sm:w-auto text-sm"
          >
            پاک کردن فیلترها
          </Button>
        </div>
      </Card>

      {data && (
        <>
          <Card padding="sm">
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-xs sm:text-sm text-gray-600">
                  نمایش {data.data.length.toLocaleString('fa-IR')} محصول از{' '}
                  {data.total.toLocaleString('fa-IR')} محصول
                </div>
                <div className="text-xs sm:text-sm text-gray-600">
                  صفحه {data.page.toLocaleString('fa-IR')} از{' '}
                  {data.totalPages.toLocaleString('fa-IR')}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <table className="w-full min-w-[650px]">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-8 sm:w-12">
                        <svg
                          className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                        </svg>
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-center w-8 sm:w-12">
                        <input
                          type="checkbox"
                          checked={data.data.length > 0 && selectedProducts.size === data.data.length}
                          onChange={toggleSelectAll}
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">عملیات</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">وضعیت</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900 hidden md:table-cell">ویژگی‌ها</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">موجودی</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">قیمت</th>
                      <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs sm:text-sm font-semibold text-gray-900">نام محصول</th>
                    </tr>
                  </thead>
                  <SortableContext
                    items={data.data.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <tbody className="divide-y divide-gray-200">
                      {data.data.map((product) => (
                        <SortableProductRow
                          key={product.id}
                          product={product}
                          selectedProducts={selectedProducts}
                          onToggleSelect={toggleSelectProduct}
                          onToggleActive={toggleActive}
                          onDelete={handleDelete}
                        />
                      ))}
                    </tbody>
                  </SortableContext>
                </table>
              </DndContext>

              {data.data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  هیچ محصولی یافت نشد
                </div>
              )}
            </div>
          </Card>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={data.totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </>
      )}

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedProducts.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedProducts(new Set())}
      />
    </div>
  );
}
