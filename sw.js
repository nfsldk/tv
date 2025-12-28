
const CACHE_NAME = 'cinestream-v23';
const OFFLINE_URL = '/index.html';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

// 需要长期缓存的静态域
const LONG_TERM_DOMAINS = [
  'aistudiocdn.com',
  'cdn.tailwindcss.com',
  'images.weserv.nl',
  'doubanio.com'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Static assets pre-cached');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[PWA] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 排除不需要缓存的动态请求
const isIgnored = (url) => {
  return (
    url.includes('.ts') || 
    url.includes('googleads') ||
    url.includes('doubleclick') ||
    url.includes('/match') ||
    url.includes('laibo123.dpdns.org/5573108/api/v2/comment')
  );
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET' || isIgnored(url.href)) return;

  // 1. 导航请求：优先网络，失败后返回离线页
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 2. 核心静态资源/CDN：缓存优先
  const isCdn = LONG_TERM_DOMAINS.some(domain => url.hostname.includes(domain));
  const isAsset = url.pathname.match(/\.(js|css|svg|ico|png|jpg|jpeg|webp)$/);

  if (isCdn || isAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.status === 200 && response.type === 'basic' || response.type === 'cors') {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        }).catch(() => cached);

        return cached || networkFetch;
      })
    );
    return;
  }

  // 3. 其他 API 请求：网络优先
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
