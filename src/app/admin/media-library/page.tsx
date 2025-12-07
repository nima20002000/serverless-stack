'use client';

import { useState, useEffect, useCallback } from 'react';
import { PhotoIcon, VideoCameraIcon, TrashIcon, PencilIcon, ArrowUpTrayIcon, XMarkIcon } from '@heroicons/react/24/outline';
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

interface FileWithPreview {
  file: File;
  preview: string;
  alt: string;
  tags: string;
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
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileWithPreview[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);

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

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: FileWithPreview[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        alert(`فایل ${file.name} از نوع مجاز نیست`);
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);

      newFiles.push({
        file,
        preview,
        alt: '',
        tags: '',
      });
    });

    if (newFiles.length > 0) {
      setPendingFiles((prev) => [...prev, ...newFiles]);
      setShowUploadModal(true);
    }
  }, []);

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    e.target.value = '';
  };

  // Remove file from pending list
  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      URL.revokeObjectURL(newFiles[index].preview);
      newFiles.splice(index, 1);
      if (newFiles.length === 0) {
        setShowUploadModal(false);
      }
      return newFiles;
    });
  };

  // Update file metadata
  const updateFileMetadata = (index: number, field: 'alt' | 'tags', value: string) => {
    setPendingFiles((prev) => {
      const newFiles = [...prev];
      newFiles[index][field] = value;
      return newFiles;
    });
  };

  // Upload all pending files
  const handleUploadAll = async () => {
    if (pendingFiles.length === 0) return;

    try {
      setUploading(true);

      for (const fileData of pendingFiles) {
        const formData = new FormData();
        formData.append('file', fileData.file);
        if (fileData.alt) formData.append('alt', fileData.alt);
        if (fileData.tags) formData.append('tags', fileData.tags);

        const response = await fetch('/api/media-library/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          alert(`خطا در آپلود ${fileData.file.name}: ${data.error || 'خطای ناشناخته'}`);
        }
      }

      alert('همه فایل‌ها با موفقیت آپلود شدند');

      // Clean up
      pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview));
      setPendingFiles([]);
      setShowUploadModal(false);
      loadMedia();
      loadTags();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در آپلود فایل‌ها');
    } finally {
      setUploading(false);
    }
  };

  // Cancel upload
  const handleCancelUpload = () => {
    pendingFiles.forEach((f) => URL.revokeObjectURL(f.preview));
    setPendingFiles([]);
    setShowUploadModal(false);
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
        </div>

        {/* Drag & Drop Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }`}
        >
          <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            فایل‌های خود را اینجا بکشید و رها کنید
          </p>
          <p className="text-sm text-gray-500 mb-4">
            یا روی دکمه زیر کلیک کنید تا فایل‌ها را انتخاب کنید
          </p>
          <label className="btn-primary cursor-pointer inline-block">
            انتخاب فایل‌ها
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              onChange={handleInputChange}
              multiple
              disabled={uploading}
              className="hidden"
            />
          </label>
          <p className="text-xs text-gray-400 mt-4">
            فرمت‌های مجاز: JPG, PNG, WEBP, GIF, MP4, WEBM | حداکثر: 8MB برای تصاویر، 50MB برای ویدیوها
          </p>
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  آپلود فایل‌ها ({pendingFiles.length})
                </h2>
                <button
                  onClick={handleCancelUpload}
                  className="text-gray-500 hover:text-gray-700"
                  disabled={uploading}
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                {pendingFiles.map((fileData, index) => {
                  const isImage = fileData.file.type.startsWith('image/');

                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        {/* Preview */}
                        <div className="w-32 h-32 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                          {isImage ? (
                            <img
                              src={fileData.preview}
                              alt={fileData.file.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={fileData.preview}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* File Info & Metadata */}
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                {isImage ? (
                                  <PhotoIcon className="w-5 h-5 text-blue-600" />
                                ) : (
                                  <VideoCameraIcon className="w-5 h-5 text-purple-600" />
                                )}
                                <p className="font-medium text-gray-900">{fileData.file.name}</p>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {formatFileSize(fileData.file.size)}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              disabled={uploading}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <XMarkIcon className="w-5 h-5" />
                            </button>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              متن جایگزین (اختیاری)
                            </label>
                            <input
                              type="text"
                              value={fileData.alt}
                              onChange={(e) => updateFileMetadata(index, 'alt', e.target.value)}
                              placeholder="توضیحی برای این فایل..."
                              disabled={uploading}
                              className="input w-full text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              برچسب‌ها (با کاما جدا کنید)
                            </label>
                            <input
                              type="text"
                              value={fileData.tags}
                              onChange={(e) => updateFileMetadata(index, 'tags', e.target.value)}
                              placeholder="مثال: hero, banner, promotion"
                              disabled={uploading}
                              className="input w-full text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6 pt-6 border-t">
                <button
                  onClick={handleUploadAll}
                  disabled={uploading || pendingFiles.length === 0}
                  className="btn-primary flex-1"
                >
                  {uploading ? 'در حال آپلود...' : `آپلود ${pendingFiles.length} فایل`}
                </button>
                <button
                  onClick={handleCancelUpload}
                  disabled={uploading}
                  className="btn-secondary"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
