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
  const visualSignal = report.signals.find((item) => item.id === 'missing-visual');
  const hiddenGemSignal = report.signals.find((item) => item.id === 'hidden-gems');

  return (
    <section id="product-quality-board" className="rounded-[26px] border border-slate-200 bg-white shadow-sm text-right overflow-hidden" dir="rtl">
      <div className="p-3 md:p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 shrink-0 rounded-2xl bg-slate-950 text-white flex items-center justify-center">
            {report.score >= 72 ? <CheckCircle2 size={18} /> : <Target size={18} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm md:text-base font-black text-slate-950">جودة عرض المنيو</h3>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600 whitespace-nowrap">درجة عامة {report.score}%</span>
            </div>
            <p className="mt-1 text-xs md:text-sm font-bold text-slate-500 leading-6 line-clamp-2">{report.decision}</p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="h-10 w-10 shrink-0 rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 flex items-center justify-center hover:bg-white transition-colors"
            aria-label={isOpen ? 'إغلاق تفاصيل جودة المنيو' : 'فتح تفاصيل جودة المنيو'}
          >
            <ChevronDown size={17} className={cn('transition-transform', isOpen && 'rotate-180')} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800 min-w-0">
            <div className="text-[10px] font-black opacity-75">الواجهة البصرية</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm font-black tabular-nums">{visualSignal?.count || 0}</span>
              <span className="text-[10px] font-black">منتج</span>
            </div>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800 min-w-0">
            <div className="text-[10px] font-black opacity-75">ذهب مدفون</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span className="text-sm font-black tabular-nums">{hiddenGemSignal?.count || 0}</span>
              <span className="text-[10px] font-black">منتج</span>
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
          {firstProduct && (
            <button
              type="button"
              onClick={() => onFocusProduct?.(firstProduct)}
              className="min-h-11 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-white transition-colors"
            >
              ركّز على: <span className="text-slate-950">{firstProduct.name}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="min-h-11 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-800 transition-colors"
          >
            {isOpen ? 'إخفاء الأولويات' : 'عرض الأولويات'}
          </button>
        </div>

        {isOpen && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="mb-2 rounded-2xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-500 leading-5">
              النسبة تقييم عام لكل المنيو. الأرقام هنا عدد منتجات، والتفاصيل تعرض أهم الأولويات فقط.
            </div>
            {primarySignals.length ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                {primarySignals.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => item.products[0] && onFocusProduct?.(item.products[0])}
                    className={cn('min-h-24 rounded-2xl border p-3 text-right transition-colors hover:bg-white', toneClass[item.tone])}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-xs font-black min-w-0 truncate">{iconFor(item.id)} {item.title}</span>
                      <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-black whitespace-nowrap">{item.count} منتج</span>
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
