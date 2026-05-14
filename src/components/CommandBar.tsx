import React, { useState, useEffect, useRef, useMemo, useDeferredValue } from 'react';
import { 
 Search, 
 Command, 
 PlusCircle, 
 Users, 
 Package, 
 PieChart, 
 Sparkles,
 Zap,
 TrendingUp,
 MessageCircle,
 X,
 ArrowRight,
 Target,
 Truck,
 Activity,
 DollarSign,
 Home,
 ShoppingBag,
 FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface CommandBarProps {
 isOpen: boolean;
 onClose: () => void;
 onNavigate: (page: string, payload?: { search?: string, exactId?: string, scrollTarget?: string }) => void;
 data: any;
 userRole: 'admin' | 'partner';
}

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onNavigate, data, userRole }) => {
 const [query, setQuery] = useState('');
 const deferredQuery = useDeferredValue(query);
 const [selectedIndex, setSelectedIndex] = useState(0);
 const inputRef = useRef<HTMLInputElement>(null);

 const commands = useMemo(() => {
 const allTabs = [
 { id: 'dashboard-main', label: 'اللوحة الرئيسية (العرض العام) 🏠', icon: <Home size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'pulse' }), roles: ['admin'] },
 { id: 'dashboard-ai', label: 'مختبر الذكاء الاصطناعي 🧠', icon: <Sparkles size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'intelligence' }), roles: ['admin'] },
 { id: 'dashboard-growth', label: 'محاكي النمو والتسويق 🚀', icon: <Target size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'growth' }), roles: ['admin'] },
 { id: 'dashboard-customers', label: 'العملاء والولاء 👥', icon: <Users size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'customers' }), roles: ['admin'] },
 { id: 'dashboard-suppliers', label: 'الموردين المخاطر 🚚', icon: <Truck size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'suppliers' }), roles: ['admin'] },
 { id: 'dashboard-financials', label: 'المالية وحماية الأرباح 💰', icon: <DollarSign size={18} />, category: 'الرئيسية', action: () => onNavigate('dashboard', { exactId: 'financials' }), roles: ['admin'] },
 { id: 'dashboard-loyalty', label: 'الولاء (Loyalty) 🥇', icon: <TrendingUp size={18} />, category: 'الولاء والكوبونات', action: () => onNavigate('dashboard', { exactId: 'loyalty' }), roles: ['admin'] },
 { id: 'dashboard-promocodes', label: 'الكوبونات (Coupons) 🎟️', icon: <Sparkles size={18} />, category: 'الولاء والكوبونات', action: () => onNavigate('dashboard', { exactId: 'promocodes' }), roles: ['admin'] },
 { id: 'ai', label: 'المساعد الذكي (Chat) ✨', icon: <TrendingUp size={18} />, category: 'الذكاء الاصطناعي', action: () => onNavigate('ai', {}), roles: ['admin', 'partner'] },
 { id: 'new-invoice', label: 'إضافة فاتورة جديدة ➕', icon: <PlusCircle size={18} />, category: 'الإجراءات السريعة', action: () => onNavigate('new-invoice', {}), roles: ['admin', 'partner'] },
 { id: 'customers-page', label: 'بيانات العملاء 👥', icon: <Users size={18} />, category: 'التنقل', action: () => onNavigate('customers', {}), roles: ['admin'] },
 { id: 'products-page', label: 'إدارة المنتجات 📦', icon: <Package size={18} />, category: 'التنقل', action: () => onNavigate('products', {}), roles: ['admin'] },
 { id: 'expenses', label: 'تسجيل مصروفات 💸', icon: <PieChart size={18} />, category: 'الإجراءات السريعة', action: () => onNavigate('expenses', {}), roles: ['admin'] },
 { id: 'orders', label: 'عرض الطلبات 🛍️', icon: <ShoppingBag size={18} />, category: 'التنقل', action: () => onNavigate('orders', {}), roles: ['partner', 'admin'] },
 { id: 'invoices-list', label: 'سجل الفواتير 📋', icon: <FileText size={18} />, category: 'التنقل', action: () => onNavigate('invoices-list', {}), roles: ['partner', 'admin'] },
 ];

 const mainTabs = allTabs.filter(tab => tab.roles.includes(userRole));

 if (!deferredQuery) return mainTabs;

 // Deep Links for internal sections
 const deepLinks: any[] = [
 { id: 'bi-engine-core', label: 'قلب مختبر الذكاء (تحليل الاستقرار)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['القلب', 'نواة', 'مؤشرات', 'قلب مختبر الذكاء', 'استقرار'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'bi-engine-core-section' }) },
 { id: 'strategic-manager', label: 'المدير الاستراتيجي الآلي', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['مدير', 'آلي', 'استراتيجي', 'خطط', 'خطة'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'strategic-manager-section' }) },
 { id: 'vip-missions', label: 'مهام كبار العملاء (VIP)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['مهام', 'vip', 'التنفيذي', 'كبار'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'vip-missions-section' }) },
 { id: 'geo-heatmap', label: 'خريطة الذهب الاستراتيجية', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['خريطة', 'حرارية', 'جغرافي', 'توزيع', 'الذهب'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'geo-heatmap-section' }) },
 { id: 'smart-offers', label: 'صانع العروض الترويجية الذكية', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['عروض', 'ترويج', 'صانع', 'خصم'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'smart-offers-section' }) },
 { id: 'what-if', label: 'محاكي الطوارئ والسيناريوهات (ماذا لو)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['طوارئ', 'سيناريو', 'ماذا لو', 'توقع', 'محاكي'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'what-if-section' }) },
 { id: 'status-mirror', label: 'مرآة حالة العمل (مؤشرات فورية)', icon: <Activity size={18} />, category: 'تحليلات داخلية', tags: ['مرآة', 'حالة', 'مؤشرات', 'موقف', 'status'], action: () => onNavigate('dashboard', { exactId: 'intelligence', scrollTarget: 'status-mirror-section' }) },
 { id: 'growth-campaigns', label: 'مختبر الحملات التسويقية', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['حملات', 'تسويقية', 'خطة', 'حملة', 'مبيعات'], action: () => onNavigate('dashboard', { exactId: 'growth', scrollTarget: 'smart-campaigns' }) },
 { id: 'dashboard-customers-pulse', label: 'تحليل نبض العملاء (الرضا)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['نبض', 'تحليل', 'رضا', 'شكاوي', 'صوت'], action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'customers-pulse-section' }) },
 { id: 'customers-retention', label: 'رادار استرجاع العملاء الغائبين', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['استرجاع', 'غائبين', 'احتفاظ', 'رادار'], action: () => onNavigate('dashboard', { exactId: 'customers', scrollTarget: 'retention-section' }) },
 { id: 'financial-guard', label: 'حارس الأرباح الحقيقية (تحليل الهدر)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['حارس', 'ارباح', 'هدر', 'صافي'], action: () => onNavigate('dashboard', { exactId: 'financials', scrollTarget: 'profit-guard-section' }) },
 { id: 'pulse-matrix', label: 'مصفوفة نبض المنتجات (الأصناف المربحة)', icon: <Search size={18} />, category: 'تحليلات داخلية', tags: ['مصفوفة', 'نبض', 'اصناف', 'المنتجات'], action: () => onNavigate('dashboard', { exactId: 'pulse', scrollTarget: 'products-matrix-section' }) },
 ];

 const base = [...mainTabs, ...deepLinks];

 // Search Customers
 const customerMatches = (data?.customers || [])
 .filter((c: any) => (c.name || '').toLowerCase().includes(deferredQuery.toLowerCase()) || (c.phone || '').includes(deferredQuery))
 .slice(0, 3)
 .map((c: any) => ({
 id: `cust-${c.id}`,
 label: `عميل: ${c.name}`,
 icon: <Users size={18} />,
 category: 'العملاء',
 action: () => onNavigate('customers', { exactId: c.id, search: c.name })
 }));

 // Search Products
 const productMatches = (data?.products || [])
 .filter((p: any) => (p.name || '').toLowerCase().includes(deferredQuery.toLowerCase()))
 .slice(0, 3)
 .map((p: any) => ({
 id: `prod-${p.id}`,
 label: `منتج: ${p.name}`,
 icon: <Package size={18} />,
 category: 'المنتجات',
 action: () => onNavigate('products', { exactId: p.id, search: p.name })
 }));

 // Search Invoices
 const invoiceMatches = (data?.invoices || [])
 .filter((inv: any) => (inv.id || '').includes(deferredQuery) || (inv.id || '').toLowerCase().includes(deferredQuery.toLowerCase()))
 .slice(0, 3)
 .map((inv: any) => ({
 id: `inv-${inv.id}`,
 label: `فاتورة: ${inv.id}`,
 icon: <PlusCircle size={18} />,
 category: 'الفواتير',
 action: () => onNavigate('invoices-list', { exactId: inv.id, search: inv.id })
 }));

 // Search Suppliers
 const supplierMatches = (data?.suppliers || [])
 .filter((s: any) => (s.name || '').toLowerCase().includes(deferredQuery.toLowerCase()))
 .slice(0, 3)
 .map((s: any) => ({
 id: `supp-${s.id}`,
 label: `مورد: ${s.name}`,
 icon: <Zap size={18} />,
 category: 'الموردين',
 action: () => onNavigate('suppliers', { exactId: s.id, search: s.name })
 }));

 // Search Expenses
 const expenseMatches = (data?.expenses || [])
 .filter((e: any) => (e.description || '').toLowerCase().includes(deferredQuery.toLowerCase()))
 .slice(0, 3)
 .map((e: any) => ({
 id: `exp-${e.id}`,
 label: `مصروف: ${e.description}`,
 icon: <PieChart size={18} />,
 category: 'المصروفات',
 action: () => onNavigate('expenses', { exactId: e.id, search: e.description })
 }));

 return [...base, ...customerMatches, ...productMatches, ...invoiceMatches, ...supplierMatches, ...expenseMatches];
 }, [deferredQuery, data, onNavigate]);

 const filteredCommands = deferredQuery 
 ? commands.filter(c => 
 c.label.toLowerCase().includes(deferredQuery.toLowerCase()) || 
 c.category.toLowerCase().includes(deferredQuery.toLowerCase()) || 
 (c as any).tags?.some((t: string) => t.toLowerCase().includes(deferredQuery.toLowerCase()))
) 
 : commands;

 useEffect(() => {
 setSelectedIndex(0);
 }, [query]);

 useEffect(() => {
 if (isOpen) {
 setTimeout(() => inputRef.current?.focus(), 100);
 setQuery('');
 setSelectedIndex(0);
 }
 }, [isOpen]);

 useEffect(() => {
 const handleKeyDown = (e: KeyboardEvent) => {
 if (!isOpen) return;

 if (e.key === 'ArrowDown') {
 setSelectedIndex(prev => filteredCommands.length > 0 ? (prev + 1) % filteredCommands.length : 0);
 } else if (e.key === 'ArrowUp') {
 setSelectedIndex(prev => filteredCommands.length > 0 ? (prev - 1 + filteredCommands.length) % filteredCommands.length : 0);
 } else if (e.key === 'Enter') {
 const selected = filteredCommands[selectedIndex];
 if (selected) {
 selected.action();
 onClose();
 }
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
 <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 sm:px-6">
 <motion.div 
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={onClose}
 className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
 />
 
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: -20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: -20 }}
 className="relative w-full max-w-2xl bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-200 overflow-hidden"
 >
 <div className="p-3 border-b border-slate-200/60 flex items-center gap-3">
 <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
 <Zap size={20} className="animate-pulse" />
 </div>
 <input 
 ref={inputRef}
 type="text"
 placeholder="اكتب أمراً.. (مثلاً: أضف فاتورة، ابحث عن عميل، تحليل المبيعات)..."
 className="flex-1 bg-transparent border-none outline-none text-lg font-bold text-slate-900 placeholder:text-slate-300 text-right h-12"
 dir="rtl"
 value={query}
 onChange={(e) => setQuery(e.target.value)}
 />
 <kbd className="hidden sm:flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-slate-500">
 <span>ESC</span>
 </kbd>
 </div>

 <div className="max-h-[300px] sm:max-h-[400px] overflow-y-auto p-2 min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0">
 {filteredCommands.length > 0 ? (
 <div className="space-y-4">
 {/* Group by category */}
 {['الرئيسية', 'الولاء والكوبونات', 'الإجراءات السريعة', 'التنقل', 'الذكاء الاصطناعي', 'تحليلات داخلية', 'العملاء', 'المنتجات', 'الفواتير', 'الموردين', 'المصروفات', 'المالية'].map(category => {
 const catCommands = filteredCommands.filter(c => c.category === category);
 if (catCommands.length === 0) return null;
 
 return (
 <div key={category} className="space-y-1">
 <div className="px-4 py-1 text-[11px] sm:text-xs font-bold uppercase text-slate-500 text-right">
 {category}
 </div>
 {catCommands.map((cmd) => {
 const globalIndex = filteredCommands.indexOf(cmd);
 const isActive = globalIndex === selectedIndex;
 
 return (
 <button
 key={cmd.id}
 onClick={() => { cmd.action(); onClose(); }}
 onMouseEnter={() => setSelectedIndex(globalIndex)}
 className={cn(
"w-full flex items-center gap-3 px-4 py-2 sm:py-4 rounded-xl sm:rounded-2xl transition-all text-right group",
 isActive ?"bg-indigo-600 text-white shadow-[0_2px_10px_rgb(0,0,0,0.04)] shadow-indigo-600/20" :"hover:bg-slate-50 text-slate-600"
)}
 >
 <div className={cn(
"w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0",
 isActive ?"bg-white/20" :"bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600"
)}>
 {React.cloneElement(cmd.icon as React.ReactElement, { size: 16 } as any)}
 </div>
 <div className="flex-1">
 <div className="font-bold text-xs sm:text-sm">{cmd.label}</div>
 </div>
 {isActive && <ArrowRight size={16} className="text-white/40 rotate-180" />}
 </button>
);
 })}
 </div>
);
 })}
 </div>
) : (
 <div className="p-3 md:p-4 md:p-5 md:p-4 text-center">
 <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200/60">
 <Search size={28} className="text-slate-200" />
 </div>
 <div className="font-bold text-slate-500">ما في نتائج طال عمرك!</div>
 <div className="text-xs text-slate-300 mt-1">جرب كلمات ثانية مثل"فاتورة" أو"عميل"</div>
 </div>
)}
 </div>

 <div className="p-3 bg-slate-50 border-t border-slate-200/60 flex items-center justify-between text-[11px] sm:text-xs font-bold text-slate-500">
 <div className="flex items-center gap-3">
 <div className="flex items-center gap-1"><Command size={10} /> + K</div>
 <span>للبحث السريع</span>
 </div>
 <span>نظام التراث - النسخة الذكية ✨</span>
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>
);
};

export default CommandBar;
