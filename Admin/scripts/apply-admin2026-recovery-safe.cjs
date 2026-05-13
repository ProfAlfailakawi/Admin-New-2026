#!/usr/bin/env node
/**
 * ADMIN2026 SAFE RECOVERY PATCH
 *
 * Run from Admin2026 root:
 *   node scripts/apply-admin2026-recovery-safe.cjs
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const full = (p) => path.join(root, p);

function read(p) {
  const f = full(p);
  if (!fs.existsSync(f)) throw new Error(`Missing ${p}`);
  return fs.readFileSync(f, "utf8");
}
function write(p, s) {
  fs.writeFileSync(full(p), s);
}
function backup(p) {
  const f = full(p);
  if (!fs.existsSync(f)) return;
  const ts = new Date().toISOString().replace(/[-:T.]/g, "").slice(0, 14);
  fs.copyFileSync(f, `${f}.backup-recovery-${ts}`);
}
function replaceFunction(text, startNeedle, endNeedle, replacement) {
  const start = text.indexOf(startNeedle);
  if (start === -1) return { text, changed: false };
  const end = text.indexOf(endNeedle, start + startNeedle.length);
  if (end === -1) return { text, changed: false };
  return { text: text.slice(0, start) + replacement + text.slice(end), changed: true };
}
function stripNotificationPayloads(text) {
  text = text.replace(/\n\s*notification:\s*testNotificationOnly\s*\?\s*\{[\s\S]*?\}\s*:\s*\{[\s\S]*?\},/g, "");
  text = text.replace(/\n\s*notification:\s*testNotificationOnly\s*\?\s*\{[\s\S]*?\}\s*:\s*undefined\s*,/g, "");
  text = text.replace(/\n\s*notification:\s*\{[\s\S]*?\}\s*,\n\s*data:/g, "\n        data:");
  text = text.replace(/\n\s*notification:\s*\{[\s\S]*?\}\s*,\n\s*webpush:/g, "\n        webpush:");
  return text;
}

function patchServer() {
  backup("server.ts");
  let text = read("server.ts");

  const newOrderFunc = `  async function sendNewOrderPushNotification({ orderId, total, token, testNotificationOnly = false }: any = {}) {
    // NEW_ORDER_ALERT_DISABLED_SAFE_RECOVERY
    // New/order-created alerts are disabled to prevent duplicates.
    if (testNotificationOnly) {
      return sendSmartAlertPushNotification({
        token,
        title: "🔔 اختبار الإشعارات",
        body: "تم إرسال إشعار اختبار من الأدمن",
        alertType: "test_notification",
        eventId: \`test-notification-\${Date.now()}\`,
        url: "https://admin.alturathkw.shop/"
      });
    }

    console.log("[NEW ORDER PUSH] skipped; new/order-created alerts disabled:", orderId);
    return {
      success: true,
      skipped: true,
      disabled: true,
      reason: "new-order-alert-disabled",
      orderId,
      total,
      tokensCount: 0,
      successCount: 0,
      failureCount: 0,
      errors: []
    };
  }

`;
  let r = replaceFunction(
    text,
    "  async function sendNewOrderPushNotification({",
    "  async function sendSmartAlertPushNotification",
    newOrderFunc
  );
  if (r.changed) text = r.text;

  const smartFunc = `  async function sendSmartAlertPushNotification({ token, alertType, title, body, url = '/', eventId }: any) {
    if (!admin.messaging || !db) return { success: false, error: "Firebase not initialized" };

    const DISABLED_NEW_ALERT_TYPES = new Set([
      "business_order_created",
      "order_created",
      "invoice_created",
      "new_order",
      "new_invoice",
      "new_order_pending_payment",
      "order_created_pending_payment"
    ]);

    if (DISABLED_NEW_ALERT_TYPES.has(String(alertType || ""))) {
      console.log("[SMART ALERT] skipped disabled new alert:", alertType, title);
      return {
        success: true,
        skipped: true,
        disabled: true,
        reason: "new-alert-disabled",
        alertType,
        tokensCount: 0,
        successCount: 0,
        failureCount: 0,
        errors: []
      };
    }

    try {
      let tokens: string[] = [];

      if (token) {
        tokens = [token];
      } else {
        const snap = await db.collection("pushTokens").where("active", "==", true).get();
        if (snap.empty) return { success: false, error: "No active push tokens found", tokensCount: 0 };

        const docs = snap.docs
          .map(d => ({ id: d.id, data: d.data() }))
          .filter(x => Boolean(x.data.token))
          .sort((a, b) => {
            const at = a.data.updatedAt?.toMillis ? a.data.updatedAt.toMillis() : 0;
            const bt = b.data.updatedAt?.toMillis ? b.data.updatedAt.toMillis() : 0;
            return bt - at;
          });

        tokens = docs.slice(0, 1).map(x => x.data.token);
      }

      const finalEventId = eventId || \`\${alertType || "alert"}-\${Date.now()}-\${Math.random().toString(36).slice(2, 8)}\`;

      const message = {
        tokens,
        data: {
          type: "smart_alert",
          alertType: String(alertType || "general"),
          eventId: String(finalEventId),
          url: String(url || "/"),
          click_action: String(url || "/"),
          title: String(title || ""),
          body: String(body || ""),
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "86400",
          },
          fcmOptions: {
            link: String(url || "/"),
          },
        },
      };

      const response = await admin.messaging().sendEachForMulticast(message);

      return {
        success: response.successCount > 0,
        tokensCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses
          .filter(r => !r.success)
          .map(r => r.error ? { code: r.error.code, message: r.error.message } : { message: "Unknown error" })
      };
    } catch (e: any) {
      console.error("Sending smart alert push error:", e);
      return { success: false, error: e.message };
    }
  }

`;
  r = replaceFunction(text, "  async function sendSmartAlertPushNotification({", "\n  app.", smartFunc);
  if (r.changed) text = r.text;

  const marker = "ADMIN2026_SAFE_EXPLICIT_PAYMENT_RETURN";
  const explicitRoute = `
  // ${marker}
  // Handles /api/payment-return/INV-xxxx/failed before any API 404 catch-all.
  app.get("/api/payment-return/:id/:result", async (req, res) => {
    try {
      const id = String(req.params.id || "");
      const resultParam = String(req.params.result || "").toLowerCase();
      const q: any = req.query || {};
      const rawResult = String(q.result || resultParam || "").toUpperCase();

      const isPaid =
        resultParam === "success" ||
        rawResult === "CAPTURED" ||
        rawResult === "SUCCESS" ||
        rawResult === "PAID";

      const status = isPaid ? "paid" : "failed";
      const isInvoice = id.startsWith("INV-");
      const nowIso = new Date().toISOString();

      console.log("[ADMIN2026 SAFE PAYMENT RETURN]", { id, status, rawResult, isInvoice });

      try {
        if (typeof handlePaymentUpdate === "function") {
          await handlePaymentUpdate(id, status, {
            ...q,
            result: rawResult,
            paymentResult: resultParam,
            source: "admin2026-safe-explicit-payment-return",
          });
        }
      } catch (updateError) {
        console.error("[ADMIN2026 SAFE PAYMENT RETURN] handlePaymentUpdate failed:", updateError);
      }

      try {
        const sharedRef = db.collection("appData").doc("shared_company_data");
        const snap = await sharedRef.get();
        const shared: any = snap.exists ? snap.data() : {};

        const idsFor = (item: any) => [
          item?.id,
          item?.invoiceId,
          item?.invoiceNo,
          item?.orderId,
          item?.orderNo,
          item?.number,
          item?.tracked_order,
          item?.requested_order_id,
        ].filter(Boolean).map((x: any) => String(x));

        const updateItem = (item: any) => {
          if (!item) return item;
          if (!idsFor(item).includes(id)) return item;

          if (status === "paid") {
            return {
              ...item,
              status: isInvoice ? "تم الدفع" : "تم الدفع وجاري التوصيل",
              paymentStatus: "paid",
              payment_status: "paid",
              paid: true,
              failed: false,
              canPay: false,
              paidAt: item.paidAt || nowIso,
              paymentUpdatedAt: nowIso,
              updatedAt: nowIso,
              paymentId: q.payment_id || q.paymentId || item.paymentId || "",
              gatewayResult: rawResult,
            };
          }

          return {
            ...item,
            status: "بانتظار الدفع",
            paymentStatus: "failed",
            payment_status: "failed",
            paid: false,
            failed: true,
            canPay: true,
            failedAt: item.failedAt || nowIso,
            paymentUpdatedAt: nowIso,
            updatedAt: nowIso,
            paymentId: q.payment_id || q.paymentId || item.paymentId || "",
            gatewayResult: rawResult,
          };
        };

        const invoices = Array.isArray(shared.invoices) ? shared.invoices.map(updateItem) : shared.invoices;
        let orders = Array.isArray(shared.orders) ? shared.orders.map(updateItem) : shared.orders;

        if (isInvoice && Array.isArray(shared.invoices)) {
          const sourceInvoice = shared.invoices.find((item: any) => idsFor(item).includes(id));
          if (sourceInvoice) {
            const base = updateItem(sourceInvoice);
            const mirrorOrder = {
              ...base,
              id,
              orderId: id,
              invoiceId: id,
              invoiceNo: id,
              tracked_order: id,
              requested_order_id: id,
              source: "admin_invoice",
              type: base?.type || "admin_invoice",
              canPay: status !== "paid",
            };

            const existingOrders = Array.isArray(orders) ? orders : [];
            const idx = existingOrders.findIndex((item: any) => idsFor(item).includes(id));
            orders = idx >= 0
              ? existingOrders.map((item: any, i: number) => i === idx ? mirrorOrder : item)
              : [...existingOrders, mirrorOrder];

            console.log("[ADMIN2026 SAFE PAYMENT RETURN] mirrored INV to orders:", id);
          }
        }

        await sharedRef.set({
          ...(Array.isArray(invoices) ? { invoices } : {}),
          ...(Array.isArray(orders) ? { orders } : {}),
          updatedAt: nowIso,
          lastPaymentReturn: { id, status, rawResult, updatedAt: nowIso },
        }, { merge: true });

        console.log("[ADMIN2026 SAFE PAYMENT RETURN] shared_company_data updated:", id, status);
      } catch (hardUpdateError) {
        console.error("[ADMIN2026 SAFE PAYMENT RETURN] hard update failed:", hardUpdateError);
      }

      try {
        const eventId = isInvoice ? \`invoice-\${status}-\${id}\` : \`payment-\${status}-\${id}\`;
        const eventRef = db.collection("pushEvents").doc(eventId);
        const eventSnap = await eventRef.get();

        if (!eventSnap.exists) {
          await eventRef.set({
            eventId,
            id,
            status,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            source: "admin2026-safe-explicit-payment-return",
          });

          await sendSmartAlertPushNotification({
            title: status === "paid"
              ? (isInvoice ? "✅ تم دفع فاتورة" : "✅ تم دفع طلب")
              : (isInvoice ? "❌ فشل دفع فاتورة" : "❌ فشل دفع طلب"),
            body: status === "paid"
              ? (isInvoice ? \`تم دفع الفاتورة \${id}\` : \`تم دفع الطلب \${id}\`)
              : (isInvoice ? \`فشل دفع الفاتورة \${id}\` : \`فشل دفع الطلب \${id}\`),
            alertType: isInvoice
              ? (status === "paid" ? "invoice_paid" : "invoice_failed")
              : (status === "paid" ? "payment_paid" : "payment_failed"),
            eventId,
            url: isInvoice
              ? \`https://admin.alturathkw.shop/?invoice=\${encodeURIComponent(id)}\`
              : \`https://admin.alturathkw.shop/?order=\${encodeURIComponent(id)}\`
          });
        } else {
          console.log("[ADMIN2026 SAFE PAYMENT RETURN] alert already sent:", eventId);
        }
      } catch (alertError) {
        console.error("[ADMIN2026 SAFE PAYMENT RETURN] alert failed:", alertError);
      }

      return res.redirect(
        302,
        \`https://alturathkw.shop/track?show_result=\${encodeURIComponent(status)}&tracked_order=\${encodeURIComponent(id)}&payment=\${encodeURIComponent(status)}&invoice=\${encodeURIComponent(id)}&result=\${encodeURIComponent(rawResult)}\`
      );
    } catch (error) {
      console.error("[ADMIN2026 SAFE PAYMENT RETURN] error:", error);
      return res.redirect(302, "https://alturathkw.shop/track?show_result=error");
    }
  });

`;

  if (!text.includes(marker)) {
    let insertAt = -1;
    const notFoundIdx = text.indexOf("API Route Not Found");
    if (notFoundIdx !== -1) {
      const appIdx = text.lastIndexOf("\n  app.", notFoundIdx);
      insertAt = appIdx !== -1 ? appIdx + 1 : text.lastIndexOf("\n", notFoundIdx);
    }
    if (insertAt < 0) {
      const prIdx = text.indexOf('  app.get("/api/payment-return/:invoiceNo"');
      if (prIdx !== -1) insertAt = prIdx;
    }
    if (insertAt < 0) throw new Error("Could not find insertion point for explicit payment-return route");
    text = text.slice(0, insertAt) + explicitRoute + text.slice(insertAt);
  }

  text = text.replace(/return res\.redirect\(`\/\?payment=\$\{status\}&invoice=\$\{encodeURIComponent\(invoiceNo\)\}&result=\$\{encodeURIComponent\(result\)\}`\);/g,
    'return res.redirect(302, `https://alturathkw.shop/track?show_result=${encodeURIComponent(status)}&tracked_order=${encodeURIComponent(invoiceNo)}&payment=${encodeURIComponent(status)}&invoice=${encodeURIComponent(invoiceNo)}&result=${encodeURIComponent(result)}`);'
  );
  text = text.replace(/return res\.redirect\("\/\?payment=error"\);/g,
    'return res.redirect(302, "https://alturathkw.shop/track?show_result=error");'
  );

  text = stripNotificationPayloads(text);
  write("server.ts", text);
  console.log("OK: patched server.ts");
}

function patchServiceWorker() {
  const swPath = "public/firebase-messaging-sw.js";
  if (!fs.existsSync(full(swPath))) {
    console.log("SKIP: public/firebase-messaging-sw.js not found");
    return;
  }

  backup(swPath);
  let text = read(swPath);

  const clickBlock = `self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification?.data || {};
  const fcm = data.FCM_MSG || {};

  const urlToOpen =
    data.url ||
    data.click_action ||
    fcm?.data?.url ||
    fcm?.data?.click_action ||
    fcm?.fcmOptions?.link ||
    '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(urlToOpen);
          return;
        }
      }

      if (clients.openWindow) return clients.openWindow(urlToOpen);
    })
  );
});`;

  const s1 = text.indexOf("self.addEventListener('notificationclick'");
  const s2 = text.indexOf('self.addEventListener("notificationclick"');
  const start = s1 !== -1 ? s1 : s2;

  if (start !== -1) {
    const end = text.indexOf("\n});", start);
    if (end !== -1) {
      text = text.slice(0, start) + clickBlock + text.slice(end + 4);
    } else {
      text += "\n\n" + clickBlock + "\n";
    }
  } else {
    text += "\n\n" + clickBlock + "\n";
  }

  write(swPath, text);
  console.log("OK: patched public/firebase-messaging-sw.js");
}

patchServer();
patchServiceWorker();

console.log("\nVERIFY:");
console.log('grep -n "ADMIN2026_SAFE_EXPLICIT_PAYMENT_RETURN\\|NEW_ORDER_ALERT_DISABLED_SAFE_RECOVERY\\|DISABLED_NEW_ALERT_TYPES" server.ts');
console.log('grep -n "notification:" server.ts || echo "OK: no notification payload"');
console.log('grep -n "notificationclick\\|urlToOpen\\|FCM_MSG" public/firebase-messaging-sw.js');
