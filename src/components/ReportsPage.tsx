import React, { useState } from 'react';
import { 
 FileText, Search, Printer, Trash2, Edit2, ChevronDown, ChevronUp, Package, User, CreditCard, Clock, CheckCircle2, X, TrendingUp, Plus,
 MessageSquare, 
 ClipboardList
} from 'lucide-react';
import { AppState, Invoice } from '../types';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ui/ConfirmModal';
import { toast } from 'sonner';
import { recalculateStateBalances } from '../lib/business-logic';
import { isPaidStatus, isPendingStatus } from '../lib/status-utils';
import OrderPage from './OrderPage';

interface ReportsPageProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 defaultTab?: 'invoices' | 'tax' | 'pnl' | 'orders';
 onEditInvoice?: (id: string) => void;
 deepLinkData?: { search?: string; exactId?: string; supplierId?: string; openModal?: boolean };
 onClearDeepLink?: () => void;
 setCurrentPage?: (page: string) => void;
 setDeepLinkData?: (data: any) => void;
}

const ReportsPage: React.FC<ReportsPageProps> = React.memo(({ 
 data, 
 setData, 
 defaultTab = 'invoices', 
 onEditInvoice, 
 deepLinkData, 
 onClearDeepLink,
 setCurrentPage,
 setDeepLinkData 
}) => {
 const [activeTab, setActiveTab] = useState<'invoices' | 'tax' | 'pnl' | 'orders'>(defaultTab);
 const [search, setSearch] = useState('');
 const [deleteError, setDeleteError] = useState<string | null>(null);
 const [shakingId, setShakingId] = useState<string | null>(null);
 
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

 const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
 const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
 const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'week' | 'month' | 'custom'>('all');
 const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
 const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

 const cancelledOrderInvoiceIds = new Set((data?.orders || []).filter(o => o.status === 'cancelled' && o.isConvertedToInvoice && o.linkedInvoiceId).map(o => (o.linkedInvoiceId as string)));
 const activeInvoices = (data?.invoices || []).filter(inv => !inv.isDeleted && !cancelledOrderInvoiceIds.has(inv.id));

 const filteredInvoices = activeInvoices.filter(inv => {
 const customer = (data?.customers || []).find(c => c.id === inv.customerId);
 const noteValue = inv.notes || (inv as any).customerNotes || (inv as any).instruction || (inv as any).note || (inv as any).comments;
 const noteStr = typeof noteValue === 'string' ? noteValue : (noteValue ? JSON.stringify(noteValue) : '');
 
 const matchesSearch = (inv.id || '').includes(search) || 
 (customer?.name || '').includes(search) ||
 noteStr.includes(search);
 
 if (timeFilter === 'all') return matchesSearch;
 const invDate = new Date(inv.date);
 const now = new Date();
 if (timeFilter === 'today') return matchesSearch && invDate.toDateString() === now.toDateString();
 if (timeFilter === 'week') {
 const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
 return matchesSearch && invDate >= weekAgo;
 }
 if (timeFilter === 'month') {
 const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
 return matchesSearch && invDate >= monthAgo;
 }
 if (timeFilter === 'custom') {
 const start = new Date(startDate);
 start.setHours(0, 0, 0, 0);
 const end = new Date(endDate);
 end.setHours(23, 59, 59, 999);
 return matchesSearch && invDate >= start && invDate <= end;
 }
 return matchesSearch;
 }).sort((a, b) => {
 const dateA = new Date(a.date).getTime();
 const dateB = new Date(b.date).getTime();
 if (dateB !== dateA) return dateB - dateA;
 // Tie-breaker: reverse lexicographical ID (newer IDs likely higher lexicographically if sequential)
 return b.id.localeCompare(a.id);
 });

 const handleDeleteInvoice = (id: string) => {
 const invoiceToDeleteObj = (data?.invoices || []).find(inv => inv.id === id);
 if (!invoiceToDeleteObj) return;

 setData(prev => {
 // 1. Mark invoice as deleted
 const updatedInvoices = (prev?.invoices || []).map(inv => 
 inv.id === id ? { ...inv, isDeleted: true } : inv
);

 // 2. Restore product stock levels
 const updatedProducts = (prev?.products || []).map(p => {
 const item = invoiceToDeleteObj.items.find(it => it.productId === p.id);
 if (item) {
 return { ...p, stock: (p.stock || 0) + item.quantity };
 }
 return p;
 });

 const nextState = {
 ...prev,
 invoices: updatedInvoices,
 products: updatedProducts
 };

 // 3. Centralized calculation for customers and suppliers
 return recalculateStateBalances(nextState);
 });

 toast.info("تم حذف الفاتورة", { 
 description: `تم إخفاء الفاتورة #${id} واستعادة المخزون وتحديث الحسابات بنجاح.`,
 position: 'bottom-right'
 });
 setInvoiceToDelete(null);
 };

 const handlePrint = (invoice: Invoice) => {
 const customer = (data?.customers || []).find(c => c.id === invoice.customerId);
 const invoiceSubtotal = (invoice?.items || []).reduce((acc, item) => {
 const p = (data?.products || []).find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 return acc + (price * (item.quantity || 1));
 }, 0);
 const invoiceDiscount = invoice.discount || 0;

 const printWindow = window.open('', '_blank');
 if (!printWindow) return;

 const itemsHtml = (invoice?.items || []).map(item => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (product?.price || 0));
 return `
 <tr class="item-row">
 <td>
 <div class="item-details">
 <div class="item-name">${product?.name || 'منتج غير معروف'}</div>
 ${item.itemNotes ? `<div class="item-cat" style="color:#d97706; font-size: 10px;">${item.itemNotes}</div>` : ''}
 </div>
 </td>
 <td class="text-center">
 <span class="qty-badge val-num">${item.quantity || 1}</span>
 </td>
 <td class="text-left val-num">${Number(price || 0).toFixed(3)}</td>
 <td class="text-left val-num">${((item.quantity || 1) * Number(price || 0)).toFixed(3)}</td>
 </tr>
 `;
 }).join('');

 printWindow.document.write(`
 <html dir="rtl">
 <head>
 <title>فاتورة ${invoice.id}</title>
 <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
 <style>
 :root {
 --primary: #0f172a;
 --secondary: #8b5cf6;
 --accent: #f59e0b;
 --text-main: #1e293b;
 --text-muted: #64748b;
 --bg: #ffffff;
 --bg-alt: #f8fafc;
 --border: #e2e8f0;
 --emerald: #10b981;
 }
 body { 
 font-family: 'Cairo', sans-serif; 
 margin: 0; 
 padding: 40px; 
 background: #e2e8f0;
 color: var(--text-main);
 -webkit-print-color-adjust: exact !important;
 print-color-adjust: exact !important;
 display: flex;
 justify-content: center;
 }
 .invoice-box {
 background: var(--bg);
 width: 100%;
 max-width: 800px;
 padding: 50px 60px;
 box-shadow: 0 20px 40px rgba(0,0,0,0.08);
 border-radius: 20px;
 position: relative;
 overflow: hidden;
 }
 .invoice-box::before {
 content: '';
 position: absolute;
 top: 0;
 left: 0;
 right: 0;
 height: 8px;
 background: linear-gradient(90deg, var(--secondary), var(--accent));
 }
 .watermark {
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translate(-50%, -50%) rotate(-15deg);
 width: 500px;
 opacity: 0.025;
 pointer-events: none;
 z-index: 0;
 filter: grayscale(100%);
 }
 .header {
 display: flex;
 justify-content: space-between;
 align-items: flex-start;
 border-bottom: 2px solid var(--bg-alt);
 padding-bottom: 30px;
 margin-bottom: 40px;
 }
 .brand .logo {
 font-size: 32px;
 font-weight: 900;
 color: var(--primary);
 letter-spacing: -1px;
 margin: 0 0 4px 0;
 display: flex;
 align-items: center;
 gap: 12px;
 }
 .brand .logo-wrapper {
 background: white;
 padding: 6px;
 border-radius: 14px;
 box-shadow: 0 4px 10px rgba(0,0,0,0.05);
 margin-left: 14px;
 border: 1.5px solid var(--border);
 display: flex;
 align-items: center;
 justify-content: center;
 }
 .invoice-meta {
 text-align: left;
 }
 .invoice-meta .title {
 font-size: 36px;
 font-weight: 900;
 color: var(--primary);
 margin: 0 0 5px 0;
 text-transform: uppercase;
 }
 .invoice-meta .inv-number {
 font-family: 'JetBrains Mono', monospace;
 font-size: 16px;
 font-weight: 700;
 background: var(--secondary);
 color: white;
 padding: 4px 12px;
 border-radius: 8px;
 display: inline-block;
 }
 .customer-date-section {
 display: flex;
 justify-content: space-between;
 margin-bottom: 40px;
 background: var(--bg-alt);
 padding: 25px;
 border-radius: 16px;
 border: 1px solid var(--border);
 }
 .info-col {
 display: flex;
 flex-direction: column;
 gap: 6px;
 }
 .info-label {
 font-size: 12px;
 text-transform: uppercase;
 font-weight: 800;
 letter-spacing: 1px;
 color: var(--text-muted);
 }
 .info-val {
 font-size: 18px;
 font-weight: 800;
 color: var(--primary);
 }
 table {
 width: 100%;
 border-collapse: separate;
 border-spacing: 0;
 margin-bottom: 40px;
 }
 th {
 background: var(--primary);
 color: white;
 padding: 16px;
 font-size: 13px;
 font-weight: 700;
 text-align: right;
 }
 th:first-child { border-radius: 0 12px 12px 0; }
 th:last-child { border-radius: 12px 0 0 12px; text-align: left; }
 td {
 padding: 20px 16px;
 border-bottom: 1px solid var(--border);
 vertical-align: middle;
 }
 .item-row:last-child td { border-bottom: none; }
 .item-details .item-name {
 font-size: 16px;
 font-weight: 800;
 color: var(--text-main);
 margin-bottom: 4px;
 }
 .val-num {
 font-family: 'JetBrains Mono', monospace;
 font-size: 15px;
 font-weight: 700;
 }
 td.text-center { text-align: center; }
 td.text-left { text-align: left; }
 .qty-badge {
 background: var(--bg-alt);
 padding: 6px 12px;
 border-radius: 8px;
 font-weight: 800;
 border: 1px solid var(--border);
 color: var(--primary);
 }
 .summary-section {
 display: flex;
 justify-content: flex-end;
 margin-top: 20px;
 }
 .summary-box {
 width: 350px;
 background: var(--bg-alt);
 border: 1px solid var(--border);
 border-radius: 16px;
 padding: 24px;
 }
 .summary-row {
 display: flex;
 justify-content: space-between;
 align-items: center;
 padding-bottom: 16px;
 margin-bottom: 16px;
 border-bottom: 1px dashed var(--border);
 }
 .summary-row:last-child {
 border-bottom: none;
 margin-bottom: 0;
 padding-bottom: 0;
 }
 .sum-label {
 font-size: 14px;
 font-weight: 700;
 color: var(--text-muted);
 }
 .sum-val {
 font-family: 'JetBrains Mono', monospace;
 font-size: 16px;
 font-weight: 700;
 color: var(--text-main);
 }
 .total-row {
 background: var(--primary);
 padding: 20px;
 border-radius: 12px;
 color: white;
 margin-top: 8px;
 border-bottom: none;
 }
 .total-row .sum-label {
 color: rgba(255,255,255,0.8);
 font-size: 16px;
 }
 .total-row .sum-val {
 color: white;
 font-size: 26px;
 font-weight: 900;
 }
 .currency {
 font-family: 'Cairo', sans-serif;
 font-size: 12px;
 margin-right: 6px;
 opacity: 0.8;
 font-weight: 700;
 }
 footer {
 margin-top: 60px;
 text-align: center;
 border-top: 2px solid var(--bg-alt);
 padding-top: 30px;
 }
 .footer-contact {
 margin-top: 8px;
 font-family: 'JetBrains Mono', monospace;
 font-size: 12px;
 color: var(--text-muted);
 }
 @media print {
 body { background: white; padding: 0; }
 .invoice-box { box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; border: none; }
 .invoice-box::before { display: none; }
 }
 </style>
 </head>
 <body>
 <div class="invoice-box">
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" class="watermark" style="mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.1);" referrerPolicy="no-referrer" />
 <div class="header">
 <div class="brand">
 <h1 class="logo">
 <div class="logo-wrapper" style="background: transparent; padding: 6px; border-radius: 14px; margin-left: 14px; display: flex; align-items: center; justify-content: center;">
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" alt="Logo" style="width: 38px; height: 38px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.1); margin-left: 14px;" referrerPolicy="no-referrer" />
 </div>
 ${data.settings.companyName || 'التراث الكويتي'}
 </h1>
 </div>
 <div class="invoice-meta">
 <h2 class="title">فاتورة</h2>
 <div class="inv-number">INV-${invoice.id.slice(0,8).toUpperCase()}</div>
 </div>
 </div>

 <div class="customer-date-section">
 <div class="info-col">
 <span class="info-label">معلومات العميل</span>
 <span class="info-val">الاسم: ${customer?.name || 'عميل نقدي (Walk-in)'}</span>
 <span class="info-val">رقم الهاتف: ${customer?.phone || '---'}</span>
 ${(invoice.address && invoice.address !== 'غير محدد') ? `<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: ${typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address}</span>` : invoice.deliveryInfo?.zoneName ? `<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: ${invoice.deliveryInfo.zoneName}</span>` : '<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: غير محدد</span>'}
 </div>
 <div class="info-col" style="text-align: left;">
 <span class="info-label">تاريخ الإصدار</span>
 <span class="info-val">${new Date(invoice.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
 </div>
 </div>

 ${invoice.notes && invoice.notes !== '---' && invoice.notes.trim() !== '' ? `
 <div style="background: rgba(245, 158, 11, 0.1); border-right: 4px solid var(--accent); padding: 15px; margin-bottom: 30px; border-radius: 8px;">
 <span style="display: block; font-size: 10px; font-weight: 900; color: #b45309; text-transform: uppercase; margin-bottom: 4px;">ملاحظات عامة للطلب</span>
 <p style="margin: 0; font-size: 14px; font-weight: 700; color: #78350f;">${invoice.notes}</p>
 </div>
 ` : ''}

 <table>
 <thead>
 <tr>
 <th>البيان / المنتج</th>
 <th style="text-align: center;">الكمية</th>
 <th style="text-align: left;">سعر الوحدة (د.ك)</th>
 <th style="text-align: left;">الإجمالي (د.ك)</th>
 </tr>
 </thead>
 <tbody>
 ${itemsHtml}
 </tbody>
 </table>

 <div class="summary-section">
 <div style="position: absolute; bottom: 210px; left: 80px; opacity: 0.2; transform: rotate(-10deg); z-index: 10; display: flex; flex-direction: column; align-items: center;">
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" style="width: 70px; filter: grayscale(100%) contrast(150%) brightness(0.7); mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.1);" referrerPolicy="no-referrer" />
 <div style="font-size: 8px; font-weight: 900; text-align: center; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px; width: 60px; color: #000;">ختم التوثيق</div>
 </div>
 <div class="summary-box">
 <div class="summary-row">
 <span class="sum-label">المجموع الفرعي</span>
 <span class="sum-val">${invoiceSubtotal.toFixed(3)} <span class="currency">د.ك</span></span>
 </div>
 ${invoiceDiscount > 0 ? `
 <div class="summary-row" style="color: #e11d48;">
 <span class="sum-label" style="color: #e11d48; font-weight: 800;">خصم الكوبون ${invoice.appliedPromoCodeName ? `(${invoice.appliedPromoCodeName})` : ''}</span>
 <span class="sum-val">-${Number(invoiceDiscount).toFixed(3)} <span class="currency">د.ك</span></span>
 </div>` : ''}
 <div class="summary-row total-row" style="background: #0f172a; color: white !important; padding: 20px; border-radius: 12px; margin-top: 15px;">
 <span class="sum-label" style="color: white !important; font-weight: 900; font-size: 18px;">المبلغ الإجمالي</span>
 <span class="sum-val" style="color: white !important; font-weight: 900; font-size: 24px;">${Number(Math.max(0, invoice.totalAmount || (invoiceSubtotal + Number(invoice.deliveryFee || 0) - invoiceDiscount))).toFixed(3)} <span class="currency">د.ك</span></span>
 </div>
 </div>
 </div>

 <footer>
 <div class="footer-contact">
 ${data?.settings?.restaurantNumbers?.length > 0 ? `خدمة العملاء: ${data.settings.restaurantNumbers.join(' - ')}` : ''}
 </div>
 </footer>
 </div>
 <script>
 window.onload = () => {
 setTimeout(() => {
 window.print();
 setTimeout(window.close, 500);
 }, 500);
 }
 </script>
 </body>
 </html>
 `);
 printWindow.document.close();
 };

 const handleEditInvoice = (invoice: Invoice) => {
 if (onEditInvoice) {
 onEditInvoice(invoice.id);
 } else {
 alert('ميزة تعديل الفاتورة ستكون متوفرة من خلال الصفحة الرئيسية.');
 }
 };

 const handleTogglePaymentStatus = (invoiceId: string, currentStatus: string | undefined) => {
 setData((prev) => {
 const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
 const newInvoices = prev.invoices.map(inv => inv.id === invoiceId ? { ...inv, paymentStatus: newStatus as any, status: newStatus === 'paid' ? 'مدفوعة' : 'بانتظار الدفع' } : inv);
 const newOrders = (prev.orders || []).map(order => 
 order.linkedInvoiceId === invoiceId ? { ...order, status: newStatus === 'paid' ? 'تم الدفع وجاري التوصيل' : 'بانتظار الدفع', paymentStatus: newStatus as any } : order
);
 const newState = { ...prev, invoices: newInvoices, orders: newOrders };
 return recalculateStateBalances(newState as AppState);
 });
 toast.success(currentStatus === 'paid' ?"تم تغيير حالة الدفع إلى معلق" :"تمت عملية الدفع بنجاح 💸");
 };

 const getWhatsAppLink = (invoice: Invoice) => {
 const customer = (data?.customers || []).find(c => c.id === invoice.customerId);
 const phone = customer?.phone || '';
 
 // Safety check 
 if (!phone) {
 return '#';
 }

 const items = (invoice?.items || []).map(item => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (product?.price || 0));
 return `- ${product?.name || 'منتج غير معروف'} (${item.quantity || 1} × ${Number(price).toFixed(3)})`;
 }).join('\n');

 const subtotal = (invoice?.items || []).reduce((acc, item) => {
 const p = (data?.products || []).find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 return acc + (price * (item.quantity || 1));
 }, 0);
 
 const total = Math.max(0, subtotal + (Number(invoice.deliveryFee) || 0) - (Number(invoice.discount) || 0));

 const paymentLinkLine = invoice.paymentLink && invoice.paymentLink.trim() !== '' ? `\nرابط الدفع: ${invoice.paymentLink}` : '';

 const promoLabel = invoice.appliedPromoCodeName ? `قيمة الخصم (${invoice.appliedPromoCodeName})` : 'قيمة الخصم';
 const promoLine = (Number(invoice.discount) || 0) > 0 ? `*${promoLabel}*: ${Number(invoice.discount).toFixed(3)} د.ك\n` : '';

 const message = `*فاتورة من شركة مطبخ التراث الكويتي*\n\nالعميل: ${customer?.name || 'عميل'}\nرقم الفاتورة: ${invoice.id}\nالعنوان: ${invoice.address && invoice.address !== 'غير محدد' ? (typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address) : (invoice.deliveryInfo?.zoneName || 'غير محدد')}\nالطلب:\n${items}\n\nالمجموع: ${subtotal.toFixed(3)} د.ك\nرسوم التوصيل: ${Number(invoice.deliveryFee || 0).toFixed(3)} د.ك\n${promoLine}إجمالي الفاتورة: ${Number(total).toFixed(3)} د.ك${paymentLinkLine}\n\nشكراً لتعاملكم معنا!`;
 return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
 };

 return (
 <div className="space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-right">
 <div className="order-2 md:order-1 flex-1">
 <h1 className="text-xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3 justify-end leading-tight">
 {activeTab === 'orders' ? 'طلبات التطبيق' : 'سجل المبيعات'}
 <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
 <FileText className="text-white" />
 </div>
 </h1>
 <p className="text-slate-500 font-medium font-bold italic">{activeTab === 'orders' ? 'تتبع وإدارة طلبات تطبيق الزبائن القادمة' : 'إدارة وتدقيق جميع الفواتير والمبيعات الصادرة'}</p>
  </div>
  </div>

  {/* Tab Selector */}
  <div className="flex items-center gap-4 bg-slate-100 p-2 rounded-2xl w-fit self-end shadow-inner">
  <button
  onClick={() => setActiveTab('invoices')}
  className={cn(
  "px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2",
  activeTab === 'invoices' ? "bg-white text-slate-900 shadow-md scale-105" : "text-slate-500 hover:text-slate-700"
  )}
  >
  <FileText size={16} />
  <span>سجل الفواتير</span>
  </button>
  <button
  onClick={() => setActiveTab('orders')}
  className={cn(
  "px-6 py-2.5 rounded-xl font-black text-xs transition-all flex items-center gap-2 relative",
  activeTab === 'orders' ? "bg-white text-slate-900 shadow-md scale-105" : "text-slate-500 hover:text-slate-700"
  )}
  >
  <ClipboardList size={16} />
  <span>طلبات التطبيق</span>
  { (data.orders || []).filter(o => !o.isConvertedToInvoice && o.status !== 'cancelled').length > 0 && (
  <span className="absolute -top-1 -left-1 bg-amber-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] shadow-sm animate-pulse">
  {(data.orders || []).filter(o => !o.isConvertedToInvoice && o.status !== 'cancelled').length}
  </span>
  )}
  </button>
  </div>

  <AnimatePresence mode="wait">
  {activeTab === 'orders' ? (
  <motion.div 
  key="orders-tab"
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
  >
  <OrderPage 
  data={data} 
  setData={setData} 
  setCurrentPage={setCurrentPage || (() => {})} 
  setDeepLinkData={setDeepLinkData} 
  isPartner={false} 
  />
  </motion.div>
  ) : (
  <motion.div 
  key="invoices-tab"
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
  className="space-y-6"
  >
  
  

 <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:p-4">
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm text-right">
 <div className="text-[10px] font-black text-slate-400 uppercase mb-1">عدد الفواتير</div>
 <div className="text-xl md:text-3xl font-black text-slate-900">{filteredInvoices.length}</div>
 </div>
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm text-right">
 <div className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي المبيعات</div>
 <div className="text-xl md:text-3xl font-black text-primary">
 {Math.max(0, filteredInvoices
 .filter(inv => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined)
 .reduce((a, b) => a + Math.max(0, Number(b.totalAmount || 0)), 0))
 .toFixed(3)
 }
 </div>
 </div>
 <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm text-right">
 <div className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي الربح</div>
 <div className="text-xl md:text-3xl font-black text-emerald-600">
 {Math.max(0, filteredInvoices
 .filter(inv => isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined)
 .reduce((a, b) => a + Math.max(0, Number(b.profit || 0)), 0))
 .toFixed(3)
 }
 </div>
 </div>
 </div>

 <div className="bg-white rounded-[32px] p-3 md:p-3 border border-slate-200 shadow-sm text-right">
 <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
 <div className="relative flex-1">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
 <input 
 id="search-input"
 type="text" 
 placeholder="ابحث برقم الفاتورة أو اسم العميل..."
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-right"
 />
 </div>
 <div className="flex p-1 bg-slate-100 rounded-xl">
 {['all', 'today', 'week', 'month', 'custom'].map((f) => (
 <button
 key={f}
 onClick={() => setTimeFilter(f as any)}
 className={cn(
"px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all",
 timeFilter === f ?"bg-white text-slate-900 shadow-sm" :"text-slate-400 hover:text-slate-600"
)}
 >
 {f === 'all' ? 'الكل' : f === 'today' ? 'اليوم' : f === 'week' ? 'أسبوع' : f === 'month' ? 'شهر' : 'مخصص'}
 </button>
))}
 </div>
 </div>
 
 {timeFilter === 'custom' && (
 <div className="flex items-center gap-4 mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-200">
 <div className="flex-1 text-right">
 <label className="block text-xs font-bold text-slate-500 mb-1">من</label>
 <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 outline-none" />
 </div>
 <div className="flex-1 text-right">
 <label className="block text-xs font-bold text-slate-500 mb-1">إلى</label>
 <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200 outline-none" />
 </div>
 </div>
)}

 <div className="overflow-x-auto rounded-2xl border border-slate-100">
 <table className="w-full text-right min-w-[900px]" dir="rtl">
 <thead>
 <tr className="bg-slate-50 border-b border-slate-100 font-black text-slate-400 text-[10px] uppercase text-right">
 <th className="p-3 md:p-3">رقم الفاتورة</th>
 <th className="p-3 md:p-3">العميل</th>
 <th className="p-3 md:p-3">التاريخ</th>
 <th className="p-3 md:p-3">طريقة الدفع</th>
 <th className="p-3 md:p-3">المستحق</th>
 <th className="p-3 md:p-3 text-left pr-10">إجراءات</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100">
 {(filteredInvoices || []).length === 0 ? (
 <tr key="empty-state">
 <td colSpan={6} className="py-20 px-4 text-center">
 <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
 <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/5 flex items-center justify-center text-primary/40 relative">
 <div className="absolute inset-0 bg-primary/10 rounded-3xl animate-ping opacity-20" />
 <TrendingUp size={48} />
 </div>
 <h3 className="text-xl md:text-3xl font-black text-slate-800 mb-3 tracking-tight">لا توجد فواتير!</h3>
 <p className="text-slate-500 font-bold mb-8 leading-relaxed">لم تقم بإصدار أي فاتورة حتى الآن. أضف أول فاتورة لتطلق العنان لتحليلات الذكاء الاصطناعي.</p>
 <button 
 onClick={() => { if(onEditInvoice) onEditInvoice('new'); }} 
 className="bg-primary text-white hover:bg-primary/90 px-4 md:px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95 hover:rotate-1 mx-auto"
 >
 <Plus size={24} />
 <span>ابدأ رحلتك وضيف أول فاتورة الآن!</span>
 </button>
 </div>
 </td>
 </tr>
) : (filteredInvoices || []).map(inv => {
 const customer = (data?.customers || []).find(c => c.id === inv.customerId);
 const isExpanded = expandedInvoiceId === inv.id;
 return (
 <React.Fragment key={inv.id}>
 <motion.tr 
 key={inv.id}
 animate={shakingId === inv.id ? { 
 x: [0, -10, 10, -10, 10, 0],
 backgroundColor: ['rgba(255,255,255,1)', 'rgba(239,68,68,0.1)', 'rgba(239,68,68,0.1)', 'rgba(255,255,255,1)']
 } : {}}
 transition={shakingId === inv.id ? { duration: 0.5 } : {}}
 onClick={() => setExpandedInvoiceId(isExpanded ? null : inv.id)}
 className={cn(
"hover:bg-slate-50 transition-colors cursor-pointer group",
 isExpanded &&"bg-slate-50/50",
 shakingId === inv.id &&"bg-red-50/50"
)}
 >
 <td className="p-3 md:p-3 font-bold text-primary flex items-center gap-2">
 {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
 #{inv.id}
 </td>
 <td className="p-3 md:p-3">
 <div className="font-bold text-slate-800">{customer?.name || (inv.customerId ? `عميل #${inv.customerId.slice(-4)}` : 'بيانات مفقودة')}</div>
 <div className="text-[10px] text-slate-400 font-medium">{customer?.phone}</div>
 </td>
 <td className="p-3 md:p-3 text-slate-500 text-xs font-bold">
 <div className="flex flex-col gap-1 items-start">
 <span>{new Date(inv.date).toLocaleDateString('en-GB')}</span>
 <span className={cn(
"px-2 py-0.5 rounded-md font-black text-[9px] uppercase",
 inv.deliveryType === 'company' ?"bg-blue-50 text-blue-500" :
 inv.deliveryType === 'special' ?"bg-purple-50 text-purple-500" :
 inv.deliveryType === 'free' ?"bg-amber-50 text-amber-500" :
"bg-emerald-50 text-emerald-500"
)}>
 {inv.deliveryType === 'company' ? 'شركة' : 
 inv.deliveryType === 'special' ? 'خاص' :
 inv.deliveryType === 'free' ? 'مجاني' : 'ربح'}
 </span>
 </div>
 </td>
 <td className="p-3 md:p-3">
 <div className="flex flex-col gap-2 items-start">
 <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase">
 {inv.paymentMethod}
 </span>
    <button
   onClick={(e) => { 
     e.stopPropagation(); 
     if (inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)) return;
     handleTogglePaymentStatus(inv.id, inv.paymentStatus as string || (inv as any).status); 
   }}
   disabled={!!inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)}
   className={cn(
  "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
  isPaidStatus(inv.paymentStatus as string || (inv as any).status) ?"bg-emerald-100 text-emerald-700" :"bg-amber-100 text-amber-700 hover:bg-amber-200",
  (!!inv.paymentLink && isPaidStatus(inv.paymentStatus as string || (inv as any).status)) ? "cursor-not-allowed opacity-90" : ""
 )}
   >
   {isPaidStatus(inv.paymentStatus as string || (inv as any).status) ? 'مدفوع ✓' : 'في إنتظار الدفع ⏳'}
   </button>
 </div>
 </td>
 <td className="p-3 md:p-3 font-black text-slate-900 group-hover:text-primary transition-colors">
 <div className="flex flex-col items-start gap-1">
 <span>{Math.max(0, Number(inv.totalAmount || (inv.items.reduce((acc: number, item: any) => acc + (Number(item.priceAtTime) || 0) * (item.quantity || 1), 0) + Number(inv.deliveryFee || 0) - Number(inv.discount || 0)))).toFixed(3)} د.ك</span>
 {(inv.discount || 0) > 0 && (
 <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-500 whitespace-nowrap">
 خصم مفعّل {inv.appliedPromoCodeName ? `(${inv.appliedPromoCodeName})` : ''}
 </span>
)}
 </div>
 </td>
 <td className="p-3 md:p-3 text-left">
 <div className="flex items-center gap-2 justify-end">
 {isPendingStatus(inv.paymentStatus as string || (inv as any).status) && (
 <button 
 onClick={(e) => { 
 e.stopPropagation(); 
 if (!inv.paymentLink || inv.paymentLink.trim() === '') {
 toast.warning("لم يتم إنشاء رابط الدفع بعد"); return;
 }
 const waLink = getWhatsAppLink(inv);
 window.open(waLink, '_blank', 'noopener,noreferrer');
 }}
 className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-700 transition-colors"
 title="إعادة إرسال الرابط عبر واتس اب"
 >
 <MessageSquare size={16} />
 </button>
)}
 <button 
 onClick={(e) => { e.stopPropagation(); handlePrint(inv); }}
 className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
 title="طباعة"
 >
 <Printer size={16} />
 </button>
 <button 
 onClick={(e) => { e.stopPropagation(); handleEditInvoice(inv); }}
 className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
 title="تعديل"
 >
 <Edit2 size={16} />
 </button>
 <button 
 onClick={(e) => {
 e.stopPropagation();
 setInvoiceToDelete(inv.id);
 }}
 className="p-2 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
 title="حذف"
 >
 <Trash2 size={16} />
 </button>
 </div>
 </td>
 </motion.tr>
 <AnimatePresence>
 {isExpanded && (
 <tr key={`details-${inv.id}`}>
 <td colSpan={6} className="p-0">
 <motion.div 
 initial={{ height: 0, opacity: 0 }}
 animate={{ height: 'auto', opacity: 1 }}
 exit={{ height: 0, opacity: 0 }}
 className="bg-slate-50/80 px-4 py-4 md:px-8 md:py-6 border-b border-slate-100"
 >
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-4 md:p-3 mt-4">
 <div>
 <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
 <Package size={12} /> محتويات الطلب
 </h4>
 <div className="space-y-2">
 {(inv.items || []).map((item, idx) => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 return (
 <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100">
 <div className="flex flex-col">
 <span className="font-bold text-sm">{product?.name || 'منتج غير معروف'}</span>
 {item.itemNotes && (
 <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block w-fit">
 ملاحظة: {item.itemNotes}
 </span>
)}
 </div>
 <div className="flex gap-4 text-xs font-bold">
 <span className="text-slate-400">الكمية: {item.quantity}</span>
 <span className="text-primary">{Number(item.priceAtTime || 0).toFixed(3)} د.ك</span>
 </div>
 </div>
);
 })}
 </div>
 
 {inv.notes && inv.notes !== '---' && inv.notes.trim() !== '' && (
 <div className="mt-4 bg-amber-50/80 border border-amber-100 p-3 rounded-xl">
 <h4 className="text-[10px] font-black uppercase text-amber-600 mb-2 flex items-center gap-2">
 <FileText size={12} /> ملاحظات عامة للطلب
 </h4>
 <p className="text-sm font-bold text-amber-900 leading-relaxed italic pr-3 border-r-2 border-amber-300">
"{inv.notes}"
 </p>
 </div>
)}
 </div>
 <div className="flex flex-col justify-center gap-4">
 <div className="bg-white p-3 rounded-2xl border border-slate-100 space-y-2">
 <div className="flex justify-between text-xs font-bold">
 <span className="text-slate-400">المجموع:</span>
 <span>{Number(inv.items.reduce((acc: number, item: any) => acc + (Number(item.priceAtTime) || 0) * (item.quantity || 1), 0)).toFixed(3)} د.ك</span>
 </div>
 {(inv.discount || 0) > 0 && (
 <div className="flex justify-between text-xs font-bold text-rose-600">
 <span className="text-rose-400">الخصم {inv.appliedPromoCodeName ? `(${inv.appliedPromoCodeName})` : ''}:</span>
 <span>-{Number(inv.discount).toFixed(3)} د.ك</span>
 </div>
)}
 <div className="flex justify-between text-xs font-bold">
 <span className="text-slate-400">التوصيل
 {inv.deliveryInfo?.zoneName ? ` (${inv.deliveryInfo.zoneName})` : ''}
 {inv.deliveryInfo?.company ? ` - ${inv.deliveryInfo.company}` : ''}
 :</span>
 <span>{Number(inv.deliveryFee || 0).toFixed(3)} د.ك</span>
 </div>
 <div className="flex justify-between text-base font-black border-t pt-2 mt-2">
 <span>الإجمالي:</span>
 <span className="text-primary">{Math.max(0, Number(inv.totalAmount || (inv.items.reduce((acc: number, item: any) => acc + (Number(item.priceAtTime) || 0) * (item.quantity || 1), 0) + Number(inv.deliveryFee || 0) - Number(inv.discount || 0)))).toFixed(3)} د.ك</span>
 </div>
 </div>
 </div>
 </div>
 </motion.div>
 </td>
 </tr>
)}
 </AnimatePresence>
 </React.Fragment>
);
 })}
 {filteredInvoices.length === 0 && (
 <tr>
 <td colSpan={6} className="p-3 md:p-4 md:p-3 md:p-4 text-center text-slate-400 font-bold italic">
 لا توجد فواتير مطابقة للبحث.
 </td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>

 {invoiceToDelete && (
 <ConfirmModal
 title="تأكيد الحذف"
 message="هل أنت متأكد من الحذف؟ لا يمكن التراجع عن هذه الخطوة."
 onConfirm={() => handleDeleteInvoice(invoiceToDelete)}
 onCancel={() => setInvoiceToDelete(null)}
 />
)}
  </motion.div>
  )}
  </AnimatePresence>
  </div>
 );
});

export default ReportsPage;
