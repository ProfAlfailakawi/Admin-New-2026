
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
 MapPin,
 Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { playTing } from '../lib/sounds';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { AppState, Product, InvoiceItem, Invoice, Customer, DeliveryType, PromoCode } from '../types';
import { cn, normalizeArabic, robustNormalize } from '../lib/utils';
import { 
    computeInvoiceTotal, 
    computeInvoiceCost, 
    computeInvoiceProfit, 
    computeInvoiceAddonsTotal,
    computeInvoiceItemBasePrice,
    computeInvoiceItemTotal,
    computeInvoiceSubtotal,
    computeAddonQuantity,
    computeAddonRevenue
} from '../lib/invoice-calculations';
import { NumericInput } from './ui/NumericInput';
import { MagneticButton } from './ui/MagneticButton';
import { getPublicUrl, getWebhookUrl } from '../lib/urlUtils';
import { recalculateStateBalances, generateNextInvoiceId } from '../lib/business-logic';
import { isPaidStatus } from '../lib/status-utils';
import { buildInvoiceWhatsappMessage } from '../lib/whatsappInvoice';
import { toast } from 'sonner';

/**
 * Merges a YYYY-MM-DD date string with the current time to avoid 00:00:00 issues.
 */
function mergeDateWithCurrentTime(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  const fullDate = new Date();
  
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  if (year && month && day) {
    fullDate.setFullYear(year, month - 1, day);
  }
  
  return fullDate.toISOString();
}

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
 const [isNewCustomer, setIsNewCustomer] = useState(false);
 const [newCustomerName, setNewCustomerName] = useState('');
 const [loading, setLoading] = useState(false);
 const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
 const [customerPhone, setCustomerPhone] = useState('');
 
 // Delivery Fields
 const [deliveryCompany, setDeliveryCompany] = useState('');
 const [selectedZoneId, setSelectedZoneId] = useState<string>('');
 const [deliveryCost, setDeliveryCost] = useState(0);
 const [deliveryProfit, setDeliveryProfit] = useState(0);
 const [deliveryFee, setDeliveryFee] = useState(0); 
 const [deliveryType, setDeliveryType] = useState<DeliveryType>('company');
 const [isManualDelivery, setIsManualDelivery] = useState(false);
 const [supplierFilter, setSupplierFilter] = useState<string>('all');
 const [promoCodeInput, setPromoCodeInput] = useState('');
 const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);

 const [cart, setCart] = useState<Record<string, { quantity: number, priceAtTime: number, costAtTime: number, itemNotes?: string, addons?: any[] }>>({}); 
 const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
   const getBestPriceInfo = (product: Product) => {
    const others = (data?.products || []).filter(
      (p) => p.name === product.name && p.id !== product.id,
    );
    const best = others.reduce(
      (min, cur) => (cur.cost < min.cost ? cur : min),
      product,
    );
    if (best.cost < product.cost) {
      return {
        cost: best.cost,
        supplier: (data?.suppliers || []).find((s) => s.id === best.supplierId)
          ?.name,
      };
    }
    return null;
  };

  const [searchQuery, setSearchQuery] = useState('');

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
  
  if (!phone) return '#';

  const processedFixedAddons = new Set<string>();

  const items = (invoice?.items || []).map(item => {
    const p = (data?.products || []).find(prod => prod.id === item.productId);
    const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
    let displayPrice = Number(price);
    let addonsLines: string[] = [];

    if (item.addons && item.addons.length > 0) {
      item.addons.forEach((addon: any) => {
        const addonQty = computeAddonQuantity(addon, item);

        if (addonQty > 0) {
          let isDuplicateFixed = false;
          if (addon.calculationType === 'fixed') {
            const key = `${addon.id}-${addon.name}`;
            if (!processedFixedAddons.has(key)) {
               processedFixedAddons.add(key);
            } else {
               isDuplicateFixed = true;
            }
          }

          const mult = Number(addon.quantity || 1);

          if (!isDuplicateFixed) {
            if (addon.isHiddenPrice) {
              const rowTotal = computeAddonRevenue(addon, item);
              displayPrice += (rowTotal / Math.max(1, item.quantity || 1)); 
              addonsLines.push(`   • ${addon.name}${mult > 1 ? ` × ${mult}` : ''}`);
            } else {
               const rowTotal = computeAddonRevenue(addon, item);
               if (rowTotal > 0) {
                 addonsLines.push(`   • ${addon.name}${mult > 1 ? ` × ${mult}` : ''} = ${rowTotal.toFixed(3)} د.ك`);
               } else {
                 addonsLines.push(`   • ${addon.name}${mult > 1 ? ` × ${mult}` : ''} = مجاناً`);
               }
            }
          }
        }
      });
    }

    return `${p?.name || 'منتج غير معروف'}\n   الكمية: ${item.quantity || 1}\n   السعر الفردي: ${Number(displayPrice).toFixed(3)} د.ك\n   إجمالي المنتج: ${(Number(displayPrice) * Number(item.quantity || 1)).toFixed(3)} د.ك${addonsLines.length > 0 ? '\n\n   الإضافات:\n' + addonsLines.join('\n') : ''}`;
  }).join('\n');

  const subtotal = computeInvoiceSubtotal(invoice, data.products);
  const addonsTotalWA = computeInvoiceAddonsTotal(invoice);
  const totalAmountVal = computeInvoiceTotal(invoice, data.products);

  const pLink = invoice.paymentLink || 
                (invoice as any).paymentUrl || 
                (invoice as any).url || 
                (invoice as any).link || 
                (invoice as any).splitLink || 
                (invoice as any).split_link ||
                (invoice as any).split_url ||
                (order as any)?.paymentLink ||
                (order as any)?.splitLink ||
                (order as any)?.split_link;

  const isPaidNow = isPaidStatus(invoice.paymentStatus);
  const paymentLinkLine = (pLink && pLink.trim() !== '' && !isPaidNow) ? `\nرابط الدفع: ${pLink}` : '';

  const promoLabel = invoice.appliedPromoCodeName ? `قيمة الخصم (${invoice.appliedPromoCodeName})` : 'قيمة الخصم';
  const promoLine = (Number(invoice.discount) || 0) > 0 ? `*${promoLabel}*: ${Number(invoice.discount).toFixed(3)} د.ك\n` : '';
  
  const message = `*فاتورة من شركة مطبخ التراث الكويتي*\n\nالعميل: ${customer?.name || 'عميل'}\nرقم الفاتورة: ${invoice.id}\nالعنوان: ${invoice.address && invoice.address !== 'غير محدد' ? (typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address) : (invoice.deliveryInfo?.zoneName || 'غير محدد')}\nالطلب:\n${items}\n\nالمجموع: ${subtotal.toFixed(3)} د.ك\nرسوم التوصيل: ${Number(invoice.deliveryFee || 0).toFixed(3)} د.ك\n${promoLine}إجمالي الفاتورة: ${Number(totalAmountVal).toFixed(3)} د.ك${paymentLinkLine}\n\nشكراً لتعاملكم معنا!`;

  return `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
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
    } else {
      setIsManualDelivery(true);
      setDeliveryCompany(inv.deliveryInfo.zoneName || '');
    }
    setDeliveryCost(inv.deliveryInfo.cost || 0);
    setDeliveryProfit(inv.deliveryInfo.profit || 0);
  }
  const newCart: Record<string, { quantity: number, priceAtTime: number, costAtTime: number, itemNotes?: string, addons?: any[] }> = {};
  (inv.items || []).forEach(item => {
    const p = (data.products || []).find(prod => prod.id === item.productId);
    newCart[item.productId] = { 
    quantity: item.quantity || 1, 
    priceAtTime: item.priceAtTime !== undefined ? item.priceAtTime : (p?.price || 0), 
    costAtTime: item.costAtTime !== undefined ? item.costAtTime : (p?.cost || 0),
    itemNotes: item.itemNotes || '', addons: (item as any).addons || [] };
  });
  setCart(newCart);
  setInvoiceDate(inv.date.slice(0, 10));
  setDiscountValue(inv.discount || 0);
  
  if (inv.address && typeof inv.address === 'object') {
    setAddressDetails({
      block: inv.address.block || '',
      street: inv.address.street || '',
      jaddah: inv.address.jaddah || '',
      building: inv.address.building || '',
      floor: inv.address.floor || '',
      apartment: inv.address.apartment || ''
    });
  }
  setNotesText(inv.notes || '');
  }
  }
 }, [editingInvoiceId]);

 const handleZoneChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
  const val = e.target.value;
  setIsManualDelivery(false);
  setSelectedZoneId(val);
  const zone = (data.zones || []).find(z => z.id === val);
  
  if (zone) {
    setDeliveryCost(zone.cost);
    const fPrice = zone.finalPrice !== undefined ? zone.finalPrice : (zone.cost + zone.profit);
    setDeliveryFee(deliveryType === 'free' ? 0 : fPrice);
  }
 };

 useEffect(() => {
  const zone = (data.zones || []).find(z => z.id === selectedZoneId);
  if (zone) {
    const fPrice = zone.finalPrice !== undefined ? zone.finalPrice : (zone.cost + zone.profit);
    setDeliveryFee(deliveryType === 'free' ? 0 : fPrice);
  }
 }, [deliveryType]);

 useEffect(() => {
  if (selectedCustomerId) {
    const customer = (data.customers || []).find(c => c.id === selectedCustomerId);
    if (customer && !addressModified) {
      setCustomerPhone(customer.phone);
      if (customer.address && typeof customer.address === 'object') {
        const addr = customer.address as any;
        setAddressDetails({
          block: addr.block || '',
          street: addr.street || '',
          jaddah: addr.jaddah || '',
          building: addr.building || '',
          floor: addr.floor || '',
          apartment: addr.apartment || ''
        });
        const matchedZone = (data.zones || []).find(z => z.name === addr.region);
        if (matchedZone) setSelectedZoneId(matchedZone.id);
      }
    }
  }
 }, [selectedCustomerId]);

 const filteredProducts = React.useMemo(() => {
  const uniqueProductsMap = new Map<string, Product>();
  data.products.forEach(p => {
    if (p.isActive !== false) {
      const normName = robustNormalize(p.name || '');
      if (!uniqueProductsMap.has(normName)) uniqueProductsMap.set(normName, p);
    }
  });
  return Array.from(uniqueProductsMap.values()).filter(p => {
    return normalizeArabic(p.name || '').includes(normalizeArabic(searchQuery)) && 
    (supplierFilter === 'all' || p.supplierId === supplierFilter);
  }).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
 }, [data.products, searchQuery, supplierFilter]);

 const addToCart = (productId: string) => {
  const product = (data.products || []).find(p => p.id === productId);
  if (!product) return;
  toast.success(`تم إضافة ${product.name} للسلة`);
  setCart(prev => {
    const existing = prev[productId];
    return { 
    ...prev, 
    [productId]: { 
    quantity: (existing ? existing.quantity : 0) + 1,
    priceAtTime: product.price,
    costAtTime: product.cost,
    addons: existing ? existing.addons : (product.addons || []).map(a => ({...a, quantity: a.isRequired ? Math.max(1, a.minQuantity || 1) : 0}))
    } 
    };
  });
 };

 const removeFromCart = (productId: string) => {
  setCart(prev => {
  const existing = prev[productId];
  if (!existing) return prev;
  if (existing.quantity > 1) {
    return { ...prev, [productId]: { ...existing, quantity: existing.quantity - 1 } };
  } else {
    toast.info("الحد الأدنى للكمية هو 1. استخدم علامة (X) لحذف المنتج نهائياً.");
    return prev;
  }
  });
 };

 const deleteFromCart = (productId: string) => {
  setCart(prev => {
  const newCart = { ...prev };
  delete newCart[productId];
  return newCart;
  });
 };

  const updateAddonQuantity = (productId: string, addonId: string, delta: number) => {
   setCart(prev => {
     const item = prev[productId];
     if (!item?.addons) return prev;
     const newAddons = item.addons.map(a => {
       if (a.id === addonId) {
         const cur = a.quantity || 0;
         const min = a.isRequired ? Math.max(1, a.minQuantity || 1) : (a.minQuantity || 0);
         const max = a.maxQuantity || 999;
         const next = Math.max(min, Math.min(max, cur + delta));
         return { ...a, quantity: next };
       }
       return a;
     });
     return { ...prev, [productId]: { ...item, addons: newAddons } };
   });
  };

 const cartItems = Object.entries(cart).map(([id, dataItem]) => {
  const product = (data.products || []).find(p => p.id === id);
  return { product, qty: dataItem.quantity, priceAtTime: dataItem.priceAtTime, costAtTime: dataItem.costAtTime, itemNotes: dataItem.itemNotes, addons: dataItem.addons || [] };
 }).filter(it => it.product);

 const mockInv = {
    items: cartItems.map(it => ({ productId: it.product!.id, quantity: it.qty, priceAtTime: it.priceAtTime, costAtTime: it.costAtTime, addons: it.addons })),
    deliveryFee, discount: discountValue, gatewayFee: data.settings.gatewayFeeAmount || 0
  };

  const subtotal = computeInvoiceSubtotal(mockInv, data.products);
  const discountAmount = discountType === 'percentage' ? (subtotal * (discountValue / 100)) : discountValue;
  const totalValue = Math.max(0, subtotal + deliveryFee - discountAmount);

  const handleCreateInvoice = async () => {
  let targetId = selectedCustomerId;
  
  if (isNewCustomer) {
    if (!newCustomerName || !customerPhone) return toast.error('يرجى إدخال اسم ورقم الهاتف للعميل الجديد');
    targetId = `cust-${Date.now()}`;
    const newCust: Customer = {
      id: targetId,
      name: newCustomerName,
      phone: customerPhone,
      status: 'active',
      totalOrders: 0,
      totalSpent: 0
    };
    setData(prev => ({ ...prev, customers: [...prev.customers, newCust] }));
  }

  if (!targetId || cartItems.length === 0) return toast.error('بيانات ناقصة (اختر عميل ومنتجات)');
  if (!addressDetails.block || !addressDetails.street || !addressDetails.building) return toast.error('يرجى إكمال تفاصيل العنوان');

  setLoading(true);
  const invoiceId = editingInvoiceId || generateNextInvoiceId(data.invoices);
  const zone = (data.zones || []).find(z => z.id === selectedZoneId);
  const regionName = zone ? zone.name : 'غير محدد';
  const customer = (data.customers || []).find(c => c.id === targetId);

  // PRE-CREATE PAYMENT LINK
  let createdLink = '';
  let createdPaymentId = '';
  try {
    const response = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(totalValue.toFixed(3)),
          isAdmin: true,
          customerName: customer?.name || newCustomerName || 'Customer',
          customerEmail: customer?.email || 'no-email@example.com',
          customerMobile: customer?.phone || customerPhone || '+96500000000',
          orderId: invoiceId,
          description: `Invoice ${invoiceId}`,
          returnUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
          cancelUrl: `https://alturathkw.shop/api/payment-return/${invoiceId}`,
          notificationUrl: `https://admin.alturathkw.shop/api/webhook/upayments`
        })
      });
      const paymentData = await response.json();
      if (response.ok) {
        createdLink = paymentData.paymentLink || paymentData.payment_url || paymentData.paymentUrl || paymentData.url || paymentData.link || paymentData.data?.paymentLink || paymentData.data?.payment_url || paymentData.data?.paymentUrl || paymentData.data?.url || paymentData.data?.link || "";
        createdPaymentId = paymentData.paymentId || paymentData.payment_id || paymentData.session_id || paymentData.data?.paymentId || paymentData.data?.payment_id || paymentData.data?.session_id || "";
      } else {
        console.warn("Payment creation slightly failed, continuing without link:", paymentData.message);
      }
  } catch (err) {
    console.error("Payment API Error:", err);
  }

  const newInvoice: Invoice = {
    id: invoiceId,
    customerId: targetId,
    address: { region: regionName, ...addressDetails },
    items: cartItems.map(it => ({ ...it, productId: it.product!.id, quantity: it.qty })),
    deliveryFee,
    deliveryType,
    date: editingInvoiceId ? (data.invoices.find(i => i.id === editingInvoiceId)?.date || new Date().toISOString()) : mergeDateWithCurrentTime(invoiceDate),
    totalAmount: totalValue,
    totalCost: computeInvoiceCost(mockInv, data.products),
    profit: computeInvoiceProfit(mockInv, data.products),
    discount: discountAmount,
    status: 'بانتظار الدفع',
    paymentStatus: 'pending',
    paymentMethod: 'KNet',
    paymentLink: createdLink,
    paymentId: createdPaymentId,
    gatewayFee: data.settings.gatewayFeeAmount || 0,
    notes: notesText || "---"
  };

  setData(prev => ({
    ...prev,
    invoices: editingInvoiceId ? prev.invoices.map(i => i.id === editingInvoiceId ? newInvoice : i) : [...prev.invoices, newInvoice],
    customers: prev.customers.map(c => c.id === targetId ? { ...c, area: regionName, address: { region: regionName, ...addressDetails } } : c)
  }));

  // Safe notification nudge for new admin invoices (INV-...).
  // This uses the existing push endpoint and does not change notification delivery logic.
  if (!editingInvoiceId && String(invoiceId).startsWith('INV-')) {
    fetch('/api/push/order-created-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: invoiceId,
        orderNumber: invoiceId,
        total: Number(totalValue.toFixed(3)),
        source: 'admin_invoice'
      })
    }).catch((err) => console.warn('Invoice push alert nudge failed:', err));
  }

  setCart({});
  setLoading(false);

  toast.success('تم الحفظ وإرسال الفاتورة');
  
  const waLink = getWhatsAppLink(newInvoice);
  if (waLink && waLink !== '#') {
    if (!createdLink) {
        toast.warning("تنبيه: لم يتم إنشاء رابط الدفع بعد، سيتم إرسال الفاتورة بدونه.");
    }
    window.open(waLink, '_blank');
  }

  if (onFinished) onFinished();
 };

 return (
  <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50 min-h-screen">
    {/* Product Selection */}
    <div className="lg:col-span-2 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input type="text" placeholder="ابحث عن وجبة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full bg-slate-50 border rounded-2xl py-3 pr-11 pl-4 outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="bg-slate-50 border rounded-2xl px-4 py-3 outline-none font-bold text-xs">
            <option value="all">كل الموردين</option>
            {data.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto max-h-[70vh] pr-2">
          {filteredProducts.map(p => (
            <button key={p.id} onClick={() => addToCart(p.id)} className="bg-white border p-4 rounded-2xl text-right hover:border-primary transition-all group flex flex-col gap-2 relative">
              {p.isOutOfStock && (
                <div className="absolute top-2 left-2 text-rose-500 z-10 flex items-center gap-1 bg-white/80 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-rose-100 shadow-sm">
                   <AlertCircle size={14} />
                   <span className="text-[10px] font-bold">نفد</span>
                </div>
              )}
              {(() => {
                  const bestPrice = getBestPriceInfo(p);
                  if (bestPrice) {
                    return (
                        <div className="absolute bottom-2 left-2 text-amber-500 z-10 p-1 group/cheaper">
                            <AlertTriangle size={16} className="animate-pulse" />
                            <div className="absolute bottom-full left-0 mb-1 bg-white border rounded-lg p-2 text-[8px] sm:text-[10px] shadow-xl hidden group-hover/cheaper:block w-32 font-bold z-50">
                                تنبيه: {bestPrice.supplier} يوفره بسعر {bestPrice.cost.toFixed(3)} د.ك
                            </div>
                        </div>
                    );
                  }
                  return null;
              })()}
              <h3 className={cn("font-bold text-slate-800", p.isOutOfStock && "opacity-50")}>{p.name}</h3>
              <div className="flex justify-between items-center mt-auto">
                <span className="text-primary font-bold">{p.price.toFixed(3)} د.ك</span>
                <Plus size={16} className="text-slate-300 group-hover:text-primary" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>

    {/* Cart Sidebar */}
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 sticky top-6">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">السلة <ShoppingCart size={20} className="text-primary" /></h2>
        
        <div className="space-y-4 mb-6">
          <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-4 text-right font-bold" />
          
          <div className="relative">
            <input 
              type="text" 
              value={customerSearch} 
              onChange={e => {
                setCustomerSearch(e.target.value); 
                setShowCustomerDropdown(true);
              }} 
              onFocus={() => setShowCustomerDropdown(true)} 
              placeholder="ابحث بالاسم أو الهاتف..." 
              className="w-full bg-slate-50 border rounded-2xl p-4 pr-11 text-right font-bold focus:ring-2 focus:ring-primary/20 transition-all" 
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            
            {showCustomerDropdown && (
              <div className="absolute top-full right-0 left-0 bg-white border rounded-2xl mt-1 shadow-2xl z-50 max-h-60 overflow-y-auto">
                {customerSearch.length > 0 && !data.customers.some(c => c.phone === customerSearch || c.name === customerSearch) && (
                  <div 
                    onClick={() => {
                      setIsNewCustomer(true);
                      setNewCustomerName(customerSearch);
                      setCustomerPhone(customerSearch.replace(/[^0-9]/g, ''));
                      setShowCustomerDropdown(false);
                      toast.info("تم اختيار إنشاء عميل جديد");
                    }}
                    className="p-4 hover:bg-primary/5 cursor-pointer text-right border-b border-slate-100 flex items-center justify-between group"
                  >
                    <PlusCircle size={16} className="text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-primary">إضافة عميل جديد: {customerSearch}</span>
                      <span className="text-[10px] text-slate-400">سيتم حفظ البيانات عند إصدار الفاتورة</span>
                    </div>
                  </div>
                )}
                {data.customers
                  .filter(c => 
                    normalizeArabic(c.name).includes(normalizeArabic(customerSearch)) || 
                    c.phone.includes(customerSearch)
                  )
                  .slice(0, 10)
                  .map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => {
                        setSelectedCustomerId(c.id); 
                        setCustomerSearch(c.name); 
                        setIsNewCustomer(false);
                        setShowCustomerDropdown(false);
                        toast.success(`تم اختيار ${c.name}`);
                      }} 
                      className="p-4 hover:bg-slate-50 cursor-pointer text-right border-b border-slate-100 font-bold flex flex-col"
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-slate-400">{c.phone}</span>
                    </div>
                ))}
              </div>
            )}
          </div>

          {isNewCustomer && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/5 p-4 rounded-2xl border border-primary/20 space-y-3">
              <div className="text-[10px] font-bold text-primary uppercase">بيانات العميل الجديد</div>
              <input 
                value={newCustomerName} 
                onChange={e => setNewCustomerName(e.target.value)} 
                placeholder="اسم العميل" 
                className="w-full bg-white border rounded-xl p-2 text-right text-sm" 
              />
              <input 
                value={customerPhone} 
                onChange={e => setCustomerPhone(e.target.value)} 
                placeholder="رقم الهاتف" 
                className="w-full bg-white border rounded-xl p-2 text-right text-sm" 
              />
            </motion.div>
          )}

          <select value={selectedZoneId} onChange={handleZoneChange} className="w-full bg-slate-50 border rounded-2xl p-4 text-right font-bold appearance-none">
            <option value="">-- اختر المنطقة --</option>
            {data.zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>

          <div className="grid grid-cols-2 gap-2">
            <input value={addressDetails.block} onChange={e => setAddressDetails(p => ({...p, block: e.target.value}))} placeholder="القطعة" className="bg-slate-50 border rounded-xl p-3 text-right" />
            <input value={addressDetails.street} onChange={e => setAddressDetails(p => ({...p, street: e.target.value}))} placeholder="الشارع" className="bg-slate-50 border rounded-xl p-3 text-right" />
            <input value={addressDetails.building} onChange={e => setAddressDetails(p => ({...p, building: e.target.value}))} placeholder="المنزل" className="bg-slate-50 border rounded-xl p-3 text-right" />
          </div>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-3 mb-6">
          {cartItems.map(it => (
            <div key={it.product!.id} className="p-3 border rounded-2xl bg-white space-y-2">
              <div className="flex justify-between items-start">
                <button onClick={() => deleteFromCart(it.product!.id)} className="text-slate-300 hover:text-rose-500"><X size={14}/></button>
                <div className="text-right font-bold text-sm w-40">{it.product!.name}</div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                  <button onClick={() => removeFromCart(it.product!.id)} className="p-1 hover:bg-white text-slate-500"><Minus size={12}/></button>
                  <span className="font-bold text-xs">{it.qty}</span>
                  <button onClick={() => addToCart(it.product!.id)} className="p-1 hover:bg-white text-slate-500"><Plus size={12}/></button>
                </div>
                <div className="font-bold text-primary text-xs">{computeInvoiceItemTotal(it as any, data.products).toFixed(3)} د.ك</div>
              </div>
              
              {it.product!.addons && it.product!.addons.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="text-[10px] font-bold text-slate-400 mb-1">إضافات الوجبة:</div>
                  <div className="grid grid-cols-1 gap-1.5">
                    {it.product!.addons.map((a: any) => {
                      const cartAddon = (it.addons || []).find(ca => ca.id === a.id);
                      const currentQty = cartAddon ? cartAddon.quantity : 0;
                      const isFreePricing = Number(a.freeQuantity || 0) > 0;
                      return (
                        <div key={a.id} className="flex justify-between items-center bg-slate-100/50 p-1.5 rounded-lg">
                          {isFreePricing ? (
                            <div className="flex items-center gap-1.5 bg-white rounded-md p-0.5 border border-slate-200">
                               <button onClick={() => updateAddonQuantity(it.product!.id, a.id, -1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-400"><Minus size={10}/></button>
                               <span className="text-[10px] font-bold w-4 text-center">{currentQty}</span>
                               <button onClick={() => updateAddonQuantity(it.product!.id, a.id, 1)} className="w-5 h-5 flex items-center justify-center hover:bg-slate-100 rounded text-slate-400"><Plus size={10}/></button>
                            </div>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                const min = a.isRequired ? Math.max(1, a.minQuantity || 1) : 0;
                                if (currentQty > 0) {
                                  if (!a.isRequired) updateAddonQuantity(it.product!.id, a.id, -currentQty);
                                } else {
                                  updateAddonQuantity(it.product!.id, a.id, Math.max(1, min) - currentQty);
                                }
                              }}
                              className={cn(
                                "w-6 h-6 flex flex-shrink-0 items-center justify-center rounded-md transition-all", 
                                currentQty > 0 ? "bg-emerald-500 text-white" : "bg-white border border-slate-200 text-transparent hover:border-emerald-500",
                                a.isRequired ? "opacity-50 cursor-not-allowed" : ""
                              )}
                            >
                              <Check size={14} />
                            </button>
                          )}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-bold text-slate-700">{a.name}</span>
                            <span className="text-[8px] text-slate-400">{a.price.toFixed(3)} د.ك</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-xs text-slate-500 font-bold"><span>المجموع</span> <span>{subtotal.toFixed(3)} د.ك</span></div>
          <div className="flex justify-between text-xs text-slate-500 font-bold"><span>توصيل</span> <span>{deliveryFee.toFixed(3)} د.ك</span></div>
          {discountAmount > 0 && <div className="flex justify-between text-xs text-rose-500 font-bold"><span>خصم</span> <span>-{discountAmount.toFixed(3)} د.ك</span></div>}
          <div className="flex justify-between text-lg font-bold text-rose-600 bg-rose-50 p-3 rounded-xl mt-2 border border-rose-100">
            <span>الإجمالي</span> <span>{totalValue.toFixed(3)} د.ك</span>
          </div>
        </div>

        <button disabled={loading} onClick={handleCreateInvoice} className="w-full mt-6 bg-rose-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all hover:-translate-y-1 active:scale-95">إصدار الفاتورة</button>
      </div>
    </div>
  </div>
  );
});

export default InvoicePage;
