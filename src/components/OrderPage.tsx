import React, { useState, useEffect } from 'react';
import { 
 ClipboardList, 
 Search, 
 Filter, 
 CheckCircle2, 
 Clock, 
 XCircle, 
 AlertCircle,
 ChevronRight,
 ExternalLink,
 MessageSquare,
 ArrowRightLeft,
 Loader2,
 Calendar,
 User,
 MapPin,
 Package,
 TrendingUp,
 Wallet,
 RefreshCw,
 Users,
 Dices
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, normalizeArabic, robustNormalize } from '../lib/utils';
import { recalculateStateBalances } from '../lib/business-logic';
import { AppState, Order, Invoice, Product, DeliveryType } from '../types';
// import { getDeduplicatedProducts } from '../lib/deduplication';
import { db, auth } from '../firebase';
import { getPublicUrl, getWebhookUrl } from '../lib/urlUtils';
import { collection, query, onSnapshot, doc, updateDoc, setDoc, Timestamp, getDocs } from 'firebase/firestore';
import { toast } from 'sonner';
import { MagneticButton } from './ui/MagneticButton';

enum OperationType {
 CREATE = 'create',
 UPDATE = 'update',
 DELETE = 'delete',
 LIST = 'list',
 GET = 'get',
 WRITE = 'write',
}

interface FirestoreErrorInfo {
 error: string;
 operationType: OperationType;
 path: string | null;
 authInfo: {
 userId?: string | null;
 email?: string | null;
 emailVerified?: boolean | null;
 isAnonymous?: boolean | null;
 tenantId?: string | null;
 providerInfo?: {
 providerId?: string | null;
 email?: string | null;
 }[];
 }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
 const errInfo: FirestoreErrorInfo = {
 error: error instanceof Error ? error.message : String(error),
 authInfo: {
 userId: auth.currentUser?.uid,
 email: auth.currentUser?.email,
 emailVerified: auth.currentUser?.emailVerified,
 isAnonymous: auth.currentUser?.isAnonymous,
 tenantId: auth.currentUser?.tenantId,
 providerInfo: auth.currentUser?.providerData?.map(provider => ({
 providerId: provider.providerId,
 email: provider.email,
 })) || []
 },
 operationType,
 path
 };
 console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
 toast.error(`خطأ في الوصول للبيانات: ${operationType}`);
 throw new Error(JSON.stringify(errInfo));
};

interface OrderPageProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 setCurrentPage: (page: string) => void;
 setDeepLinkData?: (data: any) => void;
 isPartner?: boolean;
}

const InsightCard = ({ label, value, icon: Icon, color, onClick }: { label: string, value: any, icon: any, color: string, onClick?: () => void }) => {
 const isFailedCard = label ==="فشل في عملية الدفع" && value > 0;
 const isPendingCard = label ==="بانتظار الدفع" && value > 0;
 const isSplitPendingCard = label ==="قيد تجميع القطية" && value > 0;
 const needsPulse = isFailedCard || isPendingCard || isSplitPendingCard;
 const glowColorClass = isFailedCard ?"bg-amber-500" : isPendingCard ?"bg-violet-500" : isSplitPendingCard ?"bg-purple-500" :"";
 const bgGlowColorClass = isFailedCard ?"bg-amber-500/10" : isPendingCard ?"bg-violet-500/10" : isSplitPendingCard ?"bg-purple-500/10" :"";

 return (
 <div onClick={onClick} className={cn("bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 relative overflow-hidden", onClick ?"cursor-pointer hover:shadow-md transition-all active:scale-95" :"")}>
 {needsPulse && (
 <motion.div 
 animate={{ opacity: [0.05, 0.15, 0.05] }}
 transition={{ duration: 2, repeat: Infinity }}
 className={cn("absolute inset-0 pointer-events-none", bgGlowColorClass)}
 />
)}
 <div className={cn("p-2.5 rounded-xl bg-slate-50 relative z-10", color.replace('text-', 'bg-').replace('-500', '-500/10'))}>
 <Icon size={20} className={color} />
 {needsPulse && (
 <motion.div 
 animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
 transition={{ duration: 1.5, repeat: Infinity }}
 className={cn("absolute inset-0 rounded-xl filter blur-sm", glowColorClass)}
 />
)}
 </div>
 <div className="relative z-10">
 <div className="text-[10px] font-bold text-slate-500 uppercase leading-none mb-1">{label}</div>
 <div className="text-lg font-bold text-slate-900 leading-none flex items-center gap-2">
 {value}
 {needsPulse && (
 <span className={cn("flex h-2 w-2 rounded-full animate-pulse", glowColorClass)} />
)}
 </div>
 </div>
 </div>
);
};

import { isPaidStatus, isPendingStatus, isFailedStatus, isCancelledStatus } from '../lib/status-utils';

