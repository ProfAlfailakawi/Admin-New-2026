import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Tag, Calculator, Percent, Sparkles, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { Product } from '../types';
import { cn } from '../lib/utils';

interface SmartOfferModalProps {
 product: Product | null;
 isOpen: boolean;
 onClose: () => void;
}

export const SmartOfferModal: React.FC<SmartOfferModalProps> = ({ product, isOpen, onClose }) => {
 const [discountPercent, setDiscountPercent] = useState<number>(15);

 const offerPrice = useMemo(() => {
 if (!product) return 0;
 return product.price * (1 - (discountPercent / 100));
 }, [product, discountPercent]);

 const currentMargin = useMemo(() => {
 if (!product || product.price === 0) return 0;
 return ((product.price - (product.cost || 0)) / product.price) * 100;
 }, [product]);

 const newMargin = useMemo(() => {
 if (!product || offerPrice === 0) return 0;
 return ((offerPrice - (product.cost || 0)) / offerPrice) * 100;
 }, [product, offerPrice]);

 const targetSalesMultiplier = useMemo(() => {
 if (!product) return Infinity;
 const oldProfit = product.price - (product.cost || 0);
 const newProfit = offerPrice - (product.cost || 0);
 if (newProfit <= 0) return Infinity;
 return oldProfit / newProfit;
 }, [product, offerPrice]);

 if (!isOpen || !product) return null;

 const isLosingMoney = newMargin <= 0;
 const isRisky = newMargin > 0 && newMargin < 20;
 const isSafe = newMargin >= 20;

 return (
 <AnimatePresence>
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4" dir="rtl">
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
 onClick={onClose}
 />
 
 <motion.div 
 initial={{ scale: 0.95, opacity: 0, y: 20 }}
 animate={{ scale: 1, opacity: 1, y: 0 }}
 exit={{ scale: 0.95, opacity: 0, y: 20 }}
 className="bg-white rounded-2xl shadow-xl relative z-10 w-full max-w-[95%] md:w-full md:max-w-2xl overflow-hidden flex flex-col max-h-[90dvh]"
 >
 {/* Header */}
 <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-3 md:p-4 md:p-3 flex items-center justify-between text-white relative shrink-0">
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
 <div className="relative z-10 text-right">
 <h2 className="text-xl md:text-2xl font-bold flex items-center gap-3 justify-end leading-none">
 مستشار الخصومات الذكي
 <Tag size={24} className="shrink-0" />
 </h2>
 <p className="font-bold text-amber-100 mt-1 text-[10px] md:text-xs">
 محاكاة خصم للمنتج: {product.name}
 </p>
 </div>
 <button onClick={onClose} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors relative z-10">
 <X size={20} />
 </button>
 </div>

 <div className="p-3 md:p-4 overflow-y-auto custom-scrollbar flex-1 min-h-0 flex flex-col gap-5">
 
 {/* Slider Section */}
 <div className="bg-slate-50 p-3 md:p-3 rounded-2xl border border-slate-100 shrink-0">
 <div className="flex justify-between items-center mb-4">
 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
 <Percent className="text-amber-500" size={18} />
 نسبة الخصم المقترحة
 </h3>
 <span className="text-2xl md:text-3xl font-bold text-amber-500 drop-shadow-sm">{discountPercent}%</span>
 </div>
 
 <div className="relative pt-6 pb-2 mb-1">
 <input 
 type="range" 
 min="0" 
 max="70" 
 step="5"
 value={discountPercent} 
 onChange={(e) => setDiscountPercent(Number(e.target.value))}
 className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
 />
 <div className="absolute top-0 left-0 right-0 flex justify-between px-1 pointer-events-none">
 <div className="flex-1 flex justify-center mt-[-22px]">
 <span className="bg-slate-900 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-lg" style={{ marginLeft: `calc(${discountPercent}% - 50%)` }}>
 خصم {discountPercent}%
 </span>
 </div>
 </div>
 </div>
 <div className="flex justify-between text-[10px] font-bold text-slate-500">
 <span>0%</span>
 <span>تصفية (70%)</span>
 </div>
 </div>

 {/* Impact Analysis */}
 <div className="grid grid-cols-2 gap-3 shrink-0">
 <div className="bg-white border border-slate-200/60 p-3 rounded-2xl relative overflow-hidden">
 <h4 className="text-[10px] font-bold uppercase text-slate-500 mb-1">السعر بعد الخصم</h4>
 <div className="text-2xl font-bold text-slate-800 leading-tight">{offerPrice.toFixed(3)} <span className="text-[10px]">د.ك</span></div>
 <div className="text-[10px] font-bold text-slate-500 mt-0.5 line-through decoration-rose-500/30">كان: {product.price.toFixed(3)}</div>
 <DollarSign className="absolute -top-1 -left-1 text-slate-50" size={40} />
 </div>
 
 <div className={cn(
"border p-3 rounded-2xl relative overflow-hidden",
 isSafe ?"bg-emerald-50/50 border-emerald-100" : 
 isRisky ?"bg-amber-50/50 border-amber-100" : 
"bg-rose-50/50 border-rose-100"
)}>
 <h4 className={cn("text-[10px] font-bold uppercase mb-1", isSafe ?"text-emerald-600" : isRisky ?"text-amber-600" :"text-rose-600")}>هامش الربح</h4>
 <div className={cn("text-2xl font-bold leading-tight", isSafe ?"text-emerald-700" : isRisky ?"text-amber-700" :"text-rose-700")}>
 {newMargin.toFixed(1)}%
 </div>
 <div className={cn("text-[10px] font-bold mt-0.5", isSafe ?"text-emerald-600/70" : isRisky ?"text-amber-600/70" :"text-rose-600/70")}>السابق: {currentMargin.toFixed(1)}%</div>
 </div>
 </div>

 {/* Smart Advisory */}
 {isLosingMoney ? (
 <div className="bg-rose-50 border border-rose-200 p-3 md:p-3 rounded-2xl flex gap-3 items-start shrink-0">
 <div className="p-3 bg-rose-100 rounded-xl text-rose-600 shrink-0"><AlertTriangle size={24} /></div>
 <div>
 <h4 className="font-bold text-rose-800 text-lg mb-2">تحذير! خسارة محققة 🚨</h4>
 <p className="text-sm text-rose-700 font-bold leading-relaxed">
 السعر أقل من التكلفة ({Number(product.cost || 0).toFixed(3)} د.ك). لا تقم بهذا الخصم إلا للتصفية الشاملة.
 </p>
 </div>
 </div>
) : (
 <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-3 rounded-2xl flex gap-3 items-start relative overflow-hidden shrink-0">
 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
 <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600 shrink-0 relative z-10"><Sparkles size={24} /></div>
 <div className="relative z-10">
 <h4 className="font-bold text-indigo-800 text-lg mb-2">تحدي المبيعات لتعويض الخصم 🎯</h4>
 {discountPercent === 0 ? (
 <p className="text-sm text-indigo-700 font-bold leading-relaxed">قم بتعديل مؤشر الخصم لتحليل الأثر على مبيعاتك المطلوبة.</p>
) : (
 <p className="text-sm text-indigo-700 font-bold leading-relaxed">
 لكي تحافظ على نفس إجمالي الأرباح السابقة (التي كنت تحققها بدون خصم)، يجب أن تزيد حجم مبيعاتك من هذا الصنف بنسبة <span className="text-lg font-bold bg-white px-2 py-0.5 rounded text-indigo-600 shadow-sm mx-1">{Math.ceil((targetSalesMultiplier - 1) * 100)}%</span> لتغطية تأثير نزول السعر.
 </p>
)}
 </div>
 </div>
)}

 </div>
 
 <div className="p-3 shrink-0 mt-auto border-t border-slate-50 bg-white">
 <button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-2xl font-bold shadow-xl active:scale-95 transition-all text-base leading-none">
 فهمت، شكراً
 </button>
 </div>
 </motion.div>
 </div>
 </AnimatePresence>
);
};
