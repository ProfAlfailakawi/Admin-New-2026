import React, { useMemo, useState } from 'react';
import { Sparkles, X, RefreshCw, Copy, Check, Instagram, Send, Heart, MessageCircle, BarChart2, Loader2, Flame, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppState } from '../types';
import { buildSalesDrivenStoryIdeas } from '../lib/ai-engine';
import {
  computeStudioInsights,
  buildContestKits,
  ContestKit,
  DEFAULT_HASHTAGS
} from '../lib/instagram-studio';
import { playSwoosh } from '../lib/sounds';
import { toast } from 'sonner';

interface InstagramMagicWandProps {
  data: AppState;
  currentPage?: string;
  userRole?: 'admin' | 'partner' | 'local' | null;
}

type Category = 'motivation' | 'engagement' | 'promo' | 'contest' | 'trend';
type KitSection = 'post' | 'reminder' | 'winner';

interface IdeaChip {
  icon: string;
  label: string;
  value: string;
}

interface ParsedIdea {
  title: string | null;
  chips: IdeaChip[];
  text: string;
}

interface SimResult {
  scores: { label: string; percentage: number }[];
  sentiment?: string;
  feedback?: string;
}

/** يفكك صيغ الخادم (TREND$$ / STORY$$) إلى بطاقة واضحة — بتسمية صحيحة للحقول */
function parseIdea(raw: string): ParsedIdea {
  const parts = raw.split('$$');
  if (parts[0] === 'TREND' && parts.length >= 8) {
    const [, title, budget, goal, channel, timing, expected] = parts;
    return {
      title,
      chips: [
        { icon: '📱', label: 'القناة', value: channel },
        { icon: '⏱', label: 'مدة الفعالية', value: timing },
        { icon: '🎯', label: 'الهدف', value: goal },
        { icon: '💰', label: 'الميزانية', value: budget },
        { icon: '📈', label: 'عائد متوقع (تقدير الذكاء)', value: expected }
      ],
      text: parts.slice(7).join('$$')
    };
  }
  if (parts[0] === 'STORY' && parts.length >= 6) {
    const [, title, product, seasonTag, goal] = parts;
    return {
      title,
      chips: [
        { icon: '🍽', label: 'الصنف', value: product },
        { icon: '🎯', label: '', value: goal },
        { icon: '🗓', label: 'الطابع', value: seasonTag }
      ],
      text: parts.slice(5).join('$$')
    };
  }
  return { title: null, chips: [], text: raw };
}

const categoryTheme: Record<Category, { chip: string; ring: string; soft: string }> = {
  trend: { chip: 'from-violet-600 to-purple-700 shadow-purple-500/30', ring: 'border-purple-500', soft: 'bg-purple-400' },
  contest: { chip: 'from-emerald-500 to-teal-600 shadow-emerald-500/30', ring: 'border-emerald-500', soft: 'bg-emerald-400' },
  engagement: { chip: 'from-indigo-500 to-blue-600 shadow-indigo-500/30', ring: 'border-indigo-500', soft: 'bg-indigo-400' },
  motivation: { chip: 'from-rose-500 to-pink-600 shadow-rose-500/30', ring: 'border-rose-500', soft: 'bg-rose-400' },
  promo: { chip: 'from-amber-500 to-orange-600 shadow-amber-500/30', ring: 'border-amber-500', soft: 'bg-amber-400' }
};

const categoryLabel: Record<Category, string> = {
  trend: '✨ ريشة صناعة المحتوى السحرية (Trends)',
  contest: '🏆 مسابقة ديوان',
  engagement: '💬 تفاعل دائم',
  motivation: '🚀 إلهام تراثي',
  promo: '🎯 ترويج المتجر'
};

