/**
 * Service Worker - Cache Busting
 *
 * This service worker handles cache management with version-based invalidation.
 * When a new version is deployed, it clears all old caches and forces clients
 * to fetch fresh content.
 *
 * Key features:
 * - Version-prefixed cache names
 * - Automatic cleanup of old caches on activation
 * - Network-first strategy for API calls
 * - Cache-first strategy for static assets
 * - Version check on every fetch to detect updates
 */

// This will be replaced at build time with the actual build ID
const BUILD_VERSION = '__BUILD_VERSION__';
const CACHE_PREFIX = 'commerce-boilerplate-cache';
const CACHE_NAME = `${CACHE_PREFIX}-${BUILD_VERSION}`;

// Assets to pre-cache on install
const PRECACHE_ASSETS = ['/favicon.ico', '/favicon.svg'];
const OWNED_CACHE_PATH_PATTERNS = [
  /^\/$/,
  /^\/_next\//,
  /^\/favicon\.(ico|svg)$/,
  /^\/build-version\.json$/,
];

// Patterns to never cache
const NO_CACHE_PATTERNS = [
  /\/api\//,
  /\/build-version\.json/,
  /_next\/webpack-hmr/,
  /localhost/,
  /supabase/,
  /chrome-extension/,
];

// Check if a URL should be cached
function shouldCache(url) {
  const urlString = url.toString();

  // Don't cache if matches any no-cache pattern
  for (const pattern of NO_CACHE_PATTERNS) {
    if (pattern.test(urlString)) {
      return false;
    }
  }

  // Only cache same-origin requests. External storage/CDN hosts should opt into
  // their own cache policy instead of being hard-coded in this boilerplate.
  const urlObj = new URL(url);
  const isSameOrigin = urlObj.origin === self.location.origin;

  return isSameOrigin;
}

async function isOwnedCache(cacheName) {
  if (cacheName.startsWith(`${CACHE_PREFIX}-`)) {
    return true;
  }

  try {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();

    return requests.some((request) => {
      const url = new URL(request.url);

      return (
        url.origin === self.location.origin &&
        OWNED_CACHE_PATH_PATTERNS.some((pattern) => pattern.test(url.pathname))
      );
    });
  } catch {
    return false;
  }
}

// Install event - pre-cache critical assets
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing version: ${BUILD_VERSION}`);

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pre-caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating version: ${BUILD_VERSION}`);

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map(async (cacheName) => {
            // Delete previous caches owned by this service worker.
            if (cacheName !== CACHE_NAME && (await isOwnedCache(cacheName))) {
              console.log(`[SW] Deleting old cache: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients about the update
        return self.clients.matchAll().then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: BUILD_VERSION,
            });
          });
        });
      })
  );
});

// Fetch event - network first with cache fallback
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip requests that shouldn't be cached
  if (!shouldCache(event.request.url)) {
    return;
  }

  // For navigation requests (HTML pages), always go network-first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(js|css|woff2?|ttf|png|jpg|svg|ico)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // Default: network first with cache fallback
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION',
      version: BUILD_VERSION,
    });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then((cacheNames) => {
      Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))).then(
        () => {
          event.ports[0].postMessage({
            type: 'CACHE_CLEARED',
          });
        }
      );
    });
  }
});
