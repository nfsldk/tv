const CACHE_NAME = 'cinestream-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg'
];

// Install Event: Cache core static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: Determine request type
const isVideo = (url) => url.endsWith('.ts') || url.includes('.m3u8') || url.includes('video');
const isCDN = (url) => url.includes('aistudiocdn.com') || url.includes('cdn.tailwindcss.com');
const isAPI = (url) => url.includes('api.php') || url.includes('douban.com') || url.includes('daili.laidd.de5.net');

// Fetch Event
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // 1. IGNORE Video Streams (Network Only)
  // We don't want to cache gigabytes of video segments
  if (isVideo(url)) {
    return; 
  }

  // 2. Navigation Requests (HTML) -> Network First, Fallback to Cache (App Shell)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // 3. CDN & Static Assets -> Stale-While-Revalidate
  // Serve from cache immediately, then update cache in background
  if (isCDN(url) || url.match(/\.(js|css|png|jpg|jpeg|svg|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic' || networkResponse.type === 'cors' || networkResponse.type === 'opaque') {
             const responseClone = networkResponse.clone();
             caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(e => console.log('CDN fetch failed', e));

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // 4. API Requests -> Network First, Fallback to Cache
  // Try to get fresh data, if offline, show whatever we have
  if (isAPI(url)) {
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        }
        return response;
      }).catch(() => {
        return caches.match(event.request);
      })
    );
    return;
  }

  // 5. Default -> Network First
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});