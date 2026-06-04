import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Bot, CheckCircle2, Clock, Headphones, Loader2, MessageCircle, Pencil, Plus, RefreshCw, Save, Search, Send, Sparkles, Trash2, UserRound, X, Zap } from 'lucide-react';
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

const QUICK_REPLIES_STORAGE_KEY = 'alturath_whatsapp_quick_replies_v1';

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
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuwait',
    day: '2-digit', month: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true
  }).format(d);
};

const cleanPhone = (phone?: string) => String(phone || '').replace(/\D/g, '');


type ConversationActionState = {
  label: string;
  tone: 'danger' | 'warning' | 'success' | 'info' | 'muted';
  hint: string;
};

const getConversationActionState = (c?: Conversation | null): ConversationActionState => {
  if (!c) return { label: '', tone: 'muted', hint: '' };
  const unread = Number(c.unreadCount || 0);
  const inboundLast = c.lastMessageDirection === 'inbound';
  const needsHuman = c.status === 'needs_support' || c.mode === 'human';
  if (c.status === 'closed') return { label: 'مغلقة', tone: 'muted', hint: 'تم إغلاق المحادثة.' };
  if (needsHuman && (unread > 0 || inboundLast)) return { label: 'تحتاج رد', tone: 'danger', hint: 'آخر رسالة من العميل وتحتاج متابعة بشرية.' };
  if (needsHuman) return { label: 'قيد المتابعة', tone: 'warning', hint: 'المحادثة في الوضع اليدوي وتحت متابعة الموظف.' };
  if (c.lastMessageDirection === 'outbound') return { label: 'تم الرد تلقائيًا', tone: 'success', hint: 'آخر رد خرج من النظام/البوت ولا تحتاج تدخلًا الآن.' };
  if (unread > 0 || inboundLast) return { label: 'البوت يتعامل معها', tone: 'info', hint: 'المحادثة في وضع البوت، ولا تحتاج تدخلًا إلا إذا تحولت للدعم.' };
  return { label: 'طبيعية', tone: 'muted', hint: 'لا توجد متابعة مطلوبة حاليًا.' };
};

const actionStateClass = (tone: ConversationActionState['tone'], active = false) => {
  if (active) {
    if (tone === 'danger') return 'bg-rose-500 text-white';
    if (tone === 'warning') return 'bg-amber-400 text-slate-950';
    if (tone === 'success') return 'bg-emerald-400 text-slate-950';
    if (tone === 'info') return 'bg-sky-400 text-slate-950';
    return 'bg-white/10 text-white';
  }
  if (tone === 'danger') return 'bg-rose-50 text-rose-700 border border-rose-100';
  if (tone === 'warning') return 'bg-amber-50 text-amber-700 border border-amber-100';
  if (tone === 'success') return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
  if (tone === 'info') return 'bg-sky-50 text-sky-700 border border-sky-100';
  return 'bg-slate-100 text-slate-500 border border-slate-100';
};


const getConversationSlaInfo = (c?: Conversation | null, nowMs = Date.now()) => {
  const state = getConversationActionState(c);
  const waiting = state.label === 'تحتاج رد';
  if (!c || !waiting) return null;
  const base = c.lastMessageAt || '';
  const t = base ? new Date(base).getTime() : NaN;
  const minutes = Number.isFinite(t) ? Math.max(0, Math.floor((nowMs - t) / 60000)) : 0;
  const label = minutes < 1
    ? 'الآن'
    : minutes < 60
      ? `ينتظر ${minutes} د`
      : `ينتظر ${Math.floor(minutes / 60)} س ${minutes % 60} د`;
  const level = minutes >= 15 ? 'danger' : minutes >= 5 ? 'warning' : 'fresh';
  const hint = minutes >= 15
    ? 'تجاوز وقت الانتظار، يحتاج رد عاجل.'
    : minutes >= 5
      ? 'المحادثة تنتظر ردًا منذ عدة دقائق.'
      : 'محادثة جديدة تحتاج ردًا.';
  return { minutes, label, level, hint };
};

const slaClass = (level?: string, active = false) => {
  if (level === 'danger') return active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 border border-rose-100';
  if (level === 'warning') return active ? 'bg-amber-400 text-slate-950' : 'bg-amber-50 text-amber-700 border border-amber-100';
  return active ? 'bg-emerald-400 text-slate-950' : 'bg-emerald-50 text-emerald-700 border border-emerald-100';
};

