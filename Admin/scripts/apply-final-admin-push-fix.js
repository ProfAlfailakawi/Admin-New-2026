#!/usr/bin/env node
/**
 * FINAL Admin Push Fix: no duplicates + fast recent alerts.
 *
 * Run from admin project root:
 *   node scripts/apply-final-admin-push-fix.js
 *
 * This modifies ./server.ts in-place.
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

/**
 * 1) Support shared_company_data orders:
 * - date
 * - createdAt
 */
applyReplace(
  "support date field",
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

/**
 * 2) Treat Arabic "جديد" as pending/new.
 */
applyReplace(
  'status "جديد" is pending',
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("لم يدفع")`,
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("جديد") ||
          status.includes("لم يدفع")`
);

/**
 * 3) New order: last 20 minutes only.
 */
applyReplace(
  "new order last 20 minutes",
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (!createdAt) continue;

        // Only alert for very recent orders to prevent sending old backlog.
        const recentOrderWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (createdAt < recentOrderWindowStart || createdAt > now) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`
);

applyReplace(
  "new order 48 minutes/window -> 20 minutes",
`        // Look at recent orders from orders collection + appData/shared_company_data.orders.
        const recentOrderWindowStart = new Date(now.getTime() - 48 * 60 * 60 * 1000);
        if (createdAt < recentOrderWindowStart || createdAt > now) continue;
`,
`        // Only alert for very recent orders to prevent sending old backlog.
        const recentOrderWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (createdAt < recentOrderWindowStart || createdAt > now) continue;
`
);

/**
 * 4) Broaden failed/cancelled detector.
 */
applyReplace(
  "broaden failed detector",
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

// rawStatus fix.
if (text.includes("          status: rawStatus,")) {
  text = text.replace(/          status: rawStatus,/g, "          status: statusText,");
  changed = true;
  console.log("OK applied: rawStatus -> statusText");
}

/**
 * 5) Failed payment: last 20 minutes only.
 */
applyReplace(
  "failed payment last 20 minutes",
`        const orderId = (order as any).id || (order as any).orderId || (order as any).orderNumber;
        if (!orderId) continue;

        const statusText = [`,
`        const orderId = (order as any).id || (order as any).orderId || (order as any).orderNumber;
        if (!orderId) continue;

        const failedCreatedAt =
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!failedCreatedAt) continue;
        const failedWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (failedCreatedAt < failedWindowStart || failedCreatedAt > now) continue;

        const statusText = [`
);

/**
 * 6) Broaden paid detector.
 */
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

/**
 * 7) Paid payment: last 20 minutes only.
 * We do a conservative replace near paidStatusText block if not already present.
 */
if (!text.includes("const paidWindowStart = new Date(now.getTime() - 20 * 60 * 1000);")) {
  const paidPrefix = `        const paidStatusText = [`;
  const paidInsert = `        const paidCreatedAt =
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!paidCreatedAt) continue;
        const paidWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (paidCreatedAt < paidWindowStart || paidCreatedAt > now) continue;

        const paidStatusText = [`;
  const idx = text.indexOf(paidPrefix);
  if (idx !== -1) {
    // Use last occurrence to avoid failed block.
    const idx2 = text.lastIndexOf(paidPrefix);
    text = text.slice(0, idx2) + paidInsert + text.slice(idx2 + paidPrefix.length);
    changed = true;
    console.log("OK applied: paid payment last 20 minutes");
  }
}

/**
 * 8) Atomic claim on pushEvents to prevent duplicates.
 */
if (!text.includes("claimPushEvent")) {
  const marker = `      async function alreadySent(eventId: string) {
        const snap = await db!.collection("pushEvents").doc(eventId).get();
        return snap.exists;
      }

`;
  const helper = marker + `      async function claimPushEvent(eventId: string, payload: any = {}) {
        const ref = db!.collection("pushEvents").doc(eventId);

        try {
          await ref.create({
            eventId,
            ...payload,
            status: "claimed",
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return true;
        } catch (error: any) {
          if (error?.code === 6 || String(error?.message || "").includes("ALREADY_EXISTS")) {
            return false;
          }

          console.error("[PUSH EVENTS] claim failed:", eventId, error);
          return false;
        }
      }

`;
  if (text.includes(marker)) {
    text = text.replace(marker, helper);
    changed = true;
    console.log("OK applied: claimPushEvent helper");
  } else {
    console.log("SKIP: alreadySent helper pattern not found.");
  }
}

text = text.replace(
`        if (await alreadySent(eventId)) {
          continue;
        }
`,
`        if (!(await claimPushEvent(eventId))) {
          continue;
        }
`
);

text = text.replace(
`        if (!(await alreadySent(eventId))) {
`,
`        if (await claimPushEvent(eventId)) {
`
);

text = text.replace(
`          if (!(await alreadySent(eventId))) {
`,
`          if (await claimPushEvent(eventId)) {
`
);

applyReplace(
  "markSent merge status sent",
`      async function markSent(eventId: string, payload: any, result: any) {
        await db!.collection("pushEvents").doc(eventId).set({
          ...payload,
          result,
          sentAt: new Date().toISOString(),
        });
      }
`,
`      async function markSent(eventId: string, payload: any, result: any) {
        await db!.collection("pushEvents").doc(eventId).set({
          ...payload,
          result,
          status: "sent",
          sentAt: new Date().toISOString(),
        }, { merge: true });
      }
`
);

/**
 * 9) Reduce order spike duplicate alert.
 */
applyReplace(
  "order spike once every 2 hours",
`      if (suddenSpike) {
        const hourKey = now.toISOString().slice(0, 13);
        const eventId = \`order-spike-\${hourKey}\`;

        if (await claimPushEvent(eventId)) {
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

        if (await claimPushEvent(eventId)) {
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

/**
 * 10) Smart alert webpush options.
 */
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
console.log("Verify:");
console.log('grep -n "claimPushEvent\\\\|20 \\* 60 \\* 1000\\\\|payment-failed-\\\\|payment-paid-\\\\|payment-pending-10min-\\\\|order-created-" server.ts');
