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
	 Users,
	 Loader2,
	 ChevronLeft,
	 Copy,
	 CheckCircle2,
	 ShieldAlert,
	 Wand2,
	 Clock3
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

type MissionTone = 'risk' | 'opportunity' | 'action';

const money = (value: any) => {
 const n = Number(value || 0);
 return Number.isFinite(n) ? n.toFixed(3) : '0.000';
};

const daysBetween = (dateValue: any) => {
 const time = new Date(dateValue || 0).getTime();
 if (!time) return 0;
 return Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24));
};

const isPaid = (value: any) => {
 const s = String(value || '').toLowerCase();
 return s.includes('paid') || s.includes('تم الدفع') || s.includes('مدفوع') || s.includes('مدفوعة');
};

const isFailed = (value: any) => {
 const s = String(value || '').toLowerCase();
 return s.includes('failed') || s.includes('declined') || s.includes('فشل') || s.includes('فشلت');
};

const isPending = (value: any) => {
 const s = String(value || '').toLowerCase();
 return !s || s.includes('pending') || s.includes('بانتظار') || s.includes('انتظار') || s.includes('جديد');
};

const buildAssistantIntel = (data: AppState) => {
 const invoices = (data?.invoices || []).filter((i: any) => !i.isDeleted);
 const paidInvoices = invoices.filter((i: any) => isPaid(i.paymentStatus || i.status) || i.paymentStatus === undefined);
 const orders = data?.orders || [];
 const customers = data?.customers || [];
 const products = data?.products || [];
 const suppliers = data?.suppliers || [];
 const todayKey = new Date().toISOString().slice(0, 10);
 const todayInvoices = paidInvoices.filter((i: any) => String(i.date || i.createdAt || '').startsWith(todayKey));
 const totalSales = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.total || 0), 0);
 const todaySales = todayInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.total || 0), 0);
 const totalProfit = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.profit || 0), 0);
 const margin = totalSales > 0 ? Math.round((totalProfit / totalSales) * 100) : 0;
 const pendingOrders = orders.filter((o: any) => isPending(o.paymentStatus || o.status));
 const failedOrders = orders.filter((o: any) => isFailed(o.paymentStatus || o.status));
 const paidOrders = orders.filter((o: any) => isPaid(o.paymentStatus || o.status));

 const productSales = new Map<string, { qty: number; revenue: number }>();
 paidInvoices.forEach((inv: any) => {
   (inv.items || []).forEach((item: any) => {
     const id = item.productId || item.id || item.name;
     if (!id) return;
     const current = productSales.get(String(id)) || { qty: 0, revenue: 0 };
     current.qty += Number(item.quantity || 0);
     current.revenue += Number(item.priceAtTime || item.price || 0) * Number(item.quantity || 0);
     productSales.set(String(id), current);
   });
 });

 const productRank = products
   .map((p: any) => {
     const sold = productSales.get(String(p.id)) || { qty: 0, revenue: 0 };
     const profitPerUnit = Number(p.price || 0) - Number(p.cost || 0);
     return {
       name: p.name || 'منتج',
       soldQty: sold.qty,
       revenue: sold.revenue,
       profitPerUnit,
       margin: Number(p.price || 0) > 0 ? Math.round((profitPerUnit / Number(p.price || 1)) * 100) : 0,
     };
   })
   .sort((a, b) => (b.revenue + b.profitPerUnit * 2) - (a.revenue + a.profitPerUnit * 2));

 const hiddenGem = productRank
   .filter((p) => p.profitPerUnit > 0 && p.soldQty <= 3)
   .sort((a, b) => b.margin - a.margin)[0];

 const atRiskCustomer = customers
   .map((c: any) => ({ ...c, idleDays: daysBetween(c.lastActive || c.lastOrderDate), spent: Number(c.totalSpent || 0) }))
   .filter((c: any) => c.idleDays >= 30 && c.spent >= 30)
   .sort((a: any, b: any) => b.spent - a.spent)[0];

 const supplierDebt = suppliers.reduce((sum: number, s: any) => sum + Math.max(0, Number(s.balance || 0)), 0);
 const topSupplierDebt = [...suppliers].sort((a: any, b: any) => Number(b.balance || 0) - Number(a.balance || 0))[0];

 const missions = [
   failedOrders.length > 0 && {
     tone: 'risk' as MissionTone,
     icon: <ShieldAlert size={18} />,
     title: 'أولوية الدفع',
     text: `${failedOrders.length} عملية فشل دفع تحتاج قرار متابعة.`,
     prompt: `حلل فشل الدفع الحالي واعطني خطة متابعة قصيرة بدون تغيير أي شيء في النظام. عدد الفشل: ${failedOrders.length}`,
   },
   pendingOrders.length > 0 && {
     tone: 'action' as MissionTone,
     icon: <Clock3 size={18} />,
     title: 'المعلّق الآن',
     text: `${pendingOrders.length} طلب بانتظار الدفع.`,
     prompt: `رتب لي طلبات بانتظار الدفع كأولوية تشغيلية، واعطني رسالة متابعة محترمة للعميل بدون ضغط. عدد الطلبات: ${pendingOrders.length}`,
   },
   hiddenGem && {
     tone: 'opportunity' as MissionTone,
     icon: <Lightbulb size={18} />,
     title: 'فرصة مخفية',
     text: `${hiddenGem.name} هامشه ${hiddenGem.margin}% ومبيعاته قليلة.`,
     prompt: `حوّل المنتج "${hiddenGem.name}" إلى فرصة تسويق عملية: سبب الاختيار، فكرة عرض، ونص واتساب قصير.`,
   },
   atRiskCustomer && {
     tone: 'risk' as MissionTone,
     icon: <Users size={18} />,
     title: 'عميل معرض للفقد',
     text: `${atRiskCustomer.name || atRiskCustomer.phone} غائب ${atRiskCustomer.idleDays} يوم.`,
     prompt: `اكتب خطة استرجاع للعميل ${atRiskCustomer.name || atRiskCustomer.phone} مع رسالة واتساب كويتية راقية قصيرة. لا تذكر بيانات حساسة.`,
   },
 ].filter(Boolean) as Array<{ tone: MissionTone; icon: React.ReactNode; title: string; text: string; prompt: string }>;

 return {
   totalSales,
   todaySales,
   totalProfit,
   margin,
   invoiceCount: invoices.length,
   paidInvoiceCount: paidInvoices.length,
   orderCount: orders.length,
   pendingOrders: pendingOrders.length,
   failedOrders: failedOrders.length,
   paidOrders: paidOrders.length,
   customerCount: customers.length,
   productCount: products.length,
   supplierCount: suppliers.length,
   supplierDebt,
   topSupplierDebt: topSupplierDebt ? `${topSupplierDebt.name || 'مورد'} (${money(topSupplierDebt.balance)} د.ك)` : 'لا يوجد',
   topProducts: productRank.slice(0, 5).map((p) => `${p.name}: ${p.soldQty} مبيع / هامش ${p.margin}%`).join(' | '),
   hiddenGem: hiddenGem ? `${hiddenGem.name} / هامش ${hiddenGem.margin}% / مبيعات ${hiddenGem.soldQty}` : 'لا يوجد',
   atRiskCustomer: atRiskCustomer ? `${atRiskCustomer.name || atRiskCustomer.phone} / غياب ${atRiskCustomer.idleDays} يوم / إنفاق ${money(atRiskCustomer.spent)}` : 'لا يوجد',
   missions: missions.slice(0, 4),
 };
};

