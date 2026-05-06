import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Tag, Plus, Trash2, CheckCircle, Clock, Percent, DollarSign, Activity, X, Sparkles, Award } from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

import ConfirmModal from './ui/ConfirmModal';

export const PromoCodePage: React.FC<{ data: AppState; onUpdateData?: (data: AppState) => void }> = ({ data, onUpdateData }) => {
 const coupons = data?.promocodes || [];
 const [showModal, setShowModal] = useState(false);
 const [couponToDelete, setCouponToDelete] = useState<string | null>(null);
 const [newCode, setNewCode] = useState({ code: '', value: '', type: 'percentage' as 'percentage' | 'fixed', description: '' });

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

 const handleCreateCode = () => {
 if (!newCode.code || !newCode.value) {
 toast.error('يرجى ملء جميع الحقول المطلوبة');
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
 if (onUpdateData) {
 onUpdateData({
 ...data,
 promocodes: coupons.map((c: any) => 
 c.id === id ? { ...c, isActive: !c.isActive } : c
)
 });
 const coupon = coupons.find((c: any) => c.id === id);
 toast.success(coupon?.isActive ? 'تم إيقاف الكود' : 'تم تفعيل الكود');
 }
 };

 return (
 <div className="space-y-8" dir="rtl">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
 <div>
 <h2 className="text-xl md:text-3xl font-black text-slate-800 flex items-center gap-3">
 كوبونات الخصم والترويج <Tag className="text-rose-500" />
 </h2>
 <p className="text-slate-500 font-bold mt-2">إدارة وتتبع رموز الخصم وحملات الترويج الخاصة بمتجرك.</p>
 </div>
 <button 
 onClick={() => setShowModal(true)}
 className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/20"
 >
 <Plus size={20} /> إنشاء كود جديد
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:p-4">
 <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500">
 <Percent size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-black text-slate-800">{stats.active}</div>
 <div className="text-xs font-black text-slate-400">كوبونات نشطة</div>
 </div>
 </div>
 <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
 <Activity size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-black text-slate-800">{stats.totalRedemptions}</div>
 <div className="text-xs font-black text-slate-400">إجمالي الاستخدام</div>
 </div>
 </div>
 <div className="bg-white border border-slate-200 p-3 md:p-4 rounded-2xl shadow-sm flex items-center gap-4">
 <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
 <DollarSign size={24} />
 </div>
 <div className="text-right">
 <div className="text-2xl font-black text-slate-800">{stats.totalSavings.toFixed(3)} د.ك</div>
 <div className="text-xs font-black text-slate-400">خصومات ممنوحة</div>
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
 <h3 className="text-xl font-black mb-2">منطق برنامج الولاء المربوط بالسستم (برنامج ولاء التراث)</h3>
 <p className="text-sm font-bold opacity-90 leading-relaxed text-right">
 يتم احتساب النقاط تلقائياً بناءً على المشتريات الفعلية: <span className="underline decoration-2">كل 1 دينار كويتي مدفوع = 1 نقطة ولاء.</span> 
 هذه النقاط تظهر في ملف العميل وتسمح لك بقياس مدى ارتباط العملاء بعلامتك التجارية وتحويلهم إلى مسوقين لك.
 </p>
 </div>
 <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/20 whitespace-nowrap text-center">
 <div className="text-[10px] opacity-80 font-black mb-1">إجمالي نقاط النظام</div>
 <div className="text-xl font-black">{stats.totalSystemPoints.toLocaleString()}</div>
 </div>
 </div>
 </div>

 <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
 <div className="p-3 md:p-4 border-b border-slate-100 bg-slate-50/50">
 <h3 className="font-black text-lg text-slate-800">سجل الكوبونات</h3>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-right">
 <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase">
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
 <span className="font-black text-slate-800 text-lg uppercase tracking-wider">{c.code}</span>
 <span className="text-[10px] text-slate-400 font-bold">{c.description || 'بدون وصف'}</span>
 </div>
 </td>
 <td className="p-3 text-center">
 <div className="px-3 py-1 bg-rose-50 text-rose-600 rounded-lg inline-block font-black">
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
"inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black transition-all hover:scale-105 active:scale-95",
 c.isActive ?"bg-emerald-50 text-emerald-600 border border-emerald-100" :"bg-slate-100 text-slate-400"
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
 <p className="text-slate-400 font-bold">لا توجد كوبونات حالياً. ابدأ بإنشاء أول كود!</p>
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
 className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
 dir="rtl"
 >
 <div className="bg-slate-900 p-3 md:p-3 text-white relative text-right">
 <button onClick={() => setShowModal(false)} className="absolute top-3 md:p-4 left-6 text-slate-400 hover:text-white transition-colors">
 <X size={24} />
 </button>
 <Sparkles className="text-amber-500 mb-4" size={32} />
 <h3 className="text-2xl font-black">إنشاء كود ترويجي ذكي</h3>
 <p className="text-slate-400 text-sm font-bold mt-1">سيتم ربط هذا الكود تلقائياً بكافة أنظمة التتبع.</p>
 </div>
 <div className="p-3 md:p-3 space-y-6 text-right">
 <div>
 <label className="block text-xs font-black text-slate-400 mb-2 mr-1 uppercase">رمز الخصم</label>
 <input 
 type="text" 
 value={newCode.code} 
 onChange={(e) => setNewCode({...newCode, code: e.target.value})}
 placeholder="مثال: RAMADAN2026"
 className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-black text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 text-right"
 />
 </div>
 <div className="grid grid-cols-2 gap-4">
 <div className="text-right">
 <label className="block text-xs font-black text-slate-400 mb-2 mr-1 uppercase">نوع الخصم</label>
 <select 
 value={newCode.type}
 onChange={(e) => setNewCode({...newCode, type: e.target.value as any})}
 className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-black text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all text-right"
 >
 <option value="percentage">نسبة مئوية (%)</option>
 <option value="fixed">مبلغ ثابت (د.ك)</option>
 </select>
 </div>
 <div className="text-right">
 <label className="block text-xs font-black text-slate-400 mb-2 mr-1 uppercase">قيمة الخصم</label>
 <input 
 type="number" 
 value={newCode.value} 
 onChange={(e) => setNewCode({...newCode, value: e.target.value})}
 placeholder="القيمة"
 className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-black text-slate-800 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 text-right"
 />
 </div>
 </div>
 <div>
 <label className="block text-xs font-black text-slate-400 mb-2 mr-1 uppercase">وصف الكود</label>
 <textarea 
 value={newCode.description}
 onChange={(e) => setNewCode({...newCode, description: e.target.value})}
 placeholder="وصف بسيط يظهر للعميل..."
 className="w-full bg-slate-50 border border-slate-200 p-3 rounded-2xl font-black text-slate-700 focus:ring-2 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-300 min-h-[100px] text-right"
 />
 </div>
 <button 
 onClick={handleCreateCode}
 className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-lg hover:bg-slate-800 active:scale-[0.98] transition-all shadow-xl shadow-slate-900/20"
 >
 إطلاق الكود وتعميمه 🚀
 </button>
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>

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
