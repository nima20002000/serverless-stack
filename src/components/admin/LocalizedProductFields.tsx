import type { ManagedLanguage } from '@/lib/i18n/localized-content';
import type { MediaItem, Tag } from '@/types/product-admin';

export type ProductTranslationDraft = {
  name?: string;
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type ProductMediaTranslationDraft = Record<
  string,
  Record<string, { alt?: string }>
>;
export type TagTranslationDraft = Record<
  string,
  Record<string, { name?: string }>
>;

interface LocalizedProductFieldsProps {
  languages: ManagedLanguage[];
  translations: Record<string, ProductTranslationDraft>;
  mediaTranslations: ProductMediaTranslationDraft;
  media: MediaItem[];
  selectedTags?: Tag[];
  tagTranslations?: TagTranslationDraft;
  disabled?: boolean;
  onTranslationsChange: (
    translations: Record<string, ProductTranslationDraft>
  ) => void;
  onMediaTranslationsChange: (
    translations: ProductMediaTranslationDraft
  ) => void;
  onTagTranslationsChange?: (translations: TagTranslationDraft) => void;
}

export default function LocalizedProductFields({
  languages,
  translations,
  mediaTranslations,
  media,
  selectedTags = [],
  tagTranslations = {},
  disabled = false,
  onTranslationsChange,
  onMediaTranslationsChange,
  onTagTranslationsChange,
}: LocalizedProductFieldsProps) {
  const localizedLanguages = languages.filter(
    (language) => language.isEnabled && !language.isDefault
  );
  const savedMedia = media.filter((item) => !item.id.startsWith('new-'));

  if (localizedLanguages.length === 0) {
    return (
      <p className="text-sm text-gray-600 dark:text-slate-400 text-left">
        Enable another storefront language in site settings to add localized
        product copy.
      </p>
    );
  }

  const setTranslationField = (
    locale: string,
    field: keyof ProductTranslationDraft,
    value: string
  ) => {
    onTranslationsChange({
      ...translations,
      [locale]: {
        ...translations[locale],
        [field]: value,
      },
    });
  };

  const setMediaTranslationField = (
    mediaId: string,
    locale: string,
    value: string
  ) => {
    onMediaTranslationsChange({
      ...mediaTranslations,
      [mediaId]: {
        ...(mediaTranslations[mediaId] || {}),
        [locale]: { alt: value },
      },
    });
  };

  const setTagTranslationField = (
    tagId: string,
    locale: string,
    value: string
  ) => {
    onTagTranslationsChange?.({
      ...tagTranslations,
      [tagId]: {
        ...(tagTranslations[tagId] || {}),
        [locale]: { name: value },
      },
    });
  };

  return (
    <div className="space-y-6">
      {localizedLanguages.map((language) => {
        const translation = translations[language.code] || {};
        return (
          <div
            key={language.code}
            className="space-y-4 border-b border-gray-200 pb-6 last:border-b-0 last:pb-0 dark:border-slate-800"
          >
            <div className="text-left">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                {language.label}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Empty fields fall back to the default language.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block text-left">
                <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                  Product name
                </span>
                <input
                  type="text"
                  data-testid={`product-translation-${language.code}-name`}
                  value={translation.name || ''}
                  disabled={disabled}
                  onChange={(event) =>
                    setTranslationField(
                      language.code,
                      'name',
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
              <label className="block text-left">
                <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                  SEO title
                </span>
                <input
                  type="text"
                  data-testid={`product-translation-${language.code}-seoTitle`}
                  value={translation.seoTitle || ''}
                  disabled={disabled}
                  onChange={(event) =>
                    setTranslationField(
                      language.code,
                      'seoTitle',
                      event.target.value
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                />
              </label>
            </div>
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                Product description
              </span>
              <textarea
                data-testid={`product-translation-${language.code}-description`}
                value={translation.description || ''}
                disabled={disabled}
                rows={3}
                onChange={(event) =>
                  setTranslationField(
                    language.code,
                    'description',
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="block text-left">
              <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-slate-300">
                SEO description
              </span>
              <textarea
                data-testid={`product-translation-${language.code}-seoDescription`}
                value={translation.seoDescription || ''}
                disabled={disabled}
                rows={2}
                onChange={(event) =>
                  setTranslationField(
                    language.code,
                    'seoDescription',
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            {savedMedia.length > 0 && (
              <div className="space-y-3">
                <div className="text-left text-xs font-medium text-gray-700 dark:text-slate-300">
                  Media alt text
                </div>
                {savedMedia.map((item) => (
                  <label
                    key={`${item.id}-${language.code}`}
                    className="block text-left"
                  >
                    <span className="mb-1 block truncate text-xs text-gray-500 dark:text-slate-400">
                      {item.alt || item.url}
                    </span>
                    <input
                      type="text"
                      data-testid={`product-media-translation-${item.id}-${language.code}-alt`}
                      value={
                        mediaTranslations[item.id]?.[language.code]?.alt || ''
                      }
                      disabled={disabled}
                      onChange={(event) =>
                        setMediaTranslationField(
                          item.id,
                          language.code,
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                ))}
              </div>
            )}
            {selectedTags.length > 0 && onTagTranslationsChange && (
              <div className="space-y-3">
                <div className="text-left text-xs font-medium text-gray-700 dark:text-slate-300">
                  Tag names
                </div>
                {selectedTags.map((tag) => (
                  <label
                    key={`${tag.id}-${language.code}`}
                    className="block text-left"
                  >
                    <span className="mb-1 block truncate text-xs text-gray-500 dark:text-slate-400">
                      {tag.name}
                    </span>
                    <input
                      type="text"
                      data-testid={`tag-translation-${tag.id}-${language.code}-name`}
                      value={
                        tagTranslations[tag.id]?.[language.code]?.name || ''
                      }
                      disabled={disabled}
                      onChange={(event) =>
                        setTagTranslationField(
                          tag.id,
                          language.code,
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                    />
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
