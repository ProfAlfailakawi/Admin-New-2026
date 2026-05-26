import React, { useState } from 'react';
import { Search, History, DollarSign, Calendar, TrendingUp, CreditCard, FileText, CheckCircle2, Clock, Edit2, Trash2, ArrowUpRight, X } from 'lucide-react';
import { AppState, SupplierTransfer, PaymentMethod } from '../types';
import { cn, normalizeArabic, normalizeArabicNumerals } from '../lib/utils';
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

const SUPPLIER_AUDIT_SEARCH_INPUT_ID = 'supplier-audit-search-input';

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
 React.useEffect(() => {
 if (!autoOpenModal) return;

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
 }, [initialSupplierId, autoOpenModal, onClearDeepLink]);

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

 Object.entries(supplierTotals).forEach(([supplierId, amount]) => {
 transactions.push({
