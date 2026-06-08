/// <reference types="vite/client" />
import type { AppState } from '../types';

export type AILearningSurface =
  | 'command'
  | 'assistant'
  | 'marketing'
  | 'studio'
  | 'analytics'
  | 'supplier'
  | 'customer'
  | 'product'
  | 'forecast'
  | 'system';

type Dict<T> = Record<string, T>;

type TrainingInteraction = {
  id: string;
  surface: AILearningSurface | string;
  input: string;
  outcome?: string;
  hour: number;
  day: string;
  at: string;
  meta?: Dict<any>;
};

type TrainingCycle = {
  at: string;
  reason: string;
  hour: number;
  day: string;
  fingerprint: string;
  summary: string;
};

type AILearningProfile = {
  version: 1;
  createdAt: string;
  updatedAt: string;
  lastHourlyTrainingAt?: string;
  lastDailyTrainingAt?: string;
  surfaces: Dict<number>;
  intents: Dict<number>;
  entities: Dict<number>;
  hourly: Dict<number>;
  daily: Dict<number>;
  accepted: Dict<number>;
  rejected: Dict<number>;
  recent: TrainingInteraction[];
  cycles: TrainingCycle[];
  fingerprints: string[];
};

const PROFILE_KEY = 'alturath_global_ai_learning_profile_v1';
const MAX_RECENT = 90;
const MAX_CYCLES = 30;
const MAX_FINGERPRINTS = 18;

const nowIso = () => new Date().toISOString();
const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
const hourKey = (d = new Date()) => d.getHours();
const safeText = (value: any, limit = 220) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);

function isBrowserStorageReady() {
  return typeof window !== 'undefined' && !!window.localStorage;
}

function emptyProfile(): AILearningProfile {
  const now = nowIso();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    surfaces: {},
    intents: {},
    entities: {},
    hourly: {},
    daily: {},
    accepted: {},
    rejected: {},
    recent: [],
    cycles: [],
    fingerprints: [],
  };
}

function readProfile(): AILearningProfile {
  if (!isBrowserStorageReady()) return emptyProfile();
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return emptyProfile();
    const parsed = JSON.parse(raw);
    return {
      ...emptyProfile(),
      ...parsed,
      surfaces: parsed.surfaces || {},
      intents: parsed.intents || {},
      entities: parsed.entities || {},
      hourly: parsed.hourly || {},
      daily: parsed.daily || {},
      accepted: parsed.accepted || {},
      rejected: parsed.rejected || {},
      recent: Array.isArray(parsed.recent) ? parsed.recent.slice(-MAX_RECENT) : [],
      cycles: Array.isArray(parsed.cycles) ? parsed.cycles.slice(-MAX_CYCLES) : [],
      fingerprints: Array.isArray(parsed.fingerprints) ? parsed.fingerprints.slice(-MAX_FINGERPRINTS) : [],
    };
  } catch {
    return emptyProfile();
  }
}

function writeProfile(profile: AILearningProfile) {
  if (!isBrowserStorageReady()) return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify({ ...profile, updatedAt: nowIso() }));
  } catch {
    // Local learning is optional. It must never block the admin system.
  }
}

function bump(bucket: Dict<number>, key: any, amount = 1) {
  const safeKey = safeText(key, 60) || 'unknown';
  bucket[safeKey] = (Number(bucket[safeKey]) || 0) + amount;
}

function topKeys(bucket: Dict<number>, count = 4) {
  return Object.entries(bucket || {})
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, count)
    .map(([key]) => key);
}

function inferIntent(text: string): string {
  const t = safeText(text, 260).toLowerCase();
  if (/مورد|موردين|توريد|سداد/.test(t)) return 'supplier';
  if (/عميل|عملاء|زبون|زباين|vip/.test(t)) return 'customer';
  if (/منتج|منتجات|صنف|مخزون|ستوك|ناقص/.test(t)) return 'product';
  if (/فاتورة|فواتير|تحصيل|مدفوع/.test(t)) return 'invoice';
  if (/طلب|طلبات|اوردر|أوردر|توصيل/.test(t)) return 'order';
  if (/حملة|اعلان|إعلان|انست|تسويق|بوست|ريل/.test(t)) return 'marketing';
  if (/ربح|خسارة|مبيعات|تقرير|تحليل|هامش/.test(t)) return 'analytics';
  if (/صورة|استوديو|مشهد|تصميم|منتج بصوره/.test(t)) return 'studio';
  return 'general';
}

