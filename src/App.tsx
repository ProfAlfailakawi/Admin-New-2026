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
  ShoppingBag,
  Receipt,
  ClipboardCheck,
  AlertTriangle,
  CircleDollarSign,
  Boxes,
  HandCoins,
  BadgeCheck,
  Gauge,
  Clock
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
import { SmartContentStudio } from './components/SmartContentStudio';
import { DiwaniyaTournaments } from './components/DiwaniyaTournaments';
import PartnerDashboard from './components/PartnerDashboard';
import Login from './components/Login';
const GeneralSettings = React.lazy(() => import('./components/GeneralSettings'));
const SupplierAudit = React.lazy(() => import('./components/SupplierAudit'));
const LoyaltyProgramPage = React.lazy(() => import('./components/LoyaltyProgramPage').then(m => ({ default: m.LoyaltyProgramPage })));
const PromoCodePage = React.lazy(() => import('./components/PromoCodePage').then(m => ({ default: m.PromoCodePage })));
const WhatIfSimulator = React.lazy(() => import('./components/WhatIfSimulator').then(m => ({ default: m.WhatIfSimulator })));
const RealProfitGuard = React.lazy(() => import('./components/RealProfitGuard'));

import CommandBar from './components/CommandBar';
import ProactiveAlerts from './components/ProactiveAlerts';
import InstallPrompt from './components/InstallPrompt';
import CloudStatus from './components/CloudStatus';
import { InstagramMagicWand } from './components/InstagramMagicWand';
import { recalculateStateBalances } from './lib/business-logic';
import { INITIAL_DATA, GET_DEMO_DATA, DEFAULT_SQUADS } from './data';
import { AUTHORIZED_EMAILS, AUTHORIZED_PARTNERS, AUTHORIZED_UIDS, AUTHORIZED_PARTNER_UIDS, DEFAULT_GLOBAL_LOGO } from './constants';
import { AppState } from './types';
import { playSuccessAction } from './lib/sonic';
import { auth, db, logout } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { onSnapshot, setDoc, updateDoc, getDoc, getDocs, query, collection, where, doc, limit, orderBy } from 'firebase/firestore';
import { getSmartDoc, deleteDoc } from './firebase';
import { Toaster, toast } from 'sonner';
import { playNewOrderAlert } from './lib/sounds';
import { splitProductsForDatabase, joinProductsFromDatabase } from './lib/utils';
import { refreshPushRegistrationIfAlreadyAllowed } from './lib/pushNotifications';

