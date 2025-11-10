'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, FolderIcon } from '@heroicons/react/24/outline';

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

export default function CategorySelector({ value, onChange, disabled = false }: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/categories?tree=true');

      if (!response.ok) {
        throw new Error('خطا در دریافت دسته‌بندی‌ها');
      }

      const data = await response.json();
      setCategories(data.categories || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : 'خطا در دریافت دسته‌بندی‌ها');
    } finally {
      setLoading(false);
    }
  };

  const findCategoryById = (categories: Category[], id: string): Category | null => {
    for (const category of categories) {
      if (category.id === id) return category;
      if (category.children) {
        const found = findCategoryById(category.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedCategory = value ? findCategoryById(categories, value) : null;

  const renderCategoryOptions = (categories: Category[], level = 0): JSX.Element[] => {
    const elements: JSX.Element[] = [];

    for (const category of categories) {
      elements.push(
        <button
          key={category.id}
          type="button"
          onClick={() => {
            onChange(category.id);
            setIsOpen(false);
          }}
          className={`w-full text-right px-4 py-2 hover:bg-gray-100 transition-colors ${
            value === category.id ? 'bg-blue-50 text-blue-700 font-medium' : ''
          }`}
          style={{ paddingRight: `${1 + level * 1.5}rem` }}
        >
          <div className="flex items-center gap-2">
            <FolderIcon className="h-4 w-4 text-gray-400" />
            <span>{category.name}</span>
            {category.children && category.children.length > 0 && (
              <span className="text-xs text-gray-500">
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
        <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500">
          در حال بارگذاری دسته‌بندی‌ها...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative">
        <div className="w-full p-3 border border-red-300 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
        <button
          type="button"
          onClick={fetchCategories}
          className="mt-2 text-sm text-blue-600 hover:text-blue-700"
        >
          تلاش مجدد
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
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
            : 'bg-white hover:border-gray-400'
        } ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
      >
        <span className={selectedCategory ? 'text-gray-900' : 'text-gray-500'}>
          {selectedCategory ? selectedCategory.name : 'انتخاب دسته‌بندی'}
        </span>
        <ChevronDownIcon
          className={`h-5 w-5 text-gray-400 transition-transform ${
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
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setIsOpen(false);
              }}
              className="w-full text-right px-4 py-2 hover:bg-gray-100 text-gray-500 border-b border-gray-200"
            >
              بدون دسته‌بندی
            </button>

            {/* Categories */}
            {categories.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                هیچ دسته‌بندی‌ای موجود نیست
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
