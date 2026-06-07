import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { MessageCircle, Award, Target, Sparkles, ChevronRight } from 'lucide-react';
import { AppState } from '../types';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

interface VIPMissionsProps {
 data: AppState;
}

export const VIPMissions: React.FC<VIPMissionsProps> = ({ data }) => {
 const missions = useMemo(() => {
 if (!data.customers || !data.invoices) return [];
 
 // Simple logic: Find customers with > 5 total orders.
 // Create a mission for them.
 return data.customers
 .filter(c => c.totalOrders > 5)
 .slice(0, 5)
 .map(c => ({
 id: c.id,
 name: c.name,
 phone: c.phone,
 mission: `اطلب طلب واحد هالشهر، وراح نفتح لك خانة الطلب السري من الشيف.`
 }));
 }, [data.customers, data.invoices]);

 const handleSendMission = (m: any) => {
 const text = encodeURIComponent(`\u2728 هلا ${m.name}،\n\nبما إنك من عملائنا المميزين، عندنا لك مهمة خاصة:\n${m.mission}\n\nننتظر طلبك.\nAlturath.kw\nhttps://alturathkw.shop`);
 const sanitizeWhatsAppText = (t: string) =>
   String(t || "").replace(/[\u{1F000}-\u{1FAFF}]/gu, "").replace(/\uFFFD/g, "");
 const waUrl = `https://api.whatsapp.com/send?phone=${m.phone.replace(/\D/g, '')}&text=${encodeURIComponent(sanitizeWhatsAppText(decodeURIComponent(text)))}`;
 window.open(waUrl, '_blank');
 toast.success(`تم إرسال المهمة للعميل ${m.name}`);
 };

 return (
 <div className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl md:rounded-2xl border border-amber-900/30 p-3 md:p-4 md:p-3 md:p-3 shadow-sm border border-slate-200 overflow-hidden relative group">
 <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.08)_0%,rgba(0,0,0,0)_70%)] pointer-events-none" />
 <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
 <div className="absolute inset-0 bg-[linear-gradient(to_right,#fbbf24_1px,transparent_1px),linear-gradient(to_bottom,#fbbf24_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.03] pointer-events-none" />

 <h3 className="text-2xl md:text-3xl font-bold mb-8 text-slate-800 flex items-center gap-3 relative z-10 text-right w-full justify-end">
 <span className="text-amber-400">مهام العملاء السريين</span>
 <Award className="text-amber-500" />
 </h3>
 <p className="text-sm font-bold text-slate-500 text-right mb-8 relative z-10">
 توصيات ومهام حصرية موجهة لصفوة عملائك لزيادة الولاء والارتباط
 </p>

 <div className="space-y-4 relative z-10">
 {missions.map((m, idx) => (
 <motion.div 
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 transition={{ delay: idx * 0.1 }}
 key={m.id} 
 className="flex flex-col md:flex-row items-center justify-between p-3 md:p-4 md:p-3 bg-slate-50 border border-slate-200 text-slate-900/50 backdrop-blur-xl rounded-2xl border border-amber-500/10 hover:border-amber-500/30 transition-all group/item shadow-sm border border-slate-200"
 >
 <div className="text-right flex-1 w-full md:mr-6 mb-4 md:mb-0">
 <div className="flex justify-end items-center gap-3 mb-2">
 <p className="font-bold text-amber-50 text-lg">{m.name}</p>
 <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
 </div>
 <p className="text-xs md:text-sm text-slate-500 italic leading-relaxed">{m.mission}</p>
 </div>
 <button onClick={() => handleSendMission(m)} className="w-full md:w-auto px-6 py-3 bg-amber-500/20 text-amber-400 hover:text-amber-900 hover:bg-amber-400 rounded-xl font-bold transition-all active:scale-95 flex items-center justify-center gap-2 border border-amber-500/50">
 <span className="text-sm">إرسال المهمة</span>
 <MessageCircle size={18} />
 </button>
 </motion.div>
))}
 
 {missions.length === 0 && (
 <div className="text-center p-3 md:p-3 bg-slate-50 border border-slate-200 text-slate-900/50 rounded-2xl border border-slate-800">
 <p className="text-slate-500 font-bold">لا يوجد مهام حالية. سيقوم التراث الذكي برصد كبار العملاء قريباً.</p>
 </div>
)}
 </div>
 </div>
);
};
