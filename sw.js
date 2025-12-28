const CACHE_NAME = 'cinestream-v4';
const VIDEO_CACHE_NAME = 'cinestream-video-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// 1. Install: Cache the basic App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching App Shell');
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

// 2. Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== VIDEO_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Match asset types
const isAsset = (url) => url.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2)$/);
const isCDN = (url) => url.includes('aistudiocdn.com') || url.includes('cdn.tailwindcss.com');
const isAPI = (url) => url.includes('api.php') || url.includes('douban.com') || url.includes('daili.laidd.de5.net');

// Video Helpers
const isVideoPlaylist = (url) => url.includes('.m3u8');
const isVideoSegment = (url) => url.match(/\.(ts|mp4|m4s|m4a)$/) || url.includes('seg-') || url.includes('video');

// 3. Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Ignore range requests for video to avoid cache errors (HLS.js handles ranges internally)
  if (request.headers.has('range')) return;

  // --- VIDEO HANDLING ---
  
  // A. Video Segments: Cache First (Content is immutable)
  if (isVideoSegment(request.url)) {
    event.respondWith(
      caches.open(VIDEO_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            // Cache segment if response is valid (200) or opaque (CORS)
            // Note: Opaque responses are padded by the browser and can be large.
            if (response.status === 200 || response.type === 'opaque') {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => null);
        });
      })
    );
    return;
  }

  // B. Video Playlists: Network First (Check for updates, fallback to cache)
  if (isVideoPlaylist(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(VIDEO_CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // --- STANDARD HANDLING ---

  // SPA Navigation: Serve index.html for all sub-routes if network fails
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/index.html') || caches.match('/');
      })
    );
    return;
  }

  // CDN & Static Assets: Stale-While-Revalidate
  if (isCDN(request.url) || isAsset(request.url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networked = fetch(request)
          .then((response) => {
            if (response.ok || response.type === 'opaque') {
              const cacheCopy = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
            }
            return response;
          })
          .catch(() => null);

        return cached || networked;
      })
    );
    return;
  }

  // API Requests: Network First, Fallback to Cache
  if (isAPI(request.url)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Default: Network First
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});