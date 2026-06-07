'use client';

import { useState, useEffect, useCallback } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import Breadcrumbs from '@/components/admin/Breadcrumbs';
import R2MediaBrowser from '@/components/admin/R2MediaBrowser';
import Image from 'next/image';
import type { ManagedLanguage } from '@/lib/i18n/localized-content';

interface SiteSetting {
  key: string;
  value: string;
}

export default function SiteSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({
    favicon: '',
    logo: '',
    site_name: 'Commerce Starter',
  });
  const [languages, setLanguages] = useState<ManagedLanguage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isE2E =
    process.env.NEXT_PUBLIC_E2E_TEST === 'true' ||
    (typeof document !== 'undefined' &&
      document.cookie.includes('e2e-test=true'));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showMediaBrowser, setShowMediaBrowser] = useState(false);
  const [currentEditingKey, setCurrentEditingKey] = useState<
    'favicon' | 'logo' | null
  >(null);

  const fetchSettings = useCallback(async () => {
    try {
      if (!isE2E) {
        setIsLoading(true);
      }
      const [settingsResponse, languagesResponse] = await Promise.all([
        fetch('/api/admin/settings'),
        fetch('/api/admin/languages'),
      ]);
      if (!settingsResponse.ok) throw new Error('Unable to load settings');
      if (!languagesResponse.ok)
        throw new Error('Unable to load language settings');
      const data = await settingsResponse.json();
      const languageData = await languagesResponse.json();

      // Convert array to object
      const settingsObj: Record<string, string> = {
        favicon: '',
        logo: '',
        site_name: 'Commerce Starter',
      };

      data.settings.forEach((setting: SiteSetting) => {
        settingsObj[setting.key] = setting.value;
      });

      setSettings(settingsObj);
      setLanguages(languageData.languages || []);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    } finally {
      setIsLoading(false);
    }
  }, [isE2E]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError('');

      const [settingsResponse, languagesResponse] = await Promise.all([
        fetch('/api/admin/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings }),
        }),
        fetch('/api/admin/languages', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ languages }),
        }),
      ]);

      if (!settingsResponse.ok) {
        const errorData = await settingsResponse.json();
        throw new Error(errorData.error || 'Unable to save settings');
      }

      if (!languagesResponse.ok) {
        const errorData = await languagesResponse.json();
        throw new Error(errorData.error || 'Unable to save languages');
      }

      const languageData = await languagesResponse.json();
      setLanguages(languageData.languages || languages);

      setSuccessMessage('Settings saved.');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Error Unknown');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleLanguage = (code: string, isEnabled: boolean) => {
    setLanguages((current) =>
      current.map((language) => {
        if (language.code !== code) return language;
        if (language.isDefault) return { ...language, isEnabled: true };
        return { ...language, isEnabled };
      })
    );
  };

  const setDefaultLanguage = (code: string) => {
    setLanguages((current) =>
      current.map((language) => ({
        ...language,
        isDefault: language.code === code,
        isEnabled: language.code === code ? true : language.isEnabled,
      }))
    );
  };

  const handleMediaSelect = (urls: string[]) => {
    if (urls.length > 0 && currentEditingKey) {
      setSettings({ ...settings, [currentEditingKey]: urls[0] });
      setSuccessMessage(
        `${currentEditingKey === 'favicon' ? 'Favicon' : 'Logo'} selected.`
      );
    }
  };

  const openMediaBrowser = (key: 'favicon' | 'logo') => {
    setCurrentEditingKey(key);
    setShowMediaBrowser(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Site settings' }]} />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 text-left">
          Site settings
        </h1>
        <p className="text-gray-600 dark:text-slate-400 text-left mt-2">
          Manage basic public site identity assets.
        </p>
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

      <Card className="mb-6">
        <div className="p-6 space-y-6">
          {/* Site Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
              Site name
            </label>
            <input
              type="text"
              value={settings.site_name}
              onChange={(e) =>
                setSettings({ ...settings, site_name: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-left dark:bg-slate-900 dark:text-slate-100"
              placeholder="Commerce Starter"
            />
          </div>

          {/* Favicon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
              Favicon
            </label>
            <div className="space-y-2">
              {settings.favicon && (
                <div className="flex items-center gap-4 p-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/60">
                  <div className="relative w-16 h-16 border border-gray-300 dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-900">
                    <Image
                      src={settings.favicon}
                      alt="Favicon preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                      {settings.favicon}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, favicon: '' })}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-rose-300 dark:hover:text-rose-200"
                  >
                    Delete
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => openMediaBrowser('favicon')}
              >
                {settings.favicon ? 'Change favicon' : 'Select favicon'}
              </Button>
              <p className="text-xs text-gray-500 dark:text-slate-500 text-left">
                Recommended icon size: 32x32 or 64x64 pixels.
              </p>
            </div>
          </div>

          {/* Logo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 text-left">
              Logo
            </label>
            <div className="space-y-2">
              {settings.logo && (
                <div className="flex items-center gap-4 p-4 border border-gray-300 dark:border-slate-700 rounded-lg bg-gray-50 dark:bg-slate-900/60">
                  <div className="relative w-32 h-16 border border-gray-300 dark:border-slate-700 rounded overflow-hidden bg-white dark:bg-slate-900">
                    <Image
                      src={settings.logo}
                      alt="Logo preview"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm text-gray-600 dark:text-slate-400 truncate">
                      {settings.logo}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, logo: '' })}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-rose-300 dark:hover:text-rose-200"
                  >
                    Delete
                  </button>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={() => openMediaBrowser('logo')}
              >
                {settings.logo ? 'Change logo' : 'Select logo'}
              </Button>
              <p className="text-xs text-gray-500 dark:text-slate-500 text-left">
                Use a transparent logo with a maximum width around 200 pixels.
              </p>
            </div>
          </div>

          <div>
            <div className="mb-3">
              <h2 className="text-base font-semibold text-gray-900 dark:text-slate-100 text-left">
                Website languages
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 text-left">
                Enable storefront languages and review the fallback language.
              </p>
              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300 text-left">
                Default language changes require a catalog content migration
                before they can be enabled.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800">
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500 dark:bg-slate-900 dark:text-slate-400">
                <span>Language</span>
                <span>Enabled</span>
                <span>Default</span>
              </div>
              {languages.map((language) => (
                <div
                  key={language.code}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-t border-gray-200 px-4 py-3 dark:border-slate-800"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-900 dark:text-slate-100">
                      {language.label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-slate-400">
                      {language.nativeLabel} · {language.code.toUpperCase()} ·{' '}
                      {language.direction.toUpperCase()}
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={language.isEnabled}
                    disabled={language.isDefault}
                    onChange={(event) =>
                      toggleLanguage(language.code, event.target.checked)
                    }
                    aria-label={`Enable ${language.label}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                  <input
                    type="radio"
                    name="default-language"
                    checked={language.isDefault}
                    disabled={!language.isDefault}
                    onChange={() => setDefaultLanguage(language.code)}
                    aria-label={`Set ${language.label} as default`}
                    className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-gray-200 dark:border-slate-800">
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              isLoading={isSaving}
              className="w-full md:w-auto"
            >
              Save settings
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
      />
    </div>
  );
}
