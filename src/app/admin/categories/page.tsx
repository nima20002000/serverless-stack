'use client';

import { Fragment, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import BulkActionsToolbar, {
  BulkAction,
} from '@/components/admin/BulkActionsToolbar';
import R2MediaBrowser from '@/components/admin/R2MediaBrowser';
import { formatNumber } from '@/lib/utils/format';
import type { ManagedLanguage } from '@/lib/i18n/localized-content';

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
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set()
  );
  const [languages, setLanguages] = useState<ManagedLanguage[]>([]);
  const [categoryTranslations, setCategoryTranslations] = useState<
    Record<string, { name?: string; description?: string }>
  >({});

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
      const [response, languagesResponse] = await Promise.all([
        fetch('/api/admin/categories'),
        fetch('/api/admin/languages'),
      ]);
      if (!response.ok) throw new Error('Unable to load categories');
      if (!languagesResponse.ok)
        throw new Error('Unable to load language settings');
      const data = await response.json();
      const languageData = await languagesResponse.json();
      setCategories(data.categories || []);
      setLanguages(languageData.languages || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Unable to save category');
      }

      const categoryId = editingCategory?.id || data.category?.id;
      if (categoryId) {
        const translationResponse = await fetch(
          `/api/admin/categories/${categoryId}/translations`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ translations: categoryTranslations }),
          }
        );

        if (!translationResponse.ok) {
          const errorData = await translationResponse.json();
          throw new Error(
            errorData.error || 'Unable to save category translations'
          );
        }
      }

      setSuccessMessage(
        editingCategory ? 'Category updated.' : 'Category created.'
      );
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
      setCategoryTranslations({});
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  const handleEdit = async (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      image: category.image || '',
      parentId: category.parentId || '',
      isActive: category.isActive,
    });
    try {
      const response = await fetch(
        `/api/admin/categories/${category.id}/translations`
      );
      if (!response.ok) throw new Error('Unable to load category translations');
      const data = await response.json();
      setCategoryTranslations(
        Object.fromEntries(
          (data.translations || []).map(
            (translation: {
              locale: string;
              name: string | null;
              description: string | null;
            }) => [
              translation.locale,
              {
                name: translation.name || '',
                description: translation.description || '',
              },
            ]
          )
        )
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
      setCategoryTranslations({});
    }
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unable to delete category');
      }

      setSuccessMessage('Category deleted.');
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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
    setCategoryTranslations({});
  };

  const handleImageSelect = (urls: string[]) => {
    if (urls.length > 0) {
      setFormData({ ...formData, image: urls[0] });
      setSuccessMessage('Image selected.');
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!response.ok) throw new Error('Unable to update category');

      setSuccessMessage('Category updated.');
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedCategories.size === categories.length) {
      setSelectedCategories(new Set());
    } else {
      setSelectedCategories(new Set(categories.map((c) => c.id)));
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
        throw new Error(errorData.error || 'Unable to delete categories');
      }

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

      if (!response.ok) throw new Error('Unable to activate categories');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
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

      if (!response.ok) throw new Error('Unable to deactivate categories');

      const data = await response.json();
      setSuccessMessage(data.message);
      setSelectedCategories(new Set());
      fetchCategories();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    }
  };

  const bulkActions: BulkAction[] = [
    {
      label: 'Delete',
      variant: 'danger',
      onClick: handleBulkDelete,
      requiresConfirmation: true,
      confirmationMessage: `Delete ${selectedCategories.size} selected category item(s)?`,
    },
    {
      label: 'Activate',
      variant: 'primary',
      onClick: handleBulkActivate,
    },
    {
      label: 'Deactivate',
      variant: 'secondary',
      onClick: handleBulkDeactivate,
    },
  ];

  // Get root categories (no parent)
  const rootCategories = categories.filter((cat) => !cat.parentId);

  // Get all categories that can be parents (excluding the one being edited)
  const availableParents = categories.filter(
    (cat) => !editingCategory || cat.id !== editingCategory.id
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Categories' }]} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          className="w-full sm:w-auto order-2 sm:order-1"
        >
          {showForm ? 'Cancel' : 'Add category'}
        </Button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 order-1 sm:order-2">
          Categories
        </h1>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert
          type="success"
          className="mb-4"
          onClose={() => setSuccessMessage('')}
        >
          {successMessage}
        </Alert>
      )}

      {/* Form */}
      {showForm && (
        <Card className="mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-4 text-left">
              {editingCategory ? 'Edit category' : 'Add category'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Category name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Slug *
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                    placeholder="electronics"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                  rows={3}
                />
              </div>

              {languages.filter(
                (language) => language.isEnabled && !language.isDefault
              ).length > 0 && (
                <div className="space-y-4 rounded-lg border border-gray-200 p-4 dark:border-slate-800">
                  <div className="text-left">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                      Localized category content
                    </h3>
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Empty fields fall back to the default language.
                    </p>
                  </div>
                  {languages
                    .filter(
                      (language) => language.isEnabled && !language.isDefault
                    )
                    .map((language) => {
                      const translation =
                        categoryTranslations[language.code] || {};
                      return (
                        <div key={language.code} className="space-y-3">
                          <div className="text-left text-xs font-semibold text-gray-700 dark:text-slate-300">
                            {language.label}
                          </div>
                          <input
                            type="text"
                            data-testid={`category-translation-${language.code}-name`}
                            value={translation.name || ''}
                            onChange={(event) =>
                              setCategoryTranslations({
                                ...categoryTranslations,
                                [language.code]: {
                                  ...translation,
                                  name: event.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                            placeholder={`${language.label} name`}
                          />
                          <textarea
                            data-testid={`category-translation-${language.code}-description`}
                            value={translation.description || ''}
                            onChange={(event) =>
                              setCategoryTranslations({
                                ...categoryTranslations,
                                [language.code]: {
                                  ...translation,
                                  description: event.target.value,
                                },
                              })
                            }
                            className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
                            rows={2}
                            placeholder={`${language.label} description`}
                          />
                        </div>
                      );
                    })}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                  Image Category
                </label>
                <div className="space-y-2">
                  {formData.image && (
                    <div className="relative w-full aspect-[4/5] border border-gray-300 dark:border-slate-700 rounded-lg overflow-hidden">
                      <Image
                        src={formData.image}
                        alt="Category image"
                        fill
                        className="object-cover object-center"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-600"
                      >
                        Delete Image
                      </button>
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowMediaBrowser(true)}
                  >
                    {formData.image ? 'Change image' : 'Select image'}
                  </Button>
                  <p className="text-xs text-gray-500 dark:text-slate-500 text-left">
                    Select an image from the configured media library.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Parent category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData({ ...formData, parentId: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">No parent (top level)</option>
                    {availableParents.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.parent ? `${cat.parent.name} > ` : ''}
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        isActive: e.target.value === 'active',
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left bg-white dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 justify-start">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCancelForm}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary">
                  {editingCategory ? 'Save changes' : 'Create category'}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Categories List */}
      <Card>
        <div className="overflow-x-auto -mx-6 px-6">
          <table className="w-full min-w-[700px]">
            <thead className="bg-gray-50 dark:bg-slate-900/60 border-b border-gray-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 text-center w-12">
                  <input
                    type="checkbox"
                    checked={
                      categories.length > 0 &&
                      selectedCategories.size === categories.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                  Actions
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden md:table-cell">
                  Products
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100 hidden lg:table-cell">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-slate-100">
                  Category name
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
              {rootCategories.map((category) => (
                <Fragment key={category.id}>
                  <tr
                    key={category.id}
                    className="hover:bg-gray-50 dark:hover:bg-slate-900/60"
                  >
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.has(category.id)}
                        onChange={() => toggleSelectCategory(category.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-left">
                      <div className="flex gap-2 justify-start">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleEdit(category)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() =>
                            handleDelete(category.id, category.name)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-left">
                      <button
                        onClick={() =>
                          toggleActive(category.id, category.isActive)
                        }
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          category.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                            : 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200'
                        }`}
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-left hidden md:table-cell">
                      <span className="text-gray-900 dark:text-slate-100">
                        {formatNumber(category._count.products)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">
                      {category.description || '-'}
                    </td>
                    <td className="px-4 py-3 text-left font-medium">
                      <span className="text-gray-900 dark:text-slate-100">
                        {category.name}
                      </span>
                      <div className="text-xs text-gray-500 dark:text-slate-500">
                        {category.slug}
                      </div>
                    </td>
                  </tr>
                  {/* Child categories */}
                  {category.children.map((child) => (
                    <tr
                      key={child.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-900/60 bg-gray-25 dark:bg-slate-900/30"
                    >
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(child.id)}
                          onChange={() => toggleSelectCategory(child.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 dark:border-slate-700 rounded focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-left">
                        <div className="flex gap-2 justify-start">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(child)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDelete(child.id, child.name)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <button
                          onClick={() => toggleActive(child.id, child.isActive)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            child.isActive
                              ? 'bg-green-100 text-green-800 dark:bg-emerald-900/40 dark:text-emerald-200'
                              : 'bg-red-100 text-red-800 dark:bg-rose-900/40 dark:text-rose-200'
                          }`}
                        >
                          {child.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-left hidden md:table-cell">
                        <span className="text-gray-900 dark:text-slate-100">
                          {formatNumber(child._count.products)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left text-sm text-gray-600 dark:text-slate-400 hidden lg:table-cell">
                        {child.description || '-'}
                      </td>
                      <td className="px-4 py-3 text-left font-medium">
                        <span className="text-gray-500 dark:text-slate-500 ml-2">
                          Child
                        </span>
                        <span className="text-gray-900 dark:text-slate-100">
                          {child.name}
                        </span>
                        <div className="text-xs text-gray-500 dark:text-slate-500 ml-4">
                          {child.slug}
                        </div>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>

          {categories.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-slate-500">
              No categories found.
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
      />
    </div>
  );
}
