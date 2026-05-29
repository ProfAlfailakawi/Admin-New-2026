import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, Gem, ImagePlus, PackageSearch, Target } from 'lucide-react';
import { AppState, Product } from '../types';
import { getProductQualityReport, ProductQualitySignal } from '../lib/command-quality';
import { cn } from '../lib/utils';

interface Props {
  data: AppState;
  onFocusProduct?: (product: Product) => void;
}

const toneClass: Record<ProductQualitySignal['tone'], string> = {
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  rose: 'border-rose-200 bg-rose-50 text-rose-700',
  slate: 'border-slate-200 bg-slate-50 text-slate-600',
};

const iconFor = (id: string) => {
  if (id === 'hidden-gems') return <Gem size={14} />;
  if (id === 'missing-visual') return <ImagePlus size={14} />;
  if (id === 'pricing-risk') return <AlertTriangle size={14} />;
  if (id === 'dormant') return <PackageSearch size={14} />;
  return <Target size={14} />;
};

export const ProductQualityBoard: React.FC<Props> = ({ data, onFocusProduct }) => {
  const [isOpen, setIsOpen] = useState(false);
  const report = useMemo(() => getProductQualityReport(data), [data]);
  const primarySignals = report.signals.slice(0, 3);
  const firstProduct = report.risk?.products?.[0] || report.opportunity?.products?.[0];

  return (
    <section id="product-quality-board" className="rounded-[24px] border border-slate-200 bg-white shadow-sm text-right" dir="rtl">
      <div className="p-3 md:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
              {report.score >= 72 ? <CheckCircle2 size={18} /> : <Target size={18} />}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm md:text-base font-black text-slate-950">جودة المنيو</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">{report.score}%</span>
              </div>
              <p className="mt-1 text-xs md:text-sm font-bold text-slate-500 leading-6 line-clamp-2">{report.decision}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            {primarySignals.slice(0, 2).map((item) => (
              <span key={item.id} className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black whitespace-nowrap', toneClass[item.tone])}>
                {iconFor(item.id)} {item.count}
              </span>
            ))}
            {firstProduct && (
              <button
                type="button"
                onClick={() => onFocusProduct?.(firstProduct)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50 transition-colors"
              >
                ركّز على المنتج
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-slate-500 hover:bg-white transition-colors"
              aria-label={isOpen ? 'إغلاق تفاصيل جودة المنيو' : 'فتح تفاصيل جودة المنيو'}
            >
              <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
            </button>
          </div>
        </div>

        {isOpen && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            {primarySignals.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {primarySignals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.products[0] && onFocusProduct?.(item.products[0])}
                    className={cn('rounded-2xl border p-3 text-right transition-colors hover:bg-white', toneClass[item.tone])}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-black">{iconFor(item.id)} {item.title}</span>
                      <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black">{item.count}</span>
                    </div>
                    <p className="mt-1 text-[11px] font-bold leading-5 opacity-80 line-clamp-2">{item.text}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-black text-emerald-800 flex items-center gap-2">
                <CheckCircle2 size={16} /> لا توجد ملاحظات مهمة حاليًا.
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductQualityBoard;
