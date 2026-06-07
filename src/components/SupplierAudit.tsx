import React, { useState } from 'react';
import { Search, History, DollarSign, Calendar, TrendingUp, CreditCard, FileText, CheckCircle2, Clock, Edit2, Trash2, ArrowUpRight, X, Truck } from 'lucide-react';
import { AppState, SupplierTransfer, PaymentMethod } from '../types';
import { cn, normalizeArabic, normalizeArabicNumerals, formatKuwaitiDateOnly } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import { MagneticButton } from './ui/MagneticButton';
import { toast } from 'sonner';

import { playMetallicSettlementChime } from '../lib/sonic';

interface SupplierAuditProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 initialSupplierId?: string;
 autoOpenModal?: boolean;
 onClearDeepLink?: () => void;
 deepLinkData?: { search?: string; exactId?: string; supplierId?: string; openModal?: boolean; _t?: number };
}

const SUPPLIER_AUDIT_SEARCH_INPUT_ID = 'supplier-audit-search-input';

const getInvoiceDeliverySettlement = (inv: any, supId: string, data: any) => {
  const info = inv?.deliveryInfo || {};
  const target = info.settlementTarget || inv?.deliverySettlementTarget;
  const value = Number(info.cost ?? inv?.deliveryCost ?? info.finalPrice ?? inv?.deliveryFee ?? 0) || 0;
  if (value <= 0) return 0;
  const supplier = (data?.suppliers || []).find((s: any) => String(s.id) === String(supId));
  if (!supplier) return 0;
  const isDeliveryCompany = (supplier as any).supplierType === 'delivery';
  const isFoodSupplierDelivering = !isDeliveryCompany && (supplier as any).deliverySettlement === 'supplier';
  if (!isDeliveryCompany && !isFoodSupplierDelivering) return 0;
  const invoiceHasSupplierProduct = (inv?.items || []).some((item: any) => {
    const product = (data?.products || []).find((p: any) => String(p.id) === String(item.productId));
    return String(product?.supplierId || '') === String(supId);
  });
  const explicitSupplierId = String(info.settlementSupplierId || inv?.deliverySettlementSupplierId || '');
  const supplierName = String(supplier?.name || '').trim();
  const explicitName = String(info.settlementSupplierName || info.company || inv?.deliveryCompany || '').trim();
  const matchesSupplier = explicitSupplierId === String(supId)
    || (!!supplierName && explicitName === supplierName);
  const hasNoExplicitSettlement = !target && !explicitSupplierId && !explicitName;
  if (isDeliveryCompany) {
    if (target && target !== 'delivery_company') return 0;
    return matchesSupplier ? Math.round(value * 1000) / 1000 : 0;
  }
  if (isFoodSupplierDelivering) {
    if (target && target !== 'supplier') return 0;
    return (matchesSupplier || (hasNoExplicitSettlement && invoiceHasSupplierProduct)) ? Math.round(value * 1000) / 1000 : 0;
  }
  return 0;
};

