/* Alturath Admin — offline app-shell service worker.
   Separate from firebase-messaging-sw.js (which owns FCM push delivery).
   Strategy:
     - Precache the app shell so the console opens offline.
     - Navigations: network-first with an offline fallback to the cached shell.
     - Static same-origin GETs: stale-while-revalidate.
     - Never touch /api (dynamic data), non-GET, or cross-origin requests. */

/* بصمة البناء تُطبع هنا عند البناء (scripts/build-stamp.mjs). بايتات هذا الملف يجب
   أن تتغيّر مع كل إصدار، وإلا لم يرَ المتصفح تحديثاً أصلاً ولم تعلم التبويبات المفتوحة
   بشيء. */
const BUILD = "__BUILD_ID__";
const CACHE_VERSION = "alturath-shell-" + BUILD;
/* الأصول المبصومة بهاش في اسمها هي وحدها التي تُقدَّم من الكاش مباشرة: اسمها يتغيّر مع
   بايتاتها، فالنسخة القديمة مستحيلة بالبناء. ما عداها شبكةٌ أولاً وكاشٌ احتياط. */
const HASHED = /\/assets\/.+[-.][A-Za-z0-9_]{8,}\.[a-z0-9]+$/i;
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logo.png",
  "/ios-icon-192-v6.png",
  "/ios-icon-512-v6.png",
  "/apple-touch-icon-v6.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      // Add shell entries individually so one missing asset never aborts install.
      await Promise.all(
        APP_SHELL.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("alturath-shell-") && key !== CACHE_VERSION)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Only handle same-origin GETs. Let everything else hit the network untouched.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }

  if (url.origin !== self.location.origin) return;
  // Never intercept dynamic API traffic.
  if (url.pathname.startsWith("/api")) return;

  /* Navigations (HTML) always come from the network with cache: "no-store": a stored
     shell names hashed assets the next deploy removed. The cache is an offline
     fallback only. */
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(url.pathname + url.search, { cache: "no-store", credentials: "same-origin" });
          const cache = await caches.open(CACHE_VERSION);
          cache.put("/", fresh.clone()).catch(() => {});
          return fresh;
        } catch (e) {
          const cache = await caches.open(CACHE_VERSION);
          return (
            (await cache.match(request)) ||
            (await cache.match("/")) ||
            (await cache.match("/index.html")) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  // Hash-named build assets: straight from the cache, they can never be stale.
  if (HASHED.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        if (cached) return cached;
        const fresh = await fetch(request).catch(() => null);
        if (fresh && fresh.ok && fresh.type === "basic") cache.put(request, fresh.clone()).catch(() => {});
        return fresh || Response.error();
      })()
    );
    return;
  }

  // Everything else same-origin: network first, cache only as an offline fallback.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === "basic") {
            cache.put(request, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => null);
      return (await network) || (await cache.match(request)) || Response.error();
    })()
  );
});
