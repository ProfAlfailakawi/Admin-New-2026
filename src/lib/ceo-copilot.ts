import type { AppState, AICampaign } from '../types';
import { isPaidStatus, isFailedStatus, isPendingStatus } from './status-utils';
import { getUnifiedInvoices } from './utils';
import { getCashPositionForState, getSupplierSettlementForState } from './business-logic';
import { generateHiddenRisks, generateRealProfitAnalysis, generateStructuredCampaign, simulateWhatIfScenario } from './ai-engine';
import { computeInvoiceCost, computeInvoiceGatewayFee, computeInvoiceProfit, computeInvoiceTotal } from './invoice-calculations';

const kwd = (value: any) => Math.round(Number(value || 0) * 1000) / 1000;

const daysAgo = (value: any) => {
  const time = new Date(value || 0).getTime();
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / 86400000));
};

export type CopilotSeverity = 'critical' | 'high' | 'medium' | 'low';
export type CopilotFactKind = 'money' | 'percent' | 'count' | 'text';

export interface CopilotMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  kind: CopilotFactKind;
  source: string;
}

export interface CopilotDecision {
  id: string;
  title: string;
  severity: CopilotSeverity;
  domain: 'finance' | 'supplier' | 'customer' | 'operation' | 'growth' | 'content';
  evidenceMetricIds: string[];
  action: string;
  route?: string;
}

export interface CopilotAnomaly {
  id: string;
  title: string;
  severity: CopilotSeverity;
  metricId: string;
  baselineMetricId?: string;
  explanation: string;
  action: string;
}

export interface CopilotSupplierDocument {
  id: string;
  supplierId: string;
  supplierName: string;
  status: 'missing-documents' | 'settlement-risk' | 'clean';
  due: number;
  invoices: number;
  missingRefs: string[];
  explanation: string;
}

export interface CopilotWhatsAppDraft {
  id: string;
  customerId?: string;
  customerName: string;
  phone?: string;
  reason: string;
  draft: string;
  approvalState: 'needs_human_approval';
  source: string;
}

export interface CopilotCampaignPipeline {
  id: string;
  title: string;
  status: 'ready_for_flow';
  flowTrigger: string;
  campaign: AICampaign | null;
  stages: Array<{
    id: string;
    title: string;
    owner: 'CEO Copilot' | 'Flow' | 'Human';
    status: 'ready' | 'waiting_approval';
    output: string;
  }>;
}

export interface CopilotSnapshot {
  generatedAt: string;
  integrity: {
    mode: 'numbers_locked';
    rule: string;
    financialSources: string[];
  };
  metrics: CopilotMetric[];
  decisions: CopilotDecision[];
  anomalies: CopilotAnomaly[];
  supplierDocuments: CopilotSupplierDocument[];
  whatsappDrafts: CopilotWhatsAppDraft[];
  campaignPipeline: CopilotCampaignPipeline;
}

const metric = (id: string, label: string, value: number | string, kind: CopilotFactKind, source: string, unit?: string): CopilotMetric => ({
  id,
  label,
  value: typeof value === 'number' ? kwd(value) : value,
  kind,
  source,
  unit,
});

const metricValue = (metrics: CopilotMetric[], id: string) => Number(metrics.find((m) => m.id === id)?.value || 0);

