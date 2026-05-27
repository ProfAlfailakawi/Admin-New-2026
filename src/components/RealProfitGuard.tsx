import React, { useState, useMemo } from 'react';
import { ShieldAlert, TrendingDown, TrendingUp, Info, AlertTriangle, CheckCircle2, DollarSign, ChevronDown, ChevronUp, Percent } from 'lucide-react';
import { cn, safeFormatCurrency, safeFormatPercent } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { RealProfitInsight } from '../types';

interface RealProfitGuardProps {
 insights?: RealProfitInsight[];
 data?: any;
 filter?: string;
}

const isValidNumber = (val: any): boolean => {
 return val !== null && val !== undefined && typeof val === 'number' && !isNaN(val) && isFinite(val);
};

const normalizeSearchText = (value: any): string => {
 return String(value || '')
   .toLowerCase()
   .replace(/[\u064B-\u065F\u0670]/g, '')
   .replace(/[إأآا]/g, 'ا')
   .replace(/ى/g, 'ي')
   .replace(/ؤ/g, 'و')
   .replace(/ئ/g, 'ي')
   .replace(/ة/g, 'ه')
   .replace(/[\s\-_/]+/g, ' ')
   .trim();
};

const getProductSearchText = (insight: RealProfitInsight, products: any[]): string => {
 const productId = String((insight as any).productId || insight.id || '').replace(/^profit-/, '');
 const relatedProduct = products.find((product: any) => String(product?.id || '') === productId || String(product?.name || '') === String(insight.productName || ''));
 return normalizeSearchText([
   insight.productName,
   (insight as any).productNameAr,
   (insight as any).name,
   (insight as any).title,
   (insight as any).sku,
   (insight as any).category,
   relatedProduct?.name,
   relatedProduct?.title,
   relatedProduct?.nameAr,
   relatedProduct?.sku,
   relatedProduct?.category,
 ].filter(Boolean).join(' '));
};

