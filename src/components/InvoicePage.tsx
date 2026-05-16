
function enforceEnglishNumbers(val: string) {
  if(!val) return val;
  return String(val).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
}

import React, { useState, useEffect } from 'react';
import { 
 ShoppingCart, 
 Trash2, 
 Plus, 
 Minus, 
 Search, 
 User, 
 CreditCard,
 CheckCircle2,
 Package,
 X,
 PlusCircle,
 Truck,
 Printer,
 MessageCircle,
 AlertCircle,
 AlertTriangle,
 TrendingUp,
 History,
 Tag,
 Percent,
 MessageSquare,
 MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTing } from '../lib/sounds';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { AppState, Product, InvoiceItem, Invoice, Customer, DeliveryType, PromoCode } from '../types';
import { cn, normalizeArabic, robustNormalize } from '../lib/utils';
// import { getDeduplicatedProducts } from '../lib/deduplication';
import { NumericInput } from './ui/NumericInput';
import { MagneticButton } from './ui/MagneticButton';
import { getPublicUrl, getWebhookUrl } from '../lib/urlUtils';
import { recalculateStateBalances } from '../lib/business-logic';
import { isPaidStatus } from '../lib/status-utils';
import { toast } from 'sonner';

interface InvoicePageProps {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 editingInvoiceId?: string | null;
 onFinished?: () => void;
 isPartner?: boolean;
}