function extractEntities(text: string): string[] {
  const t = safeText(text, 260);
  const matches = t.match(/[\u0600-\u06FFa-zA-Z0-9]{3,}/g) || [];
  const stop = new Set(['هذا', 'هذه', 'شنو', 'شلون', 'ابي', 'أبي', 'اعطني', 'عطني', 'اخر', 'آخر', 'اليوم', 'الان', 'الآن', 'كم', 'على', 'من', 'في', 'مع']);
  return matches.filter((w) => !stop.has(w)).slice(0, 6);
}

function numberOf(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

export function buildAIDataFingerprint(data?: Partial<AppState> | any) {
  const invoices = Array.isArray(data?.invoices) ? data.invoices.filter((x: any) => !x?.isDeleted) : [];
  const paidInvoices = invoices.filter((x: any) => {
    const s = String(x?.paymentStatus || '').toLowerCase();
    return !s || s.includes('paid') || s.includes('success') || s.includes('مدفوع');
  });
  const products = Array.isArray(data?.products) ? data.products.filter((x: any) => !x?.isDeleted) : [];
  const customers = Array.isArray(data?.customers) ? data.customers.filter((x: any) => !x?.isDeleted) : [];
  const suppliers = Array.isArray(data?.suppliers) ? data.suppliers.filter((x: any) => !x?.isDeleted) : [];
  const orders = Array.isArray(data?.orders) ? data.orders.filter((x: any) => !x?.isDeleted) : [];
  const revenue = paidInvoices.reduce((sum: number, inv: any) => sum + numberOf(inv?.totalAmount ?? inv?.total ?? inv?.amount), 0);
  const lastInvoice = invoices[invoices.length - 1]?.id || '';
  const lowStock = products.filter((p: any) => numberOf(p?.stock ?? p?.quantity) <= numberOf(p?.minStock ?? 3)).length;
  return {
    fingerprint: [invoices.length, products.length, customers.length, suppliers.length, orders.length, Math.round(revenue * 1000), lowStock, lastInvoice].join('|'),
    summary: `فواتير ${invoices.length}، منتجات ${products.length}، عملاء ${customers.length}، موردين ${suppliers.length}، طلبات ${orders.length}، مبيعات مدفوعة ${revenue.toFixed(3)} د.ك، ناقص مخزون ${lowStock}`,
    counts: { invoices: invoices.length, products: products.length, customers: customers.length, suppliers: suppliers.length, orders: orders.length, lowStock },
  };
}

export function recordAITrainingSignal(
  surface: AILearningSurface | string,
  input: string,
  outcome: 'viewed' | 'clicked' | 'accepted' | 'rejected' | 'computed' | 'generated' | 'answered' | string = 'computed',
  meta: Dict<any> = {}
) {
  const profile = readProfile();
  const now = new Date();
  const day = dayKey(now);
  const hour = hourKey(now);
  const cleanInput = safeText(input, 260) || String(surface);
  const intent = safeText(meta.intent || inferIntent(cleanInput), 80);
  bump(profile.surfaces, surface);
  bump(profile.intents, intent);
  bump(profile.hourly, hour);
  bump(profile.daily, day);
  if (outcome === 'accepted' || outcome === 'clicked' || outcome === 'viewed') bump(profile.accepted, intent);
  if (outcome === 'rejected') bump(profile.rejected, intent);
  extractEntities(cleanInput).forEach((entity) => bump(profile.entities, entity));
  profile.recent = [
    ...profile.recent,
    { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, surface, input: cleanInput, outcome, hour, day, at: now.toISOString(), meta: { ...meta, intent } },
  ].slice(-MAX_RECENT);
  writeProfile(profile);
}

export function runAISelfTrainingCycle(data?: Partial<AppState> | any, reason = 'auto') {
  const profile = readProfile();
  const now = new Date();
  const day = dayKey(now);
  const hour = hourKey(now);
  const fp = buildAIDataFingerprint(data);
  const lastCycle = profile.cycles[profile.cycles.length - 1];
  const shouldRecord = !lastCycle || lastCycle.fingerprint !== fp.fingerprint || lastCycle.hour !== hour || lastCycle.day !== day || reason !== 'auto';
  if (!shouldRecord) return profile;
  const cycle: TrainingCycle = {
    at: now.toISOString(),
    reason,
    hour,
    day,
    fingerprint: fp.fingerprint,
    summary: fp.summary,
  };
  profile.cycles = [...profile.cycles, cycle].slice(-MAX_CYCLES);
  profile.fingerprints = [...profile.fingerprints.filter((x) => x !== fp.fingerprint), fp.fingerprint].slice(-MAX_FINGERPRINTS);
  profile.lastHourlyTrainingAt = now.toISOString();
  if (profile.lastDailyTrainingAt?.slice(0, 10) !== day) profile.lastDailyTrainingAt = now.toISOString();
  writeProfile(profile);
  return profile;
}

export function installAISelfTrainingScheduler() {
  if (!isBrowserStorageReady()) return;
  runAISelfTrainingCycle(undefined, 'boot');
  const flagKey = 'alturath_global_ai_scheduler_installed_v1';
  try {
    if ((window as any).__alturathAISchedulerInstalled) return;
    (window as any).__alturathAISchedulerInstalled = true;
    window.localStorage.setItem(flagKey, new Date().toISOString());
    window.setInterval(() => runAISelfTrainingCycle(undefined, 'hourly'), 60 * 60 * 1000);
    window.addEventListener('focus', () => runAISelfTrainingCycle(undefined, 'focus'));
  } catch {
    // ignore
  }
}

export function buildAITrainingContext(data?: Partial<AppState> | any, surface: AILearningSurface | string = 'system') {
  const profile = readProfile();
  const fp = buildAIDataFingerprint(data);
  const favoriteSurfaces = topKeys(profile.surfaces, 4).join('، ') || 'لا يوجد بعد';
  const favoriteIntents = topKeys(profile.intents, 5).join('، ') || 'لا يوجد بعد';
  const hotEntities = topKeys(profile.entities, 5).join('، ') || 'لا يوجد بعد';
  const lastCycle = profile.cycles[profile.cycles.length - 1];
  return {
    profile,
    summary: [
      `تعلم محلي نشط للسطح: ${surface}`,
      `آخر تدريب: ${lastCycle?.at || 'لم يسجل بعد'}`,
      `آخر بصمة بيانات: ${fp.summary}`,
      `أكثر نوايا متكررة: ${favoriteIntents}`,
      `أكثر مناطق استخدام: ${favoriteSurfaces}`,
      `كلمات وكيانات متكررة: ${hotEntities}`,
      `عدد دورات التدريب المحلية: ${profile.cycles.length}`,
      `عدد تفاعلات التعلم: ${profile.recent.length}`,
    ].join('\n'),
  };
}

export function rankWithLearning<T>(items: T[], getKey: (item: T) => string, surface: AILearningSurface | string = 'system'): T[] {
  const profile = readProfile();
  const surfaceWeight = Number(profile.surfaces[surface] || 0) * 0.001;
  return [...items].sort((a, b) => {
    const ak = safeText(getKey(a), 80);
    const bk = safeText(getKey(b), 80);
    const aw = Number(profile.accepted[ak] || 0) + Number(profile.intents[ak] || 0) + surfaceWeight;
    const bw = Number(profile.accepted[bk] || 0) + Number(profile.intents[bk] || 0) + surfaceWeight;
    return bw - aw;
  });
}

export function getAISelfTrainingStatus(data?: Partial<AppState> | any) {
  runAISelfTrainingCycle(data, 'status-check');
  const ctx = buildAITrainingContext(data, 'system');
  return ctx.summary;
}
