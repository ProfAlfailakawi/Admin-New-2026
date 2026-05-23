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
      <div className="bg-white p-8 rounded-[40px] border border-slate-200 text-center shadow-sm">
        <Handshake className="mx-auto text-slate-200 mb-6" size={64} />
        <p className="text-slate-500 font-bold text-lg">لا توجد ثغرات أو فرص تفاوض مع الموردين حالياً.</p>
      </div>
    );
  }

  const currentInsights = insights.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

  return (
  <div className="space-y-5 md:space-y-7 w-full max-w-full overflow-hidden" dir="rtl">
    <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-4 md:p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
      <div className="text-right">
        <h3 className="font-black text-xl sm:text-2xl md:text-3xl text-slate-800 tracking-tight leading-tight">ذكاء مفاوضات الموردين</h3>
        <p className="text-slate-500 text-xs md:text-sm font-bold mt-1 opacity-70">AI Supplier Negotiation Intel 🤝</p>
      </div>
      <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-2xl border border-indigo-500/20 shadow-sm">
        <ShieldCheck className="text-indigo-600" size={20} />
        <span className="text-[11px] md:text-xs font-black text-indigo-700 uppercase tracking-wide">تحليل الأسعار مفعّل</span>
      </div>
    </div>

      <div className="flex items-center gap-2 md:gap-4 w-full">
        <button onClick={prevPage} disabled={currentPage === 0} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-indigo-100 text-indigo-600 disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-sm md:shadow-lg shadow-indigo-200/50 shrink-0">
          <ChevronRight size={22} />
        </button>

        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-5 min-w-0">
          <AnimatePresence mode="wait">
            {currentInsights.map((insight, index) => (
              <motion.div
                key={insight.id + currentPage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white rounded-3xl p-2 border hover:shadow-xl transition-all duration-500 relative overflow-hidden group flex flex-col justify-between min-h-[360px] md:min-h-[420px]",
                  insight.riskLevel === 'high' ? 'border-rose-100' : 'border-amber-100 shadow-xl shadow-amber-500/5'
                )}
              >
                {/* Vertical Accent Bar */}
                <div className={cn(
                  "absolute top-0 bottom-0 left-0 w-1.5 md:w-2 rounded-full my-5",
                  insight.riskLevel === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                )} />

                {/* Top Corner Icon (Requested "! or something top left") */}
                <div className="absolute top-4 left-4 z-20">
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center rotate-12 transition-transform duration-500 group-hover:rotate-0",
                    insight.riskLevel === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    <AlertTriangle size={18} strokeWidth={3} />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-4 p-4 md:p-5 h-full">
                  {/* Styled Header (from screenshot) */}
                  <div className={cn(
                    "w-full p-4 md:p-5 rounded-3xl text-center mb-1",
                    insight.riskLevel === 'high' ? 'bg-rose-50/80' : 'bg-amber-50/80'
                  )}>
                    <h4 className={cn(
                      "font-black text-xl md:text-2xl text-center leading-snug",
                      insight.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-700'
                    )}>
                      {insight.supplierName}
                    </h4>
                  </div>

                  {/* Main Message (from screenshot style "يبيعه أرخص !") */}
                  <div className="flex-1 flex flex-col items-center justify-center py-2 text-center">
                    <p className="text-2xl md:text-3xl font-black text-slate-800 leading-tight mb-2 flex items-center gap-2">
                      {insight.isUnfairPricing ? 'يبيعه أغلى !' : 'يبيعه أرخص !'}
                    </p>
                    <p className="text-sm md:text-base font-bold text-slate-500 max-w-[260px] leading-relaxed">
                      بناءً على تحليل ذكاء الأعمال للصنف: <span className="text-slate-800">{insight.productName}</span>
                    </p>
                  </div>

                  {/* Pricing Footer (from screenshot style bubble) */}
                  <div className={cn(
                    "w-full py-4 px-5 rounded-3xl flex items-center justify-center gap-2",
                    insight.riskLevel === 'high' ? 'bg-rose-50' : 'bg-emerald-50'
                  )}>
                    <span className={cn(
                      "text-2xl md:text-3xl font-black tabular-nums",
                      insight.riskLevel === 'high' ? 'text-rose-600' : 'text-emerald-600'
                    )}>
                      {Number(insight.fairPriceEstimate || 0).toFixed(3)}
                    </span>
                    <span className={cn(
                      "text-sm md:text-base font-black",
                      insight.riskLevel === 'high' ? 'text-rose-400' : 'text-emerald-500'
                    )}>
                      د.ك
                    </span>
                  </div>

                  {/* Negotiation Approach Section */}
                  <div className="w-full mt-2">
                    <div className="bg-slate-900 p-4 md:p-5 rounded-3xl text-right border border-white/5 shadow-2xl relative overflow-hidden group/btn cursor-pointer">
                      <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500" />
                      <h5 className="text-indigo-400 text-[10px] md:text-xs font-black uppercase tracking-wide mb-2 flex items-center justify-end gap-2">
                        تكتيك التفاوض المقترح <Handshake size={12} />
                      </h5>
                      <p className="text-white text-sm md:text-base font-bold leading-relaxed">
                        "{insight.negotiationApproach}"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-indigo-100 text-indigo-600 disabled:opacity-20 transition-all hover:scale-105 active:scale-95 shadow-sm md:shadow-lg shadow-indigo-200/50 shrink-0">
          <ChevronLeft size={22} />
        </button>
      </div>
      
      <div className="flex items-center justify-center gap-4 py-4">
        <div className="h-1 flex-1 max-w-[200px] bg-slate-100 rounded-full overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: `${((currentPage + 1) / totalPages) * 100}%` }} className="h-full bg-indigo-500" />
        </div>
        <div className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
          صفحة {currentPage + 1} / {totalPages}
        </div>
      </div>
    </div>
  );
};