export const InstagramMagicWand: React.FC<InstagramMagicWandProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('trend');
  const [ideasByCat, setIdeasByCat] = useState<Partial<Record<Category, ParsedIdea[]>>>({});
  const [kits, setKits] = useState<ContestKit[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [kitSection, setKitSection] = useState<Record<string, KitSection>>({});
  const [sim, setSim] = useState<{ key: string | null; loading: boolean; result: SimResult | null }>({ key: null, loading: false, result: null });

  // مؤشرات حقيقية 100% من بيانات المطعم
  const insights = useMemo(() => computeStudioInsights(data), [data]);

  /** بديل محلي صادق عند تعذر الخادم — يستخدم أسماء أصنافكم الحقيقية فقط */
  const buildLocalFallback = (cat: Category): ParsedIdea[] => {
    const n1 = insights.topProducts[0]?.name || 'طبقكم المفضل';
    const n2 = insights.topProducts[1]?.name || 'طبق ثاني من المنيو';
    const texts = cat === 'motivation'
      ? [
          `من مطبخ التراث لبيوتكم — نطبخ بنفس الطريقة اللي تعودتوا عليها، وبنفس الحب 🤍`,
          `${n1} ما صار الأكثر طلباً صدفة... جربوه وبتعرفون السبب 😉`,
          `الأكل الكويتي الأصيل ما يحتاج تعريف — يحتاج بس تجربة وحدة.`
        ]
      : cat === 'engagement'
        ? [
            `منو جرب ${n1} عندنا؟ قيموه من ١ إلى ١٠ بالتعليقات 👇`,
            `سؤال الديوانية: ${n1} ولا ${n2}؟ وليش؟ 🤔`,
            `شنو أول طلب طلبتوه من التراث؟ اكتبوه بالتعليقات — نبي نعرف قصتكم معانا 🤍`
          ]
        : [
            `اليوم نرشح لكم ${n1} 👌 اطلبوه قبل الزحمة.`,
            `${n2} من منيونا يستاهل تجربة — اللي جربه يعرف 😍`,
            `طلبات اليوم مفتوحة — شنو بيكون اختياركم؟`
          ];
    return texts.map(t => ({ title: null, chips: [], text: t }));
  };

  const loadCategory = async (cat: Category, forceRefresh = false) => {
    if (cat === 'contest') {
      setKits(buildContestKits(data));
      playSwoosh();
      return;
    }
    if (cat === 'promo') {
      setIdeasByCat(prev => ({ ...prev, promo: buildSalesDrivenStoryIdeas(data).map(parseIdea) }));
      playSwoosh();
      return;
    }
    if (!forceRefresh && ideasByCat[cat]?.length) return;
    setIsGenerating(true);
    setSim({ key: null, loading: false, result: null });
    try {
      const response = await fetch('/api/ai/quick-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: cat, forceRefresh })
      });
      if (!response.ok) throw new Error(`API ${response.status}`);
      const result = await response.json();
      if (!Array.isArray(result?.messages) || !result.messages.length) throw new Error('empty');
      setIdeasByCat(prev => ({ ...prev, [cat]: result.messages.map(parseIdea) }));
      playSwoosh();
    } catch {
      toast.error('تعذر الوصول للمولد الذكي — عرضنا لكم أفكار محلية بأصنافكم الحقيقية');
      setIdeasByCat(prev => ({ ...prev, [cat]: buildLocalFallback(cat) }));
    } finally {
      setIsGenerating(false);
    }
  };

  const openPanel = () => {
    setIsOpen(true);
    if (activeCategory === 'contest') {
      if (!kits.length) loadCategory('contest');
    } else if (!ideasByCat[activeCategory]?.length) {
      loadCategory(activeCategory);
    }
  };

  const switchCategory = (cat: Category) => {
    setActiveCategory(cat);
    setSim({ key: null, loading: false, result: null });
    if (cat === 'contest') {
      if (!kits.length) loadCategory('contest');
    } else if (!ideasByCat[cat]?.length) {
      loadCategory(cat);
    }
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success('تم نسخ النص — جاهز للصق في إنستغرام ✨');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  /** محاكاة الجمهور — عبر الخادم الذكي فقط. إذا تعذر: نقول الصدق، ما نعرض أرقام مزيفة */
  const runSimulation = async (text: string, key: string) => {
    setSim({ key, loading: true, result: null });
    try {
      const response = await fetch('/api/smart-studio/social-simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, theme: 'ملهم الانستغرام — مطعم التراث' })
      });
      if (!response.ok) throw new Error();
      const result = await response.json();
      const scores = (Array.isArray(result?.scores) ? result.scores : [])
        .filter((s: any) => s && typeof s.label === 'string' && Number.isFinite(Number(s.percentage)))
        .map((s: any) => ({ label: s.label, percentage: Math.max(0, Math.min(100, Math.round(Number(s.percentage)))) }));
      if (!scores.length && !result?.feedback) {
        toast.error('المحاكي ما رجّع تحليل واضح هالمرة — جربوا بعد شوي');
        setSim({ key: null, loading: false, result: null });
        return;
      }
      setSim({ key, loading: false, result: { scores, sentiment: result?.sentiment, feedback: result?.feedback } });
    } catch {
      toast.error('محاكي الجمهور غير متاح حالياً');
      setSim({ key: null, loading: false, result: null });
    }
  };

  const ideas = activeCategory === 'contest' ? [] : (ideasByCat[activeCategory] || []);
  const theme = categoryTheme[activeCategory];

  // معاينة البوست: نص المحتوى الأول الحالي
  const previewText = activeCategory === 'contest'
    ? (kits[0]?.post || '')
    : (ideas[0]?.text || '');
  const previewHashtags = activeCategory === 'contest' ? (kits[0]?.hashtags || DEFAULT_HASHTAGS) : DEFAULT_HASHTAGS;
  const previewTitle = activeCategory === 'contest' ? (kits[0]?.title || '') : (ideas[0]?.title || '');

  const SimBlock: React.FC<{ simKey: string }> = ({ simKey }) => {
    if (sim.key !== simKey || (!sim.loading && !sim.result)) return null;
    return (
      <div className="mt-4 p-4 bg-slate-50/80 rounded-2xl border border-slate-200/50 text-right" dir="rtl">
        <h6 className="text-[11px] font-black text-indigo-950 mb-3 flex items-center gap-1.5 justify-end">
          <span>تحليل الذكاء لتفاعل الجمهور 🔬</span>
          <BarChart2 size={13} className="text-indigo-600" />
        </h6>
        {sim.loading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <Loader2 className="animate-spin text-indigo-500" size={22} />
            <span className="text-[10px] text-slate-400 font-bold">الخادم الذكي يحلل النص حالياً...</span>
          </div>
        ) : sim.result && (
          <div className="space-y-3">
            {sim.result.scores.length > 0 && (
              <div className="grid grid-cols-2 gap-2.5">
                {sim.result.scores.map((item, i) => (
                  <div key={i} className="bg-white p-2.5 rounded-xl border border-black/5">
                    <div className="flex justify-between text-[10px] text-slate-500 font-bold mb-1">
                      <span>%{item.percentage}</span>
                      <span className="text-slate-700">{item.label}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-1000',
                          item.percentage > 75 ? 'bg-emerald-500' : item.percentage > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                        )}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(sim.result.sentiment || sim.result.feedback) && (
              <div className="bg-white/80 p-3 rounded-xl border border-black/5 space-y-2 text-[11.5px]">
                {sim.result.sentiment && (
                  <div className="flex justify-between items-center text-[10px] flex-row-reverse">
                    <span className="font-bold text-slate-400">المزاج العام:</span>
                    <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-black text-[9.5px]">{sim.result.sentiment}</span>
                  </div>
                )}
                {sim.result.feedback && <p className="leading-relaxed text-slate-600 font-bold">{sim.result.feedback}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const CopyButton: React.FC<{ text: string; copyKey: string; wide?: boolean }> = ({ text, copyKey, wide }) => (
    <button
      onClick={() => copyText(text, copyKey)}
      className={cn(
        'flex items-center justify-center gap-2 text-[11px] font-bold py-3 rounded-2xl transition-all active:scale-95 shadow-lg',
        wide ? 'flex-1 px-4' : 'px-5',
        copiedKey === copyKey ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-slate-900 text-white shadow-slate-900/30 hover:bg-black'
      )}
    >
      {copiedKey === copyKey ? <Check size={15} /> : <Copy size={15} />}
      {copiedKey === copyKey ? 'منسوخ' : 'نسخ النص'}
    </button>
  );

  return (
    <>
      {/* الزر العائم — كمبيوتر */}
      <div className="fixed left-0 bottom-12 z-[60] hidden md:flex flex-col items-center">
        <motion.button
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={openPanel}
          className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white p-3 rounded-r-2xl shadow-xl shadow-purple-500/40 group relative"
        >
          <Sparkles className="group-hover:rotate-12 transition-transform" size={24} />
          <div className="absolute right-full mr-4 bg-slate-900 border border-white/10 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 whitespace-nowrap pointer-events-none shadow-xl">
            ملهم الانستغرام الذكي ✨
          </div>
        </motion.button>
      </div>

      {/* الزر العائم — موبايل */}
      <div className="fixed bottom-40 left-6 z-[60] md:hidden">
        <motion.button
          whileTap={{ scale: 0.8 }}
          onClick={openPanel}
          className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 text-white rounded-full shadow-xl shadow-purple-500/40 flex items-center justify-center border-2 border-white/10"
        >
          <Sparkles size={24} />
        </motion.button>
      </div>

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
              {/* الترويسة */}
              <div className="p-4 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white relative">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 left-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 z-20"
                >
                  <X size={18} />
                </button>
                <div className="relative z-10 flex items-center gap-4">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
                    <Instagram size={26} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">ملهم الانستغرام</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9.5px] font-bold text-indigo-200/90">استوديو محتوى مبني على بيانات مطعمكم الحقيقية</span>
                    </div>
                  </div>
                </div>

                {/* مؤشرات حقيقية من مبيعاتكم */}
                <div className="relative z-10 mt-4">
                  {insights.hasSalesData ? (
                    <div className="flex flex-wrap gap-2">
                      <span className="bg-white/10 border border-white/10 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                        <Flame size={11} className="text-orange-300" />
                        الأكثر طلباً فعلياً: {insights.topProducts[0].name} ({insights.topProducts[0].qty} طلب)
                      </span>
                      {insights.peakHourLabel && (
                        <span className="bg-white/10 border border-white/10 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                          <Clock size={11} className="text-sky-300" />
                          ذروة طلباتكم: حوالي {insights.peakHourLabel}
                        </span>
                      )}
                      <span className="text-[8.5px] font-bold text-indigo-300/70 w-full">
                        المصدر: {insights.paidOrdersCount} فاتورة مدفوعة فعلية — مو أرقام تقديرية
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] font-bold text-indigo-200/70 block">
                      المبيعات المسجلة قليلة حالياً — الأفكار بتستخدم أسماء أصنافكم من المنيو بدون ادعاء أرقام.
                    </span>
                  )}
                </div>
              </div>

              {/* التبويبات */}
              <div className="p-3 bg-slate-50 border-b border-black/5 space-y-3">
                <button
                  onClick={() => switchCategory('trend')}
                  className={cn(
                    'w-full py-4 px-4 rounded-3xl text-sm font-black border-2 transition-all active:scale-95 flex items-center justify-center gap-2',
                    activeCategory === 'trend'
                      ? 'bg-gradient-to-br from-violet-600 to-purple-700 text-white border-transparent shadow-xl shadow-purple-500/30'
                      : 'bg-white text-purple-700 border-purple-100 shadow-sm'
                  )}
                >
                  {categoryLabel.trend}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  {(['contest', 'engagement', 'motivation', 'promo'] as Category[]).map(cat => (
                    <button
                      key={cat}
                      onClick={() => switchCategory(cat)}
                      className={cn(
                        'py-3 text-[11px] font-bold rounded-2xl transition-all duration-500 active:scale-90 border-2',
                        activeCategory === cat
                          ? cn('shadow-xl scale-[1.05] border-transparent text-white bg-gradient-to-br', categoryTheme[cat].chip)
                          : 'bg-white/80 text-slate-500 border-slate-100 hover:border-slate-200/60'
                      )}
                    >
                      {categoryLabel[cat]}
                    </button>
                  ))}
                </div>
              </div>

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-6 custom-scrollbar bg-slate-50">
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-full space-y-6">
                    <div className="relative w-20 h-20">
                      <div className={cn('absolute inset-0 rounded-full opacity-30', theme.soft)} />
                      <div className={cn('absolute inset-0 border-4 border-t-transparent rounded-full animate-spin', theme.ring)} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Sparkles className="text-purple-500" size={26} />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <h4 className="text-sm font-black text-slate-700">نجهز الأفكار من المولد الذكي...</h4>
                      <p className="text-[10px] text-slate-400 font-bold">أسماء الأصناف والأرقام بتكون من بيانات مطعمكم الحقيقية</p>
                    </div>
                  </div>
                ) : activeCategory === 'contest' ? (
                  /* ═══════════ المسابقات الاحترافية — عدة نشر كاملة ═══════════ */
                  <>
                    <div className="flex justify-between items-center px-2">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">مسابقات جاهزة للنشر — بأركان صحيحة</h5>
                      <button
                        onClick={() => loadCategory('contest', true)}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-[10px] font-bold transition-all active:scale-95"
                      >
                        <RefreshCw size={12} /> تحديث
                      </button>
                    </div>

                    <div className="space-y-6">
                      {kits.map((kit, idx) => {
                        const section: KitSection = kitSection[kit.id] || 'post';
                        const sectionText = section === 'post' ? kit.post : section === 'reminder' ? kit.reminderStory : kit.winnerAnnouncement;
                        return (
                          <motion.div
                            key={kit.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.06 }}
                            className="bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden"
                          >
                            {/* رأس البطاقة */}
                            <div className="p-4 pb-3 flex items-start gap-3">
                              <div className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-2xl">
                                {kit.emoji}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-black text-slate-800 leading-tight">{kit.title}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-0.5">🎯 {kit.goal}</p>
                              </div>
                            </div>

                            <div className="px-4 space-y-3">
                              {/* الجائزة */}
                              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-3.5 py-2.5 text-[11.5px] font-bold text-emerald-800 flex items-start gap-2">
                                <span>🎁</span>
                                <span className="flex-1">الجائزة: {kit.prize}</span>
                              </div>

                              {/* شروط المشاركة */}
                              <div className="bg-slate-50 border border-slate-100 rounded-2xl px-3.5 py-3">
                                <p className="text-[10px] font-black text-slate-500 mb-2">📋 شروط المشاركة:</p>
                                <ol className="space-y-1.5">
                                  {kit.mechanics.map((m, i) => (
                                    <li key={i} className="text-[11px] font-bold text-slate-700 flex items-start gap-2">
                                      <span className="w-4 h-4 shrink-0 rounded-full bg-slate-900 text-white text-[8.5px] flex items-center justify-center font-black mt-0.5">{i + 1}</span>
                                      <span className="flex-1 leading-snug">{m}</span>
                                    </li>
                                  ))}
                                </ol>
                              </div>

                              {/* الجدول الزمني الحقيقي وطريقة الفوز */}
                              <div className="flex flex-col gap-2 text-[10.5px] font-bold">
                                <span className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl px-3 py-2 leading-snug">🗓 {kit.scheduleLine}</span>
                                <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl px-3 py-2 leading-snug">⚖️ {kit.winnerMethod}</span>
                              </div>

                              {kit.prizeNote && (
                                <p className="text-[9px] font-bold text-slate-400 leading-snug px-1">ℹ️ {kit.prizeNote}</p>
                              )}

                              {/* النصوص الثلاثة الجاهزة */}
                              <div className="pt-1">
                                <div className="flex gap-1.5 mb-2.5">
                                  {([
                                    ['post', 'بوست الإطلاق'],
                                    ['reminder', 'ستوري التذكير'],
                                    ['winner', 'إعلان الفائز']
                                  ] as [KitSection, string][]).map(([key, label]) => (
                                    <button
                                      key={key}
                                      onClick={() => setKitSection(prev => ({ ...prev, [kit.id]: key }))}
                                      className={cn(
                                        'flex-1 py-2 rounded-xl text-[9.5px] font-black transition-all active:scale-95 border',
                                        section === key
                                          ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                                          : 'bg-white text-slate-500 border-slate-200'
                                      )}
                                    >
                                      {label}
                                    </button>
                                  ))}
                                </div>
                                <div className="bg-slate-950 rounded-2xl p-4">
                                  <p className="text-[12px] font-bold text-slate-100 leading-[1.9] whitespace-pre-line" dir="rtl">
                                    {sectionText}
                                  </p>
                                </div>
                              </div>

                              {/* أزرار */}
                              <div className="flex gap-2 pb-4 pt-1">
                                <CopyButton text={sectionText} copyKey={`${kit.id}-${section}`} wide />
                                <button
                                  onClick={() => runSimulation(kit.post, `${kit.id}-sim`)}
                                  disabled={sim.loading}
                                  className="px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[10.5px] font-bold shadow-lg shadow-indigo-500/20"
                                >
                                  {sim.loading && sim.key === `${kit.id}-sim` ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                                  رأي الجمهور
                                </button>
                              </div>

                              <div className="pb-4 -mt-2">
                                <SimBlock simKey={`${kit.id}-sim`} />
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* ═══════════ بقية التبويبات — أفكار المحتوى ═══════════ */
                  <>
                    <div className="flex justify-between items-center px-2">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">أفكار جاهزة للنسخ</h5>
                      <button
                        onClick={() => loadCategory(activeCategory, true)}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1.5 text-[10px] font-bold transition-all active:scale-95"
                      >
                        <RefreshCw size={12} /> تحديث المقترحات
                      </button>
                    </div>

                    <div className="space-y-6">
                      {ideas.map((idea, index) => {
                        const key = `${activeCategory}-${index}`;
                        return (
                          <motion.div
                            key={key}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.06 }}
                            className="group bg-white border border-slate-100 p-4 rounded-3xl shadow-xl relative overflow-hidden"
                          >
                            <div className={cn('absolute top-0 left-0 w-28 h-28 opacity-10 rounded-br-[90px]', theme.soft)} />

                            <div className="relative z-10 space-y-3">
                              <div className="flex items-center justify-between">
                                <div className={cn('w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-lg bg-gradient-to-br', theme.chip)}>
                                  <Instagram size={20} />
                                </div>
                                {idea.title ? (
                                  <h3 className="text-lg font-black text-slate-800 text-right pr-3 leading-tight flex-1">{idea.title}</h3>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-300">0{index + 1} / {ideas.length}</span>
                                )}
                              </div>

                              {idea.chips.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {idea.chips.map((chip, i) => (
                                    <span key={i} className="bg-slate-50 border border-slate-100 text-slate-600 text-[9.5px] font-bold px-2.5 py-1 rounded-lg">
                                      {chip.icon} {chip.label ? `${chip.label}: ` : ''}{chip.value}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <p className="text-base font-bold text-slate-900 leading-[1.8] whitespace-pre-line text-right" dir="rtl">
                                {idea.text}
                              </p>

                              <div className="flex gap-2 pt-2 border-t border-black/5">
                                <CopyButton text={idea.text} copyKey={key} wide />
                                <button
                                  onClick={() => runSimulation(idea.text, `${key}-sim`)}
                                  disabled={sim.loading}
                                  className="px-4 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all text-[10.5px] font-bold shadow-lg shadow-indigo-500/20"
                                >
                                  {sim.loading && sim.key === `${key}-sim` ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
                                  رأي الجمهور
                                </button>
                              </div>

                              <SimBlock simKey={`${key}-sim`} />
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* معاينة شكل البوست */}
                {!isGenerating && previewText && (
                  <div className="mt-10 space-y-4">
                    <div className="flex items-center justify-between px-3">
                      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">معاينة تقريبية لشكل البوست</h5>
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-300/40 overflow-hidden border border-slate-100/50">
                      <div className="p-3.5 flex items-center justify-between flex-row-reverse border-b border-slate-50">
                        <div className="flex items-center gap-3 flex-row-reverse">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-rose-500 to-purple-600 p-[2.5px]">
                            <div className="w-full h-full rounded-full bg-white p-[2px]">
                              <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                                <Instagram size={15} className="text-slate-500" />
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[11px] font-bold text-slate-900 leading-none">alturath.kw</p>
                            <p className="text-[9.5px] font-bold text-slate-400 mt-1.5">مطعم التراث — الكويت</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />)}
                        </div>
                      </div>

                      <div className="aspect-square bg-slate-950 flex items-center justify-center relative overflow-hidden">
                        <div className={cn('absolute inset-0 opacity-30 mix-blend-overlay', theme.soft)} />
                        <div className="absolute inset-x-8 text-center space-y-4">
                          <p className="text-white text-xl font-bold leading-tight drop-shadow-xl">
                            {(previewTitle || previewText).substring(0, 50)}{(previewTitle || previewText).length > 50 ? '…' : ''}
                          </p>
                          <div className="w-12 h-1 bg-white/30 mx-auto rounded-full" />
                        </div>
                        <Instagram size={80} className="absolute -bottom-6 -left-6 text-white/5 rotate-12" />
                      </div>

                      <div className="p-3.5 flex items-center justify-between flex-row-reverse">
                        <div className="flex items-center gap-5 flex-row-reverse">
                          <Heart size={21} className="text-slate-900" />
                          <MessageCircle size={21} className="text-slate-900" />
                          <Send size={21} className="text-slate-900 -rotate-45" />
                        </div>
                        <div className="w-5 h-6 border-[2.5px] border-slate-900 rounded-[4px]" />
                      </div>

                      <div className="px-5 pb-6 text-right">
                        <p className="text-[12px] leading-[1.8] text-slate-800 whitespace-pre-line">
                          <span className="font-bold ml-2 text-slate-950">alturath.kw</span>
                          {previewText.substring(0, 260)}{previewText.length > 260 ? '…' : ''}
                        </p>
                        <div className="flex justify-start mt-3">
                          <p className="text-[9.5px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">{previewHashtags.split(' ').slice(0, 3).join(' ')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* التذييل */}
              <div className="p-3 border-t border-slate-100 bg-slate-50">
                <p className="text-[9.5px] text-center font-bold text-slate-500 leading-relaxed">
                  كل الأسماء والأسعار والتواريخ هنا من منيو ومبيعات مطعمكم الفعلية — بدون أرقام وهمية ✨
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
