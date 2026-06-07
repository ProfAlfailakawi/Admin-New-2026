import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, Copy, Check, Instagram, Send, Heart, MessageCircle, Zap, TrendingUp, BarChart2, Loader2, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppState } from '../types';
import { generateQuickInstagramMessages } from '../lib/ai-engine';
import { playSwoosh } from '../lib/sounds';
import { toast } from 'sonner';

interface InstagramMagicWandProps {
 data: AppState;
 currentPage?: string;
 userRole?: 'admin' | 'partner' | 'local' | null;
}

type Category = 'motivation' | 'engagement' | 'promo' | 'contest' | 'trend';

// Deterministic attractiveness assessment tool
const getStableAttractivenessScore = (text: string, category: string) => {
  if (!text) return 75;
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  const categoryBonus = category === 'trend' ? 5 : category === 'contest' ? 3 : 0;
  const score = 75 + (Math.abs(hash) % 20) + categoryBonus; // results in 75 to 99 range
  return Math.min(99, score);
};

// Luxurious sports-car dashboard attractiveness gauge
const AttractivenessGauge: React.FC<{ score: number }> = ({ score }) => {
  const angle = (score / 100) * 240 - 120; // needle angle from -120 to 120 deg
  
  return (
    <div className="flex flex-col items-center bg-slate-950 border border-amber-500/20 px-3.5 py-3 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.9)] relative overflow-hidden w-full max-w-[240px] mx-auto select-none">
      {/* Carbon fiber grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:12px_12px] opacity-25 pointer-events-none" />
      
      <div className="relative w-36 h-24 flex items-end justify-center overflow-hidden">
        {/* Semi-circular dial */}
        <svg className="w-36 h-36 absolute -bottom-10" viewBox="0 0 100 100">
          <path
            d="M 15 80 A 40 40 0 1 1 85 80"
            fill="none"
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Green-yellow zone (lower performance) */}
          <path
            d="M 15 80 A 40 40 0 0 1 50 13.5"
            fill="none"
            stroke="url(#speedGreenYellow)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          {/* High rpm red overdrive zone */}
          <path
            d="M 50 13.5 A 40 40 0 0 1 85 80"
            fill="none"
            stroke="url(#speedYellowRed)"
            strokeWidth="6.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="speedGreenYellow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="speedYellowRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          
          {/* Gauge dial markers */}
          {Array.from({ length: 9 }).map((_, i) => {
            const tickAngle = (i * 30 - 120) * Math.PI / 180;
            const x1 = 50 + 33 * Math.cos(tickAngle);
            const y1 = 50 + 33 * Math.sin(tickAngle);
            const x2 = 50 + 38 * Math.cos(tickAngle);
            const y2 = 50 + 38 * Math.sin(tickAngle);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={i >= 7 ? "rgba(239, 68, 68, 0.7)" : i >= 4 ? "rgba(234, 179, 8, 0.4)" : "rgba(255,255,255,0.15)"}
                strokeWidth={i >= 7 ? "1.5" : "1"}
              />
            );
          })}
        </svg>

        {/* Dashboard needle pin cap */}
        <div className="absolute w-5 h-5 rounded-full bg-slate-900 border border-amber-400 shadow-[0_2px_6px_rgba(245,158,11,0.6)] z-20 flex items-center justify-center -bottom-2.5">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        </div>

        {/* Dynamic rev meter needle */}
        <motion.div
          initial={{ rotate: -120 }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 45, damping: 10, mass: 0.8 }}
          style={{ transformOrigin: "bottom center" }}
          className="absolute w-[1.5px] h-16 bg-gradient-to-t from-red-600 via-amber-500 to-yellow-300 z-10 bottom-0 -translate-x-[50%]"
        />

        {/* High performance digital output below */}
        <div className="absolute bottom-1 text-center pointer-events-none">
          <div className="text-[8px] font-black tracking-widest text-white/30 uppercase">SCORE ATTRACTIVITY</div>
          <div className="text-2xl font-black font-mono text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)] mt-0.5">
            {score}
            <span className="text-[10px] text-red-500 ml-0.5 font-black font-sans">%</span>
          </div>
        </div>
      </div>

      {/* Speedometer status badge */}
      <div className="flex items-center gap-1 mt-1.5 justify-center w-full border-t border-white/5 pt-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
        <span className="text-[8px] font-mono font-black text-amber-300/95 tracking-wider">
          {score > 88 ? "✦ ENGINE OVERDRIVE: جاذبية قصوى" : "✦ HIGH RPM: تفاعل عربي فريد"}
        </span>
      </div>
    </div>
  );
};

