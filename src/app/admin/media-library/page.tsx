'use client';

import { useState, useEffect } from 'react';
import { PhotoIcon, VideoCameraIcon, TrashIcon, PencilIcon } from '@heroicons/react/24/outline';
import Breadcrumbs from '@/components/admin/Breadcrumbs';

export const dynamic = 'force-dynamic';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  fileName: string;
  fileSize: number;
  alt: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export default function MediaLibraryPage() {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'IMAGE' | 'VIDEO'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editAlt, setEditAlt] = useState('');
  const [editTags, setEditTags] = useState('');
  const [allTags, setAllTags] = useState<string[]>([]);

  useEffect(() => {
    loadMedia();
    loadTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType, searchQuery]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType !== 'all') params.append('type', filterType);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/media-library?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setMedia(data.media || []);
      } else {
        alert(data.error || 'خطا در بارگذاری رسانه‌ها');
      }
    } catch (error) {
      console.error('Failed to load media:', error);
      alert('خطا در بارگذاری رسانه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await fetch('/api/media-library?getTags=true');
      const data = await response.json();
      if (response.ok) {
        setAllTags(data.tags || []);
      }
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    const alt = prompt('متن جایگزین (alt) برای رسانه را وارد کنید (اختیاری):');
    if (alt) formData.append('alt', alt);

    const tags = prompt('برچسب‌ها را با کاما جدا کنید (مثلاً: hero,banner,promotion):');
    if (tags) formData.append('tags', tags);

    try {
      setUploading(true);
      const response = await fetch('/api/media-library/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        alert('فایل با موفقیت آپلود شد');
        loadMedia();
        loadTags();
      } else {
        alert(data.error || 'خطا در آپلود فایل');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در آپلود فایل');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id: string, fileName: string) => {
    if (!confirm(`آیا از حذف "${fileName}" اطمینان دارید؟`)) return;

    try {
      const response = await fetch(`/api/media-library/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('رسانه با موفقیت حذف شد');
        loadMedia();
        loadTags();
        if (selectedMedia?.id === id) {
          setSelectedMedia(null);
        }
      } else {
        const data = await response.json();
        alert(data.error || 'خطا در حذف رسانه');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('خطا در حذف رسانه');
    }
  };

  const handleEdit = (item: MediaItem) => {
    setSelectedMedia(item);
    setEditMode(true);
    setEditAlt(item.alt || '');
    setEditTags(item.tags.join(', '));
  };

  const handleSaveEdit = async () => {
    if (!selectedMedia) return;

    try {
      const response = await fetch(`/api/media-library/${selectedMedia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt: editAlt || null,
          tags: editTags.split(',').map((t) => t.trim()).filter(Boolean),
        }),
      });

      if (response.ok) {
        alert('رسانه با موفقیت بروزرسانی شد');
        setEditMode(false);
        loadMedia();
        loadTags();
      } else {
        const data = await response.json();
        alert(data.error || 'خطا در بروزرسانی رسانه');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('خطا در بروزرسانی رسانه');
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert('آدرس URL کپی شد');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const filteredMedia = media;

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: 'داشبورد', href: '/admin' },
          { label: 'کتابخانه رسانه', href: '/admin/media-library' },
        ]}
      />

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">کتابخانه رسانه</h1>
          <label className="btn-primary cursor-pointer">
            {uploading ? 'در حال آپلود...' : 'آپلود فایل جدید'}
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              فیلتر بر اساس نوع
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'all' | 'IMAGE' | 'VIDEO')}
              className="input"
            >
              <option value="all">همه</option>
              <option value="IMAGE">تصاویر</option>
              <option value="VIDEO">ویدیوها</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              جستجو
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در نام فایل یا متن جایگزین..."
              className="input w-full"
            />
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-2">برچسب‌های موجود:</p>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Media Grid */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">در حال بارگذاری...</div>
        ) : filteredMedia.length === 0 ? (
          <div className="text-center py-8 text-gray-500">هیچ رسانه‌ای یافت نشد</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredMedia.map((item) => (
              <div
                key={item.id}
                className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                <div className="aspect-video bg-gray-100 flex items-center justify-center">
                  {item.type === 'IMAGE' ? (
                    <img
                      src={item.url}
                      alt={item.alt || item.fileName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={item.url}
                      className="w-full h-full object-cover"
                      controls
                    />
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {item.type === 'IMAGE' ? (
                      <PhotoIcon className="w-4 h-4 text-blue-600" />
                    ) : (
                      <VideoCameraIcon className="w-4 h-4 text-purple-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.fileName}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{formatFileSize(item.fileSize)}</p>
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Media Details Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => {
            if (!editMode) {
              setSelectedMedia(null);
            }
          }}
        >
          <div
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">جزئیات رسانه</h2>
                <button
                  onClick={() => {
                    setSelectedMedia(null);
                    setEditMode(false);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="mb-4">
                {selectedMedia.type === 'IMAGE' ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.alt || selectedMedia.fileName}
                    className="w-full rounded-lg"
                  />
                ) : (
                  <video src={selectedMedia.url} controls className="w-full rounded-lg" />
                )}
              </div>

              {editMode ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      متن جایگزین (Alt)
                    </label>
                    <input
                      type="text"
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      برچسب‌ها (با کاما جدا کنید)
                    </label>
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      className="input w-full"
                      placeholder="hero, banner, promotion"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="btn-primary">
                      ذخیره
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="btn-secondary"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-700">نام فایل</p>
                    <p className="text-gray-900">{selectedMedia.fileName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">نوع</p>
                    <p className="text-gray-900">
                      {selectedMedia.type === 'IMAGE' ? 'تصویر' : 'ویدیو'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">حجم فایل</p>
                    <p className="text-gray-900">{formatFileSize(selectedMedia.fileSize)}</p>
                  </div>
                  {selectedMedia.alt && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">متن جایگزین</p>
                      <p className="text-gray-900">{selectedMedia.alt}</p>
                    </div>
                  )}
                  {selectedMedia.tags.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">برچسب‌ها</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMedia.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-700">آدرس URL</p>
                    <div className="flex gap-2 items-center">
                      <code className="text-xs bg-gray-100 p-2 rounded flex-1 overflow-x-auto">
                        {selectedMedia.url}
                      </code>
                      <button
                        onClick={() => copyUrl(selectedMedia.url)}
                        className="btn-secondary text-sm"
                      >
                        کپی
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={() => handleEdit(selectedMedia)}
                      className="btn-primary flex items-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      ویرایش
                    </button>
                    <button
                      onClick={() => handleDelete(selectedMedia.id, selectedMedia.fileName)}
                      className="btn-danger flex items-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
