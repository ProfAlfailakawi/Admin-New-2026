import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Trash2, CheckCircle, Clock, Percent, DollarSign, Activity, X, Sparkles, Award, Scale, ShieldAlert, Gavel, AlertTriangle, LockKeyhole } from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { getCouponProfitGuard, getKuwaitiSeasonalMove } from '../lib/ai-engine';

import ConfirmModal from './ui/ConfirmModal';

export const PromoCodePage: React.FC<{ data: AppState; onUpdateData?: (data: AppState) => void }> = ({ data, onUpdateData }) => {
 const coupons = data?.promocodes || [];
 const [showModal, setShowModal] = useState(false);
 const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
 const [activationCourtCoupon, setActivationCourtCoupon] = useState<any | null>(null);
 const [newCode, setNewCode] = useState({ code: '', value: '', type: 'percentage' as 'percentage' | 'fixed', description: '' });
 const seasonalMove = useMemo(() => getKuwaitiSeasonalMove(data), [data]);


 const buildCouponCourt = (coupon: any) => {
  const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const products = Array.isArray((data as any)?.products) ? (data as any).products : [];
  const totalSales = invoices.reduce((sum: number, inv: any) => sum + Number(inv?.totalAmount || inv?.total || inv?.amount || 0), 0);
  const avgOrder = invoices.length ? totalSales / invoices.length : 0;
  const value = Number(coupon?.discountValue ?? coupon?.value ?? newCode.value ?? 0) || 0;
  const type = coupon?.discountType || coupon?.type || newCode.type;
  const limit = Number(coupon?.usageLimit || 100) || 100;
  const estimatedDiscount = type === 'percentage'
   ? Math.min(avgOrder * (value / 100), avgOrder || value)
   : value;
  const maxExposure = estimatedDiscount * Math.min(limit, 100);
  const exposureRate = totalSales ? maxExposure / totalSales : 0;
  const isHighPercent = type === 'percentage' && value >= 35;
  const isHeavyFixed = type !== 'percentage' && avgOrder > 0 && value >= avgOrder * 0.35;
  const verdict = isHighPercent || isHeavyFixed || exposureRate > 0.22
   ? 'لا تطلقه الآن'
   : exposureRate > 0.11 || value >= 20
    ? 'مغري لكن يحتاج حدود'
    : 'آمن للإطلاق';
  const tone = verdict === 'لا تطلقه الآن' ? 'danger' : verdict === 'مغري لكن يحتاج حدود' ? 'warning' : 'safe';
  const reasons = [
   type === 'percentage' ? `خصم نسبي ${value}%` : `خصم ثابت ${value.toFixed(3)} د.ك`,
   avgOrder ? `متوسط الطلب الحالي ${avgOrder.toFixed(3)} د.ك` : 'لا توجد طلبات كافية لقياس متوسط السلة',
   `أقصى تعرض تقديري ${maxExposure.toFixed(3)} د.ك حسب حد الاستخدام`,
   products.length ? `المنيو يحتوي ${products.length} منتجًا؛ راقب المنتجات ضعيفة الهامش` : 'لا توجد منتجات كافية لقراءة أثر الخصم على الأصناف',
  ];
  const action = tone === 'danger'
   ? 'الأفضل إيقاف التفعيل ومراجعة قيمة الخصم أو حد الاستخدام قبل الإطلاق.'
   : tone === 'warning'
    ? 'فعّله فقط إذا كان محدود المدة أو موجّهًا لشريحة محددة، مع متابعة الاستخدام يوميًا.'
    : 'يمكن تفعيله كعرض خفيف، مع مراقبة الخصم الممنوح في سجل الكوبونات.';
  return { verdict, tone, reasons, action, estimatedDiscount, maxExposure, exposureRate };
 };

 const confirmActivationFromCourt = () => {
  if (!activationCourtCoupon || !onUpdateData) return;
  onUpdateData({
   ...data,
   promocodes: coupons.map((c: any) => c.id === activationCourtCoupon.id ? { ...c, isActive: true } : c)
  });
  toast.success('تم تفعيل الكود بعد مراجعة محكمة العروض', { description: activationCourtCoupon.code });
  setActivationCourtCoupon(null);
 };

 const stats = useMemo(() => {
 const totalSales = (data?.invoices || []).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
 return {
 active: coupons.filter(c => c.isActive).length,
 totalRedemptions: coupons.reduce((acc, c) => acc + (c.usedCount || 0), 0),
 totalSavings: coupons.reduce((acc, c) => {
 const discount = (c as any).totalDiscountGiven || 0;
 return acc + discount;
 }, 0),
 totalSystemPoints: Math.floor(totalSales)
 };
 }, [coupons, data.invoices]);

  const analysis = useMemo(() => getCouponProfitGuard(data, newCode.value, newCode.type), [data, newCode.value, newCode.type]);

 const handleCreateCode = () => {
 if (!newCode.code || !newCode.value) {
 toast.error('عبّي كل الحقول المطلوبة');
 return;
 }

 if (analysis?.level === 'danger') {
   toast.error(analysis.suggestion, { duration: 5000, icon: '🛑' });
   return;
 }

 const coupon = {
 id: `coupon-${Date.now()}`,
 code: newCode.code.toUpperCase(),
 discountValue: parseFloat(newCode.value),
 discountType: newCode.type === 'fixed' ? 'fixed' : 'percentage',
 description: newCode.description || `${newCode.type === 'percentage' ? newCode.value + '%' : newCode.value + ' د.ك'} خصم`,
 isActive: true,
 usedCount: 0,
 usageLimit: 100,
 startDate: new Date().toISOString(),
 endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year default
 totalDiscountGiven: 0,
 createdAt: new Date().toISOString()
 };

 if (onUpdateData) {
 onUpdateData({
 ...data,
 promocodes: [...(data.promocodes || []), coupon as any]
 });
 toast.success('تم إنشاء الكود بنجاح!', { description: `الكود ${coupon.code} متاح الآن للاستخدام.` });
 setShowModal(false);
 setNewCode({ code: '', value: '', type: 'percentage', description: '' });
 }
 };

 const handleDeleteCode = (id: string) => {
 if (onUpdateData) {
 onUpdateData({
 ...data,
 promocodes: coupons.filter((c: any) => c.id !== id)
 });
 toast.info('تم حذف الكود');
 setCouponToDelete(null);
 }
 };

 const handleToggleActive = (id: string) => {
 const coupon = coupons.find((c: any) => c.id === id);
 if (!coupon) return;
 if (!coupon.isActive) {
  setActivationCourtCoupon(coupon);
  return;
 }
 if (onUpdateData) {
 onUpdateData({
 ...data,
 promocodes: coupons.map((c: any) => 
 c.id === id ? { ...c, isActive: false } : c
)
 });
 toast.success('تم إيقاف الكود');
 }
 };

 return (
 <div className="space-y-8" dir="rtl">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h2 className="text-xl md:text-3xl font-bold text-slate-800 flex items-center gap-3">
 كوبونات الخصم والترويج <Tag className="text-rose-500" />
 </h2>
 <p className="text-slate-500 font-bold mt-2">إدارة وتتبع رموز الخصم وحملات الترويج الخاصة بمتجرك.</p>
 </div>
 <button 
 onClick={() => setShowModal(true)}
 className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
 >
 <Plus size={20} /> إنشاء كود جديد
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:p-4">
 <div className="bg-white border border-slate-200/60 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
 <Percent size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-bold text-slate-800">{stats.active}</div>
 <div className="text-xs font-bold text-slate-500">كوبونات نشطة</div>
 </div>
 </div>
 <div className="bg-white border border-slate-200/60 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
 <Activity size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-bold text-slate-800">{stats.totalRedemptions}</div>
 <div className="text-xs font-bold text-slate-500">إجمالي الاستخدام</div>
 </div>
 </div>
 <div className="bg-white border border-slate-200/60 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
 <DollarSign size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-bold text-slate-800">{stats.totalSavings.toFixed(3)} د.ك</div>
 <div className="text-xs font-bold text-slate-500">خصومات ممنوحة</div>
 </div>
 </div>
 </div>

 <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-3 md:p-3 text-white shadow-xl relative overflow-hidden">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
 <div className="relative z-10 flex flex-col md:flex-row items-center gap-4 md:p-3">
 <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-lg">
 <Award size={32} />
 </div>
 <div className="flex-1">
 <h3 className="text-xl font-bold mb-2">منطق برنامج الولاء المربوط بالسستم (برنامج ولاء التراث)</h3>
 <p className="text-sm font-bold opacity-90 leading-relaxed text-right">
 يتم احتساب النقاط تلقائياً بناءً على المشتريات الفعلية: <span className="underline decoration-2">كل 1 دينار كويتي مدفوع = 1 نقطة ولاء.</span> 
 هذه النقاط تظهر في ملف العميل وتسمح لك بقياس مدى ارتباط العملاء بعلامتك التجارية وتحويلهم إلى مسوقين لك.
 </p>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 whitespace-nowrap text-center">
 <div className="text-[10px] opacity-80 font-bold mb-1">إجمالي نقاط النظام</div>
 <div className="text-xl font-bold">{stats.totalSystemPoints.toLocaleString('en-GB')}</div>
 </div>
 </div>
 </div>

 <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden">
 <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/50">
 <h3 className="font-bold text-lg text-slate-800">سجل الكوبونات</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-right min-w-[700px]">
 <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
 <tr>
 <th className="p-3 pr-8 text-right">الكود</th>
 <th className="p-3 text-center">الخصم</th>
 <th className="p-3 text-center">الاستخدام</th>
 <th className="p-3 text-center">الحالة</th>
 <th className="p-3 text-left pl-8">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-50">
 {coupons.length > 0 ? coupons.map((c: any) => (
 <tr key={c.id} className="hover:bg-slate-50/50 transition-colors group">
 <td className="p-3 pr-8">
 <div className="flex flex-col text-right">
 <span className="font-bold text-slate-800 text-lg uppercase tracking-wider">{c.code}</span>
 <span className="text-[10px] text-slate-500 font-bold">{c.description || 'بدون وصف'}</span>
 </div>
 </td>
 <td className="p-3 text-center">
 <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg inline-block font-bold">
 {(c.discountType || c.type) === 'percentage' ? `${c.discountValue || c.value}%` : `${Number(c.discountValue || c.value).toFixed(3)} د.ك`}
 </div>
 </td>
 <td className="p-3 text-center font-bold text-slate-600">
 {c.usedCount || 0} / {c.usageLimit || '∞'}
 </td>
 <td className="p-3 text-center">
 <button 
 onClick={() => handleToggleActive(c.id)}
 className={cn(
"inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95",
 c.isActive ?"bg-emerald-50 text-emerald-600 border border-emerald-100" :"bg-slate-100 text-slate-500"
)}
 >
 {c.isActive ? <CheckCircle size={10} /> : <Clock size={10} />}
 {c.isActive ? 'نشط' : 'متوقف'}
 </button>
 </td>
 <td className="p-3 text-left pl-8">
 <button 
 onClick={() => setCouponToDelete(c.id)}
 className="text-slate-300 hover:text-rose-500 transition-colors p-2 rounded-xl group-hover:bg-rose-50 active:scale-90"
 >
 <Trash2 size={18} />
 </button>
 </td>
 </tr>
)) : (
 <tr>
 <td colSpan={5} className="p-3 md:p-4 md:p-3 md:p-4 text-center">
 <Tag size={48} className="mx-auto text-slate-200 mb-4" />
 <p className="text-slate-500 font-bold">ماكو كوبونات حالياً. ابدأ بأول كود!</p>
 </td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>

 <AnimatePresence>
 {showModal && (
 <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-3">
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setShowModal(false)}
 className="absolute inset-0"
 />
 <motion.div 
 initial={{ scale: 0.9, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.9, opacity: 0, y: 20 }}
 className="relative bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden"
 dir="rtl"
 >
 <div className="bg-slate-900 p-3 md:p-3 text-white relative text-right">
 <button onClick={() => setShowModal(false)} className="absolute top-3 md:p-4 left-6 text-slate-500 hover:text-white transition-colors">
 <X size={24} />
 </button>
 <Sparkles className="text-amber-500 mb-4" size={32} />
 <h3 className="text-2xl font-bold">إنشاء كود ترويجي ذكي</h3>
 <p className="text-slate-500 text-sm font-bold mt-1">سيتم فحص الخصم قبل إطلاقه حتى ما يكسر الربح.</p>
 </div>
 <div className="p-3 md:p-3 space-y-6 text-right">
 <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
   <div className="text-[11px] font-black text-amber-700">محرك المناسبات الكويتي · {seasonalMove.tag}</div>
   <div className="mt-1 text-sm font-bold leading-7 text-slate-700">{seasonalMove.text}</div>
 </div>
 <div>
 <label className="block text-xs font-bold text-slate-500 mb-2 mr-1 uppercase">رمز الخصم</label>
 <input 
 type="text" 
 value={newCode.code} 
 onChange={(e) => setNewCode({...newCode, code: e.target.value})}
 placeholder="مثال: RAMADAN2026"
 className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 text-right"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="text-right">
 <label className="block text-xs font-bold text-slate-500 mb-2 mr-1 uppercase">نوع الخصم</label>
 <select 
 value={newCode.type}
 onChange={(e) => setNewCode({...newCode, type: e.target.value as any})}
 className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all text-right"
 >
 <option value="percentage">نسبة مئوية (%)</option>
 <option value="fixed">مبلغ ثابت (د.ك)</option>
 </select>
 </div>
 <div className="text-right">
 <label className="block text-xs font-bold text-slate-500 mb-2 mr-1 uppercase">قيمة الخصم</label>
 <input 
 type="number" 
 value={newCode.value} 
 onChange={(e) => setNewCode({...newCode, value: e.target.value})}
 placeholder="القيمة"
 className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-2xl font-bold text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 text-right"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-bold text-slate-500 mb-2 mr-1 uppercase">وصف الكود</label>
 <textarea 
 value={newCode.description}
 onChange={(e) => setNewCode({...newCode, description: e.target.value})}
 placeholder="وصف بسيط يظهر للعميل..."
 className="w-full bg-slate-50 border border-slate-200/60 p-3 rounded-2xl font-bold text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 min-h-[100px] text-right"
 />
 </div>

  <AnimatePresence>
     {analysis && (
       <motion.div
         initial={{ opacity: 0, height: 0 }}
         animate={{ opacity: 1, height: 'auto' }}
         exit={{ opacity: 0, height: 0 }}
         className={cn(
           "rounded-2xl p-4 border overflow-hidden text-right",
           analysis.level === 'danger' ? "bg-rose-50 border-rose-200" : analysis.level === 'warning' ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"
         )}
       >
         <div className="flex items-center gap-2 mb-2 flex-row-reverse">
           {analysis.level === 'danger' ? <X className="text-rose-500" size={18} /> : analysis.level === 'warning' ? <Activity className="text-amber-500" size={18} /> : <CheckCircle className="text-emerald-500" size={18} />}
           <h4 className={cn("font-bold", analysis.level === 'danger' ? "text-rose-700" : analysis.level === 'warning' ? "text-amber-700" : "text-emerald-700")}>
             {analysis.title}
           </h4>
         </div>
         <p className={cn("text-sm font-bold leading-relaxed", analysis.level === 'danger' ? "text-rose-600" : analysis.level === 'warning' ? "text-amber-600" : "text-emerald-600")}>
           {analysis.suggestion}
         </p>
       </motion.div>
     )}
  </AnimatePresence>

 {newCode.value && (() => {
  const court = buildCouponCourt({ ...newCode, discountValue: Number(newCode.value), discountType: newCode.type });
  return (
   <div className={cn("rounded-3xl border p-4 text-right", court.tone === 'danger' ? 'border-rose-200 bg-rose-50' : court.tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
    <div className="flex items-center justify-between gap-3">
     <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center", court.tone === 'danger' ? 'bg-rose-100 text-rose-600' : court.tone === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600')}>
      <Gavel size={22} />
     </div>
     <div>
      <div className="text-[10px] font-black text-slate-400">محكمة العروض قبل الإطلاق</div>
      <div className={cn("text-lg font-black", court.tone === 'danger' ? 'text-rose-700' : court.tone === 'warning' ? 'text-amber-700' : 'text-emerald-700')}>{court.verdict}</div>
     </div>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-center">
     <div className="rounded-2xl bg-white/70 p-3"><div className="text-[9px] font-black text-slate-400">خصم متوقع للطلب</div><div className="text-sm font-black text-slate-800">{court.estimatedDiscount.toFixed(3)} د.ك</div></div>
     <div className="rounded-2xl bg-white/70 p-3"><div className="text-[9px] font-black text-slate-400">تعرض أقصى</div><div className="text-sm font-black text-slate-800">{court.maxExposure.toFixed(3)} د.ك</div></div>
    </div>
    <p className="mt-3 text-xs font-bold leading-6 text-slate-600">{court.action}</p>
   </div>
  );
 })()}

 <button 
 onClick={handleCreateCode}
 className="w-full bg-slate-900 text-white py-5 rounded-2xl font-bold text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
 >
 إطلاق الكود وتعميمه 🚀
 </button>
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>

 {activationCourtCoupon && (() => {
  const court = buildCouponCourt(activationCourtCoupon);
  return (
   <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[1001] flex items-center justify-center p-3" dir="rtl">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0" onClick={() => setActivationCourtCoupon(null)} />
    <motion.div initial={{ scale: 0.94, opacity: 0, y: 18 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 18 }} className="relative w-full max-w-2xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
     <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-5 text-white text-right">
      <button onClick={() => setActivationCourtCoupon(null)} className="absolute left-5 top-5 rounded-full bg-white/10 p-2 text-white/70 hover:text-white"><X size={18} /></button>
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-[10px] font-black text-amber-100 mb-3"><Scale size={13} /> مراجعة قبل التفعيل</div>
      <h3 className="text-2xl font-black flex items-center justify-end gap-3"><span>محكمة العروض</span><Gavel className="text-amber-300" /></h3>
      <p className="mt-2 text-sm font-bold text-slate-300">لن يتم تفعيل الكوبون إلا بعد هذا الحكم البصري. القراءة من الداتا الحالية فقط.</p>
     </div>
     <div className="p-5 space-y-4 text-right">
      <div className={cn("rounded-3xl border p-4", court.tone === 'danger' ? 'border-rose-200 bg-rose-50' : court.tone === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50')}>
       <div className="flex items-center justify-between gap-4">
        <div className="rounded-2xl bg-white/80 px-4 py-3 text-left ltr:font-mono font-black text-slate-900 uppercase tracking-widest">{activationCourtCoupon.code}</div>
        <div className="text-right">
         <div className="text-[10px] font-black text-slate-400">الحكم</div>
         <div className={cn("text-2xl font-black", court.tone === 'danger' ? 'text-rose-700' : court.tone === 'warning' ? 'text-amber-700' : 'text-emerald-700')}>{court.verdict}</div>
        </div>
       </div>
       <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="rounded-2xl bg-white/70 p-3"><div className="text-[9px] font-black text-slate-400">خصم الطلب المتوقع</div><div className="text-sm font-black text-slate-800">{court.estimatedDiscount.toFixed(3)} د.ك</div></div>
        <div className="rounded-2xl bg-white/70 p-3"><div className="text-[9px] font-black text-slate-400">تعرض أقصى</div><div className="text-sm font-black text-slate-800">{court.maxExposure.toFixed(3)} د.ك</div></div>
        <div className="rounded-2xl bg-white/70 p-3"><div className="text-[9px] font-black text-slate-400">نسبة من المبيعات</div><div className="text-sm font-black text-slate-800">{Math.round(court.exposureRate * 100)}%</div></div>
       </div>
      </div>
      <div className="grid gap-2">
       {court.reasons.map((reason: string) => <div key={reason} className="flex items-start justify-end gap-2 rounded-2xl bg-slate-50 p-3 text-sm font-bold text-slate-600"><span>{reason}</span><ShieldAlert size={15} className="mt-1 text-slate-400" /></div>)}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-7 text-slate-700 flex items-start justify-end gap-2"><span>{court.action}</span>{court.tone === 'danger' ? <AlertTriangle className="mt-1 text-rose-500" size={18} /> : <LockKeyhole className="mt-1 text-emerald-600" size={18} />}</div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
       <button onClick={() => setActivationCourtCoupon(null)} className="flex-1 rounded-2xl border border-slate-200 bg-white py-3 font-black text-slate-600 hover:bg-slate-50">إلغاء</button>
       <button onClick={confirmActivationFromCourt} className={cn("flex-1 rounded-2xl py-3 font-black text-white shadow-lg", court.tone === 'danger' ? 'bg-rose-600 shadow-rose-900/20' : court.tone === 'warning' ? 'bg-amber-600 shadow-amber-900/20' : 'bg-emerald-600 shadow-emerald-900/20')}>تفعيل بعد الحكم</button>
      </div>
     </div>
    </motion.div>
   </div>
  );
 })()}

 {couponToDelete && (
 <ConfirmModal
 title="تأكيد حذف الكود"
 message={`هل أنت متأكد من رغبتك في حذف الكوبون"${coupons.find(c => c.id === couponToDelete)?.code}"؟ لا يمكن التراجع عن هذه الخطوة.`}
 onConfirm={() => handleDeleteCode(couponToDelete)}
 onCancel={() => setCouponToDelete(null)}
 />
)}
 </div>
);
};

export default PromoCodePage;
