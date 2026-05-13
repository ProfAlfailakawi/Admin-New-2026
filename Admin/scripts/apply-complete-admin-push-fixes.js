#!/usr/bin/env node
/**
 * Complete latest admin push fixes.
 *
 * Run from admin project root:
 *   node scripts/apply-complete-admin-push-fixes.js
 *
 * This modifies ./server.ts in-place.
 *
 * Includes:
 * - Support appData/shared_company_data.orders date field
 * - Treat status "جديد" as pending/new order
 * - Detect failed/cancelled orders from status
 * - Detect paid orders from status
 * - Fix rawStatus -> statusText
 * - Reduce order spike duplicate alert
 * - Use correct service worker separately at public/firebase-messaging-sw.js
 */
const fs = require("fs");
const path = require("path");

const serverPath = path.join(process.cwd(), "server.ts");
if (!fs.existsSync(serverPath)) {
  console.error("ERROR: server.ts not found. Run from admin project root.");
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
  } else {
    console.log(`SKIP pattern not found: ${label}`);
  }
}

// A) Support date field in order timestamp detection used by business alerts.
applyReplace(
  "support date field in createdAt detection",
`        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);`,
`        const createdAt =
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);`
);

// B) Treat Arabic "جديد" as pending/new order.
applyReplace(
  'treat status "جديد" as pending',
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("لم يدفع")`,
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("جديد") ||
          status.includes("لم يدفع")`
);

// C) New order should fire for all new orders today, not only pending-payment.
applyReplace(
  "new order for every order created today",
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (!createdAt) continue;
        if (createdAt < dayStart || createdAt > now) continue;

        // Send "new order" once for every order created today.
        // markSent/alreadySent prevents duplicates.
        const eventId = \`order-created-\${(order as any).id}\`;
`
);

// D) If prior patch removed pending check but kept narrow window, widen to dayStart.
applyReplace(
  "widen new order window to today",
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;

        // Send "new order" for every newly created order, regardless of payment status.
        // Payment failure has its own separate alert.
        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (!createdAt) continue;
        if (createdAt < dayStart || createdAt > now) continue;

        // Send "new order" once for every order created today.
        // markSent/alreadySent prevents duplicates.
        const eventId = \`order-created-\${(order as any).id}\`;
`
);

// E) Broaden failed/cancelled payment detection from orders.status and related fields.
applyReplace(
  "broaden failed payment detector",
`        const rawStatus = String(
          (order as any).paymentStatus ??
          (order as any).payment_status ??
          (order as any).status ??
          (order as any).payment?.status ??
          ""
        ).toLowerCase();

        const isFailedPayment =
          rawStatus.includes("failed") ||
          rawStatus.includes("fail") ||
          rawStatus.includes("declined") ||
          rawStatus.includes("cancelled") ||
          rawStatus.includes("canceled") ||
          rawStatus.includes("rejected");

        if (!isFailedPayment) continue;
`,
`        const statusText = [
          (order as any).paymentStatus,
          (order as any).payment_status,
          (order as any).status,
          (order as any).orderStatus,
          (order as any).payment?.status,
          (order as any).paymentStatusText,
          (order as any).statusText,
          (order as any).paymentResult,
          (order as any).payment_result
        ].filter(Boolean).join(" ").toLowerCase();

        const isFailedPayment =
          statusText === "cancelled" ||
          statusText.includes("failed") ||
          statusText.includes("fail") ||
          statusText.includes("declined") ||
          statusText.includes("cancelled") ||
          statusText.includes("canceled") ||
          statusText.includes("cancel") ||
          statusText.includes("rejected") ||
          statusText.includes("failure") ||
          statusText.includes("فشل") ||
          statusText.includes("مرفوض") ||
          statusText.includes("ملغي") ||
          statusText.includes("إلغاء") ||
          statusText.includes("فشل في عملية الدفع");

        if (!isFailedPayment) continue;
`
);

// F) Critical fix: rawStatus variable no longer exists after broaden detector.
if (text.includes("          status: rawStatus,")) {
  text = text.replace(/          status: rawStatus,/g, "          status: statusText,");
  changed = true;
  console.log("OK applied: rawStatus -> statusText");
} else {
  console.log("OK: no rawStatus reference found.");
}

// G) Broaden paid detector while keeping isPaidOrder fallback.
applyReplace(
  "broaden paid detector",
`        if (!isPaidOrder(order)) continue;

        const eventId = \`payment-paid-\${orderId}\`;
`,
`        const paidStatusText = [
          (order as any).paymentStatus,
          (order as any).payment_status,
          (order as any).status,
          (order as any).orderStatus,
          (order as any).payment?.status,
          (order as any).paymentStatusText,
          (order as any).statusText,
          (order as any).paymentResult,
          (order as any).payment_result
        ].filter(Boolean).join(" ").toLowerCase();

        const isPaidPayment =
          isPaidOrder(order) ||
          paidStatusText === "paid" ||
          paidStatusText.includes("paid") ||
          paidStatusText.includes("success") ||
          paidStatusText.includes("successful") ||
          paidStatusText.includes("captured") ||
          paidStatusText.includes("completed") ||
          paidStatusText.includes("مدفوع") ||
          paidStatusText.includes("تم الدفع") ||
          paidStatusText.includes("ناجح");

        if (!isPaidPayment) continue;

        const eventId = \`payment-paid-\${orderId}\`;
`
);

// H) Reduce order spike duplicate alert and fix hourKey reference.
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

if (text.includes("hour: hourKey,")) {
  text = text.replace(/hour: hourKey,/g, "hour: twoHourBucket,");
  changed = true;
  console.log("OK applied: hourKey -> twoHourBucket");
}

// I) Improve smart alert webpush options.
applyReplace(
  "smart alert webpush options",
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
  console.log("DONE: no changes made. They may already be applied.");
}

console.log("");
console.log("Verify with:");
console.log('grep -n "getDateValue((order as any).date)\\\\|status.includes(\\\"جديد\\\")\\\\|payment-failed-\\\\|payment-paid-\\\\|paidStatusText\\\\|rawStatus" server.ts');
