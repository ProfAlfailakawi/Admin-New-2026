import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { getKitchenNowDecision, getKuwaitiSeasonalMove } from '../lib/ai-engine';
import { getProductQualityReport } from '../lib/command-quality';
import { cn } from '../lib/utils';
import { AlertCircle, Target, Users, TrendingUp, Zap, ShieldAlert, ChevronDown, ChevronUp, Sparkles, Gauge } from 'lucide-react';

interface Props {
  data: AppState;
  dateFilter?: 'day' | 'week' | 'month' | 'year' | 'all';
  onNavigate?: (page: string, payload?: any) => void;
  partnerMode?: boolean;
}

export function CommandBrief({ data, dateFilter = 'day', onNavigate, partnerMode = false }: Props) {
  const hour = new Date().getHours();
  const greeting = hour >= 17 && hour < 22
    ? { title: 'تحية مسائية هادئة ☕', sub: 'النظام مستقر ويعمل بهدوء. وقت ممتاز لمراجعة أرقامك والتحضير للغد.' }
    : hour >= 5 && hour < 12
      ? { title: 'صباح الخير، يوم جديد وفرص جديدة ☀️', sub: 'مركز القيادة جاهز لقراءة نبض اليوم ومتابعة أهم المؤشرات.' }
      : hour >= 12 && hour < 17
        ? { title: 'مرحباً، وقت الغداء والتركيز! 🍽️', sub: 'تابع الحركة، الطلبات، والفرص من مركز القيادة.' }
        : { title: 'نظرة هادئة على الأرقام ☕', sub: 'هدوء الليل أفضل وقت لمراجعة الأداء والتجهيز للغد.' };
  const [isExpanded, setIsExpanded] = useState(false);
  const nowDecision = useMemo(() => getKitchenNowDecision(data, 'dashboard'), [data]);
  const seasonalMove = useMemo(() => getKuwaitiSeasonalMove(data), [data]);
  const qualityReport = useMemo(() => getProductQualityReport(data), [data]);

   const brief = useMemo(() => {
    const lines = [];
    const now = new Date();
    
    // Calculate cutoff based on dateFilter
    let cutoff: Date | null = new Date();
    if (dateFilter === 'day') {
      cutoff.setHours(0, 0, 0, 0);
    } else if (dateFilter === 'week') {
      cutoff.setDate(cutoff.getDate() - 7);
    } else if (dateFilter === 'month') {
      cutoff.setMonth(cutoff.getMonth() - 1);
    } else if (dateFilter === 'year') {
      cutoff.setFullYear(cutoff.getFullYear() - 1);
    } else {
      cutoff = null; // 'all'
    }

    const filteredInvoices = data.invoices?.filter(i => {
      if (!cutoff) return true;
      const d = new Date(i.date);
      return d >= cutoff && !i.isDeleted;
    }) || [];

    const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

    // 0. Humanized Kuwaiti System Voice (صديق صدوق)
    if (dateFilter === 'day') {
        if (totalSales > 100) {
            lines.push({
               icon: <TrendingUp size={16} className="text-emerald-400" />,
               text: `كفو! اليوم كسرنا حاجز المبيعات، عساها مداخيل العافية 🚀`
            });
        } else if (totalSales > 0 && totalSales <= 100) {
            lines.push({
               icon: <TrendingUp size={16} className="text-blue-400" />,
               text: `ماشيين صح، المبيعات زينة اليوم، بس نقدر نشد حيلنا أكثر! 💪`
            });
        } else {
            lines.push({
               icon: <Zap size={16} className="text-amber-400" />,
               text: `الوضع هادي شوي اليوم ☕.. تبيني أطلع لك قائمة بالعملاء اللي قاطعونا من شهرين وندز لهم رسالة كود خصم، ونحرّك السوق؟`
            });
        }
    } else {
        if (totalSales > 500) {
            lines.push({
               icon: <TrendingUp size={16} className="text-emerald-400" />,
               text: `أرقام تبيض الوجه، الأداء قوي جداً 🏆 استمر على هالمستوى!`
            });
        }
    }

    // 1. Demand Prediction
    // Find the zone with the most recent orders based on the filter
    const recentInvoices = filteredInvoices;
    
    if (recentInvoices.length > 0 && data.zones) {
      const zoneCounts: Record<string, number> = {};
      recentInvoices.forEach(inv => {
        if (inv.deliveryInfo?.zoneName) {
          zoneCounts[inv.deliveryInfo.zoneName] = (zoneCounts[inv.deliveryInfo.zoneName] || 0) + 1;
        } else if (inv.area) { // Fallback if no zoneName but area is present
           zoneCounts[inv.area] = (zoneCounts[inv.area] || 0) + 1;
        }
      });
      const sortedZones = Object.keys(zoneCounts).sort((a, b) => zoneCounts[b] - zoneCounts[a]);
      const topZoneName = sortedZones[0];
      
      const dateText = dateFilter === 'day' ? 'اليوم' : 
                       dateFilter === 'week' ? 'هذا الأسبوع' : 
                       dateFilter === 'month' ? 'هذا الشهر' : 
                       dateFilter === 'year' ? 'هذا العام' : 'كل الأوقات';

      if (topZoneName && zoneCounts[topZoneName] >= 2) {
        lines.push({
          icon: <TrendingUp size={16} className="text-amber-500" />,
          text: `الطلب متزايد على منطقة ${topZoneName} خلال ${dateText} (${zoneCounts[topZoneName]} طلبات).`
        });
      }
    }
    
    if (lines.length === 0) {
      const dateText = dateFilter === 'day' ? 'اليوم' : 
                       dateFilter === 'week' ? 'هذا الأسبوع' : 
                       dateFilter === 'month' ? 'هذا الشهر' : 
                       dateFilter === 'year' ? 'هذا العام' : 'كل الأوقات';
      
      lines.push({
        icon: <TrendingUp size={16} className="text-blue-500" />,
        text: `لا توجد بيانات كافية لتوقع ذروة الطلبات خلال ${dateText}.`
      });
    }

    // Calculate product sales to use for margins/stock metrics
    const productSales: Record<string, number> = {};
    (data.invoices || []).forEach(inv => {
      if (inv.isDeleted) return;
      (inv.items || []).forEach(item => {
         productSales[item.productId] = (productSales[item.productId] || 0) + item.quantity;
      });
    });

    // 2. High Margin / Low Visibility
    const productsWithMargin = data.products?.filter(p => p.cost && p.price > p.cost) || [];
    if (productsWithMargin.length > 0) {
      const sortedByMargin = [...productsWithMargin].sort((a, b) => {
        const marginA = ((a.price - (a.cost || 0)) / a.price) * 100;
        const marginB = ((b.price - (b.cost || 0)) / b.price) * 100;
        return marginB - marginA;
      });
      
      const hiddenGem = sortedByMargin.find(p => (productSales[p.id] || 0) < 5); // Low sales but high margin
      if (hiddenGem) {
        const marginPct = (((hiddenGem.price - hiddenGem.cost) / hiddenGem.price) * 100).toFixed(0);
        lines.push({
          icon: <Zap size={16} className="text-emerald-500" />,
          text: `صنف "${hiddenGem.name}" يحقق هامش ربح ${marginPct}% لكن مبيعاته منخفضة، يحتاج لتسويق أكبر.`
        });
      }
    }

    // 3. Churn Risk
    if (data.customers && data.customers.length > 0) {
      const atRiskCustomer = data.customers.reduce((riskTarget, c) => {
         if (!c.lastOrderDate) return riskTarget;
         const daysSinceRecord = (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
         const isRisk = daysSinceRecord > 30 && c.totalOrders > 1 && c.totalSpent > 50;
         if (!isRisk) return riskTarget;
         if (!riskTarget) return c;
         if (c.totalSpent > riskTarget.totalSpent) return c; // Prioritize highest spender at risk
         return riskTarget;
      }, null as any);

      if (atRiskCustomer) {
         lines.push({
          icon: <Users size={16} className="text-rose-500" />,
          text: `العميل الذهبي "${atRiskCustomer.name}" معرض للانقطاع (أكثر من 30 يوم بلا طلب).`
        });
      }
    }

    // 4. Operations / Suppliers
    if (data.suppliers && data.suppliers.length > 0) {
      const pendingSuppliers = data.suppliers.filter(s => s.status === 'pending' || s.status === 'partially_paid');
      const totalPending = pendingSuppliers.reduce((sum, s) => sum + s.balance, 0);
      if (totalPending > 0) {
         lines.push({
            icon: <AlertCircle size={16} className="text-orange-500" />,
            text: `الخطر التشغيلي: التزامات معلقة للموردين بقيمة ${totalPending.toFixed(3)} د.ك.`
         });
      }
    }

    // 5. Best Decision Today
    const pendingInvoices = filteredInvoices.filter(i => i.status === 'pending' || i.status === 'processing');
    if (pendingInvoices.length >= 3) {
      lines.push({
        icon: <Target size={16} className="text-indigo-500" />,
        text: `أفضل قرار: التركيز على تسريع التنفيذ لوجود طلبات قيد الانتظار حالياً.`
      });
    } else {
      lines.push({
        icon: <Target size={16} className="text-indigo-500" />,
        text: `أفضل قرار اليوم: التركيز على تسويق المنتجات ذات الهامش المرتفع في اللحظات الهادئة.`
      });
    }

    // 6. General
    lines.push({
      icon: <ShieldAlert size={16} className="text-slate-600" />,
      text: "راقب التكاليف التشغيلية لضمان ثبات الهامش الربحي."
    });

    return lines.slice(0, 6); // Max 6 lines
  }, [data, dateFilter]);

  return (
    <section
      className="w-full max-w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_14px_35px_rgba(15,23,42,0.07)]"
      dir="rtl"
      aria-label="مركز القيادة"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
        className="w-full max-w-full p-4 md:p-5 text-right flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-gradient-to-l from-white via-slate-50 to-amber-50/45 hover:from-slate-50 transition-colors cursor-pointer select-none"
      >
        <div className="min-w-0 flex items-start gap-3 md:gap-4">
          <div className="shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shadow-sm">
            <Zap size={21} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <Sparkles size={12} /> مركز القيادة
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {dateFilter === 'day' ? 'اليوم' :
                 dateFilter === 'week' ? 'هذا الأسبوع' :
                 dateFilter === 'month' ? 'هذا الشهر' :
                 dateFilter === 'year' ? 'هذا العام' : 'كل الأوقات'}
              </span>
            </div>
            <h2 className="text-base md:text-xl font-bold leading-snug text-slate-900 break-words">
              {greeting.title}
            </h2>
            <p className="text-xs md:text-sm font-medium leading-7 text-slate-500 break-words">
              {greeting.sub}
            </p>
            <div
              className={cn(
                "mt-3 max-w-4xl rounded-2xl border border-slate-200 bg-white/85 px-3 py-2.5 text-right shadow-sm",
                !partnerMode && onNavigate ? "cursor-pointer hover:bg-white transition-colors" : "cursor-default"
              )}
              role={!partnerMode && onNavigate ? 'button' : undefined}
              tabIndex={!partnerMode && onNavigate ? 0 : undefined}
              onClick={(e) => {
                if (partnerMode || !onNavigate) return;
                e.stopPropagation();
                onNavigate('products', { scrollTarget: 'product-quality-board' });
              }}
              onKeyDown={(e) => {
                if (partnerMode || !onNavigate) return;
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onNavigate('products', { scrollTarget: 'product-quality-board' });
                }
              }}
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-black text-amber-700">
                    <Target size={13} /> أولوية الآن
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs md:text-sm font-extrabold leading-6 text-slate-800">{qualityReport.decision || nowDecision.decision}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600"><Gauge size={13} /> جودة المنيو {qualityReport.score}%</span>
                  {!partnerMode && <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white">تفاصيل</span>}
                </div>
              </div>
            </div>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm md:min-w-[92px]">
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {isExpanded ? 'إغلاق' : 'فتح'}
        </span>
      </div>

      {isExpanded && (
        <div className="w-full max-w-full overflow-hidden border-t border-slate-100 bg-slate-50/70 p-3 md:p-4">
          <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0 xl:max-w-xl">
                <div className="flex items-center gap-2 text-xs font-black text-slate-500"><Target size={15} /> الأهم الآن</div>
                <h3 className="mt-1 text-base font-black text-slate-900 line-clamp-1">{qualityReport.title}</h3>
                <p className="mt-1 text-sm font-bold leading-7 text-slate-700 line-clamp-2">{qualityReport.action}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[300px]">
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[10px] font-black text-slate-400">فرصة</div>
                  <div className="mt-1 text-sm font-black text-slate-800 line-clamp-1">{qualityReport.opportunity?.title || 'لا توجد فرصة عاجلة'}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                  <div className="text-[10px] font-black text-slate-400">تنبيه</div>
                  <div className="mt-1 text-sm font-black text-slate-800 line-clamp-1">{qualityReport.risk?.title || 'لا يوجد تنبيه مهم'}</div>
                </div>
              </div>
              {partnerMode ? (
                <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black text-white">
                  <Gauge size={13} /> جودة المنيو {qualityReport.score}%
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate?.('products', { scrollTarget: 'product-quality-board' })}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black text-white hover:bg-slate-800 transition-colors"
                >
                  <Gauge size={13} /> جودة المنيو {qualityReport.score}%
                </button>
              )}
            </div>
          </div>
          <div className="grid w-full max-w-full grid-cols-1 gap-3 lg:grid-cols-2">
            {brief.map((item, idx) => (
              <div
                key={idx}
                className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 md:p-4 shadow-sm"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <p className="min-w-0 text-sm md:text-[15px] font-semibold leading-8 text-slate-700 break-words whitespace-normal">
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
