import { getToken, onMessage, getMessaging, isSupported, Messaging } from "firebase/messaging";
import { app } from "../firebase";

type RegisterPushParams = {
  userId: string;
  restaurantId: string;
};

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalonePWA() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function getPushSupportStatus() {
  return {
    notification: "Notification" in window,
    serviceWorker: "serviceWorker" in navigator,
    pushManager: "PushManager" in window,
    standalone: isStandalonePWA(),
    ios: isIOS(),
    permission: "Notification" in window ? Notification.permission : "unsupported",
    userAgent: navigator.userAgent,
  };
}

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

  const status = getPushSupportStatus();
  console.log("Push Support Status:", status);

  if (status.ios && !status.standalone) {
    throw new Error(
      "على الآيفون، أضف التطبيق إلى الشاشة الرئيسية ثم افتحه من الأيقونة لتفعيل الإشعارات."
    );
  }

  if (!status.notification || !status.serviceWorker || !status.pushManager) {
    throw new Error("هذا المتصفح لا يدعم إشعارات الويب على هذا الجهاز.");
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
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    if (!vapidKey || vapidKey.includes("YOUR_")) {
      throw new Error("VAPID Key غير مضبوط. أضف VITE_FIREBASE_VAPID_KEY في Environment Secrets ثم أعد النشر.");
    }

    token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
  } catch (err: any) {
    console.error("Get Token Error:", err);
    throw new Error(err.message || "فشل إنشاء Token الإشعارات. يرجى التأكد من الـ VAPID Key وان الموقع آمن.");
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
