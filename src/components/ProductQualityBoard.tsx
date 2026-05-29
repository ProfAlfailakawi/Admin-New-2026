import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Eye, Gem, ImagePlus, PackageSearch, Sparkles, Target } from 'lucide-react';
import { AppState, Product } from '../types';
import { getProductQualityReport, ProductQualitySignal } from '../lib/command-quality';
import { cn } from '../lib/utils';

interface Props {
  data: AppState;
  onFocusProduct?: (product: Product) => void;
}

const toneClass: Record<ProductQualitySignal['tone'], string> = {
  emerald: 'border-emerald-200 bg-emerald-50/65 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50/70 text-amber-700',
  rose: 'border-rose-200 bg-rose-50/70 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

const iconFor = (id: string) => {
  if (id === 'hidden-gems') return <Gem size={16} />;
  if (id === 'missing-visual') return <ImagePlus size={16} />;
  if (id === 'pricing-risk') return <AlertTriangle size={16} />;
  if (id === 'dormant') return <PackageSearch size={16} />;
  return <Sparkles size={16} />;
};

export const ProductQualityBoard: React.FC<Props> = ({ data, onFocusProduct }) => {
  const [isOpen, setIsOpen] = useState(false);
  const report = useMemo(() => getProductQualityReport(data), [data]);
  const visibleSignals = report.signals.slice(0, 4);

  return (
    <section id="product-quality-board" className="rounded-[28px] border border-slate-200/80 bg-white shadow-sm overflow-hidden text-right" dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full p-4 md:p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between hover:bg-slate-50/70 transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 text-white flex items-center justify-center shadow-sm shrink-0">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600">
                <Sparkles size={12} /> Product Quality Board
              </span>
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 border border-amber-100">قراءة فقط</span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-slate-950 leading-snug">{report.title}</h3>
            <p className="mt-1 text-xs md:text-sm font-bold text-slate-500 leading-6">{report.summary}</p>
          </div>
        </div>

        <div className="flex items-center justify-between lg:justify-end gap-3">
          <div className="text-left lg:text-right">
            <div className="text-[11px] font-black text-slate-400">جودة المنيو</div>
            <div className="text-3xl font-black text-slate-950 leading-none">{report.score}<span className="text-sm text-slate-400">%</span></div>
          </div>
          <div className="w-16 h-16 rounded-3xl border border-slate-200 bg-slate-50 flex items-center justify-center">
            {report.score >= 72 ? <CheckCircle2 className="text-emerald-600" size={28} /> : <AlertTriangle className="text-amber-600" size={28} />}
          </div>
          <ChevronDown size={20} className={cn('text-slate-400 transition-transform', isOpen && 'rotate-180')} />
        </div>
      </button>

      <div className="px-4 md:px-5 pb-4 md:pb-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 rounded-2xl border border-amber-100 bg-amber-50/45 p-4">
            <div className="text-[11px] font-black text-amber-700 flex items-center gap-2"><Target size={14} /> القرار العملي الآن</div>
            <p className="mt-2 text-sm md:text-base font-black text-slate-900 leading-7">{report.decision}</p>
            <p className="mt-1 text-xs font-bold text-slate-500 leading-6">{report.proof}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[11px] font-black text-slate-500 flex items-center gap-2"><Eye size={14} /> بدون زحمة</div>
            <p className="mt-2 text-sm font-black text-slate-800 leading-7">{report.action}</p>
          </div>
        </div>

        {isOpen && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
            {visibleSignals.length ? visibleSignals.map((item) => (
              <div key={item.id} className={cn('rounded-2xl border p-3', toneClass[item.tone])}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 font-black text-sm">{iconFor(item.id)} {item.title}</div>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-black">{item.count}</span>
                </div>
                <p className="mt-2 text-xs font-bold leading-6 opacity-80">{item.text}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.products.slice(0, 3).map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => onFocusProduct?.(product)}
                      className="rounded-full bg-white/80 border border-white px-3 py-1.5 text-[11px] font-black text-slate-700 hover:bg-white transition-colors"
                    >
                      {product.name}
                    </button>
                  ))}
                </div>
              </div>
            )) : (
              <div className="lg:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 font-black flex items-center gap-2">
                <CheckCircle2 size={18} /> المنيو نظيف حاليًا، لا يحتاج ضجيجًا أو تدخلًا زائدًا.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductQualityBoard;
