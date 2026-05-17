import React, { useState } from 'react';
import { 
 Users, Search, Plus, Trash2, UserPlus, Phone, 
 Calendar, ShoppingBag, Edit2, AlertCircle, 
 UserCheck, UserMinus, Sparkles, Clock, X,
 Heart, Crown, Printer, MapPin, Gift
} from 'lucide-react';
import { AppState, Customer } from '../types';
import { cn, normalizeArabic } from '../lib/utils';
import { isPaidStatus } from '../lib/status-utils';
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
   matchesSentiment = c.sentiment === sentimentFilter;
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
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
    <StatCard label="إجمالي المسجلين" value={totalCustomers} icon={<Users size={16} />} color="blue" description="كامل قاعدة البيانات" />
    <StatCard label="كبار الشخصيات (VIP)" value={vipCustomers} icon={<Crown size={16} />} color="accent" description="VIP" />
    <StatCard label="عملاء راكدون" value={slowCustomers} icon={<Clock size={16} />} color="amber" description="منذ 30 يوم" />
    <StatCard label="عملاء مفقودون" value={inactiveCustomers} icon={<UserMinus size={16} />} color="red" description="منذ 90 يوم" />
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
   <div className="overflow-x-auto rounded-3xl border border-slate-200/60 shadow-sm bg-white">
    <table className="w-full text-right min-w-[800px]" dir="rtl">
     <thead>
      <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] uppercase font-bold">
       <th className="p-4">الاسم</th>
       <th className="p-4">العنوان</th>
       <th className="p-4">الإنفاق</th>
       <th className="p-4">الهاتف</th>
       <th className="p-4">الحالة</th>
       <th className="p-4">المشاعر</th>
       <th className="p-4 text-left">إجراءات</th>
      </tr>
     </thead>
     <tbody className="divide-y divide-slate-100">
      {filteredCustomers.length === 0 ? (
       <tr><td colSpan={7} className="p-20 text-center text-slate-400 font-bold">لا يوجد عملاء يطابقون البحث</td></tr>
      ) : filteredCustomers.map(customer => {
       const stats = getCustomerStats(customer.id);
       return (
        <tr key={customer.id} className="hover:bg-slate-50 transition-colors group">
         <td className="p-4">
          <div className="flex items-center gap-3">
           <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-slate-500 group-hover:bg-primary group-hover:text-white transition-colors">
            {customer.name[0]}
           </div>
           <span className="font-bold text-slate-700">{customer.name}</span>
          </div>
         </td>
         <td className="p-4">
          <div className="text-[10px] font-bold text-slate-500">{customer.area || '—'}</div>
          <div className="text-[9px] text-slate-400">
            {typeof customer.address === 'object' ? `${customer.address.block ? 'ق'+customer.address.block : ''} ش${customer.address.street || ''}` : customer.address}
          </div>
         </td>
         <td className="p-4 font-bold text-slate-900">{stats.totalSpent.toFixed(3)} د.ك</td>
         <td className="p-4 font-mono text-xs">{customer.phone}</td>
         <td className="p-4">
          <span className={cn(
            "px-2 py-1 rounded-lg text-[9px] font-bold",
            customer.status === 'active' ? "bg-green-100 text-green-700" : customer.status === 'slow' ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
          )}>
            {customer.status === 'active' ? 'نشط' : customer.status === 'slow' ? 'راكد' : 'مفقود'}
          </span>
         </td>
         <td className="p-4">
          <span className="text-xs">
            {customer.sentiment === 'positive' ? '😊 سعيد' : customer.sentiment === 'negative' ? '😠 مستاء' : '😐 محايد'}
          </span>
         </td>
         <td className="p-4 text-left">
          <div className="flex items-center gap-2 justify-end">
           <button onClick={() => openEditModal(customer)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"><Edit2 size={16} /></button>
           <button onClick={() => setCustomerToDelete(customer)} className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600"><Trash2 size={16} /></button>
          </div>
         </td>
        </tr>
       );
      })}
     </tbody>
    </table>
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

         <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase mr-1">المنطقة *</label>
             <select value={customerForm.area} onChange={e => setCustomerForm({...customerForm, area: e.target.value})} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold appearance-none cursor-pointer">
               <option value="">اختر المنطقة...</option>
               {(data?.zones || []).map(z => <option key={z.id} value={z.name}>{z.name}</option>)}
             </select>
           </div>
           <div className="space-y-2">
             <label className="text-xs font-bold text-slate-500 uppercase mr-1">المشاعر</label>
             <select value={customerForm.sentiment} onChange={e => setCustomerForm({...customerForm, sentiment: e.target.value as any})} className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold appearance-none cursor-pointer">
               <option value="neutral">😐 محايد</option>
               <option value="positive">😊 سعيد</option>
               <option value="negative">😠 مستاء</option>
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
