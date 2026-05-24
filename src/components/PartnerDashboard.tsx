import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 ShoppingBag, TrendingUp, Handshake, DollarSign, Target, Sparkles, Activity, Puzzle,
 ChevronRight, Star, LineChart as LineChartIcon, FlaskConical, LayoutGrid, Filter, X, 
 Zap, ArrowUpRight, PieChart, Users, Truck, Briefcase, Cpu, Layers, Search, Bell, BellRing, ChevronDown, FileText, Package, Camera, CloudSun, CalendarDays, ThermometerSun
} from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
import { 
    computeInvoiceTotal, 
    computeInvoiceCost, 
    computeInvoiceProfit, 
    computeInvoiceAddonsTotal 
} from '../lib/invoice-calculations';
import { MarketingLab } from './MarketingLab';
import { FutureForecast } from './FutureForecast';
import { CommandBrief } from './CommandBrief';
import { registerPushNotifications, getPushSupportStatus } from '../lib/pushNotifications';
import { toast } from 'sonner';

interface PartnerDashboardProps {
 data: AppState;
 onNavigate: (page: string) => void;
 onLogout: () => void;
 deepLinkData?: any;
}


const GlobalStatBox = React.memo(({ label, value, color, icon: Icon, isPercent = false, subtext = '', unit = '' }: any) => {
 const getGradient = (color: string) => {
 switch(color) {
 case 'blue': return 'from-blue-500/10 to-indigo-500/5 text-blue-600 border-blue-100 shadow-blue-500/5';
 case 'red': return 'from-rose-500/10 to-pink-500/5 text-rose-600 border-rose-100 shadow-rose-500/5';
 case 'emerald': return 'from-emerald-500/10 to-teal-500/5 text-emerald-600 border-emerald-100 shadow-emerald-500/5';
 case 'amber': return 'from-amber-500/10 to-yellow-500/5 text-amber-600 border-amber-100 shadow-amber-500/5';
 case 'purple': return 'from-purple-500/10 to-fuchsia-500/5 text-purple-600 border-purple-100 shadow-purple-500/5';
 case 'indigo': return 'from-indigo-500/10 to-blue-500/5 text-indigo-600 border-indigo-100 shadow-indigo-500/5';
 case 'rose': return 'from-rose-500/10 to-red-500/5 text-rose-600 border-rose-100 shadow-rose-500/5';
 default: return 'from-slate-500/10 to-slate-500/5 text-slate-600 border-slate-100 shadow-slate-500/5';
 }
 }
 
 return (
 <motion.div 
 initial={{ opacity: 0, y: 10 }} 
 animate={{ opacity: 1, y: 0 }} 
 whileHover={{ y: -4, scale: 1.02 }}
 whileTap={{ scale: 0.96 }}
 transition={{ type:"spring", stiffness: 400, damping: 25 }} 
 className={cn(
"p-3 md:p-3 lg:p-3 md:p-3 rounded-2xl border bg-white relative overflow-hidden group shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer active:scale-95",
 getGradient(color)
)}
 >
 <div className="absolute top-4 left-4 opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0 transition-all duration-300">
 <ArrowUpRight size={18} className="lg:hidden" />
 <ArrowUpRight size={20} className="hidden lg:block" />
 </div>

 <div className="flex justify-between items-center mb-4 lg:mb-6 relative z-10">
 <div className={cn(
"w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl flex items-center justify-center bg-white shadow-xl shadow-current/10 border border-current/5 transition-transform group-hover:rotate-6 duration-300",
 getGradient(color).split(' ')[2]
)}>
 <Icon size={20} className="lg:w-[24px] lg:h-[24px]" strokeWidth={2.5} />
 </div>
 </div>
 
 <div className="text-right relative z-10">
 <div className="flex items-baseline justify-end gap-1 mb-1">
 <span className="text-[10px] font-bold opacity-40 uppercase tracking-tighter">{unit}</span>
 <div className="text-xl lg:text-3xl font-bold text-slate-800 tracking-tighter group-hover:scale-105 transition-transform origin-right">
 {isPercent ? `${value.toFixed(1)}%` : Number(value).toLocaleString('en-GB', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
 </div>
 </div>
 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.1em] group-hover:text-slate-600 transition-colors">{label}</div>
 {subtext && (
 <div className={cn("text-[10px] lg:text-[10px] mt-2 font-bold px-2 py-1 rounded-full bg-current/10 inline-block", getGradient(color).split(' ')[2])}>
 {subtext}
 </div>
)}
 </div>
 </motion.div>
);
});


// Custom simple icons for menu engineering category matches
const Turtle = ({ className, size }: { className?: string, size?: number }) => (
 <svg 
 className={className} 
 width={size || 24} 
 height={size || 24} 
 viewBox="0 0 24 24" 
 fill="none" 
 stroke="currentColor" 
 strokeWidth="2" 
 strokeLinecap="round" 
 strokeLinejoin="round"
 >
 <path d="M12 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
 <path d="M3.4 18c.1-1.1 1.1-2 2.2-2h12.8c1.1 0 2.1.9 2.2 2" />
 <path d="M10 10c0 4.4-3.6 8-8 8" />
 <path d="M14 10c0 4.4 3.6 8 8 8" />
 <path d="M12 2A10 10 0 0 1 22 12c0 2.2-1.8 4-4 4H6c-2.2 0-4-1.8-4-4A10 10 0 0 1 12 2Z" />
 </svg>
);

const SectionHeader = ({ title, icon: Icon, color ="indigo", subtitle }: { title: string, icon: any, color?: string, subtitle?: string }) => (
 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 className="flex flex-col mb-4 md:mb-8 px-2 relative"
 >
 <div className="flex items-center gap-4 mb-2 flex-row-reverse md:flex-row">
 <motion.div 
 initial={{ rotate: -10, scale: 0.8 }}
 animate={{ rotate: 0, scale: 1 }}
 transition={{ type:"spring", stiffness: 300, damping: 20 }}
 className={cn("p-3 md:p-3 rounded-[1.25rem] md:rounded-2xl shadow-xl ring-4 ring-opacity-20", 
 color ==="indigo" ?"bg-indigo-600 text-white ring-indigo-600 shadow-indigo-600/20" :"bg-amber-500 text-white ring-amber-500 shadow-amber-500/20"
)}>
 <Icon size={24} className="md:w-[28px] md:h-[28px]" strokeWidth={2.5} />
 </motion.div>
 <div className="text-right md:text-left">
 <h2 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tighter text-slate-800">{title}</h2>
 {subtitle && <p className="text-slate-500 text-xs md:text-sm font-bold mt-1 opacity-60">{subtitle}</p>}
 </div>
 </div>
 </motion.div>
);


const TeslaSeasonalEngine: React.FC<{ data: AppState }> = ({ data }) => {
 const now = new Date();
 const month = now.getMonth() + 1;
 const day = now.getDay();
 const isWeekendWindow = day === 3 || day === 4 || day === 5 || day === 6; // Wed-Sat: prepare before Kuwait weekend
 const estimatedTemp = month >= 6 && month <= 9 ? 44 : month === 5 || month === 10 ? 34 : month === 4 || month === 11 ? 27 : 20;
 const weatherMood = estimatedTemp <= 28 ? 'طقس كشتات مثالي' : estimatedTemp <= 36 ? 'طقس طلعات خفيف' : 'حرارة عالية — ركّز على الطلبات المنزلية';
 const picnicReady = estimatedTemp <= 34 && isWeekendWindow;
 const keywords = picnicReady
   ? ['مشوي', 'مشويات', 'كباب', 'ريوق', 'كشتة', 'مندي', 'ورق', 'محشي']
   : ['سلطة', 'بارد', 'مشروب', 'حلو', 'ورق', 'ميني'];
 const products = (data.products || []).filter((p) => p?.isActive !== false && !p?.isOutOfStock);
 const matched = products
   .filter((p) => keywords.some((k) => `${p.name || ''} ${p.category || ''} ${p.description || ''}`.toLowerCase().includes(k.toLowerCase())))
   .slice(0, 4);
 const fallback = products.slice(0, 4);
 const suggestions = matched.length ? matched : fallback;
 const activationText = picnicReady
   ? 'رادار القنص يقترح تجهيز أطباق الكشتات والمشويات قبل عطلة الكويت بيومين.'
   : 'الرادار يختار أصنافاً أخف حسب حرارة الكويت الحالية وتوقيت الأسبوع.';

 return (
  <motion.section
   initial={{ opacity: 0, y: 18 }}
   animate={{ opacity: 1, y: 0 }}
   className="tesla-seasonal-engine mb-10 relative overflow-hidden rounded-[2rem] border border-emerald-500/15 bg-gradient-to-br from-slate-950 via-[#13251d] to-slate-900 p-4 md:p-5 text-white shadow-[0_24px_80px_rgba(15,23,42,.18)]"
   dir="rtl"
  >
   <div className="absolute -top-16 -left-16 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl" />
   <div className="absolute -bottom-20 right-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
   <div className="relative z-10 grid gap-5 lg:grid-cols-[1.05fr_.95fr] items-stretch">
    <div className="flex flex-col justify-between gap-5">
     <div>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[10px] font-black text-emerald-200 backdrop-blur-xl">
       <CloudSun size={14} /> Tesla Predictive Engine
      </div>
      <h3 className="mt-3 text-2xl md:text-3xl font-black tracking-tight leading-tight">التوقع الموسمي والمناخي لمطبخ التراث</h3>
      <p className="mt-3 max-w-2xl text-sm md:text-[15px] font-bold leading-8 text-slate-300">{activationText}</p>
     </div>
     <div className="grid grid-cols-3 gap-2">
      <div className="rounded-2xl bg-white/10 p-3 border border-white/10">
       <ThermometerSun size={18} className="text-amber-300 mb-2" />
       <div className="text-xl font-black">{estimatedTemp}°</div>
       <div className="text-[10px] font-bold text-slate-400">تقدير الكويت</div>
      </div>
      <div className="rounded-2xl bg-white/10 p-3 border border-white/10">
       <CalendarDays size={18} className="text-emerald-300 mb-2" />
       <div className="text-xl font-black">{isWeekendWindow ? 'نشط' : 'مراقبة'}</div>
       <div className="text-[10px] font-bold text-slate-400">عطلة الأسبوع</div>
      </div>
      <div className="rounded-2xl bg-white/10 p-3 border border-white/10">
       <Sparkles size={18} className="text-indigo-300 mb-2" />
       <div className="text-sm font-black leading-6">{weatherMood}</div>
       <div className="text-[10px] font-bold text-slate-400">إشارة المناخ</div>
      </div>
     </div>
    </div>
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[.07] p-3 md:p-4 backdrop-blur-xl">
     <div className="mb-3 flex items-center justify-between gap-3">
      <span className="text-[11px] font-black text-slate-300">اقتراحات تلقائية مرتبطة بالمنيو</span>
      <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] font-black text-emerald-200">جاهزة للقنص</span>
     </div>
     <div className="space-y-2">
      {suggestions.length > 0 ? suggestions.map((p) => (
       <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/10 p-3">
        <div className="min-w-0 text-right">
         <div className="truncate text-sm font-black text-white">{p.name}</div>
         <div className="text-[10px] font-bold text-slate-400">{p.category || 'منتج'} · {Number(p.price || 0).toFixed(3)} د.ك</div>
        </div>
        <div className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-[10px] font-black text-amber-200">اقترح قبلها بيومين</div>
       </div>
      )) : (
       <div className="rounded-2xl border border-white/10 bg-white/10 p-4 text-center text-xs font-bold text-slate-300">أضف منتجات فعالة ليبدأ الرادار بربط التوقعات بالمنيو.</div>
      )}
     </div>
    </div>
   </div>
  </motion.section>
 );
};


