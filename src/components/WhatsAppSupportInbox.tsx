import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Bot, CheckCircle2, Clock, Headphones, Loader2, MessageCircle, RefreshCw, Search, Send, ShieldCheck, Sparkles, UserRound, Zap } from 'lucide-react';
import { cn } from '../lib/utils';

type Conversation = {
  id: string;
  phone: string;
  customerName?: string;
  mode?: 'bot' | 'human' | string;
  status?: string;
  priority?: string;
  unreadCount?: number;
  lastMessageText?: string;
  lastInboundText?: string;
  lastOutboundText?: string;
  lastMessageDirection?: string;
  lastMessageAt?: string;
  tags?: string[];
};

type ChatMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  text: string;
  type?: string;
  sentBy?: string;
  status?: string;
  createdAt?: string;
};

type QuickReply = { id: string; title: string; text: string };

const statusLabel = (c?: Conversation | null) => {
  if (!c) return '';
  if (c.status === 'closed') return 'مغلقة';
  if (c.status === 'needs_support') return 'تحتاج دعم';
  if (c.mode === 'human') return 'دعم مباشر';
  return 'البوت يعمل';
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-KW', {
    day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true
  }).format(d).replace(' ص', 'AM').replace(' م', 'PM').replace(':', '.');
};

const cleanPhone = (phone?: string) => String(phone || '').replace(/\D/g, '');

const WHATSAPP_DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-support',
    phone: '96550000001',
    customerName: 'عميل يحتاج دعم',
    mode: 'human',
    status: 'needs_support',
    priority: 'high',
    unreadCount: 2,
    lastMessageText: 'وصلني رابط الدفع لكن أبي أتأكد من تفاصيل الطلب قبل الدفع',
    lastInboundText: 'وصلني رابط الدفع لكن أبي أتأكد من تفاصيل الطلب قبل الدفع',
    lastMessageDirection: 'inbound',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    tags: ['demo', 'support'],
  },
  {
    id: 'demo-track',
    phone: '96550000002',
    customerName: 'عميل يتتبع طلبه',
    mode: 'bot',
    status: 'open',
    priority: 'normal',
    unreadCount: 0,
    lastMessageText: 'تم إرسال رابط التتبع للعميل',
    lastInboundText: '97424400',
    lastOutboundText: 'تم إرسال رابط التتبع للعميل',
    lastMessageDirection: 'outbound',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    tags: ['demo', 'tracking'],
  },
  {
    id: 'demo-products',
    phone: '96550000003',
    customerName: 'استفسار عن منتج',
    mode: 'bot',
    status: 'open',
    priority: 'normal',
    unreadCount: 1,
    lastMessageText: 'هل عندكم باقة ضيافة للديوانية؟',
    lastInboundText: 'هل عندكم باقة ضيافة للديوانية؟',
    lastMessageDirection: 'inbound',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    tags: ['demo', 'products'],
  },
  {
    id: 'demo-closed',
    phone: '96550000004',
    customerName: 'محادثة مغلقة',
    mode: 'bot',
    status: 'closed',
    priority: 'normal',
    unreadCount: 0,
    lastMessageText: 'تم إغلاق المحادثة بعد خدمة العميل',
    lastOutboundText: 'تم إغلاق المحادثة بعد خدمة العميل',
    lastMessageDirection: 'outbound',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    tags: ['demo', 'closed'],
  },
];

