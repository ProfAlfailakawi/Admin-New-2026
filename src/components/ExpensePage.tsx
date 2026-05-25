import React, { useState } from 'react';
import { Wallet, Search, Plus, Trash2, Edit2, Calendar, CreditCard, TrendingUp, ArrowDownRight, Target, PlusCircle, X } from 'lucide-react';
import { AppState, Expense, PaymentMethod } from '../types';
import { cn, normalizeArabicNumerals, normalizeArabic } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import { NumericInput } from './ui/NumericInput';
import { toast } from 'sonner';
import { StatCardComponent as StatCard } from './StatCard';

interface ExpensePageProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 deepLinkData?: { search?: string; exactId?: string };
 onClearDeepLink?: () => void;
}

const ExpensePage: React.FC<ExpensePageProps> = ({ data, setData, deepLinkData, onClearDeepLink }) => {
 const [search, setSearch] = useState('');
 const appliedDeepLinkRef = React.useRef<string | null>(null);
 const [deleteError, setDeleteError] = useState<string | null>(null);
 const [shakingId, setShakingId] = useState<string | null>(null);
 
 React.useEffect(() => {
 if (deepLinkData?.search && appliedDeepLinkRef.current !== deepLinkData.search) {
 appliedDeepLinkRef.current = deepLinkData.search;
 setSearch(deepLinkData.search);
 setTimeout(() => {
 const input = document.getElementById('search-input') as HTMLInputElement;
 if (input) input.focus();
 }, 100);
 if (onClearDeepLink) onClearDeepLink();
 }
 }, [deepLinkData, onClearDeepLink]);
 
 const [showModal, setShowModal] = useState(false);
 const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
 const [editingId, setEditingId] = useState<string | null>(null);
 const [expenseForm, setExpenseForm] = useState({ 
 description: '', 
 amount: 0, 
 date: new Date().toISOString(), 
 paymentMethod: 'KNet' as PaymentMethod,
 category: 'General'
 });

 const filteredExpenses = (data?.expenses || []).filter(e => 
 normalizeArabic(e.description || '').includes(normalizeArabic(search))
).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

 // Stats Logic
 const totalExpenses = (data?.expenses || []).reduce((acc, exp) => acc + Math.abs(exp.amount || 0), 0);
 
 const today = new Date().toISOString().split('T')[0];
 const todayExpenses = (data?.expenses || [])
 .filter(exp => (exp.date || '').startsWith(today))
 .reduce((acc, exp) => acc + Math.abs(exp.amount || 0), 0);

 const handleSaveExpense = () => {
 const rawAmount = parseFloat(expenseForm.amount as any);
 if (!expenseForm.description || isNaN(rawAmount) || rawAmount <= 0) return;
 
 const cleanAmount = Math.abs(rawAmount);

 if (editingId) {
 setData(prev => ({
 ...prev,
 expenses: prev.expenses.map(e => 
 e.id === editingId ? { ...e, ...expenseForm, amount: cleanAmount } : e
)
 }));
 } else {
 const id = Math.random().toString(36).substr(2, 9);
 setData(prev => ({
 ...prev,
 expenses: [...prev.expenses, { ...expenseForm, id, amount: cleanAmount }]
 }));
 }
 closeModal();
 };

 const openAddModal = () => {
 setEditingId(null);
 setExpenseForm({ 
 description: '', 
 amount: 0, 
 date: new Date().toISOString(), 
 paymentMethod: 'KNet',
 category: 'General'
 });
 setShowModal(true);
 };

 const openEditModal = (expense: Expense) => {
 setEditingId(expense.id);
 setExpenseForm({ 
 description: expense.description, 
 amount: Math.abs(expense.amount), 
 date: expense.date, 
 paymentMethod: expense.paymentMethod,
 category: expense.category 
 });
 setShowModal(true);
 };

 const closeModal = () => {
 setShowModal(false);
 setEditingId(null);
 };

 const handleDeleteExpense = (id: string) => {
 setData(prev => ({
 ...prev,
 expenses: prev.expenses.filter(e => e.id !== id)
 }));
 toast.info("تم الحذف", { 
 description:"تمت إزالة المصروف من السجل بنجاح.",
 position: 'bottom-right'
 });
 setExpenseToDelete(null);
 };

 return (
 <div className="space-y-6">
 <div className="grid grid-cols-2 gap-2 md:gap-3 md:p-3 mb-2 md:mb-0 text-right">
 <StatCard label="إجمالي المصروفات" value={Number(totalExpenses || 0).toFixed(3)} icon={<Wallet />} color="red" description="كامل المصاريف المسجلة" />
 <StatCard label="مصروف اليوم" value={Number(todayExpenses || 0).toFixed(3)} icon={<ArrowDownRight />} color="amber" description="إجمالي الصرف لليوم الحالي" />
 </div>

 <div className="bg-white rounded-3xl p-3 md:p-3 border border-slate-200/60 shadow-sm text-right">
 <div className="flex flex-col md:flex-row md:items-center gap-3 mb-10">
 <div className="relative flex-1">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
 <input 
 id="search-input"
 type="text" 
 placeholder="ابحث في بيان المصروف..."
 value={search}
 onChange={(e) => {
    let val = normalizeArabicNumerals(e.target.value);
    if (/^[0-9]*$/.test(val)) {
      val = val.slice(0, 8);
    }
    setSearch(val);
  }}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
 />
 </div>
 <button 
 onClick={openAddModal}
 className="bg-slate-900 text-white px-4 md:px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95 shrink-0"
 >
 <Plus size={20} />
 <span>إضافة مصروف جديد</span>
 </button>
 </div>

 <div className="overflow-x-auto rounded-3xl border border-slate-100">
 <table className="w-full text-right min-w-[800px]" dir="rtl">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500 text-[10px] uppercase text-right">
 <th className="p-3 md:p-3">التاريخ</th>
 <th className="p-3 md:p-3">بيان المصروف</th>
 <th className="p-3 md:p-3">المبلغ الصافي</th>
 <th className="p-3 md:p-3">طريقة الدفع</th>
 <th className="p-3 md:p-3 text-left pr-10">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(filteredExpenses || []).map(expense => (
 <motion.tr 
 key={expense.id}
 animate={shakingId === expense.id ? { 
 x: [0, -10, 10, -10, 10, 0],
 backgroundColor: ['rgba(255,255,255,1)', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.1)', 'rgba(255,255,255,1)']
 } : {}}
 transition={shakingId === expense.id ? { duration: 0.5 } : {}}
 className={cn(
"hover:bg-slate-50/80 transition-colors group",
 shakingId === expense.id &&"bg-red-50/50"
)}
 ><td className="p-3 md:p-3">
 <div className="flex items-center gap-2 font-bold text-slate-600">
 <Calendar size={14} className="text-slate-500" />
 {new Date(expense.date).toLocaleDateString('en-GB')}
 </div>
 </td>
 <td className="p-3 md:p-3">
 <div className="font-bold text-slate-800 text-lg">{expense.description}</div>
 </td>
 <td className="p-3 md:p-3 font-bold text-red-500 text-lg">
 {Number(Math.abs(expense.amount || 0)).toFixed(3)} د.ك
 </td>
 <td className="p-3 md:p-3">
 <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-tighter">
 <CreditCard size={12} className="text-slate-500" />
 {expense.paymentMethod === 'BankTransfer' ? 'حوالة' : 
 expense.paymentMethod === 'KNet' ? 'KNET' :
 expense.paymentMethod === 'Cash' ? 'كاش' : expense.paymentMethod}
 </div>
 </td>
 <td className="p-3 md:p-3 text-left">
 <div className="flex items-center gap-2 justify-end pr-5">
 <button 
 onClick={() => openEditModal(expense)}
 className="p-2 hover:bg-slate-100 rounded-xl text-slate-300 hover:text-slate-600 transition-colors"
 >
 <Edit2 size={16} />
 </button>
 <button 
 onClick={() => setExpenseToDelete(expense.id)}
 className="p-2 hover:bg-red-50 rounded-xl text-red-300 hover:text-red-500 transition-colors"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </td>
 </motion.tr>
))}
 {(filteredExpenses || []).length === 0 && (
 <tr key="empty-state"><td colSpan={5} className="py-20 px-4 text-center">
 <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
 <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
 <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
 <Wallet size={48} />
 </div>
 <h3 className="text-xl md:text-3xl font-bold text-slate-800 mb-3 tracking-tight">ماكو مصاريف!</h3>
 <p className="text-slate-500 font-bold mb-8 leading-relaxed">لم تسجل أي مصروفات حتى الآن. أضف أول مصروف لتبدأ بتتبع تدفقاتك النقدية بدقة.</p>
 <button 
 onClick={() => { setShowModal(true); }} 
 className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1 mx-auto"
 >
 <Plus size={24} />
 <span>سجل أول مصروف!</span>
 </button>
 </div>
 </td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>

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
 className="bg-white rounded-3xl md:rounded-3xl w-[95%] max-w-lg shadow-xl p-3 md:p-3 border border-slate-100 text-right flex flex-col max-h-[85vh] overflow-hidden"
 onClick={e => e.stopPropagation()}
 >
 <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
 <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-3 justify-end leading-tight text-right">
 {editingId ? 'تحرير المصروف' : 'إضافة مصروف جديد'}
 <PlusCircle className="text-primary" />
 </h2>
 
 <div className="space-y-6">
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">بيان المصروف</label>
 <input 
 type="text" 
 value={expenseForm.description}
 onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right text-lg"
 placeholder="مثال: فاتورة كهرباء، كرتون دجاج..."
 />
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:p-3 text-right">
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">المبلغ (د.ك)</label>
 <NumericInput 
 value={expenseForm.amount === 0 ? '' : expenseForm.amount}
 onChange={(val) => setExpenseForm({ ...expenseForm, amount: val as any })}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 placeholder="0.000"
 />
 </div>
 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">طريقة الصرف</label>
 <select 
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 value={expenseForm.paymentMethod}
 onChange={(e) => setExpenseForm({ ...expenseForm, paymentMethod: e.target.value as any })}
 >
 <option value="Cash">كاش</option>
 <option value="KNet">كي-نت</option>
 <option value="BankTransfer">تحويل بنكي</option>
 <option value="Link">رابط دفع</option>
 </select>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-xs font-bold text-slate-500 uppercase mr-1 block text-right">تاريخ المصروف</label>
 <input 
 type="date" 
 value={expenseForm.date.split('T')[0]}
 onChange={(e) => setExpenseForm({ ...expenseForm, date: new Date(e.target.value).toISOString() })}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-4 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right"
 />
 </div>
 </div>
 </div>
 
 <div className="flex gap-3 pt-6 mt-6 border-t border-slate-50 shrink-0">
 <button 
 onClick={closeModal}
 className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold rounded-2xl transition-all shadow-sm"
 >
 تراجع
 </button>
 <button 
 onClick={handleSaveExpense}
 className="flex-1 py-4 bg-slate-900 text-white font-bold rounded-2xl transition-all shadow-xl active:scale-95"
 >
 {editingId ?"تحديث السجل" :"تأكيد المصروف"}
 </button>
 </div>
 </motion.div>
 </motion.div>
)}
 </AnimatePresence>

 <AnimatePresence>
 {expenseToDelete && (
 <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
 <ConfirmModal
 title="تأكيد الحذف"
 message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
 onConfirm={() => handleDeleteExpense(expenseToDelete)}
 onCancel={() => setExpenseToDelete(null)}
 />
 </motion.div>
)}
 </AnimatePresence>
 </div>
);
};



export default ExpensePage;
