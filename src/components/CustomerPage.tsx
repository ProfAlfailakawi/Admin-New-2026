import React, { useState } from 'react';
import { 
 Users, Search, Plus, Trash2, UserPlus, Phone, 
 Calendar, ShoppingBag, Edit2, AlertCircle, 
 TrendingUp, UserCheck, UserMinus, Sparkles, Clock, X,
 Heart,
 BrainCircuit,
 MessageSquare,
 Gift,
 Crown,
 Printer,
 Crosshair,
 Award,
 MapPin
} from 'lucide-react';
import { AppState, Customer } from '../types';
import { cn, normalizeArabic } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import SmartEmptyState from './SmartEmptyState';
import { toast } from 'sonner';
import { NumericInput } from './ui/NumericInput';
import TestimonialsManager from './TestimonialsManager';

interface CustomerPageProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 deepLinkData?: { search?: string; exactId?: string };
 onClearDeepLink?: () => void;
}

const CustomerPage: React.FC<CustomerPageProps> = React.memo(({ data, setData, deepLinkData, onClearDeepLink }) => {
 const [search, setSearch] = useState('');
 const [selectedCustomerInvoices, setSelectedCustomerInvoices] = useState<{name: string, invoices: any[]} | null>(null);

 React.useEffect(() => {
 if (deepLinkData?.search) {
 setSearch(deepLinkData.search);
 setTimeout(() => {
 const input = document.getElementById('search-input') as HTMLInputElement;
 if (input) input.focus();
 }, 100);
 if (deepLinkData.exactId) {
 const exactCustomer = (data?.customers || []).find(c => c.id === deepLinkData.exactId);
 if (exactCustomer) {
 const custInvs = (data?.invoices || []).filter(inv => !inv.isDeleted && inv.customerId === exactCustomer.id);
 setSelectedCustomerInvoices({ name: exactCustomer.name, invoices: custInvs });
 }
 }
 if (onClearDeepLink) onClearDeepLink();
 }
 }, [deepLinkData, data?.customers, data?.invoices, onClearDeepLink]);

 const [filterType, setFilterType] = useState<string>('all');
 const [sentimentFilter, setSentimentFilter] = useState<string>('all');
 const [showFilters, setShowFilters] = useState(false);
 const [showModal, setShowModal] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [customerForm, setCustomerForm] = useState({ name: '', phone: '', status: 'active' as Customer['status'], area: '', address: '' });
 const [deleteError, setDeleteError] = useState<string | null>(null);
 const [shakingId, setShakingId] = useState<string | null>(null);
 const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
 const [analyzingCustomer, setAnalyzingCustomer] = useState<Customer | null>(null);
 const [showTestimonials, setShowTestimonials] = useState(false);

 const cancelledOrderInvoiceIds = new Set((data.orders || []).filter(o => o.status === 'cancelled' && o.isConvertedToInvoice && o.linkedInvoiceId).map(o => o.linkedInvoiceId));
 const activeInvoices = (data?.invoices || []).filter(inv => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id) && (isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined));

 const getCustomerStats = (customerId: string) => {
 const customerInvoices = activeInvoices.filter(inv => inv.customerId === customerId);
 return {
 totalOrders: customerInvoices.length,
 totalSpent: customerInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0)
 };
 };

 const now = new Date();
 const normalizedSearch = normalizeArabic(search);
 
 const filteredCustomers = (data?.customers || []).filter(c => {
 const matchesSearch = normalizeArabic(c.name || '').includes(normalizedSearch) || 
 (c.phone || '').includes(search);
 
 // Status/Recovery Filter
 let matchesStatus = true;
 if (filterType !== 'all') {
 const diff = c.lastOrderDate ? (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24) : 999;
 if (filterType === 'inactive') matchesStatus = diff > 90;
 if (filterType === 'slow') matchesStatus = diff > 30 && diff <= 90;
 if (filterType === 'active') matchesStatus = diff <= 30;
 
 if (filterType === 'vip') {
 const stats = getCustomerStats(c.id);
 matchesStatus = stats.totalSpent >= 800 || stats.totalOrders >= 20;
 }
 }

 // Sentiment Filter
 let matchesSentiment = true;
 if (sentimentFilter !== 'all') {
 matchesSentiment = c.sentiment === sentimentFilter;
 }

 return matchesSearch && matchesStatus && matchesSentiment;
 }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

 const totalCustomers = (data?.customers || []).length;
 const vipCustomers = (data?.customers || []).filter(c => {
 const stats = getCustomerStats(c.id);
 return stats.totalSpent >= 800 || stats.totalOrders >= 20;
 }).length;
 const newCustomers = (data?.customers || []).filter(c => {
 if (!c.lastOrderDate) return false;
 const diff = (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
 return diff <= 30;
 }).length;

 const slowCustomers = (data?.customers || []).filter(c => {
 if (!c.lastOrderDate) return false;
 const diff = (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
 return diff > 30 && diff <= 90;
 }).length;

 const inactiveCustomers = (data?.customers || []).filter(c => {
 if (!c.lastOrderDate) return true;
 const diff = (now.getTime() - new Date(c.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24);
 return diff > 90;
 }).length;

 const handleSaveCustomer = () => {
 if (!customerForm.name || !customerForm.phone) {
 toast.error("بيان ناقص", { description:"يرجى إدخال الاسم ورقم الهاتف." });
 return;
 }
 
 // Strict validation: 8 digits, English numbers only
 const phoneRegex = /^[0-9]{8}$/;
 if (!phoneRegex.test(customerForm.phone)) {
 toast.error("رقم غير صالح", { description:"رقم الهاتف يجب أن يتكون من 8 أرقام إنجليزية فقط (مثال: 99881122)." });
 return;
 }

 const isDuplicate = (data?.customers || []).some(c => c.phone === customerForm.phone && c.id !== editingId);
 if (isDuplicate) {
 toast.warning("تنبيه: الرقم مسجل مسبقاً", { 
 description:"هذا الرقم موجود في سجلات المطعم. يمنع التكرار لضمان دقة نقاط الولاء."
 });
 return;
 }

 if (editingId) {
 setData(prev => {
 const updatedCustomers = (prev?.customers || []).map(c => 
 c.id === editingId ? { ...c, ...customerForm } : c
);
 const updatedOrders = (prev?.orders || []).map(o => {
 if (o.customerId === editingId || o.customerPhone === customerForm.phone) {
 return { ...o, customerName: customerForm.name };
 }
 return o;
 });
 return {
 ...prev,
 customers: updatedCustomers,
 orders: updatedOrders
 };
 });
 toast.success("تم التحديث ✨", { description: `تم تعديل بيانات العميل ومزامنة طلباته السابقة.` });
 } else {
 const id = Math.random().toString(36).substr(2, 9);
 setData(prev => ({
 ...prev,
 customers: [...(prev?.customers || []), { ...customerForm, id, totalOrders: 0, totalSpent: 0 }]
 }));
 toast.success("تم الحفظ بنجاح ✨", { description: `تمت إضافة العميل ${customerForm.name} لقاعدة البيانات.` });
 }
 closeModal();
 };

 const openAddModal = () => {
 setEditingId(null);
 setCustomerForm({ name: '', phone: '', status: 'active', area: '', address: '' });
 setShowModal(true);
 };

 const openEditModal = (customer: Customer) => {
 setEditingId(customer.id);
 setCustomerForm({ name: customer.name, phone: customer.phone, status: customer.status, area: customer.area || '', address: customer.address || '' });
 setShowModal(true);
 };

 const closeModal = () => {
 setShowModal(false);
 setEditingId(null);
 setCustomerForm({ name: '', phone: '', status: 'active', area: '', address: '' });
 };

 const handleDeleteCustomer = (customer: Customer) => {
 const stats = getCustomerStats(customer.id);
 if (stats.totalOrders > 0) {
 const errorMsg = `العميل"${customer.name}" لديه ${stats.totalOrders} طلبات سابقة. يمكنك تغيير حالته بدلاً من حذفه.`;
 toast.error("لا يمكن الحذف", { 
 description: errorMsg,
 duration: 6000,
 position: 'bottom-right'
 });
 setDeleteError(errorMsg);
 setShakingId(customer.id);
 setCustomerToDelete(null);
 setTimeout(() => {
 setDeleteError(null);
 setShakingId(null);
 }, 5000);
 return;
 }

 setData(prev => ({
 ...prev,
 customers: (prev?.customers || []).filter(c => c.id !== customer.id)
 }));
 toast.info("تم الحذف", { description: `تمت إزالة سجل العميل"${customer.name}" بالكامل.` });
 setCustomerToDelete(null);
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-right">
 <div className="order-2 md:order-1 flex-1">
 <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-2 justify-end">
 إدارة العملاء
 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center shadow-sm">
 <Users className="text-indigo-600" />
 </div>
 </h1>
 <p className="text-slate-500 font-medium">سجل شامل لعملاء مطبخ التراث وتفضيلاتهم</p>
 </div>
 </div>

 {/* Stats Cards */}
 <div className="grid grid-cols-1 sm:grid flex-col md:grid md:grid-cols-2 gap-2 md:p-3">
 <StatCard label="إجمالي المسجلين" value={totalCustomers} icon={<Users />} color="blue" description="كامل قاعدة البيانات" />
 <StatCard label="كبار الشخصيات (VIP)" value={vipCustomers} icon={<Crown />} color="accent" description="أكثر من 800 د.ك أو 20 طلب" />
 <StatCard label="عملاء متباطئون" value={slowCustomers} icon={<Clock />} color="amber" description="منذ 30 إلى 90 يوم" />
 <StatCard label="عملاء منقطعون" value={inactiveCustomers} icon={<UserMinus />} color="red" description="أكثر من 90 يوم سكون" />
 </div>

 <AnimatePresence>
 {deleteError && (
 <motion.div 
 initial={{ opacity: 0, y: -20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 className="bg-red-50 border border-red-200 p-3 rounded-2xl flex items-center gap-2 text-red-600 font-bold shadow-sm"
 >
 <AlertCircle />
 <span>{deleteError}</span>
 </motion.div>
)}
 </AnimatePresence>

 <div className="bg-white rounded-3xl p-3 md:p-3 border border-slate-200 shadow-sm">
 <div className="flex flex-col md:flex-row md:items-center gap-2 mb-6">
 <div className="relative flex-1 flex flex-col gap-2">
 <div className="relative">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 id="search-input"
 type="text" 
 placeholder="ابحث بالاسم أو رقم الهاتف..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
 />
 </div>
  <div className="flex gap-2">
  <button 
  onClick={openAddModal}
  className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex-1"
  >
  <UserPlus size={20} />
  <span>إضافة عميل جديد</span>
  </button>
  </div>

 </div>
 
 <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full lg:w-auto">
 <div className="flex overflow-x-auto hide-scrollbar bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200 w-full sm:w-auto">
 {[
 { id: 'all', label: 'الكل', icon: <Users size={14} /> },
 { id: 'vip', label: 'VIP', icon: <Crown size={14} className="text-accent" /> },
 { id: 'active', label: 'نشط', icon: <UserCheck size={14} className="text-emerald-500" /> },
 { id: 'slow', label: 'راكد', icon: <Clock size={14} className="text-amber-500" /> },
 { id: 'inactive', label: 'مفقود', icon: <UserMinus size={14} className="text-red-500" /> }
 ].map((t) => (
 <button
 key={t.id}
 onClick={() => setFilterType(t.id)}
 className={cn(
"px-3 md:px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap",
 filterType === t.id ?"bg-white text-indigo-600 shadow-sm" :"hover:bg-white/50 text-slate-500"
)}
 >
 {t.icon}
 {t.label}
 </button>
))}
 </div>

 <div className="relative group w-full md:w-auto">
 <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-indigo-500">
 <Heart size={14} />
 </div>
 <select 
 value={sentimentFilter}
 onChange={(e) => setSentimentFilter(e.target.value)}
 className="bg-slate-100 border border-slate-200 rounded-2xl py-2.5 pr-10 pl-4 w-full text-xs font-black text-slate-600 outline-none cursor-pointer hover:bg-slate-200 transition-all appearance-none"
 >
 <option value="all">كل المشاعر</option>
 <option value="positive">سعيد جداً 😊</option>
 <option value="neutral">محايد 😐</option>
 <option value="negative">غير راضٍ 😠</option>
 </select>
 </div>
 </div>
 </div>

 <div className="overflow-x-auto rounded-3xl border border-slate-200">
 <table className="w-full text-right min-w-[800px]" dir="rtl">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-400 text-xs uppercase tracking-wider text-right">
 <th className="p-3 mr-2">الاسم</th>
 <th className="p-3">إجمالي الفواتير</th>
 <th className="p-3">رقم الهاتف</th>
 <th className="p-3">الحالة</th>
 <th className="p-3">الولاء (نقاط)</th>
 <th className="p-3">تحليل المشاعر</th>
 <th className="p-3 text-left">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(filteredCustomers || []).length === 0 ? (
 <tr key="empty-state">
 <td colSpan={6} className="py-20 px-4 text-center">
 <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
 <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
 <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
 <Users size={48} />
 </div>
 <h3 className="text-xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">لا يوجد عملاء!</h3>
 <p className="text-slate-500 font-bold mb-8 leading-relaxed">قائمة عملائك فارغة. أضف أول عميل وابدأ ببناء قاعدة ذهبية لولاء العملاء.</p>
 <button 
 onClick={() => setShowModal(true)} 
 className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-black flex items-center gap-2 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1 mx-auto"
 >
 <Plus size={24} />
 <span>ابدأ رحلتك وضيف أول عميل الآن!</span>
 </button>
 </div>
 </td>
 </tr>
) : (filteredCustomers || []).map(customer => {
 const stats = getCustomerStats(customer.id);
 const diffDays = customer.lastOrderDate 
 ? (now.getTime() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
 : Infinity;
 
 const currentStatus = diffDays <= 30 ? 'active' : diffDays <= 90 ? 'slow' : 'inactive';

 return (
 <motion.tr 
 key={customer.id} 
 animate={shakingId === customer.id ? { 
 x: [0, -10, 10, -10, 10, 0],
 backgroundColor: ['rgba(255,255,255,1)', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.1)', 'rgba(255,255,255,1)']
 } : {}}
 transition={shakingId === customer.id ? { duration: 0.5 } : {}}
 className={cn(
"hover:bg-slate-50/80 transition-colors group",
 shakingId === customer.id &&"bg-red-50/50"
)}
 >
 <td className="p-3">
 <div className="flex items-center gap-2">
 <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
 {customer.name[0]}
 </div>
 <span 
 className="font-bold text-slate-700 cursor-pointer hover:text-primary transition-colors"
 onClick={() => setSelectedCustomerInvoices({ 
 name: customer.name, 
 invoices: activeInvoices
 .filter(inv => inv.customerId === customer.id)
 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) 
 })}
 >
 {customer.name}
 </span>
 {(getCustomerStats(customer.id).totalSpent >= 1000 && getCustomerStats(customer.id).totalOrders >= 10) && (
 <span className="bg-accent/10 text-accent-dark text-[10px] font-black px-2 py-0.5 rounded-full border border-accent/20 flex items-center gap-1">
 <Crown size={10} />
 VIP
 </span>
)}
 </div>
 </td>
 <td className="p-3 font-black text-slate-900 border-l border-slate-50">
 {Number(stats.totalSpent || 0).toFixed(3)} د.ك
 </td>
 <td className="p-3">
 <div className="flex items-center gap-2 text-slate-600 font-medium">
 <Phone size={14} className="text-slate-400" />
 {customer.phone}
 </div>
 </td>
 <td className="p-3">
 <div className="flex flex-col gap-1 items-end">
 <span className={cn(
"px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit",
 (customer.status === 'active') ?"bg-green-100 text-green-700" : 
 (customer.status === 'slow') ?"bg-amber-100 text-amber-700" : 
"bg-red-100 text-red-700"
)}>
 {customer.status === 'active' ? 'نشط' : customer.status === 'slow' ? 'متباطئ' : 'منقطع'}
 </span>
 {customer.status === 'inactive' && (
 <div className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 w-fit animate-pulse border border-red-800 shadow-md">
 <AlertCircle size={10} />
 <span>صياد العملاء</span>
 </div>
)}
 </div>
 </td>
 <td className="p-3">
 <div className="flex flex-col items-end gap-1">
 <div className="flex items-center gap-2 font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-xl border border-rose-100 w-fit">
 <Heart size={14} fill="currentColor" />
 {Math.floor(stats.totalSpent || 0)} نقطة
 </div>
 </div>
 </td>
 <td className="p-3">
 <div className={cn(
"flex items-center gap-2 px-3 py-1 rounded-xl border text-[10px] font-black w-fit",
 customer.sentiment === 'positive' ?"bg-green-50 text-green-600 border-green-100" :
 customer.sentiment === 'negative' ?"bg-red-50 text-red-600 border-red-100" :
"bg-slate-50 text-slate-500 border-slate-100"
)}>
 {customer.sentiment === 'positive' ? 'سعيد جداً' : customer.sentiment === 'negative' ? 'غير راضٍ' : 'محايد'}
 </div>
 </td>
 <td className="p-3 text-left">
 <div className="flex items-center gap-2 justify-end">
 <button 
 title="واتساب - إرسال عرض مخصص"
 onClick={(e) => {
 e.stopPropagation();
 const products = (data?.products || []).length > 0 ? (data?.products || []).map(p => p.name) : ['مجبوس دجاج رويال', 'مطبق زبيدي بلاتينيوم', 'جريش لحم ناطع', 'هريس التراث'];
 const randomProduct = products[Math.floor(Math.random() * products.length)];
 
 const templates = [
 `يا هلا ${customer.name}، اشتقنا لك! ✨\nعرض خاص لك (${randomProduct}) مع توصيل مجاني. اطلب الحين!`,
 `يا ${customer.name}، التراث يفتقدك! ✨\nجرب ${randomProduct} بخصم 20% خاص لك لليوم.`
 ];
 const message = templates[Math.floor(Math.random() * templates.length)];
 
 window.open(`https://wa.me/${customer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
 }}
 className="p-2 bg-pink-50 hover:bg-pink-100 rounded-lg text-pink-500 hover:text-pink-600 transition-all active:scale-90"
 >
 <Gift size={18} />
 </button>
 <button 
 title="تحليل المستشار الذكي"
 onClick={(e) => {
 e.stopPropagation();
 setAnalyzingCustomer(customer);
 }}
 className="p-2 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-indigo-400 hover:text-indigo-600 transition-all active:scale-90"
 >
 <Sparkles size={18} />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); openEditModal(customer); }}
 className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
 >
 <Edit2 size={18} />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); setCustomerToDelete(customer); }}
 className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
 >
 <Trash2 size={18} />
 </button>
 </div>
 </td>
 </motion.tr>
);
 })}
 </tbody>
 </table>
 </div>
 </div>

 {/* Modal */}
 <AnimatePresence>
 {showModal && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
 onClick={() => setShowModal(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="bg-white rounded-[32px] w-[min(96vw,720px)] shadow-2xl p-0 border border-slate-100 flex flex-col max-h-[90dvh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="p-3 md:p-3 pb-0 shrink-0">
 <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 justify-end text-right">
 {editingId ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}
 <UserPlus className="text-primary" />
 </h2>
 </div>

 <div className="overflow-y-auto custom-scrollbar flex-1 p-3 md:p-3 pt-4 min-h-0">
 <div className="space-y-6 text-right">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">اسم العميل بالكامل</label>
 <input 
 type="text" 
 value={customerForm.name}
 onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 placeholder="أدخل الاسم..."
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">رقم الهاتف الكويتي</label>
 <NumericInput 
 value={customerForm.phone}
 onChange={(val) => setCustomerForm({ ...customerForm, phone: val.toString() })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right font-mono"
 placeholder="99XXXXXX"
 maxLength={8}
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">المنطقة</label>
 <input 
 type="text" 
 value={customerForm.area}
 onChange={(e) => setCustomerForm({ ...customerForm, area: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 placeholder="أدخل المنطقة (اختياري)..."
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block">العنوان والتفاصيل</label>
 <textarea 
 value={customerForm.address}
 onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right resize-none h-20"
 placeholder="أدخل العنوان والتفاصيل كاملة (اختياري)..."
 />
 </div>
 </div>
 </div>
 
 <div className="flex gap-2 p-3 md:p-3 shrink-0 mt-auto border-t border-slate-50">
 <button 
 onClick={closeModal}
 className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl transition-all"
 >
 إلغاء
 </button>
 <button 
 onClick={handleSaveCustomer}
 className="flex-1 py-4 bg-primary hover:bg-primary-dark text-white font-bold rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95"
 >
 تأكيد العملية
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>

 {/* Customer Invoices History Modal */}
 <AnimatePresence>
 {selectedCustomerInvoices && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-3"
 onClick={() => setSelectedCustomerInvoices(null)}
 >
 <motion.div 
 initial={{ opacity: 0, y: 30, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 exit={{ opacity: 0, y: 30, scale: 0.95 }}
 className="bg-white rounded-[40px] w-[95%] max-w-2xl shadow-2xl p-0 border border-slate-100 max-h-[90dvh] flex flex-col overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="p-3 md:p-3 pb-4 border-b border-slate-100 flex items-center justify-between flex-row-reverse text-right shrink-0">
 <div className="text-right">
 <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">سجل فواتير العميل</h2>
 <p className="font-bold text-primary text-sm">{selectedCustomerInvoices.name}</p>
 </div>
 <button onClick={() => setSelectedCustomerInvoices(null)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
 <X />
 </button>
 </div>

 <div className="flex-1 overflow-y-auto min-h-0 p-3 md:p-3 space-y-4 custom-scrollbar">
 {selectedCustomerInvoices.invoices.length === 0 && (
 <SmartEmptyState subtitle="لا توجد فواتير سابقة لهذا العميل." className="py-20" />
)}
 {(selectedCustomerInvoices.invoices || []).map((inv) => (
 <div key={inv.id} className="bg-slate-50 border border-slate-100 rounded-3xl p-3 md:p-3 hover:bg-white hover:border-primary/30 transition-all hover:shadow-md text-right cursor-default"
 >
 <div className="flex justify-between items-start mb-4 gap-2">
 <div className="flex flex-col gap-2 shrink-0">
 <div className="text-left">
 <div className="text-lg md:text-xl font-black text-slate-900">{Number(inv.totalAmount || 0).toFixed(3)} د.ك</div>
 <div className="text-[10px] text-slate-400 font-bold uppercase">{inv.paymentMethod}</div>
 </div>
 <button
 onClick={(e) => {
 e.stopPropagation();
 import('../lib/printUtils').then(({ generateInvoiceHTML }) => {
 const printContent = generateInvoiceHTML(inv, data);
 const win = window.open('', '', 'width=400,height=600');
 if(win) {
 win.document.write(printContent);
 win.document.close();
 }
 });
 }}
 className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 hover:bg-indigo-100 transition-colors text-xs font-black shadow-sm"
 >
 <Printer size={12} />
 طباعة
 </button>
 </div>
 <div className="text-right">
 <div className="font-black text-slate-800 text-base md:text-lg">فاتورة #{inv.id}</div>
 <div className="text-[10px] md:text-xs text-slate-400 font-bold">{new Date(inv.date).toLocaleString('en-GB')}</div>
 </div>
 </div>
 <div className="flex flex-wrap gap-2 justify-end pt-4 border-t border-slate-200/50">
 {Object.values((inv.items || []).reduce((acc: any, item: any) => {
 if (!acc[item.productId]) {
 acc[item.productId] = { ...item };
 } else {
 acc[item.productId].quantity += (item.quantity || 0);
 }
 return acc;
 }, {})).map((item: any, idx: number) => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 return (
 <span key={idx} className="bg-white border border-slate-200/60 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500">
 {product?.name || 'منتج'} ({item.quantity || 0})
 </span>
);
 })}
 </div>
 </div>
))}
 </div>
 
 <div className="p-3 md:p-3 shrink-0 mt-auto border-t border-slate-100">
 <button 
 onClick={() => setSelectedCustomerInvoices(null)}
 className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all"
 >
 إغلاق السجل
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>

 <AnimatePresence>
 {customerToDelete && (
 <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
 <ConfirmModal
 title="تأكيد الحذف"
 message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
 onConfirm={() => handleDeleteCustomer(customerToDelete)}
 onCancel={() => setCustomerToDelete(null)}
 />
 </motion.div>
)}
 </AnimatePresence>

 <AnimatePresence>
 {analyzingCustomer && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-3"
 onClick={() => setAnalyzingCustomer(null)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="bg-white rounded-2xl w-[95%] max-w-lg shadow-2xl p-0 border border-slate-100 text-right relative flex flex-col max-h-[90dvh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="p-3 pb-3 shrink-0 border-b border-slate-50 flex items-center justify-between flex-row-reverse">
 <h2 className="text-lg md:text-2xl font-black text-slate-800 flex items-center gap-2 justify-end text-right">
 <Sparkles className="text-indigo-500 shrink-0" size={20} />
 تحليل المستشار الذكي
 </h2>
 <button 
 onClick={() => setAnalyzingCustomer(null)}
 className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
 >
 <X size={20} />
 </button>
 </div>
 
 <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2 md:p-3 space-y-2 md:space-y-4 pt-2 md:pt-4">
 <div className="bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100 text-indigo-600 font-bold text-xs md:text-sm">
 جاري تحليل بيانات العميل: {analyzingCustomer.name}
 </div>
 {(() => {
 const custInvoices = activeInvoices.filter(inv => inv.customerId === analyzingCustomer.id);
 if (custInvoices.length === 0) {
 return (
 <div className="p-3 md:p-3 text-center bg-slate-50 border border-slate-100 rounded-2xl">
 <AlertCircle className="mx-auto mb-4 text-slate-400" size={32} />
 <p className="text-slate-500 font-bold mb-4">لا توجد بيانات كافية للتحليل. العميل لم يقم بأي طلبات سابقة موثقة في النظام.</p>
 </div>
);
 }

 const totalLifetimeRevenue = custInvoices.reduce((sum, i) => sum + (i.totalAmount || 0), 0);
 const totalLifetimeProfit = custInvoices.reduce((sum, i) => sum + (i.profit || 0), 0);
 const avgOrderProfit = totalLifetimeProfit / custInvoices.length;
 
 const now = new Date().getTime();
 const sortedInvoices = [...custInvoices].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
 const lastOrderDate = new Date(sortedInvoices[0].date).getTime();
 const daysSinceLastOrder = Math.floor((now - lastOrderDate) / (1000 * 60 * 60 * 24));
 
 const allProductIds = custInvoices.flatMap(inv => (inv.items || []).map(item => item.productId));
 
 let favoriteProductId = null;
 if (allProductIds.length > 0) {
 const getMode = (arr: string[]) => arr.reduce((a, b, i, arr) => (arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b), arr[0]);
 favoriteProductId = getMode(allProductIds);
 }
 
 const favoriteProduct = (data?.products || []).find(p => p.id === favoriteProductId);
 const favoriteItem = favoriteProduct ? favoriteProduct.name : 'منتجات غير مسجلة حالياً';
 
 const topProducts = [...(data?.products || [])].map(p => ({
 ...p,
 sold: (activeInvoices || []).flatMap(inv => inv.items || []).filter(i => i.productId === p.id).reduce((sum, i) => sum + (i.quantity || 0), 0)
 })).filter(p => p.isActive !== false && p.sold > 0).sort((a,b) => b.sold - a.sold);
 
 const recommendation = topProducts[0]?.name;

 let logicType: 'inactive' | 'vip' | 'regular' | 'unknown' = 'unknown';
 let logicText = '';
 let actionMsg = '';

 const isInactive = daysSinceLastOrder >= 30; // 30+ days without a purchase
 const isVIP = totalLifetimeRevenue >= 100 || custInvoices.length >= 4; // High lifetime value or frequency

 // Smart Logic Decision Tree (REAL DATA ONLY)
 if (isInactive && favoriteItem !== 'منتجات غير مسجلة حالياً') {
 logicType = 'inactive';
 logicText = `تحليل البيانات: سجلات العميل تؤكد انقطاعه عن الشراء منذ ${daysSinceLastOrder} يوماً. إجمالي مشترياته السابقة (${Number(totalLifetimeRevenue || 0).toFixed(2)} د.ك).\nالصنف الأكثر شراءً:"${favoriteItem}".\n\nالنتيجة: عميل منقطع (Inactive)، يجب اتخاذ إجراء تشغيلي لاستعادته فوراً.\n\nتوصية النظام: لقد قمنا بتجهيز"خطة استعادة العميل". اضغط على الزر أدناه لتنفيذ الإجراء عبر الواتساب مع تقديم عرض مخصص لمنتجه المفضل.`;
 actionMsg = `مرحباً ${analyzingCustomer.name}، اشتقنالك! ⏳ جهزنا لك عرض خاص جداً على منتجك المفضل"${favoriteItem}"، اطلب اليوم واستمتع بالعرض الخاص لعملائنا المميزين!`;
 } else if (isVIP && !isInactive && recommendation) {
 logicType = 'vip';
 logicText = `تحليل البيانات: العميل يمتلك معدل شراء وتفاعل ممتاز (إجمالي الإنفاق: ${Number(totalLifetimeRevenue || 0).toFixed(2)} د.ك) من خلال ${custInvoices.length} منظومة طلب مسجلة.\n\nالنتيجة: العميل يصنف فعلياً كأحد عملاء الـ VIP المستمرين ويساهم بهامش ربح ثابت.\n\nتوصية النظام: إرسال هدية حصرية كمكافأة ولاء للحفاظ على قوة هذا التفاعل وعدم خسارته للمنافسين.`;
 actionMsg = `مرحباً ${analyzingCustomer.name}، بصفتك من عملائنا الـ VIP 🏆 وتقديراً لولائك الدائم نهديك تجربة مجانية لمنتجنا المتميز"${recommendation}" مع طلبك القادم!`;
 } else if (recommendation && !isInactive) {
 logicType = 'regular';
 logicText = `تحليل البيانات: العميل مستمر ومعدل دورانه طبيعي (عدد الطلبات: ${custInvoices.length}).\nآخر طلب كان منذ ${daysSinceLastOrder} يوم.\n\nالنتيجة: العميل نشط حالياً (Active).\n\nتوصية النظام: العميل نشط ولا توجد حاجة للتدخل الطارئ. يمكنك تفعيل أسلوب البيع الإضافي (Up-selling) بشكل روتيني وتوجيهه للصنف الأكثر مبيعاً.`;
 actionMsg = `مرحباً ${analyzingCustomer.name}، ودك تجرب شي مميز عندنا؟ 🌟 منتج"${recommendation}" متوفر اليوم وتقدر تطلبه بخصم حصري.`;
 } else {
 logicText = `لا توجد بيانات سلوكية كافية (طلبات حديثة أو مبالغ) لتخصيص استراتيجية أو خطة محددة لهذا العميل بناءً على القواعد الذكية.`;
 }

 return (
 <>
 <div className="p-3 md:p-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-right">
 <h4 className="text-[10px] font-bold text-indigo-400 uppercase mb-2">💡 التوصية الذكية للمستشار</h4>
 <p className="text-sm font-black text-slate-800 mb-2">{analyzingCustomer.name}</p>
 <div className="text-sm text-indigo-900 leading-relaxed font-medium whitespace-pre-line">
 {logicText}
 </div>
 
 <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-4 text-[9px] md:text-[10px] font-bold">
 <div className="bg-white/50 p-1.5 md:p-2 rounded-lg">صافي ربح العميل: {Number(totalLifetimeProfit || 0).toFixed(2)} د.ك</div>
 <div className="bg-white/50 p-1.5 md:p-2 rounded-lg">هامش الربح: {((Number(totalLifetimeProfit || 0) / Math.max(1, Number(totalLifetimeRevenue || 0))) * 100).toFixed(1)}%</div>
 <div className="bg-white/50 p-1.5 md:p-2 rounded-lg">آخر طلب: منذ {daysSinceLastOrder} يوم</div>
 <div className="bg-white/50 p-1.5 md:p-2 rounded-lg">عدد الطلبات: {custInvoices.length}</div>
 </div>
 </div>

 <div className="grid grid-cols-2 gap-1.5 md:gap-2 mt-4 md:mt-6">
 <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl border border-emerald-100">
 <div className="text-[9px] md:text-[10px] text-emerald-600 font-bold mb-0.5 md:mb-1">صافي الربح التراكمي</div>
 <div className="text-xs md:text-sm font-black text-emerald-900">{Number(totalLifetimeProfit || 0).toFixed(2)} د.ك</div>
 </div>
 <div className="p-2 md:p-3 bg-sky-50 rounded-xl md:rounded-2xl border border-sky-100">
 <div className="text-[9px] md:text-[10px] text-sky-600 font-bold mb-0.5 md:mb-1">القيمة الحياتية (LTV)</div>
 <div className="text-xs md:text-sm font-black text-sky-900">{Number(totalLifetimeRevenue || 0).toFixed(2)} د.ك</div>
 </div>
 <div className="p-2 md:p-3 bg-amber-50 rounded-xl md:rounded-2xl border border-amber-100 col-span-2">
 <div className="text-[9px] md:text-[10px] text-amber-900 font-bold mb-0.5 md:mb-1">مؤشر الولاء المالي</div>
 <div className="text-[10px] md:text-xs font-medium text-amber-800 leading-relaxed">
 العميل حقق مبيعات بنسبة {(((Number(totalLifetimeRevenue || 0)) / Math.max(1, (data?.invoices || []).filter(i => !i.isDeleted).reduce((sum, i) => sum + (i.totalAmount || 0), 0))) * 100).toFixed(1)}% من إجمالي مبيعاتنا.
 </div>
 </div>
 </div>

 {/* Smart Data-Driven Action Button */}
 {logicType === 'inactive' && (
 <div className="flex flex-col gap-2 mt-4 text-right">
 <button 
 onClick={() => {
 let phoneSafe = analyzingCustomer.phone.replace(/[^0-9]/g, '');
 if (phoneSafe.length === 8) phoneSafe = `965${phoneSafe}`;
 window.open(`https://wa.me/${phoneSafe}?text=${encodeURIComponent(actionMsg)}`,"_blank");
 setAnalyzingCustomer(null);
 }}
 className="w-full py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-indigo-600/30"
 >
 <Sparkles size={18} /> تفعيل خطة استعادة العميل (تواصل واتساب)
 </button>
 </div>
)}

 {logicType === 'vip' && (
 <div className="flex flex-col gap-2 mt-4 text-right">
 <button 
 onClick={() => {
 let phoneSafe = analyzingCustomer.phone.replace(/[^0-9]/g, '');
 if (phoneSafe.length === 8) phoneSafe = `965${phoneSafe}`;
 window.open(`https://wa.me/${phoneSafe}?text=${encodeURIComponent(actionMsg)}`,"_blank");
 setAnalyzingCustomer(null);
 }}
 className="w-full py-3 bg-amber-500 text-white font-black rounded-xl hover:bg-amber-400 transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-amber-500/30"
 >
 <Gift size={18} /> إرسال مكافأة العميل VIP
 </button>
 </div>
)}

 {logicType === 'regular' && (
 <div className="flex flex-col gap-2 mt-4 text-right">
 <button 
 onClick={() => {
 let phoneSafe = analyzingCustomer.phone.replace(/[^0-9]/g, '');
 if (phoneSafe.length === 8) phoneSafe = `965${phoneSafe}`;
 window.open(`https://wa.me/${phoneSafe}?text=${encodeURIComponent(actionMsg)}`,"_blank");
 setAnalyzingCustomer(null);
 }}
 className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 text-sm shadow-xl shadow-emerald-600/30"
 >
 <TrendingUp size={18} /> تشغيل استمارة اقتراح بيع إضافي (Up-sell)
 </button>
 </div>
)}
 </>
);
 })()}
 </div>
 
 <div className="p-3 md:p-4 shrink-0 mt-auto border-t border-slate-50 bg-slate-50/30">
 <button 
 onClick={() => setAnalyzingCustomer(null)}
 className="w-full py-3.5 bg-slate-900 text-white font-black rounded-2xl shadow-xl active:scale-95 transition-all outline-none text-base leading-none"
 >
 إغلاق
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>

 <AnimatePresence>
  {showTestimonials && (
   <motion.div 
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }} 
    className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 md:p-8"
    onClick={() => setShowTestimonials(false)}
   >
    <motion.div 
     initial={{ opacity: 0, scale: 0.9, y: 40 }}
     animate={{ opacity: 1, scale: 1, y: 0 }}
     exit={{ opacity: 0, scale: 0.9, y: 40 }}
     className="bg-slate-50 rounded-[2.5rem] w-full max-w-6xl h-full max-h-[90dvh] shadow-3xl p-6 md:p-10 border border-white/20 text-right overflow-hidden relative flex flex-col"
     onClick={e => e.stopPropagation()}
    >
     <div className="flex justify-between items-center mb-8 shrink-0 flex-row-reverse">
      <button 
       onClick={() => setShowTestimonials(false)}
       className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-100 transition-all text-slate-400 hover:text-slate-600"
      >
       <X size={24} />
      </button>
     </div>
     
     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
      <TestimonialsManager 
       testimonials={data.testimonials || []}
       onClose={() => setShowTestimonials(false)}
       onAdd={(newT) => {
        setData(prev => ({
         ...prev,
         testimonials: [{ ...newT, id: crypto.randomUUID() }, ...(prev.testimonials || [])]
        }));
       }}
       onUpdate={(updatedT) => {
        setData(prev => ({
         ...prev,
         testimonials: (prev.testimonials || []).map(t => t.id === updatedT.id ? updatedT : t)
        }));
       }}
       onDelete={(id) => {
        setData(prev => ({
         ...prev,
         testimonials: (prev.testimonials || []).filter(t => t.id !== id)
        }));
       }}
      />
     </div>
    </motion.div>
   </motion.div>
  )}
 </AnimatePresence>
 </div>
);
});

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color: string; description?: string }> = ({ label, value, icon, color, description }) => {
 const colorMap: Record<string, string> = {
 blue: 'bg-blue-50 text-blue-600 border-blue-100',
 emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
 amber: 'bg-amber-50 text-amber-600 border-amber-100',
 red: 'bg-red-50 text-red-600 border-red-100',
 indigo: 'bg-zinc-50 text-indigo-600 border-indigo-100'
 };

 return (
 <div className={cn("p-4 rounded-2xl border text-right group", colorMap[color])}>
 <div className="flex justify-between items-center mb-2 flex-row-reverse">
 <div className="w-10 h-10 rounded-xl bg-white border border-inherit flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
 {icon}
 </div>
 </div>
 <div>
 <div className="text-[10px] font-black uppercase opacity-60">{label}</div>
 <div className="text-xl md:text-2xl font-black tracking-tighter mb-0.5">{value}</div>
 {description && <div className="text-[10px] font-bold opacity-40">{description}</div>}
 </div>
 </div>
);
};

export default CustomerPage;
