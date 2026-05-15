import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldCheck, ShieldAlert, ShieldX, ArrowUpRight, ArrowDownRight, Minus, CheckCircle2, TrendingUp, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { BusinessHealthScore } from '../types';

interface BusinessHealthIndexProps {
 health: BusinessHealthScore;
}

export const BusinessHealthIndex: React.FC<BusinessHealthIndexProps> = React.memo(({ health }) => {
 const getStatusConfig = (status: string) => {
 switch (status) {
 case 'Healthy':
 return {
 bg: 'bg-emerald-500',
 text: 'text-emerald-500',
 lightBg: 'bg-emerald-50',
 icon: <ShieldCheck size={48} className="text-emerald-500" />,
 label: 'وضع ممتاز',
 shadow: 'shadow-emerald-200'
 };
 case 'Risk':
 return {
 bg: 'bg-amber-500',
 text: 'text-amber-500',
 lightBg: 'bg-amber-50',
 icon: <ShieldAlert size={48} className="text-amber-500" />,
 label: 'يوجد مخاطر',
 shadow: 'shadow-amber-200'
 };
 case 'Critical':
 return {
 bg: 'bg-rose-500',
 text: 'text-rose-500',
 lightBg: 'bg-rose-50',
 icon: <ShieldX size={48} className="text-rose-500" />,
 label: 'وضع حرج',
 shadow: 'shadow-rose-200'
 };
 default:
 return {
 bg: 'bg-slate-500',
 text: 'text-slate-500',
 lightBg: 'bg-slate-50',
 icon: <Activity size={48} className="text-slate-500" />,
 label: 'غير معروف',
 shadow: 'shadow-slate-200'
 };
 }
 };

 const config = getStatusConfig(health.status);

 return (
 <div className="space-y-6 md:space-y-8" dir="rtl">
 <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 md:p-4 md:gap-4 md:p-3">
 {/* Main Score Card */}
 <div className="xl:col-span-1 bg-white/60 backdrop-blur-3xl p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-white/80 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col items-center text-center relative overflow-hidden group">
 <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-slate-100/50 to-transparent opacity-50" />
 <motion.div 
 initial={{ scale: 0.8, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 transition={{ type:"spring", bounce: 0.5 }}
 className={cn("p-3 md:p-4 md:p-3 rounded-2xl mb-6 relative z-10 shadow-xl", config.bg)}
 >
 <div className="absolute inset-0 bg-white/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
 {React.cloneElement(config.icon as React.ReactElement<any>, { size: 56, className:"text-white relative z-10" })}
 </motion.div>
 <h3 className="text-sm md:text-base font-bold text-slate-500 uppercase mb-2 relative z-10">مؤشر عافية الشركة</h3>
 <div className={cn("text-3xl md:text-xl md:text-2xl md:text-3xl md:text-xl md:text-2xl font-bold mb-4 tracking-tighter relative z-10 bg-clip-text text-transparent bg-gradient-to-br from-slate-800 to-slate-500", config.text)}>{health.score}<span className="text-2xl md:text-xl md:text-2xl text-slate-300 ml-1">%</span></div>
 <div className={cn("px-4 md:px-8 py-3 rounded-2xl font-bold text-sm uppercase mb-6 text-white shadow-xl relative z-10 border border-white/10", config.bg, config.shadow)}>
 {config.label}
 </div>
 <p className="text-slate-600 font-bold leading-relaxed text-sm md:text-base relative z-10">{health.explanation}</p>
 </div>

 {/* Breakdown Panel */}
 <div className="xl:col-span-2 bg-gradient-to-br from-[#fdfbf7] to-white p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-[#f0e6d2]/50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.02)] relative overflow-hidden">
 <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
 <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-8 md:mb-10 flex items-center gap-4 relative z-10">تحليل العوامل المؤثرة 
 <div className="p-2 bg-indigo-100 rounded-xl"><Activity className="text-indigo-600" size={20} /></div>
 </h3>
 
 <div className="space-y-8 relative z-10">
 {health.factors.map((factor, i) => (
 <div key={i} className="space-y-3 group">
 <div className="flex justify-between items-end text-sm md:text-base font-bold">
 <div className="flex items-center gap-3">
 <span className="text-slate-700 group-hover:text-slate-900 transition-colors">{factor.label}</span>
 <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors">
 {factor.trend === 'improving' && <ArrowUpRight className="text-emerald-500" size={14} />}
 {factor.trend === 'declining' && <ArrowDownRight className="text-rose-500" size={14} />}
 {factor.trend === 'stable' && <Minus className="text-slate-500" size={14} />}
 </span>
 </div>
 <div className="flex items-baseline gap-2">
 <span className="text-[10px] text-slate-500 font-bold uppercase">النتيجة</span>
 <span className={cn(
"text-xl",
 factor.score >= 80 ? 'text-emerald-500' : factor.score >= 50 ? 'text-amber-500' : 'text-rose-500'
)}>{factor.score}%</span>
 </div>
 </div>
 <div className="h-4 md:h-5 bg-slate-100 rounded-2xl overflow-hidden flex flex-row-reverse border border-slate-200/60/50 shadow-inner relative">
 <div className="absolute inset-x-0 h-1/2 top-0 bg-white/40 z-10" />
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${factor.score}%` }}
 transition={{ duration: 1.2, delay: i * 0.15, ease:"easeOut" }}
 className={cn(
"h-full rounded-2xl relative",
 factor.score >= 80 ? 'bg-gradient-to-l from-emerald-400 to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 
 factor.score >= 50 ? 'bg-gradient-to-l from-amber-400 to-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 
 'bg-gradient-to-l from-rose-400 to-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
)}
 >
 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%,transparent_100%)] bg-[length:20px_20px] animate-[shimmer_2s_linear_infinite]" />
 </motion.div>
 </div>
 <div className="flex justify-between items-center text-[10px] md:text-xs text-slate-500 font-bold">
 <span>الوزن النسبي في التقييم: {factor.weight}%</span>
 <span className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-500">مؤشر أداء رئيسي</span>
 </div>
 </div>
))}
 </div>
 </div>
 </div>

 {/* Recommendations Panel */}
 <div className="bg-slate-900 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 p-3 md:p-4 opacity-5 group-hover:scale-110 transition-transform"><TrendingUp size={150} className="text-white" /></div>
 <div className="relative z-10">
 <h3 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">خطة عمل التحسين الفوري <Sparkles className="text-amber-400" size={20} /></h3>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 md:p-4">
 {health.recommendations.map((rec, i) => (
 <div key={i} className="bg-white/10 backdrop-blur-md p-3 md:p-4 md:p-3 rounded-2xl border border-white/10 flex items-start gap-4">
 <div className="w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shrink-0"><CheckCircle2 className="text-black" size={16} /></div>
 <p className="text-white font-bold text-base md:text-lg leading-relaxed">{rec}</p>
 </div>
))}
 </div>
 </div>
 </div>

 {/* Info Notice */}
 <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-2xl flex items-center gap-4">
 <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0"><Info size={20} /></div>
 <p className="text-sm font-bold text-indigo-700 leading-relaxed">
 يتم تحديث هذا المؤشر لحظياً بناءً على كافة العمليات المالية والتشغيلية في النظام. يعكس المؤشر صحة"العقل المدبر" لشركتك وقدرتها على الصمود والنمو.
 </p>
 </div>
 </div>
);
});

const Sparkles = ({ className, size }: { className?: string, size?: number }) => (
 <svg 
 xmlns="http://www.w3.org/2000/svg" 
 width={size || 24} 
 height={size || 24} 
 viewBox="0 0 24 24" 
 fill="none" 
 stroke="currentColor" 
 strokeWidth="2" 
 strokeLinecap="round" 
 strokeLinejoin="round" 
 className={className}
 >
 <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
 <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
 </svg>
);
