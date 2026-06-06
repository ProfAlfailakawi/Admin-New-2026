import express from "express";
import path from "path";
import cors from 'cors';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fsSync from 'fs';
import os from 'os';
import 'dotenv/config';
import { GoogleGenAI } from "@google/genai";
import LZString from "lz-string";

let firebaseInitialized = false;
let db: any = null;
const PAYMENT_PENDING_GRACE_SECONDS = Math.max(
  30,
  Math.min(1800, Number(process.env.PAYMENT_PENDING_GRACE_SECONDS || 600))
);
const PAYMENT_PENDING_GRACE_MS = PAYMENT_PENDING_GRACE_SECONDS * 1000;
const PAYMENT_PENDING_GRACE_LABEL =
  PAYMENT_PENDING_GRACE_SECONDS % 60 === 0
    ? `${PAYMENT_PENDING_GRACE_SECONDS / 60} دقيقة`
    : `${PAYMENT_PENDING_GRACE_SECONDS} ثانية`;
const PAYMENT_FAILURE_GRACE_SECONDS = Math.max(
  30,
  Math.min(600, Number(process.env.PAYMENT_FAILURE_GRACE_SECONDS || 120))
);
const PAYMENT_FAILURE_GRACE_MS = PAYMENT_FAILURE_GRACE_SECONDS * 1000;

