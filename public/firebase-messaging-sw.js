importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBBVG0C-xjkuT3WeqiNAmJjw6lI8M6Gt6k",
  authDomain: "gen-lang-client-0200723670.firebaseapp.com",
  projectId: "gen-lang-client-0200723670",
  storageBucket: "gen-lang-client-0200723670.firebasestorage.app",
  messagingSenderId: "119610604304",
  appId: "1:119610604304:web:55eba98b72a9a7f98d4395"
});

const messaging = firebase.messaging();

function normalizeUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl || "/", self.location.origin);

    if (parsed.origin !== self.location.origin) {
      return "/";
    }

    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/";
  }
}

messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};

  const title =
    data.title ||
    payload.notification?.title ||
    "تنبيه";

  const body =
    data.body ||
    payload.notification?.body ||
    "";

  const url = normalizeUrl(
    data.url ||
    data.click_action ||
    "/"
  );

  self.registration.showNotification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url,
      eventId: data.eventId || "",
      alertType: data.alertType || ""
    },
    tag: data.eventId || url || title,
    renotify: false
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification?.data?.url || "/";

  event.waitUntil(
    clients.openWindow(url)
  );
});
