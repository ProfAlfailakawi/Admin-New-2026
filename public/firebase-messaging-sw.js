importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyB5kYVcJYxQ1sZxv_N5r54rDHsODKVep14",
  authDomain: "gen-lang-client-0878573239.firebaseapp.com",
  projectId: "gen-lang-client-0878573239",
  storageBucket: "gen-lang-client-0878573239.firebasestorage.app",
  messagingSenderId: "938552047102",
  appId: "1:938552047102:web:b4e388d47c492b83e9c8db"
});

const messaging = firebase.messaging();

function showPush(payload) {
  console.log('[firebase-messaging-sw.js] payload:', payload);
  const data = payload.data || {};
  const notification = payload.notification || {};
  const title = data.title || notification.title || 'تنبيه جديد';
  const body = data.body || notification.body || 'يوجد تحديث جديد';
  const url = data.url || payload?.fcmOptions?.link || '/';

  return self.registration.showNotification(title, {
    body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: { url, ...data }
  });
}

messaging.onBackgroundMessage((payload) => showPush(payload));

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { data: { title: 'تنبيه جديد', body: event.data.text(), url: '/' } };
  }
  event.waitUntil(showPush(payload));
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
