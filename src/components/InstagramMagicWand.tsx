import React, { useMemo, useState } from 'react';
import { Sparkles, X, RefreshCw, Copy, Check, Instagram, Trophy, CalendarDays, MessageCircle, Flame, Clock, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { AppState } from '../types';
import {
  computeStudioInsights,
  buildContestKits,
  buildEngagementIdeas,
  buildWeekPlan,
  ContestKit
} from '../lib/instagram-studio';
import { playSwoosh } from '../lib/sounds';
import { toast } from 'sonner';

interface InstagramMagicWandProps {
  data: AppState;
  currentPage?: string;
  userRole?: 'admin' | 'partner' | 'local' | null;
}

type Tab = 'week' | 'contest' | 'engage';
type KitSection = 'post' | 'reminder' | 'winner';

export const InstagramMagicWand: React.FC<InstagramMagicWandProps> = ({ data }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('week');
  const [rotation, setRotation] = useState(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [kitSection, setKitSection] = useState<Record<string, KitSection>>({});
  const [engageView, setEngageView] = useState<Record<string, 'caption' | 'story'>>({});

  // كل شي يُحسب محلياً من بيانات المطعم الحقيقية — بدون أي محتوى مؤلف
  const insights = useMemo(() => computeStudioInsights(data), [data]);
  const weekPlan = useMemo(() => buildWeekPlan(data, rotation), [data, rotation]);
  const kits = useMemo(() => buildContestKits(data), [data]);
  const engagementIdeas = useMemo(() => buildEngagementIdeas(data), [data]);

  const openPanel = () => {
    setIsOpen(true);
    playSwoosh();
  };

  const copyText = (text: string, key: string) => {
    // لا نعلن النجاح إلا بعد نجاح النسخ فعلياً
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      toast.success('انسخ! النص جاهز للصق في إنستغرام ✨');
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => {
      toast.error('ما قدرنا ننسخ تلقائياً — ظللوا النص وانسخوه يدوياً');
    });
  };

  const CopyBtn: React.FC<{ text: string; copyKey: string; small?: boolean }> = ({ text, copyKey, small }) => (
    <button
      onClick={() => copyText(text, copyKey)}
      className={cn(
        'flex items-center justify-center gap-1.5 font-bold rounded-xl transition-all active:scale-95 shadow-md',
        small ? 'text-[10px] py-2 px-3.5' : 'text-[11px] py-2.5 px-5',
        copiedKey === copyKey
          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
          : 'bg-slate-900 text-white shadow-slate-900/25 hover:bg-black'
      )}
    >
      {copiedKey === copyKey ? <Check size={13} /> : <Copy size={13} />}
      {copiedKey === copyKey ? 'منسوخ' : 'نسخ'}
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
            ملهم الانستغرام ✨
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
              className="fixed left-0 top-0 bottom-0 w-full max-w-sm bg-slate-50 shadow-xl z-[110] overflow-hidden flex flex-col"
              dir="rtl"
            >
              {/* الترويسة — نفس هوية التطبيق */}
              <div className="p-4 pb-3 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-950 text-white relative shrink-0">
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute top-4 left-4 p-2.5 bg-white/10 hover:bg-white/20 rounded-full transition-all active:scale-90 z-20"
                >
                  <X size={18} />
                </button>
                <div className="flex items-center gap-3.5">
                  <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/30">
                    <Instagram size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">ملهم الانستغرام</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[9.5px] font-bold text-indigo-200/90">مسابقات وتفاعل يكبّر حسابكم — من بياناتكم الحقيقية</span>
                    </div>
                  </div>
                </div>

                {insights.hasSalesData && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="bg-white/10 border border-white/10 text-[9.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                      <Flame size={10} className="text-orange-300" />
                      الأكثر طلباً: {insights.topProducts[0].name}
                    </span>
                    {insights.peakHourLabel && (
                      <span className="bg-white/10 border border-white/10 text-[9.5px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                        <Clock size={10} className="text-sky-300" />
                        ذروة طلباتكم: {insights.peakHourLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* الأقسام الثلاثة */}
              <div className="px-3 pt-3 pb-2 bg-slate-50 shrink-0">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    ['week', 'خطة الأسبوع', CalendarDays],
                    ['contest', 'مسابقات', Trophy],
                    ['engage', 'تفاعل', MessageCircle]
                  ] as [Tab, string, any][]).map(([key, label, Icon]) => (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={cn(
                        'py-3 rounded-2xl text-[11px] font-black transition-all active:scale-95 border-2 flex flex-col items-center gap-1',
                        tab === key
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-transparent shadow-lg shadow-purple-500/25'
                          : 'bg-white text-slate-500 border-slate-100'
                      )}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto px-3 pb-6 pt-2 space-y-4 custom-scrollbar">

                {/* ═══════════ خطة الأسبوع ═══════════ */}
                {tab === 'week' && (
                  <>
                    <div className="flex justify-between items-center px-1">
                      <p className="text-[10px] font-black text-slate-500">
                        ٧ أيام جاهزة — بتواريخ حقيقية وأصنافكم الفعلية
                      </p>
                      <button
                        onClick={() => { setRotation(r => r + 1); playSwoosh(); }}
                        className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-[10px] font-bold active:scale-95"
                      >
                        <RefreshCw size={11} /> بدّل الأفكار
                      </button>
                    </div>

                    {weekPlan.map((day, i) => (
                      <motion.div
                        key={`${day.id}-${rotation}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={cn(
                          'bg-white rounded-3xl border shadow-sm overflow-hidden',
                          day.isToday ? 'border-indigo-300 shadow-indigo-100 shadow-lg' : 'border-slate-100'
                        )}
                      >
                        <div className={cn(
                          'px-4 py-2.5 flex items-center justify-between',
                          day.isToday
                            ? 'bg-gradient-to-l from-indigo-600 to-purple-700 text-white'
                            : day.isWeekend ? 'bg-amber-50 text-amber-800' : 'bg-slate-50 text-slate-600'
                        )}>
                          <span className="text-[11px] font-black flex items-center gap-1.5">
                            {day.dayLabel}
                            {day.isToday && <span className="bg-white/20 text-[8.5px] px-2 py-0.5 rounded-full">اليوم</span>}
                          </span>
                          <span className={cn(
                            'text-[9.5px] font-black px-2.5 py-1 rounded-full',
                            day.isToday ? 'bg-white/15' : 'bg-white border border-black/5'
                          )}>
                            {day.typeEmoji} {day.typeLabel}
                          </span>
                        </div>

                        <div className="p-4 space-y-3">
                          <h4 className="text-[13.5px] font-black text-slate-800">{day.title}</h4>
                          <div className="bg-slate-950 rounded-2xl p-3.5">
                            <p className="text-[11.5px] font-bold text-slate-100 leading-[1.9] whitespace-pre-line" dir="rtl">
                              {day.caption}
                            </p>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[9.5px] font-bold text-slate-400 leading-snug flex items-start gap-1 flex-1">
                              <Lightbulb size={11} className="text-amber-500 shrink-0 mt-0.5" />
                              {day.tip}
                            </p>
                            <CopyBtn text={day.caption} copyKey={`week-${day.id}`} small />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </>
                )}

                {/* ═══════════ المسابقات ═══════════ */}
                {tab === 'contest' && (
                  <>
                    <p className="text-[10px] font-black text-slate-500 px-1">
                      مسابقات كاملة الأركان: جائزة حقيقية، شروط واضحة، تواريخ فعلية
                    </p>

                    {kits.map((kit, idx) => {
                      const section: KitSection = kitSection[kit.id] || 'post';
                      const sectionText = section === 'post' ? kit.post : section === 'reminder' ? kit.reminderStory : kit.winnerAnnouncement;
                      return (
                        <motion.div
                          key={kit.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden"
                        >
                          <div className="p-4 pb-3 flex items-start gap-3">
                            <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 flex items-center justify-center text-xl">
                              {kit.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-black text-slate-800 leading-tight">{kit.title}</h3>
                              <p className="text-[9.5px] font-bold text-slate-400 mt-0.5">🎯 {kit.goal}</p>
                            </div>
                          </div>

                          <div className="px-4 space-y-2.5">
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-[11px] font-bold text-emerald-800">
                              🎁 الجائزة: {kit.prize}
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                              <p className="text-[9.5px] font-black text-slate-500 mb-1.5">📋 شروط المشاركة</p>
                              <ol className="space-y-1">
                                {kit.mechanics.map((m, mi) => (
                                  <li key={mi} className="text-[10.5px] font-bold text-slate-700 flex items-start gap-1.5">
                                    <span className="w-4 h-4 shrink-0 rounded-full bg-indigo-600 text-white text-[8px] flex items-center justify-center font-black mt-0.5">{mi + 1}</span>
                                    <span className="flex-1 leading-snug">{m}</span>
                                  </li>
                                ))}
                              </ol>
                            </div>

                            <div className="flex flex-col gap-1.5 text-[10px] font-bold">
                              <span className="bg-amber-50 text-amber-800 border border-amber-100 rounded-xl px-3 py-1.5 leading-snug">🗓 {kit.scheduleLine}</span>
                              <span className="bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl px-3 py-1.5 leading-snug">⚖️ {kit.winnerMethod}</span>
                            </div>

                            {kit.prizeNote && (
                              <p className="text-[8.5px] font-bold text-slate-400 leading-snug px-1">ℹ️ {kit.prizeNote}</p>
                            )}

                            <div className="pt-0.5 pb-4 space-y-2">
                              <div className="flex gap-1.5">
                                {([
                                  ['post', 'بوست الإطلاق'],
                                  ['reminder', 'ستوري التذكير'],
                                  ['winner', 'إعلان الفائز']
                                ] as [KitSection, string][]).map(([key, label]) => (
                                  <button
                                    key={key}
                                    onClick={() => setKitSection(prev => ({ ...prev, [kit.id]: key }))}
                                    className={cn(
                                      'flex-1 py-2 rounded-xl text-[9px] font-black transition-all active:scale-95 border',
                                      section === key
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-white text-slate-500 border-slate-200'
                                    )}
                                  >
                                    {label}
                                  </button>
                                ))}
                              </div>
                              <div className="bg-slate-950 rounded-2xl p-3.5">
                                <p className="text-[11.5px] font-bold text-slate-100 leading-[1.9] whitespace-pre-line" dir="rtl">
                                  {sectionText}
                                </p>
                              </div>
                              <div className="flex justify-end">
                                <CopyBtn text={sectionText} copyKey={`${kit.id}-${section}`} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                )}

                {/* ═══════════ التفاعل ═══════════ */}
                {tab === 'engage' && (
                  <>
                    <p className="text-[10px] font-black text-slate-500 px-1">
                      أساليب تفاعل مجرّبة — كل وحدة معها نسخة بوست ونسخة ستوري
                    </p>

                    {engagementIdeas.map((idea, idx) => {
                      const view = engageView[idea.id] || 'caption';
                      const text = view === 'caption' ? idea.caption : idea.story;
                      return (
                        <motion.div
                          key={idea.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 space-y-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20 flex items-center justify-center text-lg">
                              {idea.emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-[14px] font-black text-slate-800 leading-tight">{idea.title}</h4>
                              <p className="text-[9.5px] font-bold text-slate-400 mt-1 leading-snug">💡 {idea.why}</p>
                            </div>
                          </div>

                          <div className="flex gap-1.5">
                            {([['caption', '📝 بوست'], ['story', '📱 ستوري']] as ['caption' | 'story', string][]).map(([key, label]) => (
                              <button
                                key={key}
                                onClick={() => setEngageView(prev => ({ ...prev, [idea.id]: key }))}
                                className={cn(
                                  'flex-1 py-1.5 rounded-lg text-[9.5px] font-black transition-all active:scale-95 border',
                                  view === key
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200'
                                )}
                              >
                                {label}
                              </button>
                            ))}
                          </div>

                          <div className="bg-slate-950 rounded-2xl p-3.5">
                            <p className="text-[11.5px] font-bold text-slate-100 leading-[1.9] whitespace-pre-line" dir="rtl">
                              {text}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <CopyBtn text={text} copyKey={`${idea.id}-${view}`} small />
                          </div>
                        </motion.div>
                      );
                    })}
                  </>
                )}
              </div>

              {/* التذييل */}
              <div className="px-3 py-2.5 border-t border-slate-200/60 bg-white shrink-0">
                <p className="text-[9px] text-center font-bold text-slate-400 leading-relaxed">
                  كل الأسماء والأسعار والتواريخ من منيو ومبيعات مطعمكم الفعلية ✨
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};