type AdminNotification = AppState['notifications'][number];

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
  const commandCenterRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (target && commandCenterRef.current && !commandCenterRef.current.contains(target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, [isOpen]);

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
      label: 'مسرح العروض الذكية',
      subtitle: 'إدارة الكوبونات وحساب الأثر الربحي لها',
      icon: <CircleDollarSign size={18} />,
      tone: 'amber',
      value: `الكوبونات`,
      hint: `${coupons.length} عروض نشطة`
    },
    {
      id: 'smart-studio',
      label: 'استوديو المحتوى الذكي',
      subtitle: 'تجهيز رسائل الدعاية والتسويق التلقائي',
      icon: <Send size={18} />,
      tone: 'sky',
      value: `استوديو المحتوى`,
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
      label: 'المساعد الذكي',
      subtitle: 'مستشار مالي مدعوم بالتوصيات الذكية',
      icon: <Bot size={18} />,
      tone: 'rose',
      value: `المستشار التنفيذي`,
      hint: 'تحليلات ذكاء اصطناعي'
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
    { id: 'customers', label: 'إدارة العملاء وذكاء البيانات', subtitle: 'قائمة العملاء وبيانات الاتصال والترتيب', icon: <Users size={18} />, tone: 'emerald', value: 'قاعدة العملاء', hint: `${customers.length} عميل` },
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
    <section ref={commandCenterRef} dir="rtl" className={`heritage-command-brief heritage-command-brief-${tone} ${isOpen ? 'is-open' : 'is-collapsed'}`} aria-label="مركز القيادة">
      <div className="heritage-command-hero">
        <span className="heritage-command-orb"><Sparkles size={22} /></span>
        <div className="min-w-0 text-right heritage-command-copy">
          <div className="heritage-command-kicker">مركز القيادة · شركة مطبخ التراث</div>
          <h2>{greeting.title}</h2>
          <p>{greeting.sub}</p>
        </div>
      </div>

      <div className="heritage-command-actions">
        <button
          type="button"
          className="heritage-command-toggle heritage-command-open-btn"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
        >
          {isOpen ? 'إغلاق مركز القيادة' : 'فتح مركز القيادة'}
          <ChevronDown size={16} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            className="heritage-command-grid"
            initial={{ opacity: 0, y: -8, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -8, height: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="executive-morning-brief pb-2 mb-2">
              <div>
                <span>Executive Morning Brief</span>
                <strong>ملخص الإدارة الآن</strong>
              </div>
              <ul>
                {briefLines.map((line) => <li key={line}>{line}</li>)}
              </ul>
            </div>

            <div className="col-span-full mb-3" dir="rtl">
              <div className="flex items-center gap-2 bg-slate-900/45 border border-white/10 rounded-xl px-3.5 py-2.5 w-full shadow-inner">
                <Search size={16} className="text-slate-400" />
                <input
                  type="text"
                  placeholder="ابحث عن أداة أو اكتب أمراً كتركيز إضافي (مثال: المنتجات، الإعدادات)..."
                  className="bg-transparent text-white placeholder-slate-400/80 text-xs md:text-sm focus:outline-none w-full font-medium"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-white transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {filteredTools.map((item) => (
              <button key={item.id} onClick={() => go(item.id)} className={`heritage-command-tile heritage-tone-${item.tone} ${page === item.id ? 'is-active' : ''}`}>
                <span className="heritage-tile-icon">{item.icon}</span>
                <span className="heritage-tile-label">{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.hint}</small>
              </button>
            ))}

            {filteredTools.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400 text-xs md:text-sm">
                لا توجد أدوات مطابقة لنص البحث.. تفضل بكتابة كلمة أخرى كتركيز إضافي ✨
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
        { icon: <Sparkles size={19} />, title: 'استوديو المحتوى', text: 'استعرض أدوات المحتوى والأرشيف من غير لمس منطق الذكاء.', page: 'smart-studio' },
      ]
    };
  }
  return {
    eyebrow: 'مرشد الأدمن التنفيذي',
    title: 'أهلاً بك في مركز قيادة شركة مطبخ التراث',
    subtitle: 'جولة سريعة لأول دخول: مبيعات، طلبات، منتجات، تنبيهات، واستوديو المحتوى في مسار واضح.',
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
        <Loader2 size={15} className="animate-spin" />
        <span>{mode === 'cloud' ? 'جارٍ تحديث بيانات السحابة...' : 'جارٍ تجهيز بيانات التجربة...'}</span>
      </motion.div>
    )}
  </AnimatePresence>
);

