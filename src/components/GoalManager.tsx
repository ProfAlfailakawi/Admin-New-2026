import React, { useState } from 'react';
import { Target, TrendingUp, Users, ChevronLeft, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { AppState, BusinessGoal } from '../types';

interface GoalManagerProps {
 data: AppState;
 onUpdateData: (newData: AppState) => void;
}

export const GoalManager: React.FC<GoalManagerProps> = ({ data, onUpdateData }) => {
 const activeGoal = data.activeGoal || null;

 const setActiveGoal = (goal: BusinessGoal | null) => {
 onUpdateData({ ...data, activeGoal: goal });
 };

 const recommendations = [
 { title: 'زيادة الإيرادات بنسبة 15%', target: 15000, category: 'revenue', reason: 'بناءً على طلب السوق المتزايد حالياً' },
 { title: 'كسب 50 عميل جديد', target: 50, category: 'customers', reason: 'توسيع قاعدة العملاء لضمان الاستدامة' }
 ];

 const clearGoal = () => setActiveGoal(null);

 return (
 <div className="space-y-6 md:space-y-8" dir="rtl">
 <div className="flex flex-col md:flex-row justify-between items-center bg-white border border-slate-200 text-slate-900 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-indigo-500/20 shadow-sm border border-slate-200 flex-row-reverse gap-4 relative overflow-hidden">
 <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(99,102,241,0.05)_50%,transparent_75%)] bg-[length:10px_10px] pointer-events-none" />
 <div className="text-right relative z-10">
 <h3 className="font-bold text-xl md:text-2xl text-slate-800">قمرة قيادة الأهداف</h3>
 <p className="text-indigo-400 text-[10px] md:text-xs font-bold mt-1">Alturath Goal Commander 🚀</p>
 </div>
 <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-full border border-indigo-500/30 relative z-10">
 <Target className="text-indigo-400" size={14} />
 <span className="text-[10px] md:text-[11px] font-bold text-indigo-300 uppercase">تتبع الأهداف مفعّل</span>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-3 md:p-4">
 {/* Create / Active Goal */}
 <div className="bg-slate-50 border border-slate-200 text-slate-900 border border-slate-800 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl text-white relative overflow-hidden group shadow-xl">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(99,102,241,0.15)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
 <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-16 -mt-16 pointer-events-none" />
 <div className="relative z-10 flex flex-col h-full">
 {activeGoal ? (
 <div className="space-y-6 md:space-y-8 h-full flex flex-col">
 <div className="flex justify-between items-center mb-2 md:mb-4 flex-row-reverse">
 <div className="text-right">
 <span className="text-[10px] md:text-xs font-bold text-indigo-400 uppercase block mb-1">الهدف الحالي المفعّل</span>
 <h4 className="text-xl md:text-3xl font-bold text-white">{activeGoal.title}</h4>
 </div>
 <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 border border-slate-200 text-slate-800/50 rounded-2xl flex items-center justify-center border border-indigo-500/20 text-indigo-400">
 {activeGoal.category === 'revenue' ? <TrendingUp size={24} /> : <Users size={24} />}
 </div>
 </div>

 <div className="space-y-3 md:space-y-4">
 <div className="flex justify-between text-xs md:text-sm font-bold flex-row-reverse shadow-sm">
 <span className="text-indigo-300">التقدم: {activeGoal.currentProgress}%</span>
 <span className="text-white">الهدف: {Number(activeGoal.targetValue || 0).toFixed(0)}</span>
 </div>
 <div className="h-3 md:h-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-full overflow-hidden border border-slate-800">
 <motion.div 
 initial={{ width: 0 }}
 animate={{ width: `${Math.min(activeGoal.currentProgress, 100)}%` }}
 transition={{ duration: 1.5, ease:"easeOut" }}
 className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full relative"
 >
 <div className="absolute inset-0 bg-white/20 w-full h-full animate-[pulse_2s_ease-in-out_infinite]" />
 </motion.div>
 </div>
 </div>

 <div className="mt-auto pt-6 md:pt-10">
 <button 
 onClick={clearGoal}
 className="w-full py-4 rounded-xl md:rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-[10px] md:text-xs font-bold transition-all min-h-[44px]"
 >
 إغلاق الهدف وتحديد مسار جديد
 </button>
 </div>
 </div>
) : (
 <div className="space-y-6 md:space-y-8">
 <h4 className="text-xl md:text-2xl font-bold text-white text-right">حدد وجهتك القادمة 🎯</h4>
 <p className="text-indigo-300 text-xs md:text-sm font-medium leading-relaxed text-right opacity-80">
 ما هو التغيير الحقيقي الذي تريد رؤيته في متجرك هذا الشهر؟ اختر أحد الأهداف المقترحة من قِبل التراث الذكي.
 </p>
 <div className="bg-slate-950/50 p-3 md:p-4 md:p-3 rounded-2xl md:rounded-2xl border border-indigo-500/20 relative overflow-hidden">
 <div className="absolute inset-0 bg-[linear-gradient(to_right,#6366f1_1px,transparent_1px),linear-gradient(to_bottom,#6366f1_1px,transparent_1px)] bg-[size:20px_20px] opacity-[0.03] pointer-events-none" />
 <RefreshCw className="text-indigo-500 mb-4 animate-spin-slow relative z-10" size={32} />
 <p className="text-slate-300 font-bold text-xs md:text-sm text-right relative z-10">التراث الذكي يقوم بقراءة البيانات الآن لاقتراح أهداف ذكية تناسب متجرك...</p>
 </div>
 </div>
)}
 </div>
 </div>

 {/* Recommendations */}
 <div className="space-y-4 md:space-y-6">
 <h4 className="font-bold text-base md:text-lg text-white text-right pr-4">اقتراحات القائد الذكي 🤖</h4>
 <div className="space-y-3 md:space-y-4">
 {recommendations.map((rec, index) => (
 <motion.div
 key={index}
 initial={{ opacity: 0, x: 20 }}
 animate={{ opacity: 1, x: 0 }}
 transition={{ delay: index * 0.1 }}
 className="bg-slate-50 border border-slate-200 text-slate-900/80 backdrop-blur-xl p-3 md:p-4 rounded-2xl border border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group flex flex-row-reverse items-center justify-between gap-4 shadow-xl"
 onClick={() => !activeGoal && setActiveGoal({
 id: `goal-${index}`,
 title: rec.title,
 type: rec.category as any,
 category: rec.category as any,
 targetValue: rec.target,
 currentValue: 0,
 startDate: new Date().toISOString(),
 deadline: '2024-12-31',
 status: 'active',
 currentProgress: 0
 })}
 >
 <div className="flex items-center gap-4 flex-row-reverse">
 <div className="w-10 h-10 md:w-12 md:h-12 bg-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center text-indigo-400 border border-slate-700 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-500 transition-all shrink-0">
 {rec.category === 'revenue' ? <TrendingUp size={20} /> : <Users size={20} />}
 </div>
 <div className="text-right">
 <h5 className="font-bold text-sm md:text-base text-slate-200 group-hover:text-white transition-colors">{rec.title}</h5>
 <p className="text-[10px] md:text-xs font-bold text-slate-500 mt-1">{rec.reason}</p>
 </div>
 </div>
 <ChevronLeft className="text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0" size={20} />
 </motion.div>
))}
 </div>
 </div>
 </div>
 </div>
);
};
