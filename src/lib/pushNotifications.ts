import { getToken, onMessage, getMessaging, isSupported, Messaging } from "firebase/messaging";
import { app } from "../firebase";

type RegisterPushParams = {
  userId: string;
  restaurantId: string;
};

// To obtain a VAPID key: you must go to Firebase Console > Project Settings > Cloud Messaging > Web configuration -> Generate key pair
// If you do not have one yet, use this placeholder or add a real one
// Please configure this VAPID key using your Firebase Console
const VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || "YOUR_PUBLIC_VAPID_KEY_FROM_FIREBASE"; // User should change this as needed if using another VAPID key. Wait, user config doesn't have it.

export async function getFirebaseMessaging(): Promise<Messaging | null> {
  const supported = await isSupported();
  if (!supported) {
    console.warn("Firebase Messaging is not supported in this browser.");
    return null;
  }
  return getMessaging(app);
}

export async function registerPushNotifications({
  userId,
  restaurantId,
}: RegisterPushParams) {
  if (typeof window === "undefined") return null;

  if (!("serviceWorker" in navigator)) {
    throw new Error("هذا المتصفح لا يدعم Service Worker.");
  }

  if (!("Notification" in window)) {
    throw new Error("هذا المتصفح لا يدعم الإشعارات.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("لم يتم منح إذن الإشعارات.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const messaging = await getFirebaseMessaging();

  if (!messaging) {
    throw new Error("Firebase Messaging غير مدعوم في هذا المتصفح.");
  }

  let token;
  try {
    token = await getToken(messaging, {
      vapidKey: VAPID_KEY, // Note: Without a valid VAPID Key, getToken will fail with 'SenderId mismtach' or similar if they use a custom push service. But let's leave it as they requested. 
                           // Actually, let's leave it undefined if they don't have it yet, wait, VAPID key is required for FCM Web Push.
      serviceWorkerRegistration: registration,
    });
  } catch (err: any) {
    console.error("Get Token Error:", err);
    throw new Error("فشل إنشاء Token الإشعارات. يرجى التأكد من الـ VAPID Key وان الموقع آمن.");
  }

  if (!token) {
    throw new Error("لم يتم إنشاء FCM Token.");
  }

  // Save the token via API
  const response = await fetch("/api/push/save-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      userId,
      restaurantId,
      platform: "web-pwa",
      userAgent: navigator.userAgent,
    }),
  });

  if (!response.ok) {
     throw new Error("فشل حفظ التوكن في الخادم");
  }

  return token;
}

export async function listenToForegroundMessages(
  callback: (payload: any) => void
) {
  const messaging = await getFirebaseMessaging();

  if (!messaging) return;

  onMessage(messaging, (payload) => {
    callback(payload);

    const title = payload.notification?.title || payload.data?.title || "تنبيه جديد";
    const body = payload.notification?.body || payload.data?.body || "لديك تحديث جديد";

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: payload.data?.icon || "/vite.svg",
        badge: payload.data?.badge || "/vite.svg",
        data: {
          url: payload.data?.url || "/",
        },
      });
    }
  });
}