const NetworkStatusNotice: React.FC<{ online: boolean }> = ({ online }) => (
  <AnimatePresence>
    {!online && (
      <motion.div
        className="admin-offline-toast"
        dir="rtl"
        initial={{ opacity: 0, y: -12, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.96 }}
      >
        <span className="offline-dot" />
        <div>
          <strong>انقطع الاتصال…</strong>
          <span>نحاول نرجع بيانات مركز القيادة بهدوء.</span>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

const getMoneyValue = (item: any) => Number(item?.total || item?.totalAmount || item?.amount || item?.price || 0) || 0;
const getItemName = (item: any, fallback = 'بدون اسم') => item?.name || item?.customerName || item?.title || item?.code || item?.id || fallback;
const getAdminPageMeta = (page: string) => {
  const map: Record<string, {title: string; subtitle: string; tag: string}> = {
    dashboard: { title: 'مركز القيادة', subtitle: 'ملخص اليوم، الحالات المهمة، والإجراءات السريعة في واجهة واحدة.', tag: 'Daily Command Brief' },
    'dashboard-ai': { title: 'مختبر الذكاء', subtitle: 'معرض أدوات للقرارات الذكية بدون لمس منطق الذكاء الاصطناعي.', tag: 'AI Lab Gallery' },
    'new-invoice': { title: 'فاتورة جديدة', subtitle: 'العميل، المنتجات، الملخص، ثم الإنشاء في مسار واحد واضح.', tag: 'Receipt Builder' },
    'invoices-list': { title: 'سجل الفواتير', subtitle: 'سجل فخم للبحث والمراجعة والطباعة والمتابعة.', tag: 'Invoice Ledger' },
    orders: { title: 'طلبات الموقع', subtitle: 'لوحة تشغيل للطلبات الحالية وحالات الدفع الفعلية.', tag: 'Operations Board' },
    customers: { title: 'لوحة ذكاء العملاء', subtitle: 'VIP، جدد، غائبون، عالي القيمة، وعملاء يحتاجون عرض.', tag: 'Customer Intelligence Board' },
    products: { title: 'قائمة المنتجات', subtitle: 'استوديو منتجات مع مؤشر قوة المنتج من المبيعات والربحية والتوفر.', tag: 'Product Score' },
    expenses: { title: 'المصروفات العامة', subtitle: 'صفحة مالية هادئة توضّح المصروفات والنزيف بدون صراخ بصري.', tag: 'Expense Control' },
    suppliers: { title: 'الموردين والمراجعة', subtitle: 'رادار الموردين: انتظام، مديونية، اعتماد، منتجات مرتبطة، ومخاطر.', tag: 'Supplier Risk Radar' },
    'suppliers-audit': { title: 'الموردين والمخاطر', subtitle: 'ربط أثر المورد بالمنتجات والطلبات والربح.', tag: 'Supplier Intelligence' },
    reports: { title: 'التقارير', subtitle: 'قراءة تنفيذية للفواتير والمبيعات والأداء.', tag: 'Executive Reports' },
    ai: { title: 'المساعد الذكي', subtitle: 'مساعد تنفيذي يعرض الملخص والأسباب والإجراء المقترح.', tag: 'Executive Assistant' },
    'smart-studio': { title: 'استوديو المحتوى الذكي', subtitle: 'اختيار المحتوى، التوليد، المعاينة، والأرشيف في تجربة واحدة.', tag: 'Creative Suite' },
    loyalty: { title: 'مملكة الولاء', subtitle: 'مستويات عادي، فضي، ذهبي، وVIP مع شارات وترقيات.', tag: 'Loyalty Kingdom' },
    coupons: { title: 'مسرح العروض الذكية', subtitle: 'كل كوبون كبطاقة تعرض الخصم والاستخدامات وتأثير الربح.', tag: 'Smart Offers Theater' },
    'growth-simulator': { title: 'محاكي النمو والتسويق', subtitle: 'سيناريوهات ماذا لو للمبيعات والربح والمخاطر.', tag: 'Growth Simulator Pro' },
    'profit-guard': { title: 'المالية وحماية الأرباح', subtitle: 'درع الربح: المبيعات، المصروفات، الهامش، النزيف، والفرص.', tag: 'Profit Shield' },
    diwaniya: { title: 'بطولات الديوانية', subtitle: 'لوحة بطولات ناعمة للترتيب والنقاط والجوائز.', tag: 'Tournament Board' },
    settings: { title: 'الإعدادات العامة', subtitle: 'هوية المتجر، التشغيل، التوصيل، النظام، والحساب في بطاقات هادئة.', tag: 'General Settings' },
  };
  return map[page] || { title: 'مركز الإدارة', subtitle: 'واجهة موحدة وقرارات واضحة.', tag: 'Admin System' };
};

const AdminExperienceFrame: React.FC<{page: string; data: any; onNavigate: (page: string) => void; children: React.ReactNode}> = ({ page, data, onNavigate, children }) => {
  const meta = getAdminPageMeta(page);
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
  const supplierRows = suppliers.slice(0, 3).map((sup: any) => {
    const debt = Number(sup?.balance || sup?.debt || sup?.amountDue || 0) || 0;
    const linkedProducts = products.filter((p: any) => String(p?.supplierId || p?.supplier || '') === String(sup?.id || sup?.name || '')).length;
    const risk = debt > 100 ? 'يحتاج مراجعة' : linkedProducts > 4 ? 'تحت المراقبة' : 'مستقر';
    return { ...sup, debt, linkedProducts, risk };
  });
  const showProduct = page === 'products';
  const showCustomers = page === 'customers' || page === 'loyalty';
  const showSuppliers = page === 'suppliers' || page === 'suppliers-audit';
  const showCoupons = page === 'coupons';
  const showAi = false; // لا نعرض بوكس مختبر الذكاء المكرر تحت الهيدر
  const showGrowth = page === 'growth-simulator';
  const showProfit = page === 'profit-guard';
  const showPageHero = page !== 'dashboard';
  return (
    <div data-admin-page={page} className={`admin-experience-stack ${!showPageHero ? 'dashboard-merged-with-command' : ''}`}>
      {showPageHero && (
        <section className="admin-page-hero" dir="rtl">
          <div className="admin-page-hero-main"><span className="admin-page-kicker">{meta.tag}</span><h1>{meta.title}</h1><p>{meta.subtitle}</p></div>
        </section>
      )}
      {showProduct && <section className="admin-smart-panel product-score-panel" dir="rtl"><div className="panel-head"><div><span>Product Score</span><h2>مؤشر قوة المنتج</h2></div><button type="button" onClick={() => onNavigate('reports')}>عرض التقارير</button></div><div className="smart-mini-grid">{productLeaders.map((p:any) => <div className="product-score-card" key={p.id||p.name}><div className="score-ring"><strong>{p.score}</strong><small>/100</small></div><div><h3>{getItemName(p,'منتج')}</h3><p>مبيعات · ربحية · تكرار · طلب حالي</p><div className="tiny-meter"><span style={{width:`${p.score}%`}} /></div></div></div>)}</div></section>}
      {showCustomers && <section className="admin-smart-panel" dir="rtl"><div className="panel-head"><div><span>Customer Intelligence Board</span><h2>لوحة ذكاء العملاء</h2></div><button type="button" onClick={() => onNavigate('loyalty')}>مملكة الولاء</button></div><div className="customer-intel-grid">{customerRows.map((c:any, idx:number) => <div key={c.id||idx} className={`customer-intel-card ${c.label==='VIP'?'is-vip':''}`}><div className="customer-avatar">{String(c.name||'ع').slice(0,1)}</div><div><h3>{getItemName(c,'عميل')}</h3><p>{c.phone || 'لا يوجد هاتف'} · {c.ordersCount} طلب</p><strong>{c.spend.toFixed(3)} د.ك</strong></div><span>{c.label}</span></div>)}</div></section>}
      {showSuppliers && <section className="admin-smart-panel" dir="rtl"><div className="panel-head"><div><span>Supplier Risk Radar</span><h2>رادار الموردين</h2></div><button type="button" onClick={() => onNavigate('suppliers-audit')}>فتح المراجعة</button></div><div className="supplier-radar-grid">{supplierRows.map((sup:any, idx:number) => <div key={sup.id||idx} className="supplier-radar-card"><div className="supplier-risk-path"><span>المورد</span><b>→</b><span>المنتجات</span><b>→</b><span>الطلبات</span><b>→</b><span>الربح</span></div><h3>{getItemName(sup,'مورد')}</h3><p>{sup.linkedProducts} منتجات مرتبطة · {sup.debt.toFixed(3)} د.ك</p><strong>{sup.risk}</strong></div>)}</div></section>}
      {showCoupons && <section className="admin-smart-panel" dir="rtl"><div className="panel-head"><div><span>Smart Offers Theater</span><h2>مسرح العروض الذكية</h2></div><button type="button" onClick={() => onNavigate('reports')}>قياس الأثر</button></div><div className="coupon-theater-grid">{(coupons.length?coupons: [{code:'WELCOME', discountValue:0, isActive:false}]).slice(0,4).map((c:any, idx:number) => { const val=Number(c.discountValue||c.value||0); const tone= val>=25?'خطر':val>=10?'متوسط':'آمن'; return <div className="coupon-ticket" key={c.id||idx}><h3>{c.code||'كوبون'}</h3><p>{val || '—'} {c.discountType==='fixed'?'د.ك':'%'}</p><span>تأثير الربح: {tone}</span></div>})}</div></section>}
      {showAi && <section className="admin-smart-panel ai-lab-gallery" dir="rtl"><div className="panel-head"><div><span>AI Lab Gallery</span><h2>معرض مختبر الذكاء</h2></div><button type="button" onClick={() => onNavigate('smart-studio')}>استوديو المحتوى</button></div><div className="smart-mini-grid ai-lab-compact-grid">{[
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
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);

  useEffect(() => {
    const updateOnline = () => setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  
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

  const onboardingRole: 'admin' | 'partner' | 'demo' = appMode === 'local' ? 'demo' : (userRole === 'partner' ? 'partner' : 'admin');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || authLoading || dataLoading) return;
    const key = `alturath_admin_onboarding_seen_${onboardingRole}`;
    try {
      if (!localStorage.getItem(key)) {
        const t = setTimeout(() => setOnboardingOpen(true), 550);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [isAuthenticated, authLoading, dataLoading, onboardingRole]);


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

    const lastRefresh = localStorage.getItem('push_last_silent_refresh');
    const lastTime = lastRefresh ? new Date(lastRefresh).getTime() : 0;
    const twelveHours = 12 * 60 * 60 * 1000;

    if (lastTime && Date.now() - lastTime < twelveHours) return;

    refreshPushRegistrationIfAlreadyAllowed({
      userId: user.uid || 'admin',
      restaurantId: userRole === 'partner' ? 'partner' : 'kitchen_default',
    });
  }, [isAuthenticated, user, userRole]);


  const [currentPage, setCurrentPage] = useState(hasInitialPushDeepLink() ? 'invoices-list' : 'dashboard');

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
      setCurrentPage(hasInitialPushDeepLink() ? 'invoices-list' : 'dashboard');
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
  const [deepLinkData, setDeepLinkData] = useState<any>(getInitialPushDeepLink() || {});

  // Removed ADMIN_PUSH_DEEPLINK_FORCE_REPORTS_EFFECT causing navigation lock

  // Handle push notification deep links:
  // ORD + INV must both open ReportsPage invoices tab and search by full ID.
  // Old /track?tracked_order=... links are also supported.
  useEffect(() => {
    const saved = getInitialPushDeepLink();
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

  // MIGRATION: Ensure old orders have the correct customer names matching the DB, and squads are updated
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

        const normalizePhoneForMatch = (p: string) => p ? p.replace(/\D/g, '').slice(-8) : '';
        let newSquads = data.squads || [];
        let squadMigrationNeeded = false;
        
        if (newSquads.length > 1) { // They have the fake squads
            const customer568 = (data.customers || []).find(c => {
                const cPhone = c.phone ? c.phone.replace(/\D/g, '').slice(-8) : '';
                return cPhone === '56855555';
            });
            const correctName = customer568?.name || 'أبو أحمد';

            newSquads = [{
                id: 1, 
                name: 'ديوانية الفيلكاوي', 
                points: 0, 
                tier: 'عزوة', 
                members: 1, 
                king: correctName, 
                kingOrders: 0, 
                phone: '90000000', 
                membersList: [{name: correctName, phone: '56855555', points: 0}] 
            }];
            squadMigrationNeeded = true;
        } else if (newSquads.length === 1) {
            const customer568 = (data.customers || []).find(c => {
                const cPhone = c.phone ? c.phone.replace(/\D/g, '').slice(-8) : '';
                return cPhone === '56855555';
            });
            if (customer568 && customer568.name) {
                if (newSquads[0].king !== customer568.name) {
                    newSquads[0] = { ...newSquads[0], king: customer568.name };
                    squadMigrationNeeded = true;
                }
                const memberIndex = (newSquads[0].membersList || []).findIndex(m => m.phone === '56855555');
                if (memberIndex !== -1 && newSquads[0].membersList![memberIndex].name !== customer568.name) {
                    newSquads[0].membersList![memberIndex] = { ...newSquads[0].membersList![memberIndex], name: customer568.name };
                    squadMigrationNeeded = true;
                }
            }
        }
        
        if (migrationNeeded || squadMigrationNeeded) {
            setData(prev => ({ 
                ...prev, 
                orders: migrationNeeded ? normalizedOrders : prev.orders,
                squads: squadMigrationNeeded ? newSquads : prev.squads
            }));
            console.log("Migration executed: updated old data structure.");
        }
        setHasRunMigration(true);
     }
  }, [data?.orders, data?.customers, data?.squads, hasRunMigration]);
  
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
                    dataReference: `قاعدة بيانات العملاء توضح أن آخر طلب لهذا الـVIP كان بتاريخ ${new Date(cust.lastActive!).toLocaleDateString('en-GB')}.`,
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
  const [quotaError, setQuotaError] = useState<string | null>(null);

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
          setCurrentPage(hasInitialPushDeepLink() ? 'invoices-list' : 'dashboard');
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
         const qOrders = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(50));
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
         }, (err) => {
            if (!String(err).includes("Missing or insufficient permissions")) {
               const isQuota = String(err).includes("quota") || String(err).includes("Quota") || String(err).includes("RESOURCE_EXHAUSTED") || String(err).includes("resource-exhausted");
               if (isQuota) {
                  console.warn("Firebase Quota Exceeded handled in UI.");
                  setQuotaError(err.message || String(err));
               } else {
                  console.error("orders sync error: ", err);
               }
            }
         });
      } catch (e: any) {
          if (!String(e).includes("Missing or insufficient permissions")) {
              const isQuota = String(e).includes("quota") || String(e).includes("Quota") || String(e).includes("RESOURCE_EXHAUSTED") || String(e).includes("resource-exhausted");
              if (isQuota) {
                 console.warn("Firebase Quota Exceeded handled in UI.");
                 setQuotaError(e.message || String(e));
              } else {
                 console.error("Failed to sync orders collection:", e);
              }
          }
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
                           if (!String(error).includes("Missing or insufficient permissions") && !String(error).includes("PERMISSION_DENIED")) console.error('Failed to send order-created push alert:', error);
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
        if (!String(error).includes("Missing or insufficient permissions") && !String(error).includes("PERMISSION_DENIED")) {
           const isQuota = String(error).includes("quota") || String(error).includes("Quota") || String(error).includes("RESOURCE_EXHAUSTED") || String(error).includes("resource-exhausted");
           if (isQuota) {
              console.warn("Firebase Quota Exceeded handled in UI.");
              setQuotaError(error.message || String(error));
           } else {
              console.error("Firestore sync error", error);
           }
        }
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
          if (!String(e).includes("Missing or insufficient permissions") && !String(e).includes("PERMISSION_DENIED")) console.error("Firestore auto-save error", e);
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
    const invoiceId = searchParams.get('requested_order_id') || searchParams.get('order_id') || path.split('/invoice/')[1];
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
          <div className="bg-white rounded-3xl p-5 md:p-10 max-w-sm w-full shadow-xl">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldAlert size={32} />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-3">عذراً!</h2>
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

  if (!isAuthenticated) {
    return (
      <>
        {renderAuthError()}
        {renderQuotaError()}
        <Login 
          logo={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}
          onLogin={(mode) => {
            setAppMode(mode);
            localStorage.setItem('appMode', mode);
            setIsAuthenticated(true);
            localStorage.setItem('isAuthenticated', 'true');
            setCurrentPage(hasInitialPushDeepLink() ? 'invoices-list' : 'dashboard');
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
        case 'ai':
        case 'smart-studio':
        case 'diwaniya':
          return <div className="partner-clean-shell"><PartnerDashboard data={data} onNavigate={setCurrentPage} onLogout={handleLogout} deepLinkData={deepLinkData} /></div>;
        default: return <div className="partner-clean-shell"><PartnerDashboard data={data} onNavigate={setCurrentPage} onLogout={handleLogout} deepLinkData={deepLinkData} /></div>;
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
          onClearDeepLink={() => {}}
        />
      );
      case 'customers': return <CustomerPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'products': return <ProductPage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'suppliers': return <SupplierPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'expenses': return <ExpensePage data={data} setData={setData} deepLinkData={deepLinkData} onClearDeepLink={() => {}} />;
      case 'orders': return <OrderPage data={data} setData={setData} setCurrentPage={setCurrentPage} setDeepLinkData={setDeepLinkData} isPartner={false} />;
      case 'coupons': return <PromoCodePage data={data} onUpdateData={setData} />;
      case 'loyalty': return <LoyaltyProgramPage data={data} onUpdateData={setData} />;
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
      case 'ai': return <AIAssistant data={data} />;
      case 'smart-studio': return <SmartContentStudio data={data} setData={setData} onNavigate={setCurrentPage} />;
      case 'diwaniya': return <DiwaniyaTournaments data={data} setData={setData} onNavigate={setCurrentPage} />;
      case 'settings': return <GeneralSettings data={data} setData={setData} appMode={appMode} switchMode={switchMode} addToast={addToast} />;
      case 'suppliers-audit': return (
        <SupplierAudit 
          data={data} 
          setData={setData} 
          initialSupplierId={deepLinkData.supplierId} 
          autoOpenModal={deepLinkData.openModal}
          onClearDeepLink={() => {}}
          deepLinkData={deepLinkData}
        />
      );
      default: return <Dashboard data={data} onUpdateData={setData} appMode={appMode} onNavigate={setCurrentPage} />;
    }
  };

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
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-bold whitespace-nowrap uppercase tracking-[0.25em] opacity-80">سجل المبيعات</span>}
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
                        icon={<PlusCircle size={16} />}
                        active={currentPage === 'new-invoice'} 
                        onClick={() => { setCurrentPage('new-invoice'); setEditingInvoiceId(null); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="سجل الفواتير"
                        icon={<Receipt size={16} />}
                        active={currentPage === 'invoices-list'} 
                        onClick={() => { setCurrentPage('invoices-list'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="طلبات التطبيق"
                        icon={<ClipboardCheck size={16} />}
                        active={currentPage === 'orders'} 
                        onClick={() => { setCurrentPage('orders'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="قائمة العملاء"
                        icon={<Users size={16} />}
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
                     {(sidebarOpen || isMobile) && <span className="text-[11px] font-sans font-bold whitespace-nowrap uppercase tracking-[0.25em] opacity-80">الإنتاج والمالية</span>}
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
                        label="قائمة المنتجات"
                        icon={<Package size={16} />}
                        active={currentPage === 'products'} 
                        onClick={() => { setCurrentPage('products'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="المصروفات العامة"
                        icon={<CircleDollarSign size={16} />}
                        active={currentPage === 'expenses'} 
                        onClick={() => { setCurrentPage('expenses'); setSidebarOpen(false); }}
                      />
                      <SubNavItem 
                        label="الموردين والمراجعة"
                        icon={<HandCoins size={16} />}
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
          className="h-12 md:h-20 glass-surface border-b border-slate-200/60/50 flex items-center justify-between px-4 lg:px-10 z-[100] sticky top-0 shadow-sm"
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
                setSidebarOpen(false);
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
                onClick={() => {
                  setEditingInvoiceId(null);
                  setCurrentPage('new-invoice');
                  setSidebarOpen(false);
                }}
                title="إنشاء فاتورة جديدة"
                className="hidden sm:flex items-center justify-center w-12 h-12 bg-slate-900 text-white rounded-[1rem] sm:rounded-2xl font-bold shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all transform hover:scale-105 active:scale-95 group"
              >
                <Plus size={20} className="group-hover:rotate-90 transition-transform" />
              </button>

              <button 
                onClick={() => { setCurrentPage('ai'); setSidebarOpen(false); }}
                title="المساعد الذكي"
                className={cn(
                  "flex w-12 h-12 rounded-[1rem] sm:rounded-2xl transition-all items-center justify-center relative group overflow-hidden",
                  currentPage === 'ai' ? "bg-slate-900 text-white shadow-xl scale-105" : "bg-slate-100/50 text-slate-500 hover:bg-white hover:shadow-lg border border-transparent hover:border-amber-200/40"
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
                                <div className="text-sm font-bold text-slate-800 mb-1 leading-tight break-words whitespace-normal">{notif.title}</div>
                                <div className="text-[11px] text-slate-500 leading-relaxed break-words whitespace-normal">{notif.message}</div>
                                <div className="text-[10px] text-slate-500 mt-1.5 font-medium flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  {new Date(notif.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })}
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
                          <div className="font-bold text-slate-500">لا توجد تنبيهات</div>
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
              className={cn("flex items-center gap-2 sm:gap-3 pl-2 p-1.5 rounded-2xl transition-colors max-w-[120px] xs:max-w-[200px] sm:max-w-[300px] shrink-0 border border-transparent", userRole === 'partner' ? "cursor-default opacity-80" : "cursor-pointer hover:bg-slate-100 hover:border-slate-200/60")}
            >
              <div className="text-left hidden xs:block overflow-hidden">
                <div className="text-sm font-bold truncate text-slate-800">{user?.displayName || 'أحمد الفيلكاوي'}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.email || 'مدير النظام'}</div>
              </div>
              {user?.photoURL ? (
                <img src={user.photoURL} alt="User" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-primary/20 shrink-0 shadow-sm" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-full border-2 border-primary/20 flex items-center justify-center font-bold text-primary text-xs shrink-0 shadow-sm">
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
          {userRole !== 'partner' && currentPage === 'dashboard' && (
            <CompanyCommandCenter
              data={data}
              onNavigate={(page) => { setCurrentPage(page); setSidebarOpen(false); }}
              page={currentPage}
            />
          )}
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
              <React.Suspense fallback={<div className="flex flex-col items-center justify-center h-[60vh] gap-4"><Loader2 className="animate-spin text-amber-500 w-12 h-12" /><p className="text-slate-500 text-sm font-bold animate-pulse">جاري التحميل...</p></div>}>
                 {userRole === 'partner' ? renderAppContent() : (
                  <AdminExperienceFrame page={currentPage} data={data} onNavigate={(page) => { setCurrentPage(page); setSidebarOpen(false); }}>
                    {renderAppContent()}
                  </AdminExperienceFrame>
                 )}
              </React.Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      
      <CommandBar 
        isOpen={commandBarOpen} 
        onClose={() => setCommandBarOpen(false)} 
        onNavigate={(page, payload) => {
           navigateAdminPage(page, payload);
        }}
        data={data}
        userRole={userRole}
      />

      {/* Global Scroll to Top */}
      <AnimatePresence>
        {showTopButton && userRole !== 'partner' && (
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
            <div className="bg-white/90 px-6 py-4 rounded-3xl shadow-xl border border-indigo-100 flex items-center gap-4 animate-bounce">
              <div className="relative">
                <Bot className="text-indigo-600" size={24} />
                <Sparkles className="absolute -top-2 -right-2 text-amber-500 animate-pulse" size={12} />
              </div>
              <span className="font-bold text-slate-800 text-sm">جاري تحليل البيانات...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE QUICK NAVIGATION TRIGGER --- */}
      <AnimatePresence>
        {isMobile && userRole !== 'partner' && !commandBarOpen && currentPage === 'dashboard' && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className={`fixed transition-all duration-700 ease-in-out left-1/2 -translate-x-1/2 z-[100] md:hidden ${currentPage.startsWith('dashboard') ? "bottom-24" : "bottom-8"}`}
          >
            <button
              onClick={() => setCommandBarOpen(true)}
              className="flex items-center justify-center w-14 h-14 bg-slate-900/95 backdrop-blur-2xl rounded-full shadow-[0_20px_40px_rgba(0,0,0,0.6)] border border-white/10 active:scale-95 transition-all relative group overflow-hidden"
            >
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-indigo-500/0 opacity-50"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
              />
              <div className="relative z-10 flex items-center justify-center bg-white/10 rounded-full w-8 h-8 backdrop-blur-sm border border-white/5">
                <Search className="text-amber-400" size={16} />
              </div>
              <div className="absolute top-3 right-3 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(isAuthenticated || appMode === 'local') && <InstagramMagicWand data={data} currentPage={currentPage} />}
      <Toaster richColors position="bottom-right" closeButton />
      

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

const SubNavItem: React.FC<{ label: string; icon: React.ReactNode; active?: boolean; onClick: () => void }> = ({ label, icon, active, onClick }) => (
  <button 
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
                transition={{ duration: 1.85, ease: 'easeInOut' }}
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
     try {
       const raw = localStorage.getItem('ktk_accounting_data');
       if (raw) {
         const parsed = JSON.parse(raw);
         if (parsed?.settings?.companyLogo) setLogo(parsed.settings.companyLogo);
         if (parsed?.settings?.companyName) setName(parsed.settings.companyName);
       }
     } catch(e) {}
     const timer = setTimeout(() => {
       setShowSplash(false);
     }, 2350);
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