const AIAssistant: React.FC<AIAssistantProps> = React.memo(({ data }) => {
	 const intel = React.useMemo(() => buildAssistantIntel(data), [data]);
	 const [copied, setCopied] = useState(false);
	 const [messages, setMessages] = useState<Message[]>([
	 { 
	 role: 'assistant', 
	 content: 'جاهز. أعطني سؤال أو اضغط إحدى البطاقات، وأنا أحوّل بياناتك إلى قرار واضح، رسالة جاهزة، أو أولوية تنفيذ.' 
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

	 const handleCopyLast = async () => {
	   const last = [...messages].reverse().find((m) => m.role === 'assistant')?.content || '';
	   if (!last) return;
	   try {
	     await navigator.clipboard.writeText(last);
	     setCopied(true);
	     toast.success('تم نسخ آخر رد');
	     setTimeout(() => setCopied(false), 1600);
	   } catch {
	     toast.error('ما قدرنا ننسخ');
	   }
	 };

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
	 const statsSummary = {
	   ...intel,
	   missions: undefined,
	 };
	
	 const assistantResponse = await fetch('/api/ai/assistant', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
	 message: cleanMessage,
	 systemPrompt: `أنت مساعد تنفيذي كويتي لمطبخ التراث داخل لوحة الأدمن. هدفك تحويل البيانات إلى قرار بسيط.
القواعد:
- اكتب بالعربية الواضحة وبلهجة كويتية بيضاء راقية عند الحاجة.
- لا تخترع أرقاماً؛ استخدم فقط الملخص المرسل.
- لا تطلب خطوات تقنية من المستخدم.
- لا تنفذ ولا تدعي أنك نفذت.
- الرد المثالي: خلاصة قصيرة، السبب، الإجراء التالي، ونص جاهز إذا كان مناسباً.
- لا تكثر؛ المستخدم يريد قراراً لا محاضرة.`,
	 statsSummary
	 })
 });

 const assistantPayload = await assistantResponse.json().catch(() => null);
 if (!assistantResponse.ok) {
 const serverError = assistantPayload?.error || `AI server error: ${assistantResponse.status}`;
 throw new Error(serverError);
 }

 const aiText = assistantPayload?.text || 'المعذرة يا طويل العمر، التحليل تعطل شوي. جرّب مرة ثانية.';
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
 content: 'نقاط الذكاء الاصطناعي خلصت. جدّد الباقة عشان المساعد يكمل معاك.' 
 }]);
 setIsLoading(false);
 return;
 }

 attempts++;
 console.error(`AI Assistant attempt ${attempts} failed:`, error);
 
 if (attempts >= maxAttempts) {
 setMessages(prev => [...prev, { 
 role: 'assistant', 
 content: 'المساعد واجه مشكلة تقنية أكثر من مرة. عطه شوي وجرب مرة ثانية.' 
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
	  { label: 'شنو أسوي الحين؟', prompt: 'اعطني أهم 3 أولويات الآن من البيانات، بالترتيب: عاجل، مهم، فرصة.' },
	  { label: 'اكتب رسالة عميل', prompt: 'اختر أفضل عميل يحتاج متابعة أو استرجاع واكتب لي رسالة واتساب قصيرة راقية.' },
	  { label: 'طلع فرصة بيع', prompt: 'استخرج أفضل فرصة نمو أو منتج يستحق حملة اليوم مع سبب واضح ونص حملة قصير.' },
	  { label: 'فسّر الربح', prompt: 'فسر لي الربحية والهامش الحالي، واذكر قرار واحد يحسن الربح بدون تعقيد.' },
	 ];

 return (
	 <div className="ai-executive-assistant-shell animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">

	  <section className="ai-mission-strip">
	    {(intel.missions.length ? intel.missions : [{
	      tone: 'opportunity' as MissionTone,
	      icon: <CheckCircle2 size={18} />,
	      title: 'الوضع مستقر',
	      text: 'ابدأ بسؤال سريع أو اطلب فرصة تسويق.',
	      prompt: 'الوضع مستقر. اقترح لي أفضل فرصة تحسين صغيرة اليوم بناءً على البيانات المتاحة.'
	    }]).map((mission, index) => (
	      <button key={index} type="button" onClick={() => handleSend(mission.prompt)} className={cn('ai-mission-card', `is-${mission.tone}`)} disabled={isLoading}>
	        <div className="ai-mission-icon">{mission.icon}</div>
	        <div><strong>{mission.title}</strong><span>{mission.text}</span></div>
	        <ChevronLeft size={16} />
	      </button>
	    ))}
	  </section>

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
          <div className="ai-chat-bubble ai-loading-bubble"><Loader2 size={14} className="animate-spin" /> نحلل بيانات التراث...</div>
        </motion.div>
      )}
      <div ref={messagesEndRef} className="h-4" />
    </div>

	    <div className="ai-executive-inputbar">
	      <div className="ai-action-row">
	        <button type="button" onClick={() => handleSend('اعطني ملخص مدير مختصر جداً: الخطر، الفرصة، الإجراء التالي.')} disabled={isLoading}>
	          <Wand2 size={14} /> ملخص المدير
	        </button>
	        <button type="button" onClick={handleCopyLast}>
	          {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />} نسخ آخر رد
	        </button>
	      </div>
	      <div className="ai-suggestion-grid">
	        {suggestions.map((s, i) => (
	          <button key={i} type="button" onClick={() => handleSend(s.prompt)} className="ai-suggestion-chip" disabled={isLoading}>
	            <Sparkles size={12} /> {s.label}
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
