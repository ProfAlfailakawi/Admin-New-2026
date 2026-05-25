import React, { useState, useEffect } from 'react';
import { Sparkles, X, RefreshCw, Copy, Check, Instagram, Send, Heart, MessageCircle } from 'lucide-react';
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

type Category = 'motivation' | 'engagement' | 'promo' | 'contest';

export const InstagramMagicWand: React.FC<InstagramMagicWandProps> = ({ data, currentPage = 'dashboard', userRole = 'admin' }) => {
 const [isOpen, setIsOpen] = useState(false);
 const [activeCategory, setActiveCategory] = useState<Category>('contest');
 const [messages, setMessages] = useState<string[]>([]);
 const [isGenerating, setIsGenerating] = useState(false);
 const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

 const fetchMessages = async (cat: Category = activeCategory, forceRefresh = false) => {
 setIsGenerating(true);
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

 const canShow = currentPage === 'dashboard';
 if (!canShow) return null;

 const previewRaw = messages[0] || '';
 const previewParts = previewRaw.split('$$');
 const previewIsContest = previewParts.length >= 8 && previewParts[0] === 'CONTEST';
 const previewTitle = previewIsContest ? previewParts[1] : (previewRaw.split('\n')[0] || 'فكرة انستغرام جاهزة');
 const previewText = previewIsContest ? previewParts.slice(7).join('$$') : previewRaw;
 const previewCardText = (previewText || previewTitle || 'فكرة انستغرام جاهزة').replace(/CONTEST|\$\$/g, ' ').trim();

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
 className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-xl z-[110] overflow-hidden flex flex-col border-r border-white/10"
 dir="rtl"
 >
 {/* Header */}
 <div className="p-3 md:p-3 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white relative">
 <button 
 onClick={() => setIsOpen(false)}
 className="absolute top-3 md:p-4 left-6 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 z-20"
 >
 <X size={18} />
 </button>
 <div className="relative z-10">
 <div className="flex items-center gap-4 mb-4">
 <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
 <Instagram size={28} className="text-white" />
 </div>
 <div>
 <h3 className="text-2xl font-bold tracking-tight">ملهم الانستغرام</h3>
 <div className="flex items-center gap-1.5 mt-1">
 <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
 <span className="text-[10px] font-bold text-indigo-300 uppercase">المحرك الذهبي نشط</span>
 </div>
 </div>
 </div>
 <p className="text-indigo-200/80 text-xs font-bold leading-relaxed">تخطى"حيرة المحتوى" وأبهر متابعينك بلمسة كويتية ناطعة وذكية.</p>
 </div>
 </div>

 {/* Tabs */}
 <div className="p-3 bg-slate-50 border-b border-black/5 space-y-3">
 <button
 onClick={() => { setActiveCategory('contest'); fetchMessages('contest', true); }}
 className={cn(
 "w-full py-4 px-4 rounded-3xl text-sm font-black border-2 transition-all active:scale-95 flex items-center justify-center gap-2",
 activeCategory === 'contest'
 ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-transparent shadow-xl shadow-emerald-500/30"
 : "bg-white text-emerald-700 border-emerald-100 shadow-sm"
 )}
 >
 🏆 مسابقات الانستغرام
 </button>
 <div className="grid grid-cols-3 gap-3">
 {(['engagement', 'motivation', 'promo'] as Category[]).map((cat) => (
 <button
 key={cat}
 onClick={() => {
 setActiveCategory(cat);
 fetchMessages(cat, true);
 }}
 className={cn(
"flex-1 py-3 text-[11px] font-bold rounded-2xl transition-all duration-500 active:scale-90 border-2",
 activeCategory === cat 
 ? cn(
"shadow-xl scale-[1.05] border-transparent text-white",
 cat === 'contest' ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/30" :
 cat === 'motivation' ?"bg-gradient-to-br from-rose-500 to-pink-600 shadow-rose-500/30" :
 cat === 'engagement' ?"bg-gradient-to-br from-indigo-500 to-blue-600 shadow-indigo-500/30" :
"bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/30"
)
 :"bg-white/80 text-slate-500 border-slate-100 hover:border-slate-200/60"
)}
 >
 {cat === 'contest' ? '🏆 مسابقات' : cat === 'motivation' ? '🚀 إلهام' : cat === 'engagement' ? '💬 تفاعل' : '🎯 ترويج'}
 </button>
))}
 </div>
 </div>

 {/* Content Area */}
 <div className={cn(
"flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar transition-colors duration-1000",
 activeCategory === 'contest' ? "bg-emerald-50/50" :
 activeCategory === 'motivation' ?"bg-rose-50/50" :
 activeCategory === 'engagement' ?"bg-indigo-50/50" :
"bg-amber-50/50"
)}>
 {isGenerating ? (
 <div className="flex flex-col items-center justify-center h-full space-y-8">
 <div className="relative w-24 h-24">
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
 <Sparkles className="animate-bounce" size={28} />
 </div>
 </div>
 <div className="text-center space-y-2">
 <h4 className="text-lg font-bold text-slate-800">نبتكر...</h4>
 <p className="text-xs font-bold text-slate-500">محرك الإبداع الذكي يكتب لك الآن</p>
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
  let title = '', cost = '', target = '', channel = '', duration = '', prize = '', text = rawMsg;
  if (isContest) {
    [, title, cost, target, channel, duration, prize, text] = parts;
  }
  return (
 <motion.div
 key={index}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: index * 0.1 }}
 className="group bg-white border border-slate-100 p-3 md:p-3 rounded-3xl md:rounded-2xl shadow-xl hover:shadow-indigo-500/10 transition-all duration-700 relative overflow-hidden"
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
 {isContest ? (
   <h3 className="text-xl md:text-2xl font-black text-slate-800 text-right pr-4 leading-tight flex-1" style={{direction: "rtl"}}>{title}</h3>
 ) : (
   <span className="text-[10px] font-bold text-slate-300 tracking-tighter mr-auto">0{index + 1} / {messages.length}</span>
 )}
 </div>

 <div className="text-right">
 {isContest && (
   <div className="mb-6 space-y-3" dir="rtl">
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1"><span className="text-emerald-400/80">💰</span>التكلفة: {cost}</span>
         <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 flex items-center gap-1"><span className="text-blue-400/80">🎯</span>الهدف: {target}</span>
     </div>
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-xl border border-purple-100 flex items-center gap-1"><span className="text-purple-400/80">📱</span>النشر: {channel}</span>
         <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1"><span className="text-amber-400/80">⏱</span>المدة: {duration}</span>
     </div>
     <div className="flex flex-wrap gap-2 text-[10.5px] font-bold">
         <span className="bg-rose-50 text-rose-700 px-3 py-1.5 rounded-xl border border-rose-100 flex w-full items-center gap-1"><span className="text-rose-400/80">🎁</span>الجائزة: {prize}</span>
     </div>
   </div>
 )}

 {isContest && <div className="text-[11px] font-bold text-slate-400 mb-3 border-b border-black/5 pb-2">النص الجاهز للنسخ:</div>}
 <p className="text-lg md:text-xl font-bold text-slate-900 leading-[1.6] mb-10 whitespace-pre-line text-right" dir="rtl">
 {text}
 </p>
 
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
 استخدم هذه الرسائل والمسابقات لرفع التفاعل بدون خصومات مؤذية أو خسارة. <br/>
 المسابقات تُنوّع تلقائياً وتراعي التكلفة، والنصوص جاهزة للنسخ.
 </p>
 </div>
 </motion.div>
 </>
)}
 </AnimatePresence>
 </>
);
};