const SupplierAudit: React.FC<SupplierAuditProps> = ({ data, setData, initialSupplierId, autoOpenModal, onClearDeepLink, deepLinkData }) => {
 const [search, setSearch] = useState('');
 const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
 const [showAddModal, setShowAddModal] = useState(false);
 const [viewingInvoiceId, setViewingInvoiceId] = useState<string | null>(null);
 const [showWaitingList, setShowWaitingList] = useState(false);
 const [transferToDelete, setTransferToDelete] = useState<SupplierTransfer | null>(null);
 const [shakingId, setShakingId] = useState<string | null>(null);
 const [transferForm, setTransferForm] = useState({ 
 id: '', 
 supplierId: '', 
 amount: 0, 
 method: 'BankTransfer' as PaymentMethod, 
 notes: '',
 date: new Date().toISOString()
 });
 
 React.useEffect(() => {
 if (deepLinkData?.search) {
 setSearch(deepLinkData.search);
 setTimeout(() => {
 const input = document.getElementById(SUPPLIER_AUDIT_SEARCH_INPUT_ID) as HTMLInputElement;
 if (input) input.focus();
 }, 100);
 if (onClearDeepLink) onClearDeepLink();
 }
 }, [deepLinkData?.search, onClearDeepLink]);

 // Deep Link logic
 const consumedPaymentDeepLinkRef = React.useRef<string>('');
 React.useEffect(() => {
 if (!autoOpenModal) return;

 const deepLinkKey = `${initialSupplierId || ''}-${deepLinkData?._t || ''}`;
 if (consumedPaymentDeepLinkRef.current === deepLinkKey) return;
 consumedPaymentDeepLinkRef.current = deepLinkKey;

 if (initialSupplierId) {
 setSelectedSupplier(initialSupplierId); // Filter the list too
 setTransferForm(prev => ({ 
 ...prev, 
 supplierId: initialSupplierId,
 amount: (() => {
   const supplier = (data?.suppliers || []).find(s => s.id === initialSupplierId);
   return supplier ? Math.max(0, Math.round((Number(supplier.balance || 0)) * 1000) / 1000) : 0;
 })()
 }));
 }
 
 // Delay modal to ensure mounting state is stable
 const timer = setTimeout(() => {
 setShowAddModal(true);
 if (onClearDeepLink) onClearDeepLink();
 }, 100);
 
 return () => clearTimeout(timer);
 }, [initialSupplierId, autoOpenModal, deepLinkData?._t, data?.suppliers]);

 const allTransactions = React.useMemo(() => {
 const transactions: any[] = [];
 
 // 1. Add Transfers (Payments)
 (data?.supplierTransfers || []).forEach(t => {
 transactions.push({
 ...t,
 type: 'transfer',
 displayType: 'تحويل مالي (سداد)',
 amount: -Math.abs(t.amount), // Payments are negative in balance terms but we display positive
 rawAmount: t.amount,
 remaining: t.remainingAmount
 });
 });

 // 2. Add Inbound Obligations (Invoices)
 (data?.invoices || []).forEach(inv => {
 if (inv.isDeleted) return;
 
 const supplierTotals: Record<string, number> = {};
 (inv.items || []).forEach(item => {
 const product = (data.products || []).find(p => p.id === item.productId);
 if (product?.supplierId) {
 const cost = (item.costAtTime || product.cost || 0) * (item.quantity || 1);
 supplierTotals[product.supplierId] = (supplierTotals[product.supplierId] || 0) + cost;
 }
 });

 const settlementId = inv?.deliveryInfo?.settlementSupplierId || inv?.deliverySettlementSupplierId;
 if (settlementId && !supplierTotals[settlementId]) supplierTotals[settlementId] = 0;
 Object.entries(supplierTotals).forEach(([supplierId, amount]) => {
 const deliveryAmount = getInvoiceDeliverySettlement(inv, supplierId, data);
 const dueAmount = Math.round((amount + deliveryAmount) * 1000) / 1000;
 if (dueAmount <= 0) return;
 transactions.push({
 id: `${inv.id}-${supplierId}`,
 supplierId,
 amount: dueAmount, // Positive (Obligation)
 rawAmount: dueAmount,
 supplyAmount: amount,
 deliveryAmount,
 date: inv.date,
 type: 'invoice',
 displayType: amount > 0 && deliveryAmount > 0 ? 'فاتورة (توريد + توصيل)' : deliveryAmount > 0 ? 'فاتورة توصيل' : 'فاتورة توريد أصناف',
 method: inv.paymentMethod,
 notes: amount > 0 && deliveryAmount > 0 ? `فاتورة رقم ${inv.id} · تشمل توريد وتوصيل ${deliveryAmount.toFixed(3)} د.ك` : deliveryAmount > 0 ? `فاتورة رقم ${inv.id} · توصيل فقط ${deliveryAmount.toFixed(3)} د.ك` : `فاتورة رقم ${inv.id}`,
 refId: inv.id
 });
 });
 });

 return transactions;
 }, [data.supplierTransfers, data.invoices, data.products, data.suppliers]);

 const filteredTransactions = allTransactions.filter(t => {
 const s = (data?.suppliers || []).find(sup => sup.id === t.supplierId);
 const normalizedSearch = normalizeArabic(search);
 const matchesSearch = normalizeArabic(s?.name || '').includes(normalizedSearch) || 
 normalizeArabic(t.notes || '').includes(normalizedSearch);
 const matchesSupplier = selectedSupplier === 'all' || t.supplierId === selectedSupplier;
 return matchesSearch && matchesSupplier;
 }).sort((a, b) => {
 return new Date(b.date).getTime() - new Date(a.date).getTime();
 });

 const totalTransferred = (data?.supplierTransfers || []).reduce((acc, t) => acc + Number(t.amount || 0), 0);
 const totalSupplyDue = allTransactions.filter(t => t.type === 'invoice').reduce((acc, t) => acc + Number(t.supplyAmount || 0), 0);
 const totalDeliveryDue = allTransactions.filter(t => t.type === 'invoice').reduce((acc, t) => acc + Number(t.deliveryAmount || 0), 0);
 const supplierOutstandingMap = React.useMemo(() => {
   const map: Record<string, { remainingSupply: number; remainingDelivery: number; balance: number; paid: number; supplyDue: number; deliveryDue: number; totalDue: number; paidToSupply: number; paidToDelivery: number; }> = {};
   (data?.suppliers || []).forEach((supplier) => {
     const supplierTransactions = allTransactions.filter(t => t.supplierId === supplier.id);
     const supplyDue = supplierTransactions.filter(t => t.type === 'invoice').reduce((acc, t) => acc + Number(t.supplyAmount || 0), 0);
     const deliveryDue = supplierTransactions.filter(t => t.type === 'invoice').reduce((acc, t) => acc + Number(t.deliveryAmount || 0), 0);
     const paid = (data?.supplierTransfers || []).filter(t => t.supplierId === supplier.id).reduce((acc, t) => acc + Number(t.amount || 0), 0);
     const paidToSupply = Math.min(paid, supplyDue);
     const paidToDelivery = Math.min(Math.max(paid - paidToSupply, 0), deliveryDue);
     const remainingSupply = Math.max(0, Math.round((supplyDue - paidToSupply) * 1000) / 1000);
     const remainingDelivery = Math.max(0, Math.round((deliveryDue - paidToDelivery) * 1000) / 1000);
     const totalDue = Math.round((supplyDue + deliveryDue) * 1000) / 1000;
     const balance = Math.max(0, Math.round((totalDue - paid) * 1000) / 1000);
     map[supplier.id] = { remainingSupply, remainingDelivery, balance, paid, supplyDue, deliveryDue, totalDue, paidToSupply, paidToDelivery };
   });
   return map;
 }, [allTransactions, data?.supplierTransfers, data?.suppliers]);
 const totalOutstanding = Object.values(supplierOutstandingMap).reduce((acc, s) => acc + (s.balance || 0), 0);
 const selectedSupplierSummary = React.useMemo(() => {
   if (!transferForm.supplierId) return null;
   return supplierOutstandingMap[transferForm.supplierId] || null;
 }, [transferForm.supplierId, supplierOutstandingMap]);

 React.useEffect(() => {
   if (!transferForm.supplierId || transferForm.id) return;
   const nextBalance = supplierOutstandingMap[transferForm.supplierId]?.balance ?? 0;
   setTransferForm(prev => {
     if (prev.id || !prev.supplierId) return prev;
     const rounded = Math.max(0, Math.round(nextBalance * 1000) / 1000);
     return prev.amount === rounded ? prev : { ...prev, amount: rounded };
   });
 }, [transferForm.supplierId, transferForm.id, supplierOutstandingMap]);
 
 // Last movement logic
 const getLastMovement = (supId: string) => {
 const supTransfers = (data?.supplierTransfers || []).filter(t => t.supplierId === supId);
 if (supTransfers.length === 0) return '—';
 const last = supTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
 return formatKuwaitiDateOnly(last.date);
 };

 const handleAddTransfer = () => {
 const supplier = (data?.suppliers || []).find(s => s.id === transferForm.supplierId);
 const currentBalance = supplierOutstandingMap[transferForm.supplierId]?.balance ?? (supplier ? (supplier.balance || 0) : 0);

 if (!transferForm.supplierId || transferForm.amount <= 0) return;

 if (!transferForm.id) {
   if (currentBalance <= 0) {
     toast.error("لا يوجد التزامات مالية حالياً لهذا المورد! 🚫", {
       description: "لقد تم سداد كافة ذمم ومستحقات هذا المورد بالكامل ولا توجد أي مبالغ مستحقة عليه.",
       position: 'bottom-right'
     });
     return;
   }
   const enteredAmount = Math.round(transferForm.amount * 1000) / 1000;
   if (enteredAmount > Math.round(currentBalance * 1000) / 1000) {
     toast.error("المبلغ المدخل يتجاوز مديونية المورد! 🚫", {
       description: `أقصى مبلغ يمكن سداده هو ${Number(currentBalance).toFixed(3)} د.ك.`,
       position: 'bottom-right'
     });
     return;
   }
 } else {
   const oldTransfer = (data?.supplierTransfers || []).find(t => t.id === transferForm.id);
   const oldAmount = oldTransfer ? oldTransfer.amount : 0;
   const maxAllowed = currentBalance + oldAmount;
   const enteredAmount = Math.round(transferForm.amount * 1000) / 1000;
   if (enteredAmount > Math.round(maxAllowed * 1000) / 1000) {
     toast.error("تعديل المبلغ يتجاوز إجمالي مديونية المورد! 🚫", {
       description: `أقصى مبلغ متاح للتحويل هو ${Number(maxAllowed).toFixed(3)} د.ك.`,
       position: 'bottom-right'
     });
     return;
   }
 }
 if (transferForm.id) {
 // Edit existing
 setData(prev => {
 const oldTransfer = prev.supplierTransfers.find(t => t.id === transferForm.id);
 if (!oldTransfer) return prev;
 const diff = Math.round((transferForm.amount - oldTransfer.amount) * 1000) / 1000;

 return {
 ...prev,
 supplierTransfers: prev.supplierTransfers.map(t => 
 t.id === transferForm.id 
 ? { ...t, amount: transferForm.amount, method: transferForm.method, notes: transferForm.notes, date: transferForm.date }
 : t
),
 suppliers: prev.suppliers.map(s => 
 s.id === transferForm.supplierId
 ? { ...s, balance: Math.max(0, Math.round(((s.balance || 0) - diff) * 1000) / 1000) }
 : s
)
 }
 });
 } else {
 // Add new
 const id = Math.random().toString(36).substr(2, 9);
 const supplier = (data?.suppliers || []).find(s => s.id === transferForm.supplierId);
 const amount = Math.round(transferForm.amount * 1000) / 1000;
 const sourceBalance = supplierOutstandingMap[transferForm.supplierId]?.balance ?? (supplier?.balance || 0);
 const newRemaining = Math.max(0, Math.round((sourceBalance - amount) * 1000) / 1000);

 setData(prev => ({
 ...prev,
 supplierTransfers: [
 { ...transferForm, id, amount, remainingAmount: newRemaining },
 ...prev.supplierTransfers
 ],
 suppliers: prev.suppliers.map(s => 
 s.id === transferForm.supplierId 
 ? { ...s, balance: Math.max(0, newRemaining), status: newRemaining <= 0 ? 'paid' : 'partially_paid' } 
 : s
)
 }));
 }

 setShowAddModal(false);
 try {
   playMetallicSettlementChime();
 } catch (e) {}
 toast.success(transferForm.id ? "تم تعديل السداد ومطابقته ✨" : "تم السداد والمطابقة المالية بنجاح 🪙", {
   description: transferForm.id 
     ? "تم تحديث بيانات المعاملة وتعديل القيمة بنجاح." 
     : `تم تسجيل دفعة بقيمة (${transferForm.amount.toFixed(3)} د.ك) وتخفيض مديونية المورد بنجاح.`,
   position: 'bottom-right'
 });
 setTransferForm({ id: '', supplierId: '', amount: 0, method: 'BankTransfer', notes: '', date: new Date().toISOString() });
 };

 const handleDeleteTransfer = (transfer: SupplierTransfer) => {
 setData(prev => ({
 ...prev,
 supplierTransfers: prev.supplierTransfers.filter(t => t.id !== transfer.id),
 suppliers: prev.suppliers.map(s => 
 s.id === transfer.supplierId 
 ? { ...s, balance: Math.round(((s.balance || 0) + transfer.amount) * 1000) / 1000 } 
 : s
)
 }));
 toast.info("تم حذف التحويل", { 
 description: `تم إلغاء عملية السداد وإعادة المبلغ (${transfer.amount.toFixed(3)} د.ك) لرصيد المورد.`,
 position: 'bottom-right'
 });
 setTransferToDelete(null);
 };

 return (
 <div className="space-y-8 pt-12 md:pt-16 pb-20">
   <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6" dir="rtl">
     <div className="text-right">
       <h1 className="text-3xl font-black text-slate-900 tracking-tight">كشف الحساب المالي التفصيلي</h1>
       <p className="text-slate-500 font-bold mt-1">سجل التوريد والسداد والتدقيق المالي الشامل</p>
     </div>
     <button 
     onClick={() => setShowAddModal(true)}
     className="w-full md:w-auto bg-white border border-slate-200 text-slate-800 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
     >
     <CreditCard size={22} />
     <span>تسجيل تحويل مالي جديد</span>
     </button>
   </div>

 <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 text-right">
 <div className="bg-emerald-600 p-3 md:p-4 rounded-[20px] md:rounded-2xl text-white shadow-xl shadow-emerald-600/20">
 <div className="text-[10px] font-bold uppercase opacity-60 mb-2">إجمالي المحول</div>
 <div className="text-2xl md:text-3xl font-bold">{Number(totalTransferred || 0).toFixed(3)} <span className="text-xs">د.ك</span></div>
 <div className="flex items-center gap-2 text-[10px] font-bold mt-3 opacity-80">
 <CheckCircle2 size={12} />
 عدد التحويلات: {(data?.supplierTransfers || []).length}
 </div>
 </div>
 <div className="bg-white p-3 md:p-4 rounded-[20px] md:rounded-3xl border border-slate-100 shadow-sm">
 <div className="text-[10px] font-bold uppercase text-slate-400 mb-2">مستحقات التوريد</div>
 <div className="text-2xl md:text-3xl font-black text-slate-900">{Number(totalSupplyDue || 0).toFixed(3)} <span className="text-xs text-slate-400">د.ك</span></div>
 <div className="text-[10px] font-bold mt-3 text-slate-400">تكلفة المنتجات فقط بدون التوصيل</div>
 </div>
 <div className="bg-blue-50 p-3 md:p-4 rounded-[20px] md:rounded-3xl border border-blue-100 shadow-sm">
 <div className="text-[10px] font-bold uppercase text-blue-400 mb-2">مستحقات التوصيل</div>
 <div className="text-2xl md:text-3xl font-black text-blue-700">{Number(totalDeliveryDue || 0).toFixed(3)} <span className="text-xs text-blue-400">د.ك</span></div>
 <div className="text-[10px] font-bold mt-3 text-blue-400">للموردين الذين يوصلون أو شركات التوصيل فقط</div>
 </div>
 <div className="bg-white border border-slate-200 text-slate-900 p-3 md:p-4 rounded-[20px] md:rounded-3xl shadow-sm relative">
 <div className="text-[10px] font-bold uppercase opacity-40 mb-2">إجمالي المستحق</div>
 <div className="text-2xl md:text-3xl font-bold text-red-500">{Number(totalOutstanding || 0).toFixed(3)} <span className="text-xs">د.ك</span></div>
 <button 
 onClick={() => setShowWaitingList(prev => !prev)}
 className="flex items-center gap-2 text-[10px] font-bold mt-3 text-slate-500 cursor-pointer hover:text-slate-900 transition-colors p-1 -ml-1 rounded"
 >
 <Clock size={12} />
 موردين بالانتظار: {(data?.suppliers || []).filter(s => s.balance > 0).length}
 </button>
 <AnimatePresence>
 {showWaitingList && (
 <motion.div 
 initial={{ opacity: 0, y: 5 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: 5 }}
 className="absolute top-full mt-2 w-full left-0 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-50 p-2"
 >
 {data?.suppliers && (data?.suppliers || []).filter(s => s.balance > 0).length === 0 ? (
 <div className="text-slate-500 text-xs text-center py-4 font-bold">لا يوجد موردين بالانتظار الحمدلله 🎉</div>
) : (
 <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
 {(data?.suppliers || []).filter(s => s.balance > 0).map(s => (
 <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-xl">
 <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
 <span className="text-xs font-bold text-red-500 whitespace-nowrap">{Number(s.balance).toFixed(3)} د.ك</span>
 </div>
))}
 </div>
)}
 </motion.div>
)}
 </AnimatePresence>
 </div>
 </div>

 <div className="bg-white rounded-3xl p-3 md:p-4 border border-slate-200/60 shadow-sm text-right">
 <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
 <div className="relative flex-1">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
 <input 
 id={SUPPLIER_AUDIT_SEARCH_INPUT_ID}
 type="text" 
 placeholder="ابحث في سجل التحويلات أو الملاحظات..."
 value={search}
 onChange={(e) => {
    let val = normalizeArabicNumerals(e.target.value);
    if (/^[0-9]*$/.test(val)) {
      val = val.slice(0, 8);
    }
    setSearch(val);
  }}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-right"
 />
 </div>
 <select 
 value={selectedSupplier}
 onChange={(e) => setSelectedSupplier(e.target.value)}
 className="bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-6 outline-none font-bold text-slate-700 text-right"
 >
 <option value="all">كل الموردين</option>
 {(data?.suppliers || []).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
))}
 </select>
 </div>

 <div className="overflow-x-auto rounded-2xl border border-slate-100">
 <table className="w-full text-right min-w-[1000px]" dir="rtl">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase text-right">
 <th className="p-3 md:p-3">تاريخ الحركة</th>
 <th className="p-3 md:p-3">اسم المورد / نوع الحركة</th>
 <th className="p-3 md:p-3">توريد</th>
 <th className="p-3 md:p-3">توصيل</th>
 <th className="p-3 md:p-3">الإجمالي</th>
 <th className="p-3 md:p-3">طريقة الدفع</th>
 <th className="p-3 md:p-3">حالة الرصيد</th>
 <th className="p-3 md:p-3">ملاحظات الحساب</th>
 <th className="p-3 md:p-3">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(filteredTransactions || []).map(transaction => {
 const s = (data?.suppliers || []).find(sup => sup.id === transaction.supplierId);
 const isInvoice = transaction.type === 'invoice';
 
 return (
 <motion.tr 
 key={transaction.id} 
 animate={shakingId === transaction.id ? { 
 x: [0, -10, 10, -10, 10, 0],
 backgroundColor: ['rgba(255,255,255,1)', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.1)', 'rgba(255,255,255,1)']
 } : {}}
 transition={shakingId === transaction.id ? { duration: 0.5 } : {}}
 className={cn(
"hover:bg-slate-50/80 transition-colors group",
 shakingId === transaction.id &&"bg-red-50/50"
)}
 >
 <td className="p-3 md:p-3">
 <div className="flex items-center gap-2 font-bold text-slate-600">
 <Calendar size={14} className="text-slate-500" />
 {formatKuwaitiDateOnly(transaction.date)}
 </div>
 </td>
 <td className="p-3 md:p-3">
 <div className="flex flex-col">
 <div className="font-bold text-slate-900">{s?.name || 'مورد محذوف'}</div>
 <div className="text-[10px] font-bold text-slate-500">{transaction.displayType}</div>
 </div>
 </td>
 <td className="p-3 md:p-3 font-black text-slate-700">
 {isInvoice ? Number(transaction.supplyAmount || 0).toFixed(3) : '—'}
 </td>
 <td className="p-3 md:p-3 font-black text-blue-600">
 {isInvoice ? Number(transaction.deliveryAmount || 0).toFixed(3) : '—'}
 </td>
 <td className={cn("p-3 md:p-3 font-bold", isInvoice ?"text-red-500" :"text-emerald-600")}>
 {isInvoice ? '+' : '-'}{Number(transaction.rawAmount || 0).toFixed(3)} د.ك
 </td>
 <td className="p-3 md:p-3">
 <span className={cn(
"px-3 py-1 rounded-lg text-[10px] font-bold uppercase",
 isInvoice ?"bg-red-50 text-red-500" :"bg-emerald-50 text-emerald-500"
)}>
 {transaction.method === 'BankTransfer' ? 'حوالة' : transaction.method === 'Cash' ? 'نقدي' : transaction.method}
 </span>
 </td>
 <td className="p-3 md:p-3 text-slate-500 text-xs font-bold">
 {getLastMovement(transaction.supplierId)}
 </td>
 <td className="p-3 md:p-3 text-slate-500 text-xs font-medium">
 {transaction.notes || '—'}
 </td>
 <td className="p-3 md:p-3">
 <div className="flex items-center gap-2">
 {isInvoice && (
 <>
 <button 
 onClick={() => setViewingInvoiceId(transaction.refId)}
 className="p-2 bg-blue-50 rounded-lg text-blue-500 hover:bg-blue-100 transition-all active:scale-95"
 title="عرض الفاتورة"
 >
 <FileText size={16} />
 </button>
 {Number(transaction.deliveryAmount || 0) > 0 && (
 <button
 onClick={() => setViewingInvoiceId(transaction.refId)}
 className="p-2 bg-cyan-50 rounded-lg text-cyan-600 hover:bg-cyan-100 transition-all active:scale-95"
 title="عرض تفاصيل التوصيل"
 >
 <Truck size={16} />
 </button>
 )}
 </>
 )}
 {!isInvoice && (
 <>
 <button 
 onClick={() => {
 setTransferForm({ ...transaction, amount: Number((transaction.rawAmount || 0).toFixed(3)), notes: transaction.notes || '' });
 setShowAddModal(true);
 }}
 className="p-2 bg-slate-100 rounded-lg text-slate-500 hover:text-emerald-600 transition-colors"
 title="تعديل التحويل"
 >
 <Edit2 size={16} />
 </button>
 <button 
 onClick={() => setTransferToDelete(transaction)}
 className="p-2 bg-red-50 rounded-lg text-red-300 hover:text-red-500 transition-colors"
 title="حذف التحويل"
 >
 <Trash2 size={16} />
 </button>
 </>
)}
 {s && (s.balance || 0) > 0 && (
 <button 
 onClick={() => {
 setTransferForm({ id: '', supplierId: transaction.supplierId, amount: 0, method: 'BankTransfer', notes: '', date: new Date().toISOString() });
 setShowAddModal(true);
 }}
 className="p-2 bg-emerald-50 rounded-lg text-emerald-500 hover:bg-emerald-100 transition-colors"
 title="تسجيل دفعة سداد"
 >
 <ArrowUpRight size={16} />
 </button>
 )}
 </div>
 </td>
 </motion.tr>
);
 })}
 {filteredTransactions.length === 0 && (
 <tr key="empty-state" className="hover:bg-transparent">
 <td colSpan={9} className="p-16 text-center">
 <div className="flex flex-col items-center justify-center opacity-60">
 <div className="w-12 md:w-20 h-12 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
 <History className="text-slate-500" size={32} />
 </div>
 <h4 className="text-lg font-bold text-slate-700 mb-2">لا توجد سجلات للحركات المالية</h4>
 <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
 هذا السجل يعرض جميع الحركات المالية مع الموردين بما في ذلك (فواتير التوريد) و(تحويلات السداد).
 </p>
 </div>
 </td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>

 <AnimatePresence>
 {showAddModal && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="supplier-payment-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
 onClick={() => setShowAddModal(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="supplier-payment-modal bg-white rounded-3xl w-[calc(100vw-1.5rem)] sm:w-[95%] md:w-full max-w-lg shadow-xl p-0 border border-slate-100 text-right flex flex-col max-h-[90dvh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="p-3 md:p-4 md:p-3 pb-0 shrink-0">
 <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3 justify-end leading-tight text-right">
 تسجيل دفعة مورد
 <CreditCard className="text-emerald-500" />
 </h2>
 </div>
 
 <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 md:p-3 pt-4 min-h-0">
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">المورد المستهدف</label>
 <select 
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right"
 value={transferForm.supplierId}
 onChange={(e) => {
   const nextSupplierId = e.target.value;
   const nextBalance = nextSupplierId ? (supplierOutstandingMap[nextSupplierId]?.balance ?? 0) : 0;
   setTransferForm({
     ...transferForm,
     supplierId: nextSupplierId,
     amount: transferForm.id ? transferForm.amount : Math.max(0, Math.round(nextBalance * 1000) / 1000)
   });
 }}
 >
 <option value="">اختر مورد...</option>
 {(data?.suppliers || []).filter(s => transferForm.id || ((supplierOutstandingMap[s.id]?.balance ?? Number(s.balance || 0)) > 0)).map(s => (
 <option key={s.id} value={s.id}>{s.name} (المستحق: {Number(supplierOutstandingMap[s.id]?.balance ?? Number(s.balance || 0)).toFixed(3)})</option>
))}
 </select>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
 <div className="space-y-2">
 <div className="flex justify-between items-center h-6">
 {transferForm.supplierId && (
 <button 
 onClick={() => {
 const clean = Math.round(((selectedSupplierSummary?.balance ?? 0)) * 1000) / 1000;
 setTransferForm({ ...transferForm, amount: clean });
 }}
 className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 font-bold hover:bg-emerald-100 cursor-pointer transition-colors"
 >
 كامل المبلغ
 </button>
 )}
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">مبلغ التحويل</label>
 </div>
 {selectedSupplierSummary && !transferForm.id && (
 <div className="bg-slate-50 border border-slate-100 rounded-3xl p-3 md:p-4 space-y-3">
   <div className="grid grid-cols-2 gap-2.5">
     <div className="bg-white rounded-2xl p-3 text-right border border-slate-100 min-w-0">
       <div className="text-[10px] font-black text-slate-400 mb-1 whitespace-nowrap">توريد متبقّي</div>
       <div className="text-lg font-black text-slate-900 whitespace-nowrap" dir="ltr">{selectedSupplierSummary.remainingSupply.toFixed(3)}</div>
     </div>
     {selectedSupplierSummary.remainingDelivery > 0 && (
     <div className="bg-blue-50 rounded-2xl p-3 text-right border border-blue-100 min-w-0">
       <div className="text-[10px] font-black text-blue-400 mb-1 whitespace-nowrap">توصيل متبقّي</div>
       <div className="text-lg font-black text-blue-700 whitespace-nowrap" dir="ltr">{selectedSupplierSummary.remainingDelivery.toFixed(3)}</div>
     </div>
     )}
     <div className="bg-emerald-50 rounded-2xl p-3 text-right border border-emerald-100 min-w-0">
       <div className="text-[10px] font-black text-emerald-500 mb-1 whitespace-nowrap">مدفوع سابقاً</div>
       <div className="text-lg font-black text-emerald-700 whitespace-nowrap" dir="ltr">{selectedSupplierSummary.paid.toFixed(3)}</div>
     </div>
     <div className="bg-slate-900 rounded-2xl p-3 text-right text-white min-w-0">
       <div className="text-[10px] font-black text-white/50 mb-1 whitespace-nowrap">المتبقي</div>
       <div className="text-lg font-black whitespace-nowrap" dir="ltr">{selectedSupplierSummary.balance.toFixed(3)}</div>
     </div>
   </div>
 </div>
 )}
 <input 
 type="number" 
 step="0.25"
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right"
 placeholder="0.000"
 value={transferForm.amount || ''}
 onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-2">
 <div className="flex justify-end items-center h-6">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">طريقة الدفع</label>
 </div>
 <select 
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right"
 value={transferForm.method}
 onChange={(e) => setTransferForm({ ...transferForm, method: e.target.value as any })}
 >
 <option value="BankTransfer">تحويل بنكي</option>
 <option value="KNet">كي-نت</option>
 </select>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">تاريخ التحويل</label>
 <input 
 type="date"
 lang="en-GB" dir="ltr"
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-5 mb-4 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right text-lg"
 value={transferForm.date.split('T')[0]}
 onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString() })}
 />
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">ملاحظات / رقم المرجعي</label>
 <textarea 
 rows={2}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right resize-none"
 placeholder="أدخل ملاحظات الدفعة..."
 value={transferForm.notes}
 onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })}
 />
 </div>
 </div>
 </div>
 
 <div className="flex gap-4 p-3 md:p-4 md:p-3 shrink-0 mt-auto border-t border-slate-50">
 <button 
 onClick={() => {
 setShowAddModal(false);
 setTransferForm({ id: '', supplierId: '', amount: 0, method: 'BankTransfer', notes: '', date: new Date().toISOString() });
 }}
 className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl transition-all shadow-sm"
 >
 إلغاء التعديلات
 </button>
 <MagneticButton 
 onClick={handleAddTransfer}
 intensity={0.15}
 className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-sm border border-slate-200 shadow-emerald-600/20 active:scale-95"
 >
 {transferForm.id ?"حفظ التعديلات" :"تأكيد وبدء التحويل"}
 </MagneticButton>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>
 
 <AnimatePresence>
 {viewingInvoiceId && (
 <motion.div 
 initial={{ opacity: 0 }} 
 animate={{ opacity: 1 }} 
 exit={{ opacity: 0 }} 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-4"
 onClick={() => setViewingInvoiceId(null)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="bg-white rounded-[32px] w-full max-w-2xl shadow-sm border border-slate-200 p-0 border border-slate-100 text-right flex flex-col max-h-[90dvh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 {(() => {
 const inv = (data.invoices || []).find(i => i.id === viewingInvoiceId);
 if (!inv) return <div className="p-12 text-center font-bold text-slate-500">الفاتورة غير موجودة أو تم حذفها</div>;
 const customer = (data.customers || []).find(c => c.id === inv.customerId);
 const invoiceDeliveryCost = Number((inv as any)?.deliveryInfo?.cost ?? (inv as any)?.deliveryCost ?? (inv as any)?.deliveryInfo?.finalPrice ?? (inv as any)?.deliveryFee ?? 0) || 0;
 
 return (
 <>
 <div className="p-5 border-b border-slate-50 shrink-0 flex justify-between items-center bg-slate-50/30">
 <button onClick={() => setViewingInvoiceId(null)} className="p-2.5 hover:bg-white rounded-2xl transition-all text-slate-400 hover:text-slate-600 hover:shadow-md">
 <X size={20} />
 </button>
 <div className="flex items-center gap-4">
 <div className="text-right">
 <h3 className="text-xl font-black text-slate-900 leading-tight">تفاصيل الفاتورة المسددة</h3>
 <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-0.5">#{inv.id} • {formatKuwaitiDateOnly(inv.date)}</p>
 </div>
 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
 <FileText size={24} />
 </div>
 </div>
 </div>
 
 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
 {/* Contacts Segment */}
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100/60 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-500/10 transition-colors" />
 <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">بيانات العميل</div>
 <div className="font-black text-slate-900 text-lg">{customer?.name || (inv as any).customerName || 'عميل مجهول'}</div>
 <div className="text-xs font-bold text-slate-500 mt-0.5">{customer?.phone || (inv as any).customerPhone || 'بدون رقم'}</div>
 </div>
 <div className="p-5 bg-slate-50/50 rounded-3xl border border-slate-100/60 relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
 <div className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">طريقة الدفع والحالة</div>
 <div className="font-black text-slate-900 text-lg">
 {inv.paymentMethod === 'BankTransfer' ? 'حوالة بنكية' : inv.paymentMethod === 'Cash' ? 'نقدي' : inv.paymentMethod === 'KNet' ? 'كي-نت' : inv.paymentMethod}
 </div>
 <div className="flex items-center gap-1.5 mt-1">
 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
 <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">عملية مكتملة ومسددة</span>
 </div>
 </div>
 </div>
 
 {/* Items Section */}
 <div className="space-y-4">
 <div className="flex justify-between items-center px-1">
 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
 <TrendingUp size={14} className="text-blue-500" /> تفاصيل الأصناف الموردة
 </h4>
 <span className="text-[10px] font-black text-slate-400">{(inv.items || []).length} صنف</span>
 </div>
 <div className="space-y-3">
 {(inv.items || []).map((item, idx) => {
 const p = (data.products || []).find(prod => prod.id === item.productId);
 return (
 <div key={idx} className="flex justify-between items-center p-4 border border-slate-100 rounded-3xl transition-all hover:shadow-lg hover:border-blue-100 bg-white group">
 <div className="text-left">
 <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">{(item.quantity * (item.priceAtTime || 0)).toFixed(3)} <span className="text-[10px]">د.ك</span></div>
 <div className="text-[10px] text-slate-400 font-bold tracking-tight">{item.quantity} وحدة × {(item.priceAtTime || 0).toFixed(3)}</div>
 </div>
 <div className="text-right">
 <div className="font-bold text-slate-800 leading-tight">{p?.name || item.productId}</div>
 <div className="text-[10px] font-black text-emerald-600 mt-1 flex items-center gap-1 justify-end">
 <DollarSign size={10} />
 حصة المورد: {(item.costAtTime || p?.cost || 0).toFixed(3)} د.ك
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 
 {/* Financial Recap */}
 <div className="p-6 bg-slate-900 rounded-[32px] text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden">
 <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
 <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl -ml-16 -mt-16" />
 <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-500 rounded-full blur-3xl -mr-16 -mb-16" />
 </div>
 <div className="relative z-10 space-y-4">
 <div className="flex justify-between items-center pb-4 border-b border-white/10">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest">إجمالي المبيعات</span>
 <span className="font-black text-lg">{(inv.totalAmount || 0).toFixed(3)} <span className="text-[10px] opacity-40">د.ك</span></span>
 </div>
 <div className="flex justify-between items-center pb-4 border-b border-white/10">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest">تكلفة التوريد النهائية</span>
 <span className="font-black text-lg text-emerald-400">{(inv.totalCost || 0).toFixed(3)} <span className="text-[10px] opacity-40">د.ك</span></span>
 </div>
 {invoiceDeliveryCost > 0 && (
 <div className="flex justify-between items-center pb-4 border-b border-white/10">
 <span className="text-xs font-bold text-white/40 uppercase tracking-widest">تكلفة التوصيل</span>
 <span className="font-black text-lg text-blue-300">{invoiceDeliveryCost.toFixed(3)} <span className="text-[10px] opacity-40">د.ك</span></span>
 </div>
 )}
 <div className="flex justify-between items-center pt-2">
 <div className="flex flex-col">
 <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">صافي الربح الفعلي</span>
 <span className="text-3xl font-black bg-gradient-to-l from-white to-white/60 bg-clip-text text-transparent italic">
 {(inv.profit || 0).toFixed(3)} <span className="text-xs">د.ك</span>
 </span>
 </div>
 <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/5">
 <TrendingUp size={28} className="text-emerald-400" />
 </div>
 </div>
 </div>
 </div>
 </div>
 
 <div className="p-5 bg-slate-50/50 border-t border-slate-100 flex justify-center shrink-0">
 <button 
 onClick={() => setViewingInvoiceId(null)}
 className="w-full py-4 bg-white border border-slate-200 rounded-2xl font-black text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-[0.98] tracking-widest uppercase text-xs"
 >
 إغلاق سجل الفاتورة
 </button>
 </div>
 </>
 );
 })()}
 </motion.div>
 </motion.div>
 )}
 </AnimatePresence>

 <AnimatePresence>
 {transferToDelete && (
 <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
 <ConfirmModal
 title="تأكيد الحذف"
 message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
 onConfirm={() => handleDeleteTransfer(transferToDelete)}
 onCancel={() => setTransferToDelete(null)}
 />
 </motion.div>
)}
 </AnimatePresence>
 </div>
);
};

export default SupplierAudit;
