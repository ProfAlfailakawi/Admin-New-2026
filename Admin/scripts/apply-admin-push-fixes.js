#!/usr/bin/env node
/**
 * Apply admin push notification fixes.
 *
 * Run from the ADMIN project root:
 *   node scripts/apply-admin-push-fixes.js
 *
 * This modifies ./server.ts in-place.
 */

const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.ts");

if (!fs.existsSync(serverPath)) {
  console.error("ERROR: server.ts not found. Run this command from the admin project root.");
  process.exit(1);
}

let text = fs.readFileSync(serverPath, "utf8");
let changed = false;

function applyReplace(label, oldText, newText) {
  if (text.includes(newText)) {
    console.log(`OK already applied: ${label}`);
    return;
  }
  if (text.includes(oldText)) {
    text = text.replace(oldText, newText);
    changed = true;
    console.log(`OK applied: ${label}`);
    return;
  }
  console.log(`SKIP pattern not found: ${label}`);
}

// A) Make "new order" alert not depend on pending-payment status.
// It should fire for every newly created order; payment failed has its own alert.
applyReplace(
  "new order alert regardless payment status",
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;

        // Send "new order" for every newly created order, regardless of payment status.
        // Payment failure has its own separate alert.
        const eventId = \`order-created-\${(order as any).id}\`;
`
);

// B) Reduce "order spike / آخر ساعة" repeated alerts: once every 2 hours.
applyReplace(
  "order spike once every 2 hours",
`      if (suddenSpike) {
        const hourKey = now.toISOString().slice(0, 13);
        const eventId = \`order-spike-\${hourKey}\`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "⚡ ضغط طلبات عالي",
            body: \`آخر ساعة فيها \${lastHourCount} طلب — جهزوا المطبخ يا أبطال ⚡\`,
            alertType: "order_spike",
            url: "/"
          });
`,
`      if (suddenSpike) {
        // Send this alert at most once every 2 hours to reduce duplicate alerts.
        const twoHourBucket = Math.floor(now.getTime() / (2 * 60 * 60 * 1000));
        const eventId = \`order-spike-\${twoHourBucket}\`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "⚡ ضغط طلبات عالي",
            body: \`آخر ساعة فيها \${lastHourCount} طلب — جهزوا المطبخ يا أبطال ⚡\`,
            alertType: "order_spike",
            url: "/"
          });
`
);

// C) Make /api/create-payment immediate new-order push awaited if this block exists.
applyReplace(
  "await immediate create-payment new order push",
`      sendSmartAlertPushNotification({
        title: "🆕 طلب جديد بانتظار الدفع",
        body: \`طلب جديد \${invoiceId || orderId || "بدون رقم"} بقيمة \${amount} د.ك — بانتظار إتمام الدفع\`,
        alertType: "new_order_pending_payment",
        url: \`/?invoice=\${invoiceId || orderId || ""}\`
      }).then((result) => {
        console.log("[NEW ORDER PUSH] result:", result);
      }).catch((error) => {
        console.error("[NEW ORDER PUSH] failed:", error);
      });

      res.json(data);`,
`      try {
        const pushResult = await sendSmartAlertPushNotification({
          title: "🆕 طلب جديد بانتظار الدفع",
          body: \`طلب جديد \${invoiceId || orderId || "بدون رقم"} بقيمة \${amount} د.ك — بانتظار إتمام الدفع\`,
          alertType: "new_order_pending_payment",
          url: \`/?invoice=\${invoiceId || orderId || ""}\`
        });
        console.log("[NEW ORDER PUSH] result:", pushResult);
      } catch (pushError) {
        console.error("[NEW ORDER PUSH] failed:", pushError);
      }

      res.json(data);`
);

