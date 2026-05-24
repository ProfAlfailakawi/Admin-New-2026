import express from "express";
import path from "path";
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fsSync from 'fs';
import os from 'os';
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";

let firebaseInitialized = false;
let db: any = null;
const PAYMENT_PENDING_GRACE_SECONDS = Math.max(
  30,
  Math.min(600, Number(process.env.PAYMENT_PENDING_GRACE_SECONDS || 120))
);
const PAYMENT_PENDING_GRACE_MS = PAYMENT_PENDING_GRACE_SECONDS * 1000;
const PAYMENT_PENDING_GRACE_LABEL =
  PAYMENT_PENDING_GRACE_SECONDS % 60 === 0
    ? `${PAYMENT_PENDING_GRACE_SECONDS / 60} دقيقة`
    : `${PAYMENT_PENDING_GRACE_SECONDS} ثانية`;
const PAYMENT_FAILURE_GRACE_SECONDS = Math.max(
  30,
  Math.min(600, Number(process.env.PAYMENT_FAILURE_GRACE_SECONDS || 120))
);
const PAYMENT_FAILURE_GRACE_MS = PAYMENT_FAILURE_GRACE_SECONDS * 1000;

try {

  let cfg: any = {};
  try {
    cfg = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
  } catch(e) {}

  const projectId = cfg.projectId || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0200723670";

  const appInstance = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        projectId: projectId,
      });


  
  let dbId;
  try {
    const cfg = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
    dbId = cfg.firestoreDatabaseId;
  } catch(e) {}
  db = getFirestore(appInstance, dbId || "(default)");

  // Verify database connectivity early to avoid log spam if permissions are missing
  try {
    await db.collection('pushTokens').limit(1).get();
    firebaseInitialized = true;
    console.log("[ADMIN020] Firebase Admin initialized and verified.");
  } catch (err: any) {
    if (err.message && err.message.includes("PERMISSION_DENIED")) {
      console.warn("[ADMIN020] Firebase Admin initialized but ACCESS DENIED. Server-side workers will be disabled. (Expected if Service Account is not configured)");
    } else {
      console.error("[ADMIN020] Firebase Admin connectivity check failed:", err.message);
    }
    firebaseInitialized = false;
  }
} catch (error) {
  firebaseInitialized = false;
  db = null;
  console.error("[ADMIN020] Firebase Admin initialization failed:", error);
}


function removeUndefinedFields(obj: any): any {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return obj;

  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    cleaned[key] = value;
  }
  return cleaned;
}



function removeUndefinedDeep(value: any): any {
  if (Array.isArray(value)) {
    return value.map(removeUndefinedDeep).filter((v) => v !== undefined);
  }

  if (value && typeof value === "object") {
    const cleaned: any = {};
    for (const [key, val] of Object.entries(value)) {
      if (val === undefined) continue;
      cleaned[key] = removeUndefinedDeep(val);
    }
    return cleaned;
  }

  return value === undefined ? undefined : value;
}

function dateFromBusinessId(id: any) {
  const match = String(id || "").match(/^(INV|ORD)-(\d{13})-/);
  if (!match) return null;
  const parsed = new Date(Number(match[2]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function bestCreatedDateForPaymentItem(item: any, fallbackId?: any) {
  const ids = [
    item?.id,
    item?.invoiceId,
    item?.invoiceNo,
    item?.invoiceNumber,
    item?.orderId,
    item?.orderNo,
    item?.orderNumber,
    item?.linkedInvoiceId,
    fallbackId,
  ].filter(Boolean);

  for (const id of ids) {
    const parsed = dateFromBusinessId(id);
    if (parsed) return parsed;
  }

  return dateValue(
    item?.createdAt ||
    item?.created_at ||
    item?.orderDate ||
    item?.timestamp ||
    item?.date ||
    item?.paymentCreatedAt ||
    item?.created
  );
}

function pendingPaymentGraceInfo(item: any, fallbackId?: any, now = new Date()) {
  const createdAt = bestCreatedDateForPaymentItem(item, fallbackId) || now;
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const remainingMs = Math.max(0, PAYMENT_PENDING_GRACE_MS - ageMs);

  return {
    createdAt,
    ageMs,
    shouldDelay: remainingMs > 0,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}

async function rememberPushEvent(eventId: string, payload: any, result: any) {
  if (!db || !eventId) return;
  try {
    await db.collection("pushEvents").doc(eventId).set({
      eventId,
      ...removeUndefinedDeep(payload),
      result: removeUndefinedDeep(result),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    console.warn("[PUSH] Could not remember push event:", eventId, error?.message || error);
  }
}


const app = express();

// ADMIN020_FORCE_CORS
app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");

  const allowedOrigins = new Set([
    "https://alturath-admin-0200723670.web.app",
    "https://gen-lang-client-0200723670.web.app",
    "https://service-119610604304.europe-west3.run.app",
    "http://localhost:5173",
    "http://localhost:3000"
  ]);

  if (allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "https://alturath-admin-0200723670.web.app");
  }

  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-secret, X-Admin-Secret");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  next();
});

  const PORT = Number(process.env.PORT) || 3000;

  app.use(cors());
  app.use(express.json({ limit: "30mb" }));

app.use(express.urlencoded({ extended: true }));

  // Webhook for payment gateway
  // It synchronizes payment results to the database even if the user doesn't return to the app.
  const handlePaymentUpdate = async (params: any) => {
    if (!db) return;

    const rawResult = String(params.result || params.status || params.payment || "").replace(/\+/g, " ").trim();
    const normalizedResult = rawResult.toUpperCase();

    const paymentId = params.payment_id || params.track_id || params.tran_id || "";

    let orderId =
      params.invoiceNo ||
      params.invoice_no ||
      params.invoice ||
      params.orderId ||
      params.order_id ||
      params.requested_order_id ||
      params.merchant_order_id ||
      params.reference?.id ||
      params.reference_id ||
      params.track_id;

    if (orderId && typeof orderId === "string" && orderId.includes("_")) {
      orderId = orderId.split("_")[0];
    }

    if (!orderId) {
      console.warn("Payment update ignored: missing orderId/invoiceNo", params);
      return;
    }

    const isPaid =
      normalizedResult === "CAPTURED" ||
      normalizedResult === "SUCCESS" ||
      normalizedResult === "PAID";

    const isFailed =
      normalizedResult === "NOT CAPTURED" ||
      normalizedResult === "FAILED" ||
      normalizedResult === "CANCELLED" ||
      normalizedResult === "CANCELED" ||
      normalizedResult === "DECLINED" ||
      normalizedResult === "ERROR";
    
    try {
        if (isPaid) {
            const invoiceRef = db.collection('invoices').doc(orderId);
            const invSnap = await invoiceRef.get();
            if (invSnap.exists) {
                const data = invSnap.data();
                if (data?.paymentStatus !== 'paid') {
                    await invoiceRef.update({ paymentStatus: 'paid', status: 'تم الدفع وجاري التوصيل', paymentId: paymentId || '', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', orderId).get();
                    for (const doc of orderQ.docs) {
                        await doc.ref.update({ status: 'تم الدفع وجاري التوصيل', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    }
                    const eventId = `safe-worker-invoice-paid-${orderId}`;
                    sendSmartAlertPushNotification({
                    title: "✅ تم الدفع",
                    body: `تم دفع الفاتورة ${orderId}${data?.totalAmount ? ` — ${data.totalAmount} د.ك` : ""}`,
                    alertType: "payment_paid",
                    eventId,
                    url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(orderId)}`,
                  }).then((result) => rememberPushEvent(eventId, {
                    source: "payment-webhook",
                    type: "invoice_paid",
                    invoiceId: orderId,
                  }, result)).catch(console.error);
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'paid' && data?.status !== 'تم الدفع وجاري التوصيل') {
                        await orderRef.update({ status: 'تم الدفع وجاري التوصيل', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        const eventId = `safe-worker-payment-paid-${orderId}`;
                        sendSmartAlertPushNotification({
                        title: "✅ تم الدفع",
                        body: `تم دفع الطلب ${orderId}${data?.total ? ` — ${data.total} د.ك` : ""}`,
                        alertType: "payment_paid",
                        eventId,
                        url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`,
                      }).then((result) => rememberPushEvent(eventId, {
                        source: "payment-webhook",
                        type: "payment_paid",
                        orderId,
                      }, result)).catch(console.error);
                    }
                }
            }
        } else if (isFailed) {
            const invoiceRef = db.collection('invoices').doc(orderId);
            const invSnap = await invoiceRef.get();
            if (invSnap.exists) {
                const data = invSnap.data();
                if (data?.paymentStatus !== 'paid') {
                    await invoiceRef.update({ paymentStatus: 'failed', status: 'فشلت عملية الدفع', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', orderId).get();
                    for (const doc of orderQ.docs) {
                        const oData = doc.data();
                        if (oData.status !== 'تم الدفع وجاري التوصيل' && oData.status !== 'paid') {
                            await doc.ref.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        }
                    }
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'تم الدفع وجاري التوصيل' && data?.status !== 'paid') {
                        await orderRef.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    }
                }
            }
        }
    } catch (e) {
        console.error("Webhook processing error:", e);
    }
  };

  app.post("/api/webhook/upayments", async (req, res) => {
    console.log("UPayments Webhook Received (POST):", JSON.stringify(req.body));
    const mergedParams = { ...req.body, ...req.params, ...req.query };
    await handlePaymentUpdate(mergedParams);
    res.status(200).send('OK');
  });
  app.post("/api/payment-webhook/:orderId", async (req, res) => {
    console.log("UPayments Webhook Received (POST):", JSON.stringify(req.body));
    const mergedParams = { ...req.body, ...req.params, ...req.query };
    await handlePaymentUpdate(mergedParams);
    res.status(200).send('OK');
  });

  app.get("/api/webhook/upayments", async (req, res) => {
     console.log("UPayments Webhook Received (GET):", JSON.stringify(req.query));
     const mergedParams = { ...req.query, ...req.params, ...req.body };
     await handlePaymentUpdate(mergedParams);
     res.status(200).send('OK');
  });
  app.get("/api/payment-webhook/:orderId", async (req, res) => {
     console.log("UPayments Webhook Received (GET):", JSON.stringify(req.query));
     const mergedParams = { ...req.query, ...req.params, ...req.body };
     await handlePaymentUpdate(mergedParams);
     res.status(200).send('OK');
  });

  // API logging middleware
  app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    console.log(`API REQUEST: ${req.method} ${req.originalUrl}`);
    next();
  });

  // API TEST ROUTES (PROMINENTLY PLACED AFTER LOGGING)
  app.get("/api/debug/push-secret", (req, res) => {
    const expectedSecret = String(process.env.ADMIN_TEST_SECRET || "").trim();
    res.json({
      adminTestSecretExists: Boolean(process.env.ADMIN_TEST_SECRET),
      expectedLength: expectedSecret.length,
      serverVersion: "push-debug-2026-05-08-v1"
    });
  });

  app.get("/api/debug/push-tokens", async (req, res) => {
    const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();
    const expectedSecret = String(process.env.ADMIN_TEST_SECRET || "").trim();
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      if (!db) return res.status(200).json({ success: true, mocked: true, message: "DB not initialized. Skipped.", tokens: [] });
      const snap = await db.collection("pushTokens").orderBy("updatedAt", "desc").limit(10).get();
      const tokens = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          active: data.active,
          deviceType: data.deviceType,
          isIPhone: data.isIPhone,
          isIOS: data.isIOS,
          isProbablyPwa: data.isProbablyPwa,
          standalone: data.standalone,
          notificationPermission: data.notificationPermission,
          serviceWorkerController: data.serviceWorkerController,
          platform: data.platform || null,
          currentUrl: data.currentUrl,
          userAgent: data.userAgent,
          updatedAt: data.updatedAt?.toDate()
        };
      });
      res.json(tokens);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/debug/delete-push-tokens", async (req, res) => {
    const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();
    const expectedSecret = String(process.env.ADMIN_TEST_SECRET || "").trim();
    if (!expectedSecret || receivedSecret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    try {
      if (!db) return res.status(200).json({ success: true, mocked: true, message: "DB not initialized. Skipped.", count: 0 });
      const snap = await db.collection("pushTokens").get();
      const batch = db.batch();
      let count = 0;
      snap.docs.forEach((doc) => {
        batch.delete(doc.ref);
        count++;
      });
      await batch.commit();
      res.json({ success: true, count, message: `Deleted ${count} tokens.` });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/push/test-new-order", async (req, res) => {
    console.log("PUSH TEST VERSION", "push-debug-2026-05-08-v1");
    const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();
    const expectedSecret = String(process.env.ADMIN_TEST_SECRET || "").trim();
    console.log("ADMIN_TEST_SECRET exists:", Boolean(process.env.ADMIN_TEST_SECRET));
    console.log("received x-admin-secret exists:", Boolean(req.headers["x-admin-secret"]));
    console.log("match:", receivedSecret === expectedSecret);

    if (!expectedSecret) {
      return res.status(500).json({ error: "ADMIN_TEST_SECRET is not configured" });
    }

    if (receivedSecret !== expectedSecret) {
      return res.status(401).json({
        error: "Unauthorized",
        debug: {
          receivedExists: Boolean(receivedSecret),
          expectedExists: Boolean(expectedSecret),
          receivedLength: receivedSecret.length,
          expectedLength: expectedSecret.length
        }
      });
    }

    try {
      const { orderId, total, restaurantId, orderNumber } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "orderId required" });
      }
      
      console.log("Triggering payment pending push...");
      const result = await sendSmartAlertPushNotification({
        title: String(orderId).startsWith("INV-") ? "⏳ فاتورة بانتظار الدفع" : "⏳ طلب بانتظار الدفع",
        body: `${String(orderId).startsWith("INV-") ? "الفاتورة" : "الطلب"} ${orderId} بانتظار الدفع${total ? ` — ${total} د.ك` : ""}`,
        alertType: String(orderId).startsWith("INV-") ? "invoice_pending_immediate" : "payment_pending_immediate",
        url: String(orderId).startsWith("INV-")
          ? `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(orderId)}`
          : `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`,
      } as any);
      res.json(result);
    } catch (error: any) {
      console.warn("Send push error suppressed:", error.message);
      res.status(200).json({ success: true, mocked: true, error: "Failed to process push notification", details: error.message });
    }
  });

  
