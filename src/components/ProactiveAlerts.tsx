import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, TrendingUp, Bell, ArrowLeft, CheckCircle2, Zap, Database, X, Sparkles } from 'lucide-react';
import { Notification } from '../types';
import { cn } from '../lib/utils';

interface ProactiveAlertsProps {
 notifications: Notification[];
 onMarkAsRead: (id: string) => void;
 userRole?: string | null;
 currentPage?: string;
}

const ProactiveAlerts: React.FC<ProactiveAlertsProps> = ({ notifications, onMarkAsRead, userRole, currentPage = 'dashboard' }) => {
 const activeAlerts = notifications.filter(n => !n.read && n.insightType).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
 const [selectedAlert, setSelectedAlert] = useState<Notification | null>(null);
 const [showHub, setShowHub] = useState(false);

 if (userRole === 'partner' || currentPage !== 'dashboard' || activeAlerts.length === 0) return null;

 const getIcon = (type: string) => {
 if (type === 'خطر') return <AlertCircle size={24} className="text-rose-500" />;
 if (type === 'فرصة') return <TrendingUp size={24} className="text-indigo-500" />;
 return <Bell size={24} className="text-amber-500" />;
 };

 const getColors = (type: string) => {
 if (type === 'خطر') return { bg: 'bg-rose-600', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200' };
 if (type === 'فرصة') return { bg: 'bg-indigo-600', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' };
 return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' };
 };

 return (
 <>
 {/* Floating Intelligence Hub Icon */}
 <div className="fixed bottom-44 right-6 lg:bottom-40 lg:right-10 z-[100]" dir="rtl">
 <AnimatePresence>
 {activeAlerts.length > 0 && (
 <motion.div
 initial={{ scale: 0, opacity: 0 }}
 animate={{ scale: 1, opacity: 1 }}
 exit={{ scale: 0, opacity: 0 }}
 className="relative"
 >
 {/* Pulse effect for high priority alerts */}
 {activeAlerts.some(n => n.type === 'warning') && (
 <motion.div 
 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
 transition={{ duration: 2, repeat: Infinity }}
 className="absolute inset-0 bg-indigo-500 rounded-full blur-xl"
 />
)}
 
 <button 
 onClick={() => setShowHub(true)}
 className={cn(
"relative w-12 h-12 md:w-16 md:h-16 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 group overflow-hidden",
 activeAlerts[0].insightType === 'خطر' ?"bg-rose-500" : 
 activeAlerts[0].insightType === 'فرصة' ?"bg-indigo-600" : 
"bg-amber-500"
)}
 >
 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
 <Sparkles className="text-white animate-pulse" size={32} />
 
 {/* Badge */}
 <div className="absolute -top-1 -left-1 w-6 h-6 bg-white rounded-full flex items-center justify-center border-2 border-indigo-600 shadow-sm">
 <span className={cn("text-[10px] font-bold", activeAlerts[0].insightType === 'خطر' ?"text-rose-600" :"text-indigo-600")}>
 {activeAlerts.length}
 </span>
 </div>
 </button>
 </motion.div>
)}
 </AnimatePresence>
 </div>

 {/* Intelligence Side Panel / Hub Overlay */}
 <AnimatePresence>
 {showHub && (
 <>
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setShowHub(false)}
 className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[101]"
 />
 <motion.div 
 initial={{ x: 400, opacity: 0 }}
 animate={{ x: 0, opacity: 1 }}
 exit={{ x: 400, opacity: 0 }}
 transition={{ type: 'spring', damping: 25, stiffness: 200 }}
 className="fixed top-0 bottom-0 right-0 w-full max-w-sm bg-white shadow-[0_0_100px_rgba(0,0,0,0.3)] z-[102] flex flex-col"
 dir="rtl"
 >
 <div className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
 <div className="text-right">
 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
 رادار الذكاء
 </h3>
 <p className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">نبض العمليات الفوري</p>
 </div>
 <button onClick={() => setShowHub(false)} className="p-2 hover:bg-white rounded-full text-slate-500 border border-transparent hover:border-slate-200/60 transition-all">
 <X size={20} />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-3 md:p-3 space-y-4 custom-scrollbar">
 {activeAlerts.map((alert, idx) => {
 const colors = getColors(alert.insightType!);
 return (
 <motion.div 
 key={alert.id}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.1 }}
 className={cn(
"rounded-2xl p-3 border-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden group",
 colors.light, colors.border
)}
 onClick={() => setSelectedAlert(alert)}
 >
 <div className="flex items-start gap-4">
 <div className="w-10 h-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center shadow-sm shrink-0">
 {getIcon(alert.insightType!)}
 </div>
 <div className="text-right flex-1 min-w-0">
 <div className="flex items-center gap-2 mb-1">
 <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full text-white uppercase tracking-tighter", colors.bg)}>
 {alert.insightType}
 </span>
 <span className="text-[10px] text-slate-500 font-bold">بناءً على {alert.dataReference.split(' ').slice(0, 2).join(' ')}</span>
 </div>
 <h4 className="text-sm font-bold text-slate-800 leading-snug mb-1">{alert.title}</h4>
 <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{alert.message}</p>
 </div>
 </div>
 </motion.div>
);
 })}
 </div>

 <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-100 italic text-[10px] text-slate-500 font-medium text-center">
 هذا الرادار يحلل البيانات التشغيلية لتوجيه قراراتك الاستراتيجية.
 </div>
 </motion.div>
 </>
)}
 </AnimatePresence>

 {/* Detailed Modal (Keep existing modal logic) */}
 <AnimatePresence>
 {selectedAlert && (
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[300] flex items-center justify-center p-3"
 dir="rtl"
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="bg-white max-w-lg w-full rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
 >
 <div className={cn("p-3 md:p-4 md:p-3 flex items-center gap-4 text-white relative overflow-hidden", getColors(selectedAlert.insightType!).bg)}>
 <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none scale-150 transform translate-x-4 -translate-y-4">
 {selectedAlert.insightType === 'خطر' ? <AlertCircle size={100} /> : selectedAlert.insightType === 'فرصة' ? <TrendingUp size={100} /> : <Bell size={100} />}
 </div>
 <div className="relative z-10 w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-2xl border border-white/30 flex items-center justify-center backdrop-blur-md shrink-0">
 {selectedAlert.insightType === 'خطر' ? <AlertCircle size={32} /> : selectedAlert.insightType === 'فرصة' ? <TrendingUp size={32} /> : <Bell size={32} />}
 </div>
 <div className="relative z-10 text-right">
 <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-[10px] font-bold uppercase mb-2 border border-white/10 backdrop-blur-sm">
 {selectedAlert.insightType} مستكشف
 </div>
 <h2 className="text-xl md:text-2xl font-bold leading-tight text-white">{selectedAlert.title}</h2>
 </div>
 </div>

 <div className="p-3 md:p-4 md:p-3 overflow-y-auto space-y-6">
 <div className="space-y-2 text-right">
 <h3 className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-end gap-2">
 تحليل الذكاء الاصطناعي <Zap size={14} className={getColors(selectedAlert.insightType!).text} /> 
 </h3>
 <p className="text-sm md:text-base font-bold text-slate-800 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-100">
 {selectedAlert.explanation}
 </p>
 </div>

 <div className="space-y-2 text-right">
 <h3 className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-end gap-2">
 مرجع البيانات (المصدر) <Database size={14} className="text-slate-500" />
 </h3>
 <div className="text-xs font-bold text-slate-600 leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100/50 flex items-start justify-end gap-2 text-right">
 {selectedAlert.dataReference}
 <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
 </div>
 </div>

 <div className="space-y-2 text-right pt-4 border-t border-slate-100">
 <h3 className="text-[11px] font-bold text-slate-500 uppercase flex items-center justify-end gap-2">
 الإجراء الموصى به <CheckCircle2 size={14} className="text-emerald-500" />
 </h3>
 <div className="text-sm font-bold text-emerald-800 bg-emerald-50 p-3 rounded-2xl border border-emerald-100/50">
 {selectedAlert.recommendedAction}
 </div>
 </div>
 </div>

 <div className="p-3 md:p-4 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row gap-3">
 <button 
 onClick={() => {
 onMarkAsRead(selectedAlert.id);
 setSelectedAlert(null);
 }}
 className={cn("flex-1 text-white py-3 md:py-4 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95 shadow-lg", getColors(selectedAlert.insightType!).bg)}
 >
 فهمت ومستعد للعمل
 </button>
 <button 
 onClick={() => setSelectedAlert(null)}
 className="flex-1 bg-white text-slate-600 border border-slate-200/60 py-3 md:py-4 rounded-xl font-bold text-sm transition-all hover:bg-slate-50 active:scale-95"
 >
 تذكيري لاحقاً
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>
 </>
);
};

export default ProactiveAlerts;
