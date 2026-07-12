import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bot, CheckCircle2, ChevronRight, Clock, Headphones, Loader2, MessageCircle, MoreHorizontal, RefreshCw, Search, Send, Sparkles, UserRound, Zap, X } from 'lucide-react';
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

type QuickReply = {
  id: string;
  title: string;
  text: string;
  category?: string;
  hint?: string;
};

const cleanPhone = (phone?: string) => String(phone || '').replace(/\D/g, '');

const statusLabel = (conversation?: Conversation | null) => {
  if (!conversation) return '';
  if (conversation.status === 'closed') return 'مغلقة';
  if (conversation.status === 'needs_support') return 'تحتاج دعم';
  if (conversation.mode === 'human') return 'يدوي';
  return 'بوت';
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('ar-KW', {
    day: '2-digit',
    month: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(d)
    .replace(' ص', 'AM')
    .replace(' م', 'PM')
    .replace(':', '.');
};

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'demo-support',
    phone: '96550000001',
    customerName: 'عميل يحتاج دعم',
    mode: 'human',
    status: 'needs_support',
    priority: 'high',
    unreadCount: 2,
    lastMessageText: 'وصلني رابط الدفع لكن أبي أتأكد من تفاصيل الطلب قبل الدفع',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    tags: ['demo', 'support'],
  },
  {
    id: 'demo-track',
    phone: '96550000002',
    customerName: 'عميل يتتبع طلبه',
    mode: 'bot',
    status: 'open',
    unreadCount: 0,
    lastMessageText: 'تم إرسال رابط التتبع للعميل',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    tags: ['demo', 'tracking'],
  },
  {
    id: 'demo-products',
    phone: '96550000003',
    customerName: 'استفسار عن منتج',
    mode: 'bot',
    status: 'open',
    unreadCount: 1,
    lastMessageText: 'هل عندكم باقة ضيافة للديوانية؟',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    tags: ['demo', 'products'],
  },
  {
    id: 'demo-closed',
    phone: '96550000004',
    customerName: 'محادثة مغلقة',
    mode: 'bot',
    status: 'closed',
    unreadCount: 0,
    lastMessageText: 'تم إغلاق المحادثة بعد خدمة العميل',
    lastMessageAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    tags: ['demo', 'closed'],
  },
];

