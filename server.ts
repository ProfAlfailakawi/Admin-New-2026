import express from "express";
import path from "path";
import cors from 'cors';
import admin from 'firebase-admin';
import fsSync from 'fs';
import 'dotenv/config';

let db: FirebaseFirestore.Firestore | undefined;
try {
  const configPath = fsSync.existsSync(path.join(process.cwd(), 'firebase-applet-config.json'))
    ? path.join(process.cwd(), 'firebase-applet-config.json')
    : './firebase-applet-config.json';
      
  const config = JSON.parse(fsSync.readFileSync(configPath, 'utf8'));
  admin.initializeApp({ projectId: config.projectId });
  db = admin.firestore();
} catch (e) {
  console.log("Could not init firebase-admin", e);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Webhook for payment gateway
  // It synchronizes payment results to the database even if the user doesn't return to the app.
  const sendOrderPaymentFailedPushNotification = async ({ orderId, total, orderNumber = '' }: any) => {
    if (!admin.messaging || !db) return;
    try {
      const snap = await db.collection("pushTokens").where("active", "==", true).get();
      if (snap.empty) return;
      const tokens = snap.docs.map(d => d.data().token);

      const message = {
        tokens,
        notification: {
          title: "فشلت عملية الدفع لطلب",
          body: `رقم ${orderNumber || orderId} بقيمة ${String(total)}`
        },
        data: {
          type: "payment_failed",
          orderId: String(orderId),
          orderNumber: String(orderNumber),
          total: String(total),
          url: `/?invoice=${orderId}`
        }
      };
      await admin.messaging().sendEachForMulticast(message);
    } catch (e) {
      console.error("Failed notification error:", e);
    }
  };

  const handlePaymentUpdate = async (params: any) => {
    if (!db) return;

    const result = params.result || params.status || params.payment;
    const paymentId = params.payment_id || params.track_id;
    const orderId = params.track_id || params.order_id || params.reference?.id || params.reference_id;
    
    if (!orderId) return;

    const isPaid = (result === 'CAPTURED' || result === 'SUCCESS' || result === 'success');
    
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
                    sendNewOrderPushNotification({ orderId, total: data?.totalAmount || '' }).catch(console.error);
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'paid' && data?.status !== 'تم الدفع وجاري التوصيل') {
                        await orderRef.update({ status: 'تم الدفع وجاري التوصيل', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        sendNewOrderPushNotification({ orderId, total: data?.total || '' }).catch(console.error);
                    }
                }
            }
        } else if (result === 'NOT CAPTURED' || result === 'FAILED' || result === 'failed' || result === 'CANCELLED' || result === 'cancelled') {
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
                            sendOrderPaymentFailedPushNotification({ orderId: oData.id, total: oData.total, orderNumber: oData.orderNumber }).catch(console.error);
                        }
                    }
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'تم الدفع وجاري التوصيل' && data?.status !== 'paid') {
                        await orderRef.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        sendOrderPaymentFailedPushNotification({ orderId: orderId, total: data?.total, orderNumber: data?.orderNumber }).catch(console.error);
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
      if (!db) return res.status(500).json({ error: "DB not initialized" });
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
          platform: data.platform,
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
      if (!db) return res.status(500).json({ error: "DB not initialized" });
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
      
      console.log("Triggering test-new-order push...");
      const result = await sendNewOrderPushNotification({ 
        orderId, 
        total: total || 0, 
        restaurantId, 
        orderNumber, 
        testNotificationOnly: req.body.testNotificationOnly 
      });
      res.json(result);
    } catch (error: any) {
      console.error("Send push error:", error);
      res.status(500).json({ success: false, error: "Failed to process push notification", details: error.message });
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
      console.error("Send smart alert error:", error);
      res.status(500).json({ success: false, error: "Failed to process smart alert notification", details: error.message });
    }
  });

  app.post("/api/push/save-token", async (req, res) => {
    try {
      const { token, userId, restaurantId, platform, userAgent, vendor, language, standalone, notificationPermission, serviceWorkerController, currentUrl, screen, savedAtClient } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const ua = userAgent || "";
      const isIPhone = /iPhone/i.test(ua);
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isSafariLike = /Safari/i.test(ua);
      const isProbablyPwa = !!standalone;
      const deviceType = isIPhone ? "iphone" : (isIOS ? "ios" : "other");
      
      const crypto = require('crypto');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

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
          vendor,
          language,
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

        await tokenRef.set(data, { merge: true });
      }

      return res.json({ success: true });
    } catch (error: any) {
      console.error("save-token error:", error);
      return res.status(500).json({
        error: "Failed to save token",
        message: error.message
      });
    }
  });

  async function sendNewOrderPushNotification({ orderId, total, restaurantId = 'default', orderNumber = '', testNotificationOnly = false }: any) {
    if (!admin.messaging || !db) return { success: false, error: "Firebase not initialized" };
    const url = `/?invoice=${orderId}`; 
    
    try {
      const snap = await db.collection("pushTokens").where("active", "==", true).get();
      if (snap.empty) return { success: false, error: "No active push tokens found", tokensCount: 0 };
      
      const tokens = snap.docs.map(d => d.data().token);
      
      const message: any = {
        tokens,
        notification: testNotificationOnly ? {
          title: "اختبار طلب جديد",
          body: "هذا اختبار إشعار بالخلفية"
        } : {
          title: "طلب جديد وصل",
          body: `طلب ${orderNumber ? `رقم ${orderNumber} ` : ''}بقيمة ${String(total)}`,
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          fcmOptions: { link: testNotificationOnly ? "https://admin.alturathkw.shop/?invoice=ord_123" : url },
          notification: {
            icon: "https://admin.alturathkw.shop/icons/icon-192.png",
            badge: "https://admin.alturathkw.shop/icons/icon-192.png",
            requireInteraction: true,
            vibrate: [200, 100, 200],
          },
        },
      };

      if (!testNotificationOnly) {
        message.data = {
          type: "new_order",
          orderId: String(orderId),
          restaurantId: String(restaurantId || "kitchen_default"),
          orderNumber: String(orderNumber),
          total: String(total),
          url,
        };
      }

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
        errors: response.responses.filter(r => !r.success).map(r => r.error)
      };
    } catch (e: any) {
      console.error("Sending push error:", e);
      return { success: false, error: e.message };
    }
  }

  async function sendSmartAlertPushNotification({ token, alertType, title, body, url = '/' }: any) {
    if (!admin.messaging || !db) return { success: false, error: "Firebase not initialized" };
    
    try {
      let tokens: string[] = [];
      if (token) {
        tokens = [token];
      } else {
        const snap = await db.collection("pushTokens").where("active", "==", true).get();
        if (snap.empty) return { success: false, error: "No active push tokens found", tokensCount: 0 };
        tokens = snap.docs.map(d => d.data().token);
      }

      const message = {
        tokens,
        notification: {
          title: title || "تنبيه ذكي",
          body: body || "يوجد تحديث في النظام",
        },
        data: {
          type: "smart_alert",
          alertType: String(alertType || 'general'),
          url,
          title: String(title),
          body: String(body),
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          fcmOptions: { link: url },
          notification: {
            icon: "https://admin.alturathkw.shop/icons/icon-192.png",
            badge: "https://admin.alturathkw.shop/icons/icon-192.png",
            vibrate: [200, 100, 200],
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
        errors: response.responses.filter(r => !r.success).map(r => r.error)
      };
    } catch (e: any) {
      console.error("Sending smart alert push error:", e);
      return { success: false, error: e.message };
    }
  }

  // Consolidate API Key retrieval logic
  const getUPaymentsApiKey = () => {
    const raw = process.env.UPAYMENTS_API_KEY || process.env.VITE_UPAYMENTS_API_KEY || "";
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
      const { invoiceNo } = req.params;
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
      const invoiceNo = String(q.track_id || q.order_id || q.invoice_id || "");
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
      return res.status(500).json({ error: "Payment gateway configuration error (Key Missing)" });
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 4)}... (Total length: ${apiKey.length})`);
    
    if (!amount || !customerName || !orderId || !returnUrl || !cancelUrl || !notificationUrl) {
      return res.status(400).json({ error: "Missing required payment fields" });
    }

    try {
      const baseUrl = "https://apiv2api.upayments.com/api/v1"; // Forced Live Mode as requested
      
      // Clean and format phone number (ensure 965 prefix for Kuwait)
      let cleanMobile = customerMobile ? customerMobile.toString().replace(/[^0-9]/g, '') : '';
      if (cleanMobile.length === 8) {
        cleanMobile = '965' + cleanMobile;
      } else if (cleanMobile.length === 0) {
        cleanMobile = '96500000000';
      }
      
      const payload: any = {
        order: {
          id: orderId,
          reference: orderId,
          description: description || 'Payment for order ' + orderId,
          currency: 'KWD',
          amount: amount
        },
        language: 'en',
        is_sms: 1,
        is_email: 1,
        paymentGateway: { src: paymentGateway },
        reference: { id: orderId },
        customer: {
          uniqueId: customerEmail || cleanMobile || orderId,
          name: customerName,
          email: customerEmail || 'no-email@example.com',
          mobile: cleanMobile
        },
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        notificationUrl: notificationUrl
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
        return res.status(response.status).json({ error: "Payment gateway request failed", details: text });
      }
      
      if (!response.ok) {
        console.error("UPayments API error:", data);
        return res.status(response.status).json({ error: "Payment gateway request failed", details: data });
      }

      res.json(data);
    } catch (error) {
      console.error("Error creating payment:", error);
      res.status(500).json({ error: "Failed to create payment" });
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
}

startServer();
