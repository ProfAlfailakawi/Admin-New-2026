import React, { useState, useMemo } from 'react';
import { Play, TrendingUp, TrendingDown, RefreshCw, BarChart3, Tag, Truck, Sparkles, AlertCircle, Info, Calculator, Zap, ArrowRight, CheckCircle2, Rocket, Megaphone, Target, Users, Layout, MessageCircle, Clock, Copy } from 'lucide-react';
import { cn, safeFormatCurrency } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, SimulationResult, AICampaign } from '../types';
import { simulateWhatIfScenario } from '../lib/ai-engine';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, AreaChart, Area } from 'recharts';
import { toast } from 'sonner';
import { GoogleGenAI, Type } from"@google/genai";

interface WhatIfSimulatorProps {
 data: AppState;
 onUpdateData?: (newData: AppState) => void;
}

export const WhatIfSimulator: React.FC<WhatIfSimulatorProps> = ({ data, onUpdateData }) => {
 const [scenarioType, setScenarioType] = useState<'price_change' | 'cost_change' | 'promotion'>('price_change');
 const [selectedProductId, setSelectedProductId] = useState<string>(data.products?.[0]?.id || '');
 const [percentChange, setPercentChange] = useState<number>(0); // 0% change default
 const [customValue, setCustomValue] = useState<number>(0);
 const [isExecuting, setIsExecuting] = useState(false);
 const [isGenerating, setIsGenerating] = useState(false);
 const [campaignPlan, setCampaignPlan] = useState<AICampaign | null>(null);

 const simulation = useMemo(() => {
 return simulateWhatIfScenario(data, {
 type: scenarioType,
 productId: selectedProductId,
 percentChange: scenarioType === 'price_change' ? percentChange : undefined,
 newCost: scenarioType === 'cost_change' ? customValue : undefined,
 });
 }, [data, scenarioType, selectedProductId, percentChange, customValue]);

 if (!data?.products || data.products.length === 0) {
 return (
 <div className="flex flex-col items-center justify-center p-3 md:p-4 bg-slate-950 rounded-3xl border border-slate-800 text-center">
 <AlertCircle className="text-slate-600 mb-4" size={48} />
 <h3 className="text-xl font-black text-white mb-2">لا توجد أصناف متاحة</h3>
 <p className="text-slate-400 font-bold mb-6 text-sm max-w-sm">لإجراء محاكاة"ماذا لو" أو إنشاء حملة تسويقية بالذكاء الاصطناعي، يرجى إضافة بعض الأصناف إلى المتجر أولاً.</p>
 </div>
);
 }

 const generateCampaign = async () => {
 if (data.invoices.length < 2) {
 toast.error("بيانات غير كافية", { 
 description:"لا توجد بيانات كافية لإنشاء حملة دقيقة. نحتاج لـ 5 فواتير على الأقل." 
 });
 return;
 }

 setIsGenerating(true);
 try {
 const product = (data?.products || []).find(p => p.id === selectedProductId) || data.products[0];
 const companyName = data?.settings?.companyName || 'مطبخ التراث الكويتي';
 const companyPhones = (data?.settings?.restaurantNumbers || []).join(', ');

 const customPrompt = `
 بصفتك خبير تسويق استراتيجي لمحلات الحلويات والمطاعم في الكويت. قم بإنشاء خطة حملة ترويجية للمنتج التالي بناءً على البيانات:
 المنتج: ${product.name}
 السعر الحالي: ${product.price} د.ك
 التكلفة: ${product.cost} د.ك
 إجمالي المبيعات التاريخية لهذا المتجر: ${data.invoices.length} فاتورة.
 اسم المحل: ${companyName}
 رقم التواصل / الواتساب: ${companyPhones}
 
 المطلوب إنشاء خطة حملة ترويجية شاملة تتضمن:
 1. نوع الحملة (campaignType)
 2. فكرة العرض (Idea)
 3. رسالة إعلانية قصيرة (Message)
 4. الجمهور المستهدف بدقة (Target Audience)
 5. التوقيت المناسب (Timing)
 6. الهدف (Goal)
        7. النتيجة المتوقعة (Expected Outcome)
        8. رسالة واتساب جاهزة (WhatsApp Message)

        *ملاحظة هامة جداً*: نوع في أسلوب رسائل الواتساب وصياغتها في كل مرة. لا تستخدم قالباً ثابتاً. مرة استخدم لهجة رسمية، مرة كاجوال (كويتي عامي)، مرة حماسية قصيرة، ومرة بأسلوب دعوة حصرية. وتأكد من تضمين اسم المحل (${companyName}) ورقم الطلب (${companyPhones}) بطريقة طبيعية داخل رسالة الواتساب الجاهزة.

        رد بصيغة JSON فقط بالتنسيق التالي:
        {
          "campaignType": "(نوع الحملة)",
          "idea": "(فكرة العرض)",
          "message": "(رسالة إعلانية قصيرة)",
          "targetAudience": "(الجمهور المستهدف)",
          "timing": "(التوقيت المناسب)",
          "goal": "(الهدف)",
          "expectedOutcome": "(النتيجة المتوقعة)",
          "whatsappMessage": "(رسالة واتساب مخصصة جاهزة ومتنوعة الأسلوب)"
        }
        
        يجب أن يكون الإخراج بصيغة JSON حصراً باللغة العربية.
        `;

 const { generateMarketingCampaign } = await import('../lib/ai-engine');
 const plan = await generateMarketingCampaign(data, customPrompt);
 
 setCampaignPlan(plan);
 toast.success("تم إنشاء خطة الحملة بنجاح");
 } catch (error: any) {
 const errStr = String(error?.message || error);
 if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("depleted")) {
 toast.error("نفدت نقاط الذكاء الاصطناعي", {
 description:"يرجى تجديد الباقة للاستمرار في استخدام ميزات الذكاء الاصطناعي."
 });
 } else {
 console.error("Campaign generation failed:", error);
 toast.error("فشل إنشاء الحملة", { 
 description:"خدمة الذكاء الاصطناعي مشغولة جداً حالياً. يرجى المحاولة بعد قليل." 
 });
 }
 } finally {
 setIsGenerating(false);
 }
 };

 const chartData = [
 { name: 'الإيراد الشهري', current: simulation.currentMonthlyRevenue, projected: simulation.projectedMonthlyRevenue },
 { name: 'الربح الصافي', current: simulation.currentMonthlyProfit, projected: simulation.projectedMonthlyProfit }
 ];

 const profitDiff = simulation.projectedMonthlyProfit - simulation.currentMonthlyProfit;
 const isPositive = profitDiff >= 0;

 const handleExecute = () => {
 if (!onUpdateData) {
 toast.error("حدث خطأ", { description:"محرك التحديث غير متاح حالياً." });
 return;
 }

 if (scenarioType === 'promotion' && !campaignPlan) {
 toast.error("خطأ", { description:"يجب إنشاء خطة الحملة أولاً." });
 return;
 }

 setIsExecuting(true);
 
 setTimeout(() => {
 // 1. Create a deep-ish clone of the relevant parts of the data
 const newData = { 
 ...data,
 products: [...(data.products || [])].map(p => p.id === selectedProductId ? { ...p } : p),
 campaigns: [...(data.campaigns || [])]
 };

 const product = newData.products.find(p => p.id === selectedProductId);
 
 let executionMsg ="";
 
 if (scenarioType === 'price_change' && product) {
 const oldPrice = product.price || 0;
 const newPrice = oldPrice * (1 + percentChange);
 product.price = parseFloat(Number(newPrice || 0).toFixed(3));
 executionMsg = `تم تحديث سعر ${product.name} من ${Number(oldPrice || 0).toFixed(3)} إلى ${Number(product.price || 0).toFixed(3)} د.ك`;
 } else if (scenarioType === 'cost_change' && product) {
 const oldCost = product.cost || 0;
 product.cost = parseFloat(Number(customValue || 0).toFixed(3));
 executionMsg = `تم تحديث تكلفة ${product.name} إلى ${Number(product.cost || 0).toFixed(3)} د.ك`;
 } else if (scenarioType === 'promotion' && campaignPlan) {
 newData.campaigns.push({ ...campaignPlan, status: 'launched' });
 executionMsg = `تم إطلاق حملة: ${campaignPlan.idea}`;
 setCampaignPlan(null);
 }

 onUpdateData(newData);
 setIsExecuting(false);
 
 toast.success("تم تنفيذ القرار بنجاح", { 
 description: executionMsg,
 icon: <CheckCircle2 className="text-emerald-500" />
 });
 }, 1500);
 };

 return (
 <div className="space-y-6 md:space-y-8" dir="rtl">
 {/* Header Panel */}
 <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-3 shadow-2xl relative overflow-hidden flex flex-col items-start">
 <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-400" />
 <div className="absolute top-3 md:p-4 left-10 opacity-10 text-white rotate-12 hidden sm:block"><Calculator size={200} /></div>
 
 <h2 className="text-2xl md:text-xl md:text-2xl font-black text-white mb-4 md:mb-6 relative z-10 flex items-center gap-4 text-right px-4">
 محرك محاكاة"ماذا لو؟" <Zap className="text-cyan-400 animate-pulse" size={24} />
 </h2>
 <p className="text-indigo-100 text-sm md:text-lg font-bold leading-relaxed max-w-2xl relative z-10 mb-6 md:mb-8 text-right px-4 opacity-90">
 اختبر قراراتك المستقبلية قبل اتخاذها. هذا المحرك يستخدم مرونة الطلب التاريخية وأنماط الشراء في متجرك ليتوقع أثر تغيير الأسعار، خفض التكاليف، أو إطلاق الحملات على أرباحك الصافية.
 </p>
 
 <div className="flex gap-4 relative z-10 px-4">
 <div className="bg-white/10 backdrop-blur-md px-4 md:px-6 py-2 md:py-3 rounded-2xl flex items-center gap-3 border border-white/20">
 <Sparkles className="text-cyan-400" size={16} />
 <span className="text-white font-bold text-[10px] md:text-sm">نمذجة دقيقة بناءً على {data.invoices.length} عملية بيع</span>
 </div>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:p-4 md:gap-4 md:p-3">
 {/* Controls Panel */}
 <div className="lg:col-span-1 bg-slate-950 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-indigo-500/20 shadow-2xl relative overflow-hidden group space-y-6 md:space-y-8">
 <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f1_1px,transparent_1px),linear-gradient(to_bottom,#6366f1_1px,transparent_1px)] bg-[size:30px_30px] opacity-[0.03] pointer-events-none" />
 <div className="space-y-4 relative z-10">
 <h3 className="font-black text-base md:text-lg text-white border-b border-slate-800 pb-2">1. اختر نوع السيناريو</h3>
 <div className="grid grid-cols-1 gap-2">
 <button 
 onClick={() => { setScenarioType('price_change'); setCampaignPlan(null); }}
 className={cn(
"p-3 rounded-2xl border text-right font-black text-sm flex items-center justify-between transition-all active:scale-95 min-h-[44px]",
 scenarioType === 'price_change' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80'
)}
 >
 تغيير سعر بيع صنف <Tag size={16} />
 </button>
 <button 
 onClick={() => { setScenarioType('cost_change'); setCampaignPlan(null); }}
 className={cn(
"p-3 rounded-2xl border text-right font-black text-sm flex items-center justify-between transition-all active:scale-95 min-h-[44px]",
 scenarioType === 'cost_change' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80'
)}
 >
 تغيير تكلفة توريد صنف <Truck size={16} />
 </button>
 <button 
 onClick={() => setScenarioType('promotion')}
 className={cn(
"p-3 rounded-2xl border text-right font-black text-sm flex items-center justify-between transition-all active:scale-95 min-h-[44px]",
 scenarioType === 'promotion' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80'
)}
 >
 إطلاق حملة ترويجية شاملة <Sparkles size={16} />
 </button>
 </div>
 </div>

 <div className="space-y-6 relative z-10">
 <div className="space-y-3 text-right">
 <label className="font-black text-[10px] md:text-xs text-slate-400 uppercase">اختر الصنف المستهدف</label>
 <select 
 value={selectedProductId}
 onChange={(e) => { setSelectedProductId(e.target.value); setCampaignPlan(null); }}
 className="w-full p-3 rounded-2xl bg-slate-900/50 border border-slate-800 font-bold text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none min-h-[44px] custom-scrollbar"
 style={{ direction: 'rtl' }}
 >
 {data.products.map(p => (
 <option key={p.id} value={p.id} className="bg-slate-900 text-indigo-50">{p.name}</option>
))}
 </select>
 </div>

 {scenarioType === 'price_change' && (
 <div className="space-y-6 relative z-10">
 <div className="flex justify-between items-end mb-4">
 <div className="text-right">
 <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">القرار الاستراتيجي</span>
 <span className={cn(
"text-xs md:text-sm font-black px-4 py-2 rounded-2xl border transition-all duration-500",
 percentChange > 0 
 ? (simulation.projectedMonthlyProfit > simulation.currentMonthlyProfit ?"bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :"bg-rose-500/20 text-rose-400 border-rose-500/30") 
 : percentChange < 0 
 ? (simulation.projectedMonthlyProfit > simulation.currentMonthlyProfit ?"bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :"bg-rose-500/20 text-rose-400 border-rose-500/30") 
 :"bg-slate-800 text-slate-400 border-slate-700"
)}>
 {percentChange > 0 ? (simulation.projectedMonthlyProfit > simulation.currentMonthlyProfit ? 'رفع مربح' : 'رفع يحتاج حذر') : percentChange < 0 ? 'تخفيض السعر' : 'سعر السوق الحالي'}
 </span>
 </div>
 <div className="text-center">
 <span className={cn(
"text-xl md:text-3xl md:text-xl md:text-2xl font-black transition-colors duration-500",
 isPositive ?"text-emerald-400" :"text-rose-400"
)}>
 {(Number(percentChange || 0) * 100).toFixed(0)}%
 </span>
 </div>
 </div>

 <div className="relative h-14 flex items-center group px-2">
 <div className="absolute inset-x-0 h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
 <div 
 className={cn(
"h-full transition-all duration-700 ease-out shadow-[0_0_15px_rgba(0,0,0,0.1)]",
 isPositive ?"bg-gradient-to-r from-emerald-400 to-teal-500" :"bg-gradient-to-r from-rose-400 to-pink-500"
)} 
 style={{ width: `${((percentChange + 0.5) / 1) * 100}%` }}
 />
 </div>
 <input 
 type="range"
 min="-0.5"
 max="0.5"
 step="0.01"
 value={percentChange}
 onChange={(e) => setPercentChange(parseFloat(e.target.value))}
 className="absolute inset-x-0 w-full appearance-none bg-transparent cursor-pointer accent-slate-900 z-10 h-10"
 />
 </div>
 
 <div className="grid grid-cols-3 gap-2 px-1">
 <span className={cn("text-[9px] font-black text-right transition-colors duration-500", percentChange < -0.1 ? (isPositive ?"text-emerald-600" :"text-rose-600") :"text-slate-300")}>-50% جرأة سعرية</span>
 <span className="text-[9px] font-black text-slate-200 text-center">التوازن</span>
 <span className={cn("text-[9px] font-black text-left transition-colors duration-500", percentChange > 0.1 ? (isPositive ?"text-emerald-600" :"text-rose-600") :"text-slate-300")}>+50% رفع قوي</span>
 </div>

 <div className={cn(
"p-3 rounded-2xl border transition-all duration-500",
 isPositive ?"bg-emerald-50/50 border-emerald-100/50 text-emerald-900/70" :"bg-rose-50/50 border-rose-100/50 text-rose-900/70"
)}>
 <p className="text-[10px] font-black leading-relaxed flex items-start gap-2">
 <Sparkles size={14} className={isPositive ?"text-emerald-500" :"text-rose-500"} />
 <span>المحرك يحتسب"السحب والضغط": {simulation.explanation}</span>
 </p>
 </div>
 </div>
)}

 {scenarioType === 'cost_change' && (
 <div className="space-y-3 text-right">
 <label className="font-black text-[10px] md:text-xs text-slate-400 uppercase">التكلفة الجديدة (د.ك)</label>
 <input 
 type="number"
 step="0.25"
 value={customValue || (data?.products || []).find(p => p.id === selectedProductId)?.cost}
 onChange={(e) => setCustomValue(parseFloat(e.target.value))}
 className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 font-black text-base md:text-lg text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
 />
 </div>
)}

 {scenarioType === 'promotion' && (
 <button 
 onClick={generateCampaign}
 disabled={isGenerating}
 className="w-full bg-slate-900 text-white p-3 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
 >
 {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Megaphone size={20} />}
 {isGenerating ? 'جاري تحليل البيانات...' : 'إنشاء خطة الحملة بالذكاء الاصطناعي'}
 </button>
)}
 </div>
 </div>

 {/* Results Panel */}
 <div className="lg:col-span-2 space-y-6 md:space-y-8">
 {scenarioType === 'promotion' ? (
 <div className="bg-slate-950 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-indigo-500/20 shadow-2xl relative overflow-hidden h-full flex flex-col items-center justify-center">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
 {!campaignPlan ? (
 <>
 <div className="w-16 md:w-20 h-16 md:h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 mb-6 border border-indigo-500/30 relative z-10">
 <Rocket size={40} className={isGenerating ?"animate-bounce" :""} />
 </div>
 <h3 className="text-xl md:text-2xl font-black text-white mb-4 relative z-10 text-center">الخطة التسويقية الذكية للمنتج المختار</h3>
 <p className="text-slate-400 text-center max-w-md text-sm md:text-base font-bold leading-relaxed mb-8 relative z-10">
 سيقوم الذكاء الاصطناعي بتحليل تاريخ مبيعات هذا الصنف، وسلوك عملاءك لبناء أفضل حملة تسويقية له مع رسائل واتساب جاهزة واستهداف دقيق.
 </p>
 <button 
 onClick={generateCampaign}
 disabled={isGenerating}
 className="bg-indigo-600 text-white px-4 md:px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-base hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50 active:scale-95 flex items-center gap-3 relative z-10 min-h-[44px]"
 >
 {isGenerating ? <RefreshCw className="animate-spin" /> : <Sparkles />}
 {isGenerating ? 'جاري بناء الخطة والإعلانات...' : 'ابنِ الخطة الآن بضغطة زر 🚀'}
 </button>
 </>
) : (
 <div className="w-full text-right space-y-8 relative z-10" dir="rtl">
 <div className="flex flex-col md:flex-row justify-between items-center border-b border-slate-800 pb-6 gap-4">
 <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-3">
 <Rocket className="text-indigo-400" /> نتيجة الخبير الآلي
 </h3>
 <button onClick={() => setCampaignPlan(null)} className="text-slate-500 hover:text-white transition-colors bg-slate-900 px-4 py-2 rounded-xl text-sm font-bold min-h-[44px] border border-slate-800">حملة جديدة</button>
 </div>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 md:p-4">
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all">
 <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><Target size={14}/> نوع الحملة والهدف</p>
 <p className="text-slate-200 font-bold text-sm md:text-base mb-1 whitespace-pre-wrap">{campaignPlan.topic}</p>
 <p className="text-slate-400 text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{campaignPlan.message}</p>
 </div>
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all">
 <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><Users size={14}/> الجمهور المستهدف</p>
 <p className="text-slate-200 font-bold text-sm md:text-base leading-relaxed whitespace-pre-wrap">{campaignPlan.targetAudience}</p>
 </div>
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all md:col-span-2">
 <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><Sparkles size={14}/> الفكرة الإبداعية (Idea)</p>
 <p className="text-slate-200 font-bold text-sm md:text-base leading-relaxed whitespace-pre-wrap">{campaignPlan.idea}</p>
 </div>
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm md:col-span-2 relative hover:border-indigo-500/30 transition-all">
 <div className="flex flex-wrap items-center justify-between mb-3 gap-2">
  <p className="text-[10px] md:text-xs font-black text-emerald-400 uppercase flex items-center gap-2"><MessageCircle size={14}/> رسالة واتساب جاهزة للنسخ والمبيعات</p>
  <button onClick={() => { navigator.clipboard.writeText(campaignPlan.marketingMessage || campaignPlan.message || ''); toast.success('تم النسخ بنجاح'); }} className="text-slate-400 hover:text-white bg-slate-800 hover:bg-emerald-600 px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all"><Copy size={14} /> نسخ</button>
 </div>
 <div className="bg-slate-950 p-3 rounded-xl text-xs sm:text-sm font-bold text-slate-300 border border-emerald-500/20 leading-relaxed overflow-x-hidden break-words whitespace-pre-wrap">
 {campaignPlan.marketingMessage || campaignPlan.message || 'جاري صياغة الرسالة... أو يرجى المحاولة مرة أخرى.'}
 </div>
 </div>
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all">
 <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><Clock size={14}/> التوقيت الأنسب</p>
 <p className="text-slate-200 font-bold text-sm leading-relaxed whitespace-pre-wrap">{campaignPlan.timing}</p>
 </div>
 <div className="bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 shadow-sm hover:border-indigo-500/30 transition-all">
 <p className="text-[10px] md:text-xs font-black text-indigo-400 uppercase mb-2 flex items-center gap-2"><TrendingUp size={14}/> العائد المتوقع برأيه</p>
 <p className="text-slate-200 font-bold text-sm leading-relaxed whitespace-pre-wrap">{campaignPlan.expectedOutcome}</p>
 </div>
 </div>
 
 <div className="pt-6 border-t border-slate-800 text-center">
 <button 
 onClick={handleExecute}
 disabled={isExecuting}
 className="w-full md:w-auto bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 px-4 md:px-8 py-4 rounded-xl font-black text-sm hover:bg-emerald-500 hover:text-slate-900 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
 >
 {isExecuting ? 'جاري التنفيذ...' : 'موافق، قم بتسجيل الحملة في خططي 🚀'}
 </button>
 </div>
 </div>
)}
 </div>
) : simulation.dataStatus === 'insufficient' ? (
 <div className="md:col-span-2 bg-slate-900/50 p-3 md:p-4 md:p-3 rounded-2xl border border-slate-800 text-center">
 <AlertCircle className="text-indigo-500 mx-auto mb-4" size={32} />
 <p className="text-sm font-black text-slate-400">{simulation.explanation}</p>
 </div>
) : (
 <div className="bg-slate-950 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-indigo-500/20 shadow-2xl relative overflow-hidden">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.1)_0%,rgba(0,0,0,0)_60%)] pointer-events-none" />
 <h3 className="font-black text-xl md:text-2xl text-white mb-6 md:mb-8 text-right relative z-10 flex items-center justify-end gap-3">
 <BarChart3 className="text-indigo-400" />
 الأثر المتوقع على الأرباح الشهرية
 </h3>
 
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 md:p-4 mb-8 md:mb-10 relative z-10">
 <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-2xl p-3 md:p-4 text-right shadow-sm group">
 <p className="text-slate-500 text-[10px] md:text-xs font-black mb-1 uppercase group-hover:text-indigo-400 transition-colors">مبيعات الصنف حالياً</p>
 <p className="text-2xl md:text-3xl font-black text-white">{safeFormatCurrency(simulation.currentMonthlyProfit)} <span className="text-sm opacity-50 font-black">د.ك</span></p>
 </div>
 <div className={cn(
"rounded-2xl p-3 md:p-4 text-right shadow-sm border group relative overflow-hidden transition-all",
 isPositive ?"bg-emerald-500/10 border-emerald-500/30" :"bg-rose-500/10 border-rose-500/30"
)}>
 <div className={cn("absolute inset-0 opacity-20 pointer-events-none transition-all group-hover:opacity-40", isPositive ?"bg-emerald-400" :"bg-rose-400")} />
 <p className={cn("text-[10px] md:text-xs font-black mb-1 uppercase transition-colors", isPositive ?"text-emerald-400/80 group-hover:text-emerald-400" :"text-rose-400/80 group-hover:text-rose-400")}>المبيعات بعد قرارك (المتوقعة)</p>
 <p className={cn("text-2xl md:text-3xl font-black relative z-10", isPositive ?"text-emerald-400" :"text-rose-400")}>{safeFormatCurrency(simulation.projectedMonthlyProfit)} <span className="text-sm opacity-50 font-black">د.ك</span></p>
 <div className="absolute top-3 md:p-4 left-6 text-2xl font-black opacity-30">
 {isPositive ? '+' : ''}{safeFormatCurrency(profitDiff)} د.ك
 </div>
 </div>
 </div>

 <div className="w-full h-48 md:h-64 mb-6 md:mb-8 bg-slate-900/50 backdrop-blur-sm rounded-3xl p-3 overflow-hidden border border-slate-800 relative z-10" dir="ltr">
 {/* Recharts chart */}
 <ResponsiveContainer width="100%" height="100%">
 <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
 <XAxis dataKey="name" tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
 <Tooltip 
 cursor={{fill: 'rgba(255,255,255,0.05)'}}
 contentStyle={{ borderRadius: '1rem', border: 'none', backgroundColor: '#0f172a', color: '#fff', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)', fontWeight: 'bold', fontSize: '12px' }}
 itemStyle={{ color: '#818cf8', fontWeight: '900' }}
 />
 <Bar dataKey="current" fill="#475569" radius={[8, 8, 8, 8]} name="الحالي" />
 <Bar dataKey="projected" fill={isPositive ? '#10b981' : '#f43f5e'} radius={[8, 8, 8, 8]} name="المتوقع" />
 </BarChart>
 </ResponsiveContainer>
 </div>

 <div className="bg-slate-900/80 backdrop-blur-xl border border-indigo-500/20 p-3 md:p-4 md:p-3 rounded-2xl flex items-start gap-4 flex-row-reverse mb-6 md:mb-8 text-right relative z-10">
 <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/30">
 <Info size={24} />
 </div>
 <div>
 <h4 className="font-black text-sm md:text-base text-white mb-1">تعليق الذكاء الاصطناعي على قرارك</h4>
 <p className="text-slate-400 text-xs md:text-sm leading-relaxed font-bold">
 {simulation.explanation}
 </p>
 </div>
 </div>

 <div className="text-left relative z-10">
 <button 
 onClick={handleExecute}
 disabled={isExecuting}
 className={cn(
"w-full md:w-auto px-4 md:px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-sm md:text-base border shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 min-h-[44px]",
 isPositive 
 ?"bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500 hover:text-slate-900" 
 :"bg-rose-500/20 border-rose-500/50 text-rose-400 hover:bg-rose-500 hover:text-slate-900"
)}
 >
 {isExecuting ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
 {isExecuting ? 'جاري تنفيذ و حفظ القرار...' : (isPositive ? 'تأكيد وحفظ التعديل الرابح 👍' : 'تنفيذ التعديل بالرغم من المخاطرة ⚠️')}
 </button>
 </div>
 </div>
)}
 </div>
 </div>
 </div>
);
};

