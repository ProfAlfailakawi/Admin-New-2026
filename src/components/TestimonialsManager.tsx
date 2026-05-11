import React, { useState } from 'react';
import { 
 MessageSquare, 
 Plus, 
 Trash2, 
 Edit2, 
 Search, 
 Star, 
 Calendar, 
 ArrowRight,
 MessageCircle,
 Instagram,
 User,
 CheckCircle2,
 X
} from 'lucide-react';
import { Testimonial } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { analyzeKuwaitiSentiment } from '../lib/ai-engine';

interface Props {
 testimonials: Testimonial[];
 onAdd: (testimonial: Omit<Testimonial, 'id'>) => void;
 onUpdate: (testimonial: Testimonial) => void;
 onDelete: (id: string) => void;
 onClose?: () => void;
}

const TestimonialsManager: React.FC<Props> = ({ testimonials, onAdd, onUpdate, onDelete, onClose }) => {
 const [searchTerm, setSearchTerm] = useState('');
 const [showModal, setShowModal] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [formData, setFormData] = useState<Omit<Testimonial, 'id'>>({
 content: '',
 date: new Date().toISOString(),
 source: 'WhatsApp',
 rating: 5
 });

 const filtered = (testimonials || []).filter(t => 
 t.content.toLowerCase().includes(searchTerm.toLowerCase())
).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

 const handleEdit = (t: Testimonial) => {
 setEditingId(t.id);
 setFormData({
 content: t.content,
 date: t.date,
 source: t.source,
 rating: t.rating
 });
 setShowModal(true);
 };

 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 if (editingId) {
 onUpdate({ ...formData, id: editingId });
 } else {
 onAdd(formData);
 }
 setShowModal(false);
 resetForm();
 };

 const resetForm = () => {
 setEditingId(null);
 setFormData({
 content: '',
 date: new Date().toISOString(),
 source: 'WhatsApp',
 rating: 5
 });
 };

 return (
 <div className="space-y-6 animate-in fade-in duration-500 text-right">
 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-row-reverse">
 <div>
 <h2 className="text-xl md:text-3xl font-black text-slate-800 flex items-center gap-3 justify-end leading-none">
 إدارة آراء الجودة والثناء <MessageSquare className="text-emerald-500" size={32} />
 </h2>
 <p className="text-xs text-slate-400 font-bold mt-1">وثق شهادات عملائك واستخدمها لتحسين"الأسلوب" والتسويق</p>
 </div>
 <button 
 onClick={() => { resetForm(); setShowModal(true); }}
 className="bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black flex items-center gap-2 shadow-lg shadow-emerald-500/20 hover:scale-[1.02] transition-all active:scale-95"
 >
 <Plus size={20} />
 <span>إضافة تعليق جديد</span>
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:p-4">
 <div className="lg:col-span-3">
 <div className="relative group">
 <Search className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-emerald-500 transition-colors" size={20} />
 <input 
 type="text"
 placeholder="ابحث في محتوى التعليقات..."
 defaultValue={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 className="w-full bg-white border border-slate-200 rounded-3xl py-6 pr-14 pl-6 text-right font-bold text-slate-700 shadow-sm focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 outline-none transition-all"
 />
 </div>
 </div>

 <AnimatePresence mode="popLayout">
 {filtered.length > 0 ? filtered.map((t) => (
 <motion.div 
 layout
 key={t.id}
 initial={{ opacity: 0, scale: 0.9 }}
 animate={{ opacity: 1, scale: 1 }}
 exit={{ opacity: 0, scale: 0.9 }}
 className="bg-white p-3 md:p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all relative group overflow-hidden"
 >
 <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-bl-[4rem] -z-10 group-hover:bg-emerald-50 transition-colors" />
 
 <div className="flex justify-between items-start mb-4 flex-row-reverse">
 <div className="flex items-center gap-3 flex-row-reverse">
 <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-emerald-600 group-hover:text-white transition-all">
 <MessageSquare size={24} />
 </div>
 <div className="text-right">
 <div className="flex items-center gap-1 mt-1 justify-end">
 {Array.from({ length: 5 }).map((_, i) => (
 <Star key={i} size={10} fill={i < t.rating ?"#fbbf24" :"none"} className={i < t.rating ?"text-amber-400" :"text-slate-200"} />
))}
 </div>
 </div>
 </div>
 
 <div className="flex gap-1 transition-opacity">
 <button onClick={() => onDelete(t.id)} className="p-2 text-rose-400 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
 <button onClick={() => handleEdit(t)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
 </div>
 </div>

 <div className="bg-slate-50/50 rounded-2xl p-3 mb-4 text-right">
 <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic line-clamp-4">"{t.content}"</p>
 </div>

 {(() => {
   const sentiment = analyzeKuwaitiSentiment(t.content);
   if (sentiment.level1 === 'محايد' || sentiment.level1 === 'ملاحظة عامة') return null;
   
   return (
     <div className={cn("mb-4 px-3 py-2.5 rounded-xl text-right text-[10px] font-bold border shadow-sm", sentiment.level1 === 'إيجابي' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700')}>
       <span className="block font-black mb-1 text-xs flex items-center justify-end gap-1">
         {sentiment.label}
         <span className="relative flex h-2 w-2">
           <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", sentiment.level1 === 'إيجابي' ? 'bg-emerald-400' : 'bg-rose-400')}></span>
           <span className={cn("relative inline-flex rounded-full h-2 w-2", sentiment.level1 === 'إيجابي' ? 'bg-emerald-500' : 'bg-rose-500')}></span>
         </span>
       </span>
       {sentiment.alert}
       <div className="mt-1 flex flex-wrap justify-end gap-1">
         {sentiment.level2.map(topic => (
            <span key={topic} className="px-1.5 py-0.5 rounded-md bg-white/50 border border-white/40 text-[9px]">{topic}</span>
         ))}
       </div>
     </div>
   );
 })()}

 <div className="flex items-center justify-between text-[10px] font-black text-slate-400 border-t border-slate-50 pt-4 flex-row-reverse">
 <div className="flex items-center gap-1">
 <Calendar size={12} />
 <span>{new Date(t.date).toLocaleDateString('en-GB')}</span>
 </div>
 <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-full">
 {t.source === 'WhatsApp' ? <MessageCircle size={10} className="text-emerald-500" /> : 
 t.source === 'Instagram' ? <Instagram size={10} className="text-pink-500" /> : 
 <CheckCircle2 size={10} className="text-blue-500" />}
 <span>{t.source}</span>
 </div>
 </div>
 </motion.div>
)) : (
 <div className="col-span-full py-16 text-center">
 <div className="w-12 md:w-20 h-12 md:h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-4 border-2 border-dashed border-slate-100">
 <MessageSquare size={40} />
 </div>
 <h3 className="text-slate-400 font-black">لا توجد تعليقات مطابقة للبحث</h3>
 <p className="text-[10px] text-slate-300 font-bold mt-1">ابدأ بتوثيق ثناء عملائك هنا</p>
 </div>
)}
 </AnimatePresence>
 </div>

 <AnimatePresence>
 {showModal && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-3"
 onClick={() => setShowModal(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 30 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 30 }}
 className="bg-white rounded-3xl md:rounded-2xl w-full max-w-lg shadow-2xl p-3 md:p-3 border border-slate-100 text-right overflow-hidden relative"
 onClick={e => e.stopPropagation()}
 >
 <div className="absolute top-0 right-0 left-0 h-32 bg-gradient-to-br from-emerald-500/10 to-transparent -z-10" />
 <button onClick={() => setShowModal(false)} className="absolute top-3 md:p-4 left-6 p-2 bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-all"><X size={20} /></button>
 
 <div className="mb-8">
 <h3 className="text-2xl font-black text-slate-800">{editingId ? 'تعديل التعليق' : 'إضافة ثناء جديد'}</h3>
 <p className="text-[10px] text-slate-400 font-bold mt-1">أدخل تفاصيل التعليق لتوثيق الجودة</p>
 </div>

 <form onSubmit={handleSubmit} className="space-y-5">
 <div>
 <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">محتوى التعليق</label>
 <textarea 
 required
 rows={6}
 value={formData.content}
 onChange={(e) => setFormData({ ...formData, content: e.target.value })}
 className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 text-right font-bold outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all resize-none"
 placeholder="ماذا قال العميل عن الجودة أو الأكل؟ (اكتب هنا مباشرة)"
 />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div>
 <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">المصدر</label>
 <select 
 value={formData.source}
 onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
 className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 text-right font-bold outline-none appearance-none"
 >
 <option value="WhatsApp">WhatsApp</option>
 <option value="Instagram">Instagram</option>
 <option value="Direct">مباشر</option>
 </select>
 </div>
 <div>
 <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase">التقييم</label>
 <div className="flex items-center justify-end h-14 bg-slate-50 border border-slate-100 rounded-2xl px-4 gap-2">
 {[1, 2, 3, 4, 5].map((star) => (
 <button 
 key={star}
 type="button"
 onClick={() => setFormData({ ...formData, rating: star })}
 className="hover:scale-110 transition-transform"
 >
 <Star size={20} fill={star <= formData.rating ?"#fbbf24" :"none"} className={star <= formData.rating ?"text-amber-400" :"text-slate-200"} />
 </button>
))}
 </div>
 </div>
 </div>

 <div className="flex gap-3 pt-4">
 <button 
 type="submit"
 className="flex-1 bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-600/20 hover:-translate-y-1 transition-all active:scale-95"
 >
 {editingId ? 'تحديث البيانات' : 'حفظ الثناء والأثر'}
 </button>
 </div>
 </form>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>
 </div>
);
};

export default TestimonialsManager;
