importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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
  console.log('[firebase-messaging-sw.js] background payload:', payload);

  const data = payload.data || {};
  const notification = payload.notification || {};

  const title = data.title || notification.title || 'تنبيه جديد';
  const body = data.body || notification.body || 'يوجد تحديث جديد';
  const url = data.url || payload?.fcmOptions?.link || '/';

  self.registration.showNotification(title, {
    body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    requireInteraction: true,
    tag: data.eventId || data.alertType || title,
    renotify: false,
    data: { url, ...data }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(urlToOpen);
          return;
        }
      }

      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});
