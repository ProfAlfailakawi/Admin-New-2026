// SW VERSION 2026-05-08-FINAL-2

self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

try {
  importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

  firebase.initializeApp({
    apiKey: "AIzaSyC2KS6pgkYXqzArMaBcssRpKhEZWe6WN-M",
    authDomain: "gen-lang-client-0878573239.firebaseapp.com",
    projectId: "gen-lang-client-0878573239",
    storageBucket: "gen-lang-client-0878573239.firebasestorage.app",
    messagingSenderId: "951671626657",
    appId: "1:951671626657:web:ffc58d642d0dab1959c9e0"
  });

  var messaging = firebase.messaging();

  messaging.onBackgroundMessage(function (payload) {
    var notification = payload && payload.notification ? payload.notification : {};
    var data = payload && payload.data ? payload.data : {};

    var title = notification.title || data.title || "تنبيه جديد";
    var body = notification.body || data.body || "لديك تحديث جديد";
    var url = data.url || "/";
    var orderId = data.orderId || "";
    var type = data.type || "general";

    self.registration.showNotification(title, {
      body: body,
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: {
        url: url,
        orderId: orderId,
        type: type
      },
      requireInteraction: type === "new_order",
      vibrate: [200, 100, 200]
    });
  });
} catch (error) {
  console.error("[firebase-messaging-sw.js] Initialization failed:", error);
}

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  var notificationData = event.notification && event.notification.data ? event.notification.data : {};
  var urlToOpen = notificationData.url || "/";

  event.waitUntil(
    self.clients.matchAll({
      type: "window",
      includeUncontrolled: true
    }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];

        if ("focus" in client) {
          if ("navigate" in client) {
            return client.navigate(urlToOpen).then(function (navigatedClient) {
              return navigatedClient.focus();
            });
          }

          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
