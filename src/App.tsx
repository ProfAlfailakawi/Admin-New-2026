import React, { useState, useEffect, useRef, useMemo, startTransition } from 'react';
import { buildLogicalShardWritePlan, commitLogicalShardWritePlan, readLogicalAppDataShard } from './lib/firestoreShardStorage';
import { 
  ArrowUp,
  BarChart3, 
  Home, 
  PlusCircle, 
  FileText, 
  Users, 
  Package, 
  Truck, 
  Wallet, 
  PieChart, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Bell, 
  Menu, 
  X,
  Sparkles,
  RefreshCw,
  Send,
  Plus,
  ChevronDown, 
  ChevronRight,
  Search,
  ArrowRight,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  DownloadCloud,
  Loader2,
  Database,
  Zap,
  Bot,
  MessageSquare as MsgSquare,
  ShieldAlert,
  Moon,
  Sun,
  ClipboardList as OrderIcon,
  XCircle,
  CheckCircle2,
  Volume2,
  VolumeX,
  ShoppingBag,
  Receipt,
  ClipboardCheck,
  AlertTriangle,
  CircleDollarSign,
  Boxes,
  HandCoins,
  BadgeCheck,
  Gauge,
  Clock,
  Command
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { heritageMotion } from './lib/heritageMotion';
import { cn, normalizeArabic, formatKuwaitiDateOnly } from './lib/utils';
const Dashboard = React.lazy(() => import('./components/Dashboard'));
const SystemPulseOrb = React.lazy(() => import('./components/SystemPulseOrb'));
import LogoEngine from './components/ui/LogoEngine';
import SmartIconGuide from './components/ui/SmartIconGuide';
const InvoicePage = React.lazy(() => import('./components/InvoicePage'));
const CustomerPage = React.lazy(() => import('./components/CustomerPage'));
const ProductPage = React.lazy(() => import('./components/ProductPage'));
const SupplierPage = React.lazy(() => import('./components/SupplierPage'));
const ExpensePage = React.lazy(() => import('./components/ExpensePage'));
const ReportsPage = React.lazy(() => import('./components/ReportsPage'));
const OrderPage = React.lazy(() => import('./components/OrderPage'));
import { isPendingStatus, isFailedStatus, isPaidStatus } from './lib/status-utils';
const TrackPage = React.lazy(() => import('./components/TrackPage'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
const SmartContentStudio = React.lazy(() => import('./components/SmartContentStudio').then(m => ({ default: m.SmartContentStudio })));
const DiwaniyaTournaments = React.lazy(() => import('./components/DiwaniyaTournaments').then(m => ({ default: m.DiwaniyaTournaments })));
const PartnerDashboard = React.lazy(() => import('./components/PartnerDashboard'));
const CommandBrief = React.lazy(() => import('./components/CommandBrief').then(m => ({ default: m.CommandBrief })));
import Login from './components/Login';
const GeneralSettings = React.lazy(() => import('./components/GeneralSettings'));
const SupplierAudit = React.lazy(() => import('./components/SupplierAudit'));
const LoyaltyProgramPage = React.lazy(() => import('./components/LoyaltyProgramPage').then(m => ({ default: m.LoyaltyProgramPage })));
const PromoCodePage = React.lazy(() => import('./components/PromoCodePage').then(m => ({ default: m.PromoCodePage })));
const WhatIfSimulator = React.lazy(() => import('./components/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));
const RealProfitGuard = React.lazy(() => import('./components/RealProfitGuard'));
const WhatsAppSupportInbox = React.lazy(() => import('./components/WhatsAppSupportInbox'));

class PageErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error("Page Rendering Error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm my-8 gap-4" dir="rtl">
          <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xl">!</div>
          <h2 className="text-xl font-black text-slate-800">حدث خطأ أثنا تحميل هذه الصفحة</h2>
          <p className="text-sm font-bold text-slate-500 max-w-md">يرجى الضغط على الزر أدناه لإعادة تحميل البيانات وتنشيط الصفحة بشكل صحيح.</p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-6 py-3 bg-indigo-600 text-white font-black text-sm rounded-2xl hover:bg-indigo-700 transition-all shadow-md"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const CommandBar = React.lazy(() => import('./components/CommandBar'));
const ProactiveAlerts = React.lazy(() => import('./components/ProactiveAlerts'));
const InstallPrompt = React.lazy(() => import('./components/InstallPrompt'));
const InstagramMagicWand = React.lazy(() => import('./components/InstagramMagicWand').then(m => ({ default: m.InstagramMagicWand })));
import { recalculateStateBalances } from './lib/business-logic';
import { INITIAL_DATA, GET_DEMO_DATA, DEFAULT_SQUADS } from './data';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from './constants';
import { AppState } from './types';
import { playSuccessAction } from './lib/sonic';
import { auth, db, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, setDoc, updateDoc, getDoc, getDocs, getDocFromServer, query, collection, where, doc, limit, orderBy, deleteDoc } from 'firebase/firestore';
import { getSmartDoc } from './firebase';
import { Toaster, toast } from 'sonner';
import { playNewOrderAlert } from './lib/sounds';
import { splitProductsForDatabase, joinProductsFromDatabase } from './lib/utils';
import { refreshPushRegistrationIfAlreadyAllowed } from './lib/pushNotifications';
import { hasMeaningfulData, safeMergeData } from './lib/dataGuard';
import { useLiveFaviconStatus } from './lib/faviconStatus';
import { restoreBootInlineAssets } from './lib/bootAssetTransport';

// ── Cloud-only data policy ───────────────────────────────────────────────────
// The browser never stores or restores an operational copy of company data.
// This function remains as a compatibility no-op for older call sites; Firestore
// is the only source of truth and the UI is blocked whenever cloud health is lost.
const saveCloudSnapshotMirror = (_snapshotStr: string | null | undefined) => {};

// ── Cloud boot pre-warm ────────────────────────────────────────────────────────
// Cloud Run scales to zero, so the first request after idle pays a 3-10s cold-start
// penalty. Without protection, that cost lands on the user right when they finish
// Google sign-in — and a hanging fetch (no timeout) forces them to retry manually.
//
// This helper fires /api/appdata/full?profile=boot the moment the app shell loads,
// so by the time auth completes, the boot payload is already in memory.
//
// COLD-START STRATEGY (root cause of the "2s sometimes, 2min sometimes" symptom):
// Cloud Run scales the Admin server to zero when idle. The next request pays a cold
// start (container boot + Firebase Admin init + Firestore boot-cache read) that can
// take 10–40s. A single short timeout GUARANTEES failure during that window — it
// aborts the very request that is warming the instance and dumps the user into the
// slow, unbounded browser-Firestore fallback (the 2-minute hang).
//
// Instead we stay on the fast server path and RETRY it with an escalating, bounded
// budget. Because the boot endpoint serves from an in-memory cache once warm, the
// second or third attempt after a cold start returns in milliseconds. Net effect:
// the worst case collapses from "minutes on the browser fallback" to "~10–20s on a
// warming server", and the common warm case is unchanged (resolves on attempt #1).
const BOOT_PREWARM_TTL_MS = 30_000;
const ADMIN_RESET_EXPECTED_GENERATION_KEY =
  'ktk_expected_admin_reset_generation_id';

// Older root snapshots can contain the generation marker as a JSON-encoded string
// (for example: "\"admin-data-reset-...\""). Treat that transport artifact as
// the same generation instead of rejecting the fast boot payload and falling back
// to the much slower browser Firestore fan-out.
const normalizeAdminDataGenerationId = (value: unknown): string => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('"') && raw.endsWith('"')) {
    try {
      const decoded = JSON.parse(raw);
      if (
        typeof decoded === 'string' &&
        /^admin-data(?:-reset)?-/i.test(decoded)
      ) {
        return decoded;
      }
    } catch {}
  }
  return raw;
};
// First attempt is short: a warm instance answers in <1s, so we don't want to wait
// long before deciding a cold start is underway. Retry attempts are patient: once
// the instance is booting, we must give its boot-cache read room to finish.
const BOOT_FIRST_ATTEMPT_TIMEOUT_MS = 7_000;
const BOOT_RETRY_ATTEMPT_TIMEOUT_MS = 12_000;
const BOOT_PREWARM_MAX_ATTEMPTS = 6;
const BOOT_PREWARM_TOTAL_BUDGET_MS = 60_000;
const BOOT_PREWARM_BACKOFF_MS = 600;
let __bootPrewarmPromise: Promise<any> | null = null;
let __bootPrewarmFiredAt = 0;

async function fetchBootPayloadOnce(timeoutMs: number): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/appdata/full?profile=boot', {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Retries the boot endpoint through a cold start instead of giving up after one short
// timeout. Aborting an attempt does NOT cancel the server's boot-cache work (it is not
// tied to the request), so a fresh attempt simply rides the now-in-flight warm-up —
// no wasted work, no restart. Resolves the moment any attempt returns a payload.
async function fetchBootPayloadResilient(): Promise<any> {
  const deadline = Date.now() + BOOT_PREWARM_TOTAL_BUDGET_MS;
  let lastErr: any = null;
  for (let attempt = 0; attempt < BOOT_PREWARM_MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    const base = attempt === 0 ? BOOT_FIRST_ATTEMPT_TIMEOUT_MS : BOOT_RETRY_ATTEMPT_TIMEOUT_MS;
    const timeoutMs = Math.max(2_000, Math.min(base, remaining));
    try {
      const payload = await fetchBootPayloadOnce(timeoutMs);
      if (payload) return payload;
      lastErr = new Error('empty boot payload');
    } catch (err) {
      lastErr = err;
    }
    const backoff = Math.min(BOOT_PREWARM_BACKOFF_MS * (attempt + 1), 2_500);
    if (Date.now() + backoff < deadline) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
  throw lastErr || new Error('boot prewarm exhausted');
}

function prewarmCloudBoot(): Promise<any> {
  const now = Date.now();
  if (__bootPrewarmPromise && now - __bootPrewarmFiredAt < BOOT_PREWARM_TTL_MS) {
    return __bootPrewarmPromise;
  }

  // First: try to adopt the inline <head> prefetch from index.html.
  // That request started before the JS bundle even downloaded — hundreds of milliseconds
  // earlier than anything this module could do. Reusing it skips a second network round-trip.
  if (typeof window !== 'undefined') {
    const inflight: Promise<any> | undefined = (window as any).__bootPrefetchPromise;
    const firedAt: number | undefined = (window as any).__bootPrefetchAt;
    if (inflight && firedAt && now - firedAt < BOOT_PREWARM_TTL_MS) {
      __bootPrewarmFiredAt = firedAt;
      __bootPrewarmPromise = inflight.then((payload) => {
        if (payload) return payload;
        // The head prefetch returned null (cold-start abort / network blip).
        // Switch to the resilient retry — never strand the user on the slow fallback.
        return fetchBootPayloadResilient();
      }).catch(async () => {
        __bootPrewarmPromise = null;
        __bootPrewarmFiredAt = 0;
        throw new Error('boot prefetch failed');
      });
      // Consume the global so a later remount triggers a fresh fetch instead of reusing a stale promise.
      try { delete (window as any).__bootPrefetchPromise; } catch {}
      return __bootPrewarmPromise;
    }
  }

  __bootPrewarmFiredAt = now;
  __bootPrewarmPromise = (async () => {
    try {
      return await fetchBootPayloadResilient();
    } catch (err) {
      __bootPrewarmPromise = null;
      __bootPrewarmFiredAt = 0;
      throw err;
    }
  })();
  return __bootPrewarmPromise;
}

// Fire as soon as this module evaluates — earliest possible warm-up point.
// Safe to call without a user: the endpoint serves the shared admin dataset.
if (typeof window !== 'undefined') {
  try {
    const mode = window.localStorage.getItem('appMode');
    if (mode !== 'local') prewarmCloudBoot().catch(() => {});
  } catch {}
}

const ADMIN_PRIORITY_PAGES = [
  'new-invoice',
  'invoices-list',
  'customers',
  'suppliers',
  'products',
  'orders',
  'expenses',
] as const;

type AdminPriorityPage = typeof ADMIN_PRIORITY_PAGES[number];

const ADMIN_PAGE_PRELOADERS: Record<AdminPriorityPage, () => Promise<any>> = {
  'new-invoice': () => import('./components/InvoicePage'),
  'invoices-list': () => import('./components/ReportsPage'),
  customers: () => import('./components/CustomerPage'),
  suppliers: () => import('./components/SupplierPage'),
  products: () => import('./components/ProductPage'),
  orders: () => import('./components/OrderPage'),
  expenses: () => import('./components/ExpensePage'),
};

const preloadedAdminPages = new Set<string>();

const preloadAdminPage = (page: string) => {
  const loader = ADMIN_PAGE_PRELOADERS[page as AdminPriorityPage];
  if (!loader || preloadedAdminPages.has(page)) return;
  preloadedAdminPages.add(page);
  void loader().catch(() => {
    preloadedAdminPages.delete(page);
  });
};

type AdminNotification = AppState['notifications'][number];

const isVisibleAdminNotification = (notification: AdminNotification) => {
  const title = String(notification?.title || '');
  return !title.includes('درع الربح') && !title.includes('درع') && !title.includes('مجبوس دجاج');
};

const getVisibleAdminNotifications = (notifications?: AdminNotification[]) =>
  (notifications || []).filter(isVisibleAdminNotification);

const SMART_NOTIFICATION_READ_STORAGE_KEY = 'alturath_admin_smart_notification_read_ids_v1';

const getNotificationReadKeys = (notification: any): string[] => {
  const id = String(notification?.id || '').trim();
  const title = String(notification?.title || '').trim().replace(/\s+/g, ' ');
  const message = String(notification?.message || '').trim().replace(/\s+/g, ' ');
  const insightType = String(notification?.insightType || notification?.type || '').trim();
  const recommendedAction = String(notification?.recommendedAction || '').trim().replace(/\s+/g, ' ');
  const keys = [];

  if (id) keys.push(`id:${id}`);
  if (title || message) keys.push(`content:${title}|${message}|${insightType}`);
  if (title && recommendedAction) keys.push(`action:${title}|${recommendedAction}|${insightType}`);

  return Array.from(new Set(keys));
};

const getStoredReadNotificationIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(SMART_NOTIFICATION_READ_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const keys = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    return new Set(keys.flatMap((key) => key.includes(':') ? [key] : [key, `id:${key}`]));
  } catch {
    return new Set();
  }
};

const storeReadNotificationIds = (ids: Array<string | undefined | null>) => {
  if (typeof window === 'undefined') return;
  const cleanIds = ids.map((id) => String(id || '').trim()).filter(Boolean).map((id) => id.includes(':') ? id : `id:${id}`);
  if (!cleanIds.length) return;
  try {
    const current = getStoredReadNotificationIds();
    cleanIds.forEach((id) => current.add(id));
    window.localStorage.setItem(SMART_NOTIFICATION_READ_STORAGE_KEY, JSON.stringify(Array.from(current).slice(-1000)));
  } catch {}
};

const storeReadNotifications = (notifications: any[]) => {
  const keys = notifications.flatMap(getNotificationReadKeys);
  storeReadNotificationIds(keys);
};

const isNotificationReadForUi = (notification: any): boolean => {
  if (notification?.read) return true;
  const storedKeys = getStoredReadNotificationIds();
  return getNotificationReadKeys(notification).some((key) => storedKeys.has(key));
};

const applyStoredNotificationReadState = <T extends { read?: boolean }>(notifications?: T[]): T[] | undefined => {
  if (!Array.isArray(notifications)) return notifications;
  return notifications.map((notification) => (
    isNotificationReadForUi(notification) ? { ...notification, read: true } : notification
  ));
};


const getAdminNotificationDeepLink = () => {
  const params = new URLSearchParams(window.location.search);

  const targetId =
    params.get('invoice') ||
    params.get('order') ||
    params.get('tracked_order') ||
    params.get('requested_order_id') ||
    params.get('order_id');

  if (!targetId) return null;

  return {
    tab: 'invoices',
    search: String(targetId),
    fullId: String(targetId),
    pushNotificationDeepLinkHandled: true
  };
};

const hasAdminNotificationDeepLink = () => Boolean(getAdminNotificationDeepLink());


const getInitialPushDeepLink = () => {
  const params = new URLSearchParams(window.location.search);
  const path = window.location.pathname;
  const page = params.get('page');

  if (page === 'whatsapp-support') {
    const payload = {
      page: 'whatsapp-support',
      phone: params.get('phone') || '',
      source: 'push',
      // Stamped so a link can expire. Without it, an old link stayed valid for the
      // whole browser session and re-opened the same chat on every visit.
      createdAt: Date.now(),
      pushNotificationDeepLinkHandled: true
    };

    try {
      sessionStorage.setItem('adminPushDeepLink', JSON.stringify(payload));
    } catch {}

    return payload;
  }

  const targetId =
    params.get('invoice') ||
    params.get('order') ||
    params.get('tracked_order') ||
    params.get('requested_order_id') ||
    params.get('order_id');

  if (targetId) {
    const payload = {
      tab: 'invoices',
      search: String(targetId),
      source: path === '/track' ? 'track' : 'push',
      fullId: String(targetId),
      pushNotificationDeepLinkHandled: true
    };

    try {
      sessionStorage.setItem('adminPushDeepLink', JSON.stringify(payload));
    } catch {}

    return payload;
  }

  try {
    const saved = sessionStorage.getItem('adminPushDeepLink');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

const hasInitialPushDeepLink = () => Boolean(getInitialPushDeepLink());
const getInitialPageFromDeepLink = () => {
  const link = getInitialPushDeepLink();
  if (link?.page === 'whatsapp-support') return 'whatsapp-support';
  if (link?.search) return 'invoices-list';
  return 'dashboard';
};



// Remove deduplication import as requested
// import { getDeduplicatedProducts } from './lib/deduplication';

const PaymentFeedbackView = ({ invoiceId, path, searchParams, isUpaymentsCallback, mode = 'cloud' }: any) => {
  const [statusMsg, setStatusMsg] = useState<{title: string, sub: string, isError: boolean} | null>(null);
  
  const resultParam = (searchParams.get('result') || searchParams.get('Result') || searchParams.get('status') || searchParams.get('Status') || '')?.toUpperCase();
  const paymentIdParam = searchParams.get('track_id') || searchParams.get('TrackID') || searchParams.get('charge_id') || searchParams.get('id') || searchParams.get('payment_id') || searchParams.get('paymentId') || searchParams.get('PaymentID');
  
  const isExplicitFail = path === '/cancel' || path === '/failed' || path === '/error' || resultParam === 'CANCELED' || resultParam === 'CANCELLED' || resultParam === 'FAILED' || resultParam === 'DECLINED' || resultParam === 'VOIDED' || resultParam === 'NOT CAPTURED' || resultParam === 'NOT_CAPTURED' || resultParam === 'REJECTED';
  const urlIndicatesSuccess = !isExplicitFail && (path === '/success' || resultParam === 'CAPTURED' || resultParam === 'SUCCESS' || resultParam === 'SUCCESSFUL' || resultParam === 'PAID' || resultParam === 'AUTHORIZED' || resultParam === 'COMPLETED' || resultParam === 'APPROVED' || isUpaymentsCallback);

  useEffect(() => {
    const showMessageAndRedirect = (status: 'success' | 'failed', invoiceIdToSearch: string) => {
        if (status === 'success') {
            setStatusMsg({ title: "تمت العملية", sub: "الدفع تم بنجاح", isError: false });
        } else {
            setStatusMsg({ title: "لم تكتمل العملية", sub: "Payment was not completed, you can try again", isError: true });
        }

        try {
            if (invoiceIdToSearch) {
                // Set ONLY orderId precisely as instructed
                localStorage.setItem("order_tracking_id", invoiceIdToSearch);
            }
            localStorage.setItem("payment_return_status", status);
        } catch (e) {
            console.error("localStorage error:", e);
        }

        setTimeout(() => {
            const url = `/track?show_result=${status}&tracked_order=${invoiceIdToSearch || ''}`;
            window.history.replaceState({}, '', url);
            // Since we use window.location.pathname for routing, we need to force a re-render
            // or just trigger the URL sync logic.
            window.location.reload(); 
        }, 120);
    };

    if (isExplicitFail) {
       // Stop execution and bounce back immediately
       showMessageAndRedirect('failed', invoiceId || '');
       return;
    }

    if (!invoiceId) {
      showMessageAndRedirect(urlIndicatesSuccess ? 'success' : 'failed', '');
      return;
    }

    // Try verifying with a timeout safety net
    const verificationTimeout = setTimeout(() => {
       if (!statusMsg) {
          showMessageAndRedirect(urlIndicatesSuccess ? 'success' : 'failed', invoiceId || '');
       }
    }, 10000); // 10 seconds max wait for backend verification

    getDoc(doc(db, 'invoices', invoiceId)).then(snapshot => {
       let actualPaymentId = paymentIdParam || '';
       let actualTrackId = paymentIdParam || '';
       let actualGatewayOrderId = '';
       let actualPaymentLink = '';
       
       if (snapshot.exists()) {
         const data: any = snapshot.data();
         actualPaymentId = data.paymentTrackId || data.trackId || data.track_id || data.paymentId || actualPaymentId || '';
         actualTrackId = data.paymentTrackId || data.trackId || data.track_id || paymentIdParam || '';
         actualGatewayOrderId = data.gatewayOrderId || data.gateway_order_id || '';
         actualPaymentLink = data.paymentLink || data.paymentUrl || data.payment_url || '';
       }

       if (!isExplicitFail) {
	         fetch('/api/invoice/confirm', {
	             method: 'POST',
	             cache: 'no-store',
	             signal: AbortSignal.timeout(10000), // 10s timeout
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({
               paymentId: actualPaymentId || actualTrackId || actualGatewayOrderId || 'check_by_invoice',
               invoiceId,
               trackId: actualTrackId,
               paymentTrackId: actualTrackId,
               gatewayOrderId: actualGatewayOrderId,
               paymentLink: actualPaymentLink,
             })
         }).then(res => res.json()).then(async (verifyObj) => {
             clearTimeout(verificationTimeout);
             let finalStatus: 'success' | 'failed' = 'failed';
             if (verifyObj.verified) {
                 finalStatus = 'success';
                 try {
                    await updateDoc(doc(db, 'invoices', invoiceId), {
                      paymentStatus: 'paid',
                      status: 'تم الدفع بنجاح',
                      paymentId: actualPaymentId || actualTrackId,
                      payment_id: actualPaymentId || actualTrackId,
                      paymentTrackId: actualTrackId || actualPaymentId,
                      trackId: actualTrackId || actualPaymentId,
                      gatewayOrderId: actualGatewayOrderId || verifyObj?.syncResult?.identifiers?.gatewayOrderIds?.[0] || '',
                      verifiedByBackend: true
                    });
                    const ordersSnap = await getDocs(query(collection(db, 'orders'), where('linkedInvoiceId', '==', invoiceId)));
                    const updatePromises: Promise<any>[] = [];
                    ordersSnap.forEach((orderDoc) => {
                       updatePromises.push(updateDoc(doc(db, 'orders', orderDoc.id), { status: 'تم الدفع', paymentStatus: 'paid', paymentMethod: 'KNet' }));
                    });
                    await Promise.all(updatePromises);
                 } catch (e) {}
             } else {
                if (urlIndicatesSuccess) {
                    finalStatus = 'success';
                    try {
                       await updateDoc(doc(db, 'invoices', invoiceId), {
                         paymentStatus: 'paid',
                         status: 'تم الدفع بنجاح',
                         paymentId: actualPaymentId || actualTrackId,
                         payment_id: actualPaymentId || actualTrackId,
                         paymentTrackId: actualTrackId || actualPaymentId,
                         trackId: actualTrackId || actualPaymentId,
                         gatewayOrderId: actualGatewayOrderId || verifyObj?.syncResult?.identifiers?.gatewayOrderIds?.[0] || '',
                         verifiedByBackend: false,
                         verificationError: verifyObj.debugData || 'not_found'
                       });
                        const ordersSnap = await getDocs(query(collection(db, 'orders'), where('linkedInvoiceId', '==', invoiceId)));
                        const updatePromises: Promise<any>[] = [];
                        ordersSnap.forEach((orderDoc) => {
                           updatePromises.push(updateDoc(doc(db, 'orders', orderDoc.id), { status: 'تم الدفع', paymentStatus: 'paid', paymentMethod: 'KNet' }));
                        });
                        await Promise.all(updatePromises);
                    } catch (e) {}
                }
             }
             showMessageAndRedirect(finalStatus, invoiceId);
         }).catch(() => {
             clearTimeout(verificationTimeout);
             showMessageAndRedirect(urlIndicatesSuccess ? 'success' : 'failed', invoiceId);
         });
       } else {
         clearTimeout(verificationTimeout);
         showMessageAndRedirect(urlIndicatesSuccess ? 'success' : 'failed', invoiceId);
       }
    }).catch(() => {
       clearTimeout(verificationTimeout);
       showMessageAndRedirect(urlIndicatesSuccess ? 'success' : 'failed', invoiceId);
    });

  }, [invoiceId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 md:p-6 arabic-font text-center" dir="rtl">
       <div className="bg-white rounded-2xl p-4 md:p-8 max-w-lg w-full shadow-xl border border-slate-100">
           {statusMsg ? (
               <div className="animate-in fade-in zoom-in duration-500 py-6">
                   <div className={cn(
                       "w-12 md:w-20 h-12 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
                       statusMsg.isError ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                   )}>
                       {statusMsg.isError ? <XCircle size={40} /> : <CheckCircle2 size={40} />}
                   </div>
                   <h1 className="text-xl md:text-3xl font-bold text-slate-800 mb-2">{statusMsg.title}</h1>
                   <p className="text-slate-500 font-bold mb-8 text-lg" dir="ltr">{statusMsg.sub}</p>
                   
                   <div className="flex items-center justify-center gap-3 text-sm text-slate-500 font-bold">
                       <Loader2 size={16} className="animate-spin text-blue-500" />
                       بنحوّلك لصفحة التتبع...
                   </div>
               </div>
           ) : (
               <div className="py-6 md:py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-emerald-500 border-t-transparent flex items-center justify-center rounded-full animate-spin mb-4" />
                  <p className="font-bold text-slate-500">نتأكد من عملية الدفع...</p>
               </div>
           )}
       </div>
    </div>
  );
};

const AmbientBackground = () => {
    const [timePhase, setTimePhase] = useState('morning');
    useEffect(() => {
        const updateTime = () => {
            const h = new Date().getHours();
            if (h >= 5 && h < 14) setTimePhase('morning');
            else if (h >= 14 && h < 18) setTimePhase('afternoon');
            else setTimePhase('evening');
        };
        updateTime();
        const t = setInterval(updateTime, 60000);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="fixed inset-0 pointer-events-none z-[1] transition-colors duration-[3000ms]">
          {timePhase === 'morning' && <div className="absolute inset-0 bg-gradient-to-br from-sky-100/30 to-transparent mix-blend-multiply" />}
          {timePhase === 'afternoon' && <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-orange-50/20 to-transparent mix-blend-multiply" />}
          {timePhase === 'evening' && <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/10 via-slate-800/10 to-transparent mix-blend-multiply" />}
        </div>
    );
};


const CompanyCommandCenter: React.FC<{ data: any; onNavigate: (page: string) => void; page: string }> = ({ data, onNavigate, page }) => {
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const products = Array.isArray(data?.products) ? data.products : [];
  const customers = Array.isArray(data?.customers) ? data.customers : [];
  const coupons = Array.isArray(data?.promocodes) ? data.promocodes : [];
  const suppliers = Array.isArray(data?.suppliers) ? data.suppliers : [];
  const allSales = [...invoices, ...orders];
  const pending = allSales.filter((item: any) => isPendingStatus(item?.status || item?.paymentStatus)).length;
  const failed = allSales.filter((item: any) => isFailedStatus(item?.status || item?.paymentStatus)).length;
  const paid = allSales.filter((item: any) => isPaidStatus(item?.status || item?.paymentStatus)).length;
  const total = allSales.reduce((sum: number, item: any) => sum + Number(item?.total || item?.amount || 0), 0);
  const outOfStock = products.filter((p: any) => p?.isOutOfStock || p?.stock === 0 || p?.quantity === 0).length;
  const signal = failed > 0 ? 'يحتاج انتباه' : pending > 0 ? 'قيد المتابعة' : 'الوضع مستقر';
  const tone = failed > 0 ? 'danger' : pending > 0 ? 'watch' : 'calm';
  const hour = new Date().getHours();
  const greeting = hour >= 17 && hour < 22
    ? { title: 'تحية مسائية هادئة ☕', sub: 'النظام مستقر ويعمل بهدوء. وقت ممتاز لمراجعة أرقامك والتحضير للغد.' }
    : hour >= 5 && hour < 12
      ? { title: 'صباح الخير، يوم جديد وفرص جديدة ☀️', sub: 'مركز القيادة جاهز لقراءة نبض اليوم ومتابعة أهم المؤشرات.' }
      : hour >= 12 && hour < 17
        ? { title: 'مرحباً، وقت الغداء والتركيز! 🍽️', sub: 'تتبع حركة المبيعات في فترة الذروة، والقرارات المهمة أمامك.' }
        : { title: 'نظرة هادية على الأرقام.. عساك على القوة! ☕', sub: 'هدوء الليل أفضل وقت للتخطيط ومراجعة الأداء.' };
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const paidSalesValue = allSales.filter((item: any) => isPaidStatus(item?.status || item?.paymentStatus)).reduce((sum: number, item: any) => sum + getMoneyValue(item), 0);
  const briefLines = [
    failed > 0 ? `عندك ${failed} عملية فشل دفع تحتاج مراجعة قبل الزحمة.` : 'ماكو فشل دفع ظاهر حالياً، الوضع أهدأ للتشغيل.',
    pending > 0 ? `${pending} طلب بانتظار الدفع؛ خلها أول متابعة اليوم.` : 'طلبات الدفع المعلقة تحت السيطرة.',
    paid > 0 ? `${paid} عملية مدفوعة بقيمة ${paidSalesValue.toFixed(3)} د.ك جاهزة للمتابعة.` : 'أول عملية مدفوعة اليوم راح تظهر هنا فوراً.',
  ];

  const coreModules = [
    {
      id: 'dashboard',
      label: 'مركز القيادة',
      subtitle: 'النبض والمعلق وفشل الدفع لليوم',
      icon: <Gauge size={18} />,
      tone: 'gold',
      value: `${allSales.length} عملية`,
      hint: `معلق: ${pending} · فشل: ${failed}`
    },
    {
      id: 'reports',
      label: 'التقارير التنفيذية',
      subtitle: 'تحليل الأداء المالي والمبيعات بالتفصيل',
      icon: <TrendingUp size={18} />,
      tone: 'emerald',
      value: `${total.toFixed(3)} د.ك`,
      hint: `الفواتير: ${invoices.length}`
    },
    {
      id: 'loyalty',
      label: 'مملكة الولاء',
      subtitle: 'مستويات العملاء ونقاط الذهبي والـ VIP',
      icon: <Sparkles size={18} />,
      tone: 'purple',
      value: `مملكة الولاء`,
      hint: `العملاء: ${customers.length}`
    },
    {
      id: 'coupons',
      label: 'مسرح عروض التراث',
      subtitle: 'إدارة الكوبونات وحساب الأثر الربحي لها',
      icon: <CircleDollarSign size={18} />,
      tone: 'amber',
      value: `الكوبونات`,
      hint: `${coupons.length} عروض نشطة`
    },
    {
      id: 'smart-studio',
      label: 'استوديو التراث الذكي',
      subtitle: 'تجهيز رسائل الدعاية والتسويق التلقائي',
      icon: <Send size={18} />,
      tone: 'sky',
      value: `استوديو التراث الذكي`,
      hint: 'دعاية وتواصل ذكي'
    },
    {
      id: 'growth-simulator',
      label: 'محاكي النمو والتسويق',
      subtitle: 'سيناريوهات ماذا لو للأرباح والنمو',
      icon: <Zap size={18} />,
      tone: 'indigo',
      value: `محاكي الأرباح`,
      hint: 'توقع الإيرادات'
    },
    {
      id: 'ai',
      label: 'مساعد التراث الذكي',
      subtitle: 'مستشار مالي مدعوم بالتوصيات الذكية',
      icon: <Bot size={18} />,
      tone: 'rose',
      value: `المستشار التنفيذي`,
      hint: 'خلاصات مختصرة'
    },
    {
      id: 'diwaniya',
      label: 'بطولات الديوانية',
      subtitle: 'لوحة تنظيم النقاط وترتيب جوائز البطولات',
      icon: <ClipboardCheck size={18} />,
      tone: 'slate',
      value: `الديوانية والجوائز`,
      hint: 'إدارة الترتيب'
    },
    {
      id: 'profit-guard',
      label: 'المالية وحماية الأرباح',
      subtitle: 'كشف مالي متقدم وفحص هوامش الأرباح والنزيف',
      icon: <ShieldAlert size={18} />,
      tone: 'rose',
      value: `حماية الأرباح`,
      hint: 'كشف النزيف والفرص'
    }
  ];

  const searchableTools = [
    ...coreModules,
    { id: 'products', label: 'إدارة المنتجات والمخزون', subtitle: 'سجل المنتجات، الأسعار والتوافر بالمخزن', icon: <Boxes size={18} />, tone: 'slate', value: 'المخزون والمنتجات', hint: `${products.length} صنف` },
    { id: 'expenses', label: 'المصروفات العامة والنزيف', subtitle: 'إدخال المصاريف والمدفوعات والمتابعة المالية', icon: <DollarSign size={18} />, tone: 'rose', value: 'المصروفات العامة', hint: 'تفاصيل المصروفات' },
    { id: 'suppliers', label: 'حسابات الموردين ورادار المخاطر', subtitle: 'المديونية وصرف التوريد والانتظام', icon: <Truck size={18} />, tone: 'indigo', value: 'الموردين والمستحقات', hint: `${suppliers.length} مورد` },
    { id: 'suppliers-audit', label: 'مراجعة الموردين والتأثير المالي', subtitle: 'تفصيل أثر المورد على الربحية والمخاطر', icon: <AlertTriangle size={18} />, tone: 'slate', value: 'رادار المخاطر', hint: 'أثر التوريد' },
    { id: 'new-invoice', label: 'إنشاء فاتورة جديدة', subtitle: 'مسار سريع لإدخال المبيعات الفورية للعملاء', icon: <PlusCircle size={18} />, tone: 'sky', value: 'فاتورة جديدة', hint: 'مسار إنشاء سريع' },
    { id: 'invoices-list', label: 'سجل الفواتير ونقاط البيع', subtitle: 'البحث والطباعة والمراجعة لجميع الفواتير السابقة', icon: <Receipt size={18} />, tone: 'emerald', value: 'أرشيف الفواتير', hint: `${invoices.length} فاتورة` },
    { id: 'orders', label: 'طلبات الموقع الإلكتروني', subtitle: 'متابعة تشغيل وتوصيل الطلبات والدفع الإلكتروني', icon: <ShoppingBag size={18} />, tone: 'slate', value: 'الطلبات والتشغيل', hint: `${orders.length} طلب ويب` },
    { id: 'customers', label: 'إدارة العملاء وقراءة البيانات', subtitle: 'قائمة العملاء وبيانات الاتصال والترتيب', icon: <Users size={18} />, tone: 'emerald', value: 'قاعدة العملاء', hint: `${customers.length} عميل` },
    { id: 'settings', label: 'الإعدادات العامة لمطبخ التراث', subtitle: 'إعدادات التشغيل، التوصيل، الشركاء، والهوية', icon: <Settings size={18} />, tone: 'slate', value: 'الإعدادات والتهيئة', hint: 'تخصيص النظام' }
  ];

  const go = (target: string) => {
    onNavigate(target);
    setIsOpen(false);
  };

  const filterQuery = searchQuery.trim();
  const filteredTools = filterQuery
    ? searchableTools.filter(t => 
        normalizeArabic(t.label).toLowerCase().includes(normalizeArabic(filterQuery).toLowerCase()) ||
        normalizeArabic(t.subtitle).toLowerCase().includes(normalizeArabic(filterQuery).toLowerCase())
      )
    : coreModules;

  return (
    <section dir="rtl" className={`heritage-command-brief heritage-command-brief-${tone} is-open`} aria-label="مركز القيادة">
      <div className="executive-morning-brief pb-2 mb-2">
        <div>
          <span>Executive Morning Brief</span>
          <strong>مركز القيادة</strong>
        </div>
        <ul>
          {briefLines.map((line) => <li key={line}>{line}</li>)}
        </ul>
      </div>
    </section>
  );
};





const getOnboardingProfile = (role: 'admin' | 'partner' | 'demo') => {
  if (role === 'partner') {
    return {
      eyebrow: 'مرشد الشريك',
      title: 'واجهة بسيطة… أهم شيء أمامك فقط',
      subtitle: 'نعرّفك بسرعة على الطلبات والفواتير وحالة الحساب بدون تعقيد الأدمن الكامل.',
      accent: 'emerald',
      steps: [
        { icon: <ShoppingBag size={19} />, title: 'طلبات اليوم', text: 'افتح الطلبات التي تخصك وتابع الحالة من مكان واحد.', page: 'orders' },
        { icon: <Receipt size={19} />, title: 'الفواتير', text: 'راجع سجل الفواتير والدفعات بدون الدخول في تفاصيل إدارية عميقة.', page: 'invoices-list' },
        { icon: <PlusCircle size={19} />, title: 'فاتورة جديدة', text: 'أنشئ فاتورة بسرعة عند الحاجة بنفس مسار العمل الحالي.', page: 'new-invoice' },
        { icon: <Gauge size={19} />, title: 'الرئيسية', text: 'ارجع للملخص البسيط متى ما احتجت نظرة سريعة.', page: 'dashboard' },
      ]
    };
  }
  if (role === 'demo') {
    return {
      eyebrow: 'جولة الوضع التجريبي',
      title: 'جرّب النظام بثقة قبل التشغيل الفعلي',
      subtitle: 'هذه جولة خفيفة توضّح أهم المناطق التي تستحق التجربة، بدون أي وعد بأزرار غير جاهزة.',
      accent: 'amber',
      steps: [
        { icon: <Gauge size={19} />, title: 'مركز القيادة', text: 'ابدأ من الملخص التنفيذي لتفهم نبض النظام خلال ثواني.', page: 'dashboard' },
        { icon: <Receipt size={19} />, title: 'الفواتير', text: 'جرّب إنشاء فاتورة ومراجعة سجل الفواتير.', page: 'new-invoice' },
        { icon: <ShoppingBag size={19} />, title: 'طلبات الموقع', text: 'شاهد كيف تظهر حالات الطلبات والدفعات للمتابعة.', page: 'orders' },
        { icon: <Sparkles size={19} />, title: 'استوديو التراث الذكي', text: 'استعرض أدوات المحتوى والأرشيف من غير لمس منطق التراث الذكي.', page: 'smart-studio' },
      ]
    };
  }
  return {
    eyebrow: 'مرشد الأدمن التنفيذي',
    title: 'أهلاً بك في مركز قيادة شركة مطبخ التراث',
    subtitle: 'جولة سريعة لأول دخول: مبيعات، طلبات، منتجات، تنبيهات، واستوديو التراث الذكي في مسار واضح.',
    accent: 'gold',
    steps: [
      { icon: <Gauge size={19} />, title: 'مركز القيادة', text: 'نبض اليوم، بانتظار الدفع، فشل الدفع، والمنتجات التي تحتاج مراجعة.', page: 'dashboard' },
      { icon: <ShoppingBag size={19} />, title: 'طلبات الموقع', text: 'تابع الطلبات وحالات الدفع الفعلية من صفحة تشغيل واحدة.', page: 'orders' },
      { icon: <Receipt size={19} />, title: 'الفواتير', text: 'سجل الفواتير، البحث، الطباعة، والمراجعة بدون ازدحام.', page: 'invoices-list' },
      { icon: <Package size={19} />, title: 'المنتجات', text: 'راجع المنتجات ومؤشر القوة والربحية من نفس مكان الإدارة.', page: 'products' },
      { icon: <Bell size={19} />, title: 'التنبيهات الذكية', text: 'افتح لوحة التنبيهات الفعلية مباشرة، بدون انتقال وهمي.', page: 'notifications' },
    ]
  };
};

const AdminOnboardingModal: React.FC<{
  open: boolean;
  role: 'admin' | 'partner' | 'demo';
  onClose: () => void;
  onNavigate: (page: string) => void;
}> = ({ open, role, onClose, onNavigate }) => {
  const profile = getOnboardingProfile(role);
  const [step, setStep] = React.useState(0);
  React.useEffect(() => {
    if (open) setStep(0);
  }, [open, role]);
  const current = profile.steps[step];
  const finish = () => {
    try { localStorage.setItem(`alturath_admin_onboarding_seen_${role}`, 'true'); } catch {}
    onClose();
  };
  const goToStepPage = () => {
    if (current?.page) onNavigate(current.page);
    finish();
  };
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="admin-onboarding-backdrop"
          dir="rtl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={`admin-onboarding-card admin-onboarding-${profile.accent}`}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          >
            <button className="admin-onboarding-close" type="button" onClick={finish} aria-label="إغلاق الجولة"><X size={18} /></button>
            <div className="admin-onboarding-hero">
              <span className="admin-onboarding-orb"><LogoEngine src={DEFAULT_GLOBAL_LOGO} variant="royal" /></span>
              <div>
                <small>{profile.eyebrow}</small>
                <h2>{profile.title}</h2>
                <p>{profile.subtitle}</p>
              </div>
            </div>
            <div className="admin-onboarding-step-shell">
              <div className="admin-onboarding-step-icon">{current.icon}</div>
              <div className="min-w-0">
                <span className="admin-onboarding-count">خطوة {step + 1} من {profile.steps.length}</span>
                <h3>{current.title}</h3>
                <p>{current.text}</p>
              </div>
            </div>
            <div className="admin-onboarding-dots">
              {profile.steps.map((_: any, index: number) => <button key={index} type="button" aria-label={`الخطوة ${index + 1}`} onClick={() => setStep(index)} className={index === step ? 'is-active' : ''} />)}
            </div>
            <div className="admin-onboarding-actions">
              <button type="button" className="admin-onboarding-secondary" onClick={finish}>تخطي ولا تظهر مرة أخرى</button>
              <div className="flex items-center gap-2">
                <button type="button" className="admin-onboarding-ghost" onClick={goToStepPage}>افتح هذه الصفحة</button>
                <button
                  type="button"
                  className="admin-onboarding-primary"
                  onClick={() => step < profile.steps.length - 1 ? setStep(step + 1) : finish()}
                >
                  {step < profile.steps.length - 1 ? 'التالي' : 'ابدأ العمل'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const DataRefreshNotice: React.FC<{ show: boolean; mode: 'cloud' | 'local' }> = ({ show, mode }) => (
  <AnimatePresence>
    {show && (
      <motion.div
        className="admin-sync-toast"
        dir="rtl"
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
      >
        <motion.span {...heritageMotion.breathe} className="admin-sync-breath" />
        <span>{mode === 'cloud' ? 'جارٍ جلب آخر نسخة من السحابة...' : 'جارٍ تجهيز بيانات التجربة...'}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const NetworkStatusNotice: React.FC<{ online: boolean }> = ({ online }) => null;


const CloudConnectionGate: React.FC<{
  logo?: string;
  name?: string;
  phase: 'auth' | 'sync' | 'offline';
  onRetry?: () => void;
}> = ({ name, phase, onRetry }) => {
  const isOffline = phase === 'offline';
  const title = isOffline ? 'الاتصال متوقف مؤقتاً' : 'جاري التحقق من الاتصال…';
  const statusLabel = isOffline ? 'غير متصل' : phase === 'auth' ? 'جاري التحقق' : 'جاري الاتصال';
  const orbitItems = isOffline
    ? [ShieldAlert, RefreshCw, Database]
    : [BadgeCheck, Zap, Database];

  return (
    <div className="fixed inset-0 z-[99998] flex items-center justify-center overflow-hidden bg-[#06110f] px-5 arabic-font" dir="rtl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(16,185,129,.22),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(245,184,74,.16),transparent_28%),linear-gradient(145deg,#030706_0%,#0b1714_46%,#12110a_100%)]" />
      <div className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(circle_at_center,rgba(255,255,255,.82)_1px,transparent_1px)] [background-size:28px_28px]" />
      <motion.div
        className="absolute h-[520px] w-[520px] rounded-full border border-emerald-200/10"
        animate={{ rotate: 360 }}
        transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute h-[390px] w-[390px] rounded-full border border-amber-200/10"
        animate={{ rotate: -360 }}
        transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
      />
      <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-300/16 blur-[105px]" />
      <div className="absolute -bottom-24 right-12 h-72 w-72 rounded-full bg-amber-300/14 blur-[110px]" />

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-[560px] text-center"
      >
        <div className="relative mx-auto flex h-[310px] w-[310px] items-center justify-center sm:h-[360px] sm:w-[360px]">
          <motion.div
            className={`absolute inset-0 rounded-full border ${isOffline ? 'border-rose-200/16' : 'border-emerald-200/16'} bg-white/[0.035] shadow-[inset_0_0_70px_rgba(255,255,255,.05),0_28px_95px_rgba(0,0,0,.42)] backdrop-blur-xl`}
            animate={{ scale: isOffline ? [1, 1.012, 1] : [1, 1.025, 1] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-8 rounded-full border border-white/10 bg-slate-950/30" />
          <motion.div
            className="absolute inset-12 rounded-full border border-dashed border-white/12"
            animate={{ rotate: isOffline ? 0 : 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
          />

          {!isOffline && (
            <>
              <motion.div
                className="absolute inset-12 pointer-events-none"
                animate={{ rotate: 360 }}
                transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-200 shadow-[0_0_24px_rgba(110,231,183,.9)]" />
              </motion.div>
              <motion.div
                className="absolute inset-8 pointer-events-none"
                animate={{ rotate: -360 }}
                transition={{ duration: 6.2, repeat: Infinity, ease: 'linear' }}
              >
                <span className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-amber-200 shadow-[0_0_22px_rgba(252,211,77,.82)]" />
              </motion.div>
            </>
          )}

          <div className={`relative flex h-36 w-36 items-center justify-center rounded-[2.35rem] border ${isOffline ? 'border-rose-200/25 bg-rose-950/28 text-rose-100' : 'border-emerald-100/20 bg-emerald-950/24 text-emerald-50'} shadow-[0_22px_70px_rgba(0,0,0,.42)] backdrop-blur-2xl sm:h-40 sm:w-40`}>
            <motion.div
              className="absolute inset-[-18px] rounded-[2.9rem] border border-white/10"
              animate={{ opacity: [0.18, 0.55, 0.18], scale: [0.96, 1.05, 0.96] }}
              transition={{ duration: 2.1, repeat: Infinity, ease: 'easeInOut' }}
            />
            {isOffline ? (
              <ShieldAlert size={54} strokeWidth={1.65} />
            ) : (
              <svg
                width="66"
                height="66"
                viewBox="0 0 66 66"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                className="drop-shadow-[0_0_18px_rgba(255,255,255,.22)]"
              >
                <path
                  d="M22.2 39.6H19.8C14.7 39.6 10.56 35.46 10.56 30.36C10.56 25.59 14.19 21.66 18.84 21.18C20.67 13.95 27.24 8.58 35.04 8.58C44.1 8.58 51.48 15.78 51.78 24.78C55.95 25.74 59.04 29.46 59.04 33.9C59.04 39 54.9 43.14 49.8 43.14H44.64"
                  stroke="currentColor"
                  strokeWidth="4.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M33 28.38V54.12"
                  stroke="currentColor"
                  strokeWidth="4.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M22.77 43.89L33 54.12L43.23 43.89"
                  stroke="currentColor"
                  strokeWidth="4.1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-9 flex items-center justify-center gap-3">
            {orbitItems.map((Icon, index) => (
              <motion.div
                key={index}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${isOffline ? 'border-rose-100/14 bg-rose-950/24 text-rose-100' : 'border-white/12 bg-white/[0.07] text-amber-100'} shadow-lg backdrop-blur-xl`}
                animate={{ y: isOffline ? 0 : [0, -6, 0], opacity: isOffline ? 0.72 : [0.72, 1, 0.72] }}
                transition={{ duration: 1.45, repeat: Infinity, delay: index * 0.18, ease: 'easeInOut' }}
              >
                <Icon size={18} />
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="relative -mt-4 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.075] px-6 py-6 shadow-[0_26px_90px_rgba(0,0,0,.38)] backdrop-blur-2xl"
        >
          <div className={`mx-auto mb-4 inline-flex items-center gap-2 rounded-full border ${isOffline ? 'border-rose-100/18 bg-rose-400/10 text-rose-100' : 'border-emerald-100/18 bg-emerald-300/10 text-emerald-100'} px-4 py-2 text-[11px] font-black`}>
            <motion.span
              className={`h-2 w-2 rounded-full ${isOffline ? 'bg-rose-300' : 'bg-emerald-300'}`}
              animate={{ opacity: [0.35, 1, 0.35], scale: [0.88, 1.18, 0.88] }}
              transition={{ duration: 1.25, repeat: Infinity, ease: 'easeInOut' }}
            />
            {statusLabel}
          </div>

          <h1 className="text-3xl font-black leading-tight text-white sm:text-4xl">{title}</h1>

          {isOffline ? (
            <p className="mx-auto mt-4 max-w-[420px] text-sm font-bold leading-7 text-slate-300">
              تعذر الاتصال مؤقتاً. تم إيقاف التعديل لحماية البيانات حتى يعود الاتصال.
            </p>
          ) : (
            <div className="mx-auto mt-6 flex w-full max-w-[330px] items-center justify-center gap-2" aria-label="cloud-connection-loader">
              {[0, 1, 2, 3, 4].map((item) => (
                <motion.span
                  key={item}
                  className="h-2.5 w-2.5 rounded-full bg-gradient-to-br from-emerald-200 to-amber-200 shadow-[0_0_18px_rgba(245,184,74,.34)]"
                  animate={{ y: [0, -9, 0], opacity: [0.35, 1, 0.35], scale: [0.86, 1.18, 0.86] }}
                  transition={{ duration: 1.05, repeat: Infinity, delay: item * 0.11, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}

          <div className="mt-5 text-[9px] font-light tracking-wide text-slate-500/20">{name || 'شركة مطبخ التراث الكويتي'}</div>

          {isOffline && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15 active:scale-95"
            >
              <RefreshCw size={16} />
              إعادة المحاولة
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
};

const getMoneyValue = (item: any) => Number(item?.total || item?.totalAmount || item?.amount || item?.price || 0) || 0;
const getItemName = (item: any, fallback = 'بدون اسم') => item?.name || item?.customerName || item?.title || item?.code || item?.id || fallback;
const getAdminPageMeta = (page: string) => {
  const map: Record<string, {title: string; subtitle: string; tag: string}> = {
    dashboard: { title: 'مركز القيادة', subtitle: 'ملخص اليوم، الحالات المهمة، والإجراءات السريعة في واجهة واحدة.', tag: 'Daily Command Brief' },
    'dashboard-ai': { title: 'مختبر التراث الذكي', subtitle: 'معرض أدوات للقرارات التنفيذية بدون لمس منطق التراث الذكي.', tag: 'Smart Lab Gallery' },
    'new-invoice': { title: 'فاتورة جديدة', subtitle: 'العميل، المنتجات، الملخص، ثم الإنشاء في مسار واحد واضح.', tag: 'Receipt Builder' },
    'invoices-list': { title: 'سجل الفواتير', subtitle: 'سجل فخم للبحث والمراجعة والطباعة والمتابعة.', tag: 'Invoice Ledger' },
    orders: { title: 'طلبات الموقع', subtitle: 'لوحة تشغيل للطلبات الحالية وحالات الدفع الفعلية.', tag: 'Operations Board' },
    customers: { title: 'لوحة العملاء', subtitle: 'VIP، جدد، غائبون، عالي القيمة، وعملاء يحتاجون عرض.', tag: 'Customer Intelligence Board' },
    products: { title: 'قائمة المنتجات', subtitle: 'استوديو منتجات مع مؤشر قوة المنتج من المبيعات والربحية والتوفر.', tag: 'Product Score' },
    expenses: { title: 'المصروفات العامة', subtitle: 'صفحة مالية هادئة توضّح المصروفات والنزيف بدون صراخ بصري.', tag: 'Expense Control' },
    suppliers: { title: 'سجل الموردين المعتمدين', subtitle: 'إدارة المديونيات، الاعتمادات، والمخاطر التشغيلية للموردين.', tag: 'Supplier Radar' },
    'suppliers-audit': { title: 'كشف الحساب المالي التفصيلي', subtitle: 'سجل مراجعة شامل للتوريد، السداد، والتدقيق المالي.', tag: 'Supplier Audit Ledger' },
    reports: { title: 'التقارير', subtitle: 'قراءة تنفيذية للفواتير والمبيعات والأداء.', tag: 'Executive Reports' },
    ai: { title: 'مستشار التراث الذكي', subtitle: 'مستشار تنفيذي يعرض الملخص والأسباب والإجراء المقترح.', tag: 'Executive Assistant' },
    'smart-studio': { title: 'استوديو التراث الذكي', subtitle: 'اختيار المحتوى، التوليد، المعاينة، والأرشيف في تجربة واحدة.', tag: 'Creative Suite' },
    loyalty: { title: 'مملكة الولاء', subtitle: 'مستويات عادي، فضي، ذهبي، وVIP مع شارات وترقيات.', tag: 'Loyalty Kingdom' },
    coupons: { title: 'مسرح عروض التراث', subtitle: 'كل كوبون كبطاقة تعرض الخصم والاستخدامات وتأثير الربح.', tag: 'Smart Offers Theater' },
    'growth-simulator': { title: 'محاكي النمو والتسويق', subtitle: 'سيناريوهات ماذا لو للمبيعات والربح والمخاطر.', tag: 'Growth Simulator Pro' },
    'profit-guard': { title: 'المالية وحماية الأرباح', subtitle: 'درع الربح: المبيعات، المصروفات، الهامش، النزيف، والفرص.', tag: 'Profit Shield' },
    diwaniya: { title: 'بطولات الديوانية', subtitle: 'لوحة بطولات ناعمة للترتيب والنقاط والجوائز.', tag: 'Tournament Board' },
    'whatsapp-support': { title: 'مركز واتساب الذكي', subtitle: '', tag: 'WhatsApp Center' },
    settings: { title: 'الإعدادات العامة', subtitle: 'هوية المتجر، التشغيل، التوصيل، النظام، والحساب في بطاقات هادئة.', tag: 'General Settings' },
  };
  return map[page] || { title: 'مركز الإدارة', subtitle: 'واجهة موحدة وقرارات واضحة.', tag: 'Admin System' };
};

const AdminExperienceFrame: React.FC<{page: string; data: any; onNavigate: (page: string) => void; children: React.ReactNode}> = ({ page, data, onNavigate, children }) => {
  const meta = getAdminPageMeta(page);
  const [openSmartPanel, setOpenSmartPanel] = React.useState<string | null>(null);
  React.useEffect(() => { setOpenSmartPanel(null); }, [page]);
  const toggleSmartPanel = (panel: string) => setOpenSmartPanel(prev => prev === panel ? null : panel);
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const products = Array.isArray(data?.products) ? data.products : [];
  const customers = Array.isArray(data?.customers) ? data.customers : [];
  const suppliers = Array.isArray(data?.suppliers) ? data.suppliers : [];
  const coupons = Array.isArray(data?.promocodes) ? data.promocodes : [];
  const allSales = [...invoices, ...orders];
  const pendingCount = allSales.filter((x: any) => isPendingStatus(x?.status || x?.paymentStatus)).length;
  const failedCount = allSales.filter((x: any) => isFailedStatus(x?.status || x?.paymentStatus)).length;
  const totalSales = allSales.reduce((sum: number, x: any) => sum + getMoneyValue(x), 0);
  const productScore = (p: any) => {
    const name = String(p?.name || p?.title || '').trim();
    const productSales = allSales.reduce((sum: number, inv: any) => {
      const items = inv?.items || inv?.products || [];
      if (!Array.isArray(items)) return sum;
      return sum + items.filter((it: any) => String(it?.name || it?.productName || it?.title || '').trim() === name || String(it?.productId || '') === String(p?.id || '')).reduce((a: number, it: any) => a + Number(it?.quantity || 1), 0);
    }, 0);
    const price = Number(p?.price || p?.basePrice || 0) || 0;
    const cost = Number(p?.cost || price * 0.55) || 0;
    const margin = price > 0 ? Math.max(0, Math.min(1, (price - cost) / price)) : 0;
    const availability = p?.isOutOfStock ? 0 : 1;
    return Math.round(Math.min(100, 20 + Math.min(40, productSales * 8) + margin * 30 + availability * 10));
  };
  const productLeaders = products.slice(0, 6).map((p: any) => ({...p, score: productScore(p)})).sort((a: any,b: any) => b.score-a.score).slice(0,3);
  const customerRows = customers.slice(0, 4).map((c: any) => {
    const customerInvoices = allSales.filter((i: any) => String(i?.customerPhone || i?.phone || '') === String(c?.phone || '') || String(i?.customerId || '') === String(c?.id || ''));
    const spend = customerInvoices.reduce((sum: number, i: any) => sum + getMoneyValue(i), 0);
    const ordersCount = customerInvoices.length;
    const label = spend > 150 || ordersCount >= 5 ? 'VIP' : ordersCount === 1 ? 'اشترى مرة واحدة' : ordersCount === 0 ? 'غائب' : 'نشط';
    return { ...c, spend, ordersCount, label };
  });
  const supplierRows = suppliers.map((sup: any) => {
    const debt = Number(sup?.balance || sup?.debt || sup?.amountDue || 0) || 0;
    const linkedProducts = products.filter((p: any) => String(p?.supplierId || p?.supplier || '') === String(sup?.id || sup?.name || '')).length;
    const priorityScore = Math.round(Math.min(100, (debt > 0 ? Math.min(70, debt / 2) : 0) + Math.min(30, linkedProducts * 6)));
    const risk = debt > 100 ? 'أولوية سداد عالية' : linkedProducts > 4 ? 'مورد مؤثر على التشغيل' : debt > 0 ? 'مستحقات عادية' : 'مستقر';
    const recommendation = debt > 100
      ? 'ابدأ بتسوية المستحق لأنه مؤثر مالياً.'
      : linkedProducts > 4
        ? 'راجع الأسعار والتوفر لأنه مرتبط بعدة منتجات.'
        : debt > 0
          ? 'تابع المستحق ضمن دورة السداد القادمة.'
          : 'لا يوجد إجراء عاجل حالياً.';
    return { ...sup, debt, linkedProducts, priorityScore, risk, recommendation };
  }).sort((a: any, b: any) => b.priorityScore - a.priorityScore).slice(0, 3);
  const showProduct = page === 'products';
  const showCustomers = page === 'customers' || page === 'loyalty';
  const showSuppliers = page === 'suppliers' || page === 'suppliers-audit';
  const showCoupons = page === 'coupons';
  const showAi = false; // تم إخفاء معرض التراث الذكي المكرر فقط
  const showGrowth = page === 'growth-simulator';
  const showProfit = page === 'profit-guard' || page === 'expenses' || page === 'reports';
  const showPageHero = page !== 'dashboard';
  return (
    <div className={`admin-experience-stack ${!showPageHero ? 'dashboard-merged-with-command' : ''}`}>
      {showPageHero && (
        <section className="admin-page-hero" dir="rtl">
          <div className="admin-page-hero-main"><span className="admin-page-kicker">{meta.tag}</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
        </section>
      )}
      {showProduct && <section className={cn("admin-smart-panel product-score-panel smart-collapsible-panel", openSmartPanel==='product' && 'is-open')} dir="rtl"><button type="button" className="smart-panel-toggle" onClick={() => toggleSmartPanel('product')}><div><span>Product Score</span><h2>مؤشر قوة المنتج</h2><p>أفضل الأصناف حسب المبيعات والربحية.</p></div><span className="toggle-pill">{openSmartPanel==='product' ? 'إغلاق' : 'فتح'}</span></button>{openSmartPanel==='product' && <div className="smart-panel-body"><div className="panel-head compact"><button type="button" onClick={() => onNavigate('reports')}>عرض التقارير</button></div><div className="smart-mini-grid">{productLeaders.map((p:any) => <div className="product-score-card" key={p.id||p.name}><div className="score-ring"><strong>{p.score}</strong><small>/100</small></div><div><h3>{getItemName(p,'منتج')}</h3><p>مبيعات · ربحية · تكرار · طلب حالي</p><div className="tiny-meter"><span style={{width:`${p.score}%`}} /></div></div></div>)}</div></div>}</section>}
      {showCustomers && <section className={cn("admin-smart-panel smart-collapsible-panel", openSmartPanel==='customers' && 'is-open')} dir="rtl"><button type="button" className="smart-panel-toggle" onClick={() => toggleSmartPanel('customers')}><div><span>Customer Board</span><h2>لوحة العملاء</h2><p>مختصر الولاء والقيمة الشرائية.</p></div><span className="toggle-pill">{openSmartPanel==='customers' ? 'إغلاق' : 'فتح'}</span></button>{openSmartPanel==='customers' && <div className="smart-panel-body"><div className="panel-head compact"><button type="button" onClick={() => onNavigate('loyalty')}>مملكة الولاء</button></div><div className="customer-intel-grid">{customerRows.map((c:any, idx:number) => <div key={c.id||idx} className={`customer-intel-card ${c.label==='VIP'?'is-vip':''}`}><div className="customer-avatar">{String(c.name||'ع').slice(0,1)}</div><div><h3>{getItemName(c,'عميل')}</h3><p>{c.phone || 'لا يوجد هاتف'} · {c.ordersCount} طلب</p><strong>{(Number(c.spend) || 0).toFixed(3)} د.ك</strong></div><span>{c.label}</span></div>)}</div></div>}</section>}
      {showSuppliers && <section className={cn("admin-smart-panel smart-collapsible-panel", openSmartPanel==='suppliers' && 'is-open')} dir="rtl"><button type="button" className="smart-panel-toggle" onClick={() => toggleSmartPanel('suppliers')}><div><span>Supplier Radar</span><h2>رادار الموردين</h2><p>أولوية السداد وتأثير التوريد.</p></div><span className="toggle-pill">{openSmartPanel==='suppliers' ? 'إغلاق' : 'فتح'}</span></button>{openSmartPanel==='suppliers' && <div className="smart-panel-body"><div className="supplier-radar-guide"><span><b>سداد عالي:</b> مستحق كبير.</span><span><b>مورد مؤثر:</b> مرتبط بعدة منتجات.</span><span><b>مستقر:</b> لا إجراء عاجل.</span></div><div className="supplier-radar-grid">{supplierRows.map((sup:any, idx:number) => <div key={sup.id||idx} className="supplier-radar-card"><div className="supplier-risk-path"><span>سداد</span><b>→</b><span>توفر</span><b>→</b><span>ربح</span></div><h3>{getItemName(sup,'مورد')}</h3><p>{sup.linkedProducts} منتجات · {(Number(sup.debt) || 0).toFixed(3)} د.ك</p><strong title="الحالة محسوبة من المستحقات وعدد المنتجات المرتبطة بالمورد">{sup.risk} · {sup.priorityScore}/100</strong><p className="mt-2 text-[11px] font-bold text-slate-500">{sup.recommendation}</p></div>)}</div></div>}</section>}
      {showCoupons && <section className="admin-smart-panel" dir="rtl"><div className="panel-head"><div><span>Smart Offers Theater</span><h2>مسرح عروض التراث</h2></div><button type="button" onClick={() => onNavigate('reports')}>قياس الأثر</button></div><div className="coupon-theater-grid">{(coupons.length?coupons: [{code:'WELCOME', discountValue:0, isActive:false}]).slice(0,4).map((c:any, idx:number) => { const val=Number(c.discountValue||c.value||0); const tone= val>=25?'خطر':val>=10?'متوسط':'آمن'; return <div className="coupon-ticket" key={c.id||idx}><h3>{c.code||'كوبون'}</h3><p>{val || '—'} {c.discountType==='fixed'?'د.ك':'%'}</p><span>تأثير الربح: {tone}</span></div>})}</div></section>}
      {showAi && <section className="admin-smart-panel ai-lab-gallery" dir="rtl"><div className="panel-head"><div><span>Smart Lab Gallery</span><h2>معرض التراث الذكي</h2></div><button type="button" onClick={() => onNavigate('smart-studio')}>استوديو التراث الذكي</button></div><div className="smart-mini-grid ai-lab-compact-grid">{[
        { label: 'تحليل العملاء', page: 'customers' },
        { label: 'تحليل المنتجات', page: 'products' },
        { label: 'تحليل الموردين', page: 'suppliers-audit' },
        { label: 'تحليل الربح', page: 'reports' },
        { label: 'تحليل العروض', page: 'coupons' },
        { label: 'تحليل المخاطر', page: 'expenses' },
      ].map((item)=><button key={item.label} type="button" onClick={() => onNavigate(item.page)} className="lab-tool-card"><Bot size={18}/><strong>{item.label}</strong><small>يفتح الأداة مباشرة بدون شاشة بيضاء</small></button>)}</div></section>}
      {showGrowth && <section className="admin-smart-panel" dir="rtl"><div className="panel-head"><div><span>Growth Simulator Pro</span><h2>محاكي سيناريوهات النمو</h2></div><button type="button" onClick={() => onNavigate('coupons')}>الكوبونات</button></div><div className="scenario-strip">{['ماذا لو زادت الطلبات 10%؟','ماذا لو أضفنا كوبون؟','ماذا لو رفعنا سعر منتج؟','ماذا لو ركزنا على VIP؟','ماذا لو قللنا مصروفًا؟'].map(t=><span key={t}>{t}</span>)}</div></section>}
      <div className="admin-content-polish" dir="rtl">{children}</div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'partner' | null>(null);
  // Authentication may persist, but company data never does. A live Firestore probe
  // must succeed before the application can be viewed or edited.
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [activePersistenceWrites, setActivePersistenceWrites] = useState(0);
  const [hasInstantCloudSnapshot, setHasInstantCloudSnapshot] = useState(false);
  const [deferredChromeReady, setDeferredChromeReady] = useState(false);
  const [triggerSyncReload, setTriggerSyncReload] = useState(0);
  const [isOnline, setIsOnline] = useState(false); // means verified cloud, not merely Wi-Fi
  const [cloudChecking, setCloudChecking] = useState(true);
  const [retryingOffline, setRetryingOffline] = useState(false);
  const cloudProbeSequenceRef = useRef(0);
  const cloudProbePromiseRef = useRef<Promise<boolean> | null>(null);

  const probeCloudConnection = React.useCallback(async (showFeedback = false): Promise<boolean> => {
    let request = cloudProbePromiseRef.current;
    if (!request) {
      const sequence = ++cloudProbeSequenceRef.current;
      const browserOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
      if (!browserOnline) {
        if (sequence === cloudProbeSequenceRef.current) {
          setCloudChecking(false);
          setIsOnline(false);
        }
        return false;
      }

      setCloudChecking(true);
      request = (async () => {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 5_500);
        try {
          const response = await fetch(`/api/cloud-health?ts=${Date.now()}`, {
            cache: 'no-store',
            signal: controller.signal,
            headers: { 'x-ktk-cloud-probe': '1' },
          });
          const payload = await response.json().catch(() => null);
          const healthy = Boolean(response.ok && payload?.success && payload?.firestoreReachable);
          if (sequence === cloudProbeSequenceRef.current) {
            setIsOnline(healthy);
            setCloudChecking(false);
          }
          return healthy;
        } catch {
          if (sequence === cloudProbeSequenceRef.current) {
            setIsOnline(false);
            setCloudChecking(false);
          }
          return false;
        } finally {
          window.clearTimeout(timeoutId);
        }
      })();
      cloudProbePromiseRef.current = request;
      request.finally(() => {
        if (cloudProbePromiseRef.current === request) {
          cloudProbePromiseRef.current = null;
        }
      }).catch(() => {});
    }

    const healthy = await request;
    if (showFeedback && healthy) {
      toast.success('عاد الاتصال', {
        description: 'النظام جاهز للعمل والحفظ بأمان.',
        position: 'bottom-right',
        className: 'arabic-font',
      });
    }
    return healthy;
  }, []);

  const handleManualRetryOffline = async () => {
    if (retryingOffline) return;
    setRetryingOffline(true);
    const healthy = await probeCloudConnection(true);
    if (!healthy) {
      toast.warning('السحابة ما زالت غير متاحة', {
        description: 'سيبقى النظام مقفلاً لحماية البيانات، وسنعيد الفحص تلقائياً.',
        position: 'bottom-right',
        className: 'arabic-font',
      });
    }
    setRetryingOffline(false);
  };

  const renderBeautifulOfflineModal = () => null;

  useEffect(() => {
    let cancelled = false;
    const verify = () => {
      if (cancelled) return;
      void probeCloudConnection(false);
    };
    const markOffline = () => {
      cloudProbeSequenceRef.current += 1;
      setCloudChecking(false);
      setIsOnline(false);
    };
    const onOnline = () => verify();
    const onFocus = () => verify();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') verify();
    };

    verify();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') verify();
    }, 5_000);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', markOffline);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', markOffline);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [probeCloudConnection]);

  
  // Persist authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });

  useEffect(() => {
    if (!isAuthenticated) {
      setDeferredChromeReady(false);
      return;
    }

    setDeferredChromeReady(false);
    const scheduleIdle = (window as any).requestIdleCallback;
    const cancelIdle = (window as any).cancelIdleCallback;
    const markReady = () => setDeferredChromeReady(true);

    if (typeof scheduleIdle === 'function') {
      const idleId = scheduleIdle(markReady, { timeout: 1200 });
      return () => {
        if (typeof cancelIdle === 'function') cancelIdle(idleId);
      };
    }

    const timer = window.setTimeout(markReady, 450);
    return () => window.clearTimeout(timer);
  }, [isAuthenticated]);

  // ADMIN_MENU_PREFETCH: silently warm up the chunks for top-used menu pages
  // during browser idle time, so the first click on each menu item feels instant.
  // This only triggers the same dynamic imports that lazy() already uses; it does
  // not change any logic, does not run on partner role, and does not touch payment,
  // notifications, AI, WhatsApp, auth, or database code paths.
  useEffect(() => {
    if (!isAuthenticated) return;
    if (userRole === 'partner') return; // partners use a different surface
    let cancelled = false;
    const scheduleIdle = (window as any).requestIdleCallback;
    const cancelIdle = (window as any).cancelIdleCallback;

    const runNext = (i: number) => {
      if (cancelled || i >= ADMIN_PRIORITY_PAGES.length) return;
      preloadAdminPage(ADMIN_PRIORITY_PAGES[i]);
      const scheduleNext = () => {
        if (cancelled) return;
        if (typeof scheduleIdle === 'function') {
          scheduleIdle(() => runNext(i + 1), { timeout: 900 });
        } else {
          window.setTimeout(() => runNext(i + 1), 120);
        }
      };
      window.setTimeout(scheduleNext, i === 0 ? 60 : 0);
    };

    let kickoffId: any;
    if (typeof scheduleIdle === 'function') {
      kickoffId = scheduleIdle(() => runNext(0), { timeout: 700 });
    } else {
      kickoffId = window.setTimeout(() => runNext(0), 350);
    }

    return () => {
      cancelled = true;
      if (typeof scheduleIdle === 'function' && typeof cancelIdle === 'function') {
        try { cancelIdle(kickoffId); } catch {}
      } else {
        try { window.clearTimeout(kickoffId); } catch {}
      }
    };
  }, [isAuthenticated, userRole]);
  
  // App mode & standalone
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  // This installation is cloud-only. Legacy local/offline modes and browser data
  // snapshots are purged so they can never supersede Firestore again.
  const [appMode, setAppMode] = useState<'local' | 'cloud'>('cloud');
  const onboardingRole: 'admin' | 'partner' | 'demo' = userRole === 'partner' ? 'partner' : 'admin';
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('appMode', 'cloud');
      [
        'ktk_cloud_offline_snapshot',
        'ktk_cloud_offline_snapshot_last_good',
        'ktk_cloud_offline_snapshot_backup',
        'ktk_cloud_offline_snapshot_safety_restore',
        'ktk_local_accounting_data',
        'ktk_local_accounting_data_last_good',
        'ktk_local_accounting_data_backup',
        'ktk_local_accounting_data_safety_restore',
        'ktk_accounting_data',
        'ktk_accounting_data_backup',
      ].forEach((key) => localStorage.removeItem(key));
    } catch {}
    setAppMode('cloud');
    setHasInstantCloudSnapshot(false);
  }, []);

  // Keep the Cloud Run instance warm across PWA resumes. When the installed app is
  // reopened (or the tab is refocused) after a while, the backing instance may have
  // scaled to zero. A cheap, fire-and-forget /api/warmup ping starts the boot cache
  // BEFORE the user signs in, so the real data fetch lands on an already-warm instance
  // instead of paying the cold start at the worst possible moment. Touches no Firestore.
  useEffect(() => {
    const warm = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'visible') return;
      try { fetch('/api/warmup', { cache: 'no-store', keepalive: true }).catch(() => {}); } catch {}
    };
    warm();
    document.addEventListener('visibilitychange', warm);
    return () => document.removeEventListener('visibilitychange', warm);
  }, []);

  // Safety net for the auth gate: if Firebase's onAuthStateChanged is unusually
  // slow to fire (rare cold-start, ad blocker interference, flaky Wi-Fi), we
  // never want the user trapped on the "Connecting…" splash. Firebase will
  // still update state when it eventually responds.
  useEffect(() => {
    if (!authLoading) return;
    const t = setTimeout(() => setAuthLoading(false), 700);
    return () => clearTimeout(t);
  }, [authLoading]);

  // First-time onboarding modal auto-trigger disabled per user request to prevent distraction on home page
  useEffect(() => {
    // Disabled auto-showing onboarding open
  }, []);


  // Persist sound state
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('isSoundEnabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSoundEnabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);


  // Silent push auto-refresh: keeps the existing notification token alive when permission is already granted.
  // This does not change notification sending logic and does not prompt the user.
  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (typeof Notification === 'undefined' || window.Notification.permission !== 'granted') return;

    const refreshIfNeeded = () => {
      const lastRefresh = localStorage.getItem('push_last_silent_refresh');
      const lastTime = lastRefresh ? new Date(lastRefresh).getTime() : 0;
      const thirtyMinutes = 30 * 60 * 1000;

      if (lastTime && Date.now() - lastTime < thirtyMinutes) return;

      refreshPushRegistrationIfAlreadyAllowed({
        userId: user.uid || 'admin',
        restaurantId: userRole === 'partner' ? 'partner' : 'kitchen_default',
      });
    };

    refreshIfNeeded();

    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshIfNeeded();
    };
    window.addEventListener('focus', refreshIfNeeded);
    window.addEventListener('online', refreshIfNeeded);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', refreshIfNeeded);
      window.removeEventListener('online', refreshIfNeeded);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAuthenticated, user, userRole]);


  const [currentPage, setCurrentPage] = useState(getInitialPageFromDeepLink());
  const [dashboardTab, setDashboardTab] = useState<string>('pulse');

  const navigateAdminPage = (page: string, payload?: any) => {
    setCurrentPage(page);
    setSidebarOpen(false);
    setDeepLinkData(payload ? { ...payload, _t: Date.now() } : {});
  };

  // Removed buggy ADMINFIX_FORCE_INVOICES_FROM_URL effects causing navigation lock

  const mainRef = useRef<HTMLElement>(null);

  // CRITICAL: Ensure app always returns to dashboard on logout and clear any stale navigation state
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPage(getInitialPageFromDeepLink());
      // Reset any other transient states if needed
      setEditingInvoiceId(null);
      setDeepLinkData({});
    }
    // Security check: Never persist current page to session/local storage
    localStorage.removeItem('currentPage');
  }, [isAuthenticated]);

  // Keep every authenticated session pinned to the cloud-only mode.
  useEffect(() => {
    if (user && appMode === 'cloud') {
      const email = user.email?.toLowerCase() || '';
      if (AUTHORIZED_EMAILS.includes(email) || AUTHORIZED_PARTNERS.includes(email)) {
        localStorage.setItem('appMode', 'cloud');
      }
    }
  }, [user, appMode]);

  // Reset scroll to top on every page change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [currentPage]);

  const [isAIThinking, setIsAIThinking] = useState(false);
  const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});

  // Removed ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT causing navigation lock

  // Handle push notification deep links:
  // ORD + INV must both open ReportsPage invoices tab and search by full ID.
  // Old /track?tracked_order=... links are also supported.
  useEffect(() => {
    const saved = getInitialPushDeepLink();
    if (!saved) return;

    if (saved?.page === 'whatsapp-support') {
      setDeepLinkData(saved);
      setCurrentPage('whatsapp-support');
      window.history.replaceState({}, '', '/');
      return;
    }

    if (!saved?.search) return;

    setDeepLinkData(saved);
    setCurrentPage('invoices-list');

    window.history.replaceState({}, '', '/');
  }, []);

  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Default to closed on mobile
  const [commandBarOpen, setCommandBarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const closeAllMenus = () => {
    if (isMobile) setSidebarOpen(false);
    setNotifOpen(false);
    setCommandBarOpen(false);
  };

  // Global behavior: Close all menus on page change
  useEffect(() => {
    closeAllMenus();
  }, [currentPage]);

  // Safe cache refresh for major updates.
  // Auto cloud freshness: never let an old browser snapshot override the real cloud database.
  // This clears ONLY browser-side cloud/offline snapshots and app caches; it does not touch Firestore,
  // payments, notifications, AI, invoices, orders, suppliers, or the local accounting backup.
  useEffect(() => {
    const CURRENT_VERSION = '4.0.2-cloud-fresh';
    const previousVersion = localStorage.getItem('app_version');
    if (previousVersion !== CURRENT_VERSION) {
      if ('caches' in window) {
        caches.keys().then(names => {
          for (const name of names) caches.delete(name);
        }).catch(() => {});
      }

      const CLOUD_STALE_KEYS = [
        'ktk_last_cloud_snapshot',
        'ktk_cloud_import_snapshot',
        'ktk_cloud_cache',
        'ktk_cloud_data_cache'
      ];

      CLOUD_STALE_KEYS.forEach(key => {
        try { localStorage.removeItem(key); } catch {}
        try { sessionStorage.removeItem(key); } catch {}
      });

      Object.keys(localStorage).forEach(key => {
        const isTrustedCloudSnapshot =
          key === 'ktk_cloud_offline_snapshot' ||
          key === 'ktk_cloud_offline_snapshot_last_good';
        const shouldRemove =
          key.includes('cloud_offline_snapshot') ||
          key.includes('cloud_snapshot') ||
          key.includes('cloud_cache') ||
          key.includes('last_good_cloud');

        // Do not delete local/demo data or auth/session preferences.
        if (shouldRemove && !isTrustedCloudSnapshot && key !== 'ktk_local_accounting_data' && key !== 'ktk_accounting_data') {
          try { localStorage.removeItem(key); } catch {}
        }
      });

      try { sessionStorage.setItem('alturath_force_fresh_cloud_reload', String(Date.now())); } catch {}
      localStorage.setItem('app_version', CURRENT_VERSION);
    }
  }, []);

  // Auto-logout removed to ensure persistent PWA session


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Close notifications if clicked outside
      if (notifOpen && notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false);
      }
      
      // Close mobile sidebar if clicked outside
      if (isMobile && sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(target)) {
        setSidebarOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen, isMobile, sidebarOpen]);
  
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
      else setSidebarOpen(false);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // In a real app we'd attach a ref for userRole if we wanted to dynamically ignore it, 
      // but let's just keep it toggling. CommandBar itself will render differently if opened by partner.
      // Wait, we can just do this: if we don't want partner to see it at all,
      // But CommandBar is already safe because it only shows partner commands (which currently is just "orders" maybe)
      // Actually, let's just make it do the action.
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandBarOpen(prev => !prev);
      }
      if (e.altKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setCurrentPage('new-invoice');
        setEditingInvoiceId(null);
      }
      if (e.altKey && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setCurrentPage('products');
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
  useEffect(() => {
    if ((sidebarOpen && isMobile) || notifOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [sidebarOpen, isMobile, notifOpen]);

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    invoices: false,
    operations: false,
    brand: false,
    settings: false
  });

  useEffect(() => {
    const invoicePages = new Set(['new-invoice', 'invoices-list', 'customers', 'whatsapp-support']);
    const operationPages = new Set(['products', 'expenses', 'suppliers', 'suppliers-audit']);
    if (invoicePages.has(currentPage)) {
      setExpandedMenus(prev => prev.invoices ? prev : { ...prev, invoices: true, operations: false });
    } else if (operationPages.has(currentPage)) {
      setExpandedMenus(prev => prev.operations ? prev : { ...prev, operations: true, invoices: false });
    }
  }, [currentPage]);
  
  const [data, setRawData] = useState<AppState>(INITIAL_DATA);
  // Keep an immediate, synchronous pointer to the newest accepted state. Firestore shard
  // compression/writes are asynchronous and can outlive the render that started them; this
  // pointer plus the monotonic revision below lets every persistence path reject stale work.
  const latestDataRef = useRef<AppState>(INITIAL_DATA);
  const dataRevisionRef = useRef(0);

  const setData = React.useCallback((valueOrUpdater: AppState | ((prev: AppState) => AppState)) => {
    const currentData = latestDataRef.current;
    const nextData = typeof valueOrUpdater === 'function'
      ? valueOrUpdater(currentData)
      : valueOrUpdater;

    if (!isOnline && isAuthenticated && !isCloudSyncApplyingRef.current) {
      const collections: (keyof AppState)[] = ['orders', 'invoices', 'customers', 'products', 'expenses', 'suppliers', 'settings', 'squads'];
      let isActuallyWrite = false;
      for (const col of collections) {
        if (nextData[col] !== currentData[col]) {
          isActuallyWrite = true;
          break;
        }
      }

      if (isActuallyWrite) {
        toast.error("يتعذر التعديل دون اتصال ⚠️", {
          description: "تم حجب النظام بالكامل لأن الاتصال بالسحابة غير موثّق. لا يمكن إدخال أو تعديل أي معلومة.",
          position: 'bottom-right',
          className: 'arabic-font',
          duration: 4000
        });
        return;
      }
    }

    if (nextData === currentData) return;
    latestDataRef.current = nextData;
    dataRevisionRef.current += 1;
    setRawData(nextData);
  }, [isOnline, isAuthenticated]);
  const visibleNotifications = useMemo(
    () => getVisibleAdminNotifications(data?.notifications || []),
    [data?.notifications]
  );
  const hasUnreadVisibleNotifications = useMemo(
    () => visibleNotifications.some(n => !isNotificationReadForUi(n)),
    [visibleNotifications]
  );

  useLiveFaviconStatus({
    enabled: isAuthenticated,
    syncing: authLoading || dataLoading || activePersistenceWrites > 0,
    attention: !isOnline || hasUnreadVisibleNotifications,
  });
  const [hasRunMigration, setHasRunMigration] = useState(false);

  // MIGRATION: Ensure old orders have the correct customer names matching the DB.
  // Important: do not synthesize or overwrite squads from customer records.
  // Diwaniya data must come only from the shared Firestore `squads` collection via /api/admin-dashboard-data.
  useEffect(() => {
     if (data?.orders && data?.customers && hasLoadedDataRef.current && !hasRunMigration) {
        let migrationNeeded = false;
        // Pre-index customers by id and phone to avoid an O(orders × customers) scan
        // (.find inside .map). Same matching logic, just constant-time lookups.
        const customersForIndex = data.customers || [];
        const custById = new Map(customersForIndex.map(c => [c.id, c] as const));
        const custByPhone = new Map(customersForIndex.map(c => [c.phone, c] as const));
        const normalizedOrders = data.orders.map(o => {
            let correctName = o.customerName;
            if (o.customerId) {
                const c = custById.get(o.customerId);
                if (c && c.name && c.name !== o.customerName) { correctName = c.name; }
            } else if (o.customerPhone) {
                const c = custByPhone.get(o.customerPhone);
                if (c && c.name && c.name !== o.customerName) { correctName = c.name; }
            }
            if (correctName && correctName !== o.customerName) {
                migrationNeeded = true;
                return { ...o, customerName: correctName };
            }
            return o;
        });
        if (migrationNeeded) {
            setData(prev => ({ ...prev, orders: normalizedOrders }));
            console.log("Migration executed: updated old order customer names.");
        }
        setHasRunMigration(true);
     }
  }, [data?.orders, data?.customers, hasRunMigration]);
  
  // AUTO SYNC BACKGROUND EFFECT FOR PAYMENTS
  const dataRef = useRef<AppState>(data);
  const pendingPaymentCheckRef = useRef<Record<string, number>>({});
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (!isAuthenticated || dataLoading || !isOnline) return;
    
    const checkPendingPayments = async () => {
      if (!isOnline) return;
      const currentData = dataRef.current;
      const allPendingInvoices = (currentData.invoices || []).filter((i: any) => {
        if (!i || i.isDeleted) return false;
        const paymentStatus = String(i.paymentStatus || i.payment_status || '').toLowerCase();
        if (paymentStatus.includes('cancel')) return false;
        return !isPaidStatus(i.paymentStatus) && !isPaidStatus(i.status);
      });
      if (allPendingInvoices.length === 0) return;

      const nowMs = Date.now();
      const pendingInvoices = allPendingInvoices.filter((inv: any) => {
        const id = String(inv.id || inv.invoiceId || inv.invoiceNo || '');
        if (!id) return false;
        const lastCheckedAt = pendingPaymentCheckRef.current[id] || 0;
        return nowMs - lastCheckedAt > 10000;
      }).slice(0, 12);
      if (pendingInvoices.length === 0) return;
      
      let paidCount = 0;
      let failedCount = 0;
      const updatedInvoices = [...(currentData.invoices || [])];
      const updatedOrders = currentData.orders ? [...currentData.orders] : [];

      for (const inv of pendingInvoices as any[]) {
        const invoiceId = String(inv.id || inv.invoiceId || inv.invoiceNo || '').trim();
        if (!invoiceId) continue;
        pendingPaymentCheckRef.current[invoiceId] = Date.now();

        try {
          const payload = {
            invoiceId,
            paymentId: inv.paymentId || inv.payment_id || '',
            payment_id: inv.payment_id || inv.paymentId || '',
            trackId: inv.trackId || inv.track_id || inv.paymentTrackId || '',
            track_id: inv.track_id || inv.trackId || inv.paymentTrackId || '',
            gatewayOrderId: inv.gatewayOrderId || inv.gateway_order_id || inv.merchantOrderId || '',
            gateway_order_id: inv.gateway_order_id || inv.gatewayOrderId || inv.merchantOrderId || '',
            paymentLink: inv.paymentLink || inv.paymentUrl || inv.paymentURL || inv.payment_url || '',
          };

          let verified = false;
          let failed = false;
          let verificationData: any = null;

	          const res = await fetch('/api/invoice/confirm', {
	            method: 'POST',
	            cache: 'no-store',
	            signal: AbortSignal.timeout(10000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) {
            verificationData = await res.json();
            if (verificationData.success && verificationData.verified) {
              verified = true;
            } else if (verificationData.success && verificationData.state === 'failed') {
              failed = true;
            }
          }

          if (!verified && !failed) {
             // Fallback: Check if the global Firestore document was updated by return/webhook sync.
             try {
                 const docSnap = await getDocFromServer(doc(db, 'invoices', invoiceId));
                 if (docSnap.exists()) {
                   const remoteData: any = docSnap.data();
                   if (isPaidStatus(remoteData.paymentStatus) || isPaidStatus(remoteData.status)) {
                      verified = true;
                      verificationData = { ...(verificationData || {}), paymentId: remoteData.paymentId || remoteData.payment_id };
                   }
                 }
             } catch(e) {}
          }

          if (verified) {
            const paidAt = new Date().toISOString();
            const paymentIdFromGateway =
              verificationData?.paymentId ||
              verificationData?.transaction?.payment_id ||
              verificationData?.transaction?.track_id ||
              inv.paymentId ||
              inv.payment_id ||
              '';
            const iIdx = updatedInvoices.findIndex((i: any) => String(i.id || i.invoiceId || i.invoiceNo) === invoiceId);
            if (iIdx !== -1 && !isPaidStatus((updatedInvoices[iIdx] as any).paymentStatus)) {
              updatedInvoices[iIdx] = {
                ...updatedInvoices[iIdx],
                paymentStatus: 'paid',
                payment_status: 'paid',
                status: 'تم الدفع بنجاح',
                paymentMethod: (updatedInvoices[iIdx] as any).paymentMethod || 'KNet',
                paymentId: paymentIdFromGateway || (updatedInvoices[iIdx] as any).paymentId,
                payment_id: paymentIdFromGateway || (updatedInvoices[iIdx] as any).payment_id,
                paid: true,
                failed: false,
                canPay: false,
                paidAt: (updatedInvoices[iIdx] as any).paidAt || paidAt,
                paymentUpdatedAt: paidAt,
                lastGatewaySyncSource: 'admin-auto-reconcile',
              } as any;
              paidCount++;
            }

            updatedOrders.forEach((order: any, idx: number) => {
              const linkedId = String(order.linkedInvoiceId || order.invoiceId || order.invoiceNo || '');
              if (linkedId === invoiceId && !isPaidStatus(order.paymentStatus) && !isPaidStatus(order.status)) {
                updatedOrders[idx] = {
                  ...order,
                  status: 'تم الدفع بنجاح',
                  paymentStatus: 'paid',
                  payment_status: 'paid',
                  paymentMethod: order.paymentMethod || 'KNet',
                  paymentId: paymentIdFromGateway || order.paymentId,
                  payment_id: paymentIdFromGateway || order.payment_id,
                  paid: true,
                  failed: false,
                  canPay: false,
                  paymentUpdatedAt: paidAt,
                  lastGatewaySyncSource: 'admin-auto-reconcile',
                } as any;
              }
            });
          } else if (failed) {
            const failedAt = new Date().toISOString();
            const iIdx = updatedInvoices.findIndex((i: any) => String(i.id || i.invoiceId || i.invoiceNo) === invoiceId);
            if (iIdx !== -1 && !isPaidStatus((updatedInvoices[iIdx] as any).paymentStatus)) {
              updatedInvoices[iIdx] = {
                ...updatedInvoices[iIdx],
                paymentStatus: 'failed',
                payment_status: 'failed',
                status: 'فشلت عملية الدفع',
                failed: true,
                paid: false,
                canPay: true,
                failedAt,
                paymentUpdatedAt: failedAt,
                lastGatewaySyncSource: 'admin-auto-reconcile',
              } as any;
              failedCount++;
            }
          }
        } catch (e) {
          // A payment lookup failure must never create an offline working mode.
          // Verify the cloud immediately; if Firestore/server is unavailable, lock the UI.
          const healthy = await probeCloudConnection(false);
          if (!healthy) {
            setIsOnline(false);
            hasLoadedDataRef.current = false;
            break;
          }
        }
      }

      if (paidCount > 0 || failedCount > 0) {
        setData(prev => {
          const paidInvoiceIds = new Set(updatedInvoices.filter((inv: any) => isPaidStatus(inv.paymentStatus) || isPaidStatus(inv.status)).map((inv: any) => String(inv.id || inv.invoiceId || inv.invoiceNo)));
          const failedInvoiceIds = new Set(updatedInvoices.filter((inv: any) => String(inv.paymentStatus || inv.payment_status || '').toLowerCase() === 'failed').map((inv: any) => String(inv.id || inv.invoiceId || inv.invoiceNo)));

          const nextInvoices = prev.invoices.map((inv: any) => {
             const u = updatedInvoices.find((ui: any) => String(ui.id || ui.invoiceId || ui.invoiceNo) === String(inv.id || inv.invoiceId || inv.invoiceNo));
             if (!u) return inv;
             if (paidInvoiceIds.has(String(inv.id || inv.invoiceId || inv.invoiceNo))) return { ...inv, ...u };
             if (failedInvoiceIds.has(String(inv.id || inv.invoiceId || inv.invoiceNo))) return { ...inv, ...u };
             return inv;
          }) as any;
          const nextOrders = (prev.orders || []).map((o: any) => {
             const u = updatedOrders.find((uo: any) => String(uo.id) === String(o.id));
             if (u && (isPaidStatus(u.paymentStatus) || isPaidStatus(u.status) || String(u.paymentStatus || (u as any).payment_status || '').toLowerCase() === 'failed')) return { ...o, ...u };
             return o;
          }) as any;
          return { ...prev, invoices: nextInvoices, orders: nextOrders };
        });
        if (paidCount > 0) toast.success(`تمت مطابقة ${paidCount} فاتورة مدفوعة تلقائياً ✅`);
      }
    };

    const intervalId = setInterval(checkPendingPayments, 8000);
    // Also run once shortly after mount/auth.
    const timeoutId = setTimeout(checkPendingPayments, 800);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, dataLoading, isOnline, probeCloudConnection]);
  
  // PWA Install Prompt Logic
  /* Removed PWA Install Prompt Logic in favor of Login component implementation */


  useEffect(() => {
    if (dataLoading) return;

    // Debounce the alert generation to once per 20 seconds to avoid CPU spikes
    const debounceTimer = setTimeout(() => {
      const newNotifications: AdminNotification[] = [];
      const todayStr = new Date().toISOString().split('T')[0];
      const now = new Date().getTime();
      const oneDayMs = 24 * 60 * 60 * 1000;
      const sevenDaysMs = 7 * oneDayMs;

      // Helper to get invoices between
      const getInvoicesBetween = (startMs: number, endMs: number) => {
          return (data.invoices || []).filter(inv => {
              if (inv.isDeleted) return false;
              const time = new Date(inv.date).getTime();
              return time >= startMs && time <= endMs;
          });
      }

    // --- NEW STRICT DATA-DRIVEN ALERTS ---

    // 1. Sales Trend Analysis
    const last7DaysInvoices = getInvoicesBetween(now - sevenDaysMs, now);
    const previous7DaysInvoices = getInvoicesBetween(now - 2 * sevenDaysMs, now - sevenDaysMs);
    
    const last7DaysTotal = last7DaysInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const prev7DaysTotal = previous7DaysInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // Only alert if we have enough data to be meaningful (at least 5 orders in previous week)
    if (previous7DaysInvoices.length >= 5) {
        if (last7DaysTotal < prev7DaysTotal * 0.8) { // 20% drop
            const dropPercent = (((prev7DaysTotal - last7DaysTotal) / prev7DaysTotal) * 100).toFixed(0);
            newNotifications.push({
                id: `sales-drop-${todayStr}`, // one alert per day for this
                title: 'تراجع ملحوظ في المبيعات',
                message: `رصدنا انخفاض بنسبة ${dropPercent}% في مبيعات آخر 7 أيام مقارنة بالأسبوع الذي قبله.`,
                type: 'warning',
                insightType: 'خطر',
                explanation: `إجمالي مبيعات الأسبوع الحالي (${last7DaysTotal.toFixed(3)} د.ك) يقل بشكل خطير وملحوظ عن إجمالي الأسبوع السابق (${prev7DaysTotal.toFixed(3)} د.ك). هذا الانخفاض الحاد قد يعود لأسباب تسويقية أو تشغيلية.`,
                dataReference: `تحليل لعدد ${last7DaysInvoices.length + previous7DaysInvoices.length} فواتير مسجلة خلال آخر 14 يوم فعلية.`,
                recommendedAction: 'نقترح إطلاق عرض مؤقت فوراً، أو التواصل مع قائمة عملاء VIP لتحفيزهم على الطلب باستخدام (مختبر الحملات التسويقية).',
                date: new Date().toISOString(),
                read: false,
                isPopupShown: false
            });
        }
    }

    // 2. Trending Product Opportunity
    if (last7DaysInvoices.length > 0) {
        const productSalesLast7Days: Record<string, number> = {};
        last7DaysInvoices.forEach(inv => {
            (inv.items || []).forEach(item => {
                productSalesLast7Days[item.productId] = (productSalesLast7Days[item.productId] || 0) + item.quantity;
            });
        });

        let topProductId = '';
        let topProductQty = 0;
        Object.entries(productSalesLast7Days).forEach(([id, qty]) => {
            if (qty > topProductQty) {
                topProductQty = qty;
                topProductId = id;
            }
        });

        if (topProductQty >= 3) {
             const topProduct = (data.products || []).find(p => p.id === topProductId);
             if (topProduct) {
                 newNotifications.push({
                    id: `trend-prod-${topProduct.id}-${todayStr}`,
                    title: `صعود قوي لمنتج: ${topProduct.name}`,
                    message: `لاحظنا اهتمام متزايد بطلب هذا المنتج بشكل مفاجئ.`,
                    type: 'success',
                    insightType: 'فرصة',
                    explanation: `الصنف المسمى بـ (${topProduct.name}) يسجل وتيرة طلب عالية وغير معتادة في الأيام الأخيرة، مما يدل على قبوله اللافت من الشريحة المستهدفة.`,
                    dataReference: `قراءة لبيانات ${last7DaysInvoices.length} فواتير بيع، أظهرت بيع ${topProductQty} قطعة خلال آخر 7 أيام.`,
                    recommendedAction: `زيادة نشر محتوى تسويقي عن الصنف لرفع المبيعات كلياً، مع التوصية بمخاطبة المورد المسؤول (${(data.suppliers || []).find(s => s.id === topProduct.supplierId)?.name || 'المورد'}) لزيادة التوريد وتفادي نفاد المخزون.`,
                    date: new Date().toISOString(),
                    read: false,
                    isPopupShown: false
                 });
             }
        }
    }

    // 3. Supplier Balance Alert (Risk)
    (data.suppliers || []).forEach(supp => {
        const balance = supp.balance || 0;
        if (balance > 1500) {
            newNotifications.push({
                id: `sup-bal-${supp.id}-${todayStr}`,
                title: `تجاوز مديونية المورد: ${supp.name}`,
                message: `تراكم الأرصدة المستحقة قد يؤثر على سلاسل الإمداد.`,
                type: 'warning',
                insightType: 'تنبيه',
                explanation: `استمرار تراكم المديونية للمورد ${supp.name} دون سداد قد يؤدي إلى انقطاع المواد الخام أو تغيير شروط التوريد المتفق عليها.`,
                dataReference: `رصيد المورد الحالي لدى النظام تجاوز الحد الآمن (الرصيد الفعلي: ${balance.toFixed(3)} د.ك).`,
                recommendedAction: 'مراجعة خوارزمية التدفق النقدي وجدولة دفعات فورية أو جزئية للمورد للحفاظ على علاقة العمل المستقرة.',
                date: new Date().toISOString(),
                read: false,
                isPopupShown: false
            });
        }
    });

    // 4. VIP Customer Churn (Risk)
    const thirtyDaysAgoMs = now - (30 * 24 * 60 * 60 * 1000);
    (data.customers || []).forEach(cust => {
        if ((cust.totalOrders || 0) > 5 && (cust.totalSpent || 0) > 150) {
            const lastActive = cust.lastActive ? new Date(cust.lastActive).getTime() : 0;
            if (lastActive > 0 && lastActive < thirtyDaysAgoMs) {
                 newNotifications.push({
                    id: `vip-churn-${cust.id}-${todayStr}`,
                    title: `خطر فقدان عميل VIP: ${cust.name}`,
                    message: `العميل ذو القيمة العالية توقف عن الطلب فجأة.`,
                    type: 'warning',
                    insightType: 'خطر',
                    explanation: `هذا العميل (إجمالي مشترياته ${cust.totalSpent.toFixed(3)} د.ك) اختفى ولم يجرِ أي عملية تسوق رغم أنه كان معتاداً على الطلب المتكرر.`,
                    dataReference: `قاعدة بيانات العملاء توضح أن آخر طلب لهذا الـVIP كان بتاريخ ${formatKuwaitiDateOnly(cust.lastActive!)}.`,
                    recommendedAction: 'توليد رسالة استعادة فورية عبر الواتساب وتقديم خصم شخصي له باستخدام لوحة (نخبة VIP الغائبين).',
                    date: new Date().toISOString(),
                    read: false,
                    isPopupShown: false
                });
            }
        }
    });

    // --- RESTORED ORIGINAL ALERTS (Enhanced with Smart UI) ---

    // 5. Supplier Bio-feedback (QC)
    (data?.suppliers || []).forEach(supp => {
        const itemsFromSupplier = (data?.products || []).filter(p => p.supplierId === supp.id).map(p => p.name);
        const feedback = (data?.testimonials || []).filter(t => 
            t.rating <= 3 && itemsFromSupplier.some(itemName => (t.content || '').includes(itemName))
        );

        if (feedback.length > 0) {
            newNotifications.push({
                id: `supp-bio-${supp.id}-${todayStr}`,
                title: `رادار جودة المورد: ${supp.name} 🛰️`,
                message: `ملاحظات جودة متكررة على أصناف هذا المورد!`,
                type: "warning",
                insightType: 'تنبيه',
                explanation: `العملاء يشتكون أو يضعون تقييماً منخفضاً بسبب أصناف تُورّد مباشرة من (${supp.name}). التأخير في التدخل قد يضر بسمعة المطعم.`,
                dataReference: `ارتباط مسجل بين ${feedback.length} تعليقات سلبية و منتجات تابعة للمورد.`,
                recommendedAction: `التواصل الفوري مع المورد ومراجعة الشحنة الأخيرة لضمان معايير الجودة.`,
                date: new Date().toISOString(),
                read: false,
                isPopupShown: false
            });
        }
    });

    // 6. High Demand Forecasting (Order Volume Prediction)
    const todayOrdersCount = (data?.invoices || []).filter(inv => (inv.date || '').startsWith(todayStr)).length;
    if (todayOrdersCount > 15) { 
         newNotifications.push({
            id: `vol-fore-${todayStr}`,
            title: "تنبؤ حجم الطلب 📈",
            message: `حجم الطلبات اليوم استثنائي!`,
            type: "info",
            insightType: 'فرصة',
            explanation: `الطلبات تتوافد بشكل أسرع من المعتاد، مما قد يسبب اختناقاً في المطبخ أو تأخيراً في التوصيل إذا لم تتم إدارة السعة.`,
            dataReference: `تم تسجيل ${todayOrdersCount} طلب حتى الآن في نظام الكاشير.`,
            recommendedAction: `تخصيص سيارات توصيل إضافية لفترة الذروة وتنبيه طاقم المطبخ للاستعداد المفرط.`,
            date: new Date().toISOString(),
            read: false,
            isPopupShown: false
        });
    }

    // 7. Emotional Loyalty Engine
    (data?.testimonials || []).forEach(t => {
        const keywords = ['تبارك الرحمن', 'حب كبير', 'بيض الله وجهكم', 'ناطع', 'عجيب', 'قوي', 'لذيذ', 'ولا غلطة', 'يبرد الجبد', 'من الآخر'];
        const isEmotional = keywords.some(k => (t.content || '').includes(k));
        if (isEmotional && t.rating >= 4) {
             newNotifications.push({
                id: `emotion-loyalty-${t.id}`,
                title: "سفير براند مكتشف! 💖",
                message: `هذا العميل (${t.customerName}) يعتبر سفيراً للبراند بناءً على نبرته.`,
                type: "success",
                insightType: 'فرصة',
                explanation: `قام العميل بالتعبير عن سعادة غامرة تفوق التقييم التقليدي العابر. استثمار هذه الملاحظة الإيجابية (مثل: "${t.content}") يبني ارتباطاً لا يُنسى بالمطعم.`,
                dataReference: `كلمات العميل في التقييم تضمنت تفاعلاً عاطفياً عالياً بلهجة كويتية أصيلة.`,
                recommendedAction: `إرسال "نقصة" (هدية بسيطة) أو رسالة شكر استثنائية مع طلبه القادم لجعله يعود مراراً وتكراراً.`,
                date: new Date().toISOString(),
                read: false,
                isPopupShown: false
            });
        }
    });

    // 8. Contextual Smart Adjustments (Replaces random math with data checks if needed, but keeping original logic context if required)
    // Actually skipping the mock random weather logic as requested not to have fake alerts. 
    // We already restored all the REAL data-driven logic from the old file.

    // 9. Profit Guard: High Supply Cost Detection (Security Radar) - DISABLED as requested
    /*
    (data.products || []).forEach(prod => {
      const margin = prod.price > 0 ? (prod.price - prod.cost) / prod.price : 0;
      if (margin < 0.2) { // Less than 20% margin is risky
          const supplier = (data.suppliers || []).find(s => s.id === prod.supplierId);
          newNotifications.push({
              id: `profit-guard-alert-${prod.id}-${todayStr}`,
              title: `درع الربح: تكلفة ${prod.name} مرتفعة 🛡️`,
              message: `هامش الربح تقلص إلى ${(margin * 100).toFixed(0)}%.`,
              type: 'warning',
              insightType: 'خطر',
              explanation: `رصد نظام (Profit Guard) أن تكلفة توريد "${prod.name}" من المورد (${supplier?.name || 'غير معروف'}) مرتفعة جداً مقارنة بسعر البيع، مما يهدد استدامة هذا الصنف.`,
              dataReference: `سعر البيع: ${prod.price.toFixed(3)} د.ك | التكلفة: ${prod.cost.toFixed(3)} د.ك.`,
              recommendedAction: 'نقترح مراجعة المورد للتفاوض أو رفع سعر البيع بـ 200 فلس على الأقل لاستعادة التوازن المالي.',
              date: new Date().toISOString(),
              read: false,
              isPopupShown: false
          });
      }
    });
    */

    // 11. Final update
    if (newNotifications.length > 0) {
        setData(prev => {
           let hasAdded = false;
           let hasUpdates = false;
           
           // Ensure existing memory notifications are in sync with localStorage read IDs
           const updatedNotifs = (prev?.notifications || []).map(n => {
               if (isNotificationReadForUi(n) && !n.read) {
                   hasUpdates = true;
                   return { ...n, read: true };
               }
               return n;
           });
           
           newNotifications.forEach(newNotif => {
               const notificationToStore = isNotificationReadForUi(newNotif) ? { ...newNotif, read: true } : newNotif;
               if (!updatedNotifs.some(n => n.id === newNotif.id)) {
                   updatedNotifs.push(notificationToStore);
                   hasAdded = true;
                   
                   // Real-time toast for high-priority Profit Guard alert
                   if (newNotif.id.startsWith('profit-guard-alert')) {
                      toast.warning(newNotif.title, {
                        description: newNotif.message,
                        position: 'top-center'
                      });
                   }
               }
           });
           
           if (!hasAdded && !hasUpdates) return prev;
           return { ...prev, notifications: updatedNotifs };
        });
    }
    }, 20000); // 20 second debounce — alerts are non-urgent, heavy computation deferred

    return () => clearTimeout(debounceTimer);
  }, [dataLoading, data.invoices, data.suppliers, data.customers, data.products, data.testimonials]);

  const addToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    if (type === 'success') {
      playSuccessAction();
    }
    const toastFn = type === 'success' ? toast.success : type === 'warning' ? toast.warning : toast.info;
    toastFn(title, {
      description: message,
      position: 'bottom-right',
      className: 'arabic-font',
    });
  };

  const pendingOrdersCount = (data.orders || []).filter(o => isPendingStatus(o.status as string)).length;

  useEffect(() => {
    let soundInterval: NodeJS.Timeout | null = null;

    if (pendingOrdersCount > 0) {
      if (isSoundEnabled) {
        playNewOrderAlert();
        soundInterval = setInterval(playNewOrderAlert, 3000);
      }

      toast.success(
        <div className="flex items-center gap-2" dir="rtl">
          <span>يوجد لديك {pendingOrdersCount} طلب</span>
          <span className="animate-pulse text-violet-500 font-extrabold text-lg">بانتظار الدفع</span>
          <span>🔔</span>
        </div>, {
        id: 'persistent-new-orders',
        duration: 3000, // Show for 3s to sync with sound
        style: {
           background: '#fff',
           color: '#0f172a',
           fontWeight: 'bold',
           fontSize: '16px',
           border: '2px solid #5eead4',
           boxShadow: '0 10px 25px -5px rgba(20, 184, 166, 0.2)'
        }
      });
    } else {
      toast.dismiss('persistent-new-orders');
    }
    
    return () => {
      if (soundInterval) clearInterval(soundInterval);
    };
  }, [pendingOrdersCount, isSoundEnabled]);

  const [authError, setAuthError] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<string | null>(null);

  const switchMode = (newMode: 'local' | 'cloud') => {
    if (newMode === 'local') {
      toast.info('النظام سحابي فقط', {
        description: 'تم إلغاء التخزين المحلي نهائياً لحماية البيانات ومنع ظهور نسخ قديمة.',
        position: 'bottom-right',
        className: 'arabic-font',
      });
      return;
    }
    setAppMode('cloud');
    localStorage.setItem('appMode', 'cloud');
    void probeCloudConnection(false);
  };

  const [showTopButton, setShowTopButton] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      const scrolled = mainElement.scrollTop;
      const maxScroll = Math.max(0, mainElement.scrollHeight - mainElement.clientHeight);
      const progress = maxScroll > 0
        ? Math.min(100, Math.max(0, (scrolled / maxScroll) * 100))
        : 0;
      const longPageThreshold = Math.max(520, mainElement.clientHeight * 0.75);
      const isLongPage = maxScroll >= longPageThreshold;

      setScrollProgress(progress);
      setShowTopButton(isLongPage && scrolled > 200);
    };

    handleScroll();

    mainElement.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(handleScroll);
      resizeObserver.observe(mainElement);
    }

    return () => {
      mainElement.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      resizeObserver?.disconnect();
    };
  }, [currentPage, dashboardTab]);

  const scrollProgressCircle = 138.23;
  const scrollProgressOffset = scrollProgressCircle - (scrollProgress / 100) * scrollProgressCircle;

  const handleManualSync = async () => {
    if (!user || !isOnline) {
      setIsOnline(false);
      return;
    }
    setDataLoading(true);
    try {
      const rootDataRef = getSmartDoc('appData', user.uid, user.email);
      const splitData = splitProductsForDatabase(data);
      
      const rootDocData: any = { ...splitData };
      const generationId = getAdminDataGenerationId();
      const rootDocDataWithMeta = withAuthoritativeSharedMeta(rootDocData, generationId);
      const shardedPayloads: Record<string, any> = {};
      
      SHARDED_KEYS.forEach(key => {
        if (rootDocDataWithMeta[key]) {
          shardedPayloads[key] = rootDocDataWithMeta[key];
          rootDocDataWithMeta[key] = []; 
        }
      });
      
      const rootForStudioAndApp = withGoogleStudioRootMirror(rootDocDataWithMeta, splitData);
      const sanitizedRoot = makeFirestoreSafeRootDocument(rootForStudioAndApp);
      await preserveProtectedRootKeys(sanitizedRoot, rootDataRef);
      const preparedShardPlans: Record<string, Awaited<ReturnType<typeof buildLogicalShardWritePlan>>> = {};
      
      await seedShardBaselineBeforeBlank(user.uid, user.email, shardedPayloads);
      for (const key of SHARDED_KEYS) {
	         if (shardedPayloads[key]) {
            if (isDangerousEmptyOverwrite(key, shardedPayloads[key])) continue;
            preparedShardPlans[key] = await buildLogicalShardWritePlan(key, shardedPayloads[key], {
              __adminDataGenerationId: generationId,
              __adminLastAuthoritativeWriteAt: new Date().toISOString(),
            });
         }
      }

      const shardSavePromises: Promise<any>[] = [];
      for (const key of Object.keys(preparedShardPlans)) {
        shardSavePromises.push(enqueuePersistenceWrite(`shard:${key}`, async () => {
          await commitLogicalShardWritePlan(user.uid, user.email, preparedShardPlans[key]);
        }));
      }

      // Publish the root generation only after every logical shard is safely committed.
      await Promise.all(shardSavePromises);
      await enqueuePersistenceWrite('root', async () => {
        await setDoc(rootDataRef, sanitizedRoot, { merge: true });
      });
      addToast("تمت المزامنة ✨", "تم حفظ كافة البيانات في السحابة بنجاح.", "success");
    } catch (err) {
      console.error(err);
      setIsOnline(false);
      addToast("تم إيقاف النظام", "فُقد الاتصال بالسحابة أثناء الحفظ. لم نسمح بمتابعة العمل.", "warning");
    } finally {
      setDataLoading(false);
    }
  };

// Removed the problematic JSON.stringify call for the defunct isSyncEnabled state.

  // Strictly prevent saving before we have loaded data
  const hasLoadedDataRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const cloudRootExistsRef = useRef(false);
  const loadedCloudShardKeysRef = useRef<Set<string>>(new Set());
  const isCloudSyncApplyingRef = useRef(false);
  const lastRemoteKeysRef = useRef<Record<string, string>>({});
  const authoritativeDataWrittenAtRef = useRef<number>(0);
  const lastFinancialFastSaveRef = useRef<Record<'expenses' | 'supplierTransfers', string | null>>({
    expenses: null,
    supplierTransfers: null,
  });
  const financialFastSaveContextRef = useRef('');
  const persistenceWriteChainsRef = useRef<Record<string, Promise<void>>>({});

  const enqueuePersistenceWrite = (key: string, task: () => Promise<void>): Promise<void> => {
    if (!isOnline) {
      return Promise.reject(new Error('CLOUD_CONNECTION_REQUIRED'));
    }
    const previous = persistenceWriteChainsRef.current[key] || Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      if (!isOnline) throw new Error('CLOUD_CONNECTION_REQUIRED');
      setActivePersistenceWrites(count => count + 1);
      try {
        await task();
      } catch (error) {
        setIsOnline(false);
        throw error;
      } finally {
        setActivePersistenceWrites(count => Math.max(0, count - 1));
      }
    });
    persistenceWriteChainsRef.current[key] = next;
    next.finally(() => {
      if (persistenceWriteChainsRef.current[key] === next) {
        delete persistenceWriteChainsRef.current[key];
      }
    }).catch(() => {});
    return next;
  };

  const SHARDED_KEYS = ['invoices', 'orders', 'customers', 'expenses', 'testimonials', 'products', 'supplierCopies', 'supplierTransfers', 'pulseAnalysisHistory', 'pulseReviews', 'campaigns', 'squads', 'promocodes', 'aiLearningMemory', 'pulseArchiveAnalysis', 'deepArchiveAnalysis', 'nameMatchMemory'];
  const BOOT_DEFERRED_SHARDED_KEYS = ['testimonials', 'campaigns', 'pulseAnalysisHistory', 'pulseReviews', 'aiLearningMemory', 'pulseArchiveAnalysis', 'deepArchiveAnalysis', 'nameMatchMemory'];

  // Google/Looker Studio was originally reading the root appData/shared_company_data document.
  // The app now uses shards for speed and to avoid Firestore document-size limits, but Studio
  // still needs recent business rows in the root document. Keep a safe, uncompressed mirror
  // there while the authoritative full data stays in shards.
  const GOOGLE_STUDIO_ROOT_MIRROR_LIMITS: Record<string, number> = {
    orders: 300,
    invoices: 300,
    customers: 500,
    expenses: 400,
    testimonials: 200,
    supplierCopies: 300,
    campaigns: 200,
    promocodes: 200,
    products: 200,
    supplierTransfers: 500,
    squads: 200,
  };

  const sortForStudioMirror = (key: string, rows: any[]) => {
    if (!Array.isArray(rows)) return [];
    return [...rows].sort((a: any, b: any) => {
      const bt = getRecordTime(b);
      const at = getRecordTime(a);
      if (bt !== at) return bt - at;
      const bid = String(b?.id || b?.orderId || b?.invoiceNo || '');
      const aid = String(a?.id || a?.orderId || a?.invoiceNo || '');
      return bid.localeCompare(aid);
    });
  };

  const makeGoogleStudioMirrorValue = (key: string, value: any) => {
    if (!Array.isArray(value)) return value;
    const limit = GOOGLE_STUDIO_ROOT_MIRROR_LIMITS[key];
    if (!limit) return [];
    return sortForStudioMirror(key, value).slice(0, limit);
  };

  const withGoogleStudioRootMirror = (rootValue: any, fullValue: any) => {
    const mirrored = { ...rootValue };
    SHARDED_KEYS.forEach(key => {
      if (fullValue[key] !== undefined) {
        mirrored[key] = makeGoogleStudioMirrorValue(key, fullValue[key]);
      }
    });
    mirrored.__googleStudioMirrorAt = new Date().toISOString();
    mirrored.__googleStudioMirrorNote = 'Recent business rows are mirrored here for Google/Looker Studio. Full authoritative data remains in shards.';
    return mirrored;
  };

  const getFirestoreDocumentByteSize = (value: any): number => {
    try {
      return new TextEncoder().encode(JSON.stringify(value)).length;
    } catch {
      return JSON.stringify(value || {}).length;
    }
  };

  // Firestore has a strict 1 MiB limit per document. The root document is only a
  // lightweight mirror for Firebase/Google viewing; full authoritative data is in shards.
  const makeFirestoreSafeRootDocument = (rootValue: any) => {
    const safe = JSON.parse(JSON.stringify(rootValue || {}));
    const maxBytes = 900000;
    const shrinkableKeys = ['orders', 'invoices', 'customers', 'expenses', 'supplierCopies', 'supplierTransfers', 'testimonials', 'campaigns', 'promocodes', 'products', 'squads'];

    let guard = 0;
    while (getFirestoreDocumentByteSize(safe) > maxBytes && guard < 80) {
      const largestKey = shrinkableKeys
        .filter(key => Array.isArray(safe[key]) && safe[key].length > 0)
        .sort((a, b) => JSON.stringify(safe[b] || []).length - JSON.stringify(safe[a] || []).length)[0];

      if (!largestKey) break;

      const current = safe[largestKey];
      const nextLength = current.length > 20 ? Math.ceil(current.length * 0.65) : Math.max(0, current.length - 5);
      safe[largestKey] = current.slice(0, nextLength);
      guard += 1;
    }

    safe.__rootMirrorByteSize = getFirestoreDocumentByteSize(safe);
    safe.__rootMirrorLimited = getFirestoreDocumentByteSize(safe) > maxBytes ? 'true' : 'false';
    safe.__rootMirrorSafetyNote = 'Root document is capped under Firestore 1MiB. Full authoritative imported data is stored in shards.';
    return safe;
  };
  
  const stableStringify = (obj: any): string => {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return `[${obj.map(item => stableStringify(item)).join(',')}]`;
    }
    const keys = Object.keys(obj).sort();
    const res = keys.map(k => `${JSON.stringify(k)}:${stableStringify(obj[k])}`);
    return `{${res.join(',')}}`;
  };

  const hasMeaningfulValue = (value: any) => {
    if (Array.isArray(value)) return value.length > 0;
    if (value && typeof value === 'object') return Object.keys(value).length > 0;
    return value !== undefined && value !== null && value !== '';
  };

  const getAdminDataGenerationId = (rotate = false) => {
    const key = 'ktk_admin_data_generation_id';
    try {
      const current = localStorage.getItem(key);
      if (!rotate && current) return current;
      const next = `admin-data-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(key, next);
      return next;
    } catch {
      return `admin-data-${Date.now()}`;
    }
  };

  const withAuthoritativeSharedMeta = (value: any, generationId = getAdminDataGenerationId()) => ({
    ...value,
    __adminDataGenerationId: generationId,
    __adminLastAuthoritativeWriteAt: new Date().toISOString(),
  });

  const getRecordTime = (item: any) => {
    const raw = item?.updatedAt || item?.createdAt || item?.date || item?.orderDate || item?.timestamp;
    if (!raw) return 0;
    if (typeof raw?.toDate === 'function') return raw.toDate().getTime();
    if (typeof raw === 'number') return raw;
    const parsed = new Date(raw).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const parseStoredState = (raw: string | null): AppState | null => {
    if (!raw) return null;
    try {
      const parsed = joinProductsFromDatabase(JSON.parse(raw));
      return hasMeaningfulData(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const isDangerousEmptyOverwrite = (key: string, currentVal: any) => {
    if (!Array.isArray(currentVal) || currentVal.length > 0) return false;
    const lastSerialized = lastRemoteKeysRef.current[key];
    if (!lastSerialized) return false;
    try {
      const previousVal = JSON.parse(lastSerialized);
      return Array.isArray(previousVal) && previousVal.length > 0;
    } catch {
      return false;
    }
  };

  // ===== DATA GUARD: root-cause fix for silent collection wipes on import/sync =====
  // Business-critical collections that live directly in the root document (NOT sharded)
  // had zero empty-overwrite protection. Losing any to an empty array is data loss, so
  // they are never silently blanked.
  const BLANK_PROTECTED_ROOT_KEYS = ['suppliers', 'zones', 'diwaniyaTiers', 'squadTiers', 'productCategories'];

  // Refuse to overwrite a populated root collection with an empty array. Reads the
  // authoritative cloud root once (only when something is about to be blanked) and
  // carries the existing value forward. Fix for suppliers vanishing on import.
  const preserveProtectedRootKeys = async (candidateRoot: any, rootRef: any) => {
    try {
      const atRisk = BLANK_PROTECTED_ROOT_KEYS.filter(
        (k) => Array.isArray(candidateRoot?.[k]) && candidateRoot[k].length === 0
      );
      if (atRisk.length === 0) return candidateRoot;
      const snap = await getDoc(rootRef);
      const remote: any = snap.exists() ? (snap.data() || {}) : {};
      atRisk.forEach((key) => {
        const rem = remote[key];
        if (Array.isArray(rem) && rem.length > 0) {
          candidateRoot[key] = rem;
          console.warn(`[DATA_GUARD] Refused to blank root '${key}' — kept ${rem.length} cloud rows.`);
        }
      });
    } catch (guardErr) {
      console.warn('[DATA_GUARD] root blank-protection skipped:', guardErr);
    }
    return candidateRoot;
  };

  // The sharded empty-overwrite guard is bypassed whenever a shard's in-memory baseline
  // was never loaded (fresh session / an import that ran before the shard loaded) — it
  // then lets an empty payload wipe the shard. Seed the baseline from the authoritative
  // cloud shard for any key about to be written empty. Fix for squads vanishing on import.
  const seedShardBaselineBeforeBlank = async (uid: string, email: any, payloadMap: Record<string, any>) => {
    for (const key of SHARDED_KEYS) {
      const val = payloadMap ? payloadMap[key] : undefined;
      if (Array.isArray(val) && val.length === 0 && !lastRemoteKeysRef.current[key]) {
        try {
          const remoteShard: any = await readLogicalAppDataShard(uid, email, key, true);
          if (remoteShard?.exists && Array.isArray(remoteShard.value) && remoteShard.value.length > 0) {
            lastRemoteKeysRef.current[key] = stableStringify(remoteShard.value);
            console.warn(`[DATA_GUARD] Seeded baseline for shard '${key}' (${remoteShard.value.length}) to block empty overwrite.`);
          }
        } catch (seedErr) {
          console.warn(`[DATA_GUARD] Could not seed baseline for shard '${key}':`, seedErr);
        }
      }
    }
  };


  const onCloudImport = async (importedState: AppState): Promise<boolean> => {
    if (!user) return false;
    isCloudSyncApplyingRef.current = true;
    
    const performSave = async (isRetry = false): Promise<boolean> => {
      try {
	        const rootDataRef = getSmartDoc('appData', user.uid, user.email);
	        const generationId = getAdminDataGenerationId(true);
        const authoritativeWriteAt = Date.now();
	        const splitData = splitProductsForDatabase(importedState);
	        
	        const rootDocData: any = { ...splitData };
        const shardedPayloads: Record<string, any> = {};
        
	        SHARDED_KEYS.forEach(key => {
	          if (rootDocData[key] !== undefined) {
	            shardedPayloads[key] = rootDocData[key];
              rootDocData[key] = [];
          }
        });
        
	        const authoritativeRoot = {
	          ...rootDocData,
	          __adminDataGenerationId: generationId,
	          __adminLastAuthoritativeWriteAt: new Date(authoritativeWriteAt).toISOString(),
	        };
	        const rootForStudioAndApp = withGoogleStudioRootMirror(authoritativeRoot, splitData);
	        const sanitizedRoot = makeFirestoreSafeRootDocument(rootForStudioAndApp);
	        await preserveProtectedRootKeys(sanitizedRoot, rootDataRef);
	        const serializedRootCurrent = stableStringify(sanitizedRoot);
        const preparedShardPlans: Record<string, Awaited<ReturnType<typeof buildLogicalShardWritePlan>>> = {};

	        await seedShardBaselineBeforeBlank(user.uid, user.email, shardedPayloads);
	        for (const key of SHARDED_KEYS) {
	           if (shardedPayloads[key] !== undefined) {
              if (isDangerousEmptyOverwrite(key, shardedPayloads[key])) continue;
              preparedShardPlans[key] = await buildLogicalShardWritePlan(key, shardedPayloads[key], {
                __adminDataGenerationId: generationId,
                __adminLastAuthoritativeWriteAt: new Date(authoritativeWriteAt).toISOString(),
              });
	           }
	        }

        // Commit every authoritative shard first. Each logical shard uses immutable,
        // generation-specific part documents and switches its manifest only after all parts exist.
        // The root generation marker is written last so a failed shard can never be reported as a
        // successful completed import.
        await Promise.all(Object.keys(preparedShardPlans).map((key) =>
          enqueuePersistenceWrite(`shard:${key}`, async () => {
            await commitLogicalShardWritePlan(user.uid, user.email, preparedShardPlans[key]);
          })
        ));
        await enqueuePersistenceWrite('root', async () => {
          await setDoc(rootDataRef, sanitizedRoot, { merge: false });
        });

        // Read back the two critical transaction ledgers before confirming success.
        for (const key of ['invoices', 'orders'] as const) {
          if (shardedPayloads[key] === undefined) continue;
          const verified = await readLogicalAppDataShard(user.uid, user.email, key, true);
          if (!verified.exists || stableStringify(verified.value) !== stableStringify(shardedPayloads[key])) {
            throw new Error(`CLOUD_IMPORT_VERIFICATION_FAILED:${key}`);
          }
        }

        const mirrorPromises: Promise<any>[] = [];
	        try {
	          const squadsSnap = await getDocs(collection(db, 'squads'));
	          squadsSnap.docs.forEach((squadDoc) => mirrorPromises.push(deleteDoc(squadDoc.ref)));
	          if (Array.isArray(shardedPayloads.squads)) {
	            shardedPayloads.squads.forEach((sq: any) => {
	              if (sq && sq.id !== undefined) {
	                mirrorPromises.push(setDoc(doc(db, 'squads', String(sq.id)), JSON.parse(JSON.stringify({
	                  ...sq,
	                  __adminDataGenerationId: generationId,
	                  __adminSyncedFromSharedCompanyDataAt: new Date().toISOString(),
	                })), { merge: false }));
	              }
	            });
	          }
          await Promise.all(mirrorPromises);
	        } catch (mirrorErr) {
	          console.warn('[DATA_GUARD] Could not fully refresh root squads mirror during import:', mirrorErr);
	        }
        
        lastRemoteKeysRef.current['__root__'] = serializedRootCurrent;
        cloudRootExistsRef.current = true;
        
        SHARDED_KEYS.forEach(key => {
           if (shardedPayloads[key] !== undefined) {
              lastRemoteKeysRef.current[key] = stableStringify(shardedPayloads[key]);
              loadedCloudShardKeysRef.current.add(key);
           }
        });
        
	        let authoritativeImportedState = {
	          ...importedState,
	          __adminDataGenerationId: generationId,
	          __adminLastAuthoritativeWriteAt: new Date(authoritativeWriteAt).toISOString(),
	        } as AppState;
            
            authoritativeImportedState = recalculateStateBalances(authoritativeImportedState);
            
	        const newFullStateStr = JSON.stringify(authoritativeImportedState);
	        lastRemoteSnapshotRef.current = newFullStateStr;
        authoritativeDataWrittenAtRef.current = authoritativeWriteAt;
        
        try {
          saveCloudSnapshotMirror(newFullStateStr);
        } catch (err) {
          console.warn("localStorage sync skipped during cloud import:", err);
        }
        
	        setData(authoritativeImportedState);
        console.log("Cloud Import completed successfully and all sync tracking references aligned.");
        return true;
      } catch (err) {
        const errStr = String(err);
        const isPermission = errStr.includes("permission-denied") || errStr.includes("permissions") || errStr.includes("PERMISSION_DENIED");
        
        if (isPermission) {
          console.warn("Permission denied during cloud import for the current account role. No fallback write was attempted to avoid mixing accounts.");
        }
        throw err;
      }
    };

    try {
      return await performSave(false);
    } catch (err) {
      console.error("Cloud import saving failed:", err);
      throw err;
    } finally {
      setTimeout(() => {
        isCloudSyncApplyingRef.current = false;
      }, 300);
    }
  };

  // Auth Listener - Optimized session management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentMode = 'cloud';
      localStorage.setItem('appMode', 'cloud');
      
      if (currentUser) {
          const rawEmail = (currentUser.email || currentUser.providerData?.[0]?.email || '');
          const email = rawEmail.toLowerCase().trim();
          
          const isAuthorized = AUTHORIZED_EMAILS.some(e => e.toLowerCase().trim() === email) || 
            AUTHORIZED_UIDS.includes(currentUser.uid);
          
          const isPartner = AUTHORIZED_PARTNERS.some(e => e.toLowerCase().trim() === email) ||
            AUTHORIZED_PARTNER_UIDS.includes(currentUser.uid);

        if (currentMode === 'cloud' && !isAuthorized && !isPartner) {
            toast.error(`البريد (${email}) غير مصرح له باستخدام الوضع السحابي`);
            await logout();
            setTimeout(() => {
              setAuthError(`تم إنهاء الجلسة لأن حسابك غير مصرح له.`);
              setAuthLoading(false);
            }, 0);
            return;
        }
        
        // Ensure partners who ARE authorized are not kicked out if they are authorized
        if (currentMode === 'cloud' && (isAuthorized || isPartner)) {
             // Continue normally
             console.log("Authorized access for:", email);
        } else if (currentMode === 'cloud') {
              // This is a safety catch, but IS covered by the check above.
        }

        // Delay state updates to prevent "Cannot update a component while rendering"
        setTimeout(() => {
          // Cloud-only system: a browser copy is never treated as an operating mode.
          if (isAuthorized || isPartner) {
            setAppMode('cloud');
            localStorage.setItem('appMode', 'cloud');
          }
          setUser(currentUser);
          setUserRole(isAuthorized ? 'admin' : 'partner');
          setIsAuthenticated(true);
          localStorage.setItem('isAuthenticated', 'true');
          setCurrentPage(getInitialPageFromDeepLink());

          setAuthError(null);
          setAuthLoading(false);
        }, 0);
      } else {
        setTimeout(() => {
          setUser(null);
          setUserRole(null);
          setIsAuthenticated(false);
          localStorage.removeItem('isAuthenticated');
          localStorage.setItem('appMode', 'cloud');
          hasLoadedDataRef.current = false;
          setAuthLoading(false);
        }, 0);
      }
    });
    return unsubscribe;
  }, []);

  // Data Sync with Firebase
  useEffect(() => {
    let syncUnsubscribe: (() => void) | null = null;
    let ordersUnsubscribe: (() => void) | null = null;
    let invoicesUnsubscribe: (() => void) | null = null;

    const startDataSync = async () => {
      // Cloud-only: never hydrate company data from Local Storage.
      // Mode is 'cloud', wait for user authentication
      if (!user || !isOnline) {
        hasLoadedDataRef.current = false;
        setDataLoading(false);
        return;
      }

	      setDataLoading(true);
	      hasLoadedDataRef.current = false;
	      cloudRootExistsRef.current = false;
	      loadedCloudShardKeysRef.current = new Set();
	      lastRemoteKeysRef.current = {};
      authoritativeDataWrittenAtRef.current = 0;
      setHasInstantCloudSnapshot(false);

      // 1. Sync orders independently (Legacy/Customer App)
      try {
         const qOrders = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(50));
         ordersUnsubscribe = onSnapshot(qOrders, (snap) => {
	            const externalOrders = snap.docs
	              .map(d => ({ id: d.id, ...d.data() }))
	              .filter((order: any) => {
	                const cutoff = authoritativeDataWrittenAtRef.current;
	                if (!cutoff) return true;
	                const orderTime = getRecordTime(order);
	                return orderTime >= cutoff;
	              });
            setData(prev => {
                const prevOrders = prev.orders || [];
                let changed = false;
                const combined = [...prevOrders];
                externalOrders.forEach((eo: any) => {
                     const idx = combined.findIndex(o => o.id === eo.id);
                     if (idx === -1) {
                         combined.push(eo);
                         changed = true;
                     } else {
                         if (combined[idx].status !== eo.status || combined[idx].paymentStatus !== eo.paymentStatus || (combined[idx] as any).paymentId !== (eo as any).paymentId) {
                             combined[idx] = { ...combined[idx], ...eo };
                             changed = true;
                         }
                     }
                });
                if (changed) {
                    combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    // Payment callbacks update ORD records through Firestore. Recalculate the
                    // supplier ledger immediately after merging the paid order so ORD invoices
                    // create the same supplier dues as paid INV invoices without waiting for a reload.
                    return recalculateStateBalances({ ...prev, orders: combined });
                }
                return prev;
            });
         }, (err) => {
            setIsOnline(false);
            hasLoadedDataRef.current = false;
            if (!String(err).includes("Missing or insufficient permissions")) {
               console.error("orders sync error: ", err);
            }
         });
      } catch (e: any) {
          if (!String(e).includes("Missing or insufficient permissions")) {
               console.error("Failed to sync orders collection:", e);
          }
      }

      // 1b. Sync the lightweight invoices collection as a ledger safety mirror.
      // Some admin-created payment links exist in the payment/session database before
      // the large appData invoice shard finishes saving. Merging this collection keeps
      // pending invoices visible in سجل الفواتير; paid status still follows the same
      // existing webhook/auto-reconcile logic.
      try {
         const qInvoices = query(collection(db, 'invoices'), orderBy('date', 'desc'), limit(120));
         invoicesUnsubscribe = onSnapshot(qInvoices, (snap) => {
            const externalInvoices = snap.docs
              .map(d => ({ id: d.id, ...d.data() }))
              .filter((invoice: any) => {
                if (!invoice || invoice.isDeleted) return false;
                const cutoff = authoritativeDataWrittenAtRef.current;
                if (!cutoff) return true;
                const invoiceTime = getRecordTime(invoice);
                return !invoiceTime || invoiceTime >= cutoff || String(invoice.id || '').startsWith('INV-');
              });
            if (externalInvoices.length === 0) return;
            setData(prev => {
                const prevInvoices = prev.invoices || [];
                let changed = false;
                const combined = [...prevInvoices];
                externalInvoices.forEach((ei: any) => {
                     const idx = combined.findIndex((inv: any) => String(inv.id || inv.invoiceId || inv.invoiceNo) === String(ei.id || ei.invoiceId || ei.invoiceNo));
                     const externalIsPaid = isPaidStatus(ei.paymentStatus) || isPaidStatus(ei.payment_status) || isPaidStatus(ei.status) || ei.paid === true;
                     const externalIsFailed = isFailedStatus(ei.paymentStatus) || isFailedStatus(ei.payment_status) || isFailedStatus(ei.status) || ei.failed === true;
                     if (idx === -1) {
                         combined.push(ei);
                         changed = true;
                     } else {
                         const current = combined[idx] as any;
                         const currentIsPaid = isPaidStatus(current.paymentStatus) || isPaidStatus(current.payment_status) || isPaidStatus(current.status) || current.paid === true;
                         const currentIsFailed = isFailedStatus(current.paymentStatus) || isFailedStatus(current.payment_status) || isFailedStatus(current.status) || current.failed === true;
                         const currentIsFinal = currentIsPaid || currentIsFailed;
                         const externalIsFinal = externalIsPaid || externalIsFailed;

                         // The invoices collection is only a visibility mirror. Never let an older
                         // pending mirror snapshot downgrade a locally/webhook-confirmed paid invoice.
                         if (currentIsFinal && !externalIsFinal) {
                             const safePatch: any = {};
                             if (!current.paymentLink && ei.paymentLink) safePatch.paymentLink = ei.paymentLink;
                             if (!current.paymentUrl && ei.paymentUrl) safePatch.paymentUrl = ei.paymentUrl;
                             if (!current.paymentURL && ei.paymentURL) safePatch.paymentURL = ei.paymentURL;
                             if (!current.payment_id && ei.payment_id) safePatch.payment_id = ei.payment_id;
                             if (!current.paymentId && ei.paymentId) safePatch.paymentId = ei.paymentId;
                             if (Object.keys(safePatch).length > 0) {
                                 combined[idx] = { ...current, ...safePatch };
                                 changed = true;
                             }
                             return;
                         }

                         const statusChanged = current.status !== ei.status || current.paymentStatus !== ei.paymentStatus || current.payment_status !== ei.payment_status || current.payment_id !== ei.payment_id || current.paymentId !== ei.paymentId || current.paid !== ei.paid || current.failed !== ei.failed;
                         const linkMissing = !current.paymentLink && !!ei.paymentLink;
                         if (statusChanged || linkMissing) {
                             const merged = { ...current, ...ei } as any;
                             if (currentIsPaid || externalIsPaid) {
                                 merged.paymentStatus = 'paid';
                                 merged.payment_status = 'paid';
                                 merged.status = isPaidStatus(merged.status) ? merged.status : 'تم الدفع بنجاح';
                                 merged.paid = true;
                                 merged.failed = false;
                                 merged.canPay = false;
                             }
                             combined[idx] = merged;
                             changed = true;
                         }
                     }
                });
                if (changed) {
                    combined.sort((a: any, b: any) => getRecordTime(b) - getRecordTime(a));
                    // Keep supplier balances in sync when the lightweight invoice mirror
                    // receives a final payment status from the gateway.
                    return recalculateStateBalances({ ...prev, invoices: combined });
                }
                return prev;
            });
         }, (err) => {
            setIsOnline(false);
            hasLoadedDataRef.current = false;
            if (!String(err).includes("Missing or insufficient permissions")) {
               console.error("invoices sync error: ", err);
            }
         });
      } catch (e: any) {
          if (!String(e).includes("Missing or insufficient permissions")) {
               console.error("Failed to sync invoices collection:", e);
          }
      }
      
      // 2. Fast path: load the full shared database through the Admin server.
      // This avoids slow browser Firestore shard reads on first entry and keeps Admin/Order on the same source.
      // Uses prewarmCloudBoot(): the request was fired the moment the app shell loaded,
      // so by the time we reach here it has usually already resolved — masking Cloud Run cold-starts.
      // The helper also enforces a per-attempt timeout and one retry so a hung request can never
      // strand the user (the previous code had no timeout and required a manual page reload).
      try {
        isCloudSyncApplyingRef.current = true;
        const __perfT0 = performance.now();
        let fastPayload: any = null;
        try {
          fastPayload = await prewarmCloudBoot();
        } catch (prewarmErr) {
          console.warn('[FAST_APPDATA] prewarm failed; falling back to direct Firestore reads.', prewarmErr);
        }
        if (fastPayload) {
          const __perfNet = performance.now();
          if (fastPayload?.success && fastPayload?.data) {
            const expectedResetGenerationId = (() => {
              try {
                return normalizeAdminDataGenerationId(
                  localStorage.getItem(ADMIN_RESET_EXPECTED_GENERATION_KEY),
                );
              } catch {
                return '';
              }
            })();
            const fastPayloadGenerationId = normalizeAdminDataGenerationId(
              fastPayload.data.__adminDataGenerationId || '',
            );

            // Immediately after a full reset, the Cloud Run in-memory cache can need
            // a brief moment to receive Firestore snapshots. Never accept its older
            // generation, because doing so would paint old data and auto-save it back.
            if (
              expectedResetGenerationId &&
              fastPayloadGenerationId !== expectedResetGenerationId
            ) {
              throw new Error('STALE_FAST_APPDATA_AFTER_ADMIN_RESET');
            }
            if (expectedResetGenerationId) {
              try {
                localStorage.removeItem(ADMIN_RESET_EXPECTED_GENERATION_KEY);
              } catch {}
            }

            const restoredBootData = restoreBootInlineAssets(fastPayload);
            if (fastPayloadGenerationId) {
              restoredBootData.__adminDataGenerationId = fastPayloadGenerationId;
            }
            let loadedState: any = joinProductsFromDatabase({ ...INITIAL_DATA, ...restoredBootData });
            const rootWrittenAt = new Date(loadedState.__adminLastAuthoritativeWriteAt || '').getTime();
            authoritativeDataWrittenAtRef.current = Number.isFinite(rootWrittenAt) ? rootWrittenAt : 0;
            cloudRootExistsRef.current = true;
            loadedCloudShardKeysRef.current = new Set();
            SHARDED_KEYS.forEach(key => {
              if ((loadedState as any)[key] !== undefined) {
                loadedCloudShardKeysRef.current.add(key);
                // stableStringify deferred to idle — auto-save fires 8s later, plenty of time
              }
            });
            const rootDataOnly = { ...loadedState };
            SHARDED_KEYS.forEach(k => {
              if (k !== 'products') delete rootDataOnly[k];
            });
            
            // Recalculate derived state (like supplier balances) upon load
            const finalProcessedState = recalculateStateBalances(loadedState);
            finalProcessedState.notifications = applyStoredNotificationReadState(finalProcessedState.notifications) || finalProcessedState.notifications;

            const fastStillHealthy = await probeCloudConnection(false);
            if (!fastStillHealthy) throw new Error('CLOUD_CONNECTION_LOST_DURING_FAST_LOAD');

            // Expose data only after the live cloud check succeeds.
            startTransition(() => setData(finalProcessedState));
            setHasInstantCloudSnapshot(true);

            // Defer ALL heavy stableStringify/JSON.stringify to idle frames.
            // This eliminates the 10-30s UI freeze caused by serializing 16 shards synchronously.
            // Auto-save fires 8 seconds later — plenty of time to complete during idle.
            const _bootState = loadedState;
            const _bootRoot = rootDataOnly;
            const _bootProcessed = finalProcessedState;
            const _scheduleBootShard = (i: number) => {
              const _ric = (window as any).requestIdleCallback;
              const _work = () => {
                const key = SHARDED_KEYS[i];
                if (key && (_bootState as any)[key] !== undefined) {
                  lastRemoteKeysRef.current[key] = stableStringify((_bootState as any)[key]);
                }
                if (i + 1 < SHARDED_KEYS.length) {
                  _scheduleBootShard(i + 1);
                } else {
                  lastRemoteKeysRef.current['__root__'] = stableStringify(_bootRoot);
                  const snap = JSON.stringify(_bootProcessed);
                  lastRemoteSnapshotRef.current = snap;
                  try { saveCloudSnapshotMirror(snap); } catch {}
                }
              };
              if (typeof _ric === 'function') _ric(_work, { timeout: 4000 });
              else setTimeout(_work, 80 + i * 50);
            };
            _scheduleBootShard(0);

            try {
              console.log('[PERF] appdata boot — server+network: ' + (__perfNet - __perfT0).toFixed(0) + 'ms | client sync-process: ' + (performance.now() - __perfNet).toFixed(0) + 'ms | server-reported: ' + (fastPayload?.durationMs ?? '?') + 'ms');
            } catch {}

            const deferredKeys = Array.isArray(fastPayload.deferredShardKeys)
              ? fastPayload.deferredShardKeys.filter((key: string) => BOOT_DEFERRED_SHARDED_KEYS.includes(key))
              : [];
            if (deferredKeys.length > 0) {
              window.setTimeout(async () => {
                try {
                  const fullRes = await fetch('/api/appdata/full?profile=full', { cache: 'no-store' });
                  if (!fullRes.ok) return;
                  const fullPayload = await fullRes.json();
                  if (!fullPayload?.success || !fullPayload?.data) return;
                  const fullState: any = joinProductsFromDatabase({ ...INITIAL_DATA, ...fullPayload.data });
                  const deferredPatch: any = {};
                  deferredKeys.forEach((key: string) => {
                    if ((fullState as any)[key] !== undefined) {
                      deferredPatch[key] = (fullState as any)[key];
                      loadedCloudShardKeysRef.current.add(key);
                      // stableStringify deferred to idle below
                    }
                  });
                  if (Object.keys(deferredPatch).length === 0) return;
                  startTransition(() => setData(prev => {
                    const metaPatch: any = {};
                    if (fullState.__adminDataGenerationId) metaPatch.__adminDataGenerationId = fullState.__adminDataGenerationId;
                    if (fullState.__adminLastAuthoritativeWriteAt) metaPatch.__adminLastAuthoritativeWriteAt = fullState.__adminLastAuthoritativeWriteAt;
                    const merged = recalculateStateBalances({ ...prev, ...deferredPatch, ...metaPatch });
                    // Defer heavy JSON.stringify + stableStringify to idle — keeps UI responsive
                    const _deferKeys = [...deferredKeys];
                    const _deferFull = fullState;
                    const _deferMerged = merged;
                    const _deferRic = (window as any).requestIdleCallback;
                    const _deferWork = () => {
                      _deferKeys.forEach((key: string) => {
                        if ((_deferFull as any)[key] !== undefined) {
                          lastRemoteKeysRef.current[key] = stableStringify((_deferFull as any)[key]);
                        }
                      });
                      const snap = JSON.stringify(_deferMerged);
                      lastRemoteSnapshotRef.current = snap;
                      try { saveCloudSnapshotMirror(snap); } catch {}
                    };
                    if (typeof _deferRic === 'function') _deferRic(_deferWork, { timeout: 4000 });
                    else setTimeout(_deferWork, 200);
                    return merged;
                  }));
                } catch (backgroundLoadErr) {
                  console.warn('[FAST_APPDATA] Deferred shard background load failed:', backgroundLoadErr);
                  if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    setIsOnline(false);
                  }
                }
              }, 0);
            }
            isCloudSyncApplyingRef.current = false;
            hasLoadedDataRef.current = true;
            setDataLoading(false);
            return;
          }
        }
      } catch (fastLoadErr) {
        console.warn('[FAST_APPDATA] Admin API fast load failed; falling back to browser Firestore shard reads.', fastLoadErr);
      }

      // 3. Fallback: Load ROOT + SHARDS once from the browser Firestore client.
      // Firestore 12.12 can throw INTERNAL ASSERTION FAILED when many realtime
      // listeners are opened/closed quickly. The admin data is still saved live
      // by the auto-save block below; loading it with server reads prevents the
      // b815/ca9 listener crash and avoids partial shard loads overwriting cloud data.
      try {
        isCloudSyncApplyingRef.current = true;
        const dataRef = getSmartDoc('appData', user.uid, user.email);
        const rootSnap = await getDocFromServer(dataRef);
        let loadedState: any = { ...INITIAL_DATA };

        if (rootSnap.exists()) {
          cloudRootExistsRef.current = true;
          const rawRootData = rootSnap.data() as any;
          try {
            const expectedResetGenerationId = normalizeAdminDataGenerationId(
              localStorage.getItem(ADMIN_RESET_EXPECTED_GENERATION_KEY),
            );
            const rootGenerationId = normalizeAdminDataGenerationId(
              rawRootData.__adminDataGenerationId,
            );
            if (rootGenerationId) {
              rawRootData.__adminDataGenerationId = rootGenerationId;
            }
            if (
              expectedResetGenerationId &&
              rootGenerationId === expectedResetGenerationId
            ) {
              localStorage.removeItem(ADMIN_RESET_EXPECTED_GENERATION_KEY);
            }
          } catch {}
          const rootWrittenAt = new Date(rawRootData.__adminLastAuthoritativeWriteAt || '').getTime();
          authoritativeDataWrittenAtRef.current = Number.isFinite(rootWrittenAt) ? rootWrittenAt : 0;
          const rootDataOnly = { ...rawRootData };
          SHARDED_KEYS.forEach(k => {
            if (k !== 'products') delete rootDataOnly[k];
          });
          lastRemoteKeysRef.current['__root__'] = stableStringify(rootDataOnly);

          const sanitizedRoot = { ...rawRootData };
          SHARDED_KEYS.forEach(key => {
            if (key !== 'products' && Array.isArray(sanitizedRoot[key]) && sanitizedRoot[key].length === 0) {
              delete sanitizedRoot[key];
            }
          });
          loadedState = { ...loadedState, ...sanitizedRoot };
	        } else {
	          // Important: never restore local/demo data into an empty cloud account.
	          cloudRootExistsRef.current = false;
	          lastRemoteKeysRef.current['__root__'] = stableStringify(splitProductsForDatabase(INITIAL_DATA));
	        }

	        const shardResults = await Promise.all(SHARDED_KEYS.map(async (key) => {
          try {
            const result = await readLogicalAppDataShard(user.uid, user.email, key, true);
            return { key, exists: result.exists, value: result.value };
          } catch (err) {
            console.error(`Shard load error for ${key}:`, err);
            return { key, exists: false, value: undefined };
          }
        }));

        shardResults.forEach(({ key, exists, value }) => {
          if (exists) loadedCloudShardKeysRef.current.add(key);
          if (value !== undefined) {
            loadedState[key] = value;
            // stableStringify deferred to idle below — avoids blocking on 16 shards
          } else {
            // keep existing value as-is for undefined shards
          }
        });

        loadedState = joinProductsFromDatabase(loadedState);

        // Load diwaniyas from the shared Firebase `squads` collection through the admin dashboard API.
        // This keeps إدارة الدواوين separate from customers and prevents accidental customer-to-diwaniya mixing.
        try {
          // Send the admin's Firebase token so the server returns customer phone
          // numbers (needed by إدارة الدواوين). Without a token the call still works —
          // it just comes back with phones blanked, and the fallback below covers the
          // rest — so a missing token can never break loading.
          const dashHeaders: Record<string, string> = {};
          try {
            const idToken = await auth.currentUser?.getIdToken();
            if (idToken) dashHeaders['Authorization'] = `Bearer ${idToken}`;
          } catch { /* no token → server returns phone-less data, feature still loads */ }
          const dashboardRes = await fetch('/api/admin-dashboard-data', { headers: dashHeaders });
          let apiSuccess = false;
          if (dashboardRes.ok) {
            const dashboardData = await dashboardRes.json();
            if (dashboardData.success && Array.isArray(dashboardData?.squads)) {
              // إدارة الدواوين في برنامج العميل محفوظة داخل appData/shared_company_data
              // وأحياناً تظهر فقط من خلال orders المرتبطة بالديوانية.
              // لذلك لا نستبدل البيانات بقائمة فارغة، ونحتفظ بطلبات الديوانية منفصلة حتى لا نمس صفحة الطلبات أو الدفع.
	              if (dashboardData.squads.length > 0) {
	                loadedState.squads = safeMergeData(loadedState.squads, dashboardData.squads);
	                lastRemoteKeysRef.current['squads'] = stableStringify(dashboardData.squads);
	                loadedCloudShardKeysRef.current.add('squads');
	              }
	              if (Array.isArray(dashboardData?.orders) && dashboardData.orders.length > 0) {
	                loadedState.diwaniyaOrders = safeMergeData(loadedState.diwaniyaOrders, dashboardData.orders);
	              }
              apiSuccess = true;
            }
          }

          if (!apiSuccess) {
            console.warn('[DASHBOARD_API] API failed or lacks permissions. Falling back to direct client-side Firestore fetch for squads...');
            const squadsSnap = await getDocs(collection(db, 'squads'));
            const cloudSquads = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
	            if (cloudSquads.length > 0) loadedState.squads = safeMergeData(loadedState.squads, cloudSquads);
	            lastRemoteKeysRef.current['squads'] = stableStringify(cloudSquads);
	            loadedCloudShardKeysRef.current.add('squads');
          }
        } catch (apiErr) {
          console.warn('Unable to load squads from /api/admin-dashboard-data. Falling back to direct Firestore fetch.', apiErr);
          try {
            const squadsSnap = await getDocs(collection(db, 'squads'));
            const cloudSquads = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
	            if (cloudSquads.length > 0) loadedState.squads = safeMergeData(loadedState.squads, cloudSquads);
	            lastRemoteKeysRef.current['squads'] = stableStringify(cloudSquads);
	            loadedCloudShardKeysRef.current.add('squads');
          } catch (fallbackErr) {
            console.error('Direct Firestore fetch for squads also failed:', fallbackErr);
          }
        }

        // Recalculate derived state (like supplier balances) upon load
        const finalProcessedState = recalculateStateBalances(loadedState);

        // Sync read state from localStorage to ensure read status is kept fundamentally.
        finalProcessedState.notifications = applyStoredNotificationReadState(finalProcessedState.notifications) || finalProcessedState.notifications;

        // Do not expose data until a fresh server-side Firestore probe succeeds.
        const stillHealthy = await probeCloudConnection(false);
        if (!stillHealthy) throw new Error('CLOUD_CONNECTION_LOST_DURING_LOAD');

        startTransition(() => setData(finalProcessedState));
        setHasInstantCloudSnapshot(true);
        hasLoadedDataRef.current = true;
        // Defer ALL heavy stableStringify/JSON.stringify to idle — eliminates UI freeze
        const _fbState = loadedState;
        const _fbProcessed = finalProcessedState;
        const _fbSchedule = (i: number) => {
          const _ric = (window as any).requestIdleCallback;
          const _work = () => {
            const key = SHARDED_KEYS[i];
            if (key) {
              const val = (_fbState as any)[key];
              lastRemoteKeysRef.current[key] = stableStringify(val !== undefined ? val : []);
            }
            if (i + 1 < SHARDED_KEYS.length) {
              _fbSchedule(i + 1);
            } else {
              const snap = JSON.stringify(_fbProcessed);
              lastRemoteSnapshotRef.current = snap;
              try { saveCloudSnapshotMirror(snap); } catch {}
            }
          };
          if (typeof _ric === 'function') _ric(_work, { timeout: 4000 });
          else setTimeout(_work, 80 + i * 50);
        };
        _fbSchedule(0);
      } catch (err) {
        if (String(err).includes("Missing or insufficient permissions") || String(err).includes("permission-denied")) {
          console.warn("Cloud read permission denied for this account/role:", err);
          const email = (user.email || '').toLowerCase().trim();
          const authorizedByApp = AUTHORIZED_EMAILS.some(e => e.toLowerCase().trim() === email) ||
            AUTHORIZED_PARTNERS.some(e => e.toLowerCase().trim() === email) ||
            AUTHORIZED_UIDS.includes(user.uid) ||
            AUTHORIZED_PARTNER_UIDS.includes(user.uid);
          setAuthError(authorizedByApp
            ? `الحساب مصرح داخل التطبيق (${user.email})، لكن قواعد Firestore الحالية ترفض الوصول. تم اعتماد مستند الحساب الآمن بالـ UID لمنع تداخل الحسابات؛ ارفع ملف firestore.rules المرفق ثم أعد المحاولة.`
            : `عذراً، ليس لديك صلاحية الوصول إلى بيانات هذا الحساب. البريد: ${user.email}`
          );
        } else {
          console.error("Cloud load error:", err);
          setIsOnline(false);
          hasLoadedDataRef.current = false;
          toast.error("تعذر الاتصال بالسحابة. تم حجب النظام بالكامل لحماية البيانات.");
        }
      } finally {
        isCloudSyncApplyingRef.current = false;
        setDataLoading(false);
      }

    };

    startDataSync();

    return () => {
      if (syncUnsubscribe) syncUnsubscribe();
      if (ordersUnsubscribe) ordersUnsubscribe();
      if (invoicesUnsubscribe) invoicesUnsubscribe();
    };
  }, [user, appMode, triggerSyncReload, isOnline, probeCloudConnection]);

  // Financial records are accounting-critical. Persist expenses and supplier payments quickly,
  // independently of the large 8-second full-state save. The previous supplier-only effect also
  // missed the first change after boot when its baseline had not been initialized yet.
  useEffect(() => {
    const persistenceContext = `${appMode}:${user?.uid || 'local'}`;
    if (financialFastSaveContextRef.current !== persistenceContext) {
      financialFastSaveContextRef.current = persistenceContext;
      lastFinancialFastSaveRef.current = { expenses: null, supplierTransfers: null };
    }

    if (
      dataLoading ||
      !hasLoadedDataRef.current ||
      !isOnline ||
      isCloudSyncApplyingRef.current ||
      (window as any).__ktkAdminResetInProgress
    ) return;

    const snapshots = {
      expenses: stableStringify(data?.expenses || []),
      supplierTransfers: stableStringify(data?.supplierTransfers || []),
    };

    const baselines = lastFinancialFastSaveRef.current;
    if (baselines.expenses === null || baselines.supplierTransfers === null) {
      baselines.expenses = snapshots.expenses;
      baselines.supplierTransfers = snapshots.supplierTransfers;
      return;
    }

    const changedKeys = (['expenses', 'supplierTransfers'] as const).filter(
      key => snapshots[key] !== baselines[key]
    );
    if (changedKeys.length === 0) return;

    let cancelled = false;
    const timeoutId = setTimeout(() => {
      const run = async () => {
        if (
          cancelled ||
          !hasLoadedDataRef.current ||
          isCloudSyncApplyingRef.current ||
          (window as any).__ktkAdminResetInProgress
        ) return;

        try {
          if (!user || appMode !== 'cloud' || !isOnline) return;

          for (const key of changedKeys) {
            if (cancelled) return;
            await enqueuePersistenceWrite(`shard:${key}`, async () => {
              if (cancelled) return;

              const latestValue = (latestDataRef.current as any)?.[key] || [];
              const latestSnapshot = stableStringify(latestValue);
              if (latestSnapshot !== snapshots[key]) return;

              const shardPlan = await buildLogicalShardWritePlan(key, latestValue, {
                __adminDataGenerationId: getAdminDataGenerationId(),
                __adminLastAuthoritativeWriteAt: new Date().toISOString(),
              });
              if (cancelled) return;

              const newestValue = (latestDataRef.current as any)?.[key] || [];
              const newestSnapshot = stableStringify(newestValue);
              if (newestSnapshot !== latestSnapshot) return;

              await commitLogicalShardWritePlan(user.uid, user.email, shardPlan);

              lastRemoteKeysRef.current[key] = latestSnapshot;
              loadedCloudShardKeysRef.current.add(key);
              baselines[key] = latestSnapshot;
            });
          }
        } catch (e) {
          console.error('Financial fast-save error', e);
          setIsOnline(false);
          hasLoadedDataRef.current = false;
        }
      };

      void run();
    }, 600);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [data?.expenses, data?.supplierTransfers, dataLoading, user, appMode, isOnline]);

  // Auto-save: Handle Local and Cloud separately with debounce for performance.
  // Every run carries the state revision that created it. If any newer state arrives while
  // waiting, compressing, or preparing shards, the older run is cancelled before it can write.
  useEffect(() => {
    // Strictly prevent auto-saving INITIAL_DATA or cloud snapshots while loading/applying remote data.
    if (
      !hasLoadedDataRef.current ||
      !isOnline ||
      isCloudSyncApplyingRef.current ||
      (window as any).__ktkAdminResetInProgress
    ) return;

    let cancelled = false;
    const scheduledRevision = dataRevisionRef.current;
    const isStaleRun = () => (
      cancelled ||
      scheduledRevision !== dataRevisionRef.current ||
      !hasLoadedDataRef.current ||
      !isOnline ||
      isCloudSyncApplyingRef.current ||
      (window as any).__ktkAdminResetInProgress
    );

    const timeoutId = setTimeout(async () => {
      if (isStaleRun()) return;

      // Auto-save is cloud-only and requires a currently verified connection.
      if (user && appMode === 'cloud' && isOnline) {
        try {
          const sanitizedDataStr = JSON.stringify(data);
          if (!sanitizedDataStr || sanitizedDataStr === '{}' || !hasMeaningfulData(data)) return;

          // Deduplication: prevent writing back what we just read.
          if (sanitizedDataStr === lastRemoteSnapshotRef.current) return;

          // Yield before heavy stableStringify work, but reject this run if a newer edit lands.
          await new Promise<void>(resolve => {
            const _ric = (window as any).requestIdleCallback;
            if (typeof _ric === 'function') _ric(() => resolve(), { timeout: 8000 });
            else setTimeout(resolve, 0);
          });
          if (isStaleRun()) return;

          const rootDataRef = getSmartDoc('appData', user.uid, user.email);
          const splitData = splitProductsForDatabase(data);

          // 1. Detect whether the root Google/Looker Studio mirror changed.
          const rootDocData = withGoogleStudioRootMirror(
            withAuthoritativeSharedMeta({ ...splitData }),
            splitData
          );
          const sanitizedRootPreview = makeFirestoreSafeRootDocument(rootDocData);
          await preserveProtectedRootKeys(sanitizedRootPreview, rootDataRef);
          const serializedRootCurrent = stableStringify(sanitizedRootPreview);
          const serializedRootLast = lastRemoteKeysRef.current['__root__'];
          const hasRootChanged = serializedRootCurrent !== serializedRootLast;

          // 2. Detect exactly which authoritative shards changed.
          const shardedPayloadsToSave: Record<string, any> = {};
          SHARDED_KEYS.forEach(key => {
            const currentVal = splitData[key];
            if (currentVal === undefined) return;

            const serializedCurrent = stableStringify(currentVal);
            const serializedLast = lastRemoteKeysRef.current[key];
            if (serializedCurrent === serializedLast) return;

            const shouldPersistShard = loadedCloudShardKeysRef.current.has(key) || hasMeaningfulValue(currentVal);
            const dangerousEmptyOverwrite = isDangerousEmptyOverwrite(key, currentVal);
            if (shouldPersistShard && !dangerousEmptyOverwrite) {
              shardedPayloadsToSave[key] = currentVal;
            } else if (dangerousEmptyOverwrite) {
              console.warn(`[DATA_GUARD] Prevented empty overwrite for shard '${key}'. Keeping existing cloud data safe.`);
            }
          });

          const needsAnyWrite = hasRootChanged || !cloudRootExistsRef.current || Object.keys(shardedPayloadsToSave).length > 0;
          if (!needsAnyWrite || isStaleRun()) return;

          // 3. Prepare every shard fully before starting any Firestore write. Previously writes
          // began while later shards were still compressing, allowing an older run to finish last.
          const preparedShardPlans: Record<string, Awaited<ReturnType<typeof buildLogicalShardWritePlan>>> = {};
          for (const key of Object.keys(shardedPayloadsToSave)) {
            if (isStaleRun()) return;
            preparedShardPlans[key] = await buildLogicalShardWritePlan(key, shardedPayloadsToSave[key], {
              __adminDataGenerationId: getAdminDataGenerationId(),
              __adminLastAuthoritativeWriteAt: new Date().toISOString(),
            });
            if (isStaleRun()) return;
          }

          if (isStaleRun()) return;
          const shardSavePromises: Promise<any>[] = [];

          for (const key of Object.keys(shardedPayloadsToSave)) {
            console.log(`Saving modified shard '${key}' to Firestore...`);
            shardSavePromises.push(enqueuePersistenceWrite(`shard:${key}`, async () => {
              if (isStaleRun()) return;

              await commitLogicalShardWritePlan(user.uid, user.email, preparedShardPlans[key]);

              // Realtime mirror for diwaniyas/squads is serialized with the authoritative shard.
              if (key === 'squads' && Array.isArray(shardedPayloadsToSave.squads)) {
                if (isStaleRun()) return;
                const currentSquads = shardedPayloadsToSave.squads;
                console.log(`[MIRROR] Mirroring ${currentSquads.length} diwaniyas/squads to root-level Firestore collection 'squads'...`);
                const mirrorPromises: Promise<any>[] = [];
                const sharedDataRef = doc(db, 'appData', 'shared_company_data');
                const sharedSquadsPayload = JSON.parse(JSON.stringify({
                  squads: currentSquads,
                  __adminSyncedSquadsAt: new Date().toISOString(),
                }));
                mirrorPromises.push(setDoc(sharedDataRef, sharedSquadsPayload, { merge: true }));

                currentSquads.forEach((sq: any) => {
                  if (sq && sq.id !== undefined) {
                    const squadDocRef = doc(db, 'squads', String(sq.id));
                    const sanitizedsq = JSON.parse(JSON.stringify({
                      ...sq,
                      __adminDataGenerationId: getAdminDataGenerationId(),
                      __adminSyncedFromSharedCompanyDataAt: new Date().toISOString(),
                    }));
                    mirrorPromises.push(setDoc(squadDocRef, sanitizedsq, { merge: true }));
                  }
                });

                try {
                  const prevSquadsVal = lastRemoteKeysRef.current.squads;
                  if (prevSquadsVal) {
                    const prevSquadsList = JSON.parse(prevSquadsVal);
                    if (Array.isArray(prevSquadsList)) {
                      const currentIds = new Set(currentSquads.map((sq: any) => String(sq.id)));
                      prevSquadsList.forEach((oldSq: any) => {
                        const oldId = String(oldSq?.id || '');
                        if (oldId && !currentIds.has(oldId)) {
                          console.log(`[MIRROR] Detected deletion of squad ${oldId}. Deleting document from Firestore 'squads' collection...`);
                          mirrorPromises.push(deleteDoc(doc(db, 'squads', oldId)));
                        }
                      });
                    }
                  }
                } catch (parseErr) {
                  console.warn('[MIRROR] Error parsing previous squads for deletion check:', parseErr);
                }

                await Promise.all(mirrorPromises);
              }
            }));
          }

          await Promise.all(shardSavePromises);

          if (isStaleRun()) return;
          if (hasRootChanged || !cloudRootExistsRef.current) {
            console.log('Saving root modifications to Firestore with Google Studio mirror...');
            await enqueuePersistenceWrite('root', async () => {
              if (isStaleRun()) return;
              await setDoc(rootDataRef, sanitizedRootPreview, { merge: false });
            });
          }

          // If a newer edit arrived after the network writes started, do not mark this old state
          // as the current baseline. The newer effect remains responsible for the final write.
          if (isStaleRun()) return;

          if (hasRootChanged || !cloudRootExistsRef.current) {
            lastRemoteKeysRef.current.__root__ = serializedRootCurrent;
            cloudRootExistsRef.current = true;
          }
          Object.keys(shardedPayloadsToSave).forEach(key => {
            lastRemoteKeysRef.current[key] = stableStringify(shardedPayloadsToSave[key]);
            loadedCloudShardKeysRef.current.add(key);
          });

          lastRemoteSnapshotRef.current = sanitizedDataStr;
          saveCloudSnapshotMirror(sanitizedDataStr);
          console.log(`Sharded auto-save successful. Saved blocks: ${hasRootChanged ? 'Root ' : ''}[${Object.keys(shardedPayloadsToSave).join(', ')}]`);
        } catch (e) {
          const isPermissionError = String(e).includes('Missing or insufficient permissions') || String(e).includes('PERMISSION_DENIED');
          if (!isPermissionError) console.error('Firestore auto-save error', e);

          if (user && !cancelled) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            setIsOnline(false);
            hasLoadedDataRef.current = false;
            toast.error(`تعذر الحفظ السحابي: ${errorMsg}. تم إيقاف النظام فوراً ولم تُنشأ أي نسخة تشغيل محلية.`);
          }
        }
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [data, user, appMode, isOnline]);

  // Deduplication handling logic below here

  const toggleMenu = (menu: string) => {
    setExpandedMenus(prev => ({
      invoices: false,
      operations: false,
      brand: false,
      settings: false,
      [menu]: !prev[menu]
    }));
  };

  const openMenu = (menu: string) => {
    setExpandedMenus({
      invoices: false,
      operations: false,
      brand: false,
      settings: false,
      [menu]: true
    });
  };

  const navigateFromSidebar = (page: string, options?: { resetInvoice?: boolean }) => {
    preloadAdminPage(page);
    if (options?.resetInvoice) setEditingInvoiceId(null);
    setCurrentPage(page);
    setNotifOpen(false);
    setCommandBarOpen(false);
    // On desktop the navigation stays open and stable. On phones it closes
    // after selection so the destination screen is immediately visible.
    if (isMobile) setSidebarOpen(false);
  };

  const handleLogout = async () => {
    setHasInstantCloudSnapshot(false);
    sessionStorage.removeItem('hideSampleDataPrompt');
    await logout();
    setUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    localStorage.setItem('appMode', 'cloud');
    setAppMode('cloud');
    setCurrentPage('dashboard');
    hasLoadedDataRef.current = false;
    setDataLoading(false);
    latestDataRef.current = INITIAL_DATA;
    dataRevisionRef.current += 1;
    setRawData(INITIAL_DATA);
  };

  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result');

  const normalizedPath = path.replace(/\/$/, '');
  
  if (normalizedPath === '/track') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center arabic-font text-emerald-600"><Loader2 size={32} className="animate-spin" /></div>}>
        <TrackPage />
      </React.Suspense>
    );
  }

  if (normalizedPath === '/success' || normalizedPath === '/cancel' || normalizedPath === '/failed' || normalizedPath === '/error' || isUpaymentsCallback || normalizedPath.startsWith('/invoice/')) {
    const rawInvoiceId =
      searchParams.get('requested_order_id') ||
      searchParams.get('order_id') ||
      searchParams.get('orderId') ||
      searchParams.get('invoice') ||
      searchParams.get('invoiceNo') ||
      searchParams.get('invoice_no') ||
      searchParams.get('invoice_id') ||
      searchParams.get('reference_id') ||
      searchParams.get('track_id') ||
      path.split('/invoice/')[1] ||
      '';
    const decodedInvoiceId = (() => {
      try {
        return decodeURIComponent(String(rawInvoiceId).replace(/\+/g, ' ')).trim();
      } catch {
        return String(rawInvoiceId || '').trim();
      }
    })();
    const embeddedInvoiceId = decodedInvoiceId.match(/(?:INV|ORD)-[A-Za-z0-9-]+(?:_\d+)?/i)?.[0] || decodedInvoiceId;
    const invoiceId = embeddedInvoiceId.includes('_') ? embeddedInvoiceId.split('_')[0] : embeddedInvoiceId;
    return <PaymentFeedbackView invoiceId={invoiceId} path={normalizedPath} searchParams={searchParams} isUpaymentsCallback={isUpaymentsCallback} />;
  }

  if (authLoading) {
    return (
      <>
        <CloudConnectionGate
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          name={data?.settings?.companyName || 'شركة مطبخ التراث الكويتي'}
          phase={cloudChecking ? 'sync' : (isOnline ? 'auth' : 'offline')}
          onRetry={handleManualRetryOffline}
        />
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  const renderAuthError = () => {
    if (!authError) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 md:p-6 text-center arabic-font" dir="rtl">
          <div className="bg-white rounded-3xl p-5 md:p-10 max-w-sm w-full shadow-xl">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">المعذرة!</h2>
              <p className="text-red-600 font-bold leading-relaxed mb-8 break-words">{authError}</p>
              <button 
                onClick={() => setAuthError(null)}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
              >
                فهمت (إغلاق)
              </button>
          </div>
      </div>
    );
  };

  const renderQuotaError = () => {
    // Ahmad fix: remove the large cloud quota message from mobile and desktop UI.
    // The quota state is kept intact, but the intrusive banner/modal is no longer rendered.
    return null;
    if (!quotaError) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-[201] flex items-center justify-center p-4 md:p-6 text-right arabic-font shadow-2xl" dir="rtl">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-lg w-full border border-rose-100 flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
              <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-3xl">⚠️</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 text-center">تجاوز حصة الاستخدام (Firestore Quota Exceeded)</h2>
              
              <div className="text-slate-600 leading-relaxed text-sm flex flex-col gap-3">
                  <p className="font-semibold text-slate-800">
                     تم تجاوز الحصة اليومية المجانية لقراءة البيانات في قاعدة بيانات Cloud Firestore المشغلة لهذا التطبيق تحت باقة Spark المجانية.
                  </p>
                  <p>
                     تتم إعادة تعيين هذه الحصة المجانية تلقائياً كل 24 ساعة (عند منتصف الليل في توقيت المحيط الهادئ). حتى يحدث ذلك، قد يتعذر جلب أو تحديث معلومات الطلبات والبيانات السحابية.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-mono space-y-1 text-slate-500 break-words font-sans">
                     <strong>تفاصيل الخطأ:</strong> <pre className="whitespace-pre-wrap">{quotaError}</pre>
                  </div>
                  <div className="mt-2 text-slate-700 font-medium">
                     يمكنك القيام بما يلي طال عمرك:
                  </div>
                  <div className="space-y-2">
                     <button
                        onClick={() => {
                           switchMode('local');
                           setQuotaError(null);
                        }}
                        className="w-full flex items-center justify-between p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold rounded-2xl transition-all"
                     >
                        <span className="flex items-center gap-2">
                           <span>💾</span>
                           <span>تفعيل وضع التخزين المحلي والعمل دون إنترنت</span>
                        </span>
                        <span>👈</span>
                     </button>
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-bold">
                  <a 
                     href="https://firebase.google.com/pricing#cloud-firestore" 
                     target="_blank" 
                     referrerPolicy="no-referrer"
                     rel="noopener noreferrer"
                     className="p-3 bg-slate-100 text-slate-700 text-center rounded-xl hover:bg-slate-200 transition-all flex flex-col justify-center items-center gap-1 border border-slate-200"
                  >
                     <span>🔗 تفاصيل الأسعار</span>
                     <span className="text-[10px] text-slate-500 font-normal">باقة Spark & Enterprise</span>
                  </a>
                  <a 
                     href="https://console.firebase.google.com/project/gen-lang-client-0200723670/firestore/databases/ai-studio-7058254a-1b06-4783-89b7-2b95cb116681/data?openUpgradeDialog=true" 
                     target="_blank" 
                     referrerPolicy="no-referrer"
                     rel="noopener noreferrer"
                     className="p-3 bg-blue-50 text-blue-700 text-center rounded-xl hover:bg-blue-100 transition-all flex flex-col justify-center items-center gap-1 border border-blue-150"
                  >
                     <span>⚙️ وحدة تحكم Firebase</span>
                     <span className="text-[10px] text-blue-500 font-normal">مراقبة وترقية الحساب</span>
                  </a>
              </div>

              <div className="flex gap-3 mt-4">
                  <button 
                     onClick={() => setQuotaError(null)}
                     className="flex-1 py-3 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl transition-all"
                  >
                     تجاهل التنبيه مؤقتاً
                  </button>
              </div>
          </div>
      </div>
    );
  };

  // Full runtime cloud gate: it remains authoritative after login and reappears instantly
  // whenever internet/Firestore is lost. There is no timeout bypass and no local mode.
  const shouldHoldCloudEntry = isAuthenticated && (!isOnline || dataLoading || !hasLoadedDataRef.current);

  if (shouldHoldCloudEntry) {
    return (
      <>
        {renderAuthError()}
        {renderQuotaError()}
        <CloudConnectionGate
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          name={data?.settings?.companyName || 'شركة مطبخ التراث الكويتي'}
          phase={cloudChecking ? 'sync' : (!isOnline ? 'offline' : 'sync')}
          onRetry={handleManualRetryOffline}
        />
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  if (!isAuthenticated && !isOnline) {
    return (
      <>
        {renderAuthError()}
        <CloudConnectionGate
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          name={data?.settings?.companyName || 'شركة مطبخ التراث الكويتي'}
          phase={cloudChecking ? 'sync' : 'offline'}
          onRetry={handleManualRetryOffline}
        />
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        {renderAuthError()}
        {renderQuotaError()}
        <Login 
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          onLogin={() => {
            hasLoadedDataRef.current = false;
            setDataLoading(true);
            setData(INITIAL_DATA);
            setAppMode('cloud');
            localStorage.setItem('appMode', 'cloud');
            setIsAuthenticated(true);
            localStorage.setItem('isAuthenticated', 'true');
            setCurrentPage(getInitialPageFromDeepLink());
            void probeCloudConnection(false);
          }} 
        />
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  const renderAppContent = () => {
    // Demo/local mode must use the admin experience, even if a previous cloud user was a partner.
    if (appMode !== 'local' && userRole === 'partner') {
      switch (currentPage) {
        case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={true} />;
        case 'invoices-list': return (
          <ReportsPage 
            data={data} 
            setData={setData} 
            defaultTab="invoices" 
            deepLinkData={deepLinkData}
            onClearDeepLink={() => {}}
            isPartner={true}
          />
        );
        case 'new-invoice': return (
          <InvoicePage 
            data={data} 
            setData={setData} 
            editingInvoiceId={editingInvoiceId} 
             isPartner={true} 
            onFinished={() => {
              setEditingInvoiceId(null);
              setCurrentPage('dashboard');
            }}
          />
        );
        case 'ai': return <AIAssistant data={data} currentPage={currentPage} />;
        case 'diwaniya':
          return <div className="partner-clean-shell"><PartnerDashboard data={data} onNavigate={setCurrentPage} onLogout={handleLogout} deepLinkData={deepLinkData} /></div>;
        case 'smart-studio': return <SmartContentStudio data={data} setData={setData} onNavigate={setCurrentPage} />;
        default: return <div className="partner-clean-shell"><PartnerDashboard data={data} onNavigate={setCurrentPage} onLogout={handleLogout} deepLinkData={deepLinkData} /></div>;
      }
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={(page) => setCurrentPage(page)} setDeepLinkData={setDeepLinkData} defaultTab={deepLinkData.exactId || 'pulse'} scrollTarget={deepLinkData.scrollTarget} scrollTargetTimestamp={deepLinkData._t} onActiveTabChange={setDashboardTab} />;
      case 'dashboard-ai': return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={(page) => setCurrentPage(page)} setDeepLinkData={setDeepLinkData} defaultTab="intelligence" scrollTarget={deepLinkData.scrollTarget} onActiveTabChange={setDashboardTab} />;
      case 'new-invoice': return (
        <InvoicePage 
          data={data} 
          setData={setData} 
          editingInvoiceId={editingInvoiceId} 
          isPartner={false}
          onFinished={() => {
            setEditingInvoiceId(null);
            setCurrentPage('invoices-list');
          }}
        />
      );
      case 'invoices-list': return (
        <ReportsPage 
          data={data} 
          setData={setData} 
          defaultTab="invoices" 
          onEditInvoice={(id) => {
            if (id === 'new') {
               setEditingInvoiceId(null);
            } else {
               setEditingInvoiceId(id);
            }
            setCurrentPage('new-invoice');
          }}
          deepLinkData={deepLinkData}
          onClearDeepLink={() => {}}
        />
      );
      case 'customers': return <CustomerPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'products': return <ProductPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'suppliers': return <SupplierPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'expenses': return <ExpensePage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={false} />;
      case 'coupons':
      case 'loyalty':
        return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={(page) => setCurrentPage(page)} setDeepLinkData={setDeepLinkData} defaultTab="rewards" scrollTarget={deepLinkData.scrollTarget} scrollTargetTimestamp={deepLinkData._t} onActiveTabChange={setDashboardTab} />;
      case 'growth-simulator': return <WhatIfSimulator data={data} onUpdateData={setData} />;
      case 'profit-guard': return <RealProfitGuard data={data} />;
      case 'reports': return (
        <ReportsPage
          data={data}
          setData={setData}
          deepLinkData={deepLinkData}
          onClearDeepLink={() => {}}
        />
      );
      case 'ai': return <AIAssistant data={data} currentPage={currentPage} />;
      case 'smart-studio': return <SmartContentStudio data={data} setData={setData} onNavigate={setCurrentPage} />;
      case 'diwaniya': return <DiwaniyaTournaments data={data} setData={setData} onNavigate={setCurrentPage} />;
      case 'whatsapp-support': return <WhatsAppSupportInbox data={data} />;
      case 'settings': return <GeneralSettings data={data} setData={setData} appMode={appMode} switchMode={switchMode} addToast={addToast} onCloudImport={onCloudImport} />;
      case 'suppliers-audit': return (
        <SupplierAudit 
          data={data} 
          setData={setData} 
          initialSupplierId={deepLinkData.supplierId} 
          autoOpenModal={deepLinkData.openModal}
          onClearDeepLink={() => setDeepLinkData({})}
          deepLinkData={deepLinkData}
        />
      );
      default: return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={setCurrentPage} onActiveTabChange={setDashboardTab} />;
    }
  };

  const showExecutiveFloatingTools = currentPage === 'dashboard' && dashboardTab === 'pulse';
  const floatingToolRole = userRole;
  
  // Instagram Wand: admin/local stays limited to dashboard pulse; partner gets it on
  // the partner dashboard.
  //
  // The partner never has currentPage === 'dashboard' the way the admin does: their home
  // surface is PartnerDashboard, which renders for the default page AND 'diwaniya'. The
  // old check only matched the literal 'dashboard', so the wand appeared right after
  // login but vanished the moment the partner moved within their own dashboard — the
  // exact "not at full capacity" the owner reported. It now shows across the whole
  // partner dashboard surface, hidden only on the full-screen tool pages where a
  // floating button would overlap, so the partner gets the same tool the admin does.
  const partnerToolPages = ['orders', 'invoices-list', 'new-invoice', 'ai', 'smart-studio'];
  const partnerOnDashboard = floatingToolRole === 'partner' && !partnerToolPages.includes(currentPage);
  const showInstagramFloatingTool = showExecutiveFloatingTools || partnerOnDashboard;

  // Second Tool (Radar/Search): Admin/local -> only on pulse. Partner -> hide completely.
  const showSecondFloatingTools = (floatingToolRole === 'admin' || floatingToolRole === 'local') && showExecutiveFloatingTools;

  return (
    <div className="admin-heritage-shell flex h-[100dvh] w-full overflow-hidden bg-atmospheric text-slate-900 arabic-font" dir="rtl">
      <AmbientBackground />
      
      {renderAuthError()}
      {renderQuotaError()}
      <DataRefreshNotice show={Boolean(dataLoading && isAuthenticated)} mode={appMode} />
      <NetworkStatusNotice online={isOnline} />
      <AdminOnboardingModal
        open={onboardingOpen}
        role={onboardingRole}
        onClose={() => setOnboardingOpen(false)}
        onNavigate={(page) => {
          const destination = page === 'notifications' ? 'dashboard' : page;
          setCurrentPage(destination);
          setSidebarOpen(false);
          setCommandBarOpen(false);
          if (page === 'notifications') {
            window.setTimeout(() => setNotifOpen(true), 80);
          } else {
            setNotifOpen(false);
          }
        }}
      />
      {/* Sidebar Overlay (Mobile Only) */}
      <AnimatePresence>
        {isMobile && sidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar Navigation */}
      <motion.aside 
        ref={sidebarRef}
        initial={false}
        animate={{ 
          width: isMobile ? (sidebarOpen ? 280 : 0) : (sidebarOpen ? 280 : 80),
          x: isMobile ? (sidebarOpen ? 0 : 280) : 0,
          opacity: isMobile ? (sidebarOpen ? 1 : 0) : 1
        }}
        transition={{ type: 'tween', ease: "easeOut", duration: 0.3 }}
        className={cn(
          "bg-slate-950 text-white flex flex-col transition-all relative",
          isMobile ? "fixed right-0 top-0 bottom-0 shadow-[0_0_80px_rgba(0,0,0,0.8)] z-[1001]" : "relative z-40 border-l border-white/5 overflow-hidden"
        )}
      >
        {/* Sidebar Background Accents */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[120%] h-[120%] bg-gradient-to-bl from-amber-500/10 via-transparent to-transparent blur-3xl" />
          <div className="absolute bottom-0 left-0 w-full h-[30%] bg-gradient-to-t from-indigo-500/10 to-transparent" />
        </div>

        <div className="p-4 flex items-center justify-between border-b border-white/5 shrink-0 h-24 relative z-10">
           <div className="flex items-center gap-4 w-full justify-center lg:justify-start">
            <LogoEngine src={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO} variant="royal" />
            {(sidebarOpen || isMobile) && (
              <div className="flex flex-col">
                <div className="text-right whitespace-nowrap overflow-hidden">
                    <div className="font-bold text-xl tracking-tight bg-gradient-to-l from-white via-amber-200 to-amber-500 bg-clip-text text-transparent">التراث الكويتي</div>
                    <div className="text-[10px] text-amber-500/80 font-bold uppercase tracking-[0.2em] leading-none mt-1">المحرك الذهبي</div>
                </div>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/40 transition-all hover:text-white">
              <X size={20} />
            </button>
          )}
        </div>

        {userRole !== 'partner' && (
          <nav className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar overflow-x-hidden relative z-10">
            <div className="pt-2">
               <button
                 type="button"
                 aria-expanded={expandedMenus.invoices}
                 onClick={() => {
                    preloadAdminPage('new-invoice');
                    preloadAdminPage('invoices-list');
                    preloadAdminPage('customers');
                    if (!sidebarOpen && !isMobile) {
                      setSidebarOpen(true);
                      openMenu('invoices');
                    } else {
                      toggleMenu('invoices');
                    }
                 }}
                 className={cn(
                   "w-full border-0 bg-transparent flex items-center justify-between text-white/40 px-3 mb-3 cursor-pointer hover:text-white transition-all group",
                   (!sidebarOpen && !isMobile) && "justify-center px-0 opacity-50"
                 )}
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <FileText size={16} />
                     </div>
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-bold whitespace-nowrap uppercase tracking-[0.25em] opacity-80">سجل المبيعات</span>}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <motion.div animate={{ rotate: expandedMenus.invoices ? 0 : 180 }}>
                      <ChevronDown size={14} className="opacity-40" />
                    </motion.div>
                  )}
               </button>
               
               <AnimatePresence>
                {expandedMenus.invoices && (sidebarOpen || isMobile) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 mr-4 border-r-2 border-amber-500/20 pr-4 overflow-hidden"
                  >
                      <SubNavItem 
                        label="فاتورة جديدة"
                        icon={<PlusCircle size={16} />}
                        active={currentPage === 'new-invoice'} 
                        preloadPage="new-invoice"
                        onClick={() => navigateFromSidebar('new-invoice', { resetInvoice: true })}
                      />
                      <SubNavItem 
                        label="سجل الفواتير"
                        icon={<Receipt size={16} />}
                        active={currentPage === 'invoices-list'} 
                        preloadPage="invoices-list"
                        onClick={() => navigateFromSidebar('invoices-list')}
                      />
                      <SubNavItem 
                        label="قائمة العملاء"
                        icon={<Users size={16} />}
                        active={currentPage === 'customers'} 
                        preloadPage="customers"
                        onClick={() => navigateFromSidebar('customers')}
                      />
                      <SubNavItem 
                        label="مركز واتساب الذكي"
                        icon={<MessageSquare size={16} />}
                        active={currentPage === 'whatsapp-support'} 
                        onClick={() => navigateFromSidebar('whatsapp-support')}
                      />
                  </motion.div>
                )}
               </AnimatePresence>
            </div>

            <div className="pt-2">
               <button
                 type="button"
                 aria-expanded={expandedMenus.operations}
                 onClick={() => {
                    preloadAdminPage('products');
                    preloadAdminPage('expenses');
                    preloadAdminPage('suppliers');
                    if (!sidebarOpen && !isMobile) {
                      setSidebarOpen(true);
                      openMenu('operations');
                    } else {
                      toggleMenu('operations');
                    }
                 }}
                 className={cn(
                   "w-full border-0 bg-transparent flex items-center justify-between text-white/40 px-3 mb-3 cursor-pointer hover:text-white transition-all group",
                   (!sidebarOpen && !isMobile) && "justify-center px-0 opacity-50"
                 )}
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Package size={16} />
                     </div>
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-bold whitespace-nowrap uppercase tracking-[0.25em] opacity-80">الإنتاج والمالية</span>}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <motion.div animate={{ rotate: expandedMenus.operations ? 0 : 180 }}>
                      <ChevronDown size={14} className="opacity-40" />
                    </motion.div>
                  )}
               </button>
               
               <AnimatePresence>
                {expandedMenus.operations && (sidebarOpen || isMobile) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 mr-4 border-r-2 border-indigo-500/20 pr-4 overflow-hidden"
                  >
                      <SubNavItem 
                        label="قائمة المنتجات"
                        icon={<Package size={16} />}
                        active={currentPage === 'products'} 
                        preloadPage="products"
                        onClick={() => navigateFromSidebar('products')}
                      />
                      <SubNavItem 
                        label="المصروفات العامة"
                        icon={<CircleDollarSign size={16} />}
                        active={currentPage === 'expenses'} 
                        preloadPage="expenses"
                        onClick={() => navigateFromSidebar('expenses')}
                      />
                      <SubNavItem 
                        label="الموردين والمراجعة"
                        icon={<HandCoins size={16} />}
                        active={currentPage === 'suppliers' || currentPage === 'suppliers-audit'} 
                        preloadPage="suppliers"
                        onClick={() => navigateFromSidebar('suppliers')}
                      />
                  </motion.div>
                )}
               </AnimatePresence>
            </div>
          </nav>
        )}


      </motion.aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col relative overflow-hidden transition-colors duration-1000"
      )}>
        {/* Runtime cloud loss is handled by the full-screen CloudConnectionGate above. */}
        {/* Top Header */}
        <header 
          onClick={closeAllMenus}
          className="h-16 md:h-20 glass-surface border-b border-slate-200/60 flex items-center justify-between px-3 xs:px-4 lg:px-10 z-[100] sticky top-0 shadow-sm shrink-0"
        >
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink min-w-0">
            {userRole !== 'partner' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
                className="p-2 hover:bg-slate-900 group rounded-[0.8rem] sm:rounded-2xl transition-all text-slate-600 hover:text-white shadow-sm shrink-0"
                title="القائمة الجانبية"
              >
                <Menu size={18} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
            {userRole !== 'partner' && <div className="hidden sm:block h-4 w-[1px] bg-slate-200" />}
            
            <button 
              onClick={() => {
                setDeepLinkData({ exactId: 'pulse', _t: Date.now() });
                setSidebarOpen(false);
                setCurrentPage('dashboard');
                setSidebarOpen(false);
              }}
              title="العودة للصفحة الرئيسية"
              className={cn(
                "flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-[0.8rem] sm:rounded-2xl transition-all group shrink-0",
                currentPage === 'dashboard' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-slate-100/50 hover:bg-slate-200 text-slate-600"
              )}
            >
              <Home size={16} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <div className="flex items-center gap-1.5 shrink-0" title={appMode === 'cloud' ? "متصل بالسحابة" : "غير متصل"}>
              {dataLoading ? (
                 <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
              ) : (
                 <div className={cn("w-1.5 h-1.5 rounded-full", appMode === 'cloud' ? "bg-emerald-500" : "bg-red-500")} />
              )}
            </div>
            
            {deferredChromeReady && (
              <React.Suspense fallback={null}>
                <SmartIconGuide guideKey="header-system-pulse" title="مؤشر صحة الربط السحابي والجسر" position="bottom">
                  <div className="hidden xs:block scale-75 origin-left">
                    <SystemPulseOrb data={data} />
                  </div>
                </SmartIconGuide>
              </React.Suspense>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 shrink-0">
             {/* Magic Command Bar Trigger */}
             {userRole !== 'partner' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setCommandBarOpen(true); }}
                title="البحث السريع (Ctrl+K)"
                className="hidden md:flex items-center gap-2 sm:gap-4 glass-surface hover:bg-white p-3 sm:px-5 sm:py-3 rounded-[1rem] sm:rounded-2xl transition-all group overflow-hidden hover:shadow-md hover:border-amber-400"
              >
                  <Search size={16} className="text-slate-500 group-hover:text-amber-500 group-hover:scale-125 transition-all" />
                  <span className="hidden sm:block text-xs font-bold text-slate-500">ابحث عن أي شيء...</span>
                  <div className="hidden sm:flex gap-1.5 items-center bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-[0.5rem] shadow-sm group-hover:shadow-md group-hover:bg-amber-100/50 transition-all">
                    <span className="text-[11px] font-bold text-amber-700">K</span>
                    <span className="text-[10px] font-bold text-amber-600/50">+</span>
                    <span className="text-[11px] font-bold text-amber-700">Ctrl</span>
                  </div>
               </button>
             )}

              {/* Removed isStandalone button from header */}

              <button 
                onMouseEnter={() => preloadAdminPage('new-invoice')}
                onFocus={() => preloadAdminPage('new-invoice')}
                onTouchStart={() => preloadAdminPage('new-invoice')}
                onClick={() => {
                  setEditingInvoiceId(null);
                  setCurrentPage('new-invoice');
                  setSidebarOpen(false);
                }}
                title="إنشاء فاتورة جديدة"
                className="flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 bg-slate-900 text-white rounded-[0.8rem] sm:rounded-2xl font-bold shadow-md sm:shadow-xl hover:bg-slate-800 transition-all transform hover:scale-105 active:scale-95 group shrink-0"
              >
                <Plus size={16} className="sm:size-5 group-hover:rotate-90 transition-transform" />
              </button>

              <SmartIconGuide guideKey="header-ai-assistant" title="مساعد التراث الذكي للتحليل والقرارات" position="bottom">
                <button 
                  onClick={() => { try { localStorage.setItem('ai_context_page', currentPage); } catch {} setCurrentPage('ai'); setSidebarOpen(false); }}
                  title="مساعد التراث الذكي"
                  className={cn(
                    "flex w-9 h-9 sm:w-11 sm:h-11 rounded-[0.8rem] sm:rounded-2xl transition-all items-center justify-center relative group overflow-hidden shrink-0",
                    currentPage === 'ai' ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-slate-100/50 text-slate-500 hover:bg-white hover:shadow-lg border border-transparent hover:border-amber-200/40"
                  )}
                >
                  <Bot size={18} className={cn("transition-all relative z-10", currentPage === 'ai' ? "text-amber-400" : "group-hover:text-amber-500 group-hover:scale-110")} />
                  {currentPage === 'ai' && (
                    <motion.div 
                      layoutId="aiActiveHeader"
                      className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"
                    />
                  )}
                  <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping border border-white z-20" />
                </button>
              </SmartIconGuide>

            {/* Notifications */}
            <div className="relative shrink-0" ref={notifRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                className={cn(
                  "flex w-9 h-9 sm:w-11 sm:h-11 rounded-[0.8rem] sm:rounded-2xl items-center justify-center transition-all relative z-50",
                  notifOpen ? "bg-slate-200 text-slate-800 animate-none" : "bg-slate-100/50 hover:bg-slate-200 text-slate-600"
                )}
                title="عرض التنبيهات"
                aria-label="تنبيهات"
              >
                <Bell size={18} className={cn("transition-colors", notifOpen ? "text-primary" : "text-slate-600")} />
                {hasUnreadVisibleNotifications && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
              
              <AnimatePresence>
                {notifOpen && (
                  <>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setNotifOpen(false)}
                      className="fixed inset-0 bg-black/15 z-[9998]"
                    />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute left-0 mt-3 w-[290px] xs:w-[320px] sm:w-[380px] md:w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200/60 z-[9999] overflow-hidden origin-top-left"
                      >
                      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                        <span className="font-bold text-slate-800 text-sm sm:text-base">التنبيهات الذكية</span>
                        <div className="flex items-center gap-1">
                           <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title={isSoundEnabled ? "إيقاف التنبيه الصوتي" : "تفعيل التنبيه الصوتي"}>
                               {isSoundEnabled ? <Volume2 size={18} className="text-emerald-600" /> : <VolumeX size={18} className="text-slate-500" />}
                           </button>
                           <button 
                             onClick={(e) => {
                                 e.stopPropagation();
                                 storeReadNotifications(data?.notifications || []);
                                 setData(prev => ({
                                     ...prev,
                                     notifications: (prev?.notifications || []).map(n => ({ ...n, read: true }))
                                 }));
                             }}
                             className="text-xs text-primary font-bold hover:underline bg-transparent border-none"
                           >
                             تحديد الكل كمقروء
                           </button>
                        </div>
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto p-2 scrollbar-hide">
                      {visibleNotifications.length > 0 ? (
                        visibleNotifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={(e) => {
                                e.stopPropagation();
                                storeReadNotifications([notif]);
                                setData(prev => ({
                                    ...prev,
                                    notifications: (prev?.notifications || []).map(n => n.id === notif.id || getNotificationReadKeys(n).some(key => getNotificationReadKeys(notif).includes(key)) ? { ...n, read: true } : n)
                                }));
                                setNotifOpen(false);
                                
                                // Navigate logic based on arabic keywords
                                const title = notif.title || '';
                                const msg = notif.message || '';
                                const text = (title + ' ' + msg).toLowerCase();
                                
                                if (notif.id?.startsWith('sup-bal-')) {
                                  const supId = notif.id.replace('sup-bal-', '');
                                  setDeepLinkData({ supplierId: supId, openModal: true });
                                  setCurrentPage('suppliers-audit');
                                } else if (text.includes('مورد') || text.includes('سداد') || text.includes('دفع') || text.includes('مستحقات')) {
                                  // Try to find a supplier if not explicitly provided
                                  let targetSup = '';
                                  if (text.includes('مورد رقم 1') || text.includes('مورد 1')) targetSup = 's0';
                                  else if (text.includes('مورد رقم 2') || text.includes('مورد 2')) targetSup = 's1';
                                  
                                  setDeepLinkData({ supplierId: targetSup || undefined, openModal: true });
                                  setCurrentPage('suppliers-audit');
                                } else if (text.includes('منتج') || text.includes('وجبة')) {
                                  setCurrentPage('products');
                                } else if (text.includes('عميل')) {
                                  setCurrentPage('customers');
                                }
                            }}
                            className={cn(
                                "p-3 rounded-xl mb-1 transition-all cursor-pointer hover:bg-slate-50 border border-transparent",
                                isNotificationReadForUi(notif) ? "opacity-60 bg-white" : "bg-primary/5 border-primary/10 shadow-sm"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <div className={cn(
                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                notif.type === 'warning' ? "bg-amber-100 text-amber-600" :
                                notif.type === 'success' ? "bg-emerald-100 text-emerald-600" :
                                "bg-blue-100 text-blue-600"
                              )}>
                                <Bell size={18} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 mb-1 leading-tight break-words whitespace-normal">{notif.title}</div>
                                <div className="text-[11px] text-slate-500 leading-relaxed break-words whitespace-normal">{notif.message}</div>
                                <div className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  {formatKuwaitiDateOnly(notif.date)}
                                </div>
                              </div>
                              {!isNotificationReadForUi(notif) && (
                                <div className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 mt-1 animate-pulse" />
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-5 md:p-10 text-center">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Bell size={28} className="text-slate-200" />
                          </div>
                          <div className="font-bold text-slate-500">ماكو تنبيهات</div>
                          <div className="text-[11px] text-slate-300 mt-1">سيظهر هنا كل جديد يخص المطعم</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>

            <div 
              onClick={(e) => {
                if (userRole === 'partner') {
                  e.preventDefault();
                  return;
                }
                setCurrentPage('settings');
              }}
              className={cn("flex items-center gap-1.5 sm:gap-2.5 pl-1 sm:pl-2 p-1 rounded-2xl transition-all max-w-[150px] xs:max-w-[200px] sm:max-w-[300px] shrink-0 border border-transparent cursor-pointer hover:bg-slate-100/50 hover:scale-105 active:scale-95")}
            >
              <div className="text-right hidden md:flex flex-col overflow-hidden leading-tight min-w-0">
                <div className="text-[11px] sm:text-xs font-bold truncate text-slate-800">{user?.displayName || 'د. أحمد الفيلكاوي'}</div>
                <div className="text-[9px] text-slate-500 truncate">{user?.email || 'volcanokw@gmail.com'}</div>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-slate-250 shrink-0 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0 shadow-sm">
                  {user?.displayName?.charAt(0) || 'أ'}
                </div>
              )}
            </div>

          <button 
            onClick={handleLogout}
            className="flex p-2 sm:p-2.5 bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white rounded-[0.8rem] sm:rounded-2xl transition-all shadow-sm group active:scale-95 border border-rose-100/50 shrink-0 cursor-pointer w-9 h-9 sm:w-11 sm:h-11 items-center justify-center"
            title="تسجيل الخروج"
          >
            <LogOut size={16} className="transition-transform group-hover:scale-110 group-hover:rotate-12" />
          </button>
          
          <div className="h-6 w-[1px] bg-slate-200 ml-1 mr-1 hidden lg:block" />
        </div>
      </header>

        {/* Content Container */}
        <main 
          ref={mainRef} 
          onClick={() => {
            if (sidebarOpen && !isMobile) {
              setSidebarOpen(false);
            }
          }}
          className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 lg:p-6 relative bg-slate-50/50"
        >
          {/* Global Background Accents - Removed for performance */}
          <div className="fixed inset-0 pointer-events-none z-0">
          </div>
          {deferredChromeReady && (
            <React.Suspense fallback={null}>
              <InstallPrompt />
            </React.Suspense>
          )}
          {deferredChromeReady && showSecondFloatingTools && (
            <React.Suspense fallback={null}>
              <ProactiveAlerts 
                userRole={userRole}
                currentPage={currentPage}
                notifications={(data.notifications || []).filter(n => !n.title?.includes('درع') && !n.title?.includes('مجبوس دجاج'))} 
                isNotificationRead={isNotificationReadForUi}
                onMarkAsRead={(id) => {
                   const target = (data?.notifications || []).find(n => n.id === id);
                   if (target) storeReadNotifications([target]);
                   else storeReadNotificationIds([id]);
                   setData(prev => ({
                       ...prev,
                       notifications: (prev?.notifications || []).map(n => n.id === id || (target && getNotificationReadKeys(n).some(key => getNotificationReadKeys(target).includes(key))) ? { ...n, read: true } : n)
                   }));
                }} 
                onMarkAllAsRead={() => {
                   storeReadNotifications((data?.notifications || []).filter(n => n.insightType));
                   setData(prev => ({
                       ...prev,
                       notifications: (prev?.notifications || []).map(n => n.insightType ? { ...n, read: true } : n)
                   }));
                }}
              />
            </React.Suspense>
          )}
          {deferredChromeReady && userRole !== 'partner' && currentPage === 'dashboard' && (
            <React.Suspense fallback={null}>
              <CommandBrief data={data} dateFilter="day" onNavigate={navigateAdminPage} />
            </React.Suspense>
          )}
          <AnimatePresence>
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 0.12, 
                ease: "easeOut"
              }}
              className="w-full min-h-full relative z-10 px-4 md:px-6"
            >
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 className="animate-spin text-amber-500 w-12 h-12" /><p className="text-slate-500 text-sm font-bold animate-pulse">نحمّل...</p></div>}>
                 <PageErrorBoundary>
                   {userRole === 'partner' ? renderAppContent() : (
                    <AdminExperienceFrame page={currentPage} data={data} onNavigate={(page) => { setCurrentPage(page); setSidebarOpen(false); }}>
                      {renderAppContent()}
                    </AdminExperienceFrame>
                   )}
                 </PageErrorBoundary>
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      {commandBarOpen && (
        <React.Suspense fallback={null}>
          <CommandBar 
            isOpen={commandBarOpen} 
            onClose={() => setCommandBarOpen(false)} 
            onNavigate={(page, payload) => {
               navigateAdminPage(page, payload);
            }}
            data={data}
            userRole={userRole}
          />
        </React.Suspense>
      )}

      {/* Global Scroll Progress + Back to Top */}
      <AnimatePresence>
        {showTopButton && userRole !== 'partner' && (
          <motion.button
            initial={{ opacity: 0, scale: 0.86, x: 10 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.86, x: 10 }}
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed right-2.5 bottom-24 sm:right-6 sm:bottom-12 z-[9999] h-20 w-8 sm:h-14 sm:w-14 rounded-full bg-white/72 sm:bg-white/90 text-slate-900 shadow-[0_10px_28px_rgba(15,23,42,0.14)] sm:shadow-[0_14px_40px_rgba(15,23,42,0.16)] border border-white/70 backdrop-blur-xl flex items-center justify-center transition-all hover:-translate-y-1 hover:shadow-[0_18px_48px_rgba(15,23,42,0.22)] active:scale-95 group overflow-hidden sm:overflow-visible"
            title={`الرجوع للأعلى - تم تصفح ${Math.round(scrollProgress)}٪`}
            aria-label={`الرجوع للأعلى - تم تصفح ${Math.round(scrollProgress)}٪`}
          >
            {/* Mobile: one soft edge capsule with a liquid progress fill */}
            <span className="sm:hidden absolute inset-[3px] rounded-full bg-slate-950/[0.035] overflow-hidden" aria-hidden="true">
              <motion.span
                className="absolute bottom-0 left-0 right-0 rounded-full bg-gradient-to-t from-teal-500/55 via-sky-400/38 to-white/10"
                animate={{ height: `${Math.max(10, Math.min(100, scrollProgress))}%` }}
                transition={{ type: 'spring', stiffness: 170, damping: 26 }}
              />
              <span className="absolute inset-x-1 top-1 h-3 rounded-full bg-white/50 blur-[1px]" />
            </span>

            {/* Desktop: refined circular progress, same original behavior */}
            <svg className="hidden sm:block absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56" aria-hidden="true">
              <circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="rgba(15, 23, 42, 0.08)"
                strokeWidth="4"
              />
              <motion.circle
                cx="28"
                cy="28"
                r="22"
                fill="none"
                stroke="url(#scrollProgressGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={scrollProgressCircle}
                animate={{ strokeDashoffset: scrollProgressOffset }}
                transition={{ type: 'spring', stiffness: 170, damping: 24 }}
              />
              <defs>
                <linearGradient id="scrollProgressGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#0284c7" />
                </linearGradient>
              </defs>
            </svg>
            <span className="hidden sm:block absolute inset-2 rounded-full bg-slate-50/80 shadow-inner" aria-hidden="true" />
            <span className="sm:hidden absolute inset-[7px] rounded-full border border-white/45" aria-hidden="true" />
            <ArrowUp className="relative z-10 transition-transform group-hover:-translate-y-0.5 drop-shadow-[0_1px_2px_rgba(255,255,255,0.65)]" size={18} strokeWidth={2.8} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Global Smart Pulse Overlay */}
      <AnimatePresence>
        {isAIThinking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 px-6 py-4 rounded-3xl shadow-xl border border-indigo-100 flex items-center gap-4 animate-bounce">
              <div className="relative">
                <Bot className="text-indigo-600" size={24} />
                <Sparkles className="absolute -top-2 -right-2 text-amber-500 animate-pulse" size={12} />
              </div>
              <span className="font-bold text-slate-800 text-sm">نحلل البيانات...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE QUICK NAVIGATION TRIGGER --- */}
      <AnimatePresence>
        {isMobile && !commandBarOpen && showSecondFloatingTools && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`fixed transition-all duration-700 ease-in-out left-1/2 -translate-x-1/2 z-[100] md:hidden bottom-[3.42rem]`}
          >
            <button
              onClick={() => setCommandBarOpen(true)}
              className="flex items-center justify-center w-11 h-11 bg-slate-950/95 backdrop-blur-3xl rounded-full shadow-[0_16px_35px_rgba(0,0,0,0.7)] border border-white/10 active:scale-95 transition-all relative group overflow-hidden"
              title="مركز الأوامر الذكي"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-indigo-500/0 opacity-50"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10 flex items-center justify-center bg-white/5 rounded-full w-7 h-7 backdrop-blur-md border border-white/5">
                <Command className="text-amber-400 group-hover:scale-110 transition-transform duration-300" size={15} />
              </div>
              {hasUnreadVisibleNotifications && (
                <div className="absolute top-2.5 right-2.5 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-[120%] w-[120%] rounded-full bg-amber-400 opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                </div>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {deferredChromeReady && isAuthenticated && showInstagramFloatingTool && (
        <React.Suspense fallback={null}>
          <InstagramMagicWand data={data} currentPage={currentPage} userRole={floatingToolRole} />
        </React.Suspense>
      )}
      <Toaster richColors position="bottom-right" closeButton />
      {renderBeautifulOfflineModal()}
      

    </div>
  );
};

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
  collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, active, onClick, highlight, collapsed }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200",
      active 
        ? "bg-white text-secondary shadow-lg font-bold" 
        : "text-white/70 hover:bg-white/10 hover:text-white",
      highlight && !active && "bg-white/5 border border-white/10",
      collapsed ? "justify-center px-0" : "px-4"
    )}
    title={collapsed ? label : undefined}
  >
    <span className={cn(active ? "text-primary" : "", "shrink-0")}>{icon}</span>
    {!collapsed && <span className="flex-1 text-right truncate text-[13px] font-bold">{label}</span>}
  </button>
);

const SubNavItem: React.FC<{ label: string; icon: React.ReactNode; active?: boolean; preloadPage?: string; onClick: () => void }> = ({ label, icon, active, preloadPage, onClick }) => (
  <button 
    onMouseEnter={() => preloadPage && preloadAdminPage(preloadPage)}
    onFocus={() => preloadPage && preloadAdminPage(preloadPage)}
    onTouchStart={() => preloadPage && preloadAdminPage(preloadPage)}
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 text-right p-3.5 text-[12px] font-bold rounded-2xl transition-all active:scale-95 mb-0.5",
      active ? "text-amber-300 shadow-xl shadow-amber-500/5 bg-white/7 border border-white/10 ring-1 ring-white/10" : "text-white/45 hover:text-white/90 hover:bg-white/5"
    )}
  >
    <span className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all", active ? "bg-amber-400/15 text-amber-300" : "bg-white/5 text-white/50")}>{icon}</span>
    <span className="flex-1 truncate">{label}</span>
  </button>
);


const ZEN_QUOTES = [
  "نفتح مركز القيادة… ونترك الزحمة خارج الباب",
  "الأرقام تتكلم بهدوء… والقرار يظهر بوضوح",
  "إدارة تليق باسم شركة مطبخ التراث",
  "كل طلب له مسار… وكل رقم له معنى",
  "من هنا يبدأ نبض التشغيل الحقيقي",
  "هدوء الواجهة… قوة القرار",
  "نرتّب اليوم قبل أن يبدأ الزحام",
  "مطبخ التراث: تشغيل أذكى، وقرار أسرع"
];

const ZenSplash: React.FC<{ show: boolean, logo?: string, name?: string }> = ({ show, logo, name }) => {
  const [quote, setQuote] = useState(ZEN_QUOTES[0]);

  useEffect(() => {
    const index = Math.floor(Math.random() * ZEN_QUOTES.length);
    setQuote(ZEN_QUOTES[index]);
  }, []);

  const pulseCards = [
    { label: 'المبيعات', value: 'نبض', icon: <TrendingUp size={18} /> },
    { label: 'الطلبات', value: 'مباشر', icon: <ShoppingBag size={18} /> },
    { label: 'الأرباح', value: 'حماية', icon: <Gauge size={18} /> },
  ];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.01, transition: { duration: 0.7, ease: 'easeInOut' } }}
          className="fixed inset-0 z-[99999] flex items-center justify-center overflow-hidden bg-[#080d12] px-5"
          dir="rtl"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,rgba(245,184,74,.24),transparent_28%),radial-gradient(circle_at_16%_84%,rgba(16,185,129,.18),transparent_32%),linear-gradient(135deg,#070b10_0%,#111827_52%,#0b1115_100%)]" />
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-amber-200/10 to-transparent" />
          <div className="absolute -top-24 -right-20 h-72 w-72 rounded-full bg-amber-400/20 blur-[90px]" />
          <div className="absolute -bottom-24 -left-20 h-80 w-80 rounded-full bg-emerald-400/16 blur-[100px]" />
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,.55)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.55)_1px,transparent_1px)] [background-size:44px_44px]" />

          <motion.div
            initial={{ y: 22, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[720px] overflow-hidden rounded-[2.2rem] border border-white/12 bg-white/[0.075] p-6 text-center shadow-[0_34px_100px_rgba(0,0,0,.42)] backdrop-blur-2xl md:p-8"
          >
            <div className="absolute inset-x-8 top-0 h-px bg-gradient-to-l from-transparent via-amber-200/80 to-transparent" />
            <div className="absolute -right-12 top-12 h-32 w-32 rounded-full bg-amber-300/10 blur-3xl" />
            <div className="absolute -left-12 bottom-8 h-32 w-32 rounded-full bg-emerald-300/10 blur-3xl" />

            <motion.div
              initial={{ scale: 0.86, opacity: 0, rotate: -3 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.78, delay: 0.08, ease: 'easeOut' }}
              className="relative mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-[2rem] border border-amber-100/25 bg-gradient-to-br from-[#f8f1df] via-[#efe1bd] to-[#cfb36e] shadow-[0_18px_55px_rgba(245,184,74,.22)] md:h-32 md:w-32"
            >
              <div className="absolute inset-[-10px] rounded-[2.4rem] border border-amber-200/10" />
              <motion.span
                className="absolute inset-[-16px] rounded-[2.6rem] border border-emerald-300/25"
                animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.05, 0.35] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
              <LogoEngine src={logo || DEFAULT_GLOBAL_LOGO} variant="royal" className="relative z-10 h-20 w-20 drop-shadow-xl md:h-24 md:w-24" />
            </motion.div>

            <motion.div
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.62, delay: 0.22, ease: 'easeOut' }}
              className="space-y-3"
            >
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-100/15 bg-amber-100/10 px-4 py-2 text-[11px] font-black text-amber-100 shadow-inner shadow-white/5">
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,.85)]" />
                مركز القيادة يتجهز الآن
              </div>
              <h1 className="text-3xl font-black leading-tight text-white md:text-5xl">
                {name || 'شركة مطبخ التراث الكويتي'}
              </h1>
              <p className="mx-auto max-w-[560px] text-sm font-bold leading-7 text-slate-300 md:text-base">
                {quote}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.46 }}
              className="mt-7 grid grid-cols-3 gap-2 md:gap-3"
            >
              {pulseCards.map((card, index) => (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.54 + index * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.075] px-2 py-3 text-center shadow-inner shadow-white/5"
                >
                  <span className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-amber-100">
                    {card.icon}
                  </span>
                  <p className="text-[10px] font-bold text-slate-400 md:text-xs">{card.label}</p>
                  <p className="mt-1 text-xs font-black text-white md:text-sm">{card.value}</p>
                </motion.div>
              ))}
            </motion.div>

            <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-l from-emerald-300 via-amber-300 to-white shadow-[0_0_24px_rgba(245,184,74,.42)]"
                initial={{ width: '12%' }}
                animate={{ width: ['12%', '58%', '92%'] }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
   const [showSplash, setShowSplash] = useState(true);
   const [logo, setLogo] = useState(DEFAULT_GLOBAL_LOGO);
   const [name, setName] = useState('شركة مطبخ التراث الكويتي');

   useEffect(() => {
     // Warm up the server cache silently while the user reads the splash screen.
     // This eliminates the Cloud Run cold-start delay before they even click login.
     fetch('/api/appdata/full?profile=boot', { cache: 'no-store' }).catch(() => {});
     const timer = setTimeout(() => {
       setShowSplash(false);
     }, 900);
     return () => clearTimeout(timer);
   }, []);

   return (
     <>
       <MainApp />
       <ZenSplash show={showSplash} logo={logo} name={name} />
     </>
   );
};

export default App;