const WHATSAPP_DEMO_MESSAGES: Record<string, ChatMessage[]> = {
  '96550000001': [
    { id: 'demo-support-1', direction: 'inbound', text: 'السلام عليكم', createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString() },
    { id: 'demo-support-2', direction: 'outbound', sentBy: 'bot', text: 'مرحبًا بك في Alturath 👋\n\nكيف نقدر نخدمك؟\n\n1. طلب جديد\n2. تتبع طلب أو فاتورة\n3. الاستفسار عن المنتجات\n4. الدعم', createdAt: new Date(Date.now() - 1000 * 60 * 17).toISOString() },
    { id: 'demo-support-3', direction: 'inbound', text: '4', createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString() },
    { id: 'demo-support-4', direction: 'outbound', sentBy: 'bot', text: 'يسعدنا خدمتك 🤍\nاكتب رسالتك هنا، وسيقوم فريق الدعم بمتابعتها في أقرب وقت.', createdAt: new Date(Date.now() - 1000 * 60 * 14).toISOString() },
    { id: 'demo-support-5', direction: 'inbound', text: 'وصلني رابط الدفع لكن أبي أتأكد من تفاصيل الطلب قبل الدفع', createdAt: new Date(Date.now() - 1000 * 60 * 8).toISOString() },
  ],
  '96550000002': [
    { id: 'demo-track-1', direction: 'inbound', text: 'وين طلبي؟', createdAt: new Date(Date.now() - 1000 * 60 * 38).toISOString() },
    { id: 'demo-track-2', direction: 'outbound', sentBy: 'bot', text: 'أرسل رقم الطلب أو الفاتورة، أو رقم هاتفك المكوّن من 8 أرقام، وسأبحث لك مباشرة.', createdAt: new Date(Date.now() - 1000 * 60 * 37).toISOString() },
    { id: 'demo-track-3', direction: 'inbound', text: '97424400', createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString() },
    { id: 'demo-track-4', direction: 'outbound', sentBy: 'bot', text: 'وجدت لك آخر طلب مرتبط بهذا الرقم.\n\nالحالة: تم الدفع بنجاح\nرابط التتبع:\nhttps://alturathkw.shop/track', createdAt: new Date(Date.now() - 1000 * 60 * 32).toISOString() },
  ],
  '96550000003': [
    { id: 'demo-products-1', direction: 'inbound', text: '3', createdAt: new Date(Date.now() - 1000 * 60 * 82).toISOString() },
    { id: 'demo-products-2', direction: 'outbound', sentBy: 'bot', text: 'اكتب اسم المنتج أو نوع الطلب الذي تبحث عنه، وسأبحث لك في المنتجات المتاحة.', createdAt: new Date(Date.now() - 1000 * 60 * 81).toISOString() },
    { id: 'demo-products-3', direction: 'inbound', text: 'هل عندكم باقة ضيافة للديوانية؟', createdAt: new Date(Date.now() - 1000 * 60 * 75).toISOString() },
  ],
  '96550000004': [
    { id: 'demo-closed-1', direction: 'inbound', text: 'شكراً لكم', createdAt: new Date(Date.now() - 1000 * 60 * 185).toISOString() },
    { id: 'demo-closed-2', direction: 'outbound', sentBy: 'admin', text: 'حياك الله، سعدنا بخدمتك 🤍\nتم إغلاق المحادثة، ويمكنك كتابة "القائمة" في أي وقت للبدء من جديد.', createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
  ],
};

const WHATSAPP_DEMO_QUICK_REPLIES: QuickReply[] = [
  { id: 'demo-hello', title: 'ترحيب راقٍ', text: 'حياك الله في Alturath 🤍\nأنا معك الآن، شنو أقدر أساعدك فيه؟' },
  { id: 'demo-track-request', title: 'طلب رقم التتبع', text: 'أرسل رقم الطلب أو الفاتورة، أو رقم الهاتف المكوّن من 8 أرقام، وسأراجع لك الحالة مباشرة.' },
  { id: 'demo-payment', title: 'الدفع', text: 'تقدر ترسل لي رقم الطلب أو الفاتورة، وأتأكد لك من حالة الدفع والتتبع.' },
  { id: 'demo-new-order', title: 'طلب جديد', text: 'لطلب جديد تفضل من هنا:\nhttps://alturathkw.shop' },
  { id: 'demo-close', title: 'إغلاق راقٍ', text: 'سعدنا بخدمتك 🤍\nإذا احتجت أي شيء لاحقًا، اكتب "القائمة" وسنكون معك مباشرة.' },
];

const isDemoConversation = (c?: Conversation | null) => Boolean(c?.tags?.includes('demo') || c?.id?.startsWith('demo-'));
const isDemoPhone = (phone?: string) => Boolean(WHATSAPP_DEMO_MESSAGES[cleanPhone(phone)]);


export default function WhatsAppSupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [replyText, setReplyText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs_support' | 'human' | 'bot' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const deepLinkConsumedRef = useRef(false);

  const showNotice = (type: 'info' | 'success' | 'error', text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice((current) => current?.text === text ? null : current), 3200);
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/whatsapp/conversations?limit=80', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تحميل المحادثات');
      const liveConversations = json.conversations || [];
      const nextConversations = liveConversations.length ? liveConversations : WHATSAPP_DEMO_CONVERSATIONS;
      setConversations(nextConversations);
      setError('');
    } catch (e: any) {
      setConversations(WHATSAPP_DEMO_CONVERSATIONS);
      setError(`${e?.message || 'تعذر الاتصال بخدمة واتساب'} — يتم عرض بيانات تجريبية فقط.`);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (phone: string, scrollToEnd = false) => {
    if (!phone) return;
    if (isDemoPhone(phone)) {
      const clean = cleanPhone(phone);
      setSelected(WHATSAPP_DEMO_CONVERSATIONS.find(c => c.phone === clean) || null);
      setMessages(WHATSAPP_DEMO_MESSAGES[clean] || []);
      setQuickReplies(WHATSAPP_DEMO_QUICK_REPLIES);
      if (scrollToEnd) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 60);
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(phone))}/messages`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تحميل الرسائل');
      setSelected(json.conversation || null);
      setMessages(json.messages || []);
      setQuickReplies(json.quickReplies || []);
      await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(phone))}/read`, { method: 'POST' }).catch(() => {});
      if (scrollToEnd) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 60);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل المحادثة');
    }
  };

  useEffect(() => {
    loadConversations();
    const timer = window.setInterval(() => loadConversations(true), 6000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (deepLinkConsumedRef.current || !conversations.length) return;
    try {
      const saved = JSON.parse(sessionStorage.getItem('adminPushDeepLink') || 'null');
      const phone = cleanPhone(saved?.page === 'whatsapp-support' ? saved?.phone : '');
      if (!phone) return;
      deepLinkConsumedRef.current = true;
      setFilter('needs_support');
      setSelectedPhone(phone);
      showNotice('info', 'تم فتح محادثة واتساب التي تحتاج متابعة.');
    } catch {}
  }, [conversations]);

  useEffect(() => {
    if (!selectedPhone) return;
    loadMessages(selectedPhone, true);
    const timer = window.setInterval(() => loadMessages(selectedPhone, false), 5500);
    return () => window.clearInterval(timer);
  }, [selectedPhone]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((c) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread' ? Number(c.unreadCount || 0) > 0 : c.status === filter || c.mode === filter);
      const matchesSearch = !q || [c.phone, c.customerName, c.lastMessageText, c.lastInboundText].filter(Boolean).join(' ').toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [conversations, query, filter]);

  const counts = useMemo(() => ({
    all: conversations.length,
    support: conversations.filter(c => c.status === 'needs_support' || c.mode === 'human').length,
    unread: conversations.reduce((sum, c) => sum + (Number(c.unreadCount || 0) > 0 ? 1 : 0), 0),
  }), [conversations]);

  const sendReply = async (text = replyText) => {
    const body = text.trim();
    if (!selectedPhone || !body || sending) return;
    if (isDemoPhone(selectedPhone)) {
      const now = new Date().toISOString();
      setMessages(prev => [...prev, { id: `demo-local-${Date.now()}`, direction: 'outbound', text: body, sentBy: 'admin', createdAt: now }]);
      setReplyText('');
      showNotice('success', 'تم تجهيز الرد في وضع العرض.');
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 60);
      return;
    }
    setSending(true);
    showNotice('info', 'جارٍ إرسال الرد عبر واتساب...');
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(selectedPhone))}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: body, sentBy: 'admin' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json?.result?.payload?.error?.message || json.error || 'فشل إرسال الرد');
      setReplyText('');
      await loadMessages(selectedPhone, true);
      await loadConversations(true);
      showNotice('success', 'تم إرسال الرد وفتح مسار واتساب بنجاح.');
    } catch (e: any) {
      const message = e?.message || 'فشل إرسال الرد';
      setError(message);
      showNotice('error', message);
    } finally {
      setSending(false);
    }
  };

  const setMode = async (mode: 'bot' | 'human') => {
    if (!selectedPhone) return;
    if (isDemoPhone(selectedPhone)) {
      setSelected(prev => prev ? { ...prev, mode, status: mode === 'human' ? 'needs_support' : 'open' } : prev);
      setConversations(prev => prev.map(c => c.phone === cleanPhone(selectedPhone) ? { ...c, mode, status: mode === 'human' ? 'needs_support' : 'open' } : c));
      showNotice('success', mode === 'human' ? 'تم تحويل المحادثة للدعم اليدوي.' : 'تم إرجاع المحادثة للبوت.');
      return;
    }
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(selectedPhone))}/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode })
    }).catch(() => {});
    await loadMessages(selectedPhone, false);
    await loadConversations(true);
    showNotice('success', mode === 'human' ? 'تم تحويل المحادثة للدعم اليدوي.' : 'تم إرجاع المحادثة للبوت.');
  };

  const closeConversation = async () => {
    if (!selectedPhone) return;
    if (isDemoPhone(selectedPhone)) {
      setSelected(prev => prev ? { ...prev, status: 'closed', unreadCount: 0 } : prev);
      setConversations(prev => prev.map(c => c.phone === cleanPhone(selectedPhone) ? { ...c, status: 'closed', unreadCount: 0 } : c));
      showNotice('success', 'تم إغلاق المحادثة.');
      return;
    }
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(selectedPhone))}/close`, { method: 'POST' }).catch(() => {});
    await loadMessages(selectedPhone, false);
    await loadConversations(true);
    showNotice('success', 'تم إغلاق المحادثة.');
  };

  return (
    <div dir="rtl" className="min-h-[calc(100vh-120px)] text-slate-900">
      <div className="mb-4 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-100 px-4 py-2 text-emerald-700 text-xs font-bold mb-3">
            <Sparkles size={14} /> مركز واتساب الذكي
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">دعم واتساب</h1>
          <p className="text-slate-500 mt-2 max-w-2xl">Inbox احترافي للرد اليدوي، تسليم المحادثة بين البوت والفريق، وردود سريعة جاهزة بدون لمس منطق الطلبات أو الدفع.</p>
        </div>
        <div className="grid grid-cols-3 gap-3 min-w-[320px]">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4"><div className="text-xs text-slate-400">المحادثات</div><div className="text-2xl font-black">{counts.all}</div></div>
          <div className="rounded-3xl bg-amber-50 border border-amber-100 shadow-sm p-4"><div className="text-xs text-amber-600">تحتاج دعم</div><div className="text-2xl font-black text-amber-700">{counts.support}</div></div>
          <div className="rounded-3xl bg-rose-50 border border-rose-100 shadow-sm p-4"><div className="text-xs text-rose-600">غير مقروء</div><div className="text-2xl font-black text-rose-700">{counts.unread}</div></div>
        </div>
      </div>

      {notice && <div className={cn('mb-4 rounded-2xl border px-4 py-3 text-sm font-black flex items-center gap-2', notice.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : notice.type === 'error' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-sky-100 bg-sky-50 text-sky-700')}><AlertCircle size={16} /> {notice.text}</div>}
      {error && <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-bold">{error}</div>}
      {conversations.some(isDemoConversation) && (
        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50 text-amber-800 px-4 py-3 text-sm font-bold flex items-center gap-2">
          <Sparkles size={16} /> وضع العرض التجريبي مفعل: هذه المحادثات وهمية للمعاينة فقط، لا تُحفظ في قاعدة البيانات ولا تُرسل إلى واتساب.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)_250px] gap-4 h-[calc(100vh-170px)] min-h-[760px] whatsapp-support-workspace">
        <section className="rounded-[2rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[760px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center gap-2 rounded-2xl bg-slate-50 border border-slate-100 px-3 py-2">
              <Search size={18} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالرقم أو الاسم أو آخر رسالة" className="bg-transparent outline-none flex-1 text-sm" />
              <button onClick={() => loadConversations()} className="p-1.5 rounded-xl hover:bg-white text-slate-500"><RefreshCw size={16} /></button>
            </div>
            <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
              {[
                ['all', 'الكل'], ['needs_support', 'دعم'], ['human', 'يدوي'], ['bot', 'بوت'], ['unread', 'جديد']
              ].map(([id, label]) => (
                <button key={id} onClick={() => setFilter(id as any)} className={cn('rounded-xl px-2 py-2 transition', filter === id ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length ? filtered.map((c) => (
              <button key={c.phone || c.id} onClick={() => setSelectedPhone(c.phone || c.id)} className={cn('w-full text-right rounded-2xl p-4 border transition group', selectedPhone === (c.phone || c.id) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black truncate flex items-center gap-2"><UserRound size={16} /> {c.customerName || c.phone}</div>
                    <div className={cn('text-xs mt-1 truncate', selectedPhone === (c.phone || c.id) ? 'text-white/60' : 'text-slate-400')}>{c.phone}</div>
                  </div>
                  {!!Number(c.unreadCount || 0) && <span className="bg-rose-500 text-white text-[10px] rounded-full min-w-6 h-6 flex items-center justify-center font-black">{c.unreadCount}</span>}
                </div>
                <div className={cn('text-sm mt-3 line-clamp-2 leading-6', selectedPhone === (c.phone || c.id) ? 'text-white/80' : 'text-slate-600')}>{c.lastMessageText || 'لا توجد رسائل بعد'}</div>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className={cn('px-2 py-1 rounded-full', c.mode === 'human' || c.status === 'needs_support' ? 'bg-amber-100 text-amber-700' : selectedPhone === (c.phone || c.id) ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700')}>{statusLabel(c)}</span>
                  <span className={selectedPhone === (c.phone || c.id) ? 'text-white/50' : 'text-slate-400'}>{formatTime(c.lastMessageAt)}</span>
                </div>
              </button>
            )) : <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3"><MessageCircle size={42} /><div className="font-bold">لا توجد محادثات مطابقة</div></div>}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[760px]">
          {selected ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-l from-white to-slate-50">
                <div>
                  <div className="text-xl font-black flex items-center gap-2"><MessageCircle className="text-emerald-600" /> {selected.customerName || 'عميل واتساب'}</div>
                  <div className="text-sm text-slate-500 mt-1 direction-ltr text-left">+{selected.phone}</div>
                  {isDemoConversation(selected) && <div className="mt-2 inline-flex rounded-full bg-amber-100 text-amber-700 px-3 py-1 text-xs font-black">بيانات عرض فقط</div>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => setMode('human')} className={cn('px-4 py-2 rounded-2xl text-sm font-bold border transition', selected.mode === 'human' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white hover:bg-amber-50 border-slate-200 text-slate-600')}><Headphones size={16} className="inline ml-1" /> استلام يدوي</button>
                  <button onClick={() => setMode('bot')} className={cn('px-4 py-2 rounded-2xl text-sm font-bold border transition', selected.mode !== 'human' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white hover:bg-emerald-50 border-slate-200 text-slate-600')}><Bot size={16} className="inline ml-1" /> إرجاع للبوت</button>
                  <button onClick={closeConversation} className="px-4 py-2 rounded-2xl text-sm font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600"><CheckCircle2 size={16} className="inline ml-1" /> إغلاق</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.08),transparent_30%),linear-gradient(180deg,#f8fafc,#ffffff)] space-y-4 scroll-smooth">
                {messages.map((m) => {
                  const inbound = m.direction === 'inbound';
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
                      <div className={cn('max-w-[92%] md:max-w-[86%] rounded-[1.5rem] px-5 py-4 shadow-sm border', inbound ? 'bg-white text-slate-800 border-slate-100 rounded-tl-md' : 'bg-slate-900 text-white border-slate-900 rounded-tr-md')}>
                        <div className="whitespace-pre-wrap leading-8 text-[15px]">{m.text}</div>
                        <div className={cn('text-[10px] mt-2 flex items-center gap-1', inbound ? 'text-slate-400' : 'text-white/50')}><Clock size={11} /> {formatTime(m.createdAt)} {m.sentBy && !inbound ? `• ${m.sentBy === 'bot' ? 'بوت' : 'أدمن'}` : ''}</div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-4 border-t border-slate-100 bg-white">
                <div className="flex gap-2 overflow-x-auto pb-3 custom-scrollbar">
                  {quickReplies.map((q) => (
                    <button key={q.id} onClick={() => setReplyText(q.text)} className="shrink-0 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-100 px-3 py-2 text-xs font-bold text-slate-600">{q.title}</button>
                  ))}
                </div>
                <div className="flex items-end gap-3">
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }} placeholder="اكتب ردك هنا... Ctrl/⌘ + Enter للإرسال" className="flex-1 min-h-[86px] max-h-56 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm leading-6" />
                  <button onClick={() => sendReply()} disabled={sending || !replyText.trim()} className="h-[86px] px-7 rounded-3xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black shadow-lg shadow-emerald-200 transition flex items-center gap-2"><Send size={18} /> إرسال</button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4"><MessageCircle size={56} /><div className="font-black text-xl">اختر محادثة للبدء</div></div>
          )}
        </section>

        <aside className="rounded-3xl bg-slate-950 text-white shadow-md overflow-hidden p-4 flex flex-col gap-4">
          <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
            <div className="flex items-center gap-2 font-black"><ShieldCheck className="text-emerald-400" /> سياسة التشغيل</div>
            <p className="text-white/60 text-sm leading-7 mt-3">البوت يرد تلقائيًا على الطلبات والتتبع والمنتجات. عند اختيار الدعم تنتقل المحادثة للوضع اليدوي ولا يزعج العميل بردود متكررة.</p>
          </div>
          <div className="rounded-3xl bg-white/10 border border-white/10 p-4">
            <div className="flex items-center gap-2 font-black"><Zap className="text-amber-300" /> الردود السريعة</div>
            <div className="mt-3 space-y-2">
              {quickReplies.slice(0, 6).map((q) => <button key={q.id} onClick={() => setReplyText(q.text)} className="w-full text-right rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-white/80">{q.title}</button>)}
            </div>
          </div>
          <div className="mt-auto rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 shadow-xl">
            <div className="text-lg font-black">جاهزية واتساب</div>
            <p className="text-white/80 text-sm mt-2 leading-7">بعد اكتمال Register للرقم، ستظهر المحادثات هنا فور وصول أول رسالة للـ Webhook.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
