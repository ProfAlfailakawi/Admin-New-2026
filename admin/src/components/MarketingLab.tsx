import React, { useState } from 'react';
import { Target, Zap, Sparkles, MessageSquare, Users, Calendar, TrendingUp, ArrowRight, RefreshCw, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AppState, AICampaign } from '../types';
import { generateMarketingCampaign } from '../lib/ai-engine';
import { toast } from 'sonner';

interface MarketingLabProps {
 data: AppState;
}

export const MarketingLab: React.FC<MarketingLabProps> = ({ data }) => {
 const [isGenerating, setIsGenerating] = useState(false);
 const [activeCampaign, setActiveCampaign] = useState<AICampaign | null>(null);
 const [isEditing, setIsEditing] = useState(false);
 const [editedText, setEditedText] = useState('');

 const generateCampaign = async () => {
 setIsGenerating(true);
 try {
 const campaign = await generateMarketingCampaign(data);
 setActiveCampaign(campaign);
 setEditedText(campaign.marketingMessage || campaign.message || '');
 setIsEditing(false);
 toast.success('تم ابتكار حملة جديدة بنجاح! 🚀');
 } catch (error: any) {
 console.error("Marketing campaign generation failed:", error);
 toast.error('خدمة الذكاء الاصطناعي مشغولة جداً حالياً. يرجى المحاولة بعد قليل.');
 } finally {
 setIsGenerating(false);
 }
 };

 const launchCampaign = () => {
 toast.success('تم إطلاق الحملة بنجاح عبر جميع القنوات! 📢');
 setActiveCampaign(null);
 };

 return (
 <div className="space-y-6 md:space-y-8" dir="rtl">
 {/* Header Section */}
 <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative overflow-hidden flex flex-col items-center text-center">
 <div className="absolute top-0 right-0 w-32 h-32 md:w-64 md:h-64 bg-indigo-500/20 blur-[100px] rounded-full -mr-16 -mt-16" />
 <div className="w-12 h-12 md:w-16 md:h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 border border-white/20">
 <Zap className="text-cyan-400" size={24} />
 </div>
 <h2 className="text-2xl md:text-3xl md:text-xl md:text-2xl font-black text-white mb-2 md:mb-4 tracking-tight">مختبر الحملات التسويقية الذكي</h2>
 <p className="text-indigo-200 text-sm md:text-lg font-medium max-w-2xl leading-relaxed mb-6 md:mb-8">
 قم بتصميم وإطلاق حملات تسويقية كاملة في ثوانٍ. الذكاء الاصطناعي يحلل أفضل المنتجات مبيعاً وأكثر العملاء تفاعلاً ليصمم لك رسائل تسويقية لا تقاوم.
 </p>
 
 <button 
 onClick={generateCampaign}
 disabled={isGenerating}
 className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-4 md:px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-sm md:text-xl flex items-center gap-3 transition-all active:scale-[0.98] transition-all duration-200 shadow-[0_4px_20px_rgb(0,0,0,0.05)] shadow-indigo-900/50 min-h-[44px]"
 >
 {isGenerating ? (
 <>جاري الابتكار... <RefreshCw className="animate-spin" size={20} /></>
) : (
 <>ابتكر حملة جديدة الآن <Sparkles size={20} /></>
)}
 </button>
 </div>

 <AnimatePresence mode="wait">
 {activeCampaign ? (
 <motion.div
 key="campaign-results"
 initial={{ opacity: 0, scale: 0.95 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.95 }}
 className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:p-4 md:gap-4 md:p-5"
 >
 {/* Left Column: Visual & Idea */}
 <div className="lg:col-span-2 space-y-6 md:space-y-8">
 <div className="bg-white rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-5 border border-[#f0e6d2] shadow-sm relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-1 md:h-2 bg-indigo-500" />
 <h3 className="font-black text-lg md:text-xl text-slate-900 mb-4 md:mb-6 text-right flex items-center justify-end gap-3">
 الفكرة المركزية <Target className="text-indigo-500" size={20} />
 </h3>
 <div className="bg-slate-50 p-3 md:p-4 md:p-5 rounded-2xl md:rounded-2xl text-right border border-slate-200/60">
 <h4 className="text-xl md:text-2xl font-black text-indigo-700 mb-3 md:mb-4">{activeCampaign.idea}</h4>
 <p className="text-slate-600 font-bold text-xs md:text-sm leading-relaxed">{activeCampaign.marketingMessage}</p>
 </div>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4 md:gap-3 md:p-4">
 <div className="bg-white p-3 md:p-4 md:p-5 rounded-xl md:rounded-2xl border border-[#f0e6d2] shadow-sm text-right">
 <div className="flex items-center justify-end gap-3 mb-3 md:mb-4">
 <span className="text-xs md:text-sm font-bold text-slate-900">الجمهور المستهدف</span>
 <Users className="text-indigo-500" size={18} />
 </div>
 <p className="text-xs md:text-sm font-bold text-slate-500">{activeCampaign.targetAudience}</p>
 </div>
 <div className="bg-white p-3 md:p-4 md:p-5 rounded-xl md:rounded-2xl border border-[#f0e6d2] shadow-sm text-right">
 <div className="flex items-center justify-end gap-3 mb-3 md:mb-4">
 <span className="text-xs md:text-sm font-bold text-slate-900">التوقيت المقترح</span>
 <Calendar className="text-indigo-500" size={18} />
 </div>
 <p className="text-xs md:text-sm font-bold text-slate-500">{activeCampaign.timing}</p>
 </div>
 <div className="bg-white p-3 md:p-4 md:p-5 rounded-xl md:rounded-2xl border border-[#f0e6d2] shadow-sm text-right">
 <div className="flex items-center justify-end gap-3 mb-3 md:mb-4">
 <span className="text-xs md:text-sm font-bold text-slate-900">النتيجة المتوقعة</span>
 <TrendingUp className="text-emerald-500" size={18} />
 </div>
 <p className="text-xs md:text-sm font-bold text-slate-500">{activeCampaign.expectedOutcome}</p>
 </div>
 </div>
 </div>

 {/* Right Column: Execution */}
 <div className="lg:col-span-3 space-y-6 md:space-y-8">
 <div className="bg-white rounded-2xl md:rounded-2xl p-3 md:p-4 md:p-5 border border-[#f0e6d2] shadow-[0_4px_20px_rgb(0,0,0,0.05)] text-right flex flex-col h-full">
 <div className="flex justify-between items-center mb-6 md:mb-10 flex-row-reverse">
 <h3 className="font-black text-xl md:text-3xl text-slate-900">لوحة التنفيذ الذكي</h3>
 <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[11px] sm:text-xs md:text-xs font-bold border border-emerald-100 uppercase">جاهزة للإطلاق</span>
 </div>

 <div className="space-y-6 md:space-y-8 flex-grow">
 <div className="p-3 md:p-4 md:p-5 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-200/60 relative">
 <div className="absolute top-4 left-4 text-slate-200"><MessageSquare size={40} /></div>
 <h5 className="text-[11px] sm:text-xs md:text-xs font-bold text-slate-500 mb-3 uppercase tracking-tighter">مسودة محتوى الإعلان (AI Copy)</h5>
 {isEditing ? (
 <textarea 
 className="w-full text-base md:text-xl font-bold text-slate-900 leading-relaxed bg-white border border-slate-200 rounded-xl p-3 min-h-[120px] focus:outline-none focus:border-indigo-400 custom-scrollbar resize-none"
 value={editedText}
 onChange={(e) => setEditedText(e.target.value)}
 />
) : (
 <p className="text-base md:text-xl font-bold text-slate-900 leading-relaxed">
" {activeCampaign.marketingMessage}"
 </p>
)}
 </div>

 <div className="space-y-4">
 <h5 className="text-[11px] sm:text-xs md:text-xs font-bold text-slate-500 uppercase tracking-tighter">قنوات التوزيع المحددة</h5>
 <div className="flex flex-wrap gap-2 md:gap-3 justify-end leading-none">
 {['Instagram Ads', 'WhatsApp Direct', 'SMS Gateway', 'Email Blast'].map(channel => (
 <div key={channel} className="px-3 md:px-4 py-2 bg-white border border-slate-200/60 rounded-xl text-[11px] sm:text-xs md:text-xs font-bold text-slate-600 flex items-center gap-2">
 <CheckCircle2 className="text-indigo-500" size={12} /> {channel}
 </div>
))}
 </div>
 </div>
 </div>

 <div className="mt-6 md:mt-12 flex flex-col sm:flex-row gap-4 justify-end">
 {isEditing ? (
 <button onClick={() => {
 setActiveCampaign(prev => prev ? { ...prev, marketingMessage: editedText } : null);
 setIsEditing(false);
 }} className="px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-xl md:rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-600 font-bold hover:bg-emerald-100 transition-all active:scale-[0.98] transition-all duration-200 min-h-[44px]">حفظ التعديل</button>
) : (
 <button onClick={() => setIsEditing(true)} className="px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-xl md:rounded-2xl border border-[#f0e6d2] bg-white text-slate-500 font-bold hover:bg-slate-50 transition-all active:scale-[0.98] transition-all duration-200 min-h-[44px]">تعديل المحتوى</button>
)}
 <button 
 onClick={launchCampaign}
 className="px-4 md:px-8 md:px-12 py-3 md:py-4 rounded-xl md:rounded-2xl bg-slate-900 text-white font-bold flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-[0.98] transition-all duration-200 shadow-[0_2px_10px_rgb(0,0,0,0.04)] shadow-slate-200 min-h-[44px] justify-center"
 >
 إطلاق الحملة الآن <ArrowRight size={20} />
 </button>
 </div>
 </div>
 </div>
 </motion.div>
) : (
 <motion.div
 key="no-campaign"
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 className="p-3 md:p-4 md:p-5 md:p-4 md:p-20 text-center border-2 border-dashed border-slate-200 rounded-3xl md:rounded-2xl bg-slate-50/50"
 >
 <div className="w-16 md:w-20 h-16 md:h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 mx-auto mb-6">
 <Target size={40} />
 </div>
 <h3 className="text-xl md:text-2xl font-black text-slate-500">لا توجد حملة مفعلة حالياً</h3>
 <p className="text-slate-500 text-sm md:text-base font-medium mt-2">اضغط على زر الابتكار أعلاه ليبدأ الذكاء الاصطناعي في تصميم حملتك القادمة.</p>
 </motion.div>
)}
 </AnimatePresence>
 </div>
);
};