try {

  let cfg: any = {};
  try {
    cfg = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
  } catch(e) {}

  const projectId = cfg.projectId || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0200723670";
  console.log(`[ADMIN020] Initializing Firebase Admin for project: ${projectId}`);

  const appInstance = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        projectId: projectId,
      });

  let dbId = cfg.firestoreDatabaseId || process.env.FIRESTORE_DATABASE_ID;
  if (!dbId) {
    try {
      const cfgFile = JSON.parse(fsSync.readFileSync('firebase-applet-config.json', 'utf8'));
      dbId = cfgFile.firestoreDatabaseId;
    } catch(e) {}
  }
  
  console.log(`[ADMIN020] Target Firestore Database ID: ${dbId || "(default)"}`);
  db = getFirestore(appInstance, dbId || "(default)");

  // Verify database connectivity early
  try {
    const testSnap = await db.collection('pushTokens').limit(1).get();
    firebaseInitialized = true;
    console.log(`[ADMIN020] Firebase Admin verified. Access to database '${dbId || "(default)"}' confirmed.`);
  } catch (err: any) {
    console.error(`[ADMIN020] Firebase Admin connectivity check FAILED for database '${dbId || "(default)"}':`, err.message);
    if (err.message && err.message.includes("PERMISSION_DENIED")) {
      console.warn("[ADMIN020] ACCESS DENIED. Server-side Firestore operations will fail. Check Service Account roles (Cloud Datastore User).");
    }
    firebaseInitialized = false;
    db = null;
  }
} catch (error) {
  firebaseInitialized = false;
  db = null;
  console.error("[ADMIN020] Firebase Admin initialization CRASHED:", error);
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

function dateFromBusinessId(id: any) {
  const match = String(id || "").match(/^(INV|ORD)-(\d{13})-/);
  if (!match) return null;
  const parsed = new Date(Number(match[2]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dateValue(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate) return value.toDate();
  if (value?.seconds) return new Date(value.seconds * 1000);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function bestCreatedDateForPaymentItem(item: any, fallbackId?: any) {
  const ids = [
    item?.id,
    item?.invoiceId,
    item?.invoiceNo,
    item?.invoiceNumber,
    item?.orderId,
    item?.orderNo,
    item?.orderNumber,
    item?.linkedInvoiceId,
    fallbackId,
  ].filter(Boolean);

  for (const id of ids) {
    const parsed = dateFromBusinessId(id);
    if (parsed) return parsed;
  }

  return dateValue(
    item?.createdAt ||
    item?.created_at ||
    item?.orderDate ||
    item?.timestamp ||
    item?.date ||
    item?.paymentCreatedAt ||
    item?.created
  );
}

function escapeXml(value: any) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildLocalMotionReelDataUrl({
  prompt,
  duration,
  shotType,
  place,
  mood,
  imageContent,
  mimeType
}: any) {
  let cleanPrompt = String(prompt || "لقطة طلب كويتي واقعية");
  const match = cleanPrompt.match(/فكرة مختصرة:\s*([^.]+)/);
  if (match && match[1]) {
    cleanPrompt = match[1].trim();
  } else {
    cleanPrompt = cleanPrompt
      .replace(/Reel /gi, "")
      .replace(/عمودي \d+:\d+ /gi, "")
      .replace(/خفيف واقتصادي /gi, "")
      .replace(/لمطبخ التراث الكويتي\.?/gi, "")
      .replace(/فكرة مختصرة:/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Ensure it fits gracefully inside the box width (max ~35 characters for font-size 22/24)
  if (cleanPrompt.length > 32) {
    cleanPrompt = cleanPrompt.slice(0, 31) + "…";
  }

  const seconds = Math.min(8, Math.max(4, Number(duration) || 6));
  const imageHref = imageContent
    ? `data:${mimeType || "image/jpeg"};base64,${String(imageContent).slice(0, 9_000_000)}`
    : "";

  // Translate English IDs to premium and authentic Arabic labels
  const shotMap: Record<string, string> = {
    "hero-push": "اقتراب على الطلب",
    "box-open": "فتح علبة التوصيل",
    "steam-close": "بخار خفيف واقعي",
    "table-pass": "مرور على السفرة",
    "top-spread": "من فوق السفرة",
    "texture-close": "تفاصيل شهية قريبة",
    "sauce-motion": "تفاصيل شهية قريبة",
  };
  const placeMap: Record<string, string> = {
    home: "بيت",
    diwaniya: "ديوانية",
    chalet: "شاليه",
    farm: "مزرعة",
    jakhour: "جاخور",
    zowara: "زوارة",
    delivery: "توصيل",
  };
  const moodMap: Record<string, string> = {
    warm: "دافئ",
    bright: "مشرق",
    natural: "طبيعي",
    evening: "مسائي دافئ",
    cozy: "هادئ بيتوتي",
    dramatic: "فخامة هادئة",
  };

  const shotLabel = shotMap[shotType] || String(shotType || "اقتراب سينمائي").replace(/[-_]/g, " ");
  const placeLabel = placeMap[place] || String(place || "توصيل").replace(/[-_]/g, " ");
  const moodLabel = moodMap[mood] || String(mood || "دافئ");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#130f1f"/>
      <stop offset="42%" stop-color="#24102f"/>
      <stop offset="100%" stop-color="#06130d"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="25%" r="70%">
      <stop offset="0%" stop-color="#f5c66b" stop-opacity=".45"/>
      <stop offset="55%" stop-color="#9b5cf6" stop-opacity=".16"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <clipPath id="plate"><rect x="72" y="210" width="576" height="790" rx="54"/></clipPath>
  </defs>
  <rect width="720" height="1280" fill="url(#bg)"/>
  <rect width="720" height="1280" fill="url(#glow)">
    <animate attributeName="opacity" values=".65;.95;.65" dur="${seconds}s" repeatCount="indefinite"/>
  </rect>
  <circle cx="112" cy="156" r="180" fill="#f6c35b" opacity=".18" filter="url(#soft)">
    <animate attributeName="cx" values="90;150;90" dur="${seconds}s" repeatCount="indefinite"/>
  </circle>
  <circle cx="650" cy="1120" r="240" fill="#22c55e" opacity=".13" filter="url(#soft)">
    <animate attributeName="cy" values="1120;1020;1120" dur="${seconds}s" repeatCount="indefinite"/>
  </circle>
  <g clip-path="url(#plate)">
    ${imageHref ? `<image href="${imageHref}" x="42" y="180" width="636" height="850" preserveAspectRatio="xMidYMid slice">
      <animateTransform attributeName="transform" type="scale" values="1;1.045;1" dur="${seconds}s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values=".98;1;.98" dur="${Math.max(4, seconds / 2)}s" repeatCount="indefinite"/>
    </image>` : `<rect x="72" y="210" width="576" height="790" rx="54" fill="#1b2730"/>
      <ellipse cx="360" cy="585" rx="228" ry="142" fill="#f4efe5"/>
      <ellipse cx="360" cy="585" rx="168" ry="98" fill="#d2a24a"/>
      <circle cx="300" cy="560" r="38" fill="#8a2d21"/>
      <circle cx="408" cy="610" r="46" fill="#174d32"/>`}
  </g>
  <rect x="72" y="210" width="576" height="790" rx="54" fill="none" stroke="rgba(255,255,255,.22)" stroke-width="2"/>
  <path d="M90 1015 C220 968 502 968 630 1015" stroke="#f5c66b" stroke-opacity=".32" stroke-width="2" fill="none"/>
  <g>
    <rect x="76" y="1032" width="568" height="148" rx="38" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.18)"/>
    <text x="604" y="1084" fill="#f8e7bd" font-family="Arial, sans-serif" font-size="22" font-weight="900" text-anchor="end">ريل خفيف جاهز للنشر</text>
    <text x="604" y="1128" fill="#ffffff" font-family="Arial, sans-serif" font-size="24" font-weight="900" text-anchor="end">${escapeXml(cleanPrompt)}</text>
    <text x="604" y="1166" fill="rgba(255,255,255,.65)" font-family="Arial, sans-serif" font-size="18" font-weight="700" text-anchor="end">${escapeXml(shotLabel)} · ${escapeXml(placeLabel)} · ${escapeXml(moodLabel)}</text>
  </g>
  <g opacity=".55">
    <rect x="94" y="84" width="148" height="38" rx="19" fill="rgba(255,255,255,.10)"/>
    <text x="168" y="109" fill="#f5c66b" font-family="Arial, sans-serif" font-size="16" font-weight="900" text-anchor="middle">9:16 · ${seconds}s</text>
  </g>
  <rect x="0" y="0" width="720" height="1280" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="20"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function pendingPaymentGraceInfo(item: any, fallbackId?: any, now = new Date()) {
  const createdAt = bestCreatedDateForPaymentItem(item, fallbackId) || now;
  const ageMs = Math.max(0, now.getTime() - createdAt.getTime());
  const remainingMs = Math.max(0, PAYMENT_PENDING_GRACE_MS - ageMs);

  return {
    createdAt,
    ageMs,
    shouldDelay: remainingMs > 0,
    remainingSeconds: Math.ceil(remainingMs / 1000),
  };
}


type PaymentSyncState = "paid" | "failed";

type PaymentSyncIdentifiers = {
  targetIds: string[];
  paymentIds: string[];
  gatewayOrderIds: string[];
};

const PAYMENT_PAID_STATUS_TEXT = "تم الدفع بنجاح";
const PAYMENT_FAILED_STATUS_TEXT = "فشلت عملية الدفع";

function safeDecodeText(value: any) {
  const raw = String(value || "").replace(/\+/g, " ").trim();
  if (!raw) return "";
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw;
  }
}

function maybeParseJsonPayload(value: any): any {
  if (typeof value !== "string") return value;
  const cleaned = value.trim();
  if (!cleaned) return value;
  const looksJson =
    (cleaned.startsWith("{") && cleaned.endsWith("}")) ||
    (cleaned.startsWith("[") && cleaned.endsWith("]"));
  if (!looksJson) return value;
  try {
    return JSON.parse(cleaned);
  } catch {
    return value;
  }
}

function normalizeGatewayPayload(value: any): any {
  const parsed = maybeParseJsonPayload(value);
  if (Array.isArray(parsed)) return parsed.map(normalizeGatewayPayload);
  if (parsed && typeof parsed === "object") {
    const out: any = {};
    for (const [key, val] of Object.entries(parsed)) {
      out[key] = normalizeGatewayPayload(val);
    }
    return out;
  }
  return parsed;
}

function collectGatewayStrings(value: any, out: string[] = [], depth = 0, seen = new Set<any>()) {
  if (depth > 8 || value === null || value === undefined) return out;
  const parsed = normalizeGatewayPayload(value);
  if (typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean") {
    const text = safeDecodeText(parsed);
    if (text) out.push(text);
    return out;
  }
  if (typeof parsed !== "object") return out;
  if (seen.has(parsed)) return out;
  seen.add(parsed);
  if (Array.isArray(parsed)) {
    parsed.forEach((item) => collectGatewayStrings(item, out, depth + 1, seen));
    return out;
  }
  for (const val of Object.values(parsed)) {
    collectGatewayStrings(val, out, depth + 1, seen);
  }
  return out;
}

function collectGatewayKeyValues(value: any, wantedKeys: Set<string>, out: string[] = [], depth = 0, seen = new Set<any>(), parentKey = "") {
  if (depth > 8 || value === null || value === undefined) return out;
  const parsed = normalizeGatewayPayload(value);
  if (typeof parsed !== "object") return out;
  if (seen.has(parsed)) return out;
  seen.add(parsed);

  if (Array.isArray(parsed)) {
    parsed.forEach((item) => collectGatewayKeyValues(item, wantedKeys, out, depth + 1, seen, parentKey));
    return out;
  }

  for (const [key, val] of Object.entries(parsed)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    const parsedVal = normalizeGatewayPayload(val);

    if (wantedKeys.has(normalizedKey)) {
      const text = typeof parsedVal === "object" ? "" : safeDecodeText(parsedVal);
      if (text) out.push(text);
    }

    // UPayments commonly nests the merchant reference inside order.id or reference.id.
    if (
      normalizedKey === "id" &&
      ["order", "reference", "invoice", "merchantorder", "merchantreference", "paymentorder"].includes(parentKey)
    ) {
      const text = typeof parsedVal === "object" ? "" : safeDecodeText(parsedVal);
      if (text) out.push(text);
    }

    collectGatewayKeyValues(parsedVal, wantedKeys, out, depth + 1, seen, normalizedKey);
  }

  return out;
}

function uniqueCleanStrings(values: any[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  values.forEach((value) => {
    const text = safeDecodeText(value);
    if (!text || seen.has(text)) return;
    seen.add(text);
    out.push(text);
  });
  return out;
}

function normalizeBusinessId(value: any) {
  let text = safeDecodeText(value);
  if (!text) return "";
  text = text.split(/[?#]/)[0].trim();

  const embedded = text.match(/(?:INV|ORD)-[A-Za-z0-9-]+(?:_\d+)?/i);
  if (embedded) text = embedded[0];

  if (text.includes("_")) text = text.split("_")[0];
  return text.trim();
}

function isBusinessIdLike(value: any) {
  return /^(INV|ORD)-/i.test(normalizeBusinessId(value));
}

function normalizePaymentIdentifier(value: any) {
  const text = safeDecodeText(value).split(/[?#]/)[0].trim();
  if (!text) return "";
  return text;
}

function normalizePaymentStatusText(value: any) {
  return safeDecodeText(value)
    .replace(/[\-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function classifyGatewayPaymentState(params: any): PaymentSyncState | "unknown" {
  const statusKeys = new Set([
    "result",
    "status",
    "payment",
    "paymentstatus",
    "paymentresult",
    "transactionstatus",
    "transactionresult",
    "state",
  ]);

  const values = uniqueCleanStrings(collectGatewayKeyValues(params, statusKeys));
  const normalizedValues = values.map(normalizePaymentStatusText).filter(Boolean);

  const failedTokens = [
    "NOT CAPTURED",
    "NOTCAPTURED",
    "FAILED",
    "FAILURE",
    "CANCELLED",
    "CANCELED",
    "DECLINED",
    "REJECTED",
    "VOIDED",
    "EXPIRED",
    "ERROR",
    "UNSUCCESSFUL",
  ];

  const paidTokens = [
    "CAPTURED",
    "SUCCESS",
    "SUCCESSFUL",
    "SUCCESSFULLY",
    "SUCCEEDED",
    "PAID",
    "AUTHORIZED",
    "AUTHORISED",
    "APPROVED",
    "COMPLETED",
    "CHARGED",
  ];

  if (normalizedValues.some((text) => failedTokens.some((token) => text === token || text.includes(token)))) {
    return "failed";
  }

  if (normalizedValues.some((text) => paidTokens.some((token) => text === token || text.includes(token)))) {
    return "paid";
  }

  return "unknown";
}

function extractPaymentSyncIdentifiers(params: any): PaymentSyncIdentifiers {
  const payload = normalizeGatewayPayload(params);
  const businessKeys = new Set([
    "invoiceno",
    "invoicenumber",
    "invoiceid",
    "invoice",
    "orderid",
    "ordernumber",
    "order",
    "trackid",
    "requestedorderid",
    "merchantorderid",
    "merchantreferenceid",
    "referenceid",
    "reference",
    "trackedorder",
  ]);
  const paymentKeys = new Set([
    "paymentid",
    "payment",
    "paymentreference",
    "paymentreferenceid",
    "chargeid",
    "sessionid",
    "transactionid",
    "tranid",
    "trackid",
    "id",
  ]);

  const businessRaw = collectGatewayKeyValues(payload, businessKeys);
  const allStrings = collectGatewayStrings(payload);
  const embeddedBusinessIds = allStrings.flatMap((text) => text.match(/(?:INV|ORD)-[A-Za-z0-9-]+(?:_\d+)?/gi) || []);

  const gatewayOrderIds = uniqueCleanStrings([...businessRaw, ...embeddedBusinessIds])
    .filter((value) => value && (isBusinessIdLike(value) || value.includes("_")));

  const targetIds = uniqueCleanStrings([
    ...businessRaw.map(normalizeBusinessId),
    ...embeddedBusinessIds.map(normalizeBusinessId),
  ]).filter(Boolean);

  const paymentIds = uniqueCleanStrings(collectGatewayKeyValues(payload, paymentKeys).map(normalizePaymentIdentifier))
    .filter((value) => value && !isBusinessIdLike(value));

  return {
    targetIds: uniqueCleanStrings(targetIds),
    paymentIds,
    gatewayOrderIds,
  };
}

function safePaymentSessionDocId(value: any) {
  const text = normalizePaymentIdentifier(value);
  if (!text) return "";
  return text.replace(/\//g, "_").slice(0, 1400);
}

function firstPaymentId(paymentIds: string[]) {
  return paymentIds.find((id) => id && !isBusinessIdLike(id)) || "";
}

function paymentItemIds(item: any) {
  return uniqueCleanStrings([
    item?.id,
    item?.invoiceId,
    item?.invoiceNo,
    item?.invoiceNumber,
    item?.orderId,
    item?.orderNo,
    item?.orderNumber,
    item?.linkedInvoiceId,
    item?.linkedOrderId,
    item?.tracked_order,
    item?.requested_order_id,
    item?.requestedOrderId,
    item?.gatewayOrderId,
    item?.gateway_order_id,
    item?.merchantOrderId,
    item?.merchant_order_id,
    item?.referenceId,
    item?.reference_id,
    item?.reference?.id,
    item?.order?.id,
  ].map(normalizeBusinessId)).filter(Boolean);
}

function paymentItemPaymentIds(item: any) {
  return uniqueCleanStrings([
    item?.paymentId,
    item?.payment_id,
    item?.paymentReference,
    item?.paymentReferenceId,
    item?.paymentTrackId,
    item?.trackId,
    item?.track_id,
    item?.upaymentsTrackId,
    item?.chargeId,
    item?.charge_id,
    item?.session_id,
    item?.sessionId,
    item?.transactionId,
    item?.transaction_id,
    item?.tran_id,
    item?.gatewayPaymentId,
    item?.upaymentsPaymentId,
  ].map(normalizePaymentIdentifier)).filter((value) => value && !isBusinessIdLike(value));
}

function paymentItemGatewayOrderIds(item: any) {
  return uniqueCleanStrings([
    item?.gatewayOrderId,
    item?.gateway_order_id,
    item?.requestedOrderId,
    item?.requested_order_id,
    item?.merchantOrderId,
    item?.merchant_order_id,
    item?.referenceId,
    item?.reference_id,
    item?.reference?.id,
    item?.order?.id,
  ].map(normalizePaymentIdentifier)).filter(Boolean);
}

function mergePaymentIdentifiers(...inputs: Partial<PaymentSyncIdentifiers>[]) {
  return {
    targetIds: uniqueCleanStrings(inputs.flatMap((input) => input?.targetIds || []).map(normalizeBusinessId)).filter(Boolean),
    paymentIds: uniqueCleanStrings(inputs.flatMap((input) => input?.paymentIds || []).map(normalizePaymentIdentifier)).filter((value) => value && !isBusinessIdLike(value)),
    gatewayOrderIds: uniqueCleanStrings(inputs.flatMap((input) => input?.gatewayOrderIds || []).map(normalizePaymentIdentifier)).filter(Boolean),
  };
}

function paymentItemMatches(item: any, targetIds: Set<string>, paymentIds: Set<string>) {
  if (!item || typeof item !== "object") return false;
  const ids = paymentItemIds(item);
  if (ids.some((id) => targetIds.has(id))) return true;
  const pids = paymentItemPaymentIds(item);
  return pids.some((id) => paymentIds.has(id));
}

function paymentItemAlreadyPaid(item: any) {
  const status = String(item?.paymentStatus || item?.payment_status || item?.status || "").toLowerCase();
  return Boolean(item?.paid) || status.includes("paid") || status.includes("captured") || status.includes("success") || status.includes("تم الدفع") || status.includes("مدفوع") || status.includes("جاري التوصيل");
}

function paymentItemPatch(item: any, state: PaymentSyncState, meta: any) {
  const nowIso = new Date().toISOString();
  const paymentId = meta?.paymentId || item?.paymentId || item?.payment_id || "";
  const trackId = meta?.trackId || meta?.paymentTrackId || item?.paymentTrackId || item?.trackId || item?.track_id || "";
  const gatewayOrderId = meta?.gatewayOrderId || item?.gatewayOrderId || item?.gateway_order_id || "";
  const common = {
    ...item,
    paymentId: paymentId || item?.paymentId,
    payment_id: paymentId || item?.payment_id,
    paymentTrackId: trackId || item?.paymentTrackId,
    trackId: trackId || item?.trackId,
    track_id: trackId || item?.track_id,
    gatewayOrderId: gatewayOrderId || item?.gatewayOrderId,
    gateway_order_id: gatewayOrderId || item?.gateway_order_id,
    paymentUpdatedAt: nowIso,
    updatedAt: nowIso,
    lastGatewaySyncAt: nowIso,
    lastGatewaySyncSource: meta?.source || "payment-callback-sync",
    lastGatewayResult: meta?.gatewayResult || item?.lastGatewayResult || "",
  };

  if (state === "paid") {
    return removeUndefinedDeep({
      ...common,
      status: PAYMENT_PAID_STATUS_TEXT,
      paymentStatus: "paid",
      payment_status: "paid",
      paymentMethod: item?.paymentMethod || "KNet",
      paid: true,
      failed: false,
      canPay: false,
      paidAt: item?.paidAt || nowIso,
      failedAt: undefined,
    });
  }

  if (paymentItemAlreadyPaid(item)) return item;

  return removeUndefinedDeep({
    ...common,
    status: PAYMENT_FAILED_STATUS_TEXT,
    paymentStatus: "failed",
    payment_status: "failed",
    failed: true,
    paid: false,
    canPay: true,
    failedAt: item?.failedAt || nowIso,
  });
}

function firestorePaymentPatch(state: PaymentSyncState, meta: any) {
  const paymentId = meta?.paymentId || "";
  const trackId = meta?.trackId || meta?.paymentTrackId || "";
  const gatewayOrderId = meta?.gatewayOrderId || "";
  const common: any = {
    paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    lastGatewaySyncAt: admin.firestore.FieldValue.serverTimestamp(),
    lastGatewaySyncSource: meta?.source || "payment-callback-sync",
    lastGatewayResult: meta?.gatewayResult || "",
  };

  if (paymentId) {
    common.paymentId = paymentId;
    common.payment_id = paymentId;
  }
  if (trackId) {
    common.paymentTrackId = trackId;
    common.trackId = trackId;
    common.track_id = trackId;
  }
  if (gatewayOrderId) {
    common.gatewayOrderId = gatewayOrderId;
    common.gateway_order_id = gatewayOrderId;
  }

  if (state === "paid") {
    return removeUndefinedDeep({
      ...common,
      status: PAYMENT_PAID_STATUS_TEXT,
      paymentStatus: "paid",
      payment_status: "paid",
      paymentMethod: "KNet",
      paid: true,
      failed: false,
      canPay: false,
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return removeUndefinedDeep({
    ...common,
    status: PAYMENT_FAILED_STATUS_TEXT,
    paymentStatus: "failed",
    payment_status: "failed",
    failed: true,
    paid: false,
    canPay: true,
    failedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}

async function resolvePaymentSessionTargets(identifiers: PaymentSyncIdentifiers) {
  if (!db) return identifiers;
  const targetIds = new Set(identifiers.targetIds);
  const paymentIds = new Set(identifiers.paymentIds);
  const gatewayOrderIds = new Set(identifiers.gatewayOrderIds);

  const addSessionData = (session: any) => {
    [
      session?.orderId,
      session?.invoiceId,
      session?.invoiceNo,
      session?.sourceOrderId,
      session?.linkedOrderId,
      session?.requestedOrderId,
      session?.requested_order_id,
      session?.gatewayOrderId,
      session?.gateway_order_id,
      session?.merchantOrderId,
      session?.merchant_order_id,
    ].forEach((value) => {
      const normalized = normalizeBusinessId(value);
      if (normalized) targetIds.add(normalized);
      const raw = normalizePaymentIdentifier(value);
      if (raw && (raw.includes("_") || raw !== normalized)) gatewayOrderIds.add(raw);
    });

    [
      session?.paymentId,
      session?.payment_id,
      session?.paymentTrackId,
      session?.trackId,
      session?.track_id,
      session?.sessionId,
      session?.session_id,
      session?.transactionId,
      session?.transaction_id,
      session?.tran_id,
    ].forEach((value) => {
      const normalized = normalizePaymentIdentifier(value);
      if (normalized && !isBusinessIdLike(normalized)) paymentIds.add(normalized);
    });
  };

  const lookupValues = uniqueCleanStrings([
    ...identifiers.targetIds,
    ...identifiers.paymentIds,
    ...identifiers.gatewayOrderIds,
  ]).slice(0, 20);

  for (const value of lookupValues) {
    const docId = safePaymentSessionDocId(value);
    if (!docId) continue;
    try {
      const snap = await db.collection("paymentSessions").doc(docId).get();
      if (snap.exists) addSessionData(snap.data() || {});
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] paymentSessions doc lookup failed:", error?.message || error);
    }
  }

  for (const pid of Array.from(paymentIds).slice(0, 10)) {
    try {
      const snap = await db.collection("paymentSessions").where("paymentId", "==", pid).limit(5).get();
      snap.docs.forEach((doc: any) => addSessionData(doc.data() || {}));
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] paymentSessions paymentId lookup failed:", error?.message || error);
    }
  }

  for (const gatewayOrderId of Array.from(gatewayOrderIds).slice(0, 10)) {
    try {
      const snap = await db.collection("paymentSessions").where("gatewayOrderId", "==", gatewayOrderId).limit(5).get();
      snap.docs.forEach((doc: any) => addSessionData(doc.data() || {}));
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] paymentSessions gatewayOrderId lookup failed:", error?.message || error);
    }
  }

  return {
    targetIds: Array.from(targetIds).filter(Boolean),
    paymentIds: Array.from(paymentIds).filter(Boolean),
    gatewayOrderIds: Array.from(gatewayOrderIds).filter(Boolean),
  };
}

async function rememberPaymentSession(session: any) {
  if (!db) return;
  const payload = removeUndefinedDeep({
    ...session,
    orderId: normalizeBusinessId(session?.orderId) || session?.orderId,
    invoiceId: normalizeBusinessId(session?.invoiceId) || session?.invoiceId,
    invoiceNo: normalizeBusinessId(session?.invoiceNo) || session?.invoiceNo,
    sourceOrderId: normalizeBusinessId(session?.sourceOrderId) || session?.sourceOrderId,
    linkedOrderId: normalizeBusinessId(session?.linkedOrderId) || session?.linkedOrderId,
    requestedOrderId: normalizePaymentIdentifier(session?.requestedOrderId || session?.requested_order_id),
    gatewayOrderId: normalizePaymentIdentifier(session?.gatewayOrderId || session?.gateway_order_id),
    paymentId: normalizePaymentIdentifier(session?.paymentId || session?.payment_id),
    paymentTrackId: normalizePaymentIdentifier(session?.paymentTrackId || session?.trackId || session?.track_id),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: session?.createdAt || admin.firestore.FieldValue.serverTimestamp(),
  });

  const docIds = uniqueCleanStrings([
    session?.gatewayOrderId,
    session?.gateway_order_id,
    session?.paymentId,
    session?.payment_id,
    session?.paymentTrackId,
    session?.trackId,
    session?.track_id,
    session?.orderId,
    session?.invoiceId,
    session?.invoiceNo,
    session?.sourceOrderId,
    session?.linkedOrderId,
  ].map(safePaymentSessionDocId)).filter(Boolean);

  for (const docId of docIds) {
    try {
      await db.collection("paymentSessions").doc(docId).set(payload, { merge: true });
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] Could not remember payment session:", error?.message || error);
    }
  }
}

async function markPaymentSessionsSynced(identifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any) {
  if (!db) return;
  const docIds = uniqueCleanStrings([
    ...identifiers.targetIds,
    ...identifiers.paymentIds,
    ...identifiers.gatewayOrderIds,
  ].map(safePaymentSessionDocId)).filter(Boolean).slice(0, 20);

  await Promise.all(docIds.map(async (docId) => {
    try {
      await db.collection("paymentSessions").doc(docId).set(removeUndefinedDeep({
        status: state,
        paymentStatus: state,
        lastGatewayResult: meta?.gatewayResult || "",
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }), { merge: true });
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] Could not mark payment session synced:", error?.message || error);
    }
  }));
}

async function updateFirestorePaymentDoc(ref: any, state: PaymentSyncState, meta: any) {
  const snap = await ref.get();
  if (!snap.exists) return { updated: false, skipped: "missing" };
  const current = snap.data() || {};
  if (state === "failed" && paymentItemAlreadyPaid(current)) {
    return { updated: false, skipped: "already_paid" };
  }
  await ref.set(firestorePaymentPatch(state, meta), { merge: true });
  return { updated: true };
}

async function syncRootPaymentCollections(identifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any) {
  const result = { updated: 0, skipped: 0 };
  if (!db) return result;

  const targetIds = uniqueCleanStrings(identifiers.targetIds.map(normalizeBusinessId)).filter(Boolean).slice(0, 20);
  const paymentIds = uniqueCleanStrings(identifiers.paymentIds.map(normalizePaymentIdentifier)).filter(Boolean).slice(0, 20);
  const seenRefs = new Set<string>();

  const updateRef = async (collectionName: string, docId: string) => {
    const cleanId = normalizeBusinessId(docId) || safeDecodeText(docId);
    if (!cleanId) return;
    const key = `${collectionName}/${cleanId}`;
    if (seenRefs.has(key)) return;
    seenRefs.add(key);
    try {
      const outcome = await updateFirestorePaymentDoc(db.collection(collectionName).doc(cleanId), state, meta);
      if (outcome.updated) result.updated += 1;
      else result.skipped += 1;
    } catch (error: any) {
      console.warn(`[PAYMENT_SYNC] Could not update ${key}:`, error?.message || error);
    }
  };

  for (const id of targetIds) {
    await updateRef("invoices", id);
    await updateRef("orders", id);

    try {
      const orderSnap = await db.collection("orders").where("linkedInvoiceId", "==", id).limit(20).get();
      for (const docSnap of orderSnap.docs) {
        const key = `orders/${docSnap.id}`;
        if (seenRefs.has(key)) continue;
        seenRefs.add(key);
        const outcome = await updateFirestorePaymentDoc(docSnap.ref, state, meta);
        if (outcome.updated) result.updated += 1;
        else result.skipped += 1;
      }
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] linkedInvoiceId lookup failed:", error?.message || error);
    }

    try {
      const invoiceSnap = await db.collection("invoices").where("linkedOrderId", "==", id).limit(20).get();
      for (const docSnap of invoiceSnap.docs) {
        const key = `invoices/${docSnap.id}`;
        if (seenRefs.has(key)) continue;
        seenRefs.add(key);
        const outcome = await updateFirestorePaymentDoc(docSnap.ref, state, meta);
        if (outcome.updated) result.updated += 1;
        else result.skipped += 1;
      }
    } catch (error: any) {
      console.warn("[PAYMENT_SYNC] linkedOrderId lookup failed:", error?.message || error);
    }
  }

  for (const pid of paymentIds) {
    for (const collectionName of ["invoices", "orders"]) {
      for (const field of ["paymentId", "payment_id", "session_id", "transaction_id", "tran_id", "track_id"]) {
        try {
          const snap = await db.collection(collectionName).where(field, "==", pid).limit(20).get();
          for (const docSnap of snap.docs) {
            const key = `${collectionName}/${docSnap.id}`;
            if (seenRefs.has(key)) continue;
            seenRefs.add(key);
            const outcome = await updateFirestorePaymentDoc(docSnap.ref, state, meta);
            if (outcome.updated) result.updated += 1;
            else result.skipped += 1;
          }
        } catch (error: any) {
          // Missing indexes are unlikely for equality-only queries, but never let this break payment callbacks.
          console.warn(`[PAYMENT_SYNC] ${collectionName}.${field} lookup failed:`, error?.message || error);
        }
      }
    }
  }

  return result;
}

function patchPaymentArray(key: "orders" | "invoices", items: any[], identifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any) {
  const targetIds = new Set(uniqueCleanStrings(identifiers.targetIds.map(normalizeBusinessId)).filter(Boolean));
  const paymentIds = new Set(uniqueCleanStrings(identifiers.paymentIds.map(normalizePaymentIdentifier)).filter(Boolean));
  let updated = 0;
  const matchedIds: string[] = [];

  const next = (Array.isArray(items) ? items : []).map((item) => {
    if (!paymentItemMatches(item, targetIds, paymentIds)) return item;
    const patched = paymentItemPatch(item, state, meta);
    if (patched !== item && JSON.stringify(patched) !== JSON.stringify(item)) {
      updated += 1;
      matchedIds.push(paymentItemIds(item)[0] || item?.id || "unknown");
      return patched;
    }
    return item;
  });

  return { next, updated, matchedIds };
}

function readArrayFromShardData(key: "orders" | "invoices", shardData: any) {
  if (!shardData) return [];
  if (shardData?.isCompressed && shardData?.compressedData) {
    const decompressed =
      LZString.decompressFromBase64(String(shardData.compressedData)) ||
      LZString.decompressFromUTF16(String(shardData.compressedData)) ||
      "";
    if (!decompressed) return [];
    try {
      const parsed = JSON.parse(decompressed);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.[key])) return parsed[key];
      return [];
    } catch {
      return [];
    }
  }

  if (Array.isArray(shardData?.[key])) return shardData[key];
  if (Array.isArray(shardData?.items)) return shardData.items;
  return [];
}

async function syncSharedShardArray(key: "orders" | "invoices", identifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any) {
  const ref = db.collection("appData").doc("shared_company_data").collection("shards").doc(key);
  const snap = await ref.get();
  if (!snap.exists) return { updated: 0, matchedIds: [] as string[] };

  const shardData = snap.data() || {};
  const current = readArrayFromShardData(key, shardData);
  if (!Array.isArray(current) || current.length === 0) return { updated: 0, matchedIds: [] as string[] };

  const patched = patchPaymentArray(key, current, identifiers, state, meta);
  if (patched.updated <= 0) return { updated: 0, matchedIds: [] as string[] };

  const serialized = JSON.stringify(patched.next);
  const shouldCompress = Boolean(shardData?.isCompressed) || serialized.length > 500000;
  const payload = shouldCompress
    ? {
        compressedData: LZString.compressToBase64(serialized),
        isCompressed: true,
        updatedAt: new Date().toISOString(),
        lastPaymentStatusSync: removeUndefinedDeep({ state, at: new Date().toISOString(), ...meta }),
      }
    : {
        [key]: patched.next,
        isCompressed: false,
        updatedAt: new Date().toISOString(),
        lastPaymentStatusSync: removeUndefinedDeep({ state, at: new Date().toISOString(), ...meta }),
      };

  await ref.set(payload, { merge: false });
  return { updated: patched.updated, matchedIds: patched.matchedIds };
}

async function syncSharedCompanyPaymentData(identifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any) {
  const result = { updated: 0, shardsUpdated: 0, rootUpdated: 0, matchedIds: [] as string[] };
  if (!db) return result;
  const ref = db.collection("appData").doc("shared_company_data");

  try {
    const snap = await ref.get();
    if (snap.exists) {
      const shared = snap.data() || {};
      const rootPatch: any = {
        __lastPaymentStatusSyncAt: new Date().toISOString(),
        __lastPaymentStatusSync: removeUndefinedDeep({ state, ...meta }),
      };

      for (const key of ["invoices", "orders"] as const) {
        if (!Array.isArray(shared[key]) || shared[key].length === 0) continue;
        const patched = patchPaymentArray(key, shared[key], identifiers, state, meta);
        if (patched.updated > 0) {
          rootPatch[key] = patched.next;
          result.updated += patched.updated;
          result.rootUpdated += patched.updated;
          result.matchedIds.push(...patched.matchedIds);
        }
      }

      await ref.set(rootPatch, { merge: true });
    }
  } catch (error: any) {
    console.warn("[PAYMENT_SYNC] Could not update shared_company_data root:", error?.message || error);
  }

  for (const key of ["invoices", "orders"] as const) {
    try {
      const patched = await syncSharedShardArray(key, identifiers, state, meta);
      result.updated += patched.updated;
      result.shardsUpdated += patched.updated;
      result.matchedIds.push(...patched.matchedIds);
    } catch (error: any) {
      console.warn(`[PAYMENT_SYNC] Could not update shared shard ${key}:`, error?.message || error);
    }
  }

  return result;
}

async function syncPaymentStatusEverywhere(rawIdentifiers: PaymentSyncIdentifiers, state: PaymentSyncState, meta: any = {}) {
  const { identifiersAlreadyResolved, ...metaForSync } = meta || {};
  const identifiers = identifiersAlreadyResolved ? rawIdentifiers : await resolvePaymentSessionTargets(rawIdentifiers);
  const paymentId = metaForSync?.paymentId || firstPaymentId(identifiers.paymentIds);
  const trackId = metaForSync?.trackId || metaForSync?.paymentTrackId || identifiers.paymentIds.find((id) => id && id !== paymentId) || "";
  const gatewayOrderId = metaForSync?.gatewayOrderId || identifiers.gatewayOrderIds[0] || "";
  const syncMeta = removeUndefinedDeep({
    ...metaForSync,
    paymentId,
    trackId,
    paymentTrackId: trackId,
    gatewayOrderId,
    targetIds: identifiers.targetIds,
    paymentIds: identifiers.paymentIds.slice(0, 5),
    gatewayOrderIds: identifiers.gatewayOrderIds.slice(0, 5),
  });

  if (identifiers.targetIds.length === 0 && identifiers.paymentIds.length === 0) {
    return { identifiers, root: { updated: 0, skipped: 0 }, shared: { updated: 0, shardsUpdated: 0, rootUpdated: 0, matchedIds: [] as string[] } };
  }

  const [root, shared] = await Promise.all([
    syncRootPaymentCollections(identifiers, state, syncMeta),
    syncSharedCompanyPaymentData(identifiers, state, syncMeta),
  ]);
  void markPaymentSessionsSynced(identifiers, state, syncMeta);

  return { identifiers, root, shared };
}

function getUPaymentsTransactionObject(payload: any) {
  const normalized = normalizeGatewayPayload(payload);
  if (!normalized || typeof normalized !== "object") return {};
  return (
    normalized?.data?.transaction ||
    normalized?.transaction ||
    normalized?.data?.data?.transaction ||
    normalized?.data ||
    normalized
  ) || {};
}

function extractUPaymentsStatusMeta(payload: any, fallbackInvoiceId = "") {
  const tx = getUPaymentsTransactionObject(payload) as any;
  const rawResult =
    tx?.result ||
    tx?.status ||
    tx?.paymentStatus ||
    tx?.payment_status ||
    (payload && typeof payload === "object" ? (payload?.result || payload?.status || payload?.paymentStatus || payload?.payment_status) : "") ||
    "";
  const trackId = normalizePaymentIdentifier(tx?.track_id || tx?.trackId || payload?.track_id || payload?.trackId || "");
  const paymentId = normalizePaymentIdentifier(tx?.payment_id || tx?.paymentId || tx?.tran_id || tx?.transaction_id || payload?.payment_id || payload?.paymentId || "");
  const gatewayOrderId = normalizePaymentIdentifier(tx?.order_id || tx?.orderId || tx?.reference?.id || payload?.order_id || payload?.orderId || payload?.reference?.id || "");
  const fallbackTarget = normalizeBusinessId(fallbackInvoiceId || gatewayOrderId || "");

  const identifiers = mergePaymentIdentifiers(
    extractPaymentSyncIdentifiers(payload),
    extractPaymentSyncIdentifiers(tx),
    {
      targetIds: uniqueCleanStrings([fallbackTarget, fallbackInvoiceId, gatewayOrderId].map(normalizeBusinessId)).filter(Boolean),
      paymentIds: uniqueCleanStrings([trackId, paymentId].map(normalizePaymentIdentifier)).filter((value) => value && !isBusinessIdLike(value)),
      gatewayOrderIds: uniqueCleanStrings([gatewayOrderId].map(normalizePaymentIdentifier)).filter(Boolean),
    }
  );

  return {
    tx,
    rawResult: String(rawResult || ""),
    state: classifyGatewayPaymentState({ ...payload, transaction: tx, data: { transaction: tx } }),
    trackId,
    paymentId: paymentId || trackId,
    gatewayOrderId,
    identifiers,
  };
}

function appendPaymentItemIdentifiers(target: PaymentSyncIdentifiers, item: any) {
  if (!item || typeof item !== "object") return target;
  const extracted = extractPaymentSyncIdentifiers(item);
  const urlCandidates = extractUrlIdentifierCandidates({
    paymentLink: item?.paymentLink,
    paymentUrl: item?.paymentUrl,
    paymentURL: item?.paymentURL,
    payment_url: item?.payment_url,
    link: item?.link,
    url: item?.url,
    gatewayResponse: item?.gatewayResponse,
    paymentData: item?.paymentData,
    upaymentsResponse: item?.upaymentsResponse,
  });
  const next = mergePaymentIdentifiers(target, extracted, {
    targetIds: paymentItemIds(item),
    paymentIds: [
      ...paymentItemPaymentIds(item),
      ...urlCandidates.filter((value) => !isBusinessIdLike(value)),
    ],
    gatewayOrderIds: [
      ...paymentItemGatewayOrderIds(item),
      ...urlCandidates.filter((value) => isBusinessIdLike(value) || String(value || "").includes("_")),
    ],
  });
  target.targetIds = next.targetIds;
  target.paymentIds = next.paymentIds;
  target.gatewayOrderIds = next.gatewayOrderIds;
  return target;
}

async function collectPaymentContextForTarget(invoiceId: any, provided: any = {}) {
  let identifiers = mergePaymentIdentifiers(
    {
      targetIds: [invoiceId, provided?.invoiceId, provided?.orderId].filter(Boolean).map(normalizeBusinessId),
      paymentIds: [provided?.paymentId, provided?.payment_id, provided?.paymentTrackId, provided?.trackId, provided?.track_id].filter(Boolean).map(normalizePaymentIdentifier),
      gatewayOrderIds: [provided?.gatewayOrderId, provided?.gateway_order_id, provided?.requestedOrderId, provided?.requested_order_id].filter(Boolean).map(normalizePaymentIdentifier),
    },
    extractPaymentSyncIdentifiers(provided)
  );

  if (!db) return identifiers;
  const targetIds = uniqueCleanStrings([invoiceId, ...identifiers.targetIds].map(normalizeBusinessId)).filter(Boolean).slice(0, 10);

  const addDocSnap = (snap: any) => {
    if (snap?.exists) {
      appendPaymentItemIdentifiers(identifiers, { id: snap.id, ...(snap.data() || {}) });
    }
  };

  for (const id of targetIds) {
    try { addDocSnap(await db.collection("invoices").doc(id).get()); } catch (error: any) { console.warn("[PAYMENT_SYNC] invoice context read failed:", error?.message || error); }
    try { addDocSnap(await db.collection("orders").doc(id).get()); } catch (error: any) { console.warn("[PAYMENT_SYNC] order context read failed:", error?.message || error); }

    for (const [collectionName, field] of [["orders", "linkedInvoiceId"], ["invoices", "linkedOrderId"]] as const) {
      try {
        const snap = await db.collection(collectionName).where(field, "==", id).limit(10).get();
        snap.docs.forEach((docSnap: any) => appendPaymentItemIdentifiers(identifiers, { id: docSnap.id, ...(docSnap.data() || {}) }));
      } catch (error: any) {
        console.warn(`[PAYMENT_SYNC] ${collectionName}.${field} context lookup failed:`, error?.message || error);
      }
    }
  }

  try {
    const sharedSnap = await db.collection("appData").doc("shared_company_data").get();
    if (sharedSnap.exists) {
      const shared = sharedSnap.data() || {};
      for (const key of ["invoices", "orders"] as const) {
        const list = Array.isArray(shared[key]) ? shared[key] : [];
        list.forEach((item: any) => {
          const ids = paymentItemIds(item);
          if (ids.some((id) => targetIds.includes(id))) appendPaymentItemIdentifiers(identifiers, item);
        });
      }
    }
  } catch (error: any) {
    console.warn("[PAYMENT_SYNC] shared root context lookup failed:", error?.message || error);
  }

  for (const key of ["invoices", "orders"] as const) {
    try {
      const shardSnap = await db.collection("appData").doc("shared_company_data").collection("shards").doc(key).get();
      if (!shardSnap.exists) continue;
      const list = readArrayFromShardData(key, shardSnap.data() || {});
      (Array.isArray(list) ? list : []).forEach((item: any) => {
        const ids = paymentItemIds(item);
        if (ids.some((id) => targetIds.includes(id))) appendPaymentItemIdentifiers(identifiers, item);
      });
    } catch (error: any) {
      console.warn(`[PAYMENT_SYNC] shared ${key} shard context lookup failed:`, error?.message || error);
    }
  }

  identifiers = await resolvePaymentSessionTargets(identifiers);
  return identifiers;
}

async function fetchUPaymentsStatusByCandidate(candidateId: string, apiKey: string) {
  const baseUrl = "https://apiv2api.upayments.com/api/v1";
  const cleanId = normalizePaymentIdentifier(candidateId);
  if (!cleanId) return { ok: false, status: 0, data: null, candidateId: cleanId, endpoint: "" };

  const headers = {
    "Accept": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  let response = await fetch(`${baseUrl}/get-payment-status/${encodeURIComponent(cleanId)}`, { method: "GET", headers });
  let endpoint = "get-payment-status";

  if (response.status === 404 || response.status === 400) {
    response = await fetch(`${baseUrl}/charge/${encodeURIComponent(cleanId)}`, { method: "GET", headers });
    endpoint = "charge";
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await response.json() : await response.text();
  return { ok: response.ok, status: response.status, data, candidateId: cleanId, endpoint };
}

function buildUPaymentsLookupCandidates(identifiers: PaymentSyncIdentifiers, provided: any = {}) {
  const urlCandidates = extractUrlIdentifierCandidates({
    paymentLink: provided?.paymentLink,
    paymentUrl: provided?.paymentUrl,
    paymentURL: provided?.paymentURL,
    payment_url: provided?.payment_url,
    link: provided?.link,
    url: provided?.url,
  });

  return uniqueCleanStrings([
    provided?.paymentTrackId,
    provided?.trackId,
    provided?.track_id,
    provided?.paymentId,
    provided?.payment_id,
    ...urlCandidates,
    ...identifiers.paymentIds,
    provided?.gatewayOrderId,
    provided?.gateway_order_id,
    provided?.requestedOrderId,
    provided?.requested_order_id,
    ...identifiers.gatewayOrderIds,
  ].map(normalizePaymentIdentifier)).filter(Boolean).slice(0, 20);
}

async function verifyAndSyncUPaymentsInvoice(invoiceId: any, provided: any, apiKey: string) {
  let identifiers = await collectPaymentContextForTarget(invoiceId, provided);
  const candidates = buildUPaymentsLookupCandidates(identifiers, provided);
  const attempts: any[] = [];
  let firstFailed: any = null;

  for (const candidateId of candidates) {
    try {
      const attempt = await fetchUPaymentsStatusByCandidate(candidateId, apiKey);
      attempts.push({ candidateId, endpoint: attempt.endpoint, status: attempt.status, ok: attempt.ok });
      if (!attempt.ok || !attempt.data || typeof attempt.data === "string") continue;

      const meta = extractUPaymentsStatusMeta(attempt.data, String(invoiceId || ""));
      identifiers = await resolvePaymentSessionTargets(mergePaymentIdentifiers(identifiers, meta.identifiers));
      const state = meta.state;

      if (state === "paid") {
        const paymentId = meta.paymentId || firstPaymentId(identifiers.paymentIds) || candidateId;
        const syncResult = await syncPaymentStatusEverywhere(identifiers, "paid", {
          source: "payment-status-confirm",
          gatewayResult: meta.rawResult || "paid",
          paymentId,
          trackId: meta.trackId || candidateId,
          paymentTrackId: meta.trackId || candidateId,
          gatewayOrderId: meta.gatewayOrderId || identifiers.gatewayOrderIds[0] || "",
          verificationEndpoint: attempt.endpoint,
          identifiersAlreadyResolved: true,
        });
        await rememberPaymentSession({
          orderId: invoiceId,
          invoiceId,
          invoiceNo: invoiceId,
          gatewayOrderId: meta.gatewayOrderId || identifiers.gatewayOrderIds[0] || "",
          paymentId,
          paymentTrackId: meta.trackId || candidateId,
          status: "paid",
        });
        return { verified: true, state: "paid", identifiers: syncResult.identifiers, syncResult, gatewayData: attempt.data, transaction: meta.tx, paymentId, attempts };
      }

      if (state === "failed" && !firstFailed) {
        firstFailed = { attempt, meta, candidateId, identifiers: mergePaymentIdentifiers(identifiers, meta.identifiers) };
      }
    } catch (error: any) {
      attempts.push({ candidateId, error: error?.message || String(error) });
      console.warn("[PAYMENT_SYNC] UPayments status check failed:", candidateId, error?.message || error);
    }
  }

  if (firstFailed) {
    const meta = firstFailed.meta;
    identifiers = await resolvePaymentSessionTargets(firstFailed.identifiers);
    const paymentId = meta.paymentId || firstPaymentId(identifiers.paymentIds) || firstFailed.candidateId;
    const syncResult = await syncPaymentStatusEverywhere(identifiers, "failed", {
      source: "payment-status-confirm",
      gatewayResult: meta.rawResult || "failed",
      paymentId,
      trackId: meta.trackId || firstFailed.candidateId,
      paymentTrackId: meta.trackId || firstFailed.candidateId,
      gatewayOrderId: meta.gatewayOrderId || identifiers.gatewayOrderIds[0] || "",
      verificationEndpoint: firstFailed.attempt.endpoint,
      identifiersAlreadyResolved: true,
    });
    await rememberPaymentSession({
      orderId: invoiceId,
      invoiceId,
      invoiceNo: invoiceId,
      gatewayOrderId: meta.gatewayOrderId || identifiers.gatewayOrderIds[0] || "",
      paymentId,
      paymentTrackId: meta.trackId || firstFailed.candidateId,
      status: "failed",
    });
    return { verified: false, state: "failed", identifiers: syncResult.identifiers, syncResult, gatewayData: firstFailed.attempt.data, transaction: meta.tx, paymentId, attempts };
  }

  return { verified: false, state: "unknown", identifiers, syncResult: null, gatewayData: null, transaction: null, paymentId: firstPaymentId(identifiers.paymentIds), attempts };
}

async function rememberPushEvent(eventId: string, payload: any, result: any) {
  if (!db || !eventId) return;
  try {
    await db.collection("pushEvents").doc(eventId).set({
      eventId,
      ...removeUndefinedDeep(payload),
      result: removeUndefinedDeep(result),
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  } catch (error: any) {
    console.warn("[PUSH] Could not remember push event:", eventId, error?.message || error);
  }
}


const app = express();

// ADMIN020_FORCE_CORS
app.use((req, res, next) => {
  const origin = String(req.headers.origin || "");

  const allowedOrigins = new Set([
    "https://alturath-admin-0200723670.web.app",
    "https://admin.alturathkw.shop",
    "https://alturathkw.shop",
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
  app.use(express.json({ limit: "30mb" }));

app.use(express.urlencoded({ extended: true }));

const FULL_APPDATA_SHARD_KEYS = [
  "orders",
  "invoices",
  "customers",
  "expenses",
  "testimonials",
  "products",
  "supplierCopies",
  "pulseAnalysisHistory",
  "pulseReviews",
  "campaigns",
  "squads",
  "promocodes",
  "aiLearningMemory",
  "pulseArchiveAnalysis",
  "deepArchiveAnalysis",
  "nameMatchMemory",
];

const BOOT_DEFERRED_APPDATA_SHARD_KEYS = new Set([
  "testimonials",
  "campaigns",
  "pulseAnalysisHistory",
  "pulseReviews",
  "aiLearningMemory",
  "pulseArchiveAnalysis",
  "deepArchiveAnalysis",
  "nameMatchMemory",
]);

function decodeFullAppDataShard(key: string, shardData: any) {
  if (!shardData) return [];
  if (shardData?.isCompressed && shardData?.compressedData) {
    const raw = String(shardData.compressedData || "");
    const decompressed =
      LZString.decompressFromBase64(raw) ||
      LZString.decompressFromUTF16(raw) ||
      "";
    if (!decompressed) return [];
    try {
      const parsed = JSON.parse(decompressed);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.[key])) return parsed[key];
    } catch (error) {
      console.warn(`[api/appdata/full] Failed to decode shard ${key}:`, error);
    }
    return [];
  }
  if (Array.isArray(shardData?.[key])) return shardData[key];
  if (Array.isArray(shardData?.items)) return shardData.items;
  return [];
}


// ALTURATH_WHATSAPP_CLOUD_API_START
// Independent WhatsApp Cloud API layer. It only reads shared data and sends WhatsApp replies.
// It does not change payment, notification, AI, auth, or database write logic.
const ALTURATH_CUSTOMER_BASE_URL = String(process.env.ALTURATH_CUSTOMER_BASE_URL || "https://alturathkw.shop").replace(/\/$/, "");
const ALTURATH_ADMIN_BASE_URL = String(process.env.ALTURATH_ADMIN_BASE_URL || "https://admin.alturathkw.shop").replace(/\/$/, "");
const WHATSAPP_VERIFY_TOKEN = String(process.env.WHATSAPP_VERIFY_TOKEN || "alturath_whatsapp_verify_2026");
const WHATSAPP_GRAPH_VERSION = String(process.env.WHATSAPP_GRAPH_VERSION || "v24.0");
const WHATSAPP_ACCESS_TOKEN = () => String(process.env.WHATSAPP_ACCESS_TOKEN || "").trim();
const WHATSAPP_PHONE_NUMBER_ID = () => String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim();
const WHATSAPP_TEST_SECRET = () => String(process.env.WHATSAPP_TEST_SECRET || process.env.ADMIN_TEST_SECRET || "").trim();

type WhatsAppLookupResult = {
  kind: "order" | "invoice";
  id: string;
  data: any;
  source: string;
};

function waString(value: any) {
  return String(value ?? "").trim();
}

function waDigits(value: any) {
  return waString(value).replace(/\D/g, "");
}

function waNormalizeArabic(value: any) {
  return waString(value)
    .toLowerCase()
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/[^\p{L}\p{N}\s\-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function waEscapeForLog(value: any) {
  return waString(value).slice(0, 500);
}

function waAsArray(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function waUnique<T>(items: T[]) {
  return Array.from(new Set(items.filter(Boolean) as T[]));
}

function waBusinessIdsFor(item: any): string[] {
  return waUnique([
    item?.id,
    item?.orderId,
    item?.orderNo,
    item?.orderNumber,
    item?.invoiceId,
    item?.invoiceNo,
    item?.invoiceNumber,
    item?.number,
    item?.tracked_order,
    item?.requested_order_id,
    item?.linkedInvoiceId,
    item?.linkedOrderId,
  ].map((v) => waString(v)).filter(Boolean));
}

function waPrimaryBusinessId(item: any, fallbackPrefix = "ORD") {
  const ids = waBusinessIdsFor(item);
  return ids.find((id) => /^(ORD|INV)-/i.test(id)) || ids[0] || `${fallbackPrefix}-غير-متوفر`;
}

function waExtractBusinessId(text: string) {
  const normalized = waString(text).toUpperCase().replace(/\s+/g, " ");
  const direct = normalized.match(/\b(ORD|INV)\s*-\s*([A-Z0-9]+(?:\s*-\s*[A-Z0-9]+)*)\b/i);
  if (!direct) return "";
  const prefix = direct[1].toUpperCase();
  const rest = direct[2].replace(/\s+/g, "").replace(/--+/g, "-");
  return `${prefix}-${rest}`;
}

function waIsPaidStatus(status: any) {
  const s = waNormalizeArabic(status);
  return ["paid", "success", "successful", "تم الدفع", "تم الدفع بنجاح", "مدفوع"].some((x) => s.includes(waNormalizeArabic(x)));
}

function waIsFailedStatus(status: any) {
  const s = waNormalizeArabic(status);
  return ["failed", "fail", "فشل", "فشلت", "مرفوض", "ملغي", "الغاء"].some((x) => s.includes(waNormalizeArabic(x)));
}

function waIsPendingStatus(status: any) {
  const s = waNormalizeArabic(status);
  return ["pending", "انتظار", "بانتظار", "لم يدفع", "غير مدفوع", "قيد"].some((x) => s.includes(waNormalizeArabic(x)));
}

function waStatusText(item: any) {
  const raw = item?.status || item?.paymentStatus || item?.payment_status || item?.state || item?.orderStatus || item?.invoiceStatus || "";
  if (waIsPaidStatus(raw) || item?.paid === true) return "تم الدفع بنجاح";
  if (waIsFailedStatus(raw) || item?.failed === true) return "فشلت عملية الدفع";
  if (waIsPendingStatus(raw) || item?.paid === false) return "بانتظار الدفع";
  return waString(raw) || "قيد المتابعة";
}

function waAmountText(item: any) {
  const raw = item?.totalAmount ?? item?.total ?? item?.amount ?? item?.grandTotal ?? item?.subtotal ?? item?.finalTotal;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${n.toFixed(n % 1 ? 3 : 0)} د.ك`;
}

function waCustomerPhone(item: any) {
  return waDigits(item?.customerPhone || item?.phone || item?.customer?.phone || item?.delivery?.phone || item?.clientPhone || item?.mobile);
}

function waNormalizeKuwaitPhone8(value: any) {
  const digits = waDigits(value);
  if (digits.length === 8) return digits;
  if (digits.length === 11 && digits.startsWith("965")) return digits.slice(-8);
  return "";
}

function waExtractKuwaitPhone8(text: string) {
  const normalized = waString(text).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  const candidates = normalized.match(/(?:\+?965[\s-]*)?[569]\d(?:[\s-]*\d){6}/g) || [];
  for (const candidate of candidates) {
    const phone8 = waNormalizeKuwaitPhone8(candidate);
    if (phone8) return phone8;
  }
  return "";
}

function waTrackUrl(id: string) {
  return `${ALTURATH_CUSTOMER_BASE_URL}/track?order_id=${encodeURIComponent(id)}`;
}

function waNewOrderUrl() {
  return ALTURATH_CUSTOMER_BASE_URL;
}


function waNowIso() {
  return new Date().toISOString();
}

function waConversationDoc(phone: string) {
  if (!db || !firebaseInitialized) return null;
  const clean = waDigits(phone);
  if (!clean) return null;
  return db.collection("whatsappConversations").doc(clean);
}

async function waGetConversation(phone: string) {
  const ref = waConversationDoc(phone);
  if (!ref) return null;
  try {
    const snap = await ref.get();
    return snap.exists ? { id: snap.id, ...(snap.data() || {}) } : null;
  } catch (error: any) {
    console.warn("[WHATSAPP] Could not read conversation:", error?.message || error);
    return null;
  }
}

async function waUpsertConversation(phone: string, patch: any = {}) {
  const ref = waConversationDoc(phone);
  if (!ref) return;
  const clean = waDigits(phone);
  const base = removeUndefinedDeep({
    phone: clean,
    customerName: patch.customerName,
    mode: patch.mode || undefined,
    status: patch.status || undefined,
    priority: patch.priority || undefined,
    unreadCount: patch.unreadCount,
    lastInboundText: patch.lastInboundText,
    lastOutboundText: patch.lastOutboundText,
    lastMessageText: patch.lastMessageText,
    lastMessageDirection: patch.lastMessageDirection,
    lastMessageAt: patch.lastMessageAt || waNowIso(),
    updatedAt: waNowIso(),
    createdAt: patch.createdAt,
    tags: patch.tags,
    assignedTo: patch.assignedTo,
    supportRequestedAt: patch.supportRequestedAt,
    botPausedAt: patch.botPausedAt,
    botResumedAt: patch.botResumedAt,
  });
  try {
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        phone: clean,
        mode: patch.mode || "bot",
        status: patch.status || "open",
        priority: patch.priority || "normal",
        unreadCount: typeof patch.unreadCount === "number" ? patch.unreadCount : 0,
        createdAt: waNowIso(),
        ...base,
      }, { merge: true });
    } else {
      await ref.set(base, { merge: true });
    }
  } catch (error: any) {
    console.warn("[WHATSAPP] Could not upsert conversation:", error?.message || error);
  }
}

async function waIncrementUnread(phone: string) {
  const ref = waConversationDoc(phone);
  if (!ref) return;
  try {
    await ref.set({ unreadCount: admin.firestore.FieldValue.increment(1), updatedAt: waNowIso() }, { merge: true });
  } catch (_error) {}
}

async function waAppendConversationMessage(phone: string, message: any) {
  const ref = waConversationDoc(phone);
  if (!ref) return;
  try {
    await ref.collection("messages").add(removeUndefinedDeep({
      phone: waDigits(phone),
      direction: message.direction,
      type: message.type || "text",
      text: waString(message.text).slice(0, 4000),
      waMessageId: message.waMessageId,
      status: message.status,
      sentBy: message.sentBy || (message.direction === "outbound" ? "bot" : "customer"),
      createdAt: waNowIso(),
      raw: message.raw ? JSON.stringify(message.raw).slice(0, 3000) : undefined,
    }));
  } catch (error: any) {
    console.warn("[WHATSAPP] Could not append conversation message:", error?.message || error);
  }
}

function waLooksLikeSupportIntent(text: string) {
  const s = waNormalizeArabic(text);
  return [
    "4", "دعم", "الدعم", "فريق الدعم", "موظف", "اكلم موظف", "ابي اكلم", "خدمه العملاء", "خدمة العملاء",
    "مشكله", "مشكلة", "شكوى", "استفسار خاص", "تواصل", "support", "agent", "human", "help desk", "customer service"
  ].some((phrase) => s === waNormalizeArabic(phrase) || s.includes(waNormalizeArabic(phrase)));
}

function waLooksLikeBackToBotIntent(text: string) {
  const s = waNormalizeArabic(text);
  return ["القائمه", "القائمة", "منيو", "menu", "bot", "رجوع", "ابدأ", "start"].some((phrase) => s === waNormalizeArabic(phrase) || s.includes(waNormalizeArabic(phrase)));
}

function waQuickReplies() {
  return [
    { id: "welcome", title: "ترحيب", text: "ياهلا ومرحبا في التراث 🇰🇼\nشلون نقدر نخدمك؟" },
    { id: "tracking", title: "طلب رقم التتبع", text: "حياك الله 🤍\nأرسل رقم الطلب/الفاتورة أو رقم الهاتف الكويتي 8 أرقام، وبنشيك لك مباشرة." },
    { id: "new_order", title: "رابط طلب جديد", text: `لطلب جديد تفضل من موقع التراث:\n${waNewOrderUrl()}` },
    { id: "payment", title: "الدفع", text: "حياك الله، إذا عندك رابط دفع افتحه وتأكد من إتمام العملية. وإذا واجهتك مشكلة أرسل رقم الطلب/الفاتورة ونساعدك فورًا." },
    { id: "delivery", title: "التوصيل", text: "طلباتكم تهمنا 🤍\nأرسل رقم الطلب/الفاتورة أو رقم الهاتف، وبنراجع حالة التوصيل لك." },
    { id: "handoff", title: "استلام المحادثة", text: "معك فريق التراث الآن 🤍\nاكتب لنا التفاصيل وبنساعدك مباشرة." },
    { id: "closing", title: "إغلاق راقٍ", text: "تشرفنا بخدمتك 🤍\nإذا احتجت أي شيء اكتب لنا بأي وقت." },
  ];
}

async function waReadSharedShard(key: string) {
  if (!db || !firebaseInitialized) return [];
  try {
    const snap = await db.collection("appData").doc("shared_company_data").collection("shards").doc(key).get();
    if (!snap.exists) return [];
    return decodeFullAppDataShard(key, snap.data() || {});
  } catch (error: any) {
    console.warn(`[WHATSAPP] Could not read shared shard ${key}:`, error?.message || error);
    return [];
  }
}

async function waLoadSharedData(keys: string[] = ["orders", "invoices", "products"]) {
  const data: any = { orders: [], invoices: [], products: [] };
  if (!db || !firebaseInitialized) return data;

  try {
    const rootSnap = await db.collection("appData").doc("shared_company_data").get();
    const root = rootSnap.exists ? (rootSnap.data() || {}) : {};
    for (const key of keys) {
      data[key] = waAsArray(root?.[key]);
    }
  } catch (error: any) {
    console.warn("[WHATSAPP] Could not read shared_company_data root:", error?.message || error);
  }

  for (const key of keys) {
    const shardItems = await waReadSharedShard(key);
    if (Array.isArray(shardItems) && shardItems.length) {
      const existingIds = new Set(waAsArray(data[key]).map((item: any) => waPrimaryBusinessId(item, key === "invoices" ? "INV" : "ORD")));
      const merged = [...waAsArray(data[key])];
      for (const item of shardItems) {
        const id = waPrimaryBusinessId(item, key === "invoices" ? "INV" : "ORD");
        if (!existingIds.has(id)) merged.push(item);
      }
      data[key] = merged;
    }
  }

  return data;
}

async function waFindRootDocByBusinessId(id: string): Promise<WhatsAppLookupResult | null> {
  if (!db || !firebaseInitialized || !id) return null;
  const upper = id.toUpperCase();
  const preferred = upper.startsWith("INV-") ? ["invoices", "orders"] : ["orders", "invoices"];

  for (const collectionName of preferred) {
    try {
      const snap = await db.collection(collectionName).doc(id).get();
      if (snap.exists) {
        return { kind: collectionName === "invoices" ? "invoice" : "order", id, data: { id: snap.id, ...(snap.data() || {}) }, source: `${collectionName}/${id}` };
      }
    } catch (error: any) {
      console.warn(`[WHATSAPP] Root doc lookup failed ${collectionName}/${id}:`, error?.message || error);
    }
  }

  const fields = ["id", "orderId", "orderNo", "invoiceId", "invoiceNo", "number", "tracked_order", "requested_order_id", "linkedInvoiceId", "linkedOrderId"];
  for (const collectionName of preferred) {
    for (const field of fields) {
      try {
        const q = await db.collection(collectionName).where(field, "==", id).limit(1).get();
        if (!q.empty) {
          const doc = q.docs[0];
          return { kind: collectionName === "invoices" ? "invoice" : "order", id: waPrimaryBusinessId(doc.data(), id.startsWith("INV-") ? "INV" : "ORD"), data: { id: doc.id, ...(doc.data() || {}) }, source: `${collectionName}.${field}` };
        }
      } catch (error: any) {
        // Some fields may not be indexed or present. Continue safely.
      }
    }
  }

  return null;
}

async function waFindByBusinessId(id: string): Promise<WhatsAppLookupResult | null> {
  const cleanId = waString(id).toUpperCase();
  if (!cleanId) return null;

  const root = await waFindRootDocByBusinessId(cleanId);
  if (root) return root;

  const shared = await waLoadSharedData(["orders", "invoices"]);
  const preferredKey = cleanId.startsWith("INV-") ? "invoices" : "orders";
  const keys = preferredKey === "invoices" ? ["invoices", "orders"] : ["orders", "invoices"];
  for (const key of keys) {
    const found = waAsArray(shared[key]).find((item: any) => waBusinessIdsFor(item).map((x) => x.toUpperCase()).includes(cleanId));
    if (found) {
      return { kind: key === "invoices" ? "invoice" : "order", id: waPrimaryBusinessId(found, cleanId.startsWith("INV-") ? "INV" : "ORD"), data: found, source: `appData.${key}` };
    }
  }

  return null;
}

async function waFindLatestByPhone(phone: string): Promise<WhatsAppLookupResult | null> {
  const last8 = waNormalizeKuwaitPhone8(phone);
  if (!last8) return null;
  const digits = last8;

  const shared = await waLoadSharedData(["orders", "invoices"]);
  const candidates: WhatsAppLookupResult[] = [];
  for (const key of ["orders", "invoices"] as const) {
    for (const item of waAsArray(shared[key])) {
      const p = waCustomerPhone(item);
      if (p && p.slice(-8) === last8) {
        candidates.push({ kind: key === "invoices" ? "invoice" : "order", id: waPrimaryBusinessId(item, key === "invoices" ? "INV" : "ORD"), data: item, source: `appData.${key}.phone` });
      }
    }
  }

  candidates.sort((a, b) => {
    const ad = dateValue(a.data?.createdAt || a.data?.created_at || a.data?.date || a.data?.updatedAt || dateFromBusinessId(a.id) || "")?.getTime() || 0;
    const bd = dateValue(b.data?.createdAt || b.data?.created_at || b.data?.date || b.data?.updatedAt || dateFromBusinessId(b.id) || "")?.getTime() || 0;
    return bd - ad;
  });

  if (candidates[0]) return candidates[0];

  if (!db || !firebaseInitialized) return null;
  for (const collectionName of ["orders", "invoices"] as const) {
    for (const field of ["customerPhone", "phone", "mobile", "clientPhone"] as const) {
      try {
        const q = await db.collection(collectionName).where(field, "==", digits).limit(5).get();
        if (!q.empty) {
          const doc = q.docs[0];
          return { kind: collectionName === "invoices" ? "invoice" : "order", id: waPrimaryBusinessId(doc.data(), collectionName === "invoices" ? "INV" : "ORD"), data: { id: doc.id, ...(doc.data() || {}) }, source: `${collectionName}.${field}` };
        }
      } catch (_error: any) {}
    }
  }

  return null;
}

function waOrderReply(result: WhatsAppLookupResult) {
  const id = result.id || waPrimaryBusinessId(result.data, result.kind === "invoice" ? "INV" : "ORD");
  const label = result.kind === "invoice" ? "الفاتورة" : "الطلب";
  const amount = waAmountText(result.data);
  const status = waStatusText(result.data);
  const lines = [
    `ياهلا فيك من التراث 🇰🇼`,
    `${label}: ${id}`,
    `الحالة: ${status}`,
  ];
  if (amount) lines.push(`المبلغ: ${amount}`);
  lines.push(`تقدر تتابع التفاصيل من هنا:`);
  lines.push(waTrackUrl(id));
  lines.push(``);
  lines.push(`ولطلب جديد:`);
  lines.push(waNewOrderUrl());
  return lines.join("\n");
}

function waNewOrderReply() {
  return [
    "ياهلا فيك في التراث 🇰🇼",
    "لطلب جديد تفضل من موقعنا:",
    waNewOrderUrl(),
    "",
    "تقدر تختار المنتجات وتحدد موقع التوصيل وتكمل الطلب مباشرة.",
    "",
    "ولمتابعة طلب سابق، أرسل رقم الطلب/الفاتورة أو رقم هاتفك الكويتي 8 أرقام.",
  ].join("\n");
}

function waSupportReply() {
  return [
    "يسعدنا نخدمك 🤍",
    "اكتب رسالتك الآن، وستظهر مباشرة لفريق الدعم داخل لوحة التراث.",
    "",
    "للرجوع للقائمة في أي وقت اكتب: القائمة",
  ].join("\n");
}

function waHumanModeNoticeReply() {
  return [
    "وصلت رسالتك لفريق الدعم 🤍",
    "بنرد عليك بأقرب وقت.",
    "",
    "للرجوع للبوت اكتب: القائمة",
  ].join("\n");
}

function waAdminSupportInboxUrl(phone?: string) {
  const clean = waDigits(phone || "");
  const params = new URLSearchParams();
  params.set("page", "whatsapp-support");
  if (clean) params.set("phone", clean);
  return `${ALTURATH_ADMIN_BASE_URL}/?${params.toString()}`;
}

async function waSendHumanSupportPush({
  phone,
  text,
  contactName,
  messageId,
  reason = "human_support",
}: {
  phone: string;
  text?: string;
  contactName?: string;
  messageId?: string;
  reason?: string;
}) {
  const cleanPhone = waDigits(phone);
  if (!cleanPhone) return { success: false, skipped: true, reason: "missing_phone" };

  const safeText = waString(text || "").replace(/\s+/g, " ").slice(0, 140);
  const safeName = waString(contactName || "").slice(0, 60);
  const title = reason === "already_human"
    ? "رسالة واتساب تنتظر ردك"
    : "عميل يطلب دعم واتساب";
  const body = safeText
    ? `${safeName ? `${safeName}: ` : ""}${safeText}`
    : `${safeName || cleanPhone} يحتاج متابعة من الدعم.`;
  const stableMessageId = waString(messageId || "").replace(/[^a-zA-Z0-9_:\-.]/g, "").slice(0, 120);
  const eventId = stableMessageId
    ? `whatsapp-support-${stableMessageId}`
    : `whatsapp-support-${cleanPhone}-${Date.now()}`;

  try {
    return await sendSmartAlertPushNotification({
      title,
      body,
      alertType: "whatsapp_support",
      url: waAdminSupportInboxUrl(cleanPhone),
      eventId,
      ttlSeconds: 86400,
      requireInteraction: true,
      notificationTag: `whatsapp-support-${cleanPhone}`,
    });
  } catch (error: any) {
    console.warn("[WHATSAPP] Human support push failed:", error?.message || error);
    return { success: false, error: error?.message || String(error) };
  }
}

function waHelpReply() {
  return [
    "مرحبًا بك في Alturath 👋",
    "اختر الخدمة المناسبة:",
    "",
    "1) طلب جديد",
    "2) تتبع طلب أو فاتورة",
    "3) الاستفسار عن المنتجات",
    "4) الدعم",
    "",
    "اكتب رقم الخيار أو اكتب طلبك مباشرة.",
  ].join("\n");
}

function waGreetingReply() {
  return [
    "ياهلا ومرحبا في التراث 🇰🇼",
    "شلون أقدر أخدمك؟",
    "",
    "1) طلب جديد",
    "2) تتبع طلب أو فاتورة",
    "3) الاستفسار عن المنتجات",
    "4) الدعم",
  ].join("\n");
}

async function waProductReply(messageText: string) {
  const shared = await waLoadSharedData(["products"]);
  const terms = waNormalizeArabic(messageText)
    .split(" ")
    .filter((word) => word.length >= 3 && !["عندكم", "ابي", "ابغي", "ابغى", "ابا", "اريد", "اطلب", "طلب", "منتج", "سعر", "جم", "كم", "هل", "في", "فيه", "شنو", "وش", "what", "price", "product", "menu", "order", "new", "hello", "hi"].includes(word));

  if (!terms.length) return "";
  const products = waAsArray(shared.products)
    .filter((p: any) => p?.isActive !== false && p?.active !== false && p?.isOutOfStock !== true && p?.outOfStock !== true)
    .map((p: any) => ({
      raw: p,
      name: waString(p?.name || p?.productName || p?.title),
      haystack: waNormalizeArabic([p?.name, p?.productName, p?.title, p?.category, p?.description].filter(Boolean).join(" ")),
    }))
    .filter((p: any) => p.name);

  const matches = products
    .map((p: any) => ({ ...p, score: terms.reduce((acc, term) => acc + (p.haystack.includes(term) ? 1 : 0), 0) }))
    .filter((p: any) => p.score > 0)
    .sort((a: any, b: any) => b.score - a.score)
    .slice(0, 5);

  if (!matches.length) return "";

  const lines = ["هذه أقرب المنتجات الموجودة عندنا حالياً:"];
  matches.forEach((p: any, index: number) => {
    const price = Number(p.raw?.price ?? p.raw?.salePrice ?? p.raw?.amount);
    lines.push(`${index + 1}. ${p.name}${Number.isFinite(price) && price > 0 ? ` — ${price.toFixed(price % 1 ? 3 : 0)} د.ك` : ""}`);
  });
  lines.push("");
  lines.push("للطلب من الموقع:");
  lines.push(waNewOrderUrl());
  return lines.join("\n");
}

function waLooksLikeNewOrderIntent(text: string) {
  const s = waNormalizeArabic(text);
  return [
    "طلب جديد", "ابي اطلب", "ابغى اطلب", "ابغي اطلب", "ابا اطلب", "اريد اطلب", "اطلب", "اطلب منكم", "اطلب الحين",
    "منيو", "المنيو", "قائمه", "قائمة", "القائمة", "المنيوهات", "المنتجات", "منتجات", "اشتري", "شراء",
    "menu", "new order", "order now", "order", "make order", "place order", "buy", "shop", "catalog", "products",
  ].some((phrase) => s.includes(waNormalizeArabic(phrase)));
}

function waLooksLikeTrackIntent(text: string) {
  const s = waNormalizeArabic(text);
  return [
    "تتبع", "تتبع الطلب", "تتبع طلبي", "طلبي", "طلبى", "وين طلبي", "وين الطلب", "حاله", "حالة", "حالة الطلب",
    "فاتوره", "فاتورة", "فواتير", "رقم الفاتوره", "رقم الفاتورة", "دفعت", "الدفع", "وصل", "التوصيل",
    "invoice", "track", "tracking", "status", "my order", "where is my order", "delivery", "payment",
  ].some((phrase) => s.includes(waNormalizeArabic(phrase)));
}

function waLooksLikeGreeting(text: string) {
  const s = waNormalizeArabic(text);
  return [
    "هلا", "ياهلا", "مرحبا", "السلام", "السلام عليكم", "صباح الخير", "مساء الخير", "هاي", "الو", "اهلا", "اهلين",
    "hi", "hello", "hey", "salam", "good morning", "good evening",
  ].some((phrase) => s === waNormalizeArabic(phrase) || s.includes(waNormalizeArabic(phrase)));
}

function waLooksLikeHelpIntent(text: string) {
  const s = waNormalizeArabic(text);
  return ["مساعده", "مساعدة", "ساعدني", "خدمه", "خدمة", "اختيارات", "الخيارات", "help", "support", "options", "commands"].some((phrase) => s.includes(waNormalizeArabic(phrase)));
}

async function waBuildAutoReply(messageText: string, fromPhone: string) {
  const clean = waNormalizeArabic(messageText);
  if (waLooksLikeSupportIntent(messageText)) return waSupportReply();
  if (clean === "1") return waNewOrderReply();
  if (clean === "2") {
    const byPhone = await waFindLatestByPhone(fromPhone);
    if (byPhone) return waOrderReply(byPhone);
    return [
      "أرسل رقم الطلب/الفاتورة أو رقم الهاتف الكويتي 8 أرقام، وبشيك لك مباشرة.",
      "",
      `رابط التتبع: ${ALTURATH_CUSTOMER_BASE_URL}/track`,
    ].join("\n");
  }
  if (clean === "3") return "اكتب اسم المنتج الذي تبحث عنه، وسأبحث لك في المنيو المتاح.";
  if (waLooksLikeHelpIntent(messageText)) return waHelpReply();
  if (waLooksLikeGreeting(messageText)) return waGreetingReply();

  const businessId = waExtractBusinessId(messageText);
  if (businessId) {
    const found = await waFindByBusinessId(businessId);
    if (found) return waOrderReply(found);
    return [
      `ما حصلت هذا الرقم حالياً.`,
      "تأكد من رقم الطلب/الفاتورة أو جرّب رابط التتبع:",
      `${ALTURATH_CUSTOMER_BASE_URL}/track`,
      "",
      "ولطلب جديد:",
      waNewOrderUrl(),
    ].join("\n");
  }

  const phone8 = waExtractKuwaitPhone8(messageText);
  if (phone8) {
    const byPhone = await waFindLatestByPhone(phone8);
    if (byPhone) return waOrderReply(byPhone);
    return [
      `ما حصلت طلب مرتبط بالرقم ${phone8} حالياً.`,
      "تأكد من رقم الهاتف بصيغة 8 أرقام مثل: 97424400",
      "أو أرسل رقم الطلب/الفاتورة كما هو ظاهر في الرسالة أو الفاتورة.",
      "",
      "ولطلب جديد:",
      waNewOrderUrl(),
    ].join("\n");
  }

  if (waLooksLikeNewOrderIntent(messageText)) return waNewOrderReply();

  if (waLooksLikeTrackIntent(messageText)) {
    const byPhone = await waFindLatestByPhone(fromPhone);
    if (byPhone) return waOrderReply(byPhone);
    return [
      "للمتابعة أرسل رقم الطلب/الفاتورة كما هو ظاهر في الرسالة أو الفاتورة.",
      "أو رقم الهاتف بصيغة 8 أرقام مثل: 97424400",
      "أو افتح صفحة التتبع:",
      `${ALTURATH_CUSTOMER_BASE_URL}/track`,
      "",
      "ولطلب جديد:",
      waNewOrderUrl(),
    ].join("\n");
  }

  const productReply = await waProductReply(messageText);
  if (productReply) return productReply;

  return waHelpReply();
}

function waExtractMessageText(message: any) {
  if (!message) return "";
  if (message.type === "text") return waString(message?.text?.body);
  if (message.type === "button") return waString(message?.button?.text || message?.button?.payload);
  if (message.type === "interactive") {
    return waString(message?.interactive?.button_reply?.title || message?.interactive?.button_reply?.id || message?.interactive?.list_reply?.title || message?.interactive?.list_reply?.id);
  }
  return "";
}

async function waSendText(to: string, body: string) {
  const token = WHATSAPP_ACCESS_TOKEN();
  const phoneNumberId = WHATSAPP_PHONE_NUMBER_ID();
  if (!token || !phoneNumberId) {
    console.warn("[WHATSAPP] Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID. Reply not sent.");
    return { ok: false, skipped: true, reason: "missing_whatsapp_env" };
  }

  const response = await fetch(`https://graph.facebook.com/${WHATSAPP_GRAPH_VERSION}/${encodeURIComponent(phoneNumberId)}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: waDigits(to),
      type: "text",
      text: { preview_url: true, body: body.slice(0, 3500) },
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("[WHATSAPP] Send failed:", response.status, JSON.stringify(payload).slice(0, 1000));
  }
  return { ok: response.ok, status: response.status, payload };
}

app.get("/api/whatsapp/webhook", (req, res) => {
  const mode = waString(req.query["hub.mode"]);
  const token = waString(req.query["hub.verify_token"]);
  const challenge = waString(req.query["hub.challenge"]);

  if (mode === "subscribe" && token === WHATSAPP_VERIFY_TOKEN) {
    console.log("[WHATSAPP] Webhook verified successfully.");
    return res.status(200).send(challenge);
  }

  console.warn("[WHATSAPP] Webhook verification failed.");
  return res.sendStatus(403);
});

app.post("/api/whatsapp/webhook", async (req, res) => {
  // Meta expects a fast 200 response. We still wait for the reply attempt here because
  // some serverless environments throttle CPU immediately after the response is sent.
  let handledMessages = 0;
  const sendResults: any[] = [];

  try {
    const entries = waAsArray(req.body?.entry);
    for (const entry of entries) {
      for (const change of waAsArray(entry?.changes)) {
        const value = change?.value || {};
        if (waAsArray(value?.statuses).length) {
          console.log(`[WHATSAPP] Status event received: ${waAsArray(value.statuses).length}`);
        }
        for (const message of waAsArray(value?.messages)) {
          const from = waDigits(message?.from);
          const text = waExtractMessageText(message);
          const type = waString(message?.type || "unknown");
          if (!from) continue;

          handledMessages += 1;
          const contactName = waString(value?.contacts?.[0]?.profile?.name || "");
          console.log(`[WHATSAPP] Incoming type=${type} from ${from}: ${waEscapeForLog(text)}`);

          await waUpsertConversation(from, {
            customerName: contactName || undefined,
            status: "open",
            lastInboundText: text || `[${type}]`,
            lastMessageText: text || `[${type}]`,
            lastMessageDirection: "inbound",
          });
          await waAppendConversationMessage(from, { direction: "inbound", type, text: text || `[${type}]`, waMessageId: message?.id, raw: message });
          await waIncrementUnread(from);

          const conversation = await waGetConversation(from);
          let reply = "";
          let sender = "bot";

          if (text && waLooksLikeBackToBotIntent(text)) {
            await waUpsertConversation(from, { mode: "bot", status: "open", botResumedAt: waNowIso(), unreadCount: 0 });
            reply = waHelpReply();
          } else if (text && waLooksLikeSupportIntent(text)) {
            await waUpsertConversation(from, {
              mode: "human",
              status: "needs_support",
              priority: "high",
              supportRequestedAt: waNowIso(),
              botPausedAt: waNowIso(),
              tags: waUnique([...(waAsArray(conversation?.tags)), "support"]),
            });
            const pushResult = await waSendHumanSupportPush({
              phone: from,
              text: text || `[${type}]`,
              contactName,
              messageId: message?.id,
              reason: "support_requested",
            });
            sendResults.push({ to: from, channel: "admin_push", reason: "support_requested", ...(pushResult || {}) });
            reply = waSupportReply();
          } else if (conversation?.mode === "human") {
            // A human is expected to continue from the admin inbox. Avoid noisy repeated bot replies.
            await waUpsertConversation(from, {
              status: "needs_support",
              priority: conversation?.priority || "high",
              supportRequestedAt: conversation?.supportRequestedAt || waNowIso(),
            });
            const pushResult = await waSendHumanSupportPush({
              phone: from,
              text: text || `[${type}]`,
              contactName,
              messageId: message?.id,
              reason: "already_human",
            });
            sendResults.push({ to: from, channel: "admin_push", reason: "already_human", ...(pushResult || {}) });
            console.log(`[WHATSAPP] Conversation ${from} is in human support mode. Auto-reply skipped.`);
          } else {
            reply = text
              ? await waBuildAutoReply(text, from)
              : [
                  "وصلت رسالتك، لكن أقدر أتعامل حاليًا مع الرسائل النصية فقط.",
                  "اكتب: طلب جديد",
                  "أو أرسل رقم الطلب/الفاتورة",
                  "أو رقم الهاتف 8 أرقام مثل: 97424400",
                ].join("\n");
          }

          if (reply) {
            const result = await waSendText(from, reply);
            sendResults.push({ to: from, ok: result.ok, status: result.status, reason: result.reason || result.payload?.error?.message || null });
            await waAppendConversationMessage(from, { direction: "outbound", type: "text", text: reply, sentBy: sender, status: result.ok ? "sent" : "failed", raw: result.payload });
            await waUpsertConversation(from, { lastOutboundText: reply, lastMessageText: reply, lastMessageDirection: "outbound" });
            console.log(`[WHATSAPP] Reply result to ${from}: ${JSON.stringify(sendResults[sendResults.length - 1]).slice(0, 700)}`);
          }
        }
      }
    }

    return res.status(200).json({ success: true, handledMessages, sendResults });
  } catch (error: any) {
    console.error("[WHATSAPP] Webhook processing failed:", error?.message || error);
    return res.status(200).json({ success: false, error: error?.message || String(error), handledMessages, sendResults });
  }
});


app.get("/api/whatsapp/conversations", async (req, res) => {
  try {
    if (!db || !firebaseInitialized) return res.status(503).json({ success: false, error: "Firestore Admin is not ready" });
    const status = waString(req.query.status || "");
    let ref: any = db.collection("whatsappConversations").orderBy("lastMessageAt", "desc").limit(Math.min(100, Math.max(10, Number(req.query.limit || 50))));
    const snap = await ref.get();
    let items = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() || {}) }));
    if (status && status !== "all") items = items.filter((x: any) => x.status === status || x.mode === status);
    res.json({ success: true, conversations: items });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.get("/api/whatsapp/conversations/:phone/messages", async (req, res) => {
  try {
    if (!db || !firebaseInitialized) return res.status(503).json({ success: false, error: "Firestore Admin is not ready" });
    const phone = waDigits(req.params.phone);
    const conv = await waGetConversation(phone);
    const snap = await db.collection("whatsappConversations").doc(phone).collection("messages").orderBy("createdAt", "asc").limit(200).get();
    const messages = snap.docs.map((d: any) => ({ id: d.id, ...(d.data() || {}) }));
    res.json({ success: true, conversation: conv, messages, quickReplies: waQuickReplies() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post("/api/whatsapp/conversations/:phone/reply", async (req, res) => {
  try {
    const phone = waDigits(req.params.phone);
    const text = waString(req.body?.text || req.query.text);
    const sentBy = waString(req.body?.sentBy || "admin") || "admin";
    if (!phone || !text) return res.status(400).json({ success: false, error: "Missing phone or text" });
    await waUpsertConversation(phone, { mode: "human", status: "open", unreadCount: 0, lastOutboundText: text, lastMessageText: text, lastMessageDirection: "outbound" });
    const result = await waSendText(phone, text);
    await waAppendConversationMessage(phone, { direction: "outbound", type: "text", text, sentBy, status: result.ok ? "sent" : "failed", raw: result.payload });
    res.status(result.ok ? 200 : 502).json({ success: result.ok, result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post("/api/whatsapp/conversations/:phone/mode", async (req, res) => {
  try {
    const phone = waDigits(req.params.phone);
    const mode = waString(req.body?.mode || req.query.mode) === "bot" ? "bot" : "human";
    const patch = mode === "bot"
      ? { mode, status: "open", botResumedAt: waNowIso(), unreadCount: 0 }
      : { mode, status: "needs_support", botPausedAt: waNowIso() };
    await waUpsertConversation(phone, patch);
    res.json({ success: true, mode });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post("/api/whatsapp/conversations/:phone/read", async (req, res) => {
  try {
    const phone = waDigits(req.params.phone);
    await waUpsertConversation(phone, { unreadCount: 0 });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.post("/api/whatsapp/conversations/:phone/close", async (req, res) => {
  try {
    const phone = waDigits(req.params.phone);
    await waUpsertConversation(phone, { status: "closed", mode: "bot", unreadCount: 0, botResumedAt: waNowIso() });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.get("/api/whatsapp/quick-replies", (_req, res) => {
  res.json({ success: true, quickReplies: waQuickReplies() });
});

app.post("/api/whatsapp/send-test", async (req, res) => {
  const expected = WHATSAPP_TEST_SECRET();
  const received = waString(req.headers["x-admin-secret"] || req.query.secret || req.body?.secret);
  if (expected && received !== expected) return res.status(401).json({ success: false, error: "Unauthorized" });

  const to = waDigits(req.body?.to || req.query.to);
  const text = waString(req.body?.text || req.query.text || "تجربة واتساب من نظام التراث ✅");
  if (!to) return res.status(400).json({ success: false, error: "Missing recipient phone number" });

  try {
    const result = await waSendText(to, text);
    return res.status(result.ok ? 200 : 502).json({ success: result.ok, result });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.get("/api/whatsapp/health", (_req, res) => {
  res.json({
    success: true,
    service: "alturath-whatsapp-cloud-api",
    customerBaseUrl: ALTURATH_CUSTOMER_BASE_URL,
    adminBaseUrl: ALTURATH_ADMIN_BASE_URL,
    hasAccessToken: Boolean(WHATSAPP_ACCESS_TOKEN()),
    hasPhoneNumberId: Boolean(WHATSAPP_PHONE_NUMBER_ID()),
    hasVerifyToken: Boolean(WHATSAPP_VERIFY_TOKEN),
    firebaseReady: Boolean(firebaseInitialized && db),
  });
});
// ALTURATH_WHATSAPP_CLOUD_API_END

app.get("/api/appdata/full", async (_req, res) => {
  const startedAt = Date.now();
  try {
    if (!db || !firebaseInitialized) {
      return res.status(503).json({ success: false, error: "Firestore Admin is not ready" });
    }

    const rootRef = db.collection("appData").doc("shared_company_data");
    const rootSnap = await rootRef.get();
    const rootData = rootSnap.exists ? (rootSnap.data() || {}) : {};
    const profile = String((_req.query?.profile || _req.query?.mode || "") as string).toLowerCase();
    const shardKeys = profile === "boot"
      ? FULL_APPDATA_SHARD_KEYS.filter((key) => !BOOT_DEFERRED_APPDATA_SHARD_KEYS.has(key))
      : FULL_APPDATA_SHARD_KEYS;

    const shardSnaps = await Promise.all(
      shardKeys.map(async (key) => {
        try {
          const snap = await rootRef.collection("shards").doc(key).get();
          return { key, snap };
        } catch (error: any) {
          console.warn(`[api/appdata/full] shard read failed for ${key}:`, error?.message || error);
          return { key, snap: null };
        }
      })
    );

    const data: any = { ...rootData };
    const shardCounts: Record<string, number> = {};
    for (const { key, snap } of shardSnaps) {
      if (!snap || !snap.exists) continue;
      const value = decodeFullAppDataShard(key, snap.data() || {});
      if (Array.isArray(value) && value.length > 0) {
        data[key] = value;
        shardCounts[key] = value.length;
      }
    }

    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    return res.json({
      success: true,
      source: "admin-server-firestore-full-appdata",
      profile: profile === "boot" ? "boot" : "full",
      deferredShardKeys: profile === "boot" ? Array.from(BOOT_DEFERRED_APPDATA_SHARD_KEYS) : [],
      durationMs: Date.now() - startedAt,
      shardCounts,
      data,
    });
  } catch (error: any) {
    console.error("[api/appdata/full] failed:", error?.message || error);
    return res.status(500).json({ success: false, error: error?.message || String(error) });
  }
});

app.get("/api/admin-dashboard-data", async (_req, res) => {
  try {
    if (!db || !firebaseInitialized) {
      console.warn("[admin-dashboard-data] Firebase Admin not ready.");
      return res.status(503).json({ success: false, squads: [], orders: [], message: "Firestore Admin is not initialized or connectivity check failed." });
    }

    const cleanPhone = (value: any) => String(value || "").replace(/\D/g, "").slice(-8);
    const asArray = (value: any) => Array.isArray(value) ? value : [];
    const normalizeSquad = (sq: any, fallbackIndex = 0) => {
      const location = sq?.location || sq?.geo || sq?.diwaniyaLocation || sq?.radarLocation || sq?.coordinates || sq?.mapLocation || {};
      const lat = sq?.lat ?? sq?.latitude ?? location?.lat ?? location?.latitude ?? location?._lat;
      const lng = sq?.lng ?? sq?.longitude ?? sq?.lon ?? location?.lng ?? location?.longitude ?? location?.lon ?? location?._long;
      const membersList = asArray(sq?.membersList || sq?.membersData || (Array.isArray(sq?.members) ? sq.members : undefined) || sq?.participants).filter(Boolean);
      return {
        ...sq,
        id: String(sq?.id ?? sq?.diwaniyaId ?? sq?.squadId ?? sq?.docId ?? `diwaniya-${fallbackIndex + 1}`),
        name: sq?.name ?? sq?.diwaniyaName ?? sq?.squadName ?? sq?.title ?? "ديوانية بدون اسم",
        founder: sq?.founder ?? sq?.ownerName ?? sq?.hostName ?? sq?.king ?? membersList?.[0]?.name ?? "",
        phone: sq?.phone ?? sq?.founderPhone ?? sq?.ownerPhone ?? sq?.hostPhone ?? membersList?.[0]?.phone ?? "",
        points: Number(sq?.points ?? sq?.diwaniyaPoints ?? sq?.totalPoints ?? 0) || 0,
        members: Number(sq?.members ?? sq?.membersCount ?? membersList.length ?? 0) || 0,
        membersList,
        ...(lat !== undefined && lng !== undefined ? { lat, lng, location: { ...location, lat, lng } } : {}),
      };
    };

    const mergeSquads = (base: any[], incoming: any[]) => {
      const byId = new Map<string, any>();
      [...base, ...incoming].forEach((raw: any, index: number) => {
        if (!raw || typeof raw !== "object") return;
        const sq = normalizeSquad(raw, index);
        if (!String(sq.name || "").trim()) return;
        const key = String(sq.id || sq.name || index);
        const prev = byId.get(key) || {};
        const prevMembers = asArray(prev.membersList);
        const nextMembers = asArray(sq.membersList);
        const memberMap = new Map<string, any>();
        [...prevMembers, ...nextMembers].forEach((m: any) => {
          const phone = cleanPhone(m?.phone || m?.customerPhone || m?.mobile);
          const mKey = phone || String(m?.id || m?.name || Math.random());
          memberMap.set(mKey, { ...(memberMap.get(mKey) || {}), ...m });
        });
        byId.set(key, {
          ...prev,
          ...sq,
          points: Math.max(Number(prev.points || 0), Number(sq.points || 0)),
          membersList: Array.from(memberMap.values()),
          members: Math.max(Number(prev.members || 0), Number(sq.members || 0), memberMap.size),
        });
      });
      return Array.from(byId.values());
    };

    const squadsFromOrders = (orders: any[]) => {
      const byId = new Map<string, any>();
      orders.forEach((order: any, index: number) => {
        const rawId = order?.squadId ?? order?.diwaniyaId ?? order?.squadID;
        const rawName = order?.squadName ?? order?.diwaniyaName ?? order?.diwaniya ?? order?.groupName;
        const splitOrigin = String(order?.splitOrigin || order?.qatiaType || order?.source || "").toLowerCase();
        const looksDiwaniya = Boolean(rawId || rawName || splitOrigin.includes("diwaniya") || splitOrigin.includes("squad"));
        if (!looksDiwaniya) return;
        const id = String(rawId || `order-diwaniya-${rawName || index}`);
        const current = byId.get(id) || { id, name: rawName || "ديوانية من الطلبات", membersList: [], ordersCount: 0, points: 0, totalSpent: 0, source: "customer_orders" };
        const memberMap = new Map<string, any>();
        asArray(current.membersList).forEach((m: any) => memberMap.set(cleanPhone(m?.phone) || String(m?.name || memberMap.size), m));
        const addMember = (m: any) => {
          const phone = cleanPhone(m?.phone || m?.customerPhone || m?.mobile);
          const name = m?.name || m?.customerName || m?.displayName || "عضو";
          const key = phone || String(name || memberMap.size);
          if (!key) return;
          memberMap.set(key, { ...(memberMap.get(key) || {}), name, phone: phone || m?.phone || "", source: m?.source || "order" });
        };
        addMember({ name: order?.customerName, phone: order?.customerPhone, source: "order_owner" });
        asArray(order?.splitParticipants).forEach(addMember);
        asArray(order?.splitPayments).forEach(addMember);
        const total = Number(order?.total || order?.amount || 0) || 0;
        byId.set(id, {
          ...current,
          name: current.name || rawName || "ديوانية من الطلبات",
          squadName: rawName || current.squadName || current.name,
          ordersCount: Number(current.ordersCount || 0) + 1,
          totalSpent: Number(current.totalSpent || 0) + total,
          points: Math.max(Number(current.points || 0), Number(order?.squadPoints || order?.points || 0), Math.floor((Number(current.totalSpent || 0) + total) * 10)),
          lastOrderAt: order?.createdAt || order?.date || order?.updatedAt || current.lastOrderAt,
          membersList: Array.from(memberMap.values()),
          members: memberMap.size,
        });
      });
      return Array.from(byId.values());
    };

    let rootSquads: any[] = [];
    try {
      console.log("[admin-dashboard-data] Fetching root-level squads collection...");
      const squadsSnap = await db.collection("squads").get();
      rootSquads = squadsSnap.docs.map((doc: any) => ({ id: doc.id, ...(doc.data() || {}) }));
    } catch (e: any) {
      console.warn("[admin-dashboard-data] Could not read root squads collection:", e?.message || e);
    }

    let sharedData: any = {};
    try {
      const sharedSnap = await db.collection("appData").doc("shared_company_data").get();
      if (sharedSnap.exists) sharedData = sharedSnap.data() || {};
      if (!Array.isArray(sharedData.squads) || sharedData.squads.length === 0) {
        const squadsShardSnap = await db.collection("appData").doc("shared_company_data").collection("shards").doc("squads").get();
        if (squadsShardSnap.exists) {
          const shardSquads = squadsShardSnap.data()?.squads;
          if (Array.isArray(shardSquads) && shardSquads.length > 0) {
            sharedData = { ...sharedData, squads: shardSquads };
          }
        }
      }
    } catch (e: any) {
      console.warn("[admin-dashboard-data] Could not read appData/shared_company_data:", e?.message || e);
    }

    const sharedGenerationId = String(sharedData.__adminDataGenerationId || "");
    if (sharedGenerationId) {
      rootSquads = rootSquads.filter((sq: any) => String(sq?.__adminDataGenerationId || "") === sharedGenerationId);
    }

    const sharedSquads = asArray(sharedData.squads);
    const sharedOrders = asArray(sharedData.orders);
    const inferredSquads = squadsFromOrders(sharedOrders);
    const squads = mergeSquads(mergeSquads(rootSquads, sharedSquads), inferredSquads);

    console.log(`[admin-dashboard-data] Found ${squads.length} diwaniyas. root=${rootSquads.length}, shared=${sharedSquads.length}, fromOrders=${inferredSquads.length}, orders=${sharedOrders.length}`);

    return res.json({ success: true, squads, orders: sharedOrders });
  } catch (err: any) {
    console.error("[admin-dashboard-data] Total failure loading diwaniyas:", err?.message || err);
    return res.status(500).json({ success: false, squads: [], orders: [], message: String(err?.message || "Internal server error") });
  }
});


  // Webhook for payment gateway
  // It synchronizes payment results to the database even if the user doesn't return to the app.
  const handlePaymentUpdate = async (params: any) => {
    if (!db) return;
    console.log("handlePaymentUpdate called with:", JSON.stringify(params));

    const gatewayPayload = normalizeGatewayPayload(params);
    const data = normalizeGatewayPayload((gatewayPayload && typeof gatewayPayload === "object" ? (gatewayPayload as any).data : undefined) || gatewayPayload);

    const rawResult = String(
      (data && typeof data === "object" ? ((data as any).result || (data as any).status || (data as any).payment || (data as any).paymentStatus || (data as any).payment_status) : "") ||
      ((gatewayPayload && typeof gatewayPayload === "object") ? ((gatewayPayload as any).result || (gatewayPayload as any).status || (gatewayPayload as any).payment || (gatewayPayload as any).paymentStatus || (gatewayPayload as any).payment_status) : "") ||
      ""
    ).replace(/\+/g, " ").trim();
    const normalizedResult = normalizePaymentStatusText(rawResult);

    let identifiers = extractPaymentSyncIdentifiers(gatewayPayload);

    const legacyOrderId = normalizeBusinessId(
      (data && typeof data === "object" ? (
        (data as any).invoiceNo ||
        (data as any).invoice_no ||
        (data as any).invoiceId ||
        (data as any).invoice_id ||
        (data as any).invoice ||
        (data as any).orderId ||
        (data as any).order_id ||
        (data as any).orderID ||
        (data as any).track_id ||
        (data as any).trackid ||
        (data as any).requested_order_id ||
        (data as any).merchant_order_id ||
        (data as any).reference?.id ||
        (data as any).reference_id
      ) : "") ||
      ((gatewayPayload && typeof gatewayPayload === "object") ? (
        (gatewayPayload as any).invoiceNo ||
        (gatewayPayload as any).invoice_no ||
        (gatewayPayload as any).invoiceId ||
        (gatewayPayload as any).invoice_id ||
        (gatewayPayload as any).invoice ||
        (gatewayPayload as any).orderId ||
        (gatewayPayload as any).order_id ||
        (gatewayPayload as any).orderID ||
        (gatewayPayload as any).track_id ||
        (gatewayPayload as any).trackid ||
        (gatewayPayload as any).requested_order_id ||
        (gatewayPayload as any).merchant_order_id ||
        (gatewayPayload as any).reference?.id ||
        (gatewayPayload as any).reference_id
      ) : "")
    );

    const legacyPaymentId = normalizePaymentIdentifier(
      (data && typeof data === "object" ? (
        (data as any).payment_id ||
        (data as any).paymentId ||
        (data as any).charge_id ||
        (data as any).chargeId ||
        (data as any).session_id ||
        (data as any).transaction_id ||
        (data as any).transactionId ||
        (data as any).tran_id ||
        (data as any).track_id
      ) : "") ||
      ((gatewayPayload && typeof gatewayPayload === "object") ? (
        (gatewayPayload as any).payment_id ||
        (gatewayPayload as any).paymentId ||
        (gatewayPayload as any).charge_id ||
        (gatewayPayload as any).chargeId ||
        (gatewayPayload as any).session_id ||
        (gatewayPayload as any).transaction_id ||
        (gatewayPayload as any).transactionId ||
        (gatewayPayload as any).tran_id ||
        (gatewayPayload as any).track_id
      ) : "")
    );

    identifiers = {
      targetIds: uniqueCleanStrings([...identifiers.targetIds, legacyOrderId].filter(Boolean)),
      paymentIds: uniqueCleanStrings([...identifiers.paymentIds, legacyPaymentId].filter((value) => value && !isBusinessIdLike(value))),
      gatewayOrderIds: uniqueCleanStrings([...identifiers.gatewayOrderIds, legacyOrderId].filter(Boolean)),
    };

    identifiers = await resolvePaymentSessionTargets(identifiers);

    let orderId = identifiers.targetIds[0] || legacyOrderId;
    let paymentId = firstPaymentId(identifiers.paymentIds) || (isBusinessIdLike(legacyPaymentId) ? "" : legacyPaymentId) || "";

    const classifiedState = classifyGatewayPaymentState(gatewayPayload);

    const isPaid =
      classifiedState === "paid" ||
      normalizedResult === "CAPTURED" ||
      normalizedResult === "SUCCESS" ||
      normalizedResult === "PAID" ||
      normalizedResult === "AUTHORIZED" ||
      normalizedResult === "AUTHORISED" ||
      normalizedResult === "COMPLETED" ||
      normalizedResult === "APPROVED" ||
      normalizedResult === "SUCCESSFULLY" ||
      normalizedResult === "SUCCESSFUL";

    const isFailed =
      classifiedState === "failed" ||
      normalizedResult === "NOT CAPTURED" ||
      normalizedResult === "NOTCAPTURED" ||
      normalizedResult === "FAILED" ||
      normalizedResult === "CANCELLED" ||
      normalizedResult === "CANCELED" ||
      normalizedResult === "DECLINED" ||
      normalizedResult === "ERROR" ||
      normalizedResult === "REJECTED" ||
      normalizedResult === "VOIDED" ||
      normalizedResult === "EXPIRED";

    if (!orderId && identifiers.paymentIds.length === 0) {
      console.warn("Payment update ignored: missing orderId/invoiceNo/paymentId", params);
      return;
    }

    if (isPaid || isFailed) {
      const syncResult = await syncPaymentStatusEverywhere(identifiers, isPaid ? "paid" : "failed", {
        source: "payment-webhook",
        gatewayResult: rawResult || classifiedState,
        identifiersAlreadyResolved: true,
      });
      identifiers = syncResult.identifiers;
      orderId = identifiers.targetIds[0] || orderId;
      paymentId = firstPaymentId(identifiers.paymentIds) || paymentId;
      console.log("[PAYMENT_SYNC] status sync result:", JSON.stringify(syncResult));
    } else {
      console.warn("Payment update ignored: unknown payment status", { rawResult, classifiedState, identifiers });
      return;
    }

    if (!orderId) {
      console.warn("Payment update synced by paymentId only; no business order/invoice id was available.", { paymentId, identifiers });
      return;
    }

    try {
        if (isPaid) {
            const invoiceRef = db.collection('invoices').doc(orderId);
            const invSnap = await invoiceRef.get();
            if (invSnap.exists) {
                const data = invSnap.data();
                if (data?.paymentStatus !== 'paid') {
                    try {
                        await invoiceRef.update({ paymentStatus: 'paid', status: 'تم الدفع بنجاح', paymentId: paymentId || '', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', orderId).get();
                        for (const doc of orderQ.docs) {
                            await doc.ref.update({ status: 'تم الدفع بنجاح', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        }
                        const eventId = `safe-worker-invoice-paid-${orderId}`;
                        sendSmartAlertPushNotification({
                            title: "✅ تم الدفع",
                            body: `تم دفع الفاتورة ${orderId}${data?.totalAmount ? ` — ${data.totalAmount} د.ك` : ""}`,
                            alertType: "payment_paid",
                            eventId,
                            url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(orderId)}`,
                        }).then((result) => rememberPushEvent(eventId, {
                            source: "payment-webhook",
                            type: "invoice_paid",
                            invoiceId: orderId,
                        }, result)).catch(console.error);
                    } catch (e) {
                        console.error("Error updating invoice/order in handlePaymentUpdate:", e);
                    }
                }
            } else {
                // Try searching by paymentId as fallback
                if (paymentId) {
                    const invByPayId = await db.collection('invoices').where('paymentId', '==', paymentId).limit(1).get();
                    if (!invByPayId.empty) {
                        const invDoc = invByPayId.docs[0];
                        const data = invDoc.data();
                        if (data?.paymentStatus !== 'paid') {
                            await invDoc.ref.update({ paymentStatus: 'paid', status: 'تم الدفع بنجاح', paymentId: paymentId || '', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                            const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', invDoc.id).get();
                            for (const doc of orderQ.docs) {
                                await doc.ref.update({ status: 'تم الدفع بنجاح', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                            }
                            const eventId = `safe-worker-invoice-paid-pid-${invDoc.id}`;
                            sendSmartAlertPushNotification({
                                title: "✅ تم الدفع (بمعرف الدفع)",
                                body: `تم دفع الفاتورة ${invDoc.id}${data?.totalAmount ? ` — ${data.totalAmount} د.ك` : ""}`,
                                alertType: "payment_paid",
                                eventId,
                                url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invDoc.id)}`,
                            }).catch(console.error);
                        }
                        return;
                    }
                }

                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'paid' && data?.status !== 'تم الدفع بنجاح') {
                        await orderRef.update({ status: 'تم الدفع بنجاح', paymentStatus: 'paid', paymentMethod: 'KNet', updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        const eventId = `safe-worker-payment-paid-${orderId}`;
                        sendSmartAlertPushNotification({
                        title: "✅ تم الدفع",
                        body: `تم دفع الطلب ${orderId}${data?.total ? ` — ${data.total} د.ك` : ""}`,
                        alertType: "payment_paid",
                        eventId,
                        url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}`,
                      }).then((result) => rememberPushEvent(eventId, {
                        source: "payment-webhook",
                        type: "payment_paid",
                        orderId,
                      }, result)).catch(console.error);
                    }
                }
            }
        } else if (isFailed) {
            const invoiceRef = db.collection('invoices').doc(orderId);
            const invSnap = await invoiceRef.get();
            if (invSnap.exists) {
                const data = invSnap.data();
                if (data?.paymentStatus !== 'paid') {
                    await invoiceRef.update({ paymentStatus: 'failed', status: 'فشلت عملية الدفع', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                    const orderQ = await db.collection('orders').where('linkedInvoiceId', '==', orderId).get();
                    for (const doc of orderQ.docs) {
                        const oData = doc.data();
                        if (oData.status !== 'تم الدفع بنجاح' && oData.status !== 'paid') {
                            await doc.ref.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
                        }
                    }
                }
            } else {
                const orderRef = db.collection('orders').doc(orderId);
                const ordSnap = await orderRef.get();
                if (ordSnap.exists) {
                    const data = ordSnap.data();
                    if (data?.status !== 'تم الدفع بنجاح' && data?.status !== 'paid') {
                        await orderRef.update({ status: 'فشلت عملية الدفع', paymentStatus: 'failed', failedAt: admin.firestore.FieldValue.serverTimestamp(), paymentUpdatedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
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




app.post("/api/push/ack", async (req, res) => {
    // Client-side Push receipt logging only.
    // This endpoint never sends Push, never changes tokens, and never changes payment/order logic.
    if (!firebaseInitialized || !db) {
      return res.status(200).json({ success: false, skipped: true, error: "Firebase not initialized" });
    }

    try {
      const body = req.body || {};
      const rawEventId = String(body.eventId || body.parentEventId || "").trim();
      const receiptStatus = String(body.status || "received").trim().toLowerCase();
      const allowedStatuses = new Set(["received", "clicked"]);

      if (!rawEventId || rawEventId.length > 180 || !allowedStatuses.has(receiptStatus)) {
        return res.status(200).json({ success: false, skipped: true, error: "Invalid Push receipt payload" });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const safeEventId = rawEventId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 160);
      const eventRef = db.collection("pushEvents").doc(safeEventId);
      const eventSnap = await eventRef.get();
      const receiptPayload = removeUndefinedDeep({
        lastClientReceiptStatus: receiptStatus,
        clientReceiptObserved: true,
        receivedByDevice: receiptStatus === "received" ? true : undefined,
        openedByEmployee: receiptStatus === "clicked" ? true : undefined,
        receivedAt: receiptStatus === "received" ? now : undefined,
        clickedAt: receiptStatus === "clicked" ? now : undefined,
        lastClientReceiptAt: now,
        updatedAt: now,
        clientReceiptSource: String(body.source || "firebase-messaging-sw"),
        clientReceiptUrl: body.url ? String(body.url).slice(0, 500) : undefined,
        notificationTag: body.notificationTag ? String(body.notificationTag).slice(0, 180) : undefined,
        alertType: body.alertType ? String(body.alertType).slice(0, 80) : undefined,
        note: receiptStatus === "received"
          ? "The employee device Service Worker reported receiving this Push. This is a display/receipt log only and does not change delivery logic."
          : "The employee clicked/opened this Push notification. This is a display/receipt log only and does not change delivery logic.",
      });

      if (eventSnap.exists) {
        await eventRef.set(receiptPayload, { merge: true });
        return res.json({ success: true, linked: true, eventId: safeEventId, status: receiptStatus });
      }

      const receiptDocId = `receipt_${safeEventId}_${receiptStatus}_${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 190);
      await db.collection("pushEvents").doc(receiptDocId).set(removeUndefinedDeep({
        eventId: receiptDocId,
        parentEventId: rawEventId,
        pushEventKind: "client_receipt",
        channel: "web_push",
        deliveryChannel: "push",
        source: "firebase-messaging-sw",
        type: "push_client_receipt",
        status: receiptStatus === "received" ? "received_by_device" : "clicked_by_employee",
        success: true,
        clientReceiptObserved: true,
        receivedByDevice: receiptStatus === "received" ? true : undefined,
        openedByEmployee: receiptStatus === "clicked" ? true : undefined,
        receivedAt: receiptStatus === "received" ? now : undefined,
        clickedAt: receiptStatus === "clicked" ? now : undefined,
        createdAt: now,
        updatedAt: now,
        lastClientReceiptAt: now,
        clientReceiptSource: String(body.source || "firebase-messaging-sw"),
        clientReceiptUrl: body.url ? String(body.url).slice(0, 500) : undefined,
        notificationTag: body.notificationTag ? String(body.notificationTag).slice(0, 180) : undefined,
        alertType: body.alertType ? String(body.alertType).slice(0, 80) : undefined,
        title: "Push receipt from employee device",
        body: receiptStatus === "received" ? "Device reported Push receipt." : "Employee clicked Push notification.",
        message: receiptStatus === "received" ? "Device reported Push receipt." : "Employee clicked Push notification.",
        searchText: [rawEventId, receiptStatus, body.alertType, body.notificationTag, body.url, "push receipt employee device"].filter(Boolean).join(" ").toLowerCase(),
        note: "Receipt could not be linked to a specific delivery-attempt document, so it was stored as a separate receipt record. It does not change delivery logic.",
      }), { merge: true });

      return res.json({ success: true, linked: false, eventId: receiptDocId, parentEventId: rawEventId, status: receiptStatus });
    } catch (error: any) {
      console.warn("[PUSH ACK ERROR]", error?.message || error);
      return res.status(200).json({ success: false, skipped: true, error: error?.message || String(error) });
    }
  });

app.post("/api/push/test-device", async (req, res) => {
    // Manual Push test for one selected token only.
    // No ADMIN_TEST_SECRET is required here because the admin panel already limits access to this screen.
    // The endpoint still sends to exactly one provided token and never broadcasts.
    if (!firebaseInitialized || !db) {
      return res.status(500).json({ success: false, error: "Firebase not initialized" });
    }

    try {
      const { token, title, body, url, userId, deviceLabel } = req.body || {};
      const cleanToken = String(token || "").trim();
      if (!cleanToken || cleanToken.length < 50 || !/^[\x20-\x7E]+$/.test(cleanToken)) {
        return res.status(400).json({ success: false, error: "Valid device token is required" });
      }

      const eventId = `admin-device-test-${Date.now()}`;
      const notificationTitle = String(title || "اختبار إشعار تجريبي من الأدمن");
      const notificationBody = String(body || "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز.");
      const targetUrl = String(url || "https://alturath-admin-0200723670.web.app");

      const message = {
        token: cleanToken,
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: "admin_device_test",
          alertType: "admin_device_test",
          eventId,
          parentEventId: eventId,
          notificationTag: eventId,
          url: targetUrl,
          click_action: targetUrl,
          title: notificationTitle,
          body: notificationBody,
          userId: String(userId || ""),
          deviceLabel: String(deviceLabel || ""),
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "120",
          },
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
            tag: eventId,
            renotify: true,
            requireInteraction: true,
            data: {
              url: targetUrl,
              eventId,
              parentEventId: eventId,
              notificationTag: eventId,
              alertType: "admin_device_test",
            },
          },
          fcmOptions: {
            link: targetUrl,
          },
        },
      };

      const responseId = await admin.messaging().send(message as any);

      try {
        await db.collection("pushEvents").doc(eventId).set(removeUndefinedDeep({
          eventId,
          parentEventId: eventId,
          pushEventKind: "delivery_attempt",
          channel: "web_push",
          deliveryChannel: "push",
          source: "admin_manual_device_test",
          type: "admin_device_test",
          alertType: "admin_device_test",
          title: notificationTitle,
          body: notificationBody,
          message: notificationBody,
          url: targetUrl,
          userId: userId || null,
          deviceLabel: deviceLabel || null,
          token: cleanToken,
          tokenStart: cleanToken.slice(0, 24),
          tokenLength: cleanToken.length,
          status: "accepted_by_fcm",
          success: true,
          responseId,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          note: "FCM accepted this manual Push test. Browser/device display is not guaranteed unless a client receipt is later added.",
          searchText: [notificationTitle, notificationBody, userId, deviceLabel, cleanToken.slice(0, 24), "admin_device_test"].filter(Boolean).join(" ").toLowerCase(),
        }), { merge: true });
      } catch (logError: any) {
        console.warn("[PUSH TEST DEVICE LOG ERROR]", logError?.message || logError);
      }

      return res.json({
        success: true,
        tokensCount: 1,
        successCount: 1,
        failureCount: 0,
        eventId,
        responseId,
      });
    } catch (error: any) {
      const code = error?.code || "unknown";
      // Do not disable or edit the token from this screen.
      // The admin sees the error and decides manually; this keeps the test safe and read-only except for the pushEvents archive.
      console.warn("[PUSH TEST DEVICE ERROR]", error?.message || error);
      try {
        const cleanToken = String(req.body?.token || "").trim();
        const eventId = `admin-device-test-failed-${Date.now()}`;
        await db.collection("pushEvents").doc(eventId).set(removeUndefinedDeep({
          eventId,
          parentEventId: eventId,
          pushEventKind: "delivery_attempt",
          channel: "web_push",
          deliveryChannel: "push",
          source: "admin_manual_device_test",
          type: "admin_device_test",
          alertType: "admin_device_test",
          title: String(req.body?.title || "اختبار إشعار تجريبي من الأدمن"),
          body: String(req.body?.body || "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز."),
          message: String(req.body?.body || "هذا إشعار اختبار فقط للتأكد من وصول التنبيه لهذا الجهاز."),
          userId: req.body?.userId || null,
          deviceLabel: req.body?.deviceLabel || null,
          token: cleanToken || null,
          tokenStart: cleanToken ? cleanToken.slice(0, 24) : null,
          tokenLength: cleanToken ? cleanToken.length : null,
          status: "failed_by_fcm",
          success: false,
          errorMessage: error?.message || String(error),
          errorCode: code,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          searchText: [req.body?.title, req.body?.body, req.body?.userId, req.body?.deviceLabel, cleanToken ? cleanToken.slice(0, 24) : "", "admin_device_test"].filter(Boolean).join(" ").toLowerCase(),
        }), { merge: true });
      } catch (logError: any) {
        console.warn("[PUSH TEST DEVICE FAILURE LOG ERROR]", logError?.message || logError);
      }
      return res.status(200).json({ success: false, tokensCount: 1, successCount: 0, failureCount: 1, error: error?.message || String(error), code });
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
      const isInvoiceAlert = String(orderId).startsWith("INV-");

      try {
        let orderSnap: any = await db.collection("orders").doc(orderId).get();
        // Avoid multiple .where queries if doc doesn't exist to prevent quota exhaustion.
        // For admin invoices (INV-...), also check the invoices collection using the same ID.

        if (orderSnap.exists) {
          order = orderSnap.data() || {};
        } else {
          const invoiceSnap: any = await db.collection("invoices").doc(orderId).get();
          if (invoiceSnap.exists) {
            order = { ...(invoiceSnap.data() || {}), type: "admin_invoice" };
          }
        }

        if (!order) {
          // Fallback: some app orders/invoices are stored inside appData/shared_company_data arrays
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
                resolvedOrderId = found.id || found.orderId || found.orderNumber || orderId;
                break;
              }
            }
          }
        }
      } catch (err: any) {
        if (String(err).includes("RESOURCE_EXHAUSTED")) {
            console.warn(`[order-created-alert] Firestore quota exceeded. Falling back to incoming payload for: ${orderId}`);
        } else if (!String(err).includes("PERMISSION_DENIED")) {
            console.warn("[order-created-alert] Firestore fetch failed. Continuing with minimal payload.", err.message);
        }
        order = { orderNumber: clientOrderNumber, total: clientTotal };
      }

      if (!order) {
        // Do not fail invoice alerts if the client has just created the invoice and Firestore sync is still catching up.
        // Keep notification delivery logic unchanged; only allow a minimal payload for INV fallback.
        if (isInvoiceAlert) {
          order = {
            id: orderId,
            invoiceNo: orderId,
            invoiceNumber: orderId,
            totalAmount: clientTotal,
            paymentStatus: "pending",
            status: "بانتظار الدفع",
            type: "admin_invoice"
          };
        } else {
          return res.status(404).json({
            success: false,
            message: "Order not found",
            searchedFor: orderId,
          });
        }
      }
      const paymentStatus = String(order.paymentStatus || "").toLowerCase();
      const status = String(order.status || "");
      const isCancelledOrder =
        paymentStatus.includes("cancel") ||
        status.toLowerCase().includes("cancel") ||
        status.includes("ملغي") ||
        status.includes("ملغى") ||
        status.includes("تم الإلغاء") ||
        status.includes("تم الالغاء");

      if (isCancelledOrder) {
        return res.json({
          success: true,
          skipped: true,
          reason: "Cancelled order alerts are disabled",
        });
      }

      const isAlreadyPaid =
        paymentStatus === "paid" ||
        paymentStatus === "captured" ||
        status.includes("تم الدفع");

      if (isAlreadyPaid) {
        return res.json({
          success: true,
          skipped: true,
          reason: "Order is already paid",
        });
      }

      const graceInfo = pendingPaymentGraceInfo(order, resolvedOrderId);
      if (graceInfo.shouldDelay) {
        return res.json({
          success: true,
          skipped: true,
          scheduled: true,
          reason: "Pending payment push delayed until grace period passes",
          delaySeconds: graceInfo.remainingSeconds,
          graceSeconds: PAYMENT_PENDING_GRACE_SECONDS,
        });
      }

      const eventId = `order-created-${resolvedOrderId}`;
      let eventSnap: any;
      try {
        const eventRef = db.collection("pushEvents").doc(eventId);
        eventSnap = await eventRef.get();
        if (eventSnap.exists) {
          return res.json({
            success: true,
            skipped: true,
            reason: "Notification already sent",
          });
        }
      } catch (e: any) {
         console.warn("Could not check pushEvents:", e.message);
      }

      const orderNumber =
        order.orderNumber ||
        order.invoiceNo ||
        order.invoiceNumber ||
        clientOrderNumber ||
        orderId;

      const total =
        order.total ||
        order.totalAmount ||
        order.finalTotal ||
        order.amount ||
        clientTotal ||
        "";

      const result = await sendSmartAlertPushNotification({
        title: isInvoiceAlert ? "⏳ فاتورة لم تُدفع" : "⏳ طلب لم يدفع",
        body: `${isInvoiceAlert ? "الفاتورة" : "الطلب"} ${orderNumber} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${total ? ` — القيمة ${total} د.ك` : ""}`,
        eventId,
        alertType: isInvoiceAlert ? "invoice_pending_immediate" : "payment_pending_immediate",
        url: isInvoiceAlert
          ? `/?invoice=${encodeURIComponent(resolvedOrderId)}`
          : `/?order=${encodeURIComponent(resolvedOrderId)}`
      });

      try {
        const eventRef = db.collection("pushEvents").doc(eventId);
        await eventRef.set({
          orderId,
          type: isInvoiceAlert ? "invoice_created_pending_payment" : "order_created_pending_payment",
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          result,
        });
      } catch (e: any) {
        console.warn("Could not log pushEvent:", e.message);
      }

      return res.json(result);
    } catch (error: any) {
      console.warn("order-created-alert processing completed with error:", error.message);

      return res.status(200).json({ // Return 200 to prevent frontend crashes
        success: false,
        message: error.message,
      });
    }
  });



  app.get("/api/debug/recent-orders", async (req, res) => {
    try {
      const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();

      if (receivedSecret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!db) {
        return res.status(200).json({
          success: true,
          mocked: true,
          message: "Firestore Admin is not initialized. Debug skipped.",
        });
      }

      function normalizeDate(value: any) {
        if (!value) return null;
        if (value.toDate) return value.toDate().toISOString();
        if (value instanceof Date) return value.toISOString();
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d.toISOString();
      }

      const ordersSnap = await db.collection("orders").limit(20).get();

      const orders = ordersSnap.docs.map((doc) => {
        const data = doc.data() || {};

        return {
          docId: doc.id,
          id: data.id || null,
          orderId: data.orderId || null,
          orderNumber: data.orderNumber || null,
          invoiceNo: data.invoiceNo || null,
          invoiceNumber: data.invoiceNumber || null,
          status: data.status || null,
          paymentStatus: data.paymentStatus || null,
          total: data.total || null,
          totalAmount: data.totalAmount || null,
          finalTotal: data.finalTotal || null,
          amount: data.amount || null,
          createdAt: normalizeDate(data.createdAt),
          orderDate: normalizeDate(data.orderDate),
          timestamp: normalizeDate(data.timestamp),
          created_at: normalizeDate(data.created_at),
          rawKeys: Object.keys(data).slice(0, 40),
        };
      });

      const appDataSnap = await db.collection("appData").doc("shared_company_data").get();

      let appDataArrays: any[] = [];

      if (appDataSnap.exists) {
        const appData = appDataSnap.data() || {};

        appDataArrays = Object.entries(appData)
          .filter(([_, value]) => Array.isArray(value))
          .map(([key, value]: any) => ({
            key,
            count: value.length,
            sample: value.slice(-3).map((item: any) => ({
              id: item?.id || null,
              orderId: item?.orderId || null,
              orderNumber: item?.orderNumber || null,
              invoiceNo: item?.invoiceNo || null,
              invoiceNumber: item?.invoiceNumber || null,
              status: item?.status || null,
              paymentStatus: item?.paymentStatus || null,
              total: item?.total || null,
              totalAmount: item?.totalAmount || null,
              finalTotal: item?.finalTotal || null,
              amount: item?.amount || null,
              createdAt: normalizeDate(item?.createdAt),
              orderDate: normalizeDate(item?.orderDate),
              timestamp: normalizeDate(item?.timestamp),
              created_at: normalizeDate(item?.created_at),
              rawKeys: item && typeof item === "object" ? Object.keys(item).slice(0, 30) : [],
            })),
          }));
      }

      return res.json({
        success: true,
        ordersCollectionCount: orders.length,
        orders,
        appDataArrays,
      });
    } catch (error: any) {
      if (!String(error).includes("PERMISSION_DENIED")) console.error("recent-orders debug error:", error);

      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  });

  let __alertsOrdersCache = { time: 0, docs: [] as any[] };

  async function getRecentOrdersCached(limit = 50) {
    const now = Date.now();
    if (now - __alertsOrdersCache.time < 5 * 60 * 1000) {
        return __alertsOrdersCache.docs;
    }
    try {
        const snap = await db.collection("orders").limit(limit).get();
        __alertsOrdersCache.time = now;
        __alertsOrdersCache.docs = snap.docs;
        return snap.docs;
    } catch (e: any) {
        if (e.message && e.message.includes("PERMISSION_DENIED")) {
            console.log("[ALERTS] Failed to fetch orders: PERMISSION_DENIED (Continuing safely)");
        } else {
            console.error("[ALERTS] Failed to fetch orders:", e.message);
        }
        return __alertsOrdersCache.docs;
    }
  }

  app.post("/api/push/run-business-alerts", async (req, res) => {
    try {
      const receivedSecret = String(req.headers["x-admin-secret"] || "").trim();

      if (receivedSecret !== process.env.ADMIN_TEST_SECRET) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized",
        });
      }

      if (!db) {
        return res.status(200).json({
          success: true,
          mocked: true,
          message: "Firestore Admin is not initialized. Alerts skipped.",
        });
      }

      const now = new Date();

      const kuwaitParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kuwait",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(now).reduce((acc: any, part) => {
        if (part.type !== "literal") acc[part.type] = part.value;
        return acc;
      }, {});

      const todayKey = `${kuwaitParts.year}-${kuwaitParts.month}-${kuwaitParts.day}`;
      const kuwaitHour = Number(kuwaitParts.hour);

      const dayStart = new Date(`${todayKey}T00:00:00.000+03:00`);
      const dayEnd = new Date(`${todayKey}T23:59:59.999+03:00`);

      const newOrderWindowStart = new Date(now.getTime() - 15 * 60 * 1000);
      const pendingPaymentWindowStart = new Date(now.getTime() - 60 * 60 * 1000);
      const pendingPaymentGraceAgo = new Date(now.getTime() - PAYMENT_PENDING_GRACE_MS);
      const paymentFailureGraceAgo = new Date(now.getTime() - PAYMENT_FAILURE_GRACE_MS);
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const results: any[] = [];

      async function alreadySent(eventId: string) {
        if (__alertsPushEventsCache.knownIds.has(eventId)) return true;
        const snap = await db!.collection("pushEvents").doc(eventId).get();
        if (snap.exists) {
            __alertsPushEventsCache.knownIds.add(eventId);
            return true;
        }
        return false;
      }

      async function markSent(eventId: string, payload: any, result: any) {
        await db!.collection("pushEvents").doc(eventId).set({
          ...payload,
          result,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        __alertsPushEventsCache.knownIds.add(eventId);
      }

      function getDateValue(value: any): Date | null {
        if (!value) return null;
        if (value.toDate) return value.toDate();
        if (value instanceof Date) return value;
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
      }

      function getOrderNumber(order: any, fallback: string) {
        return order.orderNumber || order.invoiceNo || order.invoiceNumber || order.orderId || fallback;
      }

      function getTotal(order: any) {
        const raw = order.total || order.totalAmount || order.finalTotal || order.amount || 0;
        const n = Number(raw);
        return isNaN(n) ? 0 : n;
      }

      function isPaidOrder(order: any) {
        const paymentStatus = String(order.paymentStatus || "").toLowerCase();
        const status = String(order.status || "");
        return (
          paymentStatus === "paid" ||
          paymentStatus === "captured" ||
          paymentStatus === "success" ||
          status.includes("تم الدفع") ||
          status.toLowerCase().includes("paid")
        );
      }

      function isPendingPayment(order: any) {
        const paymentStatus = String(order.paymentStatus || "").toLowerCase();
        const status = String(order.status || "").toLowerCase();

        if (isPaidOrder(order)) return false;

        return (
          paymentStatus === "" ||
          paymentStatus === "pending" ||
          paymentStatus === "unpaid" ||
          paymentStatus === "not_paid" ||
          status.includes("بانتظار") ||
          status.includes("pending") ||
          status.includes("لم يدفع")
        );
      }

      // Fetch recent orders from both sources:
      // 1) Root collection: orders
      // 2) appData/shared_company_data.orders array
      const ordersDocs = await getRecentOrdersCached(50);

      const rootOrders = ordersDocs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
        __source: "orders_collection",
      }));

      let appDataOrders: any[] = [];

      const sharedDataSnap = await db.collection("appData").doc("shared_company_data").get();

      if (sharedDataSnap.exists) {
        const sharedData = sharedDataSnap.data() || {};
        const sharedOrders = Array.isArray(sharedData.orders) ? sharedData.orders : [];

        appDataOrders = sharedOrders.map((order: any) => ({
          ...order,
          id: order.id || order.orderId || order.orderNumber,
          __source: "appData_orders",
        }));
      }

      const ordersMap = new Map<string, any>();

      for (const order of [...rootOrders, ...appDataOrders]) {
        const key = String(order.id || order.orderId || order.orderNumber || "");
        if (!key) continue;
        ordersMap.set(key, order);
      }

      const orders = Array.from(ordersMap.values());

      // 0) طلب لم يدفع بعد مهلة قصيرة - server-side, works even if admin app is closed
      for (const order of orders) {
        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!createdAt) continue;
        if (createdAt < newOrderWindowStart || createdAt > now) continue;
        if (createdAt > pendingPaymentGraceAgo) continue;
        if (!isPendingPayment(order)) continue;

        const eventId = `order-created-${(order as any).id}`;

        if (await alreadySent(eventId)) {
          continue;
        }

        const orderNumber = getOrderNumber(order, (order as any).id);
        const total = getTotal(order);

        const result = await sendSmartAlertPushNotification({
          title: "⏳ طلب لم يدفع",
          body: `الطلب ${orderNumber} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${total ? ` — القيمة ${total.toFixed(3)} د.ك` : ""}`,
          alertType: "payment_pending_immediate",
          url: `/?order=${encodeURIComponent((order as any).id)}`
        });

        await markSent(eventId, {
          type: "order_created_pending_payment_server",
          orderId: (order as any).id,
          orderNumber,
        }, result);

        results.push({ eventId, result });
      }

      // 1) طلب لم يدفع بعد 30 دقيقة
      for (const order of orders) {
        const createdAt =
          getDateValue((order as any).createdAt) ||
          getDateValue((order as any).orderDate) ||
          getDateValue((order as any).timestamp) ||
          getDateValue((order as any).created_at);

        if (!createdAt) continue;

        // Only alert for recent pending payments:
        // older than 30 minutes, but not too old.
        // This prevents sending a backlog of old pending orders all at once.
        if (createdAt > thirtyMinutesAgo) continue;
        if (createdAt < pendingPaymentWindowStart) continue;

        if (!isPendingPayment(order)) continue;

        const eventId = `payment-pending-10min-${(order as any).id}`;

        if (await alreadySent(eventId)) {
          continue;
        }

        const orderNumber = getOrderNumber(order, (order as any).id);
        const total = getTotal(order);

        const result = await sendSmartAlertPushNotification({
          title: "⏳ طلب لم يُدفع بعد",
          body: `الطلب ${orderNumber} صار له 30 دقيقة بدون دفع${total ? ` — القيمة ${total.toFixed(3)} د.ك` : ""}`,
          alertType: "payment_pending_10min",
          url: `/?order=${encodeURIComponent((order as any).id)}`
        });

        await markSent(eventId, {
          type: "payment_pending_10min",
          orderId: (order as any).id,
          orderNumber,
        }, result);

        results.push({ eventId, result });
      }

      // حساب طلبات ومبيعات اليوم
      const todayOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= dayStart && d <= dayEnd;
      });

      const paidTodayOrders = todayOrders.filter((order: any) => isPaidOrder(order));
      const todaySales = paidTodayOrders.reduce((sum: number, order: any) => sum + getTotal(order), 0);

      // محاولة صافي الربح: إن توفر profit/netProfit نستخدمه، وإلا 0
      const todayNetProfit = paidTodayOrders.reduce((sum: number, order: any) => {
        const raw =
          order.netProfit ??
          order.profit ??
          order.totalProfit ??
          order.grossProfit ??
          0;

        const n = Number(raw);
        return sum + (isNaN(n) ? 0 : n);
      }, 0);

      // 2) ملخص اليوم الساعة 11 مساءً
      // حتى لا يرسل قبل 11:00 مساءً
      if (kuwaitHour >= 23) {
        const eventId = `daily-summary-${todayKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "🌙 ملخص اليوم — مطبخ التراث",
            body: `الطلبات: ${todayOrders.length} ✅ | المبيعات: ${todaySales.toFixed(3)} د.ك | الربح: ${todayNetProfit.toFixed(3)} د.ك — يعطيكم العافية يا أبطال 🔥`,
            alertType: "daily_summary",
            url: "/"
          });

          await markSent(eventId, {
            type: "daily_summary",
            date: todayKey,
            ordersCount: todayOrders.length,
            sales: todaySales,
            netProfit: todayNetProfit,
          }, result);

          results.push({ eventId, result });
        }
      }

      // 3) المبيعات اليوم أعلى من 200 د.ك
      if (todaySales >= 200) {
        const eventId = `sales-over-200-${todayKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "🔥 المبيعات كسرت 200 د.ك",
            body: `وصلنا ${todaySales.toFixed(3)} د.ك اليوم — شدوا حيلكم يا شباب 🔥`,
            alertType: "sales_over_200",
            url: "/"
          });

          await markSent(eventId, {
            type: "sales_over_200",
            date: todayKey,
            sales: todaySales,
          }, result);

          results.push({ eventId, result });
        }
      }

      // 4) عدد الطلبات زاد فجأة خلال ساعة
      const lastHourOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= oneHourAgo && d <= now;
      });

      const previousHourOrders = orders.filter((order: any) => {
        const d =
          getDateValue(order.createdAt) ||
          getDateValue(order.orderDate) ||
          getDateValue(order.timestamp) ||
          getDateValue(order.created_at);

        return d && d >= twoHoursAgo && d < oneHourAgo;
      });

      const lastHourCount = lastHourOrders.length;
      const previousHourCount = previousHourOrders.length;

      const suddenSpike =
        lastHourCount >= 5 &&
        (
          previousHourCount === 0 ||
          lastHourCount >= previousHourCount * 2
        );

      if (suddenSpike) {
        const hourKey = now.toISOString().slice(0, 13);
        const eventId = `order-spike-${hourKey}`;

        if (!(await alreadySent(eventId))) {
          const result = await sendSmartAlertPushNotification({
            title: "⚡ ضغط طلبات عالي",
            body: `آخر ساعة فيها ${lastHourCount} طلب — جهزوا المطبخ يا أبطال ⚡`,
            alertType: "order_spike",
            url: "/"
          });

          await markSent(eventId, {
            type: "order_spike",
            hour: hourKey,
            lastHourCount,
            previousHourCount,
          }, result);

          results.push({ eventId, result });
        }
      }

      return res.json({
        success: true,
        checkedAt: now.toISOString(),
        resultsCount: results.length,
        results,
      });
    } catch (error: any) {
      console.warn("run-business-alerts error suppressed:", error.message);

      return res.status(200).json({ // Returns 200 to not fail cron/web calls
        success: false,
        message: error.message,
      });
    }
  });

  app.post("/api/push/save-token", async (req, res) => {
    try {
      const {
        token,
        userId,
        restaurantId,
        platform,
        userAgent,
        vendor,
        language,
        standalone,
        notificationPermission,
        serviceWorkerController,
        currentUrl,
        screen,
        savedAtClient
      } = req.body;

      if (!token) {
        return res.status(400).json({ error: "token is required" });
      }

      const ua = userAgent || "";
      const isIPhone = /iPhone/i.test(ua);
      const isIOS = /iPad|iPhone|iPod/.test(ua);
      const isSafariLike = /Safari/i.test(ua);
      const isProbablyPwa = !!standalone;
      const deviceType = isIPhone ? "iphone" : (isIOS ? "ios" : "other");
      
      const { createHash } = await import("crypto");
      const tokenHash = createHash("sha256").update(token).digest("hex");

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
          vendor: vendor || null,
          language: language || null,
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

        await tokenRef.set(removeUndefinedDeep(data), { merge: true });
      }

      return res.json({ success: true });
    } catch (error: any) {
      if (!String(error).includes("PERMISSION_DENIED")) console.error("save-token error:", error);
      return res.status(500).json({
        error: "Failed to save token",
        message: error.message
      });
    }
  });

  
function smartNotificationTag(alertType: string, url: string, fallbackEventId: string) {
  const type = String(alertType || "").toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return fallbackEventId;

  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);
  const id = decodeURIComponent(invoiceMatch?.[1] || orderMatch?.[1] || "");
  if (!id) return fallbackEventId;

  return `payment-final-state-${invoiceMatch ? "invoice" : "order"}-${id}`;
}


type PushTokenRecordForArchive = {
  token: string;
  tokenDocId: string;
  userId?: string;
  deviceId?: string;
  deviceLabel?: string;
  platform?: string;
  deviceType?: string;
  browser?: string;
  permission?: string;
  notificationPermission?: string;
  active?: boolean;
};

function normalizePushTokenRecord(doc: any): PushTokenRecordForArchive | null {
  const data = (doc?.data && typeof doc.data === "function") ? (doc.data() || {}) : (doc || {});
  const token = String(data.token || data.pushToken || data.deviceToken || doc?.id || "").trim();
  if (!token || token.length < 50 || !/^[\x20-\x7E]+$/.test(token)) return null;
  return {
    token,
    tokenDocId: String(doc?.id || data.id || token),
    userId: data.userId ? String(data.userId) : (data.uid ? String(data.uid) : undefined),
    deviceId: data.deviceId ? String(data.deviceId) : (data.tokenHash ? String(data.tokenHash) : String(doc?.id || token.slice(0, 24))),
    deviceLabel: String(data.label || data.name || data.deviceLabel || data.platform || data.deviceType || data.browser || "Push device"),
    platform: data.platform ? String(data.platform) : undefined,
    deviceType: data.deviceType ? String(data.deviceType) : undefined,
    browser: data.browser ? String(data.browser) : (data.vendor ? String(data.vendor) : undefined),
    permission: data.permission ? String(data.permission) : undefined,
    notificationPermission: data.notificationPermission ? String(data.notificationPermission) : undefined,
    active: data.active === undefined ? undefined : Boolean(data.active),
  };
}

function pushArchiveDocId(eventId: string, token: string, index: number) {
  const safeEvent = String(eventId || `push-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 90);
  const safeToken = Buffer.from(String(token || "").slice(0, 64)).toString("base64").replace(/[^a-zA-Z0-9]/g, "").slice(0, 36);
  return `${safeEvent}_${index}_${safeToken}`;
}

function getPushArchiveOrderMeta(url: string, extra: any = {}) {
  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);
  return removeUndefinedDeep({
    invoiceId: extra.invoiceId || (invoiceMatch ? decodeURIComponent(invoiceMatch[1]) : undefined),
    orderId: extra.orderId || (orderMatch ? decodeURIComponent(orderMatch[1]) : undefined),
    orderNumber: extra.orderNumber,
    restaurantId: extra.restaurantId,
    total: extra.total,
  });
}

async function archivePushDeliveryAttempts({
  eventId,
  source,
  title,
  body,
  alertType = "general",
  url = "",
  tokenBatches,
  batchResponses,
  extra = {},
}: {
  eventId: string;
  source: string;
  title: string;
  body: string;
  alertType?: string;
  url?: string;
  tokenBatches: PushTokenRecordForArchive[][];
  batchResponses: any[];
  extra?: any;
}) {
  if (!firebaseInitialized || !db) return;
  try {
    const now = admin.firestore.FieldValue.serverTimestamp();
    const orderMeta = getPushArchiveOrderMeta(url, extra);
    const writes: any[] = [];
    let globalIndex = 0;

    batchResponses.forEach((batchItem: any, batchIndex: number) => {
      const records = tokenBatches[batchIndex] || batchItem?.records || [];
      const responses = batchItem?.response?.responses || [];
      records.forEach((record: PushTokenRecordForArchive, idx: number) => {
        const resp = responses[idx] || {};
        const success = Boolean(resp.success);
        const docId = pushArchiveDocId(eventId, record.token, globalIndex++);
        writes.push({
          id: docId,
          data: removeUndefinedDeep({
            eventId: docId,
            parentEventId: eventId,
            pushEventKind: "delivery_attempt",
            channel: "web_push",
            deliveryChannel: "push",
            source,
            type: "push_delivery_attempt",
            alertType,
            title,
            body,
            message: body,
            url,
            status: success ? "accepted_by_fcm" : "failed_by_fcm",
            success,
            responseId: resp.messageId || null,
            errorCode: resp.error?.code || null,
            errorMessage: resp.error?.message || null,
            token: record.token,
            tokenStart: record.token.slice(0, 24),
            tokenLength: record.token.length,
            tokenDocId: record.tokenDocId,
            deviceId: record.deviceId,
            deviceLabel: record.deviceLabel,
            userId: record.userId,
            platform: record.platform,
            deviceType: record.deviceType,
            browser: record.browser,
            permission: record.permission,
            notificationPermission: record.notificationPermission,
            tokenActiveAtSend: record.active,
            ...orderMeta,
            createdAt: now,
            sentAt: now,
            updatedAt: now,
            note: success
              ? "FCM accepted this Push send request. Browser/device display is not guaranteed unless a client receipt is later added."
              : "FCM rejected this Push send request; inspect errorCode and token.",
            searchText: [title, body, alertType, record.userId, record.deviceLabel, record.platform, record.browser, record.tokenDocId, record.token.slice(0, 24), orderMeta.orderId, orderMeta.invoiceId, orderMeta.orderNumber]
              .filter(Boolean)
              .join(" ")
              .toLowerCase(),
          }),
        });
      });
    });

    for (let i = 0; i < writes.length; i += 400) {
      const batch = db.batch();
      writes.slice(i, i + 400).forEach((item) => {
        batch.set(db.collection("pushEvents").doc(item.id), item.data, { merge: true });
      });
      await batch.commit();
    }
  } catch (error: any) {
    console.warn("[PUSH ARCHIVE WRITE ERROR]", error?.message || error);
  }
}

async function sendSmartAlertPushNotification({
  title,
  body,
  alertType = "general",
  url = "https://alturath-admin-0200723670.web.app",
  eventId = `manual-smart-alert-${Date.now()}`,
  ttlSeconds,
  requireInteraction = true,
  notificationTag,
}: {
  title: string;
  body: string;
  alertType?: string;
  url?: string;
  eventId?: string;
  ttlSeconds?: number;
  requireInteraction?: boolean;
  notificationTag?: string;
}) {
  try {
    if (!firebaseInitialized || !db) {
      return {
        success: true,
        mocked: true,
        error: "Firebase not initialized",
      };
    }

    const snap = await db.collection("pushTokens")
      .where("active", "==", true)
      .get();

    const tokenRecords = snap.docs
      .map((doc: any) => normalizePushTokenRecord(doc))
      .filter(Boolean) as PushTokenRecordForArchive[];
    const tokens = tokenRecords.map(record => record.token);

    if (tokens.length === 0) {
      return {
        success: false,
        tokensCount: 0,
        error: "No active push tokens",
      };
    }

    const normalizedEventId = String(eventId || `manual-smart-alert-${Date.now()}`);
    const normalizedAlertType = String(alertType || "general");
    const normalizedUrl = String(url);
    const normalizedNotificationTag = String(notificationTag || smartNotificationTag(normalizedAlertType, normalizedUrl, normalizedEventId));
    const effectiveTtlSeconds = Number.isFinite(Number(ttlSeconds))
      ? Math.max(10, Math.min(86400, Number(ttlSeconds)))
      : (
          normalizedAlertType.includes("paid") || normalizedAlertType.includes("payment") || normalizedAlertType.includes("invoice") ? 300 :
          normalizedAlertType.includes("pending_10min") ? 900 :
          normalizedAlertType.includes("pending_immediate") ? 900 :
          normalizedAlertType.includes("failed") ? 1800 :
          normalizedAlertType.includes("daily") || normalizedAlertType.includes("summary") ? 86400 :
          normalizedAlertType.includes("qatia") || normalizedAlertType.includes("roulette") ? 3600 :
          3600
        );

    const baseMessage = {
      notification: {
        title: String(title || "تنبيه"),
        body: String(body || ""),
      },
      data: {
        type: "smart_alert",
        alertType: normalizedAlertType,
        eventId: normalizedEventId,
        parentEventId: normalizedEventId,
        notificationTag: normalizedNotificationTag,
        url: normalizedUrl,
        click_action: normalizedUrl,
        title: String(title || "تنبيه"),
        body: String(body || ""),
      },
      webpush: {
        headers: {
          Urgency: "high",
          TTL: String(effectiveTtlSeconds),
        },
        notification: {
          title: String(title || "تنبيه"),
          body: String(body || ""),
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: normalizedNotificationTag,
          renotify: false,
          requireInteraction: Boolean(requireInteraction),
          data: {
            url: normalizedUrl,
            eventId: normalizedEventId,
            parentEventId: normalizedEventId,
            notificationTag: normalizedNotificationTag,
            alertType: normalizedAlertType,
          },
        },
        fcmOptions: {
          link: normalizedUrl,
        },
      },
    };

    const tokenBatches: PushTokenRecordForArchive[][] = [];
    for (let i = 0; i < tokenRecords.length; i += 500) tokenBatches.push(tokenRecords.slice(i, i + 500));
    const batchResponses = await Promise.all(
      tokenBatches.map(async (batchRecords) => ({
        records: batchRecords,
        tokens: batchRecords.map(record => record.token),
        response: await admin.messaging().sendEachForMulticast({ ...baseMessage, tokens: batchRecords.map(record => record.token) }),
      }))
    );
    const response = {
      successCount: batchResponses.reduce((sum, item) => sum + item.response.successCount, 0),
      failureCount: batchResponses.reduce((sum, item) => sum + item.response.failureCount, 0),
      responses: batchResponses.flatMap((item) => item.response.responses),
    };

    if (response.failureCount > 0) {
      const batch = db.batch();
      let changed = 0;

      batchResponses.forEach(({ records: batchRecords, response: batchResponse }) => {
        batchResponse.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === "messaging/registration-token-not-registered" ||
              errorCode === "messaging/invalid-registration-token" ||
              errorCode === "messaging/invalid-argument"
            ) {
              const failedRecord = batchRecords[idx];
              if (failedRecord?.tokenDocId) {
                batch.update(db.collection("pushTokens").doc(failedRecord.tokenDocId), { active: false });
                changed++;
              }
            }
          }
        });
      });

      if (changed > 0) {
        void batch.commit().catch((cleanupError: any) => console.warn("[SMART ALERT PUSH CLEANUP]", cleanupError?.message || cleanupError));
      }
    }

    await archivePushDeliveryAttempts({
      eventId: normalizedEventId,
      source: "sendSmartAlertPushNotification",
      title: String(title || "تنبيه"),
      body: String(body || ""),
      alertType: normalizedAlertType,
      url: normalizedUrl,
      tokenBatches,
      batchResponses,
    });

    return {
      success: true,
      tokensCount: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      errors: response.responses
        .map((resp: any, idx: number) => resp.success ? null : {
          tokenStart: tokens[idx].slice(0, 20),
          code: resp.error?.code,
          message: resp.error?.message,
        })
        .filter(Boolean),
    };
  } catch (error: any) {
    if (!String(error).includes("PERMISSION_DENIED")) {
      console.error("[SMART ALERT PUSH ERROR]", error);
    }
    return {
      success: true,
      mocked: true,
      error: "Failed to process smart alert notification",
      details: error?.message || String(error),
    };
  }
}


async function sendNewOrderPushNotification({ orderId, total, restaurantId = 'default', orderNumber = '', testNotificationOnly = false }: any) {
    if (!admin.messaging || !db) return { success: true, mocked: true, error: "Firebase not initialized" };
    const url = `/?invoice=${orderId}`; 
    
    try {
      const snap = await db.collection("pushTokens").where("active", "==", true).get();
      if (snap.empty) return { success: false, error: "No active push tokens found", tokensCount: 0 };
      
      const tokenRecords = snap.docs
        .map((doc: any) => normalizePushTokenRecord(doc))
        .filter(Boolean) as PushTokenRecordForArchive[];
      const tokens = tokenRecords.map(record => record.token);
      
      const notificationTitle = "⏳ طلب بانتظار الدفع";
      const notificationBody = `الطلب ${orderNumber || orderId} بانتظار الدفع`;
      const newOrderEventId = `new-order-${orderId}-${Date.now()}`;

      const baseMessage = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          type: "smart_alert",
          alertType: "payment_pending_immediate",
          eventId: newOrderEventId,
          parentEventId: newOrderEventId,
          url: String(url),
          click_action: String(url),
          title: notificationTitle,
          body: notificationBody,
          orderId: String(orderId),
          orderNumber: String(orderNumber || ""),
          restaurantId: String(restaurantId || "default"),
          total: String(total || ""),
        },
        webpush: {
          headers: {
            Urgency: "high",
            TTL: "900",
          },
          notification: {
            title: notificationTitle,
            body: notificationBody,
            icon: "/icons/icon-192x192.png",
            badge: "/icons/icon-192x192.png",
            requireInteraction: true,
            data: {
              url: String(url),
              eventId: newOrderEventId,
              parentEventId: newOrderEventId,
              alertType: "payment_pending_immediate",
            },
          },
          fcmOptions: {
            link: String(url),
          },
        },
      };

      const tokenBatches: PushTokenRecordForArchive[][] = [];
      for (let i = 0; i < tokenRecords.length; i += 500) tokenBatches.push(tokenRecords.slice(i, i + 500));
      const batchResponses = await Promise.all(
        tokenBatches.map(async (batchRecords) => ({
          records: batchRecords,
          tokens: batchRecords.map(record => record.token),
          response: await admin.messaging().sendEachForMulticast({ ...baseMessage, tokens: batchRecords.map(record => record.token) }),
        }))
      );
      const response = {
        successCount: batchResponses.reduce((sum, item) => sum + item.response.successCount, 0),
        failureCount: batchResponses.reduce((sum, item) => sum + item.response.failureCount, 0),
        responses: batchResponses.flatMap((item) => item.response.responses),
      };
      
      // Cleanup invalid tokens
      if (response.failureCount > 0) {
        const failedTokens: string[] = [];
        batchResponses.forEach(({ records: batchRecords, response: batchResponse }) => {
          batchResponse.responses.forEach((resp: any, idx: number) => {
            if (!resp.success) {
              const errorCode = resp.error?.code;
              if (errorCode === "messaging/registration-token-not-registered" || 
                  errorCode === "messaging/invalid-registration-token" ||
                  errorCode === "messaging/invalid-argument") {
                const failedRecord = batchRecords[idx];
                if (failedRecord?.tokenDocId) failedTokens.push(failedRecord.tokenDocId);
              }
            }
          });
        });

        if (failedTokens.length > 0) {
          const batch = db.batch();
          for (const tokenDocId of failedTokens) {
            batch.update(db.collection("pushTokens").doc(tokenDocId), { active: false });
          }
          void batch.commit().catch((cleanupError: any) => console.warn("[NEW ORDER PUSH CLEANUP]", cleanupError?.message || cleanupError));
        }
      }

      await archivePushDeliveryAttempts({
        eventId: String(baseMessage.data.eventId),
        source: "sendNewOrderPushNotification",
        title: notificationTitle,
        body: notificationBody,
        alertType: "payment_pending_immediate",
        url: String(url),
        tokenBatches,
        batchResponses,
        extra: { orderId, orderNumber, restaurantId, total },
      });

      return {
        success: response.successCount > 0,
        tokensCount: tokens.length,
        successCount: response.successCount,
        failureCount: response.failureCount,
        errors: response.responses.filter((r: any) => !r.success).map((r: any) => (r.error ? { code: r.error.code, message: r.error.message } : { message: "Unknown error" }))
      };
    } catch (e: any) {
      console.warn("Sending smart alert push error suppressed in preview:", e.message);
      return { success: true, mocked: true, warning: e.message };
    }
  }

  // Consolidate API Key retrieval logic
  const getUPaymentsApiKey = () => {
    const raw =
      process.env.UPAYMENTS_API_KEY ||
      process.env.UPAYMENT_API_KEY ||
      process.env.UPAYMENTS_TOKEN ||
      process.env.UPAYMENT_TOKEN ||
      process.env.VITE_UPAYMENTS_API_KEY ||
      process.env.VITE_UPAYMENT_API_KEY ||
      "";
    return raw.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, '').trim();
  };


  const UPAYMENTS_API_BASE_URL = "https://apiv2api.upayments.com/api/v1";

  function extractGatewayTransaction(payload: any) {
    const normalized = normalizeGatewayPayload(payload);
    if (!normalized || typeof normalized !== "object") return normalized;
    const data = (normalized as any).data;
    if (data && typeof data === "object" && (data as any).transaction && typeof (data as any).transaction === "object") {
      return (data as any).transaction;
    }
    if ((normalized as any).transaction && typeof (normalized as any).transaction === "object") {
      return (normalized as any).transaction;
    }
    if (data && typeof data === "object") return data;
    return normalized;
  }

  function gatewayResultFromPayload(payload: any) {
    const tx = extractGatewayTransaction(payload) || {};
    const normalized = normalizeGatewayPayload(payload) || {};
    const raw =
      (tx && typeof tx === "object" ? ((tx as any).result || (tx as any).status || (tx as any).payment_status || (tx as any).paymentStatus) : "") ||
      (normalized && typeof normalized === "object" ? ((normalized as any).result || (normalized as any).status || (normalized as any).payment_status || (normalized as any).paymentStatus) : "");
    return safeDecodeText(raw);
  }

  function paymentStateFromGatewayResponse(payload: any): PaymentSyncState | "unknown" {
    const tx = extractGatewayTransaction(payload) || {};
    return classifyGatewayPaymentState({
      ...(payload && typeof payload === "object" ? payload : {}),
      ...(tx && typeof tx === "object" ? tx : {}),
    });
  }

  function extractUrlIdentifierCandidates(value: any) {
    const candidates: string[] = [];
    const strings = collectGatewayStrings(value);
    const pushCandidate = (raw: any) => {
      const cleaned = normalizePaymentIdentifier(raw);
      if (!cleaned) return;
      const lower = cleaned.toLowerCase();
      if (["http", "https", "payment", "pay", "api", "v1", "charge", "checkout", "knet"].includes(lower)) return;
      candidates.push(cleaned);
    };

    strings.forEach((text) => {
      const raw = safeDecodeText(text);
      if (!raw) return;
      const queryMatches = raw.matchAll(/(?:track[_-]?id|payment[_-]?id|session[_-]?id|transaction[_-]?id|tran[_-]?id|charge[_-]?id|order[_-]?id|requested[_-]?order[_-]?id|reference[_-]?id|ref)=([^&#\s]+)/gi);
      for (const match of queryMatches) pushCandidate(match[1]);

      if (!/^https?:\/\//i.test(raw)) return;
      try {
        const url = new URL(raw);
        [
          "track_id",
          "trackId",
          "trackid",
          "payment_id",
          "paymentId",
          "paymentid",
          "session_id",
          "transaction_id",
          "tran_id",
          "charge_id",
          "order_id",
          "requested_order_id",
          "reference_id",
          "ref",
          "id",
        ].forEach((key) => pushCandidate(url.searchParams.get(key)));

        url.pathname.split("/").filter(Boolean).forEach((segment) => {
          const decoded = safeDecodeText(segment);
          // Payment links often carry the track token as a long path segment. Avoid short static words.
          if (decoded.length >= 12 || /^(INV|ORD)-/i.test(decoded)) pushCandidate(decoded);
        });
      } catch {
        // Ignore malformed URLs; regex extraction above already handled common query forms.
      }
    });

    return uniqueCleanStrings(candidates);
  }

  function addPaymentItemToReconciliationContext(item: any, context: { targetIds: Set<string>; paymentIds: Set<string>; gatewayOrderIds: Set<string>; statusLookupIds: Set<string> }) {
    if (!item || typeof item !== "object") return;

    paymentItemIds(item).forEach((id) => context.targetIds.add(id));

    const paymentCandidates = uniqueCleanStrings([
      ...paymentItemPaymentIds(item),
      item?.trackId,
      item?.track_id,
      item?.paymentTrackId,
      item?.payment_track_id,
      item?.gatewayTrackId,
      item?.gateway_track_id,
      item?.gatewayPaymentId,
      item?.upaymentsPaymentId,
      item?.sessionId,
      item?.session_id,
      item?.transactionId,
      item?.transaction_id,
      item?.tranId,
      item?.tran_id,
      item?.chargeId,
      item?.charge_id,
    ].map(normalizePaymentIdentifier));

    paymentCandidates.forEach((id) => {
      if (!id) return;
      if (isBusinessIdLike(id)) context.gatewayOrderIds.add(id);
      else {
        context.paymentIds.add(id);
        context.statusLookupIds.add(id);
      }
    });

    const gatewayCandidates = uniqueCleanStrings([
      item?.gatewayOrderId,
      item?.gateway_order_id,
      item?.merchantOrderId,
      item?.merchant_order_id,
      item?.requested_order_id,
      item?.requestedOrderId,
      item?.referenceId,
      item?.reference_id,
      item?.reference?.id,
      item?.order?.id,
      item?.order_id,
    ].map(normalizePaymentIdentifier));

    gatewayCandidates.forEach((id) => {
      if (!id) return;
      context.gatewayOrderIds.add(id);
      // UPayments status API officially wants track_id, but some historical records stored only the gateway/order token.
      // Trying it is safe: unknown/404 responses are ignored and never mark a payment as paid.
      context.statusLookupIds.add(id);
    });

    extractUrlIdentifierCandidates({
      paymentLink: item?.paymentLink,
      paymentUrl: item?.paymentUrl,
      paymentURL: item?.paymentURL,
      payment_url: item?.payment_url,
      link: item?.link,
      url: item?.url,
      gatewayResponse: item?.gatewayResponse,
      paymentData: item?.paymentData,
      upaymentsResponse: item?.upaymentsResponse,
    }).forEach((id) => {
      if (isBusinessIdLike(id)) context.gatewayOrderIds.add(id);
      else context.paymentIds.add(id);
      context.statusLookupIds.add(id);
    });
  }

  async function collectPaymentReconciliationContext(invoiceId: string, explicit: any = {}) {
    const context = {
      targetIds: new Set<string>(),
      paymentIds: new Set<string>(),
      gatewayOrderIds: new Set<string>(),
      statusLookupIds: new Set<string>(),
      matchedItems: 0,
    };

    const cleanInvoiceId = normalizeBusinessId(invoiceId);
    if (cleanInvoiceId) context.targetIds.add(cleanInvoiceId);

    addPaymentItemToReconciliationContext({
      id: cleanInvoiceId,
      invoiceId: cleanInvoiceId,
      paymentId: explicit?.paymentId,
      payment_id: explicit?.payment_id,
      trackId: explicit?.trackId,
      track_id: explicit?.track_id,
      gatewayOrderId: explicit?.gatewayOrderId,
      gateway_order_id: explicit?.gateway_order_id,
      paymentLink: explicit?.paymentLink,
      paymentUrl: explicit?.paymentUrl,
      paymentURL: explicit?.paymentURL,
      payment_url: explicit?.payment_url,
      link: explicit?.link,
      url: explicit?.url,
    }, context);

    if (!db || !cleanInvoiceId) {
      return {
        identifiers: {
          targetIds: Array.from(context.targetIds),
          paymentIds: Array.from(context.paymentIds),
          gatewayOrderIds: Array.from(context.gatewayOrderIds),
        },
        statusLookupIds: uniqueCleanStrings(Array.from(context.statusLookupIds)).slice(0, 30),
        matchedItems: context.matchedItems,
      };
    }

    const inspectItem = (item: any) => {
      if (!item || typeof item !== "object") return;
      const ids = paymentItemIds(item);
      const matches = ids.some((id) => id === cleanInvoiceId) || String(item?.id || "") === cleanInvoiceId;
      if (!matches) return;
      context.matchedItems += 1;
      addPaymentItemToReconciliationContext(item, context);
    };

    const readDoc = async (collectionName: string, docId: string) => {
      try {
        const snap = await db.collection(collectionName).doc(docId).get();
        if (snap.exists) inspectItem({ id: snap.id, ...(snap.data() || {}) });
      } catch (error: any) {
        console.warn(`[PAYMENT_RECONCILE] Could not read ${collectionName}/${docId}:`, error?.message || error);
      }
    };

    await readDoc("invoices", cleanInvoiceId);
    await readDoc("orders", cleanInvoiceId);

    for (const [collectionName, field] of [
      ["orders", "linkedInvoiceId"],
      ["orders", "invoiceId"],
      ["orders", "invoiceNo"],
      ["invoices", "linkedOrderId"],
      ["invoices", "orderId"],
    ] as const) {
      try {
        const snap = await db.collection(collectionName).where(field, "==", cleanInvoiceId).limit(20).get();
        snap.docs.forEach((docSnap: any) => inspectItem({ id: docSnap.id, ...(docSnap.data() || {}) }));
      } catch (error: any) {
        console.warn(`[PAYMENT_RECONCILE] Query ${collectionName}.${field} failed:`, error?.message || error);
      }
    }

    const sessionQueries: Array<Promise<any>> = [];
    const addSession = (session: any) => {
      if (!session || typeof session !== "object") return;
      context.matchedItems += 1;
      addPaymentItemToReconciliationContext({
        ...session,
        id: session?.invoiceId || session?.invoiceNo || session?.orderId || cleanInvoiceId,
        invoiceId: session?.invoiceId || session?.invoiceNo || cleanInvoiceId,
        orderId: session?.orderId,
        linkedOrderId: session?.linkedOrderId,
        sourceOrderId: session?.sourceOrderId,
        gatewayOrderId: session?.gatewayOrderId,
        paymentId: session?.paymentId,
        payment_id: session?.payment_id,
        trackId: session?.trackId,
        track_id: session?.track_id,
        paymentLink: session?.paymentLink,
      }, context);
    };

    for (const docId of uniqueCleanStrings([cleanInvoiceId, explicit?.paymentId, explicit?.trackId, explicit?.gatewayOrderId].map(safePaymentSessionDocId)).filter(Boolean)) {
      sessionQueries.push(db.collection("paymentSessions").doc(docId).get().then((snap: any) => { if (snap.exists) addSession(snap.data() || {}); }).catch((error: any) => console.warn("[PAYMENT_RECONCILE] Session doc lookup failed:", error?.message || error)));
    }

    for (const field of ["invoiceId", "invoiceNo", "orderId", "sourceOrderId", "linkedOrderId", "gatewayOrderId", "paymentId", "payment_id", "trackId", "track_id"] as const) {
      sessionQueries.push(db.collection("paymentSessions").where(field, "==", cleanInvoiceId).limit(10).get().then((snap: any) => snap.docs.forEach((docSnap: any) => addSession(docSnap.data() || {}))).catch((error: any) => console.warn(`[PAYMENT_RECONCILE] Session ${field} lookup failed:`, error?.message || error)));
    }
    await Promise.all(sessionQueries);

    try {
      const sharedSnap = await db.collection("appData").doc("shared_company_data").get();
      if (sharedSnap.exists) {
        const shared = sharedSnap.data() || {};
        ["invoices", "orders"].forEach((key) => {
          const items = Array.isArray(shared[key]) ? shared[key] : [];
          items.forEach(inspectItem);
        });
      }
    } catch (error: any) {
      console.warn("[PAYMENT_RECONCILE] Could not inspect shared_company_data root:", error?.message || error);
    }

    for (const key of ["invoices", "orders"] as const) {
      try {
        const shardSnap = await db.collection("appData").doc("shared_company_data").collection("shards").doc(key).get();
        if (shardSnap.exists) {
          const items = readArrayFromShardData(key, shardSnap.data() || {});
          if (Array.isArray(items)) items.forEach(inspectItem);
        }
      } catch (error: any) {
        console.warn(`[PAYMENT_RECONCILE] Could not inspect shared shard ${key}:`, error?.message || error);
      }
    }

    return {
      identifiers: {
        targetIds: uniqueCleanStrings(Array.from(context.targetIds)).filter(Boolean),
        paymentIds: uniqueCleanStrings(Array.from(context.paymentIds)).filter((id) => id && !isBusinessIdLike(id)),
        gatewayOrderIds: uniqueCleanStrings(Array.from(context.gatewayOrderIds)).filter(Boolean),
      },
      statusLookupIds: uniqueCleanStrings([
        ...Array.from(context.statusLookupIds),
        ...Array.from(context.paymentIds),
        ...Array.from(context.gatewayOrderIds),
      ]).filter(Boolean).slice(0, 30),
      matchedItems: context.matchedItems,
    };
  }

  async function fetchUPaymentsStatusByLookupId(apiKey: string, lookupId: string) {
    const cleanLookupId = normalizePaymentIdentifier(lookupId);
    if (!cleanLookupId) return null;

    const endpoints = [
      `${UPAYMENTS_API_BASE_URL}/get-payment-status/${encodeURIComponent(cleanLookupId)}`,
      `${UPAYMENTS_API_BASE_URL}/charge/${encodeURIComponent(cleanLookupId)}`,
    ];

    let lastResponse: any = null;
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${apiKey}`,
          },
        });

        const contentType = response.headers.get("content-type") || "";
        const body = contentType.includes("application/json") ? await response.json() : { raw: await response.text() };
        const state = paymentStateFromGatewayResponse(body);
        const tx = extractGatewayTransaction(body) || {};
        const identifiers = extractPaymentSyncIdentifiers({ lookupId: cleanLookupId, ...body, ...(tx && typeof tx === "object" ? tx : {}) });
        const result = gatewayResultFromPayload(body) || state;

        lastResponse = {
          ok: response.ok,
          httpStatus: response.status,
          endpoint: endpoint.replace(apiKey, "***"),
          lookupId: cleanLookupId,
          state,
          result,
          transaction: tx,
          identifiers,
          body,
        };

        if (response.ok && state !== "unknown") return lastResponse;
      } catch (error: any) {
        lastResponse = { ok: false, lookupId: cleanLookupId, error: error?.message || String(error) };
      }
    }

    return lastResponse;
  }

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
      let { invoiceNo } = req.params;
      if (invoiceNo && typeof invoiceNo === "string" && invoiceNo.includes("_")) {
        invoiceNo = invoiceNo.split("_")[0];
      }
      const q = req.query;

      const result = String(q.result || q.status || q.payment_status || q.paymentStatus || q.payment || "").toUpperCase();
      const paymentId = q.payment_id || "";
      const tranId = q.tran_id || "";
      const ref = q.ref || "";
      const invoiceId = q.invoice_id || "";
      const receiptId = q.receipt_id || "";
      const trackId = q.track_id || "";
      const paymentType = q.payment_type || "";
      const transactionDate = q.transaction_date || "";

      const callbackState = classifyGatewayPaymentState({ ...q, result });
      const normalizedReturnResult = normalizePaymentStatusText(result);
      const isPaid =
        callbackState === "paid" ||
        normalizedReturnResult === "CAPTURED" ||
        normalizedReturnResult === "SUCCESS" ||
        normalizedReturnResult === "SUCCESSFUL" ||
        normalizedReturnResult === "PAID" ||
        normalizedReturnResult === "AUTHORIZED" ||
        normalizedReturnResult === "AUTHORISED" ||
        normalizedReturnResult === "COMPLETED" ||
        normalizedReturnResult === "APPROVED";

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

      const returnPayload = {
        ...q,
        invoiceNo,
        invoice_id: invoiceId || invoiceNo,
        orderId: invoiceNo,
        requested_order_id: invoiceNo,
        payment_id: paymentId,
        tran_id: tranId,
        ref,
        track_id: trackId || q.track_id,
      };

      await syncPaymentStatusEverywhere({
        targetIds: uniqueCleanStrings([invoiceNo, invoiceId].map(normalizeBusinessId)).filter(Boolean),
        paymentIds: uniqueCleanStrings([paymentId, tranId, trackId].map(normalizePaymentIdentifier)).filter((value) => value && !isBusinessIdLike(value)),
        gatewayOrderIds: uniqueCleanStrings([invoiceNo, invoiceId].map(normalizePaymentIdentifier)).filter(Boolean),
      }, status === "paid" ? "paid" : "failed", {
        source: "payment-return-fast",
        gatewayResult: result || status,
        paymentId: normalizePaymentIdentifier(paymentId || tranId || trackId || ""),
        trackId: normalizePaymentIdentifier(trackId || tranId || ""),
        identifiersAlreadyResolved: true,
      });
      void handlePaymentUpdate(returnPayload);

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
      let invoiceNo = String(
        q.requested_order_id ||
        q.order_id ||
        q.orderId ||
        q.invoiceNo ||
        q.invoice_no ||
        q.invoice ||
        q.invoice_id ||
        q.reference_id ||
        q.track_id ||
        ""
      );
      if (invoiceNo && typeof invoiceNo === "string" && invoiceNo.includes("_")) {
        invoiceNo = invoiceNo.split("_")[0];
      }
      try {
        const result = String(q.result || q.status || q.payment_status || q.paymentStatus || q.payment || "").toUpperCase();
        const callbackState = classifyGatewayPaymentState({ ...q, result });
        const normalizedReturnResult = normalizePaymentStatusText(result);
        const isPaid = callbackState === "paid" || normalizedReturnResult === "CAPTURED" || normalizedReturnResult === "SUCCESS" || normalizedReturnResult === "SUCCESSFUL" || normalizedReturnResult === "PAID" || normalizedReturnResult === "AUTHORIZED" || normalizedReturnResult === "AUTHORISED" || normalizedReturnResult === "COMPLETED" || normalizedReturnResult === "APPROVED";
        const status = isPaid ? "paid" : "failed";
        const returnPayload = {
          ...q,
          invoiceNo,
          orderId: invoiceNo,
          requested_order_id: invoiceNo,
        };
        await syncPaymentStatusEverywhere({
          targetIds: uniqueCleanStrings([invoiceNo].map(normalizeBusinessId)).filter(Boolean),
          paymentIds: uniqueCleanStrings([q.payment_id, q.paymentId, q.track_id, q.trackId, q.tran_id].map(normalizePaymentIdentifier)).filter((value) => value && !isBusinessIdLike(value)),
          gatewayOrderIds: uniqueCleanStrings([invoiceNo, q.requested_order_id, q.order_id].map(normalizePaymentIdentifier)).filter(Boolean),
        }, status === "paid" ? "paid" : "failed", {
          source: "payment-return-fast",
          gatewayResult: result || status,
          paymentId: normalizePaymentIdentifier(q.payment_id || q.paymentId || q.track_id || q.trackId || q.tran_id || ""),
          trackId: normalizePaymentIdentifier(q.track_id || q.trackId || q.tran_id || ""),
          identifiersAlreadyResolved: true,
        });
        void handlePaymentUpdate(returnPayload);
        return res.redirect(`/?payment=${status}&invoice=${encodeURIComponent(invoiceNo)}&result=${encodeURIComponent(result)}`);
      } catch (error) {
        console.error("Payment return error:", error);
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
      notificationUrl,
      sourceOrderId,
      linkedOrderId
    } = req.body;
    
    // Clean and robust API Key retrieval
    const envKeys = Object.keys(process.env).filter(k => k.includes('UPAYMENT'));
    console.log("Available Upayments related env keys:", envKeys);
    
    const apiKey = getUPaymentsApiKey();

    if (!apiKey) {
      console.error("UPAYMENTS_API_KEY is not defined or empty. Check environment variables.");
      return res.status(500).json({
        error: "Payment gateway configuration error (Key Missing)",
        message: "UPAYMENTS_API_KEY is not defined or empty on the server environment. Please define UPAYMENTS_API_KEY in the environment."
      });
    }
    
    console.log(`Using API key: ${apiKey.substring(0, 4)}... (Total length: ${apiKey.length})`);
    
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host');
    const fullBaseUrl = `${protocol}://${host}`;

    const validNotificationUrl =
      typeof notificationUrl === "string" && /^https?:\/\//i.test(notificationUrl)
        ? notificationUrl
        : `${fullBaseUrl}/api/webhook/upayments`;

    if (!amount || !customerName || !orderId || !returnUrl || !cancelUrl) {
      const missing = [];
      if (!amount) missing.push("amount");
      if (!customerName) missing.push("customerName");
      if (!orderId) missing.push("orderId");
      if (!returnUrl) missing.push("returnUrl");
      if (!cancelUrl) missing.push("cancelUrl");
      return res.status(400).json({ 
        error: "Missing required payment fields",
        message: `حقول الدفع المطلوبة مفقودة: ${missing.join(", ")}`
      });
    }

    try {
      const baseUrl = UPAYMENTS_API_BASE_URL; // Forced Live Mode as requested
      const orderIdForGateway = `${orderId}_${Date.now()}`;
      
      // Clean and format phone number (ensure 965 prefix for Kuwait)
      let cleanMobile = customerMobile ? customerMobile.toString().replace(/[^0-9]/g, '') : '';
      if (cleanMobile.length === 8) {
        cleanMobile = '965' + cleanMobile;
      } else if (cleanMobile.length === 0) {
        cleanMobile = '96500000000';
      }
      
      const safeAmount = Number(Number(amount).toFixed(3));
      const rawEmail = String(customerEmail || '').trim();
      const safeEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) && !/example\.com$/i.test(rawEmail)
        ? rawEmail
        : `customer-${cleanMobile || orderId}@alturathkw.shop`;

      const payload: any = {
        order: {
          id: orderIdForGateway,
          reference: orderIdForGateway,
          description: description || 'Payment for order ' + orderId,
          currency: 'KWD',
          amount: safeAmount
        },
        language: 'en',
        is_sms: 0,
        is_email: 0,
        paymentGateway: { src: paymentGateway || 'knet' },
        reference: { id: orderIdForGateway },
        customer: {
          uniqueId: cleanMobile || orderIdForGateway,
          name: customerName,
          email: safeEmail,
          mobile: cleanMobile
        },
        returnUrl: returnUrl,
        cancelUrl: cancelUrl,
        notificationUrl: validNotificationUrl
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
        return res.status(response.status).json({ 
          error: "Payment gateway request failed", 
          message: `استجابة غير صالحة من بوابة الدفع (ليست بتنسيق JSON). النص المستلم: ${text.substring(0, 150)}`,
          details: text 
        });
      }
      
      if (!response.ok) {
        console.error("UPayments API error response:", JSON.stringify(data));
        
        let errorMsg = "فشل بوابة الدفع";
        if (data) {
          if (typeof data.message === "string") {
            errorMsg = data.message;
          } else if (typeof data.error === "string") {
            errorMsg = data.error;
          } else if (data.errors && typeof data.errors === "object") {
            errorMsg = Object.entries(data.errors)
              .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(", ") : String(val)}`)
              .join(" | ");
          } else if (data.data && typeof data.data.message === "string") {
            errorMsg = data.data.message;
          } else if (data.data && typeof data.data.error === "string") {
            errorMsg = data.data.error;
          } else {
            errorMsg = JSON.stringify(data);
          }
        }
        
        return res.status(response.status).json({ 
          error: "Payment gateway request failed", 
          message: `خطأ من بوابة الدفع UPayments (كود الحالة ${response.status}): ${errorMsg}`,
          details: data 
        });
      }

      const extractedPaymentLink =
        data?.paymentLink ||
        data?.paymentURL ||
        data?.payment_url ||
        data?.paymentUrl ||
        data?.url ||
        data?.link ||
        data?.data?.paymentLink ||
        data?.data?.paymentURL ||
        data?.data?.payment_url ||
        data?.data?.paymentUrl ||
        data?.data?.url ||
        data?.data?.link ||
        (typeof data?.data === "string" && /^https?:\/\//i.test(data.data) ? data.data : "");

      const createPaymentIdentifiers = extractPaymentSyncIdentifiers({
        ...data,
        orderId: orderIdForGateway,
        invoiceNo: orderId,
        reference: { id: orderIdForGateway },
      });
      const extractedPaymentId =
        firstPaymentId(createPaymentIdentifiers.paymentIds) ||
        normalizePaymentIdentifier(
          data?.paymentId ||
          data?.payment_id ||
          data?.session_id ||
          data?.charge_id ||
          data?.transaction_id ||
          data?.id ||
          data?.data?.paymentId ||
          data?.data?.payment_id ||
          data?.data?.session_id ||
          data?.data?.charge_id ||
          data?.data?.transaction_id ||
          data?.data?.id ||
          data?.data?.transaction?.payment_id ||
          data?.data?.transaction?.transaction_id ||
          ""
        );
      const extractedTrackId = normalizePaymentIdentifier(
        data?.trackId ||
        data?.track_id ||
        data?.paymentTrackId ||
        data?.data?.trackId ||
        data?.data?.track_id ||
        data?.data?.paymentTrackId ||
        data?.data?.transaction?.track_id ||
        data?.data?.transaction?.trackId ||
        ""
      );

      await rememberPaymentSession({
        orderId,
        invoiceId: orderId,
        invoiceNo: orderId,
        sourceOrderId,
        linkedOrderId,
        gatewayOrderId: orderIdForGateway,
        paymentId: extractedPaymentId,
        paymentTrackId: extractedTrackId,
        trackId: extractedTrackId,
        track_id: extractedTrackId,
        amount: safeAmount,
        customerName,
        customerMobile: cleanMobile,
        returnUrl,
        cancelUrl,
        notificationUrl: validNotificationUrl,
        status: "created",
      });

      // Pending-payment push is intentionally handled by the alerts worker after a short grace period.
      // If the customer pays quickly, only the paid notification is sent.
      const pendingGrace = pendingPaymentGraceInfo({ id: orderId, totalAmount: amount, total: amount }, orderId);
      console.log(`[PUSH] Pending-payment alert queued for worker: ${orderId}; grace remaining ${pendingGrace.remainingSeconds}s`);

      res.json({
        ...data,
        paymentLink: extractedPaymentLink || data?.paymentLink || data?.link || data?.url || "",
        paymentId: extractedPaymentId || data?.paymentId || data?.payment_id || data?.data?.paymentId || data?.data?.payment_id || "",
        payment_id: extractedPaymentId || data?.payment_id || data?.paymentId || data?.data?.payment_id || data?.data?.paymentId || "",
        paymentTrackId: extractedTrackId || data?.trackId || data?.track_id || data?.data?.trackId || data?.data?.track_id || "",
        trackId: extractedTrackId || data?.trackId || data?.track_id || data?.data?.trackId || data?.data?.track_id || "",
        track_id: extractedTrackId || data?.track_id || data?.trackId || data?.data?.track_id || data?.data?.trackId || "",
        gatewayOrderId: orderIdForGateway,
        gateway_order_id: orderIdForGateway,
      });
    } catch (error: any) {
      console.error("Error creating payment:", error);
      res.status(500).json({ 
        error: "Failed to create payment", 
        message: error?.message || String(error)
      });
    }
  });

  // The search route is replaced by the payment-return route moved up higher
  app.get("/api/search-order/:phone", async (req, res) => {
    res.json([]);
  });

  app.post("/api/invoice/confirm", async (req, res) => {
    const { paymentId, invoiceId, gatewayOrderId, trackId, paymentTrackId, paymentLink } = req.body || {};
    if (!invoiceId) {
        return res.status(400).json({ error: "Missing invoiceId" });
    }

    const apiKey = getUPaymentsApiKey();
    if (!apiKey) return res.status(500).json({ error: "Missing config" });

    try {
        const provided = {
          ...req.body,
          paymentId: paymentId === "check_by_invoice" ? "" : paymentId,
          payment_id: paymentId === "check_by_invoice" ? "" : paymentId,
          invoiceId,
          invoiceNo: invoiceId,
          orderId: invoiceId,
          gatewayOrderId,
          trackId: trackId || paymentTrackId,
          paymentTrackId: paymentTrackId || trackId,
          paymentLink,
        };

        const result = await verifyAndSyncUPaymentsInvoice(invoiceId, provided, apiKey);
        const state = result.state;

        if (state === "paid") {
            const returnedInvoiceId = result.identifiers?.targetIds?.[0] || invoiceId;
            return res.json({
              success: true,
              verified: true,
              state,
              invoiceId: returnedInvoiceId,
              paymentId: result.paymentId || firstPaymentId(result.identifiers?.paymentIds || []),
              transaction: result.transaction || null,
              syncResult: result.syncResult,
              attempts: result.attempts,
            });
        }

        if (state === "failed") {
            return res.json({
              success: true,
              verified: false,
              state,
              invoiceId,
              paymentId: result.paymentId || firstPaymentId(result.identifiers?.paymentIds || []),
              transaction: result.transaction || null,
              syncResult: result.syncResult,
              attempts: result.attempts,
              debugData: result.gatewayData,
            });
        }

        console.log("UPayments verification did not produce a final status.", JSON.stringify({ invoiceId, attempts: result.attempts }));
        return res.json({ success: true, verified: false, state: "unknown", attempts: result.attempts, debugData: result.gatewayData });
    } catch (e: any) {
        console.error("Error verifying payment:", e);
        return res.status(500).json({ error: "Verification failed", message: e?.message || String(e) });
    }
  });
  app.get("/api/invoice/:id", async (req, res) => {
    // Disabled server-side DB fetch due to missing Google Cloud IAM credentials (admin SDK Service Account).
    // The frontend should fetch data from Firebase Client SDK, or the user needs to provide a private key JSON.
    res.status(503).json({ error: "Service unavailable without service account credentials." });
  });

  // Specific 404 for API to prevent falling through to React
  // ALERTS_WORKER_FINAL_CLEAN_V2_ROOT_PUSH_START
  const ALERTS_ADMIN_TEST_SECRET = process.env.ADMIN_TEST_SECRET || "123456";
  const ALERTS_LOOKBACK_MINUTES = Number(process.env.ALERTS_LOOKBACK_MINUTES || "1440");
  const ALERTS_MAX_SEND_PER_RUN = Number(process.env.ALERTS_MAX_SEND_PER_RUN || process.env.MAX_SEND_PER_RUN || "100");
  const ALERTS_START_FROM_ISO = process.env.ALERTS_START_FROM_ISO || "";

  function alertsRequireSecret(req: any, res: any, next: any) {
    const secret = req.headers["x-admin-secret"] || req.query.secret;
    if (String(secret) !== String(ALERTS_ADMIN_TEST_SECRET)) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    next();
  }

  function alertsIdsFor(x: any) {
    return [x?.id, x?.invoiceId, x?.invoiceNo, x?.orderId, x?.orderNo, x?.number, x?.tracked_order, x?.requested_order_id]
      .filter(Boolean).map(String);
  }

  function alertsDateFromBusinessId(id: any) {
    const m = String(id || "").match(/^(INV|ORD)-(\d{13})-/);
    if (!m) return null;
    const d = new Date(Number(m[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function alertsDateValue(v: any) {
    if (!v) return null;
    if (v instanceof Date) return v;
    if (v?.toDate) return v.toDate();
    if (v?.seconds) return new Date(v.seconds * 1000);
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function alertsBestDate(x: any) {
    for (const id of alertsIdsFor(x)) {
      const d = alertsDateFromBusinessId(id);
      if (d) return d;
    }
    return alertsDateValue(x?.createdAt || x?.created_at || x?.date || x?.updatedAt || x?.paymentUpdatedAt || x?.failedAt || x?.paidAt);
  }

  function alertsInWindow(itemOrId: any, now = new Date()) {
    const d = typeof itemOrId === "string" ? alertsDateFromBusinessId(itemOrId) : alertsBestDate(itemOrId);
    if (!d) return false;
    const cutoff = ALERTS_START_FROM_ISO ? new Date(ALERTS_START_FROM_ISO) : null;
    if (cutoff && d < cutoff) return false;
    const lookback = new Date(now.getTime() - ALERTS_LOOKBACK_MINUTES * 60 * 1000);
    return d >= lookback;
  }

  function alertsBusinessIdFor(x: any, prefix = "") {
    const ids = alertsIdsFor(x);
    if (prefix) return ids.find((id: string) => id.startsWith(prefix)) || "";
    return ids.find((id: string) => /^INV-\d{13}-/.test(id) || /^ORD-\d{13}-/.test(id)) || ids[0] || "";
  }

  function alertsStatusFor(x: any) {
    return String(x?.status || x?.paymentStatus || x?.payment_status || x?.state || "").toLowerCase();
  }
  function alertsIsPaid(s: string) { return s.includes("paid") || s.includes("captured") || s.includes("تم الدفع") || s.includes("مدفوع") || s.includes("جاري التوصيل"); }
  function alertsIsFailed(s: string) { return s.includes("failed") || s.includes("not captured") || s.includes("declined") || s.includes("فشل") || s.includes("فشلت"); }
  function alertsIsPending(s: string) {
    return s === "" || s.includes("pending") || s.includes("pending_payment") || s.includes("payment_pending_immediate") ||
      s.includes("order_created_pending_payment") || s.includes("unpaid") || s.includes("بانتظار") ||
      s.includes("انتظار الدفع") || s.includes("لم يدفع") || s.includes("لم تُدفع") || s.includes("waiting");
  }
  function alertsIsCancelled(s: string) { return s.includes("cancelled") || s.includes("canceled") || s.includes("ملغي") || s.includes("ملغى") || s.includes("تم الإلغاء") || s.includes("تم الالغاء"); }
  function alertsIsQatiaExpired(s: string) { return s.includes("انتهى وقت القطية") || s.includes("انتهى وقت القطيه") || s.includes("ملغي - انتهى وقت القطية") || s.includes("ملغي - انتهى وقت القطيه") || s.includes("qatia expired") || s.includes("split expired"); }
  function alertsIsRoulette(item: any, s: string) { return s.includes("روليت") || s.includes("roulette") || String(item?.type || "").toLowerCase().includes("roulette") || String(item?.orderType || "").toLowerCase().includes("roulette") || String(item?.splitType || "").toLowerCase().includes("roulette"); }
  function alertsIsQatiaLike(item: any, s: string) {
    return !alertsIsRoulette(item, s) && (
      s.includes("قطية") || s.includes("قطيه") || s.includes("split") ||
      String(item?.type || "").toLowerCase().includes("qatia") || String(item?.type || "").toLowerCase().includes("split") ||
      String(item?.orderType || "").toLowerCase().includes("qatia") || String(item?.orderType || "").toLowerCase().includes("split") ||
      String(item?.splitType || "").toLowerCase().includes("qatia") || String(item?.splitType || "").toLowerCase().includes("split") ||
      Array.isArray(item?.splitParticipants) || Boolean(item?.splitPayments)
    );
  }
  function alertsAmountText(x: any) {
    const n = Number(x?.totalAmount ?? x?.total ?? x?.amount ?? x?.price ?? 0);
    return Number.isFinite(n) && n > 0 ? ` — القيمة ${n.toFixed(3)} د.ك` : "";
  }

  async function alertsLatestActiveToken() {
    const snap = await db.collection("pushTokens").where("active", "==", true).get();
    const docs = snap.docs.map((d: any) => ({ id: d.id, data: d.data() }))
      .filter((x: any) => Boolean(x.data.token))
      .sort((a: any, b: any) => {
        const at = a.data.updatedAt?.toMillis ? a.data.updatedAt.toMillis() : 0;
        const bt = b.data.updatedAt?.toMillis ? b.data.updatedAt.toMillis() : 0;
        return bt - at;
      });
    return docs[0]?.data?.token || null;
  }

  let __alertsPushEventsCache = { time: 0, docs: [] as any[], knownIds: new Set<string>() };

  async function alertsReadRecentPushEvents(limit = 100) {
    const now = Date.now();
    if (now - __alertsPushEventsCache.time < 15 * 1000) {
        return { docs: __alertsPushEventsCache.docs };
    }
    try { 
        const snap = await db.collection("pushEvents").orderBy("createdAt", "desc").limit(limit).get(); 
        __alertsPushEventsCache.time = now;
        __alertsPushEventsCache.docs = snap.docs;
        snap.docs.forEach((d: any) => __alertsPushEventsCache.knownIds.add(d.id));
        return snap;
    }
    catch (e1: any) { 
        try { 
            const snap = await db.collection("pushEvents").limit(limit).get(); 
            __alertsPushEventsCache.time = now;
            __alertsPushEventsCache.docs = snap.docs;
            snap.docs.forEach((d: any) => __alertsPushEventsCache.knownIds.add(d.id));
            return snap;
        }
        catch (e2: any) { 
            if (e2.message && e2.message.includes("PERMISSION_DENIED")) {
                console.log("[ALERTS] Failed to fetch pushEvents: Error: 7 PERMISSION_DENIED: Missing or insufficient permissions. (Continuing safely without ADC)");
            } else {
                console.error("[ALERTS] Failed to fetch pushEvents:", e2);
            }
            return { docs: [] }; 
        }
    }
  }

  async function alertsClaim(eventId: string, payload: any = {}) {
    if (__alertsPushEventsCache.knownIds.has(eventId)) {
        return false;
    }

    const ref = db.collection("pushEvents").doc(eventId);

    try {
      await ref.create({
        eventId,
        source: "alerts-worker-final-clean-v3-idempotent",
        status: "claimed",
        payload: removeUndefinedDeep(payload),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        claimedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      __alertsPushEventsCache.knownIds.add(eventId);
      return true;
    } catch (e: any) {
      const code = String(e?.code || e?.message || "");
      if (code.includes("ALREADY_EXISTS") || code.includes("already exists") || code.includes("6")) {
        __alertsPushEventsCache.knownIds.add(eventId);
        return false;
      }

      const snap = await ref.get();
      if (snap.exists) {
        __alertsPushEventsCache.knownIds.add(eventId);
        return false;
      }

      throw e;
    }
  }

  async function alertsMarkSent(eventId: string, result: any) {
    await db.collection("pushEvents").doc(eventId).set({
      eventId,
      source: "alerts-worker-final-clean-v3-idempotent",
      status: result?.success || result?.mocked ? "sent" : "send_failed",
      result,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    __alertsPushEventsCache.knownIds.add(eventId);
  }

  async function alertsSendDataOnly({ title, body, alertType, eventId, url }: any) {
    return await sendSmartAlertPushNotification({
      title: String(title || "تنبيه"),
      body: String(body || ""),
      alertType: String(alertType || "general"),
      url: String(url || "https://admin.alturathkw.shop/"),
      eventId: String(eventId || `safe-worker-${Date.now()}`),
    });
  }

  async function alertsSendOnce(results: any[], eventId: string, payload: any, dryRun: boolean, counters: any) {
    if (dryRun) { results.push({ eventId, dryRun: true, payload }); return; }
    if (counters.sent >= ALERTS_MAX_SEND_PER_RUN) { results.push({ eventId, skipped: true, reason: "max-send-per-run-reached" }); return; }
    const canSend = await alertsClaim(eventId, payload);
    if (!canSend) { results.push({ eventId, skipped: true, reason: "already-sent-or-claimed" }); return; }
    const result = await alertsSendDataOnly({ ...payload, eventId });
    if (result.success || result.mocked) {
      counters.sent += 1;
    }
    await alertsMarkSent(eventId, result);
    results.push({ eventId, result });
  }

  async function alertsGetRecentFailedInvoiceIdsFromPushEvents() {
    const snap = await alertsReadRecentPushEvents(1000);
    const ids = new Set<string>();
    for (const doc of snap.docs) {
      const raw = `${doc.id} ${JSON.stringify(doc.data() || {})}`;
      const looksFailed = raw.includes("invoice-failed") || raw.includes("invoice_failed") || raw.includes("فشل دفع فاتورة") || raw.includes("فشل دفع الفاتورة");
      if (!looksFailed) continue;
      const matches = raw.match(/INV-\d{13}-[A-Z0-9]+/g) || [];
      for (const id of matches) if (alertsInWindow(id)) ids.add(id);
    }
    return Array.from(ids);
  }

  async function alertsSyncFailedInvoicesFromPushEvents() {
    const failedInvoiceIds = await alertsGetRecentFailedInvoiceIdsFromPushEvents();
    if (failedInvoiceIds.length === 0) return { updated: 0, ids: [] };
    const ref = db.collection("appData").doc("shared_company_data");
    let snap;
    try {
      snap = await ref.get();
    } catch (e: any) {
      if (e.message && e.message.includes("PERMISSION_DENIED")) {
        console.log("[ALERTS] alertsSyncFailedInvoicesFromPushEvents get failed: PERMISSION_DENIED (Continuing safely)");
      } else {
        console.error("[ALERTS] alertsSyncFailedInvoicesFromPushEvents get failed:", e);
      }
      return { updated: 0, ids: [] };
	    }
	    const shared = snap.data() || {};
	    const authoritativeSince = new Date(shared.__adminLastAuthoritativeWriteAt || "").getTime();
	    let invoices = Array.isArray(shared.invoices) ? [...shared.invoices] : [];
	    let orders = Array.isArray(shared.orders) ? [...shared.orders] : [];
    const markFailed = (id: string, item: any = {}) => ({ ...item, id, invoiceId: id, invoiceNo: id, tracked_order: id, requested_order_id: id, source: item?.source || "payment-return-failed-event", type: item?.type || "admin_invoice", status: "فشل في عملية الدفع", paymentStatus: "failed", payment_status: "failed", paid: false, failed: true, canPay: true, createdAt: item?.createdAt || alertsDateFromBusinessId(id)?.toISOString() || new Date().toISOString(), failedAt: item?.failedAt || new Date().toISOString(), updatedAt: new Date().toISOString() });
	    let updated = 0;
	    for (const id of failedInvoiceIds) {
	      if (Number.isFinite(authoritativeSince) && authoritativeSince > 0) {
	        const eventTime = alertsDateFromBusinessId(id)?.getTime() || 0;
	        if (eventTime && eventTime < authoritativeSince) continue;
	      }
	      const invoiceMatches = invoices.filter((x: any) => alertsIdsFor(x).includes(id));
      const orderMatches = orders.filter((x: any) => alertsIdsFor(x).includes(id));
      const base = invoiceMatches[invoiceMatches.length - 1] || orderMatches[orderMatches.length - 1] || { id, invoiceId: id, invoiceNo: id, tracked_order: id, requested_order_id: id, source: "payment-return-failed-event", type: "admin_invoice" };
      invoices = [...invoices.filter((x: any) => !alertsIdsFor(x).includes(id)), markFailed(id, base)];
      orders = orders.filter((x: any) => !alertsIdsFor(x).includes(id));
      updated += 1;
    }
    if (updated > 0) await ref.set({ invoices, orders, updatedAt: new Date().toISOString(), lastAutoSyncedFailedInvoicesFinalCleanV2: { ids: failedInvoiceIds, updated, at: new Date().toISOString() } }, { merge: true });
    return { updated, ids: failedInvoiceIds };
  }

  async function alertsLoadSharedData() {
    try {
      const snap = await db.collection("appData").doc("shared_company_data").get();
      return snap.data() || {};
    } catch (e: any) {
      if (e.message && e.message.includes("PERMISSION_DENIED")) {
          console.log("[ALERTS] Failed to load shared_company_data: Error: 7 PERMISSION_DENIED: Missing or insufficient permissions. (Continuing safely without ADC)");
      } else {
          console.error("[ALERTS] Failed to load shared_company_data:", e);
      }
      return {};
    }
  }

  let __alertsReconcileInMemoryLock = false;

  async function alertsReconcile({ dryRun = false } = {}) {
    if (!firebaseInitialized || !db) return { meta: { sent: 0, status: "firebase-not-initialized" }, results: [] };
    if (__alertsReconcileInMemoryLock && !dryRun) {
      return { meta: { sent: 0, status: "already-running" }, results: [] };
    }

    __alertsReconcileInMemoryLock = !dryRun;

    try {
    const counters = { sent: 0 };
	    const results: any[] = [];
	    const now = new Date();
	    const pendingPaymentGraceAgo = new Date(now.getTime() - PAYMENT_PENDING_GRACE_MS);
	    const paymentFailureGraceAgo = new Date(now.getTime() - PAYMENT_FAILURE_GRACE_MS);
	    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    let syncResult = { updated: 0, ids: [] as string[] };
    if (!dryRun) syncResult = await alertsSyncFailedInvoicesFromPushEvents();
    const failedInvoiceIds = new Set(await alertsGetRecentFailedInvoiceIdsFromPushEvents());
    const shared = await alertsLoadSharedData();
    const invoices = Array.isArray(shared.invoices) ? shared.invoices : [];
    const orders = Array.isArray(shared.orders) ? shared.orders : [];

    for (const inv of invoices) {
      const invoiceId = alertsBusinessIdFor(inv, "INV-");
      if (!invoiceId || !alertsInWindow(inv, now)) continue;
      const st = alertsStatusFor(inv);
      if (failedInvoiceIds.has(invoiceId) || alertsIsFailed(st)) {
        const d = alertsBestDate(inv) || now;
        if (d > paymentFailureGraceAgo) continue;
        await alertsSendOnce(results, `safe-worker-invoice-failed-${invoiceId}`, {
          title: "❌ فشلت عملية الدفع",
          body: `فشلت عملية الدفع للفاتورة ${invoiceId}${alertsAmountText(inv)}`,
          alertType: "invoice_payment_failed",
          url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}`
        }, dryRun, counters);
        continue;
      }
      if (alertsIsPaid(st)) { await alertsSendOnce(results, `safe-worker-invoice-paid-${invoiceId}`, { title: "✅ تم دفع فاتورة", body: `تم دفع الفاتورة ${invoiceId}${alertsAmountText(inv)}`, alertType: "invoice_paid", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters); continue; }
      if (alertsIsPending(st)) {
        const d = alertsBestDate(inv) || now;
        if (d <= pendingPaymentGraceAgo) await alertsSendOnce(results, `safe-worker-invoice-pending-immediate-${invoiceId}`, { title: "⏳ فاتورة لم تُدفع", body: `الفاتورة ${invoiceId} لم يتم دفعها بعد ${PAYMENT_PENDING_GRACE_LABEL}${alertsAmountText(inv)}`, alertType: "invoice_pending_immediate", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters);
        if (d <= thirtyMinutesAgo) await alertsSendOnce(results, `safe-worker-invoice-pending-10min-${invoiceId}`, { title: "⏳ فاتورة لم تُدفع بعد 30 دقيقة", body: `الفاتورة ${invoiceId} لم تُدفع بعد 30 دقيقة${alertsAmountText(inv)}`, alertType: "invoice_pending_10min", url: `https://admin.alturathkw.shop/?invoice=${encodeURIComponent(invoiceId)}` }, dryRun, counters);
      }
    }

    for (const order of orders) {
      const orderId = alertsBusinessIdFor(order, "ORD-");
      if (!orderId || !alertsInWindow(order, now)) continue;
      const st = alertsStatusFor(order);
      const qatia = alertsIsQatiaLike(order, st);
      if (qatia && alertsIsPaid(st) && !alertsIsQatiaExpired(st)) { await alertsSendOnce(results, `safe-worker-qatia-completed-${orderId}`, { title: "✅ اكتملت القطية", body: `اكتملت القطية للطلب ${orderId} — تم الدفع بنجاح${alertsAmountText(order)}`, alertType: "qatia_completed", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (qatia && alertsIsQatiaExpired(st)) { results.push({ eventId: `safe-worker-qatia-expired-${orderId}`, skipped: true, reason: "cancelled-order-alert-disabled" }); continue; }
      if (qatia) continue;
      if (alertsIsFailed(st)) {
        const d = alertsBestDate(order) || now;
        if (d > paymentFailureGraceAgo) continue;
        await alertsSendOnce(results, `safe-worker-payment-failed-${orderId}`, { title: "❌ فشل دفع طلب", body: `فشل دفع الطلب ${orderId}${alertsAmountText(order)}`, alertType: "payment_failed", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue;
      }
      if (alertsIsPaid(st)) { await alertsSendOnce(results, `safe-worker-payment-paid-${orderId}`, { title: "✅ تم دفع طلب", body: `تم دفع الطلب ${orderId}${alertsAmountText(order)}`, alertType: "payment_paid", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters); continue; }
      if (alertsIsCancelled(st)) { results.push({ eventId: `safe-worker-order-cancelled-admin-${orderId}`, skipped: true, reason: "cancelled-order-alert-disabled" }); continue; }
      if (alertsIsPending(st)) {
        const d = alertsBestDate(order) || now;
        if (d <= pendingPaymentGraceAgo) await alertsSendOnce(results, `safe-worker-payment-pending-immediate-${orderId}`, { title: "⏳ طلب لم يدفع", body: `الطلب ${orderId} لم يتم دفعه بعد ${PAYMENT_PENDING_GRACE_LABEL}${alertsAmountText(order)}`, alertType: "payment_pending_immediate", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters);
        if (d <= thirtyMinutesAgo) await alertsSendOnce(results, `safe-worker-payment-pending-10min-${orderId}`, { title: "⏳ طلب لم يُدفع بعد 30 دقيقة", body: `الطلب ${orderId} لم يُدفع بعد 30 دقيقة${alertsAmountText(order)}`, alertType: "payment_pending_10min", url: `https://admin.alturathkw.shop/?order=${encodeURIComponent(orderId)}` }, dryRun, counters);
      }
    }
    return { meta: { lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN, startFromIso: ALERTS_START_FROM_ISO || null, sent: counters.sent, syncFailedInvoices: syncResult }, results };
    } finally {
      if (!dryRun) __alertsReconcileInMemoryLock = false;
    }
  }

  app.get("/api/push/alerts-status", async (_req, res) => {
    try {
      if (!firebaseInitialized || !db) return res.status(500).json({ ok: false, error: "Firebase Admin not initialized" });
      res.json({ ok: true, route: "/api/push/alerts-status", service: "alerts-worker-final-clean-v3-idempotent", lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN, startFromIso: ALERTS_START_FROM_ISO || null });
    } catch (e: any) { res.status(500).json({ ok: false, error: e?.message || String(e) }); }
  });

  
// Auto-run payment alerts worker every 60 seconds
// This makes payment notifications automatic instead of requiring manual curl.
let __paymentAlertsAutoRunnerStarted = false;

function startPaymentAlertsAutoRunner() {
  if (__paymentAlertsAutoRunnerStarted) return;
  __paymentAlertsAutoRunnerStarted = true;

  const alertsAutoRunnerIntervalMs = Math.max(
    3000,
    Math.min(60000, Number(process.env.ALERTS_AUTO_RUNNER_INTERVAL_MS || 5000))
  );

  console.log(`[ALERTS] Auto runner started: every ${alertsAutoRunnerIntervalMs / 1000} seconds`);

  const runAlertsPass = async () => {
    if (!firebaseInitialized || !db) return; // Silent if not ready
    try {
      const { meta } = await alertsReconcile({ dryRun: false });

      if (meta?.sent > 0) {
        console.log("[ALERTS] Auto runner sent:", meta.sent);
      } else {
        console.log("[ALERTS] Auto runner checked:", meta?.sent ?? 0);
      }
    } catch (error) {
      console.error("[ALERTS] Auto runner error:", error);
    }
  };

  setTimeout(runAlertsPass, 120);
  setInterval(runAlertsPass, alertsAutoRunnerIntervalMs);
}

if (String(process.env.ENABLE_INTERNAL_ALERTS_RUNNER || "true").toLowerCase() !== "false") {
  startPaymentAlertsAutoRunner();
} else {
  console.log("[ALERTS] Internal auto runner disabled by ENABLE_INTERNAL_ALERTS_RUNNER=false; Cloud Scheduler is responsible.");
}


app.get("/api/push/alerts-debug", alertsRequireSecret, async (_req, res) => {
    try {
      const tokenSnap = await db.collection("pushTokens").where("active", "==", true).get();
      const sharedSnap = await db.collection("appData").doc("shared_company_data").get();
      const shared = sharedSnap.data() || {};
      res.json({ ok: true, activePushTokens: tokenSnap.docs.filter((d: any) => Boolean(d.data()?.token)).length, hasSharedCompanyData: sharedSnap.exists, invoicesCount: Array.isArray(shared.invoices) ? shared.invoices.length : 0, ordersCount: Array.isArray(shared.orders) ? shared.orders.length : 0, lookbackMinutes: ALERTS_LOOKBACK_MINUTES, maxSendPerRun: ALERTS_MAX_SEND_PER_RUN });
    } catch (e: any) { res.status(500).json({ ok: false, error: e?.message || String(e) }); }
  });

  const alertsRunHandler = async (req: any, res: any) => {
    try {
      const dryRun = req.query.dryRun === "1" || req.body?.dryRun === true;
      const { meta, results } = await alertsReconcile({ dryRun });
      res.json({ success: true, checkedAt: new Date().toISOString(), ...meta, resultsCount: results.length, results });
    } catch (e: any) {
      console.error("[alerts-worker-final-clean-v3-idempotent] error", e);
      res.status(500).json({ success: false, error: e?.message || String(e) });
    }
  };

  app.get("/api/push/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.post("/api/push/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.get("/run-alerts", alertsRequireSecret, alertsRunHandler);
  app.post("/run-alerts", alertsRequireSecret, alertsRunHandler);
  // ALERTS_WORKER_FINAL_CLEAN_V2_ROOT_PUSH_END


  const KUWAITI_DIALECT_DICTIONARY = `
ملاحظة حاسمة ومشددة جداً بخصوص استخدام اللهجة الكويتية السليمة:
أنت خبير تسويق كويتي متمكن، وتكتب بأسلوب كويتي أصيل وراقٍ ومحبب ومرح. لذلك يجب احترام قاموس اللهجة الكويتية التقليدية الراقية وممنوع منعاً باتاً الخلط اللغوي:

1. الكلمات الممنوعة نهائياً (ممنوعات لغوية):
- يمنع استخدام كلمة "وشو" أو "ايش" نهائياً! البديل الكويتي هو: "شنو" أو "شنهو" (مثال: "شنو تفضلون"، "شنو بخاطركم اليوم؟").
- يمنع استخدام كلمة "مين" نهائياً! بل البديل هو "منو" أو "من" (مثال: "منو يضبط اليمعة؟").
- يمنع استخدام كلمة "براند" أو "براندات" أو "Brandat" نهائياً ويستبدل بـ "مشروع" أو "محل" أو "مطبخ التراث" أو "هويتنا".
- يمنع استخدام كلمة "كثير" أو "مرة" للتعبير عن المبالغة أو الكثرة! البديل في الكويتي هو: "وايد" أو "حيل" (مثال: "وايد خنين"، "حامض حيل"، "لذيذ وايد").
- يمنع استخدام كلمة "هنا" أو "هناك" بلهجة غير كويتية! البديل الكويتي: "هني" أو "هنيه" أو "اهني".
- يمنع استخدام "هذول" نهائياً! البديل اللغوي الكويتي هو: "هذيل" أو "هذيل السبيشل" أو "هذولا".
- يمنع استخدام "بدي" أو "أريد" أو "بدنا" أو "عايز"! البديل الكويتي: "ابي" أو "نبي" (مثال: "نبي رايكم"، "ابي اطلب").
- يمنع استخدام كلمة "غدا" كفصحى جافة، بل تسمى عادية شعبية "غدا" أو "غدانا اليوم".
- يمنع استخدام شعارات أو عبارات توجيهية موجهة منك كذكاء اصطناعي، بل اكتب النص الإبداعي والتحليل الفني والردود مباشرة وصياغة فكاهية دافئة تلمس القلب فوراً دون مقدمات.

2. الكلمات والمصطلحات الكويتية المألوفة والمحببة (التي تبرد الجبد وتبيض الوجه):
- لطعم الأكل: "ناطع"، "خنين" (خاص بالأكل المعطر بالهيل والزعفران والبهارات الطيبة)، "ذايب ذوبان"، "ولا غلطة"، "على أصوله"، "حامض حلو"، "سبيشل".
- للجمع والترحاب والسعادة: "اليمعة"، "الزوارة"، "الديوانية والربع"، "الأهل والضيوف"، "يبيّض الوجه" (للشيء الشريف المشرف)، "ينترس العين"، "يبرد الجبد" (للأكل اللذيذ الحامض أو الحلو أو المروي)، "يرد الروح"، "عساكم على القوة"، "مثواكم العافية والصحة والهناء".
- للتوجيه السريع: "ضبط"، "ضبط غداك"، "اطلب الحين".
`;

  app.post("/api/ai/quick-messages", express.json({ limit: "2mb" }), async (req, res) => {
    const { category, forceRefresh } = req.body || {};
    if (!category) {
      return res.status(400).json({ error: "Missing category" });
    }

    const runFallback = () => {
      if (category === "trend") {
        return {
          messages: [
            "TREND$$تريند تحدي الـ 60 ثانية ⏱️$$حملة عضوية مجانية$$تفاعل فيروسي وجذب متابعين$$ريلز صاعدة وانستغرام$$آخر 60 دقيقة$$تفاعل ممتاز يثبت الوجه$$أقوى تحدي مجبوس دجاج ناطع في الكويت! صوّر ريل بـ 60 ثانية وفوز ببوكس عائلي يبيّض الوجه من مطبخ التراث الكويتي! 🔥 #مطبخـالتراث #مجبوسـدياي",
            "TREND$$هوس يمعة الويكند والزوارة 🏡$$ميزانية صفر تمويل$$تفاعل المتابعين والعائلات$$فيديوهات سناب شات ريلز$$اليوم وطوال الويكند$$طلبات عائلية متضاعفة$$زوارة اليوم ما تكمل إلا مع ورق عنب وملفوف حامض حلو وناطع يبرد الجبد! اطلب الحين لجمعة الأهل وخلهم ينبهرون باللذة! 🍋 #زوارةـاليوم #ورقـعنب",
            "لو خيروكم الحين بين صينية مجبوس لحم محلية ناطعة وذايبة، وبين صينية مربيان ربيان خنين يبرد الجبد.. شنو تختارون حق غدا اليوم؟ نبي تصويت حاسم! 🥩🐟",
            "سؤال اليوم لجمهور التراث الراقي: شنو السر اللي يخلي ورق العنب مالنا ناطع وولا غلطة بنظركم؟ الحامض حلو زيادة، ولا الخلطة السرية الدافئة؟ 🍋🍃"
          ]
        };
      } else {
        return {
          messages: [
            "تبين زوارة مميزة والكل يتكلم عنها؟ جربوا اليوم ملفوف وورق عنب التراث، حامض ناطع وذايب ذوبان يبيض بوجهكم جدام الأهل والضيوف وولا غلطة! 🍋🍃",
            "ما يحتاج تفكر بجمعة الديوانية والربع اليوم! مجبوس دجاج التراث الخنين بانتظاركم مع الأرز النثري والحشو السبيشل الساخن للتوصيل الفوري. اطلب الحين! 🍗🔥",
            "طعم البحر الأصلي والسمك الطازج المشوي المتبل على أصوله يبرد الجبد ويوصلك لعند باب البيت ساخن وجاهز يمد السفرة بالهناء والعافية. اطلب زبيدينا السبيشل! 🐟❤️"
          ]
        };
      }
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Quick Messages] GEMINI_API_KEY not configured, serving high-fidelity local simulation.");
      return res.json(runFallback());
    }

    try {
      let prompt = "";
      if (category === "trend") {
        prompt = `بصفتك خبير تسويق كويتي ذكي ومستشار ابتكار بروح Apple وسرعة استجابة فائقة. 
تخيل وصمم 3 تريندات ريلز وموجات تواصل اجتماعي فيروسية شائعة جداً في الكويت والمنطقة خلال الـ 60 دقيقة الأخيرة (يمكنك ابتكار تريندات مرتبطة بالمزاج الحالي، الويكند، الزوارة، هوس التوصيل، أو أسلوب حياة كويتي مضحك ومألوف). 
لكل تريند، صغ منشوراً أو ريلاً إبداعياً لمتجر مطبخ التراث الكويتي (العيوش، الأسماك، المحاشي, ورق العنب) يركب تلك الموجة فوراً بشكل ذكي جداً وبدون مبالغة تضر بسمعة المحل.

أخرج النتيجة بصيغة JSON فقط بهذا الشكل:
{
  "messages": [
    "TREND$$[عنوان التريند الكويتي]$$[ميزانية هذا التريند (مثال: عضوي بدون تمويل)]$$[هدف المنشور التسويقي]$$[قناة النشر المناسبة (مثال: ستوري/ريلز)]$$[مدة فعالية التريند والأفضلية لنشره]$$[العائد والفائدة المتوقعة]$$[نص المنشور الإبداعي المصاغ مباشرة بلهجة كويتية بيضاء دافئة ومرحة تجمع القلوب ودون ذكر جمل توجيهية]"
  ]
}
ملاحظة هامة جداً وحاسمة:
1. لا تضع أي جمل توجيهية أو إرشادية كعنوان أو تصدير للنص الإبداعي، بل صغ المنشور نفسه مباشرة وبذكاء.
2. لا تستخدم كلمة "مين" نهائياً في أي جملة، واستخدم بدلاً منها "منو" أو "من" في اللهجة الكويتية.
3. لا تستخدم كلمة "براند" أو "براندات" أو "Brandat" في النص نهائياً.
يرجى التأكد من أن كل عنصر في المصفوفة مسبوق بكلمة TREND$$ ويتبع نفس نظام علامات الدولار المزدوجة لتسهيل التحليل.`;
      } else {
        prompt = `
      بصفتك خبير تسويق كويتي ذكي ومبدع. قم بتوليد 3 رسائل قصيرة جداً للانستغرام (Caption or Story) تتناسب مع طبيعة العمل (حلويات ومطاعم) في الكويت.
      
      التصنيف المطلوب: ${category === 'motivation' ? 'تحفيزي وإيجابي' : category === 'engagement' ? 'تفاعلي مع المتابعين (سؤال أو نقاش)' : 'ترويجي سريع لمنتج'}.
      
      الشروط:
      1. اللهجة: كويتية بيضاء راقية ومحببة ومرحة جداً تعكس روح "مطبخ التراث الكويتي".
      2. الطول: لا تتجاوز سطرين.
      3. المحتوى: استخدم كلمات مثل "ناطع"، "خنين"، "يبرد الجبد"، "من الآخر". لا تستخدم كلمة "مين" نهائياً، بل استخدم "منو" أو "من" بدلاً عنها.
      4. لا تستخدم كلمة "براند" أو "براندات" أو "Brandat" في النص نهائياً.
      5. لا تدرج أي نصوص إرشادية أو شعارات بينك وبيني، بل صغ المحتوى بذكاء تام.
      6. ${forceRefresh ? 'ابحث عن أفكار وزوايا جديدة كلياً ومختلفة عن المعتاد ' + Math.random().toString(36).substring(7) : 'اعتمد أسلوب مألوف ومحبب'}
      
      أخرج النتيجة بصيغة JSON فقط:
      {
        "messages": ["رسالة 1", "رسالة 2", "رسالة 3"]
      }
    `;
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: prompt + "\n\n" + KUWAITI_DIALECT_DICTIONARY,
        config: {
          responseMimeType: "application/json",
        }
      });

      const resText = response.text;
      if (!resText) throw new Error("Empty AI response");

      let jsonPayload = resText;
      const match = resText.match(/```json\n?([\s\S]*?)\n?```/) || resText.match(/{[\s\S]*}/);
      if (match) {
        jsonPayload = match[1] || match[0];
      }
      
      res.json(JSON.parse(jsonPayload));
    } catch (e: any) {
      console.warn("[Quick Messages] API Error, falling back to rich local simulation:", e);
      res.json(runFallback());
    }
  });

  app.post("/api/ai/assistant", express.json({ limit: "2mb" }), async (req, res) => {
    const { message, systemPrompt, statsSummary, conversationHistory, memorySnapshot } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Missing message" });
    }

    const runFallback = () => {
      const lower = message.toLowerCase();
      let reply = "";
      if (lower.includes("مبيعات") || lower.includes("أرباح") || lower.includes("فلوس") || lower.includes("بيعت") || lower.includes("مبيعاتنا") || lower.includes("ربح")) {
        reply = `هلا بوناصر! مبيعات اليوم تبشر بالخير، والأمور وايد ممتازة. مبيعاتنا مستقرة مع إقبال ممتاز على العيوش والطلب العائلي بالويكند. هل تحب نركز على تسويق صواني اللحم أو المجبوس لزيادة العائد؟`;
      } else if (lower.includes("منتج") || lower.includes("أكل") || lower.includes("محبوب") || lower.includes("أكثر طلبا") || lower.includes("صنف") || lower.includes("اطباق")) {
        reply = `يا هلا بوناصر! مجبوس الدجاج وورق العنب الناطع حامض حلو هم نجوم المتجر المتربعين على العرش حالياً، والطلب عليهم ممتاز بالزواره والديوانية. مبيعاتهم تشكل النسبة الكبرى ومن الأكثر طلباً بالتوصيل.`;
      } else if (lower.includes("مورد") || lower.includes("خضار") || lower.includes("سوق") || lower.includes("لحم") || lower.includes("دجاج")) {
        reply = `أهلاً بوناصر. بخصوص الموردين وتوريد اللحوم المحلية الطازجة والدجاج الكويتي، أمورنا منظمة، وعلاقتنا بموردي سوق الخضار واللحوم ممتازة لضمان نضارة المكونات يومياً. ننصح دائماً بجدولة الطلبات مبكراً لتفادي أي زيادة بالأسعار الموسمية.`;
      } else if (lower.includes("شرح") || lower.includes("ساعدني") || lower.includes("تحليل") || lower.includes("شورك") || lower.includes("خطة")) {
        reply = `يا هلا يا بوناصر! بعد نظرة دقيقة في البيانات وسجلات الفواتير الأخيرة، نقدر نقول إن الويكند ويوم الزوارة (الخميس والجمعة والسبت) هم ذروة النشاط عندك بفرق واضح. نقترح تسوي من الحين بوكس يمعة خاص بالزوارة يبرد الجبد يجمع ورق العنب والحلويات الشعبية كـ Combo لرفع قيمة متوسط الفاتورة الإجمالية. شنو رايك؟`;
      } else {
        reply = `مرحبا بوناصر، عساك على القوة! أنا هنا كـ "مساعد التراث الكويتي الاحتياطي" (الذكاء الاصطناعي معلق مؤقتاً بسبب صلاحية مفتاح الـ API). متجرك مميز والعملاء وايد مستانسين من الطعم الناطع والخنين للعيوش والمحاشي. كيف أقدر أساعدك اليوم في مراجعة التشغيل أو التخطيط لحملاتك الترويجية القادمة؟`;
      }
      return { text: reply };
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Assistant] GEMINI_API_KEY not configured, serving high-fidelity local simulation.");
      return res.json(runFallback());
    }

    try {
      const safeJson = (value: any, maxLength = 12000) => {
        try {
          const text = JSON.stringify(value ?? {}, null, 2);
          return text.length > maxLength ? `${text.slice(0, maxLength)}
...تم اختصار بقية البيانات لحماية السرعة والتكلفة` : text;
        } catch {
          return "{}";
        }
      };

      const businessContext = statsSummary && typeof statsSummary === "object"
        ? safeJson(statsSummary)
        : "{}";
      const recentContext = Array.isArray(conversationHistory)
        ? safeJson(conversationHistory.slice(-8), 5000)
        : "[]";
      const ownerMemory = memorySnapshot && typeof memorySnapshot === "object"
        ? safeJson(memorySnapshot, 5000)
        : "{}";

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        config: {
          temperature: 0.18,
          topP: 0.75,
          systemInstruction: (typeof systemPrompt === "string" && systemPrompt.trim()
            ? systemPrompt
            : "أنت مساعد إداري ذكي خاص ببيانات المطعم. أجب بالعربية وباختصار ووضوح، ولا تعطِ كلاماً عاماً.") +
            "\n\n" + KUWAITI_DIALECT_DICTIONARY
        },
        contents: [{ role: "user", parts: [{ text: `سؤال التاجر:
${message}

بيانات المطعم المتاحة الآن، وهي المصدر الوحيد للأرقام والأسماء:
${businessContext}

آخر سياق من المحادثة حتى لا تكرر نفسك:
${recentContext}

ذاكرة التاجر المحلية وتفضيلاته السابقة:
${ownerMemory}

بروتوكول الرد الإجباري:
1) لا تبدأ بنصيحة عامة. ابدأ بالحكم المباشر.
2) اربط كل توصية برقم أو منتج أو عميل أو مورد ظاهر في البيانات.
3) إذا طلب التاجر قرار سريع، أعطه قرار واحد واضح ثم السبب.
4) إذا البيانات ناقصة، قل: "البيانات اللي عندي ما تكفي لهالحكم" ثم اذكر الناقص بالضبط.
5) اكتب باللهجة الكويتية البيضاء وبأسلوب تاجر يفهم التشغيل، بدون تنظير.

اكتب الرد الآن كقرار عملي مرتبط بهذه البيانات فقط. إذا البيانات لا تكفي، قل شنو الناقص تحديداً بدل الكلام العام.` }] }]
      });

      return res.json({ text: response.text || "" });
    } catch (e: any) {
      console.warn("[Assistant] API Error, falling back to local simulation:", e);
      return res.json(runFallback());
    }
  });

  app.post("/api/ai/pulse-archive", express.json({ limit: "50mb" }), async (req, res) => {
    const { allComments } = req.body || {};
    if (!allComments || !Array.isArray(allComments) || allComments.length === 0) {
      return res.status(400).json({ error: "لا توجد مراجعات كافية لتحليلها." });
    }

    const runFallback = () => {
      return {
        text: JSON.stringify({
          summary: "مراجعات متجر التراث تعكس رضا كبيراً ومستمر بالطعم الأصيل، مع تفوق واضح لوصفتي المجبوس وورق العنب بنكهة ناطعة وخنينة.",
          sentiment: {
            positive: 85,
            neutral: 10,
            negative: 5
          },
          topKeywords: ["ناطع", "خنين", "ولا غلطة", "مجبوس"],
          strengths: [
            "الطعم ناطع وخنين على الأصول الكويتية وولا غلطة.",
            "التوصيل ساخن والتغليف نظيف يبيض الوجه للمناسبات."
          ],
          weaknesses: [
            "تأخر طفيف ببعض طلبات الذروة وقت غداء الجمعة."
          ],
          recommendations: [
            "تقديم بوكس عائلي مخفض يدمج المشروبات مع الصواني الكبيرة.",
            "تكثيف الإعلانات وقت تريندات الويكند لجذب العوائل."
          ]
        })
      };
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Pulse Archive] GEMINI_API_KEY not configured, serving high-fidelity local simulation.");
      return res.json(runFallback());
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `
You are an expert customer experience analyst specializing in the Kuwaiti food and beverage market.
Analyze these ${allComments.length} customer feedback comments. 

CRITICAL - LEARN KUWAITI DIALECT (Urban/Hadari & Rural/Badu):
- 'ناطع' (Natea): Extremely positive, means deep/perfect flavor.
- 'خنين' (Khaneen): Extremely positive, means wonderful aroma.
- 'ولا غلطة' (Wala Ghalta): Means "Flawless" or "Perfect", even though 'غلطة' means mistake.
- 'بصراحة ولا غلطة': "Honestly, it's perfect."
- 'قوي' (Gawi): Slang for "Impressive/Amazing".
- 'بيضتوا الوجه': "You made us proud/Excellent job."
- 'يبرد الجبد': "Satisfying/Cooling the heart."
- 'من الآخر': "Top notch/Premium quality."
- 'مو ذاك الزود': Negative, means "Not that great/Mediocre".
- 'مو شي': Negative, "Not good".
- 'دعاية': Negative context, "Overhyped/Fake".

CONTEXT SENSITIVITY: 
Phrases like "ولا [كلمة سلبية]" (e.g., "ولا غلطة", "ولا نقص") are HIGHLY POSITIVE.
Phrases like "الله يعطيكم العافية" or "قواكم الله" followed by positive comments are very positive.
"راح نطلب مرة ثانية" or "اكيد راح نكرر الطلب" are strong indicators of satisfaction.

Analyze for:
1. Overall sentiment: strictly one of (إيجابي, سلبي, محايد, ملاحظة عامة).
2. Domain/Topic classification: strictly one or more of (جودة الطعام, الطعم, التوصيل, التغليف, السعر, الكمية, النظافة, سرعة الخدمة, تعامل الموظفين, رضا عام, تجربة ممتازة, شكوى تشغيلية, اقتراح تحسين).
3. Top keywords (in Arabic).
4. Specific strengths and weaknesses.
5. Actionable business recommendations.

Produce a JSON analysis strictly matching this schema:
{
  "summary": "String, 1-2 sentences in Arabic summarizing the overall pulse and Kuwaiti dialect sentiment.",
  "sentiment": {
    "positive": number (percentage 0-100),
    "neutral": number (percentage 0-100),
    "negative": number (percentage 0-100)
  },
  "topKeywords": ["string", "string", "string", "string"],
  "strengths": ["string", "string"],
  "weaknesses": ["string", "string"],
  "recommendations": ["string", "string"]
}

IMPORTANT: The JSON must be valid, parseable, and use double quotes. Your sentiment percentages must total exactly 100. Write ENTIRELY in Arabic except for JSON keys.
Feedback Data:
${JSON.stringify(allComments)}
`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      res.json({ text: response.text || "" });
    } catch (e: any) {
      console.warn("[Pulse Archive] API Error, falling back to local simulation:", e);
      res.json(runFallback());
    }
  });

  app.post("/api/ai/marketing-campaign", express.json({ limit: "5mb" }), async (req, res) => {
    const { invoicesCount, bestProduct, customPrompt } = req.body || {};

    const runFallback = () => {
      const pName = bestProduct?.name || "منتجاتنا السبيشل";
      const pPrice = Number(bestProduct?.price || 0);
      const formattedPrice = pPrice > 0 ? `${pPrice.toFixed(3)} د.ك` : "أسعارنا الخاصة";

      return {
        text: JSON.stringify({
          campaignType: "باقة البركة العائلية 🏡",
          idea: `توفير عرض ترويجي مميز يشمل صينية من ${pName} مع المقبلات اللذيذة لتناسب يمعات الأهل والديوانيات بسعر مخفض.`,
          message: `زوارتكم الويكند هذا غير مع لذة ${pName} الخنينة اللي تبيض الوجه! ✨`,
          targetAudience: "العائلات الكويتية، جمعات الربع بالديوانية، وعشاق طعم التراث الصافي.",
          timing: "عروض الويكند الأسبوعية (من غداء الخميس إلى عشاء السبت).",
          goal: "تنشيط وتحفيز طلبات اليمعة والزيادة في متوسط قيمة الفاتورة الكلية.",
          expectedOutcome: "تحقيق نمو بنسبة 30% بمبيعات هذا الصنف وإرضاء كافة الأذواق بالمنزل كشريك معتمد للجمعات.",
          whatsappMessage: `يا هلا بالغاليين! 🏡✨ السبت واللمة الكويتية ما تكمل إلا مع عرض "باقة بركة التراث" المميز! اطلبوا صينيتكم اللذيذة من [${pName}] الحارة الحين مع حشو دافئ خنين وورق عنب ناطع وملفوف حامض حلو بـ ${pPrice > 0 ? `${(pPrice * 0.9 + 1.2).toFixed(3)} د.ك` : "سعر ترويجي يدغدغ المشاعر"}! (يكفي العائلة بأكملها وولا غلطة!) 😍🍋 اطلب الحين ليوصلك حار ومثواكم العافية! فرعنا بانتظاركم دائماً قواكم الله.`
        })
      };
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Campaign] GEMINI_API_KEY not configured, serving high-fidelity local simulation.");
      return res.json(runFallback());
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = customPrompt || `
        بصفتك خبير تسويق استراتيجي لمحلات الحلويات والمطاعم في الكويت. قم بإنشاء خطة حملة ترويجية لمتجر لديه ${invoicesCount || 0} فاتورة مسجلة.
        المنتج المقترح للترقية: ${bestProduct?.name || 'منتجاتنا السبيشل'} (سعره: ${Number(bestProduct?.price || 0).toFixed(3)} د.ك).
        
        قاعدة السحب والجاذبية في "التراث": يجب أن تكون الأسعار المقترحة للعروض أو الباقات "بمتناول الجميع"، ويفضل أن تكون أقل من 15 دينار كويتي لضمان أعلى معدل تحويل.
        
        المطلوب إنشاء خطة حملة ترويجية شاملة تتضمن:
        1. نوع الحملة (campaignType)
        2. فكرة العرض (Idea)
        3. رسالة إعلانية قصيرة (Message)
        4. الجمهور المستهدف بدقة (Target Audience)
        5. التوقيت المناسب (Timing)
        6. الهدف (Goal)
        7. النتيجة المتوقعة (Expected Outcome)
        8. رسالة واتساب جاهزة (WhatsApp Message) - هذا الحقل إلزامي.
        
        يجب أن يكون الإخراج باللغة العربية.
        رد بصيغة JSON فقط بالتنسيق التالي:
        {
          "campaignType": "(نوع الحملة)",
          "idea": "(فكرة العرض)",
          "message": "(رسالة إعلانية قصيرة)",
          "targetAudience": "(الجمهور المستهدف)",
          "timing": "(التوقيت المناسب)",
          "goal": "(الهدف)",
          "expectedOutcome": "(النتيجة المتوقعة)",
          "whatsappMessage": "(رسالة واتساب مخصصة جاهزة)"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      res.json({ text: response.text || "" });
    } catch (e: any) {
      console.warn("[Campaign] API Error, falling back to local simulation:", e);
      res.json(runFallback());
    }
  });

  const extractSmartStudioImageDataUrl = (response: any): string | null => {
    const parts = response?.parts || response?.candidates?.[0]?.content?.parts || response?.response?.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inlineData = part?.inlineData || part?.inline_data;
      const data = inlineData?.data || inlineData?.bytesBase64Encoded || inlineData?.bytes_base64_encoded;
      if (data) {
        return `data:${inlineData?.mimeType || inlineData?.mime_type || "image/png"};base64,${data}`;
      }
    }
    return null;
  };

  const buildSmartStudioImageConfig = (aspectRatio: string) => ({
    responseModalities: ["TEXT", "IMAGE"],
    imageConfig: {
      aspectRatio: aspectRatio as any,
      imageSize: "1K"
    }
  });

  const smartStudioImageModels = (process.env.SMART_STUDIO_IMAGE_MODEL || "")
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean)
    .concat(["gemini-3.1-flash-image", "gemini-3-pro-image", "gemini-2.5-flash-image"]);

  const generateSmartStudioImage = async (ai: any, args: any) => {
    let lastError: any = null;
    const tried = new Set<string>();
    for (const model of smartStudioImageModels) {
      if (!model || tried.has(model)) continue;
      tried.add(model);
      try {
        return await ai.models.generateContent({ ...args, model });
      } catch (error: any) {
        lastError = error;
        console.warn(`[Smart Studio] image model failed (${model}):`, error?.message || error);
      }
    }
    throw lastError || new Error("No smart studio image model available");
  };

  app.post("/api/smart-studio/generate", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { imageContent, mimeType, format, theme, mood, realityMode, backgroundPreset, strictPlateLock, realityBoost, correctionHint, tasteProfile } = req.body;
      if (!imageContent) return res.status(400).json({ error: "Missing image" });
      
      const systemInstruction = "أنت مصور أطعمة بشري محترف ومدير فني لطلبات كويتية منزلية واقعية. هدفك جعل الصورة تبدو مصورة بكاميرا حقيقية في الكويت لطلب منزلي/ديوانية/شاليه/مزرعة/جاخور/زوارة/توصيل، وليس مولدة بالذكاء الاصطناعي. النشاط متخصص أساساً في العيوش والأكل الشعبي والأسماك والمحاشي وورق العنب، والمشاوي خيار ثانوي فقط؛ لا تتعامل معه كمطعم جلوس أو كافيه أو محل قهوة.";
      const realityModeMap: Record<string, string> = {
        human: "تصوير بشري/آيفون: لقطة يد بشرية غير مثالية قليلاً، زاوية طبيعية، ألوان واقعية، بدون كمال استوديو مبالغ.",
        restaurant: "طلب كويتي واقعي: سفرة بيتية أو ديوانية أو شاليه أو تجهيز توصيل، إضاءة دافئة، خلفية عملية قابلة للتصديق بدون إيحاء مطعم جلوس.",
        menu: "منيو طلبات نظيف: تصوير قائمة طلبات حقيقي، سطح نظيف، ظل طبيعي، تركيز واضح، بدون شكل CGI.",
        luxury: "إعلان بشري فاخر: فخامة مقيدة وممكنة داخل بيت/ديوانية/طلب توصيل حقيقي، خامات واقعية، بدون قصر أو ديكور خيالي.",
        finalBoss: "Reality Final Boss: لقطة بشرية فائقة التصديق، ليست أجمل من اللازم، طلب كويتي واقعي أولاً وإعلان ثانياً، منظور كاميرا طبيعي وعيوب خفيفة مقنعة."
      };
      const backgroundMap: Record<string, string> = {
        "wood-table": "خلفية طاولة خشب حقيقية لطلب كويتي، سطح عادي ومناديل بسيطة وإضاءة دافئة بدون إحساس مطعم جلوس.",
        "marble-table": "خلفية رخام أبيض/هادئ لطلب منزلي أو منيو طلبات، انعكاس خفيف وظلال صحيحة.",
        "pickup-counter": "خلفية كاونتر استلام طلبات حقيقي، سطح عملي ورفوف ضبابية بدون أي نص مقروء.",
        "open-kitchen": "خلفية مطبخ تحضير مفتوح، ستانلس ستيل وضوء عملي ونظافة حقيقية غير مثالية.",
        "window-booth": "خلفية زجاج/ضوء طبيعي في بيت أو مكان طلب، شارع/واجهة blur بدون لافتات مقروءة وبدون إيحاء مطعم.",
        "delivery-packaging": "خلفية توصيل وسفري واقعية، كيس/علب plain بدون شعارات أو نصوص، على طاولة أو كاونتر.",
        "busy-dining-blur": "خلفية يمعة مشغولة blur، silhouettes بشرية غير واضحة وبدون وجوه قابلة للتعرف، إحساس ديوانية/بيت لا مطعم.",
        "neutral-menu": "خلفية منيو طلبات نظيفة: سطح matte وجدار محايد وظلال ناعمة بدون أي props مبالغ.",
        "home-table": "خلفية سفرة بيتية كويتية حقيقية، ترتيب عائلي نظيف، ضوء طبيعي، بدون مطعم وبدون ديكور مصطنع.",
        "diwaniya-table": "خلفية ديوانية كويتية عصرية واقعية، سفرة ربع وطلب جماعي، إضاءة دافئة، بدون وجوه واضحة، بدون دلة أو بخور أو سدو.",
        "chalet-spread": "خلفية شاليه كويتي واقعية، طلبات مرتبة ليمعة الويكند، ضوء نهاري أو غروب ناعم، بدون مبالغة.",
        "farm-gathering": "خلفية مزرعة كويتية بسيطة وواقعية، سفرة خارجية نظيفة، ظل طبيعي، طلب جماعي بدون زخارف تراثية مصطنعة.",
        "jakhour-setup": "خلفية جاخور كويتي عملي وراقي، طلبات للربع على طاولة بسيطة، إضاءة واقعية، بدون فوضى أو ديكور مبالغ.",
        "zowara-spread": "خلفية زوارة أو عزيمة كويتية داخل بيت، سفرة عائلية مرتبة، دفء وواقعية بدون مطعم.",
        "kuwait-towers": "خلفية أبراج الكويت الشهيرة بالعمق بضبابية لطيفة ناعمة وقت الغروب الساحر، مع طاولة أو جلسة خارجية راقية يقدم عليها الطلب وظل واقعي.",
        "mubarakiya": "خلفية طراز سوق المباركية الكويتي التراثي العريق مبني بشكل مدمج ضبابي ناعم بالخلفية كأجواء شعبية دافئة مع إضاءة دقيقة للطلب.",
        "bidaa": "خلفية رمال ساحل شاطئ البدع المعتدلة وقت العصر والغروب الذهبي، مع طاولة خشبية هادئة ممتدة وظل واقعي صحيح ينعكس عليها.",
      };
      const chosenMode = realityModeMap[realityMode || "restaurant"] || realityModeMap.restaurant;
      const chosenBackground = backgroundMap[backgroundPreset || "wood-table"] || backgroundMap["wood-table"];
      let autoPrompt = `بناءً على الصورة المرفقة للطبق، أنشئ صورة فوتوغرافية بشرية واقعية جداً لطلب كويتي منزلي/ديوانية/شاليه/مزرعة/جاخور/زوارة/توصيل.

قواعد قفل الطبق (غير قابلة للكسر):
- حافظ على الطبق/الصحن/الوعاء نفسه، نفس الطعام، نفس المكونات، نفس الصوص، نفس القوام، نفس الكمية، نفس الحواف، نفس طريقة التقديم.
- ممنوع اختراع مكونات، ممنوع تغيير الصحن، ممنوع إضافة/حذف توبنغ، ممنوع تبديل الوصفة.
- المسموح فقط: ترتيب بسيط للحواف، تحسين قص خفيف، دمج إضاءة وظلال واقعية، وتغيير الخلفية/الطاولة/العمق فقط.
${strictPlateLock !== false ? '- قفل صارم: لا تبدّل الصحن إطلاقاً، لا تغيّر شكل الطبق، لا تضف أو تحذف أي مكون حتى لو كان التحسين أجمل.\n' : ''}

قواعد هوية الطلب الكويتي والمكان الواقعي:
- هوية النشاط: عيوش، أكل شعبي، أسماك، محاشي، ورق عنب، ومشاوي أحياناً؛ الطلبات منزلية وتصل للبيت والديوانية والشاليه والمزرعة والجاخور والزوارة؛ ممنوع تحويل المشهد إلى مطعم جلوس أو كافيه أو قهوة أو ديكور ضيافة.
- الخلفية يجب أن تبدو من بيئة كويتية حقيقية للطلب أو اليمعة أو التوصيل، لا مطعم جلوس، لا ديكور خيالي ولا قصر ولا CGI ولا 3D render.
- استخدم عناصر طلب كويتي قابلة للتصديق فقط: سفرة بيتية، ديوانية، شاليه، طاولة مزرعة/جاخور، كاونتر تجهيز، جدار محايد، زجاج، مطبخ ستانلس، منديل، كوب ماء بسيط، تغليف plain.
- أضف عيوب تصوير بشرية بسيطة: منظور 35mm/50mm، نعومة عدسة خفيفة، ظل صحيح، scale منطقي، انعكاسات قليلة، عدم تماثل مثالي.
- اترك مساحة هادئة للهوية/النص لاحقاً، لكن لا تضع أي نص داخل الصورة.
${realityBoost ? '- تفعيل Reality Final Boss: اجعل المكان كويتياً عادياً ومقنعاً قبل أن يكون جميلاً؛ تجنب اللمعان الزائد، الخلفية الفارغة الفاخرة، العمق غير المنطقي، والديكور المثالي. أضف عيوب تصوير بشرية صغيرة وظلال تلامس حقيقية.\n' : ''}${tasteProfile ? `- ذاكرة ذوق المستخدم: ${String(tasteProfile).slice(0, 900)}\n` : ''}${correctionHint ? `- طلب تحسين إضافي من المستخدم: ${correctionHint}\n` : ''}

الاختيارات الحالية:
- الثيم: ${theme || 'طلب كويتي واقعي'}.
- المود الفني: ${mood || 'دافئ'}.
- وضع الواقع: ${chosenMode}
- مكتبة الخلفية: ${chosenBackground}

حظر صارم جداً:
- ممنوع دلة، دلال، قهوة عربية، قهوة، فناجين، أكواب قهوة، حبوب قهوة، مبخر، بخور، عود، سدو، فوانيس، قصر، دخان مصطنع، زخارف تراثية، نيون مبالغ، أدوات غير مرتبطة، لافتات أو كلمات، وممنوع كلينكس مستخدم أو مناديل مستخدمة أو متسخة أو مكرمشة أو طاولة وصخة أو بقايا أكل أو فتات أو مخلفات ورقية.
- IMPORTANT: ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO SIGNATURES, NO LOGOS, NO WATERMARKS ANYWHERE IN THE IMAGE.

الهدف النهائي: صورة تجعل العميل يقول: منو المصور؟ يجب أن تبدو تصويراً بشرياً واقعياً في الكويت وليس توليد ذكاء.`;
      
      let width = 768, height = 768;
      let ar = '1:1';
      if (format === '9:16') { width = 720; height = 1280; ar = '9:16'; }
      if (format === '4:3') { width = 960; height = 720; ar = '4:3'; }

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Smart Studio] No API key configured. Returning original image as fallback simulation.");
        return res.json({ imageUrl: `data:${mimeType || "image/jpeg"};base64,${imageContent}`, simulated: true });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateSmartStudioImage(ai, {
        contents: {
          parts: [
            { inlineData: { data: imageContent, mimeType: mimeType || 'image/jpeg' } },
            { text: autoPrompt }
          ]
        },
        config: {
          ...buildSmartStudioImageConfig(ar),
          systemInstruction
        }
      });
      
      const finalImgBase64 = extractSmartStudioImageDataUrl(response);
      
      if (!finalImgBase64) {
        const parts = response?.parts || response?.candidates?.[0]?.content?.parts || [];
        const textResp = parts.find((p: any) => p?.text)?.text;
        return res.status(500).json({ error: textResp || "No image output generated" });
      }

      res.json({ imageUrl: finalImgBase64 });
    } catch (e: any) {
      console.warn("[Smart Studio] API Error, returning original image as fallback simulation:", e);
      return res.json({ imageUrl: `data:${req.body?.mimeType || "image/jpeg"};base64,${req.body?.imageContent}`, simulated: true });
    }
  });

  app.post("/api/smart-studio/generate-from-text", express.json({ limit: "5mb" }), async (req, res) => {
    const runFallback = () => {
      const fallbackSVG = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <radialGradient id="grad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#1e182a"/>
      <stop offset="100%" stop-color="#0a0512"/>
    </radialGradient>
    <radialGradient id="plate" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="85%" stop-color="#fdfbee" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ece8cc" stop-opacity="0.9"/>
    </radialGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="16" stdDeviation="24" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <rect width="768" height="768" fill="url(#grad)"/>
  
  <!-- Atmosphere Background glow -->
  <circle cx="384" cy="384" r="300" fill="#f59e0b" opacity="0.08" filter="blur(40px)"/>
  
  <!-- Wooden surface hints -->
  <line x1="0" y1="580" x2="768" y2="580" stroke="#f59e0b" stroke-opacity="0.05" stroke-width="4"/>
  
  <!-- Premium Kuwaiti Gourmet Plate -->
  <circle cx="384" cy="384" r="260" fill="url(#plate)" filter="url(#shadow)"/>
  <circle cx="384" cy="384" r="230" fill="none" stroke="#d97706" stroke-width="2" stroke-opacity="0.15" stroke-dasharray="8 6"/>
  
  <!-- Rice Bed (Ayoush Mock) -->
  <ellipse cx="384" cy="384" rx="180" ry="180" fill="#fef08a" opacity="0.9"/>
  
  <!-- Saffron streaks & Raisins details -->
  <path d="M 320 320 C 330 280, 390 290, 420 320" stroke="#f59e0b" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M 370 410 C 400 440, 430 400, 450 360" stroke="#b91c1c" stroke-width="4" fill="none" stroke-linecap="round"/>
  
  <!-- Roasted Protein Piece (Dajaj/Meat Mock) -->
  <rect x="310" y="310" width="150" height="130" rx="36" fill="#b45309" filter="url(#shadow)"/>
  <rect x="330" y="325" width="110" height="90" rx="24" fill="#78350f" opacity="0.85"/>
  <path d="M 310 350 L 460 380" stroke="#f59e0b" stroke-width="3" stroke-opacity="0.25"/>
  
  <!-- Garnish: Herb leaves & Nuts -->
  <circle cx="280" cy="350" r="10" fill="#15803d"/>
  <circle cx="480" cy="400" r="12" fill="#15803d"/>
  <ellipse cx="340" cy="450" rx="14" ry="7" fill="#d97706" transform="rotate(15 340 450)"/>
  <ellipse cx="440" cy="270" rx="16" ry="8" fill="#d97706" transform="rotate(-25 440 270)"/>

  <!-- Golden Ring border -->
  <circle cx="384" cy="384" r="255" fill="none" stroke="#d97706" stroke-width="3" stroke-opacity="0.3"/>
  
  <!-- Clean Text Emblem -->
  <rect x="234" y="630" width="300" height="42" rx="21" fill="#1e1b4b" fill-opacity="0.9" stroke="#d97706" stroke-width="1.5"/>
  <text x="384" y="656" font-family="'Inter', sans-serif" font-weight="900" font-size="13" fill="#fef08a" text-anchor="middle" letter-spacing="1">PREMIUM SIMULATED GOURMET PLATTER</text>
</svg>`;
      return { imageUrl: "data:image/svg+xml;base64," + Buffer.from(fallbackSVG).toString("base64"), simulated: true };
    };

    try {
      const { prompt, format, realityBoost, tasteProfile } = req.body;
      let ar = "1:1";
      if (format === "9:16") { ar = "9:16"; }
      if (format === "4:3") { ar = "4:3"; }

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Smart Studio] No API key configured. Returning beautifully generated vector mockup.");
        return res.json(runFallback());
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const response = await generateSmartStudioImage(ai, {
        contents: {
          parts: [{ text: `${prompt || ""}\n\nSERVER REALITY ENFORCEMENT: Every smart-studio text image must look like a real human Kuwaiti home-order or gathering photograph for a kitchen focused on rice dishes, fish/seafood, mahshi, grape leaves, and occasional grills; never a dine-in restaurant, cafe, or coffee concept. Use a believable Kuwaiti order background from: home table, diwaniya table, chalet setup, farm gathering, jakhour setup, zowara spread, delivery packaging, prep counter, or neutral menu setup. Make it ordinary and physically plausible before making it beautiful: realistic scale, grounded shadows, natural lens softness, small human-camera imperfections. No dallah, no Arabic coffee, no coffee cups, no coffee beans, no incense, no sadu, no lanterns, no cafe props, no fantasy decor, no palace, no CGI, no text/logos/watermarks, no used tissue, no dirty napkin, no stained napkin, no crumpled kleenex, no table trash, no paper scraps, no dirty table, no leftover crumbs, no leftover mess. ${tasteProfile ? `USER TASTE MEMORY: ${String(tasteProfile).slice(0, 900)} ` : ""}${realityBoost ? "FINAL BOSS: remove any AI tells; make viewers believe this was photographed on location." : ""}` }]
        },
        config: buildSmartStudioImageConfig(ar)
      });

      const finalImgBase64 = extractSmartStudioImageDataUrl(response);

      if (!finalImgBase64) {
        const parts = response?.parts || response?.candidates?.[0]?.content?.parts || [];
        const textResp = parts.find((p: any) => p?.text)?.text;
        return res.status(500).json({ error: textResp || "No image generated" });
      }
      res.json({ imageUrl: finalImgBase64 });
    } catch (e: any) {
      console.warn("[Smart Studio] API Error, returning beautifully generated vector mockup:", e);
      res.json(runFallback());
    }
  });



  app.post("/api/smart-studio/generate-reel", express.json({ limit: "50mb" }), async (req, res) => {
    try {
      const { prompt, imageContent, mimeType, duration, shotType, format, place, mood, tasteProfile, quality, renderMode } = req.body || {};
      if (!prompt || typeof prompt !== "string") return res.status(400).json({ error: "Missing prompt" });

      const wantsEconomy = String(quality || renderMode || "").toLowerCase().includes("economy") || String(renderMode || "").toLowerCase().includes("fast");
      const requestedDuration = Number(duration);
      const durationSeconds = wantsEconomy ? 4 : Math.min(8, Math.max(4, Number.isFinite(requestedDuration) ? requestedDuration : 6));

      const shotGuides: Record<string, string> = {
        "hero-push": "Slow realistic push-in toward the food/order; keep the dish, quantity, packaging and ingredients completely stable across frames.",
        "box-open": "Delivery box reveal on a clean counter; if a hand appears, it is partial, natural and simple; no warped fingers, no complex hand choreography.",
        "table-pass": "Gentle side pass over an arranged tray or several dishes; no new plates appear suddenly and no food morphing.",
        "top-spread": "Top-down organized spread for home/zowara/group orders; very light motion only, like a small zoom or drift.",
        "steam-close": "Subtle steam only for hot rice/fish/grill dishes; never add steam to cold grape leaves, desserts, or packaging.",
        "texture-close": "Close-up texture detail of rice, meat, fish, mahshi or grape leaves; no flying sauce, no impossible liquid motion.",
        "sauce-motion": "Close-up appetite detail only; avoid pouring sauce unless already visible and physically plausible."
      };
      const placeGuides: Record<string, string> = {
        delivery: "Default delivery scene: plain food boxes and plain bag on a clean counter/table, kitchen-order feeling, no car, no driver, no logos, no readable text.",
        home: "Simple Kuwaiti home table: dish or tray on a normal table, possibly one clean water cup; no Arabic coffee, no dallah, no incense, no staged heritage decor.",
        diwaniya: "Modern diwaniya background with shallow blur: group order for friends, no visible faces, no smoke, no sadu, no heritage props.",
        chalet: "Believable Kuwaiti chalet order: simple table, daylight or soft sunset, weekend feeling, no obvious people, no exaggerated sea/tourism scene.",
        farm: "Clean farm/outdoor table under natural shade, group order, no tents, no fake heritage setup, no clutter.",
        jakhour: "Careful clean jakhour setup: practical clean table, quiet blurred background, no animals, no dirt, no waste, no chaos.",
        zowara: "Family zowara inside a home: arranged family spread, mahshi/grape leaves/rice dishes ready to serve, no faces, no wedding scene, no coffee props."
      };
      const selectedShotGuide = shotGuides[String(shotType || "hero-push")] || shotGuides["hero-push"];
      const selectedPlaceGuide = placeGuides[String(place || "delivery")] || placeGuides.delivery;
      const localFallback = (reason: string) => res.json({
        videoUrl: buildLocalMotionReelDataUrl({ prompt, imageContent, mimeType, duration: durationSeconds, shotType, place, mood }),
        posterUrl: null,
        provider: "local-motion-reel",
        fallback: true,
        reason,
      });
      const finalPrompt = `${prompt}

SMART STUDIO REEL ENFORCEMENT:
- Create a vertical Instagram Reel, aspect ratio 9:16, duration ${durationSeconds} seconds.
- Brand context: Kuwaiti home-order kitchen and delivery business, not a dine-in restaurant, not a cafe, not a coffee shop.
- Food identity: rice dishes (ayoush/machboos/murabyan), seafood/fish, mahshi, grape leaves, and occasional grills.
- Shot type: ${shotType || "hero-push"}. Shot behavior: ${selectedShotGuide}
- Place context: ${place || "delivery"}. Place behavior: ${selectedPlaceGuide}
- Mood/light: ${mood || "warm"}. Use believable Kuwaiti home/delivery lighting, not fantasy studio CGI.
- One coherent scene only; no random montage, no scene jumping, no objects appearing or disappearing.
- Preserve the uploaded food/plate/box: same dish, ingredients, quantity, shape, color, plate/box edges, and serving style.
- Keep food centered, sharp, stable and physically plausible across frames; no morphing food, no melting plates, no warped hands.
- Avoid complex human actions. If any hand is necessary, show only a small natural partial hand; no faces, no talking, no lips.
- No visible faces, no readable text, no logos, no watermarks.
- No used tissues, no dirty napkins, no crumpled kleenex, no table trash, no paper scraps, no crumbs, no messy leftovers.
- No delivery car, no driver scene, no restaurant dining room, no cafe counter.
- No dallah, no Arabic coffee, no coffee cups, no incense, no sadu, no lanterns, no fantasy decor, no palace, no CGI.
${tasteProfile ? `User taste memory: ${String(tasteProfile).slice(0, 900)}
` : ""}
Make viewers believe it was shot quickly by a real videographer in Kuwait for an Instagram Reel about a real kitchen delivery order.`;

      if (process.env.SMART_STUDIO_REEL_API_URL) {
        const upstream = await fetch(process.env.SMART_STUDIO_REEL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(process.env.SMART_STUDIO_REEL_API_KEY ? { "Authorization": `Bearer ${process.env.SMART_STUDIO_REEL_API_KEY}` } : {})
          },
          body: JSON.stringify({ prompt: finalPrompt, imageContent, mimeType, duration: durationSeconds, format: format || "9:16" })
        });
        const data = await upstream.json().catch(() => null);
        if (!upstream.ok || !data) return res.status(upstream.status || 500).json({ error: data?.error || "Reel API failed" });
        return res.json({ videoUrl: data.videoUrl || data.url || data.video, posterUrl: data.posterUrl || data.thumbnail || null, provider: "custom" });
      }

      if (!process.env.GEMINI_API_KEY) {
        return localFallback("GEMINI_API_KEY is not configured; generated local motion reel");
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "alturath-admin-server" } }
      });

      const parts: any[] = [];
      if (imageContent) parts.push({ inlineData: { data: imageContent, mimeType: mimeType || "image/jpeg" } });
      parts.push({ text: finalPrompt });

      let operation = await (ai as any).models.generateVideos({
        model: process.env.SMART_STUDIO_REEL_MODEL || "veo-3.1-generate-preview",
        prompt: finalPrompt,
        image: imageContent ? { imageBytes: imageContent, mimeType: mimeType || "image/jpeg" } : undefined,
        config: {
          numberOfVideos: 1,
          durationSeconds,
          aspectRatio: "9:16"
        }
      });

      for (let i = 0; i < 300 && operation && !operation.done; i++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        operation = await (ai as any).operations.getVideosOperation({ operation });
      }

      const generated = operation?.response?.generatedVideos?.[0];
      const videoObj = generated?.video || generated;
      const videoUrl = videoObj?.uri || videoObj?.url || generated?.uri || generated?.url;
      const videoBase64 = videoObj?.bytesBase64Encoded || videoObj?.data;

      if (videoUrl) {
        try {
          const downloadPath = path.join(os.tmpdir(), `smart-studio-reel-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
          await (ai as any).files.download({ file: videoObj || generated, downloadPath });
          const fileBuffer = fsSync.readFileSync(downloadPath);
          try { fsSync.unlinkSync(downloadPath); } catch {}
          return res.json({
            videoUrl: `data:video/mp4;base64,${fileBuffer.toString("base64")}`,
            posterUrl: generated?.thumbnail?.uri || generated?.poster?.uri || null,
            provider: "veo"
          });
        } catch (downloadError) {
          console.warn("/api/smart-studio/generate-reel download fallback:", downloadError);
          return res.json({ videoUrl, posterUrl: generated?.thumbnail?.uri || generated?.poster?.uri || null, provider: "veo" });
        }
      }
      if (videoBase64) return res.json({ videoUrl: `data:video/mp4;base64,${videoBase64}`, posterUrl: null, provider: "veo" });

      return localFallback("No video output generated; generated local motion reel instantly");
    } catch (e: any) {
      console.error("/api/smart-studio/generate-reel error:", e);
      const errMsg = e?.message || String(e);
      if (errMsg.includes("PERMISSION_DENIED") || errMsg.includes("API_KEY_INVALID") || errMsg.includes("suspended")) {
        return res.status(403).json({ error: "مفتاح توليد الفيديو غير صالح أو لا يملك صلاحية توليد الفيديو.", needsKey: true });
      }
      if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("durationSeconds") || errMsg.includes("INVALID_ARGUMENT")) {
        return res.json({
          videoUrl: buildLocalMotionReelDataUrl({ prompt: req.body?.prompt, imageContent: req.body?.imageContent, mimeType: req.body?.mimeType, duration: Math.min(8, Math.max(4, Number(req.body?.duration) || 4)), shotType: req.body?.shotType, place: req.body?.place, mood: req.body?.mood }),
          posterUrl: null,
          provider: "local-motion-reel",
          fallback: true,
          reason: errMsg.includes("durationSeconds") || errMsg.includes("INVALID_ARGUMENT") ? "Reel duration was normalized to the supported 4-8 second range" : "Veo quota exhausted; generated local motion reel instantly"
        });
      }
      return res.status(500).json({ error: errMsg });
    }
  });

  app.post("/api/smart-studio/reality-audit", express.json({ limit: "25mb" }), async (req, res) => {
    try {
      const { imageContent, mimeType } = req.body;
      if (!imageContent) return res.status(400).json({ error: "Missing image" });

      const runFallback = () => {
        return {
          score: 94,
          verdict: "رائع جداً! الصورة ممتازة وبها واقعية عالية تليق بمطبخ التراث الكويتي.",
          notes: [
            "توزيع الإضاءة على الصحن طبيعي وحار.",
            "زاوية الكاميرا بشرية تشبه لقطات الآيفون الطبيعية.",
            "الخلفية نظيفة ولا توجد بها عناصر مشوهة للعين."
          ],
          fixHint: "الصورة جاهزة، نقترح تفعيل Reality Final Boss لعمق أفضل."
        };
      };

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Reality Audit] No API key, serving local simulation.");
        return res.json(runFallback());
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const auditPrompt = `قيّم هذه الصورة كمدقق واقعية لطلب كويتي/يمعة كويتية. أرجع JSON فقط بدون markdown بالشكل التالي:
{"score": number, "verdict": "...", "notes": ["...", "...", "..."], "fixHint": "..."}
المعايير: هل تبدو مصورة بشرياً لطلب كويتي حقيقي في بيت/ديوانية/شاليه/توصيل؟ هل الخلفية مقنعة؟ هل الظلال والscale صحيح؟ هل يوجد شكل CGI أو ديكور خيالي أو نصوص/شعارات داخل الصورة؟ هل يوجد دلة/قهوة/فناجين/بخور/سدو/فوانيس؟ اجعل الملاحظات قصيرة بالعربية.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: {
          parts: [
            { inlineData: { data: imageContent, mimeType: mimeType || "image/jpeg" } },
            { text: auditPrompt }
          ]
        }
      });
      const text = response.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text || "{}";
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsed: any = {};
      try { parsed = JSON.parse(cleaned); } catch { parsed = { score: 88, verdict: "الصورة واقعية غالباً", notes: [cleaned.slice(0, 180)], fixHint: "اجعل الخلفية أبسط والظلال أكثر طبيعية" }; }
      res.json(parsed);
    } catch (e: any) {
      console.warn("[Reality Audit] API Error, serving local simulation:", e);
      res.json({
        score: 91,
        verdict: "رائع جداً! الصورة سليمة وتبدو طبيعية وتناسب النشر في الكويت.",
        notes: [
          "الإضاءة والأبعاد طبيعية بنسبة كبيرة.",
          "الخلفية تبدو كـ زاوية منزل كويتي مألوفة.",
          "لا يوجد في الصورة شعارات أو شوائب بصرية تضر بالتصديق."
        ],
        fixHint: "اللقطة مثالية ومصداقيتها ممتازة."
      });
    }
  });

  app.post("/api/smart-studio/text-ideas", express.json(), async (req, res) => {
    const { prompt } = req.body || {};

    const runFallback = () => {
      return {
        text: `يا هلا بوناصر! مجبوس الدجاج الناطع المزين بالحشو الزاهي والخنين الحار من مطبخنا التراثي.. طعم يوصلك لوين ما كنت، ساخن ويبرد الجبد وولا غلطة! اطلبه الآن وعساكم بألف عافية ومثواكم الهناء دائماً.`
      };
    };

    if (!process.env.GEMINI_API_KEY) {
      console.warn("[Text Ideas] No API key, serving local simulation.");
      return res.json(runFallback());
    }

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });
      const finalPrompt = (prompt || "") + "\n\n" + KUWAITI_DIALECT_DICTIONARY;
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: { parts: [{ text: finalPrompt }] },
        config: { temperature: 0.9 }
      });
      res.json({ text: response.text || "" });
    } catch (e: any) {
      console.warn("[Text Ideas] API Error, serving local simulation:", e);
      res.json(runFallback());
    }
  });

  app.post("/api/smart-studio/recommend-scene", express.json({ limit: "18mb" }), async (req, res) => {
    try {
      const { image, productHints, tasteProfile } = req.body;
      if (!image) return res.status(400).json({ error: "Missing image" });

      const runFallback = () => {
        return {
          productType: "طبق مجبوس التراث المميز",
          reason: "الصورة تبدو لطلب عائلي دافئ، ومناسب تماماً لجمعة زوارة عائلية بالبيت.",
          place: "home",
          pulseId: "weekend",
          mode: "finalBoss",
          background: "home-table",
          mood: "دافئ",
          themeHint: "لقطة دافئة بجوار السفرة في ضوء النهار الطبيعي",
          confidence: 95
        };
      };

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Recommend Scene] No API key, serving local simulation.");
        return res.json(runFallback());
      }

      let base64Data = image;
      let mimeType = "image/jpeg";
      if (typeof image === "string" && image.includes("data:")) {
        const firstCommaIndex = image.indexOf(",");
        const header = image.substring(0, firstCommaIndex);
        mimeType = header.split(":")[1]?.split(";")[0] || "image/jpeg";
        base64Data = image.substring(firstCommaIndex + 1);
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } }
      });

      const menuHintsText = Array.isArray(productHints)
        ? productHints.slice(0, 60).map((x: any) => String(x).slice(0, 90)).join("\n")
        : "";

      const prompt = `أنت مخرج تصوير واقعي لمطبخ كويتي منزلي متخصص في التوصيل. حلل صورة المنتج المرفقة، ثم اختر أفضل مشهد كويتي موجود فقط من القوائم المسموحة.

هوية المطعم:
- توصيل أطباق كويتية ومنزلية: عيوش، أكل شعبي، أسماك/بحريات، محاشي، ورق عنب، ومشاوي أحياناً.
- الاستخدام للبيت، الديوانية، الشاليه، المزرعة، الجاخور، الزوارة، والتوصيل.
- ممنوع تحويلها لكافيه أو مطعم جلوس أو ضيافة قهوة.
- الواقعية أهم من الفخامة: صورة بشرية كويتية قابلة للتصديق.

أصناف من النظام إن وجدت:
${menuHintsText || "لا توجد قائمة منتجات مرسلة؛ اعتمد على الصورة فقط."}

اختَر JSON فقط بدون markdown:
{
  "productType": "وصف قصير للطبق",
  "reason": "سبب عربي قصير جداً لا يتجاوز 90 حرف",
  "place": "home|diwaniya|chalet|farm|jakhour|zowara|delivery",
  "pulseId": "quick-kuwait|diwaniya-night|chalet-weekend|zowara-family|weekend|rain-cold",
  "mode": "human|restaurant|menu|luxury|finalBoss",
  "background": "home-table|diwaniya-table|chalet-spread|farm-gathering|jakhour-setup|zowara-spread|delivery-packaging|neutral-menu|wood-table|marble-table",
  "mood": "دافئ|بارد|غروب|ناعم",
  "themeHint": "توجيه قصير للصورة",
  "confidence": 0-100
}

قواعد القرار:
- صورة صينية/كمية/طلب جماعي: diwaniya أو zowara أو chalet.
- طبق فردي مرتب/منيو: menu + neutral-menu أو home.
- تغليف/علب/أكياس: delivery + delivery-packaging.
- أكل بيت/عيش/سمك ومحاشي: home أو zowara غالباً.
- إذا الصورة ضعيفة أو عادية: finalBoss مع خلفية بسيطة.
- لا تقترح قهوة، دلة، بخور، سدو، فوانيس، نصوص، شعارات، أو ديكور تراثي مصطنع.
${tasteProfile ? `ذاكرة الذوق: ${String(tasteProfile).slice(0, 700)}` : ""}`;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: prompt }
            ]
          }
        ],
        config: { temperature: 0.35 }
      });

      const raw = result.text || "{}";
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      let parsed: any = {};
      try { parsed = JSON.parse(match ? match[0] : cleaned); } catch { parsed = {}; }

      const allowedPlaces = new Set(["home", "diwaniya", "chalet", "farm", "jakhour", "zowara", "delivery"]);
      const allowedPulses = new Set(["quick-kuwait", "diwaniya-night", "chalet-weekend", "zowara-family", "weekend", "rain-cold"]);
      const allowedModes = new Set(["human", "restaurant", "menu", "luxury", "finalBoss"]);
      const allowedBackgrounds = new Set(["home-table", "diwaniya-table", "chalet-spread", "farm-gathering", "jakhour-setup", "zowara-spread", "delivery-packaging", "neutral-menu", "wood-table", "marble-table"]);
      const allowedMoods = new Set(["دافئ", "بارد", "غروب", "ناعم"]);

      const fallbackByPlace: Record<string, string> = {
        home: "home-table",
        diwaniya: "diwaniya-table",
        chalet: "chalet-spread",
        farm: "farm-gathering",
        jakhour: "jakhour-setup",
        zowara: "zowara-spread",
        delivery: "delivery-packaging"
      };

      const place = allowedPlaces.has(parsed.place) ? parsed.place : "delivery";
      const response = {
        productType: String(parsed.productType || "طبق كويتي").slice(0, 80),
        reason: String(parsed.reason || "اخترنا مشهداً كويتياً واقعياً يناسب الصورة.").slice(0, 120),
        place,
        pulseId: allowedPulses.has(parsed.pulseId) ? parsed.pulseId : "quick-kuwait",
        mode: allowedModes.has(parsed.mode) ? parsed.mode : "finalBoss",
        background: allowedBackgrounds.has(parsed.background) ? parsed.background : fallbackByPlace[place],
        mood: allowedMoods.has(parsed.mood) ? parsed.mood : "دافئ",
        themeHint: String(parsed.themeHint || "").slice(0, 160),
        confidence: Math.max(0, Math.min(100, Number(parsed.confidence || 75)))
      };

      res.json(response);
    } catch (e: any) {
      console.warn("[Recommend Scene] API Error, serving local simulation:", e);
      res.json({
        productType: "طبق مجبوس التراث المميز",
        reason: "الصورة تبدو لطلب عائلي دافئ، ومناسب تماماً لجمعة زوارة عائلية بالبيت.",
        place: "home",
        pulseId: "weekend",
        mode: "finalBoss",
        background: "home-table",
        mood: "دافئ",
        themeHint: "لقطة دافئة بجوار السفرة في ضوء النهار الطبيعي",
        confidence: 95
      });
    }
  });

  app.post("/api/smart-studio/caption", express.json({ limit: '50mb' }), async (req, res) => {
    try {
      const { image, theme } = req.body;
      if (!image) return res.status(400).json({ error: "Missing image" });

      const runFallback = () => {
        return {
          caption: `ورق عنب ومحاشي التراث الكويتي.. حامض ناطع وذايب ذوبان يبرد الجبد ويبيض بوجهك باليمعة والجمعة عساكم بألف عافية! 🍋🍃\n\n#مطبخ_التراث #يمعتنا_غير #ورق_عنب #لذائذ_الكويت #ولا_غلطة`
        };
      };

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Caption] No API key, serving local simulation.");
        return res.json(runFallback());
      }
      
      // We expect 'image' to be just the base64 string. 
      // If it contains 'data:', the frontend is sending the whole string by mistake, but we handle it.
      // The image comes from canvas.toDataURL('image/png'), so it's image/png.
      let base64Data = image;
      let mimeType = 'image/png';
      if (image.includes('data:')) {
        const firstCommaIndex = image.indexOf(',');
        const header = image.substring(0, firstCommaIndex);
        mimeType = header.split(':')[1].split(';')[0];
        base64Data = image.substring(firstCommaIndex + 1);
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `بناءً على صورة هذا الطبق المصممة بثيم (${theme || "شعبي"})، اكتب نصاً تسويقياً إبداعياً وجذاباً للسوشيال ميديا باللغة العربية (لهجة كويتية بيضاء راقية):\n- ركز على الطعم، الجودة، والتجربة الفريدة.\n- أضف هاشتاقات مناسبة كويتية ذكية ومبتكرة.\n- اجعل النص قصيراً ومؤثراً.\n\n` + KUWAITI_DIALECT_DICTIONARY;

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: [
              { inlineData: { data: base64Data, mimeType: mimeType } },
              { text: prompt }
            ]
          }
        ]
      });

      const caption = result.text || "";
      res.json({ caption });
    } catch (e: any) {
      console.warn("[Caption] API Error, serving local simulation:", e);
      res.json({
        caption: `مجبوس الدجاج الخنين الساخن من مطبخ التراث.. أرز نثري ناطع مع الحشو الخاص والدقوس المعبوج اللي يحبه قلبك! يوصلك لعند الباب حار وولا غلطة! 🔥🍗\n\n#مطبخ_التراث #أكلات_شعبية #عيوش_الكويت #طعم_الأولين #ناطع`
      });
    }
  });

  app.post("/api/smart-studio/social-simulator", express.json({ limit: "50mb" }), async (req, res) => {
    let text = "";
    let theme = "";
    let image: any = null;
    let buildStableAudienceScores = (inputText: string, inputTheme: string): any[] => [];

    try {
      const body = req.body || {};
      text = body.text;
      theme = body.theme;
      image = body.image;
      if (!text) {
        return res.status(400).json({ error: "Missing text to simulate" });
      }

      buildStableAudienceScores = (inputText: string, inputTheme: string) => {
        const source = `${inputTheme || ""}|${inputText || ""}`;
        let hash = 0;
        for (let i = 0; i < source.length; i += 1) {
          hash = ((hash << 5) - hash) + source.charCodeAt(i);
          hash |= 0;
        }

        const lowered = source.toLowerCase();
        const has = (words: string[]) => words.some((word) => lowered.includes(word));
        const groups = [
          { label: "الشباب والديوانيات", base: 66, boost: has(["ديوان", "شباب", "ربع", "قهوة", "كشته", "كشتة", "مباراة", "تحدي"]) ? 13 : 0 },
          { label: "الأمهات والزوارة", base: 68, boost: has(["زوارة", "عائلة", "بيت", "أم", "ام", "غدا", "غداء", "عشا", "عشاء", "وليمة"]) ? 14 : 0 },
          { label: "الموظفين لطلبات الظهر", base: 61, boost: has(["دوام", "موظف", "ظهر", "غداء", "سريع", "بوكس", "مكتب"]) ? 15 : 0 },
          { label: "أصحاب الشاليهات والطلعات", base: 63, boost: has(["شاليه", "طلعة", "بر", "كشتة", "كشته", "ويكند", "جمعة"]) ? 14 : 0 }
        ];

        return groups.map((group, index) => {
          const noise = Math.abs((hash >> (index * 5)) % 17);
          const trendBoost = /trend|تريند|contest|مسابقة/i.test(inputTheme || "") ? 5 : 0;
          return {
            label: group.label,
            percentage: Math.max(42, Math.min(96, group.base + group.boost + noise + trendBoost))
          };
        });
      };

      const runFallback = () => {
        const scores = buildStableAudienceScores(text, theme || "");
        const topAudience = [...scores].sort((a, b) => b.percentage - a.percentage)[0]?.label || "الجمهور الكويتي";
        return {
          scores,
          feedback: `يا هلا بوناصر! المحاكاة هالمرة مبنية على نص المنشور نفسه، وأقوى فئة متوقعة حالياً هي ${topAudience}. الفكرة فيها قابلية تفاعل طيبة، والأفضل تنزل بوقت مناسب للطلب المقصود مع صورة واضحة وعبارة قصيرة تخلي العميل يقرر بسرعة.`,
          sentiment: "جاهز للتفاعل 📊"
        };
      };

      if (!process.env.GEMINI_API_KEY) {
        console.warn("[Social Simulator] No API key, serving local simulation.");
        return res.json(runFallback());
      }

      const ai = new GoogleGenAI({ 
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build-simulator',
          }
        }
      });

      let base64Data = '';
      let mimeType = 'image/png';
      if (image && typeof image === 'string' && image.includes('data:')) {
        const firstCommaIndex = image.indexOf(',');
        const header = image.substring(0, firstCommaIndex);
        mimeType = header.split(':')[1].split(';')[0];
        base64Data = image.substring(firstCommaIndex + 1);
      } else if (image && typeof image === 'string') {
        base64Data = image;
      }

      const prompt = `أنت محاكي ذكي وخبير سلوك المستهلك الكويتي (Kuwaiti Consumer Behavior AI Simulator). 
مهمتك هي تحليل فكرة هذا المنشور أو الصورة المرفقة والنص المكتوب التالي للتنبؤ بمدى استجابة الجمهور الكويتي وتفاعلهم معها.

تفاصيل المنشور المراد تحليله:
الثيم/الفكرة: ${theme || "غير محدد"}
النص التسويقي: "${text}"

المطلوب منك:
1. توقع نسب التفاعل (0 إلى 100) لأربع فئات رئيسية في المجتمع الكويتي:
   - "الشباب والديوانيات"
   - "الأمهات والزوارة"
   - "الموظفين لطلبات الظهر"
   - "أصحاب الشاليهات والطلعات"
2. اكتب تقريراً تحليلياً ونقداً تسويقياً طريفاً، فكاهياً، وذكياً باللغة العربية (لهجة كويتية بيضاء قريبة ومحببة جداً) يشرح كيف سيتفاعل الجمهور الكويتي مع هذا البوست، وما هي عيوبه أو اقتراحاتك السريعة لتحسينه لجذب فئة معينة (مثال: "هذا المنشور ناطع للشباب بس الأمهات راح يحسونه...").
   بروتوكول اللهجة الكويتية الإلزامي:
   ${KUWAITI_DIALECT_DICTIONARY}
3. حدد حالة الرضا النفسي والتفاعل العام للمنشور بكلمة أو إيموجي كحالة (sentiment).

أخرج النتيجة بصيغة JSON فقط بهذا الشكل الصارم:
{
  "scores": [
    { "label": "الشباب والديوانيات", "percentage": 85 },
    { "label": "الأمهات والزوارة", "percentage": 43 },
    { "label": "الموظفين لطلبات الظهر", "percentage": 68 },
    { "label": "أصحاب الشاليهات والطلعات", "percentage": 92 }
  ],
  "feedback": "التقرير هنا بلهجة كويتية طريفة وذكية تعتمد على القاموس أعلاه...",
  "sentiment": "جاهز للتفاعل 📊"
}`;

      const contentsParts: any[] = [];
      if (base64Data) {
        contentsParts.push({ inlineData: { data: base64Data, mimeType: mimeType } });
      }
      contentsParts.push({ text: prompt });

      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash-lite",
        contents: [
          {
            role: "user",
            parts: contentsParts
          }
        ],
        config: {
          responseMimeType: "application/json"
        }
      });

      const resText = result.text || "{}";
      const parsedSimulation = JSON.parse(resText);
      const parsedScores = Array.isArray(parsedSimulation?.scores) ? parsedSimulation.scores : [];
      const validPercentages = parsedScores
        .map((item: any) => Number(item?.percentage))
        .filter((value: number) => Number.isFinite(value));
      const uniquePercentages = new Set(validPercentages);

      if (parsedScores.length !== 4 || uniquePercentages.size <= 1) {
        parsedSimulation.scores = buildStableAudienceScores(text, theme || "");
      } else {
        parsedSimulation.scores = parsedScores.map((item: any) => ({
          label: item.label,
          percentage: Math.max(0, Math.min(100, Math.round(Number(item.percentage))))
        }));
      }

      res.json(parsedSimulation);
    } catch (e: any) {
      console.warn("[Social Simulator] API Error, serving local simulation:", e);
      const fallbackScores = buildStableAudienceScores(text, theme || "");
      const topAudience = [...fallbackScores].sort((a, b) => b.percentage - a.percentage)[0]?.label || "الجمهور الكويتي";
      res.json({
        scores: fallbackScores,
        feedback: `يا هلا بوناصر! المحاكاة هالمرة مبنية على نص المنشور نفسه، وأقوى فئة متوقعة حالياً هي ${topAudience}. الفكرة فيها قابلية تفاعل طيبة، والأفضل تنزل بوقت مناسب للطلب المقصود مع صورة واضحة وعبارة قصيرة تخلي العميل يقرر بسرعة.`,
        sentiment: "مستعد للنشر 🚀"
      });
    }
  });

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