const DEFAULT_QUICK_REPLIES: QuickReply[] = [
  { id: 'welcome-elegant', title: 'ترحيب راقٍ', text: 'حياك الله في Alturath 🤍\nأنا معك الآن، شنو أقدر أساعدك فيه؟' },
  { id: 'ask-order-number', title: 'طلب رقم الطلب', text: 'ممكن ترسل لنا رقم الطلب أو الفاتورة، أو رقم الهاتف المسجل بالطلب؟ وسأراجع لك التفاصيل مباشرة.' },
  { id: 'ask-tracking-number', title: 'طلب رقم التتبع', text: 'أرسل رقم التتبع أو رقم الطلب، وسأتحقق لك من حالة الطلب والتوصيل.' },
  { id: 'payment-check', title: 'فحص الدفع', text: 'أرسل رقم الطلب أو الفاتورة، وأتأكد لك من حالة الدفع وهل تم تسجيله بالنظام.' },
  { id: 'payment-confirmed', title: 'تم الدفع', text: 'تم التأكد من حالة الدفع بنجاح ✅\nسنكمل متابعة طلبك ونبلغك بأي تحديث.' },
  { id: 'need-more-details', title: 'تفاصيل أكثر', text: 'ممكن توضح لنا المشكلة أكثر؟ وإذا عندك صورة أو لقطة شاشة أرسلها لنا حتى نساعدك بدقة.' },
  { id: 'order-followup', title: 'متابعة الطلب', text: 'تم استلام ملاحظتك، وجاري متابعة الطلب مع الفريق المختص. سنرجع لك بالتحديث بأقرب وقت.' },
  { id: 'delivery-followup', title: 'متابعة التوصيل', text: 'جاري التحقق من حالة التوصيل الآن. إذا عندك موقع أو وقت مناسب للاستلام أرسله لنا فضلاً.' },
  { id: 'product-inquiry', title: 'استفسار منتج', text: 'حياك الله، اكتب لنا اسم المنتج أو أرسل صورته، ونراجع لك توفره والتفاصيل.' },
  { id: 'price-availability', title: 'السعر والتوفر', text: 'سأراجع لك السعر والتوفر الآن، وأرجع لك بالتفاصيل قبل تأكيد الطلب.' },
  { id: 'apology-delay', title: 'اعتذار عن التأخير', text: 'نعتذر منك على التأخير، وحقك علينا. بنراجع الموضوع فورًا ونرجع لك بحل واضح.' },
  { id: 'escalated', title: 'تحويل للمختص', text: 'تم تحويل طلبك للقسم المختص، وسيتم التواصل معك أو تحديثك بأقرب وقت ممكن.' },
  { id: 'thanks-closing', title: 'إغلاق راقٍ', text: 'سعدنا بخدمتك 🤍\nإذا احتجت أي شيء لاحقًا، اكتب لنا في أي وقت وسنكون معك مباشرة.' },
  { id: 'business-hours', title: 'خارج الدوام', text: 'وصلتنا رسالتك، وسيتم التعامل معها في أقرب وقت خلال ساعات العمل. شكرًا لتفهمك 🤍' },
];


const normalizeArabicSearch = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/[أإآا]/g, 'ا')
  .replace(/[ى]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ًٌٍَُِّْـ]/g, '')
  .trim();

