/* Alturath Admin Service Worker - Push delivery guard for PWA/iOS */

const PUSH_DEDUPE_CACHE = "alturath-push-dedupe-v1";
const PUSH_DEDUPE_TTL_MS = 48 * 60 * 60 * 1000;
const PUSH_DEDUPE_TIMEOUT_MS = 80;

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function wasPushAlreadyShown(eventId) {
  if (!eventId || !self.caches) return false;

  try {
    const cache = await caches.open(PUSH_DEDUPE_CACHE);
    const key = `/__push_dedupe__/${encodeURIComponent(eventId)}`;
    const existing = await cache.match(key);

    if (existing) {
      const savedAt = Number(existing.headers.get("x-saved-at") || "0");
      if (savedAt && Date.now() - savedAt < PUSH_DEDUPE_TTL_MS) {
        return true;
      }
    }

    await cache.put(
      key,
      new Response("1", {
        headers: {
          "cache-control": "no-store",
          "x-saved-at": String(Date.now()),
        },
      })
    );
  } catch (e) {
    // Never block notification delivery because of cache cleanup/dedupe errors.
  }

  return false;
}

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {
      title: "التراث",
      body: event.data ? event.data.text() : "تنبيه جديد",
    };
  }

  const title =
    payload.notification?.title ||
    payload.title ||
    payload.data?.title ||
    "التراث";

  const body =
    payload.notification?.body ||
    payload.body ||
    payload.data?.body ||
    "تنبيه جديد";

  const url =
    payload.fcmOptions?.link ||
    payload.notification?.fcmOptions?.link ||
    payload.data?.url ||
    payload.notification?.data?.url ||
    payload.data?.click_action ||
    payload.url ||
    "/";

  const eventId =
    payload.data?.eventId ||
    payload.notification?.data?.eventId ||
    payload.eventId ||
    `${title}:${body}:${url}`;

  const alertType =
    payload.data?.alertType ||
    payload.notification?.data?.alertType ||
    payload.alertType ||
    "general";

  event.waitUntil((async () => {
    const alreadyShown = await Promise.race([
      wasPushAlreadyShown(eventId),
      new Promise((resolve) => setTimeout(() => resolve(false), PUSH_DEDUPE_TIMEOUT_MS)),
    ]);

    if (alreadyShown) return;

    await self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: eventId,
      renotify: false,
      requireInteraction: true,
      data: { url, eventId, alertType },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url && client.url.includes(self.location.origin)) {
          if ("navigate" in client) {
            return client.navigate(url).then(() => client.focus());
          }
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
