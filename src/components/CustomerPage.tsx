import React, { useState } from 'react';
import { 
  Users, Search, Plus, Trash2, UserPlus, Phone, 
  Calendar, ShoppingBag, Edit2, AlertCircle, 
  UserCheck, UserMinus, Sparkles, Clock, X,
  Heart, Crown, Printer, MapPin, Gift, MessageSquare
} from 'lucide-react';
import { AppState, Customer } from '../types';
import { cn, normalizeArabic } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
import { calculateCustomerSentiment, generateCustomerSmartMessage } from '../lib/ai-engine';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import SmartEmptyState from './SmartEmptyState';
import { toast } from 'sonner';
import { NumericInput } from './ui/NumericInput';
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
 const [showModal, setShowModal] = useState(false);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [customerForm, setCustomerForm] = useState({ 
    name: '', 
    phone: '', 
    status: 'active' as Customer['status'], 
    area: '', 
    sentiment: 'neutral' as Customer['sentiment'],
    detailedAddress: {
      block: '',
      street: '',
      jaddah: '',
      building: '',
      floor: '',
      apartment: ''
    }
  });
 const [deleteError, setDeleteError] = useState<string | null>(null);
 const [shakingId, setShakingId] = useState<string | null>(null);
 const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
 const [analyzingCustomer, setAnalyzingCustomer] = useState<Customer | null>(null);

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

  let matchesSentiment = true;
  if (sentimentFilter !== 'all') {
   matchesSentiment = (() => {
    const sentiment = calculateCustomerSentiment(c, data.invoices || []);
    if (sentimentFilter === 'positive') return sentiment.score >= 70;
    if (sentimentFilter === 'neutral') return sentiment.score >= 45 && sentiment.score < 70;
    if (sentimentFilter === 'negative') return sentiment.score < 45;
    return true;
   })();
  }

  return matchesSearch && matchesStatus && matchesSentiment;
 }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));

 const totalCustomers = (data?.customers || []).length;
 const vipCustomers = (data?.customers || []).filter(c => {
  const stats = getCustomerStats(c.id);
  return stats.totalSpent >= 800 || stats.totalOrders >= 20;
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
      toast.error("بيان ناقص", { description: "يرجى إدخال الاسم ورقم الهاتف." });
      return;
    }

    if (!editingId) {
      const { block, street, building } = customerForm.detailedAddress;
      if (!customerForm.area || !block || !street || !building) {
        toast.error("بيانات العنوان ناقصة", { 
          description: "يرجى إكمال بيانات العنوان (المنطقة، القطعة، الشارع، والمنزل) لاستكمال التسجيل." 
        });
        return;
      }
    }
    
    const phoneRegex = /^[0-9]{8}$/;
    if (!phoneRegex.test(customerForm.phone)) {
      toast.error("رقم غير صالح", { description: "رقم الهاتف يجب أن يتكون من 8 أرقام إنجليزية فقط (مثال: 99881122)." });
      return;
    }

    const isDuplicate = (data?.customers || []).some(c => c.phone === customerForm.phone && c.id !== editingId);
    if (isDuplicate) {
      toast.warning("تنبيه: الرقم مسجل مسبقاً", { 
        description: "هذا الرقم موجود في سجلات المطعم. يمنع التكرار لضمان دقة نقاط الولاء."
      });
      return;
    }

    const finalAddress = {
      ...customerForm.detailedAddress,
      region: customerForm.area
    };

    if (editingId) {
      setData(prev => {
        const updatedCustomers = (prev?.customers || []).map(c => 
          c.id === editingId ? { ...c, ...customerForm, address: finalAddress } : c
        );
        return {
          ...prev,
          customers: updatedCustomers
        };
      });
      toast.success("تم التحديث ✨", { description: `تم تعديل بيانات العميل ومزامنة طلباته السابقة.` });
    } else {
      const id = Math.random().toString(36).substr(2, 9);
      setData(prev => ({
        ...prev,
        customers: [...(prev?.customers || []), { 
          id, 
          name: customerForm.name,
          phone: customerForm.phone,
          status: customerForm.status,
          area: customerForm.area,
          address: finalAddress,
          sentiment: customerForm.sentiment || 'neutral',
          totalOrders: 0, 
          totalSpent: 0 
        }]
      }));
      toast.success("تم الحفظ بنجاح ✨", { description: `تمت إضافة العميل ${customerForm.name} لقاعدة البيانات.` });
    }
    closeModal();
  };

 const openAddModal = () => {
    setEditingId(null);
    setCustomerForm({ 
      name: '', 
      phone: '', 
      status: 'active', 
      area: '', 
      sentiment: 'neutral',
      detailedAddress: {
        block: '',
        street: '',
        jaddah: '',
        building: '',
        floor: '',
        apartment: ''
      }
    });
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id);
    let detailed = {
      block: '',
      street: '',
      jaddah: '',
      building: '',
      floor: '',
      apartment: ''
    };
    
    if (customer.address && typeof customer.address === 'object') {
      detailed = {
        block: (customer.address as any).block || '',
        street: (customer.address as any).street || '',
        jaddah: (customer.address as any).jaddah || '',
        building: (customer.address as any).building || '',
        floor: (customer.address as any).floor || '',
        apartment: (customer.address as any).apartment || ''
      };
    }
    
    setCustomerForm({ 
      name: customer.name, 
      phone: customer.phone, 
      status: customer.status, 
      area: customer.area || '',
      sentiment: customer.sentiment || 'neutral',
      detailedAddress: detailed
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setCustomerForm({ 
      name: '', 
      phone: '', 
      status: 'active', 
      area: '', 
      sentiment: 'neutral',
      detailedAddress: {
        block: '',
        street: '',
        jaddah: '',
        building: '',
        floor: '',
        apartment: ''
      }
    });
  };

  const handleDeleteCustomer = (customer: Customer) => {
   const stats = getCustomerStats(customer.id);
   if (stats.totalOrders > 0) {
     toast.error("لا يمكن الحذف", { description: "العميل لديه طلبات سابقة." });
     return;
   }
   setData(prev => ({
    ...prev,
    customers: (prev?.customers || []).filter(c => c.id !== customer.id)
   }));
   toast.info("تم الحذف", { description: `تمت إزالة سجل العميل "${customer.name}".` });
   setCustomerToDelete(null);
  };

  const handleSendMessage = (customer: Customer) => {
    const message = generateCustomerSmartMessage(customer, data.invoices || [], data.products || []);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/965${customer.phone}?text=${encodedMessage}`, '_blank');
    toast.success("تم تجهيز الرسالة الذكية", { 
      description: "تم دمج بيانات العميل مع مقترحات الأطباق المفضلة وعروض التوصيل.",
      icon: <Sparkles className="text-indigo-500" />
    });
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
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
    <StatCard label="إجمالي المسجلين" value={totalCustomers} icon={<Users className="w-5 h-5 lg:w-6 lg:h-6" />} color="blue" description="كامل قاعدة البيانات" />
    <StatCard label="كبار الشخصيات (VIP)" value={vipCustomers} icon={<Crown className="w-5 h-5 lg:w-6 lg:h-6" />} color="accent" description="أكثر من 800 د.ك" />
    <StatCard label="عملاء راكدون (30+ يوم)" value={slowCustomers} icon={<Clock className="w-5 h-5 lg:w-6 lg:h-6" />} color="amber" description="راكد" />
    <StatCard label="عملاء مفقودون (90+ يوم)" value={inactiveCustomers} icon={<UserMinus className="w-5 h-5 lg:w-6 lg:h-6" />} color="red" description="مفقود" />
   </div>

   <AnimatePresence>
    {deleteError && (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-red-50 text-red-600 p-4 rounded-2xl">
      {deleteError}
     </motion.div>
    )}
   </AnimatePresence>

   {/* Filters & Search */}
   <div className="bg-white rounded-3xl p-4 md:p-6 border border-slate-200/60 shadow-sm">
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
      <div className="md:col-span-4 relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          id="search-input"
          type="text" 
          placeholder="ابحث بالاسم أو رقم الهاتف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right text-sm"
        />
      </div>
      
      <div className="md:col-span-3">
        <button 
          onClick={openAddModal}
          className="w-full bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] text-sm"
        >
          <UserPlus size={18} />
          <span>إضافة عميل جديد</span>
        </button>
      </div>

      <div className="md:col-span-5 flex flex-col sm:flex-row items-stretch md:items-center gap-2">
        <div className="flex flex-1 overflow-x-auto hide-scrollbar bg-slate-100 p-1 rounded-2xl gap-1">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'vip', label: 'VIP' },
            { id: 'active', label: 'نشط' },
            { id: 'slow', label: 'راكد' },
            { id: 'inactive', label: 'مفقود' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterType(t.id)}
              className={cn(
                "px-3 py-2 rounded-xl text-[10px] font-bold transition-all flex-1",
                filterType === t.id ?"bg-white text-indigo-600 shadow-sm" :"text-slate-500 hover:bg-white/50"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[120px]">
          <select 
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="bg-slate-100 border border-slate-200/60 rounded-2xl py-2.5 pr-8 pl-3 w-full text-[10px] font-bold text-slate-600 outline-none appearance-none cursor-pointer"
          >
            <option value="all">كل المشاعر</option>
            <option value="positive">😊 سعيد</option>
            <option value="neutral">😐 محايد</option>
            <option value="negative">😠 مستاء</option>
          </select>
          <Heart className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={12} />
        </div>
      </div>
    </div>
   </div>

   {/* Table */}
   <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl overflow-hidden">
    <div className="overflow-x-auto">
    <table className="w-full text-right min-w-[1000px]" dir="rtl">
     <thead>
      <tr className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200 text-slate-500 text-xs uppercase font-black tracking-widest sticky top-0 z-20">
       <th className="p-6">العميل</th>
       <th className="p-6">العنوان والتفاصيل</th>
       <th className="p-6">إجمالي الإنفاق</th>
       <th className="p-6">رقم الهاتف</th>
       <th className="p-6">المشاعر الذكية</th>
       <th className="p-6 text-left">الإجراءات</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-slate-100">
      {filteredCustomers.length === 0 ? (
       <tr><td colSpan={6} className="p-32 text-center text-slate-400 font-bold">لا يوجد عملاء يطابقون البحث حالياً</td></tr>
      ) : filteredCustomers.map(customer => {
       const stats = getCustomerStats(customer.id);
       const sentiment = calculateCustomerSentiment(customer, data.invoices || []);
       return (
        <tr key={customer.id} className="hover:bg-indigo-50/30 transition-all group cursor-default">
         <td className="p-6">
          <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center font-black text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm">
            {customer.name[0]}
           </div>
           <div>
             <div className="font-black text-slate-800 text-base lg:text-lg tracking-tight">{customer.name}</div>
             <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{customer.lastOrderDate ? `آخر طلب: ${new Date(customer.lastOrderDate).toLocaleDateString('ar-KW')}` : 'عميل جديد'}</div>
           </div>
          </div>
         </td>
         <td className="p-6">
          <div className="bg-slate-50 group-hover:bg-white p-2 rounded-xl border border-slate-100 transition-all inline-block min-w-[160px]">
            <div className="flex items-center gap-1.5 text-xs font-black text-slate-700">
              <MapPin size={12} className="text-rose-500" />
              {customer.area || 'غير محدد'}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5 font-bold">
              {typeof customer.address === 'object' ? `${customer.address.block ? 'ق'+customer.address.block : ''} ${customer.address.street ? 'ش'+customer.address.street : ''} ${customer.address.building ? 'م'+customer.address.building : ''}` : customer.address}
            </div>
          </div>
         </td>
         <td className="p-6">
           <div className="flex flex-col">
             <span className="font-black text-slate-900 text-lg tabular-nums">{stats.totalSpent.toFixed(3)} د.ك</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{stats.totalOrders} طلبيات موثقة</span>
           </div>
         </td>
         <td className="p-6 text-indigo-700">
           <div className="flex items-center gap-2 font-mono text-sm bg-slate-100 px-3 py-1.5 rounded-full w-fit group-hover:bg-indigo-100 group-hover:text-indigo-700 transition-all font-bold">
             <Phone size={12} />
             {customer.phone}
           </div>
         </td>
         <td className="p-6">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2.5 rounded-[20px] border-2 text-xs font-black transition-all shadow-md w-fit group/sent relative",
            sentiment.color
          )}>
            <Sparkles size={14} className="animate-pulse" />
            <span>{sentiment.label}</span>
            
            {/* Extended Tooltip on hover - Centered Positioning to stay within frame */}
            <div className="absolute opacity-0 group-hover/sent:opacity-100 transition-all duration-500 bg-slate-950 text-white p-5 rounded-3xl text-sm whitespace-normal z-[100] bottom-[calc(100%+12px)] left-1/2 -translate-x-1/2 pointer-events-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 scale-90 group-hover/sent:scale-100 origin-bottom w-[280px] sm:w-[350px]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="font-black text-indigo-400">تحليل العقل الاصطناعي</span>
                  <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">{sentiment.score}%</span>
                </div>
                <p className="text-[11px] font-bold leading-relaxed text-right">{sentiment.reason}</p>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full transition-all duration-1000" style={{ width: `${sentiment.score}%` }} />
                </div>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-slate-950 rotate-45 border-r border-b border-white/10"></div>
            </div>
          </div>
         </td>
         <td className="p-6 text-left">
          <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all duration-300">
           <button onClick={() => handleSendMessage(customer)} className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-slate-900 rounded-xl text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-500/40 transition-all hover:scale-110 active:scale-95 group/btn relative overflow-hidden" title="إرسال رسالة ذكية">
             <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
             <div className="relative flex items-center justify-center">
               <MessageSquare size={18} className="group-hover/btn:scale-110 transition-transform" />
               <Sparkles size={8} className="absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
             </div>
           </button>
           <button onClick={() => openEditModal(customer)} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50 rounded-xl text-slate-400 hover:text-indigo-600 border border-slate-200 shadow-sm transition-all hover:scale-110"><Edit2 size={18} /></button>
           <button onClick={() => setCustomerToDelete(customer)} className="w-10 h-10 flex items-center justify-center bg-white hover:bg-rose-50 rounded-xl text-slate-400 hover:text-rose-600 border border-slate-200 shadow-sm transition-all hover:scale-110"><Trash2 size={18} /></button>
          </div>
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
    </div>
   </div>

   {/* Create/Edit Modal */}
   <AnimatePresence>
    {showModal && (
     <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90dvh]">
       <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
         <button onClick={closeModal} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
         <h2 className="text-xl font-bold text-slate-800">{editingId ? 'تعديل عميل' : 'إضافة عميل'}</h2>
       </div>

       <div className="p-6 overflow-y-auto space-y-6 text-right" dir="rtl">
         <div className="space-y-2">
           <label className="text-xs font-bold text-slate-500 uppercase mr-1">الاسم بالكامل *</label>
           <input value={customerForm.name} onChange={e => setCustomerForm({...customerForm, name: e.target.value})} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" />
         </div>

         <div className="space-y-2">
           <label className="text-xs font-bold text-slate-500 uppercase mr-1">رقم الهاتف *</label>
           <NumericInput value={customerForm.phone} onChange={val => setCustomerForm({...customerForm, phone: val.toString()})} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold font-mono text-left" maxLength={8} />
         </div>

         <div className="grid grid-cols-1 gap-4">
           <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase mr-1">المنطقة *</label>
             <select value={customerForm.area} onChange={e => setCustomerForm({...customerForm, area: e.target.value})} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold appearance-none cursor-pointer">
               <option value="">اختر المنطقة...</option>
               {(data?.zones || []).map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
             </select>
           </div>
         </div>

         <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
           <h3 className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2"><MapPin size={12}/> تفاصيل العنوان</h3>
           <div className="grid grid-cols-3 gap-3">
             <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 mr-1">القطعة *</label>
               <input value={customerForm.detailedAddress.block} onChange={e => setCustomerForm({...customerForm, detailedAddress: {...customerForm.detailedAddress, block: e.target.value}})} className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none text-xs font-bold" placeholder="ق" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 mr-1">الشارع *</label>
               <input value={customerForm.detailedAddress.street} onChange={e => setCustomerForm({...customerForm, detailedAddress: {...customerForm.detailedAddress, street: e.target.value}})} className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none text-xs font-bold" placeholder="ش" />
             </div>
             <div className="space-y-1">
               <label className="text-[9px] font-bold text-slate-400 mr-1">المنزل *</label>
               <input value={customerForm.detailedAddress.building} onChange={e => setCustomerForm({...customerForm, detailedAddress: {...customerForm.detailedAddress, building: e.target.value}})} className="w-full bg-white border border-slate-200/60 rounded-xl py-2 px-3 outline-none text-xs font-bold" placeholder="م" />
             </div>
           </div>
         </div>
       </div>

       <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
         <button onClick={closeModal} className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-50 transition-all">إلغاء</button>
         <button onClick={handleSaveCustomer} className="flex-1 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">حفظ</button>
       </div>
      </motion.div>
     </motion.div>
    )}
   </AnimatePresence>

   {customerToDelete && (
    <ConfirmModal 
      title="حذف العميل" 
      message={`هل أنت متأكد من حذف ${customerToDelete.name}؟`} 
      onConfirm={() => handleDeleteCustomer(customerToDelete)} 
      onCancel={() => setCustomerToDelete(null)} 
    />
   )}
  </div>
 );
});

export default CustomerPage;
