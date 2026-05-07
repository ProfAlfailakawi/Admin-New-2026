import express from "express";
import path from "path";
import cors from 'cors';
import admin from 'firebase-admin';
import fsSync from 'fs';

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

  // API TEST ROUTES (PROMINENTLY PLACED)
  app.post("/api/push/test-new-order", async (req, res) => {
    console.log("RECEIVED REQUEST: /api/push/test-new-order");
    const receivedSecret = (Array.isArray(req.headers["x-admin-secret"]) ? req.headers["x-admin-secret"][0] : req.headers["x-admin-secret"]) || "";
    const expectedSecret = process.env.ADMIN_TEST_SECRET || "";

    if (!expectedSecret) {
      return res.status(500).json({ error: "ADMIN_TEST_SECRET is not configured" });
    }

    if (receivedSecret.trim() !== expectedSecret.trim()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { orderId, total, restaurantId, orderNumber } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "orderId required" });
      }
      
      console.log("Triggering test-new-order push...");
      await sendNewOrderPushNotification({ orderId, total: total || 0, restaurantId, orderNumber });
      res.json({ success: true, message: "Push notification triggered" });
    } catch (error: any) {
      console.error("Send push error:", error);
      res.status(500).json({ error: "Failed to send push notification", details: error.message });
    }
  });

  app.post("/api/push/test-smart-alert", async (req, res) => {
    console.log("RECEIVED REQUEST: /api/push/test-smart-alert");
    const receivedSecret = (Array.isArray(req.headers["x-admin-secret"]) ? req.headers["x-admin-secret"][0] : req.headers["x-admin-secret"]) || "";
    const expectedSecret = process.env.ADMIN_TEST_SECRET || "";

    if (!expectedSecret) {
      return res.status(500).json({ error: "ADMIN_TEST_SECRET is not configured" });
    }

    if (receivedSecret.trim() !== expectedSecret.trim()) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const { title, body, alertType, url } = req.body;
      
      console.log("Triggering test-smart-alert push...");
      await sendSmartAlertPushNotification({ title, body, alertType, url });
      res.json({ success: true, message: "Smart alert notification triggered" });
    } catch (error: any) {
      console.error("Send smart alert error:", error);
      res.status(500).json({ error: "Failed to send smart alert notification", details: error.message });
    }
  });

  // Webhook for payment gateway
  // It synchronizes payment results to the database even if the user doesn't return to the app.
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

  app.post("/api/push/save-token", async (req, res) => {
    try {
      const { token, userId, restaurantId, platform, userAgent } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      if (db) {
        await db.collection("pushTokens").doc(token).set({
          token,
          userId: userId || null,
          restaurantId: restaurantId || "kitchen_default",
          platform: platform || "web-pwa",
          userAgent: userAgent || "",
          active: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
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

  async function sendNewOrderPushNotification({ orderId, total, restaurantId = 'default', orderNumber = '' }: any) {
    if (!admin.messaging || !db) return;
    const url = `/?invoice=${orderId}`; 
    
    try {
      const snap = await db.collection("pushTokens").where("active", "==", true).get();
      if (snap.empty) return;
      
      const tokens = snap.docs.map(d => d.data().token);
      
      const message = {
        tokens,
        notification: {
          title: "طلب جديد مدفوع",
          body: `طلب ${orderNumber ? `رقم ${orderNumber} ` : ''}بقيمة ${String(total)} — تم الدفع ويحتاج تجهيز.`,
        },
        data: {
          type: "new_order",
          orderId: String(orderId),
          restaurantId: String(restaurantId),
          orderNumber: String(orderNumber),
          total: String(total),
          url,
          title: "طلب جديد مدفوع",
          body: `طلب ${orderNumber ? `رقم ${orderNumber} ` : ''}بقيمة ${String(total)} — تم الدفع ويحتاج تجهيز.`,
        },
        webpush: {
          fcmOptions: { link: url },
          notification: {
            icon: "/vite.svg",
            badge: "/vite.svg",
            requireInteraction: true,
            vibrate: [200, 100, 200],
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Push notifications sent: ${response.successCount} success, ${response.failureCount} failed.`);

      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (errorCode === "messaging/registration-token-not-registered" || 
                errorCode === "messaging/invalid-registration-token") {
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
          console.log(`Cleaned up ${failedTokens.length} invalid tokens.`);
        }
      }
    } catch (e) {
      console.error("Sending push error:", e);
    }
  }

  async function sendSmartAlertPushNotification({ token, alertType, title, body, url = '/' }: any) {
    if (!admin.messaging || !db) return;
    
    try {
      let tokens: string[] = [];
      if (token) {
        tokens = [token];
      } else {
        const snap = await db.collection("pushTokens").where("active", "==", true).get();
        if (snap.empty) return;
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
          fcmOptions: { link: url },
          notification: {
            icon: "/vite.svg",
            badge: "/vite.svg",
            vibrate: [200, 100, 200],
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`Smart Alert Push notifications sent: ${response.successCount} success, ${response.failureCount} failed.`);
    } catch (e) {
      console.error("Sending smart alert push error:", e);
    }
  }

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
    
    const apiKey = process.env.UPAYMENTS_API_KEY;

    if (!apiKey) {
      console.error("UPAYMENTS_API_KEY is not defined");
      return res.status(500).json({ error: "Payment gateway configuration error" });
    }
    
    if (!amount || !customerName || !orderId || !returnUrl || !cancelUrl || !notificationUrl) {
      return res.status(400).json({ error: "Missing required payment fields" });
    }

    if (db) {
        try {
            const appDataSnap = await db.collection('appData').limit(1).get();
            if (!appDataSnap.empty) {
                const settings = appDataSnap.docs[0].data()?.settings;
                if (settings?.storeStatus) {
                    const status = settings.storeStatus;
                    if (status.manualClose) {
                        return res.status(400).json({ error: status.closeMessage || "المتجر مغلق حالياً" });
                    }
                    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                    const todayKwtHour = (new Date().getUTCHours() + 3) % 24;
                    // slightly naive day calculation if it's past midnight UTC but not in KWT, but good enough mostly
                    const todayDayObj = new Date(new Date().getTime() + 3*3600*1000); 
                    const today = days[todayDayObj.getUTCDay()];
                    
                    const todayConfig = status.openingHours?.[today];
                    if (todayConfig && !todayConfig.enabled) {
                        return res.status(400).json({ error: status.closeMessage || "المتجر مغلق اليوم" });
                    }
                    if (todayConfig && todayConfig.enabled && todayConfig.open && todayConfig.close) {
                        const kwtTime = todayKwtHour + (todayDayObj.getUTCMinutes() / 60);
                        const [openH, openM] = todayConfig.open.split(':').map(Number);
                        const [closeH, closeM] = todayConfig.close.split(':').map(Number);
                        const openTime = openH + (openM / 60);
                        const closeTime = closeH + (closeM / 60);
                        
                        // Handle simple crossing midnight logic: e.g. open 09:00 to 02:00
                        const isOpenOvernight = closeTime < openTime;
                        let isCurrentlyOpen = false;
                        
                        if (isOpenOvernight) {
                           // e.g. 09:00 to 02:00 -> True if time is >= 9 OR time is <= 2
                           isCurrentlyOpen = kwtTime >= openTime || kwtTime <= closeTime;
                        } else {
                           isCurrentlyOpen = kwtTime >= openTime && kwtTime <= closeTime;
                        }

                        if (!isCurrentlyOpen) {
                            return res.status(400).json({ error: status.closeMessage || "المتجر خارج أوقات العمل حالياً" });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Store status check error:", e);
        }
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

    const apiKey = process.env.UPAYMENTS_API_KEY;
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
