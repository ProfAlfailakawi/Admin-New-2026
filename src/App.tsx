import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
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
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeArabic } from './lib/utils';
import Dashboard from './components/Dashboard';
import SystemPulseOrb from './components/SystemPulseOrb';
import LogoEngine from './components/ui/LogoEngine';
const InvoicePage = React.lazy(() => import('./components/InvoicePage'));
const CustomerPage = React.lazy(() => import('./components/CustomerPage'));
const ProductPage = React.lazy(() => import('./components/ProductPage'));
const SupplierPage = React.lazy(() => import('./components/SupplierPage'));
const ExpensePage = React.lazy(() => import('./components/ExpensePage'));
import ReportsPage from './components/ReportsPage';
import OrderPage from './components/OrderPage';
import { isPendingStatus, isFailedStatus, isPaidStatus } from './lib/status-utils';
const TrackPage = React.lazy(() => import('./components/TrackPage'));
const AIAssistant = React.lazy(() => import('./components/AIAssistant'));
import PartnerDashboard from './components/PartnerDashboard';
import Login from './components/Login';
const GeneralSettings = React.lazy(() => import('./components/GeneralSettings'));
const SupplierAudit = React.lazy(() => import('./components/SupplierAudit'));
import CommandBar from './components/CommandBar';
import ProactiveAlerts from './components/ProactiveAlerts';
import InstallPrompt from './components/InstallPrompt';
import CloudStatus from './components/CloudStatus';
import { InstagramMagicWand } from './components/InstagramMagicWand';
import { recalculateStateBalances } from './lib/business-logic';
import { INITIAL_DATA, GET_DEMO_DATA } from './data';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from './constants';
import { AppState, Notification } from './types';
import { playSuccessAction } from './lib/sonic';
import { auth, db, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, setDoc, updateDoc, getDoc, getDocs, query, collection, where, doc, limit, orderBy } from 'firebase/firestore';
import { getSmartDoc, deleteDoc } from './firebase';
import { Toaster, toast } from 'sonner';
import { playNewOrderAlert } from './lib/sounds';
import { splitProductsForDatabase, joinProductsFromDatabase } from './lib/utils';

// Remove deduplication import as requested
// import { getDeduplicatedProducts } from './lib/deduplication';

