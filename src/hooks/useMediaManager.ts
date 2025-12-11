import { useState } from 'react';
import type { MediaItem } from '@/types/product-admin';

/**
 * Custom hook for managing media (images/videos) in product admin pages
 * Handles: adding media, setting default, removing media
 */
export function useMediaManager(initialMedia: MediaItem[] = []) {
  const [media, setMedia] = useState<MediaItem[]>(initialMedia);

  const handleMediaSelect = (urls: string[]) => {
    const newMedia: MediaItem[] = urls.map((url, index) => ({
      id: `new-${Date.now()}-${index}`,
      type: url.includes('/videos/') ? 'VIDEO' : 'IMAGE',
      url,
      alt: '',
      order: media.length + index,
      isDefault: media.length === 0 && index === 0, // First photo is default if no media exists
      isNew: true,
    }));
    setMedia([...media, ...newMedia]);
  };

  const setDefaultMedia = (id: string) => {
    setMedia(media.map(m => ({
      ...m,
      isDefault: m.id === id,
    })));
  };

  const removeMedia = (id: string) => {
    const removedItem = media.find(m => m.id === id);
    const remaining = media.filter(m => m.id !== id);

    // If removing the default media and there are remaining items, make the first one default
    if (removedItem?.isDefault && remaining.length > 0) {
      remaining[0].isDefault = true;
    }

    setMedia(remaining);
  };

  return {
    media,
    setMedia,
    handleMediaSelect,
    setDefaultMedia,
    removeMedia,
  };
}
