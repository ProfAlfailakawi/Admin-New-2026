import React, { useEffect, useState } from 'react';
import { Search, Package } from 'lucide-react';
import { cn, formatKuwaitiDate } from '../lib/utils';
import { Toaster, toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import { IS_DEMO_MODE } from '../lib/demoMode';
import { GET_DEMO_DATA } from '../data';
import { isPendingStatus, isFailedStatus, isPaidStatus, isCancelledStatus } from '../lib/status-utils';
import { DnaEmpty, DnaStepper } from './dna/DnaKit';
import LogoEngine from './ui/LogoEngine';
import { DEFAULT_GLOBAL_LOGO } from '../constants';

export default function TrackPage() {
 const [phoneNumber, setPhoneNumber] = useState('');
 const [loading, setLoading] = useState(false);
 const [orders, setOrders] = useState<any[]>([]);
 const [hasSearched, setHasSearched] = useState(false);

 const cleanPhoneDigits = (value: any) => String(value || '').replace(/\D/g, '').slice(-8);
 const phoneLooksSame = (a: any, b: any) => {
 const aa = cleanPhoneDigits(a);
 const bb = cleanPhoneDigits(b);
 return aa.length >= 8 && bb.length >= 8 && aa === bb;
 };
 const maskPhoneForCustomer = (value: any) => {
 const digits = cleanPhoneDigits(value);
 if (digits.length < 8) return 'مخفي للخصوصية';
 return `${digits.slice(0, 2)}***${digits.slice(-2)}`;
 };

  useEffect(() => {
    let orderIdToSearch = null;
    let paymentStatus = null;

    // Handle redirect context from server injection
    const storedOrder = localStorage.getItem('payment_redirect_order');
    const storedStatus = localStorage.getItem('payment_status');
    
    if (storedOrder) {
      orderIdToSearch = storedOrder.trim();
      paymentStatus = storedStatus;
      localStorage.removeItem('payment_redirect_order');
      localStorage.removeItem('payment_status');
    }

    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('show_result');
    const urlOrderId = params.get('tracked_order');

    try {
      if (!orderIdToSearch) {
        // Fallback for old style URLs
        if (urlOrderId) {
            orderIdToSearch = urlOrderId.trim();
        } else {
            orderIdToSearch = localStorage.getItem('order_tracking_id');
        }
        paymentStatus = paymentStatus || urlStatus || localStorage.getItem('payment_return_status');
      }

      // Cleanup old keys
      localStorage.removeItem('order_tracking_id');
      localStorage.removeItem('payment_return_status');
      localStorage.removeItem('customer_phone_track');
      
      // Delete cookie after reading if it exists
      const cookieStatus = document.cookie.split("; ").find(row => row.startsWith("payment_status="));
      if (cookieStatus) {
        document.cookie = "payment_status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }
    } catch (e) {
      console.error("localStorage get/remove error:", e);
    }

    if (paymentStatus === 'success') {
      toast.success('تمت عملية الدفع بنجاح');
    } else if (paymentStatus === 'failed') {
      toast.error('الدفع ما ضبط، تقدر تجرب مرة ثانية');
    }

    // Clear query params purely for UI aesthetics without reloading
    if (urlStatus || urlOrderId) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    if (orderIdToSearch) {
      setPhoneNumber(orderIdToSearch);
      // Auto search
      setTimeout(() => {
        handleSearch(undefined, orderIdToSearch || undefined);
      }, 500);
    }
  }, []);

 const handleSearch = async (e?: React.FormEvent, directSearch?: string) => {
 if (e) e.preventDefault();
 const queryStr = String(directSearch || phoneNumber || '').trim();
 const queryDigits = cleanPhoneDigits(queryStr);
 const isFullPhoneSearch = queryDigits.length >= 8 && /^\+?\d[\d\s-]*$/.test(queryStr);
 if (!queryStr) return;
 
 setLoading(true);
 setHasSearched(true);
 setOrders([]);

 if (IS_DEMO_MODE) {
 // Demo: search the in-memory dataset only (no Firestore, no network).
 const demo = GET_DEMO_DATA();
 const pool: any[] = [...(demo.orders as any[]), ...(demo.invoices as any[])];
 const needle = queryStr.toLowerCase();
 const found = pool.filter((o: any) =>
 String(o.id).toLowerCase() === needle || String(o.id).toLowerCase().endsWith(needle) || String(o.linkedInvoiceId || '').toLowerCase() === needle ||
 (isFullPhoneSearch && phoneLooksSame(o.customerPhone, queryDigits))).slice(0, 20);
 await new Promise(r => setTimeout(r, 350));
 setOrders(found);
 if (found.length === 0) toast.info('لم يتم العثور على طلبات مطابقة للرقم أو المعرف المدخل');
 else toast.success(`تم العثور على ${found.length} طلب/طلبات`);
 setLoading(false);
 return;
 }

 try {
 let userOrders: any[] = [];
 let q: any;
 let snapshot: any;

 // 1. Try to fetch by full phone number only. Partial phone matches are not safe on a public tracking page.
 if (isFullPhoneSearch) {
 let q = query(collection(db, 'orders'), where('customerPhone', '==', queryDigits), limit(20));
 let snapshot = await getDocs(q);
 userOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

 // 1b. Try to fetch by mobile field if exists (fallback for other apps)
 if (userOrders.length === 0) {
  q = query(collection(db, 'orders'), where('mobile', '==', queryDigits), limit(20));
  snapshot = await getDocs(q);
  userOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 }
 }

 // 2. If nothing found, try by linkedInvoiceId
 if (userOrders.length === 0) {
 q = query(collection(db, 'orders'), where('linkedInvoiceId', '==', queryStr), limit(20));
 snapshot = await getDocs(q);
 userOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 }
 
 // 3. If still nothing found, look up document by ID directly (in case they used the exact Order ID hash)
 if (userOrders.length === 0) {
 try {
 const directDoc = await getDoc(doc(db, 'orders', queryStr));
 if (directDoc.exists()) {
 userOrders = [{ id: directDoc.id, ...directDoc.data() }];
 }
 } catch(e) {}
 }

 // 4. If nothing is found and it's 6 characters (or 4+), try suffix match on recent orders
 if (userOrders.length === 0 && queryStr.length >= 4) {
 try {
 const allQ = query(collection(db, 'orders'), orderBy('date', 'desc'), limit(30));
 // Limit locally to 30 recent orders for performance
 const allSnap = await getDocs(allQ);
 allSnap.docs.forEach((docSnap) => {
 const data = docSnap.data();
 const isParticipantMatch = isFullPhoneSearch && (
 (Array.isArray(data.participantPhones) && data.participantPhones.some((p: string) => phoneLooksSame(p, queryDigits))) ||
 (Array.isArray(data.splitPayments) && data.splitPayments.some((sp: any) => phoneLooksSame(sp.phone, queryDigits))) ||
 (Array.isArray(data.splitParticipants) && data.splitParticipants.some((sp: any) => phoneLooksSame(typeof sp === 'object' ? sp.phone : sp, queryDigits))) ||
 phoneLooksSame(data.customerPhone, queryDigits) ||
 phoneLooksSame(data.mobile, queryDigits));
 
 if ((docSnap.id.endsWith(queryStr) || docSnap.id.includes(queryStr) || isParticipantMatch) && !userOrders.find(u => u.id === docSnap.id)) {
 userOrders.push({ id: docSnap.id, ...data });
 }
 });
 // Sort locally to avoid firestore index requirement
 userOrders.sort((a: any, b: any) => {
 const tA = new Date(a.createdAt || a.date).getTime();
 const tB = new Date(b.createdAt || b.date).getTime();
 return tB - tA;
 });
 } catch(e) {
 console.warn("Suffix/Participant matching failed:", e);
 }
 }

 // 5. If STILL nothing found, search invoices explicitly!
 if (userOrders.length === 0) {
 try {
 // Try to fetch invoices by ID directly
 const invDoc = await getDoc(doc(db, 'invoices', queryStr));
 if (invDoc.exists()) {
 userOrders.push({ id: invDoc.id, ...invDoc.data() });
 }

 // Search invoices by phone number properly
 if (isFullPhoneSearch) {
 const invPhoneQ = query(collection(db, 'invoices'), where('customerPhone', '==', queryDigits), limit(20));
 const invPhoneSnap = await getDocs(invPhoneQ);
 invPhoneSnap.docs.forEach(docSnap => {
 if (!userOrders.find(u => u.id === docSnap.id)) {
 userOrders.push({ id: docSnap.id, ...docSnap.data() });
 }
 });
 }

 if (userOrders.length === 0 && queryStr.length >= 4) {
 // Try suffix match on invoices
 const invQ = query(collection(db, 'invoices'), orderBy('date', 'desc'), limit(30));
 const invSnap = await getDocs(invQ);
 invSnap.docs.forEach((docSnap) => {
 const data = docSnap.data();
 const isPhoneMatch = isFullPhoneSearch && (phoneLooksSame(data.customerPhone, queryDigits) || phoneLooksSame(data.mobile, queryDigits) ||
 (Array.isArray(data.participantPhones) && data.participantPhones.some((p: string) => phoneLooksSame(p, queryDigits))) ||
 (Array.isArray(data.splitPayments) && data.splitPayments.some((sp: any) => phoneLooksSame(sp.phone, queryDigits))) ||
 (Array.isArray(data.splitParticipants) && data.splitParticipants.some((sp: any) => phoneLooksSame(typeof sp === 'object' ? sp.phone : sp, queryDigits))));
 
 if ((docSnap.id.endsWith(queryStr) || docSnap.id.includes(queryStr) || isPhoneMatch) && !userOrders.find(o => o.id === docSnap.id)) {
 userOrders.push({ id: docSnap.id, ...data });
 }
 });
 }
 } catch (e) {
 console.warn("Invoice search failed", e);
 }
 }

 setOrders(userOrders);

 if (userOrders.length === 0) {
 toast.info('لم يتم العثور على طلبات مطابقة للرقم أو المعرف المدخل');
 } else {
 toast.success(`تم العثور على ${userOrders.length} طلب/طلبات`);
 }
 } catch(err) {
 console.error(err);
 toast.error('تعطل البحث');
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="pub-page pub-track arabic-font" dir="rtl">
 <Toaster position="bottom-center" richColors offset={16} mobileOffset={12} />
 <main className="pub-card pub-card--wide">
 <header className="pub-brand">
 <LogoEngine src={DEFAULT_GLOBAL_LOGO} size="md" variant="royal" className="pub-logo" />
 <div className="pub-brand-name">مطبخ التراث</div>
 </header>

 <h1 className="pub-title">تتبع الطلب</h1>
 <p className="pub-sub">اكتب رقم التلفون المسجل أو رقم الطلب عشان تتابع الحالة</p>
 
 {IS_DEMO_MODE && (() => {
 const d = GET_DEMO_DATA();
 const stable = [...d.orders].sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)));
 const samples = [stable.find((o: any) => o.paymentStatus === 'paid'), stable.find((o: any) => o.status === 'pending'), stable.find((o: any) => o.status === 'failed')].filter(Boolean) as any[];
 return (
 <div className="pub-demo" data-testid="track-demo-hint">
 <div className="pub-demo-title">نسخة تجريبية - جرّب أحد هذه الأرقام:</div>
 <div className="pub-demo-row">
 {samples.map((o: any) => (
 <button key={o.id} type="button" onClick={() => { setPhoneNumber(o.id); handleSearch(undefined, o.id); }} className="pub-chip" dir="ltr">{o.id}</button>
 ))}
 </div>
 </div>
 );
 })()}
 <form onSubmit={handleSearch} className="pub-form">
 <div>
 <label htmlFor="track-query" className="pub-label">رقم التلفون أو الفاتورة</label>
 <input
 id="track-query"
 type="text"
 value={phoneNumber}
 onChange={(e) => setPhoneNumber(e.target.value)}
 placeholder="مثال: 90000000 أو INV-...."
 className="pub-input"
 dir="ltr"
 required
 />
 </div>
 
 <button
 type="submit"
 disabled={loading || !phoneNumber}
 className="pub-btn"
 aria-busy={loading}
 >
 {loading ? (
 <>
 <span className="pub-spin" aria-hidden="true" />
 <span>ندور...</span>
 </>
) : (
 <>
 <span>البحث عن الطلب</span>
 <Search size={18} />
 </>
)}
 </button>
 </form>

 {loading && (
 <div className="pub-skel" aria-hidden="true">
 <span className="pub-skel-line pub-skel-w40" />
 <span className="pub-skel-line pub-skel-w100" />
 <span className="pub-skel-line pub-skel-w70" />
 <span className="pub-skel-line pub-skel-w100" />
 </div>
 )}

 {hasSearched && !loading && (
 <div className="pub-results">
 {orders.length === 0 ? (
 <DnaEmpty icon={<Package />} title="ماكو طلبات نشطة" hint="ما لقينا طلبات حالية على رقم التلفون اللي دخلته." />
) : (
 orders.map((order: any) => {
 const isZeroOrder = Number(order.totalAmount || order.finalPrice || order.total || order.total_amount || 0) === 0;
 const isPaidOrCompleted = isPaidStatus(order.paymentStatus) || isPaidStatus(order.status);
 const isCancelled = isCancelledStatus(order.paymentStatus) || isCancelledStatus(order.status);
 const isFailed = !isPaidOrCompleted && !isCancelled && (isFailedStatus(order.paymentStatus) || isFailedStatus(order.status));
 const isPending = !isPaidOrCompleted && !isFailed && !isCancelled;
 const isTrulyFree = isZeroOrder && isPaidOrCompleted;
 return (
 <div key={order.id} className="pub-order" data-state={isPaidOrCompleted ? 'paid' : isCancelled ? 'cancelled' : isFailed ? 'failed' : 'pending'}>
 <div className="pub-order-head">
 <span className="pub-order-id">طلب #{IS_DEMO_MODE && /^(ORD|INV)-/.test(order.id) ? order.id : order.id.slice(-6)}</span>
 <div className="pub-order-actions">
 {(isPending || isFailed) && order.paymentLink && !isCancelled && (
 <button 
 onClick={() => window.location.href = order.paymentLink}
 className="pub-retry"
 >
 إعادة محاولة الدفع
 </button>
 )}
 <span className="pub-pill">
 {isTrulyFree ? 'طلب مجاني - جاري التجهيز' : (isPaidOrCompleted ? 'تم الدفع بنجاح' : isCancelled ? ((order.status === 'انتهى وقت القطية' || order.status === 'ملغي - انتهى وقت القطية') ? 'ملغي - انتهى وقت القطية' : 'طلب ملغي') : isFailed ? 'فشلت عملية الدفع' : 'بانتظار الدفع')}
 </span>
 </div>
 </div>
 
 <DnaStepper
 size="sm"
 className="dna-steps-track"
 ariaLabel="مراحل الطلب"
 steps={[
 { key: 'received', label: 'استلام الطلب', state: 'done' },
 { key: 'payment', label: isPaidOrCompleted ? 'تم الدفع' : isCancelled ? 'ملغي' : isFailed ? 'فشل الدفع' : 'بانتظار الدفع', state: isPaidOrCompleted ? 'done' : isCancelled ? 'returned' : isFailed ? 'blocked' : 'current' },
 ]}
 />

 {/* Order Details List */}
 <div className="pub-items">
 <h4 className="pub-h4">تفاصيل الطلب:</h4>
 {order.items && order.items.length > 0 ? (
 order.items.map((item: any, idx: number) => (
 <div key={idx} className="pub-item">
 <div className="pub-item-name">
 <span className="pub-qty">{item.quantity}x</span>
 <span>{item.name || item.productId}</span>
 </div>
 <span>{((item.priceAtTime !== undefined ? item.priceAtTime : item.price || 0) * item.quantity).toFixed(3)} د.ك</span>
 </div>
))
) : (
 <DnaEmpty icon={<Package />} title="ماكو تفاصيل للمنتجات" />
)}
 </div>

 {/* Order Summary */}
 <div className="pub-sum">
 <div className="pub-row">
 <span>المجموع:</span>
 <span>{(() => {
 const subtotal = Number(order.items?.reduce((acc: number, item: any) => acc + ((item.priceAtTime !== undefined ? item.priceAtTime : item.price || 0) * item.quantity), 0) || 0);
 if (subtotal > 0) return subtotal.toFixed(3);
 const t = Number(order.totalAmount || order.finalPrice || order.total || order.total_amount || 0);
 const f = Number(order.deliveryFee || 0);
 return Math.max(0, t - f).toFixed(3);
 })()} د.ك</span>
 </div>
 {Number(order.deliveryFee) > 0 && (
 <div className="pub-row">
 <span>رسوم التوصيل:</span>
 <span>{Number(order.deliveryFee).toFixed(3)} د.ك</span>
 </div>
)}
 {Number(order.discount) > 0 && (
 <div className="pub-row pub-row--disc">
 <span>الخصم:</span>
 <span>-{Number(order.discount).toFixed(3)} د.ك</span>
 </div>
)}
 <div className="pub-total">
 <span>الإجمالي النهائي:</span>
 <span>{Number(order.totalAmount || order.finalPrice || order.total || order.total_amount || 0).toFixed(3)} د.ك</span>
 </div>
 </div>

 {/* Customer Information (optional snapshot) */}
 <div className="pub-meta">
 <div className="pub-row">
 <span>التاريخ:</span>
 <span dir="ltr">{formatKuwaitiDate(order.date || order.createdAt).full}</span>
 </div>
 {order.customerPhone && (
 <div className="pub-row">
 <span>رقم التواصل:</span>
 <span dir="ltr">{maskPhoneForCustomer(order.customerPhone)}</span>
 </div>
)}
 {order.address && (
 <div className="pub-addr">
 <span className="pub-addr-l">وصف العنوان:</span>
 <span className="pub-addr-v">{typeof order.address === 'object' ? (order.fullAddress || [order.area, order.address?.block && `قطعة ${order.address.block}`, order.address?.street && `شارع ${order.address.street}`, order.address?.building && `منزل ${order.address.building}`].filter(Boolean).join('، ')) : order.address}</span>
 </div>
)}
 </div>

 </div>
);
 })
)}
 </div>
)}
 </main>
 </div>
);
}
