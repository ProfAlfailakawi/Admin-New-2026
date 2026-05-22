import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { Search, Command, PlusCircle, Users, Package, PieChart, Sparkles, Zap, TrendingUp, X, ArrowRight, Target, Truck, Activity, DollarSign, Home, ShoppingBag, FileText, Clock, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

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

const clean = (value?: string) => String(value || '').toLowerCase().trim();

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onNavigate, data, userRole }) => {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands = useMemo<CommandItem[]>(() => {
    const allTabs: CommandItem[] = [
      { id: 'dashboard-main', label: 'مركز القيادة / الرئيسية', hint: 'نبض اليوم والطلبات المعلقة وفشل الدفع', icon: <Home />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'pulse' }), roles: ['admin'] },
      { id: 'dashboard-ai', label: 'مختبر الذكاء', hint: 'تحليلات واستقرار', icon: <Sparkles />, category: 'الرئيسية', action: () => onNavigate('dashboard-ai', { exactId: 'intelligence' }), roles: ['admin'] },
      { id: 'dashboard-growth', label: 'محاكي النمو والتسويق', hint: 'سيناريوهات الأرباح ماذا لو', icon: <Target />, category: 'الرئيسية', action: () => onNavigate('growth-simulator', {}), roles: ['admin'] },
      { id: 'dashboard-customers', label: 'العملاء والولاء', hint: 'نبض العملاء', icon: <Users />, category: 'الرئيسية', action: () => onNavigate('customers', {}), roles: ['admin'] },
      { id: 'dashboard-suppliers', label: 'الموردين والمخاطر', hint: 'توريد ومراجعة', icon: <Truck />, category: 'الرئيسية', action: () => onNavigate('suppliers-audit', {}), roles: ['admin'] },
      { id: 'dashboard-financials', label: 'المالية وحماية الأرباح', hint: 'Profit Shield وهوامش الربح', icon: <DollarSign />, category: 'الرئيسية', action: () => onNavigate('profit-guard', {}), roles: ['admin'] },
      { id: 'dashboard-loyalty', label: 'مملكة الولاء', hint: 'الفضي والذهبي والـ VIP', icon: <TrendingUp />, category: 'الولاء والكوبونات', action: () => onNavigate('loyalty', {}), roles: ['admin'] },
      { id: 'dashboard-promocodes', label: 'مسرح العروض الذكية / الكوبونات', hint: 'قياس أثرها الربحي', icon: <Sparkles />, category: 'الولاء والكوبونات', action: () => onNavigate('coupons', {}), roles: ['admin'] },
      { id: 'dashboard-diwaniya', label: 'بطولات الديوانية', hint: 'المجتمع والترتيب', icon: <Users />, category: 'الولاء والكوبونات', action: () => onNavigate('diwaniya', {}), roles: ['admin'] },
      { id: 'ai', label: 'المساعد الذكي', hint: 'مستشار مالي للتوصيات', icon: <Sparkles />, category: 'الذكاء الاصطناعي', action: () => onNavigate('ai', {}), roles: ['admin', 'partner'] },
      { id: 'smart-studio', label: 'استوديو المحتوى الذكي', hint: 'Creative Suite للدعاية والتسويق', icon: <Zap />, category: 'الذكاء الاصطناعي', action: () => onNavigate('smart-studio', {}), roles: ['admin'] },
      { id: 'new-invoice', label: 'فاتورة جديدة', hint: 'إنشاء سريع', icon: <PlusCircle />, category: 'الإجراءات السريعة', action: () => onNavigate('new-invoice', {}), roles: ['admin', 'partner'] },
      { id: 'customers-page', label: 'بيانات العملاء', hint: 'بحث وتفاصيل', icon: <Users />, category: 'التنقل', action: () => onNavigate('customers', {}), roles: ['admin'] },
      { id: 'products-page', label: 'إدارة المنتجات', hint: 'الأسعار والتصنيفات', icon: <Package />, category: 'التنقل', action: () => onNavigate('products', {}), roles: ['admin'] },
      { id: 'expenses', label: 'المصروفات', hint: 'تسجيل ومراجعة', icon: <PieChart />, category: 'الإجراءات السريعة', action: () => onNavigate('expenses', {}), roles: ['admin'] },
      { id: 'orders', label: 'طلبات الموقع', hint: 'حالات الدفع', icon: <ShoppingBag />, category: 'التنقل', action: () => onNavigate('orders', {}), roles: ['partner', 'admin'] },
      { id: 'invoices-list', label: 'سجل الفواتير', hint: 'فواتير وتقارير', icon: <FileText />, category: 'التنقل', action: () => onNavigate('invoices-list', {}), roles: ['partner', 'admin'] },
      { id: 'suppliers-audit', label: 'الموردين والمراجعة', hint: 'تدقيق الموردين والمخاطر', icon: <Truck />, category: 'التنقل', action: () => onNavigate('suppliers-audit', {}), roles: ['admin'] },
      { id: 'reports', label: 'التقارير التنفيذية', hint: 'تفصيل مالي للأداء والمبيعات', icon: <PieChart />, category: 'التنقل', action: () => onNavigate('reports', {}), roles: ['admin'] },
      { id: 'settings', label: 'الإعدادات العامة', hint: 'هوية وتنبيهات وضبط', icon: <ShieldCheck />, category: 'التنقل', action: () => onNavigate('settings', {}), roles: ['admin'] },
      { id: 'alerts', label: 'التنبيهات الذكية', hint: 'راجع التنبيهات من اللوحة', icon: <Activity />, category: 'التنقل', action: () => onNavigate('dashboard', { exactId: 'pulse', scrollTarget: 'alerts-section' }), roles: ['admin'] },
      { id: 'partner', label: 'برنامج الشريك', hint: 'واجهة بسيطة للشريك', icon: <Users />, category: 'التنقل', action: () => onNavigate('dashboard', { exactId: 'pulse', scrollTarget: 'partner-section' }), roles: ['admin'] },
    ];

    const mainTabs = allTabs.filter(tab => tab.roles?.includes(userRole));

    const deepLinks: CommandItem[] = [
      { id: 'bi-engine-core', label: 'قلب مختبر الذكاء', hint: 'تحليل الاستقرار', icon: <ShieldCheck />, category: 'تحليلات داخلية', tags: ['القلب', 'نواة', 'مؤشرات', 'استقرار'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'bi-engine-core-section' }) },
      { id: 'strategic-manager', label: 'المدير الاستراتيجي الآلي', hint: 'خطط وقرارات', icon: <Target />, category: 'تحليلات داخلية', tags: ['مدير', 'آلي', 'استراتيجي', 'خطط'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'strategic-manager-section' }) },
      { id: 'vip-missions', label: 'مهام كبار العملاء', hint: 'VIP ومهمات', icon: <Users />, category: 'تحليلات داخلية', tags: ['مهام', 'vip', 'كبار'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'vip-missions-section' }) },
      { id: 'geo-heatmap', label: 'خريطة الذهب الاستراتيجية', hint: 'توزيع وحرارة', icon: <Activity />, category: 'تحليلات داخلية', tags: ['خريطة', 'حرارية', 'جغرافي', 'توزيع'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'geo-heatmap-section' }) },
      { id: 'smart-offers', label: 'صانع العروض الذكية', hint: 'ترويج وخصومات', icon: <Sparkles />, category: 'تحليلات داخلية', tags: ['عروض', 'ترويج', 'خصم'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'smart-offers-section' }) },
      { id: 'what-if', label: 'محاكي الطوارئ والسيناريوهات', hint: 'ماذا لو؟', icon: <Zap />, category: 'تحليلات داخلية', tags: ['طوارئ', 'سيناريو', 'توقع'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'what-if-section' }) },
      { id: 'status-mirror', label: 'مرآة حالة العمل', hint: 'مؤشرات فورية', icon: <Activity />, category: 'تحليلات داخلية', tags: ['مرآة', 'حالة', 'مؤشرات'], action: () => onNavigate('dashboard-ai', { exactId: 'intelligence', scrollTarget: 'status-mirror-section' }) },
      { id: 'growth-campaigns', label: 'مختبر الحملات التسويقية', hint: 'خطط مبيعات', icon: <TrendingUp />, category: 'تحليلات داخلية', tags: ['حملات', 'تسويقية', 'مبيعات'], action: () => onNavigate('growth-simulator', { scrollTarget: 'smart-campaigns' }) },
      { id: 'customers-retention', label: 'رادار استرجاع العملاء', hint: 'الغائبين والاحتفاظ', icon: <Users />, category: 'تحليلات داخلية', tags: ['استرجاع', 'غائبين', 'احتفاظ'], action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'retention-section' }) },
      { id: 'financial-guard', label: 'حارس الأرباح الحقيقية', hint: 'هدر وصافي ربح', icon: <DollarSign />, category: 'تحليلات داخلية', tags: ['ارباح', 'هدر', 'صافي'], action: () => onNavigate('dashboard', { exactId: 'financials', scrollTarget: 'profit-guard-section' }) },
      { id: 'pulse-matrix', label: 'مصفوفة نبض المنتجات', hint: 'الأصناف المربحة', icon: <Package />, category: 'تحليلات داخلية', tags: ['مصفوفة', 'نبض', 'منتجات'], action: () => onNavigate('dashboard', { exactId: 'pulse', scrollTarget: 'products-matrix-section' }) },
    ];

    const base = [...mainTabs, ...deepLinks];
    const q = clean(deferredQuery);
    if (!q) return base;

    const customerMatches = (data?.customers || [])
      .filter((c: any) => clean(c.name).includes(q) || String(c.phone || '').includes(q))
      .slice(0, 4)
      .map((c: any) => ({ id: `cust-${c.id}`, label: `عميل: ${c.name || c.phone}`, hint: c.phone, icon: <Users />, category: 'نتائج مباشرة', action: () => onNavigate('customers', { exactId: c.id, search: c.name || c.phone }) }));

    const productMatches = (data?.products || [])
      .filter((p: any) => clean(p.name).includes(q))
      .slice(0, 4)
      .map((p: any) => ({ id: `prod-${p.id}`, label: `منتج: ${p.name}`, hint: p.category || 'منتج', icon: <Package />, category: 'نتائج مباشرة', action: () => onNavigate('products', { exactId: p.id, search: p.name }) }));

    const invoiceMatches = (data?.invoices || [])
      .filter((inv: any) => clean(inv.id).includes(q))
      .slice(0, 4)
      .map((inv: any) => ({ id: `inv-${inv.id}`, label: `فاتورة: ${inv.id}`, hint: `${Number(inv.total || 0).toFixed(3)} د.ك`, icon: <FileText />, category: 'نتائج مباشرة', action: () => onNavigate('invoices-list', { exactId: inv.id, search: inv.id }) }));

    const supplierMatches = (data?.suppliers || [])
      .filter((s: any) => clean(s.name).includes(q))
      .slice(0, 3)
      .map((s: any) => ({ id: `supp-${s.id}`, label: `مورد: ${s.name}`, hint: 'مورد', icon: <Truck />, category: 'نتائج مباشرة', action: () => onNavigate('suppliers', { exactId: s.id, search: s.name }) }));

    const expenseMatches = (data?.expenses || [])
      .filter((e: any) => clean(e.description).includes(q))
      .slice(0, 3)
      .map((e: any) => ({ id: `exp-${e.id}`, label: `مصروف: ${e.description}`, hint: `${Number(e.amount || 0).toFixed(3)} د.ك`, icon: <PieChart />, category: 'نتائج مباشرة', action: () => onNavigate('expenses', { exactId: e.id, search: e.description }) }));

    return [...base, ...customerMatches, ...productMatches, ...invoiceMatches, ...supplierMatches, ...expenseMatches];
  }, [deferredQuery, data, onNavigate, userRole]);

  const filteredCommands = useMemo(() => {
    const q = clean(deferredQuery);
    if (!q) return commands;
    return commands.filter(c => clean(c.label).includes(q) || clean(c.category).includes(q) || clean(c.hint).includes(q) || c.tags?.some((t) => clean(t).includes(q)));
  }, [commands, deferredQuery]);

  const priority = ['dashboard-main','reports','dashboard-loyalty','dashboard-promocodes','smart-studio','dashboard-growth','ai','dashboard-diwaniya','dashboard-financials','new-invoice','orders','invoices-list','products-page','customers-page','settings'];
  const featured = useMemo(() => {
    const sorted = [...filteredCommands].sort((a, b) => {
      const ai = priority.indexOf(a.id);
      const bi = priority.indexOf(b.id);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return sorted.slice(0, deferredQuery ? 8 : 7);
  }, [filteredCommands, deferredQuery]);

  const runCommand = (cmd: CommandItem) => {
    try {
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
    }
  }, [isOpen]);

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
            <div className="command-compact-close-row">
              <input
                ref={inputRef}
                type="text"
                aria-label="بحث الأوامر"
                className="command-hidden-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button type="button" onClick={onClose} className="command-premium-close"><X size={18} /></button>
            </div>

            <div className="px-4 md:px-5 py-3 border-b border-slate-100 bg-slate-50/70 text-right">
              <strong className="block text-sm text-slate-800">الأهم أولاً</strong>
              <span className="text-[11px] font-bold text-slate-400">مركز القيادة، التقارير، الولاء، العروض، المحتوى، النمو، المساعد، الديوانية، وحماية الأرباح.</span>
            </div>

            <div className="max-h-[46vh] md:max-h-[390px] overflow-y-auto p-3 md:p-4 custom-scrollbar">
              {filteredCommands.length > 0 ? (
                <div className="space-y-4">
                  {['نتائج مباشرة', 'الرئيسية', 'التنقل', 'الإجراءات السريعة', 'الذكاء الاصطناعي', 'تحليلات داخلية', 'الولاء والكوبونات'].map(category => {
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
              <div className="flex items-center gap-2"><Command size={12} /><span>أداة قيادة</span></div>
              <div className="flex items-center gap-2"><Clock size={12} /><span>اختيار سريع بدون تنقل طويل</span></div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default CommandBar;