const createQuickReplyId = () => `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loadSavedQuickReplies = (): QuickReply[] => {
  if (typeof window === 'undefined') return DEFAULT_QUICK_REPLIES;
  try {
    const raw = window.localStorage.getItem(QUICK_REPLIES_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.length) {
      return parsed
        .filter((q) => q && typeof q.title === 'string' && typeof q.text === 'string')
        .map((q) => ({ id: String(q.id || createQuickReplyId()), title: q.title, text: q.text }));
    }
  } catch {}
  return DEFAULT_QUICK_REPLIES;
};

const saveQuickReplies = (items: QuickReply[]) => {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(QUICK_REPLIES_STORAGE_KEY, JSON.stringify(items)); } catch {}
};



export default function WhatsAppSupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [managedQuickReplies, setManagedQuickReplies] = useState<QuickReply[]>(() => loadSavedQuickReplies());
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [quickReplyEditorOpen, setQuickReplyEditorOpen] = useState(false);
  const [editingQuickReplyId, setEditingQuickReplyId] = useState<string | null>(null);
  const [quickReplyForm, setQuickReplyForm] = useState({ title: '', text: '' });
  const [quickReplyFormError, setQuickReplyFormError] = useState('');
  const [replyText, setReplyText] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs_support' | 'human' | 'bot' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ type: 'info' | 'success' | 'error'; text: string } | null>(null);
  const [slaNowMs, setSlaNowMs] = useState(() => Date.now());
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
      setConversations(liveConversations);
      setError('');
    } catch (e: any) {
      setConversations([]);
      setError(e?.message || 'تعذر الاتصال بخدمة واتساب');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (phone: string, scrollToEnd = false) => {
    if (!phone) return;
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
    const timer = window.setInterval(() => setSlaNowMs(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    saveQuickReplies(managedQuickReplies);
  }, [managedQuickReplies]);

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
    needsReply: conversations.filter(c => Boolean(getConversationSlaInfo(c, slaNowMs))).length,
  }), [conversations, slaNowMs]);

  const selectedActionState = useMemo(() => getConversationActionState(selected), [selected]);
  const selectedSlaInfo = useMemo(() => getConversationSlaInfo(selected, slaNowMs), [selected, slaNowMs]);

  const availableQuickReplies = useMemo(() => {
    const merged = [...managedQuickReplies, ...quickReplies];
    const seen = new Set<string>();
    return merged.filter((q) => {
      const key = `${q.title}::${q.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [managedQuickReplies, quickReplies]);

  const filteredQuickReplies = useMemo(() => {
    const q = normalizeArabicSearch(quickReplySearch);
    if (!q) return availableQuickReplies;
    return availableQuickReplies.filter((item) => normalizeArabicSearch(`${item.title} ${item.text}`).includes(q));
  }, [availableQuickReplies, quickReplySearch]);

  const startNewQuickReply = () => {
    setEditingQuickReplyId(null);
    setQuickReplyForm({ title: '', text: '' });
    setQuickReplyFormError('');
    setQuickReplyEditorOpen(true);
  };

  const startEditQuickReply = (item: QuickReply) => {
    setEditingQuickReplyId(item.id);
    setQuickReplyForm({ title: item.title, text: item.text });
    setQuickReplyFormError('');
    setQuickReplyEditorOpen(true);
  };

  const saveQuickReplyFromForm = () => {
    const title = quickReplyForm.title.trim();
    const text = quickReplyForm.text.trim();
    if (!title && !text) {
      setQuickReplyFormError('اكتب اسم الرد ونص الرد أولًا.');
      showNotice('error', 'اكتب اسم الرد ونص الرد أولًا.');
      return;
    }
    if (!title) {
      setQuickReplyFormError('اكتب اسم زر الرد السريع أولًا.');
      showNotice('error', 'اكتب اسم زر الرد السريع أولًا.');
      return;
    }
    if (!text) {
      setQuickReplyFormError('اكتب نص الرد السريع أولًا.');
      showNotice('error', 'اكتب نص الرد السريع أولًا.');
      return;
    }
    setQuickReplyFormError('');
    if (editingQuickReplyId) {
      setManagedQuickReplies((prev) => {
        const exists = prev.some((item) => item.id === editingQuickReplyId);
        if (exists) return prev.map((item) => item.id === editingQuickReplyId ? { ...item, title, text } : item);
        return [{ id: editingQuickReplyId, title, text }, ...prev];
      });
      showNotice('success', 'تم تعديل الرد السريع.');
    } else {
      setManagedQuickReplies((prev) => [{ id: createQuickReplyId(), title, text }, ...prev]);
      showNotice('success', 'تم إضافة الرد السريع.');
    }
    setQuickReplyEditorOpen(false);
    setEditingQuickReplyId(null);
    setQuickReplyForm({ title: '', text: '' });
    setQuickReplyFormError('');
  };

  const deleteQuickReply = (item: QuickReply) => {
    const title = String(item.title || 'هذا الرد').trim();
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`هل تريد حذف الرد السريع: ${title}؟`);
    if (!confirmed) {
      showNotice('info', 'تم إلغاء حذف الرد السريع.');
      return;
    }
    setManagedQuickReplies((prev) => {
      const exists = prev.some((q) => q.id === item.id);
      if (exists) return prev.filter((q) => q.id !== item.id);
      return prev.filter((q) => `${q.title}::${q.text}` !== `${item.title}::${item.text}`);
    });
    showNotice('success', 'تم حذف الرد السريع.');
  };

  const applyQuickReply = (text: string) => {
    setReplyText(text);
    showNotice('info', 'تم وضع الرد السريع في مربع الرد، راجعه ثم اضغط إرسال.');
  };

  const sendReply = async (text = replyText) => {
    const body = text.trim();
    if (!selectedPhone || !body || sending) return;
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
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(selectedPhone))}/mode`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode })
    }).catch(() => {});
    await loadMessages(selectedPhone, false);
    await loadConversations(true);
    showNotice('success', mode === 'human' ? 'تم تحويل المحادثة للدعم اليدوي.' : 'تم إرجاع المحادثة للبوت.');
  };

  const closeConversation = async () => {
    if (!selectedPhone) return;
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
      <div className="grid grid-cols-1 xl:grid-cols-[340px_minmax(0,1fr)] gap-4 h-auto xl:h-[calc(100vh-170px)] min-h-0 xl:min-h-[760px] whatsapp-support-workspace">
        <section className="rounded-[2rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[320px] max-h-[440px] xl:min-h-[760px] xl:max-h-none">
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
            {loading ? <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length ? filtered.map((c) => {
              const actionState = getConversationActionState(c);
              const active = selectedPhone === (c.phone || c.id);
              const slaInfo = getConversationSlaInfo(c, slaNowMs);
              return (
              <button key={c.phone || c.id} onClick={() => setSelectedPhone(c.phone || c.id)} className={cn('w-full text-right rounded-2xl p-4 border transition group', selectedPhone === (c.phone || c.id) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-black truncate flex items-center gap-2"><UserRound size={16} /> {c.customerName || c.phone}</div>
                    <div className={cn('text-xs mt-1 truncate', selectedPhone === (c.phone || c.id) ? 'text-white/60' : 'text-slate-400')}>{c.phone}</div>
                  </div>
                  {!!Number(c.unreadCount || 0) && <span className="bg-rose-500 text-white text-[10px] rounded-full min-w-6 h-6 flex items-center justify-center font-black">{c.unreadCount}</span>}
                </div>
                <div className={cn('text-sm mt-3 line-clamp-2 leading-6', active ? 'text-white/80' : 'text-slate-600')}>{c.lastMessageText || 'لا توجد رسائل بعد'}</div>
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <span className={cn('px-2 py-1 rounded-full text-[10px] font-black', actionStateClass(actionState.tone, active))} title={actionState.hint}>{actionState.label}</span>
                  {slaInfo && <span className={cn('px-2 py-1 rounded-full text-[10px] font-black', slaClass(slaInfo.level, active))} title={slaInfo.hint}><Clock size={11} className="inline ml-1" /> {slaInfo.label}</span>}
                  {!!Number(c.unreadCount || 0) && <span className={cn('px-2 py-1 rounded-full text-[10px] font-black', active ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-700 border border-rose-100')}>غير مقروء</span>}
                </div>
                <div className="mt-3 flex items-center justify-between text-[10px]">
                  <span className={cn('px-2 py-1 rounded-full', c.mode === 'human' || c.status === 'needs_support' ? 'bg-amber-100 text-amber-700' : selectedPhone === (c.phone || c.id) ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700')}>{statusLabel(c)}</span>
                  <span className={selectedPhone === (c.phone || c.id) ? 'text-white/50' : 'text-slate-400'}>{formatTime(c.lastMessageAt)}</span>
                </div>
              </button>
              );
            }) : <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3"><MessageCircle size={42} /><div className="font-bold">لا توجد محادثات مطابقة</div></div>}
          </div>
        </section>

        <section className="rounded-[2rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[72vh] xl:min-h-[760px]">
          {selected ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-l from-white to-slate-50">
                <div>
                  <div className="text-xl font-black flex items-center gap-2"><MessageCircle className="text-emerald-600" /> {selected.customerName || 'عميل واتساب'}</div>
                  <div className="text-sm text-slate-500 mt-1 direction-ltr text-left">+{selected.phone}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black', actionStateClass(selectedActionState.tone))} title={selectedActionState.hint}>{selectedActionState.label}</span>
                    {selectedSlaInfo && <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black', slaClass(selectedSlaInfo.level))} title={selectedSlaInfo.hint}><Clock size={12} /> {selectedSlaInfo.label}</span>}
                    <span className="inline-flex rounded-full bg-slate-100 text-slate-500 px-3 py-1 text-xs font-black">{selected.mode === 'human' ? 'الوضع اليدوي' : 'وضع البوت'}</span>
                  </div>
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
                        <div className={cn('mt-3 flex flex-wrap items-center gap-2 text-[10px]', inbound ? 'text-slate-400' : 'text-white/60')}>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', inbound ? 'bg-slate-100 text-slate-500' : 'bg-white/10 text-white/70')}><Clock size={11} /> {formatTime(m.createdAt)}</span>
                          {inbound ? <span className="inline-flex rounded-full bg-sky-50 text-sky-700 px-2 py-1 font-black">رسالة عميل</span> : <span className="inline-flex rounded-full bg-white/10 px-2 py-1 font-black">{m.sentBy === 'bot' ? 'رد تلقائي' : 'رد موظف'}</span>}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-4 border-t border-slate-100 bg-white space-y-3">
                <div className="rounded-3xl border border-slate-100 bg-slate-50/70 p-3 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="flex items-center gap-2 font-black text-slate-800"><Zap size={16} className="text-amber-500" /> الردود السريعة</div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 rounded-2xl bg-white border border-slate-100 px-3 py-2 flex-1 md:w-72">
                        <Search size={16} className="text-slate-400" />
                        <input value={quickReplySearch} onChange={(e) => setQuickReplySearch(e.target.value)} placeholder="بحث ذكي: دفع، تتبع، اعتذار..." className="bg-transparent outline-none flex-1 text-xs" />
                      </div>
                      <button onClick={startNewQuickReply} className="shrink-0 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 text-xs font-black flex items-center gap-1"><Plus size={14} /> إضافة</button>
                    </div>
                  </div>

                  {quickReplyEditorOpen && (
                    <div className="rounded-3xl bg-white border border-slate-100 p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-2">
                        <input value={quickReplyForm.title} onChange={(e) => { setQuickReplyForm((prev) => ({ ...prev, title: e.target.value })); if (quickReplyFormError) setQuickReplyFormError(''); }} placeholder="اسم الزر" className={cn('rounded-2xl border bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm', quickReplyFormError && !quickReplyForm.title.trim() ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200')} />
                        <textarea value={quickReplyForm.text} onChange={(e) => { setQuickReplyForm((prev) => ({ ...prev, text: e.target.value })); if (quickReplyFormError) setQuickReplyFormError(''); }} placeholder="نص الرد السريع" className={cn('min-h-[74px] rounded-2xl border bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm leading-6', quickReplyFormError && !quickReplyForm.text.trim() ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200')} />
                      </div>
                      {quickReplyFormError && (
                        <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700 flex items-center gap-2">
                          <AlertCircle size={14} />
                          <span>{quickReplyFormError}</span>
                        </div>
                      )}
                      <div className="flex justify-end gap-2">
                        <button onClick={() => { setQuickReplyEditorOpen(false); setEditingQuickReplyId(null); setQuickReplyForm({ title: '', text: '' }); setQuickReplyFormError(''); }} className="rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 text-xs font-black flex items-center gap-1"><X size={14} /> إلغاء</button>
                        <button onClick={saveQuickReplyFromForm} className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-xs font-black flex items-center gap-1"><Save size={14} /> حفظ</button>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                    {filteredQuickReplies.length ? filteredQuickReplies.map((q) => (
                      <div key={`${q.id}-${q.title}`} className="shrink-0 flex items-center gap-1 rounded-2xl bg-white border border-slate-100 px-2 py-1.5 shadow-sm">
                        <button onClick={() => applyQuickReply(q.text)} className="px-2 py-1 text-xs font-bold text-slate-700 hover:text-emerald-700 max-w-[190px] truncate" title={q.text}>{q.title}</button>
                        <button onClick={() => startEditQuickReply(q)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400" title="تعديل"><Pencil size={13} /></button>
                        <button onClick={() => deleteQuickReply(q)} className="p-1 rounded-lg hover:bg-rose-50 text-rose-400" title="حذف"><Trash2 size={13} /></button>
                      </div>
                    )) : <div className="text-xs font-bold text-slate-400 px-2 py-2">لا توجد ردود مطابقة للبحث.</div>}
                  </div>
                </div>
                <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
                  <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendReply(); }} placeholder="اكتب ردك هنا... Ctrl/⌘ + Enter للإرسال" className="flex-1 min-h-[96px] max-h-56 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 text-sm leading-6" />
                  <button onClick={() => sendReply()} disabled={sending || !replyText.trim()} className="h-14 md:h-[96px] px-7 rounded-3xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black shadow-lg shadow-emerald-200 transition flex items-center justify-center gap-2"><Send size={18} /> إرسال</button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4"><MessageCircle size={56} /><div className="font-black text-xl">اختر محادثة للبدء</div></div>
          )}
        </section>

      </div>
    </div>
  );
}
