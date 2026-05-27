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
import { getKitchenNowDecision } from '../lib/ai-engine';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';
import { toast } from 'sonner';

interface AIAssistantProps {
 data: AppState;
 currentPage?: string;
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
 const startOfDay = (offsetDays: number) => {
   const d = new Date();
   d.setHours(0, 0, 0, 0);
   d.setDate(d.getDate() + offsetDays);
   return d.getTime();
 };
 const invoiceTime = (inv: any) => new Date(inv.date || inv.createdAt || inv.updatedAt || 0).getTime();
 const sumInvoicesBetween = (fromOffset: number, toOffset: number) => {
   const from = startOfDay(fromOffset);
   const to = startOfDay(toOffset);
   const bucket = paidInvoices.filter((inv: any) => {
     const t = invoiceTime(inv);
     return t >= from && t < to;
   });
   return {
     count: bucket.length,
     sales: bucket.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || inv.total || 0), 0),
     profit: bucket.reduce((sum: number, inv: any) => sum + Number(inv.profit || 0), 0),
   };
 };
 const yesterday = sumInvoicesBetween(-1, 0);
 const last7 = sumInvoicesBetween(-7, 1);
 const prev7 = sumInvoicesBetween(-14, -7);
 const salesTrend7 = prev7.sales > 0 ? Math.round(((last7.sales - prev7.sales) / prev7.sales) * 100) : null;
 const avgOrderValue = paidInvoices.length > 0 ? totalSales / paidInvoices.length : 0;

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
     const price = Number(p.price || 0);
     const cost = Number(p.cost || 0);
     const profitPerUnit = price - cost;
     const stock = Number(p.stock ?? p.quantity ?? 0);
     return {
       id: p.id,
       name: p.name || 'منتج',
       category: p.category || p.type || 'غير مصنف',
       price,
       cost,
       stock,
       soldQty: sold.qty,
       revenue: sold.revenue,
       profitPerUnit,
       margin: price > 0 ? Math.round((profitPerUnit / Number(price || 1)) * 100) : 0,
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
 const recentInvoices = [...paidInvoices]
   .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
   .slice(0, 8)
   .map((inv: any) => ({
     date: String(inv.date || inv.createdAt || '').slice(0, 10) || 'بدون تاريخ',
     total: Number(inv.totalAmount || inv.total || 0),
     profit: Number(inv.profit || 0),
     items: (inv.items || []).slice(0, 4).map((it: any) => `${it.name || it.productName || 'منتج'} x${it.quantity || 1}`).join(', ')
   }));
 const topCustomers = [...customers]
   .map((c: any) => ({
     name: c.name || c.phone || 'عميل',
     phone: c.phone || '',
     spent: Number(c.totalSpent || 0),
     orders: Number(c.totalOrders || c.orderCount || 0),
     lastActive: c.lastActive || c.lastOrderDate || ''
   }))
   .sort((a: any, b: any) => b.spent - a.spent)
   .slice(0, 6);
 const weakProducts = [...productRank]
   .filter((p: any) => p.soldQty === 0 || (p.margin > 20 && p.soldQty <= 2))
   .slice(0, 6);
 const lowStockProducts = [...productRank]
   .filter((p: any) => p.stock > 0 && p.stock <= 5)
   .slice(0, 6);

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
   yesterdaySales: yesterday.sales,
   yesterdayProfit: yesterday.profit,
   last7Sales: last7.sales,
   last7Profit: last7.profit,
   prev7Sales: prev7.sales,
   salesTrend7: salesTrend7 === null ? 'لا توجد بيانات كافية للمقارنة' : `${salesTrend7}%`,
   avgOrderValue,
   topSupplierDebt: topSupplierDebt ? `${topSupplierDebt.name || 'مورد'} (${money(topSupplierDebt.balance)} د.ك)` : 'لا يوجد',
   topProducts: productRank.slice(0, 5).map((p) => `${p.name}: ${p.soldQty} مبيع / هامش ${p.margin}% / سعر ${money(p.price)} / تكلفة ${money(p.cost)}`).join(' | '),
   weakProducts: weakProducts.map((p) => `${p.name}: مبيعات ${p.soldQty} / هامش ${p.margin}% / مخزون ${p.stock}`).join(' | ') || 'لا يوجد',
   lowStockProducts: lowStockProducts.map((p) => `${p.name}: مخزون ${p.stock}`).join(' | ') || 'لا يوجد',
   topCustomers: topCustomers.map((c) => `${c.name}: إنفاق ${money(c.spent)} د.ك / طلبات ${c.orders}`).join(' | ') || 'لا يوجد',
   recentInvoices: recentInvoices.map((i) => `${i.date}: ${money(i.total)} د.ك / ربح ${money(i.profit)} / ${i.items}`).join(' | ') || 'لا توجد فواتير حديثة',
   hiddenGem: hiddenGem ? `${hiddenGem.name} / هامش ${hiddenGem.margin}% / مبيعات ${hiddenGem.soldQty} / سعر ${money(hiddenGem.price)} / تكلفة ${money(hiddenGem.cost)}` : 'لا يوجد',
   atRiskCustomer: atRiskCustomer ? `${atRiskCustomer.name || atRiskCustomer.phone} / غياب ${atRiskCustomer.idleDays} يوم / إنفاق ${money(atRiskCustomer.spent)}` : 'لا يوجد',
   dataFreshness: `${paidInvoices.length} فاتورة مدفوعة من أصل ${invoices.length} / ${orders.length} طلب / ${products.length} منتج / ${customers.length} عميل`,
   missions: missions.slice(0, 4),
 };
};

