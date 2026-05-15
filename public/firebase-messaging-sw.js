/* Minimal Service Worker - Alturath Admin */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

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
    payload.data?.url ||
    payload.url ||
    "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("navigate" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
