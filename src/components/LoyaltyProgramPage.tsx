import React, { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Award, Users, Star, Gift, MessageCircle, Clock, Settings, TrendingUp, Zap, Search, ChevronRight, ChevronLeft, Tag, X, History } from 'lucide-react';
import { cn, normalizeArabicNumerals, normalizeArabic } from '../lib/utils';
import { AppState } from '../types';
import { toast } from 'sonner';
import { PromoCodePage } from './PromoCodePage';

interface LoyaltyProgramPageProps {
  data: AppState;
  onUpdateData?: (data: AppState) => void;
  defaultTab?: 'loyalty' | 'promocodes';
}

export const LoyaltyProgramPage: React.FC<LoyaltyProgramPageProps> = ({ data, onUpdateData, defaultTab = 'loyalty' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'loyalty' | 'promocodes'>(defaultTab);

  useEffect(() => {
    setActiveSubTab(defaultTab);
  }, [defaultTab]);
 const [expirationRule, setExpirationRule] = useState<number>(data.loyaltySettings?.expirationDays || 120);
 const [activeSegment, setActiveSegment] = useState<string>('all');
 const [searchTerm, setSearchTerm] = useState('');
 const [sortBy, setSortBy] = useState<'points' | 'spent' | 'lastOrder'>('points');
 const [currentPage, setCurrentPage] = useState(1);
 const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
 const [isDynamicRewardsEnabled, setIsDynamicRewardsEnabled] = useState(data.loyaltySettings?.isDynamicEnabled ?? true);
 const rowsPerPage = 10;

 const [showSettings, setShowSettings] = useState(false);

 const customers = data?.customers || [];
 const invoices = data?.invoices || [];
 const coupons = data?.promocodes || [];

 const loyaltyData = useMemo(() => {
 const now = new Date();
 
 return customers.map((c: any, index: number) => {
 const customerInvoices = invoices.filter((i: any) => i.customerId === c.id && !i.isDeleted);
 const ordersCount = customerInvoices.length;
 const totalSpent = customerInvoices.reduce((acc: number, inv: any) => acc + (inv.totalAmount || 0), 0);
 const totalDiscountReceived = customerInvoices.reduce((acc: number, inv: any) => acc + (inv.discount || 0), 0);
 
 // History for coupons and points (simulated from invoices)
 const rewardHistory = customerInvoices
 .filter(inv => inv.discount > 0)
 .map(inv => ({ 
 date: inv.date, 
 amount: inv.discount, 
 type: inv.discount > 5 ? 'مكافأة ولاء' : 'كوبون خصم' 
 }));

 let lastOrderDate: Date | null = null;
 if (ordersCount > 0) {
 const sortedDates = customerInvoices.map((i: any) => new Date(i.date || new Date())).sort((a,b) => b.getTime() - a.getTime());
 lastOrderDate = sortedDates[0];
 }

 const daysSinceLastOrder = lastOrderDate ? Math.floor((now.getTime() - lastOrderDate.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
 
 let classification ="غير محدد";
 let classificationColor ="text-slate-500 bg-slate-100";

 const isCouponHunter = totalDiscountReceived > (totalSpent * 0.15) && ordersCount > 2;
 const isLoyalWithoutDiscounts = totalDiscountReceived === 0 && ordersCount >= 3;

 if (ordersCount >= 10 && totalSpent >= 300) {
 classification ="شريك التراث";
 classificationColor ="text-yellow-700 bg-amber-100 border-amber-300 font-extrabold";
 } else if (ordersCount >= 5 && totalSpent >= 150 && isLoyalWithoutDiscounts) {
 classification ="عاشق التراث";
 classificationColor ="text-indigo-700 bg-indigo-100 border-indigo-200 font-bold";
 } else if (ordersCount >= 4 && totalSpent >= 200 && daysSinceLastOrder <= 60) {
 classification ="عميل ذهبي";
 classificationColor ="text-amber-600 bg-amber-200 border-amber-300 font-bold";
 } else if (isCouponHunter) {
 classification ="صياد العروض";
 classificationColor ="text-emerald-700 bg-emerald-100 border-emerald-200";
 } else if (ordersCount === 1 && daysSinceLastOrder <= 30) {
 classification ="ضيف جديد";
 classificationColor ="text-blue-600 bg-blue-100 border-blue-200";
 } else if (daysSinceLastOrder <= 45 && ordersCount > 0) {
 classification ="عميل نشط";
 classificationColor ="text-teal-600 bg-teal-100 border-teal-200";
 } else if (daysSinceLastOrder > 45 && daysSinceLastOrder <= 90) {
 classification ="متباطئ";
 classificationColor ="text-orange-600 bg-orange-100 border-orange-200";
 } else if (daysSinceLastOrder > 90) {
 classification ="منقطع";
 classificationColor ="text-rose-600 bg-rose-100 border-rose-200";
 } else {
 classification ="عميل عابر";
 classificationColor ="text-slate-600 bg-slate-100 border-slate-200/60";
 }

 const rawPoints = Math.floor(totalSpent);
 let pointsStatus ="فعال";
 let activePoints = rawPoints;
 
 // Fix Point Validity logic
 if (expirationRule !== 0 && lastOrderDate) {
 if (daysSinceLastOrder > expirationRule * 0.75 && daysSinceLastOrder <= expirationRule) {
 pointsStatus ="معرضة للانتهاء";
 } else if (daysSinceLastOrder > expirationRule) {
 pointsStatus ="منتهية";
 activePoints = 0;
 }
 } else if (expirationRule !== 0 && !lastOrderDate) {
 // If no orders, points shouldn't expire if they don't exist, but we handle safe case
 activePoints = 0;
 }

 // Smart Messaging Templates
 let smartAdvice ="";
 let whatsappMessage ="";
 let actionLabel ="إرسال عرض";

 const namePart = c.name?.split(' ')[0] ||"عميلنا";

 if (classification ==="شريك التراث" || classification ==="عميل ذهبي") {
 smartAdvice ="عميل مميز وشريك حقيقي، دلاله واجب!";
 whatsappMessage = `\u2728 هلا ${namePart}، أنت من عملاء التراث المميزين وعندك ${activePoints} نقطة. جهزنا لك عرض خاص يليق فيك.`;
 actionLabel ="مكافأة الشريك";
 } else if (classification ==="عاشق التراث") {
 smartAdvice ="ولاء مطلق للمطعم، كافئه ليصبح شريكاً";
 whatsappMessage = `\u2728 أصيل يا ${namePart}، ولاؤك للتراث محل تقدير. رصيدك ${activePoints} نقطة، وجهزنا لك عرض خاص اليوم.`;
 actionLabel ="تقدير العاشق";
 } else if (classification ==="صياد العروض") {
 smartAdvice ="يعشق التوفير، ارسل له عروض حصرية ومباشرة";
 whatsappMessage = `\u2728 يا هلا ${namePart}، جهزنا لك عرض حصري مع رصيدك الحالي ${activePoints} نقطة. لا يفوتك.`;
 actionLabel ="طُعم الاقتناص";
 } else if (classification ==="منقطع") {
 smartAdvice ="اشتقنا له، فرصة استرجاعه بكود قوي";
 whatsappMessage = `\u2728 اشتقنا لك ${namePart}، لك فترة ما طلبت من التراث. عندك ${activePoints} نقطة ناطرتك.`;
 actionLabel ="رسالة استرجاع";
 } else if (activePoints >= 150 && activePoints < 250) {
 smartAdvice ="باقي له قليل للوصول لمكافأة كبيرة";
 whatsappMessage = `\u2728 ${namePart}، باقي لك شوي وتوصل للمكافأة الكبيرة. رصيدك الحين ${activePoints} نقطة.`;
 actionLabel ="تحفيز الوصول";
 } else if (activePoints >= 250) {
 smartAdvice ="رصيده عالي، شجعه على الاستبدال";
 whatsappMessage = `\u2728 ما شاء الله ${namePart}، رصيدك ${activePoints} نقطة. تقدر تستخدمها كخصم مباشر. حياك الله.`;
 actionLabel ="رسالة استبدال";
 } else {
 smartAdvice ="العميل يبني ولاءه، شجعه لتجميع النقاط";
 whatsappMessage = `\u2728 يا هلا ${namePart}، رصيد نقاطك ${activePoints} نقطة. استمر بجمع النقاط لفتح عروض التراث.`;
 actionLabel ="تذكير بالولاء";
 }

 return {
 ...c,
 totalSpent,
 ordersCount,
 totalDiscountReceived,
 daysSinceLastOrder,
 lastOrderDate,
 classification,
 classificationColor,
 rawPoints,
 points: activePoints,
 pointsStatus,
 smartAdvice,
 whatsappMessage,
 actionLabel,
 rewardHistory
 };

 });
 }, [customers, invoices, expirationRule]);

 // Statistics Calculation
 const stats = useMemo(() => {
 let totalPoints = 0;
 let active = 0;
 let inactive = 0;
 let vipCount = 0;
 let atRiskCount = 0;
 
 loyaltyData.forEach((c: any) => {
 totalPoints += c.points;
 if (c.classification === 'نشط' || c.classification === 'جديد') active++;
 if (c.classification === 'خامل') inactive++;
 if (c.classification === 'VIP') vipCount++;
 if (c.classification === 'ماشي بالخطر') atRiskCount++;
 });

 return { totalPoints, active, inactive, vipCount, atRiskCount };
 }, [loyaltyData]);

 // Recommended rewards logic - Integrated with Dynamic Pulse
 const businessPulse = useMemo(() => {
 // Simple logic to determine business state from invoices
 const recentInvoices = invoices.filter(inv => {
 const date = new Date(inv.date);
 const now = new Date();
 return (now.getTime() - date.getTime()) < (7 * 24 * 60 * 60 * 1000);
 });
 const avgDaily = recentInvoices.length / 7;
 if (avgDaily > 10) return 'busy';
 if (avgDaily < 3) return 'slow';
 return 'normal';
 }, [invoices]);

 const rewards = useMemo(() => {
 const baseRewards = [
 { id: 'r1', name: 'خصم 1 د.ك', points: 100, desc: 'عرض أساسي مناسب للجميع', icon: <TrendingUp size={20}/> },
 { id: 'r2', name: 'توصيل مجاني', points: 250, desc: 'المكافأة الأكثر طلباً', icon: <Zap size={20}/> },
 { id: 'r3', name: 'منتج مجاني', points: 500, desc: 'يبرد الجبد ويعزز الولاء', icon: <Gift size={20}/> },
 { id: 'r4', name: 'خصم الـ VIP', points: 1000, desc: 'للعملاء الأكثر ولاءً"تبيض الوجه"', icon: <Award size={20}/> }
 ];

 if (!isDynamicRewardsEnabled) return baseRewards;

 // Adjust based on business pulse
 return baseRewards.map(r => {
 let adjustedPoints = r.points;
 let advice ="";
 if (businessPulse === 'slow') {
 adjustedPoints = Math.floor(r.points * 0.8);
 advice =" (مخفّض للسوق الهادئ)";
 } else if (businessPulse === 'busy') {
 adjustedPoints = Math.floor(r.points * 1.2);
 advice =" (مرتفع للضغط العالمي)";
 }
 return { ...r, points: adjustedPoints, desc: r.desc + advice };
 });
 }, [isDynamicRewardsEnabled, businessPulse]);

 // Actions

 const getFriendlyName = (name?: string) => {
   const clean = String(name || '').trim().replace(/\s+/g, ' ');
   if (!clean) return 'عميلنا العزيز';
   const parts = clean.split(' ');
   if (['بو', 'أبو', 'ابو', 'أم', 'ام'].includes(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
   return parts[0] || 'عميلنا العزيز';
 };

 const pickBySeed = (templates: string[], seed?: string) => {
   const value = String(seed || '0').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
   return templates[value % templates.length];
 };

 const handleWhatsApp = (phone: string, msg: string) => {
 const formattedPhone = phone?.startsWith('965') ? phone : `965${phone}`;
 window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(sanitizeWhatsAppText(`${msg}\n\nhttps://alturathkw.shop`))}`, '_blank');
 };

 const updateLoyaltySettings = (exp: number, dyn: boolean) => {
 if (onUpdateData) {
 onUpdateData({
 ...data,
 loyaltySettings: {
 expirationDays: exp,
 isDynamicEnabled: dyn
 }
 });
 }
 };

 const handleRedeemPoints = (customer: any, reward: any) => {
 if (customer.points < reward.points) {
 toast.error('نقاط العميل غير كافية لهذا العرض');
 return;
 }

 if (!onUpdateData) return;

 // Generate a unique promo code for the redemption
 const redemptionId = `L-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
 const desc = reward.id === 'r2' ? 'توصيل مجاني' : `${reward.name}`;
 
 const newCoupon = {
 id: `redeem-${Date.now()}`,
 code: redemptionId,
 discountValue: reward.id === 'r1' ? 1 : reward.id === 'r4' ? 5 : 0, 
 discountType: (reward.id === 'r1' || reward.id === 'r4') ? 'fixed' : 'percentage',
 description: `استبدال نقاط: ${reward.name} للعميل ${customer.name}`,
 isActive: true,
 usedCount: 0,
 usageLimit: 1,
 startDate: new Date().toISOString(),
 endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days validity
 createdAt: new Date().toISOString()
 };

 // Note: Deducting points technically requires updating the customer's total spent or having a dedicated points field.
 // In this system, points are derived from spending. To"use" points, we'd need to subtract from a virtual points field.
 // Since we don't have a points transaction sub-collection, we'll just alert that a coupon was made.
 
 onUpdateData({
 ...data,
 promocodes: [...(data.promocodes || []), newCoupon as any]
 });

 toast.success('تم استبدال النقاط!', { 
 description: `تم إنشاء كود الخصم: ${redemptionId} . يمكن استخدامه لمرة واحدة.` 
 });
 
 // Suggest sending the code via WhatsApp
 const msg = `هلا ${getFriendlyName(customer.name)}، تم استبدال ${reward.points} نقطة بنجاح. كود الخصم الخاص بك: ${redemptionId}. تدلل.`;
 handleWhatsApp(customer.phone, msg);
 setSelectedCustomer(null);
 };

 const filteredCustomers = useMemo(() => {
 let filtered = loyaltyData.filter((c: any) => {
 const segMatch = activeSegment === 'all' || c.classification === activeSegment;
 const searchMatch = !searchTerm || 
 normalizeArabic(c.name || "").includes(normalizeArabic(searchTerm)) || 
 c.phone?.includes(searchTerm);
 return segMatch && searchMatch;
 });

 // Sorting
 return filtered.sort((a, b) => {
 if (sortBy === 'points') return b.points - a.points;
 if (sortBy === 'spent') return b.totalSpent - a.totalSpent;
 if (sortBy === 'lastOrder') {
 const dateA = a.lastOrderDate ? new Date(a.lastOrderDate).getTime() : 0;
 const dateB = b.lastOrderDate ? new Date(b.lastOrderDate).getTime() : 0;
 return dateB - dateA;
 }
 return 0;
 });
 }, [loyaltyData, activeSegment, searchTerm, sortBy]);

 const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage);
 const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

 const handlePageChange = (newPage: number) => {
 if (newPage >= 1 && newPage <= totalPages) {
 setCurrentPage(newPage);
 }
 };

 if (activeSubTab === 'promocodes') {
  return (
   <div className="space-y-8" dir="rtl">
     {/* Modern Tab Switcher */}
     <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/60 p-1.5 rounded-2xl w-fit">
       <button
         onClick={() => setActiveSubTab('loyalty')}
         className={cn(
           "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2",
           "text-slate-500 hover:text-slate-800"
         )}
       >
         <Award size={16} />
         برنامج الولاء
       </button>
       <button
         onClick={() => setActiveSubTab('promocodes')}
         className={cn(
           "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2",
           "bg-white text-rose-600 shadow-md border border-slate-200/40"
         )}
       >
         <Tag size={16} />
         الكوبونات والخصم
       </button>
     </div>
     <PromoCodePage data={data} onUpdateData={onUpdateData} />
   </div>
  );
 }

 return (
 <div className="space-y-8" dir="rtl">
  {/* Modern Tab Switcher */}
  <div className="flex items-center gap-2 bg-slate-100 border border-slate-200/60 p-1.5 rounded-2xl w-fit">
    <button
      onClick={() => setActiveSubTab('loyalty')}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2",
        "bg-white text-amber-600 shadow-md border border-slate-200/40"
      )}
    >
      <Award size={16} />
      برنامج الولاء
    </button>
    <button
      onClick={() => setActiveSubTab('promocodes')}
      className={cn(
        "px-5 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all flex items-center gap-2",
        "text-slate-500 hover:text-slate-800"
      )}
    >
      <Tag size={16} />
      الكوبونات والخصم
    </button>
  </div>
 {/* Header Stats */}
 <div className="loyalty-hero-panel bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-2 md:p-6 text-white shadow-xl relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
 <Award size={300} className="absolute -bottom-20 -right-20" />
 </div>
 <div className="relative z-10">
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
 <motion.h2 
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="text-xl md:text-3xl font-bold flex items-center gap-3"
 >
 برنامج الولاء الذكي <Award size={32} />
 </motion.h2>

 <button 
 onClick={() => setShowSettings(true)}
 className="bg-white/20 hover:bg-white/30 backdrop-blur-md px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all"
 >
 <Settings size={18} /> إعدادات النقاط
 </button>
 </div>
 
 <p className="text-amber-50 font-bold max-w-2xl text-lg leading-relaxed mt-4">
 النظام يحسب النقاط تلقائياً (كل 1 دينار كويتي = 1 نقطة). 
 قمنا بتصنيف عملائك ذكياً لتبدأ بتقديم العروض المناسبة بالوقت المناسب. من الآخر، النظام راح يحافظ عليهم!
 </p>
 
 <div className="loyalty-stats-grid grid grid-cols-2 lg:grid-cols-5 gap-3 mt-8">
 <div className="bg-white/10 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 transition-all hover:bg-white/20">
 <span className="text-[10px] font-bold text-amber-200 block mb-1">إجمالي النقاط الفعالة</span>
 <div className="text-xl md:text-2xl font-bold">{stats.totalPoints.toLocaleString('en-GB')} <span className="text-[10px] opacity-70 font-bold">نقطة</span></div>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 transition-all hover:bg-emerald-500/20">
 <span className="text-[10px] font-bold text-emerald-200 block mb-1">نشط / جديد</span>
 <div className="text-xl md:text-2xl font-bold">{stats.active} <span className="text-[10px] opacity-70 font-bold">عميل</span></div>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 transition-all hover:bg-amber-500/30">
 <span className="text-[10px] font-bold text-amber-200 block mb-1">الـ VIP"الكفو"</span>
 <div className="text-xl md:text-2xl font-bold">{stats.vipCount} <span className="text-[10px] opacity-70 font-bold">عميل</span></div>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 transition-all hover:bg-orange-500/20">
 <span className="text-[10px] font-bold text-orange-200 block mb-1">ماشي بالخطر ⚠️</span>
 <div className="text-xl md:text-2xl font-bold">{stats.atRiskCount} <span className="text-[10px] opacity-70 font-bold">عميل</span></div>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-2 md:p-3 rounded-2xl border border-white/10 transition-all hover:bg-rose-500/20">
 <span className="text-[10px] font-bold text-rose-200 block mb-1">خاملون تماماً</span>
 <div className="text-xl md:text-2xl font-bold">{stats.inactive} <span className="text-[10px] opacity-70 font-bold">عميل</span></div>
 </div>
 </div>
 </div>
 </div>

 {/* Dynamic Rewards Settings */}
 <div className="bg-white border text-right border-slate-200/60 rounded-2xl p-3 md:p-3 shadow-sm relative overflow-hidden">
 <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"/>
 <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 relative z-10">
 <h3 className="font-bold text-2xl text-slate-800 flex items-center gap-2 relative z-10">المكافآت الذكية (Rewards) <Gift className="text-amber-500" /></h3>
 <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-2xl">
 <button 
 onClick={() => {
 setIsDynamicRewardsEnabled(true);
 updateLoyaltySettings(expirationRule, true);
 }}
 className={cn(
"px-4 py-2 rounded-xl text-xs font-bold transition-all",
 isDynamicRewardsEnabled ?"bg-amber-500 text-white shadow-lg" :"text-slate-500"
)}
 >
 مكافآت متكيفة آلياً (Pulse Mode)
 </button>
 <button 
 onClick={() => {
 setIsDynamicRewardsEnabled(false);
 updateLoyaltySettings(expirationRule, false);
 }}
 className={cn(
"px-4 py-2 rounded-xl text-xs font-bold transition-all",
 !isDynamicRewardsEnabled ?"bg-slate-900 text-white shadow-lg" :"text-slate-500"
)}
 >
 مكافآت ثابتة
 </button>
 </div>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
 {rewards.map((reward, i) => (
 <div key={i} className="p-3 md:p-3 bg-slate-50 border border-slate-100 rounded-3xl hover:border-amber-200 transition-all group">
 <div className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex justify-center items-center text-amber-500 mb-4 group-hover:scale-110 transition-transform shadow-sm">
 {reward.icon}
 </div>
 <h4 className="font-bold text-slate-800 text-lg">{reward.name}</h4>
 <p className="text-slate-500 text-sm font-bold mt-1 min-h-[40px]">{reward.desc}</p>
 <div className="mt-4 pt-4 border-t border-slate-200/60 font-bold text-amber-600">
 {reward.points} نقطة
 </div>
 </div>
))}
 </div>
 </div>

 {/* TOP 10 GAMIFICATION */}
 {loyaltyData.length > 0 && (
 <div className="bg-slate-900 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl my-8 text-right" dir="rtl">
 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none"></div>
 <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/20 blur-[100px] rounded-full pointer-events-none" />
 <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 relative z-10">
 <div>
 <h3 className="text-2xl md:text-3xl font-bold text-amber-400 flex flex-wrap items-center gap-3">
 أبطال الطلبات 🏆 
 <span className="text-[11px] md:text-sm font-bold bg-amber-500/20 text-amber-200 px-3 py-1 rounded-full border border-amber-500/30">Top 10 Leaderboard</span>
 </h3>
 <p className="text-slate-500 font-bold mt-2 text-xs md:text-sm">أكثر العملاء ولاءً.. حوّلهم من أرقام هواتف إلى "شخصيات وأبطال" وارفع مبيعاتك.</p>
 </div>
 </div>
 
 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 relative z-10">
 {[...loyaltyData].sort((a,b) => b.totalSpent - a.totalSpent).slice(0, 10).map((hero, idx) => (
 <div key={hero.id} className="relative group bg-slate-800/80 hover:bg-slate-800 backdrop-blur-xl border border-slate-700 hover:border-amber-500/50 rounded-2xl p-4 transition-all duration-300">
 <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-900 flex items-center justify-center font-bold text-xs text-amber-400 shadow-xl z-20">
 #{idx + 1}
 </div>
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center text-lg md:text-xl font-bold mb-3 border border-amber-500/20">
 {hero.name?.charAt(0) || '?'}
 </div>
 <h4 className="font-bold text-xs md:text-sm text-slate-100 truncate">{hero.name || 'عميلنا الكفو'}</h4>
 <p className="text-[10px] md:text-[11px] text-slate-500 font-bold mt-1">المحفظة: {hero.totalSpent.toFixed(2)} د.ك</p>
 
 {/* Smart Action */}
 {hero.daysSinceLastOrder > 14 && (
 <div className="mt-4 pt-4 border-t border-slate-700/20">
 <p className="text-[10px] md:text-[11px] text-rose-300 font-bold mb-2">البطل غايب من {hero.daysSinceLastOrder} يوم!</p>
 <button 
 onClick={() => {
 const heroName = getFriendlyName(hero.name);
 const msg = pickBySeed([
   `عاش من شافك، ${heroName}. اشتقنا لك، وجهزنا لك خصم عودة خاص.`,
   `${heroName}، غيبتك طولت. نحب نرجعك بطلب مرتب وخصم خاص لك.`,
   `هلا ${heroName}، مكانك محفوظ بين أبطال التراث. عندك عرض عودة ينتظرك.`
 ], hero.id || hero.phone || hero.name);
 handleWhatsApp(hero.phone, msg);
 }}
 className="w-full bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 py-2 rounded-lg text-[10px] md:text-[11px] font-bold transition-all"
 >
 استرجاع بخصم 15%
 </button>
 </div>
 )}
 {hero.daysSinceLastOrder <= 14 && (
 <div className="mt-4 pt-4 border-t border-slate-700/20">
 <p className="text-[10px] md:text-[11px] text-emerald-300 font-bold mb-2">في قمة النشاط 🔥</p>
 <button 
 onClick={() => {
 const heroName = getFriendlyName(hero.name);
 const msg = pickBySeed([
   `كفو يا ${heroName}! أنت من أبطال الطلبات، ولك مكافأة خاصة في الطلب القادم.`,
   `${heroName}، حضورك مستمر وذوقك واضح. جهزنا لك تقدير بسيط للطلب القادم.`,
   `هلا ${heroName}، لأنك من العملاء المميزين، عندك هدية استمرار من التراث.`
 ], hero.id || hero.phone || hero.name);
 handleWhatsApp(hero.phone, msg);
 }}
 className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 py-2 rounded-lg text-[10px] md:text-[11px] font-bold transition-all"
 >
 مكافأة الاستمرار
 </button>
 </div>
 )}
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Customer Segments Table */}
 <div className="loyalty-customers-panel bg-white border text-right border-slate-200/60 rounded-2xl p-3 shadow-sm">
 <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 md:mb-8 gap-3 md:gap-4">
 <div />
 
 <div className="flex flex-col xl:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
 {/* Sorting */}
 <div className="flex items-center gap-1 md:gap-2 bg-slate-50 border border-slate-200/60 rounded-xl md:rounded-2xl p-1 w-full xl:w-auto">
 <button onClick={() => setSortBy('points')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-bold transition-all", sortBy === 'points' ?"bg-slate-900 text-white" :"text-slate-500")}>الأعلى نقاط</button>
 <button onClick={() => setSortBy('spent')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-bold transition-all", sortBy === 'spent' ?"bg-slate-900 text-white" :"text-slate-500")}>الأعلى صرف</button>
 <button onClick={() => setSortBy('lastOrder')} className={cn("px-2 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-bold transition-all", sortBy === 'lastOrder' ?"bg-slate-900 text-white" :"text-slate-500")}>أحدث طلب</button>
 </div>

 <div className="relative w-full lg:w-64">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
 <input 
 type="text" 
 placeholder="بحث بالاسم أو الرقم..." 
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-bold text-sm placeholder:text-slate-500"
 value={searchTerm}
 onChange={(e) => {
 let val = normalizeArabicNumerals(e.target.value);
if (/^[0-9]*$/.test(val)) val = val.slice(0, 8);
setSearchTerm(val);
 setCurrentPage(1);
 }}
 />
 </div>
 
 <div className="loyalty-segment-scroll flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-2xl p-1 overflow-x-auto w-full lg:w-auto max-w-full">
 {[
 { id: 'all', label: 'الكل' },
 { id: 'VIP', label: 'VIP 👑' },
 { id: 'نشط', label: 'نشط' },
 { id: 'جديد', label: 'جديد' },
 { id: 'ماشي بالخطر', label: 'تنبيه ⚠️' },
 { id: 'خامل', label: 'خامل' }
 ].map(seg => (
 <button 
 key={seg.id}
 onClick={() => {
 setActiveSegment(seg.id);
 setCurrentPage(1);
 }}
 className={cn(
"px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-colors",
 activeSegment === seg.id 
 ?"bg-amber-100 text-amber-700" 
 :"text-slate-500 hover:bg-slate-200/50"
)}
 >
 {seg.label}
 </button>
))}
 </div>
 </div>
 </div>

 <div className="loyalty-mobile-list md:hidden space-y-3">
 <AnimatePresence mode="popLayout">
 {paginatedCustomers.length > 0 ? paginatedCustomers.map((c: any) => (
 <motion.div
 key={c.id}
 initial={{ opacity: 0, y: 8 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -8 }}
 className="loyalty-mobile-card"
 >
 <div className="loyalty-mobile-card-head">
 <button
 onClick={() => setSelectedCustomer(c)}
 className="loyalty-mobile-customer"
 >
 <div className={cn("loyalty-mobile-avatar", c.classificationColor)}>
 {c.name?.charAt(0)}
 </div>
 <div>
 <span className="loyalty-mobile-name">{c.name}</span>
 <span className="loyalty-mobile-phone" dir="ltr">{c.phone}</span>
 </div>
 </button>
 <div className="loyalty-mobile-points">
 <Star size={17} className={c.pointsStatus ==="مجمدة" ?"fill-slate-400 text-slate-400" :"fill-amber-500 text-amber-500"} />
 <strong className={c.pointsStatus ==="مجمدة" ?"line-through text-slate-500" :"text-amber-600"}>{c.points}</strong>
 </div>
 </div>

 <div className="loyalty-mobile-meta-grid">
 <div>
 <small>التصنيف</small>
 <span className={cn("loyalty-mobile-chip", c.classificationColor)}>{c.classification}</span>
 </div>
 <div>
 <small>آخر طلب</small>
 <span className="loyalty-mobile-muted">
 <Clock size={14} />
 {c.daysSinceLastOrder !== Infinity ? `منذ ${c.daysSinceLastOrder} يوم` : 'لا يوجد'}
 </span>
 </div>
 <div>
 <small>الخصومات</small>
 <span className="loyalty-mobile-muted">
 <Tag size={14} />
 {c.totalDiscountReceived.toFixed(2)} د.ك
 </span>
 </div>
 <div>
 <small>حالة النقاط</small>
 <span className="loyalty-mobile-muted">{c.pointsStatus}</span>
 </div>
 </div>

 <div className="loyalty-mobile-advice">
 {c.smartAdvice}
 </div>

 <button
 onClick={() => handleWhatsApp(c.phone, c.whatsappMessage)}
 className="loyalty-mobile-action"
 >
 <MessageCircle size={17} />
 {c.actionLabel}
 </button>
 </motion.div>
 )) : (
 <div className="p-8 text-center text-slate-500 font-bold bg-slate-50 rounded-2xl">
 لا يوجد عملاء في هذه الفئة.
 </div>
 )}
 </AnimatePresence>
 </div>

 <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-100 pb-0">
 <table className="w-full text-right min-w-[700px]" dir="rtl">
 <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
 <tr>
 <th className="p-3 pr-6">العميل</th>
 <th className="p-3 text-center">التصنيف الآلي</th>
 <th className="p-3 text-center">النقاط الفعالة</th>
 <th className="p-3 text-center">إجمالي الخصومات المستفاده</th>
 <th className="p-3 text-right">التوصية الذكية</th>
 <th className="p-3 pl-6 text-left">إجراء سريع</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm">
 <AnimatePresence mode="popLayout">
 {paginatedCustomers.length > 0 ? paginatedCustomers.map((c: any) => (
 <motion.tr 
 key={c.id} 
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -5 }}
 className="hover:bg-slate-50/70 transition-colors group"
 >
 <td className="p-3 pr-6">
 <button 
 onClick={() => setSelectedCustomer(c)}
 className="flex items-center gap-3 text-right hover:opacity-70 transition-opacity"
 >
 <div className={cn("min-w-[48px] w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl transition-colors shrink-0", c.classificationColor)}>
 {c.name?.charAt(0)}
 </div>
 <div className="flex flex-col">
 <span className="font-bold text-slate-800 text-xs md:text-sm">{c.name}</span>
 <span className="text-[10px] md:text-[11px] text-slate-500 font-bold tracking-wide mt-0.5 md:mt-1" dir="ltr">{c.phone}</span>
 </div>
 </button>
 </td>
 <td className="p-2 md:p-3 text-center">
 <div className="flex flex-col items-center gap-1.5 md:gap-2">
 <span className={cn("px-2 py-1 md:px-3 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold", c.classificationColor)}>
 {c.classification}
 </span>
 {c.daysSinceLastOrder !== Infinity && (
 <div className="text-[10px] md:text-[11px] text-slate-500 font-bold flex items-center gap-1">
 <Clock size={10} /> منذ {c.daysSinceLastOrder} يوم
 </div>
)}
 </div>
 </td>
 <td className="p-3">
 <div className="flex flex-col items-center">
 <span className={cn(
"font-bold text-lg flex items-center gap-1.5",
 c.pointsStatus ==="مجمدة" ?"text-slate-500 line-through" :"text-amber-600"
)}>
 {c.points} <Star size={16} className={c.pointsStatus ==="مجمدة" ?"fill-slate-400" :"fill-amber-500"} />
 </span>
 {c.pointsStatus !=="فعال" && (
 <span className={cn(
"text-[10px] whitespace-nowrap font-bold px-2 py-0.5 rounded-lg mt-1",
 c.pointsStatus ==="معرضة للانتهاء" ?"bg-orange-100 text-orange-600" :"bg-slate-100 text-slate-500"
)}>
 {c.pointsStatus}
 </span>
)}
 </div>
 </td>
 <td className="p-3">
 <div className="flex flex-col items-center">
 <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-3 py-1.5 rounded-xl">
 <Tag size={14} className="text-slate-500" />
 {c.totalDiscountReceived.toFixed(2)} د.ك
 </span>
 </div>
 </td>
 <td className="p-2 md:p-3 text-right">
 <div className="bg-slate-100/50 p-2 md:p-3 rounded-xl inline-block max-w-[280px]">
 <span className="text-[10px] md:text-xs font-bold text-slate-600 leading-relaxed block">
 {c.smartAdvice}
 </span>
 </div>
 </td>
 <td className="p-3 pl-6 text-left">
 <button 
 onClick={() => handleWhatsApp(c.phone, c.whatsappMessage)}
 className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all rounded-xl font-bold text-xs shadow-sm hover:shadow whitespace-nowrap min-w-[130px]"
 >
 <MessageCircle size={16} />
 {c.actionLabel}
 </button>
 </td>
 </motion.tr>
)) : (
 <tr>
 <td colSpan={6} className="p-3 md:p-4 md:p-3 md:p-4 text-center text-slate-500 font-bold">
 لا يوجد عملاء في هذه الفئة.
 </td>
 </tr>
)}
 </AnimatePresence>
 </tbody>
 </table>
 </div>

 {/* Pagination Controls */}
 {totalPages > 1 && (
 <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100 px-4">
 <div className="text-sm font-bold text-slate-500">
 إظهار {((currentPage - 1) * rowsPerPage) + 1} إلى {Math.min(currentPage * rowsPerPage, filteredCustomers.length)} من {filteredCustomers.length} عميل
 </div>
 <div className="flex items-center gap-2">
 <button 
 onClick={() => handlePageChange(currentPage - 1)}
 disabled={currentPage === 1}
 className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronRight size={18} />
 </button>
 <div className="px-4 py-1.5 font-bold text-sm bg-amber-50 text-amber-700 rounded-xl border border-amber-100">
 {currentPage} / {totalPages}
 </div>
 <button 
 onClick={() => handlePageChange(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
 >
 <ChevronLeft size={18} />
 </button>
 </div>
 </div>
)}
 </div>

 {/* Customer Detail Modal (Mini CRM) */}
 {/* Settings Modal */}
 <AnimatePresence>
 {showSettings && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-3">
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setShowSettings(false)}
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
 />
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl p-3 md:p-3 overflow-hidden" onClick={(e) => e.stopPropagation()}
 dir="rtl"
 >
 <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">إعدادات برنامج الولاء <Settings size={24} className="text-primary"/></h3>
 
 <div className="space-y-6">
 <div>
 <label className="text-xs font-bold text-slate-500 uppercase block mb-3">صلاحية النقاط (يوم)</label>
 <div className="flex items-center gap-4">
 <input 
 type="range" 
 min="0" 
 max="365" 
 step="30"
 value={expirationRule}
 onChange={(e) => setExpirationRule(Number(e.target.value))}
 className="flex-1 accent-amber-500"
 />
 <span className="w-16 text-center font-bold text-slate-800 bg-slate-100 py-2 rounded-xl border border-slate-200/60">
 {expirationRule === 0 ? 'لا تنتهي' : expirationRule}
 </span>
 </div>
 <p className="text-[10px] text-slate-500 font-bold mt-2">
 {expirationRule === 0 ? 'النقاط لا تنتهي أبداً.' : `تنتهي النقاط تلقائياً بعد مرور ${expirationRule} يوم من آخر طلب للعميل.`}
 </p>
 </div>

 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
 <div>
 <div className="font-bold text-slate-800 text-sm">المكافآت التكيفية (ذكي)</div>
 <div className="text-[10px] text-slate-500 font-bold">تعديل قيمة النقاط بناءً على ضغط الحجز والنبض الاقتصادي.</div>
 </div>
 <button 
 onClick={() => setIsDynamicRewardsEnabled(!isDynamicRewardsEnabled)}
 className={cn("w-12 h-6 rounded-full transition-all relative", isDynamicRewardsEnabled ?"bg-emerald-500" :"bg-slate-300")}
 >
 <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", isDynamicRewardsEnabled ?"right-7" :"right-1")} />
 </button>
 </div>

 <div className="pt-6 border-t border-slate-100 flex gap-4">
 <button 
 onClick={() => {
 updateLoyaltySettings(expirationRule, isDynamicRewardsEnabled);
 setShowSettings(false);
 toast.success("تم حفظ إعدادات الولاء بنجاح");
 }}
 className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
 >
 حفظ التغييرات
 </button>
 <button 
 onClick={() => setShowSettings(false)}
 className="px-6 bg-slate-100 text-slate-500 py-4 rounded-2xl font-bold text-sm active:scale-95 transition-all"
 >
 إلغاء
 </button>
 </div>
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>

 <AnimatePresence>
 {selectedCustomer && (
 <div className="fixed inset-0 z-[110] flex items-center justify-center p-3">
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setSelectedCustomer(null)}
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
 />
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="relative w-full max-w-2xl bg-white rounded-3xl md:rounded-2xl shadow-xl overflow-hidden flex flex-col"
 dir="rtl"
 >
 {/* Modal Header */}
 <div className="bg-slate-900 p-3 md:p-3 text-white relative">
 <button 
 onClick={() => setSelectedCustomer(null)}
 className="absolute top-3 md:p-4 left-6 text-slate-500 hover:text-white transition-colors"
 >
 <X size={24} />
 </button>
 <div className="flex items-center gap-3 md:p-4">
 <div className={cn("w-12 md:w-20 h-12 md:h-20 rounded-2xl flex items-center justify-center font-bold text-xl md:text-3xl", selectedCustomer.classificationColor)}>
 {selectedCustomer.name?.charAt(0)}
 </div>
 <div>
 <h3 className="text-2xl font-bold">{selectedCustomer.name}</h3>
 <p className="text-slate-500 font-bold" dir="ltr">{selectedCustomer.phone}</p>
 <div className="flex items-center gap-2 mt-2">
 <span className={cn("px-3 py-1 rounded-lg text-[10px] font-bold", selectedCustomer.classificationColor)}>
 {selectedCustomer.classification}
 </span>
 <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold text-amber-400">
 {selectedCustomer.points} نقطة ولاء
 </span>
 </div>
 </div>
 </div>
 </div>

 {/* Modal Content */}
 <div className="p-3 md:p-3 overflow-y-auto max-h-[60vh] space-y-4 md:space-y-8">
 {/* Key Metrics */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
 <div className="bg-slate-50 p-2 md:p-3 rounded-xl md:rounded-2xl border border-slate-100 text-center">
 <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5 md:mb-1">إجمالي الصرف</span>
 <div className="text-sm md:text-lg font-bold text-slate-800">{(selectedCustomer.totalSpent || 0).toFixed(3)} د.ك</div>
 </div>
 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
 <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">عدد الطلبات</span>
 <div className="text-lg font-bold text-slate-800">{selectedCustomer.ordersCount}</div>
 </div>
 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
 <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">نقاط مكتسبة</span>
 <div className="text-lg font-bold text-slate-800">{selectedCustomer.rawPoints}</div>
 </div>
 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center">
 <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">آخر طلب</span>
 <div className="text-lg font-bold text-slate-500">
 {selectedCustomer.lastOrderDate ? new Date(selectedCustomer.lastOrderDate).toLocaleDateString('en-GB') : 'لا يوجد'}
 </div>
 </div>
 </div>

 {/* Loyalty & Rewards History */}
 <div>
 <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">سجل الولاء والكوبونات <History size={18} className="text-slate-500" /></h4>
 <div className="space-y-2">
 {selectedCustomer.rewardHistory && selectedCustomer.rewardHistory.length > 0 ? (
 selectedCustomer.rewardHistory.map((h: any, idx: number) => (
 <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-2xl">
 <div className="flex items-center gap-3">
 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-rose-500 shadow-sm">
 <Gift size={18} />
 </div>
 <div>
 <div className="font-bold text-slate-800 text-sm">{h.type}</div>
 <div className="text-[10px] text-slate-500 font-bold">{new Date(h.date).toLocaleDateString('en-GB')}</div>
 </div>
 </div>
 <div className="text-rose-600 font-bold text-sm">-{h.amount.toFixed(3)} د.ك</div>
 </div>
))
) : (
 <div className="text-center py-4 md:py-8 text-slate-500 font-bold text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200/60">
 لا يوجد سجل مكافآت مستخدمة لهذا العميل حتى الآن.
 </div>
)}
 </div>
 </div>

 {/* Marketing Action */}
 <div className="bg-slate-50 p-3 md:p-4 rounded-3xl border border-slate-100">
 <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">استبدال النقاط <Zap size={18} className="text-amber-500" /></h4>
 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {rewards.map(r => (
 <button
 key={r.id}
 disabled={selectedCustomer.points < r.points}
 onClick={() => handleRedeemPoints(selectedCustomer, r)}
 className={cn(
"p-3 rounded-2xl border text-right transition-all flex flex-col gap-1",
 selectedCustomer.points >= r.points 
 ?"bg-white border-slate-200/60 hover:border-amber-400 hover:shadow-md cursor-pointer" 
 :"bg-slate-100 border-slate-100 opacity-50 cursor-not-allowed"
)}
 >
 <div className="text-xs font-bold text-slate-800">{r.name}</div>
 <div className="text-[10px] font-bold text-amber-600">{r.points} نقطة</div>
 </button>
))}
 </div>
 </div>

 <div className="bg-emerald-50 p-3 md:p-4 rounded-3xl border border-emerald-100">
 <h4 className="font-bold text-emerald-800 mb-2">تأثير العميل المحتمل</h4>
 <p className="text-xs text-emerald-700 font-bold leading-relaxed mb-4">
 {selectedCustomer.smartAdvice} - يمكنك إرسال رسالة ترويجية فورية مخصصة لهذا العميل لزيادة ولاؤه أو استعادته.
 </p>
 <button 
 onClick={() => handleWhatsApp(selectedCustomer.phone, selectedCustomer.whatsappMessage)}
 className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
 >
 <MessageCircle size={18} />
 إرسال {selectedCustomer.actionLabel}
 </button>
 </div>
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>
 </div>
);
};

export default LoyaltyProgramPage;
const sanitizeWhatsAppText = (text: string) =>
 String(text || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
