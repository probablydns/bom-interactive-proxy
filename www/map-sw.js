/* Browser-side cache for BOM map frame tiles.
 * Keeps WMTS/overlay/basemap image frames for 60 seconds to reduce repeated
 * network fetches during timeline animation loops.
 */

const TILE_CACHE_NAME = 'bom-map-tiles-v1';
const DEFAULT_TTL_SECONDS = 60;

function parseMaxAgeSeconds(cacheControlValue) {
  const text = String(cacheControlValue || '');
  const match = text.match(/max-age=(\d+)/i);
  if (!match) {
    return DEFAULT_TTL_SECONDS;
  }
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TTL_SECONDS;
}

function isFresh(cachedResponse) {
  if (!cachedResponse) {
    return false;
  }

  const cacheControl = cachedResponse.headers.get('cache-control');
  const maxAgeSeconds = parseMaxAgeSeconds(cacheControl);
  const dateHeader = cachedResponse.headers.get('date');
  const cachedAtMs = dateHeader ? Date.parse(dateHeader) : NaN;
  if (!Number.isFinite(cachedAtMs)) {
    return false;
  }

  const ageMs = Date.now() - cachedAtMs;
  return ageMs >= 0 && ageMs <= maxAgeSeconds * 1000;
}

function isCacheableTileRequest(request) {
  if (!request || request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return false;
  }

  // Match proxied mapping tile image paths:
  // - /apikey/v1/mapping/timeseries/wmts/...
  // - /timeseries/wmts/...
  // - /apikey/v1/mapping/overlays/... (image tiles)
  // - /overlays/... (image tiles)
  // - /apikey/v1/mapping/basemaps/... (image tiles)
  // - /basemaps/... (image tiles)
  if (!/\.(?:png|jpg|jpeg|webp)$/i.test(url.pathname)) {
    return false;
  }

  return /^\/(?:apikey\/v1\/mapping\/)?(?:timeseries|overlays|basemaps)\//i.test(url.pathname);
}

async function handleTileRequest(request) {
  const cache = await caches.open(TILE_CACHE_NAME);
  const cached = await cache.match(request);

  if (cached && isFresh(cached)) {
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }

    if (cached) {
      return cached;
    }

    return networkResponse;
  } catch (error) {
    if (cached) {
      return cached;
    }
    throw error;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('bom-map-tiles-') && name !== TILE_CACHE_NAME)
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const payload = event && event.data ? event.data : {};
  if (payload && payload.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (!isCacheableTileRequest(event.request)) {
    return;
  }

  event.respondWith(handleTileRequest(event.request));
});
