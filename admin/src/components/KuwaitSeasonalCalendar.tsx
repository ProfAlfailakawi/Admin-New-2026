import React from 'react';
import { Calendar, CloudSun, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AppState } from '../types';
import { getCurrentAndUpcomingEvents } from '../lib/kuwait-calendar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

export const KuwaitSeasonalCalendar: React.FC<{ data: AppState }> = ({ data }) => {
 const now = new Date();
 const { current, upcoming } = getCurrentAndUpcomingEvents(now);

 return (
 <div className="space-y-6 md:space-y-8" dir="rtl">
 <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 md:p-4 md:p-5 rounded-2xl md:rounded-xl md:rounded-2xl border border-[#f0e6d2] shadow-sm flex-row-reverse gap-4">
 <div className="text-right">
 <h3 className="font-black text-xl md:text-2xl text-slate-900">التقويم الموسمي والتجاري الذكي</h3>
 <p className="text-slate-500 text-[11px] sm:text-xs md:text-xs font-bold mt-1">
 التاريخ الحالي: {format(now, 'PPP', { locale: ar })}
 </p>
 </div>
 <div className="flex items-center gap-3 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
 <Sparkles className="text-indigo-500" size={14} />
 <span className="text-[9px] md:text-[11px] sm:text-xs font-bold text-indigo-700 uppercase">تتبع ذكي للمواسم مفعل</span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-3 md:p-4">
 {current.length > 0 && current.map((event, index) => (
 <motion.div
 key={event.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: index * 0.1 }}
 className="p-3 md:p-4 md:p-5 rounded-2xl md:rounded-xl md:rounded-2xl border transition-all relative overflow-hidden group h-full flex flex-col justify-between bg-indigo-600 border-indigo-600 shadow-[0_4px_20px_rgb(0,0,0,0.05)] shadow-indigo-100 text-white"
 >
 <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16" />
 
 <div className="relative z-10">
 <div className="flex justify-between items-start mb-4 md:mb-6 flex-row-reverse">
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border bg-white/20 border-white/20">
 <Calendar size={20} className="text-white" />
 </div>
 <span className="bg-emerald-400 text-emerald-950 font-bold text-[8px] md:text-[9px] px-2 py-0.5 rounded-full uppercase">الموسم الحالي</span>
 </div>
 
 <h4 className="text-lg md:text-xl font-black mb-2 text-right">{event.nameAr}</h4>
 <div className="flex items-center gap-2 mb-4 justify-end flex-row-reverse">
 <CloudSun size={14} className="text-indigo-200" />
 <span className="text-[11px] sm:text-xs md:text-xs font-bold text-indigo-200">
 {format(event.startDate, 'd MMM')} - {format(event.endDate, 'd MMM')}
 </span>
 </div>

 <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border mb-4 md:mb-6 bg-white/10 border-white/10">
 <h5 className="text-[9px] md:text-[11px] sm:text-xs font-bold mb-2 text-right uppercase tracking-wider text-indigo-200">الفرصة التسويقية</h5>
 <p className="text-xs md:text-sm font-bold text-right leading-relaxed">{event.opportunityAr}</p>
 </div>
 </div>

 <div className="mt-auto">
 <div className="space-y-3">
 <h5 className="text-[9px] md:text-[11px] sm:text-xs font-bold text-right uppercase text-indigo-200">أكثر المبيعات المتوقعة</h5>
 <div className="flex flex-wrap gap-2 justify-end">
 {event.suggestedProductsAr.map(p => (
 <span key={p} className="px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-[11px] sm:text-xs font-bold border bg-white/10 border-white/10 text-white">
 {p}
 </span>
))}
 </div>
 </div>
 </div>
 </motion.div>
))}

 {upcoming.slice(0, current.length >= 3 ? 0 : 3 - current.length).map((event, index) => (
 <motion.div
 key={event.id}
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 transition={{ delay: (current.length + index) * 0.1 }}
 className="p-3 md:p-4 md:p-5 rounded-2xl md:rounded-xl md:rounded-2xl border border-[#f0e6d2] bg-white text-slate-900 transition-all relative overflow-hidden group h-full flex flex-col justify-between"
 >
 <div className="relative z-10">
 <div className="flex justify-between items-start mb-4 md:mb-6 flex-row-reverse">
 <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center border bg-slate-50 border-slate-200/60 uppercase">
 <Calendar size={20} className="text-indigo-500" />
 </div>
 <span className="bg-amber-100 text-amber-700 font-bold text-[8px] md:text-[9px] px-2 py-0.5 rounded-full uppercase">قريباً</span>
 </div>
 
 <h4 className="text-lg md:text-xl font-black mb-2 text-right">{event.nameAr}</h4>
 <div className="flex items-center gap-2 mb-4 justify-end flex-row-reverse text-slate-500">
 <CloudSun size={14} />
 <span className="text-[11px] sm:text-xs md:text-xs font-bold">
 يبدأ في {format(event.startDate, 'd MMM', { locale: ar })}
 </span>
 </div>

 <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border mb-4 md:mb-6 bg-slate-50 border-slate-200/60">
 <h5 className="text-[9px] md:text-[11px] sm:text-xs font-bold mb-2 text-right uppercase tracking-wider text-slate-500">الاستعداد التشغيلي</h5>
 <p className="text-xs md:text-sm font-bold text-right leading-relaxed line-clamp-2">{event.opportunityAr}</p>
 </div>
 </div>

 <div className="mt-auto">
 <div className="space-y-3">
 <h5 className="text-[9px] md:text-[11px] sm:text-xs font-bold text-right uppercase text-slate-500">المخزون المقترح</h5>
 <div className="flex flex-wrap gap-2 justify-end">
 {event.suggestedProductsAr.map(p => (
 <span key={p} className="px-2 md:px-3 py-1 rounded-lg text-[9px] md:text-[11px] sm:text-xs font-bold border bg-white border-slate-200/60 text-slate-600">
 {p}
 </span>
))}
 </div>
 </div>
 </div>
 </motion.div>
))}
 </div>
 </div>
);
};
