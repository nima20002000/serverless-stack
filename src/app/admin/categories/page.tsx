'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, { BulkAction } from '@/components/admin/BulkActionsToolbar';
import R2MediaBrowser from '@/components/admin/R2MediaBrowser';

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  isActive: boolean;
  parentId: string | null;
  parent: {
    id: string;
    name: string;
  } | null;
  children: Category[];
  _count: {
    products: number;
  };
}

export default function CategoriesManagementPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    image: '',
    parentId: '',
    isActive: true,
  });
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/categories');
      if (!response.ok) throw new Error('خطا در دریافت دسته‌بندی‌ها');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
      setCategories([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories';

      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          parentId: formData.parentId || null,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ذخیره دسته‌بندی');
      }

      setSuccessMessage(editingCategory ? 'دسته‌بندی با موفقیت ویرایش شد' : 'دسته‌بندی با موفقیت ایجاد شد');
      setShowForm(false);
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        image: '',
        parentId: '',
        isActive: true,
      });
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف دسته‌بندی "${name}" اطمینان دارید؟`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در حذف دسته‌بندی');
      }

      setSuccessMessage('دسته‌بندی با موفقیت حذف شد');
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      image: '',
      parentId: '',
      isActive: true,
    });
  };

  const handleImageSelect = (urls: string[]) => {
    if (urls.length > 0) {
      setFormData({ ...formData, image: urls[0] });
      setSuccessMessage('تصویر با موفقیت انتخاب شد');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('خطا در به‌روزرسانی دسته‌بندی');

      setSuccessMessage('وضعیت دسته‌بندی به‌روزرسانی شد');
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map(c => c.id)));
    }
  };

  const toggleSelectCategory = (categoryId: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(categoryId)) {
      newSelection.delete(categoryId);
    } else {
      newSelection.add(categoryId);
    }
    setSelectedCategories(newSelection);
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    try {
      const response = await fetch('/api/admin/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          categoryIds: Array.from(selectedCategories),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در حذف دسته‌بندی‌ها');
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkActivate = async () => {
    try {
      const response = await fetch('/api/admin/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          categoryIds: Array.from(selectedCategories),
          updates: { isActive: true },
        }),
      });

      if (!response.ok) throw new Error('خطا در فعال‌سازی دسته‌بندی‌ها');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    }
  };

  const handleBulkDeactivate = async () => {
    try {
      const response = await fetch('/api/admin/categories/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          categoryIds: Array.from(selectedCategories),
          updates: { isActive: false },
        }),
      });

      if (!response.ok) throw new Error('خطا در غیرفعال‌سازی دسته‌بندی‌ها');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
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
      confirmationMessage: `آیا از حذف ${selectedCategories.size} دسته‌بندی انتخاب‌شده اطمینان دارید؟`,
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

  // Get root categories (no parent)
  const rootCategories = categories.filter(cat => !cat.parentId);

  // Get all categories that can be parents (excluding the one being edited)
  const availableParents = categories.filter(cat =>
    !editingCategory || cat.id !== editingCategory.id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'مدیریت دسته‌بندی‌ها' }]} />

      <div className="flex items-center justify-between mb-6">
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? 'انصراف' : 'افزودن دسته‌بندی جدید'}
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">مدیریت دسته‌بندی‌ها</h1>
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

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 text-right">
              {editingCategory ? 'ویرایش دسته‌بندی' : 'افزودن دسته‌بندی جدید'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    نام دسته‌بندی *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    نامک (Slug) *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left"
                    placeholder="electronics"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  توضیحات
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                  تصویر دسته‌بندی
                </label>
                <div className="space-y-2">
                  {formData.image && (
                    <div className="relative w-full h-48 border border-gray-300 rounded-lg overflow-hidden">
                      <img
                        src={formData.image}
                        alt="پیش‌نمایش تصویر"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                      >
                        حذف تصویر
                      </button>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowMediaBrowser(true)}
                  >
                    {formData.image ? 'تغییر تصویر' : 'انتخاب تصویر از R2'}
                  </Button>
                  <p className="text-xs text-gray-500 text-right">
                    تصویر از فضای ذخیره‌سازی R2 انتخاب می‌شود
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    دسته‌بندی والد
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white"
                  >
                    <option value="">بدون والد (دسته اصلی)</option>
                    {availableParents.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent ? `${cat.parent.name} > ` : ''}{cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                    وضعیت
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right bg-white"
                  >
                    <option value="active">فعال</option>
                    <option value="inactive">غیرفعال</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <Button type="button" variant="secondary" onClick={handleCancelForm}>
                  انصراف
                </Button>
                <Button type="submit" variant="primary">
                  {editingCategory ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={categories.length > 0 && selectedCategories.size === categories.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">عملیات</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">وضعیت</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">تعداد محصولات</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">توضیحات</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">نام دسته‌بندی</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rootCategories.map((category) => (
                <>
                  <tr key={category.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category.id)}
                        onChange={() => toggleSelectCategory(category.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          ویرایش
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(category.id, category.name)}
                        >
                          حذف
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => toggleActive(category.id, category.isActive)}
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          category.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {category.isActive ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-gray-900">
                        {category._count.products.toLocaleString('fa-IR')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-600">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {category.name}
                      <div className="text-xs text-gray-500">{category.slug}</div>
                    </td>
                  </tr>
                  {/* Child categories */}
                  {category.children.map((child) => (
                    <tr key={child.id} className="hover:bg-gray-50 bg-gray-25">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(child.id)}
                          onChange={() => toggleSelectCategory(child.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(child)}
                          >
                            ویرایش
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(child.id, child.name)}
                          >
                            حذف
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => toggleActive(child.id, child.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            child.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {child.isActive ? 'فعال' : 'غیرفعال'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-gray-900">
                          {child._count.products.toLocaleString('fa-IR')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600">
                        {child.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        <span className="text-gray-500 ml-2">↳</span>
                        {child.name}
                        <div className="text-xs text-gray-500 mr-4">{child.slug}</div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              هیچ دسته‌بندی وجود ندارد
            </div>
          )}
        </div>
      </Card>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedCategories.size}
        actions={bulkActions}
        onClearSelection={() => setSelectedCategories(new Set())}
      />

      {/* R2MediaBrowser Modal */}
      <R2MediaBrowser
        isOpen={showMediaBrowser}
        onClose={() => setShowMediaBrowser(false)}
        onSelect={handleImageSelect}
        multiSelect={false}
        initialFolder="categories/images"
        allowUpload={true}
      />
    </div>
  );
}
