import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
 ShoppingBag, TrendingUp, Handshake, DollarSign, Target, Sparkles, Activity, 
 ChevronRight, Star, LineChart as LineChartIcon, FlaskConical, LayoutGrid, Filter, X, 
 Zap, ArrowUpRight, PieChart, Users, Truck, Briefcase, Cpu, Layers, Search, Bell, BellRing, ChevronDown
} from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
import { MarketingLab } from './MarketingLab';
import { FutureForecast } from './FutureForecast';
import { CommandBrief } from './CommandBrief';
import { registerPushNotifications, getPushSupportStatus } from '../lib/pushNotifications';
import { toast } from 'sonner';

interface PartnerDashboardProps {
 data: AppState;
 onNavigate: (page: string) => void;
 onLogout: () => void;
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
 <span className="text-[10px] font-black opacity-40 uppercase tracking-tighter">{unit}</span>
 <div className="text-xl lg:text-3xl font-black text-slate-800 tracking-tighter group-hover:scale-105 transition-transform origin-right">
 {isPercent ? `${value.toFixed(1)}%` : Number(value).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
 </div>
 </div>
 <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] group-hover:text-slate-600 transition-colors">{label}</div>
 {subtext && (
 <div className={cn("text-[8px] lg:text-[9px] mt-2 font-black px-2 py-1 rounded-full bg-current/10 inline-block", getGradient(color).split(' ')[2])}>
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
 <h2 className="text-xl md:text-2xl lg:text-3xl font-black tracking-tighter text-slate-800">{title}</h2>
 {subtitle && <p className="text-slate-500 text-xs md:text-sm font-black mt-1 opacity-60">{subtitle}</p>}
 </div>
 </div>
 </motion.div>
);

const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ data, onNavigate, onLogout }) => {
 const [filter, setFilter] = useState<'day'|'week'|'month'|'year'|'all'>('month');
 const [activeWidget, setActiveWidget] = useState<string | null>(null);
 const [isPending, startTransition] = useTransition();
 const [isPushSupported, setIsPushSupported] = useState(false);
 const [pushEnabled, setPushEnabled] = useState(false);
 const [isActivatingPush, setIsActivatingPush] = useState(false);
 const [showFinancialStats, setShowFinancialStats] = useState(false);

 const [pushDenied, setPushDenied] = useState(false);

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

       const isStoredEnabled = localStorage.getItem("push_notifications_enabled") === "true";

       if (permission === 'denied') {
         setPushDenied(true);
         setPushEnabled(false); // Make sure it's false
       } else if (permission === 'granted' || hasSubscription || isStoredEnabled) {
         setPushDenied(false);
         setPushEnabled(true);
      localStorage.setItem("push_notifications_enabled", "true");
      localStorage.setItem("push_notifications_enabled", "true");
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
     await registerPushNotifications({ userId: data.settings?.companyName || 'partner', restaurantId: 'default' });
     setPushEnabled(true);
     toast.success("تم تفعيل إشعارات الطلبات بنجاح! 🔔");
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
 netProfit,
 profitMargin,
 productPerformance,
 menuEngineering
 } = useMemo(() => {
 const invoices = activeInvoices.filter(inv => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined);
 const sales = invoices.reduce((acc, inv) => acc + (inv.totalAmount || 0) + (inv.deliveryFee || 0), 0);
 const cost = invoices.reduce((acc, inv) => acc + (inv.totalCost || 0), 0);
 const expenses = (data?.expenses || []).reduce((acc, exp) => acc + Math.abs(exp.amount || 0), 0) || 0;
 const netProf = invoices.reduce((acc, inv) => acc + (inv.profit || 0), 0) - expenses;
 const margin = sales > 0 ? (netProf / sales) * 100 : 0;

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
 product: p,
 sales: stat.sold,
 margin: stat.sold > 0 ? stat.profit / stat.sold : 0
 };
 });

 const activeStats = productsStats.filter(p => p.sales > 0);
 const avgVolume = activeStats.length > 0 ? activeStats.reduce((acc, p) => acc + p.sales, 0) / activeStats.length : 0;
 const avgMargin = activeStats.length > 0 ? activeStats.reduce((acc, p) => acc + p.margin, 0) / activeStats.length : 0;

 return {
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
 return (data?.products || [])
 .map(p => ({
 ...p,
 sold: productPerformance[p.id]?.sold || 0
 }))
 .filter(p => p.sold > 0)
 .sort((a,b) => b.sold - a.sold)
 .slice(0, 5);
 }, [data?.products, productPerformance]);

 const pendingOrdersCount = (data.orders || []).filter(o => o.status === 'pending').length;
 const totalOrdersCount = data.orders?.length || 0;

 const getContextualGreeting = () => {
 const hour = now.getHours();
 const activeOrdersCount = data.orders?.filter(o => !['cancelled', 'delivered'].includes(o.status)).length || 0;
 if (hour >= 5 && hour < 12) {
 return { title: 'صباح الخير، أداء أمس كان مبهراً بفضل مبيعات العشاء ☀️', sub: 'الطقس اليوم ممتاز والمتوقع إقبال عالي بزيادة 15%. كل تفاصيل الإيرادات جاهزة في تقريرك الناعم.' };
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
 <div className="min-h-full bg-slate-50 p-3 md:p-3 lg:p-3 md:p-4 animate-in fade-in duration-500 transition-colors" dir="rtl">
 <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-3 md:p-4">
 <div className="flex flex-col items-end gap-4 w-full md:w-auto overflow-x-auto pb-2 md:pb-0" style={{ flexWrap: 'nowrap' }}>
 <SectionHeader 
 title={greeting.title} 
 icon={Handshake} 
 color="indigo" 
 subtitle={greeting.sub} 
 />
 </div>
  </div>

    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex flex-col gap-3 mb-8">
      {isPushSupported && !pushEnabled && !pushDenied && (
         <motion.div
           initial={{ opacity: 0, scale: 0.9, y: -10 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           className="bg-indigo-600 border border-indigo-500 shadow-xl shadow-indigo-600/20 text-white p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 self-stretch xl:self-auto min-w-[280px]"
         >
           <div className="flex items-center gap-3 w-full sm:w-auto">
             <div className="bg-white/20 p-2 rounded-xl shrink-0">
               <BellRing size={20} className="animate-pulse" />
             </div>
             <div className="text-right">
               <h4 className="font-black text-sm">إشعارات الطلبات الجدد</h4>
               <p className="text-[10px] text-indigo-100 font-bold">فعّل الإشعارات وتوصلك الطلبات أول بأول حتى لو البرنامج مسكر</p>
             </div>
           </div>
           <button
             onClick={handleEnablePush}
             disabled={isActivatingPush}
             className="w-full sm:w-auto bg-white text-indigo-600 px-4 py-2 font-black text-[11px] rounded-xl shadow-sm hover:bg-slate-50 transition-colors disabled:opacity-50 whitespace-nowrap"
           >
             {isActivatingPush ? 'جاري التفعيل...' : 'تفعيل الإشعارات'}
           </button>
         </motion.div>
       )}

        {isPushSupported && pushDenied && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-2xl flex items-center justify-between gap-4 self-stretch xl:self-auto"
          >
            <div className="flex items-center justify-between w-full h-full text-right text-[11px] font-black">
               <span>الإشعارات موقوفة من إعدادات الجهاز</span>
            </div>
          </motion.div>
        )}

        {isPushSupported && pushEnabled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-emerald-50 border border-emerald-100 text-emerald-600 p-3 rounded-2xl flex items-center justify-between gap-4 self-stretch xl:self-auto"
          >
            <div className="flex items-center gap-2 text-right text-[11px] font-black">
               <Bell size={16} />
               <span>الإشعارات مفعلة بنجاح</span>
            </div>
          </motion.div>
        )}
       
       <div className="flex items-center gap-2 bg-white/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-100 shadow-sm">
       {(['day', 'week', 'month', 'year', 'all'] as const).map(f => (
       <button
       key={f}
       onClick={() => startTransition(() => setFilter(f))}
       className={cn(
      "px-5 py-2 text-[11px] font-black rounded-xl transition-all",
       filter === f ?"bg-slate-900 text-white shadow-lg" :"text-slate-500 hover:bg-slate-100"
      )}
       >
       {f === 'day' ? 'يوم' : f === 'week' ? 'اسبوع' : f === 'month' ? 'شهر' : f === 'year' ? 'سنة' : 'الكل'}
       </button>
      ))}
       </div>
      
       <div className="mb-8">
         <CommandBrief data={data} dateFilter={filter} />
       </div>

        {/* Stats Grid - Exactly like Admin */}
        <motion.div layout className="mb-12 bg-white rounded-3xl p-2 md:p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative z-10">
          <button 
            onClick={() => setShowFinancialStats(!showFinancialStats)}
            className="w-full flex items-center justify-between p-3 md:p-0 group outline-none"
          >
            <div className="flex items-center gap-4 flex-row-reverse">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <Activity size={20} />
              </div>
              <div className="text-right">
                <h3 className="font-black text-slate-800 text-lg tracking-tight">
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
                "text-slate-400 transition-transform duration-500",
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
                <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-6 transition-opacity", isPending ?"opacity-50" :"opacity-100")}>
                <GlobalStatBox label="إجمالي المبيعات" value={totalSalesVal} unit="د.ك" icon={TrendingUp} color="blue" subtext="بناءً على الفلتر" />
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
       <h3 className="text-xl font-black text-slate-800 mb-6 tracking-tight flex items-center gap-2 flex-row-reverse justify-end pr-2">
       أدوات الإدارة الذكية <Sparkles size={24} className="text-amber-500" />
       </h3>
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:p-4">
       <button onClick={() => setActiveWidget('campaign')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-2xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-rose-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <FlaskConical size={32} className="text-rose-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-black text-white mb-2 tracking-tight">مختبر الحملات</h3>
       <p className="text-[10px] font-bold text-slate-400 leading-relaxed">ابتكر حملات ذكية مبنية على أرصدتك</p>
       </button>
       
       <button onClick={() => setActiveWidget('forecast')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-2xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-indigo-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <LineChartIcon size={32} className="text-indigo-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-black text-white mb-2 tracking-tight">التنبؤ المالي</h3>
       <p className="text-[10px] font-bold text-slate-400 leading-relaxed">رؤية مستقبلية دقيقة لأداء مبيعاتك</p>
       </button>
      
       <button onClick={() => setActiveWidget('menu')} className="bg-gradient-to-br from-[#1a1a2e] to-slate-900 border border-slate-800 p-3 md:p-4 rounded-2xl text-right flex flex-col items-end group hover:scale-[1.02] transition-transform shadow-2xl relative overflow-hidden outline-none">
       <div className="absolute -top-3 md:p-4 -left-10 w-32 h-32 bg-emerald-500 opacity-20 blur-3xl group-hover:opacity-40 transition-opacity" />
       <Layers size={32} className="text-emerald-400 mb-4 group-hover:-translate-y-1 transition-transform" />
       <h3 className="text-lg font-black text-white mb-2 tracking-tight">هندسة المنيو الذكية</h3>
       <p className="text-[10px] font-bold text-slate-400 leading-relaxed">تحليل ربحية وشعبية كل صنف</p>
       </button>
      
       <div className={bentoCardStyle}>
       <h3 className="font-black text-lg text-[#4a3f35] mb-4 flex items-center gap-2 justify-end">نجوم التراث (الأكثر مبيعاً) <Sparkles size={18} className="text-amber-500" /></h3>
       <div className="space-y-2 flex-grow">
       {topProducts.length > 0 ? topProducts.slice(0, 3).map((p, i) => (
       <div key={p.id} className="flex justify-between items-center bg-white p-3 rounded-2xl border border-[#f0e6d2] hover:border-amber-400 transition-colors flex-row-reverse">
       <div className="flex items-center gap-2 flex-row-reverse">
       <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-black text-[10px]">#{i+1}</div>
       <div className="font-black text-slate-800 text-[11px] truncate max-w-[100px]">{p.name}</div>
       </div>
       <div className="bg-slate-50 border border-slate-100 text-slate-500 text-[8px] font-black px-2 py-1 rounded-full">{p.sold} طلب</div>
       </div>
      )) : <div className="text-center py-4 text-slate-300 font-bold text-[10px]">لا توجد بيانات</div>}
       </div>
       <button onClick={() => setActiveWidget('bestsellers')} className="mt-3 text-center text-[9px] font-black text-amber-600 hover:text-amber-700 transition-colors">عرض القائمة الكاملة</button>
       </div>
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
       className="bg-slate-50 w-full max-w-5xl rounded-2xl md:rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.5)] relative z-10 overflow-hidden border border-white/20"
       >
       <div className="p-3 md:p-4 md:p-3 bg-white border-b border-slate-100 flex items-center justify-between sticky top-0 z-20">
       <h2 className="text-xl md:text-2xl font-black text-slate-800">
       {activeWidget === 'campaign' &&"مختبر الحملات التسويقية الذكي"}
       {activeWidget === 'forecast' &&"التنبؤ المستقبلي الخوارزمي"}
       {activeWidget === 'bestsellers' &&"نجوم التراث (الأكثر مبيعاً)"}
       {activeWidget === 'menu' &&"مصفوفة هندسة المنيو الذكية"}
       </h2>
       <button onClick={() => setActiveWidget(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-all active:scale-90">
       <X size={24} />
       </button>
       </div>
      
       <div className="p-3 md:p-4 md:p-3 max-h-[80vh] overflow-y-auto custom-scrollbar">
       {activeWidget === 'campaign' && <MarketingLab data={data} />}
       {activeWidget === 'forecast' && <FutureForecast data={data} />}
       {activeWidget === 'bestsellers' && (
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
       {topProducts.map((p, i) => (
       <div key={p.id} className="flex justify-between items-center bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm flex-row-reverse">
       <div className="flex items-center gap-4 flex-row-reverse">
       <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center font-black text-xl">#{i+1}</div>
       <div className="text-right">
       <div className="font-black text-slate-800 text-lg">{p.name}</div>
       <div className="text-[10px] text-slate-400 font-bold uppercase">{p.category || 'عام'}</div>
       </div>
       </div>
       <div className="flex flex-col items-start gap-1">
       <div className="text-indigo-600 text-lg font-black">{p.sold} طلبات</div>
       <div className="text-[10px] text-slate-300 font-bold">إجمالي المبيعات المباشرة</div>
       </div>
       </div>
      ))}
       </div>
      )}
       {activeWidget === 'menu' && (
       <div id="products-matrix-section" className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl p-3 md:p-4 shadow-xl relative overflow-hidden" dir="rtl">
       <div className="absolute top-0 right-0 w-full h-2 bg-gradient-to-l from-[#0f3460] via-[#e94560] to-[#0f3460]" />
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
       {/* Stars */}
       <div className="bg-white/5 border border-emerald-500/30 rounded-2xl p-3 md:p-3 relative overflow-hidden group hover:bg-white/10 transition-all">
       <div className="flex items-center justify-between mb-4">
       <div className="flex items-center gap-2 text-emerald-400">
       <Sparkles size={20} className="group-hover:animate-spin" />
       <h4 className="font-black text-lg">النجوم (Stars)</h4>
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
       <h4 className="font-black text-lg">أحصنة الحرث (Plowhorses)</h4>
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
       <h4 className="font-black text-lg">الألغاز (Puzzles)</h4>
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
       <h4 className="font-black text-lg">سلحفاة (Turtles)</h4>
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
      
       {/* Action Card */}
       <div className="max-w-6xl mx-auto">
       <motion.div 
       whileHover={{ y: -5 }}
       className="group cursor-pointer"
       onClick={() => onNavigate('orders')}
       >
       <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-3 md:p-4 md:p-3 md:p-4 rounded-2xl md:rounded-2xl shadow-2xl shadow-indigo-600/30 text-white relative overflow-hidden flex flex-col justify-between">
       <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none rotate-12" style={{ backgroundImage: `url(${patternSadu})` }} />
       <div className="absolute -bottom-10 -right-10 w-64 h-64 lg:w-96 lg:h-96 bg-white/5 rounded-full blur-3xl opacity-50" />
       
       <div className="relative z-10 flex justify-between items-start">
       <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-xl border border-white/10 flex items-center justify-center relative">
       <ShoppingBag size={40} />
       <div className="absolute -top-2 -right-2 bg-white text-indigo-600 text-[11px] font-black w-7 h-7 rounded-full flex items-center justify-center shadow-xl border-2 border-indigo-500">
         {totalOrdersCount}
       </div>
       </div>
       </div>
      
      
       <div className="relative z-10 mt-6 flex justify-between items-end">
       <div className="text-right">
       <h3 className="font-black text-xl md:text-3xl md:text-xl md:text-2xl mb-2 tracking-tighter">طلبات التطبيق 📦</h3>
       <p className="text-white/70 text-base font-bold">معالجة الطلبات الواردة وتحويلها إلى فواتير (إجمالي {totalOrdersCount} طلب)</p>
       </div>
       <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center shadow-lg transform transition-transform group-hover:-translate-x-2">
       <ChevronRight size={24} className="rotate-180" />
       </div>
       </div>
       </div>
       </motion.div>
       </div>
    </motion.div>
  </div>
 );
};

const patternSadu ="data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2V0h2v20h2v2H20v-1.5zM0 20h2v20H0V20zm4 0h2v20H4V20zm4 0h2v20H8V20zm4 0h2v20h-2V20zm4 0h2v20h-2V20zm4 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2zm0 4h20v2H20v-2z' fill='%239e9e9e' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E";

export default PartnerDashboard;
