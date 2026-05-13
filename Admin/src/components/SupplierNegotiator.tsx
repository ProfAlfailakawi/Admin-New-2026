import React, { useState } from 'react';
import { Briefcase, TrendingUp, TrendingDown, Minus, Handshake, AlertTriangle, ShieldCheck, FileText, ArrowLeftRight, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { SupplierNegotiationInsight } from '../types';

interface SupplierNegotiatorProps {
 insights: SupplierNegotiationInsight[];
}

export const SupplierNegotiator: React.FC<SupplierNegotiatorProps> = ({ insights }) => {
 const [currentPage, setCurrentPage] = useState(0);
 const itemsPerPage = 2;
 const totalPages = Math.ceil(insights.length / itemsPerPage);

 const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
 const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 0));

 if (insights.length === 0) {
 return (
 <div className="bg-white p-3 md:p-4 md:p-3 md:p-4 rounded-3xl md:rounded-2xl border border-[#f0e6d2] text-center shadow-sm">
 <Handshake className="mx-auto text-[#d4c098] opacity-20 mb-4" size={48} />
 <p className="text-slate-400 font-black text-sm">لا توجد ثغرات أو فرص تفاوض مع الموردين حالياً.</p>
 </div>
);
 }

 const currentInsights = insights.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

 return (
 <div className="space-y-6 md:space-y-8">
 <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-[#f0e6d2] shadow-sm flex-row-reverse gap-4">
 <div className="text-right">
 <h3 className="font-black text-xl md:text-2xl text-slate-800">ذكاء مفاوضات الموردين</h3>
 <p className="text-slate-400 text-[10px] font-bold mt-1">AI Supplier Negotiation Intel 🤝</p>
 </div>
 <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
 <ShieldCheck className="text-indigo-500" size={14} />
 <span className="text-[9px] md:text-[10px] font-black text-indigo-700 uppercase">تحليل الأسعار مفعّل</span>
 </div>
 </div>

 <div className="flex items-center gap-4">
 <button onClick={prevPage} disabled={currentPage === 0} className="p-2 rounded-full bg-indigo-100 text-indigo-600 disabled:opacity-30 transition-all hover:scale-110 active:scale-95">
 <ChevronRight size={24} />
 </button>

 <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 md:p-4">
 <AnimatePresence mode="wait">
 {currentInsights.map((insight, index) => (
 <motion.div
 key={insight.id + currentPage}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 exit={{ opacity: 0, x: -20 }}
 className={cn(
"bg-white rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-3 border hover:shadow-xl transition-all relative overflow-hidden group flex flex-col justify-between",
 insight.riskLevel === 'high' ? 'border-rose-200' : 'border-amber-200'
)}
 >
 {/* Background Accent */}
 <div className={cn(
"absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-10 rounded-full -mr-16 -mt-16 pointer-events-none",
 insight.riskLevel === 'high' ? 'bg-rose-500' : 'bg-amber-500'
)} />

 <div className="relative z-10 flex flex-col gap-5 md:gap-3 md:p-4 h-full">
 <div className="flex justify-between items-start flex-row-reverse">
 <div className="text-right">
 <div className="flex items-center justify-end gap-2 mb-1">
 {insight.riskLevel === 'high' && <AlertTriangle className="text-rose-500" size={14} />}
 <span className={cn("text-[8px] md:text-[9px] font-black uppercase inline-block px-2 py-0.5 rounded-full border", insight.riskLevel === 'high' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
 {insight.isUnfairPricing ? 'تسعير غير عادل' : 'ارتفاع تكلفة مستمر'}
 </span>
 </div>
 <h4 className="font-black text-lg md:text-xl text-slate-800">{insight.supplierName}</h4>
 <p className="text-[10px] md:text-xs font-bold text-slate-400 mt-1">صنف: {insight.productName}</p>
 </div>
 
 <div className={cn("flex flex-col items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl border", insight.pricingTrend === 'increasing' ? 'bg-rose-50 text-rose-500 border-rose-100' : insight.pricingTrend === 'decreasing' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-slate-50 text-slate-500 border-slate-100')}>
 {insight.pricingTrend === 'increasing' ? <TrendingUp size={18} /> : insight.pricingTrend === 'decreasing' ? <TrendingDown size={18} /> : <Minus size={18} />}
 </div>
 </div>

 <div className="bg-slate-50 p-3 md:p-4 rounded-2xl border border-slate-100 text-right">
 <h5 className="text-[9px] md:text-[10px] font-black text-slate-400 mb-2 flex items-center justify-end gap-2"><FileText size={12}/> تحليل البيانات</h5>
 <p className="text-xs md:text-sm font-bold text-slate-700 leading-relaxed">{insight.explanation}</p>
 </div>

 <div className="flex items-center justify-between bg-white border border-[#f0e6d2] p-3 rounded-xl flex-row-reverse gap-2">
 <div className="text-right">
 <span className="text-[9px] font-black text-slate-400 block mb-1">التكلفة الحالية</span>
 <span className="text-base md:text-lg font-black text-rose-500">{Number(insight.currentCost || 0).toFixed(3)} د.ك</span>
 </div>
 <ArrowLeftRight className="text-slate-300" size={14} />
 <div className="text-right">
 <span className="text-[9px] font-black text-emerald-600 block mb-1">السعر العادل المقدر</span>
 <span className="text-base md:text-lg font-black text-emerald-600">{Number(insight.fairPriceEstimate || 0).toFixed(3)} د.ك</span>
 </div>
 </div>

 <div className="mt-auto pt-4">
 <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-2xl relative">
 <div className="absolute top-0 right-0 w-1 h-full bg-indigo-500 rounded-r-2xl" />
 <h5 className="text-indigo-800 font-black text-[10px] mb-2 flex items-center justify-end gap-2"><Handshake size={14}/> تكتيك التفاوض المقترح</h5>
 <p className="text-xs md:text-sm font-black text-indigo-900 leading-relaxed text-right">"{insight.negotiationApproach}"</p>
 </div>
 </div>
 </div>
 </motion.div>
))}
 </AnimatePresence>
 </div>

 <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="p-2 rounded-full bg-indigo-100 text-indigo-600 disabled:opacity-30 transition-all hover:scale-110 active:scale-95">
 <ChevronLeft size={24} />
 </button>
 </div>
 
 <div className="text-center text-xs font-black text-slate-400">
 صفحة {currentPage + 1} من {totalPages}
 </div>
 </div>
);
};
