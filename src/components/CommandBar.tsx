import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Search, PlusCircle, Users, Package, PieChart, Sparkles, Zap, TrendingUp, X, ArrowRight, Target, Truck, Activity, DollarSign, ShoppingBag, FileText, ShieldCheck, BrainCircuit, Award, Clock3, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeArabic, normalizeArabicNumerals } from '../lib/utils';

interface CommandBarProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: string, payload?: { search?: string, exactId?: string, scrollTarget?: string }) => void;
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

const clean = (value?: string) => normalizeArabic(String(value || '')).toLowerCase().trim();
const cleanDigits = (value?: string) => String(value || '').replace(/\D/g, '');
const splitWords = (value?: string) => clean(value).split(/\s+/).filter(Boolean);
const commandSearchText = (cmd: CommandItem) => clean([cmd.label, cmd.hint, cmd.category, ...(cmd.tags || [])].join(' '));
const commandScore = (cmd: CommandItem, query: string) => {
  const q = clean(query);
  if (!q) return 1;
  const qDigits = cleanDigits(query);
  const haystack = commandSearchText(cmd);
  const haystackDigits = cleanDigits([cmd.label, cmd.hint, ...(cmd.tags || [])].join(' '));
  if (clean(cmd.label) === q) return 100;
  if (clean(cmd.label).startsWith(q)) return 80;
  if (qDigits && haystackDigits.includes(qDigits)) return 78;
  if (haystack.includes(q)) return 60;
  const words = splitWords(q);
  const matches = words.filter(w => haystack.includes(w)).length;
  return matches ? 20 + matches * 8 : 0;
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

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onNavigate, data, userRole }) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentCommandIds, setRecentCommandIds] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const orders = Array.isArray(data?.orders) ? data.orders : [];
    const invoices = Array.isArray(data?.invoices) ? data.invoices : [];
    const pendingOrders = orders.filter((o: any) => isPendingText(o?.paymentStatus || o?.status)).length;
    const failedOrders = orders.filter((o: any) => isFailedText(o?.paymentStatus || o?.status)).length;
    const paidOrders = orders.filter((o: any) => isPaidText(o?.paymentStatus || o?.status)).length;
    const todayKey = new Date().toISOString().slice(0, 10);
    const todayInvoices = invoices.filter((inv: any) => String(inv?.date || '').startsWith(todayKey));
    const todaySales = todayInvoices.reduce((sum: number, inv: any) => sum + Number(inv?.totalAmount || inv?.total || 0), 0);

    const allTabs: CommandItem[] = [
      { id: 'dashboard-pulse', label: 'النبض التنفيذي', hint: 'مركز القيادة، ملخص اليوم، مؤشرات الإدارة', icon: <Activity />, category: 'خريطة التحكم الذكية', tags: ['مركز القيادة','داشبورد','الرئيسية','ملخص'], action: () => onNavigate('dashboard', { exactId: 'pulse' }), roles: ['admin'] },
      { id: 'dashboard-brain', label: 'عقل النظام', hint: 'التحليل، القرارات، التعلم، المخاطر، والاستراتيجية', icon: <BrainCircuit />, category: 'خريطة التحكم الذكية', tags: ['تعلم','مخاطر','توصيات','ذكاء','تحليل'], action: () => onNavigate('dashboard', { exactId: 'intelligence' }), roles: ['admin'] },
      { id: 'dashboard-profit', label: 'المالية وحماية الأرباح', hint: 'الربحية، الهامش، النزيف، وحماية الربح', icon: <DollarSign />, category: 'خريطة التحكم الذكية', tags: ['فلوس','أرباح','ربح','خسارة','هامش','تكاليف'], action: () => onNavigate('dashboard', { exactId: 'financials' }), roles: ['admin'] },
      { id: 'dashboard-suppliers', label: 'الموردين والتشغيل', hint: 'ذكاء الموردين ومراجعة المخاطر', icon: <Truck />, category: 'خريطة التحكم الذكية', tags: ['مورد','موردين','تفاوض','تشغيل','منتجات'], action: () => onNavigate('dashboard', { exactId: 'suppliers' }), roles: ['admin'] },
      { id: 'dashboard-customers', label: 'العملاء والولاء', hint: 'العملاء، نظام المكافآت والخصومات، والبطولات', icon: <Award />, category: 'خريطة التحكم الذكية', tags: ['عميل','عملاء','ولاء','كوبون','كوبونات','ديوانية'], action: () => onNavigate('dashboard', { exactId: 'customers' }), roles: ['admin'] },
      { id: 'dashboard-growth', label: 'النمو والمحتوى', hint: 'النمو، الحملات، والتوقع الموسمي واستوديو الصورة الذكية', icon: <Target />, category: 'خريطة التحكم الذكية', tags: ['نمو','تسويق','حملات','محتوى','استوديو','موسم','مناخ'], action: () => onNavigate('dashboard', { exactId: 'growth' }), roles: ['admin'] },

      { id: 'invoices-list', label: 'سجل الفواتير', hint: 'فواتير وتقارير', icon: <FileText />, category: 'التشغيل اليومي', tags: ['فاتورة','فواتير','سجل','مبيعات'], action: () => onNavigate('invoices-list', {}), roles: ['partner', 'admin'] },
      { id: 'new-invoice', label: 'فاتورة جديدة', hint: 'إنشاء سريع', icon: <PlusCircle />, category: 'التشغيل اليومي', tags: ['فاتورة','جديدة','بيع','نقطة البيع'], action: () => onNavigate('new-invoice', {}), roles: ['admin', 'partner'] },
      { id: 'orders', label: 'طلبات الموقع', hint: 'حالات الدفع', icon: <ShoppingBag />, category: 'التشغيل اليومي', tags: ['طلب','طلبات','موقع','دفع'], action: () => onNavigate('orders', {}), roles: ['partner', 'admin'] },
      { id: 'reports', label: 'التقارير التنفيذية', hint: 'تفصيل مالي للأداء والمبيعات', icon: <PieChart />, category: 'التشغيل اليومي', action: () => onNavigate('reports', {}), roles: ['admin'] },

      { id: 'smart-studio', label: 'استوديو الصورة الذكية', hint: 'رسائل الدعاية والتسويق', icon: <Zap />, category: 'النمو والمحتوى', action: () => onNavigate('smart-studio', {}), roles: ['admin', 'partner'] },
      { id: 'dashboard-rewards', label: 'نظام المكافآت والخصومات', hint: 'إدارة الولاء، الكوبونات، وقياس الربح', icon: <Sparkles />, category: 'العملاء والولاء', action: () => onNavigate('dashboard', { exactId: 'rewards' }), roles: ['admin'] },
      { id: 'dashboard-diwaniya', label: 'بطولات الديوانية', hint: 'النقاط والجوائز للبطولات', icon: <Users />, category: 'العملاء والولاء', action: () => onNavigate('dashboard', { exactId: 'diwaniya' }), roles: ['admin'] },

      { id: 'customers-page', label: 'بيانات العملاء', hint: 'بحث وتفاصيل', icon: <Users />, category: 'الإدارة الأساسية', action: () => onNavigate('customers', {}), roles: ['admin'] },
      { id: 'products-page', label: 'إدارة المنتجات', hint: 'الأسعار والتصنيفات', icon: <Package />, category: 'الإدارة الأساسية', action: () => onNavigate('products', {}), roles: ['admin'] },
      { id: 'suppliers-audit', label: 'الموردين والمراجعة', hint: 'تدقيق الموردين والمخاطر', icon: <Truck />, category: 'الإدارة الأساسية', action: () => onNavigate('suppliers-audit', {}), roles: ['admin'] },
      { id: 'expenses', label: 'المصروفات', hint: 'تسجيل ومراجعة', icon: <PieChart />, category: 'الإدارة الأساسية', action: () => onNavigate('expenses', {}), roles: ['admin'] },
      { id: 'settings', label: 'الإعدادات العامة', hint: 'هوية وتنبيهات وضبط', icon: <ShieldCheck />, category: 'الإدارة الأساسية', action: () => onNavigate('settings', {}), roles: ['admin'] },
      { id: 'ai', label: 'المساعد الذكي', hint: 'مستشار مالي وتوصيات', icon: <Sparkles />, category: 'التراث الذكي', action: () => onNavigate('ai', {}), roles: ['admin', 'partner'] },
    ];
    const effectiveRole = userRole || 'admin';
    const mainTabs = allTabs.filter(tab => tab.roles?.includes(effectiveRole));

    const deepLinks: CommandItem[] = [
      { id: 'growth-campaigns', label: 'مختبر الحملات التسويقية', hint: 'خطط مبيعات', icon: <TrendingUp />, category: 'اختصارات ذكية', tags: ['حملات', 'تسويقية', 'مبيعات'], action: () => onNavigate('growth-simulator', { scrollTarget: 'smart-campaigns' }) },
      { id: 'customers-retention', label: 'رادار استرجاع العملاء', hint: 'الغائبين والاحتفاظ', icon: <Users />, category: 'اختصارات ذكية', tags: ['استرجاع', 'غائبين', 'احتفاظ'], action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'retention-section' }) },
      { id: 'financial-guard', label: 'حارس الأرباح الحقيقية', hint: 'هدر وصافي ربح', icon: <DollarSign />, category: 'اختصارات ذكية', tags: ['ارباح', 'هدر', 'صافي'], action: () => onNavigate('dashboard', { exactId: 'financials', scrollTarget: 'profit-guard-section' }) },
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

    const base = [...liveSuggestions.filter(item => item.roles?.includes(effectiveRole)), ...mainTabs, ...deepLinks];
    const q = clean(deferredQuery);
    if (!q) return base;
    const qDigits = cleanDigits(deferredQuery);

    const customerMatches = (data?.customers || [])
      .filter((c: any) => clean([c.name, c.phone, c.email, c.area].join(' ')).includes(q) || (qDigits && cleanDigits(c.phone).includes(qDigits)))
      .slice(0, 4)
      .map((c: any) => ({ id: `cust-${c.id}`, label: `عميل: ${c.name || c.phone}`, hint: c.phone, icon: <Users />, category: 'نتائج مباشرة', action: () => onNavigate('customers', { exactId: c.id, search: c.name || c.phone }) }));

    const productMatches = (data?.products || [])
      .filter((p: any) => clean([p.name, p.category, p.description].join(' ')).includes(q))
      .slice(0, 4)
      .map((p: any) => ({ id: `prod-${p.id}`, label: `منتج: ${p.name}`, hint: p.category || 'منتج', icon: <Package />, category: 'نتائج مباشرة', action: () => onNavigate('products', { exactId: p.id, search: p.name }) }));

    const invoiceMatches = (data?.invoices || [])
      .filter((inv: any) => clean([inv.id, inv.customerName, inv.customerPhone, inv.phone].join(' ')).includes(q) || (qDigits && cleanDigits([inv.id, inv.customerPhone, inv.phone].join(' ')).includes(qDigits)))
      .slice(0, 4)
      .map((inv: any) => ({ id: `inv-${inv.id}`, label: `فاتورة: ${inv.id}`, hint: `${money(inv.totalAmount || inv.total)} د.ك`, icon: <FileText />, category: 'نتائج مباشرة', action: () => onNavigate('invoices-list', { exactId: inv.id, search: inv.id }) }));

    const orderMatches = (data?.orders || [])
      .filter((order: any) => clean([order.id, order.orderNumber, order.customerName, order.customerPhone, order.phone, order.status, order.paymentStatus].join(' ')).includes(q) || (qDigits && cleanDigits([order.id, order.orderNumber, order.customerPhone, order.phone].join(' ')).includes(qDigits)))
      .slice(0, 4)
      .map((order: any) => ({
        id: `order-${order.id}`,
        label: `طلب: ${order.orderNumber || order.id}`,
        hint: `${order.customerName || order.customerPhone || 'طلب موقع'} · ${money(order.total || order.totalAmount)} د.ك`,
        icon: <ShoppingBag />,
        category: 'نتائج مباشرة',
        action: () => onNavigate('orders', { exactId: order.id, search: order.id }),
      }));

    const supplierMatches = (data?.suppliers || [])
      .filter((s: any) => clean([s.name, s.phone, s.category, s.notes].join(' ')).includes(q))
      .slice(0, 3)
      .map((s: any) => ({ id: `supp-${s.id}`, label: `مورد: ${s.name}`, hint: 'مورد', icon: <Truck />, category: 'نتائج مباشرة', action: () => onNavigate('suppliers', { exactId: s.id, search: s.name }) }));

    const expenseMatches = (data?.expenses || [])
      .filter((e: any) => clean([e.description, e.category, e.vendor].join(' ')).includes(q))
      .slice(0, 3)
      .map((e: any) => ({ id: `exp-${e.id}`, label: `مصروف: ${e.description}`, hint: `${Number(e.amount || 0).toFixed(3)} د.ك`, icon: <PieChart />, category: 'نتائج مباشرة', action: () => onNavigate('expenses', { exactId: e.id, search: e.description }) }));

    return [...base, ...orderMatches, ...customerMatches, ...productMatches, ...invoiceMatches, ...supplierMatches, ...expenseMatches];
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
    ? ['نتائج مباشرة', 'اقتراحات الآن', 'خريطة التحكم الذكية', 'التشغيل اليومي', 'النمو والمحتوى', 'العملاء والولاء', 'الإدارة الأساسية', 'التراث الذكي', 'اختصارات ذكية', 'تحليلات داخلية']
    : ['اقتراحات الآن', 'خريطة التحكم الذكية', 'التشغيل اليومي', 'العملاء والولاء', 'النمو والمحتوى', 'الإدارة الأساسية', 'التراث الذكي', 'اختصارات ذكية', 'تحليلات داخلية'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = filteredCommands[selectedIndex];
        if (selected) runCommand(selected);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

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
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xl"
          />

          <motion.div
            initial={{ opacity: 0, y: -18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/70 bg-white/95 shadow-[0_30px_90px_rgba(15,23,42,0.35)]"
            dir="rtl"
          >
            <div className="command-search-header">
              <div className="hidden md:flex flex-col text-right min-w-[150px]">
                <span className="text-[10px] font-black tracking-[0.18em] text-amber-600">كوماند ذكي</span>
                <span className="text-xs font-black text-slate-700">ابحث أو انتقل فوراً</span>
              </div>
              <div className="command-search-field">
                <Search size={18} />
                <input
                  ref={inputRef}
                  type="text"
                  aria-label="بحث الأوامر"
                  placeholder="اكتب: عميل، منتج، فاتورة، مورد، كوبون، أرباح، محتوى..."
                  className="command-premium-search-input"
                  value={query}
                  onChange={(e) => setQuery(normalizeArabicNumerals(e.target.value))}
                />
              </div>
              <button type="button" onClick={onClose} className="command-premium-close"><X size={18} /></button>
            </div>

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

            <div className="max-h-[46vh] md:max-h-[390px] overflow-y-auto p-3 md:p-4 custom-scrollbar">
              {filteredCommands.length > 0 ? (
                <div className="space-y-4">
                  {categoryOrder.map(category => {
                    const catCommands = filteredCommands.filter(c => c.category === category);
                    if (catCommands.length === 0) return null;
                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="px-2 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 text-right">{category}</div>
                        {catCommands.map((cmd) => {
                          const globalIndex = filteredCommands.indexOf(cmd);
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
                  <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-slate-100"><Search size={28} className="text-slate-300" /></div>
                  <div className="font-black text-slate-600">ما في نتائج</div>
                  <div className="text-xs text-slate-400 mt-1">جرب اسم عميل، منتج، فاتورة، أو صفحة</div>
                </div>
              )}
            </div>

            <div className="command-premium-footer">
              <span>Enter للتنفيذ</span>
              <span>↑ ↓ للتنقل</span>
              <span>Esc للإغلاق</span>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandBar;