const InvoicePage: React.FC<InvoicePageProps> = React.memo(({ data, setData, editingInvoiceId, onFinished, isPartner = false }) => {
 const [selectedCustomerId, setSelectedCustomerId] = useState('');
 const [customerSearch, setCustomerSearch] = useState('');
 const [loading, setLoading] = useState(false);
 const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
 const [customerPhone, setCustomerPhone] = useState('');
 
 // Delivery Fields
 const [deliveryCompany, setDeliveryCompany] = useState('');
 const [selectedZoneId, setSelectedZoneId] = useState<string>('');
 const [deliveryCost, setDeliveryCost] = useState(0);
 const [deliveryProfit, setDeliveryProfit] = useState(0);
 const [deliveryFee, setDeliveryFee] = useState(0); // Final delivery price (cost + profit)
 const [deliveryType, setDeliveryType] = useState<DeliveryType>('company');
 const [isManualDelivery, setIsManualDelivery] = useState(false);
 const [supplierFilter, setSupplierFilter] = useState<string>('all');
 const [promoCodeInput, setPromoCodeInput] = useState('');
 const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);

 const [cart, setCart] = useState<Record<string, { quantity: number, priceAtTime: number, costAtTime: number, itemNotes?: string }>>({}); // productId: {quantity, priceAtTime, costAtTime, itemNotes}
 const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
 const [searchQuery, setSearchQuery] = useState('');

 const [lastInvoice, setLastInvoice] = useState<Invoice | null>(null);

 // Discount Fields
 const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
 const [discountValue, setDiscountValue] = useState(0);

 // Address and Notes
 const [addressDetails, setAddressDetails] = useState({
  block: '', street: '', jaddah: '', building: '', floor: '', apartment: ''
 });
 const [addressModified, setAddressModified] = useState(false);
 const [notesText, setNotesText] = useState('');
 const [isZenMode, setIsZenMode] = useState(false);

 const getWhatsAppLink = (invoice: Invoice) => {
 const customer = (data?.customers || []).find(c => c.id === invoice.customerId);
 const order = (data?.orders || []).find(o => o.linkedInvoiceId === invoice.id || o.id === (invoice as any).linkedOrderId);
 const phone = customer?.phone || (order as any)?.customerPhone || '';
 
 console.log("Debug getWhatsAppLink: invoice =", invoice,"customerPhone =", phone);
 
 // Safety check as requested
 if (!phone) {
 console.error("WhatsApp Link Error: No phone number found for invoice", invoice.id);
 return '#';
 }

 const items = (invoice?.items || []).map(item => {
 const p = (data?.products || []).find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 return `- ${p?.name || 'منتج غير معروف'} (${item.quantity || 1} × ${Number(price).toFixed(3)})`;
 }).join('\n');

 const subtotal = (invoice?.items || []).reduce((acc, item) => {
 const p = (data?.products || []).find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 return acc + (price * (item.quantity || 1));
 }, 0);
 
 const total = Math.max(0, subtotal + (Number(invoice.deliveryFee) || 0) - (Number(invoice.discount) || 0));
 const pLink = invoice.paymentLink || (invoice as any).splitLink || (invoice as any).split_link || (invoice as any).splitPaymentLink || (invoice as any).paymentUrl || (invoice as any).payment_url || (invoice as any).url || (invoice as any).link;
 const isPaidNow = isPaidStatus(invoice.paymentStatus) && !(String(invoice.status).includes('تجميع القطية') || invoice.status === 'split_pending');
 const paymentLinkLine = (pLink && pLink.trim() !== '' && !isPaidNow) ? `\nرابط الدفع: ${pLink}` : '';

 const promoLabel = invoice.appliedPromoCodeName ? `قيمة الخصم (${invoice.appliedPromoCodeName})` : 'قيمة الخصم';
 const promoLine = (Number(invoice.discount) || 0) > 0 ? `*${promoLabel}*: ${Number(invoice.discount).toFixed(3)} د.ك\n` : '';
 
 const message = `*فاتورة من شركة مطبخ التراث الكويتي*\n\nالعميل: ${customer?.name || 'عميل'}\nرقم الفاتورة: ${invoice.id}\nالعنوان: ${invoice.address && invoice.address !== 'غير محدد' ? (typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address) : (invoice.deliveryInfo?.zoneName || 'غير محدد')}\nالطلب:\n${items}\n\nالمجموع: ${subtotal.toFixed(3)} د.ك\nرسوم التوصيل: ${Number(invoice.deliveryFee || 0).toFixed(3)} د.ك\n${promoLine}إجمالي الفاتورة: ${Number(total).toFixed(3)} د.ك${paymentLinkLine}\n\nشكراً لتعاملكم معنا!`;

  let finalMessage = message;
  const targetObj = invoice || order;
  if ((targetObj as any).splitType === 'traditional' && Array.isArray((targetObj as any).splitPayments)) {
    const splitText = `\n\n*المشاركين بالقطية:*\n` + ((targetObj as any).splitPayments).map((sp:any) => `- ${sp.name || 'مشارك'} (${sp.phone||'بدون رقم'}) - ${Number(sp.amount||0).toFixed(3)} د.ك`).join('\n');
    finalMessage = message.replace('شكراً لتعاملكم', splitText + '\n\nشكراً لتعاملكم');
  } else if ((targetObj as any).splitType === 'roulette' && Array.isArray((targetObj as any).splitParticipants)) {
    const participants = ((targetObj as any).splitParticipants).map((p:any) => typeof p === 'object' ? `${p.name||''} ${p.phone?`(${p.phone})`:''}`.trim() : p).join('، ');
    const splitText = `\n\n*🎲 روليت الحظ 🎲*\nالمشاركون: ${participants}\n*بطل الليلة اللي دفعها:* ${(targetObj as any).rouletteLoser || 'غير معروف'}`;
    finalMessage = message.replace('شكراً لتعاملكم', splitText + '\n\nشكراً لتعاملكم');
  }

 return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(finalMessage)}`;
 };

 useEffect(() => {
 if (editingInvoiceId) {
 const inv = (data.invoices || []).find(i => i.id === editingInvoiceId);
 if (inv) {
 setSelectedCustomerId(inv.customerId);
 setDeliveryFee(inv.deliveryFee);
 setDeliveryType(inv.deliveryType || 'company');
 if (inv.deliveryInfo) {
 setDeliveryCompany(inv.deliveryInfo.company || '');
 const matchedZone = (data.zones || []).find(z => z.name === inv.deliveryInfo?.zoneName);
 if (matchedZone) {
 setSelectedZoneId(matchedZone.id);
 setIsManualDelivery(false);
 } else if (data.zones && data.zones.length > 0) {
 setIsManualDelivery(true);
 setDeliveryCompany(inv.deliveryInfo.zoneName || ''); // Map it if it was manual
 }
 setDeliveryCost(inv.deliveryInfo.cost || 0);
 setDeliveryProfit(inv.deliveryInfo.profit || 0);
 } else {
 // Setup defaults if old invoice, or try to guess based on customer area / fee
 let guessedZoneId = '';
 let guessedCost = 0;
 let guessedProfit = 0;
 let isManual = true;

 const cust = data.customers.find(c => c.id === inv.customerId);
 if (cust && cust.area) {
 const matchedZone = (data.zones || []).find(z => z.name === cust.area || (z.finalPrice || (z.cost + z.profit)) === inv.deliveryFee);
 if (matchedZone) {
 guessedZoneId = matchedZone.id;
 guessedCost = matchedZone.cost;
 guessedProfit = matchedZone.profit;
 isManual = false;
 }
 }
 if (!guessedZoneId) {
 const matchedByFee = (data.zones || []).find(z => (z.finalPrice || (z.cost + z.profit)) === inv.deliveryFee);
 if (matchedByFee) {
 guessedZoneId = matchedByFee.id;
 guessedCost = matchedByFee.cost;
 guessedProfit = matchedByFee.profit;
 isManual = false;
 }
 }

 setDeliveryCompany('');
 setSelectedZoneId(guessedZoneId);
 setDeliveryCost(guessedCost);
 setDeliveryProfit(guessedProfit);
 setIsManualDelivery(isManual);
 }

 const newCart: Record<string, { quantity: number, priceAtTime: number, costAtTime: number, itemNotes?: string }> = {};
 (inv.items || []).forEach(item => {
 const p = (data.products || []).find(prod => prod.id === item.productId);
 newCart[item.productId] = { 
 quantity: item.quantity || 1, 
 priceAtTime: item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0)), 
 costAtTime: item.costAtTime !== undefined ? item.costAtTime : (p?.cost || 0),
 itemNotes: item.itemNotes || ''
 };
 });
 setCart(newCart);
 setInvoiceDate(inv.date.slice(0, 10));
 setDiscountType('amount');
 setDiscountValue(inv.discount || 0);
 
 let addrStr = '';
 if (inv.address && typeof inv.address === 'object') {
 setAddressDetails({
   block: inv.address.block || '',
   street: inv.address.street || '',
   jaddah: inv.address.jaddah || '',
   building: inv.address.building || inv.address.house || '',
   floor: inv.address.floor || '',
   apartment: inv.address.apartment || ''
 });
 addrStr = `${inv.address.region || ''} ق${inv.address.block || ''} ش${inv.address.street || ''} م${inv.address.building || ''}`.trim();
 } else {
 setAddressDetails({block: '', street: '', jaddah: '', building: '', floor: '', apartment: ''});
 addrStr = inv.address || '';
 }
 setAddressModified(false);
 setNotesText(inv.notes || '');
 }
 } else {
 setSelectedCustomerId('');
 setDeliveryFee(0);
 setDeliveryType('company');
 setDeliveryCompany('');
 setSelectedZoneId('');
 setDeliveryCost(0);
 setDeliveryProfit(0);
 setIsManualDelivery(false);
 setCart({});
 setInvoiceDate(new Date().toISOString().slice(0, 10));
 setAddressDetails({block: '', street: '', jaddah: '', building: '', floor: '', apartment: ''});
 setAddressModified(false);
 setNotesText('');
 }
 }, [editingInvoiceId, data.invoices, data.zones, data.products]);

 // Handle Zone Selection
 const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
 const val = e.target.value;
 setIsManualDelivery(false);
 setSelectedZoneId(val);
 const zone = (data.zones || []).find(z => z.id === val);
 
 if (zone) {
 setDeliveryCost(zone.cost);
 const fPrice = zone.finalPrice !== undefined ? zone.finalPrice : (zone.cost + zone.profit);
 
 if (deliveryType === 'company') {
 setDeliveryProfit(0);
 setDeliveryFee(fPrice);
 } else if (deliveryType === 'free') {
 setDeliveryProfit(0);
 setDeliveryFee(0);
 } else if (deliveryType === 'special') {
 setDeliveryProfit(0);
 setDeliveryFee(fPrice);
 } else {
 setDeliveryProfit(zone.profit);
 setDeliveryFee(fPrice);
 }
 } else {
 setDeliveryCost(0);
 setDeliveryProfit(0);
 setDeliveryFee(0);
 }
 };

 // Immediate reaction to delivery type change
 useEffect(() => {
 if (isPartner) {
 setDeliveryType('company');
 }
 }, [isPartner]);

 useEffect(() => {
 if (isManualDelivery) {
 if (deliveryType === 'free') {
 setDeliveryFee(0);
 setDeliveryProfit(0);
 } else if (deliveryType === 'company' || deliveryType === 'special') {
 setDeliveryProfit(0);
 } else {
 // In standard manual mode, we assume the fee includes profit. 
 // If the user wants specific profit reporting, they'd use zones or a more complex manual entry.
 // For now, we'll keep the current cost/profit split for standard manual.
 }
 } else {
 const zone = (data.zones || []).find(z => z.id === selectedZoneId);
 if (zone) {
 setDeliveryCost(zone.cost);
 const fPrice = zone.finalPrice !== undefined ? zone.finalPrice : (zone.cost + zone.profit);
 
 if (deliveryType === 'company') {
 setDeliveryProfit(0);
 setDeliveryFee(fPrice); // Rule 2
 } else if (deliveryType === 'free') {
 setDeliveryProfit(0);
 setDeliveryFee(0); // Rule 4
 } else if (deliveryType === 'special') {
 setDeliveryProfit(0);
 setDeliveryFee(fPrice); // Rule 3: Show finalPrice to customer
 } else {
 setDeliveryProfit(zone.profit); // Rule 1: Take Profit
 setDeliveryFee(fPrice); // Rule 1: Take Final Price
 }
 }
 }
 }, [deliveryType, selectedZoneId, isManualDelivery]);

 // Recalculate Delivery Fee when Cost/Profit changes manually (Standard mode)
 useEffect(() => {
 if (deliveryType !== 'free' && deliveryType !== 'company' && deliveryType !== 'special') {
 setDeliveryFee(deliveryCost + deliveryProfit);
 }
 }, [deliveryCost, deliveryProfit, deliveryType]);

 useEffect(() => {
 if (selectedCustomerId) {
 const customer = (data.customers || []).find(c => c.id === selectedCustomerId);
 if (customer) {
 setCustomerPhone(customer.phone);
 
 // Auto-fill address if not already manually modified
 if (!addressModified) {
 // Check if the order/invoice has raw address object or inferred area
 const addressObject = (customer as any).address;
 if (addressObject && typeof addressObject === 'object') {
 setAddressDetails({
   block: addressObject.block || '',
   street: addressObject.street || '',
   jaddah: addressObject.jaddah || '',
   building: addressObject.building || addressObject.house || '',
   floor: addressObject.floor || '',
   apartment: addressObject.apartment || ''
 });
 const addrStr = `${addressObject.region || ''} ق${addressObject.block || ''} ش${addressObject.street || ''} م${addressObject.building || ''}`.trim();
 
 const matchedZone = (data.zones || []).find(z => z.name === addressObject.region);
 if (matchedZone) {
 setSelectedZoneId(matchedZone.id);
 }
 } else {
 setAddressDetails({block: '', street: '', jaddah: '', building: '', floor: '', apartment: ''});
 }
 }
 }
 } else {
 setCustomerPhone('');
 }
 }, [selectedCustomerId, data.customers, data.zones, editingInvoiceId, data.invoices]);

 const filteredProducts = React.useMemo(() => {
 // Deduplicate products by name so we don't show the same product from multiple suppliers repeatedly
 const uniqueProductsMap = new Map<string, Product>();
 data.products.forEach(p => {
 if (p.isActive !== false) {
 const normName = robustNormalize(p.name || '');
 if (!uniqueProductsMap.has(normName) || p.cost < uniqueProductsMap.get(normName)!.cost) {
 uniqueProductsMap.set(normName, p);
 }
 }
 });
 
 return Array.from(uniqueProductsMap.values()).filter(p => {
 const normalizedQuery = normalizeArabic(searchQuery);
 return (normalizeArabic(p.name || '').includes(normalizedQuery)) && 
 (supplierFilter === 'all' || p.supplierId === supplierFilter);
 }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
 }, [data.products, searchQuery, supplierFilter]);

 const addToCart = (productId: string) => {
 const product = (data.products || []).find(p => p.id === productId);
 if (!product) return;
 
 setCart(prev => {
 const existing = prev[productId];
 return { 
 ...prev, 
 [productId]: { 
 quantity: (existing ? existing.quantity : 0) + 1,
 priceAtTime: existing ? existing.priceAtTime : product.price,
 costAtTime: existing ? existing.costAtTime : product.cost
 } 
 };
 });
 };

 const removeFromCart = (productId: string) => {
 setCart(prev => {
 const existing = prev[productId];
 if (!existing) return prev;
 
 if (existing.quantity > 1) {
 return { 
 ...prev, 
 [productId]: { ...existing, quantity: existing.quantity - 1 } 
 };
 } else {
 const newCart = { ...prev };
 delete newCart[productId];
 return newCart;
 }
 });
 };

 const updateItemPrice = (productId: string, newPrice: number) => {
 setCart(prev => {
 const existing = prev[productId];
 if (!existing) return prev;
 return {
 ...prev,
 [productId]: {
 ...existing,
 priceAtTime: newPrice
 }
 };
 });
 };

 const updateItemNotes = (productId: string, notes: string) => {
 setCart(prev => {
 const existing = prev[productId];
 if (!existing) return prev;
 return {
 ...prev,
 [productId]: {
 ...existing,
 itemNotes: notes
 }
 };
 });
 };

 const deleteFromCart = (productId: string) => {
 setCart(prev => {
 const newCart = { ...prev };
 delete newCart[productId];
 return newCart;
 });
 };

 const getBestPriceInfo = (product: Product) => {
 const others = data.products.filter(p => p.name === product.name && p.id !== product.id);
 const best = others.reduce((min, cur) => (cur.cost < min.cost ? cur : min), product);
 if (best.cost < product.cost) {
 return { cost: best.cost, supplier: (data.suppliers || []).find(s => s.id === best.supplierId)?.name };
 }
 return null;
 };

 const handleApplyPromoCode = () => {
 if (!promoCodeInput.trim()) {
 setAppliedPromoCode(null);
 setDiscountValue(0);
 return;
 }
 
 const code = (data.promocodes || []).find(p => p.code.toUpperCase() === promoCodeInput.trim().toUpperCase() && p.isActive);
 
 if (code) {
 // Basic validation: date
 const now = new Date();
 const start = code.startDate ? new Date(code.startDate) : new Date(0);
 const end = code.endDate ? new Date(code.endDate) : new Date(8640000000000000);
 
 if (now < start || now > end) {
 toast.error('هذا الكوبون منتهي الصلاحية');
 setAppliedPromoCode(null);
 setDiscountValue(0);
 return;
 }
 
 const usageLimit = code.usageLimit || (code as any).maxUsage || 0;
 if (usageLimit > 0 && (code.usedCount || 0) >= usageLimit) {
 toast.error('هذا الكوبون وصل للحد الأقصى للاستخدام');
 setAppliedPromoCode(null);
 setDiscountValue(0);
 return;
 }
 
 setAppliedPromoCode(code);
 const dValue = code.discountValue !== undefined ? code.discountValue : (code as any).value || 0;
 const dType = code.discountType || (code as any).type || 'fixed';

 if (dType === 'percentage') {
 setDiscountType('percentage');
 setDiscountValue(dValue);
 } else {
 setDiscountType('amount');
 setDiscountValue(dValue);
 }
 toast.success('تم تطبيق الكوبون بنجاح');
 } else {
 toast.error('كوبون غير صالح');
 setAppliedPromoCode(null);
 setDiscountValue(0);
 }
 };

 const cartItems = Object.entries(cart).map(([id, dataItem]) => {
 const product = (data.products || []).find(p => p.id === id);
 return { 
 product, 
 qty: dataItem.quantity, 
 priceAtTime: dataItem.priceAtTime, 
 costAtTime: dataItem.costAtTime,
 itemNotes: dataItem.itemNotes 
 };
 }).filter((item): item is { product: Product; qty: number; priceAtTime: number; costAtTime: number; itemNotes: string | undefined } => !!item.product);

 const currentInvoice = editingInvoiceId ? (data.invoices || []).find(i => i.id === editingInvoiceId) : null;
 const isPaid = currentInvoice?.paymentStatus === 'paid';

 const subtotal = Math.round(cartItems.reduce((acc, item) => acc + (Number(item.priceAtTime) || 0) * (Number(item.qty) || 0), 0) * 1000) / 1000;
 const totalCost = Math.round(cartItems.reduce((acc, item) => acc + (Number(item.costAtTime) || 0) * (Number(item.qty) || 0), 0) * 1000) / 1000;
 
 const discountAmount = discountType === 'percentage' 
 ? Math.round((subtotal * (Number(discountValue) / 100)) * 1000) / 1000
 : (Number(discountValue) || 0);

 const total = Math.max(0, Math.round((subtotal + (Number(deliveryFee) || 0) - (Number(discountAmount) || 0)) * 1000) / 1000);

 // SMART INVOICE ALERT LOGIC
 const getSmartAlert = () => {
 if (cartItems.length === 0) return null;
 
 const foodProfit = subtotal - totalCost;
 const gatewayFee = data.settings.gatewayFeeAmount || 0;
 const currentTotalProfit = total - (totalCost + deliveryCost) - gatewayFee;
 
 // 1. Critical: Product sold below cost (Manual or error check)
 const hasLossItem = cartItems.some(item => item.product.price < item.product.cost);
 if (hasLossItem) return { text:"تحذير: يوجد منتج في العربة يباع بأقل من تكلفته", type: 'danger' };

 // 2. Special delivery (outside restaurant accounts)
 if (deliveryType === 'special') return { text:"هذا الطلب خارج حساب المطعم (توصيل خاص)", type: 'special' };

 // 3. No real business gain (loss or zero)
 if (currentTotalProfit <= 0) return { text:"هذا الطلب بدون ربح فعلي (تعادل أو خسارة)", type: 'danger' };

 // 4. Delivery company/fees cancelled profit
 if (foodProfit > 0 && currentTotalProfit < foodProfit * 0.4) {
 return { text:"التوصيل والرسوم ألغت جزءاً كبيراً من الربح", type: 'warning' };
 }

 // 5. Low profit margin (Strategic alert)
 const margin = total > 0 ? (currentTotalProfit / total) * 100 : 0;
 if (margin < 12) return { text:"الطلب ربحه منخفض جداً", type: 'warning' };

 return null;
 };

 const smartAlert = getSmartAlert();

 const [paymentLink, setPaymentLink] = useState<string | null>(null);

 const handleCreateInvoice = async () => {
  if (!selectedCustomerId || cartItems.length === 0) {
    toast.error('يرجى اختيار العميل وإضافة منتجات');
    return;
  }
  
  if (!selectedZoneId && !isManualDelivery) {
    toast.error("يجب اختيار منطقة أو تفعيل الإدخال اليدوي");
    return;
  }

  if (!addressDetails.block.trim() || !addressDetails.street.trim() || !addressDetails.building.trim()) {
    toast.error('يرجى تعبئة الحقول الإلزامية للعنوان (القطعة، الشارع، المنزل)');
    return;
  }

  setLoading(true);

 const gatewayFee = data.settings.gatewayFeeAmount || 0;
 const invoiceId = editingInvoiceId || `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
 
 // ... rest of the creation logic ...
 
 // Call payment API
 let createdLink = undefined;
 let createdPaymentId: string | undefined = undefined;
 const finalInvoiceAmount = subtotal - discountAmount + deliveryFee;

 if (finalInvoiceAmount > 0) {
 try {
 const response = await fetch("/api/create-payment", {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({
 amount: Number(Number(finalInvoiceAmount).toFixed(3)),
 isAdmin: true,
 customerName: (data.customers || []).find(c => c.id === selectedCustomerId)?.name || 'Customer',
 customerEmail: (data.customers || []).find(c => c.id === selectedCustomerId)?.email || 'no-email@example.com',
 customerMobile: (data.customers || []).find(c => c.id === selectedCustomerId)?.phone || '+96500000000',
 orderId: invoiceId,
 description: `Invoice ${invoiceId}`,
 returnUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
 cancelUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
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

createdPaymentId =
paymentData.paymentId ||
paymentData.payment_id ||
paymentData.session_id ||
paymentData.data?.paymentId ||
paymentData.data?.payment_id ||
paymentData.data?.id ||
paymentData.data?.transaction_id ||
paymentData.data?.session_id;

setPaymentLink(createdLink);
 } else {
 const errorMessage = paymentData.details ? JSON.stringify(paymentData.details) : (paymentData.message || paymentData.error || 'خطأ في إنشاء الرابط');
 toast.error("خطأ: " + errorMessage);
 }
 } catch (e) {
 toast.error("خطأ في الاتصال بخادم الدفع");
 }
 }
 
 // Create the optional delivery info object
 const finalDeliveryInfo = (deliveryCompany || selectedZoneId || isManualDelivery || deliveryFee > 0) ? {
 company: deliveryCompany,
 zoneName: isManualDelivery ? 'يدوي' : ((data.zones || []).find(z => z.id === selectedZoneId)?.name || 'غير معروف'),
 cost: deliveryCost,
 profit: deliveryProfit,
 finalPrice: deliveryFee
 } : undefined;

 // Updated Sales and Profit Logic per Alturath rules:
 const isStandardDelivery = deliveryType === 'standard' || (isManualDelivery && deliveryType !== 'free' && deliveryType !== 'company' && deliveryType !== 'special');
 
 const finalTotalAmount = Math.max(0, subtotal + deliveryFee - discountAmount);
 const finalInvoiceProfit = Math.max(0, (subtotal - totalCost - gatewayFee) + (isStandardDelivery ? (finalDeliveryInfo?.profit || 0) : 0) - discountAmount);

 const newInvoice: Invoice = {
 id: invoiceId,
 customerId: selectedCustomerId,
 address: {
   region: (data.zones || []).find(z => z.id === selectedZoneId)?.name || 'غير محدد',
   block: addressDetails.block,
   street: addressDetails.street,
   jaddah: addressDetails.jaddah,
   building: addressDetails.building,
   floor: addressDetails.floor,
   apartment: addressDetails.apartment
 },
 notes: notesText ||"---",
 items: cartItems.map(item => ({
 productId: item.product!.id,
 quantity: item.qty,
 priceAtTime: item.priceAtTime,
 costAtTime: item.costAtTime,
 itemNotes: item.itemNotes || ''
 })),
 deliveryFee,
 deliveryType,
 deliveryInfo: finalDeliveryInfo,
 paymentMethod: 'KNet',
 gatewayFee: gatewayFee,
 date: editingInvoiceId ? new Date(invoiceDate).toISOString() : new Date().toISOString(),
 totalAmount: finalTotalAmount,
 totalCost: totalCost,
 profit: finalInvoiceProfit,
 discount: discountAmount,
 appliedPromoCodeName: appliedPromoCode?.code,
 paymentLink: createdLink,
 paymentId: createdPaymentId,
 paymentStatus: createdLink ? 'pending' : (finalTotalAmount > 0 ? 'pending' : 'paid'),
 status: (createdLink || finalTotalAmount > 0) ? 'بانتظار الدفع' : 'مدفوعة',
 };
 
 setData(prev => {
 let updatedInvoices = [...(prev?.invoices || [])];
 
 if (editingInvoiceId) {
 updatedInvoices = updatedInvoices.map(inv => inv.id === editingInvoiceId ? newInvoice : inv);
 } else {
 updatedInvoices.push(newInvoice);
 }

 // Sync promo code usage if applicable
 let updatedPromoCodes = [...(prev?.promocodes || [])];
 if (appliedPromoCode && !editingInvoiceId) {
 updatedPromoCodes = updatedPromoCodes.map(pc => 
 pc.id === appliedPromoCode.id ? { ...pc, usedCount: (pc.usedCount || 0) + 1 } : pc
);
 }

  // Update customer address if changed or missing
  let updatedCustomers = [...(prev?.customers || [])];
  if (!editingInvoiceId && selectedCustomerId) {
    updatedCustomers = updatedCustomers.map(cust => {
      if (cust.id === selectedCustomerId) {
        const custAddr = (cust as any).address;
        const hasExistingValidAddress = custAddr && typeof custAddr === 'object' && custAddr.block && custAddr.street && custAddr.building;
        
        if (addressModified || !hasExistingValidAddress) {
          const zone = (data.zones || []).find(z => z.id === selectedZoneId);
          const regionName = (zone && !isManualDelivery) ? zone.name : (cust.area || '');
          
          return {
            ...cust,
            area: regionName,
            address: {
              region: regionName,
              block: addressDetails.block,
              street: addressDetails.street,
              jaddah: addressDetails.jaddah,
              building: addressDetails.building,
              floor: addressDetails.floor,
              apartment: addressDetails.apartment
            }
          } as any;
        }
      }
      return cust;
    });
  }

 const newState = {
 ...prev,
 invoices: updatedInvoices,
 customers: updatedCustomers,
 promocodes: updatedPromoCodes
 };

 const resultState = recalculateStateBalances(newState as AppState);
 return resultState;
 });

 setLastInvoice(newInvoice);
 if (!editingInvoiceId) {
 setCart({});
 setSelectedCustomerId('');
 setDeliveryFee(0);
 setDeliveryType('company');
 setDeliveryCompany('');
 setSelectedZoneId('');
 setDeliveryCost(0);
 setDeliveryProfit(0);
 setAddressDetails({block: '', street: '', jaddah: '', building: '', floor: '', apartment: ''});
 }
 playTing();
 toast.success('تم الحفظ بنجاح!');
 
 // Auto-open WhatsApp link for the customer
 if (newInvoice) {
   if (!newInvoice.paymentLink || newInvoice.paymentLink.trim() === '') {
     toast.warning("لم يتم إنشاء رابط الدفع بعد"); return;
   }
   const waLink = getWhatsAppLink(newInvoice);
   if (waLink && waLink !== '#') {
     window.open(waLink, '_blank', 'noopener,noreferrer');
   }
 }
 
 if (onFinished) {
 onFinished();
 }
 };

 const handlePrint = () => {
 if (!lastInvoice) return;
 const customer = (data?.customers || []).find(c => c.id === lastInvoice.customerId);
 const invoiceSubtotal = (lastInvoice?.items || []).reduce((acc, item) => {
 const p = (data?.products || []).find(prod => prod.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
 return acc + (price * (item.quantity || 1));
 }, 0);
 const invoiceDiscount = lastInvoice.discount || 0;
 
 const printWindow = window.open('', '_blank');
 if (!printWindow) return;

 const itemsHtml = (lastInvoice?.items || []).map(item => {
 const product = (data?.products || []).find(p => p.id === item.productId);
 const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (product?.price || 0));
 return `
 <tr class="item-row">
 <td>
 <div class="item-details">
 <div class="item-name">${product?.name || 'منتج غير معروف'}</div>
 ${item.itemNotes ? `<div class="item-cat" style="color:#d97706">${item.itemNotes}</div>` : ''}
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
 <title>فاتورة ${lastInvoice.id}</title>
 <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
 <style>
 @page {
 margin: 0;
 }
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
 .brand .logo svg {
 width: 32px;
 height: 32px;
 color: var(--secondary);
 }
 .brand .slogan {
 font-size: 13px;
 font-weight: 700;
 color: var(--text-muted);
 letter-spacing: 0.5px;
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
 .info-sub {
 font-family: 'JetBrains Mono', monospace;
 font-size: 14px;
 color: var(--text-muted);
 font-weight: 600;
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
 .item-details .item-cat {
 font-size: 12px;
 color: var(--text-muted);
 font-weight: 600;
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
 .footer-text {
 font-size: 14px;
 font-weight: 700;
 color: var(--text-muted);
 display: flex;
 align-items: center;
 justify-content: center;
 gap: 8px;
 }
 .footer-text svg { width: 18px; color: var(--emerald); }
 .footer-contact {
 margin-top: 8px;
 font-family: 'JetBrains Mono', monospace;
 font-size: 12px;
 color: var(--text-muted);
 }
 @media print {
 body { background: white; padding: 15mm; margin: 0; }
 .invoice-box { box-shadow: none; border-radius: 0; padding: 0; max-width: 100%; border: none; }
 .invoice-box::before { display: none; }
 }
 </style>
 </head>
 <body>
 <div class="invoice-box">
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" class="watermark" style="mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.2);" referrerPolicy="no-referrer" />
 <div class="header">
 <div class="brand">
 <h1 class="logo">
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; mix-blend-mode: multiply; filter: contrast(1.4) brightness(1.2); margin-left: 14px;" referrerPolicy="no-referrer" />
 ${data.settings.companyName || 'التراث الكويتي'}
 </h1>
 </div>
 <div class="invoice-meta">
 <h2 class="title">فاتورة</h2>
 <div class="inv-number">INV-${lastInvoice.id.slice(0,8).toUpperCase()}</div>
 </div>
 </div>

 <div class="customer-date-section">
 <div class="info-col">
 <span class="info-label">معلومات العميل</span>
 <span class="info-val">الاسم: ${customer?.name || 'عميل نقدي (Walk-in)'}</span>
 <span class="info-val">رقم الهاتف: ${customer?.phone || '---'}</span>
 ${(lastInvoice.address && lastInvoice.address !== 'غير محدد') ? `<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: ${typeof lastInvoice.address === 'object' ? [`${lastInvoice.address.region||''}`, `ق${lastInvoice.address.block||''}`, `ش${lastInvoice.address.street||''}`, `م${lastInvoice.address.building||''}`].filter(Boolean).join(' ') : lastInvoice.address}</span>` : lastInvoice.deliveryInfo?.zoneName ? `<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: ${lastInvoice.deliveryInfo.zoneName}</span>` : '<span class="info-val" style="margin-top:4px; font-size:12px;">العنوان: غير محدد</span>'}
 </div>
 <div class="info-col" style="text-align: left;">
 <span class="info-label">تاريخ الإصدار</span>
 <span class="info-val">${new Date(lastInvoice.date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
 <span class="info-val" dir="ltr" style="font-size: 11px; font-weight: normal; color: #64748b; margin-top: 4px; display: inline-block; text-align: left;">${new Date(lastInvoice.date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
 </div>
 </div>

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
 <img src="${data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO}" style="width: 70px; filter: grayscale(100%) contrast(180%) brightness(1.2); mix-blend-mode: multiply;" />
 <div style="font-size: 8px; font-weight: 900; text-align: center; border-top: 1px solid #000; margin-top: 4px; padding-top: 2px; width: 60px; color: #000;">ختم التوثيق</div>
 </div>
 <div class="summary-box">
 <div class="summary-row">
 <span class="sum-label">المجموع الفرعي</span>
 <span class="sum-val">${Number(invoiceSubtotal || 0).toFixed(3)} <span class="currency">د.ك</span></span>
 </div>
 ${lastInvoice.deliveryFee > 0 ? `
 <div class="summary-row">
 <span class="sum-label">رسوم التوصيل</span>
 <span class="sum-val">${Number(lastInvoice.deliveryFee || 0).toFixed(3)} <span class="currency">د.ك</span></span>
 </div>` : ''}
 ${invoiceDiscount > 0 ? `
 <div class="summary-row" style="color: #e11d48;">
 <span class="sum-label" style="color: #e11d48; font-weight: 800;">خصم الكوبون ${lastInvoice.appliedPromoCodeName ? `(${lastInvoice.appliedPromoCodeName})` : ''}</span>
 <span class="sum-val">-${Number(invoiceDiscount).toFixed(3)} <span class="currency">د.ك</span></span>
 </div>` : ''}
 <div class="summary-row total-row" style="background: #0f172a; color: white !important; padding: 20px; border-radius: 12px; margin-top: 15px;">
 <span class="sum-label" style="color: white !important; font-weight: 900; font-size: 18px;">المبلغ الإجمالي</span>
 <span class="sum-val" style="color: white !important; font-weight: 900; font-size: 24px;">${Number(Math.max(0, lastInvoice.totalAmount || (invoiceSubtotal + Number(lastInvoice.deliveryFee || 0) - invoiceDiscount))).toFixed(3)} <span class="currency">د.ك</span></span>
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

 return (
 <div className={cn("transition-all duration-700 ease-in-out", isZenMode ? "fixed inset-0 z-[100] bg-white overflow-y-auto p-4 md:p-12 pb-32" : "")}>{isZenMode && (<div className="flex justify-between items-center mb-8 max-w-6xl mx-auto"><h2 className="text-xl md:text-3xl font-bold text-slate-800">وضع التركيز المستمر</h2><button onClick={() => setIsZenMode(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all active:scale-95">خروج من التركيز <X size={18} /></button></div>)}<div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-3 md:p-3 pb-20", isZenMode ? "max-w-6xl mx-auto" : "")}>
 {/* Left: Product Selection */}
 <div className="lg:col-span-2 space-y-6">
 <div className="bg-white rounded-3xl p-3 md:p-3 shadow-sm border border-slate-200/60 relative overflow-hidden group">{!isZenMode && (<button onClick={() => setIsZenMode(true)} className="absolute top-4 left-4 bg-slate-50 border border-slate-200/60 text-slate-500 rounded-full p-2 opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-800 hover:text-white" title="وضع التركيز"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>)}
 <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-8">
 <h2 className="text-2xl font-bold flex items-center gap-3">
 <Package className="text-primary" />
 قائمة الطعام
 </h2>
 <div className="flex flex-col gap-3 flex-1">
 <div className="relative w-full">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
 <input 
 type="text" 
 placeholder="ابحث عن وجبة..."
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-4 focus:ring-2 focus:ring-primary/20 outline-none font-medium transition-all"
 />
 </div>
 <select 
 value={supplierFilter}
 onChange={(e) => setSupplierFilter(e.target.value)}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 transition-all font-bold text-xs text-slate-700 text-right"
 >
 <option value="all">كل الموردين</option>
 {(data?.suppliers || []).map(s => (
 <option key={s.id} value={s.id}>{s.name}</option>
))}
 </select>
 </div>
 </div>

 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3 p-1 overflow-y-auto max-h-[60dvh] lg:max-h-[750px] pr-1 sm:pr-2 custom-scrollbar">
  {filteredProducts.slice(0, 50).map(product => {
  const supplierName = (data.suppliers || []).find(s => s.id === product.supplierId)?.name || 'غير محدد';
  return (
  <motion.button
  key={product.id}
  disabled={product.isOutOfStock}
  whileHover={!product.isOutOfStock ? { y: -2, boxShadow:"0 10px 15px -3px rgb(0 0 0 / 0.1)" } : undefined}
  whileTap={!product.isOutOfStock ? { scale: 0.98 } : undefined}
  onClick={() => !product.isOutOfStock && addToCart(product.id)}
  className={cn(
    "bg-white border p-2 sm:p-3 rounded-2xl text-right transition-all group relative flex flex-col shadow-sm md:rounded-2xl",
    product.isOutOfStock 
      ? "border-rose-100 opacity-[0.8] cursor-not-allowed" 
      : "border-slate-100 hover:border-primary/50 cursor-pointer"
  )}
  >
                {/* Unified Compact Layout */}
                <div className="flex items-center justify-between gap-2 sm:gap-3 w-full relative">
                  
                    {product.isOutOfStock && (
                      <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none rounded-xl backdrop-blur-[1.5px]">
                        <span className="bg-black/60 text-white text-[10px] sm:text-[11px] font-bold px-3 py-1.5 rounded-lg shadow-md tracking-wider">
                          SOLD OUT
                        </span>
                      </div>
                    )}
                    
                    {/* Supplier Alert */}
                    <div className="z-20 absolute -top-1 sm:-top-2 right-1 sm:right-2">
                    {getBestPriceInfo(product) && (
                      <div 
                        className="relative group/radar outline-none"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <div className="bg-rose-50 text-rose-500 p-1.5 rounded-full border border-rose-100 animate-pulse cursor-pointer shadow-sm">
                          <AlertCircle size={12} className="sm:size-[14px]" />
                        </div>
                        <div className="absolute bottom-full mb-2 right-1/2 translate-x-[75%] sm:translate-x-[60%] hidden group-hover/radar:flex group-focus/radar:flex focus-within:flex flex-col bg-white text-slate-700 text-[10px] md:text-[11px] p-2 w-[110px] sm:w-[130px] rounded-xl z-[100] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] font-bold border border-slate-200/60 pointer-events-none items-center gap-1 text-center">
                          <span className="bg-rose-50 text-rose-600 px-2 py-1.5 rounded-lg leading-relaxed w-full whitespace-normal break-words">{getBestPriceInfo(product)?.supplier}</span>
                          <span className="w-full">يبيعه أرخص</span>
                          <span className="text-rose-600 bg-rose-50 px-2 py-1.5 rounded-lg leading-none w-full">{Number(getBestPriceInfo(product)?.cost || 0).toFixed(3)} د.ك</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0 pr-2 flex flex-col justify-center h-full">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-bold text-[13px] sm:text-[15px] text-slate-800 line-clamp-2 text-right leading-tight mb-1">{product.name}</h3>
                      <div className="text-[10px] text-slate-500 truncate font-bold shrink-0">{supplierName}</div>
                    </div>
                    <div className="flex items-center justify-between w-full mt-auto">
                        <div className="text-primary font-bold text-[14px] sm:text-[16px] tracking-tighter">
                          {Number(product.price || 0).toFixed(3)} <span className="text-[10px] sm:text-[10px]">د.ك</span>
                        </div>
                        <div className="bg-slate-50 text-slate-500 group-hover:bg-primary group-hover:text-white p-1.5 sm:p-2 border border-slate-100 group-hover:border-primary rounded-xl transition-all shadow-sm">
                          <Plus size={14} className="sm:size-[16px]" />
                        </div>
                    </div>
                  </div>
                  
                </div>
              </motion.button>
 );
  })}
  </div>
  </div>
  </div>

  {/* Right: Cart & Customer */}
 <div className="lg:col-span-1 space-y-6">
 <div className="bg-white rounded-3xl md:rounded-3xl p-3 md:p-3 shadow-xl border border-slate-200/60 sticky top-24">
 <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
 <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-800 p-2">
 <img 
 src={data?.settings?.companyLogo || DEFAULT_GLOBAL_LOGO} 
 className="w-full h-full object-contain" 
 alt="Logo" 
 referrerPolicy="no-referrer"
 />
 </div>
 <div>
 <h2 className="text-xl font-bold mb-1">{data.settings.companyName || 'فاتورة'}</h2>
 <p className="text-[10px] text-slate-500 font-bold uppercase">
 {cartItems.length === 1 ? '1 وجبة مختارة' : cartItems.length === 2 ? '2 وجبتان مختارتان' : cartItems.length >= 3 && cartItems.length <= 10 ? `${cartItems.length} وجبات مختارة` : `${cartItems.length} وجبة مختارة`}
 </p>
 </div>
 </div>

 {/* Customer Selection */}
 <div className="space-y-6 mb-10 w-full overflow-hidden">
 {/* Date Selection */}
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase mr-1 block">تاريخ الفاتورة</label>
 <input 
 type="date"
 value={invoiceDate}
 onChange={(e) => !isPaid && setInvoiceDate(e.target.value)}
 readOnly={isPaid}
 className={cn(
"w-full max-w-full min-w-[50px] bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-4 md:py-4 md:px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right",
 isPaid &&"opacity-60 cursor-not-allowed"
)}
 />
 </div>
 
 <div className="space-y-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase mr-1 block">العميل</label>
 <div className="relative w-full">
 <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
 <input 
 type="text"
 value={showCustomerDropdown ? customerSearch : ((data.customers || []).find(c => c.id === selectedCustomerId)?.name || '')}
 onChange={(e) => {
 if (isPaid) return;
 setCustomerSearch(e.target.value);
 setShowCustomerDropdown(true);
 }}
 onFocus={() => !isPaid && setShowCustomerDropdown(true)}
 readOnly={isPaid}
 placeholder="ابحث عن عميل بالاسم..."
 className={cn(
"w-full max-w-full min-w-[50px] bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-12 pl-4 md:py-4 md:pr-12 md:pl-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right",
 isPaid &&"opacity-60 cursor-not-allowed"
)}
 />
 
 {showCustomerDropdown && (
 <div className="absolute top-full right-0 left-0 mt-2 bg-white border border-slate-200/60 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto">
 {data.customers
 .filter(c => {
 const normalizedQuery = normalizeArabic(customerSearch);
 return normalizeArabic(c.name || '').includes(normalizedQuery) || (c.phone || '').includes(customerSearch);
 })
 .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
 .slice(0, 15) // Limit to top 15 results for performance
 .map(c => (
 <div 
 key={c.id} 
 onClick={() => {
 setSelectedCustomerId(c.id);
 setCustomerSearch('');
 setShowCustomerDropdown(false);
 }}
 className="px-5 py-3 hover:bg-slate-50 cursor-pointer font-bold text-slate-800 border-b last:border-b-0 border-slate-100 text-right"
 >
 {c.name}
 </div>
))}
 {data.customers.filter(c => {
 const normalizedQuery = normalizeArabic(customerSearch);
 return normalizeArabic(c.name || '').includes(normalizedQuery) || (c.phone || '').includes(customerSearch);
 }).length === 0 && (
 <div className="px-5 py-3 text-slate-500 text-center">لا يوجد عميل بهذا الاسم</div>
)}
 </div>
)}
 {showCustomerDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowCustomerDropdown(false)} />}
 </div>
 </div>
 
 <div className="space-y-4">
 {/* Delivery Company */}
 <div className="relative">
 <Truck className="absolute right-4 top-1/2 -translate-y-1/2 text-primary" size={16} />
 <input 
 type="text" 
 value={deliveryCompany}
 onChange={(e) => !isPaid && setDeliveryCompany(e.target.value)}
 readOnly={isPaid}
 className={cn(
"w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 pr-11 pl-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right text-sm",
 isPaid &&"opacity-60 cursor-not-allowed"
)}
 placeholder="شركة التوصيل (اختياري)"
 />
 </div>

 {/* Zone / Area Selection */}
 <div className="grid grid-cols-2 gap-3">
 {!isPartner && (
 <div className="space-y-2 mb-2 col-span-2">
 <label className="text-[10px] font-bold text-slate-500 uppercase mr-1 block text-right">طريقة التوصيل</label>
 <div className={cn("grid grid-cols-2 lg:grid-cols-4 gap-2", isPaid &&"opacity-50 pointer-events-none")}>
 {[
 { id: 'company', label: 'توصيل شركة' },
 { id: 'standard', label: 'توصيل بربح' },
 { id: 'free', label: 'توصيل مجاني' },
 { id: 'special', label: 'توصيل خاص' }
 ].map((type) => (
 <button
 key={type.id}
 disabled={isPaid}
 onClick={(e) => { e.preventDefault(); !isPaid && setDeliveryType(type.id as any); }}
 className={cn(
"flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all",
 deliveryType === type.id
 ? cn(
"shadow-md",
 type.id === 'company' ?"bg-blue-500 border-blue-500 text-white shadow-blue-500/20" :
 type.id === 'special' ?"bg-purple-500 border-purple-500 text-white shadow-purple-500/20" :
 type.id === 'free' ?"bg-amber-500 border-amber-500 text-white shadow-amber-500/20" :
"bg-emerald-500 border-emerald-500 text-white shadow-emerald-500/20"
)
 :"bg-white border-slate-200/60 text-slate-500 hover:border-primary/30"
)}
 >
 {type.label}
 </button>
))}
 </div>
 </div>
)}

 <select
 value={!isPartner ? (isManualDelivery ? 'manual' : selectedZoneId) : selectedZoneId}
 onChange={handleZoneChange}
 disabled={isPaid}
 className={cn(
"col-span-2 w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-right text-sm appearance-none",
 isPaid &&"opacity-60 cursor-not-allowed"
)}
 dir="rtl"
 >
 <option value="">-- اختر المنطقة --</option>
 {data.zones?.filter(z => z.isActive).map(z => (
 <option key={z.id} value={z.id}>{z.name}</option>
))}
 </select>

 {isManualDelivery && (
 <div className="space-y-1 col-span-2">
 <label className="text-[10px] font-bold text-slate-500 text-right block">سعر التوصيل اليدوي (د.ك)</label>
 <NumericInput 
 value={deliveryFee || ''}
 disabled={isPaid}
 onChange={(val) => {
 if (isPaid) return;
 const numVal = parseFloat(val as string) || 0;
 setDeliveryFee(numVal);
 // Maintain some default cost/profit split for backend if needed
 if (deliveryType === 'company' || deliveryType === 'special' || deliveryType === 'free') {
 setDeliveryCost(numVal);
 setDeliveryProfit(0);
 } else {
 setDeliveryCost(numVal * 0.7); 
 setDeliveryProfit(numVal * 0.3);
 }
 }}
 className="w-full bg-slate-50 border border-slate-200/60 rounded-2xl py-3 px-5 outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all font-bold text-slate-800 text-center text-sm"
 placeholder="0.000"
 />
 </div>
)}
 </div>

 <div className="flex justify-between items-center bg-slate-100 p-3 rounded-2xl border border-slate-200/60">
 <span className="font-bold text-primary text-sm">{Number(deliveryFee || 0).toFixed(3)} د.ك</span>
 <span className="text-[10px] font-bold text-slate-500">سعر التوصيل</span>
 </div>

 {/* Address */}
 <div className="space-y-3 pt-4 border-t border-slate-100">
 <label className="text-[10px] font-bold text-slate-500 mr-2 flex items-center justify-end gap-1">
 <MapPin size={10} /> تفاصيل العنوان (يتم حفظها للعميل)
 </label>
 <div className="grid grid-cols-2 gap-2">
   <input 
     type="text" 
     value={addressDetails.block}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, block: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="القطعة *"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
   <input 
     type="text" 
     value={addressDetails.street}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, street: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="الشارع *"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
 </div>
 <div className="grid grid-cols-2 gap-2">
   <input 
     type="text" 
     value={addressDetails.jaddah}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, jaddah: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="الجادة (اختياري)"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
   <input 
     type="text" 
     value={addressDetails.building}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, building: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="المنزل *"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
 </div>
 <div className="grid grid-cols-2 gap-2">
   <input 
     type="text" 
     value={addressDetails.floor}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, floor: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="الدور (اختياري)"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
   <input 
     type="text" 
     value={addressDetails.apartment}
     onChange={(e) => {setAddressModified(true); setAddressDetails(p => ({...p, apartment: e.target.value.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())}))}}
     placeholder="الشقة (اختياري)"
     className="w-full font-mono bg-white border border-slate-200/60 rounded-xl py-3 px-4 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-[13px] text-slate-800 text-right shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)]"
     dir="rtl"
   />
 </div>
 </div>
 </div>

 {/* Discount Section */}
 <div className="space-y-3 pt-4 border-t border-slate-100">
 {/* Promo Code Section */}
 <div className="pb-6 mb-4 border-b border-dashed border-slate-200/60 bg-slate-50/50 p-3 rounded-3xl space-y-3">
 <label className="text-[10px] font-bold text-slate-500 uppercase mr-1 block text-right">كوبون الخصم (Promo Code)</label>
 <div className="flex gap-2">
 <button 
 onClick={(e) => { e.preventDefault(); handleApplyPromoCode(); }}
 className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-100"
 >
 تفعيل
 </button>
 <div className="relative flex-1">
 <Tag className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={14} />
 <input 
 type="text"
 value={promoCodeInput}
 onChange={(e) => {
 setPromoCodeInput(e.target.value);
 if (!e.target.value.trim() || (appliedPromoCode && e.target.value.toUpperCase() !== appliedPromoCode.code)) {
 setAppliedPromoCode(null);
 setDiscountValue(0);
 }
 }}
 placeholder="أدخل الكود هنا..."
 className="w-full bg-white border border-slate-200/60 rounded-xl py-2.5 pr-9 pl-3 text-right text-xs font-bold outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary transition-all shadow-sm"
 />
 </div>
 </div>
 {appliedPromoCode && (
 <div className="flex justify-between items-center bg-emerald-50 text-emerald-700 px-4 py-2 border border-emerald-100 rounded-xl">
 <button 
 onClick={(e) => { e.preventDefault(); setAppliedPromoCode(null); setPromoCodeInput(''); setDiscountValue(0); }} 
 className="w-6 h-6 flex items-center justify-center bg-white rounded-full text-emerald-600 hover:text-rose-500 shadow-sm transition-colors"
 >
 <X size={12} />
 </button>
 <div className="flex items-center gap-2">
 <span className="text-[11px] font-bold">كود مفعّل: {appliedPromoCode.code}</span>
 <CheckCircle2 size={12} className="text-emerald-500" />
 </div>
 </div>
)}
 </div>

 <label className="text-[10px] font-bold text-slate-500 uppercase mr-1 block flex items-center justify-end gap-2">
 خصم إضافي (اختياري)
 <Tag size={10} className="text-rose-400" />
 </label>
 
 <div className="flex items-center bg-slate-50 border border-slate-200/60 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-rose-500/5 focus-within:border-rose-500 transition-all p-1">
 <div className="flex bg-slate-200/50 rounded-xl p-1 shadow-inner shrink-0">
 <button 
 onClick={() => setDiscountType('amount')}
 className={cn(
"px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
 discountType === 'amount' ?"bg-white text-rose-600 shadow-sm" :"text-slate-500"
)}
 >
 د.ك
 </button>
 <button 
 onClick={() => setDiscountType('percentage')}
 className={cn(
"px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
 discountType === 'percentage' ?"bg-white text-rose-600 shadow-sm" :"text-slate-500"
)}
 >
 %
 </button>
 </div>
 <NumericInput 
 value={discountValue || ''}
 onChange={(val) => setDiscountValue(parseFloat(val as string) || 0)}
 className="flex-1 bg-transparent py-2.5 px-4 outline-none font-bold text-rose-600 text-left text-sm"
 placeholder="0.000"
 />
 </div>
 </div>
 </div>

 {/* Cart Items List */}
 <div className="space-y-4 mb-10 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
 {cartItems.map(item => (
 <div key={item.product!.id} className="flex flex-col p-3 gap-3 bg-white rounded-2xl border border-slate-100 shadow-sm relative">
 {/* Delete button (Optional, but good UX if they want to remove entirely, though minus works) */}
 {!isPaid && (
 <button 
 onClick={() => deleteFromCart(item.product!.id)} 
 className="absolute top-3 left-3 text-slate-300 hover:text-rose-500 transition-colors"
 >
 <X size={16} />
 </button>
)}

 <div className="font-extrabold text-[#4a3f35] text-base md:text-lg text-right leading-snug whitespace-normal break-words pl-8">
 {item.product!.name}
 {item.priceAtTime < item.product!.price && (
 <span className="mr-2 text-[10px] font-bold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full align-middle">خصم</span>
)}
 </div>
 
 <div className="flex items-center justify-between mt-1">
 {!isPaid && (
 <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl p-1 shrink-0">
 <button onClick={() => removeFromCart(item.product!.id)} className="p-1 hover:bg-white text-slate-500 rounded-lg transition-colors"><Minus size={14} /></button>
 <span className="w-8 text-center font-bold text-sm text-slate-900">{item.qty}</span>
 <button onClick={() => addToCart(item.product!.id)} className="p-1 hover:bg-white text-slate-500 rounded-lg transition-colors"><Plus size={14} /></button>
 </div>
)}
 {isPaid && (
 <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-1.5 shrink-0">
 <span className="font-bold text-sm text-emerald-700">{item.qty} قطعة</span>
 </div>
)}
 
 <div className="flex flex-col items-end gap-1">
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-slate-500 font-bold">سعر الحبة:</span>
 <input 
 type="number" 
 step="0.001"
 className="w-10 md:w-12 text-left bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/50 transition-all"
 value={item.priceAtTime === 0 ? '' : Number(item.priceAtTime).toString()} 
 onChange={(e) => updateItemPrice(item.product!.id, parseFloat(e.target.value) || 0)}
 placeholder="السعر"
 />
 </div>
 <div className="font-bold text-primary text-sm text-left shrink-0">
 {Number((item.qty * item.priceAtTime) || 0).toFixed(3)} د.ك
 </div>
 </div>
 </div>
 </div>
))}
 {cartItems.length === 0 && (
 <div className="text-center py-6 md:py-12 text-slate-300">
 <ShoppingCart size={48} className="mx-auto mb-4 opacity-10" />
 <p className="text-sm font-bold uppercase">العربة فارغة حالياً</p>
 </div>
)}
 </div>

 {/* SMART INVOICE ALERTS */}
 {smartAlert && (
 <motion.div 
 initial={{ opacity: 0, y: 10, scale: 0.95 }}
 animate={{ opacity: 1, y: 0, scale: 1 }}
 className={cn(
"mb-6 p-3 rounded-2xl border-2 flex items-center gap-3 transition-all",
 smartAlert.type === 'danger' ?"bg-rose-50 border-rose-100 text-rose-600" :
 smartAlert.type === 'special' ?"bg-purple-50 border-purple-100 text-purple-600" :
"bg-amber-50 border-amber-100 text-amber-600"
)}
 >
 <div className={cn(
"w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
 smartAlert.type === 'danger' ?"bg-rose-100" :
 smartAlert.type === 'special' ?"bg-purple-100" :
"bg-amber-100"
)}>
 <AlertTriangle size={18} />
 </div>
 <span className="text-[11px] font-bold leading-tight">{smartAlert.text}</span>
 </motion.div>
)}

 {/* Totals Summary */}
 <div className="space-y-4 mb-10 pt-6 border-t border-slate-100">
 <div className="flex justify-between items-center px-2">
 <span className="text-[10px] font-bold text-slate-500 uppercase">المجموع الفرعي</span>
 <span className="font-bold text-slate-600">{Number(subtotal || 0).toFixed(3)} د.ك</span>
 </div>
 <div className="flex justify-between items-center px-2">
 <span className="text-[10px] font-bold text-slate-500 uppercase">رسوم التوصيل</span>
 <span className="font-bold text-slate-600">{Number(deliveryFee || 0).toFixed(3)} د.ك</span>
 </div>
 {discountAmount > 0 && (
 <div className="flex justify-between items-center px-2">
 <span className="text-[10px] font-bold text-rose-500 uppercase flex items-center gap-1">
 <Tag size={10} />
 كوبون: {appliedPromoCode?.code || 'خصم مباشر'}
 </span>
 <span className="font-bold text-rose-600">-{Number(discountAmount || 0).toFixed(3)} د.ك</span>
 </div>
)}
 <div className="flex justify-between items-center p-3 md:p-3 bg-primary/5 rounded-2xl border border-primary/10">
 <div>
 <span className="text-xl font-bold text-slate-800 tracking-tight">الإجمالي</span>
 <div className="text-[10px] text-blue-600 font-bold mt-1">طريقة الدفع: Knet</div>
 </div>
 <div className="text-xl md:text-3xl font-bold text-primary tracking-tighter">
 {Number(total || 0).toFixed(3)} <span className="text-xs">د.ك</span>
 </div>
 </div>
 </div>

 <MagneticButton 
 disabled={!selectedCustomerId || cartItems.length === 0 || isPaid}
 onClick={handleCreateInvoice}
 intensity={0.15}
 className={cn(
"w-full py-5 rounded-2xl font-bold shadow-xl transition-all active:scale-[0.97] flex items-center justify-center gap-3 text-lg relative z-50",
 !selectedCustomerId || cartItems.length === 0 || isPaid
 ?"bg-slate-100 text-slate-500 cursor-not-allowed shadow-none"
 :"bg-primary text-white shadow-primary/30 hover:bg-primary-dark"
)}
 >
 <span>{isPaid ? 'الفاتورة مدفوعة ولا يمكن تعديلها ✅' : editingInvoiceId ? 'تعديل الفاتورة' : 'اعتماد وإصدار الفاتورة'}</span>
 <CheckCircle2 size={24} />
 </MagneticButton>
 </div>
 </div>
 </div>
 </div>
 );
});

export default InvoicePage;
