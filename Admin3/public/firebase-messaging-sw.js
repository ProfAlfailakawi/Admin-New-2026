importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBBVG0C-xjkuT3WeqiNAmJjw6lI8M6Gt6k",
  authDomain: "gen-lang-client-0200723670.firebaseapp.com",
  projectId: "gen-lang-client-0200723670",
  storageBucket: "gen-lang-client-0200723670.firebasestorage.app",
  messagingSenderId: "119610604304",
  appId: "1:119610604304:web:55eba98b72a9a7f98d4395"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const notificationTitle = payload.notification?.title || "Alturath Notification";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/logo.png"
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
