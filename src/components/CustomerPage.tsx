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
import { StatCardComponent as StatCard } from './StatCard';

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
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-0 md:p-3">
 <StatCard label="إجمالي المسجلين" value={totalCustomers} icon={<Users size={16} className="md:w-5 md:h-5" />} color="blue" description="كامل قاعدة البيانات" />
 <StatCard label="كبار الشخصيات (VIP)" value={vipCustomers} icon={<Crown size={16} className="md:w-5 md:h-5" />} color="accent" description="أكثر من 800 د.ك أو 20 طلب" />
 <StatCard label="عملاء متباطئون" value={slowCustomers} icon={<Clock size={16} className="md:w-5 md:h-5" />} color="amber" description="منذ 30 إلى 90 يوم" />
 <StatCard label="عملاء منقطعون" value={inactiveCustomers} icon={<UserMinus size={16} className="md:w-5 md:h-5" />} color="red" description="أكثر من 90 يوم سكون" />
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
 <tr key="empty-state"> <td colSpan={7} className="py-20 px-4 text-center">
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
 ><td className="p-3">
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
 </div>
</td>
</motion.tr>
  );
 })}
  </tbody>
 </table>
 </div>
 </div>
 </div>
 );
});

export default CustomerPage;