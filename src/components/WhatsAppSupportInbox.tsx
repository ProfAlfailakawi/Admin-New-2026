import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Bot, CheckCircle2, Clock, Headphones, Loader2, MessageCircle, Pencil, Plus, RefreshCw, Save, Search, Send, Sparkles, Trash2, UserRound, X, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import type { AppState, Customer, Product } from '../types';
import { isPaidStatus } from '../lib/status-utils';

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
type AutoReplyRule = {
  id: string;
  title: string;
  enabled?: boolean;
  priority?: number;
  keywords: string[];
  matchMode: 'any' | 'all' | 'exact';
  action: 'reply' | 'products' | 'human';
  response: string;
};
type SmartReply = { id: string; title: string; meta: string; text: string; tone: 'vip' | 'retention' | 'loyalty' | 'support'; score?: number };
type WhatsAppSupportInboxProps = { data?: Partial<AppState> | null };

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

type CustomerTemperature = {
  label: 'بارد' | 'مستعجل' | 'غاضب' | 'VIP';
  className: string;
  hint: string;
};

const getCustomerTemperature = (c?: Conversation | null): CustomerTemperature => {
  if (!c) return { label: 'بارد', className: 'bg-slate-100 text-slate-500 border border-slate-100', hint: 'لا توجد حرارة واضحة.' };
  const text = normalizeArabicSearch([c.lastMessageText, c.lastInboundText, c.priority, ...(Array.isArray(c.tags) ? c.tags : [])].filter(Boolean).join(' '));
  const hasAny = (words: string[]) => words.some((word) => text.includes(normalizeArabicSearch(word)));
  const unread = Number(c.unreadCount || 0);
  const needsHuman = c.status === 'needs_support' || c.mode === 'human';
  const vip = hasAny(['vip', 'مميز', 'ذهبي', 'كبار', 'دايم', 'دائم']) || String(c.priority || '').toLowerCase().includes('vip');
  const angry = hasAny(['زعل', 'غضب', 'غاضب', 'شكوى', 'سيء', 'حرام', 'تأخير', 'ما يصير', 'غلط', 'تعبت']);
  const urgent = needsHuman || unread > 0 || hasAny(['عاجل', 'ضروري', 'الحين', 'وين', 'توصيل', 'دفع', 'فاتورة']);
  if (angry) return { label: 'غاضب', className: 'bg-rose-50 text-rose-700 border border-rose-100', hint: 'في الرسالة نبرة غضب أو شكوى؛ يحتاج رد هادئ وسريع.' };
  if (vip) return { label: 'VIP', className: 'bg-amber-50 text-amber-700 border border-amber-100', hint: 'عميل مهم أو له إشارة VIP؛ يستاهل متابعة راقية.' };
  if (urgent) return { label: 'مستعجل', className: 'bg-orange-50 text-orange-700 border border-orange-100', hint: 'محادثة فيها استعجال أو تحتاج تدخل.' };
  return { label: 'بارد', className: 'bg-slate-100 text-slate-500 border border-slate-100', hint: 'محادثة هادئة ولا تحتاج تصعيد الآن.' };
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
    if (tone === 'danger') return 'bg-rose-500 text-slate-800';
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

type UrgentReplyKind = 'anger' | 'payment' | 'delivery' | 'waiting';

const urgentReplyInfo: Record<UrgentReplyKind, { label: string; className: string; reply: string; weight: number }> = {
  anger: {
    label: 'غضب',
    className: 'bg-rose-50 text-rose-700 border-rose-100',
    weight: 400,
    reply: 'حقك علينا، أنا استلمت الموضوع الآن وبراجع التفاصيل فورًا. عطيني دقيقة وأرجع لك بحل واضح.',
  },
  payment: {
    label: 'دفع',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    weight: 300,
    reply: 'حياك الله، أراجع حالة الدفع والفاتورة الآن. إذا الدفع تم، بنثبتها لك مباشرة ونحدث الطلب.',
  },
  delivery: {
    label: 'توصيل',
    className: 'bg-sky-50 text-sky-700 border-sky-100',
    weight: 200,
    reply: 'أبشر، أتابع حالة التوصيل الآن وأرجع لك بالتحديث الصحيح بأسرع وقت.',
  },
  waiting: {
    label: 'انتظار',
    className: 'bg-amber-50 text-amber-700 border-amber-100',
    weight: 100,
    reply: 'حياك الله، أنا معك الآن. شفت رسالتك وبراجعها لك فورًا.',
  },
};

const classifyUrgentReply = (c: Conversation, nowMs: number) => {
  const text = normalizeArabicSearch([c.lastMessageText, c.lastInboundText, c.priority, ...(Array.isArray(c.tags) ? c.tags : [])].filter(Boolean).join(' '));
  const hasAny = (words: string[]) => words.some((word) => text.includes(normalizeArabicSearch(word)));
  const sla = getConversationSlaInfo(c, nowMs);
  const unread = Number(c.unreadCount || 0);
  const inboundLast = c.lastMessageDirection === 'inbound';
  let kind: UrgentReplyKind | null = null;
  if (hasAny(['زعل', 'غضب', 'غاضب', 'مشكلة', 'شكوى', 'تأخير', 'حرام', 'سيء', 'غلط', 'ما يصير', 'تعبت'])) kind = 'anger';
  else if (hasAny(['دفع', 'فاتورة', 'مدفوع', 'كي نت', 'كي نت', 'knet', 'payment', 'paid', 'رابط'])) kind = 'payment';
  else if (hasAny(['توصيل', 'وصل', 'مندوب', 'عنوان', 'delivery', 'driver', 'تأخر الطلب'])) kind = 'delivery';
  else if (sla || unread > 0 || inboundLast) kind = 'waiting';
  if (!kind) return null;
  const lastAt = c.lastMessageAt ? new Date(c.lastMessageAt).getTime() : NaN;
  const waitingMinutes = Number.isFinite(lastAt) ? Math.max(0, Math.floor((nowMs - lastAt) / 60000)) : 0;
  return {
    conversation: c,
    kind,
    waitingMinutes,
    score: urgentReplyInfo[kind].weight + waitingMinutes + unread * 12 + (inboundLast ? 20 : 0),
  };
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


const pickBySeedLocal = (templates: string[], seed?: string) => {
  if (!templates.length) return '';
  const base = String(seed || '0').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return templates[base % templates.length];
};

const getFriendlyCustomerName = (name?: string) => {
  const clean = String(name || '').trim().replace(/\s+/g, ' ');
  if (!clean) return 'عميلنا العزيز';
  const parts = clean.split(' ');
  if (['بو', 'أبو', 'ابو', 'أم', 'ام'].includes(parts[0]) && parts[1]) return `${parts[0]} ${parts[1]}`;
  return parts[0] || 'عميلنا العزيز';
};

const phoneLooksSame = (a?: string, b?: string) => {
  const x = cleanPhone(a);
  const y = cleanPhone(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const xs = x.slice(-8);
  const ys = y.slice(-8);
  return xs.length >= 7 && xs === ys;
};

const invoiceBelongsToCustomer = (inv: any, customer?: Customer | null, phone?: string) => {
  if (!inv || inv.isDeleted) return false;
  if (customer?.id && String(inv.customerId || '') === String(customer.id)) return true;
  if (customer?.name && String(inv.customerName || '').trim() && String(inv.customerName || '').trim() === String(customer.name || '').trim()) return true;
  return phoneLooksSame(inv.customerPhone || inv.phone || inv.mobile || inv.whatsapp, phone || customer?.phone);
};

const orderBelongsToCustomer = (order: any, customer?: Customer | null, phone?: string) => {
  if (!order) return false;
  if (customer?.id && String(order.customerId || '') === String(customer.id)) return true;
  if (customer?.name && String(order.customerName || '').trim() && String(order.customerName || '').trim() === String(customer.name || '').trim()) return true;
  return phoneLooksSame(order.customerPhone || order.phone || order.mobile || order.whatsapp, phone || customer?.phone);
};

type CustomerInsight = {
  customer?: Customer | null;
  classification: string;
  actionLabel: string;
  smartAdvice: string;
  whatsappMessage: string;
  activePoints: number;
  ordersCount: number;
  totalSpent: number;
  daysSinceLastOrder: number;
  lastOrderDate?: Date | null;
  preemptiveMatch?: { productName?: string; dayOfWeekStr?: string; isTomorrow?: boolean } | null;
  riskLevel: 'preemptive' | 'critical' | 'warning' | 'safe';
};

const buildCustomerInsight = (data: Partial<AppState> | null | undefined, conversation?: Conversation | null): CustomerInsight | null => {
  if (!conversation || !data) return null;
  const phone = cleanPhone(conversation.phone || conversation.id);
  const customers = Array.isArray(data.customers) ? data.customers : [];
  const invoices = Array.isArray(data.invoices) ? data.invoices : [];
  const orders = Array.isArray(data.orders) ? data.orders : [];
  const products = Array.isArray(data.products) ? data.products : [];
  const normalizedName = normalizeArabicSearch(conversation.customerName || '');

  const customer = customers.find((c) => phoneLooksSame(c.phone, phone))
    || customers.find((c) => normalizedName && normalizeArabicSearch(c.name || '') === normalizedName)
    || null;

  if (!customer) return null;

  const customerInvoices = invoices.filter((inv: any) => invoiceBelongsToCustomer(inv, customer, phone));
  const customerOrders = orders.filter((order: any) => orderBelongsToCustomer(order, customer, phone));
  const paidInvoices = customerInvoices.filter((inv: any) => isPaidStatus(inv.paymentStatus) || isPaidStatus(inv.status) || inv.paymentStatus === undefined);
  const effectiveInvoices = paidInvoices.length ? paidInvoices : customerInvoices;

  const invoiceTotal = effectiveInvoices.reduce((acc: number, inv: any) => acc + Number(inv.totalAmount || 0), 0);
  const ordersCount = Math.max(Number(customer.totalOrders || 0), effectiveInvoices.length, customerOrders.length);
  const totalSpent = Math.max(Number(customer.totalSpent || 0), invoiceTotal);
  const totalDiscountReceived = effectiveInvoices.reduce((acc: number, inv: any) => acc + Number(inv.discount || 0), 0);

  const dates = [
    ...effectiveInvoices.map((inv: any) => inv.date).filter(Boolean),
    ...customerOrders.map((order: any) => order.date || order.createdAt).filter(Boolean),
    customer.lastOrderDate,
    customer.lastActive,
  ].filter(Boolean).map((value) => new Date(String(value))).filter((date) => !Number.isNaN(date.getTime()));
  const lastOrderDate = dates.length ? dates.sort((a, b) => b.getTime() - a.getTime())[0] : null;
  const daysSinceLastOrder = lastOrderDate ? Math.floor((Date.now() - lastOrderDate.getTime()) / 86400000) : 999;

  const isCouponHunter = totalDiscountReceived > (totalSpent * 0.15) && ordersCount > 2;
  const isLoyalWithoutDiscounts = totalDiscountReceived === 0 && ordersCount >= 3;
  let classification = 'عميل عابر';
  if (ordersCount >= 10 && totalSpent >= 300) classification = 'شريك التراث';
  else if (ordersCount >= 5 && totalSpent >= 150 && isLoyalWithoutDiscounts) classification = 'عاشق التراث';
  else if (ordersCount >= 4 && totalSpent >= 200 && daysSinceLastOrder <= 60) classification = 'عميل ذهبي';
  else if (isCouponHunter) classification = 'صياد العروض';
  else if (ordersCount === 1 && daysSinceLastOrder <= 30) classification = 'ضيف جديد';
  else if (daysSinceLastOrder <= 45 && ordersCount > 0) classification = 'عميل نشط';
  else if (daysSinceLastOrder > 45 && daysSinceLastOrder <= 90) classification = 'متباطئ';
  else if (daysSinceLastOrder > 90) classification = 'منقطع';

  const activePoints = Number(customer.loyaltyPoints ?? Math.floor(totalSpent));
  const namePart = getFriendlyCustomerName(customer.name || conversation.customerName);
  const seed = customer.id || customer.phone || customer.name || phone;

  const daysOfWeekAr = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  let preemptiveMatch: CustomerInsight['preemptiveMatch'] = null;
  const dayItemCounts: Record<string, { count: number; dayOfWeek: number; productId: string }> = {};
  effectiveInvoices.forEach((inv: any) => {
    const date = new Date(inv.date || Date.now());
    if (Number.isNaN(date.getTime())) return;
    const docDay = date.getDay();
    (inv.items || []).forEach((item: any) => {
      const productId = String(item.productId || '');
      if (!productId) return;
      const key = `${docDay}-${productId}`;
      if (!dayItemCounts[key]) dayItemCounts[key] = { count: 0, dayOfWeek: docDay, productId };
      dayItemCounts[key].count += Number(item.quantity || 1);
    });
  });
  Object.values(dayItemCounts).forEach((item) => {
    if (preemptiveMatch || item.count < 2) return;
    const product = (products as Product[]).find((p) => String(p.id) === String(item.productId));
    preemptiveMatch = {
      productName: product?.name,
      dayOfWeekStr: daysOfWeekAr[item.dayOfWeek],
      isTomorrow: (new Date().getDay() + 1) % 7 === item.dayOfWeek,
    };
  });

  let riskLevel: CustomerInsight['riskLevel'] = 'safe';
  if (preemptiveMatch) riskLevel = 'preemptive';
  else if (totalSpent > 500 && daysSinceLastOrder > 30) riskLevel = 'critical';
  else if (totalSpent > 200 && daysSinceLastOrder > 15) riskLevel = 'warning';

  let smartAdvice = 'رد مختصر حسب المحادثة الحالية.';
  let actionLabel = 'رد ذكي جاهز';
  let whatsappMessage = `حياك الله ${namePart} 🤍\nأنا معك الآن، أراجع رسالتك وأرد عليك بالتفاصيل المناسبة.`;

  if (preemptiveMatch) {
    const dayText = preemptiveMatch.isTomorrow ? 'باجر' : `يوم ${preemptiveMatch.dayOfWeekStr || 'قريب'}`;
    const productLine = preemptiveMatch.productName ? `طلبك المعتاد (${preemptiveMatch.productName}) حاضر.` : 'طلبك المعتاد واضح عندنا.';
    smartAdvice = 'نمط طلب متكرر؛ رد جاهز وقت الاستفسار.';
    actionLabel = 'موعد طلب معتاد';
    whatsappMessage = pickBySeedLocal([
      `يا هلا ${namePart}، تذكير بسيط قبل موعد طلبك المعتاد ${dayText}. ${productLine} إذا يناسبك نجهزه لك بكل سرور.`,
      `${namePart}، حياك الله. لاحظنا إن هذا الوقت يناسب طلبك المعتاد، ${productLine} ودنا نخدمك إذا لك خاطر.`,
      `يا هلا ${namePart}، طلبك المعتاد قريب من موعده. ${productLine} تحب نرتبه لك؟`,
    ], seed);
  } else if (classification === 'شريك التراث' || classification === 'عميل ذهبي') {
    smartAdvice = 'عميل مميز؛ رسالة تقدير قصيرة أفضل من الكلام الطويل.';
    actionLabel = classification === 'شريك التراث' ? 'شريك التراث' : 'عميل ذهبي';
    whatsappMessage = pickBySeedLocal([
      `هلا ${namePart}، لك مكانة خاصة عند التراث. رصيدك ${activePoints} نقطة، وجهزنا لك تقدير مناسب للطلب القادم.`,
      `${namePart}، طلباتك لها قيمة عندنا. عندك ${activePoints} نقطة ونبي نخدمك بتجربة أرتب.`,
      `يا هلا ${namePart}، رصيدك ${activePoints} نقطة. هذا تذكير تقدير لعميل نعتز فيه.`,
    ], seed);
  } else if (classification === 'عاشق التراث') {
    smartAdvice = 'ولاء واضح؛ كافئه برسالة تقدير لا خصم عشوائي.';
    actionLabel = 'تقدير الولاء';
    whatsappMessage = pickBySeedLocal([
      `${namePart}، ذوقك حاضر في سجل التراث. عندك ${activePoints} نقطة ونحب نكافئ استمرارك.`,
      `هلا ${namePart}، ولاؤك محل تقدير. رصيدك ${activePoints} نقطة، والطلب القادم له عناية خاصة.`,
      `${namePart}، حضورك المتكرر يسعدنا. جهزنا لك تقدير بسيط يليق فيك.`,
    ], seed);
  } else if (classification === 'صياد العروض') {
    smartAdvice = 'يفضل القيمة الواضحة؛ اجعل الرسالة مباشرة ومختصرة.';
    actionLabel = 'صياد العروض';
    whatsappMessage = pickBySeedLocal([
      `هلا ${namePart}، عندك فرصة ذكية للاستفادة من رصيدك ${activePoints} نقطة في الطلب القادم.`,
      `${namePart}، اخترنا لك تنبيه توفير مختصر يناسب سجل طلباتك. رصيدك ${activePoints} نقطة.`,
      `يا هلا ${namePart}، رصيدك ${activePoints} نقطة جاهز يساعدك في طلبك القادم.`,
    ], seed);
  } else if (classification === 'منقطع' || classification === 'متباطئ' || riskLevel === 'critical' || riskLevel === 'warning') {
    smartAdvice = 'فرصة استرجاع؛ رسالة دافئة بدون إلحاح.';
    actionLabel = classification === 'منقطع' ? 'فرصة استرجاع' : 'متباطئ';
    whatsappMessage = pickBySeedLocal([
      `هلا ${namePart}، لك فترة عن التراث. نحب نرجع نخدمك بطلب مرتب على ذوقك.`,
      `${namePart}، اشتقنا لطلبك. إذا ودك نرتب لك شي مناسب اليوم، حاضرين.`,
      `يا هلا ${namePart}، رجعتك تهمنا. عندك ${activePoints} نقطة ونقدر نجهز لك طلب سريع.`,
    ], seed);
  } else if (activePoints >= 250) {
    smartAdvice = 'رصيد عالي؛ شجعه على الاستفادة الآن.';
    actionLabel = 'استفادة الرصيد';
    whatsappMessage = pickBySeedLocal([
      `ما شاء الله ${namePart}، رصيدك ${activePoints} نقطة جاهز للاستفادة في الطلب القادم.`,
      `${namePart}، عندك رصيد ممتاز: ${activePoints} نقطة. نقدر نفعّله لك مع الطلب القادم.`,
      `هلا ${namePart}، نقاطك وصلت مستوى ممتاز. رصيدك ${activePoints} نقطة.`,
    ], seed);
  } else if (activePoints >= 150) {
    smartAdvice = 'قريب من مكافأة؛ حفزه بجملة واحدة.';
    actionLabel = 'تحفيز مختصر';
    whatsappMessage = pickBySeedLocal([
      `${namePart}، قربت من مكافأة أعلى. رصيدك الآن ${activePoints} نقطة.`,
      `هلا ${namePart}، باقي لك خطوة بسيطة وتفتح قيمة أفضل. رصيدك ${activePoints} نقطة.`,
      `${namePart}، نقاطك تتحرك بشكل ممتاز: ${activePoints} نقطة حالياً.`,
    ], seed);
  }

  return { customer, classification, actionLabel, smartAdvice, whatsappMessage, activePoints, ordersCount, totalSpent, daysSinceLastOrder, lastOrderDate, preemptiveMatch, riskLevel };
};

const getSmartRepliesForConversation = (c?: Conversation | null, data?: Partial<AppState> | null): SmartReply[] => {
  if (!c) return [];
  const tags = Array.isArray(c.tags) ? c.tags : [];
  const insight = buildCustomerInsight(data, c);
  const name = getFriendlyCustomerName(insight?.customer?.name || c.customerName);
  const textIndex = normalizeArabicSearch([c.customerName, c.lastMessageText, c.lastInboundText, c.priority, ...tags].filter(Boolean).join(' '));
  const replies: SmartReply[] = [];
  const hasAny = (words: string[]) => words.some((word) => textIndex.includes(normalizeArabicSearch(word)));

  if (insight) {
    const dayPart = insight.daysSinceLastOrder >= 900 ? 'لا يوجد طلب مؤكد' : `آخر طلب قبل ${insight.daysSinceLastOrder} يوم`;
    const statsPart = `${insight.ordersCount} طلب · ${Number(insight.totalSpent || 0).toFixed(3)} د.ك`;
    replies.push({
      id: `smart-customer-${insight.actionLabel}`,
      title: insight.actionLabel,
      meta: `${insight.classification} · ${dayPart} · ${statsPart}`,
      tone: insight.classification === 'شريك التراث' || insight.classification === 'عميل ذهبي' || insight.actionLabel === 'شريك التراث' ? 'vip' : insight.actionLabel.includes('استرجاع') || insight.classification === 'منقطع' || insight.classification === 'متباطئ' ? 'retention' : 'loyalty',
      score: 500,
      text: insight.whatsappMessage,
    });
  }

  if (hasAny(['دفع', 'فاتورة', 'مدفوع', 'كي نت', 'knet', 'payment', 'paid', 'رابط'])) {
    replies.push({ id: 'smart-payment-context', title: 'فحص الدفع', meta: 'استفسار دفع ظاهر في آخر رسالة', tone: 'support', score: 420, text: `حياك الله ${name}، أراجع حالة الدفع والفاتورة الآن. إذا الدفع تم، بنثبتها لك مباشرة ونحدث الطلب.` });
  }
  if (hasAny(['توصيل', 'وصل', 'مندوب', 'عنوان', 'delivery', 'driver', 'تأخر الطلب'])) {
    replies.push({ id: 'smart-delivery-context', title: 'متابعة التوصيل', meta: 'استفسار توصيل ظاهر في آخر رسالة', tone: 'support', score: 410, text: `أبشر ${name}، أتابع حالة التوصيل الآن وأرجع لك بالتحديث الصحيح بأسرع وقت.` });
  }
  if (hasAny(['متوفر', 'توفر', 'منتج', 'نفس طلبي', 'الجديد', 'سعر', 'كم'])) {
    replies.push({ id: 'smart-product-context', title: 'استفسار منتج', meta: 'رسالة العميل مرتبطة بتوفر أو منتج', tone: 'support', score: 390, text: `حياك الله ${name} 🤍\nأراجع لك التوفر والتفاصيل الآن، وإذا تحب أرتب لك الخيار الأنسب حسب طلباتك السابقة.` });
  }

  if (tags.includes('vip_absent') || textIndex.includes('vip') || textIndex.includes('عميل مميز')) {
    replies.push({ id: 'smart-vip-absent-context', title: 'عميل VIP غائب', meta: 'رد تقديري جاهز عند عودة العميل', tone: 'vip', score: 300, text: `يا هلا ${name} 🌿\nنورتنا من جديد، وجودك عندنا له تقدير خاص. أراجع لك التوفر الآن، وإذا تحب أرتب لك الطلب بأفضل خيار مناسب لك.` });
  }
  if (tags.includes('gold_customer') || textIndex.includes('ذهبي')) {
    replies.push({ id: 'smart-gold-context', title: 'عميل ذهبي', meta: 'رد ولاء مختصر وراقي', tone: 'loyalty', score: 290, text: `حياك الله ${name} 🤍\nأكيد، أراجع لك الطلب السابق والتوفر الحالي، وبما أنك من عملائنا المميزين بنرتب لك الاختيار الأنسب قبل التأكيد.` });
  }
  if (tags.includes('retention') || textIndex.includes('غائب')) {
    replies.push({ id: 'smart-retention-context', title: 'فرصة استرجاع', meta: 'رد لطيف لفتح طلب جديد', tone: 'retention', score: 280, text: `يا هلا ${name} 🌿\nعندنا اختيارات جديدة ومميزة، وأقدر أرشح لك الأنسب حسب طلباتك السابقة. اكتب لي شنو تفضل وأنا أجهز لك الخيارات.` });
  }

  if (!replies.length) {
    replies.push({
      id: 'smart-support-default',
      title: 'رد ذكي جاهز',
      meta: 'مناسب للمحادثة الحالية',
      tone: 'support',
      score: 1,
      text: `حياك الله ${name !== 'عميلنا العزيز' ? name : ''} 🤍\nأنا معك الآن، أراجع رسالتك وأرد عليك بالتفاصيل المناسبة بأقرب وقت.`.replace('  ', ' '),
    });
  }

  const seen = new Set<string>();
  return replies
    .sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
    .filter((item) => {
      const key = `${item.title}::${item.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
};

const normalizeArabicSearch = (value: string) => String(value || '')
  .toLowerCase()
  .replace(/[أإآا]/g, 'ا')
  .replace(/[ى]/g, 'ي')
  .replace(/[ة]/g, 'ه')
  .replace(/[ؤ]/g, 'و')
  .replace(/[ئ]/g, 'ي')
  .replace(/[ًٌٍَُِّْـ]/g, '')
  .trim();


const buildTemperatureTimeline = (messages: ChatMessage[], selected?: Conversation | null) => {
  const source = messages.length ? messages : selected ? [{ id: 'last', direction: (selected.lastMessageDirection === 'outbound' ? 'outbound' : 'inbound') as 'inbound' | 'outbound', text: selected.lastMessageText || selected.lastInboundText || '', createdAt: selected.lastMessageAt }] : [];
  const scoreMessage = (text: string, direction: string) => {
    const t = normalizeArabicSearch(text);
    let score = direction === 'inbound' ? 35 : 18;
    if (['زعل','غضب','غاضب','شكوى','تأخير','حرام','سيء','غلط','ما يصير','وين','تعبت'].some(w => t.includes(normalizeArabicSearch(w)))) score += 45;
    if (['عاجل','ضروري','الحين','دفع','فاتورة','مندوب','توصيل'].some(w => t.includes(normalizeArabicSearch(w)))) score += 25;
    if (direction === 'outbound' && ['حقك علينا','أبشر','أراجع','تم','شكرا','حياك'].some(w => t.includes(normalizeArabicSearch(w)))) score -= 18;
    return Math.max(5, Math.min(100, score));
  };
  const points = source.slice(-7).map((m: any, index) => ({
    id: m.id || `p-${index}`,
    label: formatTime(m.createdAt) || `#${index + 1}`,
    score: scoreMessage(m.text || '', m.direction || 'inbound'),
    direction: m.direction || 'inbound',
  }));
  const last = points[points.length - 1]?.score || 0;
  const prev = points[points.length - 2]?.score || last;
  const trend = last >= prev + 10 ? 'يتصاعد' : last <= prev - 10 ? 'يبرد' : 'ثابت';
  const alert = last >= 75 || (trend === 'يتصاعد' && last >= 60);
  return { points, trend, alert, last };
};

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



export default function WhatsAppSupportInbox({ data = null }: WhatsAppSupportInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [managedQuickReplies, setManagedQuickReplies] = useState<QuickReply[]>(() => loadSavedQuickReplies());
  const [autoReplyRules, setAutoReplyRules] = useState<AutoReplyRule[]>([]);
  const [autoReplyEditorOpen, setAutoReplyEditorOpen] = useState(false);
  const [editingAutoReplyId, setEditingAutoReplyId] = useState<string | null>(null);
  const [autoReplyForm, setAutoReplyForm] = useState<AutoReplyRule>({
    id: '',
    title: '',
    enabled: true,
    priority: 100,
    keywords: [],
    matchMode: 'any',
    action: 'reply',
    response: '',
  });
  const [autoReplyKeywordsText, setAutoReplyKeywordsText] = useState('');
  const [autoReplyFormError, setAutoReplyFormError] = useState('');
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [activeSmartReplyId, setActiveSmartReplyId] = useState<string | null>(null);
  const [activeSmartReplySnapshot, setActiveSmartReplySnapshot] = useState<SmartReply | null>(null);
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
  const quickReplyEditorRef = useRef<HTMLDivElement | null>(null);
  const quickReplyTitleInputRef = useRef<HTMLInputElement | null>(null);
  const autoReplyEditorRef = useRef<HTMLDivElement | null>(null);
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
      setConversations(json.conversations || []);
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
    const cleanedPhone = cleanPhone(phone);
    try {
      const res = await fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(phone))}/messages`, { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تحميل الرسائل');
      setSelected(json.conversation || null);
      setMessages(json.messages || []);
      setQuickReplies(json.quickReplies || []);
      void fetch(`/api/whatsapp/conversations/${encodeURIComponent(cleanPhone(phone))}/read`, { method: 'POST' }).catch(() => {});
      if (scrollToEnd) setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 20);
    } catch (e: any) {
      setError(e?.message || 'تعذر تحميل المحادثة');
    }
  };

  const loadAutoReplyRules = async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-replies', { cache: 'no-store' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تحميل قواعد الرد التلقائي');
      setAutoReplyRules(json.rules || []);
    } catch (e: any) {
      showNotice('error', e?.message || 'تعذر تحميل قواعد الرد التلقائي');
    }
  };

  // Installs the starter rule pack. Rules the owner already has are skipped, never overwritten.
  const seedDefaultAutoReplyRules = async () => {
    try {
      const res = await fetch('/api/whatsapp/auto-replies/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تركيب القواعد الجاهزة');
      showNotice(
        'success',
        `تم تركيب ${json.created} قاعدة جاهزة${json.skipped ? ` · ${json.skipped} موجودة عندك وما تغيّرت` : ''}`,
      );
      await loadAutoReplyRules();
    } catch (e: any) {
      showNotice('error', e?.message || 'تعذر تركيب القواعد الجاهزة');
    }
  };

  useEffect(() => {
    loadConversations();
    loadAutoReplyRules();
    const timer = window.setInterval(() => loadConversations(true), 1200);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setSlaNowMs(Date.now()), 15000);
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
    const timer = window.setInterval(() => loadMessages(selectedPhone, false), 1000);
    return () => window.clearInterval(timer);
  }, [selectedPhone]);

  useEffect(() => {
    setActiveSmartReplyId(null);
    setActiveSmartReplySnapshot(null);
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
  const selectedTemperature = useMemo(() => getCustomerTemperature(selected), [selected]);
  const selectedSlaInfo = useMemo(() => getConversationSlaInfo(selected, slaNowMs), [selected, slaNowMs]);
  const selectedSmartReplies = useMemo(() => getSmartRepliesForConversation(selected, data), [selected, data]);
  const selectedTempTimeline = useMemo(() => buildTemperatureTimeline(messages, selected), [messages, selected]);
  const activeSmartReply = activeSmartReplySnapshot;
  const urgentReplies = useMemo(() => (
    conversations
      .map((c) => classifyUrgentReply(c, slaNowMs))
      .filter(Boolean)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 6)
  ), [conversations, slaNowMs]);
  const operationLane = useMemo(() => {
    const items = conversations
      .map((c) => classifyUrgentReply(c, slaNowMs))
      .filter(Boolean) as any[];
    const base: Record<UrgentReplyKind, { count: number; maxWait: number }> = {
      anger: { count: 0, maxWait: 0 },
      payment: { count: 0, maxWait: 0 },
      delivery: { count: 0, maxWait: 0 },
      waiting: { count: 0, maxWait: 0 },
    };
    items.forEach((item) => {
      base[item.kind as UrgentReplyKind].count += 1;
      base[item.kind as UrgentReplyKind].maxWait = Math.max(base[item.kind as UrgentReplyKind].maxWait, item.waitingMinutes || 0);
    });
    return base;
  }, [conversations, slaNowMs]);
  const topSmartDecision = useMemo(() => {
    const item = urgentReplies[0] as any;
    if (!item) return null;
    const info = urgentReplyInfo[item.kind as UrgentReplyKind];
    const conversation = item.conversation as Conversation;
    const customer = conversation.customerName || conversation.phone || 'عميل واتساب';
    const waitText = item.waitingMinutes > 0 ? `ينتظر ${item.waitingMinutes} دقيقة` : 'وصل الآن';
    return {
      item,
      info,
      customer,
      waitText,
      reason: `${info.label} · ${waitText} · ${Number(conversation.unreadCount || 0)} غير مقروء`,
      reply: info.reply,
    };
  }, [urgentReplies]);

  const whatsappCommandPulse = useMemo(() => {
    const urgentTotal = Object.values(operationLane).reduce((sum, lane) => sum + lane.count, 0);
    const maxWait = Math.max(...Object.values(operationLane).map((lane) => lane.maxWait || 0), 0);
    const hottestLane = (Object.entries(operationLane) as Array<[UrgentReplyKind, { count: number; maxWait: number }]>)
      .sort((a, b) => (b[1].count * 100 + b[1].maxWait) - (a[1].count * 100 + a[1].maxWait))[0];
    const laneInfo = hottestLane ? urgentReplyInfo[hottestLane[0]] : null;
    const health =
      operationLane.anger.count > 0 || maxWait >= 15 ? 'خطر خدمة' :
      urgentTotal > 0 ? 'نبض نشط' :
      'هادئ ومرتب';
    const move =
      topSmartDecision ? `ابدأ بـ ${topSmartDecision.customer}: ${topSmartDecision.info.label}` :
      counts.support > 0 ? 'راجع محادثات الدعم اليدوي' :
      counts.unread > 0 ? 'صفّر غير المقروء' :
      'النظام تحت السيطرة الآن';
    return {
      health,
      urgentTotal,
      maxWait,
      laneLabel: laneInfo?.label || 'لا يوجد',
      move,
      tone: operationLane.anger.count > 0 || maxWait >= 15 ? 'danger' : urgentTotal > 0 ? 'active' : 'calm',
    };
  }, [operationLane, topSmartDecision, counts.support, counts.unread]);

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
    window.setTimeout(() => {
      quickReplyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      quickReplyTitleInputRef.current?.focus();
    }, 60);
  };

  const startEditQuickReply = (item: QuickReply) => {
    setEditingQuickReplyId(item.id);
    setQuickReplyForm({ title: item.title, text: item.text });
    setQuickReplyFormError('');
    setQuickReplyEditorOpen(true);
    window.setTimeout(() => {
      quickReplyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      quickReplyTitleInputRef.current?.focus();
    }, 60);
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

  const resetAutoReplyForm = () => {
    setEditingAutoReplyId(null);
    setAutoReplyForm({
      id: '',
      title: '',
      enabled: true,
      priority: 100,
      keywords: [],
      matchMode: 'any',
      action: 'reply',
      response: '',
    });
    setAutoReplyKeywordsText('');
    setAutoReplyFormError('');
  };

  const startNewAutoReply = () => {
    resetAutoReplyForm();
    setAutoReplyEditorOpen(true);
    window.setTimeout(() => autoReplyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const startEditAutoReply = (rule: AutoReplyRule) => {
    setEditingAutoReplyId(rule.id);
    setAutoReplyForm({ ...rule, keywords: Array.isArray(rule.keywords) ? rule.keywords : [] });
    setAutoReplyKeywordsText((Array.isArray(rule.keywords) ? rule.keywords : []).join('\n'));
    setAutoReplyFormError('');
    setAutoReplyEditorOpen(true);
    window.setTimeout(() => autoReplyEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 60);
  };

  const saveAutoReplyRule = async () => {
    const title = autoReplyForm.title.trim();
    const response = autoReplyForm.response.trim();
    const keywords = autoReplyKeywordsText.split(/[\n,،]+/).map((item) => item.trim()).filter(Boolean);
    if (!title || !keywords.length || (autoReplyForm.action !== 'products' && !response)) {
      const message = autoReplyForm.action === 'products'
        ? 'اكتب اسم القاعدة والكلمات المفتاحية.'
        : 'اكتب اسم القاعدة والكلمات المفتاحية ونص الرد.';
      setAutoReplyFormError(message);
      showNotice('error', message);
      return;
    }
    try {
      const res = await fetch('/api/whatsapp/auto-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...autoReplyForm,
          id: editingAutoReplyId || autoReplyForm.id,
          title,
          response,
          keywords,
          priority: Number(autoReplyForm.priority || 100),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر حفظ قاعدة الرد');
      await loadAutoReplyRules();
      setAutoReplyEditorOpen(false);
      resetAutoReplyForm();
      showNotice('success', 'تم حفظ قاعدة الرد التلقائي.');
    } catch (e: any) {
      const message = e?.message || 'تعذر حفظ قاعدة الرد';
      setAutoReplyFormError(message);
      showNotice('error', message);
    }
  };

  const toggleAutoReplyRule = async (rule: AutoReplyRule) => {
    try {
      const res = await fetch('/api/whatsapp/auto-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...rule, enabled: rule.enabled === false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر تحديث القاعدة');
      await loadAutoReplyRules();
      showNotice('success', rule.enabled === false ? 'تم تفعيل القاعدة.' : 'تم تعطيل القاعدة.');
    } catch (e: any) {
      showNotice('error', e?.message || 'تعذر تحديث القاعدة');
    }
  };

  const deleteAutoReplyRule = async (rule: AutoReplyRule) => {
    const confirmed = typeof window === 'undefined' ? true : window.confirm(`حذف قاعدة الرد: ${rule.title}؟`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/whatsapp/auto-replies/${encodeURIComponent(rule.id)}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'تعذر حذف القاعدة');
      await loadAutoReplyRules();
      showNotice('success', 'تم حذف قاعدة الرد التلقائي.');
    } catch (e: any) {
      showNotice('error', e?.message || 'تعذر حذف القاعدة');
    }
  };

  const toggleSmartReply = (item: SmartReply) => {
    const same = activeSmartReplyId === item.id;
    setActiveSmartReplyId(same ? null : item.id);
    setActiveSmartReplySnapshot(same ? null : item);
  };

  const applyQuickReply = (text: string) => {
    setReplyText(text);
    showNotice('info', 'تم وضع الرد السريع في مربع الرد، راجعه ثم اضغط إرسال.');
  };

  const applySmartReply = (item: SmartReply) => {
    setReplyText(item.text);
    showNotice('info', 'تم اعتماد الرد الذكي في مربع الرد، راجعه ثم اضغط إرسال.');
  };

  const applyUrgentReply = (item: any) => {
    const phone = item?.conversation?.phone || item?.conversation?.id || '';
    if (phone) setSelectedPhone(phone);
    applyQuickReply(urgentReplyInfo[item.kind as UrgentReplyKind].reply);
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
        <div />
        <div className="grid grid-cols-3 gap-3 min-w-[320px]">
          <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-4"><div className="text-xs text-slate-400">المحادثات</div><div className="text-2xl font-black">{counts.all}</div></div>
          <div className="rounded-3xl bg-amber-50 border border-amber-100 shadow-sm p-4"><div className="text-xs text-amber-600">تحتاج دعم</div><div className="text-2xl font-black text-amber-700">{counts.support}</div></div>
          <div className="rounded-3xl bg-rose-50 border border-rose-100 shadow-sm p-4"><div className="text-xs text-rose-600">غير مقروء</div><div className="text-2xl font-black text-rose-700">{counts.unread}</div></div>
        </div>
      </div>

      {notice && <div className={cn('mb-4 rounded-2xl border px-4 py-3 text-sm font-black flex items-center gap-2', notice.type === 'success' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : notice.type === 'error' ? 'border-rose-100 bg-rose-50 text-rose-700' : 'border-sky-100 bg-sky-50 text-sky-700')}><AlertCircle size={16} /> {notice.text}</div>}
      {error && <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50 text-rose-700 px-4 py-3 text-sm font-bold">{error}</div>}
      {topSmartDecision && (
        <section className="mb-4 rounded-[1.7rem] border border-slate-900 bg-slate-950 text-white p-4 shadow-xl overflow-hidden relative">
          <div className="absolute -left-16 -top-16 h-36 w-36 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="text-right">
              <div className="text-[10px] font-black text-emerald-300 mb-1">قرار واتساب الآن</div>
              <h2 className="text-xl font-black">{topSmartDecision.customer}</h2>
              <p className="text-xs font-bold text-white/60 mt-1">{topSmartDecision.reason}</p>
              <p className="mt-3 rounded-2xl bg-white/10 border border-white/10 px-3 py-2 text-sm font-bold leading-7 text-white/85">{topSmartDecision.reply}</p>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <button type="button" onClick={() => applyUrgentReply(topSmartDecision.item)} className="rounded-2xl bg-emerald-400 text-slate-950 px-4 py-3 text-xs font-black hover:bg-emerald-300 transition">
                جهّز الرد
              </button>
              <button type="button" onClick={() => { setSelectedPhone(topSmartDecision.item.conversation.phone); setFilter('needs_support'); }} className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-xs font-black hover:bg-white/15 transition">
                افتح المحادثة
              </button>
            </div>
          </div>
        </section>
      )}
      <section className={cn(
        'mb-4 rounded-[1.7rem] border p-4 shadow-sm overflow-hidden relative',
        whatsappCommandPulse.tone === 'danger' ? 'border-rose-100 bg-rose-50 text-rose-950' :
        whatsappCommandPulse.tone === 'active' ? 'border-amber-100 bg-amber-50 text-amber-950' :
        'border-emerald-100 bg-emerald-50 text-emerald-950'
      )}>
        <div className="absolute -left-10 -bottom-12 h-28 w-28 rounded-full bg-white/70 blur-2xl" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.2fr_2fr] gap-4 items-center">
          <div>
                        <h2 className="mt-1 text-2xl font-black">{whatsappCommandPulse.health}</h2>
            <p className="mt-2 text-xs font-bold leading-6 opacity-75">{whatsappCommandPulse.move}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/75 border border-white px-3 py-3">
              <span className="block text-[10px] font-black opacity-55">عاجل</span>
              <strong className="mt-1 block text-xl font-black">{whatsappCommandPulse.urgentTotal}</strong>
            </div>
            <div className="rounded-2xl bg-white/75 border border-white px-3 py-3">
              <span className="block text-[10px] font-black opacity-55">أعلى انتظار</span>
              <strong className="mt-1 block text-xl font-black">{whatsappCommandPulse.maxWait} د</strong>
            </div>
            <div className="rounded-2xl bg-white/75 border border-white px-3 py-3">
              <span className="block text-[10px] font-black opacity-55">المسار الساخن</span>
              <strong className="mt-1 block text-xl font-black">{whatsappCommandPulse.laneLabel}</strong>
            </div>
          </div>
        </div>
      </section>
      <section className="mb-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm whatsapp-urgent-board whatsapp-ops-board">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="font-black text-slate-900 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> غرفة عمليات واتساب</div>
          <div className="text-[11px] font-bold text-slate-400">مراقبة حية حسب الغضب والدفع والتوصيل والانتظار</div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {(['anger', 'payment', 'delivery', 'waiting'] as UrgentReplyKind[]).map((kind) => {
            const info = urgentReplyInfo[kind];
            const stat = operationLane[kind];
            const active = stat.count > 0;
            return (
              <button key={kind} type="button" onClick={() => setFilter(kind === 'waiting' ? 'unread' : 'all')} className={cn('whatsapp-ops-lane', active && 'is-live', `is-${kind}`)}>
                <span className="ops-live-dot" />
                <span className="ops-label">{info.label}</span>
                <strong>{stat.count}</strong>
                <small>{stat.maxWait > 0 ? `${stat.maxWait} د انتظار` : 'هادئ الآن'}</small>
              </button>
            );
          })}
        </div>
        {urgentReplies.length > 0 && (
          <div className="mt-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="font-black text-slate-900 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> الردود العاجلة</div>
            <div className="text-[11px] font-bold text-slate-400">{urgentReplies.length} حالة مرتبة حسب الانتظار والدفع والغضب والتوصيل</div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {urgentReplies.map((item: any) => {
              const c = item.conversation;
              const info = urgentReplyInfo[item.kind as UrgentReplyKind];
              return (
                <button key={`${item.kind}-${c.phone || c.id}`} onClick={() => applyUrgentReply(item)} className="text-right rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white p-3 transition shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-black text-slate-900 truncate">{c.customerName || c.phone}</div>
                      <div className="text-[11px] font-bold text-slate-400 truncate">{c.phone}</div>
                    </div>
                    <span className={cn('shrink-0 rounded-full border px-2 py-1 text-[10px] font-black', info.className)}>{info.label}</span>
                  </div>
                  <div className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{c.lastInboundText || c.lastMessageText || 'محادثة تحتاج متابعة'}</div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-slate-400">{item.waitingMinutes > 0 ? `ينتظر ${item.waitingMinutes} د` : 'الآن'}</span>
                    <span className="rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white">رد جاهز</span>
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        )}
      </section>
      <section className="mb-4 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="font-black text-slate-900 flex items-center gap-2"><Bot size={18} className="text-emerald-600" /> قواعد الرد التلقائي</div>
            <div className="mt-1 text-[11px] font-bold text-slate-400">تشتغل قبل الردود الافتراضية، ويمكن تعطيلها أو حذفها بأي وقت</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={seedDefaultAutoReplyRules}
              title="يركّب باقة قواعد جاهزة. أي قاعدة عندك ما تتغيّر."
              className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-black text-emerald-700 hover:bg-emerald-100 flex items-center justify-center gap-2"
            >
              ✨ القواعد الجاهزة
            </button>
            <button type="button" onClick={startNewAutoReply} className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white hover:bg-slate-800 flex items-center justify-center gap-2">
              <Plus size={14} /> إضافة قاعدة
            </button>
          </div>
        </div>

        {autoReplyEditorOpen && (
          <div ref={autoReplyEditorRef} className="mb-3 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-3 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_180px_150px_150px] gap-2">
              <input
                value={autoReplyForm.title}
                onChange={(e) => { setAutoReplyForm((prev) => ({ ...prev, title: e.target.value })); setAutoReplyFormError(''); }}
                placeholder="اسم القاعدة: أسعار المجبوس"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <input
                type="number"
                value={autoReplyForm.priority || 100}
                onChange={(e) => setAutoReplyForm((prev) => ({ ...prev, priority: Number(e.target.value || 100) }))}
                placeholder="الأولوية"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <select
                value={autoReplyForm.matchMode}
                onChange={(e) => setAutoReplyForm((prev) => ({ ...prev, matchMode: e.target.value as AutoReplyRule['matchMode'] }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="any">أي كلمة</option>
                <option value="all">كل الكلمات</option>
                <option value="exact">تطابق كامل</option>
              </select>
              <select
                value={autoReplyForm.action}
                onChange={(e) => setAutoReplyForm((prev) => ({ ...prev, action: e.target.value as AutoReplyRule['action'] }))}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="reply">يرد تلقائي</option>
                <option value="products">يرد من المنتجات</option>
                <option value="human">يحوّل للموظف</option>
              </select>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-2">
              <textarea
                value={autoReplyKeywordsText}
                onChange={(e) => { setAutoReplyKeywordsText(e.target.value); setAutoReplyFormError(''); }}
                placeholder={'كلمات مفتاحية، كل كلمة بسطر\nمجبوس\nللمجبوس\nاسعار المجبوس'}
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <textarea
                value={autoReplyForm.response}
                onChange={(e) => { setAutoReplyForm((prev) => ({ ...prev, response: e.target.value })); setAutoReplyFormError(''); }}
                placeholder={autoReplyForm.action === 'products'
                  ? 'اختياري: نص احتياطي إذا ما لقى صنف مطابق. الرد الأساسي سيطلع من قائمة المنتجات الحالية.'
                  : 'نص الرد. تقدر تستخدم: {menu_link} أو {track_link}\nمثال: حياك الله، أسعار المجبوس حسب المنيو الحالي هنا:\n{menu_link}'}
                className="min-h-[120px] rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            {autoReplyFormError && <div className="rounded-2xl border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">{autoReplyFormError}</div>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-xs font-black text-slate-600">
                <input type="checkbox" checked={autoReplyForm.enabled !== false} onChange={(e) => setAutoReplyForm((prev) => ({ ...prev, enabled: e.target.checked }))} />
                مفعّلة
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setAutoReplyEditorOpen(false); resetAutoReplyForm(); }} className="rounded-2xl bg-white border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-50">إلغاء</button>
                <button type="button" onClick={saveAutoReplyRule} className="rounded-2xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700 flex items-center gap-1"><Save size={14} /> حفظ القاعدة</button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-2">
          {autoReplyRules.length ? autoReplyRules.map((rule) => (
            <div key={rule.id} className={cn('rounded-2xl border p-3', rule.enabled === false ? 'border-slate-100 bg-slate-50 opacity-70' : 'border-emerald-100 bg-white')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-black text-slate-900 truncate">{rule.title}</div>
                  <div className="mt-1 text-[10px] font-bold text-slate-400">{rule.action === 'human' ? 'تحويل للموظف' : rule.action === 'products' ? 'من قائمة المنتجات' : 'رد تلقائي'} · أولوية {rule.priority || 100}</div>
                </div>
                <span className={cn('rounded-full px-2 py-1 text-[10px] font-black', rule.enabled === false ? 'bg-slate-200 text-slate-500' : 'bg-emerald-50 text-emerald-700')}>{rule.enabled === false ? 'متوقفة' : 'مفعلة'}</span>
              </div>
              <div className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-slate-500">{(rule.keywords || []).join('، ')}</div>
              <div className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">{rule.action === 'products' && !rule.response ? 'يقرأ الرد مباشرة من قائمة المنتجات الحالية.' : rule.response}</div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => toggleAutoReplyRule(rule)} className="rounded-xl bg-slate-100 px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-200">{rule.enabled === false ? 'تفعيل' : 'تعطيل'}</button>
                <button type="button" onClick={() => startEditAutoReply(rule)} className="rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50">تعديل</button>
                <button type="button" onClick={() => deleteAutoReplyRule(rule)} className="rounded-xl bg-rose-50 px-2.5 py-1.5 text-[11px] font-black text-rose-700 hover:bg-rose-100">حذف</button>
              </div>
            </div>
          )) : (
            <div className="rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/40 p-5 text-center lg:col-span-2 2xl:col-span-3">
              <div className="text-sm font-black text-slate-800">ما عندك أي قاعدة رد تلقائي بعد</div>
              <div className="mx-auto mt-1.5 max-w-md text-xs font-bold leading-5 text-slate-500">
                ركّب الباقة الجاهزة بضغطة: ترحيب، منيو، تتبع الطلب، التوصيل، الأسعار، أوقات الدوام، الدفع، العروض، الولائم، والشكاوى — وكلها تتعدّل وتتحذف براحتك بعدها.
              </div>
              <button
                type="button"
                onClick={seedDefaultAutoReplyRules}
                className="mt-3 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-200 transition-all hover:-translate-y-0.5 hover:bg-emerald-700"
              >
                ✨ ركّب القواعد الجاهزة
              </button>
            </div>
          )}
        </div>
      </section>
      <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 h-auto xl:h-[calc(100vh-146px)] min-h-0 xl:min-h-[820px] whatsapp-support-workspace">
        <section className="rounded-[1.5rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[320px] max-h-[440px] xl:min-h-[820px] xl:max-h-none">
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
                <button key={id} onClick={() => setFilter(id as any)} className={cn('rounded-xl px-2 py-2 transition', filter === id ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100')}>{label}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? <div className="h-full flex items-center justify-center text-slate-400"><Loader2 className="animate-spin" /></div> : filtered.length ? filtered.map((c) => {
              const actionState = getConversationActionState(c);
              const temperature = getCustomerTemperature(c);
              const active = selectedPhone === (c.phone || c.id);
              const slaInfo = getConversationSlaInfo(c, slaNowMs);
              return (
              <button key={c.phone || c.id} onClick={() => setSelectedPhone(c.phone || c.id)} className={cn('w-full text-right rounded-2xl p-4 border transition group', selectedPhone === (c.phone || c.id) ? 'bg-slate-50 border border-slate-200 text-slate-900 text-white border-slate-900 shadow-md' : 'bg-white hover:bg-slate-50 border-slate-100')}>
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
                  <span className={cn('px-2 py-1 rounded-full text-[10px] font-black', active ? 'bg-white/10 text-white border border-white/10' : temperature.className)} title={temperature.hint}>{temperature.label}</span>
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

        <section className="rounded-[1.5rem] bg-white border border-slate-100 shadow-md overflow-hidden flex flex-col min-h-[78vh] xl:min-h-[820px]">
          {selected ? (
            <>
              <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-l from-white to-slate-50">
                <div>
                  <div className="text-xl font-black flex items-center gap-2"><MessageCircle className="text-emerald-600" /> {selected.customerName || 'عميل واتساب'}</div>
                  <div className="text-sm text-slate-500 mt-1 direction-ltr text-left">+{selected.phone}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black', actionStateClass(selectedActionState.tone))} title={selectedActionState.hint}>{selectedActionState.label}</span>
                    <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-black', selectedTemperature.className)} title={selectedTemperature.hint}>حرارة العميل: {selectedTemperature.label}</span>
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

              <div className="border-b border-slate-100 bg-white px-5 py-3">
                <div className={cn('mb-3 rounded-3xl border p-4', selectedTempTimeline.alert ? 'border-rose-100 bg-rose-50' : 'border-slate-100 bg-slate-50')}>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <div className="text-[11px] font-black text-slate-500">خط زمني لحرارة العميل · تحليل من الداتا الموجودة فقط</div>
                      <div className="mt-1 text-sm font-black text-slate-900">الحرارة الآن {selectedTempTimeline.last}/100 · العميل {selectedTempTimeline.trend}</div>
                    </div>
                    {selectedTempTimeline.alert && <span className="rounded-full bg-rose-600 px-3 py-1 text-xs font-black text-white">إنذار قبل الغضب</span>}
                  </div>
                  <div className="mt-3 flex items-end gap-2 overflow-x-auto pb-1">
                    {selectedTempTimeline.points.map((point) => (
                      <div key={point.id} className="min-w-[54px] text-center">
                        <div className={cn('mx-auto w-4 rounded-full', point.score >= 75 ? 'bg-rose-500' : point.score >= 55 ? 'bg-amber-400' : 'bg-emerald-400')} style={{ height: `${Math.max(18, Math.round(point.score * 0.72))}px` }} />
                        <div className="mt-1 text-[10px] font-bold text-slate-400">{point.direction === 'outbound' ? 'رد' : 'عميل'}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center rounded-3xl border border-emerald-100 bg-gradient-to-l from-emerald-50 to-white p-4">
                  <div>
                    <div className="flex items-center gap-2 text-[11px] font-black text-emerald-700">
                      <Sparkles size={14} />
                      <span>تشخيص المحادثة قبل الرد</span>
                    </div>
                    <div className="mt-1 text-sm font-black text-slate-900">
                      {selectedTemperature.label} · {selectedActionState.label || 'محادثة طبيعية'} · {selectedSlaInfo?.label || 'لا يوجد انتظار حرج'}
                    </div>
                    <p className="mt-1 text-xs font-bold leading-6 text-slate-500">
                      {selectedSmartReplies[0]?.meta || selectedActionState.hint || 'اختر ردًا ذكيًا أو اكتب ردك بنفسك حسب سياق العميل.'}
                    </p>
                  </div>
                  {selectedSmartReplies[0] && (
                    <button
                      type="button"
                      onClick={() => applySmartReply(selectedSmartReplies[0])}
                      className="rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white hover:bg-slate-800 transition"
                    >
                      اعتمد أقوى رد
                    </button>
                  )}
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
                      <button onClick={startNewQuickReply} className="shrink-0 rounded-2xl bg-slate-900 hover:bg-slate-50 border border-slate-200 text-slate-800 text-white px-3 py-2 text-xs font-black flex items-center gap-1"><Plus size={14} /> إضافة</button>
                    </div>
                  </div>

                  {selectedSmartReplies.length > 0 && (
                    <div className="rounded-3xl border border-emerald-100 bg-white p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-700"><Sparkles size={14} /> ردود ذكية حسب العميل</div>
                        <span className="text-[10px] font-black text-slate-400">اضغط على التصنيف لعرض الرسالة كاملة</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                        {selectedSmartReplies.map((item) => (
                          <button key={item.id} type="button" onClick={() => toggleSmartReply(item)} className={cn('shrink-0 rounded-2xl border px-3 py-2 text-right transition shadow-sm', activeSmartReplyId === item.id ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-slate-50 border-slate-100 text-slate-700 hover:bg-white')}>
                            <div className="text-xs font-black">{item.title}</div>
                            <div className="mt-0.5 max-w-[180px] truncate text-[10px] font-bold text-slate-400">{item.meta}</div>
                          </button>
                        ))}
                      </div>
                      {activeSmartReply && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <div className="text-xs font-black text-slate-800">{activeSmartReply.title}</div>
                            <button type="button" onClick={() => applySmartReply(activeSmartReply)} className="rounded-xl bg-slate-900 px-3 py-1.5 text-[11px] font-black text-white hover:bg-slate-800">اعتماد الرد</button>
                          </div>
                          <div className="whitespace-pre-wrap text-xs font-bold leading-6 text-slate-600">{activeSmartReply.text}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {quickReplyEditorOpen && (
                    <div ref={quickReplyEditorRef} className="rounded-3xl bg-white border border-slate-100 p-3 space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-[180px_minmax(0,1fr)] gap-2">
                        <input ref={quickReplyTitleInputRef} value={quickReplyForm.title} onChange={(e) => { setQuickReplyForm((prev) => ({ ...prev, title: e.target.value })); if (quickReplyFormError) setQuickReplyFormError(''); }} placeholder="اسم الزر" className={cn('rounded-2xl border bg-slate-50 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm', quickReplyFormError && !quickReplyForm.title.trim() ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200')} />
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
                  <button onClick={() => sendReply()} disabled={sending || !replyText.trim()} className="h-14 md:h-[96px] px-7 rounded-3xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-black shadow-sm border border-slate-200 shadow-emerald-200 transition flex items-center justify-center gap-2"><Send size={18} /> إرسال</button>
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
