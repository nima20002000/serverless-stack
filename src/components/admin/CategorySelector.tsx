'use client';

import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import {
  ChevronDownIcon,
  FolderIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  children?: Category[];
}

interface CategorySelectorProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
  disabled?: boolean;
}

export default function CategorySelector({
  value,
  onChange,
  disabled = false,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    parentId: null as string | null,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories?tree=true');

      if (!response.ok) {
        throw new Error('Unable to load categories');
      }

      const data = await response.json();
      setCategories(data.categories || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(
        err instanceof Error ? err.message : 'Unable to load categories'
      );
    } finally {
      setLoading(false);
    }
  };

  const findCategoryById = (
    categories: Category[],
    id: string
  ): Category | null => {
    for (const category of categories) {
      if (category.id === id) return category;
      if (category.children) {
        const found = findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getAllCategories = (categories: Category[]): Category[] => {
    let result: Category[] = [];
    for (const category of categories) {
      result.push(category);
      if (category.children) {
        result = result.concat(getAllCategories(category.children));
      }
    }
    return result;
  };

  const selectedCategory = value ? findCategoryById(categories, value) : null;

  const generateSlug = (name: string): string => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\p{Letter}\p{Number}_-]/gu, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleCreateCategory = async () => {
    if (!createForm.name.trim()) {
      alert('Category name is required');
      return;
    }

    try {
      setIsCreating(true);

      // Generate slug from name
      const slug = generateSlug(createForm.name);

      const response = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          slug: slug,
          description: createForm.description.trim() || undefined,
          parentId: createForm.parentId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Unable to create category');
      }

      const data = await response.json();

      // Refresh categories list
      await fetchCategories();

      // Select the newly created category
      onChange(data.category.id);

      // Reset form
      setCreateForm({
        name: '',
        description: '',
        parentId: null,
      });
      setShowCreateForm(false);
      setIsOpen(false);
    } catch (err) {
      console.error('Error creating category:', err);
      alert(err instanceof Error ? err.message : 'Unable to create category');
    } finally {
      setIsCreating(false);
    }
  };

  const renderCategoryOptions = (
    categories: Category[],
    level = 0
  ): ReactElement[] => {
    const elements: ReactElement[] = [];

    for (const category of categories) {
      elements.push(
        <button
          key={category.id}
          type="button"
          onClick={() => {
            onChange(category.id);
            setIsOpen(false);
          }}
          className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${
            value === category.id
              ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/40 dark:text-blue-200'
              : 'dark:hover:bg-slate-800 dark:text-slate-200'
          }`}
          style={{ paddingRight: `${1 + level * 1.5}rem` }}
        >
          <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-gray-400 dark:text-slate-500" />
            <span>{category.name}</span>
            {category.children && category.children.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-slate-500">
                ({category.children.length})
              </span>
            )}
          </div>
        </button>
      );

      if (category.children && category.children.length > 0) {
        elements.push(...renderCategoryOptions(category.children, level + 1));
      }
    }

    return elements;
  };

  if (loading) {
    return (
      <div className="relative">
        <div className="w-full p-3 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900 text-gray-500 dark:text-slate-400">
          Loading Categories...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <div className="w-full p-3 border border-red-300 dark:border-rose-700 rounded-lg bg-red-50 dark:bg-rose-900/30 text-red-700 dark:text-rose-200 text-sm">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchCategories}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-200"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
          disabled
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-slate-800 dark:text-slate-500'
            : 'bg-white hover:border-gray-400 dark:bg-slate-900 dark:hover:border-slate-500'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/50' : 'border-gray-300 dark:border-slate-700'}`}
      >
        <span
          className={
            selectedCategory
              ? 'text-gray-900 dark:text-slate-100'
              : 'text-gray-500 dark:text-slate-400'
          }
        >
          {selectedCategory ? selectedCategory.name : 'Select category'}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 dark:text-slate-500 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => {
              setIsOpen(false);
              setShowCreateForm(false);
            }}
          />

          {/* Menu */}
          <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-none max-h-80 overflow-y-auto">
            {/* Create Category Button */}
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-blue-600 dark:text-blue-300 font-medium border-b border-gray-200 dark:border-slate-800 flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              Create new category
            </button>

            {/* Create Form */}
            {showCreateForm && (
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 bg-blue-50 dark:bg-slate-900/60 space-y-3">
                <Input
                  label="Category name"
                  value={createForm.name}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, name: e.target.value })
                  }
                  placeholder="Example: Apparel"
                  disabled={isCreating}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Description (optional)
                  </label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        description: e.target.value,
                      })
                    }
                    placeholder="Category description..."
                    disabled={isCreating}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
                    Parent category (optional)
                  </label>
                  <select
                    value={createForm.parentId || ''}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        parentId: e.target.value || null,
                      })
                    }
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-left text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-900 dark:text-slate-100"
                  >
                    <option value="">No parent (top level)</option>
                    {getAllCategories(categories).map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 justify-start">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateForm({
                        name: '',
                        description: '',
                        parentId: null,
                      });
                    }}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleCreateCategory}
                    isLoading={isCreating}
                  >
                    Create Category
                  </Button>
                </div>
              </div>
            )}

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400 border-b border-gray-200 dark:border-slate-800"
            >
              No category
            </button>

            {/* Categories */}
            {categories.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                No categories yet. Create one to continue.
              </div>
            ) : (
              renderCategoryOptions(categories)
            )}
          </div>
        </>
      )}
    </div>
  );
}