const DEMO_MESSAGES: Record<string, ChatMessage[]> = {
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

const QUICK_REPLIES: QuickReply[] = [
  { id: 'welcome', category: 'أساسي', title: 'الترحيب الحالي', hint: 'القائمة الرئيسية', text: 'مرحبًا بك في Alturath 👋\n\nكيف نقدر نخدمك؟\n\n1. طلب جديد\n2. تتبع طلب أو فاتورة\n3. الاستفسار عن المنتجات\n4. الدعم' },
  { id: 'not-understood', category: 'أساسي', title: 'لم أفهم', hint: 'قائمة واضحة', text: 'عذرًا، ما فهمت طلبك بشكل واضح.\n\nاختر من القائمة:\n1. طلب جديد\n2. تتبع طلب أو فاتورة\n3. الاستفسار عن المنتجات\n4. الدعم' },
  { id: 'new-order', category: 'طلبات', title: 'طلب جديد', hint: 'رابط الموقع', text: 'لطلب جديد تفضل من هنا:\nhttps://alturathkw.shop\n\nوإذا احتجت مساعدة أثناء الطلب، اكتب لنا هنا.' },
  { id: 'track-request', category: 'تتبع', title: 'طلب رقم التتبع', hint: 'رقم الطلب/الفاتورة أو الهاتف', text: 'أرسل رقم الطلب أو الفاتورة، أو رقم الهاتف المكوّن من 8 أرقام، وسأراجع لك الحالة مباشرة.' },
  { id: 'track-link', category: 'تتبع', title: 'رابط التتبع', hint: 'للعميل', text: 'تقدر تتابع حالة طلبك من الرابط التالي:\nhttps://alturathkw.shop/track\n\nأدخل رقم الطلب أو الفاتورة للاطلاع على التفاصيل.' },
  { id: 'payment-received', category: 'دفع', title: 'وصل الدفع', hint: 'تأكيد دفع', text: 'تم استلام الدفع بنجاح ✅\n\nطلبك الآن قيد التجهيز، وسنبلغك بأي تحديث.' },
  { id: 'payment-review', category: 'دفع', title: 'الدفع قيد المراجعة', hint: 'مراجعة', text: 'وصلتنا بيانات الدفع، وجاري التأكد منها الآن.\nسنبلغك فور تأكيدها بإذن الله.' },
  { id: 'payment-not-received', category: 'دفع', title: 'لم يصل الدفع', hint: 'بلطف', text: 'حتى الآن لم يظهر لدينا تأكيد الدفع.\nإذا أتممت الدفع، أرسل لنا رقم الطلب أو صورة الإيصال للمراجعة.' },
  { id: 'preparing', category: 'حالة الطلب', title: 'قيد التجهيز', hint: 'بعد التأكيد', text: 'طلبك قيد التجهيز الآن 🤍\nسنحرص أن يوصلك بأفضل صورة.' },
  { id: 'on-way', category: 'حالة الطلب', title: 'الطلب بالطريق', hint: 'توصيل', text: 'طلبك بالطريق الآن 🚚\nيرجى إبقاء الهاتف قريبًا لتنسيق التوصيل.' },
  { id: 'delivered', category: 'حالة الطلب', title: 'تم التسليم', hint: 'إغلاق لطيف', text: 'تم تسليم الطلب، ونتمنى أنه نال رضاك 🤍\nسعدنا بخدمتك في Alturath.' },
  { id: 'delay', category: 'حالة الطلب', title: 'تأخير بسيط', hint: 'اعتذار', text: 'نعتذر منك، يوجد تأخير بسيط خارج عن الإرادة.\nطلبك محل متابعة، وسنحدثك فورًا بأي جديد.' },
  { id: 'address', category: 'توصيل', title: 'تأكيد العنوان', hint: 'قبل التوصيل', text: 'للتأكد من التوصيل بدقة، يرجى تأكيد العنوان:\nالمنطقة:\nالقطعة:\nالشارع:\nالمنزل:' },
  { id: 'location', category: 'توصيل', title: 'طلب اللوكيشن', hint: 'عند الحاجة', text: 'لو تكرمت، أرسل اللوكيشن الحالي حتى يتم التوصيل بدقة أكثر.' },
  { id: 'products', category: 'منتجات', title: 'اسأل عن المنتج', hint: 'بحث فقط', text: 'اكتب اسم المنتج أو نوع الطلب الذي تبحث عنه، وسأبحث لك في المنتجات المتاحة.' },
  { id: 'product-available', category: 'منتجات', title: 'متوفر', hint: 'عدّل الاسم', text: 'نعم، المنتج متوفر حاليًا ✅\n\nيمكنك طلبه من الموقع:\nhttps://alturathkw.shop' },
  { id: 'product-unavailable', category: 'منتجات', title: 'غير متوفر', hint: 'لطيف', text: 'حاليًا المنتج غير ظاهر ضمن المتاح لدينا.\nيمكنك اختيار منتج آخر من الموقع أو كتابة طلبك وسنساعدك.' },
  { id: 'human', category: 'دعم', title: 'استلام المحادثة', hint: 'رد يدوي', text: 'يسعدنا خدمتك 🤍\nأنا معك الآن، اكتب التفاصيل وسأتابعها معك خطوة بخطوة.' },
  { id: 'moment', category: 'دعم', title: 'نحتاج دقيقة', hint: 'مراجعة', text: 'أمهلنا لحظات بسيطة نراجع التفاصيل، ونرجع لك بأوضح إجابة.' },
  { id: 'escalated', category: 'دعم', title: 'تصعيد داخلي', hint: 'بدون إرباك', text: 'تمت متابعة طلبك مع الفريق المختص، وسنرجع لك بأقرب تحديث ممكن.' },
  { id: 'apology', category: 'دعم', title: 'اعتذار راقٍ', hint: 'للمشاكل', text: 'نعتذر منك على هذا الإزعاج، وحقك علينا نراجع الموضوع بعناية ونخدمك بالشكل الذي يرضيك.' },
  { id: 'close', category: 'إغلاق', title: 'إغلاق راقٍ', hint: 'نهاية', text: 'سعدنا بخدمتك 🤍\nإذا احتجت أي شيء لاحقًا، اكتب "القائمة" وسنكون معك مباشرة.' },
];

const isDemoConversation = (conversation?: Conversation | null) => Boolean(conversation?.tags?.includes('demo') || conversation?.id?.startsWith('demo-'));
const isDemoPhone = (phone?: string) => Boolean(DEMO_MESSAGES[cleanPhone(phone)]);

export default function WhatsAppSupportInbox() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'needs_support' | 'human' | 'bot' | 'unread'>('all');
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showQuickPanel, setShowQuickPanel] = useState(false);
  const [quickCategory, setQuickCategory] = useState('الكل');
  const [quickQuery, setQuickQuery] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const messagesRef = useRef<HTMLDivElement | null>(null);

  const scrollMessagesToBottom = () => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const loadConversations = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await fetch('/api/whatsapp/conversations?limit=80', { cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error('demo');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'failed');
      const next = Array.isArray(json.conversations) && json.conversations.length ? json.conversations : DEMO_CONVERSATIONS;
      setConversations(next);
      setSelectedPhone((current) => current || next[0]?.phone || '');
    } catch {
      setConversations(DEMO_CONVERSATIONS);
      setSelectedPhone((current) => current || DEMO_CONVERSATIONS[0].phone);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (phone: string) => {
    const clean = cleanPhone(phone);
    if (!clean) return;
    if (isDemoPhone(clean)) {
      setSelected(DEMO_CONVERSATIONS.find((c) => c.phone === clean) || null);
      setMessages(DEMO_MESSAGES[clean] || []);
      setQuickReplies(QUICK_REPLIES);
      return;
    }
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(clean)}/messages`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'failed');
      setSelected(json.conversation || null);
      setMessages(json.messages || []);
      setQuickReplies(Array.isArray(json.quickReplies) ? json.quickReplies : []);
      fetch(`/api/whatsapp/conversations/${encodeURIComponent(clean)}/read`, { method: 'POST' }).catch(() => {});
    } catch {
      setMessages([]);
    }
  };


  useEffect(() => {
    // WhatsApp Support is a full-screen workbench. Lock the parent page scroll
    // so no click, polling refresh, drawer open, or wheel/touch gesture can push
    // the whole admin page back to the top. Internal panels keep their own scroll.
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const body = document.body;
    const html = document.documentElement;
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    body.style.overscrollBehavior = 'none';
    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';

    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      body.style.overscrollBehavior = previous.bodyOverscroll;
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscroll;
      window.scrollTo(0, scrollY);
    };
  }, []);

  useEffect(() => {
    loadConversations();
    const timer = window.setInterval(() => loadConversations(true), 12000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    loadMessages(selectedPhone);
    const timer = window.setInterval(() => loadMessages(selectedPhone), 12000);
    return () => window.clearInterval(timer);
  }, [selectedPhone]);

  useLayoutEffect(() => {
    scrollMessagesToBottom();
  }, [selectedPhone, messages.length]);

  const replyCatalog = useMemo(() => {
    const map = new Map<string, QuickReply>();
    [...QUICK_REPLIES, ...quickReplies].forEach((reply) => {
      if (!reply?.id) return;
      map.set(reply.id, { ...reply, category: reply.category || 'عام' });
    });
    return Array.from(map.values());
  }, [quickReplies]);

  const quickCategories = useMemo(() => ['الكل', ...Array.from(new Set(replyCatalog.map((reply) => reply.category || 'عام')))], [replyCatalog]);

  const visibleQuickReplies = useMemo(() => {
    const q = quickQuery.trim().toLowerCase();
    return replyCatalog.filter((reply) => {
      const byCategory = quickCategory === 'الكل' || (reply.category || 'عام') === quickCategory;
      const bySearch = !q || [reply.title, reply.hint, reply.text, reply.category].filter(Boolean).join(' ').toLowerCase().includes(q);
      return byCategory && bySearch;
    });
  }, [quickCategory, quickQuery, replyCatalog]);

  const pinnedReplies = useMemo(() => {
    const ids = ['payment-received', 'on-way', 'track-request', 'human', 'delay', 'close'];
    return ids.map((id) => replyCatalog.find((reply) => reply.id === id)).filter(Boolean) as QuickReply[];
  }, [replyCatalog]);

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase();
    return conversations.filter((conversation) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'unread'
          ? Number(conversation.unreadCount || 0) > 0
          : conversation.status === filter || conversation.mode === filter);
      const matchesQuery = !q || [conversation.phone, conversation.customerName, conversation.lastMessageText, conversation.lastInboundText]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [conversations, filter, query]);

  const counts = useMemo(() => ({
    all: conversations.length,
    support: conversations.filter((conversation) => conversation.status === 'needs_support' || conversation.mode === 'human').length,
    unread: conversations.reduce((total, conversation) => total + (Number(conversation.unreadCount || 0) > 0 ? 1 : 0), 0),
  }), [conversations]);

  const selectConversation = (phone: string) => {
    setSelectedPhone(phone);
    setMobileView('chat');
  };

  const applyQuickReply = (text: string, close = true) => {
    setReplyText(text);
    if (close) setShowQuickPanel(false);
  };

  const sendReply = async () => {
    const text = replyText.trim();
    const phone = cleanPhone(selectedPhone);
    if (!text || !phone || sending) return;
    if (isDemoPhone(phone)) {
      setMessages((prev) => [...prev, { id: `demo-local-${Date.now()}`, direction: 'outbound', sentBy: 'admin', text, createdAt: new Date().toISOString() }]);
      setReplyText('');
      return;
    }
    setSending(true);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sentBy: 'admin' }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'send failed');
      setReplyText('');
      await loadMessages(phone);
      await loadConversations(true);
    } catch {
      // لا نعرض أخطاء تقنية للموظف داخل الشاشة حتى لا تتحول الواجهة إلى تلوث بصري.
    } finally {
      setSending(false);
    }
  };

  const setMode = async (mode: 'bot' | 'human') => {
    const phone = cleanPhone(selectedPhone);
    if (!phone) return;
    if (isDemoPhone(phone)) {
      setSelected((prev) => prev ? { ...prev, mode, status: mode === 'human' ? 'needs_support' : 'open' } : prev);
      setConversations((prev) => prev.map((conversation) => conversation.phone === phone ? { ...conversation, mode, status: mode === 'human' ? 'needs_support' : 'open' } : conversation));
      return;
    }
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    }).catch(() => {});
    await loadMessages(phone);
    await loadConversations(true);
  };

  const closeConversation = async () => {
    const phone = cleanPhone(selectedPhone);
    if (!phone) return;
    if (isDemoPhone(phone)) {
      setSelected((prev) => prev ? { ...prev, status: 'closed', unreadCount: 0 } : prev);
      setConversations((prev) => prev.map((conversation) => conversation.phone === phone ? { ...conversation, status: 'closed', unreadCount: 0 } : conversation));
      return;
    }
    await fetch(`/api/whatsapp/conversations/${encodeURIComponent(phone)}/close`, { method: 'POST' }).catch(() => {});
    await loadMessages(phone);
    await loadConversations(true);
  };

  const selectedIsDemo = isDemoConversation(selected);

  return (
    <div dir="rtl" className="fixed inset-x-3 top-20 bottom-3 z-[60] overflow-hidden overscroll-none rounded-[28px] border border-slate-200 bg-white shadow-2xl text-slate-950 whatsapp-support-inbox">
      <div className="grid h-full min-h-0 grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)] bg-white">
        <aside className={cn('h-full min-h-0 overflow-hidden border-l border-slate-100 bg-slate-50 flex-col', mobileView === 'chat' ? 'hidden lg:flex' : 'flex')}>
          <div className="shrink-0 bg-white border-b border-slate-100 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-xl font-black"><MessageCircle className="text-emerald-600" /> دعم واتساب</div>
                <div className="mt-1 text-xs text-slate-400">Inbox نظيف للمحادثات والردود السريعة.</div>
              </div>
              <button type="button" onClick={() => loadConversations()} className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center">
                <RefreshCw size={18} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white border border-slate-100 p-3"><div className="text-[10px] text-slate-400">الكل</div><div className="text-xl font-black">{counts.all}</div></div>
              <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3"><div className="text-[10px] text-amber-600">دعم</div><div className="text-xl font-black text-amber-700">{counts.support}</div></div>
              <div className="rounded-2xl bg-rose-50 border border-rose-100 p-3"><div className="text-[10px] text-rose-600">جديد</div><div className="text-xl font-black text-rose-700">{counts.unread}</div></div>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <Search size={17} className="text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="بحث بالرقم أو الاسم أو الرسالة" className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
              {query && <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700"><X size={15} /></button>}
            </div>

            <div className="mt-3 grid grid-cols-5 gap-1 text-[11px] font-black">
              {([
                ['all', 'الكل'],
                ['needs_support', 'دعم'],
                ['human', 'يدوي'],
                ['bot', 'بوت'],
                ['unread', 'جديد'],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setFilter(id)} className={cn('rounded-xl px-2 py-2 transition', filter === id ? 'bg-slate-950 text-white' : 'bg-white text-slate-500 hover:bg-slate-100')}>{label}</button>
              ))}
            </div>

            {conversations.some(isDemoConversation) && (
              <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-100 px-3 py-2 text-xs font-bold text-amber-800 leading-6">
                وضع العرض التجريبي مفعّل. هذه بيانات للمعاينة فقط.
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 space-y-2" onWheel={(e) => e.stopPropagation()}>
            {loading ? (
              <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div>
            ) : filteredConversations.length ? filteredConversations.map((conversation) => {
              const active = cleanPhone(selectedPhone) === cleanPhone(conversation.phone);
              return (
                <button key={conversation.phone || conversation.id} type="button" onClick={() => selectConversation(conversation.phone || conversation.id)} className={cn('w-full text-right rounded-3xl border p-3 shadow-sm transition', active ? 'bg-slate-950 text-white border-slate-950' : 'bg-white border-slate-100 hover:bg-slate-50')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-black flex items-center gap-2"><UserRound size={15} /> {conversation.customerName || conversation.phone}</div>
                      <div className={cn('mt-1 text-xs ltr text-left', active ? 'text-white/50' : 'text-slate-400')}>+{conversation.phone}</div>
                    </div>
                    {!!Number(conversation.unreadCount || 0) && <span className="min-w-6 h-6 rounded-full bg-rose-500 px-2 text-[10px] font-black text-white flex items-center justify-center">{conversation.unreadCount}</span>}
                  </div>
                  <div className={cn('mt-3 line-clamp-2 text-sm leading-6', active ? 'text-white/80' : 'text-slate-600')}>{conversation.lastMessageText || 'لا توجد رسائل بعد'}</div>
                  <div className="mt-3 flex items-center justify-between text-[10px]">
                    <span className={cn('rounded-full px-2 py-1 font-black', conversation.mode === 'human' || conversation.status === 'needs_support' ? 'bg-amber-100 text-amber-700' : active ? 'bg-white/10 text-white' : 'bg-emerald-50 text-emerald-700')}>{statusLabel(conversation)}</span>
                    <span className={active ? 'text-white/50' : 'text-slate-400'}>{formatTime(conversation.lastMessageAt)}</span>
                  </div>
                </button>
              );
            }) : (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400"><MessageCircle size={42} /><div className="font-bold">لا توجد محادثات مطابقة</div></div>
            )}
          </div>
        </aside>

        <main className={cn('h-full min-h-0 overflow-hidden bg-white flex-col', mobileView === 'list' ? 'hidden lg:flex' : 'flex')}>
          {selected ? (
            <>
              <header className="shrink-0 border-b border-slate-100 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setMobileView('list')} className="lg:hidden rounded-2xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600"><ChevronRight size={14} className="inline" /> المحادثات</button>
                      <div className="min-w-0">
                        <div className="truncate text-xl font-black flex items-center gap-2"><MessageCircle className="text-emerald-600" /> {selected.customerName || 'عميل واتساب'}</div>
                        <div className="mt-1 ltr text-left text-xs text-slate-400">+{selected.phone}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn('rounded-full px-3 py-1 text-xs font-black', selected.mode === 'human' || selected.status === 'needs_support' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-700')}>{statusLabel(selected)}</span>
                      {selectedIsDemo && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">عرض فقط</span>}
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" onClick={() => setShowQuickPanel(true)} className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100"><Zap size={15} className="inline ml-1" /> الردود السريعة</button>
                    <button type="button" onClick={() => setMode('human')} className={cn('rounded-2xl border px-3 py-2 text-xs font-black transition', selected.mode === 'human' ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-amber-50')}><Headphones size={15} className="inline ml-1" /> استلام</button>
                    <button type="button" onClick={() => setMode('bot')} className={cn('rounded-2xl border px-3 py-2 text-xs font-black transition', selected.mode !== 'human' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-emerald-50')}><Bot size={15} className="inline ml-1" /> بوت</button>
                    <button type="button" onClick={closeConversation} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50"><CheckCircle2 size={15} className="inline ml-1" /> إغلاق</button>
                  </div>
                </div>
              </header>

              <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[linear-gradient(180deg,#f8fafc,#ffffff)] p-4 md:p-6 space-y-3" onWheel={(e) => e.stopPropagation()}>
                {messages.map((message) => {
                  const inbound = message.direction === 'inbound';
                  return (
                    <div key={message.id} className={cn('flex', inbound ? 'justify-start' : 'justify-end')}>
                      <div className={cn('max-w-[88%] md:max-w-[72%] rounded-[1.35rem] border px-4 py-3 shadow-sm', inbound ? 'rounded-tl-md bg-white text-slate-800 border-slate-100' : 'rounded-tr-md bg-slate-950 text-white border-slate-950')}>
                        <div className="whitespace-pre-wrap text-sm md:text-[15px] leading-7">{message.text}</div>
                        <div className={cn('mt-2 flex items-center gap-1 text-[10px]', inbound ? 'text-slate-400' : 'text-white/50')}><Clock size={11} /> {formatTime(message.createdAt)} {message.sentBy && !inbound ? `• ${message.sentBy === 'bot' ? 'بوت' : 'أدمن'}` : ''}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <footer className="shrink-0 border-t border-slate-100 bg-white p-3 md:p-4">
                <div className="mb-3 rounded-3xl border border-slate-100 bg-slate-50 p-2">
                  <div className="flex items-center justify-between gap-2 px-1 pb-2">
                    <div className="flex items-center gap-1 text-xs font-black text-slate-700"><Zap size={14} className="text-amber-500" /> ردود مثبتة</div>
                    <button type="button" onClick={() => setShowQuickPanel(true)} className="rounded-2xl bg-slate-950 px-3 py-2 text-[11px] font-black text-white shadow-sm">فتح مكتبة الردود ({replyCatalog.length})</button>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto overscroll-x-contain pb-1" onWheel={(e) => e.stopPropagation()}>
                    {pinnedReplies.map((reply) => (
                      <button key={reply.id} type="button" onClick={() => applyQuickReply(reply.text, false)} className="shrink-0 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition">
                        {reply.title}
                      </button>
                    ))}
                    <button type="button" onClick={() => setShowQuickPanel(true)} className="shrink-0 rounded-2xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-500 hover:text-slate-900">المزيد...</button>
                  </div>
                </div>

                <div className="flex items-end gap-3">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendReply();
                    }}
                    placeholder="اكتب الرد هنا... Ctrl/⌘ + Enter للإرسال"
                    className="min-h-[56px] max-h-32 flex-1 resize-none rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <button type="button" onClick={sendReply} disabled={sending || !replyText.trim()} className="h-[56px] rounded-3xl bg-emerald-600 px-5 md:px-7 font-black text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-700 disabled:opacity-40 flex items-center gap-2">
                    {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span className="hidden sm:inline">إرسال</span>
                  </button>
                </div>
              </footer>

              {showQuickPanel && (
                <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-slate-950/35 p-3 backdrop-blur-sm md:items-center md:p-6" onClick={() => setShowQuickPanel(false)}>
                  <div dir="rtl" className="flex max-h-[84dvh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                    <div className="shrink-0 border-b border-slate-100 p-4 md:p-5 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-xl font-black"><Zap className="text-amber-500" /> مكتبة الردود السريعة</div>
                        <div className="mt-1 text-xs text-slate-400">اختر الرد، سينزل في خانة الكتابة لتعديله قبل الإرسال.</div>
                      </div>
                      <button type="button" onClick={() => setShowQuickPanel(false)} className="h-10 w-10 rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 flex items-center justify-center"><X size={18} /></button>
                    </div>
                    <div className="shrink-0 border-b border-slate-100 bg-slate-50 p-4 space-y-3">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                        <Search size={16} className="text-slate-400" />
                        <input value={quickQuery} onChange={(e) => setQuickQuery(e.target.value)} placeholder="ابحث: دفع، تتبع، توصيل، اعتذار..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                        {quickQuery && <button type="button" onClick={() => setQuickQuery('')} className="text-slate-400 hover:text-slate-700"><X size={14} /></button>}
                      </div>
                      <div className="flex gap-2 overflow-x-auto overscroll-x-contain pb-1" onWheel={(e) => e.stopPropagation()}>
                        {quickCategories.map((category) => (
                          <button key={category} type="button" onClick={() => setQuickCategory(category)} className={cn('shrink-0 rounded-2xl border px-3 py-2 text-xs font-black transition', quickCategory === category ? 'bg-slate-950 text-white border-slate-950' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100')}>{category}</button>
                        ))}
                      </div>
                    </div>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white p-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" onWheel={(e) => e.stopPropagation()}>
                      {visibleQuickReplies.map((reply) => (
                        <button key={reply.id} type="button" onClick={() => applyQuickReply(reply.text)} className="rounded-3xl border border-slate-100 bg-slate-50 px-4 py-4 text-right transition hover:border-emerald-200 hover:bg-emerald-50 group">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-900 group-hover:text-emerald-700">{reply.title}</div>
                              {reply.hint && <div className="mt-1 line-clamp-1 text-[11px] leading-5 text-slate-400">{reply.hint}</div>}
                            </div>
                            <span className="shrink-0 rounded-full border border-slate-100 bg-white px-2 py-1 text-[10px] font-bold text-slate-500">{reply.category || 'عام'}</span>
                          </div>
                          <div className="mt-3 line-clamp-3 whitespace-pre-wrap text-xs leading-6 text-slate-500">{reply.text}</div>
                        </button>
                      ))}
                      {!visibleQuickReplies.length && <div className="col-span-full py-12 text-center text-sm text-slate-400">لا توجد ردود مطابقة</div>}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <MessageCircle size={52} />
              <div className="text-xl font-black">اختر محادثة للبدء</div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