const InsightRow: React.FC<{ insight: RealProfitInsight, isOpen: boolean, onToggle: () => void }> = ({ insight, isOpen, onToggle }) => {
 // Strict Validation logic
 const isRevenueValid = isValidNumber(insight.revenue);
 const isRealProfitValid = isValidNumber(insight.realProfitValue);
 const isHiddenCostsValid = isValidNumber(insight.hiddenCostsRatio);
 const isRawProfitValid = isValidNumber(insight.rawProfit);

 const areCalculationsBroken = !isRevenueValid || !isRealProfitValid || !isHiddenCostsValid || !isRawProfitValid;

 if (areCalculationsBroken) {
 return (
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between flex-row-reverse w-full opacity-60">
 <div className="flex items-center gap-3">
 <Info className="text-slate-500" size={16} />
 <h4 className="font-bold text-sm md:text-base text-slate-500">{insight.productName}</h4>
 </div>
 <div className="flex flex-col text-right">
 <span className="text-xs font-bold text-slate-500">لا توجد بيانات كافية للتحليل</span>
 </div>
 </div>
);
 }

 return (
 <motion.div
 className={cn(
"bg-white rounded-2xl border hover:shadow-lg transition-all relative overflow-hidden",
 insight.riskLevel === 'high' ? 'border-rose-200' : insight.riskLevel === 'medium' ? 'border-amber-200' : 'border-[#f0e6d2]'
)}
 >
 <div 
 onClick={onToggle}
 className="p-3 md:p-4 cursor-pointer flex items-center justify-between flex-row-reverse w-full"
 >
 <div className="flex items-center gap-3">
 {insight.riskLevel === 'high' && <AlertTriangle className="text-rose-500" size={16} />}
 {insight.riskLevel === 'medium' && <Info className="text-amber-500" size={16} />}
 {insight.riskLevel === 'low' && <CheckCircle2 className="text-emerald-500" size={16} />}
 <h4 className="font-bold text-sm md:text-base text-slate-800">{insight.productName}</h4>
 </div>
 <div className="flex items-center gap-4">
 <span className={cn(
"text-[10px] md:text-[11px] font-bold uppercase tracking-tighter sm:block hidden",
 insight.riskLevel === 'high' ? 'text-rose-600' : insight.riskLevel === 'medium' ? 'text-amber-600' : 'text-emerald-600'
)}>
 {insight.riskLevel === 'high' ? 'خطورة عالية' : insight.riskLevel === 'medium' ? 'تآكل هوامش' : 'أداء مستقر'}
 </span>
 <span className={cn(
"text-sm font-bold", 
 insight.realProfitValue < 0 ? 'text-rose-500' : insight.riskLevel === 'high' ? 'text-amber-500' : 'text-emerald-500'
)}>
 {safeFormatCurrency(insight.realProfitValue)} د.ك
 </span>
 {isOpen ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
 </div>
 </div>

 <AnimatePresence>
 {isOpen && (
 <motion.div
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="px-6 pb-6"
 >
 <div className="pt-4 border-t border-slate-100 flex flex-col lg:flex-row-reverse gap-3 md:p-4">
 <div className="flex-1 text-right">
 <p className="text-xs md:text-sm font-bold text-slate-600 leading-relaxed mb-4">
 {insight.explanation}
 </p>
 <div className="bg-[#fdfbf7] p-3 rounded-xl border border-[#f0e6d2]">
 <h5 className="text-indigo-600 font-bold text-[10px] uppercase mb-1 flex items-center gap-2 justify-end">💡 توصية التصحيح</h5>
 <p className="text-xs font-bold text-slate-700 italic">"{insight.recommendation}"</p>
 </div>
 </div>
 <div className="w-full lg:w-96 flex flex-col gap-3">
 <div className="grid grid-cols-3 gap-2 text-right">
 <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
 <span className="text-[10px] font-bold text-slate-500 block">الإيراد</span>
 <span className="text-sm font-bold text-slate-700">{safeFormatCurrency(insight.revenue)} د.ك</span>
 </div>
 <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
 <span className="text-[10px] font-bold text-indigo-400 block">الربح الظاهري</span>
 <span className="text-sm font-bold text-indigo-700">{safeFormatCurrency(insight.rawProfit)} د.ك</span>
 </div>
 <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100">
 <span className="text-[10px] font-bold text-rose-400 block">تكاليف خفية</span>
 <span className="text-sm font-bold text-rose-600">{safeFormatPercent(insight.hiddenCostsRatio)}</span>
 </div>
 </div>
 <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 flex justify-between items-center flex-row-reverse">
 <span className="text-[10px] font-bold text-slate-500">الربح الحقيقي الصافي</span>
 <span className={cn("text-sm font-bold", insight.realProfitValue < 0 ? 'text-rose-400' : 'text-emerald-400')}>
 {safeFormatCurrency(insight.realProfitValue)} د.ك
 </span>
 </div>
 </div>
 </div>
 </motion.div>
)}
 </AnimatePresence>
 </motion.div>
);
};

export const RealProfitGuard: React.FC<RealProfitGuardProps> = ({ insights, data, filter }) => {
 const [activeInsightId, setActiveInsightId] = useState<string | null>(null);

 const computedInsights = useMemo<RealProfitInsight[]>(() => {
   if (Array.isArray(insights) && insights.length) return insights;
   const safeData = data || {};
   const products = Array.isArray(safeData.products) ? safeData.products : [];
   const sales = [...(Array.isArray(safeData.invoices) ? safeData.invoices : []), ...(Array.isArray(safeData.orders) ? safeData.orders : [])];
   return products.slice(0, 24).map((product: any, index: number) => {
     const productId = String(product?.id || '');
     const productName = String(product?.name || product?.title || `منتج ${index + 1}`);
     let quantity = 0;
     let revenue = 0;
     sales.forEach((sale: any) => {
       const items = Array.isArray(sale?.items) ? sale.items : Array.isArray(sale?.products) ? sale.products : [];
       items.forEach((item: any) => {
         const same = String(item?.productId || item?.id || '') === productId || String(item?.name || item?.productName || '') === productName;
         if (!same) return;
         const q = Number(item?.quantity || 1) || 1;
         quantity += q;
         revenue += (Number(item?.price || product?.price || 0) || 0) * q;
       });
     });
     const price = Number(product?.price || product?.basePrice || 0) || 0;
     const cost = Number(product?.cost || product?.unitCost || price * 0.55) || 0;
     if (!revenue && price) revenue = price * Math.max(1, quantity);
     const rawProfit = Math.max(0, revenue - cost * Math.max(1, quantity));
     const hiddenCostsRatio = revenue > 0 ? Math.min(0.35, Math.max(0.04, Number(product?.wasteRate || product?.hiddenCostsRatio || 0.08))) : 0.08;
     const realProfitValue = rawProfit - revenue * hiddenCostsRatio;
     const margin = revenue > 0 ? realProfitValue / revenue : 0;
     const riskLevel = margin < 0.1 ? 'high' : margin < 0.22 ? 'medium' : 'low';
     return {
       id: productId || `profit-${index}`,
       productName,
       revenue,
       rawProfit,
       hiddenCostsRatio,
       realProfitValue,
       riskLevel,
       explanation: quantity > 0 ? 'تم احتساب الربح الحقيقي من المبيعات والتكلفة والتسربات التشغيلية.' : 'لا توجد مبيعات كافية لهذا المنتج، لذلك يظهر كتقدير احتياطي آمن.',
       recommendation: riskLevel === 'high' ? 'راجع تكلفة المنتج أو سعره قبل أي حملة جديدة.' : riskLevel === 'medium' ? 'حسّن الهامش أو قلل الهدر التشغيلي.' : 'الهامش مستقر، استمر بمتابعته.'
     } as RealProfitInsight;
   }).filter((x: any) => x.productName);
 }, [insights, data]);

 if (!computedInsights || computedInsights.length === 0) {
 return (
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-[#f0e6d2] text-center shadow-sm">
 <DollarSign className="mx-auto text-[#d4c098] opacity-20 mb-4" size={48} />
 <p className="text-slate-500 font-bold text-sm">لا توجد بيانات كافية للتحليل حالياً.</p>
 </div>
);
 }

 const validInsights = computedInsights.filter((insight) => {
 const isRevenueValid = isValidNumber(insight.revenue);
 const isRealProfitValid = isValidNumber(insight.realProfitValue);
 const isHiddenCostsValid = isValidNumber(insight.hiddenCostsRatio);
 const isRawProfitValid = isValidNumber(insight.rawProfit);
 return isRevenueValid && isRealProfitValid && isHiddenCostsValid && isRawProfitValid;
 });

 const productsForSearch = Array.isArray(data?.products) ? data.products : [];
 const normalizedFilter = normalizeSearchText(filter);
 const filterParts = normalizedFilter.split(' ').filter(Boolean);
 const filteredInsights = normalizedFilter
 ? validInsights.filter((insight) => {
   const searchableText = getProductSearchText(insight, productsForSearch);
   return filterParts.every((part) => searchableText.includes(part));
 })
 : validInsights;

 if (validInsights.length === 0) {
 return (
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-[#f0e6d2] text-center shadow-sm">
 <AlertTriangle className="mx-auto text-amber-300 opacity-50 mb-4" size={48} />
 <p className="text-slate-500 font-bold text-sm">لا توجد بيانات كافية للتحليل. الرجاء التأكد من أسعار المنتجات وتكاليفها.</p>
 </div>
);
 }

 return (
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row justify-between items-center bg-slate-950 p-3 md:p-4 rounded-2xl border border-amber-500/20 shadow-xl flex-row-reverse gap-4 relative overflow-hidden">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(245,158,11,0.1)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
 <div className="text-right relative z-10">
 <h3 className="font-bold text-xl text-white">حارس الأرباح الحقيقية</h3>
 <p className="text-amber-400 text-[10px] font-bold mt-1">True Profitability Guard 🛡️</p>
 </div>
 <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/30 relative z-10">
 <CheckCircle2 className="text-emerald-400" size={14} />
 <span className="text-[10px] font-bold text-emerald-300 uppercase">تحديث لحظي</span>
 </div>
 </div>

 <div className="flex justify-between items-center px-1 text-[10px] font-bold text-slate-500 uppercase">
 <span>{filteredInsights.length} منتج متاح للتحليل</span>
 <span>قائمة المنتجات</span>
 </div>

 <div className="overflow-y-auto grid grid-cols-1 gap-3 pl-2 custom-scrollbar" style={{ maxHeight: '332px' }}>
 {filteredInsights.length === 0 && (
 <div className="bg-white p-4 rounded-2xl border border-[#f0e6d2] text-center shadow-sm">
 <p className="text-slate-500 font-bold text-sm">لا توجد منتجات مطابقة للبحث.</p>
 </div>
 )}
 {filteredInsights.slice(0, 50).map((insight) => (
 <InsightRow key={insight.id} insight={insight} isOpen={activeInsightId === insight.id} onToggle={() => setActiveInsightId(activeInsightId === insight.id ? null : insight.id)} />
))}
 </div>
 </div>
);
};
export default RealProfitGuard;