const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ data, onNavigate, onLogout, deepLinkData }) => {
 const [filter, setFilter] = useState<'day'|'week'|'month'|'year'|'all'>('month');
 const [activeWidget, setActiveWidget] = useState<string | null>(null);
 const [isPending, startTransition] = useTransition();
 const [isPushSupported, setIsPushSupported] = useState(false);
 const [pushEnabled, setPushEnabled] = useState(false);
  const [showPushModal, setShowPushModal] = useState(false);
 const [isActivatingPush, setIsActivatingPush] = useState(false);
 const [showFinancialStats, setShowFinancialStats] = useState(false);

 const [pushDenied, setPushDenied] = useState(false);

 // Close modals when Home is clicked (deepLinkData updates)
 useEffect(() => {
   if (deepLinkData && Object.keys(deepLinkData).length > 0) {
     setActiveWidget(null);
   }
 }, [deepLinkData]);

 useEffect(() => {
   const checkPush = async () => {
     if (typeof window !== 'undefined' && 'navigator' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
       setIsPushSupported(true);
       
       let permission = 'default';
       if ('Notification' in window) {
         permission = Notification.permission;
       }

       let hasSubscription = false;
       try {
         const registration = await navigator.serviceWorker.ready;
         const subscription = await registration.pushManager.getSubscription();
         hasSubscription = !!subscription;
       } catch (e) {
         console.warn("Check push subscription failed", e);
       }

       const isStoredEnabled = false; // ADMIN020_SERVER_TOKEN_IS_SOURCE_OF_TRUTH
// ADMIN020_GRANTED_MEANS_ENABLED
const browserAlreadyGranted =
  typeof Notification !== "undefined" && Notification.permission === "granted";

       if (permission === 'denied') {
         setPushDenied(true);
         setPushEnabled(false); // Make sure it's false
       } else if (permission === 'granted' || hasSubscription || isStoredEnabled) {
         setPushDenied(false);
         setPushEnabled(true);
          localStorage.setItem("push_notifications_enabled", "true");
       } else {
         setPushDenied(false);
         setPushEnabled(false);
       }
     } else {
       setIsPushSupported(false);
     }
   };
   
   checkPush();
 }, []);

 const handleEnablePush = async () => {
   setIsActivatingPush(true);
   try {
     if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      localStorage.setItem("push_notifications_enabled", "true");
      setPushEnabled?.(true);
      toast?.success?.("الإشعارات مفعّلة بالفعل");
      return;
    }

    await registerPushNotifications({ userId: data.settings?.companyName || 'partner', restaurantId: 'default' });
     setPushEnabled(true);
     toast.success("تم تفعيل إشعارات الطلبات بنجاح! 🔔");
     setShowPushModal(false);
   } catch (err: any) {
     toast.error(err.message || 'فشل تفعيل الإشعارات');
   } finally {
     setIsActivatingPush(false);
   }
 };

 const now = new Date();
 
 const activeInvoices = useMemo(() => {
 const cancelledOrderInvoiceIds = new Set((data?.orders || []).filter(o => o.status === 'cancelled' && o.isConvertedToInvoice && o.linkedInvoiceId).map(o => o.linkedInvoiceId));
 const invs = (data?.invoices || []).filter(inv => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id));
 if (filter === 'all') return invs;
 
 const nowTs = new Date().getTime();
 const MS_PER_DAY = 86400000;
 const thresholds: Record<string, number> = {
 day: MS_PER_DAY,
 week: 7 * MS_PER_DAY,
 month: 30 * MS_PER_DAY,
 year: 365 * MS_PER_DAY
 };
 
 const threshold = thresholds[filter];
 if (!threshold) return invs;

 return invs.filter(inv => {
 const d = new Date(inv.date).getTime();
 return (nowTs - d) <= threshold;
 });
 }, [data.invoices, data.orders, filter]);

