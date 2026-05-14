import React, { useState, useRef, useEffect } from 'react';
import { 
 Bot, 
 Send, 
 Sparkles, 
 TrendingUp, 
 Lightbulb, 
 AlertCircle,
 BrainCircuit,
 User,
 Loader2,
 ChevronLeft,
 Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from '../types';
import { GoogleGenAI } from"@google/genai";
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface AIAssistantProps {
 data: AppState;
}

interface Message {
 role: 'user' | 'assistant';
 content: string;
}

const AIAssistant: React.FC<AIAssistantProps> = React.memo(({ data }) => {
 const [messages, setMessages] = useState<Message[]>([
 { 
 role: 'assistant', 
 content: 'أهلاً بك! أنا مستشارك الذكي المبني على البيانات الحقيقية فقط. أستطيع تحليل المبيعات، العملاء، وتقييم الموردين من سجلاتك لتقديم توصيات مدروسة. كيف يمكنني مساعدتك؟' 
 }
 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const [isSpeaking, setIsSpeaking] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);

 const speak = (text: string) => {
 if (!window.speechSynthesis) return;
 window.speechSynthesis.cancel();
 
 // Clean markdown for reader
 const cleanText = text.replace(/[*_#`]/g, '').slice(0, 400);
 
 const utterance = new SpeechSynthesisUtterance(cleanText);
 utterance.lang = 'ar-XA'; 
 utterance.rate = 1.0;
 
 utterance.onstart = () => setIsSpeaking(true);
 utterance.onend = () => setIsSpeaking(false);
 
 window.speechSynthesis.speak(utterance);
 };

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
 };

 useEffect(() => {
 scrollToBottom();
 const initialPrompt = localStorage.getItem('ai_initial_prompt');
 if (initialPrompt) {
 localStorage.removeItem('ai_initial_prompt');
 handleSend(initialPrompt);
 }
 }, []);

 const handleSend = async (message: string | null | undefined) => {
 const messageToSend = message || input;
 if (!messageToSend || typeof messageToSend !== 'string' || !messageToSend.trim() || isLoading) return;
 const cleanMessage = messageToSend.trim();

 setMessages(prev => [...prev, { role: 'user', content: cleanMessage }]);
 setInput('');
 setIsLoading(true);

 let attempts = 0;
 const maxAttempts = 5;

 while (attempts < maxAttempts) {
 try {
 const activeInvoices = (data?.invoices || []).filter(i => !i.isDeleted);
 const statsSummary = {
 totalSales: activeInvoices.reduce((a, i) => a + (i.totalAmount || 0), 0),
 totalProfit: activeInvoices.reduce((a, i) => a + (i.profit || 0), 0),
 totalCost: activeInvoices.reduce((a, i) => a + (i.totalCost || 0), 0),
 invoiceCount: activeInvoices.length,
 customerCount: (data?.customers || []).length,
 productCount: (data?.products || []).length,
 supplierCount: (data?.suppliers || []).length,
 topProducts: (data?.products || []).slice(0, 5).map(p => p.name).join(', ')
 };

 const key = process.env.GEMINI_API_KEY;
 if (!key || key === 'undefined' || key === 'MISSING_API_KEY' || key === '') {
 throw new Error('مفتاح الـ API غير متوفر في هذه النسخة.');
 }

 const ai = new GoogleGenAI({ apiKey: key });
 
 const systemPrompt = `أنت"المستشار الاستراتيجي" لشركة مطبخ التراث الكويتي.
 
 بيئة العمل الفريدة للمطبخ (نموذج إدارة العلامة):
 - الموديل: براند افتراضي (Virtual Brand) لعلامة التراث الكويتية.
 - الإنتاج: يتم عبر اتفاقيات إنتاج مع"شركاء مطابخ" يقومون بالتجهيز والطبخ، والمالك يشرف على معايير الجودة فقط.
 - التوصيل: يتم عبر شركات توصيل خارجية حصراً.
 - القوة الحقيقية: الجودة العالية وثناء العملاء المستمر على"النفس" والطعم الكويتي الأصيل الذي يوفره الشركاء تحت إشرافكم.
 
 بيانات المنشأة الحالية (البيانات الحقيقية الوحيدة):
 - المبيعات الإجمالية: ${Number(statsSummary.totalSales || 0).toFixed(3)} د.ك
 - صافي الربح التشغيلي: ${Number(statsSummary.totalProfit || 0).toFixed(3)} د.ك
 - التكاليف الإجمالية للموردين: ${Number(statsSummary.totalCost || 0).toFixed(3)} د.ك
 - عدد المنتجات: ${statsSummary.productCount} صنف
 - عدد الفواتير: ${statsSummary.invoiceCount} طلب
 - عدد العملاء المسجلين: ${statsSummary.customerCount} عميل
 - أشهر المنتجات: ${statsSummary.topProducts || 'لا يوجد'}
 - سجل ثناء العملاء (آراء الجودة):
 ${(data?.testimonials || []).map(t => `- [${t.date}] تقييم ${t.rating}/5:"${t.content}"`).join('\n')}
 
 قوانين صارمة وحرجة جداً (يجب الالتزام بها حرفياً):
 1. التحليل المستند للبيانات فقط.
 2. الإشارة للبيانات إلزامية.
 3. منع النصائح العامة والردود الشخصية. لا تنادِ اسم العميل مطلقاً (لا تقل"يا فلان"). تحدث بصيغة عامة واحترافية (كويتي رزين).
 4. الرد عند نقص البيانات:"لا توجد بيانات كافية للتحليل".
 5. التنسيق: استخدم Markdown جذاب جداً. 
 - استخدم العناوين (H3) للأقسام.
 - استخدم الخط العريض (Bold) للكلمات المفتاحية والنسب المئوية.
 - استخدم الرموز التعبيرية (Emoji) المناسبة للسياق الكويتي (🍲, 🇰🇼, 📈).
 - اجعل النص ينبض بالألوان والحياة عبر التنسيق المنظم.
 - استخدم الجداول (Tables) عند مقارنة البيانات الرقمية.`;

 const response = await ai.models.generateContent({
 model:"gemini-3-flash-preview",
 config: {
 systemInstruction: systemPrompt
 },
 contents: [{ role: 'user', parts: [{ text: cleanMessage }] }]
 });

 if (!response.text) throw new Error("Empty AI response");

 const aiText = response.text || 'عذراً يا طويل العمر، حصل خلل فني بسيط في التحليل. جرب مرة ثانية.';
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: aiText 
 }]);
 speak(aiText);
 setIsLoading(false);
 return; // Success, exit function
 } catch (error: any) {
 const errStr = String(error?.message || error);
 if (errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("depleted")) {
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: 'عذراً، لقد نفدت نقاط (Credits) الذكاء الاصطناعي الخاص بك. يرجى التجديد للاستمرار في استخدام المساعد.' 
 }]);
 setIsLoading(false);
 return;
 }

 attempts++;
 console.error(`AI Assistant attempt ${attempts} failed:`, error);
 
 if (attempts >= maxAttempts) {
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: 'نعتذر، واجه المساعد مشكلة تقنية متكررة بعد عدة محاولات. يرجى المحاولة بعد قليل.' 
 }]);
 setIsLoading(false);
 return;
 }
 // Exponential backoff
 await new Promise(resolve => setTimeout(resolve, 5000 * attempts));
 }
 }
 };

 const suggestions = [
"اعرض لي تحليل للبيانات الحالية",
"حلل لي الأداء المالي والربحية",
"بناءً على طلباتنا، من هو العميل الأهم؟",
"ابحث في البيانات عن فرص للنمو"
 ];

 return (
 <div className="h-[calc(100dvh-100px)] flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
 {/* Page Header - More Compact */}
 <div className="flex items-center justify-between px-2 md:px-4">
 <div className="flex items-center gap-3">
 <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgb(0,0,0,0.05)] transform rotate-2">
 <BrainCircuit size={24} className="text-amber-400" />
 </div>
 <div>
 <h1 className="text-xl md:text-3xl font-black tracking-tighter text-slate-900 bg-gradient-to-l from-slate-900 to-amber-900 bg-clip-text text-transparent">Alturath AI</h1>
 <p className="text-slate-500 text-xs font-bold flex items-center gap-1 opacity-80">
 <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
 المساعد الذكي للبيانات الحقيقية
 </p>
 </div>
 </div>
 </div>

 <div className="flex-1 bg-white/60 backdrop-blur-3xl rounded-2xl md:rounded-xl md:rounded-2xl border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden flex flex-col relative mx-0">
 <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-white/40 to-transparent pointer-events-none z-10" />
 
 {/* Chat Messages - Now naturally pushed up by input area */}
 <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-5 lg:p-6 space-y-6 md:space-y-8 custom-scrollbar relative">
 <AnimatePresence initial={false}>
 {(messages || []).map((m, i) => (
 <motion.div
 key={i}
 initial={{ opacity: 0, y: 10 }}
 animate={{ opacity: 1, y: 0 }}
 className={cn(
"flex gap-3 md:gap-5 w-full",
 m.role === 'user' ?"flex-row-reverse" :"flex-row"
)}
 >
 <div className={cn(
"w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm border",
 m.role === 'user' 
 ?"bg-slate-900 text-white border-slate-800" 
 :"bg-white text-slate-900 border-slate-200"
)}>
 {m.role === 'user' ? <User size={14} /> : <Bot size={14} className="text-amber-500" />}
 </div>
 <div className={cn(
"p-3 md:p-4 rounded-2xl text-base leading-relaxed relative flex-1 min-w-0 shadow-sm",
 m.role === 'user' 
 ?"bg-slate-950 text-white rounded-tr-none max-w-[85%] md:max-w-[70%] ml-auto" 
 :"bg-white text-slate-900 border border-slate-200/60 rounded-tl-none max-w-full"
)}>
 {m.role === 'assistant' && (
 <div className="absolute top-0 right-10 left-10 h-[1px] bg-amber-500/20" />
)}
 <div className="prose prose-slate text-right rtl max-w-none
 prose-p:mb-3 prose-p:leading-relaxed prose-p:text-slate-700
 prose-strong:text-amber-700 prose-strong:font-bold
 prose-headings:text-slate-900 prose-headings:font-bold prose-headings:my-4
 prose-li:text-slate-600 prose-li:font-medium
 prose-table:w-full prose-table:my-4 prose-table:text-sm md:prose-table:text-base">
 <Markdown components={{
 strong: ({node, ...props}) => <strong className="text-amber-600 font-bold bg-amber-50 px-1 rounded" {...props} />,
 h3: ({node, ...props}) => <h3 className="text-lg md:text-xl text-slate-900 border-r-4 border-amber-500 pr-3 my-4 font-black" {...props} />,
 li: ({node, ...props}) => <li className="list-disc list-inside marker:text-amber-500 mb-1" {...props} />,
 table: ({node, ...props}) => (
 <div className="my-4 overflow-x-auto rounded-xl border border-slate-200/60 bg-slate-50/30">
 <table className="w-full text-right border-collapse" {...props} />
 </div>
),
 th: ({node, ...props}) => <th className="bg-slate-100/80 p-3 font-bold text-slate-900 border-b border-slate-200" {...props} />,
 td: ({node, ...props}) => <td className="p-3 border-b border-slate-200/60" {...props} />,
 em: ({node, ...props}) => <em className="text-emerald-600 font-bold not-italic" {...props} />
 }}>{m.content}</Markdown>
 </div>
 </div>
 </motion.div>
))}
 </AnimatePresence>
 {isLoading && (
 <motion.div 
 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
 className="flex gap-3 md:gap-5 w-full"
 >
 <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white border border-slate-200 text-slate-900 flex items-center justify-center animate-pulse">
 <Bot size={14} className="text-amber-500" />
 </div>
 <div className="p-3 bg-slate-50/50 border border-slate-200/60/60 rounded-2xl rounded-tl-none italic text-slate-500 text-sm font-bold flex items-center gap-3">
 <Loader2 size={14} className="animate-spin text-amber-500" />
 حلل بيانات التراث...
 </div>
 </motion.div>
)}
 <div ref={messagesEndRef} className="h-4" />
 </div>

 {/* Input Area - Now not absolute, sits at the bottom of the column */}
 <div className="p-3 md:p-4 bg-white border-t border-slate-200/60 shrink-0">
 <div className="max-w-4xl mx-auto space-y-4">
 {/* Quick Suggestions - Smaller & more elegant */}
 <div className="relative max-w-full">
 <div className="flex gap-2 overflow-x-auto pb-2 flex-nowrap no-scrollbar scroll-smooth px-5 md:px-10 justify-start md:justify-center">
 {(suggestions || []).map((s, i) => (
 <button
 key={i}
 onClick={() => setInput(s)}
 className="bg-white/80 hover:bg-slate-900 hover:text-white border border-slate-200 text-slate-600 text-[11px] sm:text-xs md:text-xs py-1.5 px-3 md:px-4 rounded-full transition-all flex items-center gap-1 font-bold whitespace-nowrap active:scale-[0.98] transition-all duration-200 shadow-sm backdrop-blur-md shrink-0"
 >
 <Sparkles size={10} className="text-amber-400" />
 {s}
 </button>
))}
 </div>
 </div>
 {/* Input */}
 <div className="relative group">
 <textarea
 rows={1}
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault();
 handleSend(input);
 }
 }}
 placeholder="اطلب تحليلاً أو استراتيجية..."
 className="w-full bg-slate-50/50 border border-slate-200/60 rounded-2xl py-3 md:py-4 pr-10 md:pr-12 pl-12 md:pl-16 outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500/50 transition-all resize-none font-bold text-slate-900 placeholder:text-slate-500 text-sm md:text-base shadow-sm"
 />
 <div className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-amber-500 transition-colors pointer-events-none">
 <BrainCircuit size={18} />
 </div>
 <button
 onClick={() => handleSend(null)}
 disabled={!input.trim() || isLoading}
 className={cn(
"absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center transition-all",
 !input.trim() || isLoading
 ?"bg-slate-100 text-slate-300"
 :"bg-slate-950 text-white shadow-[0_2px_10px_rgb(0,0,0,0.04)] hover:scale-105 active:scale-[0.98] transition-all duration-200"
)}
 >
 <Send size={16} className="rotate-180" />
 </button>
 </div>
 </div>
 </div>
 </div>
 </div>
);
});

export default AIAssistant;
