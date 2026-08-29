import React from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Gauge,
  Lock,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Workflow,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AppState } from '../types';
import { buildCEOCopilotSnapshot, coerceCopilotNarrative, getMetricText, type CopilotSnapshot } from '../lib/ceo-copilot';
import { cn } from '../lib/utils';

type CEOCopilotProps = {
  data: AppState;
  onNavigate?: (page: string) => void;
};

type CopilotNarrative = ReturnType<typeof coerceCopilotNarrative>;

const formatMetricValue = (value: number | string, unit?: string) => {
  if (typeof value === 'number') {
    const digits = unit === '%' ? 1 : unit === 'عملية' || unit === 'وحدة' ? 0 : 3;
    return `${value.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit ? ` ${unit}` : ''}`;
  }
  return `${value}${unit ? ` ${unit}` : ''}`;
};

const severityClass = (severity?: string) => {
  if (severity === 'critical' || severity === 'high') return 'border-rose-200 bg-rose-50 text-rose-900';
  if (severity === 'medium') return 'border-amber-200 bg-amber-50 text-amber-900';
  return 'border-emerald-200 bg-emerald-50 text-emerald-900';
};

const supplierStatusLabel = (status: string) => {
  if (status === 'missing-documents') return 'مستند ناقص';
  if (status === 'settlement-risk') return 'تسوية مطلوبة';
  return 'نظيف';
};

