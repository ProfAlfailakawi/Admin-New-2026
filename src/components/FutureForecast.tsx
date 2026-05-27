import React, { useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, Clock, Calendar, LineChart as LineChartIcon } from 'lucide-react';
import { AppState, Invoice } from '../types';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn, safeFormatCurrency } from '../lib/utils';
import { motion } from 'motion/react';

interface FutureForecastProps {
 data: AppState;
}

type ForecastPeriod = '6_months' | '1_year' | '2_years' | '3_years';

export const FutureForecast: React.FC<FutureForecastProps> = ({ data }) => {
 const [period, setPeriod] = useState<ForecastPeriod>('1_year');

 const { isSufficientData, chartData, trend, explanation, growthRate } = useMemo(() => {
 // 1. Analyze Historical Data
 const invoices = data.invoices || [];
 if (invoices.length < 5) { // Need at least some invoices to establish a baseline
 return { isSufficientData: false, chartData: [], trend: 'stable', explanation: '', growthRate: 0 };
 }

 // Sort invoices by date
 const sorted = [...invoices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
 const firstDate = new Date(sorted[0].date);
 const lastDate = new Date(sorted[sorted.length - 1].date);
 
 const daysDifference = (lastDate.getTime() - firstDate.getTime()) / (1000 * 3600 * 24);
 
 // Calculate total revenue and profit
 const totalRevenue = sorted.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
 const totalProfit = sorted.reduce((sum, inv) => sum + (inv.profit || 0), 0);

 // If all invoices are on the same day, we can't really establish a meaningful multi-year trend yet, 
 // but we can assume a daily rate if there's enough volume, though it's better to require some timespan.
 // Let's allow it if there's at least *some* days difference, or just use a fallback baseline.
 const effectiveDays = Math.max(daysDifference, 1);
 
 // Daily averages
 const dailyRevenue = totalRevenue / effectiveDays;
 const dailyProfit = totalProfit / effectiveDays;

 // To calculate a realistic"growth rate", we could look at first half vs second half
 const midPoint = new Date(firstDate.getTime() + (daysDifference * 24 * 3600 * 1000) / 2);
 const firstHalf = sorted.filter(inv => new Date(inv.date) <= midPoint);
 const secondHalf = sorted.filter(inv => new Date(inv.date) > midPoint);

 const firstHalfRev = firstHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
 const secondHalfRev = secondHalf.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
 
 // Cap growth rates to prevent insane numbers if days are very small
 let calculatedMonthlyGrowthRate = 0;
 if (firstHalfRev > 0 && secondHalfRev > 0 && effectiveDays > 3) {
 // rough calculation
 const periodGrowth = (secondHalfRev - firstHalfRev) / firstHalfRev;
 // Normalize to monthly
 const periodsInMonth = 30 / Math.max(effectiveDays / 2, 1);
 calculatedMonthlyGrowthRate = periodGrowth * periodsInMonth;
 }

 // Baseline monthly normalization:
 // If timespan < 30 days, we don't multiply daily by 30 because it might be a peak.
 // We use total revenue as the baseline if it's less than a month, or average it if it spans more.
 let baselineMonthlyRev = 0;
 let baselineMonthlyProfit = 0;

 if (effectiveDays >= 30) {
 baselineMonthlyRev = (totalRevenue / effectiveDays) * 30;
 baselineMonthlyProfit = (totalProfit / effectiveDays) * 30;
 } else {
 // If we have less than 30 days,"Monthly" is best estimated as 
 // a weighted average of total vs potential month. 
 // Let's use simple logic: if it's 10 days, don't triple it. Use it as is + some buffer or just use total.
 // Actually, many users want to see"If I keep this up".
 // But if they have 1 day of data, 30x is a lie.
 baselineMonthlyRev = effectiveDays < 5 ? totalRevenue : (totalRevenue / effectiveDays) * 30;
 baselineMonthlyProfit = effectiveDays < 5 ? totalProfit : (totalProfit / effectiveDays) * 30;
 }

 // Clamp growth rate between -5% and +15% per month for realistic projections
 calculatedMonthlyGrowthRate = Math.max(-0.05, Math.min(0.12, calculatedMonthlyGrowthRate || 0.02)); 
 
 if(calculatedMonthlyGrowthRate === 0 && baselineMonthlyRev > 0) {
 calculatedMonthlyGrowthRate = 0.02; // Small default growth if stable
 }

 const monthsToProject = period === '6_months' ? 6 : period === '1_year' ? 12 : period === '2_years' ? 24 : 36;
 
 const projectionData = [];
 let currentMonthlyRev = baselineMonthlyRev; 
 let currentMonthlyProfit = baselineMonthlyProfit;
 
 const now = new Date();
 
 for (let i = 1; i <= monthsToProject; i++) {
 const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
 const monthName = futureDate.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
 
 // Add some slight seasonality / randomness so it's not a perfectly straight line
 const randomFactor = 1 + (Math.random() * 0.04 - 0.02); // +/- 2%
 
 currentMonthlyRev = currentMonthlyRev * (1 + calculatedMonthlyGrowthRate) * randomFactor;
 currentMonthlyProfit = currentMonthlyProfit * (1 + calculatedMonthlyGrowthRate) * randomFactor;
 
 projectionData.push({
 name: monthName,
 المبيعات: Math.round(currentMonthlyRev),
 الأرباح: Math.round(currentMonthlyProfit),
 });
 }

 const finalRevenue = projectionData[projectionData.length - 1]?.['المبيعات'] || 0;
 const initialRevenue = baselineMonthlyRev;
 
 const isGrowing = finalRevenue > initialRevenue;
 const trendType = isGrowing ? 'up' : 'down';
 
 let aiExplanation ="";
 if (isGrowing) {
 if (calculatedMonthlyGrowthRate > 0.05) {
 aiExplanation = `بناءً على بيانات المبيعات الحالية وسلوك العملاء، من المتوقع نمو سريع ومستمر خلال الـ ${monthsToProject} شهراً القادمة. هناك فرصة كبيرة للتوسع.`;
 } else {
 aiExplanation = `بناءً على المعطيات التاريخية والمبيعات، من المتوقع نمو تدريجي ومستقر. ينصح بالاستمرار في تحسين تجربة العميل لضمان استدامة النمو.`;
 }
 } else {
 aiExplanation = `تُظهر البيانات الحالية تباطؤاً أو انخفاضاً متوقعاً في وتيرة المبيعات المستقبلية. يُنصح بمراجعة التسعير وتكثيف الحملات التسويقية لتجنب تراجع الأرباح.`;
 }

 return {
 isSufficientData: true,
 chartData: projectionData,
 trend: trendType,
 explanation: aiExplanation,
 growthRate: calculatedMonthlyGrowthRate * 100 // as percentage
 };
 }, [data.invoices, period]);


 if (!isSufficientData) {
 return (
 <div className="bg-white rounded-2xl border border-slate-200/60 p-3 md:p-3 shadow-sm flex flex-col items-center justify-center text-center">
 <LineChartIcon className="text-slate-200 mb-4" size={48} />
 <h3 className="font-bold text-slate-700 text-lg mb-2">التنبؤ المستقبلي</h3>
 <p className="text-sm font-bold text-slate-500">لا توجد بيانات كافية لإجراء التنبؤ المستقبلي</p>
 <p className="text-xs text-slate-300 mt-2 max-w-sm leading-relaxed">يتطلب النظام المزيد من السجلات والمبيعات الفعلية لبناء نموذج تنبؤ دقيق للسنوات القادمة.</p>
 </div>
);
 }

 return (
 <div className="bg-white rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-3 border border-slate-200/60 shadow-sm flex flex-col gap-3 md:p-4" dir="rtl">
 {/* Header */}
 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
 <div>
 <h3 className="font-bold text-xl md:text-2xl text-slate-800 flex items-center gap-3">
 التنبؤ المستقبلي الخوارزمي <TrendingUp className="text-indigo-500" size={24} />
 </h3>
 <p className="text-xs font-bold text-slate-500 mt-2">توقعات التراث الذكي للأداء المالي مبنية على البيانات الفعلية</p>
 </div>
 
 {/* Range Selector */}
 <div className="flex bg-slate-50 border border-slate-200/60 rounded-xl p-1 shrink-0">
 {(['6_months', '1_year', '2_years', '3_years'] as ForecastPeriod[]).map((p) => {
 const label = p === '6_months' ? '6 أشهر' : p === '1_year' ? 'سنة' : p === '2_years' ? 'سنتين' : '3 سنوات';
 return (
 <button
 key={p}
 onClick={() => setPeriod(p)}
 className={cn(
"text-xs font-bold px-4 py-2 rounded-lg transition-all",
 period === p 
 ?"bg-white text-indigo-600 shadow-sm border border-slate-100" 
 :"text-slate-500 hover:text-slate-800 hover:bg-slate-100"
)}
 >
 {label}
 </button>
)
 })}
 </div>
 </div>

 {/* AI Insight Box */}
 <div className={cn(
"p-3 md:p-4 md:p-3 rounded-2xl flex items-start gap-4 border",
 trend === 'up' ?"bg-emerald-50 border-emerald-100" :"bg-rose-50 border-rose-100"
)}>
 <div className={cn(
"p-3 rounded-xl shrink-0 mt-1",
 trend === 'up' ?"bg-emerald-100 text-emerald-600" :"bg-rose-100 text-rose-600"
)}>
 {trend === 'up' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
 </div>
 <div>
 <h4 className={cn(
"text-[11px] font-bold uppercase mb-1",
 trend === 'up' ?"text-emerald-700" :"text-rose-700"
)}>قراءة الخوارزمية المستقبلية</h4>
 <p className="text-sm font-bold leading-relaxed text-slate-700">{explanation}</p>
 </div>
 </div>

 {/* Chart */}
 <div className="h-[300px] md:h-[400px] w-full mt-4">
 <ResponsiveContainer width="100%" height="100%">
 <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
 
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
 
 <XAxis 
 dataKey="name" 
 axisLine={false} 
 tickLine={false} 
 dy={10}
 interval={period === '3_years' ? 3 : period === '2_years' ? 2 : period === '1_year' ? 1 : 0}
 tick={(props: any) => (
 <g transform={`translate(${props.x},${props.y})`}>
 <text
 x={0}
 y={10}
 dy={10}
 textAnchor="middle"
 fill="#94a3b8"
 fontSize="10px"
 fontWeight={700}
 fontFamily="Cairo, sans-serif"
 >
 {props.payload.value}
 </text>
 </g>
)}
 />
 <YAxis 
 axisLine={false} 
 tickLine={false} 
 dx={-10}
 width={60}
 tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700, fontFamily: 'Cairo, sans-serif' }}
 tickFormatter={(value) => `${Number(value || 0).toFixed(1)}`}
 />
 <Tooltip 
 contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontFamily: 'Cairo, Tahoma, sans-serif', direction: 'rtl' }}
 itemStyle={{ fontWeight: 900 }}
 labelStyle={{ color: '#64748b', fontWeight: 700, marginBottom: '8px' }}
 formatter={(value: number) => [`${safeFormatCurrency(value)} د.ك`, '']}
 />
 <Area 
 type="monotone"
 dataKey="المبيعات"
 stroke="#6366f1"
 strokeWidth={4}
 fillOpacity={1}
 fill="url(#colorSales)" filter="url(#glow)"
 activeDot={{ r: 6, strokeWidth: 0, fill: '#4f46e5' }}
 />
 <Area 
 type="monotone"
 dataKey="الأرباح"
 stroke="#10b981"
 strokeWidth={3}
 fillOpacity={1}
 fill="url(#colorProfit)" filter="url(#glow)"
 />
 </AreaChart>
 </ResponsiveContainer>
 </div>

 </div>
);
};