const AIAssistant: React.FC<AIAssistantProps> = React.memo(({ data, currentPage = 'ai' }) => {
	 const intel = React.useMemo(() => buildAssistantIntel(data), [data]);
	 const effectivePage = React.useMemo(() => {
	   try {
	     return currentPage === 'ai' ? (localStorage.getItem('ai_context_page') || 'dashboard') : currentPage;
	   } catch {
	     return currentPage === 'ai' ? 'dashboard' : currentPage;
	   }
	 }, [currentPage]);
	 const pageDecision = React.useMemo(() => getKitchenNowDecision(data, effectivePage), [data, effectivePage]);
	 const [copied, setCopied] = useState(false);
	 const [messages, setMessages] = useState<Message[]>([
	 { 
	 role: 'assistant', 
	 content: 'حاضر يا طويل العمر. أنا أقرأ بيانات مطعمك أولاً، وبعدها أعطيك قرار واضح: شنو صار، ليش صار، وشنو تسوي الحين. ما راح أعطيك كلام عام.' 
	 }
	 ]);
 const [input, setInput] = useState('');
 const [isLoading, setIsLoading] = useState(false);
 const messagesEndRef = useRef<HTMLDivElement>(null);
 const memoryKey = 'alturath_ai_executive_memory_v1';
 const readMemory = () => {
   try {
     const parsed = JSON.parse(localStorage.getItem(memoryKey) || '{}');
     return {
       ownerStyle: parsed.ownerStyle || 'يفضل قرارات مختصرة، مباشرة، مبنية على بيانات مطعمه فقط وبلهجة كويتية راقية.',
       repeatedConcerns: Array.isArray(parsed.repeatedConcerns) ? parsed.repeatedConcerns.slice(-12) : [],
       lastDecisions: Array.isArray(parsed.lastDecisions) ? parsed.lastDecisions.slice(-12) : [],
       bannedPatterns: ['الكلام العام', 'الاقتراحات غير المرتبطة بالأرقام', 'اختراع أرقام أو منتجات'],
     };
   } catch {
     return {
       ownerStyle: 'يفضل قرارات مختصرة، مباشرة، مبنية على بيانات مطعمه فقط وبلهجة كويتية راقية.',
       repeatedConcerns: [],
       lastDecisions: [],
       bannedPatterns: ['الكلام العام', 'الاقتراحات غير المرتبطة بالأرقام', 'اختراع أرقام أو منتجات'],
     };
   }
 };
 const rememberTurn = (userText: string, assistantText: string) => {
   try {
     const current = readMemory();
     const concern = userText.slice(0, 180);
     const decision = assistantText.slice(0, 220);
     localStorage.setItem(memoryKey, JSON.stringify({
       ownerStyle: current.ownerStyle,
       repeatedConcerns: [...current.repeatedConcerns, concern].slice(-12),
       lastDecisions: [...current.lastDecisions, decision].slice(-12),
       updatedAt: new Date().toISOString(),
     }));
   } catch {
     // الذاكرة المحلية اختيارية ولا توقف المساعد
   }
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
 const rawMessage = messageToSend.trim();
 const cleanMessage = rawMessage === 'ضبطها' || rawMessage === 'ضبطه' || rawMessage === 'ضبط'
   ? `ضبطها حسب الصفحة الحالية (${effectivePage}). عطِني قرار واحد قابل للتنفيذ الآن. القرار المتوقع من النظام: ${pageDecision.decision}. الدليل: ${pageDecision.proof}. الإجراء: ${pageDecision.action}.`
   : rawMessage;

 setMessages(prev => [...prev, { role: 'user', content: cleanMessage }]);
 setInput('');
 setIsLoading(true);

 let attempts = 0;
 const maxAttempts = 5;

 while (attempts < maxAttempts) {
 try {
	 const statsSummary = {
	   ...intel,
	   currentPage: effectivePage,
	   pageDecision,
	   missions: undefined,
	 };
	 const memorySnapshot = readMemory();
	
	 const assistantResponse = await fetch('/api/ai/assistant', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
	 message: cleanMessage,
	 systemPrompt: `أنت عقل تنفيذي كويتي خاص بمطعم/مشروع المستخدم داخل لوحة الأدمن، مو مساعد عام.
شخصيتك:
- تفهم المطعم من البيانات المرسلة فقط: المبيعات، الفواتير، المنتجات، العملاء، الموردين، الطلبات، الربح، الهامش.
- تتكلم كأنك مستشار ملازم للتاجر ويفهمه من رمشة العين، لكن بدون مبالغة أو اختراع.
- إذا السؤال عام، اربطه فوراً بأرقام مطعمه وواقعه الحالي.
قواعد صارمة:
- ممنوع الكلام العام مثل: حسّن التسويق أو راقب المبيعات بدون ربطه برقم/منتج/عميل/مورد من البيانات.
- لا تخترع أرقاماً ولا أسماء منتجات ولا عملاء؛ إذا البيانات ناقصة قل: ما عندي هالرقم حالياً.
- لا تطلب خطوات تقنية من المستخدم.
- لا تنفذ ولا تدعي أنك نفذت.
- اكتب بلهجة كويتية بيضاء راقية، مختصرة وواضحة.
- الرد المثالي دائماً: الحكم، الدليل من البيانات، القرار العملي، ثم نص جاهز إذا يناسب.
- قبل أي رد، افحص: هل عندي رقم/منتج/عميل/مورد يثبت كلامي؟ إذا لا، اطلب الناقص بوضوح.
- استخدم ذاكرة التاجر المحلية المرسلة لك عشان ما تكرر نفس النصائح وتفهم أسلوبه.
- ممنوع تذكر أنك نموذج أو ذكاء اصطناعي أو تعتذر بكثرة.
- إذا كتب التاجر كلمة "ضبطها" فقط، افهمها حسب الصفحة الحالية والقرار المرسل لك، ولا تسأله شنو يقصد إلا إذا البيانات ناقصة.
- إذا في مخاطرة، قلها بصراحة وبهدوء. إذا في فرصة، عطه خطوة قابلة للتنفيذ اليوم.`,
	 statsSummary,
	 memorySnapshot,
	 conversationHistory: messages.slice(-6).map((m) => ({ role: m.role, content: m.content.slice(0, 900) }))
	 })
 });

 const assistantPayload = await assistantResponse.json().catch(() => null);
 if (!assistantResponse.ok) {
 const serverError = assistantPayload?.error || `AI server error: ${assistantResponse.status}`;
 throw new Error(serverError);
 }

 const aiText = assistantPayload?.text || 'المعذرة يا طويل العمر، التحليل تعطل شوي. جرّب مرة ثانية.';
 rememberTurn(cleanMessage, aiText);
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
 content: 'نقاط التراث الذكي خلصت. جدّد الباقة عشان المساعد يكمل معاك.' 
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
	  { label: 'شنو أسوي الحين؟', prompt: `حسب الصفحة الحالية ${effectivePage} وبيانات مطعمي، عطِني قرار واحد فقط الآن. القرار المحلي المقترح: ${pageDecision.decision}. الدليل: ${pageDecision.proof}.` },
	  { label: 'ضبطها', prompt: 'ضبطها' },
	  { label: 'اكتب رسالة عميل', prompt: 'اختَر من بياناتي عميل يستاهل متابعة أو استرجاع، وكتب له رسالة واتساب كويتية قصيرة. إذا ما عندك اسم واضح، قل لي شنو الناقص.' },
	  { label: 'طلع فرصة بيع', prompt: 'من منتجاتي وفواتيري الحالية، اختر منتج واحد يستاهل حملة اليوم، واشرح لي ليش، واكتب نص حملة قصير.' },
	  { label: 'فسّر الربح', prompt: 'حلل ربح مطعمي وهامشه من البيانات الحالية، وقل لي قرار واحد يحسن الربح اليوم بدون تخفيض عشوائي.' },
	 ];

 return (
	 <div className="ai-executive-assistant-shell animate-in fade-in slide-in-from-bottom-4 duration-700" dir="rtl">

	  {(!messages || messages.length === 0) && (
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
	  )}

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
