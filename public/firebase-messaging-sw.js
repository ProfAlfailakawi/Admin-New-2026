/* Alturath Admin Service Worker - Push delivery guard for PWA/iOS */

const PUSH_DEDUPE_CACHE = "alturath-push-dedupe-v1";
const PUSH_DEDUPE_TTL_MS = 48 * 60 * 60 * 1000;
const PUSH_IN_FLIGHT_KEYS = new Set();

/* "We are updating" page instead of Google's English error page.
   While Cloud Run swaps servers during a deploy, Google's front end can answer with a
   500/502/503/504 HTML page our server never wrote. This worker stores /updating.html
   at install and serves it (503, no-store) for a GET navigation that gets one of those
   statuses, or that drops while the device says it is online. The page polls
   /api/health and reopens the same URL when the server is back.
   It never answers /api, non-GET or non-navigation requests, never changes a
   successful response, and never stores a 5xx. Nothing here touches push. */
const UPDATING_CACHE = "alturath-updating";
const UPDATING_PAGE = "/updating.html";

function isUpdatingStatus(status) {
  return status === 500 || status === 502 || status === 503 || status === 504;
}

async function storeUpdatingPage() {
  try {
    const response = await fetch(UPDATING_PAGE, { cache: "no-store" });
    if (!response.ok || !String(response.headers.get("content-type") || "").includes("text/html")) return;
    const cache = await caches.open(UPDATING_CACHE);
    await cache.put(UPDATING_PAGE, response);
  } catch (e) {
    // Stored again after the next successful navigation.
  }
}

// A cache purge (app-update.ts) may have removed it: refill without waiting.
async function refillUpdatingPage() {
  try {
    const cache = await caches.open(UPDATING_CACHE);
    if (!(await cache.match(UPDATING_PAGE))) await storeUpdatingPage();
  } catch (e) {}
}

async function updatingResponse() {
  try {
    const cache = await caches.open(UPDATING_CACHE);
    const page = await cache.match(UPDATING_PAGE);
    if (!page) return null;
    return new Response(await page.text(), {
      status: 503,
      statusText: "Service Unavailable",
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "5", "X-Alturath-Updating": "1" },
    });
  } catch (e) {
    return null;
  }
}

async function navigateOrUpdating(request) {
  let response;
  try {
    response = await fetch(request);
  } catch (error) {
    if (self.navigator?.onLine !== false) {
      const page = await updatingResponse();
      if (page) return page;
    }
    throw error;
  }
  if (isUpdatingStatus(response.status)) return (await updatingResponse()) || response;
  if (response.ok) void refillUpdatingPage();
  return response;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(storeUpdatingPage());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.mode !== "navigate" || request.method !== "GET") return;
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin || url.pathname.startsWith("/api/") || url.pathname === "/run-alerts") return;
  } catch (e) {
    return;
  }
  event.respondWith(navigateOrUpdating(request));
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

  } catch (e) {
    // Never block notification delivery because of cache cleanup/dedupe errors.
  }

  return false;
}

async function rememberPushWasShown(eventId) {
  if (!eventId || !self.caches) return;
  try {
    const cache = await caches.open(PUSH_DEDUPE_CACHE);
    await cache.put(
      `/__push_dedupe__/${encodeURIComponent(eventId)}`,
      new Response("1", {
        headers: {
          "cache-control": "no-store",
          "x-saved-at": String(Date.now()),
        },
      })
    );
  } catch (e) {
    // A cache failure must never turn a successful display into a failed push.
  }
}

function pushDedupeKey(notificationTag, alertType, eventId) {
  const type = String(alertType || "general").toLowerCase();
  const stage =
    type.includes("pending") && (type.includes("10min") || type.includes("30min")) ? "pending-followup" :
    type.includes("pending") ? "pending-initial" :
    type.includes("failed") ? "failed" :
    (type.includes("paid") || type.includes("captured") || type.includes("success")) ? "paid" :
    type;
  return `${notificationTag || eventId}:${stage}`;
}


