import React from 'react';
import { DnaRing, DnaSpark } from './dna/DnaKit';
import { DnaDonut, type DnaDonutSlice } from './dna/DnaDonut';

export interface ReportsInsightsProps {
  /** Invoices shown in the table below (already filtered by the page). */
  invoiceCount: number;
  paidCount: number;
  /** The same two totals the KPI cards above display. */
  salesTotal: number;
  profitTotal: number;
  /** Paid sales per day for the last 30 days (oldest first), from invoices already loaded. */
  dailySales: number[];
  /** Payment-method breakdown of the displayed invoices. */
  methods: DnaDonutSlice[];
}

/** Display-only infographic strip for the reports page. It never computes business numbers itself. */
export function ReportsInsights({ invoiceCount, paidCount, salesTotal, profitTotal, dailySales, methods }: ReportsInsightsProps) {
  const paidPct = invoiceCount > 0 ? (paidCount / invoiceCount) * 100 : null;
  const marginPct = salesTotal > 0 ? (profitTotal / salesTotal) * 100 : null;
  const hasSpark = dailySales.filter((v) => v > 0).length >= 2;
  if (invoiceCount === 0) return null;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3" dir="rtl">
      <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex items-center justify-around gap-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <DnaRing value={paidPct} size={72} stroke={6} tone="mint" ariaLabel={paidPct == null ? 'نسبة المدفوع غير متوفرة' : `نسبة الفواتير المدفوعة ${Math.round(paidPct)}%`} />
          <span className="text-[11px] font-bold text-slate-500">فواتير مدفوعة</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <DnaRing value={marginPct} size={72} stroke={6} tone="amber" ariaLabel={marginPct == null ? 'هامش الربح غير متوفر' : `هامش الربح ${Math.round(marginPct)}%`} />
          <span className="text-[11px] font-bold text-slate-500">هامش الربح</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm flex flex-col justify-between gap-2">
        <span className="text-[11px] font-bold text-slate-500">المبيعات المدفوعة · آخر 30 يوماً</span>
        {hasSpark ? (
          <DnaSpark values={dailySales} width={260} height={56} tone="accent" ariaLabel="اتجاه المبيعات اليومية لآخر 30 يوماً" className="w-full" />
        ) : (
          <span className="text-xs font-bold text-slate-400">لا توجد مبيعات كافية لرسم الاتجاه</span>
        )}
      </div>

      <div className="bg-white rounded-2xl p-4 border border-slate-200/60 shadow-sm">
        <div className="text-[11px] font-bold text-slate-500 mb-2">طرق الدفع</div>
        {methods.length > 0 ? (
          <DnaDonut slices={methods} size={96} stroke={14} ariaLabel="توزيع الفواتير حسب طريقة الدفع" />
        ) : (
          <span className="text-xs font-bold text-slate-400">—</span>
        )}
      </div>
    </div>
  );
}
