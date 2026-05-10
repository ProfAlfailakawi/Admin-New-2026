#!/usr/bin/env node
/**
 * FINAL STABLE Admin Push Fix.
 * Run from admin project root:
 *   node scripts/apply-final-stable-admin-push.js
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

// Data-only FCM: remove notification payloads.
text = text.replace(/\n\s*notification:\s*\{\s*title:\s*[^,\n]+,\s*body:\s*[^,\n]+,\s*\},/g, "");
text = text.replace(/\n\s*notification:\s*\{[\s\S]*?\n\s*\},(?=\n\s*(data|webpush|apns|token|tokens|fcmOptions|android|headers|}\)|}\,))/g, "");
changed = true;
console.log("OK: removed notification payload blocks if present.");

// Date support.
replaceAll(
  "support date in createdAt",
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

// Arabic new status.
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

      const businessSince = lastCheckedAt
        ? new Date(lastCheckedAt.getTime() - 5 * 60 * 1000)
        : now;

` + target;
  if (text.includes(target)) {
    text = text.replace(target, insert);
    changed = true;
    console.log("OK applied: pushState/businessSince.");
  } else {
    console.log("SKIP: const results block not found.");
  }
}

// New order: businessSince + unique event id.
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

// Failed/paid timing with updatedAt first + businessSince.
replaceAll(
  "failed window -> businessSince",
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
  "paid window -> businessSince",
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

// Atomic claim.
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
    console.log("OK applied: claimPushEvent.");
  }
}

replaceAll("alreadySent -> claimPushEvent",
`        if (await alreadySent(eventId)) {
          continue;
        }
`,
`        if (!(await claimPushEvent(eventId))) {
          continue;
        }
`
);

replaceAll("not alreadySent -> claimPushEvent",
`        if (!(await alreadySent(eventId))) {
`,
`        if (await claimPushEvent(eventId)) {
`
);

replaceAll("not alreadySent indent -> claimPushEvent",
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

// Order spike two-hour bucket.
text = text.replace(
`        const hourKey = now.toISOString().slice(0, 13);
        const eventId = \`order-spike-\${hourKey}\`;`,
`        const twoHourBucket = Math.floor(now.getTime() / (2 * 60 * 60 * 1000));
        const eventId = \`order-spike-\${twoHourBucket}\`;`
);
text = text.replace(/hour:\s*hourKey,/g, "hour: twoHourBucket,");

// Update lastCheckedAt.
if (!text.includes("lastCheckedAt: now.toISOString()")) {
  const target = `      return res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });`;
  const repl = `      await stateRef.set({
        lastCheckedAt: now.toISOString(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

      return res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });`;
  if (text.includes(target)) {
    text = text.replace(target, repl);
    changed = true;
  }
}

fs.writeFileSync(serverPath, text);
console.log(changed ? "DONE: server.ts patched." : "DONE: no changes needed.");
console.log('Verify: grep -n "notification:" server.ts');
console.log('Verify: grep -n "claimPushEvent\\\\|slice(0, 1)\\\\|lastCheckedAt: now.toISOString\\\\|businessSince\\\\|business-order-created" server.ts');
