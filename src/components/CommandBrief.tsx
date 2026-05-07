import React, { useMemo, useState } from 'react';
import { AppState } from '../types';
import { AlertCircle, Target, Users, TrendingUp, Zap, ShieldAlert, ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils'; // if cn exists, we can use standard template literals if we are unsure, wait, cn is standard here

interface Props {
  data: AppState;
  dateFilter?: 'day' | 'week' | 'month' | 'year' | 'all';
}

export function CommandBrief({ data, dateFilter = 'day' }: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

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
      if (topZoneName && zoneCounts[topZoneName] >= 2) {
        lines.push({
          icon: <TrendingUp size={16} className="text-amber-500" />,
          text: `الطلب متزايد على منطقة ${topZoneName} خلال ${dateFilter === 'day' ? 'اليوم' : 'الفترة المحددة'} (${zoneCounts[topZoneName]} طلبات).`
        });
      }
    }
    
    if (lines.length === 0) {
      lines.push({
        icon: <TrendingUp size={16} className="text-blue-500" />,
        text: `لا توجد بيانات كافية لتوقع ذروة الطلبات خلال ${dateFilter === 'day' ? 'اليوم' : 'الفترة المحددة'}.`
      });
    }

    // Calculate product sales to use for margins/stock metrics
    const productSales: Record<string, number> = {};
    (data.invoices || []).forEach(inv => {
      if (inv.isDeleted) return;
      inv.items.forEach(item => {
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
    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden" dir="rtl">
      {/* Decorative effect */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-amber-500 to-indigo-500 opacity-50" />
      
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 text-amber-300 p-2 rounded-xl group-hover:bg-amber-500/30 transition-colors">
            <ArrowUpRight size={20} />
          </div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            التقرير التنفيذي
            <span className="text-xs bg-white/10 text-white/70 px-2 py-1 rounded-md font-bold">
              {dateFilter === 'day' ? 'اليوم' : 
               dateFilter === 'week' ? 'هذا الأسبوع' : 
               dateFilter === 'month' ? 'هذا الشهر' : 
               dateFilter === 'year' ? 'هذا العام' : 'كل الأوقات'}
            </span>
          </h2>
        </div>
        <button className="text-slate-400 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 24 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            className="space-y-4 relative z-10 overflow-hidden"
          >
            {brief.map((item, idx) => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={idx} 
                className="flex items-start gap-3 bg-white/5 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-colors"
              >
                <div className="bg-white/10 p-1.5 rounded-lg mt-0.5 shrink-0">
                  {item.icon}
                </div>
                <p className="text-slate-200 text-sm font-bold leading-relaxed">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