export function buildCEOCopilotSnapshot(data: AppState): CopilotSnapshot {
  const unifiedInvoices = getUnifiedInvoices(data).filter((inv: any) => inv && !inv.isDeleted);
  const paidInvoices = unifiedInvoices.filter((inv: any) => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined);
  const pendingPayments = unifiedInvoices.filter((inv: any) => isPendingStatus(inv.paymentStatus || inv.status));
  const failedPayments = unifiedInvoices.filter((inv: any) => isFailedStatus(inv.paymentStatus || inv.status));
  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const sixtyDaysAgo = Date.now() - 60 * 86400000;
  const recentPaid = paidInvoices.filter((inv: any) => new Date(inv.date).getTime() >= thirtyDaysAgo);
  const previousPaid = paidInvoices.filter((inv: any) => {
    const t = new Date(inv.date).getTime();
    return t >= sixtyDaysAgo && t < thirtyDaysAgo;
  });

  const revenue = kwd(paidInvoices.reduce((sum: number, inv: any) => sum + computeInvoiceTotal(inv, data.products || []), 0));
  const cost = kwd(paidInvoices.reduce((sum: number, inv: any) => sum + computeInvoiceCost(inv, data.products || []), 0));
  const gatewayFees = kwd(paidInvoices.reduce((sum: number, inv: any) => sum + computeInvoiceGatewayFee(inv), 0));
  const profit = kwd(paidInvoices.reduce((sum: number, inv: any) => sum + computeInvoiceProfit(inv, data.products || []), 0));
  const recentRevenue = kwd(recentPaid.reduce((sum: number, inv: any) => sum + computeInvoiceTotal(inv, data.products || []), 0));
  const previousRevenue = kwd(previousPaid.reduce((sum: number, inv: any) => sum + computeInvoiceTotal(inv, data.products || []), 0));
  const margin = revenue > 0 ? kwd((profit / revenue) * 100) : 0;
  const avgOrder = paidInvoices.length > 0 ? kwd(revenue / paidInvoices.length) : 0;
  const cash = getCashPositionForState(data);

  const productStats = (data.products || []).map((product: any) => {
    let quantity = 0;
    let productRevenue = 0;
    let productCost = 0;
    paidInvoices.forEach((inv: any) => {
      (inv.items || []).forEach((item: any) => {
        const same = String(item.productId || '') === String(product.id);
        if (!same) return;
        const qty = Number(item.quantity || 0);
        quantity += qty;
        productRevenue += qty * Number(item.priceAtTime ?? product.price ?? 0);
        productCost += qty * Number(item.costAtTime ?? product.cost ?? 0);
      });
    });
    return {
      id: String(product.id || ''),
      name: String(product.name || 'منتج غير مسمى'),
      quantity,
      revenue: kwd(productRevenue),
      cost: kwd(productCost),
      profit: kwd(productRevenue - productCost),
      margin: productRevenue > 0 ? kwd(((productRevenue - productCost) / productRevenue) * 100) : 0,
    };
  }).filter((p) => p.id);

  const topProduct = [...productStats].sort((a, b) => b.quantity - a.quantity)[0];
  const weakProduct = [...productStats].filter((p) => p.quantity > 0).sort((a, b) => a.margin - b.margin)[0];
  const realProfit = generateRealProfitAnalysis(data);
  const hiddenRisks = generateHiddenRisks(data);
  const whatIfProductId = weakProduct?.id || topProduct?.id || data.products?.[0]?.id;
  const priceScenario = whatIfProductId
    ? simulateWhatIfScenario(data, { type: 'price_change', productId: whatIfProductId, percentChange: 0.1 })
    : null;

  const supplierSettlements = (data.suppliers || []).map((supplier: any) => {
    const settlement = getSupplierSettlementForState(String(supplier.id), data);
    return { supplier, settlement };
  });
  const totalSupplierDue = kwd(supplierSettlements.reduce((sum, row) => sum + Number(row.settlement.outstanding || 0), 0));
  const topSupplier = [...supplierSettlements].sort((a, b) => Number(b.settlement.outstanding || 0) - Number(a.settlement.outstanding || 0))[0];

  const atRiskCustomers = (data.customers || [])
    .filter((customer: any) => daysAgo(customer.lastOrderDate || customer.lastActive) > 30 && Number(customer.totalOrders || 0) > 1)
    .sort((a: any, b: any) => Number(b.totalSpent || 0) - Number(a.totalSpent || 0));
  const topChurnCustomer = atRiskCustomers[0];

  const metrics: CopilotMetric[] = [
    metric('revenue.total_paid', 'إجمالي الإيراد المدفوع', revenue, 'money', 'computeInvoiceTotal(paid unified invoices)', 'د.ك'),
    metric('cost.total_paid', 'إجمالي التكلفة', cost, 'money', 'computeInvoiceCost(paid unified invoices)', 'د.ك'),
    metric('fees.gateway', 'رسوم بوابة الدفع', gatewayFees, 'money', 'computeInvoiceGatewayFee(paid unified invoices)', 'د.ك'),
    metric('profit.real', 'الربح الحقيقي', profit, 'money', 'computeInvoiceProfit(paid unified invoices)', 'د.ك'),
    metric('profit.margin', 'هامش الربح', margin, 'percent', 'profit.real / revenue.total_paid', '%'),
    metric('cash.available', 'رصيد السيولة', cash.balance, 'money', 'getCashPositionForState', 'د.ك'),
    metric('orders.paid_count', 'عدد العمليات المدفوعة', paidInvoices.length, 'count', 'paid unified invoices', 'عملية'),
    metric('orders.pending_payment', 'بانتظار الدفع', pendingPayments.length, 'count', 'status-utils:isPendingStatus', 'عملية'),
    metric('orders.failed_payment', 'فشل الدفع', failedPayments.length, 'count', 'status-utils:isFailedStatus', 'عملية'),
    metric('orders.avg_value', 'متوسط قيمة الطلب', avgOrder, 'money', 'revenue.total_paid / orders.paid_count', 'د.ك'),
    metric('revenue.last_30_days', 'إيراد آخر 30 يوم', recentRevenue, 'money', 'paid invoices within 30 days', 'د.ك'),
    metric('revenue.previous_30_days', 'إيراد 30 يوم السابقة', previousRevenue, 'money', 'paid invoices 31-60 days', 'د.ك'),
    metric('suppliers.outstanding', 'مستحقات الموردين', totalSupplierDue, 'money', 'getSupplierSettlementForState(all suppliers)', 'د.ك'),
  ];

  if (topProduct) {
    metrics.push(metric('product.top.quantity', `أكثر منتج طلبًا: ${topProduct.name}`, topProduct.quantity, 'count', 'paid invoice item quantities', 'وحدة'));
    metrics.push(metric('product.top.revenue', `إيراد ${topProduct.name}`, topProduct.revenue, 'money', 'paid invoice item revenue', 'د.ك'));
  }
  if (weakProduct) {
    metrics.push(metric('product.weak.margin', `أضعف هامش مبيع: ${weakProduct.name}`, weakProduct.margin, 'percent', 'paid invoice product margin', '%'));
  }
  if (topSupplier?.supplier) {
    metrics.push(metric('supplier.top_due', `أعلى مورد مستحق: ${topSupplier.supplier.name}`, topSupplier.settlement.outstanding, 'money', 'getSupplierSettlementForState', 'د.ك'));
  }
  if (priceScenario) {
    metrics.push(metric('what_if.projected_profit_10pct', 'ربح سيناريو رفع السعر 10%', priceScenario.projectedMonthlyProfit, 'money', 'simulateWhatIfScenario', 'د.ك'));
    metrics.push(metric('what_if.current_profit', 'الربح الحالي في المحاكاة', priceScenario.currentMonthlyProfit, 'money', 'simulateWhatIfScenario', 'د.ك'));
  }

  const anomalies: CopilotAnomaly[] = [];
  if (failedPayments.length > 0) {
    anomalies.push({
      id: 'anomaly.failed-payments',
      title: 'فشل دفع يحتاج متابعة',
      severity: failedPayments.length >= 3 ? 'high' : 'medium',
      metricId: 'orders.failed_payment',
      explanation: 'عدد عمليات فشل الدفع مشتق من حالة الدفع الفعلية، وليس من تحليل لغوي.',
      action: 'راجع أحدث عمليات فشل الدفع وأعد إرسال رابط الدفع بعد تأكيد السبب مع العميل.',
    });
  }
  if (previousRevenue > 0 && recentRevenue < previousRevenue * 0.75) {
    anomalies.push({
      id: 'anomaly.revenue-drop',
      title: 'هبوط إيراد آخر 30 يوم',
      severity: 'high',
      metricId: 'revenue.last_30_days',
      baselineMetricId: 'revenue.previous_30_days',
      explanation: 'الإيراد المدفوع في آخر 30 يوم أقل من 75% من فترة المقارنة السابقة.',
      action: 'ابدأ حملة عودة للعملاء المنقطعين قبل تخفيض الأسعار العامة.',
    });
  }
  const weakRealProfit = realProfit.find((item) => item.riskLevel === 'high');
  if (weakRealProfit) {
    metrics.push(metric(`profit.product.${weakRealProfit.productId}`, `ربح حقيقي: ${weakRealProfit.productName}`, weakRealProfit.realProfitValue, 'money', 'generateRealProfitAnalysis', 'د.ك'));
    anomalies.push({
      id: `anomaly.product-profit-${weakRealProfit.productId}`,
      title: `نزيف هامش في ${weakRealProfit.productName}`,
      severity: 'high',
      metricId: `profit.product.${weakRealProfit.productId}`,
      explanation: weakRealProfit.explanation,
      action: weakRealProfit.recommendation,
    });
  }
  if (cash.anchorNeeded) {
    anomalies.push({
      id: 'anomaly.cash-anchor',
      title: 'السيولة تحتاج نقطة افتتاحية',
      severity: 'medium',
      metricId: 'cash.available',
      explanation: 'السجلات الحالية تحتوي منصرفات قديمة أكثر من الإيرادات المتبقية، لذلك يشرح محرك السيولة الحاجة إلى رصيد افتتاحي.',
      action: 'ثبت رصيد افتتاحي موثق من الإعدادات حتى يبقى رقم السيولة مطابقًا للواقع.',
    });
  }

  const decisions: CopilotDecision[] = [
    {
      id: 'decision.payment-followup',
      title: failedPayments.length > 0 ? 'ابدأ بفشل الدفع قبل التسويق' : 'تابع المدفوعات المعلقة بهدوء',
      severity: failedPayments.length > 0 ? 'high' : 'low',
      domain: 'operation',
      evidenceMetricIds: ['orders.failed_payment', 'orders.pending_payment'],
      action: failedPayments.length > 0
        ? 'افتح تقارير الفواتير وراجع آخر فشل دفع قبل إطلاق أي حملة.'
        : 'لا توجد إشارة فشل بارزة؛ أبق المتابعة على المدفوعات المعلقة فقط.',
      route: 'reports',
    },
    {
      id: 'decision.supplier-settlement',
      title: totalSupplierDue > 0 ? 'رتب سداد الموردين حسب المستحق الفعلي' : 'لا توجد مديونية موردين مؤثرة',
      severity: totalSupplierDue > 0 ? 'medium' : 'low',
      domain: 'supplier',
      evidenceMetricIds: ['suppliers.outstanding', 'supplier.top_due'],
      action: totalSupplierDue > 0
        ? 'افتح مراجعة الموردين وسدد من أعلى مورد مستحق حسب محرك التسوية.'
        : 'استمر في مراقبة الفواتير القادمة بدون تسجيل دفعات احتياطية.',
      route: 'suppliers-audit',
    },
  ];
  if (topChurnCustomer) {
    metrics.push(metric('customer.churn_value', `قيمة عميل معرض للانقطاع: ${topChurnCustomer.name}`, topChurnCustomer.totalSpent, 'money', 'customer totals recalculated from paid invoices', 'د.ك'));
    decisions.push({
      id: 'decision.customer-reactivation',
      title: `استرجاع ${topChurnCustomer.name}`,
      severity: 'medium',
      domain: 'customer',
      evidenceMetricIds: ['customer.churn_value'],
      action: 'استخدم مسودة واتساب مخصصة واعتمدها بشريًا قبل الإرسال.',
      route: 'whatsapp-support',
    });
  }
  if (topProduct) {
    decisions.push({
      id: 'decision.content-flow',
      title: `جهز حملة Flow حول ${topProduct.name}`,
      severity: 'medium',
      domain: 'content',
      evidenceMetricIds: ['product.top.quantity', 'product.top.revenue'],
      action: 'حوّل المنتج الأعلى طلبًا إلى pipeline محتوى: فكرة، واتساب، منشور، اعتماد، ثم Flow.',
      route: 'smart-studio',
    });
  }
  hiddenRisks.slice(0, 2).forEach((risk) => {
    decisions.push({
      id: `decision.hidden-risk-${risk.id}`,
      title: risk.title,
      severity: risk.impactLevel === 'high' ? 'high' : 'medium',
      domain: risk.iconType === 'supplier' ? 'supplier' : risk.iconType === 'customer' ? 'customer' : 'finance',
      evidenceMetricIds: ['profit.real', 'profit.margin'],
      action: risk.recommendedAction,
      route: risk.iconType === 'supplier' ? 'suppliers-audit' : risk.iconType === 'customer' ? 'customers' : 'profit-guard',
    });
  });

  const supplierDocuments: CopilotSupplierDocument[] = supplierSettlements.slice(0, 8).map(({ supplier, settlement }) => {
    const openInvoices = settlement.invoices.filter((inv: any) => !inv.isPaid);
    const missingRefs = openInvoices
      .filter((inv: any) => !inv.refId || String(inv.refId).startsWith('ORD-'))
      .map((inv: any) => inv.refId || inv.id)
      .slice(0, 4);
    const status: CopilotSupplierDocument['status'] = missingRefs.length > 0
      ? 'missing-documents'
      : settlement.outstanding > 0
        ? 'settlement-risk'
        : 'clean';
    return {
      id: `supplier-doc-${supplier.id}`,
      supplierId: String(supplier.id),
      supplierName: supplier.name,
      status,
      due: kwd(settlement.outstanding),
      invoices: openInvoices.length,
      missingRefs,
      explanation: status === 'missing-documents'
        ? 'يوجد مستحق مفتوح يحتاج رقم فاتورة/مرجع أو مستند توريد قبل السداد النهائي.'
        : status === 'settlement-risk'
          ? 'المستحق محسوب من محرك التسوية المركزي ويحتاج جدولة دفع.'
          : 'لا توجد ملاحظات مستندية ظاهرة من السجلات الحالية.',
    };
  }).sort((a, b) => b.due - a.due);

  const whatsappDrafts: CopilotWhatsAppDraft[] = [];
  if (topChurnCustomer) {
    whatsappDrafts.push({
      id: `wa-churn-${topChurnCustomer.id}`,
      customerId: String(topChurnCustomer.id),
      customerName: topChurnCustomer.name,
      phone: topChurnCustomer.phone,
      reason: `منقطع ${daysAgo(topChurnCustomer.lastOrderDate || topChurnCustomer.lastActive)} يوم، وقيمته ${kwd(topChurnCustomer.totalSpent)} د.ك من السجلات.`,
      draft: `حياك الله ${topChurnCustomer.name}، لاحظنا لك فترة ما طلبت منا. جهزنا لك اقتراح يناسب ذوقك، وإذا تحب نرتب طلبك اليوم نراجعه لك قبل التأكيد.`,
      approvalState: 'needs_human_approval',
      source: 'customers.lastOrderDate + customers.totalSpent',
    });
  }
  if (failedPayments[0]) {
    const inv = failedPayments[0] as any;
    whatsappDrafts.push({
      id: `wa-failed-${inv.id}`,
      customerId: inv.customerId,
      customerName: inv.customerName || 'عميلنا العزيز',
      phone: inv.customerPhone,
      reason: `فاتورة/طلب ${inv.id} بحالة فشل دفع حسب حالة الدفع المسجلة.`,
      draft: `حياك الله، حاولنا نثبت دفعتك للطلب ${inv.id} لكنها ظاهرة عندنا كفشل دفع. إذا تحب نرسل لك رابط دفع جديد أو نراجع العملية معك، أنا حاضر.`,
      approvalState: 'needs_human_approval',
      source: 'unified invoice paymentStatus',
    });
  }

  const campaign = topProduct ? generateStructuredCampaign(data, 'زيادة الطلب') : null;
  const campaignPipeline: CopilotCampaignPipeline = {
    id: 'flow-campaign-pipeline',
    title: topProduct ? `Pipeline حملة ${topProduct.name}` : 'Pipeline حملة جاهز عند توفر مبيعات',
    status: 'ready_for_flow',
    flowTrigger: 'ceo_copilot.campaign.ready_for_flow',
    campaign,
    stages: [
      { id: 'fact-lock', title: 'قفل الحقائق', owner: 'CEO Copilot', status: 'ready', output: topProduct ? `المنتج: ${topProduct.name} / المبيعات: ${topProduct.quantity} وحدة` : 'بانتظار منتج مثبت بالمبيعات' },
      { id: 'draft-copy', title: 'مسودة الرسائل', owner: 'CEO Copilot', status: campaign ? 'ready' : 'waiting_approval', output: campaign?.marketingMessage || campaign?.message || 'لا توجد مسودة حملة بعد' },
      { id: 'human-approval', title: 'اعتماد بشري', owner: 'Human', status: 'waiting_approval', output: 'لا إرسال واتساب ولا نشر قبل الاعتماد' },
      { id: 'flow-dispatch', title: 'تسليم Flow', owner: 'Flow', status: 'ready', output: 'payload منظم: audience, message, timing, approvalState' },
    ],
  };

  return {
    generatedAt: new Date().toISOString(),
    integrity: {
      mode: 'numbers_locked',
      rule: 'كل رقم مالي أو تشغيلي معروض هنا مشتق من business logic/data. Gemini يفسر ويرتب فقط ولا ينتج أرقامًا مالية جديدة.',
      financialSources: [
        'getUnifiedInvoices',
        'computeInvoiceTotal',
        'computeInvoiceCost',
        'computeInvoiceProfit',
        'getCashPositionForState',
        'getSupplierSettlementForState',
        'simulateWhatIfScenario',
      ],
    },
    metrics,
    decisions: decisions.slice(0, 7),
    anomalies,
    supplierDocuments,
    whatsappDrafts,
    campaignPipeline,
  };
}

