import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Search, PlusCircle, Users, Package, PieChart, Sparkles, Zap, TrendingUp, X, ArrowRight, Target, Truck, Activity, DollarSign, ShoppingBag, FileText, ShieldCheck, BrainCircuit, Award, Clock3, AlertTriangle, CheckCircle2, Wallet, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { heritageMotion } from '../lib/heritageMotion';
import { hasProductImage } from '../lib/sharedBusinessContract';
import { appendLocalLedgerEvent, createLedgerEvent } from '../lib/alturathLedger';
import { cn, normalizeArabic, normalizeArabicNumerals, formatKuwaitiDateOnly } from '../lib/utils';
import { getProductQualityReport } from '../lib/command-quality';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, payload?: { search?: string, exactId?: string, scrollTarget?: string, openModal?: boolean, supplierId?: string }) => void;
  data: any;
  userRole: 'admin' | 'partner';
}

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
  tags?: string[];
  roles?: string[];
};

type CommandAnswer = {
  title: string;
  value: string;
  subtitle?: string;
  details?: string[];
  actionLabel?: string;
  action?: () => void;
  tone?: 'slate' | 'emerald' | 'amber' | 'rose' | 'blue';
};

const clean = (value?: string) => {
  const normalized = normalizeArabic(String(value || '')).toLowerCase().trim();
  // Robustly remove punctuation to allow matches like "سداد المورد محمد!"
  return normalized.replace(/[.,،؛!؟]/g, '');
};
const cleanDigits = (value?: string) => String(value || '').replace(/\D/g, '');
const splitWords = (value?: string) => clean(value).split(/\s+/).filter(Boolean);
const spotlightKeywordGroups = {
  invoices: ['فاتورة', 'فواتير', 'الفواتير', 'سجل'],
  orders: ['طلب', 'طلبات', 'الطلبات'],
  failed: ['فاشل', 'فاشله', 'فاشلة', 'فشل', 'فاشلين'],
  supplierPay: ['سداد', 'دفع', 'حواله', 'حوالة', 'تحويل'],
  products: ['منتج', 'منتجات', 'صنف', 'اصناف', 'أصناف'],
  customers: ['عميل', 'عملاء', 'زبون', 'زباين'],
  missingImages: ['بدون صور', 'صور ناقصه', 'صور ناقصة', 'ما عندها صور'],
  area: ['منطقة', 'منطقه', 'السالمية', 'سالمية', 'حولي', 'الجابرية', 'مشرف', 'بيان', 'الرميثية', 'الفروانية', 'الأحمدي', 'احمدي'],
};

const removeWords = (value: string, words: string[]) => {
  let next = clean(value);
  words.forEach((word) => {
    next = next.replace(new RegExp(`(^|\\s)${clean(word)}(?=\\s|$)`, 'g'), ' ');
  });
  return next.replace(/\\s+/g, ' ').trim();
};

const getKuwaitiSearchTerm = (query: string, words: string[]) => removeWords(query, words) || clean(query);
const includesAny = (value: string, words: string[]) => words.some((word) => clean(value).includes(clean(word)));
const safeArray = (value: any) => Array.isArray(value) ? value : [];
const getAreaText = (item: any) => clean([
  item?.area, item?.region, item?.regionName, item?.zone,
  item?.address?.area, item?.address?.region, item?.address?.regionName,
  item?.deliveryAddress?.area, item?.deliveryAddress?.region,
].join(' '));
const getItemsText = (item: any) => clean(safeArray(item?.items || item?.products).map((x: any) => [x?.name, x?.productName, x?.title].join(' ')).join(' '));
const commandSearchText = (cmd: CommandItem) => clean([cmd.label, cmd.hint, cmd.category, ...(cmd.tags || [])].join(' '));
const commandScore = (cmd: CommandItem, query: string) => {
  const q = clean(query);
  if (!q) return 1;
  const qDigits = cleanDigits(query);
  const haystack = commandSearchText(cmd);
  const haystackDigits = cleanDigits([cmd.label, cmd.hint, ...(cmd.tags || [])].join(' '));
  
  // BOOST for Smart Actions (Dynamic categories often start with الإجراءات)
  let scoreAdjust = 0;
  if (cmd.category === 'إجراءات مالية ذكية') {
    scoreAdjust = 200; // Force them to the top if they match even a bit
  }

  if (clean(cmd.label) === q) return 100 + scoreAdjust;
  if (clean(cmd.label).startsWith(q)) return 80 + scoreAdjust;
  if (qDigits && haystackDigits.includes(qDigits)) return 78 + scoreAdjust;
  if (haystack.includes(q)) return 60 + scoreAdjust;
  const words = splitWords(q);
  const matches = words.filter(w => haystack.includes(w)).length;
  return matches ? (20 + matches * 8 + scoreAdjust) : 0;
};


const buildRescuePlanDetails = (data: any) => {
  const orders = safeArray(data?.orders);
  const invoices = safeArray(data?.invoices).filter((inv: any) => !inv?.isDeleted);
  const customers = safeArray(data?.customers);
  const products = safeArray(data?.products);
  const failedOrders = orders.filter((order: any) => isFailedText(order?.paymentStatus || order?.status)).length;
  const pendingOrders = orders.filter((order: any) => isPendingText(order?.paymentStatus || order?.status)).length;
  const staleCustomers = customers.filter((c: any) => daysIdle(c?.lastOrderDate || c?.lastActive) >= 21 && num(c?.totalSpent) > 0).length;
  const missingVisuals = products.filter((p: any) => !hasProductImage(p) && p?.isActive !== false).length;
  const todaysSales = invoices.filter((inv: any) => {
    const t = new Date(inv?.date || inv?.createdAt || 0).getTime();
    if (!Number.isFinite(t)) return false;
    return new Date(t).toDateString() === new Date().toDateString();
  }).reduce((sum: number, inv: any) => sum + invoiceTotal(inv), 0);
  const items = [
    failedOrders > 0 ? `أوقف نزيف الطلبات الفاشلة: ${failedOrders} طلب يحتاج مراجعة.` : '',
    pendingOrders > 0 ? `حسم الطلبات المعلقة: ${pendingOrders} طلب بانتظار قرار.` : '',
    staleCustomers > 0 ? `استرجاع العملاء الباردين: ${staleCustomers} عميل غائب أكثر من 21 يوم.` : '',
    missingVisuals > 0 ? `رفع جودة المنيو: ${missingVisuals} صنف نشط بدون صورة.` : '',
    todaysSales <= 0 ? 'مبيعات اليوم غير واضحة: راجع مركز القيادة قبل أي حملة.' : '',
  ].filter(Boolean);
  return items.slice(0, 3);
};

const money = (value: any) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(3) : '0.000';
};

const isPaidText = (value: any) => {
  const text = clean(value);
  return text.includes('paid') || text.includes('تم الدفع') || text.includes('مدفوع') || text.includes('مدفوعه');
};

const isFailedText = (value: any) => {
  const text = clean(value);
  return text.includes('failed') || text.includes('declined') || text.includes('فشل') || text.includes('فشلت');
};

const isPendingText = (value: any) => {
  const text = clean(value);
  return !text || text.includes('pending') || text.includes('بانتظار') || text.includes('انتظار') || text.includes('جديد');
};


const num = (value: any) => {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
};

const itemName = (item: any) => String(item?.name || item?.productName || item?.title || '').trim();
const itemQty = (item: any) => num(item?.quantity || item?.qty || 1) || 1;
const itemUnitPrice = (item: any) => num(item?.unitPrice ?? item?.price ?? item?.salePrice ?? item?.productPrice ?? item?.amount);
const itemTotal = (item: any, fallbackUnitPrice = 0) => {
  const explicitTotal = num(item?.total ?? item?.lineTotal ?? item?.totalPrice ?? item?.subtotal);
  if (explicitTotal > 0) return explicitTotal;
  const unitPrice = itemUnitPrice(item) || num(fallbackUnitPrice);
  return unitPrice * itemQty(item);
};
const invoiceTotal = (invoice: any) => num(invoice?.totalAmount ?? invoice?.total ?? invoice?.amount);
const orderTotal = (order: any) => num(order?.total ?? order?.totalAmount ?? order?.amount);
const isLowIntent = (value: string) => value.includes('اقل') || value.includes('أقل') || value.includes('اخفض') || value.includes('أخفض') || value.includes('ادنى') || value.includes('أدنى') || value.includes('اضعف') || value.includes('أضعف');
const isHighIntent = (value: string) => value.includes('اعلى') || value.includes('أعلى') || value.includes('اكبر') || value.includes('أكبر') || value.includes('افضل') || value.includes('أفضل') || value.includes('اغلى') || value.includes('أغلى');

