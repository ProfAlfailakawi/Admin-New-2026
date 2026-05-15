
import express from "express";
import cors from "cors";
import admin from "firebase-admin";

admin.initializeApp({ projectId: process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0200723670" });

const db = admin.firestore();
const app = express();
app.use(cors());
app.use(express.json());

const ADMIN_TEST_SECRET = process.env.ADMIN_TEST_SECRET || "123456";
const LOOKBACK_MINUTES = Number(process.env.ALERTS_LOOKBACK_MINUTES || "30");
const MAX_SEND_PER_RUN = Number(process.env.MAX_SEND_PER_RUN || "5");
const START_FROM_ISO = process.env.ALERTS_START_FROM_ISO || "";

function requireSecret(req, res, next) {
  const secret = req.headers["x-admin-secret"] || req.query.secret;
  if (String(secret) !== String(ADMIN_TEST_SECRET)) return res.status(403).json({ success: false, error: "Forbidden" });
  next();
}

function idsFor(x) {
  return [x?.id, x?.invoiceId, x?.invoiceNo, x?.orderId, x?.orderNo, x?.number, x?.tracked_order, x?.requested_order_id]
    .filter(Boolean).map(String);
}

function dateFromBusinessId(id) {
  const m = String(id || "").match(/^(INV|ORD)-(\d{13})-/);
  if (!m) return null;
  const d = new Date(Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateValue(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v?.toDate) return v.toDate();
  if (v?.seconds) return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function bestDate(x) {
  for (const id of idsFor(x)) {
    const d = dateFromBusinessId(id);
    if (d) return d;
  }
  return dateValue(x?.createdAt || x?.created_at || x?.date || x?.updatedAt || x?.paymentUpdatedAt || x?.failedAt || x?.paidAt);
}

function inWindow(itemOrId, now = new Date()) {
  const d = typeof itemOrId === "string" ? dateFromBusinessId(itemOrId) : bestDate(itemOrId);
  if (!d) return false;

  const cutoff = START_FROM_ISO ? new Date(START_FROM_ISO) : null;
  if (cutoff && d < cutoff) return false;

  const lookback = new Date(now.getTime() - LOOKBACK_MINUTES * 60 * 1000);
  return d >= lookback;
}

function businessIdFor(x, prefix = "") {
  const ids = idsFor(x);
  if (prefix) return ids.find(id => id.startsWith(prefix)) || "";
  return ids.find(id => /^INV-\d{13}-/.test(id) || /^ORD-\d{13}-/.test(id)) || ids[0] || "";
}

function statusFor(x) {
  return String(x?.status || x?.paymentStatus || x?.payment_status || x?.state || "").toLowerCase();
}
function isPaid(s) {
  return s.includes("paid") || s.includes("captured") || s.includes("تم الدفع") || s.includes("مدفوع") || s.includes("جاري التوصيل");
}
function isFailed(s) {
  return s.includes("failed") || s.includes("not captured") || s.includes("declined") || s.includes("فشل") || s.includes("فشلت");
}
function isPending(s) {
  return s === "" || s.includes("pending") || s.includes("pending_payment") || s.includes("new_order_pending_payment") ||
    s.includes("order_created_pending_payment") || s.includes("unpaid") || s.includes("بانتظار") ||
    s.includes("انتظار الدفع") || s.includes("لم يدفع") || s.includes("لم تُدفع") || s.includes("waiting");
}
function isCancelled(s) {
  return s.includes("cancelled") || s.includes("canceled") || s.includes("ملغي") || s.includes("ملغى") ||
    s.includes("تم الإلغاء") || s.includes("تم الالغاء");
}
function isQatiaExpired(s) {
  return s.includes("انتهى وقت القطية") || s.includes("انتهى وقت القطيه") ||
    s.includes("ملغي - انتهى وقت القطية") || s.includes("ملغي - انتهى وقت القطيه") ||
    s.includes("qatia expired") || s.includes("split expired");
}
function isRoulette(item, s) {
  return s.includes("روليت") || s.includes("roulette") ||
    String(item?.type || "").toLowerCase().includes("roulette") ||
    String(item?.orderType || "").toLowerCase().includes("roulette") ||
    String(item?.splitType || "").toLowerCase().includes("roulette");
}
function isQatiaLike(item, s) {
  return !isRoulette(item, s) && (
    s.includes("قطية") || s.includes("قطيه") || s.includes("split") ||
    String(item?.type || "").toLowerCase().includes("qatia") ||
    String(item?.type || "").toLowerCase().includes("split") ||
    String(item?.orderType || "").toLowerCase().includes("qatia") ||
    String(item?.orderType || "").toLowerCase().includes("split") ||
    String(item?.splitType || "").toLowerCase().includes("qatia") ||
    String(item?.splitType || "").toLowerCase().includes("split") ||
    Array.isArray(item?.splitParticipants) || Boolean(item?.splitPayments)
  );
}
function amountText(x) {
  const n = Number(x?.totalAmount ?? x?.total ?? x?.amount ?? x?.price ?? 0);
  return Number.isFinite(n) && n > 0 ? ` — القيمة ${n.toFixed(3)} د.ك` : "";
}

async function latestActiveToken() {
  const snap = await db.collection("pushTokens").where("active", "==", true).get();
  const docs = snap.docs.map(d => ({ id: d.id, data: d.data() }))
    .filter(x => Boolean(x.data.token))
    .sort((a, b) => {
      const at = a.data.updatedAt?.toMillis ? a.data.updatedAt.toMillis() : 0;
      const bt = b.data.updatedAt?.toMillis ? b.data.updatedAt.toMillis() : 0;
      return bt - at;
    });
  return docs[0]?.data?.token || null;
}

async function claim(eventId) {
  const ref = db.collection("pushEvents").doc(eventId);
  const snap = await ref.get();
  if (snap.exists) return false;
  await ref.set({ eventId, source: "alerts-worker-final-clean-v2", createdAt: admin.firestore.FieldValue.serverTimestamp() });
  return true;
}

async function sendDataOnly({ title, body, alertType, eventId, url }) {
  const token = await latestActiveToken();
  if (!token) return { success: false, error: "No active push token" };
  const messageId = await admin.messaging().send({
    token,
    data: { type: "smart_alert", alertType: String(alertType), eventId: String(eventId), title: String(title), body: String(body), url: String(url), click_action: String(url) },
    webpush: { headers: { Urgency: "high", TTL: "86400" }, fcmOptions: { link: String(url) } },
  });
  return { success: true, messageId };
}

async function sendOnce(results, eventId, payload, dryRun, counters) {
  if (dryRun) {
    results.push({ eventId, dryRun: true, payload });
    return;
  }
  if (counters.sent >= MAX_SEND_PER_RUN) {
    results.push({ eventId, skipped: true, reason: "max-send-per-run-reached" });
    return;
  }
  const ok = await claim(eventId);
  if (!ok) {
    results.push({ eventId, skipped: true, reason: "already-sent" });
    return;
  }
  const result = await sendDataOnly({ ...payload, eventId });
  if (result.success) counters.sent += 1;
  results.push({ eventId, result });
}

async function readRecentPushEvents(limit = 1000) {
  try {
    return await db.collection("pushEvents").orderBy("createdAt", "desc").limit(limit).get();
  } catch {
    return await db.collection("pushEvents").limit(limit).get();
  }
}

async function getRecentFailedInvoiceIdsFromPushEvents() {
  const snap = await readRecentPushEvents(1000);
  const ids = new Set();
  for (const doc of snap.docs) {
    const raw = `${doc.id} ${JSON.stringify(doc.data() || {})}`;
    const looksFailed = raw.includes("invoice-failed") || raw.includes("invoice_failed") ||
      raw.includes("فشل دفع فاتورة") || raw.includes("فشل دفع الفاتورة");
    if (!looksFailed) continue;

    const matches = raw.match(/INV-\d{13}-[A-Z0-9]+/g) || [];
    for (const id of matches) {
      if (inWindow(id)) ids.add(id);
    }
  }
  return Array.from(ids);
}

async function syncFailedInvoicesFromPushEvents() {
  const failedInvoiceIds = await getRecentFailedInvoiceIdsFromPushEvents();
  if (failedInvoiceIds.length === 0) return { updated: 0, ids: [] };

  const ref = db.collection("appData").doc("shared_company_data");
  const snap = await ref.get();
  const shared = snap.data() || {};
  let invoices = Array.isArray(shared.invoices) ? [...shared.invoices] : [];
  let orders = Array.isArray(shared.orders) ? [...shared.orders] : [];

  const markFailed = (id, item = {}) => ({
    ...item,
    id,
    invoiceId: id,
    invoiceNo: id,
    tracked_order: id,
    requested_order_id: id,
    source: item?.source || "payment-return-failed-event",
    type: item?.type || "admin_invoice",
    status: "فشل في عملية الدفع",
    paymentStatus: "failed",
    payment_status: "failed",
    paid: false,
    failed: true,
    canPay: true,
    createdAt: item?.createdAt || dateFromBusinessId(id)?.toISOString() || new Date().toISOString(),
    failedAt: item?.failedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  let updated = 0;

  for (const id of failedInvoiceIds) {
    const invoiceMatches = invoices.filter(x => idsFor(x).includes(id));
    const orderMatches = orders.filter(x => idsFor(x).includes(id));
    const base = invoiceMatches[invoiceMatches.length - 1] || orderMatches[orderMatches.length - 1] || {
      id, invoiceId: id, invoiceNo: id, tracked_order: id, requested_order_id: id,
      source: "payment-return-failed-event", type: "admin_invoice",
    };

    invoices = [...invoices.filter(x => !idsFor(x).includes(id)), markFailed(id, base)];
    orders = orders.filter(x => !idsFor(x).includes(id)); // no INV mirrors; prevents double in track
    updated += 1;
  }

  if (updated > 0) {
    await ref.set({
      invoices,
      orders,
      updatedAt: new Date().toISOString(),
      lastAutoSyncedFailedInvoicesFinalCleanV2: { ids: failedInvoiceIds, updated, at: new Date().toISOString() },
    }, { merge: true });
  }

  return { updated, ids: failedInvoiceIds };
}

async function loadSharedData() {
  const snap = await db.collection("appData").doc("shared_company_data").get();
  return snap.data() || {};
}

async function reconcile({ dryRun = false } = {}) {
  const counters = { sent: 0 };
  const results = [];
  const now = new Date();
  const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

  let syncResult = { updated: 0, ids: [] };
  if (!dryRun) syncResult = await syncFailedInvoicesFromPushEvents();

  const failedInvoiceIds = new Set(await getRecentFailedInvoiceIdsFromPushEvents());
  const shared = await loadSharedData();
  const invoices = Array.isArray(shared.invoices) ? shared.invoices : [];
  const orders = Array.isArray(shared.orders) ? shared.orders : [];

  for (const inv of invoices) {
    const invoiceId = businessIdFor(inv, "INV-");
    if (!invoiceId || !inWindow(inv, now)) continue;

    const s = statusFor(inv);

    if (failedInvoiceIds.has(invoiceId) || isFailed(s)) {
      results.push({ eventId: `safe-worker-invoice-failed-${invoiceId}`, skipped: true, reason: "invoice-failed-notification-owned-by-payment-return-sync-only" });
      continue;
    }

    if (isPaid(s)) {
      await sendOnce(results, `safe-worker-invoice-paid-${invoiceId}`, {
        title: "✅ تم دفع فاتورة",
        body: `تم دفع الفاتورة ${invoiceId}${amountText(inv)}`,
        alertType: "invoice_paid",
        url: `https://alturath-admin-0200723670.web.app/?invoice=${encodeURIComponent(invoiceId)}`,
      }, dryRun, counters);
      continue;
    }

    if (isPending(s)) {
      await sendOnce(results, `safe-worker-invoice-pending-immediate-${invoiceId}`, {
        title: "⏳ فاتورة بانتظار الدفع",
        body: `الفاتورة ${invoiceId} بانتظار الدفع${amountText(inv)}`,
        alertType: "invoice_pending_immediate",
        url: `https://alturath-admin-0200723670.web.app/?invoice=${encodeURIComponent(invoiceId)}`,
      }, dryRun, counters);

      const d = bestDate(inv) || now;
      if (d <= tenMinutesAgo) {
        await sendOnce(results, `safe-worker-invoice-pending-10min-${invoiceId}`, {
          title: "⏳ فاتورة لم تُدفع بعد 10 دقائق",
          body: `الفاتورة ${invoiceId} لم تُدفع بعد 10 دقائق${amountText(inv)}`,
          alertType: "invoice_pending_10min",
          url: `https://alturath-admin-0200723670.web.app/?invoice=${encodeURIComponent(invoiceId)}`,
        }, dryRun, counters);
      }
    }
  }

  for (const order of orders) {
    const orderId = businessIdFor(order, "ORD-");
    if (!orderId || !inWindow(order, now)) continue; // ignore any INV in orders

    const s = statusFor(order);
    const qatia = isQatiaLike(order, s);

    if (qatia && isPaid(s) && !isQatiaExpired(s)) {
      await sendOnce(results, `safe-worker-qatia-completed-${orderId}`, {
        title: "✅ اكتملت القطية",
        body: `اكتملت القطية للطلب ${orderId} — تم الدفع وجاري التوصيل${amountText(order)}`,
        alertType: "qatia_completed",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);
      continue;
    }

    if (qatia && isQatiaExpired(s)) {
      await sendOnce(results, `safe-worker-qatia-expired-${orderId}`, {
        title: "⏰ ملغي - انتهى وقت القطية",
        body: `الطلب ${orderId} تم إلغاؤه لانتهاء وقت القطية${amountText(order)}`,
        alertType: "qatia_expired",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);
      continue;
    }

    if (qatia) continue; // in-progress qatia and admin-cancel: no alert

    if (isFailed(s)) {
      await sendOnce(results, `safe-worker-payment-failed-${orderId}`, {
        title: "❌ فشل دفع طلب",
        body: `فشل دفع الطلب ${orderId}${amountText(order)}`,
        alertType: "payment_failed",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);
      continue;
    }

    if (isPaid(s)) {
      await sendOnce(results, `safe-worker-payment-paid-${orderId}`, {
        title: "✅ تم دفع طلب",
        body: `تم دفع الطلب ${orderId}${amountText(order)}`,
        alertType: "payment_paid",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);
      continue;
    }

    if (isCancelled(s)) {
      await sendOnce(results, `safe-worker-order-cancelled-admin-${orderId}`, {
        title: "🚫 تم إلغاء طلب",
        body: `تم إلغاء الطلب ${orderId}${amountText(order)}`,
        alertType: "order_cancelled_admin",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);
      continue;
    }

    if (isPending(s)) {
      await sendOnce(results, `safe-worker-payment-pending-immediate-${orderId}`, {
        title: "⏳ طلب بانتظار الدفع",
        body: `الطلب ${orderId} بانتظار الدفع${amountText(order)}`,
        alertType: "payment_pending_immediate",
        url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
      }, dryRun, counters);

      const d = bestDate(order) || now;
      if (d <= tenMinutesAgo) {
        await sendOnce(results, `safe-worker-payment-pending-10min-${orderId}`, {
          title: "⏳ طلب لم يُدفع بعد 10 دقائق",
          body: `الطلب ${orderId} لم يُدفع بعد 10 دقائق${amountText(order)}`,
          alertType: "payment_pending_10min",
          url: `https://alturath-admin-0200723670.web.app/?order=${encodeURIComponent(orderId)}`,
        }, dryRun, counters);
      }
    }
  }

  return {
    meta: {
      lookbackMinutes: LOOKBACK_MINUTES,
      maxSendPerRun: MAX_SEND_PER_RUN,
      startFromIso: START_FROM_ISO || null,
      sent: counters.sent,
      syncFailedInvoices: syncResult,
    },
    results,
  };
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "alerts-worker-final-clean-v2",
    lookbackMinutes: LOOKBACK_MINUTES,
    maxSendPerRun: MAX_SEND_PER_RUN,
    startFromIso: START_FROM_ISO || null,
  });
});

app.post("/run-alerts", requireSecret, async (req, res) => {
  try {
    const dryRun = req.query.dryRun === "1" || req.body?.dryRun === true;
    const { meta, results } = await reconcile({ dryRun });
    res.json({ success: true, checkedAt: new Date().toISOString(), ...meta, resultsCount: results.length, results });
  } catch (e) {
    console.error("[alerts-worker-final-clean-v2] error", e);
    res.status(500).json({ success: false, error: e.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`alerts-worker-final-clean-v2 listening on ${port}`));
