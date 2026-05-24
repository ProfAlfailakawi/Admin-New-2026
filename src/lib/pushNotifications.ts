import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBBVG0C-xjkuT3WeqiNAmJjw6lI8M6Gt6k",
  authDomain: "gen-lang-client-0200723670.firebaseapp.com",
  projectId: "gen-lang-client-0200723670",
  storageBucket: "gen-lang-client-0200723670.firebasestorage.app",
  messagingSenderId: "119610604304",
  appId: "1:119610604304:web:55eba98b72a9a7f98d4395",
};

export const FALLBACK_VAPID_KEY =
  "BGL4HY3Wt_Mlvf-aOyxUJA1TwffllGlkm19H5IVijVfxBzGUWWFrIkQVlIr5-FQ_xQd2JGxsdCuZpBcjABpv3Fw";

let foregroundPushListenerStarted = false;

function readPayloadText(payload: any) {
  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "التراث";

  const body =
    payload?.notification?.body ||
    payload?.data?.body ||
    "تنبيه جديد";

  const url =
    payload?.fcmOptions?.link ||
    payload?.data?.url ||
    payload?.data?.click_action ||
    "/";

  const eventId =
    payload?.data?.eventId ||
    `${title}:${body}:${url}`;

  const alertType = payload?.data?.alertType || "general";
  const notificationTag =
    payload?.data?.notificationTag ||
    paymentNotificationTag(alertType, url, eventId);

  return { title, body, url, eventId, alertType, notificationTag };
}

function paymentNotificationTag(alertType: string, url: string, eventId: string) {
  const type = String(alertType || "").toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return eventId;

  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);
  const id = decodeURIComponent(invoiceMatch?.[1] || orderMatch?.[1] || "");

  return id ? `payment-final-state-${invoiceMatch ? "invoice" : "order"}-${id}` : eventId;
}

function startForegroundPushListener(messaging: Messaging) {
  if (foregroundPushListenerStarted || typeof window === "undefined") return;
  foregroundPushListenerStarted = true;

  onMessage(messaging, (payload) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const { title, body, url, eventId, alertType, notificationTag } = readPayloadText(payload);
    const dedupeKey = `foreground_push_${eventId}`;
    const lastShown = Number(sessionStorage.getItem(dedupeKey) || "0");

    if (lastShown && Date.now() - lastShown < 60 * 1000) return;
    sessionStorage.setItem(dedupeKey, String(Date.now()));

    const notification = new Notification(title, {
      body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: notificationTag,
      renotify: false,
      requireInteraction: true,
      data: { url, eventId, alertType, notificationTag },
    } as NotificationOptions);

    notification.onclick = () => {
      notification.close();
      window.focus();
      if (url && url !== "/") {
        window.location.href = url;
      }
    };
  });
}

export async function startForegroundPushListenerIfAllowed() {
  try {
    if (
      typeof Notification === "undefined" ||
      Notification.permission !== "granted" ||
      foregroundPushListenerStarted
    ) {
      return;
    }

    const supported = await isSupported().catch(() => false);
    if (!supported) return;

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    startForegroundPushListener(getMessaging(app));
  } catch (error) {
    console.warn("[Push] Foreground listener setup skipped:", error);
  }
}

if (typeof window !== "undefined") {
  startForegroundPushListenerIfAllowed();
}

export async function getPushSupportStatus() {
  const hasNotification = typeof Notification !== "undefined";
  const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;

  const supported =
    hasNotification &&
    hasServiceWorker &&
    (await isSupported().catch(() => false));

  return {
    supported,
    hasNotification,
    hasServiceWorker,
    permission: hasNotification ? Notification.permission : "unsupported",
    isStandalone:
      typeof window !== "undefined" &&
      (window.matchMedia?.("(display-mode: standalone)")?.matches ||
        (navigator as any).standalone === true),
  };
}

async function getFreshMessagingServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service Worker غير مدعوم في هذا المتصفح");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/",
  });

  try {
    await registration.update();
  } catch (error) {
    console.warn("[Push] Service Worker update failed:", error);
  }

  await navigator.serviceWorker.ready;
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return registration;
}

