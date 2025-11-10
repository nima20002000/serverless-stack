'use client';

import { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface TagInputProps {
  selectedTags: Tag[];
  onChange: (tags: Tag[]) => void;
  disabled?: boolean;
}

export default function TagInput({ selectedTags, onChange, disabled = false }: TagInputProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchTags(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchTags = async (searchQuery: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/tags/search?q=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('خطا در جستجوی برچسب‌ها');
      }

      const data = await response.json();

      // Filter out already selected tags
      const filtered = (data.tags || []).filter(
        (tag: Tag) => !selectedTags.some(selected => selected.id === tag.id)
      );

      setSuggestions(filtered);
    } catch (err) {
      console.error('Error searching tags:', err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tag: Tag) => {
    if (!selectedTags.some(t => t.id === tag.id)) {
      onChange([...selectedTags, tag]);
    }
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter(t => t.id !== tagId));
  };

  const generateSlug = (name: string): string => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u0600-\u06FF-]/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const createNewTag = async () => {
    if (!query.trim() || disabled) return;

    try {
      setLoading(true);
      const slug = generateSlug(query);
      const response = await fetch('/api/admin/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: query.trim(), slug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'خطا در ایجاد برچسب');
      }

      const data = await response.json();
      addTag(data.tag);
    } catch (err) {
      console.error('Error creating tag:', err);
      alert(err instanceof Error ? err.message : 'خطا در ایجاد برچسب');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      if (suggestions.length > 0) {
        addTag(suggestions[0]);
      } else if (query.trim().length >= 2) {
        createNewTag();
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedTags.map(tag => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{tag.name}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag.id)}
                  className="hover:bg-blue-200 rounded-full p-0.5 transition-colors"
                  aria-label={`حذف ${tag.name}`}
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="جستجو یا ایجاد برچسب جدید..."
          className={`w-full pr-10 pl-4 py-3 border rounded-lg transition-colors ${
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
              : 'bg-white hover:border-gray-400'
          } ${isOpen ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-300'}`}
        />

        {loading && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && !disabled && (query.length >= 2 || suggestions.length > 0) && (
        <div className="absolute z-20 mt-2 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              در حال جستجو...
            </div>
          ) : suggestions.length > 0 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
                برچسب‌های موجود
              </div>
              {suggestions.map(tag => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  className="w-full text-right px-4 py-2 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{tag.name}</span>
                    <span className="text-xs text-gray-500">#{tag.slug}</span>
                  </div>
                </button>
              ))}
            </>
          ) : query.trim().length >= 2 ? (
            <>
              <div className="px-3 py-2 text-xs text-gray-500 border-b border-gray-200">
                نتیجه‌ای یافت نشد
              </div>
              <button
                type="button"
                onClick={createNewTag}
                className="w-full text-right px-4 py-3 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm text-blue-600 font-medium">
                    ایجاد برچسب جدید:
                  </span>
                  <span className="text-sm text-gray-700">&quot;{query}&quot;</span>
                </div>
              </button>
            </>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">
              حداقل 2 حرف تایپ کنید
            </div>
          )}
        </div>
      )}

      {/* Helper Text */}
      {!disabled && (
        <p className="mt-2 text-xs text-gray-500">
          برای جستجو تایپ کنید یا Enter بزنید تا برچسب جدید ایجاد شود
        </p>
      )}
    </div>
  );
}