export function coerceCopilotNarrative(raw: any, snapshot: CopilotSnapshot) {
  const metricIds = new Set(snapshot.metrics.map((m) => m.id));
  const decisionIds = new Set(snapshot.decisions.map((d) => d.id));
  const anomalyIds = new Set(snapshot.anomalies.map((a) => a.id));
  const safeList = (value: any) => Array.isArray(value) ? value : [];
  return {
    summary: String(raw?.summary || 'تم ترتيب قرارات CEO Copilot من الأرقام المقفلة داخل النظام.').slice(0, 500),
    priorityDecisionIds: safeList(raw?.priorityDecisionIds).filter((id: any) => decisionIds.has(String(id))).slice(0, 5),
    anomalyExplanationIds: safeList(raw?.anomalyExplanationIds).filter((id: any) => anomalyIds.has(String(id))).slice(0, 5),
    opportunityMetricIds: safeList(raw?.opportunityMetricIds).filter((id: any) => metricIds.has(String(id))).slice(0, 6),
    riskMetricIds: safeList(raw?.riskMetricIds).filter((id: any) => metricIds.has(String(id))).slice(0, 6),
    executiveOrder: String(raw?.executiveOrder || '').slice(0, 400),
    numberPolicy: 'validated_against_snapshot',
  };
}

export function getMetricText(snapshot: CopilotSnapshot, id: string) {
  const item = snapshot.metrics.find((m) => m.id === id);
  if (!item) return '';
  const suffix = item.unit ? ` ${item.unit}` : '';
  return `${item.label}: ${item.value}${suffix}`;
}

export function getCopilotMetricNumber(snapshot: CopilotSnapshot, id: string) {
  return metricValue(snapshot.metrics, id);
}