const buildCustomerStats = (data: any) => {
  const byKey = new Map<string, any>();
  const aliasToKey = new Map<string, string>();
  const totalsLocked = new Set<string>();

  const aliasesFor = (...values: any[]) => values
    .map((value) => String(value || '').trim())
    .filter(Boolean);

  const resolveKey = (...values: any[]) => {
    const aliases = aliasesFor(...values);
    const existing = aliases.map((alias) => aliasToKey.get(alias)).find(Boolean);
    return existing || aliases[0] || '';
  };

  const rememberAliases = (key: string, ...values: any[]) => {
    aliasesFor(key, ...values).forEach((alias) => aliasToKey.set(alias, key));
  };

  const setLastOrderDate = (current: any, date: any) => {
    if (!date) return;
    const currentTime = current.lastOrderDate ? new Date(current.lastOrderDate).getTime() : 0;
    const nextTime = new Date(date).getTime();
    if (!current.lastOrderDate || (Number.isFinite(nextTime) && nextTime > currentTime)) current.lastOrderDate = date;
  };

  safeArray(data?.customers).forEach((customer: any) => {
    const key = resolveKey(customer?.id, customer?.phone, customer?.name);
    if (!key) return;
    rememberAliases(key, customer?.id, customer?.phone, customer?.name);
    const hasStoredTotals = customer?.totalSpent !== undefined || customer?.totalOrders !== undefined;
    byKey.set(key, {
      id: customer?.id || key,
      name: customer?.name || customer?.phone || 'عميل',
      phone: customer?.phone || '',
      totalSpent: num(customer?.totalSpent),
      totalOrders: num(customer?.totalOrders),
      lastOrderDate: customer?.lastOrderDate || customer?.lastActive || '',
    });
    if (hasStoredTotals) totalsLocked.add(key);
  });

  const invoiceStats = new Map<string, any>();
  const orderStats = new Map<string, any>();

  const addTxn = (map: Map<string, any>, source: any, amount: any, date: any) => {
    const key = resolveKey(source?.customerId, source?.customerPhone, source?.phone, source?.customerName);
    if (!key) return;
    const current = map.get(key) || {
      id: source?.customerId || key,
      name: source?.customerName || source?.customerPhone || source?.phone || 'عميل',
      phone: source?.customerPhone || source?.phone || '',
      totalSpent: 0,
      totalOrders: 0,
      lastOrderDate: '',
    };
    current.totalSpent += num(amount);
    current.totalOrders += 1;
    setLastOrderDate(current, date);
    map.set(key, current);
    rememberAliases(key, source?.customerId, source?.customerPhone, source?.phone, source?.customerName);
  };

  safeArray(data?.invoices)
    .filter((inv: any) => !inv?.isDeleted)
    .forEach((inv: any) => addTxn(invoiceStats, inv, inv?.totalAmount || inv?.total, inv?.date || inv?.createdAt));

  safeArray(data?.orders)
    .forEach((order: any) => addTxn(orderStats, order, order?.total || order?.totalAmount, order?.createdAt || order?.date || order?.updatedAt));

  const mergeComputed = (key: string, stats: any) => {
    if (!key || !stats || totalsLocked.has(key)) return;
    const current = byKey.get(key) || { id: stats.id || key, name: stats.name || 'عميل', phone: stats.phone || '', totalSpent: 0, totalOrders: 0, lastOrderDate: '' };
    current.id = current.id || stats.id || key;
    current.name = current.name && current.name !== 'عميل' ? current.name : stats.name;
    current.phone = current.phone || stats.phone || '';
    current.totalSpent = num(stats.totalSpent);
    current.totalOrders = num(stats.totalOrders);
    setLastOrderDate(current, stats.lastOrderDate);
    byKey.set(key, current);
  };

  // تجنب الدبل: إذا كانت بيانات العميل فيها إجمالي محفوظ نستخدمه كما هو.
  // وإذا ما عنده إجمالي، نفضل الفواتير كمصدر مالي، ونستخدم الطلبات فقط عند عدم وجود فواتير لنفس العميل.
  invoiceStats.forEach((stats, key) => mergeComputed(key, stats));
  orderStats.forEach((stats, key) => {
    if (!invoiceStats.has(key)) mergeComputed(key, stats);
  });

  return Array.from(byKey.values()).sort((a, b) => num(b.totalSpent) - num(a.totalSpent));
};

const buildProductStats = (data: any) => {
  const byName = new Map<string, any>();
  const productLookup = new Map<string, any>();
  safeArray(data?.products).forEach((product: any) => {
    const key = String(product?.id || product?.name || '').trim();
    const nameKey = clean(product?.name);
    if (key) productLookup.set(key, product);
    if (nameKey) productLookup.set(nameKey, product);
    if (!key) return;
    byName.set(key, { id: product?.id, name: product?.name || 'منتج', quantity: 0, sales: 0, category: product?.category || '' });
  });
  const addItem = (item: any) => {
    const key = String(item?.productId || itemName(item) || '').trim();
    if (!key) return;
    const matchedProduct = productLookup.get(key) || productLookup.get(clean(itemName(item))) || null;
    const current = byName.get(key) || { id: item?.productId || matchedProduct?.id || key, name: matchedProduct?.name || itemName(item) || 'منتج', quantity: 0, sales: 0, category: matchedProduct?.category || '' };
    current.quantity += itemQty(item);
    current.sales += itemTotal(item, matchedProduct?.price ?? matchedProduct?.salePrice ?? matchedProduct?.amount ?? 0);
    byName.set(key, current);
  };
  safeArray(data?.invoices).filter((inv: any) => !inv?.isDeleted).forEach((inv: any) => safeArray(inv?.items).forEach(addItem));
  safeArray(data?.orders).forEach((order: any) => safeArray(order?.items || order?.products).forEach(addItem));
  return Array.from(byName.values()).filter((x) => x.quantity || x.sales).sort((a, b) => num(b.quantity) - num(a.quantity));
};

