importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyC2KS6pgkYXqzArMaBcssRpKhEZWe6WN-M",
  authDomain: "gen-lang-client-0878573239.firebaseapp.com",
  projectId: "gen-lang-client-0878573239",
  storageBucket: "gen-lang-client-0878573239.firebasestorage.app",
  messagingSenderId: "951671626657",
  appId: "1:951671626657:web:ffc58d642d0dab1959c9e0"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const title = payload.notification?.title || payload.data?.title || "تنبيه جديد";
  const body = payload.notification?.body || payload.data?.body || "لديك تحديث جديد";
  const url = payload.data?.url || "/";
  const orderId = payload.data?.orderId || "";

  self.registration.showNotification(title, {
    body,
    icon: payload.data?.icon || "/vite.svg", // standard icon or adjust if they have another
    badge: payload.data?.badge || "/vite.svg",
    data: {
      url,
      orderId,
      type: payload.data?.type || "general",
    },
    requireInteraction: payload.data?.type === "new_order",
    vibrate: [200, 100, 200],
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