const OrderPage: React.FC<OrderPageProps> = ({ data, setData, setCurrentPage, setDeepLinkData, isPartner }) => {
 const orders = React.useMemo(() => {
 return [...(data.orders || [])].sort((a, b) => {
 const dateB = new Date((b as any).createdAt || b.date).getTime() || 0;
 const dateA = new Date((a as any).createdAt || a.date).getTime() || 0;
 return dateB - dateA;
 });
 }, [data.orders]);

 const [loading, setLoading] = useState(false);
 const [searchTerm, setSearchTerm] = useState('');
 const [filterStatus, setFilterStatus] = useState<string>('all');
 const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
 const [orderDeliveryType, setOrderDeliveryType] = useState<DeliveryType>('company');
 const [orderZoneId, setOrderZoneId] = useState<string>('');
 const [isMarkedAsPaid, setIsMarkedAsPaid] = useState<boolean>(false);
 const [isConfirmingCancel, setIsConfirmingCancel] = useState<boolean>(false);

 const isReadOnly = selectedOrder?.isConvertedToInvoice || isCancelledStatus(selectedOrder?.status as string) || isPaidStatus(selectedOrder?.status as string);

 useEffect(() => {
 if (selectedOrder) {
 setIsMarkedAsPaid(isPaidStatus(selectedOrder.status));
 setIsConfirmingCancel(false);
 setOrderDeliveryType(selectedOrder.isConvertedToInvoice ? (selectedOrder.deliveryType || 'company') : 'company');
 const addr = (selectedOrder as any).address;
 const zoneNameStr = addr?.region || selectedOrder.regionId;
 const zone = (data?.zones || []).find(z => z.id === selectedOrder.regionId || z.name === zoneNameStr);
 if (zone) {
 setOrderZoneId(zone.id);
 } else {
 setOrderZoneId(data.zones && data.zones.length > 0 ? data.zones[0].id : '');
 }
 } else {
 setOrderZoneId('');
 }
 }, [selectedOrder?.id, data.zones]);

 useEffect(() => {
 // Auto-convert paid orders that don't need supplier selection
 const autoConvert = async () => {
 const pendingPaidOrders = data.orders.filter(o => 
 (isPaidStatus(o.status) || isPaidStatus((o as any).paymentStatus)) && 
 !o.isConvertedToInvoice && 
 !hasUnselectedSuppliers(o)
);

 if (pendingPaidOrders.length > 0) {
 // We do one at a time to avoid complex state races, or we could do all
 // Let's at least try the first one found
 const orderToConvert = pendingPaidOrders[0];
 console.log("Auto-converting paid order:", orderToConvert.id);
 
 // Wait a bit to ensure context is ready
 setTimeout(() => {
 convertToInvoice(orderToConvert);
 }, 1000);
 }
 };

 autoConvert();
 }, [data.orders, data.products]);



 useEffect(() => {
 if (selectedOrder) {
 const updatedOrder = orders.find(o => o.id === selectedOrder.id);
 if (updatedOrder && JSON.stringify(updatedOrder) !== JSON.stringify(selectedOrder)) {
 setSelectedOrder(updatedOrder);
 }
 }
 }, [orders]);



 const getOrderCustomerName = (order: Order) => {
 if (order.customerId) {
 const c = (data?.customers || []).find(c => c.id === order.customerId);
 if (c && c.name) return c.name;
 }
 if (order.customerPhone) {
 const c = (data?.customers || []).find(c => c.phone === order.customerPhone);
 if (c && c.name) return c.name;
 }
 return order.customerName;
 };

 const isToday = (dateStr: any, orderObj: any) => {
 let d = new Date();
 if (orderObj && orderObj.createdAt && orderObj.createdAt.seconds) {
 d = new Date(orderObj.createdAt.seconds * 1000);
 } else if (orderObj && orderObj.createdAt) {
 d = new Date(orderObj.createdAt);
 } else if (dateStr) {
 d = new Date(dateStr);
 } else {
 return false;
 }
 
 if (isNaN(d.getTime())) return false;
 const today = new Date();
 return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
 };

 const filteredOrders = orders.filter(order => {
 const nameStr = getOrderCustomerName(order) || '';
 const phoneStr = order.customerPhone || '';
 const matchesSearch = 
 nameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
 phoneStr.includes(searchTerm) ||
 order.id.includes(searchTerm);
 
 const matchesFilter = filterStatus === 'all' || 
 (filterStatus === 'today' ? isToday(order.date, order) : 
 (filterStatus === 'failed' ? isFailedStatus(order.status) :
 (filterStatus === 'pending' ? ((isPendingStatus(order.status) || isFailedStatus(order.status)) && !String(order.status).includes('تجميع القطية') && order.status !== 'split_pending') : 
 (filterStatus === 'split_pending' ? (String(order.status).includes('تجميع القطية') || order.status === 'split_pending') :
 (filterStatus === 'paid' ? isPaidStatus(order.status) : 
 (filterStatus === 'cancelled' ? isCancelledStatus(order.status) : order.status === filterStatus))))));
 
 return matchesSearch && matchesFilter;
 });

 const getStatusColor = (status: string, order?: Order) => {
 if (isPaidStatus(status)) {
 const isVerifiedPaid = order && (order as any).paymentStatus === 'paid';
 if (order && !order.isConvertedToInvoice && hasUnselectedSuppliers(order) && !isVerifiedPaid) {
 return 'bg-gradient-to-r from-rose-500 to-rose-600 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]';
 }
 return 'bg-emerald-100 text-emerald-700 border-emerald-200';
 }
 if (isFailedStatus(status)) return 'bg-amber-100 text-amber-700 border-amber-200';
 if (String(status).includes('تجميع القطية') || status === 'split_pending') return 'bg-purple-100 text-purple-700 border-purple-200';
 if ((isPendingStatus(status) || isFailedStatus(status))) return 'bg-violet-100 text-violet-700 border-violet-200';
 if (isCancelledStatus(status)) return 'bg-rose-100 text-rose-700 border-rose-200';
 
 switch (status) {
 case 'processed': return 'bg-blue-100 text-blue-700 border-blue-200';
 default: return 'bg-slate-100 text-slate-700 border-slate-200/60';
 }
 };

 const hasUnselectedSuppliers = (order: Order) => {
 const unresolved = order.items.some((item) => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 const productName = product?.name || (item as any).name || (item as any).productName || 'منتج غير معروف';
 const supplierOptions = data.products.filter(p => 
 p.isActive !== false && robustNormalize(p.name) === robustNormalize(productName)
);
 return supplierOptions.length > 1 && !(item as any).supplierSelected;
 });
 console.log("DEBUG: hasUnselectedSuppliers for order", order.id,":", unresolved);
 return unresolved;
 };

 const getStatusLabel = (status: string, order?: Order) => {
 if (status === 'today') return 'طلبات اليوم';
 if (isCancelledStatus(status)) {
   if (status === 'انتهى وقت القطية' || status === 'ملغي - انتهى وقت القطية') return 'ملغي - انتهى وقت القطية';
   return 'ملغي';
 }
 if (isPaidStatus(status)) {
 const isVerifiedPaid = order && (order as any).paymentStatus === 'paid';
 const needsSupplier = order && !order.isConvertedToInvoice && hasUnselectedSuppliers(order) && !isVerifiedPaid;
 if (needsSupplier) {
 console.log("DEBUG: Badge showing needs supplier alert for order", order?.id);
 return 'مدفوع – يحتاج اختيار المورد';
 }
 return 'تم الدفع وجاري التوصيل';
 }
 if (isFailedStatus(status)) return 'فشل في عملية الدفع';
 if (String(status).includes('تجميع القطية') || status === 'split_pending') return 'قيد تجميع القطية 🔄';
 if ((isPendingStatus(status) || isFailedStatus(status))) return 'بانتظار الدفع';
 return status;
 };

 const getOrderSubtotal = (order: Order) => {
 // Priority 1: Calculate from individual items for maximum accuracy
 let itemsTotal = 0;
 try {
 itemsTotal = (order.items || []).reduce((sum, item) => {
 let p = (data?.products || []).find(prod => prod.id === item.productId);
 if (!p) {
 const productName = (item as any).name || (item as any).productName || '';
 if (productName) {
 p = (data?.products || []).find(prod => 
 prod.isActive !== false && robustNormalize(prod.name) === robustNormalize(productName)
 );
 }
 }
 
 const itemPrice = Number(
 item.priceAtTime !== undefined ? item.priceAtTime : 
 ((item as any).price !== undefined ? (item as any).price : 
 ((item as any).finalPrice !== undefined ? (item as any).finalPrice :
 (p?.price || 0)))
 ) || 0;
 
 let itemTotal = itemPrice * Number(item.quantity || 0);
 if ((item as any).addons && (item as any).addons.length > 0) {
   (item as any).addons.forEach((addon: any) => {
     let addonQty = 0;
        if (addon.calculationType === 'fixed') addonQty = 1;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil((item.quantity || 1) / (addon.xItemsThreshold || 1));
        else addonQty = item.quantity || 1;        addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));

     itemTotal += Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0));
   });
 }
 return sum + itemTotal;
 }, 0) || 0;
 } catch (e) {
 console.warn("Subtotal item calculation error:", e);
 }

 if (itemsTotal > 0) return itemsTotal;

 // Priority 2: Fallback to existing total amount
 const o = order as any;
 const storedAmount = Number(order.totalAmount || o.finalPrice || o.total || o.total_amount || 0);
 const fee = Number(o.deliveryFee || 0);
 const subtotalFromTotal = Math.max(0, storedAmount - fee);
 
 if (subtotalFromTotal > 0) return subtotalFromTotal;
 return isNaN(storedAmount) ? 0 : storedAmount;
 };

 const getOrderDeliveryFee = (order: Order, type: string, overrideZoneId?: string) => {
 if (type === 'free') return 0;
 const addr = (order as any).address;
 const zoneNameStr = addr?.region || order.regionId;
 const zone = (data?.zones || []).find(z => z.id === (overrideZoneId || order.regionId) || (!overrideZoneId && z.name === zoneNameStr));
 const dCost = zone ? zone.cost : 1.0;
 const dProfit = zone ? zone.profit : 0;
 return zone && zone.finalPrice !== undefined ? zone.finalPrice : (dCost + dProfit);
 };

 const getOrderDeliveryProfit = (order: Order, type: string, overrideZoneId?: string) => {
 if (type !== 'standard') return 0;
 const addr = (order as any).address;
 const zoneNameStr = addr?.region || order.regionId;
 const zone = (data?.zones || []).find(z => z.id === (overrideZoneId || order.regionId) || (!overrideZoneId && z.name === zoneNameStr));
 return zone ? zone.profit : 0;
 };

 const updateOrderStatus = async (orderId: string, newStatus: string, additionalUpdates: any = {}) => {
 try {
 const order = orders.find(o => o.id === orderId);
 if (!order) return;

  if (typeof window !== 'undefined') {
    import('../lib/haptics').then(m => {
      // big sum -> premium
      const orderTotal = Number(getOrderSubtotal(order) + getOrderDeliveryFee(order, order.deliveryType || 'company'));
      if (newStatus === 'cancelled') {
        m.triggerHaptic('heavy');
      } else if (orderTotal > 50) {
        m.triggerHaptic('success');
        m.playPremiumSound('vip');
      } else {
        m.triggerHaptic('medium');
        m.playPremiumSound('normal');
      }
    });
  }

 // Handle Cancellation logic for converted orders
 if (newStatus === 'cancelled' && order.isConvertedToInvoice && order.linkedInvoiceId) {
 const linkedInv = (data?.invoices || []).find(inv => inv.id === order.linkedInvoiceId && !inv.isDeleted);
 
 if (linkedInv) {
 setData(prev => {
 // 1. Mark invoice as deleted
 const updatedInvoices = prev.invoices.map(inv => 
 inv.id === linkedInv.id ? { ...inv, isDeleted: true } : inv
);

 // 2. Restore product stock levels
 const updatedProducts = prev.products.map(p => {
 const item = linkedInv.items.find(it => it.productId === p.id);
 if (item) {
 return { ...p, stock: (p.stock || 0) + item.quantity };
 }
 return p;
 });

 const finalState = {
 ...prev,
 invoices: updatedInvoices,
 products: updatedProducts
 };

 return recalculateStateBalances(finalState);
 });

 // Sync invoice deletion is handled by App.tsx auto-save
 toast.info("تم إلغاء الفاتورة المرتبطة وتعديل المخزون تلقائياً");
 }
 }

 setData(prev => {
 let updatedInvoices = prev.invoices;
 if (newStatus === 'paid' && order.isConvertedToInvoice && order.linkedInvoiceId) {
 updatedInvoices = prev.invoices.map(inv => 
 inv.id === order.linkedInvoiceId ? { ...inv, paymentStatus: 'paid', status: 'مدفوعة' } : inv
);
 }

 const updatedOrders = (prev.orders || []).map(o => 
 o.id === orderId 
 ? { ...o, status: (newStatus === 'paid' || newStatus === 'تم الدفع') ? 'تم الدفع وجاري التوصيل' : (newStatus as any), paymentStatus: (newStatus === 'paid' || newStatus === 'تم الدفع') ? 'paid' : o.paymentStatus, updatedAt: new Date().toISOString(), ...additionalUpdates } 
 : o
);
 return {
 ...prev,
 orders: updatedOrders,
 invoices: updatedInvoices
 };
 });
 toast.success("تم تحديث حالة الطلب");
 if (selectedOrder?.id === orderId) {
 setSelectedOrder(prev => prev ? { ...prev, status: newStatus as any, ...additionalUpdates } : null);
 }
 } catch (error) {
 toast.error("فشل تحديث الحالة");
 }
 };

 const convertToInvoice = async (order: Order) => {
  setLoading(true);
 if (isCancelledStatus(order.status)) {
 toast.error("لا يمكن تحويل طلب ملغي إلى فاتورة");
 return;
 }
 if (hasUnselectedSuppliers(order)) {
 toast.error("يرجى اختيار المورد لجميع المنتجات قبل التحويل");
 return;
 }
 try {
 // 1. Check if customer exists, otherwise create
 const orderPhoneStr = order.customerPhone ? String(order.customerPhone).trim() : '';
 const orderNameStr = getOrderCustomerName(order) ? String(getOrderCustomerName(order)).trim() : '';
 
 console.log("Debug convertToInvoice: order =", order);

 const validPhone = orderPhoneStr.length > 0 && orderPhoneStr !== 'undefined' && orderPhoneStr !== 'null';
 const validName = orderNameStr.length > 0 && orderNameStr !== 'undefined' && orderNameStr !== 'null';

 // Prefer explicit customer ID if passed by mobile app and exists
 const existingById = order.customerId ? (data?.customers || []).find(c => c.id === order.customerId) : undefined;
 
 const existingByName = (!existingById && validName)
 ? (data?.customers || []).find(c => c.name && normalizeArabic(String(c.name)) === normalizeArabic(orderNameStr))
 : undefined;

 const existingByPhone = (!existingById && validPhone && orderPhoneStr !== '00000000') 
 ? (data?.customers || []).find(c => c.phone && String(c.phone).trim() === orderPhoneStr) 
 : undefined;

 // Priority logic:
 // 1. Match by ID (explicitly provided)
 // 2. Match by Phone (Source of truth as per user instruction)
 // 3. Match by Name (Fallback)
 const matchedCustomer = existingById || existingByPhone || existingByName;

 let newCustomerToAdd: any = null;
 let targetCustomerId = '';

 if (matchedCustomer) {
 targetCustomerId = matchedCustomer.id;
 
 // Safety Net: if matched by phone but name is different, we follow the latest order name
 // This solves the"Um Ahmed vs Sharifa" problem - we update the DB name to the latest one
 const currentMatchedName = matchedCustomer.name ? normalizeArabic(String(matchedCustomer.name)) : '';
 const orderNameNormalized = validName ? normalizeArabic(orderNameStr) : '';
 
 if (validName && currentMatchedName !== orderNameNormalized) {
 console.log(`Updating customer name from ${matchedCustomer.name} to ${orderNameStr} (Phone match)`);
 
 // Extracted name change, will be saved via App.tsx sync
 
 // Local update will happen via onSnapshot or manual state update below
 matchedCustomer.name = orderNameStr;
 }
 } else {
 const fallbackPhone = validPhone ? orderPhoneStr : '00000000';
 const fallbackName = validName ? orderNameStr : `عميل غير مسجل #${order.id.slice(-4)}`;
 
 const newCustomer = {
 id: `cust-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
 name: fallbackName,
 phone: fallbackPhone,
 status: 'active' as const,
 totalOrders: 1,
 totalSpent: getOrderSubtotal(order),
 lastOrderDate: new Date().toISOString(),
 loyaltyPoints: 0,
 sentiment: 'neutral' as const,
 lastActive: new Date().toISOString()
 };
 
 targetCustomerId = newCustomer.id;
 newCustomerToAdd = newCustomer;
 }

 console.log("Debug convertToInvoice: matchedCustomer =", matchedCustomer);
 console.log("Debug convertToInvoice: targetCustomerId =", targetCustomerId);
 console.log("Debug convertToInvoice: newCustomerToAdd =", newCustomerToAdd);
 console.log("Debug convertToInvoice: order.notes =", order.notes);
 console.log("Debug convertToInvoice: order.items =", order.items);
 
 // 2. Create Invoice object
 const addr = (order as any).address;
 const zoneNameStr = addr?.region || order.regionId;
 const effectiveZoneId = order.id === selectedOrder?.id && orderZoneId ? orderZoneId : order.regionId;
 const zone = (data?.zones || []).find(z => z.id === effectiveZoneId || (!orderZoneId && z.name === zoneNameStr));

 const invoiceDeliveryFee = getOrderDeliveryFee(order, orderDeliveryType, effectiveZoneId);
 const invoiceDeliveryProfit = getOrderDeliveryProfit(order, orderDeliveryType, effectiveZoneId);

 const totalCost = (order.items || []).reduce((sum, item) => sum + ((item.costAtTime || (data?.products || []).find(p => p.id === item.productId)?.cost || 0) * (item.quantity || 0)), 0);
 const gatewayFee = 0.250;
 const subtotalAmount = getOrderSubtotal(order);
 const discountVal = (order as any).discount || 0;
 const totalAmount = Math.max(0, subtotalAmount + invoiceDeliveryFee - discountVal);
 const profit = Math.max(0, subtotalAmount - totalCost - gatewayFee + invoiceDeliveryProfit - discountVal);
 
 let createdLink = undefined;
 let createdPaymentId: string | undefined = undefined;
 const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
 const newInvoiceId = `INV-${Date.now()}-${randomSuffix}`;

 // Only attempt to generate payment link if not paid
 let isZeroPaid = false;
 const isActuallyPaid = isPaidStatus(order.status) || isPaidStatus((order as any).paymentStatus) || (selectedOrder?.id === order.id && isMarkedAsPaid);
 if (!isActuallyPaid) {
 if (totalAmount > 0) {
 try {
 const customer = (data?.customers || []).find(c => c.id === targetCustomerId);
 const response = await fetch("/api/create-payment", {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 amount: Number(Number(totalAmount).toFixed(3)),
 isAdmin: true,
 customerName: customer?.name || 'Customer',
 customerEmail: customer?.email || 'no-email@example.com',
 customerMobile: customer?.phone || '+96500000000',
 orderId: newInvoiceId,
 description: `Invoice from Order ${order.id.slice(-6)}`,
 returnUrl: `https://alturathkw.shop/api/payment-return/${newInvoiceId}`,
 cancelUrl: `https://alturathkw.shop/api/payment-return/${newInvoiceId}`,
 notificationUrl: 'https://admin.alturathkw.shop/api/webhook/upayments'
 })
 });
 
 const paymentData = await response.json();
 if (response.ok && (
 paymentData.paymentLink ||
 paymentData.payment_url ||
 paymentData.paymentUrl ||
 paymentData.url ||
 paymentData.link ||
 paymentData.data?.paymentLink ||
 paymentData.data?.payment_url ||
 paymentData.data?.paymentURL ||
 paymentData.data?.paymentUrl ||
 paymentData.data?.url ||
 paymentData.data?.link ||
 typeof paymentData.data === 'string'
 )) {
 createdLink =
paymentData.paymentLink ||
paymentData.payment_url ||
paymentData.paymentUrl ||
paymentData.url ||
paymentData.link ||
paymentData.data?.paymentLink ||
paymentData.data?.payment_url ||
paymentData.data?.paymentURL ||
paymentData.data?.paymentUrl ||
paymentData.data?.url ||
paymentData.data?.link ||
(typeof paymentData.data === 'string' ? paymentData.data : undefined);
 if (paymentData.data) {
 createdPaymentId = paymentData.data.payment_id || paymentData.data.id || paymentData.data.transaction_id || paymentData.data.transactionId;
 }
 } else {
 console.error("Failed to generate payment link:", paymentData);
 toast.error("خطأ إنشاء الرابط: " + (paymentData.message || paymentData.error || 'غير معروف'));
 }
 } catch (e) {
 console.error("Error creating payment link:", e);
 toast.error("خطأ في الاتصال بخادم الدفع");
 }
 } else {
 isZeroPaid = true;
 }
 }

 const itemsWithPrices = order.items.map(item => {
 let p = (data?.products || []).find(prod => prod.id === item.productId);
 let finalProductId = item.productId;

 // Auto-resolve unified product if there's exactly 1 supplier
 if (!p) {
 const productName = (item as any).name || (item as any).productName || '';
 if (productName) {
 const supplierOptions = data.products.filter(prod => 
 prod.isActive !== false && robustNormalize(prod.name) === robustNormalize(productName)
);
 if (supplierOptions.length === 1) {
 p = supplierOptions[0];
 finalProductId = p.id;
 }
 }
 }

 const price = Number(item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0))) || 0;
 const cost = Number(item.costAtTime !== undefined ? item.costAtTime : (p?.cost || 0)) || 0;
 return {
 ...item,
 productId: finalProductId, // Important to use the resolved ID
 name: p ? p.name : ((item as any).name || (item as any).productName), // Customer App needs 'name'
 price: price, // Customer App might use 'price' instead of 'priceAtTime'
 priceAtTime: price,
 costAtTime: cost,
 quantity: Number(item.quantity || 1)
 };
 });

 // Check if there are any products that have multiple suppliers but haven't been selected yet
 const hasUnresolvedItems = order.items.some(it => {
 const product = (data?.products || []).find(p => p.id === it.productId);
 const productName = product?.name || (it as any).name || (it as any).productName || '';
 const supplierOptions = data.products.filter(p => p.isActive !== false && robustNormalize(p.name) === robustNormalize(productName));
 return supplierOptions.length > 1 && !(it as any).supplierSelected;
 });
 if (hasUnresolvedItems) {
 toast.error("يرجى تحديد المورد للأصناف متعددة الموردين قبل تحويل الفاتورة");
 return;
 }

 const orderNotesAggregated = (() => {
 const o = order as any;
 const val = order.notes || o.generalNotes || o.customerNotes || o.instruction || o.instructions || o.note || o.comments || o.customerNote || o.userNote || o.message || o.details;
 return typeof val === 'string' ? val : (val ? JSON.stringify(val) : '');
 })();

   // disabled newInvoice creation


 // 3. Update local state
 setData(prev => {
  // Decrement stock levels
 const updatedProducts = prev.products.map(p => {
   const item = itemsWithPrices.find((it: any) => it.productId === p.id);
   if (!item) return p;

   let newP = { ...p, stock: Math.max(0, (p.stock || 0) - item.quantity) };
   if (newP.stock === 0) newP.isOutOfStock = true;

   // Deduct addon stock
   if (newP.addons && newP.addons.length > 0 && item.addons) {
     newP.addons = newP.addons.map(addon => {
       const selectedAddon = item.addons.find((a: any) => a.id === addon.id);
       if (!selectedAddon || !addon.trackStock) return addon;
       
       let addonQty = 0;
       if (addon.calculationType === 'fixed') addonQty = 1;
       else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / (addon.xItemsThreshold || 1));
       else addonQty = item.quantity;
       addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));

       return { ...addon, stock: Math.max(0, (addon.stock || 0) - addonQty) };
     });
   }
   
   return newP;
 });

 const updatedCustomers = [...prev.customers];
 if (newCustomerToAdd) {
 updatedCustomers.push(newCustomerToAdd);
 }

 const nextState = {
  ...prev,
  products: updatedProducts,
  customers: updatedCustomers
  };

 return recalculateStateBalances(nextState);
 });

 // 4. Mark order as processed (if paid), otherwise pending (if waiting for link payment)
 const finalStatus = isActuallyPaid ? 'paid' : 'pending';
 
 // Calculate updated order total for synchronization with customer app
 const subtotal = getOrderSubtotal(order);
 const updatedOrderTotal = subtotal + invoiceDeliveryFee;

 await updateOrderStatus(order.id, finalStatus, { 
  isConvertedToInvoice: true,
  customerId: targetCustomerId,
  customerPhone: orderPhoneStr || (matchedCustomer ? matchedCustomer.phone : ""),
  address: (order as any).address,
  notes: orderNotesAggregated || "---",
  items: itemsWithPrices,
  totalCost,
  profit,
  gatewayFee,
  discount: discountVal,
  paymentMethod: (isActuallyPaid || isZeroPaid) ? "KNet" : "Link",
  deliveryType: orderDeliveryType,
  manuallyModifiedDeliveryType: true,
  deliveryFee: invoiceDeliveryFee,
  deliveryInfo: zone ? {
    company: "",
    zoneName: zone.name,
    cost: zone.cost,
    profit: invoiceDeliveryProfit,
    finalPrice: invoiceDeliveryFee
  } : undefined,
  isFreeDelivery: orderDeliveryType === 'free',
  total: updatedOrderTotal, 
  totalAmount: subtotal,
  finalPrice: updatedOrderTotal,
  paymentLink: createdLink,
  paymentId: createdPaymentId
  });

 // Auto-open WhatsApp after converting app order to invoice
 if (createdLink && createdLink.trim() !== '') {
   const orderForWhatsApp = {
      ...order,

     paymentLink: createdLink,
     paymentId: createdPaymentId,
     total: updatedOrderTotal,
     totalAmount: subtotal,
     deliveryFee: invoiceDeliveryFee,
     isConvertedToInvoice: true
   } as Order;

   const waLink = getWhatsAppLink(orderForWhatsApp);
   if (waLink && waLink !== '#') {
     window.open(waLink, '_blank', 'noopener,noreferrer');
   }
 }
 
 toast.success("تم تحويل الطلب إلى فاتورة وتعديل المخزون بنجاح ✅");
 if (setDeepLinkData) {
 setDeepLinkData({ search: getOrderCustomerName(order) });
 }
 setCurrentPage('invoices-list');
 } catch (error) {
 console.error(error);
 toast.error("فشل تحويل الطلب");
 }
 };

 const getWhatsAppLink = (order: Order) => {
 const pData = data.products || [];
 const items = order.items.map(item => {
 const p = pData.find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 let displayPrice = Number(price);
 let addonsLines: string[] = [];
 
 if ((item as any).addons && (item as any).addons.length > 0) {
   (item as any).addons.forEach((addon: any) => {
     let addonQty = 0;
        if (addon.calculationType === 'fixed') addonQty = 1;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil((item.quantity || 1) / (addon.xItemsThreshold || 1));
        else addonQty = item.quantity || 1;        addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));


     if (addonQty > 0) {
       if (addon.isHiddenPrice) {
         displayPrice += (Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0))) / (item.quantity || 1);
         addonsLines.push(`  + ${addon.name}${addonQty > 1 ? ` (${addonQty})` : ''}`);
       } else {
         addonsLines.push(`  + ${addon.name}${addonQty > 1 ? ` (${addonQty})` : ''} - (${(Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0))).toFixed(3)} د.ك)`);
       }
     }
   });
 }
 return `- ${p?.name || 'منتج غير معروف'} (${item.quantity || 1} × ${Number(displayPrice).toFixed(3)} د.ك)${addonsLines.length > 0 ? '\n' + addonsLines.join('\n') : ''}`;
}).join('\n');

 const subtotal = getOrderSubtotal(order);
 const deliveryFee = getOrderDeliveryFee(order, order.deliveryType || 'company', order.regionId);
 const discount = (order as any).discount || 0;
 const total = Math.max(0, subtotal + deliveryFee - discount);

 const linkedInvoice = order.linkedInvoiceId ? (data?.invoices || []).find(inv => inv.id === order.linkedInvoiceId) : undefined;
 console.log("DEBUG: Order:", order.id,"linkedInvoiceId:", order.linkedInvoiceId,"linkedInvoice:", linkedInvoice);
 const paymentLink = linkedInvoice?.paymentLink || (order as any).paymentLink || (linkedInvoice as any)?.splitLink || (linkedInvoice as any)?.split_link || (order as any).splitLink || (order as any).split_link || (order as any).splitPaymentLink || (order as any).split_payment_link || (order as any).paymentUrl || (order as any).payment_url || (order as any).url || (order as any).link;
 console.log("DEBUG: Found paymentLink:", paymentLink);

 const titleLine = `*فاتورة من شركة مطبخ التراث الكويتي*`;
 const headerLine = `رقم الفاتورة: ${linkedInvoice?.id || `INV-${order.id.slice(-6)}`}`;
 const footerLine = `إجمالي الفاتورة: ${Number(total).toFixed(3)} د.ك`;
 const isPaidNow = isPaidStatus(order.status) && !(String(order.status).includes('تجميع القطية') || order.status === 'split_pending');
 const paymentLinkLine = (paymentLink && paymentLink.trim() !== '' && !isPaidNow) ? `\nرابط الدفع: ${paymentLink}` : '';
 
 // Explicitly add coupon if present
 const promoCodeName = (order as any).appliedPromoCodeName || linkedInvoice?.appliedPromoCodeName;
 const promoLine = discount > 0 ? `*قيمة الخصم* ${promoCodeName ? `(${promoCodeName})` : ''}: ${Number(discount).toFixed(3)} د.ك\n` : '';

 const addressLine = (order as any).address ? `\nالعنوان: ${(order as any).address}` : (linkedInvoice?.address && linkedInvoice.address !== 'غير محدد') ? `\nالعنوان: ${typeof linkedInvoice.address === 'object' ? [`${linkedInvoice.address.region||''}`, `ق${linkedInvoice.address.block||''}`, `ش${linkedInvoice.address.street||''}`, `م${linkedInvoice.address.building||''}`].filter(Boolean).join(' ') : linkedInvoice.address}` : linkedInvoice?.deliveryInfo?.zoneName ? `\nالعنوان: ${linkedInvoice.deliveryInfo.zoneName}` : '';