export const CEOCopilot: React.FC<CEOCopilotProps> = ({ data, onNavigate }) => {
  const snapshot = React.useMemo(() => buildCEOCopilotSnapshot(data), [data]);
  const [isExplaining, setIsExplaining] = React.useState(false);
  const [narrative, setNarrative] = React.useState<CopilotNarrative>(() => coerceCopilotNarrative(null, snapshot));
  const [approvedDraftId, setApprovedDraftId] = React.useState<string | null>(null);
  const [draftOverrides, setDraftOverrides] = React.useState<Record<string, string>>({});
  const [enhancingDraftId, setEnhancingDraftId] = React.useState<string | null>(null);
  const [flowPayload, setFlowPayload] = React.useState<any>(null);
  const [flowLoading, setFlowLoading] = React.useState(false);
  const [supplierIntel, setSupplierIntel] = React.useState<Record<string, any>>({});
  const [supplierLoadingId, setSupplierLoadingId] = React.useState<string | null>(null);

  // معالج آمن: أي رقم مالي يبقى من snapshot. النموذج يعيد نصًا/تفسيرًا فقط.
  const enhanceDraft = async (draft: (typeof snapshot.whatsappDrafts)[number]) => {
    setEnhancingDraftId(draft.id);
    try {
      const res = await fetch('/api/ai/ceo-copilot/whatsapp-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: { customerName: draft.customerName, reason: draft.reason, facts: [draft.source] } }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.draft) throw new Error('draft failed');
      setDraftOverrides((prev) => ({ ...prev, [draft.id]: String(payload.draft) }));
      toast.success('تم تحسين المسودة — الإرسال يبقى بيد الإنسان');
    } catch {
      toast.info('تعذّر تحسين المسودة الآن، المسودة المحلية سليمة');
    } finally {
      setEnhancingDraftId(null);
    }
  };

  const generateFlowPayload = async () => {
    const topName = snapshot.metrics.find((m) => m.id === 'product.top.quantity')?.label?.replace('أكثر منتج طلبًا: ', '') || '';
    setFlowLoading(true);
    try {
      const res = await fetch('/api/ai/ceo-copilot/campaign-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: { name: topName }, goal: 'زيادة الطلب' }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.copy) throw new Error('flow failed');
      setFlowPayload(payload);
      toast.success('payload الحملة جاهز لتسليمه إلى Flow');
    } catch {
      toast.info('تعذّر توليد الحملة الآن، جرّب مرة ثانية');
    } finally {
      setFlowLoading(false);
    }
  };

  const analyzeSupplier = async (item: (typeof snapshot.supplierDocuments)[number]) => {
    setSupplierLoadingId(item.id);
    try {
      const res = await fetch('/api/ai/ceo-copilot/supplier-intel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplier: { name: item.supplierName, due: item.due, invoices: item.invoices, missingRefs: item.missingRefs } }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok || !payload?.explanation) throw new Error('intel failed');
      setSupplierIntel((prev) => ({ ...prev, [item.id]: payload }));
      toast.success('تم تحليل فجوات المورد المستندية');
    } catch {
      toast.info('تعذّر تحليل المورد الآن');
    } finally {
      setSupplierLoadingId(null);
    }
  };

  const copyFlowPayload = () => {
    if (!flowPayload) return;
    navigator.clipboard?.writeText(JSON.stringify({ ...flowPayload, flowTrigger: snapshot.campaignPipeline.flowTrigger }, null, 2)).catch(() => undefined);
    toast.success('تم نسخ payload الحملة — الصقه في Flow');
  };

  React.useEffect(() => {
    setNarrative(coerceCopilotNarrative(null, snapshot));
  }, [snapshot]);

  const explainWithGemini = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch('/api/ai/ceo-copilot/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error || `CEO Copilot failed: ${res.status}`);
      setNarrative(coerceCopilotNarrative(payload?.narrative, snapshot));
      toast.success('تم ترتيب قرارات CEO Copilot من Gemini بدون فتح باب الأرقام');
    } catch (error) {
      console.warn('CEO Copilot narrative fallback:', error);
      toast.info('تم استخدام الترتيب المحلي لأن شرح Gemini غير متاح الآن');
      setNarrative(coerceCopilotNarrative(null, snapshot));
    } finally {
      setIsExplaining(false);
    }
  };

  const metricById = React.useMemo(() => new Map(snapshot.metrics.map((m) => [m.id, m])), [snapshot.metrics]);
  const prioritizedDecisions = narrative.priorityDecisionIds.length
    ? narrative.priorityDecisionIds.map((id) => snapshot.decisions.find((d) => d.id === id)).filter(Boolean)
    : snapshot.decisions;

  const opportunityMetrics = narrative.opportunityMetricIds.length
    ? narrative.opportunityMetricIds.map((id) => metricById.get(id)).filter(Boolean)
    : snapshot.metrics.filter((m) => ['product.top.quantity', 'product.top.revenue', 'orders.avg_value', 'profit.margin'].includes(m.id));

  const riskMetrics = narrative.riskMetricIds.length
    ? narrative.riskMetricIds.map((id) => metricById.get(id)).filter(Boolean)
    : snapshot.metrics.filter((m) => ['orders.failed_payment', 'orders.pending_payment', 'suppliers.outstanding', 'cash.available'].includes(m.id));

  return (
    <section className="w-full space-y-5 md:space-y-6" dir="rtl" aria-label="CEO Copilot">
      <div className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-6 shadow-[0_20px_60px_-42px_rgba(15,23,42,0.55)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-amber-300">
              <Gauge size={22} />
            </div>
            <div className="min-w-0 text-right">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                  <Lock size={12} /> Numbers locked
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600">
                  <ShieldCheck size={12} /> Gemini explains only
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-normal text-slate-950 md:text-3xl">CEO Copilot</h2>
              <p className="mt-2 max-w-3xl text-sm font-bold leading-7 text-slate-500">
                {snapshot.integrity.rule}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={explainWithGemini}
            disabled={isExplaining}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg transition-all hover:bg-slate-800 disabled:opacity-60"
          >
            {isExplaining ? <RefreshCw size={17} className="animate-spin" /> : <Bot size={17} />}
            رتّب القرار بـGemini
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {snapshot.metrics.slice(0, 8).map((item) => (
            <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
              <span className="block text-[10px] font-black uppercase text-slate-400">{item.source}</span>
              <strong className="mt-2 block text-sm font-black text-slate-800">{item.label}</strong>
              <span className="mt-2 block font-mono text-xl font-black text-slate-950">{formatMetricValue(item.value, item.unit)}</span>
            </article>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="space-y-5 xl:col-span-7">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><ClipboardCheck size={20} /> ترتيب القرارات</h3>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-500">Function calling ready</span>
            </div>
            {narrative.summary && (
              <p className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-sm font-bold leading-7 text-indigo-900">
                {narrative.summary}
              </p>
            )}
            <div className="space-y-3">
              {prioritizedDecisions.slice(0, 6).map((decision: any) => (
                <article key={decision.id} className={cn('rounded-2xl border p-4 text-right', severityClass(decision.severity))}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <strong className="block text-base font-black">{decision.title}</strong>
                      <p className="mt-2 text-sm font-bold leading-7 opacity-85">{decision.action}</p>
                    </div>
                    {decision.route && onNavigate && (
                      <button
                        type="button"
                        onClick={() => onNavigate(decision.route)}
                        className="inline-flex min-h-[40px] shrink-0 items-center justify-center gap-2 rounded-xl bg-white/80 px-3 py-2 text-xs font-black text-slate-800 shadow-sm"
                      >
                        افتح الأداة <ArrowLeft size={14} />
                      </button>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {decision.evidenceMetricIds.map((id: string) => {
                      const text = getMetricText(snapshot, id);
                      return text ? <span key={id} className="rounded-full bg-white/75 px-3 py-1 text-[11px] font-black text-slate-700">{text}</span> : null;
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><AlertTriangle size={20} /> تفسير الشذوذ</h3>
            <div className="space-y-3">
              {snapshot.anomalies.length ? snapshot.anomalies.map((item) => (
                <article key={item.id} className={cn('rounded-2xl border p-4 text-right', severityClass(item.severity))}>
                  <strong className="block text-sm font-black">{item.title}</strong>
                  <p className="mt-2 text-sm font-bold leading-7 opacity-85">{item.explanation}</p>
                  <p className="mt-2 text-xs font-black text-slate-700">{item.action}</p>
                </article>
              )) : (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-black text-emerald-800">
                  لا يوجد شذوذ مؤثر من الأرقام الحالية.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-5">
          <section className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><FileSearch size={20} /> ذكاء المورد والمستند</h3>
            <div className="space-y-3">
              {snapshot.supplierDocuments.slice(0, 5).map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm font-black text-slate-900">{item.supplierName}</strong>
                    <span className={cn('rounded-full px-3 py-1 text-[11px] font-black', item.status === 'clean' ? 'bg-emerald-100 text-emerald-700' : item.status === 'missing-documents' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700')}>
                      {supplierStatusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-bold leading-6 text-slate-500">{item.explanation}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-black text-slate-700">
                    <span className="rounded-full bg-white px-3 py-1">مستحق: {formatMetricValue(item.due, 'د.ك')}</span>
                    <span className="rounded-full bg-white px-3 py-1">فواتير مفتوحة: {item.invoices}</span>
                    <button
                      type="button"
                      onClick={() => analyzeSupplier(item)}
                      disabled={supplierLoadingId === item.id}
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-full bg-slate-950 px-3 py-1 text-[11px] font-black text-white disabled:opacity-60"
                    >
                      {supplierLoadingId === item.id ? <RefreshCw size={12} className="animate-spin" /> : <FileSearch size={12} />}
                      حلّل الفجوات
                    </button>
                  </div>
                  {supplierIntel[item.id] && (
                    <div className="mt-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-right">
                      <ul className="list-disc space-y-1 pr-4 text-[11px] font-bold text-indigo-900">
                        {(supplierIntel[item.id].findings || []).map((f: string, i: number) => <li key={i}>{f}</li>)}
                      </ul>
                      <p className="mt-2 text-[11px] font-bold leading-6 text-slate-600">{supplierIntel[item.id].explanation}</p>
                      <p className="mt-1 text-[11px] font-black text-slate-800">{supplierIntel[item.id].action}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900"><MessageSquare size={20} /> مسودات واتساب</h3>
            <div className="space-y-3">
              {snapshot.whatsappDrafts.length ? snapshot.whatsappDrafts.map((draft) => (
                <article key={draft.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block text-sm font-black text-slate-900">{draft.customerName}</strong>
                      <span className="text-[11px] font-bold text-slate-500">{draft.reason}</span>
                    </div>
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700">اعتماد بشري</span>
                  </div>
                  <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold leading-7 text-slate-700">{draftOverrides[draft.id] || draft.draft}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setApprovedDraftId(draft.id);
                        navigator.clipboard?.writeText(draftOverrides[draft.id] || draft.draft).catch(() => undefined);
                        toast.success('تم اعتماد المسودة ونسخها، الإرسال يبقى بيد الإنسان');
                      }}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                    >
                      {approvedDraftId === draft.id ? <CheckCircle2 size={14} /> : <Send size={14} />}
                      اعتماد ونسخ
                    </button>
                    <button
                      type="button"
                      onClick={() => enhanceDraft(draft)}
                      disabled={enhancingDraftId === draft.id}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-60"
                    >
                      {enhancingDraftId === draft.id ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      حسّن بـGemini
                    </button>
                  </div>
                </article>
              )) : (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-black text-slate-500">
                  لا توجد محادثة أو حالة عميل تستحق مسودة الآن.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><Workflow size={20} /> Content campaign pipeline جاهز لـFlow</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700">{snapshot.campaignPipeline.flowTrigger}</span>
            <button
              type="button"
              onClick={generateFlowPayload}
              disabled={flowLoading}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
            >
              {flowLoading ? <RefreshCw size={15} className="animate-spin" /> : <Sparkles size={15} />}
              ولّد payload الحملة
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {snapshot.campaignPipeline.stages.map((stage) => (
            <article key={stage.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-right">
              <div className="flex items-center justify-between gap-2">
                <strong className="text-sm font-black text-slate-900">{stage.title}</strong>
                <Sparkles size={16} className={stage.status === 'ready' ? 'text-emerald-600' : 'text-amber-600'} />
              </div>
              <span className="mt-2 block text-[11px] font-black text-slate-400">{stage.owner}</span>
              <p className="mt-2 text-xs font-bold leading-6 text-slate-600">{stage.output}</p>
            </article>
          ))}
        </div>

        {flowPayload && (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-right">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm font-black text-indigo-900">الحملة جاهزة للتسليم إلى Flow</strong>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black text-amber-700">اعتماد بشري قبل النشر</span>
                <button type="button" onClick={copyFlowPayload} className="inline-flex min-h-[36px] items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white">
                  <ClipboardCheck size={14} /> نسخ payload
                </button>
              </div>
            </div>
            <p className="text-sm font-bold text-slate-700">{flowPayload.idea}</p>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="rounded-xl bg-white p-3"><span className="text-[10px] font-black text-slate-400">HOOK</span><p className="mt-1 text-xs font-bold text-slate-800">{flowPayload.copy?.hook}</p></div>
              <div className="rounded-xl bg-white p-3"><span className="text-[10px] font-black text-slate-400">BODY</span><p className="mt-1 text-xs font-bold text-slate-800">{flowPayload.copy?.body}</p></div>
              <div className="rounded-xl bg-white p-3"><span className="text-[10px] font-black text-slate-400">CTA</span><p className="mt-1 text-xs font-bold text-slate-800">{flowPayload.copy?.cta}</p></div>
            </div>
            {Array.isArray(flowPayload.storyboard) && flowPayload.storyboard.length > 0 && (
              <div className="mt-3 space-y-2">
                {flowPayload.storyboard.map((s: any, i: number) => (
                  <div key={i} className="rounded-xl bg-white p-3 text-xs font-bold text-slate-700">
                    <span className="font-black text-slate-900">مشهد {s.scene}:</span> {s.visual} — <span className="text-slate-500">{s.text}</span>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(flowPayload.imagePrompts) && flowPayload.imagePrompts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {flowPayload.imagePrompts.map((p: string, i: number) => (
                  <span key={i} className="rounded-full bg-white px-3 py-1 text-[10px] font-mono font-bold text-indigo-700">{p}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-right">
          <h4 className="text-sm font-black text-emerald-900">فرص موثقة</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {opportunityMetrics.slice(0, 5).map((item: any) => (
              <span key={item.id} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-emerald-800">{formatMetricValue(item.value, item.unit)} · {item.label}</span>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-right">
          <h4 className="text-sm font-black text-rose-900">مخاطر موثقة</h4>
          <div className="mt-3 flex flex-wrap gap-2">
            {riskMetrics.slice(0, 5).map((item: any) => (
              <span key={item.id} className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-rose-800">{formatMetricValue(item.value, item.unit)} · {item.label}</span>
            ))}
          </div>
        </div>
      </section>
    </section>
  );
};

export default CEOCopilot;
