// SW VERSION 2026-05-08-TEST-1

self.addEventListener("install", function () {
  console.log("[SW] install ok");
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  console.log("[SW] activate ok");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
