
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

 const [cart, setCart] = useState<Record<string, { quantity: number, priceAtTime: number, costAtTime: number, itemNotes?: string, addons?: any[] }>>({}); // productId: {quantity, priceAtTime, costAtTime, itemNotes}
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

 const [showQuickCustomerModal, setShowQuickCustomerModal] = useState(false);
 const [quickCustomerName, setQuickCustomerName] = useState('');
 const [quickCustomerPhone, setQuickCustomerPhone] = useState('');

 const getWhatsAppLink = (invoice: Invoice) => {
  const customer = (data?.customers || []).find(c => c.id === invoice.customerId);
  const order = (data?.orders || []).find(o => o.linkedInvoiceId === invoice.id || o.id === (invoice as any).linkedOrderId);
  const phone = customer?.phone || (order as any)?.customerPhone || '';
  
  if (!phone) return '#';

  const items = (invoice?.items || []).map(item => {
    const p = (data?.products || []).find(prod => prod.id === item.productId);
    const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
    let displayPrice = Number(price);
    let addonsLines: string[] = [];

    if (item.addons && item.addons.length > 0) {
      item.addons.forEach((addon: any) => {
        const addonQty = computeAddonQuantity(addon, item);

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

  const subtotal = (invoice?.items || []).reduce((acc, item) => {
    const p = (data?.products || []).find(prod => prod.id === item.productId);
    const price = item.priceAtTime !== undefined ? item.priceAtTime : ((item as any).price !== undefined ? (item as any).price : (p?.price || 0));
    let baseSum = price * (item.quantity || 1);
    if (item.addons && item.addons.length > 0) {
       item.addons.forEach((addon: any) => {
         if (addon.isHiddenPrice) {
           const addonQty = computeAddonQuantity(addon, item);
           baseSum += Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0));
         }
       });
    }
    return acc + baseSum;
  }, 0);
  
  const addonsTotalWA = (invoice?.items || []).reduce((acc, item) => {
    let sum = 0;
    if (item.addons && item.addons.length > 0) {
       item.addons.forEach((addon: any) => {
         if (!addon.isHiddenPrice) {
           const addonQty = computeAddonQuantity(addon, item);
           sum += Number(addon.price || 0) * Math.max(0, addonQty - (addon.freeQuantity || 0));
         }
       });
    }
    return acc + sum;
  }, 0);
  
  const total = Math.max(0, subtotal + addonsTotalWA + (Number(invoice.deliveryFee) || 0) - (Number(invoice.discount) || 0));
  const pLink = invoice.paymentLink || (invoice as any).paymentUrl || (invoice as any).url || (invoice as any).link;
  const isPaidNow = isPaidStatus(invoice.paymentStatus);
  const paymentLinkLine = (pLink && pLink.trim() !== '' && !isPaidNow) ? `\nرابط الدفع: ${pLink}` : '';

  const promoLabel = invoice.appliedPromoCodeName ? `قيمة الخصم (${invoice.appliedPromoCodeName})` : 'قيمة الخصم';
  const promoLine = (Number(invoice.discount) || 0) > 0 ? `*${promoLabel}*: ${Number(invoice.discount).toFixed(3)} د.ك\n` : '';
  
  const message = `*فاتورة من شركة مطبخ التراث الكويتي*\n\nالعميل: ${customer?.name || 'عميل'}\nرقم الفاتورة: ${invoice.id}\nالعنوان: ${invoice.address && invoice.address !== 'غير محدد' ? (typeof invoice.address === 'object' ? [`${invoice.address.region||''}`, `ق${invoice.address.block||''}`, `ش${invoice.address.street||''}`, `م${invoice.address.building||''}`].filter(Boolean).join(' ') : invoice.address) : (invoice.deliveryInfo?.zoneName || 'غير محدد')}\nالطلب:\n${items}\n\nالمجموع: ${subtotal.toFixed(3)} د.ك${addonsTotalWA > 0 ? '\nالإضافات: ' + addonsTotalWA.toFixed(3) + ' د.ك' : ''}\nرسوم التوصيل: ${Number(invoice.deliveryFee || 0).toFixed(3)} د.ك\n${promoLine}إجمالي الفاتورة: ${Number(total).toFixed(3)} د.ك${paymentLinkLine}\n\nشكراً لتعاملكم معنا!`;

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
    addons: existing ? existing.addons : (product.addons || []).filter(a => a.isRequired).map(a => ({...a, quantity: 1}))
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
        const cur = a.quantity || 1;
        const next = Math.max(a.isRequired ? 1 : 0, cur + delta);
        return { ...a, quantity: next };
      }
      return a;
    });
    return { ...prev, [productId]: { ...item, addons: newAddons } };
  });
 };

 const handleApplyPromoCode = () => {
  const code = (data.promocodes || []).find(p => p.code.toUpperCase() === promoCodeInput.trim().toUpperCase() && p.isActive);
  if (code) {
    setAppliedPromoCode(code);
    setDiscountValue(code.discountValue);
    setDiscountType(code.discountType === 'percentage' ? 'percentage' : 'amount');
    toast.success('تم تطبيق الكوبون');
  } else {
    toast.error('كوبون غير صالح');
  }
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
 const addonsTotal = computeInvoiceAddonsTotal(mockInv);
 const baseSubtotal = cartItems.reduce((acc, it) => acc + (it.priceAtTime * it.qty), 0);
 const discountAmount = discountType === 'percentage' ? (subtotal * (discountValue / 100)) : discountValue;
 const total = Math.max(0, subtotal + deliveryFee - discountAmount);

 const handleCreateInvoice = async () => {
  if (!selectedCustomerId || cartItems.length === 0) return toast.error('بيانات ناقصة');
  if (!addressDetails.block || !addressDetails.street || !addressDetails.building) return toast.error('يرجى إكمال تفاصيل العنوان');

  setLoading(true);
  const invoiceId = editingInvoiceId || `INV-${Date.now()}`;
  const zone = (data.zones || []).find(z => z.id === selectedZoneId);
  const regionName = zone ? zone.name : 'غير محدد';

  const newInvoice: Invoice = {
    id: invoiceId,
    customerId: selectedCustomerId,
    address: { region: regionName, ...addressDetails },
    items: cartItems.map(it => ({ ...it, productId: it.product!.id, quantity: it.qty })),
    deliveryFee,
    deliveryType,
    date: new Date().toISOString(),
    totalAmount: total,
    totalCost: computeInvoiceCost(mockInv, data.products),
    profit: computeInvoiceProfit(mockInv, data.products),
    discount: discountAmount,
    status: 'بانتظار الدفع',
    paymentStatus: 'pending',
    paymentMethod: 'KNet',
    gatewayFee: data.settings.gatewayFeeAmount || 0,
    notes: notesText || "---"
  };

  setData(prev => ({
    ...prev,
    invoices: editingInvoiceId ? prev.invoices.map(i => i.id === editingInvoiceId ? newInvoice : i) : [...prev.invoices, newInvoice],
    customers: prev.customers.map(c => c.id === selectedCustomerId ? { ...c, area: regionName, address: { region: regionName, ...addressDetails } } : c)
  }));

  setCart({});
  toast.success('تم الحفظ');
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
            <button key={p.id} onClick={() => addToCart(p.id)} className="bg-white border p-4 rounded-2xl text-right hover:border-primary transition-all group flex flex-col gap-2">
              <h3 className="font-bold text-slate-800">{p.name}</h3>
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
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">العربة <ShoppingCart size={20} className="text-primary" /></h2>
        
        <div className="space-y-4 mb-6">
          <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="w-full bg-slate-50 border rounded-2xl p-4 text-right font-bold" />
          
          <div className="relative">
            <input type="text" value={customerSearch || (data.customers.find(c => c.id === selectedCustomerId)?.name || '')} onChange={e => {setCustomerSearch(e.target.value); setShowCustomerDropdown(true);}} onFocus={() => setShowCustomerDropdown(true)} placeholder="ابحث عن عميل..." className="w-full bg-slate-50 border rounded-2xl p-4 pr-11 text-right font-bold" />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            {showCustomerDropdown && (
              <div className="absolute top-full right-0 left-0 bg-white border rounded-2xl mt-1 shadow-2xl z-50 max-h-40 overflow-y-auto">
                {data.customers.filter(c => normalizeArabic(c.name).includes(normalizeArabic(customerSearch))).map(c => (
                  <div key={c.id} onClick={() => {setSelectedCustomerId(c.id); setCustomerSearch(''); setShowCustomerDropdown(false);}} className="p-3 hover:bg-slate-50 cursor-pointer text-right border-b font-bold">{c.name}</div>
                ))}
              </div>
            )}
          </div>

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
                <div className="font-bold text-primary text-xs">{((it.qty * it.priceAtTime) + it.addons.reduce((s,a) => s + (a.price * computeAddonQuantity(a, it)), 0)).toFixed(3)} د.ك</div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="flex justify-between text-xs text-slate-500 font-bold"><span>المجموع</span> <span>{subtotal.toFixed(3)} د.ك</span></div>
          <div className="flex justify-between text-xs text-slate-500 font-bold"><span>التوصيل</span> <span>{deliveryFee.toFixed(3)} د.ك</span></div>
          <div className="flex justify-between text-lg font-bold text-primary bg-primary/5 p-3 rounded-xl mt-2"><span>الإجمالي</span> <span>{total.toFixed(3)} د.ك</span></div>
        </div>

        <button disabled={loading} onClick={handleCreateInvoice} className="w-full mt-6 bg-primary text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-primary-dark transition-all">إصدار الفاتورة</button>
      </div>
    </div>
  </div>
 );
});

export default InvoicePage;