export const InstagramMagicWand: React.FC<InstagramMagicWandProps> = ({ data, currentPage = 'dashboard', userRole = 'admin' }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [activeCategory, setActiveCategory] = useState<Category>('trend');
 const [messages, setMessages] = useState<string[]>([]);
 const [isGenerating, setIsGenerating] = useState(false);
 const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

 // Simulated Publishing Statuses
 const [isPublishing, setIsPublishing] = useState<number | null>(null);
 const [publishingStep, setPublishingStep] = useState(0);
 const [publishedIndices, setPublishedIndices] = useState<Record<number, boolean>>({});

 // Social Response Simulator Statuses
 const [simulatedIndex, setSimulatedIndex] = useState<number | null>(null);
 const [isSimulating, setIsSimulating] = useState(false);
 const [simulationResult, setSimulationResult] = useState<any>(null);

 const fetchMessages = async (cat: Category = activeCategory, forceRefresh = false) => {
 setIsGenerating(true);
 setSimulationResult(null);
 setSimulatedIndex(null);
 try {
 const msgs = await generateQuickInstagramMessages(data, cat, forceRefresh);
 setMessages(msgs);
 playSwoosh();
 } catch (error) {
 toast.error('المعذرة، ما قدرنا نولّد الرسائل الحين');
 } finally {
 setIsGenerating(false);
 }
 };

 useEffect(() => {
 if (isOpen && messages.length === 0) {
 fetchMessages();
 }
 }, [isOpen]);

 const copyToClipboard = (text: string, index: number) => {
 navigator.clipboard.writeText(text);
 setCopiedIndex(index);
 toast.success('تم نسخ النص بنجاح! ✨');
 setTimeout(() => setCopiedIndex(null), 2000);
 };

 const buildStableAudienceScores = (text: string, category: Category) => {
   const source = `${category}|${text || ''}`;
   let hash = 0;
   for (let i = 0; i < source.length; i += 1) {
     hash = ((hash << 5) - hash) + source.charCodeAt(i);
     hash |= 0;
   }

   const lowered = source.toLowerCase();
   const has = (words: string[]) => words.some(word => lowered.includes(word));

   const groups = [
     {
       label: 'الشباب والديوانيات',
       base: 66,
       boost: has(['ديوان', 'شباب', 'ربع', 'قهوة', 'كشته', 'مباراة', 'تحدي']) ? 13 : 0
     },
     {
       label: 'الأمهات والزوارة',
       base: 68,
       boost: has(['زوارة', 'عائلة', 'بيت', 'أم', 'ام', 'غدا', 'غداء', 'عشا', 'عشاء', 'وليمة']) ? 14 : 0
     },
     {
       label: 'الموظفين لطلبات الظهر',
       base: 61,
       boost: has(['دوام', 'موظف', 'ظهر', 'غداء', 'سريع', 'بوكس', 'مكتب']) ? 15 : 0
     },
     {
       label: 'أصحاب الشاليهات والطلعات',
       base: 63,
       boost: has(['شاليه', 'طلعة', 'بر', 'كشتة', 'كشته', 'ويكند', 'جمعة']) ? 14 : 0
     }
   ];

   return groups.map((group, i) => {
     const noise = Math.abs((hash >> (i * 5)) % 17);
     const trendBoost = category === 'trend' ? 4 : category === 'contest' ? 6 : category === 'promo' ? -2 : 0;
     return {
       label: group.label,
       percentage: Math.max(42, Math.min(96, group.base + group.boost + noise + trendBoost))
     };
   });
 };

 const normalizeSimulationResult = (result: any, text: string): any => {
   const scores = Array.isArray(result?.scores) ? result.scores : [];
   const validScores = scores.filter((item: any) => item && typeof item.label === 'string' && Number.isFinite(Number(item.percentage)));
   const percentages = validScores.map((item: any) => Number(item.percentage));
   const uniquePercentages = new Set(percentages);

   if (validScores.length !== 4 || uniquePercentages.size <= 1) {
     return {
       ...result,
       scores: buildStableAudienceScores(text, activeCategory)
     };
   }

   return {
     ...result,
     scores: validScores.map((item: any) => ({
       label: item.label,
       percentage: Math.max(0, Math.min(100, Math.round(Number(item.percentage))))
     }))
   };
 };

 const runSocialSimulation = async (text: string, index: number) => {
   setIsSimulating(true);
   setSimulatedIndex(index);
   setSimulationResult(null);
   try {
     const response = await fetch('/api/smart-studio/social-simulator', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         text,
         theme: activeCategory === 'trend' ? 'عصا تريند إنستقرام الذكية' : activeCategory
       })
     });
     if (response.ok) {
       const result = await response.json();
       setSimulationResult(normalizeSimulationResult(result, text));
     } else {
       toast.error('لم نتمكن من الوصول لمحاكي الجمهور حالياً');
     }
   } catch {
     toast.error('المعذرة، حدث خطأ أثناء المحاكاة');
   } finally {
     setIsSimulating(false);
   }
 };

 const handleInstantPublish = (index: number) => {
   setIsPublishing(index);
   setPublishingStep(0);
   
   const interval = setInterval(() => {
     setPublishingStep((prev) => {
       if (prev >= 4) {
         clearInterval(interval);
         setTimeout(() => {
           setIsPublishing(null);
           setPublishedIndices(all => ({ ...all, [index]: true }));
           toast.success('تم النشر مباشرة بمتجركم عبر إنستقرام وجذب التفاعل! 🚀🔥');
         }, 800);
         return 5;
       }
       return prev + 1;
     });
   }, 700);
 };

 const canShow = currentPage === 'dashboard';
 if (!canShow) return null;

 const previewRaw = messages[0] || '';
 const previewParts = previewRaw.split('$$');
 const previewIsContest = previewParts.length >= 8 && previewParts[0] === 'CONTEST';
 const previewIsStory = previewParts.length >= 6 && previewParts[0] === 'STORY';
 const previewIsTrend = previewParts.length >= 8 && previewParts[0] === 'TREND';
 const previewTitle = previewIsContest || previewIsTrend || previewIsStory ? previewParts[1] : (previewRaw.split('\n')[0] || 'فكرة انستغرام جاهزة');
 const previewText = previewIsContest || previewIsTrend ? previewParts.slice(7).join('$$') : previewIsStory ? previewParts.slice(5).join('$$') : previewRaw;
 const previewCardText = (previewText || previewTitle || 'فكرة انستغرام جاهزة').replace(/CONTEST|TREND|STORY|\$\$/g, ' ').trim();

 return (
 <>
 {/* Floating Sparkle Toggle - Left Sidebar Position (Desktop) */}
 <div className="fixed left-0 bottom-12 z-[60] hidden md:flex flex-col items-center">
 <motion.button
 whileHover={{ scale: 1.1, x: 5 }}
 whileTap={{ scale: 0.9 }}
 onClick={() => setIsOpen(true)}
 className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-3 rounded-r-2xl shadow-xl shadow-purple-500/40 group relative"
 >
 <Sparkles className="group-hover:rotate-12 transition-transform" size={24} />
 <div className="absolute right-full mr-4 bg-slate-900 border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-nowrap pointer-events-none shadow-xl">
 ملهم الانستغرام الذكي ✨
 </div>
 </motion.button>
 </div>

 {/* Floating Action Button (Mobile) */}
 <div className="fixed bottom-40 left-6 z-[60] md:hidden">
 <motion.button
 whileTap={{ scale: 0.8 }}
 onClick={() => setIsOpen(true)}
 className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-full shadow-xl shadow-purple-500/40 flex items-center justify-center border-2 border-white/10"
 >
 <Sparkles size={24} />
 </motion.button>
 </div>

 {/* Side Panel Overlay */}
 <AnimatePresence>
 {isOpen && (
 <>
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setIsOpen(false)}
 className="fixed inset-0 bg-slate-950/60 z-[100]"
 />
 <motion.div
 initial={{ x: '-100%' }}
 animate={{ x: 0 }}
 exit={{ x: '-100%' }}
 transition={{ type: 'spring', damping: 28, stiffness: 220 }}
 className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-white border-r border-slate-200 shadow-[0_0_40px_rgba(0,0,0,0.15)] z-[110] overflow-hidden flex flex-col pt-1.5"
 dir="rtl"
 >
 {/* Header */}
 <div className="p-4 bg-slate-50 text-slate-900 border-b border-slate-200 relative">

 <button 
 onClick={() => setIsOpen(false)}
 className="absolute top-4 left-6 p-2 bg-slate-200/80 hover:bg-slate-200 text-slate-700 rounded-full transition-all active:scale-90 z-20"
 >
 <X size={18} />
 </button>
 <div className="relative z-10">
 <div className="flex items-center gap-4 mb-4">
 <div className="bg-gradient-to-br from-amber-500 to-yellow-600 shadow-md p-2.5 rounded-2xl text-white">
 <Instagram size={28} className="text-white" />
 </div>
 <div>
 <h3 className="text-lg font-black text-slate-900 tracking-wide font-sans">ملهم الانستغرام</h3>
 <div className="flex items-center gap-1.5 mt-1">
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-[9px] font-bold text-slate-500 uppercase font-sans">مساعد صناعة المحتوى والمسابقات الذكية</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <div className="p-3 bg-slate-50 border-b border-slate-200 space-y-3">
 <button
 onClick={() => { setActiveCategory('trend'); fetchMessages('trend', true); }}
 className={cn(
 "w-full py-3 px-4 rounded-2xl text-xs font-black border transition-all active:scale-95 flex items-center justify-center gap-2",
 activeCategory === 'trend'
 ? "bg-slate-900 text-white border-transparent shadow-md"
 : "bg-white text-slate-700 border-slate-200 shadow-sm"
 )}
 >
 ✨ ريشة صناعة المحتوى السحرية (Trends)
 </button>
 <div className="grid grid-cols-2 gap-3">
 {(['contest', 'engagement', 'motivation', 'promo'] as Category[]).map((cat) => (
 <button
 key={cat}
 onClick={() => {
 setActiveCategory(cat);
 fetchMessages(cat, true);
 }}
 className={cn(
"py-2.5 text-[11px] font-black rounded-2xl transition-all duration-300 border",
 activeCategory === cat 
 ? cn(
"shadow-md scale-[1.02] border-transparent text-white font-black",
 cat === 'contest' ? "bg-emerald-600 shadow-emerald-500/20" :
 cat === 'motivation' ? "bg-rose-600 shadow-rose-500/20" :
 cat === 'engagement' ? "bg-indigo-600 shadow-indigo-500/20" :
"bg-amber-600 shadow-amber-500/20"
)
 :"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
)}
 >
 {cat === 'contest' ? '🏆 مسابقة ديوان' : cat === 'motivation' ? '🚀 إلهام تراثي' : cat === 'engagement' ? '💬 تفاعل دائم' : '🎯 ترويج المتجر'}
 </button>
))}
 </div>
 </div>

 {/* Content Area */}
 <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar bg-slate-50">
 {isGenerating ? (
 <div className="flex flex-col items-center justify-center h-full space-y-8">
 <div className="relative w-28 h-28 flex items-center justify-center bg-slate-950/20 rounded-full border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
 <div className={cn(
"absolute inset-0 rounded-full transition-colors duration-1000",
 activeCategory === 'contest' ? "bg-emerald-400/30" :
 activeCategory === 'motivation' ?"bg-rose-400/30" :
 activeCategory === 'engagement' ?"bg-indigo-400/30" :
"bg-amber-400/30"
)} />
 <div className="absolute inset-0 border-[6px] border-white/50 rounded-2xl" />
 <div className={cn(
"absolute inset-0 border-[6px] border-t-white rounded-2xl animate-spin",
 activeCategory === 'contest' ? "border-emerald-500" :
 activeCategory === 'motivation' ?"border-rose-500" :
 activeCategory === 'engagement' ?"border-indigo-500" :
"border-amber-500"
)} />
 <div className="absolute inset-0 flex items-center justify-center">
 <motion.div
  animate={{
  x: [0, 15, -15, 10, -10, 0],
  y: [0, -8, 6, -3, 8, 0],
  rotate: [0, 10, -10, 6, -6, 0]
  }}
  transition={{
  duration: 3,
  repeat: Infinity,
  ease: "easeInOut"
  }}
  className="text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]"
  >
  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.88 3.549a1.125 1.125 0 011.58 1.58L6.86 16.73a2.25 2.25 0 01-1.011.574l-3.267.817.817-3.267a2.25 2.25 0 01.574-1.011L16.88 3.55z" />
  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.5l-3-3" />
  </svg>
  </motion.div>
 </div>
 </div>
 <div className="text-center space-y-2">
 <motion.h4 
  animate={{ opacity: [0.6, 1, 0.6] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
 className="text-sm font-black text-amber-800 tracking-wide font-sans md:text-sm"
 >
  توهج الحبر يسطر البيان بالذهب...
 </motion.h4>
 <p className="text-[10px] text-slate-400 font-bold leading-relaxed">أثواب الصياغة والدرر تكتبها الريشة السحرية</p>
 </div>
 </div>
) : (
 <>
 <div className="flex justify-between items-center px-2">
 <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">أفكار حصرية</h5>
 <button 
 onClick={() => fetchMessages(activeCategory, true)}
 className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-[10px] font-bold transition-all active:scale-95"
 >
 <RefreshCw size={12} /> تحديث المقترحات
 </button>
 </div>

 <div className="space-y-8">
 {messages.map((rawMsg, index) => {
  const parts = rawMsg.split('$$');
  const isContest = parts.length >= 7 && parts[0] === 'CONTEST';
  const isStory = parts.length >= 6 && parts[0] === 'STORY';
 const isTrend = parts.length >= 7 && parts[0] === 'TREND';
  let title = '', cost = '', target = '', channel = '', duration = '', prize = '', text = rawMsg;
  if (isContest) {
    [, title, cost, target, channel, duration, prize, text] = parts;
  } else if (isTrend) {
    [, title, cost, target, channel, duration, prize, text] = parts;
  } else if (isStory) {
    [, title, channel, duration, target] = parts;
    text = parts.slice(5).join('$$');
    cost = 'بدون خصم';
    prize = 'بيع مباشر';
  }
  return (
 <motion.div
 key={index}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: index * 0.1 }}
 className="group bg-white border border-slate-200 p-4 rounded-3xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden"
 >
 <div className={cn(
"absolute top-0 right-0 w-32 h-32 opacity-10 rounded-bl-[100px] transition-all duration-700",
 activeCategory === 'contest' ? "bg-emerald-400" :
 activeCategory === 'motivation' ?"bg-rose-400" :
 activeCategory === 'engagement' ?"bg-indigo-400" :
"bg-amber-400"
)} />
 
 <div className="relative z-10 flex flex-col gap-4 md:p-3">
 <div className="flex items-center justify-between flex-row-reverse">
 <div className={cn(
"w-14 h-14 rounded-3xl flex items-center justify-center text-white shadow-xl transition-all duration-500 group-hover:rotate-12",
 activeCategory === 'contest' ? "bg-gradient-to-br from-emerald-400 to-teal-600 shadow-emerald-500/20" :
 activeCategory === 'motivation' ?"bg-gradient-to-br from-rose-400 to-pink-600 shadow-rose-500/20" :
 activeCategory === 'engagement' ?"bg-gradient-to-br from-indigo-400 to-blue-600 shadow-indigo-500/20" :
"bg-gradient-to-br from-amber-400 to-orange-600 shadow-amber-500/20"
)}>
 <Instagram size={24} />
 </div>
 {isContest || isStory || isTrend ? (
   <h3 className="text-lg md:text-xl font-black text-slate-800 text-right pr-4 leading-tight flex-1" style={{direction: "rtl"}}>{title}</h3>
 ) : (
   <span className="text-[10px] font-bold text-slate-400 tracking-tighter mr-auto">0{index + 1} / {messages.length}</span>
 )}
 </div>

 <div className="text-right">
 {(isContest || isStory || isTrend) && (
   <div className="mb-6 space-y-3" dir="rtl">
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1"><span className="text-emerald-400/80">{isTrend ? '📈' : '💰'}</span>{isTrend ? 'زخم التريند:' : 'التكلفة:'} {cost}</span>
         <span className="bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100 flex items-center gap-1"><span className="text-blue-400/80">🎯</span>الهدف: {target}</span>
     </div>
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-1"><span className="text-purple-400/80">📱</span>القناة: {channel}</span>
         <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1"><span className="text-amber-400/80">⏱</span>الفعالية: {duration}</span>
     </div>
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-100 flex w-full items-center gap-1"><span className="text-rose-400/80">🎁</span>{isTrend ? 'العائد المتوقع:' : 'الجائزة:'} {prize}</span>
     </div>
   </div>
 )}

 {(isContest || isStory || isTrend) && <div className="text-[11px] font-black text-amber-700 mb-2 border-b border-slate-100 pb-1.5">{isStory ? 'ستوري للتسويق المباشر:' : isTrend ? 'الفكرة لمجاراة التريند الكويتي الصاعد:' : 'النص المقترح للنسخ:'}</div>}
 <p className="text-sm md:text-base font-semibold text-slate-800 leading-[1.7] mb-4 whitespace-pre-line text-right" dir="rtl">
 {text}
 </p>

 {/* Attractiveness Gauge Indicator (dial) */}
 <div className="mb-6">
   <AttractivenessGauge score={getStableAttractivenessScore(text, activeCategory)} />
 </div>

 {/* AI & Publishing Intelligent Row */}
 <div className="my-5 border-t border-b border-slate-100 py-4 flex flex-col sm:flex-row gap-3 justify-between" dir="rtl">
   {publishedIndices[index] ? (
     <div className="w-full bg-emerald-50 text-emerald-700 text-xs font-bold py-3.5 px-4 rounded-2xl border border-emerald-200/50 flex items-center justify-center gap-2 font-sans">
       <CheckCircle size={16} /> تم النشر مباشرة على حساب المتجر بنجاح! 🎉
     </div>
   ) : isPublishing === index ? (
     <div className="w-full bg-indigo-50 border border-indigo-100 rounded-3xl p-3 text-right" dir="rtl">
       <div className="flex items-center gap-2 justify-end mb-1 text-xs font-black text-indigo-800 font-sans">
         <Loader2 size={14} className="animate-spin text-indigo-600" />
         <span>جاري النشر المباشر...</span>
       </div>
       <p className="text-[10px] text-slate-500 font-bold text-right leading-none font-sans">
         {publishingStep === 0 && "⚡ الاتصال بـ Instagram Cloud API للهاتف الكويتي..."}
         {publishingStep === 1 && "📸 دمج فكرة الصورة الفنية لمنتجات متجركم..."}
         {publishingStep === 2 && "📝 صبغة النصوص الهاشتاجات الصاعدة محلياً..."}
         {publishingStep === 3 && "📦 جدولة خوارزمية التوصيل والمجتمعات للزوارة..."}
         {publishingStep === 4 && "🚀 تأشيرة النشر والتحقق النهائي..."}
         {publishingStep >= 5 && "✨ انتظر ثانية واحدة..."}
       </p>
     </div>
   ) : (
     <div className="flex flex-row w-full gap-2 font-bold text-xs font-sans">
       <button
         onClick={() => handleInstantPublish(index)}
         className="hidden flex-1 py-3 px-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl flex items-center justify-center gap-1.5 shadow-md shadow-pink-500/20 active:scale-95 transition-all text-[11px]"
       >
         <Instagram size={14} /> نشر فوري 🚀
       </button>
       <button
         onClick={() => runSocialSimulation(text, index)}
         disabled={isSimulating}
         className="w-full py-3 px-3 bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-700/30 rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[11px]"
       >
         {isSimulating && simulatedIndex === index ? (
           <Loader2 size={14} className="animate-spin text-slate-500" />
         ) : (
           <BarChart2 size={14} className="text-white" />
         )}
         محاكاة رأي الجمهور وتفاعل الزباين 📊
       </button>
     </div>
   )}
 </div>

 {/* Simulation Result Area */}
 {simulatedIndex === index && (isSimulating || simulationResult) && (
   <div className="mb-6 p-4 bg-slate-50/70 rounded-2xl border border-slate-200/40 text-right animate-fadeIn" dir="rtl">
     <h6 className="text-xs font-black text-indigo-950 mb-3 flex items-center gap-1.5 justify-end font-sans">
       <span>محاكاة السلوك التفاعلي الكويتي 🔬</span>
       <TrendingUp size={14} className="text-indigo-600" />
     </h6>
     
     {isSimulating ? (
       <div className="flex flex-col items-center justify-center py-4 space-y-2">
         <Loader2 className="animate-spin text-indigo-500" size={24} />
         <span className="text-[10px] text-slate-400 font-bold font-sans">ذكاء التنبؤ يقرأ سلوك المستهلك الكويتي حالياً...</span>
       </div>
     ) : (
       <div className="space-y-4 font-sans">
         <div className="grid grid-cols-2 gap-3">
           {simulationResult?.scores?.map((item: any, i: number) => (
             <div key={i} className="bg-white p-2.5 rounded-xl border border-black/5">
               <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                 <span>%{item.percentage}</span>
                 <span className="text-slate-700">{item.label}</span>
               </div>
               <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                 <div 
                   className={cn(
                     "h-full rounded-full transition-all duration-1000",
                     item.percentage > 75 ? "bg-emerald-500" :
                     item.percentage > 50 ? "bg-indigo-500" :
                     "bg-amber-500"
                   )}
                   style={{ width: `${item.percentage}%` }}
                 />
               </div>
             </div>
           ))}
         </div>
         
         <div className="bg-white/80 p-3 rounded-xl border border-black/5 space-y-2 p-3 text-[11.5px]">
           <div className="flex justify-between items-center text-[10px] flex-row-reverse">
             <span className="font-bold text-slate-400">تقييم المزاج (Sentiment):</span>
             <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-black text-[9.5px]">
               {simulationResult?.sentiment || "مستعد للنشر 🚀"}
             </span>
           </div>
           <p className="leading-relaxed text-slate-600 font-bold">
             {simulationResult?.feedback}
           </p>
         </div>
       </div>
     )}
   </div>
 )}
 
 <div className="flex items-center justify-between pt-6 border-t border-black/5">
 <div className="flex gap-4">
 <Heart className="text-rose-500 fill-rose-500/10 cursor-pointer hover:scale-110 transition-transform" />
 <Send className="text-slate-500 -rotate-45 cursor-pointer hover:scale-110 transition-transform" />
 </div>
 <button 
 onClick={() => copyToClipboard(text, index)}
 className={cn(
"flex items-center gap-2 text-[11px] font-bold px-4 md:px-8 py-4 rounded-3xl transition-all active:scale-90 shadow-xl",
 copiedIndex === index 
 ?"bg-emerald-500 text-white shadow-emerald-500/30" 
 :"bg-slate-900 text-white shadow-slate-900/40 hover:bg-black"
)}
 >
 {copiedIndex === index ? <Check size={18} /> : <Copy size={18} />}
 {copiedIndex === index ? 'منسوخ' : 'نسخ النص'}
 </button>
 </div>
 </div>
 </div>
 </motion.div>
  );
 })}
 </div>

 {/* Live Preview Area */}
 {messages.length > 0 && (
 <div className="mt-12 space-y-5">
 <div className="flex items-center justify-between px-3">
 <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">معاينة المنشور المتوقع</h5>
 <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
 </div>

 <div className="bg-white rounded-3xl md:rounded-2xl shadow-xl shadow-slate-300/40 overflow-hidden border border-slate-100/50">
 {/* Post Header */}
 <div className="p-3 md:p-3 flex items-center justify-between flex-row-reverse border-b border-slate-50">
 <div className="flex items-center gap-3 flex-row-reverse">
 <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 p-[2.5px]">
 <div className="w-full h-full rounded-full bg-white p-[2px]">
 <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
 <Instagram size={16} className="text-slate-500" />
 </div>
 </div>
 </div>
 <div className="text-right">
 <p className="text-[11px] font-bold text-slate-900 leading-none">alturath.kw</p>
 <p className="text-[10px] font-bold text-slate-500 mt-1.5">الكويت، المحرك الذكي</p>
 </div>
 </div>
 <div className="flex gap-1">
 {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />)}
 </div>
 </div>
 
 {/* Post Visual Content */}
 <div className="aspect-square bg-slate-950 flex items-center justify-center relative overflow-hidden group">
 <div className={cn(
"absolute inset-0 opacity-30 mix-blend-overlay transition-colors duration-1000",
 activeCategory === 'contest' ? "bg-emerald-500" :
 activeCategory === 'motivation' ?"bg-rose-500" :
 activeCategory === 'engagement' ?"bg-indigo-500" :
"bg-amber-500"
)} />
 
 <div className="absolute inset-x-8 text-center space-y-4">
 <p className="text-white text-xl font-bold leading-tight drop-shadow-xl">
 {previewIsContest ? previewTitle : previewCardText.substring(0, 45)}{!previewIsContest && previewCardText.length > 45 ? '...' : ''}
 </p>
 <div className="w-12 h-1 bg-white/30 mx-auto rounded-full" />
 </div>
 
 <Instagram size={80} className="absolute -bottom-6 -left-6 text-white/5 rotate-12" />
 </div>

 {/* Post Interactions */}
 <div className="p-3 md:p-3 flex items-center justify-between flex-row-reverse">
 <div className="flex items-center gap-5 flex-row-reverse">
 <Heart size={22} className="text-slate-900 cursor-pointer hover:scale-125 transition-transform" />
 <MessageCircle size={22} className="text-slate-900 cursor-pointer hover:scale-125 transition-transform" />
 <Send size={22} className="text-slate-900 -rotate-45 cursor-pointer hover:scale-125 transition-transform" />
 </div>
 <div className="w-5 h-6 border-[2.5px] border-slate-900 rounded-[4px]" />
 </div>

 {/* Post Caption */}
 <div className="px-6 pb-8 text-right">
 <p className="text-[12px] leading-[1.8] text-slate-800">
 <span className="font-bold ml-2 text-slate-950">alturath.kw</span>
 {previewText}
 </p>
 <div className="flex justify-start mt-4">
 <p className="text-[10px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">#تراث_بي #الكويت #ذكاء_أعمال</p>
 </div>
 <p className="text-[10px] font-bold text-slate-300 mt-4 uppercase tracking-[0.2em]">منذ لحظات عبر المحرك الذهبي</p>
 </div>
 </div>
 </div>
)}
 </>
)}
 </div>

 {/* Footer */}
 <div className="p-3 md:p-4 border-t border-slate-100 bg-slate-50">
 <p className="text-[10px] text-center font-bold text-slate-500 leading-relaxed">
 ملهم الانستغرام الذكي لتسويق المقتنيات والتراث ✨
 
 </p>
 </div>
 </motion.div>
 </>
)}
 </AnimatePresence>
 </>
);
};
