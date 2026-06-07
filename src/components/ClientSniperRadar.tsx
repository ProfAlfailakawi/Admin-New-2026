import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, MessageCircle, AlertCircle, Sparkles, Send, Crosshair, MapPin } from 'lucide-react';
import { AppState, Customer } from '../types';
import { cn } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
import { toast } from 'sonner';

interface ClientSniperRadarProps {
 data: AppState;
}

const ClientSniperRadar: React.FC<ClientSniperRadarProps> = ({ data }) => {
 const [scanning, setScanning] = useState(true);
 const [selectedTarget, setSelectedTarget] = useState<any>(null);

 // Analyze customers to find"Sleeping VIPs"
 // A VIP is someone with high total spend, but hasn't had an invoice in 30+ days.
 const radarTargets = useMemo(() => {
 if (!data.customers || !data.invoices) return [];
 
 const now = new Date();
 const daysOfWeekAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
 
 return data.customers.map(customer => {
 // Find all invoices for this customer
 const customerInvoices = data.invoices!.filter(inv => inv.customerId === customer.id && !inv.isDeleted && (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined));
 const totalSpend = customerInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
 
 const lastInvoice = customerInvoices.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
 const daysSinceLastOrder = lastInvoice 
 ? Math.floor((now.getTime() - new Date(lastInvoice.date).getTime()) / (1000 * 60 * 60 * 24))
 : 999;
 
 // PRE-EMPTIVE SNIPER LOGIC
 const dayItemCounts: Record<string, { count: number; dayOfWeek: number }> = {};
 customerInvoices.forEach(inv => {
 const date = new Date(inv.date);
 const docDay = date.getDay(); // 0 to 6
 (inv.items || []).forEach(item => {
 const key = `${docDay}-${item.productId}`;
 if (!dayItemCounts[key]) dayItemCounts[key] = { count: 0, dayOfWeek: docDay };
 dayItemCounts[key].count += 1;
 });
 });

 let preemptiveMatch = null;
 for (let key in dayItemCounts) {
 if (dayItemCounts[key].count >= 2) {
 const productId = key.split('-')[1];
 const product = data.products?.find(p => p.id === productId);
 if (product) {
 const dayOfWeek = dayItemCounts[key].dayOfWeek;
 preemptiveMatch = {
 productName: product.name,
 dayOfWeekInt: dayOfWeek,
 dayOfWeekStr: daysOfWeekAr[dayOfWeek],
 isTomorrow: (now.getDay() + 1) % 7 === dayOfWeek 
 };
 if (preemptiveMatch.isTomorrow) break;
 }
 }
 }

 let riskLevel = 'safe';
 if (preemptiveMatch) {
 riskLevel = 'preemptive';
 } else if (totalSpend > 500 && daysSinceLastOrder > 30) {
 riskLevel = 'critical';
 } else if (totalSpend > 200 && daysSinceLastOrder > 15) {
 riskLevel = 'warning';
 }
 
 return {
 ...customer,
 totalSpend,
 daysSinceLastOrder,
 lastInvoiceDate: lastInvoice?.date || 'غير معروف',
 // Random placement on the radar
 x: Math.random() * 80 + 10, // 10% to 90%
 y: Math.random() * 80 + 10,
 riskLevel,
 preemptiveMatch
 };
 }).filter(c => c.riskLevel !== 'safe').slice(0, 8); // Top 8 targets
 }, [data.customers, data.invoices, data.products]);

 useEffect(() => {
 // Pulse scanning effect
 const interval = setInterval(() => {
 setScanning(s => !s);
 }, 4000);
 return () => clearInterval(interval);
 }, []);

 const getFriendlyName = (name: string) => {
 const clean = String(name || '').trim().replace(/\s+/g, ' ');
 if (!clean) return 'عميلنا العزيز';
 const parts = clean.split(' ');
 if (['بو', 'أبو', 'ابو', 'أم', 'ام'].includes(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
 return parts[0] || 'عميلنا العزيز';
 };

 const pickMessage = (templates: string[], seed: string) => {
 const base = String(seed || '0').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
 return templates[base % templates.length];
 };

 const handleLaunchMessage = (target: any) => {
 const name = getFriendlyName(target.name);
 const productName = target.preemptiveMatch?.productName;
 const dayText = target.preemptiveMatch?.isTomorrow ? 'باجر' : `يوم ${target.preemptiveMatch?.dayOfWeekStr || 'قريب'}`;
 const spendTier = Number(target.totalSpend || 0) > 500 ? 'vip' : Number(target.totalSpend || 0) > 200 ? 'loyal' : 'regular';
 const absenceTier = Number(target.daysSinceLastOrder || 0) > 60 ? 'طالت الغيبة' : Number(target.daysSinceLastOrder || 0) > 30 ? 'صار لك فترة' : 'غبت كم يوم';
 const productLine = productName ? `طلبك المعتاد (${productName}) حاضر.` : (spendTier === 'vip' ? 'نرتب لك اختيار يناسب طلباتك السابقة.' : 'نذكرك بأقرب اختيار من سجل طلباتك.');
 const templates = target.riskLevel === 'preemptive'
 ? [
   `يا هلا ${name}، تذكير بسيط قبل موعد طلبك المعتاد ${dayText}. ${productLine} إذا يناسبك نجهزه لك بكل سرور.`,
   `${name}، حياك الله. لاحظنا إن هذا الوقت يناسب طلبك المعتاد، ${productLine} ودنا نخدمك إذا لك خاطر.`,
   `مساء الخير ${name}، ${productLine} نقدر نجهزه لك قبل الزحمة إذا يناسبك.`,
   `يا هلا ${name}، طلبك المعتاد قريب من موعده. ${productLine} تحب نرتبه لك؟`
 ]
 : target.riskLevel === 'critical'
 ? [
   `يا هلا ${name}، لك وحشة عند التراث. حابين نطمن عليك، وإذا لك خاطر بطلبك المعتاد نرتبه لك بكل عناية.`,
   `${name}، اشتقنا لخدمتك. جاهزين نرجع نجهز لك طلبك المفضل بأي وقت.`,
   `هلا ${name}، وجودك يهمنا. حبينا نذكرك إن طلبك محل اهتمام، ونجهزه لك متى ما ناسبك.`
 ]
 : [
   `يا هلا ${name}، حبينا نطمن عليك ونذكرك إن طلبك عندنا له اهتمام خاص. إذا يناسبك نجهزه لك اليوم.`,
   `${name}، حياك الله. صار لك فترة، وودنا نخدمك بطلب مرتب على ذوقك متى ما ناسبك.`,
   `مساء الخير ${name}، جهزنا لك ترشيح مناسب من التراث حسب طلباتك السابقة. إذا لك خاطر نرتبه لك.`
 ];
 const rawMessage = `${pickMessage(templates, target.id || target.phone || target.name)}\n\nhttps://alturathkw.shop`;
 const sanitizeWhatsAppText = (t: string) =>
   String(t || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
 const waUrl = `https://api.whatsapp.com/send?phone=${String(target.phone || '').replace(/\D/g, '')}&text=${encodeURIComponent(sanitizeWhatsAppText(rawMessage))}`;
 window.open(waUrl, '_blank');
 toast.success(`تم تجهيز رسالة مخصصة لـ ${target.name}`);
 setSelectedTarget(null);
 };

 return (
 <div className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl md:rounded-2xl border border-slate-800 p-3 md:p-3 shadow-sm border border-slate-200 overflow-hidden relative group font-sans">
 {/* Background Matrix/Night Vision Vibe */}
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.05)_0%,rgba(0,0,0,0)_70%)]" />
 <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-10" />
 
 <div className="flex flex-col md:flex-row gap-3 md:p-4 md:gap-3 md:p-4 md:p-3 md:p-4 relative z-10">
 
 {/* Radar Map (Visual) */}
 <div className="relative w-full max-w-[350px] aspect-square mx-auto shrink-0 flex items-center justify-center">
 {/* Radar Circles */}
 <div className="absolute inset-0 rounded-full border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)]" />
 <div className="absolute inset-8 rounded-full border border-emerald-500/20" />
 <div className="absolute inset-16 rounded-full border border-emerald-500/20" />
 <div className="absolute inset-24 rounded-full border border-emerald-500/20" />
 <div className="absolute inset-32 rounded-full border border-emerald-500/30 bg-emerald-500/5 shadow-[0_0_20px_rgba(16,185,129,0.2)] flex items-center justify-center">
 <Crosshair size={24} className="text-emerald-500/50" />
 </div>
 
 {/* Radar Crosshairs */}
 <div className="absolute top-0 bottom-0 left-1/2 w-px bg-emerald-500/20" />
 <div className="absolute left-0 right-0 top-1/2 h-px bg-emerald-500/20" />

 {/* Sweeper Arm */}
 <motion.div 
 animate={{ rotate: 360 }}
 transition={{ duration: 4, repeat: Infinity, ease:"linear" }}
 className="absolute inset-0 rounded-full"
 style={{
 background: 'conic-gradient(from 0deg, rgba(16, 185, 129, 0) 0%, rgba(16, 185, 129, 0.4) 10deg, transparent 10deg)'
 }}
 />

 {/* Targets */}
 <AnimatePresence>
 {radarTargets.map((target, idx) => (
 <motion.div
 key={target.id}
 initial={{ scale: 0, opacity: 0 }}
 animate={{ scale: [1, 1.5, 1], opacity: 1 }}
 transition={{ 
 delay: (target.x / 100) * 2, // stagger based on position to simulate sweep finding them
 duration: 1.5,
 repeat: Infinity,
 repeatDelay: 2
 }}
 className="absolute"
 style={{
 top: `${target.y}%`,
 left: `${target.x}%`,
 }}
 >
 <button
 onClick={() => setSelectedTarget(target)}
 className={cn(
"w-4 h-4 rounded-full -ml-2 -mt-2 shadow-[0_0_15px]",
 target.riskLevel === 'preemptive' ? 'bg-indigo-500 shadow-indigo-500/50' : target.riskLevel === 'critical' ? 'bg-rose-500 shadow-rose-500/50' : 'bg-amber-500 shadow-amber-500/50',
 selectedTarget?.id === target.id && 'ring-4 ring-white animate-pulse'
)}
 >
 {/* Ping effect */}
 <span className={cn(
"absolute inset-0 rounded-full animate-ping opacity-75",
 target.riskLevel === 'preemptive' ? 'bg-indigo-500' : target.riskLevel === 'critical' ? 'bg-rose-500' : 'bg-amber-500'
)}></span>
 </button>
 </motion.div>
))}
 </AnimatePresence>
 </div>

 {/* Info & Action Panel */}
 <div className="flex-1 flex flex-col justify-center gap-3 md:p-4">
 <div className="text-right">
 <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-end gap-3">
 <span className="text-emerald-400">رادار قنص العملاء</span>
 <Target className="text-emerald-500" />
 </h3>
 <p className="text-slate-500 text-sm italic font-bold">
 يرصد العملاء الغائبين وفرص الطلب القادمة من سجل الفواتير الفعلي. رسائل قصيرة ومتنوعة وجاهزة للإرسال.
 </p>
 </div>

 <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

 {selectedTarget ? (
 <motion.div 
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 className="bg-slate-50 border border-slate-200 text-slate-900 border border-slate-700 rounded-3xl p-3 md:p-4 text-right relative overflow-hidden"
 >
 <div className={cn(
"absolute top-0 right-0 w-32 h-32 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none",
 selectedTarget.riskLevel === 'preemptive' ? 'bg-indigo-500/20' : selectedTarget.riskLevel === 'critical' ? 'bg-rose-500/20' : 'bg-amber-500/20'
)} />
 
 <div className="flex justify-between items-start mb-6">
 <div className="text-left">
 <span className="block text-[10px] uppercase font-mono text-slate-500 mb-1">Total LTV</span>
 <span className="text-2xl font-bold text-emerald-400">{selectedTarget.totalSpend.toFixed(3)} د.ك</span>
 </div>
 <div>
 <h4 className="text-xl font-bold text-white mb-1">{selectedTarget.name}</h4>
 <div className="flex items-center justify-end gap-2 text-slate-500 text-xs font-bold">
 <span>{selectedTarget.phone}</span>
 </div>
 </div>
 </div>

 <div className="bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl p-3 mb-6 border border-slate-800 flex items-center justify-between text-right">
 <div className="flex items-center gap-3">
 <div className={cn(
"px-3 py-1 rounded-full text-[10px] font-bold uppercase",
 selectedTarget.riskLevel === 'preemptive' ? 'bg-indigo-500/20 text-indigo-400' : selectedTarget.riskLevel === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'
)}>
 {selectedTarget.riskLevel === 'preemptive' ? 'توقع استباقي' : selectedTarget.riskLevel === 'critical' ? 'خطر فقدان عالي' : 'فرصة عودة'}
 </div>
 </div>
 <div className="text-slate-300 font-bold text-sm flex items-center gap-2">
 {selectedTarget.riskLevel === 'preemptive' ? (
 <span>عادة يطلب ({selectedTarget.preemptiveMatch.productName}) كل {selectedTarget.preemptiveMatch.dayOfWeekStr}</span>
 ) : (
 <span>غائب منذ {selectedTarget.daysSinceLastOrder} يوم</span>
 )}
 <AlertCircle size={16} className="text-slate-500" />
 </div>
 </div>

 <button 
 onClick={() => handleLaunchMessage(selectedTarget)}
 className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-l from-emerald-600 to-emerald-500 text-white font-bold text-lg py-4 transition-all hover:scale-[1.02] active:scale-95 shadow-[0_0_30px_rgba(16,185,129,0.3)]"
 >
 <div className="absolute inset-0 bg-slate-50 border border-slate-200 text-slate-900/10 opacity-10 mix-blend-overlay" />
 <div className="relative z-10 flex items-center justify-center gap-3">
 <span>إرسال رسالة واتساب</span>
 <Send size={20} className="group-hover:translate-x-1 group-active:scale-[0.98] transition-transform" />
 </div>
 </button>
 </motion.div>
) : (
 <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-5 md:py-10 bg-slate-900/50 rounded-3xl border border-slate-800 border-dashed">
 <Target size={48} className="mb-4 opacity-20" />
 <p className="font-bold">اختر عميلاً من الرادار لعرض التوصية</p>
 <p className="text-xs mt-2 opacity-60">تم رصد {radarTargets.length} أهداف (نائمة + استباقية)</p>
 </div>
)}
 </div>
 </div>
 </div>
);
};

export default ClientSniperRadar;
