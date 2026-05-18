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
  <div className="space-y-10 md:space-y-14 w-full" dir="rtl">
    <div className="flex flex-col md:flex-row justify-between items-center bg-slate-50 p-8 md:p-12 rounded-[40px] border border-slate-200 shadow-sm gap-8">
      <div className="text-right">
        <h3 className="font-black text-3xl md:text-6xl text-slate-800 tracking-tighter">ذكاء مفاوضات الموردين</h3>
        <p className="text-slate-500 text-sm md:text-2xl font-bold mt-2 opacity-60">AI Supplier Negotiation Intel 🤝</p>
      </div>
      <div className="flex items-center gap-4 bg-indigo-500/10 px-8 py-4 rounded-[2rem] border border-indigo-500/20 shadow-md">
        <ShieldCheck className="text-indigo-600" size={28} />
        <span className="text-sm md:text-xl font-black text-indigo-700 uppercase tracking-widest">تحليل الأسعار مفعّل</span>
      </div>
    </div>

      <div className="flex items-center gap-6 w-full">
        <button onClick={prevPage} disabled={currentPage === 0} className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 disabled:opacity-20 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-indigo-200/50 shrink-0">
          <ChevronRight size={32} />
        </button>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
          <AnimatePresence mode="wait">
            {currentInsights.map((insight, index) => (
              <motion.div
                key={insight.id + currentPage}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={cn(
                  "bg-white rounded-[44px] p-2 border-2 hover:shadow-3xl transition-all duration-700 relative overflow-hidden group flex flex-col justify-between min-h-[600px]",
                  insight.riskLevel === 'high' ? 'border-rose-100' : 'border-amber-100 shadow-xl shadow-amber-500/5'
                )}
              >
                {/* Vertical Accent Bar */}
                <div className={cn(
                  "absolute top-0 bottom-0 left-0 w-3 rounded-full my-8",
                  insight.riskLevel === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                )} />

                {/* Top Corner Icon (Requested "! or something top left") */}
                <div className="absolute top-8 left-8 z-20">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center rotate-12 transition-transform duration-500 group-hover:rotate-0",
                    insight.riskLevel === 'high' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                  )}>
                    <AlertTriangle size={24} strokeWidth={3} />
                  </div>
                </div>

                <div className="relative z-10 flex flex-col items-center gap-6 p-6 h-full">
                  {/* Styled Header (from screenshot) */}
                  <div className={cn(
                    "w-full p-8 md:p-10 rounded-[32px] text-center mb-2",
                    insight.riskLevel === 'high' ? 'bg-rose-50/80' : 'bg-amber-50/80'
                  )}>
                    <h4 className={cn(
                      "font-black text-2xl md:text-4xl text-center leading-relaxed",
                      insight.riskLevel === 'high' ? 'text-rose-600' : 'text-amber-700'
                    )}>
                      {insight.supplierName}
                    </h4>
                  </div>

                  {/* Main Message (from screenshot style "يبيعه أرخص !") */}
                  <div className="flex-1 flex flex-col items-center justify-center py-4 text-center">
                    <p className="text-3xl md:text-5xl font-black text-slate-800 leading-tight mb-4 flex items-center gap-4">
                      {insight.isUnfairPricing ? 'يبيعه أغلى !' : 'يبيعه أرخص !'}
                    </p>
                    <p className="text-lg md:text-xl font-bold text-slate-500 max-w-[280px]">
                      بناءً على تحليل ذكاء الأعمال للصنف: <span className="text-slate-800">{insight.productName}</span>
                    </p>
                  </div>

                  {/* Pricing Footer (from screenshot style bubble) */}
                  <div className={cn(
                    "w-full py-6 px-10 rounded-[2.5rem] flex items-center justify-center gap-4",
                    insight.riskLevel === 'high' ? 'bg-rose-50' : 'bg-emerald-50'
                  )}>
                    <span className={cn(
                      "text-3xl md:text-5xl font-black tabular-nums",
                      insight.riskLevel === 'high' ? 'text-rose-600' : 'text-emerald-600'
                    )}>
                      {Number(insight.fairPriceEstimate || 0).toFixed(3)}
                    </span>
                    <span className={cn(
                      "text-xl md:text-2xl font-black",
                      insight.riskLevel === 'high' ? 'text-rose-400' : 'text-emerald-500'
                    )}>
                      د.ك
                    </span>
                  </div>

                  {/* Negotiation Approach Section */}
                  <div className="w-full mt-4">
                    <div className="bg-slate-900 p-8 rounded-[32px] text-right border border-white/5 shadow-2xl relative overflow-hidden group/btn cursor-pointer">
                      <div className="absolute top-0 right-0 w-2 h-full bg-indigo-500" />
                      <h5 className="text-indigo-400 text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center justify-end gap-2">
                        تكتيك التفاوض المقترح <Handshake size={14} />
                      </h5>
                      <p className="text-white text-lg md:text-xl font-bold leading-relaxed">
                        "{insight.negotiationApproach}"
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button onClick={nextPage} disabled={currentPage === totalPages - 1} className="p-4 rounded-2xl bg-indigo-100 text-indigo-600 disabled:opacity-20 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-indigo-200/50 shrink-0">
          <ChevronLeft size={32} />
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
