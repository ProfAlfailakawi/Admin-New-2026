// SW VERSION 2026-05-08-FINAL-4

self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

// Intercept push events immediately for fast processing on iOS (bypasses Firebase compat delay)
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const payload = event.data.json();
    console.log("[SW] Raw Push Payload:", payload);

    let title = "تنبيه جديد";
    let body = "إشعار جديد من النظام";
    let icon = "https://admin.alturathkw.shop/icons/icon-192.png";
    let badge = "https://admin.alturathkw.shop/icons/icon-192.png";
    let url = "/";
    let orderId = "";
    let type = "general";

    // Extract Firebase payload structure
    if (payload.notification) {
      title = payload.notification.title || title;
      body = payload.notification.body || body;
      icon = payload.notification.icon || icon;
    }
    
    // Notification could also be nested in data for data-only messages
    if (payload.data) {
      title = payload.data.title || title;
      body = payload.data.body || body;
      url = payload.data.url || url;
      orderId = payload.data.orderId || orderId;
      type = payload.data.type || type;
    }

    if (payload.fcmOptions && payload.fcmOptions.link) {
      url = payload.fcmOptions.link;
    }

    const options = {
      body: body,
      icon: icon,
      badge: badge,
      data: {
        url: url,
        orderId: orderId,
        type: type
      },
      requireInteraction: true // Safe extra for Web Push
    };

    const showPromise = self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      let isFocused = false;
      for (var i = 0; i < clientList.length; i++) {
        clientList[i].postMessage({ type: 'PUSH_RECEIVED', payload: payload });
        if (clientList[i].focused) {
          isFocused = true;
        }
      }
      
      // Always show system notification to guarantee delivery on iOS PWA
      return self.registration.showNotification(title, options);
    });

    event.waitUntil(showPromise);
    event.stopImmediatePropagation(); // Prevent Firebase compat from handling it
  } catch (e) {
    console.error("[SW] Custom Push Error:", e);
  }
});

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

// End of Service Worker