// D) If /api/create-payment has no immediate alert, insert before res.json(data).
if (!text.includes("[NEW ORDER PUSH] result:")) {
  const marker = '  app.post("/api/create-payment", async (req, res) => {';
  const start = text.indexOf(marker);
  if (start !== -1) {
    const endMarker = "\n  });";
    const end = text.indexOf(endMarker, start);
    if (end !== -1) {
      let block = text.slice(start, end);
      if (!block.includes("🆕 طلب جديد بانتظار الدفع")) {
        const old = "      res.json(data);";
        const inserted = `      try {
        const pushResult = await sendSmartAlertPushNotification({
          title: "🆕 طلب جديد بانتظار الدفع",
          body: \`طلب جديد \${invoiceId || orderId || "بدون رقم"} بقيمة \${amount} د.ك — بانتظار إتمام الدفع\`,
          alertType: "new_order_pending_payment",
          url: \`/?invoice=\${invoiceId || orderId || ""}\`
        });
        console.log("[NEW ORDER PUSH] result:", pushResult);
      } catch (pushError) {
        console.error("[NEW ORDER PUSH] failed:", pushError);
      }

      res.json(data);`;
        if (block.includes(old)) {
          block = block.replace(old, inserted);
          text = text.slice(0, start) + block + text.slice(end);
          changed = true;
          console.log("OK inserted immediate new order push inside /api/create-payment.");
        } else {
          console.log("SKIP: /api/create-payment found, but res.json(data) not found.");
        }
      }
    }
  }
}

// E) Payment failed invoice push should be awaited/logged.
applyReplace(
  "await payment failed invoice push",
`                    sendSmartAlertPushNotification({
                      title: "❌ فشل دفع فاتورة",
                      body: \`الفاتورة \${orderId} فشل دفعها — راجعوا الطلب وأعيدوا إرسال الرابط عند الحاجة\`,
                      alertType: "payment_failed",
                      url: \`/?invoice=\${orderId}\`
                    }).catch(console.error);`,
`                    try {
                      const pushResult = await sendSmartAlertPushNotification({
                        title: "❌ فشل دفع فاتورة",
                        body: \`الفاتورة \${orderId} فشل دفعها — راجعوا الطلب وأعيدوا إرسال الرابط عند الحاجة\`,
                        alertType: "payment_failed",
                        url: \`/?invoice=\${orderId}\`
                      });
                      console.log("[PAYMENT FAILED PUSH] invoice result:", pushResult);
                    } catch (pushError) {
                      console.error("[PAYMENT FAILED PUSH] invoice failed:", pushError);
                    }`
);

// F) Payment failed order push should be awaited/logged.
applyReplace(
  "await payment failed order push",
`                        sendSmartAlertPushNotification({
                          title: "❌ فشل دفع طلب",
                          body: \`الطلب \${orderId} فشل دفعه — يحتاج متابعة\`,
                          alertType: "payment_failed",
                          url: \`/?invoice=\${orderId}\`
                        }).catch(console.error);`,
`                        try {
                          const pushResult = await sendSmartAlertPushNotification({
                            title: "❌ فشل دفع طلب",
                            body: \`الطلب \${orderId} فشل دفعه — يحتاج متابعة\`,
                            alertType: "payment_failed",
                            url: \`/?invoice=\${orderId}\`
                          });
                          console.log("[PAYMENT FAILED PUSH] order result:", pushResult);
                        } catch (pushError) {
                          console.error("[PAYMENT FAILED PUSH] order failed:", pushError);
                        }`
);

// G) Optional: improve smart alert webpush message presentation, but keep the working alert flow.
applyReplace(
  "smart alert notification options",
`          headers: {
            Urgency: "high",
            TTL: "86400"
          },
          fcmOptions: { link: url },
          notification: {
            icon: "https://admin.alturathkw.shop/icons/icon-192.png",
            badge: "https://admin.alturathkw.shop/icons/icon-192.png",
            vibrate: [200, 100, 200],
          },`,
`          headers: {
            Urgency: "high",
            TTL: "0"
          },
          fcmOptions: { link: url },
          notification: {
            icon: "https://admin.alturathkw.shop/icons/icon-192.png",
            badge: "https://admin.alturathkw.shop/icons/icon-192.png",
            requireInteraction: true,
            tag: \`\${String(alertType || 'general')}-\${Date.now()}\`,
            renotify: true,
            vibrate: [200, 100, 200],
          },`
);

if (changed) {
  fs.writeFileSync(serverPath, text);
  console.log("DONE: server.ts updated.");
} else {
  console.log("DONE: no server.ts changes were needed or patterns were not found.");
}

console.log("");
console.log("Next:");
console.log("1) Upload public/firebase-messaging-sw.js");
console.log("2) Upload modified server.ts after this script updates it");
console.log("3) Run build/deploy/restart on production");
