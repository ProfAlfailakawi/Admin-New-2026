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
 ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppState } from '../types';
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
 const messagesEndRef = useRef<HTMLDivElement>(null);

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
 topProducts: (data?.products || []).slice(0, 5).map(p => p.name).join(', '),
topCustomersInfo: (data?.customers || []).map(c => ({ name: c.name, spent: (data?.invoices || []).filter(inv => inv.customerId === c.id && !inv.isDeleted).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0) })).sort((a, b) => b.spent - a.spent).slice(0, 10).map(c => `${c.name} (${c.spent.toFixed(3)})`).join(' | ')
 };

 const assistantResponse = await fetch('/api/ai/assistant', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 message: cleanMessage,
 systemPrompt: 'أنت مساعد إداري ذكي لموقع الإدارة. أجب بالعربية بوضوح واختصار، وقدّم خطوات عملية عند الحاجة.',
 statsSummary
 })
 });

 const assistantPayload = await assistantResponse.json().catch(() => null);
 if (!assistantResponse.ok) {
 const serverError = assistantPayload?.error || `AI server error: ${assistantResponse.status}`;
 throw new Error(serverError);
 }

 const aiText = assistantPayload?.text || 'عذراً يا طويل العمر، حصل خلل فني بسيط في التحليل. جرب مرة ثانية.';
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: aiText 
 }]);
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
 <div className="ai-executive-assistant-shell animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">
  <section className="ai-executive-console">
    <div className="ai-executive-messages custom-scrollbar">
      <AnimatePresence initial={false}>
        {(messages || []).map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('ai-chat-row', m.role === 'user' ? 'is-user' : 'is-assistant')}
          >
            <div className="ai-chat-avatar">{m.role === 'user' ? <User size={15} /> : <Bot size={15} />}</div>
            <div className="ai-chat-bubble">
              <Markdown components={{
                strong: ({node, ...props}) => <strong className="text-amber-700 font-black bg-amber-50 px-1 rounded" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-lg text-slate-900 border-r-4 border-amber-500 pr-3 my-3 font-black" {...props} />,
                li: ({node, ...props}) => <li className="list-disc list-inside marker:text-amber-500 mb-1" {...props} />,
                table: ({node, ...props}) => <div className="my-3 overflow-x-auto rounded-xl border border-slate-100"><table className="w-full text-right border-collapse" {...props} /></div>,
                th: ({node, ...props}) => <th className="bg-slate-100 p-2 font-black text-slate-900 border-b border-slate-200" {...props} />,
                td: ({node, ...props}) => <td className="p-2 border-b border-slate-100" {...props} />,
                em: ({node, ...props}) => <em className="text-emerald-600 font-black not-italic" {...props} />
              }}>{m.content}</Markdown>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
      {isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="ai-chat-row is-assistant">
          <div className="ai-chat-avatar"><Bot size={15} /></div>
          <div className="ai-chat-bubble ai-loading-bubble"><Loader2 size={14} className="animate-spin" /> جاري تحليل بيانات التراث...</div>
        </motion.div>
      )}
      <div ref={messagesEndRef} className="h-4" />
    </div>

    <div className="ai-executive-inputbar">
      <div className="ai-suggestion-grid">
        {suggestions.map((s, i) => (
          <button key={i} type="button" onClick={() => setInput(s)} className="ai-suggestion-chip">
            <Sparkles size={12} /> {s}
          </button>
        ))}
      </div>
      <div className="ai-input-wrap">
        <BrainCircuit size={18} />
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
          placeholder="اكتب سؤالك للمساعد التنفيذي..."
        />
        <button type="button" onClick={() => handleSend(null)} disabled={!input.trim() || isLoading}>
          <Send size={17} className="rotate-180" />
        </button>
      </div>
    </div>
  </section>
 </div>
);
});

export default AIAssistant;