function pushAckUrl() {
  try {
    return new URL("/api/push/ack", self.location.origin).toString();
  } catch (e) {
    return "/api/push/ack";
  }
}

async function sendPushReceiptAck(data, status) {
  const eventId = data?.eventId || data?.parentEventId;
  if (!eventId) return;

  const payload = {
    eventId: String(eventId),
    parentEventId: data?.parentEventId || String(eventId),
    notificationTag: data?.notificationTag || "",
    alertType: data?.alertType || "general",
    status,
    url: data?.url || "/",
    clientTimestamp: new Date().toISOString(),
    source: "firebase-messaging-sw",
  };

  try {
    await Promise.race([
      fetch(pushAckUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      }),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch (e) {
    // Delivery must never fail because receipt logging failed.
  }
}

function paymentNotificationTag(alertType, url, eventId) {
  const type = String(alertType || "").toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return eventId;

  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);
  const id = decodeURIComponent((invoiceMatch && invoiceMatch[1]) || (orderMatch && orderMatch[1]) || "");

  return id ? `payment-final-state-${invoiceMatch ? "invoice" : "order"}-${id}` : eventId;
}

function shouldRenotifyPush(alertType) {
  const type = String(alertType || "").toLowerCase();
  return (
    type.includes("paid") ||
    type.includes("captured") ||
    type.includes("success") ||
    type.includes("failed") ||
    type.includes("pending_10min")
  );
}


function normalizeAssetUrl(url, fallback = "") {
  const value = String(url || "").trim();
  if (!value) return fallback;
  if (value.startsWith("http")) return value;
  return value.startsWith("/") ? value : `/${value}`;
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

  const notificationTag =
    payload.data?.notificationTag ||
    payload.notification?.data?.notificationTag ||
    payload.notificationTag ||
    paymentNotificationTag(alertType, url, eventId);
  const dedupeKey = pushDedupeKey(notificationTag, alertType, eventId);

  const image = normalizeAssetUrl(
    payload.notification?.image ||
    payload.data?.image ||
    payload.data?.imageUrl ||
    payload.image ||
    ""
  );
  const icon = normalizeAssetUrl(payload.notification?.icon || payload.data?.icon || "/ios-icon-192-v6.png", "/ios-icon-192-v6.png");
  const badge = normalizeAssetUrl(payload.notification?.badge || payload.data?.badge || "/ios-icon-192-v6.png", "/ios-icon-192-v6.png");

  // Set the in-memory lock synchronously before the async cache lookup. Multiple FCM
  // registrations can deliver the same unpaid alert to one iPhone at the same instant;
  // without this lock both push handlers used to observe an empty cache and both drew.
  if (PUSH_IN_FLIGHT_KEYS.has(dedupeKey)) {
    event.waitUntil(Promise.resolve());
    return;
  }
  PUSH_IN_FLIGHT_KEYS.add(dedupeKey);

  event.waitUntil((async () => {
    try {
      const alreadyShown = await wasPushAlreadyShown(dedupeKey);
      if (alreadyShown) return;

      // showNotification replaces the matching tag itself. Listing/closing existing
      // notifications first can reject and prevent delivery on some browsers.
      const notificationData = { url, eventId, parentEventId: eventId, alertType, notificationTag };

      const notificationOptions = {
        body,
        icon,
        badge,
        tag: notificationTag,
        renotify: shouldRenotifyPush(alertType),
        requireInteraction: true,
        data: { ...notificationData, image },
      };

      if (image) notificationOptions.image = image;

      await self.registration.showNotification(title, notificationOptions);

      // Mark only after the operating system accepted the display. If display fails,
      // a later FCM retry must remain eligible instead of being suppressed for 48h.
      await rememberPushWasShown(dedupeKey);
      await sendPushReceiptAck(notificationData, "received");
    } finally {
      PUSH_IN_FLIGHT_KEYS.delete(dedupeKey);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const notificationData = event.notification?.data || {};
  const url = notificationData.url || "/";

  event.waitUntil(
    Promise.all([
      sendPushReceiptAck(notificationData, "clicked"),
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
    ])
  );
});
