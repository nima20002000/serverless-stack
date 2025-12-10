'use client';

import { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import R2MediaBrowser from '@/components/admin/R2MediaBrowser';
import Image from 'next/image';

interface SiteSetting {
  key: string;
  value: string;
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    favicon: '',
    logo: '',
    site_name: 'کیتیا',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [currentEditingKey, setCurrentEditingKey] = useState<'favicon' | 'logo' | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('خطا در دریافت تنظیمات');
      const data = await response.json();

      // Convert array to object
      const settingsObj: Record<string, string> = {
        favicon: '',
        logo: '',
        site_name: 'کیتیا',
      };

      data.settings.forEach((setting: SiteSetting) => {
        settingsObj[setting.key] = setting.value;
      });

      setSettings(settingsObj);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'خطا در ذخیره تنظیمات');
      }

      setSuccessMessage('تنظیمات با موفقیت ذخیره شد');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'خطای نامشخص');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMediaSelect = (urls: string[]) => {
    if (urls.length > 0 && currentEditingKey) {
      setSettings({ ...settings, [currentEditingKey]: urls[0] });
      setSuccessMessage(`${currentEditingKey === 'favicon' ? 'فاویکون' : 'لوگو'} با موفقیت انتخاب شد`);
    }
  };

  const openMediaBrowser = (key: 'favicon' | 'logo') => {
    setCurrentEditingKey(key);
    setShowMediaBrowser(true);
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
      <Breadcrumbs items={[{ label: 'تنظیمات سایت' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 text-right">تنظیمات سایت</h1>
        <p className="text-gray-600 text-right mt-2">مدیریت فاویکون، لوگو و سایر تنظیمات سایت</p>
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

      <Card className="mb-6">
        <div className="p-6 space-y-6">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              نام سایت
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-right"
              placeholder="کیتیا"
            />
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              فاویکون (Favicon)
            </label>
            <div className="space-y-2">
              {settings.favicon && (
                <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="relative w-16 h-16 border border-gray-300 rounded overflow-hidden bg-white">
                    <Image
                      src={settings.favicon}
                      alt="فاویکون"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-600 truncate">{settings.favicon}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, favicon: '' })}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    حذف
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => openMediaBrowser('favicon')}
              >
                {settings.favicon ? 'تغییر فاویکون' : 'انتخاب فاویکون از R2'}
              </Button>
              <p className="text-xs text-gray-500 text-right">
                فاویکون آیکون کوچکی است که در تب مرورگر نمایش داده می‌شود. ابعاد توصیه شده: 32x32 یا 64x64 پیکسل
              </p>
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
              لوگو (Logo)
            </label>
            <div className="space-y-2">
              {settings.logo && (
                <div className="flex items-center gap-4 p-4 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="relative w-32 h-16 border border-gray-300 rounded overflow-hidden bg-white">
                    <Image
                      src={settings.logo}
                      alt="لوگو"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm text-gray-600 truncate">{settings.logo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, logo: '' })}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    حذف
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => openMediaBrowser('logo')}
              >
                {settings.logo ? 'تغییر لوگو' : 'انتخاب لوگو از R2'}
              </Button>
              <p className="text-xs text-gray-500 text-right">
                لوگو در هدر سایت نمایش داده می‌شود. ابعاد توصیه شده: عرض حداکثر 200 پیکسل
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              className="w-full md:w-auto"
            >
              ذخیره تنظیمات
            </Button>
          </div>
        </div>
      </Card>

      {/* R2MediaBrowser Modal */}
      <R2MediaBrowser
        isOpen={showMediaBrowser}
        onClose={() => {
          setShowMediaBrowser(false);
          setCurrentEditingKey(null);
        }}
        onSelect={handleMediaSelect}
        multiSelect={false}
        initialFolder="media-library/images"
        allowUpload={true}
      />
    </div>
  );
}