app.post("/api/push/clear-tokens", async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"] || req.query.secret;
    if (String(secret) !== String(process.env.ADMIN_TEST_SECRET || "123456")) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (!firebaseInitialized || !db) {
      return res.status(500).json({ success: false, error: "Firebase not initialized" });
    }

    const snap = await db.collection("pushTokens").get();

    let deleted = 0;
    for (const doc of snap.docs) {
      await doc.ref.delete();
      deleted++;
    }

    return res.json({
      success: true,
      deleted,
    });
  } catch (error) {
    if (!String(error).includes("PERMISSION_DENIED")) console.error("[PUSH CLEAR TOKENS ERROR]", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.get("/api/push/debug-tokens", async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"] || req.query.secret;
    if (String(secret) !== String(process.env.ADMIN_TEST_SECRET || "123456")) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    if (!firebaseInitialized || !db) {
      return res.status(500).json({ success: false, error: "Firebase not initialized" });
    }

    const snap = await db.collection("pushTokens").get();

    const tokens = snap.docs.map((doc) => {
      const data = doc.data() || {};
      return {
        id: doc.id,
        active: data.active,
        tokenStart: String(data.token || "").slice(0, 30),
        tokenLength: String(data.token || "").length,
        platform: data.platform || null,
        vendor: data.vendor || null,
        updatedAt: data.updatedAt || null,
      };
    });

    return res.json({
      success: true,
      tokensCount: tokens.length,
      tokens,
    });
  } catch (error) {
    if (!String(error).includes("PERMISSION_DENIED")) console.error("[PUSH DEBUG TOKENS ERROR]", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


app.post("/api/push/test-smart-alert", async (req, res) => {
    console.log("PUSH TEST VERSION", "push-debug-2026-05-08-v1");
    const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();
    const expectedSecret = String(process.env.ADMIN_TEST_SECRET || "").trim();
    console.log("ADMIN_TEST_SECRET exists:", Boolean(process.env.ADMIN_TEST_SECRET));
    console.log("received x-admin-secret exists:", Boolean(req.headers["x-admin-secret"]));
    console.log("match:", receivedSecret === expectedSecret);

    if (!expectedSecret) {
      return res.status(500).json({ error: "ADMIN_TEST_SECRET is not configured" });
    }

    if (receivedSecret !== expectedSecret) {
      return res.status(401).json({
        error: "Unauthorized",
        debug: {
          receivedExists: Boolean(receivedSecret),
          expectedExists: Boolean(expectedSecret),
          receivedLength: receivedSecret.length,
          expectedLength: expectedSecret.length
        }
      });
    }

    try {
      const { title, body, alertType, url } = req.body;
      
      console.log("Triggering test-smart-alert push...");
      const result = await sendSmartAlertPushNotification({ title, body, alertType, url });
      res.json(result);
    } catch (error: any) {
      console.warn("Send smart alert error suppressed:", error.message);
      res.status(200).json({ success: true, mocked: true, error: "Failed to process smart alert notification", details: error.message });
    }
  });


  app.post("/api/push/order-created-alert", async (req, res) => {
    try {
      if (!db) {
        return res.status(200).json({
          success: true,
          mocked: true,
          message: "Firestore Admin is not initialized. Alert skipped.",
        });
      }

      const { orderId, orderNumber: clientOrderNumber, total: clientTotal } = req.body || {};

      if (!orderId || typeof orderId !== "string") {
        return res.status(400).json({
          success: false,
          message: "orderId is required",
        });
      }

      let order: any = null;
      let resolvedOrderId = orderId;
      const isInvoiceAlert = String(orderId).startsWith("INV-");

      try {
        let orderSnap: any = await db.collection("orders").doc(orderId).get();
        // Avoid multiple .where queries if doc doesn't exist to prevent quota exhaustion.
        // For admin invoices (INV-...), also check the invoices collection using the same ID.

        if (orderSnap.exists) {
          order = orderSnap.data() || {};
        } else {
          const invoiceSnap: any = await db.collection("invoices").doc(orderId).get();
          if (invoiceSnap.exists) {
            order = { ...(invoiceSnap.data() || {}), type: "admin_invoice" };
          }
        }

        if (!order) {
          // Fallback: some app orders/invoices are stored inside appData/shared_company_data arrays
          const appDataSnap = await db.collection("appData").doc("shared_company_data").get();

          if (appDataSnap.exists) {
            const appData = appDataSnap.data() || {};

            for (const [key, value] of Object.entries(appData)) {
              if (!Array.isArray(value)) continue;

              const found = value.find((item: any) => {
                if (!item || typeof item !== "object") return false;

                return (
                  item.id === orderId ||
                  item.orderId === orderId ||
                  item.orderNumber === orderId ||
                  item.invoiceNo === orderId ||
                  item.invoiceNumber === orderId ||
                  item.linkedInvoiceId === orderId
                );
              });

              if (found) {
                order = found;
                resolvedOrderId = found.id || found.orderId || found.orderNumber || orderId;
                break;
              }
            }
          }
        }
      } catch (err: any) {
        if (String(err).includes("RESOURCE_EXHAUSTED")) {
            console.warn(`[order-created-alert] Firestore quota exceeded. Falling back to incoming payload for: ${orderId}`);
        } else if (!String(err).includes("PERMISSION_DENIED")) {
            console.warn("[order-created-alert] Firestore fetch failed. Continuing with minimal payload.", err.message);
        }
        order = { orderNumber: clientOrderNumber, total: clientTotal };
      }

      if (!order) {
        // Do not fail invoice alerts if the client has just created the invoice and Firestore sync is still catching up.
        // Keep notification delivery logic unchanged; only allow a minimal payload for INV fallback.
        if (isInvoiceAlert) {
          order = {
            id: orderId,
            invoiceNo: orderId,
            invoiceNumber: orderId,
            totalAmount: clientTotal,
            paymentStatus: "pending",
            status: "بانتظار الدفع",
            type: "admin_invoice"
          };
        } else {
          return res.status(404).json({
            success: false,
            message: "Order not found",
            searchedFor: orderId,
          });
        }
      }
      const paymentStatus = String(order.paymentStatus || "").toLowerCase();
      const status = String(order.status || "");

      const isAlreadyPaid =
        paymentStatus === "paid" ||
        paymentStatus === "captured" ||
        status.includes("تم الدفع");

      if (isAlreadyPaid) {
        return res.json({
          success: true,
          skipped: true,
          reason: "Order is already paid",
        });
      }

      const graceInfo = pendingPaymentGraceInfo(order, resolvedOrderId);
      if (graceInfo.shouldDelay) {
        return res.json({
          success: true,
          skipped: true,
          scheduled: true,
          reason: "Pending payment push delayed until grace period passes",
          delaySeconds: graceInfo.remainingSeconds,
          graceSeconds: PAYMENT_PENDING_GRACE_SECONDS,
        });
      }

      const eventId = `order-created-${resolvedOrderId}`;
      let eventSnap: any;
      try {
        const eventRef = db.collection("pushEvents").doc(eventId);
        eventSnap = await eventRef.get();
        if (eventSnap.exists) {
          return res.json({
            success: true,
            skipped: true,
            reason: "Notification already sent",
          });
        }
      } catch (e: any) {
         console.warn("Could not check pushEvents:", e.message);
      }

      const orderNumber =
        order.orderNumber ||
        order.invoiceNo ||
        order.invoiceNumber ||
        clientOrderNumber ||
        orderId;

      const total =
        order.total ||
        order.totalAmount ||
        order.finalTotal ||
        order.amount ||
        clientTotal ||
        "";

      const result = await sendSmartAlertPushNotification({
        title: isInvoiceAlert ? "⏳ فاتورة لم تُدفع" : "⏳ طلب لم يدفع",
        body: `${isInvoiceAlert ? "الفاتورة" : "الطلب"} ${orderNumber} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${total ? ` — القيمة ${total} د.ك` : ""}`,
        eventId,
        alertType: isInvoiceAlert ? "invoice_pending_immediate" : "payment_pending_immediate",
        url: isInvoiceAlert
          ? `/?invoice=${encodeURIComponent(resolvedOrderId)}`
          : `/?order=${encodeURIComponent(resolvedOrderId)}`
      });

      try {
        const eventRef = db.collection("pushEvents").doc(eventId);
        await eventRef.set({
          orderId,
          type: isInvoiceAlert ? "invoice_created_pending_payment" : "order_created_pending_payment",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          result,
        });
      } catch (e: any) {
        console.warn("Could not log pushEvent:", e.message);
      }

      return res.json(result);
    } catch (error: any) {
      console.warn("order-created-alert processing completed with error:", error.message);

      return res.status(200).json({ // Return 200 to prevent frontend crashes
        success: false,
        message: error.message,
      });
    }
  });



  app.get("/api/debug/recent-orders", async (req, res) => {
    try {
      const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();

      if (receivedSecret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!db) {
        return res.status(200).json({
          success: true,
          mocked: true,
          message: "Firestore Admin is not initialized. Debug skipped.",
        });
      }

      function normalizeDate(value: any) {
        if (!value) return null;
        if (value.toDate) return value.toDate().toISOString();
        if (value instanceof Date) return value.toISOString();
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }

      const ordersSnap = await db.collection("orders").limit(20).get();

      const orders = ordersSnap.docs.map((doc) => {
        const data = doc.data() || {};

        return {
          docId: doc.id,
          id: data.id || null,
          orderId: data.orderId || null,
          orderNumber: data.orderNumber || null,
          invoiceNo: data.invoiceNo || null,
          invoiceNumber: data.invoiceNumber || null,
          status: data.status || null,
          paymentStatus: data.paymentStatus || null,
          total: data.total || null,
          totalAmount: data.totalAmount || null,
          finalTotal: data.finalTotal || null,
          amount: data.amount || null,
          createdAt: normalizeDate(data.createdAt),
          orderDate: normalizeDate(data.orderDate),
          timestamp: normalizeDate(data.timestamp),
          created_at: normalizeDate(data.created_at),
          rawKeys: Object.keys(data).slice(0, 40),
        };
      });

      const appDataSnap = await db.collection("appData").doc("shared_company_data").get();

      let appDataArrays: any[] = [];

      if (appDataSnap.exists) {
        const appData = appDataSnap.data() || {};

        appDataArrays = Object.entries(appData)
          .filter(([_, value]) => Array.isArray(value))
          .map(([key, value]: any) => ({
            key,
            count: value.length,
            sample: value.slice(-3).map((item: any) => ({
              id: item?.id || null,
              orderId: item?.orderId || null,
              orderNumber: item?.orderNumber || null,
              invoiceNo: item?.invoiceNo || null,
              invoiceNumber: item?.invoiceNumber || null,
              status: item?.status || null,
              paymentStatus: item?.paymentStatus || null,
              total: item?.total || null,
              totalAmount: item?.totalAmount || null,
              finalTotal: item?.finalTotal || null,
              amount: item?.amount || null,
              createdAt: normalizeDate(item?.createdAt),
              orderDate: normalizeDate(item?.orderDate),
              timestamp: normalizeDate(item?.timestamp),
              created_at: normalizeDate(item?.created_at),
              rawKeys: item && typeof item === "object" ? Object.keys(item).slice(0, 30) : [],
            })),
          }));
      }

      return res.json({
        success: true,
        ordersCollectionCount: orders.length,
        orders,
        appDataArrays,
      });
    } catch (error: any) {
      if (!String(error).includes("PERMISSION_DENIED")) console.error("recent-orders debug error:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  let __alertsOrdersCache = { time: 0, docs: [] as any[] };

  async function getRecentOrdersCached(limit = 50) {
    const now = Date.now();
    if (now - __alertsOrdersCache.time < 5 * 60 * 1000) {
        return __alertsOrdersCache.docs;
    }
    try {
        const snap = await db.collection("orders").limit(limit).get();
        __alertsOrdersCache.time = now;
        __alertsOrdersCache.docs = snap.docs;
        return snap.docs;
    } catch (e: any) {
        if (e.message && e.message.includes("PERMISSION_DENIED")) {
            console.log("[ALERTS] Failed to fetch orders: PERMISSION_DENIED (Continuing safely)");
        } else {
            console.error("[ALERTS] Failed to fetch orders:", e.message);
        }
        return __alertsOrdersCache.docs;
    }
  }

  app.post("/api/push/run-business-alerts", async (req, res) => {
    try {
      const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();

      if (receivedSecret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!db) {
        return res.status(200).json({
          success: true,
          mocked: true,
          message: "Firestore Admin is not initialized. Alerts skipped.",
        });
      }

      const now = new Date();

      const kuwaitParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuwait",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(now).reduce((acc: any, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

      const todayKey = `${kuwaitParts.year}-${kuwaitParts.month}-${kuwaitParts.day}`;
      const kuwaitHour = Number(kuwaitParts.hour);

      const dayStart = new Date(`${todayKey}T00:00:00.000+03:00`);
      const dayEnd = new Date(`${todayKey}T23:59:59.999+03:00`);

      const newOrderWindowStart = new Date(now.getTime() - 15 * 60 * 1000);
      const pendingPaymentWindowStart = new Date(now.getTime() - 30 * 60 * 1000);
      const pendingPaymentGraceAgo = new Date(now.getTime() - PAYMENT_PENDING_GRACE_MS);
      const paymentFailureGraceAgo = new Date(now.getTime() - PAYMENT_FAILURE_GRACE_MS);
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const results: any[] = [];

      async function alreadySent(eventId: string) {
        if (__alertsPushEventsCache.knownIds.has(eventId)) return true;
        const snap = await db!.collection("pushEvents").doc(eventId).get();
        if (snap.exists) {
            __alertsPushEventsCache.knownIds.add(eventId);
            return true;
        }
        return false;
      }

      async function markSent(eventId: string, payload: any, result: any) {
        await db!.collection("pushEvents").doc(eventId).set({
          ...payload,
          result,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        __alertsPushEventsCache.knownIds.add(eventId);
      }

      function getDateValue(value: any): Date | null {
        if (!value) return null;
        if (value.toDate) return value.toDate();
        if (value instanceof Date) return value;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }

      function getOrderNumber(order: any, fallback: string) {
        return order.orderNumber || order.invoiceNo || order.invoiceNumber || order.orderId || fallback;
      }

      function getTotal(order: any) {
        const raw = order.total || order.totalAmount || order.finalTotal || order.amount || 0;
        const n = Number(raw);
        return isNaN(n) ? 0 : n;
      }

      function isPaidOrder(order: any) {
        const paymentStatus = String(order.paymentStatus || "").toLowerCase();
        const status = String(order.status || "");
        return (
          paymentStatus === "paid" ||
          paymentStatus === "captured" ||
          paymentStatus === "success" ||
          status.includes("تم الدفع") ||
          status.toLowerCase().includes("paid")
        );
      }

      function isPendingPayment(order: any) {
        const paymentStatus = String(order.paymentStatus || "").toLowerCase();
        const status = String(order.status || "").toLowerCase();

        if (isPaidOrder(order)) return false;

        return (
          paymentStatus === "" ||
          paymentStatus === "pending" ||
          paymentStatus === "unpaid" ||
          paymentStatus === "not_paid" ||
          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("لم يدفع")
        );
      }

      // Fetch recent orders from both sources:
      // 1) Root collection: orders
      // 2) appData/shared_company_data.orders array
      const ordersDocs = await getRecentOrdersCached(50);

      const rootOrders = ordersDocs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        __source: "orders_collection",
      }));

      let appDataOrders: any[] = [];

      const sharedDataSnap = await db.collection("appData").doc("shared_company_data").get();

      if (sharedDataSnap.exists) {
        const sharedData = sharedDataSnap.data() || {};
        const sharedOrders = Array.isArray(sharedData.orders) ? sharedData.orders : [];

        appDataOrders = sharedOrders.map((order: any) => ({
          ...order,
          id: order.id || order.orderId || order.orderNumber,
          __source: "appData_orders",
        }));
      }

      const ordersMap = new Map<string, any>();

      for (const order of [...rootOrders, ...appDataOrders]) {
        const key = String(order.id || order.orderId || order.orderNumber || "");
        if (!key) continue;
        ordersMap.set(key, order);
      }

      const orders = Array.from(ordersMap.values());

      // 0) طلب لم يدفع بعد مهلة قصيرة - server-side, works even if admin app is closed
      for (const order of orders) {
        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (createdAt > pendingPaymentGraceAgo) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = `order-created-${(order as any).id}`;

        if (await alreadySent(eventId)) {
          continue;
        }

        const orderNumber = getOrderNumber(order, (order as any).id);
        const total = getTotal(order);

        const result = await sendSmartAlertPushNotification({
          title: "⏳ طلب لم يدفع",
          body: `الطلب ${orderNumber} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${total ? ` — القيمة ${total.toFixed(3)} د.ك` : ""}`,
          alertType: "payment_pending_immediate",
          url: `/?order=${encodeURIComponent((order as any).id)}`
        });

        await markSent(eventId, {
          type: "order_created_pending_payment_server",
          orderId: (order as any).id,
          orderNumber,
        }, result);

        results.push({ eventId, result });
      }

      // 1) طلب لم يدفع بعد 10 دقائق
      for (const order of orders) {
        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!createdAt) continue;

        // Only alert for recent pending payments:
        // older than 10 minutes, but not older than 30 minutes.
        // This prevents sending a backlog of old pending orders all at once.
        if (createdAt > tenMinutesAgo) continue;
        if (createdAt < pendingPaymentWindowStart) continue;

        if (!isPendingPayment(order)) continue;

        const eventId = `payment-pending-10min-${(order as any).id}`;

        if (await alreadySent(eventId)) {
          continue;
        }

        const orderNumber = getOrderNumber(order, (order as any).id);
        const total = getTotal(order);

        const result = await sendSmartAlertPushNotification({
          title: "⏳ طلب لم يُدفع بعد",
          body: `الطلب ${orderNumber} صار له 10 دقائق بدون دفع${total ? ` — القيمة ${total.toFixed(3)} د.ك` : ""}`,
          alertType: "payment_pending_10min",
          url: `/?order=${encodeURIComponent((order as any).id)}`
        });

        await markSent(eventId, {
          type: "payment_pending_10min",
          orderId: (order as any).id,
          orderNumber,
        }, result);

        results.push({ eventId, result });
      }

      // حساب طلبات ومبيعات اليوم
      const todayOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= dayStart && d <= dayEnd;
      });

      const paidTodayOrders = todayOrders.filter((order: any) => isPaidOrder(order));
      const todaySales = paidTodayOrders.reduce((sum: number, order: any) => sum + getTotal(order), 0);

      // محاولة صافي الربح: إن توفر profit/netProfit نستخدمه، وإلا 0
      const todayNetProfit = paidTodayOrders.reduce((sum: number, order: any) => {
        const raw =
          order.netProfit ??
          order.profit ??
          order.totalProfit ??
          order.grossProfit ??
          0;

        const n = Number(raw);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);

      // 2) ملخص اليوم الساعة 11 مساءً
      // حتى لا يرسل قبل 11:00 مساءً
      if (kuwaitHour >= 23) {
        const eventId = `daily-summary-${todayKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "🌙 ملخص اليوم — مطبخ التراث",
            body: `الطلبات: ${todayOrders.length} ✅ | المبيعات: ${todaySales.toFixed(3)} د.ك | الربح: ${todayNetProfit.toFixed(3)} د.ك — يعطيكم العافية يا أبطال 🔥`,
            alertType: "daily_summary",
            url: "/"
          });

          await markSent(eventId, {
            type: "daily_summary",
            date: todayKey,
            ordersCount: todayOrders.length,
            sales: todaySales,
            netProfit: todayNetProfit,
          }, result);

          results.push({ eventId, result });
        }
      }

      // 3) المبيعات اليوم أعلى من 200 د.ك
      if (todaySales >= 200) {
        const eventId = `sales-over-200-${todayKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "🔥 المبيعات كسرت 200 د.ك",
            body: `وصلنا ${todaySales.toFixed(3)} د.ك اليوم — شدوا حيلكم يا شباب 🔥`,
            alertType: "sales_over_200",
            url: "/"
          });

          await markSent(eventId, {
            type: "sales_over_200",
            date: todayKey,
            sales: todaySales,
          }, result);

          results.push({ eventId, result });
        }
      }

      // 4) عدد الطلبات زاد فجأة خلال ساعة
      const lastHourOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= oneHourAgo && d <= now;
      });

      const previousHourOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= twoHoursAgo && d < oneHourAgo;
      });

      const lastHourCount = lastHourOrders.length;
      const previousHourCount = previousHourOrders.length;

      const suddenSpike =
        lastHourCount >= 5 &&
        (
          previousHourCount === 0 ||
          lastHourCount >= previousHourCount * 2
        );

      if (suddenSpike) {
        const hourKey = now.toISOString().slice(0, 13);
        const eventId = `order-spike-${hourKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "⚡ ضغط طلبات عالي",
            body: `آخر ساعة فيها ${lastHourCount} طلب — جهزوا المطبخ يا أبطال ⚡`,
            alertType: "order_spike",
            url: "/"
          });

          await markSent(eventId, {
            type: "order_spike",
            hour: hourKey,
            lastHourCount,
            previousHourCount,
          }, result);

          results.push({ eventId, result });
        }
      }

      return res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });
    } catch (error: any) {
      console.warn("run-business-alerts error suppressed:", error.message);

      return res.status(200).json({ // Returns 200 to not fail cron/web calls
        success: false,
        message: error.message,
      });
    }
  });

  app.post("/api/push/save-token", async (req, res) => {
    try {
      const {
        token,
        userId,
        restaurantId,
        platform,
        userAgent,
        vendor,
        language,
        standalone,
        notificationPermission,
        serviceWorkerController,
        currentUrl,
        screen,
        savedAtClient
      } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const ua = userAgent || "";
      const isIPhone = /iPhone/i.test(ua);
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isSafariLike = /Safari/i.test(ua);
      const isProbablyPwa = !!standalone;
      const deviceType = isIPhone ? "iphone" : (isIOS ? "ios" : "other");
      
      const { createHash } = await import("crypto");
      const tokenHash = createHash("sha256").update(token).digest("hex");

      if (db) {
        const tokenRef = db.collection("pushTokens").doc(token);
        const tokenDoc = await tokenRef.get();

        const data: any = {
          token,
          tokenHash,
          userId: userId || null,
          restaurantId: restaurantId || "kitchen_default",
          platform: platform || "",
          userAgent: ua,
          vendor: vendor || null,
          language: language || null,
          standalone,
          notificationPermission,
          serviceWorkerController,
          currentUrl,
          screen,
          savedAtClient,
          deviceType,
          isIPhone,
          isIOS,
          isSafariLike,
          isProbablyPwa,
          active: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (!tokenDoc.exists) {
          data.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }

        await tokenRef.set(removeUndefinedDeep(data), { merge: true });
      }

      return res.json({ success: true });
    } catch (error: any) {
      if (!String(error).includes("PERMISSION_DENIED")) console.error("save-token error:", error);
      return res.status(500).json({
        error: "Failed to save token",
        message: error.message
      });
    }
  });

  
function smartNotificationTag(alertType: string, url: string, fallbackEventId: string) {
  const type = String(alertType || "").toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return fallbackEventId;

  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);
  const id = decodeURIComponent(invoiceMatch?.[1] || orderMatch?.[1] || "");
  if (!id) return fallbackEventId;

  return `payment-final-state-${invoiceMatch ? "invoice" : "order"}-${id}`;
}

async function sendSmartAlertPushNotification({
  title,
  body,
  alertType = "general",
  url = "https://alturath-admin-0200723670.web.app",
  eventId = `manual-smart-alert-${Date.now()}`,
  ttlSeconds,
  requireInteraction = true,
  notificationTag,
}: {
  title: string;
  body: string;
  alertType?: string;
  url?: string;
  eventId?: string;
  ttlSeconds?: number;
  requireInteraction?: boolean;
  notificationTag?: string;
}) {
  try {
    if (!firebaseInitialized || !db) {
      return {
        success: true,
        mocked: true,
        error: "Firebase not initialized",
      };
    }

    const snap = await db.collection("pushTokens")
      .where("active", "==", true)
      .get();

    const tokens = snap.docs
      .map((doc: any) => String((doc.data() || {}).token || ""))
      .filter((token: string) => token.length > 50 && /^[\x20-\x7E]+$/.test(token));

    if (tokens.length === 0) {
      return {
        success: false,
        tokensCount: 0,
        error: "No active push tokens",
      };
    }

    const normalizedEventId = String(eventId || `manual-smart-alert-${Date.now()}`);
    const normalizedAlertType = String(alertType || "general");
    const normalizedUrl = String(url);
    const normalizedNotificationTag = String(notificationTag || smartNotificationTag(normalizedAlertType, normalizedUrl, normalizedEventId));
    const effectiveTtlSeconds = Number.isFinite(Number(ttlSeconds))
      ? Math.max(60, Math.min(86400, Number(ttlSeconds)))
      : (
          normalizedAlertType.includes("pending_10min") ? 900 :
          normalizedAlertType.includes("pending_immediate") ? 900 :
          normalizedAlertType.includes("failed") ? 1800 :
          normalizedAlertType.includes("paid") ? 1800 :
          normalizedAlertType.includes("daily") || normalizedAlertType.includes("summary") ? 86400 :
          normalizedAlertType.includes("qatia") || normalizedAlertType.includes("roulette") ? 3600 :
          3600
        );

    const message = {
      tokens,
      notification: {
        title: String(title || "تنبيه"),
        body: String(body || ""),
      },
      data: {
        type: "smart_alert",
        alertType: normalizedAlertType,
        eventId: normalizedEventId,
        notificationTag: normalizedNotificationTag,
        url: normalizedUrl,
        click_action: normalizedUrl,
        title: String(title || "تنبيه"),
        body: String(body || ""),
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: String(effectiveTtlSeconds),
        },
        notification: {
          title: String(title || "تنبيه"),
          body: String(body || ""),
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: normalizedNotificationTag,
          renotify: false,
          requireInteraction: Boolean(requireInteraction),
          data: {
            url: normalizedUrl,
            eventId: normalizedEventId,
            notificationTag: normalizedNotificationTag,
            alertType: normalizedAlertType,
          },
        },
        fcmOptions: {
          link: normalizedUrl,
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast(message);

    if (response.failureCount > 0) {
      const batch = db.batch();
      let changed = 0;

      response.responses.forEach((resp: any, idx: number) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token" ||
            errorCode === "messaging/invalid-argument"
          ) {
            batch.update(db.collection("pushTokens").doc(tokens[idx]), { active: false });
            changed++;
          }
        }
      });

      if (changed > 0) {
        await batch.commit();
      }
    }

    return {
      success: true,
      tokensCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.responses
        .map((resp: any, idx: number) => resp.success ? null : {
          tokenStart: tokens[idx].slice(0, 20),
          code: resp.error?.code,
          message: resp.error?.message,
        })
        .filter(Boolean),
    };
  } catch (error: any) {
    if (!String(error).includes("PERMISSION_DENIED")) {
      console.error("[SMART ALERT PUSH ERROR]", error);
    }
    return {
      success: true,
      mocked: true,
      error: "Failed to process smart alert notification",
      details: error?.message || String(error),
    };
  }
}


async function sendNewOrderPushNotification({ orderId, total, restaurantId = 'default', orderNumber = '', testNotificationOnly = false }: any) {
    if (!admin.messaging || !db) return { success: true, mocked: true, error: "Firebase not initialized" };
    const url = `/?invoice=${orderId}`; 
    
    try {
      const snap = await db.collection("pushTokens").where("active", "==", true).get();
      if (snap.empty) return { success: false, error: "No active push tokens found", tokensCount: 0 };
      
      const tokens = snap.docs
        .map(d => String(d.data().token || ""))
        .filter(t => t.length > 50 && /^[\x20-\x7E]+$/.test(t));
      
      const notificationTitle = "⏳ طلب بانتظار الدفع";
      const notificationBody = `الطلب ${orderNumber || orderId} بانتظار الدفع`;

      const message = {
        tokens,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: "smart_alert",
          alertType: "payment_pending_immediate",
          eventId: `new-order-${orderId}-${Date.now()}`,
          url: String(url),
          click_action: String(url),
          title: notificationTitle,
          body: notificationBody,
          orderId: String(orderId),
          orderNumber: String(orderNumber || ""),
          restaurantId: String(restaurantId || "default"),
          total: String(total || ""),
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400",
          },
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            requireInteraction: true,
            data: {
              url: String(url),
            },
          },
          fcmOptions: {
            link: String(url),
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === "messaging/registration-token-not-registered" || 
                errorCode === "messaging/invalid-registration-token" ||
                errorCode === "messaging/invalid-argument") {
              failedTokens.push(tokens[idx]);
            }
          }
        });

        if (failedTokens.length > 0) {
          const batch = db.batch();
          for (const token of failedTokens) {
            batch.update(db.collection("pushTokens").doc(token), { active: false });
          }
          await batch.commit();
        }
      }

      return {
        success: response.successCount > 0,
        tokensCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses.filter(r => !r.success).map(r => (r.error ? { code: r.error.code, message: r.error.message } : { message: "Unknown error" }))
      };
    } catch (e: any) {
      console.warn("Sending smart alert push error suppressed in preview:", e.message);
      return { success: true, mocked: true, warning: e.message };
    }
  }

  // Consolidate API Key retrieval logic
  const getUPaymentsApiKey = () => {
    const raw =
      process.env.UPAYMENTS_API_KEY ||
      process.env.UPAYMENT_API_KEY ||
      process.env.UPAYMENTS_TOKEN ||
      process.env.UPAYMENT_TOKEN ||
      process.env.VITE_UPAYMENTS_API_KEY ||
      process.env.VITE_UPAYMENT_API_KEY ||
      "";
    return raw.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '').trim();
  };

  app.get("/api/test-upayments-raw", async (req, res) => {
    try {
      const apiKey = getUPaymentsApiKey();
      res.send(`Key length: ${apiKey?.length}, first 3: ${apiKey?.substring(0,3)}`);
    } catch(e: any) {
      res.send("Error: " + e.message);
    }
  });

  app.get("/api/test", (req, res) => {
    res.json({ message: "BACKEND OK", status: 200, time: new Date().toISOString() });
  });

  app.get("/api/payment-return/:invoiceNo", async (req, res) => {
    try {
      let { invoiceNo } = req.params;
      if (invoiceNo && typeof invoiceNo === "string" && invoiceNo.includes("_")) {
        invoiceNo = invoiceNo.split("_")[0];
      }
      const q = req.query;

      const result = String(q.result || "").toUpperCase();
      const paymentId = q.payment_id || "";
      const tranId = q.tran_id || "";
      const ref = q.ref || "";
      const invoiceId = q.invoice_id || "";
      const receiptId = q.receipt_id || "";
      const trackId = q.track_id || "";
      const paymentType = q.payment_type || "";
      const transactionDate = q.transaction_date || "";

      const isPaid =
        result === "CAPTURED" ||
        result === "SUCCESS" ||
        result === "PAID";

      const status = isPaid ? "paid" : "failed";

      console.log("Payment return:", {
        invoiceNo,
        status,
        result,
        paymentId,
        tranId,
        ref,
        invoiceId,
        receiptId,
        trackId,
        paymentType,
        transactionDate,
      });

      // Update database logically if needed
      // await updateOrderPaymentStatus(invoiceNo, { status, result, paymentId, tranId, ref });

      return res.redirect(
        `/?payment=${status}&invoice=${encodeURIComponent(invoiceNo)}&result=${encodeURIComponent(result)}`
      );
    } catch (error) {
      console.error("Payment return error:", error);
      return res.redirect("/?payment=error");
    }
  });

  app.get("/api/payment-return", async (req, res) => {
      const q = req.query;
      let invoiceNo = String(q.track_id || q.order_id || q.invoice_id || "");
      if (invoiceNo && typeof invoiceNo === "string" && invoiceNo.includes("_")) {
        invoiceNo = invoiceNo.split("_")[0];
      }
      try {
        const result = String(q.result || "").toUpperCase();
        const isPaid = result === "CAPTURED" || result === "SUCCESS" || result === "PAID";
        const status = isPaid ? "paid" : "failed";
        return res.redirect(`/?payment=${status}&invoice=${encodeURIComponent(invoiceNo)}&result=${encodeURIComponent(result)}`);
      } catch (error) {
        return res.redirect("/?payment=error");
      }
  });

  console.log("Registering create-payment...");
  app.post("/api/create-payment", async (req, res) => {
    console.log("=== CREATE PAYMENT ROUTE HIT ===");
    const { 
      amount, 
      customerName, 
      customerEmail, 
      customerMobile, 
      orderId, 
      description, 
      paymentGateway = 'knet',
      returnUrl,
      cancelUrl,
      notificationUrl
    } = req.body;
    
    // Clean and robust API Key retrieval
    const envKeys = Object.keys(process.env).filter(k => k.includes('UPAYMENT'));
    console.log("Available Upayments related env keys:", envKeys);
    
    const apiKey = getUPaymentsApiKey();

    if (!apiKey) {
      console.error("UPAYMENTS_API_KEY is not defined or empty. Check environment variables.");
      return res.status(500).json({
        error: "Payment gateway configuration error (Key Missing)",
        message: "UPAYMENTS_API_KEY is not defined or empty on the server environment. Please define UPAYMENTS_API_KEY in the environment."
      });
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 4)}... (Total length: ${apiKey.length})`);
    
    const validNotificationUrl =
      typeof notificationUrl === "string" && /^https?:\/\//i.test(notificationUrl)
        ? notificationUrl
        : "https://admin.alturathkw.shop/api/payment/notification";

    if (!amount || !customerName || !orderId || !returnUrl || !cancelUrl) {
      const missing = [];
      if (!amount) missing.push("amount");
      if (!customerName) missing.push("customerName");
      if (!orderId) missing.push("orderId");
      if (!returnUrl) missing.push("returnUrl");
      if (!cancelUrl) missing.push("cancelUrl");
      return res.status(400).json({ 
        error: "Missing required payment fields",
        message: `حقول الدفع المطلوبة مفقودة: ${missing.join(", ")}`
      });
    }

    try {
      const baseUrl = "https://apiv2api.upayments.com/api/v1"; // Forced Live Mode as requested
      const orderIdForGateway = `${orderId}_${Date.now()}`;
      
      // Clean and format phone number (ensure 965 prefix for Kuwait)
      let cleanMobile = customerMobile ? customerMobile.toString().replace(/[^0-9]/g, '') : '';
      if (cleanMobile.length === 8) {
        cleanMobile = '965' + cleanMobile;
      } else if (cleanMobile.length === 0) {
        cleanMobile = '96500000000';
      }
      
      const safeAmount = Number(Number(amount).toFixed(3));
      const rawEmail = String(customerEmail || '').trim();
      const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) && !/example\.com$/i.test(rawEmail)
        ? rawEmail
        : `customer-${cleanMobile || orderId}@alturathkw.shop`;

      const payload: any = {
        order: {
          id: orderIdForGateway,
          reference: orderIdForGateway,
          description: description || 'Payment for order ' + orderId,
          currency: 'KWD',
          amount: safeAmount
        },
        language: 'en',
        is_sms: 0,
        is_email: 0,
        paymentGateway: { src: paymentGateway || 'knet' },
        reference: { id: orderIdForGateway },
        customer: {
          uniqueId: cleanMobile || orderIdForGateway,
          name: customerName,
          email: safeEmail,
          mobile: cleanMobile
        },
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        notificationUrl: validNotificationUrl
      };

      console.log("UPayments Request Payload:", JSON.stringify(payload));

      const response = await fetch(`${baseUrl}/charge`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error("Non-JSON UPayments API error:", text);
        return res.status(response.status).json({ 
          error: "Payment gateway request failed", 
          message: `استجابة غير صالحة من بوابة الدفع (ليست بتنسيق JSON). النص المستلم: ${text.substring(0, 150)}`,
          details: text 
        });
      }
      
      if (!response.ok) {
        console.error("UPayments API error response:", JSON.stringify(data));
        
        let errorMsg = "فشل بوابة الدفع";
        if (data) {
          if (typeof data.message === "string") {
            errorMsg = data.message;
          } else if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (data.errors && typeof data.errors === "object") {
            errorMsg = Object.entries(data.errors)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : String(val)}`)
              .join(" | ");
          } else if (data.data && typeof data.data.message === "string") {
            errorMsg = data.data.message;
          } else if (data.data && typeof data.data.error === "string") {
            errorMsg = data.data.error;
          } else {
            errorMsg = JSON.stringify(data);
          }
        }
        
        return res.status(response.status).json({ 
          error: "Payment gateway request failed", 
          message: `خطأ من بوابة الدفع UPayments (كود الحالة ${response.status}): ${errorMsg}`,
          details: data 
        });
      }

      const extractedPaymentLink =
        data?.paymentLink ||
        data?.paymentURL ||
        data?.payment_url ||
        data?.paymentUrl ||
        data?.url ||
        data?.link ||
        data?.data?.paymentLink ||
        data?.data?.paymentURL ||
        data?.data?.payment_url ||
        data?.data?.paymentUrl ||
        data?.data?.url ||
        data?.data?.link ||
        (typeof data?.data === "string" && /^https?:\/\//i.test(data.data) ? data.data : "");

      // Pending-payment push is intentionally handled by the alerts worker after a short grace period.
      // If the customer pays quickly, only the paid notification is sent.
      const pendingGrace = pendingPaymentGraceInfo({ id: orderId, totalAmount: amount, total: amount }, orderId);
      console.log(`[PUSH] Pending-payment alert queued for worker: ${orderId}; grace remaining ${pendingGrace.remainingSeconds}s`);

      res.json({
        ...data,
        paymentLink: extractedPaymentLink || data?.paymentLink || data?.link || data?.url || "",
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(500).json({ 
        error: "Failed to create payment", 
        message: error?.message || String(error)
      });
    }
  });

  // The search route is replaced by the payment-return route moved up higher
  app.get("/api/search-order/:phone", async (req, res) => {
    res.json([]);
  });

  app.post("/api/invoice/confirm", async (req, res) => {
    const { paymentId, invoiceId } = req.body;
    if (!paymentId || paymentId === 'check_by_invoice' || !invoiceId) {
        return res.status(400).json({ error: "Missing or invalid parameters" });
    }

    const apiKey = getUPaymentsApiKey();
    if (!apiKey) return res.status(500).json({ error: "Missing config" });

    try {
        const baseUrl = "https://apiv2api.upayments.com/api/v1";
        
        console.log(`Verifying payment ID: ${paymentId}`);
        let response = await fetch(`${baseUrl}/get-payment-status/${paymentId}`, {
            method: 'GET',
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${apiKey}`
            }
        });
        
        // If the first endpoint doesn't find it, try the other endpoint
        if (response.status === 404 || response.status === 400) {
            response = await fetch(`${baseUrl}/charge/${paymentId}`, {
                method: 'GET',
                headers: {
                    "Accept": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                }
            });
        }
        
        const contentType = response.headers.get("content-type");
        let data;
        if (contentType && contentType.includes("application/json")) {
            data = await response.json();
        } else {
            const text = await response.text();
            console.error("Non-JSON UPayments API error:", text);
            return res.status(response.status).json({ error: "Verification request failed", details: text });
        }
        
        if (data && (data.status === true || data.status === 'success' || data.status === 1 || !data.error) && data.data && (data.data.result === 'CAPTURED' || data.data.result === 'SUCCESS' || data.data.status === 'success' || data.data.status === 'CAPTURED')) {
            const returnedInvoiceId = data.data.order_id || data.data.reference?.id || data.data.orderId || invoiceId;
            return res.json({ success: true, verified: true, invoiceId: returnedInvoiceId });
        } else {
            console.log("Upayments charge-verify failed. Data:", JSON.stringify(data));
            return res.json({ success: true, verified: false, debugData: data });
        }
    } catch (e) {
        console.error("Error verifying payment:", e);
        return res.status(500).json({ error: "Verification failed" });
    }
  });
  app.get("/api/invoice/:id", async (req, res) => {
    // Disabled server-side DB fetch due to missing Google Cloud IAM credentials (admin SDK Service Account).
    // The frontend should fetch data from Firebase Client SDK, or the user needs to provide a private key JSON.
    res.status(503).json({ error: "Service unavailable without service account credentials." });
  });

  // Specific 404 for API to prevent falling through to React
  // ALERTS_WORKER_FINAL_CLEAN_V2_ROOT_PUSH_START
  const ALERTS_ADMIN_TEST_SECRET = process.env.ADMIN_TEST_SECRET || "123456";
  const ALERTS_LOOKBACK_MINUTES = Number(process.env.ALERTS_LOOKBACK_MINUTES || "1440");
  const ALERTS_MAX_SEND_PER_RUN = Number(process.env.ALERTS_MAX_SEND_PER_RUN || process.env.MAX_SEND_PER_RUN || "100");
  const ALERTS_START_FROM_ISO = process.env.ALERTS_START_FROM_ISO || "";

  function alertsRequireSecret(req: any, res: any, next: any) {
    const secret = req.headers["x-admin-secret"] || req.query.secret;
    if (String(secret) !== String(ALERTS_ADMIN_TEST_SECRET)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  }

  function alertsIdsFor(x: any) {
    return [x?.id, x?.invoiceId, x?.invoiceNo, x?.orderId, x?.orderNo, x?.number, x?.tracked_order, x?.requested_order_id]
      .filter(Boolean).map(String);
  }

  function alertsDateFromBusinessId(id: any) {
    const m = String(id || "").match(/^(INV|ORD)-(\d{13})-/);
    if (!m) return null;
    const d = new Date(Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function alertsDateValue(v: any) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.toDate) return v.toDate();
    if (v?.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function alertsBestDate(x: any) {
    for (const id of alertsIdsFor(x)) {
      const d = alertsDateFromBusinessId(id);
      if (d) return d;
    }
    return alertsDateValue(x?.createdAt || x?.created_at || x?.date || x?.updatedAt || x?.paymentUpdatedAt || x?.failedAt || x?.paidAt);
  }

  function alertsInWindow(itemOrId: any, now = new Date()) {
    const d = typeof itemOrId === "string" ? alertsDateFromBusinessId(itemOrId) : alertsBestDate(itemOrId);
    if (!d) return false;
    const cutoff = ALERTS_START_FROM_ISO ? new Date(ALERTS_START_FROM_ISO) : null;
    if (cutoff && d < cutoff) return false;
    const lookback = new Date(now.getTime() - ALERTS_LOOKBACK_MINUTES * 60 * 1000);
    return d >= lookback;
  }

  function alertsBusinessIdFor(x: any, prefix = "") {
    const ids = alertsIdsFor(x);
    if (prefix) return ids.find((id: string) => id.startsWith(prefix)) || "";
    return ids.find((id: string) => /^INV-\d{13}-/.test(id) || /^ORD-\d{13}-/.test(id)) || ids[0] || "";
  }

  function alertsStatusFor(x: any) {
    return String(x?.status || x?.paymentStatus || x?.payment_status || x?.state || "").toLowerCase();
  }
  function alertsIsPaid(s: string) { return s.includes("paid") || s.includes("captured") || s.includes("تم الدفع") || s.includes("مدفوع") || s.includes("جاري التوصيل"); }
  function alertsIsFailed(s: string) { return s.includes("failed") || s.includes("not captured") || s.includes("declined") || s.includes("فشل") || s.includes("فشلت"); }
  function alertsIsPending(s: string) {
    return s === "" || s.includes("pending") || s.includes("pending_payment") || s.includes("payment_pending_immediate") ||
      s.includes("order_created_pending_payment") || s.includes("unpaid") || s.includes("بانتظار") ||
      s.includes("انتظار الدفع") || s.includes("لم يدفع") || s.includes("لم تُدفع") || s.includes("waiting");
  }
  function alertsIsCancelled(s: string) { return s.includes("cancelled") || s.includes("canceled") || s.includes("ملغي") || s.includes("ملغى") || s.includes("تم الإلغاء") || s.includes("تم الالغاء"); }
  function alertsIsQatiaExpired(s: string) { return s.includes("انتهى وقت القطية") || s.includes("انتهى وقت القطيه") || s.includes("ملغي - انتهى وقت القطية") || s.includes("ملغي - انتهى وقت القطيه") || s.includes("qatia expired") || s.includes("split expired"); }
  function alertsIsRoulette(item: any, s: string) { return s.includes("روليت") || s.includes("roulette") || String(item?.type || "").toLowerCase().includes("roulette") || String(item?.orderType || "").toLowerCase().includes("roulette") || String(item?.splitType || "").toLowerCase().includes("roulette"); }
  function alertsIsQatiaLike(item: any, s: string) {
    return !alertsIsRoulette(item, s) && (
      s.includes("قطية") || s.includes("قطيه") || s.includes("split") ||
      String(item?.type || "").toLowerCase().includes("qatia") || String(item?.type || "").toLowerCase().includes("split") ||
      String(item?.orderType || "").toLowerCase().includes("qatia") || String(item?.orderType || "").toLowerCase().includes("split") ||
      String(item?.splitType || "").toLowerCase().includes("qatia") || String(item?.splitType || "").toLowerCase().includes("split") ||
      Array.isArray(item?.splitParticipants) || Boolean(item?.splitPayments)
    );
  }
  function alertsAmountText(x: any) {
    const n = Number(x?.totalAmount ?? x?.total ?? x?.amount ?? x?.price ?? 0);
    return Number.isFinite(n) && n > 0 ? ` — القيمة ${n.toFixed(3)} د.ك` : "";
  }

  async function alertsLatestActiveToken() {
    const snap = await db.collection("pushTokens").where("active", "==", true).get();
    const docs = snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))
      .filter((x: any) => Boolean(x.data.token))
      .sort((a: any, b: any) => {
        const at = a.data.updatedAt?.toMillis ? a.data.updatedAt.toMillis() : 0;
        const bt = b.data.updatedAt?.toMillis ? b.data.updatedAt.toMillis() : 0;
        return bt - at;
      });
    return docs[0]?.data?.token || null;
  }

  let __alertsPushEventsCache = { time: 0, docs: [] as any[], knownIds: new Set<string>() };

  async function alertsReadRecentPushEvents(limit = 100) {
    const now = Date.now();
    if (now - __alertsPushEventsCache.time < 5 * 60 * 1000) {
        return { docs: __alertsPushEventsCache.docs };
    }
    try { 
        const snap = await db.collection("pushEvents").orderBy("createdAt", "desc").limit(limit).get(); 
        __alertsPushEventsCache.time = now;
        __alertsPushEventsCache.docs = snap.docs;
        snap.docs.forEach((d: any) => __alertsPushEventsCache.knownIds.add(d.id));
        return snap;
    }
    catch (e1: any) { 
        try { 
            const snap = await db.collection("pushEvents").limit(limit).get(); 
            __alertsPushEventsCache.time = now;
            __alertsPushEventsCache.docs = snap.docs;
            snap.docs.forEach((d: any) => __alertsPushEventsCache.knownIds.add(d.id));
            return snap;
        }
        catch (e2: any) { 
            if (e2.message && e2.message.includes("PERMISSION_DENIED")) {
                console.log("[ALERTS] Failed to fetch pushEvents: Error: 7 PERMISSION_DENIED: Missing or insufficient permissions. (Continuing safely without ADC)");
            } else {
                console.error("[ALERTS] Failed to fetch pushEvents:", e2);
            }
            return { docs: [] }; 
        }
    }
  }

  async function alertsClaim(eventId: string, payload: any = {}) {
    if (__alertsPushEventsCache.knownIds.has(eventId)) {
        return false;
    }

    const ref = db.collection("pushEvents").doc(eventId);

    try {
      await ref.create({
        eventId,
        source: "alerts-worker-final-clean-v3-idempotent",
        status: "claimed",
        payload: removeUndefinedDeep(payload),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        claimedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      __alertsPushEventsCache.knownIds.add(eventId);
      return true;
    } catch (e: any) {
      const code = String(e?.code || e?.message || "");
      if (code.includes("ALREADY_EXISTS") || code.includes("already exists") || code.includes("6")) {
        __alertsPushEventsCache.knownIds.add(eventId);
        return false;
      }

      const snap = await ref.get();
      if (snap.exists) {
        __alertsPushEventsCache.knownIds.add(eventId);
        return false;
      }

      throw e;
    }
  }

  async function alertsMarkSent(eventId: string, result: any) {
    await db.collection("pushEvents").doc(eventId).set({
      eventId,
      source: "alerts-worker-final-clean-v3-idempotent",
      status: result?.success || result?.mocked ? "sent" : "send_failed",
      result,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    __alertsPushEventsCache.knownIds.add(eventId);
  }

  async function alertsSendDataOnly({ title, body, alertType, eventId, url }: any) {
    return await sendSmartAlertPushNotification({
      title: String(title || "تنبيه"),
      body: String(body || ""),
      alertType: String(alertType || "general"),
      url: String(url || "https://admin.alturathkw.shop/"),
      eventId: String(eventId || `safe-worker-${Date.now()}`),
    });
  }

  async function alertsSendOnce(results: any[], eventId: string, payload: any, dryRun: boolean, counters: any) {
    if (dryRun) { results.push({ eventId, dryRun: true, payload }); return; }
    if (counters.sent >= ALERTS_MAX_SEND_PER_RUN) { results.push({ eventId, skipped: true, reason: "max-send-per-run-reached" }); return; }
    const canSend = await alertsClaim(eventId, payload);
    if (!canSend) { results.push({ eventId, skipped: true, reason: "already-sent-or-claimed" }); return; }
    const result = await alertsSendDataOnly({ ...payload, eventId });
    if (result.success || result.mocked) {
      counters.sent += 1;
    }
    await alertsMarkSent(eventId, result);
    results.push({ eventId, result });
  }

  async function alertsGetRecentFailedInvoiceIdsFromPushEvents() {
    const snap = await alertsReadRecentPushEvents(1000);
    const ids = new Set<string>();
    for (const doc of snap.docs) {
      const raw = `${doc.id} ${JSON.stringify(doc.data() || {})}`;
      const looksFailed = raw.includes("invoice-failed") || raw.includes("invoice_failed") || raw.includes("فشل دفع فاتورة") || raw.includes("فشل دفع الفاتورة");
      if (!looksFailed) continue;
      const matches = raw.match(/INV-\d{13}-[A-Z0-9]+/g) || [];
      for (const id of matches) if (alertsInWindow(id)) ids.add(id);
    }
    return Array.from(ids);
  }

  async function alertsSyncFailedInvoicesFromPushEvents() {
    const failedInvoiceIds = await alertsGetRecentFailedInvoiceIdsFromPushEvents();
    if (failedInvoiceIds.length === 0) return { updated: 0, ids: [] };
    const ref = db.collection("appData").doc("shared_company_data");
    let snap;
    try {
      snap = await ref.get();
    } catch (e: any) {
      if (e.message && e.message.includes("PERMISSION_DENIED")) {
        console.log("[ALERTS] alertsSyncFailedInvoicesFromPushEvents get failed: PERMISSION_DENIED (Continuing safely)");
      } else {
        console.error("[ALERTS] alertsSyncFailedInvoicesFromPushEvents get failed:", e);
      }
      return { updated: 0, ids: [] };
    }
    const shared = snap.data() || {};
    let invoices = Array.isArray(shared.invoices) ? [...shared.invoices] : [];
    let orders = Array.isArray(shared.orders) ? [...shared.orders] : [];
    const markFailed = (id: string, item: any = {}) => ({ ...item, id, invoiceId: id, invoiceNo: id, tracked_order: id, requested_order_id: id, source: item?.source || "payment-return-failed-event", type: item?.type || "admin_invoice", status: "فشل في عملية الدفع", paymentStatus: "failed", payment_status: "failed", paid: false, failed: true, canPay: true, createdAt: item?.createdAt || alertsDateFromBusinessId(id)?.toISOString() || new Date().toISOString(), failedAt: item?.failedAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
    let updated = 0;
    for (const id of failedInvoiceIds) {
      const invoiceMatches = invoices.filter((x: any) => alertsIdsFor(x).includes(id));
      const orderMatches = orders.filter((x: any) => alertsIdsFor(x).includes(id));
      const base = invoiceMatches[invoiceMatches.length - 1] || orderMatches[orderMatches.length - 1] || { id, invoiceId: id, invoiceNo: id, tracked_order: id, requested_order_id: id, source: "payment-return-failed-event", type: "admin_invoice" };
      invoices = [...invoices.filter((x: any) => !alertsIdsFor(x).includes(id)), markFailed(id, base)];
      orders = orders.filter((x: any) => !alertsIdsFor(x).includes(id));
      updated += 1;
    }
    if (updated > 0) await ref.set({ invoices, orders, updatedAt: new Date().toISOString(), lastAutoSyncedFailedInvoicesFinalCleanV2: { ids: failedInvoiceIds, updated, at: new Date().toISOString() } }, { merge: true });
    return { updated, ids: failedInvoiceIds };
  }

  async function alertsLoadSharedData() {
    try {
      const snap = await db.collection("appData").doc("shared_company_data").get();
      return snap.data() || {};
    } catch (e: any) {
      if (e.message && e.message.includes("PERMISSION_DENIED")) {
          console.log("[ALERTS] Failed to load shared_company_data: Error: 7 PERMISSION_DENIED: Missing or insufficient permissions. (Continuing safely without ADC)");
      } else {
          console.error("[ALERTS] Failed to load shared_company_data:", e);
      }
      return {};
    }
  }

  let __alertsReconcileInMemoryLock = false;

  async function alertsReconcile({ dryRun = false } = {}) {
    if (!firebaseInitialized || !db) return { meta: { sent: 0, status: "firebase-not-initialized" }, results: [] };
    if (__alertsReconcileInMemoryLock && !dryRun) {
      return { meta: { sent: 0, status: "already-running" }, results: [] };
    }

    __alertsReconcileInMemoryLock = !dryRun;

    try {
    const counters = { sent: 0 };
	    const results: any[] = [];
	    const now = new Date();
	    const pendingPaymentGraceAgo = new Date(now.getTime() - PAYMENT_PENDING_GRACE_MS);
	    const paymentFailureGraceAgo = new Date(now.getTime() - PAYMENT_FAILURE_GRACE_MS);
	    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);
    let syncResult = { updated: 0, ids: [] as string[] };
    if (!dryRun) syncResult = await alertsSyncFailedInvoicesFromPushEvents();
    const failedInvoiceIds = new Set(await alertsGetRecentFailedInvoiceIdsFromPushEvents());
    const shared = await alertsLoadSharedData();
    const invoices = Array.isArray(shared.invoices) ? shared.invoices : [];
    const orders = Array.isArray(shared.orders) ? shared.orders : [];

    for (const inv of invoices) {
      const invoiceId = alertsBusinessIdFor(inv, "INV-");
      if (!invoiceId || !alertsInWindow(inv, now)) continue;
      const st = alertsStatusFor(inv);
      if (failedInvoiceIds.has(invoiceId) || alertsIsFailed(st)) {
        const d = alertsBestDate(inv) || now;
        if (d > paymentFailureGraceAgo) continue;
        await alertsSendOnce(results, `safe-worker-invoice-failed-${invoiceId}`, {
          title: "❌ فشلت عملية الدفع",
          body: `فشلت عملية الدفع للفاتورة ${invoiceId}${alertsAmountText(inv)}`,
          alertType: "invoice_payment_failed",
          url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}`
        }, dryRun, counters);
        continue;
      }
      if (alertsIsPaid(st)) { await alertsSendOnce(results, `safe-worker-invoice-paid-${invoiceId}`, { title: "✅ تم دفع فاتورة", body: `تم دفع الفاتورة ${invoiceId}${alertsAmountText(inv)}`, alertType: "invoice_paid", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters); continue; }
      if (alertsIsPending(st)) {
        const d = alertsBestDate(inv) || now;
        if (d <= pendingPaymentGraceAgo) await alertsSendOnce(results, `safe-worker-invoice-pending-immediate-${invoiceId}`, { title: "⏳ فاتورة لم تُدفع", body: `الفاتورة ${invoiceId} لم يتم دفعها بعد ${PAYMENT_PENDING_GRACE_LABEL}${alertsAmountText(inv)}`, alertType: "invoice_pending_immediate", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters);
        if (d <= tenMinutesAgo) await alertsSendOnce(results, `safe-worker-invoice-pending-10min-${invoiceId}`, { title: "⏳ فاتورة لم تُدفع بعد 10 دقائق", body: `الفاتورة ${invoiceId} لم تُدفع بعد 10 دقائق${alertsAmountText(inv)}`, alertType: "invoice_pending_10min", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters);
      }
    }

    for (const order of orders) {
      const orderId = alertsBusinessIdFor(order, "ORD-");
      if (!orderId || !alertsInWindow(order, now)) continue;
      const st = alertsStatusFor(order);
      const qatia = alertsIsQatiaLike(order, st);
      if (qatia && alertsIsPaid(st) && !alertsIsQatiaExpired(st)) { await alertsSendOnce(results, `safe-worker-qatia-completed-${orderId}`, { title: "✅ اكتملت القطية", body: `اكتملت القطية للطلب ${orderId} — تم الدفع وجاري التوصيل${alertsAmountText(order)}`, alertType: "qatia_completed", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (qatia && alertsIsQatiaExpired(st)) { await alertsSendOnce(results, `safe-worker-qatia-expired-${orderId}`, { title: "⏰ ملغي - انتهى وقت القطية", body: `الطلب ${orderId} تم إلغاؤه لانتهاء وقت القطية${alertsAmountText(order)}`, alertType: "qatia_expired", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (qatia) continue;
      if (alertsIsFailed(st)) {
        const d = alertsBestDate(order) || now;
        if (d > paymentFailureGraceAgo) continue;
        await alertsSendOnce(results, `safe-worker-payment-failed-${orderId}`, { title: "❌ فشل دفع طلب", body: `فشل دفع الطلب ${orderId}${alertsAmountText(order)}`, alertType: "payment_failed", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue;
      }
      if (alertsIsPaid(st)) { await alertsSendOnce(results, `safe-worker-payment-paid-${orderId}`, { title: "✅ تم دفع طلب", body: `تم دفع الطلب ${orderId}${alertsAmountText(order)}`, alertType: "payment_paid", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (alertsIsCancelled(st)) { await alertsSendOnce(results, `safe-worker-order-cancelled-admin-${orderId}`, { title: "🚫 تم إلغاء طلب", body: `تم إلغاء الطلب ${orderId}${alertsAmountText(order)}`, alertType: "order_cancelled_admin", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (alertsIsPending(st)) {
        const d = alertsBestDate(order) || now;
        if (d <= pendingPaymentGraceAgo) await alertsSendOnce(results, `safe-worker-payment-pending-immediate-${orderId}`, { title: "⏳ طلب لم يدفع", body: `الطلب ${orderId} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${alertsAmountText(order)}`, alertType: "payment_pending_immediate", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters);
        if (d <= tenMinutesAgo) await alertsSendOnce(results, `safe-worker-payment-pending-10min-${orderId}`, { title: "⏳ طلب لم يُدفع بعد 10 دقائق", body: `الطلب ${orderId} لم يُدفع بعد 10 دقائق${alertsAmountText(order)}`, alertType: "payment_pending_10min", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters);
      }
    }
    return { meta: { lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN, startFromIso: ALERTS_START_FROM_ISO || null, sent: counters.sent, syncFailedInvoices: syncResult }, results };
    } finally {
      if (!dryRun) __alertsReconcileInMemoryLock = false;
    }
  }

  app.get("/api/push/alerts-status", async (_req, res) => {
    try {
      if (!firebaseInitialized || !db) return res.status(500).json({ ok: false, error: "Firebase Admin not initialized" });
      res.json({ ok: true, route: "/api/push/alerts-status", service: "alerts-worker-final-clean-v3-idempotent", lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN, startFromIso: ALERTS_START_FROM_ISO || null });
    } catch (e: any) { res.status(500).json({ ok: false, error: e?.message || String(e) }); }
  });

  
// Auto-run payment alerts worker every 60 seconds
// This makes payment notifications automatic instead of requiring manual curl.
let __paymentAlertsAutoRunnerStarted = false;

function startPaymentAlertsAutoRunner() {
  if (__paymentAlertsAutoRunnerStarted) return;
  __paymentAlertsAutoRunnerStarted = true;

  console.log("[ALERTS] Auto runner started: every 60 seconds");

  setInterval(async () => {
    if (!firebaseInitialized || !db) return; // Silent if not ready
    try {
      const { meta } = await alertsReconcile({ dryRun: false });

      if (meta?.sent > 0) {
        console.log("[ALERTS] Auto runner sent:", meta.sent);
      } else {
        console.log("[ALERTS] Auto runner checked:", meta?.sent ?? 0);
      }
    } catch (error) {
      console.error("[ALERTS] Auto runner error:", error);
    }
  }, 60 * 1000);
}

if (String(process.env.ENABLE_INTERNAL_ALERTS_RUNNER || "true").toLowerCase() !== "false") {
  startPaymentAlertsAutoRunner();
} else {
  console.log("[ALERTS] Internal auto runner disabled by ENABLE_INTERNAL_ALERTS_RUNNER=false; Cloud Scheduler is responsible.");
}


app.get("/api/push/alerts-debug", alertsRequireSecret, async (_req, res) => {
    try {
      const tokenSnap = await db.collection("pushTokens").where("active", "==", true).get();
      const sharedSnap = await db.collection("appData").doc("shared_company_data").get();
      const shared = sharedSnap.data() || {};
      res.json({ ok: true, activePushTokens: tokenSnap.docs.filter((d: any) => Boolean(d.data()?.token)).length, hasSharedCompanyData: sharedSnap.exists, invoicesCount: Array.isArray(shared.invoices) ? shared.invoices.length : 0, ordersCount: Array.isArray(shared.orders) ? shared.orders.length : 0, lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN });
    } catch (e: any) { res.status(500).json({ ok: false, error: e?.message || String(e) }); }
  });

  const alertsRunHandler = async (req: any, res: any) => {
    try {
      const dryRun = req.query.dryRun === "1" || req.body?.dryRun === true;
      const { meta, results } = await alertsReconcile({ dryRun });
      res.json({ success: true, checkedAt: new Date().toISOString(), ...meta, resultsCount: results.length, results });
    } catch (e: any) {
      console.error("[alerts-worker-final-clean-v3-idempotent] error", e);
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  };

  app.get("/api/push/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.post("/api/push/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.get("/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.post("/run-alerts", alertsRequireSecret, alertsRunHandler);
  // ALERTS_WORKER_FINAL_CLEAN_V2_ROOT_PUSH_END


  app.post("/api/ai/quick-messages", express.json({ limit: "2mb" }), async (req, res) => {
    try {
      const { category } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Missing category" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on server", needsKey: true });
      }

      const prompt = `
      بصفتك خبير تسويق كويتي ذكي ومبدع. قم بتوليد 3 رسائل قصيرة جداً للانستغرام (Caption or Story) تتناسب مع طبيعة العمل (حلويات ومطاعم) في الكويت.
      
      التصنيف المطلوب: ${category === 'motivation' ? 'تحفيزي وإيجابي' : category === 'engagement' ? 'تفاعلي مع المتابعين (سؤال أو نقاش)' : 'ترويجي سريع لمنتج'}.
      
      الشروط:
      1. اللهجة: كويتية بيضاء راقية ومحببة.
      2. الطول: لا تتجاوز سطرين.
      3. الشخصية: مرحة، قريبة من القلب، وتعكس روح "مطبخ التراث الكويتي".
      4. المحتوى: استخدم كلمات مثل "ناطع"، "خنين"، "يبرد الجبد"، "من الآخر".
      
      أخرج النتيجة بصيغة JSON فقط:
      {
        "messages": ["رسالة 1", "رسالة 2", "رسالة 3"]
      }
    `;

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resText = response.text;
      if (!resText) throw new Error("Empty AI response");

      let jsonPayload = resText;
      const match = resText.match(/```json\n?([\s\S]*?)\n?```/) || resText.match(/{[\s\S]*}/);
      if (match) {
        jsonPayload = match[1] || match[0];
      }
      
      res.json(JSON.parse(jsonPayload));
    } catch (e: any) {
      console.error("[Quick Messages API Error]", e);
      res.status(500).json({ error: "Failed to generate messages" });
    }
  });

  app.post("/api/ai/assistant", express.json({ limit: "2mb" }), async (req, res) => {
    try {
      const { message, systemPrompt } = req.body || {};
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Missing message" });
      }
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on server", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        config: {
          systemInstruction: typeof systemPrompt === "string" && systemPrompt.trim()
            ? systemPrompt
            : "أنت مساعد إداري ذكي. أجب بالعربية وباختصار ووضوح."
        },
        contents: [{ role: "user", parts: [{ text: message }] }]
      });

      return res.json({ text: response.text || "" });
    } catch (e: any) {
      console.error("/api/ai/assistant error:", e);
      const errMsg = e?.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "مفتاح Gemini موقوف أو غير صالح. يرجى تحديث مفتاح الذكاء الاصطناعي في السيرفر.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("depleted")) {
        return res.status(429).json({ error: "تم استنفاد رصيد أو حصة Gemini. يرجى مراجعة AI Studio / Billing.", needsKey: true });
      }
      return res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/generate", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { imageContent, mimeType, format, theme, mood, realityMode, backgroundPreset, strictPlateLock, realityBoost, correctionHint, tasteProfile } = req.body;
      if (!imageContent) return res.status(400).json({ error: "Missing image" });
      
      const systemInstruction = "أنت مصور أطعمة بشري محترف ومدير فني لطلبات كويتية منزلية واقعية. هدفك جعل الصورة تبدو مصورة بكاميرا حقيقية في الكويت لطلب منزلي/ديوانية/شاليه/مزرعة/جاخور/زوارة/توصيل، وليس مولدة بالذكاء الاصطناعي. النشاط متخصص أساساً في العيوش والأكل الشعبي والأسماك والمحاشي وورق العنب، والمشاوي خيار ثانوي فقط؛ لا تتعامل معه كمطعم جلوس أو كافيه أو محل قهوة.";
      const realityModeMap: Record<string, string> = {
        human: "تصوير بشري/آيفون: لقطة يد بشرية غير مثالية قليلاً، زاوية طبيعية، ألوان واقعية، بدون كمال استوديو مبالغ.",
        restaurant: "طلب كويتي واقعي: سفرة بيتية أو ديوانية أو شاليه أو تجهيز توصيل، إضاءة دافئة، خلفية عملية قابلة للتصديق بدون إيحاء مطعم جلوس.",
        menu: "منيو طلبات نظيف: تصوير قائمة طلبات حقيقي، سطح نظيف، ظل طبيعي، تركيز واضح، بدون شكل CGI.",
        luxury: "إعلان بشري فاخر: فخامة مقيدة وممكنة داخل بيت/ديوانية/طلب توصيل حقيقي، خامات واقعية، بدون قصر أو ديكور خيالي.",
        finalBoss: "Reality Final Boss: لقطة بشرية فائقة التصديق، ليست أجمل من اللازم، طلب كويتي واقعي أولاً وإعلان ثانياً، منظور كاميرا طبيعي وعيوب خفيفة مقنعة."
      };
      const backgroundMap: Record<string, string> = {
        "wood-table": "خلفية طاولة خشب حقيقية لطلب كويتي، سطح عادي ومناديل بسيطة وإضاءة دافئة بدون إحساس مطعم جلوس.",
        "marble-table": "خلفية رخام أبيض/هادئ لطلب منزلي أو منيو طلبات، انعكاس خفيف وظلال صحيحة.",
        "pickup-counter": "خلفية كاونتر استلام طلبات حقيقي، سطح عملي ورفوف ضبابية بدون أي نص مقروء.",
        "open-kitchen": "خلفية مطبخ تحضير مفتوح، ستانلس ستيل وضوء عملي ونظافة حقيقية غير مثالية.",
        "window-booth": "خلفية زجاج/ضوء طبيعي في بيت أو مكان طلب، شارع/واجهة blur بدون لافتات مقروءة وبدون إيحاء مطعم.",
        "delivery-packaging": "خلفية توصيل وسفري واقعية، كيس/علب plain بدون شعارات أو نصوص، على طاولة أو كاونتر.",
        "busy-dining-blur": "خلفية يمعة مشغولة blur، silhouettes بشرية غير واضحة وبدون وجوه قابلة للتعرف، إحساس ديوانية/بيت لا مطعم.",
        "neutral-menu": "خلفية منيو طلبات نظيفة: سطح matte وجدار محايد وظلال ناعمة بدون أي props مبالغ.",
        "home-table": "خلفية سفرة بيتية كويتية حقيقية، ترتيب عائلي نظيف، ضوء طبيعي، بدون مطعم وبدون ديكور مصطنع.",
        "diwaniya-table": "خلفية ديوانية كويتية عصرية واقعية، سفرة ربع وطلب جماعي، إضاءة دافئة، بدون وجوه واضحة، بدون دلة أو بخور أو سدو.",
        "chalet-spread": "خلفية شاليه كويتي واقعية، طلبات مرتبة ليمعة الويكند، ضوء نهاري أو غروب ناعم، بدون مبالغة.",
        "farm-gathering": "خلفية مزرعة كويتية بسيطة وواقعية، سفرة خارجية نظيفة، ظل طبيعي، طلب جماعي بدون زخارف تراثية مصطنعة.",
        "jakhour-setup": "خلفية جاخور كويتي عملي وراقي، طلبات للربع على طاولة بسيطة، إضاءة واقعية، بدون فوضى أو ديكور مبالغ.",
        "zowara-spread": "خلفية زوارة أو عزيمة كويتية داخل بيت، سفرة عائلية مرتبة، دفء وواقعية بدون مطعم.",
      };
      const chosenMode = realityModeMap[realityMode || "restaurant"] || realityModeMap.restaurant;
      const chosenBackground = backgroundMap[backgroundPreset || "wood-table"] || backgroundMap["wood-table"];
      let autoPrompt = `بناءً على الصورة المرفقة للطبق، أنشئ صورة فوتوغرافية بشرية واقعية جداً لطلب كويتي منزلي/ديوانية/شاليه/مزرعة/جاخور/زوارة/توصيل.

قواعد قفل الطبق (غير قابلة للكسر):
- حافظ على الطبق/الصحن/الوعاء نفسه، نفس الطعام، نفس المكونات، نفس الصوص، نفس القوام، نفس الكمية، نفس الحواف، نفس طريقة التقديم.
- ممنوع اختراع مكونات، ممنوع تغيير الصحن، ممنوع إضافة/حذف توبنغ، ممنوع تبديل الوصفة.
- المسموح فقط: ترتيب بسيط للحواف، تحسين قص خفيف، دمج إضاءة وظلال واقعية، وتغيير الخلفية/الطاولة/العمق فقط.
${strictPlateLock !== false ? '- قفل صارم: لا تبدّل الصحن إطلاقاً، لا تغيّر شكل الطبق، لا تضف أو تحذف أي مكون حتى لو كان التحسين أجمل.\n' : ''}

قواعد هوية الطلب الكويتي والمكان الواقعي:
- هوية النشاط: عيوش، أكل شعبي، أسماك، محاشي، ورق عنب، ومشاوي أحياناً؛ الطلبات منزلية وتصل للبيت والديوانية والشاليه والمزرعة والجاخور والزوارة؛ ممنوع تحويل المشهد إلى مطعم جلوس أو كافيه أو قهوة أو ديكور ضيافة.
- الخلفية يجب أن تبدو من بيئة كويتية حقيقية للطلب أو اليمعة أو التوصيل، لا مطعم جلوس، لا ديكور خيالي ولا قصر ولا CGI ولا 3D render.
- استخدم عناصر طلب كويتي قابلة للتصديق فقط: سفرة بيتية، ديوانية، شاليه، طاولة مزرعة/جاخور، كاونتر تجهيز، جدار محايد، زجاج، مطبخ ستانلس، منديل، كوب ماء بسيط، تغليف plain.
- أضف عيوب تصوير بشرية بسيطة: منظور 35mm/50mm، نعومة عدسة خفيفة، ظل صحيح، scale منطقي، انعكاسات قليلة، عدم تماثل مثالي.
- اترك مساحة هادئة للهوية/النص لاحقاً، لكن لا تضع أي نص داخل الصورة.
${realityBoost ? '- تفعيل Reality Final Boss: اجعل المكان كويتياً عادياً ومقنعاً قبل أن يكون جميلاً؛ تجنب اللمعان الزائد، الخلفية الفارغة الفاخرة، العمق غير المنطقي، والديكور المثالي. أضف عيوب تصوير بشرية صغيرة وظلال تلامس حقيقية.\n' : ''}${tasteProfile ? `- ذاكرة ذوق المستخدم: ${String(tasteProfile).slice(0, 900)}\n` : ''}${correctionHint ? `- طلب تحسين إضافي من المستخدم: ${correctionHint}\n` : ''}

الاختيارات الحالية:
- الثيم: ${theme || 'طلب كويتي واقعي'}.
- المود الفني: ${mood || 'دافئ'}.
- وضع الواقع: ${chosenMode}
- مكتبة الخلفية: ${chosenBackground}

حظر صارم جداً:
- ممنوع دلة، دلال، قهوة عربية، قهوة، فناجين، أكواب قهوة، حبوب قهوة، مبخر، بخور، عود، سدو، فوانيس، قصر، دخان مصطنع، زخارف تراثية، نيون مبالغ، أدوات غير مرتبطة، لافتات أو كلمات، وممنوع كلينكس مستخدم أو مناديل مستخدمة أو متسخة أو مكرمشة أو طاولة وصخة أو بقايا أكل أو فتات أو مخلفات ورقية.
- IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO SIGNATURES, NO LOGOS, NO WATERMARKS ANYWHERE IN THE IMAGE.

الهدف النهائي: صورة تجعل العميل يقول: منو المصور؟ يجب أن تبدو تصويراً بشرياً واقعياً في الكويت وليس توليد ذكاء.`;
      
      let width = 768, height = 768;
      let ar = '1:1';
      if (format === '9:16') { width = 720; height = 1280; ar = '9:16'; }
      if (format === '4:3') { width = 960; height = 720; ar = '4:3'; }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on server", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Use the gemini-2.5-flash-image model for ultra-fast generation performance
      const modelName = 'gemini-2.5-flash-image'; 
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: imageContent, mimeType: mimeType || 'image/jpeg' } },
            { text: autoPrompt }
          ]
        },
        config: {
          systemInstruction,
          imageConfig: {
            aspectRatio: ar as any,
            imageSize: '1K'
          }
        }
      });
      
      let finalImgBase64 = null;
      if (response && response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            finalImgBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }
      
      if (!finalImgBase64) {
        const textResp = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
        return res.status(500).json({ error: textResp || "No image output generated" });
      }

      res.json({ imageUrl: finalImgBase64 });
    } catch (e: any) {
      console.error("/api/smart-studio/generate error:", e);
      const errMsg = e.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "عذراً، مفتاح API الخاص بك موقوف (Suspended) أو غير صالح. يرجى مراجعة إعدادات Google Cloud / Gemini API.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "تم استنفاد حصة الاستخدام (Quota Exceeded). يرجى المحاولة لاحقاً.", needsKey: true });
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/generate-from-text", express.json({ limit: "5mb" }), async (req, res) => {
    try {
      const { prompt, format, realityBoost, tasteProfile } = req.body;
      let ar = "1:1";
      if (format === "9:16") { ar = "9:16"; }
      if (format === "4:3") { ar = "4:3"; }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [{ text: `${prompt}\n\nSERVER REALITY ENFORCEMENT: Every smart-studio text image must look like a real human Kuwaiti home-order or gathering photograph for a kitchen focused on rice dishes, fish/seafood, mahshi, grape leaves, and occasional grills; never a dine-in restaurant, cafe, or coffee concept. Use a believable Kuwaiti order background from: home table, diwaniya table, chalet setup, farm gathering, jakhour setup, zowara spread, delivery packaging, prep counter, or neutral menu setup. Make it ordinary and physically plausible before making it beautiful: realistic scale, grounded shadows, natural lens softness, small human-camera imperfections. No dallah, no Arabic coffee, no coffee cups, no coffee beans, no incense, no sadu, no lanterns, no cafe props, no fantasy decor, no palace, no CGI, no text/logos/watermarks, no used tissue, no dirty napkin, no stained napkin, no crumpled kleenex, no table trash, no paper scraps, no dirty table, no leftover crumbs, no leftover mess. ${tasteProfile ? `USER TASTE MEMORY: ${String(tasteProfile).slice(0, 900)} ` : ""}${realityBoost ? "FINAL BOSS: remove any AI tells; make viewers believe this was photographed on location." : ""}` }]
        },
        config: {
          imageConfig: {
            aspectRatio: ar as any,
            imageSize: "1K"
          }
        }
      });

      let finalImgBase64 = null;
      if (response && response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            finalImgBase64 = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
      }

      if (!finalImgBase64) {
        return res.status(500).json({ error: "No image generated" });
      }
      res.json({ imageUrl: finalImgBase64 });
    } catch (e: any) {
      console.error("/api/smart-studio/generate-from-text error:", e);
      const errMsg = e.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "عذراً، مفتاح API الخاص بك موقوف (Suspended) أو غير صالح. يرجى مراجعة إعدادات Google Cloud / Gemini API.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "تم استنفاد حصة الاستخدام (Quota Exceeded). يرجى المحاولة لاحقاً.", needsKey: true });
      }
      res.status(500).json({ error: errMsg });
    }
  });



  app.post("/api/smart-studio/generate-reel", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { prompt, imageContent, mimeType, duration, shotType, format, place, mood, tasteProfile } = req.body || {};
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Missing prompt" });

      const durationSeconds = Math.min(8, Math.max(4, Number(duration) || 4));
      const finalPrompt = `${prompt}\n\nSMART STUDIO REEL ENFORCEMENT:\n- Create a vertical Instagram Reel, aspect ratio 9:16, duration ${durationSeconds} seconds.\n- Brand context: Kuwaiti home-order kitchen focused on rice dishes, seafood/fish, mahshi, grape leaves, and occasional grills.\n- Shot type: ${shotType || "hero-push"}. Place context: ${place || "delivery"}. Mood: ${mood || "warm"}.\n- Ultra-realistic human food videography, simple believable camera movement only.\n- Keep food stable and physically plausible across frames; no morphing food, no melting plates, no warped hands.\n- No visible faces, no readable text, no logos, no watermarks.\n- No used tissues, no dirty napkins, no crumpled kleenex, no table trash, no paper scraps, no crumbs, no messy leftovers.\n- No dallah, no Arabic coffee, no coffee cups, no incense, no sadu, no lanterns, no fantasy decor, no palace, no CGI.\n${tasteProfile ? `User taste memory: ${String(tasteProfile).slice(0, 900)}\n` : ""}\nMake viewers believe it was shot by a real videographer in Kuwait.`;

      if (process.env.SMART_STUDIO_REEL_API_URL) {
        const upstream = await fetch(process.env.SMART_STUDIO_REEL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.SMART_STUDIO_REEL_API_KEY ? { "Authorization": `Bearer ${process.env.SMART_STUDIO_REEL_API_KEY}` } : {})
          },
          body: JSON.stringify({ prompt: finalPrompt, imageContent, mimeType, duration: durationSeconds, format: format || "9:16" })
        });
        const data = await upstream.json().catch(() => null);
        if (!upstream.ok || !data) return res.status(upstream.status || 500).json({ error: data?.error || "Reel API failed" });
        return res.json({ videoUrl: data.videoUrl || data.url || data.video, posterUrl: data.posterUrl || data.thumbnail || null, provider: "custom" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on server", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const parts: any[] = [];
      if (imageContent) parts.push({ inlineData: { data: imageContent, mimeType: mimeType || "image/jpeg" } });
      parts.push({ text: finalPrompt });

      let operation = await (ai as any).models.generateVideos({
        model: process.env.SMART_STUDIO_REEL_MODEL || "veo-3.1-generate-preview",
        prompt: imageContent ? undefined : finalPrompt,
        image: imageContent ? { imageBytes: imageContent, mimeType: mimeType || "image/jpeg" } : undefined,
        config: {
          numberOfVideos: 1,
          durationSeconds,
          aspectRatio: "9:16"
        }
      });

      for (let i = 0; i < 60 && operation && !operation.done; i++) {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        operation = await (ai as any).operations.getVideosOperation({ operation });
      }

      const generated = operation?.response?.generatedVideos?.[0];
      const videoObj = generated?.video || generated;
      const videoUrl = videoObj?.uri || videoObj?.url || generated?.uri || generated?.url;
      const videoBase64 = videoObj?.bytesBase64Encoded || videoObj?.data;

      if (videoUrl) {
        try {
          const downloadPath = path.join(os.tmpdir(), `smart-studio-reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
          await (ai as any).files.download({ file: videoObj || generated, downloadPath });
          const fileBuffer = fsSync.readFileSync(downloadPath);
          try { fsSync.unlinkSync(downloadPath); } catch {}
          return res.json({
            videoUrl: `data:video/mp4;base64,${fileBuffer.toString("base64")}`,
            posterUrl: generated?.thumbnail?.uri || generated?.poster?.uri || null,
            provider: "veo"
          });
        } catch (downloadError) {
          console.warn("/api/smart-studio/generate-reel download fallback:", downloadError);
          return res.json({ videoUrl, posterUrl: generated?.thumbnail?.uri || generated?.poster?.uri || null, provider: "veo" });
        }
      }
      if (videoBase64) return res.json({ videoUrl: `data:video/mp4;base64,${videoBase64}`, posterUrl: null, provider: "veo" });

      return res.status(500).json({ error: "No video output generated" });
    } catch (e: any) {
      console.error("/api/smart-studio/generate-reel error:", e);
      const errMsg = e?.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "مفتاح توليد الفيديو غير صالح أو لا يملك صلاحية توليد الفيديو.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota")) {
        return res.status(429).json({ error: "تم استنفاد حصة توليد الفيديو. يرجى المحاولة لاحقاً." });
      }
      return res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/reality-audit", express.json({ limit: "25mb" }), async (req, res) => {
    try {
      const { imageContent, mimeType } = req.body;
      if (!imageContent) return res.status(400).json({ error: "Missing image" });
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const auditPrompt = `قيّم هذه الصورة كمدقق واقعية لطلب كويتي/يمعة كويتية. أرجع JSON فقط بدون markdown بالشكل التالي:
{"score": number, "verdict": "...", "notes": ["...", "...", "..."], "fixHint": "..."}
المعايير: هل تبدو مصورة بشرياً لطلب كويتي حقيقي في بيت/ديوانية/شاليه/توصيل؟ هل الخلفية مقنعة؟ هل الظلال والscale صحيح؟ هل يوجد شكل CGI أو ديكور خيالي أو نصوص/شعارات داخل الصورة؟ هل يوجد دلة/قهوة/فناجين/بخور/سدو/فوانيس؟ اجعل الملاحظات قصيرة بالعربية.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { data: imageContent, mimeType: mimeType || "image/jpeg" } },
            { text: auditPrompt }
          ]
        }
      });
      const text = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed: any = {};
      try { parsed = JSON.parse(cleaned); } catch { parsed = { score: 88, verdict: "الصورة واقعية غالباً", notes: [cleaned.slice(0, 180)], fixHint: "اجعل الخلفية أبسط والظلال أكثر طبيعية" }; }
      res.json(parsed);
    } catch (e: any) {
      console.error("/api/smart-studio/reality-audit error:", e);
      res.status(500).json({ error: e.message || String(e) });
    }
  });

  app.post("/api/smart-studio/text-ideas", express.json(), async (req, res) => {
    try {
      const { prompt } = req.body;
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const finalPrompt = prompt + "\n- ملاحظة مهمة جداً: لا تستخدم كلمة 'براند' أو 'براندات' أو 'Brandat' في النص نهائياً.";
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: { parts: [{ text: finalPrompt }] },
        config: { temperature: 0.9 }
      });
      res.json({ text: response.text || "" });
    } catch (e: any) {
      console.error("/api/smart-studio/text-ideas error:", e);
      const errMsg = e.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "عذراً، مفتاح API الخاص بك موقوف (Suspended) أو غير صالح. يرجى مراجعة إعدادات Google Cloud / Gemini API.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "تم استنفاد حصة الاستخدام (Quota Exceeded). يرجى المحاولة لاحقاً.", needsKey: true });
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/recommend-scene", express.json({ limit: "18mb" }), async (req, res) => {
    try {
      const { image, productHints, tasteProfile } = req.body;
      if (!image) return res.status(400).json({ error: "Missing image" });

      let base64Data = image;
      let mimeType = "image/jpeg";
      if (typeof image === "string" && image.includes("data:")) {
        const firstCommaIndex = image.indexOf(",");
        const header = image.substring(0, firstCommaIndex);
        mimeType = header.split(":")[1]?.split(";")[0] || "image/jpeg";
        base64Data = image.substring(firstCommaIndex + 1);
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured", needsKey: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const menuHintsText = Array.isArray(productHints)
        ? productHints.slice(0, 60).map((x: any) => String(x).slice(0, 90)).join("\n")
        : "";

      const prompt = `أنت مخرج تصوير واقعي لمطبخ كويتي منزلي متخصص في التوصيل. حلل صورة المنتج المرفقة، ثم اختر أفضل مشهد كويتي موجود فقط من القوائم المسموحة.

هوية المطعم:
- توصيل أطباق كويتية ومنزلية: عيوش، أكل شعبي، أسماك/بحريات، محاشي، ورق عنب، ومشاوي أحياناً.
- الاستخدام للبيت، الديوانية، الشاليه، المزرعة، الجاخور، الزوارة، والتوصيل.
- ممنوع تحويلها لكافيه أو مطعم جلوس أو ضيافة قهوة.
- الواقعية أهم من الفخامة: صورة بشرية كويتية قابلة للتصديق.

أصناف من النظام إن وجدت:
${menuHintsText || "لا توجد قائمة منتجات مرسلة؛ اعتمد على الصورة فقط."}

اختَر JSON فقط بدون markdown:
{
  "productType": "وصف قصير للطبق",
  "reason": "سبب عربي قصير جداً لا يتجاوز 90 حرف",
  "place": "home|diwaniya|chalet|farm|jakhour|zowara|delivery",
  "pulseId": "quick-kuwait|diwaniya-night|chalet-weekend|zowara-family|weekend|rain-cold",
  "mode": "human|restaurant|menu|luxury|finalBoss",
  "background": "home-table|diwaniya-table|chalet-spread|farm-gathering|jakhour-setup|zowara-spread|delivery-packaging|neutral-menu|wood-table|marble-table",
  "mood": "دافئ|بارد|غروب|ناعم",
  "themeHint": "توجيه قصير للصورة",
  "confidence": 0-100
}

قواعد القرار:
- صورة صينية/كمية/طلب جماعي: diwaniya أو zowara أو chalet.
- طبق فردي مرتب/منيو: menu + neutral-menu أو home.
- تغليف/علب/أكياس: delivery + delivery-packaging.
- أكل بيت/عيش/سمك ومحاشي: home أو zowara غالباً.
- إذا الصورة ضعيفة أو عادية: finalBoss مع خلفية بسيطة.
- لا تقترح قهوة، دلة، بخور، سدو، فوانيس، نصوص، شعارات، أو ديكور تراثي مصطنع.
${tasteProfile ? `ذاكرة الذوق: ${String(tasteProfile).slice(0, 700)}` : ""}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt }
            ]
          }
        ],
        config: { temperature: 0.35 }
      });

      const raw = result.text || "{}";
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      let parsed: any = {};
      try { parsed = JSON.parse(match ? match[0] : cleaned); } catch { parsed = {}; }

      const allowedPlaces = new Set(["home", "diwaniya", "chalet", "farm", "jakhour", "zowara", "delivery"]);
      const allowedPulses = new Set(["quick-kuwait", "diwaniya-night", "chalet-weekend", "zowara-family", "weekend", "rain-cold"]);
      const allowedModes = new Set(["human", "restaurant", "menu", "luxury", "finalBoss"]);
      const allowedBackgrounds = new Set(["home-table", "diwaniya-table", "chalet-spread", "farm-gathering", "jakhour-setup", "zowara-spread", "delivery-packaging", "neutral-menu", "wood-table", "marble-table"]);
      const allowedMoods = new Set(["دافئ", "بارد", "غروب", "ناعم"]);

      const fallbackByPlace: Record<string, string> = {
        home: "home-table",
        diwaniya: "diwaniya-table",
        chalet: "chalet-spread",
        farm: "farm-gathering",
        jakhour: "jakhour-setup",
        zowara: "zowara-spread",
        delivery: "delivery-packaging"
      };

      const place = allowedPlaces.has(parsed.place) ? parsed.place : "delivery";
      const response = {
        productType: String(parsed.productType || "طبق كويتي").slice(0, 80),
        reason: String(parsed.reason || "اخترنا مشهداً كويتياً واقعياً يناسب الصورة.").slice(0, 120),
        place,
        pulseId: allowedPulses.has(parsed.pulseId) ? parsed.pulseId : "quick-kuwait",
        mode: allowedModes.has(parsed.mode) ? parsed.mode : "finalBoss",
        background: allowedBackgrounds.has(parsed.background) ? parsed.background : fallbackByPlace[place],
        mood: allowedMoods.has(parsed.mood) ? parsed.mood : "دافئ",
        themeHint: String(parsed.themeHint || "").slice(0, 160),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence || 75)))
      };

      res.json(response);
    } catch (e: any) {
      console.error("/api/smart-studio/recommend-scene error:", e);
      const errMsg = e.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "عذراً، مفتاح API الخاص بك موقوف أو غير صالح.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "تم استنفاد حصة الاستخدام.", needsKey: true });
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/caption", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { image, theme } = req.body;
      if (!image) return res.status(400).json({ error: "Missing image" });
      
      // We expect 'image' to be just the base64 string. 
      // If it contains 'data:', the frontend is sending the whole string by mistake, but we handle it.
      // The image comes from canvas.toDataURL('image/png'), so it's image/png.
      let base64Data = image;
      let mimeType = 'image/png';
      if (image.includes('data:')) {
        const firstCommaIndex = image.indexOf(',');
        const header = image.substring(0, firstCommaIndex);
        mimeType = header.split(':')[1].split(';')[0];
        base64Data = image.substring(firstCommaIndex + 1);
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `بناءً على صورة هذا الطبق المصممة بثيم (${theme})، اكتب نصاً تسويقياً إبداعياً وجذاباً للسوشيال ميديا باللغة العربية (لهجة كويتية بيضاء راقية).\n- ركز على الطعم، الجودة، والتجربة الفريدة.\n- أضف هاشتاقات مناسبة كويتية ذكية ومبتكرة.\n- لا تستخدم كلمة "براند"، "براندات"، أو "Brandat" في النص نهائياً.\n- اجعل النص قصيراً ومؤثراً ومناسباً للنشر فوراً.`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: prompt }
            ]
          }
        ]
      });

      const caption = result.text || "";
      res.json({ caption });
    } catch (e: any) {
      console.error("/api/smart-studio/caption error:", e);
      const errMsg = e.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "عذراً، مفتاح API الخاص بك موقوف (Suspended) أو غير صالح. يرجى مراجعة إعدادات Google Cloud / Gemini API.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED")) {
        return res.status(429).json({ error: "تم استنفاد حصة الاستخدام (Quota Exceeded). يرجى المحاولة لاحقاً.", needsKey: true });
      }
      res.status(500).json({ error: errMsg });
    }
  });

  app.use("/api", (req, res) => {
    console.warn(`404 API Route Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ error: "API Route Not Found", path: req.originalUrl });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log(`PRODUCTION MODE: Serving static files from ${distPath}`);
    
    if (fsSync.existsSync(distPath)) {
      const files = fsSync.readdirSync(distPath);
      console.log(`Found ${files.length} files in dist:`, files.slice(0, 5).join(', '));
    } else {
      console.error(`CRITICAL: dist directory NOT FOUND at ${distPath}`);
    }

    app.use(express.static(distPath, {
      index: false,
      setHeaders: (res, path) => {
        if (path.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        } else {
          // Static assets (js, css, images) can be cached for a long time as they are hashed
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));

    app.get('*all', (req, res) => {
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      
      const indexPath = path.join(distPath, 'index.html');
      if (fsSync.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Build artifacts (index.html) not found. Please ensure the build completed successfully.');
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