async function saveTokenToServer(token: string, options?: {
  userId?: string;
  restaurantId?: string;
}) {
  const payload = {
    token,
    userId: options?.userId || "admin",
    restaurantId: options?.restaurantId || "default",
    platform: /iPhone|iPad|iPod/i.test(navigator.userAgent) ? "iPhone" : "web",
    userAgent: navigator.userAgent || null,
    vendor: navigator.vendor || null,
    language: navigator.language || null,
    standalone:
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone === true ||
      false,
    notificationPermission: Notification.permission,
    serviceWorkerController: Boolean(navigator.serviceWorker?.controller),
    currentUrl: window.location.href,
    screen: {
      width: window.screen?.width || null,
      height: window.screen?.height || null,
      availWidth: window.screen?.availWidth || null,
      availHeight: window.screen?.availHeight || null,
    },
    savedAtClient: new Date().toISOString(),
  };

  const response = await fetch("/api/push/save-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success !== true) {
    throw new Error(data?.error || "فشل حفظ التوكن في الخادم");
  }

  return data;
}

export async function registerPushNotifications(options?: {
  userId?: string;
  restaurantId?: string;
}): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const support = await getPushSupportStatus();

    if (!support.supported) {
      return {
        success: false,
        error: "الإشعارات غير مدعومة على هذا الجهاز أو المتصفح",
      };
    }

    const permission = await Notification.requestPermission();

    if (permission !== "granted") {
      return {
        success: false,
        error: "لم يتم السماح بالإشعارات",
      };
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    startForegroundPushListener(messaging);
    const registration = await getFreshMessagingServiceWorkerRegistration();

    let token = "";

    try {
      token = await getToken(messaging, {
        vapidKey: FALLBACK_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
    } catch (firstError) {
      console.warn("[Push] First getToken failed, retrying:", firstError);

      await new Promise((resolve) => setTimeout(resolve, 2500));

      token = await getToken(messaging, {
        vapidKey: FALLBACK_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
    }

    if (!token) {
      return {
        success: false,
        error: "لم يتم إنشاء توكن الإشعارات",
      };
    }

    await saveTokenToServer(token, options);

    localStorage.setItem("push_notifications_enabled", "true");
    localStorage.setItem("last_push_token", token);
    localStorage.setItem("push_enabled_at", new Date().toISOString());

    return {
      success: true,
      token,
    };
  } catch (error: any) {
    console.error("[Push] registerPushNotifications failed:", error);

    return {
      success: false,
      error: error?.message || String(error),
    };
  }
}

export async function refreshPushRegistrationIfAlreadyAllowed(options?: {
  userId?: string;
  restaurantId?: string;
}): Promise<{ success: boolean; token?: string; skipped?: boolean; error?: string }> {
  try {
    const support = await getPushSupportStatus();

    if (!support.supported || support.permission !== "granted") {
      return { success: false, skipped: true, error: "الإشعارات غير مفعّلة من المتصفح" };
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    startForegroundPushListener(messaging);
    const registration = await getFreshMessagingServiceWorkerRegistration();

    let token = "";
    try {
      token = await getToken(messaging, {
        vapidKey: FALLBACK_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
    } catch (firstError) {
      console.warn("[Push] Silent token refresh failed, retrying:", firstError);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      token = await getToken(messaging, {
        vapidKey: FALLBACK_VAPID_KEY,
        serviceWorkerRegistration: registration,
      });
    }

    if (!token) {
      return { success: false, error: "لم يتم إنشاء توكن الإشعارات" };
    }

    await saveTokenToServer(token, options);

    localStorage.setItem("push_notifications_enabled", "true");
    localStorage.setItem("last_push_token", token);
    localStorage.setItem("push_enabled_at", new Date().toISOString());
    localStorage.setItem("push_last_silent_refresh", new Date().toISOString());

    return { success: true, token };
  } catch (error: any) {
    console.warn("[Push] Silent refresh failed:", error);
    return { success: false, error: error?.message || String(error) };
  }
}