const { 
  totalSalesVal, 
  totalCostVal, 
  totalExpensesVal, 
  totalAddonsRevenue,
  netProfit,
  profitMargin,
  productPerformance,
  menuEngineering
  } = useMemo(() => {
  const invoices = activeInvoices.filter(inv => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined);
  const sales = invoices.reduce((acc, inv) => acc + computeInvoiceTotal(inv, data?.products || []), 0);
  const cost = invoices.reduce((acc, inv) => acc + computeInvoiceCost(inv, data?.products || []), 0);
  const expenses = (data?.expenses || []).reduce((acc, exp) => acc + Math.abs(exp.amount || 0), 0) || 0;
  const netProf = sales - cost - expenses;
  const margin = sales > 0 ? (netProf / sales) * 100 : 0;

  const totalAddonsRevenue = invoices.reduce((acc, inv) => {
    return acc + computeInvoiceAddonsTotal(inv);
  }, 0);

 const salesMap: Record<string, { sold: number, revenue: number, profit: number }> = {};
 invoices.forEach(inv => {
 (inv.items || []).forEach(item => {
 if (!salesMap[item.productId]) {
 salesMap[item.productId] = { sold: 0, revenue: 0, profit: 0 };
 }
 const qty = item.quantity || 0;
 const perf = salesMap[item.productId];
 perf.sold += qty;
 perf.revenue += (item.priceAtTime || 0) * qty;
 perf.profit += ((item.priceAtTime || 0) - (item.costAtTime || 0)) * qty;
 });
 });

 // Menu Engineering Logic
 const productsStats = (data?.products || []).map(p => {
 const stat = salesMap[p.id] || { sold: 0, revenue: 0, profit: 0 };
 return {
  totalAddonsRevenue,
 product: p,
 sales: stat.sold,
 margin: stat.sold > 0 ? stat.profit / stat.sold : 0
 };
 });

 const activeStats = productsStats.filter(p => p.sales > 0);
 const avgVolume = activeStats.length > 0 ? activeStats.reduce((acc, p) => acc + p.sales, 0) / activeStats.length : 0;
 const avgMargin = activeStats.length > 0 ? activeStats.reduce((acc, p) => acc + p.margin, 0) / activeStats.length : 0;

 return {
  totalAddonsRevenue,
 totalSalesVal: sales,
 totalCostVal: cost,
 totalExpensesVal: expenses,
 netProfit: netProf,
 profitMargin: margin,
 productPerformance: salesMap,
 menuEngineering: {
 stars: activeStats.filter(p => p.sales >= avgVolume && p.margin >= avgMargin),
 plowhorses: activeStats.filter(p => p.sales >= avgVolume && p.margin < avgMargin),
 puzzles: activeStats.filter(p => p.sales < avgVolume && p.margin >= avgMargin),
 turtles: activeStats.filter(p => p.sales < avgVolume && p.margin < avgMargin)
 }
 };
 }, [activeInvoices, data?.expenses, data?.products]);

 const topProducts = useMemo(() => {
    const soldMap: Record<string, number> = {};
    
    for (const [pId, perf] of Object.entries(productPerformance as Record<string, {sold: number}>)) {
       soldMap[pId] = perf.sold || 0;
    }

    const now = new Date().getTime();
    const MS_PER_DAY = 86400000;
    const thresholds: Record<string, number> = {
      day: MS_PER_DAY,
      week: 7 * MS_PER_DAY,
      month: 30 * MS_PER_DAY,
      year: 365 * MS_PER_DAY,
    };
    const threshold = thresholds[filter];

    const completedOrders = (data?.orders || []).filter(o => {
      if (o.isConvertedToInvoice) return false;
      const st1 = String((o as any).paymentStatus || '').toLowerCase();
      const st2 = String(o.status || '').toLowerCase();
      const isPaid = ['paid', 'processed', 'shipped', 'delivered', 'completed', 'success', 'مكتمل', 'تم الدفع', 'تم الدفع وجاري التوصيل', 'مدفوعة', 'مدفوع'].some(s => st1.includes(s) || st2.includes(s));
      if (!isPaid) return false;
      
      if (threshold) {
         const getTimestamp = (obj: any) => {
           if (obj.createdAt && typeof obj.createdAt === 'object' && obj.createdAt.seconds) return obj.createdAt.seconds * 1000;
           if (obj.date) return new Date(obj.date).getTime();
           if (obj.createdAt) return new Date(obj.createdAt).getTime();
           return 0;
         };
         const t = getTimestamp(o);
         if (t === 0 || (now - t > threshold)) return false;
      }
      return true;
    });

    completedOrders.forEach(o => {
      (o.items || []).forEach(item => {
        soldMap[item.productId] = (soldMap[item.productId] || 0) + (Number(item.quantity) || 0);
      });
    });

    return (data?.products || [])
      .map(p => ({
        ...p,
        sold: soldMap[p.id] || 0
      }))
      .filter(p => p.sold > 0 && p.isActive !== false)
      .sort((a,b) => b.sold - a.sold)
      .slice(0, 5);
  }, [data?.products, data?.orders, productPerformance, filter]);

 const pendingOrdersCount = (data.orders || []).filter(o => o.status === 'pending').length;
 const totalOrdersCount = data.orders?.length || 0;
 const hasRealTimeFilterUse = (data.invoices || []).some((inv: any) => !inv.isDeleted) || (data.orders || []).length > 0;

 const getContextualGreeting = () => {
 const hour = now.getHours();
 const activeOrdersCount = data.orders?.filter(o => !['cancelled', 'delivered', 'تم التوصيل', 'تم الإلغاء', 'ملغي'].includes(o.status)).length || 0;
 
 const yesterday = new Date();
 yesterday.setDate(yesterday.getDate() - 1);
 yesterday.setHours(0, 0, 0, 0);
 const yesterdayEnd = new Date(yesterday);
 yesterdayEnd.setHours(23, 59, 59, 999);
 
 const validInvoices = data.invoices?.filter(inv => !inv.isDeleted) || [];
 const yesterdayInvoices = validInvoices.filter(inv => {
   const d = new Date(inv.date).getTime();
   return (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined) && d >= yesterday.getTime() && d <= yesterdayEnd.getTime();
 });
 
 const yesterdaySales = yesterdayInvoices.reduce((acc, inv) => acc + computeInvoiceTotal(inv, data?.products || []), 0);

 if (hour >= 5 && hour < 12) {
   if (yesterdaySales > 0) {
     return { title: `صباح الخير، مبيعات أمس بلغت ${yesterdaySales.toFixed(3)} د.ك ☀️`, sub: 'بداية يوم موفق. التفاصيل كاملة في تقريرك.' };
   } else {
     return { title: 'صباح الخير، يوم جديد وفرص جديدة ☀️', sub: 'بانتظار وصول أول طلبات اليوم. بالتوفيق!' };
   }
 } else if (hour >= 12 && hour < 17) {
 return { title: 'مرحباً، وقت ذروة الغداء! 🍽️', sub: `لدينا ${activeOrdersCount} طلب نشط حالياً، حافظ على هذا الزخم الممتاز.` };
 } else if (hour >= 17 && hour < 22) {
 return { title: 'مساء الخير، أداء استثنائي اليوم 🌙', sub: 'مبيعات العشاء تتصاعد، استمر في هذا الأداء الرائع.' };
 } else {
 return { title: 'تحية مسائية هادئة ☕', sub: 'النظام مستقر ويعمل بهدوء. وقت ممتاز لمراجعة أرقامك والتحضير للغد.' };
 }
 };
 const greeting = getContextualGreeting();

 const bentoCardStyle ="bg-[#fdfbf7] p-3 md:p-4 rounded-2xl2xl lg:rounded-2xl2xl md:rounded-2xl2xl border border-[#f0e6d2] shadow-[0_4px_20px_-10px_rgba(212,192,152,0.3)] text-right relative overflow-hidden flex flex-col h-full";
 
 return (
 <div className="partner-clean-shell min-h-full bg-slate-50 p-3 md:p-3 lg:p-3 md:p-4 animate-in fade-in duration-500 transition-colors" dir="rtl">
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col gap-3 mb-8">

        {isPushSupported && !pushEnabled && !pushDenied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-indigo-50 border border-indigo-100 text-indigo-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 self-stretch xl:self-auto"
          >
            <div className="flex items-center gap-3 text-right">
              <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                <Bell size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-[12px] font-bold border-b border-indigo-200/50 pb-1 mb-1 inline-block">تفعيل الإشعارات</h4>
                <p className="text-[10px] sm:text-[11px] font-bold text-indigo-600/80 mt-0.5">احصل على تنبيهات فورية عند وصول طلبات جديدة</p>
              </div>
            </div>
            
            <button
              onClick={() => setShowPushModal(true)}
              className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 w-full sm:w-auto hover:bg-indigo-700 hover:scale-[0.98] transition-all active:scale-95"
            >
              <Bell size={14} /> تفعيل الآن
            </button>
          </motion.div>
        )}

        {isPushSupported && pushDenied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-2xl flex items-center justify-between gap-4 self-stretch xl:self-auto"
          >
            <div className="flex items-center justify-between w-full h-full text-right text-[11px] font-bold">
               <span>الإشعارات موقوفة من إعدادات الجهاز</span>
            </div>
          </motion.div>
        )}


        <AnimatePresence>
          {showPushModal && (
            <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-3xl p-6 shadow-xl max-w-sm w-full text-center"
                >
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Bell size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">فعّل الإشعارات</h3>
                    <p className="text-slate-600 text-sm font-bold mb-6">لتصلك طلباتك الجديدة أول بأول حتى والتطبيق مغلق.</p>
                    <div className="flex flex-col gap-3">
                        <button
                          onClick={handleEnablePush}
                          disabled={isActivatingPush}
                          className="bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-colors"
                        >
                          {isActivatingPush ? 'جاري التفعيل...' : 'تفعيل الإشعارات الآن'}
                        </button>
                        <button
                          onClick={() => setShowPushModal(false)}
                          disabled={isActivatingPush}
                          className="text-slate-500 py-2 text-xs font-bold hover:text-slate-800 transition-colors"
                        >
                          ليس الآن
                        </button>
                    </div>
                </motion.div>
            </div>
          )}
        </AnimatePresence>

       {/* Time Slider (Minimalist) */}
       {hasRealTimeFilterUse && <div className="partner-time-filter relative z-20 px-1 flex justify-center pointer-events-auto fade-in animate-in slide-in-from-top-2 duration-500">
         <div className="bg-white/80 backdrop-blur-3xl rounded-[1.4rem] py-2.5 px-4 flex flex-col items-center gap-2 shadow-lg pointer-events-auto w-full max-w-[420px] border border-white/60 ring-1 ring-slate-900/5 transition-all hover:bg-white/90">
           <input 
             type="range"
             min="0"
             max="4"
             value={["all", "year", "month", "week", "day"].indexOf(filter)}
             onChange={(e) => {
               const map = ["all", "year", "month", "week", "day"] as const;
               startTransition(() => setFilter(map[parseInt(e.target.value)]));
             }}
             className="w-full h-1 bg-slate-200/80 rounded-full appearance-none cursor-grab active:cursor-grabbing outline-none transition-all duration-300
             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
             [&::-webkit-slider-thumb]:bg-slate-800 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
             style={{ direction: 'ltr' }}
           />
           
           <div className="flex justify-between w-full text-[10px] font-sans font-extrabold text-slate-400 px-0.5" style={{ direction: 'ltr' }}>
             <span onClick={() => startTransition(() => setFilter("all"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-left", filter === "all" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>الكل</span>
             <span onClick={() => startTransition(() => setFilter("year"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", filter === "year" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>سنة</span>
             <span onClick={() => startTransition(() => setFilter("month"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", filter === "month" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>شهر</span>
             <span onClick={() => startTransition(() => setFilter("week"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-center", filter === "week" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>أسبوع</span>
             <span onClick={() => startTransition(() => setFilter("day"))} className={cn("cursor-pointer transition-all duration-200 flex-1 text-right", filter === "day" ? "text-slate-800 scale-110" : "hover:text-slate-600")}>اليوم</span>
           </div>
         </div>
       </div>}
      
       <div className="mb-8">
         <CommandBrief data={data} dateFilter={filter} />
       </div>


        {/* Stats Grid - Exactly like Admin */}
        <motion.div layout className="mb-12 bg-white rounded-3xl p-2 md:p-5 border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative z-10">
          <button 
            onClick={() => setShowFinancialStats(!showFinancialStats)}
            className="w-full flex items-center justify-between p-3 md:p-0 group outline-none"
          >
            <div className="flex items-center gap-4 flex-row-reverse">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Activity size={20} />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-slate-800 text-lg tracking-tight">
                  الأداء المالي
                </h3>
                <p className="text-[10px] text-slate-500 font-bold">
                  المبيعات، التكاليف، والأرباح
                </p>
              </div>
            </div>
            <ChevronDown
              size={20}
              className={cn(
                "text-slate-500 transition-transform duration-500",
                showFinancialStats ? "rotate-180" : ""
              )}
            />
          </button>
          <AnimatePresence initial={false}>
            {showFinancialStats && (
              <motion.div
                initial={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, height: "auto", filter: "blur(0px)" }}
                exit={{ opacity: 0, height: 0, filter: "blur(10px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden mix-blend-multiply"
              >
                <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-6 transition-opacity", isPending ?"opacity-50" :"opacity-100")}>
                <GlobalStatBox label="إجمالي المبيعات" value={totalSalesVal} unit="د.ك" icon={TrendingUp} color="blue" subtext="بناءً على الفلتر" />
                <GlobalStatBox label="إجمالي مبيعات الإضافات" value={totalAddonsRevenue} unit="د.ك" icon={Package} color="emerald" subtext="بناءً على الفلتر" />
                <GlobalStatBox label="إجمالي التكاليف" value={totalCostVal + totalExpensesVal} unit="د.ك" icon={Briefcase} color="red" subtext="متضمنة المصاريف" />
                <GlobalStatBox label="الربح المتوقع" value={netProfit} unit="د.ك" icon={Activity} color="indigo" subtext="الأرباح الصافية" />
                <GlobalStatBox label="هامش الربح" value={profitMargin} isPercent={true} icon={DollarSign} color="amber" subtext="النسبة المئوية للأرباح" />
                </div>
                

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
       {/* Smart Tools Cards Section */}
       <div className="mb-12">
       <h3 className="text-xl font-bold text-slate-800 mb-6 tracking-tight flex items-center gap-2 flex-row-reverse justify-end pr-2">
       أدوات الإدارة الذكية <Sparkles size={24} className="text-amber-500" />
       </h3>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:p-4">
       <button onClick={() => onNavigate('smart-studio')} className="bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-500/20 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-indigo-600 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <Camera size={32} className="text-indigo-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-bold text-white mb-2 tracking-tight">استوديو الصورة الذكية</h3>
       <p className="text-[10px] font-bold text-slate-500 leading-relaxed">حوّل صورك لمحتوى احترافى ذكى</p>
       </button>
       <button onClick={() => setActiveWidget('campaign')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-rose-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <FlaskConical size={32} className="text-rose-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-bold text-white mb-2 tracking-tight">مختبر الحملات</h3>
       <p className="text-[10px] font-bold text-slate-500 leading-relaxed">ابتكر حملات ذكية مبنية على أرصدتك</p>
       </button>
       
       <button onClick={() => setActiveWidget('forecast')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <LineChartIcon size={32} className="text-indigo-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-bold text-white mb-2 tracking-tight">التنبؤ المالي</h3>
       <p className="text-[10px] font-bold text-slate-500 leading-relaxed">رؤية مستقبلية دقيقة لأداء مبيعاتك</p>
       </button>
      
       <button onClick={() => setActiveWidget('menu')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <Layers size={32} className="text-emerald-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-bold text-white mb-2 tracking-tight">هندسة المنيو الذكية</h3>
       <p className="text-[10px] font-bold text-slate-500 leading-relaxed">تحليل ربحية وشعبية كل صنف</p>
       </button>


      

       </div>
       </div>
      
       {/* Modals for Smart Tools */}
       <AnimatePresence>
       {activeWidget && (
       <div className="fixed inset-0 z-[200] flex items-center justify-center p-3">
       <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       exit={{ opacity: 0 }}
       onClick={() => setActiveWidget(null)}
       className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
       />
       <motion.div 
       initial={{ scale: 0.95, opacity: 0, y: 20 }}
       animate={{ scale: 1, opacity: 1, y: 0 }}
       exit={{ scale: 0.95, opacity: 0, y: 20 }}
       className="bg-slate-50 w-full max-w-5xl rounded-2xl md:rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden border border-white/10"
       >
       <div className="p-3 md:p-4 md:p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
       <h2 className="text-xl md:text-2xl font-bold text-slate-800">
       {activeWidget === 'campaign' &&"مختبر الحملات التسويقية الذكي"}
       {activeWidget === 'forecast' &&"التنبؤ المستقبلي الخوارزمي"}
       {activeWidget === 'menu' &&"مصفوفة هندسة المنيو الذكية"}
       </h2>
       <button onClick={() => setActiveWidget(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all active:scale-90">
       <X size={24} />
       </button>
       </div>
      
       <div className="p-3 md:p-4 md:p-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
       {activeWidget === 'campaign' && <MarketingLab data={data} />}
       {activeWidget === 'forecast' && <FutureForecast data={data} />}
       {activeWidget === 'menu' && (
       <div id="products-matrix-section" className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden" dir="rtl">
       <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-[#0f3460] via-[#e94560] to-[#0f3460]" />
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
       {/* Stars */}
       <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
       <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2 text-emerald-400">
       <Sparkles size={20} className="group-hover:animate-spin" />
       <h4 className="font-bold text-lg">النجوم (Stars)</h4>
       </div>
       <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">حجم مبيعات عالي + ربح عالي</span>
       </div>
       <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">حافظ على الترويج لها ولا تغير جودتها، هي مصدر أرباحك الرئيسي وتقود سمعة المطعم.</p>
       <div className="flex flex-wrap gap-2">
       {menuEngineering.stars.slice(0, 5).map(s => (
       <span key={s.product.id} className="text-xs font-bold text-white bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/20 shadow-sm">{s.product.name}</span>
      ))}
       {menuEngineering.stars.length === 0 && <span className="text-xs text-white/30 italic">لا توجد أصناف في هذه الفئة حالياً</span>}
       </div>
       </div>
      
       {/* Plowhorses */}
       <div className="bg-white/5 border border-amber-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
       <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2 text-amber-400">
       <Zap size={20} className="group-hover:-translate-x-1 transition-transform" />
       <h4 className="font-bold text-lg">أحصنة الحرث (Plowhorses)</h4>
       </div>
       <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">حجم مبيعات عالي + ربح منخفض</span>
       </div>
       <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">منتجات محبوبة لكن أرباحها قليلة. ارفع سعرها تدريجياً أو أعد هندسة المكونات لتقليل تكلفتها.</p>
       <div className="flex flex-wrap gap-2">
       {menuEngineering.plowhorses.slice(0, 5).map(s => (
       <span key={s.product.id} className="text-xs font-bold text-white bg-amber-500/20 px-3 py-1.5 rounded-lg border border-amber-500/20 shadow-sm">{s.product.name}</span>
      ))}
       {menuEngineering.plowhorses.length === 0 && <span className="text-xs text-white/30 italic">لا توجد أصناف في هذه الفئة حالياً</span>}
       </div>
       </div>
      
       {/* Puzzles */}
       <div className="bg-white/5 border border-blue-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
       <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2 text-blue-400">
       <Search size={20} className="group-hover:scale-110 transition-transform" />
       <h4 className="font-bold text-lg">الألغاز (Puzzles)</h4>
       </div>
       <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">حجم مبيعات منخفض + ربح عالي</span>
       </div>
       <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">منتجات مربحة جداً لكن مبيعاتها نادرة. أعد صياغة وصفها وضعها في عروض لتنشيطها.</p>
       <div className="flex flex-wrap gap-2">
       {menuEngineering.puzzles.slice(0, 5).map(s => (
       <span key={s.product.id} className="text-xs font-bold text-white bg-blue-500/20 px-3 py-1.5 rounded-lg border border-blue-500/20 shadow-sm">{s.product.name}</span>
      ))}
       {menuEngineering.puzzles.length === 0 && <span className="text-xs text-white/30 italic">لا توجد أصناف في هذه الفئة حالياً</span>}
       </div>
       </div>
      
       {/* Turtle */}
       <div className="bg-white/5 border border-rose-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
       <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2 text-rose-400">
       <Turtle size={20} className="group-hover:rotate-12 transition-transform" />
       <h4 className="font-bold text-lg">سلحفاة (Turtles)</h4>
       </div>
       <span className="text-[10px] text-white/50 font-bold bg-white/5 px-2 py-1 rounded-md">حجم مبيعات منخفض + ربح منخفض</span>
       </div>
       <p className="text-xs text-indigo-100/70 leading-relaxed mb-4">تستنزف مساحة وجهداً بلا عائد. فكّر بإزالتها أو تقديمها بأسلوب مختلف كلياً.</p>
       <div className="flex flex-wrap gap-2">
       {menuEngineering.turtles.slice(0, 5).map(s => (
       <span key={s.product.id} className="text-xs font-bold text-white bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 shadow-sm">{s.product.name}</span>
      ))}
       {menuEngineering.turtles.length === 0 && <span className="text-xs text-white/30 italic">لا توجد أصناف في هذه الفئة حالياً</span>}
       </div>
       </div>
       </div>
       </div>
      )}
       </div>
       </motion.div>
       </div>
      )}
       </AnimatePresence>
      
       {/* Partner Action Cards */}
       <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
       <motion.button
       type="button"
       whileHover={{ y: -4 }}
       whileTap={{ scale: 0.98 }}
       className="partner-action-card partner-action-card-primary group"
       onClick={() => onNavigate('orders')}
       >
         <div className="partner-action-icon bg-indigo-50 text-indigo-700 border-indigo-100">
           <ShoppingBag size={24} />
           <span className="partner-action-badge">{totalOrdersCount}</span>
         </div>
         <div className="text-right flex-1">
           <h3>طلبات التطبيق</h3>
           <p>تابع الطلبات الواردة وحوّل الجاهز منها للفواتير.</p>
         </div>
         <ChevronRight size={22} className="rotate-180 text-slate-300 group-hover:text-indigo-600 group-hover:-translate-x-1 transition-all" />
       </motion.button>

       <motion.button
       type="button"
       whileHover={{ y: -4 }}
       whileTap={{ scale: 0.98 }}
       className="partner-action-card group"
       onClick={() => onNavigate('invoices-list')}
       >
         <div className="partner-action-icon bg-slate-50 text-slate-700 border-slate-100">
           <FileText size={24} />
         </div>
         <div className="text-right flex-1">
           <h3>سجل الفواتير</h3>
           <p>راجع الفواتير السابقة وحالاتها من مكان واحد.</p>
         </div>
         <ChevronRight size={22} className="rotate-180 text-slate-300 group-hover:text-slate-700 group-hover:-translate-x-1 transition-all" />
       </motion.button>

       <motion.button
       type="button"
       whileHover={{ y: -4 }}
       whileTap={{ scale: 0.98 }}
       className="partner-action-card group"
       onClick={() => onNavigate('new-invoice')}
       >
         <div className="partner-action-icon bg-emerald-50 text-emerald-700 border-emerald-100">
           <DollarSign size={24} />
         </div>
         <div className="text-right flex-1">
           <h3>فاتورة جديدة</h3>
           <p>أنشئ فاتورة بسرعة بدون خيارات إضافية مزعجة.</p>
         </div>
         <ChevronRight size={22} className="rotate-180 text-slate-300 group-hover:text-emerald-700 group-hover:-translate-x-1 transition-all" />
       </motion.button>
       </div>
    </motion.div>
  </div>
 );
};

const patternSadu ="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%239e9e9e' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E";

export default PartnerDashboard;
