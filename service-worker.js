/* ==========================================
   Service Worker - Quran Learning App
   ========================================== */

const CACHE_VERSION = 'v1.5.2';
const CACHE_NAME = `quran-learning-${CACHE_VERSION}`;

// Resources to cache immediately
// NOTE: index.html removed from cache to prevent stale HTML issues
const STATIC_RESOURCES = [
    '/styles.css',
    '/app.js',
    '/manifest.json',
    '/qpc-hafs-tajweed.json',
    '/fonts/UthmanicHafs_V22.woff2'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Installing...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[Service Worker] Caching static resources');
                return cache.addAll(STATIC_RESOURCES);
            })
            .then(() => {
                console.log('[Service Worker] Installation complete');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Activating...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((cacheName) => {
                            return cacheName.startsWith('quran-learning-') &&
                                   cacheName !== CACHE_NAME;
                        })
                        .map((cacheName) => {
                            console.log('[Service Worker] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        })
                );
            })
            .then(() => {
                console.log('[Service Worker] Activation complete');
                return self.clients.claim();
            })
    );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle different types of requests
    if (request.method !== 'GET') {
        return;
    }

    // Strategy: Cache first for static resources and JSON, cache audio with expiry
    if (isStaticResource(url) || url.pathname.endsWith('.json')) {
        event.respondWith(cacheFirst(request));
    } else if (isAudioRequest(url)) {
        event.respondWith(cacheWithExpiry(request, 7 * 24 * 60 * 60 * 1000)); // 7 days
    } else {
        event.respondWith(fetch(request));
    }
});

// ==========================================
// Caching Strategies
// ==========================================

// Cache first, fallback to network
async function cacheFirst(request) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.error('[Service Worker] Fetch failed:', error);
        throw error;
    }
}

// Network first, fallback to cache
async function networkFirst(request) {
    const cache = await caches.open(CACHE_NAME);

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        console.log('[Service Worker] Network failed, trying cache:', request.url);
        const cached = await cache.match(request);
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// Cache with expiry for audio files
async function cacheWithExpiry(request, maxAge) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
        const cachedDate = new Date(cached.headers.get('date'));
        const now = new Date();
        const age = now - cachedDate;

        if (age < maxAge) {
            return cached;
        }
    }

    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        if (cached) {
            return cached;
        }
        throw error;
    }
}

// ==========================================
// Helper Functions
// ==========================================

function isStaticResource(url) {
    // NEVER cache HTML to prevent stale UI issues
    return url.origin === self.location.origin &&
           (url.pathname.endsWith('.css') ||
            url.pathname.endsWith('.js') ||
            url.pathname.endsWith('.json') ||
            url.pathname.endsWith('.png') ||
            url.pathname.endsWith('.jpg') ||
            url.pathname.endsWith('.svg') ||
            url.pathname.endsWith('.woff2') ||
            url.pathname.endsWith('.woff') ||
            url.pathname.endsWith('.ttf') ||
            url.pathname.endsWith('.otf'));
}

function isApiRequest(url) {
    return url.hostname === 'api.alquran.cloud';
}

function isAudioRequest(url) {
    return url.hostname === 'everyayah.com' ||
           url.pathname.endsWith('.mp3');
}

// ==========================================
// Background Sync (for future enhancement)
// ==========================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-progress') {
        event.waitUntil(syncProgress());
    }
});

async function syncProgress() {
    // Future: sync user progress to server
    console.log('[Service Worker] Syncing progress...');
}

// ==========================================
// Push Notifications (for future enhancement)
// ==========================================

self.addEventListener('push', (event) => {
    const options = {
        body: event.data ? event.data.text() : 'Time for your Quran lesson!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification('Quran Learning App', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});
