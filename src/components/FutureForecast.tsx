import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, LineChart as LineChartIcon } from 'lucide-react';
import { AppState } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, safeFormatCurrency } from '../lib/utils';

interface FutureForecastProps {
 data: AppState;
}

type ForecastPeriod = '6_months' | '1_year' | '2_years' | '3_years';

export const FutureForecast: React.FC<FutureForecastProps> = ({ data }) => {
 const [period, setPeriod] = useState<ForecastPeriod>('1_year');

 const { isSufficientData, chartData, trend, explanation, growthRate } = useMemo(() => {
  const invoices = data.invoices || [];
  if (invoices.length < 5) return { isSufficientData: false, chartData: [], trend: 'stable', explanation: '', growthRate: 0 };

  const sorted = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const firstDate = new Date(sorted[0].date);
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const daysDifference = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
  const effectiveDays = Math.max(daysDifference, 1);
  const totalRevenue = sorted.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const totalProfit = sorted.reduce((sum, inv) => sum + (inv.profit || 0), 0);

  const midPoint = new Date(firstDate.getTime() + (daysDifference * 24 * 3600 * 1000) / 2);
  const firstHalf = sorted.filter(inv => new Date(inv.date) <= midPoint);
  const secondHalf = sorted.filter(inv => new Date(inv.date) > midPoint);
  const firstHalfRev = firstHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  const secondHalfRev = secondHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);

  let calculatedMonthlyGrowthRate = 0;
  if (firstHalfRev > 0 && secondHalfRev > 0 && effectiveDays > 3) {
   const periodGrowth = (secondHalfRev - firstHalfRev) / firstHalfRev;
   calculatedMonthlyGrowthRate = periodGrowth * (30 / Math.max(effectiveDays / 2, 1));
  }

  const baselineMonthlyRev = effectiveDays >= 30 ? (totalRevenue / effectiveDays) * 30 : (effectiveDays < 5 ? totalRevenue : (totalRevenue / effectiveDays) * 30);
  const baselineMonthlyProfit = effectiveDays >= 30 ? (totalProfit / effectiveDays) * 30 : (effectiveDays < 5 ? totalProfit : (totalProfit / effectiveDays) * 30);
  calculatedMonthlyGrowthRate = Math.max(-0.05, Math.min(0.12, calculatedMonthlyGrowthRate || 0.02));
  if (calculatedMonthlyGrowthRate === 0 && baselineMonthlyRev > 0) calculatedMonthlyGrowthRate = 0.02;

  const monthsToProject = period === '6_months' ? 6 : period === '1_year' ? 12 : period === '2_years' ? 24 : 36;
  const projectionData = [] as Array<{ name: string; المبيعات: number; الأرباح: number }>;
  let currentMonthlyRev = baselineMonthlyRev;
  let currentMonthlyProfit = baselineMonthlyProfit;
  const now = new Date();

  for (let i = 1; i <= monthsToProject; i++) {
   const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
   const monthName = futureDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
   const seasonality = 1 + (Math.sin(i * 1.7) * 0.015);
   currentMonthlyRev = currentMonthlyRev * (1 + calculatedMonthlyGrowthRate) * seasonality;
   currentMonthlyProfit = currentMonthlyProfit * (1 + calculatedMonthlyGrowthRate) * seasonality;
   projectionData.push({ name: monthName, المبيعات: Math.round(currentMonthlyRev), الأرباح: Math.round(currentMonthlyProfit) });
  }

  const finalRevenue = projectionData[projectionData.length - 1]?.['المبيعات'] || 0;
  const isGrowing = finalRevenue > baselineMonthlyRev;
  const trendType = isGrowing ? 'up' : 'down';
  const aiExplanation = isGrowing
   ? (calculatedMonthlyGrowthRate > 0.05
     ? `الاتجاه المالي يدعم نمواً واضحاً خلال الفترة المختارة. الأفضل التوسع بحذر مع متابعة التكلفة.`
     : `المؤشرات مستقرة وتميل إلى نمو تدريجي. حافظ على جودة الطلب وتجربة العميل.`)
   : `المؤشرات تحتاج انتباه: راجع التسعير والحملات قبل أي توسع.`;

  return { isSufficientData: true, chartData: projectionData, trend: trendType, explanation: aiExplanation, growthRate: calculatedMonthlyGrowthRate * 100 };
 }, [data.invoices, period]);

 if (!isSufficientData) {
  return (
   <div className="bg-white rounded-3xl border border-slate-200/70 p-6 shadow-sm flex flex-col items-center justify-center text-center">
    <LineChartIcon className="text-slate-200 mb-4" size={48} />
    <h3 className="font-black text-slate-700 text-lg mb-2">التنبؤ المستقبلي</h3>
    <p className="text-sm font-bold text-slate-500">لا توجد بيانات كافية لإجراء التنبؤ المستقبلي</p>
    <p className="text-xs text-slate-300 mt-2 max-w-sm leading-relaxed">يتطلب النظام المزيد من السجلات والمبيعات الفعلية لبناء نموذج تنبؤ دقيق.</p>
   </div>
  );
 }

 const finalPoint = chartData[chartData.length - 1];
 const firstPoint = chartData[0];
 const labels: Record<ForecastPeriod, string> = { '6_months': '6 أشهر', '1_year': 'سنة', '2_years': 'سنتين', '3_years': '3 سنوات' };

 return (
  <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white p-4 md:p-6 shadow-sm" dir="rtl">
   <div className="pointer-events-none absolute -top-24 -left-24 h-56 w-56 rounded-full bg-indigo-100/60 blur-3xl" />
   <div className="pointer-events-none absolute -bottom-28 -right-24 h-64 w-64 rounded-full bg-emerald-100/70 blur-3xl" />

   <div className="relative z-10 flex flex-col gap-5">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
     <div className="space-y-2">
      <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">
       <TrendingUp size={16} /> قراءة خوارزمية
      </div>
      <h3 className="font-black text-2xl md:text-3xl text-slate-900 tracking-tight">التنبؤ المستقبلي للخوارزمي</h3>
      <p className="text-sm md:text-base font-bold text-slate-500 leading-relaxed">توقعات مالية مبنية على الفواتير الفعلية، مع مقارنة واضحة بين الإيرادات والتكاليف.</p>
     </div>

     <div className="grid grid-cols-4 rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-inner min-w-full md:min-w-[430px]">
      {(['6_months', '1_year', '2_years', '3_years'] as ForecastPeriod[]).map((p) => (
       <button
        key={p}
        onClick={() => setPeriod(p)}
        className={cn(
         'rounded-xl px-3 py-2.5 text-xs md:text-sm font-black transition-all',
         period === p ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-100' : 'text-slate-500 hover:text-slate-800'
        )}
       >
        {labels[p]}
       </button>
      ))}
     </div>
    </div>

    <div className={cn(
     'grid gap-4 rounded-3xl border p-4 md:p-5',
     trend === 'up' ? 'border-emerald-100 bg-emerald-50/70' : 'border-rose-100 bg-rose-50/70'
    )}>
     <div className="flex items-start justify-between gap-4">
      <div>
       <p className={cn('text-xs font-black mb-2', trend === 'up' ? 'text-emerald-700' : 'text-rose-700')}>قراءة مستقبلية</p>
       <p className="text-lg md:text-xl font-black leading-9 text-slate-800">{explanation}</p>
      </div>
      <div className={cn('h-16 w-16 rounded-3xl flex items-center justify-center shadow-sm shrink-0', trend === 'up' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
       {trend === 'up' ? <TrendingUp size={30} /> : <TrendingDown size={30} />}
      </div>
     </div>
    </div>

    <div className="rounded-[1.75rem] border border-slate-200 bg-white/90 p-3 md:p-5 shadow-sm">
     <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm font-black">
       <span className="inline-flex items-center gap-2 text-indigo-600"><i className="h-3 w-3 rounded-full bg-indigo-500" /> الإيرادات المتوقعة</span>
       <span className="inline-flex items-center gap-2 text-emerald-600"><i className="h-3 w-3 rounded-full bg-emerald-500" /> الأرباح المتوقعة</span>
      </div>
      <div className="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">نمو شهري تقريبي: {Number(growthRate || 0).toFixed(1)}%</div>
     </div>

     <div className="h-[260px] sm:h-[330px] md:h-[390px] w-full" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
       <AreaChart data={chartData} margin={{ top: 14, right: 10, left: 0, bottom: 18 }}>
        <defs>
         <linearGradient id="forecastSales" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35}/>
          <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02}/>
         </linearGradient>
         <linearGradient id="forecastProfit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.24}/>
          <stop offset="100%" stopColor="#10b981" stopOpacity={0.01}/>
         </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 8" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="name" axisLine={false} tickLine={false} dy={12} interval={period === '3_years' ? 3 : period === '2_years' ? 2 : period === '1_year' ? 1 : 0} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800, fontFamily: 'Cairo, sans-serif' }} />
        <YAxis axisLine={false} tickLine={false} width={66} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800, fontFamily: 'Cairo, sans-serif' }} tickFormatter={(value) => Number(value || 0).toLocaleString('en-US')} />
        <Tooltip contentStyle={{ borderRadius: '18px', border: '1px solid #e2e8f0', boxShadow: '0 18px 40px rgba(15,23,42,.12)', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl' }} itemStyle={{ fontWeight: 900 }} labelStyle={{ color: '#334155', fontWeight: 900, marginBottom: '8px' }} formatter={(value: number, name: string) => [`${safeFormatCurrency(value)} د.ك`, name]} />
        <Area type="monotone" dataKey="المبيعات" stroke="#4f46e5" strokeWidth={4} fill="url(#forecastSales)" activeDot={{ r: 6, strokeWidth: 3, stroke: '#fff', fill: '#4f46e5' }} />
        <Area type="monotone" dataKey="الأرباح" stroke="#10b981" strokeWidth={4} fill="url(#forecastProfit)" activeDot={{ r: 5, strokeWidth: 3, stroke: '#fff', fill: '#10b981' }} />
       </AreaChart>
      </ResponsiveContainer>
     </div>

     <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
      <div className="rounded-2xl bg-indigo-50 px-4 py-3 text-right">
       <p className="text-xs font-black text-indigo-500 mb-1">إيراد بداية الفترة / آخرها</p>
       <p className="font-mono text-xl font-black text-indigo-700">{safeFormatCurrency(firstPoint?.['المبيعات'] || 0)} → {safeFormatCurrency(finalPoint?.['المبيعات'] || 0)}</p>
      </div>
      <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right">
       <p className="text-xs font-black text-emerald-600 mb-1">ربح بداية الفترة / آخرها</p>
       <p className="font-mono text-xl font-black text-emerald-700">{safeFormatCurrency(firstPoint?.['الأرباح'] || 0)} → {safeFormatCurrency(finalPoint?.['الأرباح'] || 0)}</p>
      </div>
     </div>
    </div>
   </div>
  </div>
 );
};
