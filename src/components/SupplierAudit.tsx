import React, { useState } from 'react';
import { Truck, Search, History, DollarSign, Calendar, TrendingUp, CreditCard, Filter, AlertCircle, FileText, CheckCircle2, Clock, Edit2, Trash2, ArrowUpRight, X } from 'lucide-react';
import { AppState, SupplierTransfer, PaymentMethod } from '../types';
import { cn, normalizeArabic } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import { MagneticButton } from './ui/MagneticButton';
import { toast } from 'sonner';

interface SupplierAuditProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 initialSupplierId?: string;
 autoOpenModal?: boolean;
 onClearDeepLink?: () => void;
 deepLinkData?: { search?: string; exactId?: string };
}

const SupplierAudit: React.FC<SupplierAuditProps> = ({ data, setData, initialSupplierId, autoOpenModal, onClearDeepLink, deepLinkData }) => {
 const [search, setSearch] = useState('');
 
 React.useEffect(() => {
 if (deepLinkData?.search) {
 setSearch(deepLinkData.search);
 setTimeout(() => {
 const input = document.getElementById('search-input') as HTMLInputElement;
 if (input) input.focus();
 }, 100);
 if (onClearDeepLink) onClearDeepLink();
 }
 }, [deepLinkData, onClearDeepLink]);

 const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
 const [showAddModal, setShowAddModal] = useState(false);
 const [sortOrder, setSortOrder] = useState<'desc' | 'asc' | null>(null);
 const [showWaitingList, setShowWaitingList] = useState(false);

 // Deep Link logic
 React.useEffect(() => {
 if (autoOpenModal) {
 if (initialSupplierId) {
 setSelectedSupplier(initialSupplierId); // Filter the list too
 setTransferForm(prev => ({ 
 ...prev, 
 supplierId: initialSupplierId,
 amount: 0 // Reset amount or pre-fill with balance if needed
 }));
 }
 
 // Delay modal to ensure mounting state is stable
 const timer = setTimeout(() => {
 setShowAddModal(true);
 if (onClearDeepLink) onClearDeepLink();
 }, 100);
 
 return () => clearTimeout(timer);
 }
 }, [initialSupplierId, autoOpenModal]);
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
 inv.items.forEach(item => {
 const product = (data.products || []).find(p => p.id === item.productId);
 if (product?.supplierId) {
 const cost = (item.costAtTime || product.cost || 0) * (item.quantity || 1);
 supplierTotals[product.supplierId] = (supplierTotals[product.supplierId] || 0) + cost;
 }
 });

 Object.entries(supplierTotals).forEach(([supplierId, amount]) => {
 transactions.push({
 id: `${inv.id}-${supplierId}`,
 supplierId,
 amount: amount, // Positive (Obligation)
 rawAmount: amount,
 date: inv.date,
 type: 'invoice',
 displayType: 'فاتورة (توريد أصناف)',
 method: inv.paymentMethod,
 notes: `فاتورة رقم ${inv.id}`,
 refId: inv.id
 });
 });
 });

 return transactions;
 }, [data.supplierTransfers, data.invoices, data.products]);

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

 const totalTransferred = (data?.supplierTransfers || []).reduce((acc, t) => acc + t.amount, 0);
 const totalOutstanding = (data?.suppliers || []).reduce((acc, s) => acc + (s.balance || 0), 0);
 
 // Last movement logic
 const getLastMovement = (supId: string) => {
 const supTransfers = (data?.supplierTransfers || []).filter(t => t.supplierId === supId);
 if (supTransfers.length === 0) return '—';
 const last = supTransfers.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
 return new Date(last.date).toLocaleDateString('en-US');
 };

 const handleAddTransfer = () => {
 if (!transferForm.supplierId || transferForm.amount <= 0) return;

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
 ? { ...t, amount: transferForm.amount, method: transferForm.method, notes: transferForm.notes }
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
 const newRemaining = Math.max(0, Math.round(((supplier?.balance || 0) - amount) * 1000) / 1000);

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
 <div className="space-y-6">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
 <div className="order-2 md:order-1 flex-1">
 <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 justify-end leading-tight">
 سجل الحساب والمستحقات
 <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center shadow-sm">
 <History className="text-emerald-600" />
 </div>
 </h1>
 <p className="text-slate-500 font-medium font-bold italic">تتبع التحويلات البنكية وتصفية حسابات الموردين</p>
 </div>
 <button 
 onClick={() => setShowAddModal(true)}
 className="order-1 md:order-2 bg-slate-900 border border-slate-800 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
 >
 <CreditCard size={20} />
 <span>إضافة تحويل مالي</span>
 </button>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
 <div className="bg-emerald-600 p-3 md:p-4 rounded-[32px] text-white shadow-xl shadow-emerald-600/20">
 <div className="text-[10px] font-black uppercase opacity-60 mb-2">إجمالي المحول</div>
 <div className="text-xl md:text-3xl font-black">{Number(totalTransferred || 0).toFixed(3)} <span className="text-xs">د.ك</span></div>
 <div className="flex items-center gap-2 text-[10px] font-bold mt-3 opacity-80">
 <CheckCircle2 size={12} />
 عدد التحويلات: {(data?.supplierTransfers || []).length}
 </div>
 </div>
 <div className="bg-slate-900 p-3 md:p-4 rounded-[32px] text-white shadow-xl shadow-slate-900/20 relative">
 <div className="text-[10px] font-black uppercase opacity-40 mb-2">إجمالي المستحق</div>
 <div className="text-xl md:text-3xl font-black text-red-500">{Number(totalOutstanding || 0).toFixed(3)} <span className="text-xs">د.ك</span></div>
 <button 
 onClick={() => setShowWaitingList(prev => !prev)}
 className="flex items-center gap-2 text-[10px] font-bold mt-3 text-slate-400 cursor-pointer hover:text-white transition-colors p-1 -ml-1 rounded"
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
 className="absolute top-full mt-2 w-full left-0 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2"
 >
 {data?.suppliers && (data?.suppliers || []).filter(s => s.balance > 0).length === 0 ? (
 <div className="text-slate-400 text-xs text-center py-4 font-bold">لا يوجد موردين بالانتظار الحمدلله 🎉</div>
) : (
 <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
 {(data?.suppliers || []).filter(s => s.balance > 0).map(s => (
 <div key={s.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-xl">
 <span className="text-xs font-bold text-slate-700 truncate">{s.name}</span>
 <span className="text-xs font-black text-red-500 whitespace-nowrap">{Number(s.balance).toFixed(3)} د.ك</span>
 </div>
))}
 </div>
)}
 </motion.div>
)}
 </AnimatePresence>
 </div>
 </div>

 <div className="bg-white rounded-3xl p-3 md:p-4 border border-slate-200 shadow-sm text-right">
 <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
 <div className="relative flex-1">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 id="search-input"
 type="text" 
 placeholder="ابحث في سجل التحويلات أو الملاحظات..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-medium text-right"
 />
 </div>
 <select 
 value={selectedSupplier}
 onChange={(e) => setSelectedSupplier(e.target.value)}
 className="bg-slate-50 border border-slate-200 rounded-2xl py-3 px-6 outline-none font-bold text-slate-700 text-right"
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
 <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 text-[10px] uppercase text-right">
 <th className="p-3 md:p-3">تاريخ الحركة</th>
 <th className="p-3 md:p-3">اسم المورد / نوع الحركة</th>
 <th className="p-3 md:p-3">المبلغ (د.ك)</th>
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
 <Calendar size={14} className="text-slate-400" />
 {new Date(transaction.date).toLocaleDateString('en-US')}
 </div>
 </td>
 <td className="p-3 md:p-3">
 <div className="flex flex-col">
 <div className="font-black text-slate-900">{s?.name || 'مورد محذوف'}</div>
 <div className="text-[10px] font-bold text-slate-400">{transaction.displayType}</div>
 </div>
 </td>
 <td className={cn("p-3 md:p-3 font-black", isInvoice ?"text-red-500" :"text-emerald-600")}>
 {isInvoice ? '+' : '-'}{Number(transaction.rawAmount || 0).toFixed(3)} د.ك
 </td>
 <td className="p-3 md:p-3">
 <span className={cn(
"px-3 py-1 rounded-lg text-[10px] font-black uppercase",
 isInvoice ?"bg-red-50 text-red-500" :"bg-emerald-50 text-emerald-500"
)}>
 {transaction.method === 'BankTransfer' ? 'حوالة' : transaction.method === 'Cash' ? 'نقدي' : transaction.method}
 </span>
 </td>
 <td className="p-3 md:p-3 text-slate-400 text-xs font-bold">
 {getLastMovement(transaction.supplierId)}
 </td>
 <td className="p-3 md:p-3 text-slate-500 text-xs font-medium">
 {transaction.notes || '—'}
 </td>
 <td className="p-3 md:p-3">
 <div className="flex items-center gap-2">
 {!isInvoice && (
 <>
 <button 
 onClick={() => {
 setTransferForm({ ...transaction, amount: Number((transaction.rawAmount || 0).toFixed(3)), notes: transaction.notes || '' });
 setShowAddModal(true);
 }}
 className="p-2 bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
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
 </div>
 </td>
 </motion.tr>
);
 })}
 {filteredTransactions.length === 0 && (
 <tr key="empty-state" className="hover:bg-transparent">
 <td colSpan={8} className="p-16 text-center">
 <div className="flex flex-col items-center justify-center opacity-60">
 <div className="w-12 md:w-20 h-12 md:h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
 <History className="text-slate-400" size={32} />
 </div>
 <h4 className="text-lg font-black text-slate-700 mb-2">لا توجد سجلات للحركات المالية</h4>
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
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3"
 onClick={() => setShowAddModal(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.95, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.95, y: 20 }}
 className="bg-white rounded-[32px] w-[95%] max-w-lg shadow-2xl p-0 border border-slate-100 text-right flex flex-col max-h-[90dvh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="p-3 md:p-4 md:p-3 pb-0 shrink-0">
 <h2 className="text-2xl font-black text-slate-800 mb-8 flex items-center gap-3 justify-end leading-tight text-right">
 تسجيل دفعة مورد
 <CreditCard className="text-emerald-500" />
 </h2>
 </div>
 
 <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-4 md:p-3 pt-4 min-h-0">
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">المورد المستهدف</label>
 <select 
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-slate-800 text-right"
 value={transferForm.supplierId}
 onChange={(e) => setTransferForm({ ...transferForm, supplierId: e.target.value })}
 >
 <option value="">اختر مورد...</option>
 {(data?.suppliers || []).map(s => (
 <option key={s.id} value={s.id}>{s.name} (المستحق: {Number(s.balance || 0).toFixed(3)})</option>
))}
 </select>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
 <div className="space-y-2">
 <div className="flex justify-between items-center h-6">
 {transferForm.supplierId && (
 <button 
 onClick={() => {
 const s = data.suppliers.find(s => s.id === transferForm.supplierId);
 if (s) {
 // Use Math.round with 1000 for 3 decimal precision
 const clean = Math.round((s.balance || 0) * 1000) / 1000;
 setTransferForm({ ...transferForm, amount: clean });
 }
 }}
 className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-1 rounded border border-emerald-100 font-bold hover:bg-emerald-100 cursor-pointer transition-colors"
 >
 كامل المبلغ
 </button>
 )}
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">مبلغ التحويل</label>
 </div>
 <input 
 type="number" 
 step="0.25"
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-slate-800 text-right"
 placeholder="0.000"
 value={transferForm.amount || ''}
 onChange={(e) => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
 />
 </div>
 <div className="space-y-2">
 <div className="flex justify-end items-center h-6">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">طريقة الدفع</label>
 </div>
 <select 
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-black text-slate-800 text-right"
 value={transferForm.method}
 onChange={(e) => setTransferForm({ ...transferForm, method: e.target.value as any })}
 >
 <option value="BankTransfer">تحويل بنكي</option>
 <option value="KNet">كي-نت</option>
 </select>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-black text-slate-400 uppercase mr-1 block text-right">ملاحظات / رقم المرجعي</label>
 <textarea 
 rows={2}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 px-4 outline-none focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500 transition-all font-bold text-slate-800 text-right resize-none"
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
 className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
 >
 {transferForm.id ?"حفظ التعديلات" :"تأكيد وبدء التحويل"}
 </MagneticButton>
 </div>
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
