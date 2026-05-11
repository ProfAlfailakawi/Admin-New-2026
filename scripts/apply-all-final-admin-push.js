#!/usr/bin/env node
/**
 * ALL FINAL Admin Push Fixes.
 *
 * Run from admin project root:
 *   node scripts/apply-all-final-admin-push.js
 *
 * Then deploy:
 *   gcloud run deploy service --source . --region europe-west2 --project gen-lang-client-0878573239 --allow-unauthenticated --set-env-vars ADMIN_TEST_SECRET=123456
 *
 * Hosting:
 *   cp public/firebase-messaging-sw.js dist/firebase-messaging-sw.js
 *   firebase deploy --only hosting
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

function replaceAll(label, oldText, newText) {
  let count = 0;
  while (text.includes(oldText)) {
    text = text.replace(oldText, newText);
    count++;
  }
  if (count) {
    changed = true;
    console.log(`OK ${label}: ${count}`);
  } else {
    console.log(`SKIP ${label}`);
  }
}

function replaceOnce(label, oldText, newText) {
  if (text.includes(newText)) {
    console.log(`OK already: ${label}`);
    return;
  }
  if (text.includes(oldText)) {
    text = text.replace(oldText, newText);
    changed = true;
    console.log(`OK applied: ${label}`);
  } else {
    console.log(`SKIP: ${label}`);
  }
}

// Data-only FCM. Remove notification payload blocks.
text = text.replace(/\n\s*notification:\s*testNotificationOnly\s*\?\s*\{[\s\S]*?\}\s*:\s*\{[\s\S]*?\},/g, "");
text = text.replace(/\n\s*notification:\s*\{\s*title:\s*[^,\n]+,\s*body:\s*[^,\n]+,\s*\},/g, "");
text = text.replace(/\n\s*notification:\s*\{[\s\S]*?\n\s*\},(?=\n\s*(data|webpush|apns|token|tokens|fcmOptions|android|headers|}\)|}\,))/g, "");
changed = true;
console.log("OK: ensured data-only FCM.");

// Support date field.
replaceAll(
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

// Arabic "جديد".
replaceAll(
  'status includes جديد',
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("لم يدفع")`,
`          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("جديد") ||
          status.includes("لم يدفع")`
);

// pushState/businessSince.
if (!text.includes('collection("pushState").doc("businessAlerts")')) {
  const target = `      const results: any[] = [];
`;
  const insert = `      const stateRef = db!.collection("pushState").doc("businessAlerts");
      const stateSnap = await stateRef.get();
      const stateData = stateSnap.exists ? stateSnap.data() : null;

      const lastCheckedAt = getDateValue(stateData?.lastCheckedAt) || now;

      // Grace window catches delayed writes. claimPushEvent prevents duplicates.
      const businessSince = new Date(lastCheckedAt.getTime() - 15 * 60 * 1000);

` + target;
  if (text.includes(target)) {
    text = text.replace(target, insert);
    changed = true;
    console.log("OK applied: pushState/businessSince.");
  }
}

// Old windows -> businessSince.
replaceAll(
  "new order old window -> businessSince",
`        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (!createdAt) continue;
        if (createdAt <= businessSince) continue;
        if (createdAt > now) continue;

        const eventId = \`business-order-created-\${(order as any).id}\`;
`
);

replaceAll(
  "new order recent window -> businessSince",
`        // Only alert for very recent orders to prevent sending old backlog.
        const recentOrderWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (createdAt < recentOrderWindowStart || createdAt > now) continue;

        const eventId = \`order-created-\${(order as any).id}\`;
`,
`        if (createdAt <= businessSince) continue;
        if (createdAt > now) continue;

        const eventId = \`business-order-created-\${(order as any).id}\`;
`
);

text = text.replace(/createdAt\s*<\s*newOrderWindowStart/g, "createdAt <= businessSince");
text = text.replace(/createdAt\s*<=\s*newOrderWindowStart/g, "createdAt <= businessSince");
text = text.replace(/const eventId = `order-created-\$\{\(order as any\)\.id\}`;/g, "const eventId = `business-order-created-${(order as any).id}`;");
changed = true;

// Failed detector.
replaceOnce(
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
text = text.replace(/status:\s*rawStatus,/g, "status: statusText,");

// Timing to businessSince.
replaceAll(
  "failed timing -> businessSince",
`        const failedCreatedAt =
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!failedCreatedAt) continue;
        const failedWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (failedCreatedAt < failedWindowStart || failedCreatedAt > now) continue;
`,
`        const failedCreatedAt =
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!failedCreatedAt) continue;
        if (failedCreatedAt <= businessSince) continue;
        if (failedCreatedAt > now) continue;
`
);

replaceAll(
  "paid timing -> businessSince",
`        const paidCreatedAt =
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!paidCreatedAt) continue;
        const paidWindowStart = new Date(now.getTime() - 20 * 60 * 1000);
        if (paidCreatedAt < paidWindowStart || paidCreatedAt > now) continue;
`,
`        const paidCreatedAt =
          getDateValue((order as any).updatedAt) ||
          getDateValue((order as any).date) ||
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!paidCreatedAt) continue;
        if (paidCreatedAt <= businessSince) continue;
        if (paidCreatedAt > now) continue;
`
);

// Paid detector.
replaceOnce(
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

// claimPushEvent.
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
  }
}

replaceAll("alreadySent continue -> claim",
`        if (await alreadySent(eventId)) {
          continue;
        }
`,
`        if (!(await claimPushEvent(eventId))) {
          continue;
        }
`
);

replaceAll("not alreadySent -> claim",
`        if (!(await alreadySent(eventId))) {
`,
`        if (await claimPushEvent(eventId)) {
`
);

replaceAll("not alreadySent indent -> claim",
`          if (!(await alreadySent(eventId))) {
`,
`          if (await claimPushEvent(eventId)) {
`
);

// markSent merge.
replaceOnce(
  "markSent merge",
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

// Token helper + latest token only.
if (!text.includes("const tokenUpdatedAtMs")) {
  const marker = '      const snap = await db.collection("pushTokens").where("active", "==", true).get();';
  const helper = `      const tokenUpdatedAtMs = (value: any) => {
        if (!value) return 0;
        if (typeof value.toMillis === "function") return value.toMillis();
        if (value._seconds) return value._seconds * 1000 + Math.floor((value._nanoseconds || 0) / 1000000);
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : 0;
      };

`;
  if (text.includes(marker)) {
    text = text.replace(marker, helper + marker);
    changed = true;
  }
}
text = text.replace(/\.sort\(\(a, b\) => new Date\(b\.updatedAt \|\| 0\)\.getTime\(\) - new Date\(a\.updatedAt \|\| 0\)\.getTime\(\)\)/g, ".sort((a, b) => tokenUpdatedAtMs(b.updatedAt) - tokenUpdatedAtMs(a.updatedAt))");
text = text.replace(/\.map\(d => d\.data\(\)\.token\);/g, `.map(d => ({ token: d.data().token || d.id, updatedAt: d.data().updatedAt }))
        .sort((a, b) => tokenUpdatedAtMs(b.updatedAt) - tokenUpdatedAtMs(a.updatedAt))
        .slice(0, 1)
        .map(x => x.token);`);
changed = true;

// order spike bucket.
text = text.replace(
`        const hourKey = now.toISOString().slice(0, 13);
        const eventId = \`order-spike-\${hourKey}\`;`,
`        const twoHourBucket = Math.floor(now.getTime() / (2 * 60 * 60 * 1000));
        const eventId = \`order-spike-\${twoHourBucket}\`;`
);
text = text.replace(/hour:\s*hourKey,/g, "hour: twoHourBucket,");

// lastCheckedAt update.
if (!text.includes("lastCheckedAt: now.toISOString()")) {
  const targets = [
`      return res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });`,
`      res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });`,
`      return res.json({ success: true, checkedAt: now.toISOString(), resultsCount: results.length, results });`,
`      res.json({ success: true, checkedAt: now.toISOString(), resultsCount: results.length, results });`
  ];
  const replacements = targets.map(t => `      await stateRef.set({
        lastCheckedAt: now.toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

` + t);
  for (let i = 0; i < targets.length; i++) {
    if (text.includes(targets[i])) {
      text = text.replace(targets[i], replacements[i]);
      changed = true;
      break;
    }
  }
}

// Direct invoice block.
if (!text.includes("invoice-failed-${invoiceId}") && !text.includes("invoice-paid-${invoiceId}") && !text.includes("invoice-pending-10min-${invoiceId}")) {
  const marker = `      // حساب طلبات ومبيعات اليوم
`;
  const invoiceBlock = `      // 1.7) فواتير الأدمن المباشرة INV - shared_company_data.invoices
      // Same stable notification system: data-only + direct claim + businessSince.
      try {
        const claimDirectInvoiceEvent = async (eventId: string) => {
          const ref = db!.collection("pushEvents").doc(eventId);

          try {
            await ref.create({
              eventId,
              status: "claimed",
              claimedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return true;
          } catch (error: any) {
            if (error?.code === 6 || String(error?.message || "").includes("ALREADY_EXISTS")) {
              return false;
            }

            console.error("[DIRECT INVOICE EVENTS] claim failed:", eventId, error);
            return false;
          }
        };

        const markDirectInvoiceSent = async (eventId: string, payload: any, result: any) => {
          await db!.collection("pushEvents").doc(eventId).set({
            ...payload,
            result,
            status: "sent",
            sentAt: new Date().toISOString(),
          }, { merge: true });
        };

        const directInvoiceSnap = await db!.collection("appData").doc("shared_company_data").get();
        const directInvoiceData: any = directInvoiceSnap.exists ? directInvoiceSnap.data() : {};
        const directInvoices: any[] = Array.isArray(directInvoiceData.invoices)
          ? directInvoiceData.invoices
          : [];

        for (const invoice of directInvoices) {
          const invoiceId = invoice.id || invoice.invoiceId || invoice.number;
          if (!invoiceId) continue;

          const invoiceStatusText = [
            invoice.paymentStatus,
            invoice.payment_status,
            invoice.status,
            invoice.statusText,
            invoice.paymentResult,
            invoice.payment_result
          ].filter(Boolean).join(" ").toLowerCase();

          const total = Number(invoice.totalAmount ?? invoice.total ?? invoice.amount ?? 0);
          const amountText = Number.isFinite(total) && total > 0
            ? \` — القيمة \${total.toFixed(3)} د.ك\`
            : "";

          const isInvoiceFailed =
            invoiceStatusText.includes("failed") ||
            invoiceStatusText.includes("fail") ||
            invoiceStatusText.includes("declined") ||
            invoiceStatusText.includes("cancelled") ||
            invoiceStatusText.includes("canceled") ||
            invoiceStatusText.includes("rejected") ||
            invoiceStatusText.includes("فشل") ||
            invoiceStatusText.includes("مرفوض") ||
            invoiceStatusText.includes("ملغي") ||
            invoiceStatusText.includes("إلغاء") ||
            invoiceStatusText.includes("فشل في عملية الدفع");

          const isInvoicePaid =
            invoiceStatusText === "paid" ||
            invoiceStatusText.includes("paid") ||
            invoiceStatusText.includes("success") ||
            invoiceStatusText.includes("successful") ||
            invoiceStatusText.includes("captured") ||
            invoiceStatusText.includes("completed") ||
            invoiceStatusText.includes("مدفوع") ||
            invoiceStatusText.includes("تم الدفع") ||
            invoiceStatusText.includes("ناجح");

          const isInvoicePending =
            !isInvoiceFailed &&
            !isInvoicePaid &&
            (
              invoiceStatusText.includes("pending") ||
              invoiceStatusText.includes("بانتظار") ||
              invoiceStatusText.includes("انتظار") ||
              invoiceStatusText.includes("لم يدفع") ||
              invoiceStatusText.includes("لم تُدفع") ||
              invoiceStatusText.includes("غير مدفوعة") ||
              invoiceStatusText.includes("غير مدفوع") ||
              invoiceStatusText.includes("unpaid") ||
              invoiceStatusText.includes("not paid") ||
              invoiceStatusText.includes("awaiting") ||
              invoiceStatusText.includes("new") ||
              invoiceStatusText.includes("جديد") ||
              invoiceStatusText.includes("تم الإرسال") ||
              Boolean(invoice.paymentLink)
            );

          if (isInvoiceFailed) {
            const invoiceFailedAt =
              getDateValue(invoice.failedAt) ||
              getDateValue(invoice.updatedAt) ||
              getDateValue(invoice.date) ||
              getDateValue(invoice.createdAt) ||
              getDateValue(invoice.timestamp);

            if (!invoiceFailedAt) continue;
            if (invoiceFailedAt <= businessSince) continue;
            if (invoiceFailedAt > now) continue;

            const eventId = \`invoice-failed-\${invoiceId}\`;

            if (!(await claimDirectInvoiceEvent(eventId))) {
              continue;
            }

            const result = await sendSmartAlertPushNotification({
              title: "❌ فشل دفع فاتورة",
              body: \`الفاتورة \${invoiceId} فشل دفعها\${amountText} — تحتاج متابعة\`,
              alertType: "invoice_failed",
              url: \`/?invoice=\${encodeURIComponent(invoiceId)}\`
            });

            await markDirectInvoiceSent(eventId, {
              type: "invoice_failed",
              invoiceId,
              status: invoiceStatusText,
            }, result);

            results.push({ eventId, result });
            continue;
          }

          if (isInvoicePaid) {
            const invoicePaidAt =
              getDateValue(invoice.paidAt) ||
              getDateValue(invoice.updatedAt) ||
              getDateValue(invoice.date) ||
              getDateValue(invoice.createdAt) ||
              getDateValue(invoice.timestamp);

            if (!invoicePaidAt) continue;
            if (invoicePaidAt <= businessSince) continue;
            if (invoicePaidAt > now) continue;

            const eventId = \`invoice-paid-\${invoiceId}\`;

            if (!(await claimDirectInvoiceEvent(eventId))) {
              continue;
            }

            const result = await sendSmartAlertPushNotification({
              title: "✅ تم دفع فاتورة",
              body: \`تم دفع الفاتورة \${invoiceId}\${amountText} — جهزوا الطلب يا أبطال 🔥\`,
              alertType: "invoice_paid",
              url: \`/?invoice=\${encodeURIComponent(invoiceId)}\`
            });

            await markDirectInvoiceSent(eventId, {
              type: "invoice_paid",
              invoiceId,
              status: invoiceStatusText,
            }, result);

            results.push({ eventId, result });
            continue;
          }

          if (isInvoicePending) {
            const invoiceCreatedAt =
              getDateValue(invoice.date) ||
              getDateValue(invoice.createdAt) ||
              getDateValue(invoice.timestamp);

            if (!invoiceCreatedAt) continue;

            const tenMinutesAfterInvoice = new Date(invoiceCreatedAt.getTime() + 10 * 60 * 1000);

            if (tenMinutesAfterInvoice <= businessSince) continue;
            if (tenMinutesAfterInvoice > now) continue;

            const eventId = \`invoice-pending-10min-\${invoiceId}\`;

            if (!(await claimDirectInvoiceEvent(eventId))) {
              continue;
            }

            const result = await sendSmartAlertPushNotification({
              title: "⏳ فاتورة لم تُدفع بعد",
              body: \`الفاتورة \${invoiceId} لم تُدفع منذ 10 دقائق\${amountText}\`,
              alertType: "invoice_pending_10min",
              url: \`/?invoice=\${encodeURIComponent(invoiceId)}\`
            });

            await markDirectInvoiceSent(eventId, {
              type: "invoice_pending_10min",
              invoiceId,
              status: invoiceStatusText,
            }, result);

            results.push({ eventId, result });
          }
        }
      } catch (invoiceAlertError) {
        console.error("[BUSINESS ALERTS] direct invoice alerts failed:", invoiceAlertError);
      }

`;
  if (text.includes(marker)) {
    text = text.replace(marker, invoiceBlock + marker);
    changed = true;
    console.log("OK applied: direct INV alerts.");
  }
}

// Existing INV block safety: local claim helper + no sharedData.
const invStartMarker = '      // 1.7) فواتير الأدمن المباشرة INV';
const invEndMarker = '      } catch (invoiceAlertError) {';
let invStart = text.find(invStartMarker);
let invEnd = text.find(invEndMarker, invStart);
if (invStart !== -1 && invEnd !== -1) {
  let block = text.slice(invStart, invEnd);

  if (!block.includes("claimDirectInvoiceEvent")) {
    const helpers = `      const claimDirectInvoiceEvent = async (eventId: string) => {
        const ref = db!.collection("pushEvents").doc(eventId);

        try {
          await ref.create({
            eventId,
            status: "claimed",
            claimedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          return true;
        } catch (error: any) {
          if (error?.code === 6 || String(error?.message || "").includes("ALREADY_EXISTS")) {
            return false;
          }

          console.error("[DIRECT INVOICE EVENTS] claim failed:", eventId, error);
          return false;
        }
      };

      const markDirectInvoiceSent = async (eventId: string, payload: any, result: any) => {
        await db!.collection("pushEvents").doc(eventId).set({
          ...payload,
          result,
          status: "sent",
          sentAt: new Date().toISOString(),
        }, { merge: true });
      };

`;
    block = block.replace("      try {\n", "      try {\n" + helpers);
  }

  block = block.replace(/claimPushEvent\(eventId\)/g, "claimDirectInvoiceEvent(eventId)");
  block = block.replace(/markSent\(eventId,/g, "markDirectInvoiceSent(eventId,");
  block = block.replace(
`        const directInvoices: any[] = Array.isArray((sharedData as any).invoices)
          ? (sharedData as any).invoices
          : [];`,
`        const directInvoiceSnap = await db!.collection("appData").doc("shared_company_data").get();
        const directInvoiceData: any = directInvoiceSnap.exists ? directInvoiceSnap.data() : {};
        const directInvoices: any[] = Array.isArray(directInvoiceData.invoices)
          ? directInvoiceData.invoices
          : [];`
  );

  text = text.slice(0, invStart) + block + text.slice(invEnd);
  changed = true;
}

// Debug routes.
function addRouteIfMissing(routePath, routeCode) {
  if (text.includes(routePath)) return;
  const marker = '  app.post("/api/push/run-business-alerts"';
  const idx = text.find(marker);
  if (idx === -1) return;
  text = text.slice(0, idx) + routeCode + "\n" + text.slice(idx);
  changed = true;
}

addRouteIfMissing('/api/debug/shared-invoice/:invoiceId', `
  app.get("/api/debug/shared-invoice/:invoiceId", async (req, res) => {
    try {
      const secret = req.headers["x-admin-secret"];
      if (secret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const invoiceId = req.params.invoiceId;

      const sharedSnap = await db!.collection("appData").doc("shared_company_data").get();
      const shared: any = sharedSnap.exists ? sharedSnap.data() : {};

      const result: any = {
        invoiceId,
        sharedKeys: Object.keys(shared || {}),
        matches: []
      };

      for (const [key, value] of Object.entries(shared || {})) {
        if (Array.isArray(value)) {
          for (const item of value as any[]) {
            const text = JSON.stringify(item || {});
            if (text.includes(invoiceId)) {
              result.matches.push({
                arrayKey: key,
                item
              });
            }
          }
        }
      }

      return res.json(result);
    } catch (error: any) {
      console.error("[DEBUG SHARED INVOICE] failed:", error);
      return res.status(500).json({ error: error.message });
    }
  });

`);

addRouteIfMissing('/api/debug/push-event/:eventId', `
  app.get("/api/debug/push-event/:eventId", async (req, res) => {
    try {
      const secret = req.headers["x-admin-secret"];
      if (secret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const eventId = req.params.eventId;
      const doc = await db!.collection("pushEvents").doc(eventId).get();

      if (!doc.exists) {
        return res.json({ exists: false, eventId });
      }

      return res.json({
        exists: true,
        eventId,
        event: doc.data()
      });
    } catch (error: any) {
      console.error("[DEBUG PUSH EVENT] failed:", error);
      return res.status(500).json({ error: error.message });
    }
  });

`);

// Clean bad literal insertion if any.
text = text.replace('\\n  app.post("/api/push/run-business-alerts"', '\n  app.post("/api/push/run-business-alerts"');
text = text.replace('n  app.post("/api/push/run-business-alerts"', '  app.post("/api/push/run-business-alerts"');

fs.writeFileSync(serverPath, text);

console.log(changed ? "DONE: server.ts patched." : "DONE: no changes needed.");
console.log("");
console.log("Verify:");
console.log('grep -n "notification:" server.ts');
console.log('grep -n "claimPushEvent\\\\|claimDirectInvoiceEvent\\\\|slice(0, 1)\\\\|lastCheckedAt: now.toISOString\\\\|businessSince\\\\|business-order-created\\\\|invoice-failed-\\\\|invoice-paid-\\\\|invoice-pending-10min" server.ts');
