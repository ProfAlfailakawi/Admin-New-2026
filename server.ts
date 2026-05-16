import express from "express";
import path from "path";
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fsSync from 'fs';
import 'dotenv/config';

let firebaseInitialized = false;
let db: any = null;

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

  firebaseInitialized = true;
  console.log("[ADMIN020] Firebase Admin initialized with Cloud Run ADC");
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
  app.use(express.json());

app.use(express.urlencoded({ extended: true }));

  // Webhook for payment gateway
  // It synchronizes payment results to the database even if the user doesn't return to the app.
  const handlePaymentUpdate = async (params: any) => {
    if (!db) return;

    const rawResult = String(params.result || params.status || params.payment || "").replace(/\+/g, " ").trim();
    const normalizedResult = rawResult.toUpperCase();

    const paymentId = params.payment_id || params.track_id || params.tran_id || "";

    const orderId =
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
                    sendSmartAlertPushNotification({
                    title: "✅ تم الدفع",
                    body: `تم دفع الفاتورة ${orderId}${data?.totalAmount ? ` — ${data.totalAmount} د.ك` : ""}`,
                    alertType: "payment_paid",
                    url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(orderId)}`,
                  }).catch(console.error);
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'paid' && data?.status !== 'تم الدفع وجاري التوصيل') {
                        await orderRef.update({ status: 'تم الدفع وجاري التوصيل', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        sendSmartAlertPushNotification({
                        title: "✅ تم الدفع",
                        body: `تم دفع الطلب ${orderId}${data?.total ? ` — ${data.total} د.ك` : ""}`,
                        alertType: "payment_paid",
                        url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`,
                      }).catch(console.error);
                    }
                }
            }
        } else if (isFailed) {
            const invoiceRef = db.collection('invoices').doc(orderId);
            const invSnap = await invoiceRef.get();
            if (invSnap.exists) {
                const data = invSnap.data();
                if (data?.paymentStatus !== 'paid') {
                    await invoiceRef.update({ paymentStatus: 'failed', status: 'فشلت عملية الدفع', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', orderId).get();
                    for (const doc of orderQ.docs) {
                        const oData = doc.data();
                        if (oData.status !== 'تم الدفع وجاري التوصيل' && oData.status !== 'paid') {
                            await doc.ref.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        }
                    }

                    sendSmartAlertPushNotification({
                      title: "❌ فشل دفع فاتورة",
                      body: `الفاتورة ${orderId} فشل دفعها — راجعوا الطلب وأعيدوا إرسال الرابط عند الحاجة`,
                      alertType: "payment_failed",
                      url: `/?invoice=${orderId}`
                    }).catch(console.error);
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'تم الدفع وجاري التوصيل' && data?.status !== 'paid') {
                        await orderRef.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });

                        sendSmartAlertPushNotification({
                          title: "❌ فشل دفع طلب",
                          body: `الطلب ${orderId} فشل دفعه — يحتاج متابعة`,
                          alertType: "payment_failed",
                          url: `/?invoice=${orderId}`
                        }).catch(console.error);
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

      try {
        let orderSnap: any = await db.collection("orders").doc(orderId).get();
        
        if (!orderSnap.exists) {
          const searchableFields = [
            "orderNumber",
            "orderId",
            "id",
            "invoiceNo",
            "invoiceNumber",
            "linkedInvoiceId"
          ];

          for (const field of searchableFields) {
            const querySnap = await db
              .collection("orders")
              .where(field, "==", orderId)
              .limit(1)
              .get();

            if (!querySnap.empty) {
              orderSnap = querySnap.docs[0];
              resolvedOrderId = orderSnap.id;
              break;
            }
          }
        }

        if (orderSnap.exists) {
          order = orderSnap.data() || {};
        } else {
          // Fallback: some app orders are stored inside appData/shared_company_data arrays
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
                resolvedOrderId = found.id || found.orderId || foun