const PaymentFeedbackView = ({ invoiceId, path, searchParams, isUpaymentsCallback, mode = 'cloud' }: any) => {
  const [statusMsg, setStatusMsg] = useState<{title: string, sub: string, isError: boolean} | null>(null);
  
  const resultParam = (searchParams.get('result') || searchParams.get('Result') || searchParams.get('status') || searchParams.get('Status') || '')?.toUpperCase();
  const paymentIdParam = searchParams.get('track_id') || searchParams.get('TrackID') || searchParams.get('charge_id') || searchParams.get('id') || searchParams.get('payment_id') || searchParams.get('paymentId') || searchParams.get('PaymentID');
  
  const isExplicitFail = path === '/cancel' || path === '/failed' || path === '/error' || resultParam === 'CANCELED' || resultParam === 'FAILED' || resultParam === 'DECLINED' || resultParam === 'VOIDED' || resultParam === 'NOT CAPTURED' || resultParam === 'NOT_CAPTURED';
  const urlIndicatesSuccess = !isExplicitFail && (path === '/success' || resultParam === 'CAPTURED' || resultParam === 'SUCCESS' || resultParam === 'SUCCESSFUL' || isUpaymentsCallback);

  useEffect(() => {
    const showMessageAndRedirect = (status: 'success' | 'failed', invoiceIdToSearch: string) => {
        if (status === 'success') {
            setStatusMsg({ title: "اكتملت العملية", sub: "Payment completed successfully", isError: false });
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
        }, 2500);
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
       let actualPaymentId = paymentIdParam;
       
       if (snapshot.exists()) {
         const data = snapshot.data();
         if (data.paymentId && data.paymentId.trim() !== '') {
             actualPaymentId = data.paymentId;
         }
       }

       if (actualPaymentId && !isExplicitFail) {
         fetch('/api/invoice/confirm', {
             method: 'POST',
             signal: AbortSignal.timeout(8000), // 8s timeout
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ paymentId: actualPaymentId, invoiceId })
         }).then(res => res.json()).then(async (verifyObj) => {
             clearTimeout(verificationTimeout);
             let finalStatus: 'success' | 'failed' = 'failed';
             if (verifyObj.verified) {
                 finalStatus = 'success';
                 try {
                    await updateDoc(doc(db, 'invoices', invoiceId), { paymentStatus: 'paid', status: 'مدفوعة', paymentId: actualPaymentId, verifiedByBackend: true });
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
                       await updateDoc(doc(db, 'invoices', invoiceId), { paymentStatus: 'paid', status: 'مدفوعة', paymentId: actualPaymentId, verifiedByBackend: false, verificationError: verifyObj.debugData || 'not_found' });
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
       <div className="bg-white rounded-[2rem] p-4 md:p-8 max-w-lg w-full shadow-2xl border border-slate-100">
           {statusMsg ? (
               <div className="animate-in fade-in zoom-in duration-500 py-6">
                   <div className={cn(
                       "w-12 md:w-20 h-12 md:h-20 rounded-2xl flex items-center justify-center mx-auto mb-6",
                       statusMsg.isError ? "bg-red-50 text-red-500" : "bg-emerald-50 text-emerald-500"
                   )}>
                       {statusMsg.isError ? <XCircle size={40} /> : <CheckCircle2 size={40} />}
                   </div>
                   <h1 className="text-xl md:text-3xl font-black text-slate-800 mb-2">{statusMsg.title}</h1>
                   <p className="text-slate-500 font-bold mb-8 text-lg" dir="ltr">{statusMsg.sub}</p>
                   
                   <div className="flex items-center justify-center gap-3 text-sm text-slate-400 font-bold">
                       <Loader2 size={16} className="animate-spin text-blue-500" />
                       جاري تحويلك لصفحة التتبع...
                   </div>
               </div>
           ) : (
               <div className="py-6 md:py-12 flex flex-col items-center justify-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-emerald-500 border-t-transparent flex items-center justify-center rounded-full animate-spin mb-4" />
                  <p className="font-bold text-slate-500">جاري تأكيد عملية الدفع...</p>
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

const MainApp: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'partner' | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  
  // Persist authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('isAuthenticated') === 'true';
  });
  
  // App mode & standalone
  const [isStandalone, setIsStandalone] = useState(false);
  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches);
  }, []);
  
  // Persist app mode state
  const [appMode, setAppMode] = useState<'local' | 'cloud'>(() => {
    const savedMode = localStorage.getItem('appMode') as 'local' | 'cloud' | null;
    // Always default to cloud for authorized users if no preference is set
    return savedMode || 'cloud';
  });

  // Persist sound state
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem('isSoundEnabled') === 'true';
  });

  useEffect(() => {
    localStorage.setItem('isSoundEnabled', isSoundEnabled.toString());
  }, [isSoundEnabled]);


  const [currentPage, setCurrentPage] = useState('dashboard');
  const mainRef = useRef<HTMLElement>(null);

  // CRITICAL: Ensure app always returns to dashboard on logout and clear any stale navigation state
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentPage('dashboard');
      // Reset any other transient states if needed
      setEditingInvoiceId(null);
      setDeepLinkData({});
    }
    // Security check: Never persist current page to session/local storage
    localStorage.removeItem('currentPage');
  }, [isAuthenticated]);

  // Force cloud mode when user is authenticated for authorized emails
  useEffect(() => {
    if (user && appMode === 'local') {
      const email = user.email?.toLowerCase() || '';
      if (AUTHORIZED_EMAILS.includes(email) || AUTHORIZED_PARTNERS.includes(email)) {
        console.log("Auto-switching to cloud mode for authenticated authorized user.");
        setAppMode('cloud');
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
  const [deepLinkData, setDeepLinkData] = useState<{ supplierId?: string, openModal?: boolean, search?: string, exactId?: string, scrollTarget?: string, _t?: number }>({});
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

  // Extreme Cache clearing for major updates
  useEffect(() => {
    const CURRENT_VERSION = '4.0.0';
    if (localStorage.getItem('app_version') !== CURRENT_VERSION) {
      if ('caches' in window) {
        caches.keys().then(names => {
          for (const name of names) caches.delete(name);
        });
      }
      Object.keys(localStorage).forEach(key => {
        if (key !== 'app_version') localStorage.removeItem(key);
      });
      localStorage.setItem('app_version', CURRENT_VERSION);
      setTimeout(() => {
        window.location.replace(window.location.href); // Full location replace
      }, 500);
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
  
  const [data, setData] = useState<AppState>(INITIAL_DATA);
  const [hasRunMigration, setHasRunMigration] = useState(false);

  // MIGRATION: Ensure old orders have the correct customer names matching the DB
  useEffect(() => {
     if (data?.orders && data?.customers && hasLoadedDataRef.current && !hasRunMigration) {
        let migrationNeeded = false;
        const normalizedOrders = data.orders.map(o => {
            let correctName = o.customerName;
            if (o.customerId) {
                const c = (data?.customers || []).find(c => c.id === o.customerId);
                if (c && c.name && c.name !== o.customerName) { correctName = c.name; }
            } else if (o.customerPhone) {
                const c = (data?.customers || []).find(c => c.phone === o.customerPhone);
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
            console.log("Migration executed: updated customer names in old orders.");
        }
        setHasRunMigration(true);
     }
  }, [data?.orders, data?.customers, hasRunMigration]);
  
  // AUTO SYNC BACKGROUND EFFECT FOR PAYMENTS
  const dataRef = useRef<AppState>(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  useEffect(() => {
    if (!isAuthenticated || dataLoading) return;
    
    const checkPendingPayments = async () => {
      const currentData = dataRef.current;
      const pendingInvoices = currentData.invoices?.filter(i => !i.isDeleted && (i.paymentStatus !== 'paid' && i.paymentStatus !== 'cancelled')) || [];
      if (pendingInvoices.length === 0) return;
      
      let updatedCount = 0;
      const updatedInvoices = [...currentData.invoices];
      // Note: we can't be sure order changes are completely disjoint, but if we do this functionally it's safer.
      const updatedOrders = currentData.orders ? [...currentData.orders] : [];

      for (const inv of pendingInvoices) {
        try {
          const paymentId = inv.paymentId || 'check_by_invoice';
          let verified = false;

          if (paymentId !== 'check_by_invoice') {
             const res = await fetch('/api/invoice/confirm', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ paymentId, invoiceId: inv.id })
             });
             
             if (res.ok) {
               const vData = await res.json();
               if (vData.success && vData.verified) {
                   verified = true;
               }
             }
          }

          if (!verified) {
             // Fallback: Check if the global firestore document was updated by the success link 
             try {
                 const docSnap = await getDoc(doc(db, 'invoices', inv.id));
                 if (docSnap.exists() && docSnap.data().paymentStatus === 'paid') {
                    verified = true;
                 }
             } catch(e) {}
          }

          if (verified) {
            const iIdx = updatedInvoices.findIndex(i => i.id === inv.id);
            if (iIdx !== -1) {
              updatedInvoices[iIdx] = { ...updatedInvoices[iIdx], paymentStatus: 'paid', status: 'مدفوعة' } as any;
              updatedCount++;
              
              const oIdx = updatedOrders.findIndex(o => o.linkedInvoiceId === inv.id);
              if (oIdx !== -1) {
                // Ensure BOTH status and paymentStatus are updated to stay in sync
                updatedOrders[oIdx] = { ...updatedOrders[oIdx], status: 'تم الدفع', paymentStatus: 'paid', paymentMethod: 'KNet' } as any;
              }
            }
          }
        } catch (e) {
          // ignore
        }
      }

      if (updatedCount > 0) {
        setData(prev => {
          // Functionally apply updates to avoid race conditions with other state changes
          const nextInvoices = prev.invoices.map(inv => {
             const u = updatedInvoices.find(ui => ui.id === inv.id);
             return u?.paymentStatus === 'paid' ? { ...inv, paymentStatus: 'paid', status: 'مدفوعة' } : inv;
          }) as any;
          const nextOrders = (prev.orders || []).map(o => {
             const u = updatedOrders.find(uo => uo.id === o.id);
             return u?.paymentStatus === 'paid' ? { ...o, status: 'تم الدفع', paymentStatus: 'paid', paymentMethod: 'KNet' } : o;
          }) as any;
          return { ...prev, invoices: nextInvoices, orders: nextOrders };
        });
        toast.success(`تم التحديث التلقائي: ${updatedCount} معاملة كـ "مدفوع" ✅`);
      }
    };

    const intervalId = setInterval(checkPendingPayments, 15000);
    // Also run once shortly after mount/auth
    const timeoutId = setTimeout(checkPendingPayments, 3000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [isAuthenticated, dataLoading]);
  
  // PWA Install Prompt Logic
  /* Removed PWA Install Prompt Logic in favor of Login component implementation */


  useEffect(() => {
    if (dataLoading) return;

    // Debounce the alert generation to once per 2 seconds to avoid CPU spikes
    const debounceTimer = setTimeout(() => {
      const newNotifications: Notification[] = [];
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
                    dataReference: `قاعدة بيانات العملاء توضح أن آخر طلب لهذا الـVIP كان بتاريخ ${new Date(cust.lastActive!).toLocaleDateString('ar-KW')}.`,
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

    // Add unique notifications
    if (newNotifications.length > 0) {
        setData(prev => {
           let hasAdded = false;
           const updatedNotifs = [...(prev?.notifications || [])];
           
           newNotifications.forEach(newNotif => {
               if (!updatedNotifs.some(n => n.id === newNotif.id)) {
                   updatedNotifs.push(newNotif);
                   hasAdded = true;
               }
           });
           
           if (!hasAdded) return prev;
           return { ...prev, notifications: updatedNotifs };
        });
    }
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [dataLoading, data.invoices, data.suppliers, data.customers, data.testimonials]);

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

  const switchMode = (newMode: 'local' | 'cloud') => {
    // Reset data loading flags first to prevent premature auto-saving
    hasLoadedDataRef.current = false;
    setDataLoading(true);
    
    setAppMode(newMode);
    localStorage.setItem('appMode', newMode);
    
    // Reset to initial data to clear cross-mode leakage
    setData(INITIAL_DATA); 
    
    addToast("تبديل الوضع", `تم الانتقال إلى وضع ${newMode === 'cloud' ? 'التزامن السحابي' : 'التخزين المحلي'}`, "info");
  };

  const [showTopButton, setShowTopButton] = useState(false);

  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement) return;

    const handleScroll = () => {
      // Smart threshold: Show after 200px or 10% of height
      const scrolled = mainElement.scrollTop;
      setShowTopButton(scrolled > 200);
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, [mainRef.current]);

  const handleManualSync = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const dataRef = getSmartDoc('appData', user.uid, user.email);
      const splitData = splitProductsForDatabase(data);
      let sanitizedData = JSON.parse(JSON.stringify(splitData));

      await setDoc(dataRef, sanitizedData, { merge: true });
      addToast("تمت المزامنة ✨", "تم حفظ كافة البيانات في السحابة بنجاح.", "success");
    } catch (err) {
      console.error(err);
      addToast("خطأ في المزامنة", "لم نتمكن من حفظ البيانات حالياً. قد يكون حجم البيانات كبير جداً.", "warning");
    } finally {
      setDataLoading(false);
    }
  };

// Removed the problematic JSON.stringify call for the defunct isSyncEnabled state.

  // Use a ref to strictly prevent saving before we have loaded data
  const hasLoadedDataRef = useRef(false);
  const lastRemoteSnapshotRef = useRef<string | null>(null);

  // Auth Listener - Optimized session management
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      const currentMode = localStorage.getItem('appMode');
      
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
          // Auto-switch to cloud mode on login if authorized
          if (isAuthorized || isPartner) {
            setAppMode('cloud');
            localStorage.setItem('appMode', 'cloud');
          }
            
          setUser(currentUser);
          setUserRole(isAuthorized ? 'admin' : 'partner');
          setIsAuthenticated(true);
          localStorage.setItem('isAuthenticated', 'true');
          setCurrentPage('dashboard');
          setAuthError(null);
          setAuthLoading(false);
        }, 0);
      } else {
        setTimeout(() => {
          setUser(null);
          // Auto-logout removed as requested by the user
          // if (localStorage.getItem('appMode') === 'cloud') {
          //    setIsAuthenticated(false);
          //    localStorage.setItem('isAuthenticated', 'false');
          // }
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
      // If mode is 'local', load from Local Storage 
      if (appMode === 'local') {
          const savedDataStr = localStorage.getItem('ktk_accounting_data');
          if (savedDataStr) {
              try {
                  const parsed = JSON.parse(savedDataStr);
                  const joined = joinProductsFromDatabase(parsed);
                  if (joined.zones) {
                     // Check if they are on the old zones list
                     const hasOldZones = joined.zones.some((z: any) => ['الشويخ التجارية', 'المقبرة', 'أم العيش', 'الحزام الأخضر', 'الصليبية الزراعية', 'الصليبية الصناعية'].includes(z.name));
                     if (hasOldZones) {
                         const zoneMap = new Map(joined.zones.map((z: any) => [z.name, z]));
                         joined.zones = INITIAL_DATA.zones.map(z => {
                            const existing = zoneMap.get(z.name) as any;
                            return existing ? { ...z, cost: existing.cost, profit: existing.profit, finalPrice: existing.finalPrice, isActive: existing.isActive } : z;
                         });
                     } else {
                         // Missing from initially but they have good zones, let's just make sure they are sorted alphabetically.
                         joined.zones = [...joined.zones].sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
                     }
                  } else {
                     joined.zones = INITIAL_DATA.zones;
                  }
                  setData(joined);
              } catch (e) {
                  console.error('Failed to parse local data', e);
                  setData(INITIAL_DATA);
              }
          } else {
              setData(INITIAL_DATA);
          }
          hasLoadedDataRef.current = true;
          setDataLoading(false);
          return;
      }

      // Mode is 'cloud', wait for user authentication
      if (!user) {
        setDataLoading(false);
        return;
      }

      setDataLoading(true);
      hasLoadedDataRef.current = false;

      // Reference to the user's document in the 'appData' collection
      const dataRef = getSmartDoc('appData', user.uid, user.email);
      
      // Run real-time listener if we are a shared user
      const email = user.email?.toLowerCase() || '';

      // Sync customer app orders independently
      try {
         const qOrders = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(300));
         ordersUnsubscribe = onSnapshot(qOrders, (snap) => {
            const externalOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
                    return { ...prev, orders: combined };
                }
                return prev;
            });
         }, (err) => console.error("orders sync error: ", err));
      } catch (e) {
          console.error("Failed to sync orders collection:", e);
      }
      
      // Listen for real-time updates
      syncUnsubscribe = onSnapshot(dataRef, (docSnap) => {
        console.log("Firestore update received for path:", dataRef.path);
        if (docSnap.exists()) {
          const rawData = docSnap.data() as any;
          const remoteDataRaw = joinProductsFromDatabase(rawData);
          console.log("Data received, product count:", remoteDataRaw.products?.length);
          
          setData(prev => {
            // Check if remote data is actually different before setting to avoid loop
            if (JSON.stringify(prev) === JSON.stringify(remoteDataRaw)) {
                console.log("Data received is identical to current, skipping update.");
                return prev;
            }
            
            const prevOrders = prev.orders || [];
            const newOrders = remoteDataRaw.orders || [];
            
            // Check for newly created orders
            if (newOrders.length > 0) {
               const newlyCreatedOrders = newOrders.filter((no: any) => !prevOrders.some((po: any) => po.id === no.id));
               if (newlyCreatedOrders.length > 0) {
                  if (hasLoadedDataRef.current) {
                     newlyCreatedOrders.forEach((order: any) => {
                        fetch('/api/push/order-created-alert', {
                           method: 'POST',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({ orderId: order.id }),
                        }).catch((error) => {
                           console.error('Failed to send order-created push alert:', error);
                        });
                     });

                     if (isSoundEnabled) {
                        playNewOrderAlert();
                        setTimeout(playNewOrderAlert, 2000);
                     }
                  }
               }
            }

            let processedZones = INITIAL_DATA.zones;
            if (remoteDataRaw.zones) {
               const hasOldZones = remoteDataRaw.zones.some((z: any) => ['الشويخ التجارية', 'المقبرة', 'أم العيش', 'الحزام الأخضر', 'الصليبية الزراعية', 'الصليبية الصناعية'].includes(z.name));
               if (hasOldZones) {
                  const zoneMap = new Map(remoteDataRaw.zones.map((z: any) => [z.name, z]));
                  processedZones = INITIAL_DATA.zones.map(z => {
                     const existing = zoneMap.get(z.name) as any;
                     return existing ? { ...z, cost: existing.cost, profit: existing.profit, finalPrice: existing.finalPrice, isActive: existing.isActive } : z;
                  });
               } else {
                  processedZones = [...remoteDataRaw.zones].sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
               }
            }

            const nextData = {
              ...INITIAL_DATA,
              ...remoteDataRaw,
              zones: processedZones,
              notifications: (remoteDataRaw.notifications && remoteDataRaw.notifications.length > 0) 
                ? remoteDataRaw.notifications 
                : []
            };
            lastRemoteSnapshotRef.current = JSON.stringify(nextData);
            return nextData;
          });
        } else {
          console.log("No remote data found, trying to restore from local storage.");
          // Restore from local storage if available to prevent perceived data loss when switching to cloud mode
          const localData = localStorage.getItem('ktk_accounting_data');
          if (localData) {
            try {
              const parsedLocal = JSON.parse(localData);
              setData(parsedLocal);
              console.log("Restored data from local storage.");
            } catch (e) {
              setData(INITIAL_DATA);
            }
          } else {
            setData(INITIAL_DATA);
          }
        }
        hasLoadedDataRef.current = true;
        setDataLoading(false);
      }, (error: any) => {
        console.error("Firestore sync error", error);
        if (error.code === 'permission-denied' && user) {
          setAuthError(`عذراً، ليس لديك صلاحية الوصول إلى البيانات. يرجى التأكد من أن حسابك مصرح له.\nالبريد: ${user.email}`);
        }
        setDataLoading(false);
      });
    };

    startDataSync();

    return () => {
      if (syncUnsubscribe) syncUnsubscribe();
      if (ordersUnsubscribe) ordersUnsubscribe();
    };
  }, [user, appMode]);

  // Auto-save: Handle Local and Cloud separately with debounce for performance
  useEffect(() => {
    // Strictly prevent auto-saving INITIAL_DATA or overwritten data before loading completes
    if (!hasLoadedDataRef.current) return;

    const timeoutId = setTimeout(async () => {
      // Save to Local Storage if explicitely in local mode
      if (appMode === 'local') {
          localStorage.setItem('ktk_accounting_data', JSON.stringify(data));
      }
      
      // Auto-save to Cloud if in cloud mode and authenticated
      if (user && appMode === 'cloud') {
        const dataRef = getSmartDoc('appData', user.uid, user.email);
        try {
          const sanitizedDataStr = JSON.stringify(data);
          
          // Deduplication: prevent writing back what we just read
          if (sanitizedDataStr === lastRemoteSnapshotRef.current) {
             return;
          }

          lastRemoteSnapshotRef.current = sanitizedDataStr;
          console.log("Auto-saving to Firestore:", dataRef.path);
          const splitData = splitProductsForDatabase(data);
          const sanitizedData = JSON.parse(JSON.stringify(splitData));
          await setDoc(dataRef, sanitizedData, { merge: true });
          console.log("Auto-save successful");
          
        } catch (e) {
          console.error("Firestore auto-save error", e);
          toast.error("حدث خطأ أثناء الحفظ التلقائي للسحابة. قد يكون حجم البيانات تجاوز 1 ميجابايت.");
        }
      }
    }, 1000); // 1 second debounce to prevent extreme UI lag on every keystroke

    return () => clearTimeout(timeoutId);
  }, [data, user, appMode]);

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

  const handleLogout = async () => {
    // Implement user's request: Keep local mode data preserved across sessions
    if (appMode === 'local') {
      try {
        // 1. (REMOVED: do not clear local storage on logout to preserve demo data)
        // localStorage.removeItem('ktk_accounting_data');
        
        // 2. Clear Cloud Dev Data (if it exists)
        if (user) {
          const dataRef = getSmartDoc('appData', user.uid, user.email);
          await deleteDoc(dataRef).catch(e => console.warn("Cloud cleanup skipped:", e));
        }
        
        // 3. Keep internal state intact so it saves to local storage properly upon exit
        // setData(INITIAL_DATA);
      } catch (e) {
        console.error("Logout cleanup failed", e);
      }
    }

    sessionStorage.removeItem('hideSampleDataPrompt');
    await logout();
    setIsAuthenticated(false);
    localStorage.removeItem('isAuthenticated');
    setCurrentPage('dashboard');
  };

  const path = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);
  const isUpaymentsCallback = searchParams.has('payment_id') || searchParams.has('result') || searchParams.has('invoice');

  const normalizedPath = path.replace(/\/$/, '');
  
  if (normalizedPath === '/track') {
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center arabic-font text-emerald-600"><Loader2 size={32} className="animate-spin" /></div>}>
        <TrackPage />
      </React.Suspense>
    );
  }

  if (normalizedPath === '/success' || normalizedPath === '/cancel' || normalizedPath === '/failed' || normalizedPath === '/error' || isUpaymentsCallback || normalizedPath.startsWith('/invoice/')) {
    const invoiceId = searchParams.get('invoice') || searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];
    return <PaymentFeedbackView invoiceId={invoiceId} path={normalizedPath} searchParams={searchParams} isUpaymentsCallback={isUpaymentsCallback} />;
  }

  if (authLoading) {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-50 gap-4 arabic-font">
        <Loader2 className="animate-spin text-primary" size={48} />
        <p className="text-slate-500 font-bold">جاري التحميل طال عمرك...</p>
      </div>
    );
  }

  const renderAuthError = () => {
    if (!authError) return null;
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4 md:p-6 text-center arabic-font" dir="rtl">
          <div className="bg-white rounded-3xl p-5 md:p-10 max-w-sm w-full shadow-2xl">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-3">عذراً!</h2>
              <p className="text-red-600 font-bold leading-relaxed mb-8 break-words">{authError}</p>
              <button 
                onClick={() => setAuthError(null)}
                className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-all active:scale-95"
              >
                فهمت (إغلاق)
              </button>
          </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <>
        {renderAuthError()}
        <Login 
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          onLogin={(mode) => {
            setAppMode(mode);
            localStorage.setItem('appMode', mode);
            setIsAuthenticated(true);
            localStorage.setItem('isAuthenticated', 'true');
            setCurrentPage('dashboard');
          }} 
        />
        <Toaster richColors position="bottom-right" closeButton />
      </>
    );
  }

  const renderAppContent = () => {
    if (userRole === 'partner') {
      switch (currentPage) {
        case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={true} />;
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
        case 'ai': return <AIAssistant data={data} />;
        default: return <PartnerDashboard data={data} onNavigate={setCurrentPage} onLogout={handleLogout} />;
      }
    }

    switch (currentPage) {
      case 'dashboard': return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={(page) => setCurrentPage(page)} setDeepLinkData={setDeepLinkData} defaultTab={deepLinkData.exactId || 'pulse'} scrollTarget={deepLinkData.scrollTarget} scrollTargetTimestamp={deepLinkData._t} />;
      case 'dashboard-ai': return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={(page) => setCurrentPage(page)} setDeepLinkData={setDeepLinkData} defaultTab="intelligence" scrollTarget={deepLinkData.scrollTarget} />;
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
          onClearDeepLink={() => setDeepLinkData({})}
        />
      );
      case 'customers': return <CustomerPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => setDeepLinkData({})} />;
      case 'products': return <ProductPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => setDeepLinkData({})} />;
      case 'suppliers': return <SupplierPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} deepLinkData={deepLinkData} onClearDeepLink={() => setDeepLinkData({})} />;
      case 'expenses': return <ExpensePage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => setDeepLinkData({})} />;
      case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={false} />;
      case 'reports': return <ReportsPage data={data} setData={setData} />;
      case 'ai': return <AIAssistant data={data} />;
      case 'settings': return <GeneralSettings data={data} setData={setData} appMode={appMode} switchMode={switchMode} addToast={addToast} />;
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
      default: return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-atmospheric text-slate-900 arabic-font" dir="rtl">
      <AmbientBackground />
      
      {renderAuthError()}
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
                    <div className="font-black text-xl tracking-tight bg-gradient-to-l from-white via-amber-200 to-amber-500 bg-clip-text text-transparent">التراث الكويتي</div>
                    <div className="text-[10px] text-amber-500/80 font-black uppercase tracking-[0.2em] leading-none mt-1">المحرك الذهبي</div>
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
               <div 
                 role="button"
                 onClick={() => {
                    if (!sidebarOpen && !isMobile) {
                      setSidebarOpen(true);
                      openMenu('invoices');
                    } else {
                      toggleMenu('invoices');
                    }
                 }}
                 className={cn(
                   "flex items-center justify-between text-white/40 px-3 mb-3 cursor-pointer hover:text-white transition-all group",
                   (!sidebarOpen && !isMobile) && "justify-center px-0 opacity-50"
                 )}
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <FileText size={16} />
                     </div>
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-black whitespace-nowrap uppercase tracking-[0.25em] opacity-80">سجل المبيعات</span>}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <motion.div animate={{ rotate: expandedMenus.invoices ? 0 : 180 }}>
                      <ChevronDown size={14} className="opacity-40" />
                    </motion.div>
                  )}
               </div>
               
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
                        active={currentPage === 'new-invoice'} 
                        onClick={() => { setCurrentPage('new-invoice'); setEditingInvoiceId(null); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="سجل الفواتير" 
                        active={currentPage === 'invoices-list'} 
                        onClick={() => { setCurrentPage('invoices-list'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="طلبات التطبيق" 
                        active={currentPage === 'orders'} 
                        onClick={() => { setCurrentPage('orders'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="قائمة العملاء" 
                        active={currentPage === 'customers'} 
                        onClick={() => { setCurrentPage('customers'); setSidebarOpen(false); }}
                      />
                  </motion.div>
                )}
               </AnimatePresence>
            </div>

            <div className="pt-2">
               <div 
                 role="button"
                 onClick={() => {
                    if (!sidebarOpen && !isMobile) {
                      setSidebarOpen(true);
                      openMenu('operations');
                    } else {
                      toggleMenu('operations');
                    }
                 }}
                 className={cn(
                   "flex items-center justify-between text-white/40 px-3 mb-3 cursor-pointer hover:text-white transition-all group",
                   (!sidebarOpen && !isMobile) && "justify-center px-0 opacity-50"
                 )}
               >
                  <div className="flex items-center gap-3">
                     <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                      <Package size={16} />
                     </div>
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-black whitespace-nowrap uppercase tracking-[0.25em] opacity-80">الإنتاج والمالية</span>}
                  </div>
                  {(sidebarOpen || isMobile) && (
                    <motion.div animate={{ rotate: expandedMenus.operations ? 0 : 180 }}>
                      <ChevronDown size={14} className="opacity-40" />
                    </motion.div>
                  )}
               </div>
               
               <AnimatePresence>
                {expandedMenus.operations && (sidebarOpen || isMobile) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="space-y-1 mr-4 border-r-2 border-indigo-500/20 pr-4 overflow-hidden"
                  >
                      <SubNavItem 
                        label="قائمة المنتجات 🍱" 
                        active={currentPage === 'products'} 
                        onClick={() => { setCurrentPage('products'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="المصروفات العامة 💸" 
                        active={currentPage === 'expenses'} 
                        onClick={() => { setCurrentPage('expenses'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="الموردين والمراجعة 🚚" 
                        active={currentPage === 'suppliers' || currentPage === 'suppliers-audit'} 
                        onClick={() => { setCurrentPage('suppliers'); setSidebarOpen(false); }}
                      />
                  </motion.div>
                )}
               </AnimatePresence>
            </div>
          </nav>
        )}

        <div className="p-4 md:p-6 border-t border-white/5 space-y-4 relative z-10">
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className={cn(
        "flex-1 flex flex-col relative overflow-hidden transition-colors duration-1000"
      )}>
        {/* Top Header */}
        <header 
          onClick={closeAllMenus}
          className="h-12 md:h-20 bg-white/70 backdrop-blur-3xl border-b border-slate-200/50 flex items-center justify-between px-4 lg:px-10 z-[100] sticky top-0 shadow-sm"
        >
          <div className="flex items-center gap-2 sm:gap-4 lg:gap-4 md:p-8 shrink min-w-0">
            {userRole !== 'partner' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSidebarOpen(!sidebarOpen); }}
                className="p-2.5 sm:p-3 hover:bg-slate-900 group rounded-[1.2rem] sm:rounded-2xl transition-all text-slate-600 hover:text-white shadow-sm shrink-0"
              >
                <Menu size={20} className="group-hover:rotate-180 transition-transform duration-500" />
              </button>
            )}
            {userRole !== 'partner' && <div className="hidden sm:block h-4 w-[1px] bg-slate-200" />}
            
            <button 
              onClick={() => {
                setDeepLinkData({ exactId: 'pulse', _t: Date.now() });
                setSidebarOpen(false);
                setCurrentPage('dashboard');
              }}
              title="العودة للصفحة الرئيسية"
              className={cn(
                "flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-[1rem] sm:rounded-2xl transition-all group shrink-0",
                currentPage === 'dashboard' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "bg-slate-100/50 hover:bg-slate-200 text-slate-600"
              )}
            >
              <Home size={18} className="group-hover:scale-110 transition-transform" />
            </button>
            
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-slate-50 border border-slate-100 shrink-0 shadow-sm" title={appMode === 'cloud' ? "تم الاتصال بالسحابة بنجاح" : "تعمل بوضع غير متصل"}>
              {dataLoading ? (
                 <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
              ) : (
                <div className="relative flex items-center justify-center">
                   <div className={cn("w-2 h-2 rounded-full", appMode === 'cloud' ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse-slow" : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]")} />
                </div>
              )}
            </div>
            
            <SystemPulseOrb data={data} />
          </div>

          <div className="flex items-center gap-3 lg:gap-4 md:p-6 shrink-0">
             {/* Magic Command Bar Trigger */}
             {userRole !== 'partner' && (
              <button 
                onClick={(e) => { e.stopPropagation(); setCommandBarOpen(true); }}
                title="البحث السريع (Ctrl+K)"
                className="flex items-center gap-2 sm:gap-4 bg-slate-50/80 hover:bg-white p-3 sm:px-5 sm:py-3 rounded-[1rem] sm:rounded-2xl border border-slate-200/50 transition-all group overflow-hidden shadow-sm hover:shadow-md hover:border-amber-400"
              >
                  <Search size={16} className="text-slate-400 group-hover:text-amber-500 group-hover:scale-125 transition-all" />
                  <span className="hidden sm:block text-xs font-black text-slate-500">ابحث عن أي شيء...</span>
                  <div className="hidden sm:flex gap-1.5 items-center bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-[0.5rem] shadow-sm group-hover:shadow-md group-hover:bg-amber-100/50 transition-all">
                    <span className="text-[11px] font-black text-amber-700">K</span>
                    <span className="text-[10px] font-black text-amber-600/50">+</span>
                    <span className="text-[11px] font-black text-amber-700">Ctrl</span>
                  </div>
               </button>
             )}

              {/* Removed isStandalone button from header */}

              <button 
                onClick={() => {
                  setEditingInvoiceId(null);
                  setCurrentPage('new-invoice');
                }}
                title="إنشاء فاتورة جديدة"
                className="hidden sm:flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-[1rem] sm:rounded-2xl font-black shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:scale-105 active:scale-95 group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>

              <button 
                onClick={() => setCurrentPage('ai')}
                title="المساعد الذكي"
                className={cn(
                  "flex w-12 h-12 rounded-[1rem] sm:rounded-2xl transition-all items-center justify-center relative group overflow-hidden",
                  currentPage === 'ai' ? "bg-slate-900 text-white shadow-2xl scale-105" : "bg-slate-100/50 text-slate-500 hover:bg-white hover:shadow-lg border border-transparent hover:border-amber-200/40"
                )}
              >
                <Bot size={22} className={cn("transition-all relative z-10", currentPage === 'ai' ? "text-amber-400" : "group-hover:text-amber-500 group-hover:scale-110")} />
                {currentPage === 'ai' && (
                  <motion.div 
                    layoutId="aiActiveHeader"
                    className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"
                  />
                )}
                <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping border border-white z-20" />
              </button>

            {/* Notifications */}
            <div className="relative shrink-0" ref={notifRef}>
              <button 
                onClick={(e) => { e.stopPropagation(); setNotifOpen(!notifOpen); }}
                className={cn(
                  "p-2 rounded-full transition-colors relative z-50",
                  notifOpen ? "bg-slate-100" : "hover:bg-slate-100"
                )}
                title="عرض التنبيهات"
                aria-label="تنبيهات"
              >
                <Bell size={20} className={cn("transition-colors", notifOpen ? "text-primary" : "text-slate-600")} />
                {(data?.notifications || []).some(n => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-white" />
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
                       className="absolute left-0 mt-3 w-[290px] xs:w-[320px] sm:w-[380px] md:w-[420px] bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 z-[9999] overflow-hidden origin-top-left"
                      >
                      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-white">
                        <span className="font-black text-slate-800 text-sm sm:text-base">التنبيهات الذكية</span>
                        <div className="flex items-center gap-1">
                           <button onClick={() => setIsSoundEnabled(!isSoundEnabled)} className="p-2 hover:bg-slate-100 rounded-full transition-colors" title={isSoundEnabled ? "إيقاف التنبيه الصوتي" : "تفعيل التنبيه الصوتي"}>
                               {isSoundEnabled ? <Volume2 size={18} className="text-emerald-600" /> : <VolumeX size={18} className="text-slate-400" />}
                           </button>
                           <button 
                             onClick={(e) => {
                                 e.stopPropagation();
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
                      {data.notifications && data.notifications.length > 0 ? (
                        (data?.notifications || []).map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={(e) => {
                                e.stopPropagation();
                                setData(prev => ({
                                    ...prev,
                                    notifications: (prev?.notifications || []).map(n => n.id === notif.id ? { ...n, read: true } : n)
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
                                notif.read ? "opacity-60 bg-white" : "bg-primary/5 border-primary/10 shadow-sm"
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
                                <div className="text-sm font-black text-slate-800 mb-1 leading-tight break-words whitespace-normal">{notif.title}</div>
                                <div className="text-[11px] text-slate-500 leading-relaxed break-words whitespace-normal">{notif.message}</div>
                                <div className="text-[9px] text-slate-400 mt-1.5 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  {new Date(notif.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}
                                </div>
                              </div>
                              {!notif.read && (
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
                          <div className="font-bold text-slate-400">لا توجد تنبيهات</div>
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
              className={cn("flex items-center gap-2 sm:gap-3 pl-2 p-1.5 rounded-2xl transition-colors max-w-[120px] xs:max-w-[200px] sm:max-w-[300px] shrink-0 border border-transparent", userRole === 'partner' ? "cursor-default opacity-80" : "cursor-pointer hover:bg-slate-100 hover:border-slate-200")}
            >
              <div className="text-left hidden xs:block overflow-hidden">
                <div className="text-sm font-bold truncate text-slate-800">{user?.displayName || 'أحمد الفيلكاوي'}</div>
                <div className="text-[9px] text-slate-500 truncate">{user?.email || 'مدير النظام'}</div>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-primary/20 shrink-0 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center font-black text-primary text-xs shrink-0 shadow-sm">
                  {user?.displayName?.charAt(0) || 'أ'}
                </div>
              )}
            </div>

          <button 
            onClick={handleLogout}
            className="p-2.5 sm:p-3 bg-rose-50 hover:bg-rose-600 text-rose-500 hover:text-white rounded-[1.2rem] sm:rounded-2xl transition-all shadow-sm group active:scale-95 border border-rose-100/50"
            title="تسجيل الخروج"
          >
            <LogOut size={20} className="transition-transform group-hover:scale-110 group-hover:rotate-12" />
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
          <InstallPrompt />
          <ProactiveAlerts 
            userRole={userRole}
            notifications={data.notifications || []} 
            onMarkAsRead={(id) => {
               setData(prev => ({
                   ...prev,
                   notifications: (prev?.notifications || []).map(n => n.id === id ? { ...n, read: true } : n)
               }));
            }} 
          />
          <AnimatePresence>
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ 
                duration: 0.2, 
                ease: "easeOut"
              }}
              className="w-full min-h-full relative z-10 px-4 md:px-6"
            >
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 className="animate-spin text-amber-500 w-12 h-12" /><p className="text-slate-400 text-sm font-black animate-pulse">جاري التحميل...</p></div>}>
                 {renderAppContent()}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <CommandBar 
        isOpen={commandBarOpen} 
        onClose={() => setCommandBarOpen(false)} 
        onNavigate={(page, payload) => {
           setCurrentPage(page);
           if (payload) {
             setDeepLinkData({ ...payload, _t: Date.now() });
           } else {
             setDeepLinkData({});
           }
        }}
        data={data}
        userRole={userRole}
      />

      {/* Global Scroll to Top */}
      <AnimatePresence>
        {showTopButton && (
          <motion.button
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: 50 }}
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
            className="fixed bottom-24 sm:bottom-12 right-6 z-[9999] w-14 h-14 bg-indigo-600 text-white rounded-full shadow-[0_8px_30px_rgb(79,70,229,0.4)] flex items-center justify-center hover:bg-indigo-700 hover:scale-110 transition-all active:scale-95 group overflow-visible"
            title="الرجوع للأعلى"
          >
            <ArrowUp className="group-hover:-translate-y-1 transition-transform" size={28} />
            <motion.div 
              animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="absolute -inset-2 rounded-full border-2 border-indigo-500/30"
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating Global AI Pulse Overlay */}
      <AnimatePresence>
        {isAIThinking && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/10 backdrop-blur-[2px] z-[200] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white/90 px-6 py-4 rounded-3xl shadow-2xl border border-indigo-100 flex items-center gap-4 animate-bounce">
              <div className="relative">
                <Bot className="text-indigo-600" size={24} />
                <Sparkles className="absolute -top-2 -right-2 text-amber-500 animate-pulse" size={12} />
              </div>
              <span className="font-black text-slate-800 text-sm">جاري تحليل البيانات...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {(isAuthenticated || appMode === 'local') && <InstagramMagicWand data={data} />}
      <Toaster richColors position="bottom-right" closeButton />
      
      {/* Version Tag - Subtle but visible as requested */}
      <div className="fixed bottom-1 left-2 pointer-events-none z-[10000] select-none opacity-20">
        <span className="text-[8px] font-mono tracking-widest text-slate-500 uppercase">Version 4.0.0.Release</span>
      </div>
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
        ? "bg-white text-secondary shadow-lg font-black" 
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

const SubNavItem: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={cn(
      "w-full text-right p-3.5 text-[12px] font-black rounded-2xl transition-all active:scale-95 mb-0.5",
      active ? "text-amber-500 shadow-xl shadow-amber-500/5 bg-white/5 border border-white/5 ring-1 ring-white/10" : "text-white/30 hover:text-white/80 hover:bg-white/5"
    )}
  >
    {label}
  </button>
);


const ZEN_QUOTES = [
  "رؤية واضحة.. التراث في كل تفصيلة",
  "النجاح ليس صدفة، بل هو قرار وتراث",
  "حيث تتضح الرؤية، يولد الإنجاز",
  "كل تفصيل يصنع فارقاً",
  "بوضوح الرؤية، نرتقي",
  "نضيء الدرب بخطى واثقة",
  "الإتقان لغة لا تحتاج إلى ترجمة",
  "نحن لا ننتظر المستقبل، بل نصنعه"
];

const ZenSplash: React.FC<{ show: boolean, logo?: string, name?: string }> = ({ show, logo, name }) => {
  const [quote, setQuote] = useState(ZEN_QUOTES[0]);
  useEffect(() => {
    setQuote(ZEN_QUOTES[Math.floor(Math.random() * ZEN_QUOTES.length)]);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
           initial={{ opacity: 1 }}
           exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
           className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-slate-50"
           dir="rtl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/5 via-slate-50 to-emerald-900/5 flex flex-col items-center justify-center">
             <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] opacity-60 animate-pulse" />
             <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] opacity-60 animate-pulse" style={{ animationDuration: '3s' }} />
          </div>

          <div className="relative z-10 flex flex-col items-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-8 relative"
            >
              <div className="absolute inset-0 bg-emerald-400 rounded-full blur-[40px] opacity-20 animate-pulse" />
              <LogoEngine src={logo || DEFAULT_GLOBAL_LOGO} variant="royal" className="w-32 h-32 md:w-40 md:h-40 relative z-10 drop-shadow-2xl" />
            </motion.div>

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="text-center"
            >
              <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-l from-slate-900 via-indigo-800 to-emerald-700 bg-clip-text text-transparent mb-4 leading-relaxed tracking-tight">
                {name || 'التراث'}
              </h1>
            </motion.div>

            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.5, delay: 0.8 }}
               className="mt-8 w-56 md:w-72 h-1.5 bg-slate-200/50 rounded-full overflow-hidden relative"
            >
                <motion.div 
                    initial={{ x: '100%' }}
                    animate={{ x: '-10%' }}
                    transition={{ duration: 2, ease: "easeInOut", repeat: Infinity }}
                    className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-r from-emerald-400 via-emerald-500 to-indigo-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                />
            </motion.div>

            <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               transition={{ duration: 0.8, delay: 1 }}
               className="text-center mt-6 px-6"
            >
               <p className="text-slate-500 font-bold text-sm md:text-base italic animate-pulse">
                 "{quote}"
               </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const App: React.FC = () => {
   const [showSplash, setShowSplash] = useState(true);
   const [logo, setLogo] = useState(DEFAULT_GLOBAL_LOGO);
   const [name, setName] = useState('التراث');

   useEffect(() => {
     try {
       const raw = localStorage.getItem('ktk_accounting_data');
       if (raw) {
         const parsed = JSON.parse(raw);
         if (parsed?.settings?.companyLogo) setLogo(parsed.settings.companyLogo);
         if (parsed?.settings?.companyName) setName(parsed.settings.companyName);
       }
     } catch(e) {}
     const timer = setTimeout(() => setShowSplash(false), 2500);
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