const daysIdle = (value: any) => {
  const time = new Date(value || 0).getTime();
  if (!time || !Number.isFinite(time)) return 0;
  return Math.max(0, Math.floor((Date.now() - time) / (1000 * 60 * 60 * 24)));
};

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onNavigate, data, userRole }) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const instantAnswer = useMemo<CommandAnswer | null>(() => {
    const q = clean(deferredQuery);
    if (!q) return null;
    const quality = getProductQualityReport(data);
    const customers = buildCustomerStats(data);
    const products = buildProductStats(data);
    const orders = safeArray(data?.orders);
    const invoices = safeArray(data?.invoices).filter((inv: any) => !inv?.isDeleted);
    const suppliers = safeArray(data?.suppliers);
    const hasTop = isHighIntent(q);
    const hasLow = isLowIntent(q);
    const pendingOrders = orders.filter((order: any) => isPendingText(order?.paymentStatus || order?.status)).length;
    const failedOrders = orders.filter((order: any) => isFailedText(order?.paymentStatus || order?.status)).length;
    const paidOrders = orders.filter((order: any) => isPaidText(order?.paymentStatus || order?.status)).length;
    const paidInvoices = invoices.filter((inv: any) => isPaidText(inv?.paymentStatus || inv?.status) || inv?.paymentStatus === undefined);
    const totalSales = paidInvoices.reduce((sum: number, inv: any) => sum + invoiceTotal(inv), 0);
    const topInvoice = [...invoices].sort((a: any, b: any) => invoiceTotal(b) - invoiceTotal(a))[0];
    const lowInvoice = [...invoices].filter((inv: any) => invoiceTotal(inv) > 0).sort((a: any, b: any) => invoiceTotal(a) - invoiceTotal(b))[0];
    const lowCustomer = [...customers].filter((customer: any) => num(customer.totalSpent) > 0).sort((a: any, b: any) => num(a.totalSpent) - num(b.totalSpent))[0];
    const weakProduct = [...products].filter((product: any) => num(product.quantity) > 0 || num(product.sales) > 0).sort((a: any, b: any) => (num(a.quantity) + num(a.sales)) - (num(b.quantity) + num(b.sales)))[0];
    const topSupplierDebt = [...suppliers].sort((a: any, b: any) => num(b?.balance) - num(a?.balance))[0];
    const absentCustomer = [...customers]
      .map((customer: any) => ({ ...customer, idleDays: daysIdle(customer?.lastOrderDate || customer?.lastActive) }))
      .filter((customer: any) => customer.idleDays >= 21 && num(customer.totalSpent) > 0)
      .sort((a: any, b: any) => (num(b.totalSpent) + b.idleDays) - (num(a.totalSpent) + a.idleDays))[0];
    const wantsStats = q.includes('احص') || q.includes('إحص') || q.includes('ملخص') || q.includes('تقرير') || q.includes('كم') || q.includes('عدد') || q.includes('عطني');

    if (q.includes('انقاذ') || q.includes('إنقاذ') || q.includes('خطة انقاذ') || q.includes('خطة إنقاذ')) {
      const details = buildRescuePlanDetails(data);
      return {
        title: 'خطة إنقاذ اليوم',
        value: details.length ? 'أخطر 3 قرارات' : 'الوضع مستقر',
        subtitle: 'تحليل مباشر من الداتا الموجودة فقط، بدون ذكاء اصطناعي وبدون تنفيذ تلقائي.',
        details: details.length ? details : ['لا توجد أولوية خطرة واضحة الآن.', 'راجع مركز القيادة للمتابعة الهادئة.'],
        actionLabel: 'افتح مركز القيادة',
        action: () => onNavigate('dashboard'),
        tone: details.length ? 'rose' : 'emerald',
      };
    }

    if (q.includes('تطوير') || q.includes('طور') || q.includes('نووي') || q.includes('زلزال') || q.includes('تسونامي') || q.includes('ابهار') || q.includes('إبهار')) {
      return {
        title: 'خارطة إبهار تنفيذية',
        value: 'ابدأ من مركز القيادة',
        subtitle: 'الكوماند يفتح لك عقل النظام لاختصار القرار بدل إضافة شاشة جديدة.',
        details: [
          `جودة المنيو: ${quality.score}%`,
          failedOrders > 0 ? `أولوية تشغيل: ${failedOrders} فشل دفع` : pendingOrders > 0 ? `أولوية تشغيل: ${pendingOrders} بانتظار الدفع` : 'التشغيل مستقر الآن',
          absentCustomer ? `فرصة ولاء: ${absentCustomer.name || absentCustomer.phone}` : 'لا يوجد عميل غائب واضح للتركيز'
        ],
        actionLabel: 'افتح عقل النظام',
        action: () => onNavigate('dashboard', { exactId: 'intelligence' }),
        tone: quality.score >= 72 ? 'emerald' : 'amber',
      };
    }

    if ((hasTop && (q.includes('عميل') || q.includes('زبون'))) || q.includes('اكثر عميل') || q.includes('أكثر عميل')) {
      const top = customers[0];
      if (!top) return { title: 'أعلى عميل', value: 'لا توجد بيانات كافية', subtitle: 'لم أجد عملاء أو فواتير كافية للحساب.', tone: 'slate' };
      return {
        title: 'أعلى عميل حاليًا',
        value: top.name,
        subtitle: `${money(top.totalSpent)} د.ك · ${top.totalOrders || 0} طلب`,
        details: [top.phone ? `الهاتف: ${top.phone}` : '', top.lastOrderDate ? `آخر طلب: ${formatKuwaitiDateOnly(top.lastOrderDate)}` : ''].filter(Boolean),
        actionLabel: 'افتح العميل',
        action: () => onNavigate('customers', { exactId: top.id, search: top.name || top.phone }),
        tone: 'emerald',
      };
    }

    if ((hasTop && (q.includes('منتج') || q.includes('صنف'))) || q.includes('اكثر منتج') || q.includes('أكثر منتج')) {
      const top = products[0];
      if (!top) return { title: 'أعلى منتج', value: 'لا توجد مبيعات كافية', subtitle: 'لم أجد عناصر مباعة تكفي للحساب.', tone: 'slate' };
      return {
        title: 'أعلى منتج بالحركة',
        value: top.name,
        subtitle: `${Math.round(top.quantity)} قطعة · ${money(top.sales)} د.ك`,
        details: [top.category ? `التصنيف: ${top.category}` : 'الترتيب مبني على الكمية المباعة.'].filter(Boolean),
        actionLabel: 'افتح المنتج',
        action: () => onNavigate('products', { exactId: top.id, search: top.name }),
        tone: 'blue',
      };
    }

    if (q.includes('جودة') || q.includes('منيو') || q.includes('واجهه') || q.includes('واجهة') || q.includes('بصري') || q.includes('بصرية')) {
      const visual = quality.signals.find((item) => item.id === 'missing-visual');
      return {
        title: 'جودة عرض المنيو',
        value: `${quality.score}%`,
        subtitle: quality.decision,
        details: [`درجة عامة لكل المنيو`, `الواجهة البصرية: ${visual?.count || 0} منتج`],
        actionLabel: 'افتح الأولويات',
        action: () => onNavigate('products', { scrollTarget: 'product-quality-board' }),
        tone: quality.score >= 72 ? 'emerald' : 'amber',
      };
    }

    if (q.includes('ذهب') || q.includes('مدفون') || q.includes('فرصه') || q.includes('فرصة')) {
      const gem = quality.signals.find((item) => item.id === 'hidden-gems');
      const first = gem?.products?.[0];
      return {
        title: 'ذهب مدفون',
        value: `${gem?.count || 0} منتج`,
        subtitle: first ? `أول منتج للتركيز: ${first.name}` : 'لا توجد فرصة مدفونة واضحة الآن.',
        details: ['الرقم هنا عدد منتجات، وليس نسبة.', quality.proof],
        actionLabel: first ? 'افتح المنتج' : 'افتح جودة المنيو',
        action: () => onNavigate('products', first ? { exactId: first.id, search: first.name } : { scrollTarget: 'product-quality-board' }),
        tone: 'emerald',
      };
    }

    if (q.includes('بدون صور') || q.includes('بلا صور') || q.includes('صور ناقص') || q.includes('ناقصه صور') || q.includes('ناقصة صور')) {
      const visual = quality.signals.find((item) => item.id === 'missing-visual');
      const first = visual?.products?.[0];
      return {
        title: 'منتجات تحتاج صورة',
        value: `${visual?.count || 0} منتج`,
        subtitle: first ? `ابدأ بـ: ${first.name}` : 'لا توجد مشكلة صور واضحة الآن.',
        details: ['الرقم عدد منتجات تحتاج انتباهًا بصريًا.'],
        actionLabel: first ? 'افتح المنتج' : 'افتح المنتجات',
        action: () => onNavigate('products', first ? { exactId: first.id, search: first.name } : {}),
        tone: 'amber',
      };
    }

    if (q.includes('منو محتاج') || q.includes('مين محتاج') || q.includes('محتاج متابعة') || q.includes('اتابع اليوم') || q.includes('أتابع اليوم')) {
      const targetText = failedOrders > 0
        ? `${failedOrders} طلب فشل دفع`
        : pendingOrders > 0
          ? `${pendingOrders} طلب بانتظار الدفع`
          : absentCustomer
            ? `${absentCustomer.name || absentCustomer.phone}`
            : topSupplierDebt && num(topSupplierDebt.balance) > 0
              ? `${topSupplierDebt.name || 'مورد'}`
              : 'لا توجد متابعة حرجة';
      return {
        title: 'من يحتاج متابعة اليوم؟',
        value: targetText,
        subtitle: failedOrders > 0 ? 'ابدأ بفشل الدفع لأنه أعلى مخاطرة تشغيلية.' : pendingOrders > 0 ? 'المعلق يحتاج إغلاق بهدوء.' : absentCustomer ? `عميل غائب ${absentCustomer.idleDays} يوم.` : 'الوضع هادئ حسب البيانات الحالية.',
        details: [
          failedOrders ? `فشل الدفع: ${failedOrders}` : `بانتظار الدفع: ${pendingOrders}`,
          absentCustomer ? `ولاء: ${absentCustomer.name || absentCustomer.phone}` : topSupplierDebt ? `مورد: ${money(topSupplierDebt.balance)} د.ك` : 'لا توجد إشارة إضافية'
        ],
        actionLabel: failedOrders || pendingOrders ? 'افتح الطلبات' : absentCustomer ? 'افتح العملاء' : topSupplierDebt ? 'افتح المورد' : 'افتح لوحة القيادة',
        action: () => failedOrders || pendingOrders
          ? onNavigate('orders', { search: failedOrders ? 'فشل' : 'بانتظار' })
          : absentCustomer
            ? onNavigate('customers', { exactId: absentCustomer.id, search: absentCustomer.name || absentCustomer.phone })
            : topSupplierDebt
              ? onNavigate('suppliers-audit', { supplierId: topSupplierDebt.id, openModal: true })
              : onNavigate('dashboard', { exactId: 'pulse' }),
        tone: failedOrders ? 'rose' : pendingOrders || topSupplierDebt ? 'amber' : absentCustomer ? 'blue' : 'emerald',
      };
    }

    if (q.includes('اخطر') || q.includes('أخطر') || q.includes('الخطر') || q.includes('خطر اليوم') || q.includes('شنو الخطر')) {
      const risk = failedOrders > 0
        ? { title: 'أخطر شيء الآن', value: `${failedOrders} فشل دفع`, subtitle: 'هذا أعلى خطر لأنه يمس إغلاق الطلب.', target: 'orders', search: 'فشل', tone: 'rose' as const }
        : pendingOrders > 0
          ? { title: 'أخطر شيء الآن', value: `${pendingOrders} بانتظار الدفع`, subtitle: 'هذا خطر تأخير إغلاق الطلبات.', target: 'orders', search: 'بانتظار', tone: 'amber' as const }
          : quality.status === 'critical'
            ? { title: 'أخطر شيء الآن', value: quality.title, subtitle: quality.decision, target: 'products', search: '', tone: 'rose' as const }
            : topSupplierDebt && num(topSupplierDebt.balance) > 1000
              ? { title: 'أخطر شيء الآن', value: `${money(topSupplierDebt.balance)} د.ك مورد`, subtitle: topSupplierDebt.name || 'مديونية مورد عالية', target: 'suppliers-audit', search: '', tone: 'amber' as const }
              : { title: 'أخطر شيء الآن', value: 'لا يوجد خطر حاد', subtitle: 'المؤشرات الأساسية مستقرة حسب البيانات المتاحة.', target: 'dashboard', search: '', tone: 'emerald' as const };
      return {
        title: risk.title,
        value: risk.value,
        subtitle: risk.subtitle,
        details: [quality.proof, failedOrders || pendingOrders ? `الدفع: ${paidOrders} مدفوع / ${pendingOrders} بانتظار / ${failedOrders} فشل` : quality.action],
        actionLabel: 'افتح مصدر الخطر',
        action: () => risk.target === 'orders'
          ? onNavigate('orders', { search: risk.search })
          : risk.target === 'products'
            ? onNavigate('products', { scrollTarget: 'product-quality-board' })
            : risk.target === 'suppliers-audit'
              ? onNavigate('suppliers-audit', { supplierId: topSupplierDebt?.id, openModal: true })
              : onNavigate('dashboard', { exactId: 'pulse' }),
        tone: risk.tone,
      };
    }

    if (q.includes('شنو اسوي') || q.includes('ماذا افعل') || q.includes('ماذا أفعل') || q.includes('قرار') || q.includes('ركز') || q.includes('أركز')) {
      const liveDecision = failedOrders > 0
        ? `ابدأ بفشل الدفع: ${failedOrders} طلب يحتاج متابعة`
        : pendingOrders > 0
          ? `أغلق المعلق: ${pendingOrders} طلب بانتظار الدفع`
          : quality.title;
      return {
        title: 'قرار الآن',
        value: liveDecision,
        subtitle: quality.decision,
        details: [quality.proof, quality.action],
        actionLabel: 'افتح نقطة التركيز',
        action: () => failedOrders || pendingOrders ? onNavigate('orders', { search: failedOrders ? 'فشل' : 'بانتظار' }) : onNavigate('products', { scrollTarget: 'product-quality-board' }),
        tone: failedOrders ? 'rose' : pendingOrders ? 'amber' : quality.status === 'critical' ? 'rose' : quality.status === 'watch' ? 'amber' : 'emerald',
      };
    }

    if (wantsStats || q.includes('كل شي') || q.includes('كل شيء')) {
      return {
        title: 'إحصائية فورية',
        value: `${money(totalSales)} د.ك`,
        subtitle: `${paidInvoices.length} فاتورة مدفوعة · ${orders.length} طلب · ${customers.length} عميل · ${products.length} منتج`,
        details: [
          failedOrders ? `فشل الدفع: ${failedOrders}` : pendingOrders ? `بانتظار الدفع: ${pendingOrders}` : `المدفوع: ${paidOrders}`,
          topInvoice ? `أغلى فاتورة: ${money(invoiceTotal(topInvoice))} د.ك` : 'لا توجد فواتير واضحة'
        ],
        actionLabel: 'افتح التقارير',
        action: () => onNavigate('reports'),
        tone: failedOrders ? 'rose' : pendingOrders ? 'amber' : 'emerald',
      };
    }

    if ((q.includes('دفع') || q.includes('مدفوع') || q.includes('لم يدفع') || q.includes('ما دفع') || q.includes('معلق') || q.includes('بانتظار')) && !q.includes('مورد') && !q.includes('سداد') && !q.includes('حوال') && !q.includes('تحويل')) {
      return {
        title: 'رادار الدفع',
        value: `${paidOrders} مدفوع`,
        subtitle: `${pendingOrders} بانتظار · ${failedOrders} فشل`,
        details: [
          topInvoice ? `أكبر قيمة مرتبطة بالفواتير: ${money(invoiceTotal(topInvoice))} د.ك` : 'لا توجد فاتورة أعلى واضحة',
          failedOrders ? 'الأولوية: متابعة الفشل بهدوء' : pendingOrders ? 'الأولوية: إغلاق المعلّق' : 'الوضع مستقر'
        ],
        actionLabel: failedOrders ? 'افتح الفاشل' : pendingOrders ? 'افتح المعلق' : 'افتح الطلبات',
        action: () => onNavigate('orders', { search: failedOrders ? 'فشل' : pendingOrders ? 'بانتظار' : 'تم الدفع' }),
        tone: failedOrders ? 'rose' : pendingOrders ? 'amber' : 'emerald',
      };
    }

    if (hasLow && (q.includes('عميل') || q.includes('زبون'))) {
      if (!lowCustomer) return { title: 'أقل عميل', value: 'لا توجد بيانات كافية', subtitle: 'ما لقيت عميل عنده إنفاق محسوب.', tone: 'slate' };
      return {
        title: 'أقل عميل بإنفاق محسوب',
        value: lowCustomer.name || lowCustomer.phone || 'عميل',
        subtitle: `${money(lowCustomer.totalSpent)} د.ك · ${lowCustomer.totalOrders || 0} طلب`,
        details: [lowCustomer.phone ? `الهاتف: ${lowCustomer.phone}` : '', 'مفيد لحملة رفع متوسط الطلب.'].filter(Boolean),
        actionLabel: 'افتح العميل',
        action: () => onNavigate('customers', { exactId: lowCustomer.id, search: lowCustomer.name || lowCustomer.phone }),
        tone: 'amber',
      };
    }

    if (hasLow && (q.includes('منتج') || q.includes('صنف'))) {
      if (!weakProduct) return { title: 'أضعف منتج', value: 'لا توجد مبيعات كافية', subtitle: 'ما لقيت حركة كافية للمقارنة.', tone: 'slate' };
      return {
        title: 'أضعف منتج بالحركة',
        value: weakProduct.name,
        subtitle: `${Math.round(weakProduct.quantity || 0)} قطعة · ${money(weakProduct.sales)} د.ك`,
        details: [weakProduct.category ? `التصنيف: ${weakProduct.category}` : '', 'راجعه: صورة، سعر، أو مكانه في المنيو.'].filter(Boolean),
        actionLabel: 'افتح المنتج',
        action: () => onNavigate('products', { exactId: weakProduct.id, search: weakProduct.name }),
        tone: 'amber',
      };
    }

    if (hasLow && (q.includes('فاتوره') || q.includes('فاتورة') || q.includes('مبيعات'))) {
      if (!lowInvoice) return { title: 'أقل فاتورة', value: 'لا توجد فواتير كافية', subtitle: 'ما لقيت قيمة فاتورة صالحة للمقارنة.', tone: 'slate' };
      return {
        title: 'أقل فاتورة بقيمة محسوبة',
        value: `${money(invoiceTotal(lowInvoice))} د.ك`,
        subtitle: lowInvoice.customerName || lowInvoice.customerPhone || `فاتورة ${lowInvoice.id || ''}`,
        details: [lowInvoice.date ? `التاريخ: ${formatKuwaitiDateOnly(lowInvoice.date)}` : '', 'مفيدة لفهم أقل سلة شراء.'].filter(Boolean),
        actionLabel: 'افتح الفاتورة',
        action: () => onNavigate('invoices-list', { exactId: lowInvoice.id, search: lowInvoice.id }),
        tone: 'blue',
      };
    }

    if (hasTop && (q.includes('فاتوره') || q.includes('فاتورة') || q.includes('مبيعات') || q.includes('اغلى') || q.includes('أغلى'))) {
      if (!topInvoice) return { title: 'أغلى فاتورة', value: 'لا توجد فواتير كافية', subtitle: 'ما لقيت فاتورة صالحة للمقارنة.', tone: 'slate' };
      return {
        title: 'أغلى فاتورة',
        value: `${money(invoiceTotal(topInvoice))} د.ك`,
        subtitle: topInvoice.customerName || topInvoice.customerPhone || `فاتورة ${topInvoice.id || ''}`,
        details: [topInvoice.date ? `التاريخ: ${formatKuwaitiDateOnly(topInvoice.date)}` : '', 'هذه أعلى قيمة ظاهرة في الفواتير.'].filter(Boolean),
        actionLabel: 'افتح الفاتورة',
        action: () => onNavigate('invoices-list', { exactId: topInvoice.id, search: topInvoice.id }),
        tone: 'emerald',
      };
    }

    if (q.includes('منو اتابع') || q.includes('منو أتابع') || q.includes('عميل غايب') || q.includes('غايب') || q.includes('استرجاع')) {
      if (!absentCustomer) return { title: 'متابعة العملاء', value: 'لا يوجد عميل غائب واضح', subtitle: 'لم أجد عميلًا بقيمة واضحة وغائبًا مدة كافية.', tone: 'emerald' };
      return {
        title: 'أول عميل للمتابعة',
        value: absentCustomer.name || absentCustomer.phone,
        subtitle: `غائب ${absentCustomer.idleDays} يوم · إنفاق ${money(absentCustomer.totalSpent)} د.ك`,
        details: [absentCustomer.phone ? `الهاتف: ${absentCustomer.phone}` : '', 'يفضل رسالة هادئة بدون ضغط.'].filter(Boolean),
        actionLabel: 'افتح العميل',
        action: () => onNavigate('customers', { exactId: absentCustomer.id, search: absentCustomer.name || absentCustomer.phone }),
        tone: 'blue',
      };
    }

    if (q.includes('رسالة') || q.includes('واتساب') || q.includes('اكتب له') || q.includes('كلم')) {
      const target = absentCustomer || customers[0];
      if (!target) return { title: 'رسالة جاهزة', value: 'لا يوجد عميل واضح', subtitle: 'اكتب اسم العميل أو رقمه في الكوماند.', tone: 'slate' };
      return {
        title: 'رسالة واتساب جاهزة',
        value: target.name || target.phone || 'عميل',
        subtitle: `حياك الله، مشتاقين لطلبك من التراث. إذا ودك نجهز لك شي مرتب اليوم، حاضر لك بكل سرور.`,
        details: [`سبب الاختيار: ${target.idleDays ? `غائب ${target.idleDays} يوم` : `إنفاق ${money(target.totalSpent)} د.ك`}`],
        actionLabel: 'افتح العميل',
        action: () => onNavigate('customers', { exactId: target.id, search: target.name || target.phone }),
        tone: 'emerald',
      };
    }

    if (q.includes('مورد') || q.includes('موردين') || q.includes('مديونية') || q.includes('سداد')) {
      if (!topSupplierDebt || num(topSupplierDebt.balance) <= 0) return { title: 'الموردين', value: 'لا توجد مديونية واضحة', subtitle: 'أرصدة الموردين تحت السيطرة حسب البيانات الحالية.', tone: 'emerald' };
      return {
        title: 'أول مورد للمراجعة',
        value: topSupplierDebt.name || 'مورد',
        subtitle: `الرصيد ${money(topSupplierDebt.balance)} د.ك`,
        details: ['افتح صفحة المراجعة قبل أي قرار سداد.'],
        actionLabel: 'افتح المورد',
        action: () => onNavigate('suppliers-audit', { supplierId: topSupplierDebt.id, openModal: true }),
        tone: num(topSupplierDebt.balance) > 1000 ? 'rose' : 'amber',
      };
    }

    if (q.includes('حلل') || q.includes('ذكي') || q.includes('اقترح') || q.includes('اقتراح')) {
      const hiddenGem = quality.signals.find((item) => item.id === 'hidden-gems')?.products?.[0];
      return {
        title: 'اقتراح ذكي فوري',
        value: hiddenGem ? `ادفع ${hiddenGem.name}` : quality.title,
        subtitle: hiddenGem ? 'منتج يستاهل مساحة أكبر لأنه فرصة مخفية.' : quality.decision,
        details: [quality.proof, quality.action],
        actionLabel: hiddenGem ? 'افتح المنتج' : 'افتح الأولويات',
        action: () => onNavigate('products', hiddenGem ? { exactId: hiddenGem.id, search: hiddenGem.name } : { scrollTarget: 'product-quality-board' }),
        tone: 'emerald',
      };
    }

    if (q.includes('فاشل') || q.includes('فشل') || q.includes('فاشلة')) {
      const failed = safeArray(data?.orders).filter((order: any) => isFailedText(order?.paymentStatus || order?.status)).length;
      return {
        title: 'طلبات الدفع الفاشلة',
        value: `${failed} طلب`,
        subtitle: failed ? 'هذه قراءة فورية من الطلبات الحالية.' : 'لا توجد طلبات فاشلة واضحة الآن.',
        actionLabel: 'افتح الطلبات',
        action: () => onNavigate('orders', { search: 'فشل' }),
        tone: failed ? 'rose' : 'emerald',
      };
    }

    const bestSignal =
      failedOrders > 0 ? { title: 'فهمت سؤالك كتنبيه تشغيلي', value: `${failedOrders} فشل دفع`, tone: 'rose' as const, actionSearch: 'فشل' } :
      pendingOrders > 0 ? { title: 'فهمت سؤالك كمتابعة طلبات', value: `${pendingOrders} بانتظار الدفع`, tone: 'amber' as const, actionSearch: 'بانتظار' } :
      customers[0] ? { title: 'فهمت سؤالك كبحث ذكي', value: customers[0].name || customers[0].phone || 'أفضل عميل', tone: 'emerald' as const, actionSearch: customers[0].name || customers[0].phone || '' } :
      products[0] ? { title: 'فهمت سؤالك كبحث منتج', value: products[0].name, tone: 'blue' as const, actionSearch: products[0].name || '' } :
      { title: 'فهمت عليك', value: 'لا توجد بيانات كافية', tone: 'slate' as const, actionSearch: q };

    return {
      title: bestSignal.title,
      value: bestSignal.value,
      subtitle: `قرأت: "${deferredQuery}" وربطتها بالبيانات المتاحة بدل تركها بدون نتيجة.`,
      details: [
        `مبيعات محسوبة: ${money(totalSales)} د.ك`,
        `طلبات: ${orders.length} · عملاء: ${customers.length} · منتجات: ${products.length}`
      ],
      actionLabel: q.includes('عميل') ? 'افتح العملاء' : q.includes('منتج') || q.includes('صنف') ? 'افتح المنتجات' : 'افتح الطلبات',
      action: () => q.includes('عميل')
        ? onNavigate('customers', { search: bestSignal.actionSearch || q })
        : q.includes('منتج') || q.includes('صنف')
          ? onNavigate('products', { search: bestSignal.actionSearch || q })
          : onNavigate('orders', { search: bestSignal.actionSearch || q }),
      tone: bestSignal.tone,
    };
  }, [deferredQuery, data, onNavigate]);

  const commands = useMemo<CommandItem[]>(() => {
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
    const pendingOrders = orders.filter((o: any) => isPendingText(o?.paymentStatus || o?.status)).length;
    const failedOrders = orders.filter((o: any) => isFailedText(o?.paymentStatus || o?.status)).length;
    const paidOrders = orders.filter((o: any) => isPaidText(o?.paymentStatus || o?.status)).length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayInvoices = invoices.filter((inv: any) => String(inv?.date || '').startsWith(todayKey));
    const todaySales = todayInvoices.reduce((sum: number, inv: any) => sum + Number(inv?.totalAmount || inv?.total || 0), 0);
    const productQuality = getProductQualityReport(data);

    const allTabs: CommandItem[] = [
      { id: 'dashboard-pulse', label: 'النبض التنفيذي', hint: 'مركز القيادة، ملخص اليوم، مؤشرات الإدارة', icon: <Activity />, category: 'خريطة التحكم الذكية', tags: ['مركز القيادة','داشبورد','الرئيسية','ملخص'], action: () => onNavigate('dashboard', { exactId: 'pulse' }), roles: ['admin'] },
      { id: 'dashboard-brain', label: 'عقل النظام', hint: 'التحليل، القرارات، التعلم، المخاطر، والاستراتيجية', icon: <BrainCircuit />, category: 'خريطة التحكم الذكية', tags: ['تعلم','مخاطر','توصيات','ذكاء','تحليل'], action: () => onNavigate('dashboard', { exactId: 'intelligence' }), roles: ['admin'] },
      { id: 'dashboard-profit', label: 'المالية وحماية الأرباح', hint: 'الربحية، الهامش، النزيف، وحماية الربح', icon: <DollarSign />, category: 'خريطة التحكم الذكية', tags: ['فلوس','أرباح','ربح','خسارة','هامش','تكاليف'], action: () => onNavigate('dashboard', { exactId: 'financials' }), roles: ['admin'] },
      { id: 'dashboard-suppliers', label: 'الموردين والتشغيل', hint: 'ذكاء الموردين ومراجعة المخاطر', icon: <Truck />, category: 'خريطة التحكم الذكية', tags: ['مورد','موردين','تفاوض','تشغيل','منتجات'], action: () => onNavigate('dashboard', { exactId: 'suppliers' }), roles: ['admin'] },
      { id: 'dashboard-customers', label: 'العملاء والولاء', hint: 'العملاء، نظام المكافآت والخصومات، والبطولات', icon: <Award />, category: 'خريطة التحكم الذكية', tags: ['عميل','عملاء','ولاء','كوبون','كوبونات','ديوانية'], action: () => onNavigate('dashboard', { exactId: 'customers' }), roles: ['admin'] },
      { id: 'dashboard-growth', label: 'النمو والمحتوى', hint: 'النمو، الحملات، والتوقع الموسمي واستوديو التراث الذكي', icon: <Target />, category: 'خريطة التحكم الذكية', tags: ['نمو','تسويق','حملات','محتوى','استوديو','موسم','مناخ'], action: () => onNavigate('dashboard', { exactId: 'growth' }), roles: ['admin'] },

      { id: 'invoices-list', label: 'سجل الفواتير', hint: 'فواتير وتقارير', icon: <FileText />, category: 'التشغيل اليومي', tags: ['فاتورة','فواتير','سجل','مبيعات'], action: () => onNavigate('invoices-list', {}), roles: ['partner', 'admin'] },
      { id: 'new-invoice', label: 'فاتورة جديدة', hint: 'إنشاء سريع', icon: <PlusCircle />, category: 'التشغيل اليومي', tags: ['فاتورة','جديدة','بيع','نقطة البيع'], action: () => onNavigate('new-invoice', {}), roles: ['admin', 'partner'] },
      { id: 'orders', label: 'طلبات الموقع', hint: 'حالات الدفع', icon: <ShoppingBag />, category: 'التشغيل اليومي', tags: ['طلب','طلبات','موقع','دفع'], action: () => onNavigate('orders', {}), roles: ['partner', 'admin'] },
      { id: 'reports', label: 'التقارير التنفيذية', hint: 'تفصيل مالي للأداء والمبيعات', icon: <PieChart />, category: 'التشغيل اليومي', action: () => onNavigate('reports', {}), roles: ['admin'] },

      { id: 'smart-studio', label: 'استوديو التراث الذكي', hint: 'رسائل الدعاية والتسويق', icon: <Zap />, category: 'النمو والمحتوى', action: () => onNavigate('smart-studio', {}), roles: ['admin', 'partner'] },
      { id: 'dashboard-rewards', label: 'نظام المكافآت والخصومات', hint: 'إدارة الولاء، الكوبونات، وقياس الربح', icon: <Sparkles />, category: 'العملاء والولاء', action: () => onNavigate('dashboard', { exactId: 'rewards' }), roles: ['admin'] },
      { id: 'dashboard-diwaniya', label: 'بطولات الديوانية', hint: 'النقاط والجوائز للبطولات', icon: <Users />, category: 'العملاء والولاء', action: () => onNavigate('dashboard', { exactId: 'diwaniya' }), roles: ['admin'] },

      { id: 'customers-page', label: 'بيانات العملاء', hint: 'بحث وتفاصيل', icon: <Users />, category: 'الإدارة الأساسية', action: () => onNavigate('customers', {}), roles: ['admin'] },
      { id: 'products-page', label: 'إدارة المنتجات', hint: 'الأسعار والتصنيفات', icon: <Package />, category: 'الإدارة الأساسية', action: () => onNavigate('products', {}), roles: ['admin'] },
      { id: 'product-quality-board', label: 'جودة المنيو', hint: `${productQuality.score}% · ${productQuality.proof}`, icon: <Target />, category: 'اقتراحات الآن', tags: ['جودة المنيو','Product Quality Board','منتجات ناقصة','ذهب مدفون','بدون صور'], action: () => onNavigate('products', { scrollTarget: 'product-quality-board' }), roles: ['admin'] },
      { id: 'suppliers-audit', label: 'الموردين والمراجعة', hint: 'تدقيق الموردين والمخاطر', icon: <Truck />, category: 'الإدارة الأساسية', action: () => onNavigate('suppliers-audit', {}), roles: ['admin'] },
      { id: 'expenses', label: 'المصروفات', hint: 'تسجيل ومراجعة', icon: <PieChart />, category: 'الإدارة الأساسية', action: () => onNavigate('expenses', {}), roles: ['admin'] },
      { id: 'settings', label: 'الإعدادات العامة', hint: 'هوية وتنبيهات وضبط', icon: <ShieldCheck />, category: 'الإدارة الأساسية', action: () => onNavigate('settings', {}), roles: ['admin'] },
      { id: 'ai', label: 'مساعد التراث الذكي', hint: 'مستشار مالي وتوصيات', icon: <Sparkles />, category: 'التراث الذكي', action: () => onNavigate('ai', {}), roles: ['admin', 'partner'] },
    ];
    const effectiveRole = userRole || 'admin';
    const mainTabs = allTabs.filter(tab => tab.roles?.includes(effectiveRole));

    const savedPresets: CommandItem[] = [
      { id: 'preset-rescue-plan', label: 'افتح لي خطة إنقاذ اليوم', hint: 'يعرض أخطر 3 قرارات من الداتا الحالية فقط', icon: <ShieldCheck />, category: 'أوامر محفوظة', tags: ['خطة انقاذ', 'خطة إنقاذ', 'انقاذ اليوم', 'اخطر قرارات'], action: () => setQuery('افتح لي خطة إنقاذ اليوم'), roles: ['admin'] },
    ];

    const deepLinks: CommandItem[] = [
      { id: 'growth-campaigns', label: 'مختبر الحملات التسويقية', hint: 'خطط مبيعات', icon: <TrendingUp />, category: 'اختصارات ذكية', tags: ['حملات', 'تسويقية', 'مبيعات'], action: () => onNavigate('growth-simulator', { scrollTarget: 'smart-campaigns' }) },
      { id: 'customers-retention', label: 'رادار استرجاع العملاء', hint: 'الغائبين والاحتفاظ', icon: <Users />, category: 'اختصارات ذكية', tags: ['استرجاع', 'غائبين', 'احتفاظ'], action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'retention-section' }) },
      { id: 'financial-guard', label: 'حارس الأرباح الحقيقية - رادار الدرع المالي', hint: 'تحليل الهوامش، الربح الحقيقي، النزيف، وحماية الربح', icon: <DollarSign />, category: 'اختصارات ذكية', tags: ['ارباح', 'هدر', 'صافي', 'ربح', 'درع', 'رادار', 'حارس', 'حمايه'], action: () => onNavigate('dashboard', { exactId: 'financials', scrollTarget: 'profit-guard-section' }) },
      { id: 'pulse-matrix', label: 'مصفوفة نبض المنتجات', hint: 'الأصناف المربحة', icon: <Package />, category: 'اختصارات ذكية', tags: ['مصفوفة', 'نبض', 'منتجات'], action: () => onNavigate('dashboard', { exactId: 'pulse', scrollTarget: 'products-matrix-section' }) },
    ];

    const liveSuggestions: CommandItem[] = [
      failedOrders > 0 && {
        id: 'live-failed-orders',
        label: `راجع فشل الدفع (${failedOrders})`,
        hint: 'يفتح طلبات الموقع مباشرة',
        icon: <AlertTriangle />,
        category: 'اقتراحات الآن',
        tags: ['فشل الدفع', 'طلبات', 'مهم'],
        action: () => onNavigate('orders', { search: 'فشل' }),
        roles: ['admin', 'partner'],
      },
      pendingOrders > 0 && {
        id: 'live-pending-orders',
        label: `طلبات بانتظار الدفع (${pendingOrders})`,
        hint: 'متابعة الطلبات المعلقة',
        icon: <Clock3 />,
        category: 'اقتراحات الآن',
        tags: ['بانتظار الدفع', 'معلق', 'طلبات'],
        action: () => onNavigate('orders', { search: 'بانتظار' }),
        roles: ['admin', 'partner'],
      },
      paidOrders > 0 && {
        id: 'live-paid-orders',
        label: `المدفوع اليومي (${paidOrders})`,
        hint: `مبيعات اليوم ${money(todaySales)} د.ك`,
        icon: <CheckCircle2 />,
        category: 'اقتراحات الآن',
        tags: ['تم الدفع', 'مبيعات', 'اليوم'],
        action: () => onNavigate('orders', { search: 'تم الدفع' }),
        roles: ['admin', 'partner'],
      },
    ].filter(Boolean) as CommandItem[];

    const base = [...liveSuggestions.filter(item => item.roles?.includes(effectiveRole)), ...savedPresets.filter(item => !item.roles || item.roles.includes(effectiveRole)), ...mainTabs, ...deepLinks];
    const q = clean(deferredQuery);
    const qDigits = cleanDigits(deferredQuery);

    // --- SMART ACTIONS ---
    const smartActions: CommandItem[] = [];

    // 1. Pay Supplier SMART ACTION
    if (q.includes('سداد') || q.includes('دفع') || q.includes('حواله') || q.includes('تحويل')) {
      const parts = q.split(/\s+/);
      const supplierPart = parts.filter(p => !['سداد', 'دفع', 'حواله', 'تحويل', 'المورد'].includes(p)).join(' ');
      
      const matchedSuppliers = (data?.suppliers || [])
        .filter((s: any) => clean(s.name).includes(supplierPart) || !supplierPart)
        .slice(0, 3);

      matchedSuppliers.forEach((s: any) => {
        smartActions.push({
          id: `smart-pay-${s.id}`,
          label: `سداد المورد: ${s.name}`,
          hint: `رصيد المستحق: ${money(s.balance)} د.ك`,
          icon: <Wallet className="text-emerald-500" />,
          category: 'إجراءات مالية ذكية',
          action: () => onNavigate('suppliers-audit', { supplierId: s.id, openModal: true }),
          tags: ['سداد','دفع','حواله','تحويل','مورد','ماليه']
        });
      });
    }

    // 2. Most Expensive Invoice SMART ACTION
    if (q.includes('اغلى') || q.includes('اكبر') || q.includes('اعلى') || q.includes('اكبر فاتوره')) {
      const topInvoice = [...(data?.invoices || [])]
        .filter(inv => !inv.isDeleted)
        .sort((a, b) => (b.totalAmount || 0) - (a.totalAmount || 0))[0];
      
      if (topInvoice) {
        smartActions.push({
          id: 'smart-top-invoice',
          label: 'أغلى فاتورة في النظام',
          hint: `فاتورة #${topInvoice.id} بمبلغ ${money(topInvoice.totalAmount)} د.ك`,
          icon: <TrendingUp className="text-amber-500" />,
          category: 'إجراءات مالية ذكية',
          action: () => onNavigate('invoices-list', { exactId: topInvoice.id, search: topInvoice.id }),
          tags: ['اغلى','اكبر','اعلى','فاتوره','فواتير','مبيعات','قيمه']
        });
      }
    }

    if (q.includes('فاشل') || q.includes('فاشله') || q.includes('فاشلة') || q.includes('فشل')) {
      smartActions.push({
        id: 'smart-failed-orders',
        label: `طلبات فاشلة${failedOrders ? ` (${failedOrders})` : ''}`,
        hint: 'يفتح طلبات الموقع مع فلتر الفشل مباشرة',
        icon: <AlertTriangle className="text-rose-500" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('orders', { search: 'فشل' }),
        tags: ['طلبات فاشله','طلبات فاشلة','فشل الدفع','دفع فاشل','failed orders']
      });
    }

    if (q.includes('جودة') || q.includes('منيو') || q.includes('quality') || q.includes('كوالتي')) {
      smartActions.push({
        id: 'smart-product-quality-open',
        label: `افتح جودة المنيو (${productQuality.score}%)`,
        hint: productQuality.decision,
        icon: <Target className="text-slate-700" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('products', { scrollTarget: 'product-quality-board' }),
        tags: ['جودة المنيو','Product Quality Board','كوماند','منتجات']
      });
    }

    if (q.includes('مدفون') || q.includes('ذهب') || q.includes('ربحه قوي') || q.includes('هامش قوي')) {
      const gem = productQuality.opportunity?.products?.[0];
      smartActions.push({
        id: 'smart-product-hidden-gem',
        label: gem ? `ذهب مدفون: ${gem.name}` : 'المنتجات الذهبية المدفونة',
        hint: productQuality.opportunity?.text || productQuality.decision,
        icon: <Sparkles className="text-amber-500" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('products', { scrollTarget: 'product-quality-board', search: gem?.name || '' }),
        tags: ['ذهب مدفون','منتجات','ربح','هامش']
      });
    }

    if (q.includes('بدون صور') || q.includes('ما عندها صور') || q.includes('ناقصه صور') || q.includes('ناقصة صور')) {
      const missingImages = (data?.products || []).filter((p: any) => {
        return !hasProductImage(p);
      }).length;
      smartActions.push({
        id: 'smart-products-without-images',
        label: `منتجات بدون صور${missingImages ? ` (${missingImages})` : ''}`,
        hint: 'يفتح إدارة المنتجات لمراجعة الصور الناقصة',
        icon: <Package className="text-orange-500" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('products', { search: 'بدون صور' }),
        tags: ['منتجات بدون صور','صور ناقصه','صور ناقصة','منتجات']
      });
    }

    if (q.includes('غايب') || q.includes('غايبين') || q.includes('غائب') || q.includes('غائبين')) {
      smartActions.push({
        id: 'smart-absent-customers',
        label: 'عملاء غايبين',
        hint: 'يفتح رادار استرجاع العملاء في قسم الولاء',
        icon: <Users className="text-blue-500" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'retention-section' }),
        tags: ['عملاء غايبين','عملاء غائبين','استرجاع العملاء','ولاء']
      });
    }

    // Alturath Spotlight: أوامر كويتية مباشرة بدل بحث شكلي فقط.
    const invoiceIntent = includesAny(q, spotlightKeywordGroups.invoices);
    if (invoiceIntent) {
      const term = getKuwaitiSearchTerm(q, spotlightKeywordGroups.invoices);
      const matchedInvoices = safeArray(data?.invoices)
        .filter((inv: any) => {
          const text = clean([inv?.id, inv?.customerName, inv?.customerPhone, inv?.phone, inv?.notes].join(' '));
          return !term || text.includes(term) || (qDigits && cleanDigits(text).includes(qDigits));
        })
        .slice(0, 3);
      if (matchedInvoices.length) {
        matchedInvoices.forEach((inv: any) => smartActions.push({
          id: `spotlight-invoice-${inv.id}`,
          label: `فاتورة ${inv.customerName || inv.customerPhone || inv.id}`,
          hint: `${money(inv.totalAmount || inv.total)} د.ك · اضغط للفتح المباشر`,
          icon: <FileText className="text-amber-600" />,
          category: 'إجراءات مالية ذكية',
          action: () => onNavigate('invoices-list', { exactId: inv.id, search: inv.id || term }),
          tags: ['فواتير', 'فاتورة', term]
        }));
      } else if (term) {
        smartActions.push({
          id: `spotlight-invoice-search-${term}`,
          label: `ابحث في الفواتير عن: ${term}`,
          hint: 'يفتح سجل الفواتير ويحط البحث مباشرة',
          icon: <FileText className="text-amber-600" />,
          category: 'إجراءات مالية ذكية',
          action: () => onNavigate('invoices-list', { search: term }),
          tags: ['فواتير', term]
        });
      }
    }

    const areaIntent = includesAny(q, spotlightKeywordGroups.area) || q.startsWith('منطقة') || q.startsWith('منطقه');
    if (areaIntent) {
      const areaTerm = getKuwaitiSearchTerm(q, ['منطقة', 'منطقه']);
      const customerCount = safeArray(data?.customers).filter((c: any) => getAreaText(c).includes(areaTerm)).length;
      const orderCount = safeArray(data?.orders).filter((o: any) => getAreaText(o).includes(areaTerm)).length;
      smartActions.push({
        id: `spotlight-area-${areaTerm}`,
        label: `منطقة ${areaTerm || 'مختارة'}`,
        hint: `${customerCount} عميل · ${orderCount} طلب — افتح العملاء بالفلتر`,
        icon: <MapPin className="text-emerald-600" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate('customers', { search: areaTerm }),
        tags: ['منطقة', 'سالمية', 'السالمية', areaTerm]
      });
      if (orderCount) {
        smartActions.push({
          id: `spotlight-area-orders-${areaTerm}`,
          label: `طلبات ${areaTerm}`,
          hint: 'يفتح طلبات الموقع للمنطقة المطلوبة',
          icon: <ShoppingBag className="text-blue-600" />,
          category: 'إجراءات مالية ذكية',
          action: () => onNavigate('orders', { search: areaTerm }),
          tags: ['طلبات', 'منطقة', areaTerm]
        });
      }
    }

    const dishTerm = q;
    const matchingProductCount = safeArray(data?.products).filter((p: any) => clean([p?.name, p?.category, p?.description].join(' ')).includes(dishTerm)).length;
    const matchingDishOrders = safeArray(data?.orders).filter((o: any) => getItemsText(o).includes(dishTerm)).length;
    if (!invoiceIntent && !areaIntent && dishTerm.length >= 3 && (matchingProductCount || matchingDishOrders)) {
      smartActions.push({
        id: `spotlight-dish-${dishTerm}`,
        label: `بحث الطبق: ${dishTerm}`,
        hint: `${matchingProductCount} منتج · ${matchingDishOrders} طلب مرتبط`,
        icon: <Package className="text-orange-600" />,
        category: 'إجراءات مالية ذكية',
        action: () => onNavigate(matchingProductCount ? 'products' : 'orders', { search: dishTerm }),
        tags: ['مجبوس', 'مطبق', 'مرقوق', dishTerm]
      });
    }

    if (!q) return base;

    const customerMatches = safeArray(data?.customers)
      .filter((c: any) => clean([c.name, c.phone, c.email, c.area].join(' ')).includes(q) || (qDigits && cleanDigits(c.phone).includes(qDigits)))
      .slice(0, 4)
      .map((c: any) => ({ id: `cust-${c.id}`, label: `عميل: ${c.name || c.phone}`, hint: c.phone, icon: <Users />, category: 'نتائج مباشرة', action: () => onNavigate('customers', { exactId: c.id, search: c.name || c.phone }) }));

    const productMatches = safeArray(data?.products)
      .filter((p: any) => clean([p.name, p.category, p.description].join(' ')).includes(q))
      .slice(0, 4)
      .map((p: any) => ({ id: `prod-${p.id}`, label: `منتج: ${p.name}`, hint: p.category || 'منتج', icon: <Package />, category: 'نتائج مباشرة', action: () => onNavigate('products', { exactId: p.id, search: p.name }) }));

    const invoiceMatches = safeArray(data?.invoices)
      .filter((inv: any) => clean([inv.id, inv.customerName, inv.customerPhone, inv.phone].join(' ')).includes(q) || (qDigits && cleanDigits([inv.id, inv.customerPhone, inv.phone].join(' ')).includes(qDigits)))
      .slice(0, 4)
      .map((inv: any) => ({ id: `inv-${inv.id}`, label: `فاتورة: ${inv.id}`, hint: `${money(inv.totalAmount || inv.total)} د.ك`, icon: <FileText />, category: 'نتائج مباشرة', action: () => onNavigate('invoices-list', { exactId: inv.id, search: inv.id }) }));

    const orderMatches = safeArray(data?.orders)
      .filter((order: any) => clean([order.id, order.orderNumber, order.customerName, order.customerPhone, order.phone, order.status, order.paymentStatus].join(' ')).includes(q) || getAreaText(order).includes(q) || getItemsText(order).includes(q) || (qDigits && cleanDigits([order.id, order.orderNumber, order.customerPhone, order.phone].join(' ')).includes(qDigits)))
      .slice(0, 4)
      .map((order: any) => ({
        id: `order-${order.id}`,
        label: `طلب: ${order.orderNumber || order.id}`,
        hint: `${order.customerName || order.customerPhone || 'طلب موقع'} · ${money(order.total || order.totalAmount)} د.ك`,
        icon: <ShoppingBag />,
        category: 'نتائج مباشرة',
        action: () => onNavigate('orders', { exactId: order.id, search: order.id }),
      }));

    const supplierMatches = safeArray(data?.suppliers)
      .filter((s: any) => clean([s.name, s.phone, s.category, s.notes].join(' ')).includes(q))
      .slice(0, 3)
      .map((s: any) => ({ id: `supp-${s.id}`, label: `مورد: ${s.name}`, hint: 'مورد', icon: <Truck />, category: 'نتائج مباشرة', action: () => onNavigate('suppliers', { exactId: s.id, search: s.name }) }));

    const expenseMatches = safeArray(data?.expenses)
      .filter((e: any) => clean([e.description, e.category, e.vendor].join(' ')).includes(q))
      .slice(0, 3)
      .map((e: any) => ({ id: `exp-${e.id}`, label: `مصروف: ${e.description}`, hint: `${Number(e.amount || 0).toFixed(3)} د.ك`, icon: <PieChart />, category: 'نتائج مباشرة', action: () => onNavigate('expenses', { exactId: e.id, search: e.description }) }));

    return [...base, ...smartActions, ...orderMatches, ...customerMatches, ...productMatches, ...invoiceMatches, ...supplierMatches, ...expenseMatches];
  }, [deferredQuery, data, onNavigate, userRole]);

  const filteredCommands = useMemo(() => {
    const q = clean(deferredQuery);
    if (!q) return commands;
    return commands
      .map((cmd) => ({ cmd, score: commandScore(cmd, q) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);
  }, [commands, deferredQuery]);

  const visibleCommands = useMemo(() => instantAnswer ? filteredCommands.slice(0, 4) : filteredCommands, [filteredCommands, instantAnswer]);

  const priority = ['live-failed-orders','live-pending-orders','live-paid-orders','dashboard-pulse','dashboard-profit','orders','invoices-list','new-invoice','products-page','customers-page','smart-studio'];
  const featured = useMemo(() => {
    const sorted = [...filteredCommands].sort((a, b) => {
      const ai = priority.indexOf(a.id);
      const bi = priority.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sorted.slice(0, deferredQuery ? 8 : 7);
  }, [filteredCommands, deferredQuery]);

  const recentCommands = useMemo(() => {
    if (deferredQuery) return [];
    return recentCommandIds
      .map(id => commands.find(cmd => cmd.id === id))
      .filter(Boolean)
      .slice(0, 4) as CommandItem[];
  }, [commands, deferredQuery, recentCommandIds]);

  const runCommand = (cmd: CommandItem) => {
    try {
      setRecentCommandIds(prev => {
        const next = [cmd.id, ...prev.filter(id => id !== cmd.id)].slice(0, 6);
        try { localStorage.setItem('alturath_command_recent', JSON.stringify(next)); } catch {}
        return next;
      });
      appendLocalLedgerEvent(createLedgerEvent('UI_ACTION', { entityType: 'ui', actorRole: userRole, meta: { commandId: cmd.id, label: cmd.label, category: cmd.category } }));
      cmd.action();
    } catch (error) {
      console.error('CommandBar navigation failed:', error);
      onNavigate('dashboard');
    } finally {
      onClose();
    }
  };

  useEffect(() => { setSelectedIndex(0); }, [query]);
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80);
      setQuery('');
      setSelectedIndex(0);
      try {
        const stored = JSON.parse(localStorage.getItem('alturath_command_recent') || '[]');
        if (Array.isArray(stored)) setRecentCommandIds(stored.slice(0, 6));
      } catch {}
    }
  }, [isOpen]);


  const categoryOrder = deferredQuery
    ? ['إجراءات مالية ذكية', 'نتائج مباشرة', 'اقتراحات الآن', 'خريطة التحكم الذكية', 'التشغيل اليومي', 'النمو والمحتوى', 'العملاء والولاء', 'الإدارة الأساسية', 'التراث الذكي', 'اختصارات ذكية', 'تحليلات داخلية']
    : ['اقتراحات الآن', 'خريطة التحكم الذكية', 'التشغيل اليومي', 'العملاء والولاء', 'النمو والمحتوى', 'الإدارة الأساسية', 'التراث الذكي', 'اختصارات ذكية', 'تحليلات داخلية'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => visibleCommands.length > 0 ? (prev + 1) % visibleCommands.length : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => visibleCommands.length > 0 ? (prev - 1 + visibleCommands.length) % visibleCommands.length : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = visibleCommands[selectedIndex];
        if (selected) runCommand(selected);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, visibleCommands, selectedIndex, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-start justify-center px-3 pt-16 sm:pt-20 md:pt-24">
          <motion.button
            type="button"
            aria-label="إغلاق البحث"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-white border border-slate-200 text-slate-900/45 backdrop-blur-xl"
          />

          <motion.div
            {...heritageMotion.adminModal}
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
            dir="rtl"
          >
            <div className="command-search-header">
              <div className="hidden md:flex flex-col text-right min-w-[150px]">
                <span className="text-[10px] font-black tracking-[0.18em] text-amber-600">Alturath Spotlight</span>
                <span className="text-xs font-black text-slate-700">مساعد تنقل خارق للمطبخ</span>
              </div>
              <div className="command-search-field">
                <Search size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="بحث الأوامر"
                  placeholder="اكتب: فواتير أحمد، أغلى فاتورة، طلبات فاشلة، مجبوس، السالمية..."
                  className="command-premium-search-input"
                  value={query}
                  onChange={(e) => setQuery(normalizeArabicNumerals(e.target.value))}
                />
              </div>
              <button type="button" onClick={onClose} className="command-premium-close"><X size={18} /></button>
            </div>

            {instantAnswer && (
              <div className="px-3 md:px-4 pt-3">
                <div className={cn(
                  'rounded-[24px] border p-3 md:p-4 text-right shadow-sm',
                  instantAnswer.tone === 'emerald' && 'border-emerald-200 bg-emerald-50 text-emerald-900',
                  instantAnswer.tone === 'amber' && 'border-amber-200 bg-amber-50 text-amber-900',
                  instantAnswer.tone === 'rose' && 'border-rose-200 bg-rose-50 text-rose-900',
                  instantAnswer.tone === 'blue' && 'border-blue-200 bg-blue-50 text-blue-900',
                  (!instantAnswer.tone || instantAnswer.tone === 'slate') && 'border-slate-200 bg-slate-50 text-slate-900'
                )}>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-2xl bg-white/80 flex items-center justify-center">
                      <Sparkles size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-black opacity-65">إجابة فورية</div>
                      <div className="mt-0.5 text-sm md:text-base font-black truncate">{instantAnswer.title}</div>
                      <div className="mt-1 text-2xl md:text-3xl font-black leading-none truncate">{instantAnswer.value}</div>
                      {instantAnswer.subtitle && <div className="mt-2 text-xs md:text-sm font-bold leading-6 opacity-80">{instantAnswer.subtitle}</div>}
                      {instantAnswer.details?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {instantAnswer.details.slice(0, 2).map((line) => (
                            <span key={line} className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-black opacity-80">{line}</span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    {instantAnswer.action && instantAnswer.actionLabel && (
                      <button
                        type="button"
                        onClick={() => { instantAnswer.action?.(); onClose(); }}
                        className="shrink-0 rounded-2xl bg-white px-3 py-2 text-[11px] font-black shadow-sm border border-white/80 hover:bg-white/80 transition-colors"
                      >
                        {instantAnswer.actionLabel}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!deferredQuery && (
              <div className="command-smart-strip">
                <div className="command-strip-title">
                  <Sparkles size={14} />
                  <span>الأقرب لاستخدامك الآن</span>
                </div>
                <div className="command-chip-row">
                  {(recentCommands.length ? recentCommands : featured.slice(0, 4)).map((cmd) => (
                    <button key={`quick-${cmd.id}`} type="button" onClick={() => runCommand(cmd)} className="command-quick-chip">
                      {React.cloneElement(cmd.icon as React.ReactElement, { size: 14 } as any)}
                      <span>{cmd.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={cn('overflow-y-auto p-3 md:p-4 custom-scrollbar', instantAnswer ? 'max-h-[34vh] md:max-h-[300px]' : 'max-h-[46vh] md:max-h-[390px]')}>
              {visibleCommands.length > 0 ? (
                <div className="space-y-4">
                  {categoryOrder.map(category => {
                    const catCommands = visibleCommands.filter(c => c.category === category);
                    if (catCommands.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 text-right">{category}</div>
                        {catCommands.map((cmd) => {
                          const globalIndex = visibleCommands.indexOf(cmd);
                          const isActive = globalIndex === selectedIndex;
                          return (
                            <button
                              key={cmd.id}
                              type="button"
                              onClick={() => runCommand(cmd)}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                              className={cn('command-row', isActive && 'is-active')}
                            >
                              <div className="command-row-icon">{React.cloneElement(cmd.icon as React.ReactElement, { size: 16 } as any)}</div>
                              <div className="min-w-0 flex-1 text-right">
                                <div className="font-black text-sm truncate">{cmd.label}</div>
                                <div className="text-[11px] font-bold opacity-60 truncate">{cmd.hint || cmd.category}</div>
                              </div>
                              {isActive && <ArrowRight size={16} className="rotate-180 opacity-50" />}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100"><Search size={28} className="text-slate-300" /></div>
                  <div className="font-black text-slate-600">ما في نتائج</div>
                  <div className="text-xs text-slate-400 mt-1">جرب اسم عميل، منتج، فاتورة، أو صفحة</div>
                </div>
              )}
            </div>



          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandBar;