const message = `${titleLine}\n\nالعميل: ${getOrderCustomerName(order) || 'عميل'} ${addressLine}\n${headerLine}\nالطلب:\n${items}\n\nالمجموع: ${subtotal.toFixed(3)} د.ك\nرسوم التوصيل: ${Number(deliveryFee).toFixed(3)} د.ك\n${promoLine}${footerLine}${paymentLinkLine}\n\nشكراً لتعاملكم معنا!`;

 const phoneUsed = order.customerPhone || (data?.customers || []).find(c => c.id === order.customerId)?.phone || '';

  let finalMessage = message;
  const targetObj = linkedInvoice || order;
  if ((targetObj as any).splitType === 'traditional' && Array.isArray((targetObj as any).splitPayments)) {
    const splitText = `\n\n*المشاركين بالقطية:*\n` + ((targetObj as any).splitPayments).map((sp:any) => `- ${sp.name || 'مشارك'} (${sp.phone||'بدون رقم'}) - ${Number(sp.amount||0).toFixed(3)} د.ك`).join('\n');
    finalMessage = message.replace('شكراً لتعاملكم', splitText + '\n\nشكراً لتعاملكم');
  } else if ((targetObj as any).splitType === 'roulette' && Array.isArray((targetObj as any).splitParticipants)) {
    const participants = ((targetObj as any).splitParticipants).map((p:any) => typeof p === 'object' ? `${p.name||''} ${p.phone?`(${p.phone})`:''}`.trim() : p).join('، ');
    const splitText = `\n\n*🎲 روليت الحظ 🎲*\nالمشاركون: ${participants}\n*بطل الليلة اللي دفعها:* ${(targetObj as any).rouletteLoser || 'غير معروف'}`;
    finalMessage = message.replace('شكراً لتعاملكم', splitText + '\n\nشكراً لتعاملكم');
  }

 return `https://wa.me/${phoneUsed.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(finalMessage)}`;
 };

 return (
 <section className="p-3 md:p-4 lg:p-3 md:p-3 space-y-6 animate-in fade-in duration-500" dir="rtl">
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:p-4 bg-slate-900 p-3 md:p-4 md:p-3 rounded-3xl shadow-xl relative overflow-hidden group">
 <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
 
 <div className="relative z-10 w-full flex items-center justify-between">
 <div className="flex items-center gap-4">
 <div className="p-3 bg-indigo-500/20 rounded-2xl backdrop-blur-xl border border-indigo-500/30">
 <ClipboardList className="text-indigo-400" size={32} />
 </div>
 <div>
 <h1 className="text-xl md:text-3xl md:text-xl md:text-2xl font-bold text-white tracking-tighter">
 طلبات التطبيق
 </h1>
 <p className="text-slate-500 font-bold text-sm md:text-base mt-1">إدارة الطلبات القادمة من تطبيق العملاء</p>
 </div>
 </div>
 
 </div>
 </div>

 {/* Quick Insights Bar */}
 <div className="flex overflow-x-auto lg:grid lg:grid-cols-7 gap-3 md:gap-4 pb-2 -mx-3 px-3 md:mx-0 md:px-0 md:pb-0 hide-scrollbar">
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="إجمالي الطلبات" value={orders.length} icon={ClipboardList} color="text-slate-500" onClick={() => setFilterStatus('all')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="طلبات اليوم" value={data.orders.filter(o => {
 let d = new Date();
 const oAsAny = o as any;
 if (oAsAny.createdAt && oAsAny.createdAt.seconds) d = new Date(oAsAny.createdAt.seconds * 1000);
 else if (oAsAny.createdAt) d = new Date(oAsAny.createdAt);
 else if (o.date) d = new Date(o.date);
 else return false;
 
 if (isNaN(d.getTime())) return false;
 const today = new Date();
 return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
 }).length} icon={Calendar} color="text-indigo-500" onClick={() => setFilterStatus('today')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="قيد تجميع القطية" value={data.orders.filter(o => String(o.status).includes('تجميع القطية') || o.status === 'split_pending').length} icon={RefreshCw} color="text-purple-500" onClick={() => setFilterStatus('split_pending')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="بانتظار الدفع" value={data.orders.filter(o => (isPendingStatus(o.status as string) || isFailedStatus(o.status as string)) && !(String(o.status).includes('تجميع القطية') || o.status === 'split_pending')).length} icon={Clock} color="text-violet-500" onClick={() => setFilterStatus('pending')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="فشل في الدفع" value={data.orders.filter(o => isFailedStatus(o.status as string)).length} icon={AlertCircle} color="text-amber-500" onClick={() => setFilterStatus('failed')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="جاري التوصيل" value={data.orders.filter(o => isPaidStatus(o.status as string)).length} icon={CheckCircle2} color="text-emerald-500" onClick={() => setFilterStatus('paid')} />
 </div>
 <div className="min-w-[140px] md:min-w-0">
 <InsightCard label="ملغي" value={data.orders.filter(o => isCancelledStatus(o.status as string)).length} icon={XCircle} color="text-rose-500" onClick={() => setFilterStatus('cancelled')} />
 </div>
 </div>

 {/* Main Container */}
 <div className="bg-white rounded-2xl p-3 md:p-4 lg:p-3 md:p-3 shadow-lg border border-slate-100">
 <div className="max-w-2xl mx-auto relative mb-8">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
 <input
 type="text"
 placeholder="ابحث بالاسم، الهاتف..."
 className="w-full pl-4 pr-12 py-3.5 bg-slate-50 rounded-2xl border border-transparent focus:border-indigo-600/20 focus:bg-white transition-all font-bold text-sm shadow-sm"
 value={searchTerm}
 onChange={(e) => setSearchTerm(e.target.value)}
 />
 </div>

 {loading ? (
 <div className="flex flex-col items-center justify-center py-20 md:py-32">
 <Loader2 className="animate-spin text-indigo-600 w-12 h-12 md:w-16 md:h-16 mb-6" />
 <p className="text-slate-500 font-bold text-xl animate-pulse">جاري مزامنة الطلبات الفورية...</p>
 </div>
) : filteredOrders.length === 0 ? (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex flex-col items-center justify-center py-20 md:py-32 min-h-[50vh]"
  >
    {filterStatus === 'pending' ? (
      <>
        <motion.div
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.6, 1, 0.6],
            filter: ["blur(0px)", "blur(4px)", "blur(0px)"]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="w-32 h-32 bg-emerald-100 rounded-full flex items-center justify-center mb-8 relative"
        >
          <div className="absolute inset-0 bg-emerald-300 rounded-full blur-2xl opacity-50" />
          <p className="text-5xl relative z-10">✨</p>
        </motion.div>
        <h3 className="text-emerald-600 font-bold text-3xl mb-4 tracking-tight">إنجاز مبهر!</h3>
        <p className="text-emerald-500/80 font-bold max-w-sm mx-auto text-lg text-center">لا توجد طلبات معلقة والعمليات تعمل بهدوء تام. استمتع بلحظات النجاح الصافية.</p>
      </>
    ) : (
      <>
        <div className="w-32 h-32 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-8 border border-slate-100">
          <ClipboardList size={56} className="text-slate-200" />
        </div>
        <h3 className="text-slate-900 font-bold text-2xl mb-3">السجل فارغ حالياً</h3>
        <p className="text-slate-500 font-bold max-w-sm mx-auto">لا توجد طلبات تطابق اختياراتك. جرب تغيير الفلتر.</p>
      </>
    )}
  </motion.div>
) : (
 <div className="grid grid flex-col md:grid md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 space-y-3 md:space-y-0 gap-3 md:p-4 lg:gap-4 md:p-3">
 {filteredOrders.map((order) => {
 const isPending = (isPendingStatus(order.status as string) || isFailedStatus(order.status as string));
 return (
 <motion.div
 layout
 key={order.id}
 onClick={() => setSelectedOrder(order)}
 whileHover={{ y: -4 }}
 className={cn(
"p-3 rounded-2xl border-2 transition-all cursor-pointer group h-full flex flex-col",
 selectedOrder?.id === order.id 
 ?"border-indigo-600 bg-indigo-50/30 shadow-md" 
 :"border-slate-50 bg-white hover:border-indigo-100 shadow-sm"
)}
 >
 <div className="flex-grow">
 <div className="flex justify-between items-start mb-3">
 <div className="space-y-0.5">
 <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded-md">
 #{order.id.slice(-6)}
 </span>
 <h3 className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors line-clamp-1">
 {getOrderCustomerName(order)}
 </h3>
 </div>
 <div className="relative">
 {isPending && (
 <div 
 className={cn(
 "absolute inset-0 rounded-lg filter blur-md animate-pulse",
 isFailedStatus(order.status as string) ?"bg-amber-500" : (String(order.status).includes('تجميع القطية') || order.status === 'split_pending') ? "bg-purple-500" : "bg-violet-500"
)}
 />
)}
 <div 
 className={cn(
"px-2 py-0.5 rounded-lg text-[10px] font-bold relative z-20 transition-all",
 ((isPendingStatus(order.status as string) || isFailedStatus(order.status as string)) || (isPaidStatus(order.status) && hasUnselectedSuppliers(order) && (order as any).paymentStatus !== 'paid')) ?"animate-bounce" :"",
 getStatusColor(order.status as string, order)
)}>
 {getStatusLabel(order.status, order)}
 {(isPaidStatus(order.status) && hasUnselectedSuppliers(order) && !order.isConvertedToInvoice && (order as any).paymentStatus !== 'paid') && (
 <span className="mr-1">⚠️</span>
)}
 </div>
 </div>
 </div>

 <div className="space-y-1.5 md:space-y-2 mb-2 md:mb-4">
 <div className="flex items-center text-[10px] md:text-[11px] text-slate-500 font-bold gap-1.5 md:gap-2">
 <Clock size={10} className="md:w-[12px] opacity-40" />
 <span dir="ltr" className="inline-block text-left">{(() => {
 const ca = (order as any).createdAt;
 let d = null;
 if (ca) {
 if (ca.seconds) d = new Date(ca.seconds * 1000);
 else d = new Date(ca);
 } else if (order.date) {
 d = new Date(order.date);
 }
 if (!d || isNaN(d.getTime())) return '---';
 return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
 })()}</span>
 </div>
 <div className="flex items-start text-[10px] md:text-[11px] text-slate-500 font-bold gap-1.5 md:gap-2">
 <MapPin size={10} className="md:w-[12px] opacity-40 shrink-0 mt-0.5" />
 <span className="line-clamp-1">{(() => {
 const addr = (order as any).address;
 let parts = [];
 if (addr && typeof addr === 'object') {
 if (addr.region) parts.push(addr.region);
 if (addr.block) parts.push(`ق${addr.block}`);
 if (addr.street) parts.push(`ش${addr.street}`);
 }
 return parts.length > 0 ? parts.join(' - ') : (order.regionId || 'غير محدد');
 })()}</span>
 </div>
 </div>

 <div className="space-y-1.5 border-t border-slate-50 pt-2 opacity-80">
 {order.items?.slice(0, 2).map((it, idx) => {
 const p = data.products?.find(p => p.id === it.productId);
 const prepInstructions = p?.preparationInstructions || (it as any).preparationInstructions;
 return (
 <div key={idx} className="flex flex-col gap-1">
   <div className="text-[10px] font-medium text-slate-600 flex justify-between items-center">
     <span className="truncate">{p?.name || 'منتج'}</span>
     <span className="text-indigo-600 font-bold shrink-0">x{it.quantity}</span>
   </div>
   {prepInstructions && (
     <div className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1 w-fit">
       <AlertCircle size={8} className="shrink-0" /> <span className="truncate max-w-[150px]">{prepInstructions}</span>
     </div>
   )}
 </div>
);
 })}
 {order.items?.length > 2 && (
 <div className="text-[10px] text-slate-500 hover:text-indigo-500 font-bold text-center relative group cursor-pointer w-fit mx-auto transition-colors px-2 py-0.5 rounded-full hover:bg-indigo-50">
 + {order.items.length - 2} أصناف
 
 <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-slate-100 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-[100] flex flex-col gap-1.5">
 {order.items.slice(2).map((hiddenItem, hiddenIdx) => {
 const hiddenProduct = data.products?.find(p => p.id === hiddenItem.productId);
 const prepInstructions = hiddenProduct?.preparationInstructions || (hiddenItem as any).preparationInstructions;
 return (
 <div key={hiddenIdx} className="flex flex-col gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
   <div className="flex justify-between items-center text-[10px]">
     <span className="font-bold text-slate-700 truncate text-right max-w-[120px]">{hiddenProduct?.name || 'منتج غير معروف'}</span>
     <span className="text-indigo-600 font-bold shrink-0" dir="ltr">x{hiddenItem.quantity}</span>
   </div>
   {prepInstructions && (
     <div className="text-[10px] text-amber-600 flex items-center gap-1">
       <AlertCircle size={8} className="shrink-0" /> <span className="truncate text-right">{prepInstructions}</span>
     </div>
   )}
 </div>
);
 })}
 {/* Tooltip Arrow */}
 <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-[6px] border-transparent border-t-white"></div>
 <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-[-1px] border-[6px] border-transparent border-t-slate-100 -z-10"></div>
 </div>
 </div>
)}
 </div>
 </div>

 <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center bg-slate-50/50 -mx-4 -mb-4 px-4 py-2 rounded-b-2xl">
 <div className="text-base font-bold text-slate-900">
 {Number(getOrderSubtotal(order) + getOrderDeliveryFee(order, order.deliveryType || 'company') - ((order as any).discount || 0)).toFixed(3)}
 <span className="text-[10px] font-bold mr-1 opacity-40">د.ك</span>
 </div>
 <div className="w-7 h-7 rounded-lg bg-white border border-slate-200/60 flex items-center justify-center text-slate-500 group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
 <ChevronRight size={14} className="rotate-180" />
 </div>
 </div>
 </motion.div>
);
 })}
 </div>
)}
 </div>

 {/* Order Details Modal */}
 <AnimatePresence>
 {selectedOrder && (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-3 md:p-4">
 <motion.div
 initial={{ opacity: 0 }}
 animate={{ opacity: 1 }}
 exit={{ opacity: 0 }}
 onClick={() => setSelectedOrder(null)}
 className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
 />
 <motion.div
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 exit={{ opacity: 0, scale: 0.9, y: 20 }}
 className="bg-white w-full max-w-5xl rounded-2xl md:rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden flex flex-col max-h-[95dvh] md:max-h-[90dvh] border border-white/10 mx-auto"
 >
 {/* Modal Header */}
 <div className="p-3 md:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
 <div>
 <h2 className="text-lg md:text-xl font-bold text-slate-900">تفاصيل الطلب #{selectedOrder.id.slice(-6)}</h2>
 </div>
 <button 
 onClick={() => setSelectedOrder(null)}
 className="p-2 hover:bg-slate-100 rounded-xl transition-all"
 >
 <XCircle className="text-slate-500" size={24} />
 </button>
 </div>
 
 {/* Modal Body */}
 <div className="flex-1 overflow-y-auto p-3 md:p-3 custom-scrollbar relative">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-4 md:p-3">
 {/* Right Column: Items */}
 <div className="lg:col-span-2 space-y-6 md:space-y-8">
 {/* Items List */}
 <div className="space-y-3 md:space-y-4">
 {(selectedOrder as any).splitType === 'traditional' && Array.isArray((selectedOrder as any).splitPayments) && (selectedOrder as any).splitPayments.length > 0 && (
 <div className="mb-4 bg-purple-50/50 border border-purple-100 p-3 md:p-4 rounded-xl">
 <h4 className="text-[12px] md:text-sm font-bold uppercase text-purple-600 mb-3 flex items-center gap-2">
 <Users className="w-4 h-4 md:w-5 md:h-5" /> المشاركين بالقطية
 </h4>
 <div className="space-y-2">
 {((selectedOrder as any).splitPayments).map((sp: any, i: number) => (
 <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-purple-50 shadow-sm">
 <div className="flex flex-col">
 <span className="font-bold text-sm md:text-base text-slate-800">{sp.name || 'مشارك'}</span>
 <span className="text-[10px] md:text-xs text-slate-500">{sp.phone || 'بدون رقم'}</span>
 </div>
 <div className="flex flex-col items-end gap-1">
 <span className="font-bold text-primary text-sm md:text-base">{Number(sp.amount || 0).toFixed(3)} د.ك</span>
 {sp.status === 'paid' ? (
 <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
 <CheckCircle2 className="w-3 h-3" /> مدفوع
 </span>
 ) : isCancelledStatus(sp.status) ? (
 <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
 <XCircle className="w-3 h-3" /> ملغي
 </span>
 ) : sp.status === 'failed' ? (
 <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
 <AlertCircle className="w-3 h-3" /> فشل الدفع
 </span>
 ) : (
 <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
 <Clock className="w-3 h-3" /> بانتظار الدفع
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {(selectedOrder as any).splitType === 'roulette' && Array.isArray((selectedOrder as any).splitParticipants) && (selectedOrder as any).splitParticipants.length > 0 && (
 <div className="mb-4 bg-purple-100 border-2 border-purple-400 p-4 rounded-xl shadow-inner relative overflow-hidden">
 <div className="absolute -right-2 -top-2 md:-right-4 md:-top-4 opacity-10 pointer-events-none text-8xl md:text-9xl">🎲</div>
 <h4 className="text-xs md:text-sm font-bold uppercase text-purple-900 mb-3 md:mb-4 flex items-center gap-2">
 <Dices className="w-4 h-4 md:w-5 md:h-5 text-purple-600" /> روليت الحظ
 </h4>
 
 <div className="bg-white rounded-xl p-3 border-2 border-purple-200 mb-3 text-center">
 <div className="text-[10px] md:text-xs font-bold text-purple-400 mb-1">بطل الليلة (الخاسر اللي دفعها)</div>
 <div className="text-base md:text-lg font-bold text-purple-700">{(selectedOrder as any).rouletteLoser || 'غير معروف'}</div>
 </div>

 <div className="space-y-1">
 <div className="text-[10px] font-bold text-purple-600 mb-2">المشاركون باللعب:</div>
 <div className="flex flex-wrap gap-2">
 {((selectedOrder as any).splitParticipants).map((pName: any, idx: number) => {
 const pVal = typeof pName === 'object' ? `${pName.name || 'مجهول'} ${pName.phone ? `(${pName.phone})` : ''}` : pName;
 return (
 <span key={idx} className="bg-white/60 text-purple-800 text-[10px] md:text-xs font-bold px-2 py-1 rounded-md border border-purple-200">
 {pVal}
 </span>
 );
 })}
 </div>
 </div>
 </div>
 )}
 <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg md:text-xl">
 <Package size={20} className="text-indigo-600 md:w-6 md:h-6" /> الأصناف المطلوبة
 </h3>
 <div className="border border-slate-100 rounded-xl md:rounded-2xl overflow-hidden shadow-sm">
 <div className="overflow-x-auto hide-scrollbar">
 <table className="w-full text-right border-collapse min-w-[340px] md:min-w-[500px]">
 <thead className="bg-slate-50 text-slate-500 text-[10px] md:text-[11px] font-bold uppercase tracking-wider">
 <tr>
 <th className="p-3 md:p-4">الصنف والمورد</th>
 <th className="p-3 md:p-4 text-center">الكمية</th>
 <th className="p-3 md:p-4 text-center">سعر الوحدة</th>
 <th className="p-3 md:p-4 text-left">الإجمالي</th>
 </tr>
 </thead>
 <tbody className="text-[11px] md:text-sm font-bold text-slate-700">
 {selectedOrder.items.map((item, idx) => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 const productName = product?.name || (item as any).name || (item as any).productName || 'منتج غير معروف';
 const prepInstructions = product?.preparationInstructions || (item as any).preparationInstructions;
 const supplierOptions = data.products.filter(p => 
 p.isActive !== false && robustNormalize(p.name) === robustNormalize(productName)
);
 // We consider it"needs selection" if it's not read-only, has >1 supplier, and hasn't been explicitly selected yet.
 const needsSelection = !isReadOnly && supplierOptions.length > 1 && !(item as any).supplierSelected;

 return (
 <tr key={idx} className="border-t border-slate-50 hover:bg-slate-50/50 transition-colors">
 <td className="p-3 md:p-4">
 <div className="flex flex-col gap-1 md:gap-2">
 <div className="font-bold text-slate-800 flex flex-col items-start gap-1.5 text-[11px] md:text-sm">
                                            <div className="flex items-center gap-1.5">
                                              {productName}
                                              {needsSelection && (
                                                <motion.span 
 animate={{ scale: [1, 1.1, 1], rotate: [0, -2, 2, 0] }}
 transition={{ duration: 0.5, repeat: Infinity }}
 className="text-[7px] md:text-[11px] font-bold px-2 md:px-3 py-1 rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30"
 >
 تحديد مورد مطلوب ⚠️
 </motion.span>
                                              )}
                                            </div>
                                            {prepInstructions && (
                                              <span className="text-[10px] md:text-[11px] bg-amber-100/90 border border-amber-200 text-amber-800 font-bold px-2 py-1 rounded-lg mt-1 w-fit flex items-center gap-1.5 shadow-sm">
                                                <AlertCircle size={12} className="text-amber-600" />
                                                طبيعة خاصة: {prepInstructions}
                                              </span>
                                            )}
                                          </div>
 
 {supplierOptions.length > 1 && !isReadOnly && (
 <select 
 className="text-[10px] md:text-[11px] p-1.5 md:p-2 pr-7 md:pr-8 w-full border border-slate-200/60 rounded-lg md:rounded-xl bg-white outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none cursor-pointer transition-all"
 style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'left 0.5rem md:left 0.75rem center', backgroundSize: '0.7rem md:0.8rem' }}
 value={(item as any).supplierSelected ? item.productId : ''}
 onChange={async (e) => {
 const selectedSupp = supplierOptions.find(p => p.id === e.target.value);
 if (selectedSupp) {
 const updatedItems = [...selectedOrder.items];
 updatedItems[idx] = { ...updatedItems[idx], productId: selectedSupp.id, priceAtTime: selectedSupp.price, costAtTime: selectedSupp.cost, supplierSelected: true } as any;
 const newSubtotal = updatedItems.reduce((sum, it) => {
  let baseP = it.priceAtTime !== undefined ? it.priceAtTime : ((data?.products || []).find(p => p.id === it.productId)?.price || 0);
  let itT = baseP * (it.quantity || 0);
  if ((it as any).addons && (it as any).addons.length > 0) {
    (it as any).addons.forEach((addon: any) => {
      let addonQty = 0;
        if (addon.calculationType === 'fixed') addonQty = 1;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil((it.quantity || 1) / (addon.xItemsThreshold || 1));
        else addonQty = it.quantity || 1;        addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));

      itT += Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0));
    });
  }
  return sum + itT;
}, 0);
 
 const newOrder = { ...selectedOrder, items: updatedItems, totalAmount: newSubtotal };
 setSelectedOrder(newOrder);
 
 setData(prev => ({
 ...prev,
 orders: (prev.orders || []).map(o => o.id === selectedOrder.id ? { ...o, items: updatedItems, totalAmount: newSubtotal, updatedAt: new Date().toISOString() } : o)
 }));
 
 toast.success(`تم اختيار المورد: ${(data?.suppliers || []).find(s => s.id === selectedSupp.supplierId)?.name || 'غير معروف'}`);
 
 // Auto-convert to invoice if all suppliers are selected and order is paid
 const stillNeedsSelection = updatedItems.some((it) => {
 const p = (data?.products || []).find(prod => prod.id === it.productId);
 const pName = p?.name || (it as any).name || (it as any).productName || '';
 const options = data.products.filter(prod => prod.isActive !== false && robustNormalize(prod.name) === robustNormalize(pName));
 return options.length > 1 && !(it as any).supplierSelected;
 });

 console.log("DEBUG: Auto-conversion check:", {
 stillNeedsSelection,
 isPaidStatusNew: isPaidStatus(newOrder.status),
 isMarkedAsPaid,
 status: newOrder.status,
 paymentStatus: (newOrder as any).paymentStatus
 });
 
 if (!stillNeedsSelection && (isPaidStatus(newOrder.status) || isMarkedAsPaid)) {
 toast.info("جاري تحويل الطلب المدفوع إلى السجل تلقائياً...");
 setTimeout(() => convertToInvoice(newOrder), 500);
 }
 }
 }}
 >
 <option value="" disabled>تحديد المورد</option>
 {supplierOptions.map(p => (
 <option key={p.id} value={p.id}>
 {(data?.suppliers || []).find(s => s.id === p.supplierId)?.name || 'مورد'} ({p.price.toFixed(3)})
 </option>
))}
 </select>
)}
 
 {(supplierOptions.length === 1 || isReadOnly) && (
 <div className="text-[10px] md:text-[11px] font-bold text-slate-500 bg-slate-100/80 px-1.5 md:px-3 py-1 md:py-2 rounded-md md:rounded-xl w-fit">
 المورد: {(data?.suppliers || []).find(s => s.id === (data?.products || []).find(p => p.id === item.productId)?.supplierId)?.name || 'غير معروف'}
 </div>
)}
 
 {(() => {
 const noteValue = item.itemNotes || (item as any).note || (item as any).notes || (item as any).special_instructions || (item as any).instructions;
 if (noteValue) {
 return (
 <div className="text-[10px] md:text-[11px] text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md md:rounded-lg w-fit flex items-center gap-1">
 <MessageSquare size={8} className="md:w-[10px]" /> {noteValue}
 </div>
)
 }
 return null;
 })()}
 {(() => {
    if ((item as any).addons && (item as any).addons.length > 0) {
      return (
        <div className="flex flex-col gap-0.5 mt-1">
          {(item as any).addons.map((addon: any, aIdx: number) => {
            let addonQty = 0;
        if (addon.calculationType === 'fixed') addonQty = 1;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / (addon.xItemsThreshold || 1));
        else addonQty = item.quantity;        addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));

            if(addonQty === 0) return null;
            return (
              <div key={aIdx} className="text-[10px] md:text-[11px] text-slate-500 font-bold">
                + {addon.name} {addonQty > 1 ? `(${addonQty})` : ''} {!addon.isHiddenPrice && `- (${(Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0))).toFixed(3)} د.ك)`}
              </div>
            );
          })}
        </div>
      );
    }
    return null;
 })()}
 </div>
 </td>
 {(() => {
    let basePrice = Number(item.priceAtTime !== undefined ? item.priceAtTime : (product?.price || 0));
    let displayPrice = basePrice;
    let totalRowPrice = basePrice * item.quantity;
    if ((item as any).addons && (item as any).addons.length > 0) {
      (item as any).addons.forEach((addon: any) => {
        let addonQty = 0;
        if (addon.calculationType === 'fixed') addonQty = 1;
        else if (addon.calculationType === 'per_x_items') addonQty = Math.ceil(item.quantity / (addon.xItemsThreshold || 1));
        else addonQty = item.quantity;        addonQty = Math.max((addon.minQuantity || 0), Math.min(addonQty, (addon.maxQuantity || addonQty)));

        
        let addonTotal = Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0));
        totalRowPrice += addonTotal;
        
        if (addon.isHiddenPrice && addonQty > 0) {
           displayPrice += addonTotal / (item.quantity || 1);
        }
      });
    }
    
    return (
      <>
       <td className="p-3 md:p-4 text-center font-bold text-slate-800">x{item.quantity}</td>
       <td className="p-3 md:p-4 text-center font-bold text-slate-500 text-[10px] md:text-sm">
         {displayPrice.toFixed(3)}
       </td>
       <td className="p-3 md:p-4 text-left font-bold text-slate-900 text-[10px] md:text-sm">
         {totalRowPrice.toFixed(3)}
       </td>
      </>
    );
 })()}
 </tr>
);
 })}
 </tbody>
 <tfoot className="bg-slate-50/50 text-[10px] md:text-xs">
 {/* Show Discount if present */}
 {((selectedOrder as any).discount > 0) && (
 <tr>
 <td colSpan={3} className="p-2 md:p-3 font-bold text-rose-500">
 الخصم {(selectedOrder as any).appliedPromoCodeName ? `(${ (selectedOrder as any).appliedPromoCodeName })` : ''}
 </td>
 <td className="p-2 md:p-3 text-left font-bold text-rose-600">
 - {Number((selectedOrder as any).discount).toFixed(3)}
 </td>
 </tr>
)}
 <tr>
 <td colSpan={3} className="p-3 md:p-4 font-bold text-slate-500">إجمالي الأصناف</td>
 <td className="p-3 md:p-4 text-left font-bold text-slate-700">{Number(getOrderSubtotal(selectedOrder)).toFixed(3)}</td>
 </tr>
 <tr>
 <td colSpan={3} className="p-3 md:p-4 font-bold text-slate-500">
 رسوم التوصيل ({orderDeliveryType === 'standard' ? 'بربح' : orderDeliveryType === 'company' ? 'شركة' : orderDeliveryType === 'free' ? 'مجاني' : 'خاص'})
 </td>
 <td className="p-3 md:p-4 text-left font-bold text-slate-700">
 {Number(getOrderDeliveryFee(selectedOrder, orderDeliveryType, orderZoneId)).toFixed(3)}
 </td>
 </tr>
 <tr className="bg-indigo-600 text-white">
 <td colSpan={3} className="p-3 md:p-4 font-bold text-xs md:text-lg">المبلغ النهائي بعد الخصم</td>
 <td className="p-3 md:p-4 text-left font-bold text-base md:text-2xl">
 {Number(Math.max(0, getOrderSubtotal(selectedOrder) + getOrderDeliveryFee(selectedOrder, orderDeliveryType, orderZoneId) - ((selectedOrder as any).discount || 0))).toFixed(3)}
 <span className="text-[10px] md:text-xs mr-1 md:mr-2 opacity-60">د.ك</span>
 </td>
 </tr>
 </tfoot>
 </table>
 </div>
 </div>
 </div>

 {/* Customer General Notes */}
 {(() => {
 const o = selectedOrder as any;
 const noteValue = selectedOrder.notes || o.generalNotes || o.customerNotes || o.instruction || o.instructions || o.note || o.comments || o.customerNote || o.userNote || o.message || o.details;
 const hasGeneralNotes = typeof noteValue === 'string' ? noteValue.trim().length > 0 : !!noteValue;
 
 if (!hasGeneralNotes) return null;

 return (
 <div className="bg-indigo-50 border border-indigo-100 p-3 md:p-4 rounded-2xl md:rounded-2xl shadow-sm space-y-3 md:space-y-4">
 <div className="space-y-2 md:space-y-3">
 <h4 className="text-indigo-600 font-bold text-[10px] md:text-[11px] uppercase tracking-wider flex items-center gap-2">
 <MessageSquare size={12} className="md:w-[14px]" /> ملاحظات العميل الخاصة
 </h4>
 <p className="text-indigo-900 text-xs md:text-sm font-bold leading-relaxed italic pr-3 md:pr-4 border-r-2 border-indigo-300">
"{typeof noteValue === 'string' ? noteValue : JSON.stringify(noteValue)}"
 </p>
 </div>
 </div>
);
 })()}
 </div>

 {/* Left Column: Info & Actions */}
 <div className="space-y-6 md:space-y-8">
 {/* Status Card */}
 <div className="bg-white p-3 md:p-4 rounded-2xl md:rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/50 space-y-3 md:space-y-6">
 <div className="flex items-center justify-between">
 <h4 className="font-bold text-slate-800 text-xs md:text-base">حالة الطلب</h4>
 <div 
 className={cn(
"px-2.5 py-0.5 md:px-3 md:py-1 rounded-full text-[10px] md:text-[11px] font-bold uppercase text-white transition-all shadow-md",
 ((isPendingStatus(selectedOrder.status as string) || isFailedStatus(selectedOrder.status as string)) || (isPaidStatus(selectedOrder.status) && hasUnselectedSuppliers(selectedOrder))) ?"animate-bounce" :"",
 isFailedStatus(selectedOrder.status as string) ?"bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" :
 (String(selectedOrder.status).includes('تجميع القطية') || selectedOrder.status === 'split_pending') ? "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" :
 (isPendingStatus(selectedOrder.status as string) || isFailedStatus(selectedOrder.status as string)) ?"bg-violet-500 shadow-[0_0_15px_rgba(139,92,246,0.5)]" :
 (isPaidStatus(selectedOrder.status) && hasUnselectedSuppliers(selectedOrder) && !selectedOrder.isConvertedToInvoice) ?"bg-gradient-to-r from-rose-500 to-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.5)]" :
 isPaidStatus(selectedOrder.status) ?"bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" :"bg-slate-500"
)}>
 {getStatusLabel(selectedOrder.status, selectedOrder)}
 </div>
 </div>

 {!isReadOnly && selectedOrder.status !== 'cancelled' && (
 <div className="flex flex-col gap-2.5 md:gap-3">
 <button 
 onClick={async () => {
 const linkedInvoice = selectedOrder.linkedInvoiceId ? (data?.invoices || []).find(inv => inv.id === selectedOrder.linkedInvoiceId) : undefined;
 const paymentLink = linkedInvoice?.paymentLink || (selectedOrder as any).paymentLink || (linkedInvoice as any)?.splitLink || (linkedInvoice as any)?.split_link || (selectedOrder as any).splitLink || (selectedOrder as any).split_link || (selectedOrder as any).splitPaymentLink || (selectedOrder as any).split_payment_link || (selectedOrder as any).paymentUrl || (selectedOrder as any).payment_url || (selectedOrder as any).url || (selectedOrder as any).link;

 if (!paymentLink || paymentLink.trim() === '') {
   toast.info("سيتم إنشاء رابط دفع جديد ثم فتح واتساب...");
   await convertToInvoice(selectedOrder);
   return;
 }

 window.open(getWhatsAppLink(selectedOrder), '_blank', 'noopener,noreferrer');
 }}
 className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-indigo-600 text-white shadow-lg hover:bg-indigo-700"
 >
 <MessageSquare size={16} />
 إرسال فاتورة جديدة 💬
 </button>
 
 <MagneticButton 
  onClick={() => {
    if (isConfirmingCancel) return;
    if (!!(selectedOrder as any).paymentLink && isMarkedAsPaid) return;
    const nPaid = !isMarkedAsPaid;
    setIsMarkedAsPaid(nPaid);
    updateOrderStatus(selectedOrder.id, nPaid ? 'paid' : 'pending');
  }}
  intensity={0.2}
  disabled={!!(selectedOrder as any).paymentLink && isMarkedAsPaid}
  className={cn(
    "w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all relative z-50",
    isMarkedAsPaid 
      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
      : "bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-95",
    (!!(selectedOrder as any).paymentLink && isMarkedAsPaid) ? "cursor-not-allowed opacity-90 active:scale-100" : ""
  )}
>
  <Wallet size={16} className="md:w-[18px]" />
  {isMarkedAsPaid ? "تم الدفع وتأكيد الحجز ✅" : "تأكيد استلام المبلغ 💰"}
</MagneticButton>
 
 <button 
 onClick={() => {
 if(isConfirmingCancel) {
 updateOrderStatus(selectedOrder.id, 'cancelled');
 setIsConfirmingCancel(false);
 } else {
 setIsConfirmingCancel(true);
 setTimeout(() => setIsConfirmingCancel(false), 3000);
 }
 }}
 className={cn(
"w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-bold text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95",
 isConfirmingCancel 
 ?"bg-rose-600 text-white shadow-lg shadow-rose-600/20" 
 :"bg-white text-rose-500 border border-thin border-rose-100 hover:bg-rose-50"
)}
 >
 <XCircle size={16} className="md:w-[18px]" />
 {isConfirmingCancel ?"هل أنت متأكد من الإلغاء؟" :"إلغاء الطلب نهائياً ❌"}
 </button>
 </div>
)}
 </div>

 {/* Customer & Address Card */}
 <div className="bg-slate-900 p-3 md:p-3 rounded-2xl md:rounded-2xl shadow-xl text-white space-y-3 md:space-y-6 relative overflow-hidden">
 <div className="absolute top-0 right-0 w-12 md:w-20 md:w-32 h-12 md:h-20 md:h-32 bg-white/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
 
 <div className="relative z-10">
 <h4 className="text-white/60 font-bold text-[10px] md:text-[11px] uppercase tracking-widest mb-3 md:mb-4">بيانات العميل والتوصيل</h4>
 <div className="space-y-4 md:space-y-5">
 <div className="flex items-center gap-3 md:gap-4">
 <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-white">
 <User size={20} className="md:w-6 md:h-6" />
 </div>
 <div>
 <div className="font-bold text-base md:text-lg">{getOrderCustomerName(selectedOrder)}</div>
 <div className="text-[10px] md:text-xs text-white/50 font-bold">{selectedOrder.customerPhone || 'لا يوجد رقم هاتف'}</div>
 </div>
 </div>
 <div className="flex items-start gap-3 md:gap-4">
 <div className="w-10 h-10 md:w-12 md:h-12 bg-white/10 rounded-xl md:rounded-2xl flex items-center justify-center text-white shrink-0">
 <MapPin size={20} className="md:w-6 md:h-6" />
 </div>
 <div className="text-xs md:text-sm font-bold leading-relaxed text-white/80">
 {(() => {
 const addr = (selectedOrder as any).address;
 let addrParts = [];
 let timeStr = (selectedOrder as any).time || '';
 
 if (addr && typeof addr === 'object') {
 if (addr.region) addrParts.push(addr.region);
 if (addr.block) addrParts.push(`ق${addr.block}`);
 if (addr.street) addrParts.push(`ش${addr.street}`);
 if (addr.jaddah) addrParts.push(`ج${addr.jaddah}`);
 if (addr.building || addr.house) addrParts.push(`م${addr.building || addr.house}`);
 if (addr.floor) addrParts.push(`الدور ${addr.floor}`);
 if (addr.apartment) addrParts.push(`شقة ${addr.apartment}`);
 if (addr.time) timeStr = addr.time;
 } else {
 addrParts.push(addr || (selectedOrder as any).area || (data?.zones || []).find(z => z.id === selectedOrder.regionId)?.name || selectedOrder.regionId || 'غير محدد');
 }

 // If there's a selectedOrder.createdAt or date, show the time alongside the address
 if (!timeStr) {
 let dateObj = null;
 const ca = (selectedOrder as any).createdAt;
 if (ca) {
 if (ca.seconds) dateObj = new Date(ca.seconds * 1000);
 else dateObj = new Date(ca);
 } else if (selectedOrder.date) {
 dateObj = new Date(selectedOrder.date);
 }
 if (dateObj && !isNaN(dateObj.getTime())) {
 timeStr = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
 }
 } else {
 // If timeStr came from addr.time, append the date if possible
 let dateObj = null;
 const ca = (selectedOrder as any).createdAt;
 if (ca) {
 if (ca.seconds) dateObj = new Date(ca.seconds * 1000);
 else dateObj = new Date(ca);
 } else if (selectedOrder.date) {
 dateObj = new Date(selectedOrder.date);
 }
 if (dateObj && !isNaN(dateObj.getTime())) {
 const dateOnly = dateObj.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
 timeStr = `${dateOnly} - ${timeStr}`;
 }
 }
 
 return (
 <div className="flex flex-col gap-1.5 md:gap-2">
 <div>{addrParts.join(' - ')}</div>
 {timeStr && (
 <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-white/60 bg-white/5 py-1 px-3 rounded-lg w-fit mt-1">
 <Clock size={10} className="md:w-[12px]" />
 <span className="flex items-center gap-1">تاريخ ووقت الطلب: <span dir="ltr" className="inline-block text-left">{timeStr}</span></span>
 </div>
)}
 </div>
);
 })()}
 </div>
 </div>
 {!isReadOnly && !isPartner && (
 <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/10 space-y-2 md:space-y-3">
 <label className="text-white/50 font-bold text-[10px] md:text-[11px] uppercase block">طريقة التوصيل</label>
 <div className="grid grid-cols-2 gap-2">
 {[
 { id: 'company', label: 'توصيل شركة' },
 { id: 'standard', label: 'توصيل بربح' },
 { id: 'free', label: 'توصيل مجاني' },
 { id: 'special', label: 'توصيل خاص' }
 ].map((type) => (
 <button
 key={type.id}
 onClick={(e) => { e.preventDefault(); setOrderDeliveryType(type.id as any); }}
 className={cn(
"flex items-center justify-center gap-1.5 md:gap-2 py-2 md:py-2.5 px-2 md:px-3 rounded-lg md:rounded-xl border text-[10px] md:text-xs font-bold transition-all",
 orderDeliveryType === type.id
 ? cn(
"shadow-lg",
 type.id === 'company' ?"bg-blue-500 border-blue-500 text-white shadow-blue-500/20" :
 type.id === 'special' ?"bg-purple-500 border-purple-500 text-white shadow-purple-500/20" :
 type.id === 'free' ?"bg-amber-500 border-amber-500 text-white shadow-amber-500/20" :
"bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20"
)
 :"bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/10"
)}
 >
 {type.label}
 </button>
))}
 </div>
 </div>
)}
 </div>
 </div>
 </div>


 </div>
 </div>
 </div>

 {/* Modal Footer */}
 <div className="p-3 sm:p-3 md:p-3 border-t border-slate-100 flex flex-col sm:flex-row gap-3 sm:gap-4 bg-slate-50/50">
 {!selectedOrder.isConvertedToInvoice ? (
 <button
 onClick={() => convertToInvoice(selectedOrder)}
 disabled={isCancelledStatus(selectedOrder.status as string) || !isMarkedAsPaid || hasUnselectedSuppliers(selectedOrder)}
 className={cn(
"flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all shadow-xl shadow-primary/20",
 (isCancelledStatus(selectedOrder.status as string) || !isMarkedAsPaid || hasUnselectedSuppliers(selectedOrder))
 ?"bg-slate-300 cursor-not-allowed shadow-none" 
 :"bg-primary hover:bg-primary-dark active:scale-95"
)}
 >
 <ArrowRightLeft className="w-4 h-4 sm:w-5 sm:h-5" />
 {isCancelledStatus(selectedOrder.status as string)
 ? 'طلب ملغي'
 : !isMarkedAsPaid
 ? 'يرجى تأكيد الدفع للتحويل'
 : hasUnselectedSuppliers(selectedOrder)
 ? 'يرجى اختيار المورد للتحويل'
 : 'تحويل إلى فاتورة'}
 </button>
) : !isPartner ? (
 <button
 onClick={() => {
 if (setDeepLinkData) setDeepLinkData({ search: selectedOrder.linkedInvoiceId || selectedOrder.id });
 setCurrentPage('invoices-list');
 }}
 className="flex-1 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base text-emerald-700 bg-emerald-100 border border-emerald-200 flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all active:scale-95"
 >
 <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5" />
 مشاهدة الفاتورة
 </button>
) : null}
 {isReadOnly && selectedOrder.status !== 'cancelled' && (
 <a
 href={getWhatsAppLink(selectedOrder)}
 target="_blank"
 rel="noreferrer"
 className="px-4 sm:px-6 py-3 sm:py-4 bg-emerald-100 text-emerald-700 text-sm sm:text-base rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-200 transition-all active:scale-95 border border-emerald-200"
 >
 <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
 إرسال الفاتورة والرابط
 </a>
)}
 </div>
 </motion.div>
 </div>
)}
 </AnimatePresence>
 </section>
);
};

export default OrderPage;
