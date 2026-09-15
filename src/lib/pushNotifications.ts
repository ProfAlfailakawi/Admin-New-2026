import { initializeApp, getApps } from "firebase/app";
import { deleteToken, getMessaging, getToken, isSupported, onMessage, type Messaging } from "firebase/messaging";
import rawConfig from "../../firebase-applet-config.json";
import { auth } from "../firebase";

const firebaseConfig = {
  ...rawConfig,
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || rawConfig.apiKey || "AIzaSyBBVG0C-xjkuT3WeqiNAmJjw6lI8M6Gt6k"
};

export const FALLBACK_VAPID_KEY =
  "BGL4HY3Wt_Mlvf-aOyxUJA1TwffllGlkm19H5IVijVfxBzGUWWFrIkQVlIr5-FQ_xQd2JGxsdCuZpBcjABpv3Fw";

let foregroundPushListenerStarted = false;
const PUSH_DEVICE_ID_STORAGE_KEY = "alturath_admin_push_device_id_v1";

type PushRegistrationOptions = {
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  restaurantId?: string;
};

export function getStablePushDeviceId() {
  try {
    const existing = window.localStorage.getItem(PUSH_DEVICE_ID_STORAGE_KEY);
    if (existing) return existing;

    const generated =
      typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `push-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;

    window.localStorage.setItem(PUSH_DEVICE_ID_STORAGE_KEY, generated);
    return generated;
  } catch {
    return "";
  }
}

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

  const image =
    payload?.notification?.image ||
    payload?.data?.image ||
    payload?.data?.imageUrl ||
    "";

  const icon =
    payload?.notification?.icon ||
    payload?.data?.icon ||
    "/ios-icon-192-v6.png";

  const badge =
    payload?.notification?.badge ||
    payload?.data?.badge ||
    "/ios-icon-192-v6.png";

  return { title, body, url, eventId, alertType, notificationTag, image, icon, badge };
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

function shouldRenotifyPush(alertType: string) {
  const type = String(alertType || "").toLowerCase();
  return (
    type.includes("paid") ||
    type.includes("captured") ||
    type.includes("success") ||
    type.includes("failed") ||
    type.includes("pending_10min")
  );
}

function foregroundPushDedupeKey(notificationTag: string, alertType: string, eventId: string) {
  const type = String(alertType || "general").toLowerCase();
  const stage =
    type.includes("pending") && (type.includes("10min") || type.includes("30min")) ? "pending-followup" :
    type.includes("pending") ? "pending-initial" :
    type.includes("failed") ? "failed" :
    (type.includes("paid") || type.includes("captured") || type.includes("success")) ? "paid" :
    type;
  return `${notificationTag || eventId}:${stage}`;
}

function pushAckUrl() {
  try {
    return new URL("/api/push/ack", window.location.origin).toString();
  } catch {
    return "/api/push/ack";
  }
}

async function sendForegroundPushReceiptAck(data: { eventId?: string; notificationTag?: string; alertType?: string; url?: string }, status: "received" | "clicked") {
  const eventId = data?.eventId;
  if (!eventId || typeof window === "undefined") return;

  try {
    await Promise.race([
      fetch(pushAckUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: String(eventId),
          parentEventId: String(eventId),
          notificationTag: data.notificationTag || "",
          alertType: data.alertType || "general",
          status,
          url: data.url || "/",
          clientTimestamp: new Date().toISOString(),
          source: "foreground-push-listener",
        }),
        keepalive: true,
      }),
      new Promise((resolve) => setTimeout(resolve, 1200)),
    ]);
  } catch {
    // Receipt logging must never block notification delivery.
  }
}

function startForegroundPushListener(messaging: Messaging) {
  if (foregroundPushListenerStarted || typeof window === "undefined") return;
  foregroundPushListenerStarted = true;

  onMessage(messaging, (payload) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

    const { title, body, url, eventId, alertType, notificationTag, image, icon, badge } = readPayloadText(payload);
    // Different server workers may carry different eventIds for the same semantic
    // payment alert. Deduplicate by order notification tag + payment stage instead.
    const dedupeKey = `foreground_push_${foregroundPushDedupeKey(notificationTag, alertType, eventId)}`;
    const lastShown = Number(sessionStorage.getItem(dedupeKey) || "0");

    const isPaymentAlert = String(alertType || "").toLowerCase().includes("payment") || String(alertType || "").toLowerCase().includes("invoice");
    if (lastShown && Date.now() - lastShown < (isPaymentAlert ? 5000 : 60 * 1000)) return;

    const notificationOptions: any = {
      body,
      icon,
      badge,
      tag: notificationTag,
      renotify: shouldRenotifyPush(alertType),
      requireInteraction: true,
      data: { url, eventId, alertType, notificationTag, image },
    };

    if (image) {
      (notificationOptions as any).image = image;
    }

    const notification = new Notification(title, notificationOptions);
    // Record receipt only after the browser accepted the notification. A constructor
    // failure stays retryable and is never archived as a successful device delivery.
    sessionStorage.setItem(dedupeKey, String(Date.now()));
    void sendForegroundPushReceiptAck({ eventId, notificationTag, alertType, url }, "received");

    notification.onclick = () => {
      notification.close();
      void sendForegroundPushReceiptAck({ eventId, notificationTag, alertType, url }, "clicked");
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
  await new Promise((resolve) => setTimeout(resolve, 40));

  return registration;
}

async function saveTokenToServer(token: string, options?: PushRegistrationOptions) {
  const currentUser = auth?.currentUser;
  const payload = {
    token,
    deviceId: getStablePushDeviceId(),
    userId: options?.userId || currentUser?.uid || "admin",
    userEmail: options?.userEmail || currentUser?.email || "",
    userName:
      options?.userName ||
      currentUser?.displayName ||
      currentUser?.email ||
      "",
    userRole: options?.userRole || "",
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

  // A token already rejected by FCM must be replaced, not reactivated. The server
  // reports that state so the browser can renew its cached registration immediately.
  if (data?.renewRequired === true) {
    return data;
  }

  if (!response.ok || data?.success !== true) {
    throw new Error(data?.error || "فشل حفظ التوكن في الخادم");
  }

  // The server stores a token it cannot deliver to (unapproved recipient, denied
  // permission) and says so explicitly. Treat that as a failure here: reporting success
  // for a token that can never receive a push is what kept an earlier outage invisible.
  if (data?.deliverable === false) {
    throw new Error(data?.warning || "لا يمكن توصيل الإشعارات إلى هذا الحساب على هذا الجهاز");
  }

  return data;
}

async function getMessagingToken(
  messaging: Messaging,
  registration: ServiceWorkerRegistration,
  forceRenew = false,
) {
  if (forceRenew) {
    // Bind Firebase to this registration before deletion; otherwise it may use
    // its default worker scope instead of the application's root worker.
    const previousToken = await getToken(messaging, {
      vapidKey: FALLBACK_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    const deleted = await deleteToken(messaging);
    if (!deleted) throw new Error("تعذر حذف اشتراك الإشعارات القديم");
    const replacement = await getToken(messaging, {
      vapidKey: FALLBACK_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!replacement || replacement === previousToken) {
      throw new Error("لم يتم إنشاء اشتراك جديد للإشعارات؛ لم يكتمل الإصلاح");
    }
    return replacement;
  }

  try {
    return await getToken(messaging, {
      vapidKey: FALLBACK_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch (firstError) {
    console.warn("[Push] getToken failed, retrying:", firstError);
    await new Promise((resolve) => setTimeout(resolve, 120));
    return getToken(messaging, {
      vapidKey: FALLBACK_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
  }
}

/**
 * Does a live push subscription back this registration?
 *
 * A token is only deliverable while the worker that owns its subscription is still
 * registered. Unregistering that worker (an app-shell purge, a browser-side reset)
 * destroys the subscription, but Firebase keeps the token in IndexedDB and hands it
 * back. FCM then accepts every send to that orphaned token and the device displays
 * nothing — a total, silent outage with a successful-looking send.
 *
 * Returns true when it cannot tell, so an unreadable pushManager never forces a
 * renewal loop.
 */
async function pushSubscriptionIsLive(registration: ServiceWorkerRegistration): Promise<boolean> {
  try {
    if (!registration.pushManager?.getSubscription) return true;
    return Boolean(await registration.pushManager.getSubscription());
  } catch (error) {
    console.warn("[Push] Could not read the push subscription:", error);
    return true;
  }
}

/**
 * Replaces a token whose subscription is gone. Tolerant on purpose: the cached token is
 * already dead, so a failed delete must not stop a fresh one from being minted.
 */
async function mintTokenAfterLostSubscription(
  messaging: Messaging,
  registration: ServiceWorkerRegistration,
) {
  try {
    await deleteToken(messaging);
  } catch (error) {
    console.warn("[Push] Orphaned token could not be deleted; minting a replacement anyway:", error);
  }

  return getToken(messaging, {
    vapidKey: FALLBACK_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}

async function getAndSaveHealthyMessagingToken(
  messaging: Messaging,
  registration: ServiceWorkerRegistration,
  options?: PushRegistrationOptions,
  forceRenew = false,
) {
  let token = await getMessagingToken(messaging, registration, forceRenew);
  if (!token) throw new Error("لم يتم إنشاء توكن الإشعارات");

  // Self-heal a device whose subscription was destroyed while its token survived.
  // forceRenew already mints a fresh token, so it needs no second check.
  if (!forceRenew && !(await pushSubscriptionIsLive(registration))) {
    console.warn("[Push] Token has no live subscription; renewing this device's registration.");
    const replacement = await mintTokenAfterLostSubscription(messaging, registration);
    if (!replacement) throw new Error("تعذر إنشاء اشتراك إشعارات جديد لهذا الجهاز");
    token = replacement;
  }

  const firstSave = await saveTokenToServer(token, options);
  if (firstSave?.renewRequired !== true) return token;

  const retiredToken = token;
  token = await getMessagingToken(messaging, registration, true);
  if (!token || token === retiredToken) {
    throw new Error("تعذر استبدال توكن الإشعارات القديم بتوكن جديد");
  }

  const replacementSave = await saveTokenToServer(token, options);
  if (replacementSave?.renewRequired === true) {
    throw new Error("الخادم رفض توكن الإشعارات البديل");
  }
  return token;
}

function rememberHealthyPushToken(token: string, silent = false) {
  const now = new Date().toISOString();
  localStorage.setItem("push_notifications_enabled", "true");
  localStorage.setItem("last_push_token", token);
  localStorage.setItem("push_enabled_at", now);
  if (silent) localStorage.setItem("push_last_silent_refresh", now);
}

export async function registerPushNotifications(options?: PushRegistrationOptions): Promise<{
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

    const token = await getAndSaveHealthyMessagingToken(messaging, registration, options);
    rememberHealthyPushToken(token);

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

async function refreshAllowedPushRegistration(
  options?: PushRegistrationOptions,
  forceRenew = false,
): Promise<{ success: boolean; token?: string; skipped?: boolean; error?: string }> {
  try {
    const support = await getPushSupportStatus();

    if (!support.supported || support.permission !== "granted") {
      return { success: false, skipped: true, error: "الإشعارات غير مفعّلة من المتصفح" };
    }

    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    const messaging = getMessaging(app);
    startForegroundPushListener(messaging);
    const registration = await getFreshMessagingServiceWorkerRegistration();

    const token = await getAndSaveHealthyMessagingToken(
      messaging,
      registration,
      options,
      forceRenew,
    );
    rememberHealthyPushToken(token, true);

    return { success: true, token };
  } catch (error: any) {
    console.warn("[Push] Silent refresh failed:", error);
    return { success: false, error: error?.message || String(error) };
  }
}

export async function refreshPushRegistrationIfAlreadyAllowed(options?: PushRegistrationOptions) {
  return refreshAllowedPushRegistration(options, false);
}

export async function renewPushRegistrationIfAlreadyAllowed(options?: PushRegistrationOptions) {
  return refreshAllowedPushRegistration(options, true);
}
