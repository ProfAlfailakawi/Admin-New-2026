import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { cn, formatKuwaitiDate } from '../lib/utils';
import { Toaster, toast } from 'sonner';
import { db } from '../firebase';
import { collection, query, where, getDocs, orderBy, doc, getDoc, limit } from 'firebase/firestore';
import { isPendingStatus, isFailedStatus, isPaidStatus, isCancelledStatus } from '../lib/status-utils';

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
 <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 md:p-4 arabic-font" dir="rtl">
 <Toaster position="top-center" richColors />
 <div className="bg-white rounded-3xl p-3 md:p-3 max-w-2xl w-full shadow-xl border border-slate-100">
 <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
 <Search size={32} />
 </div>
 
 <h1 className="text-2xl font-bold text-center text-slate-800 mb-2">تتبع الطلب</h1>
 <p className="text-slate-500 text-center text-sm mb-8">اكتب رقم التلفون المسجل أو رقم الطلب عشان تتابع الحالة</p>
 
 <form onSubmit={handleSearch} className="space-y-4">
 <div>
 <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">رقم التلفون أو الفاتورة</label>
 <input
 type="text"
 value={phoneNumber}
 onChange={(e) => setPhoneNumber(e.target.value)}
 placeholder="مثال: 90000000 أو INV-...."
 className="w-full bg-slate-50 text-slate-800 font-bold px-4 py-3 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-emerald-500 transition-colors text-left"
 dir="ltr"
 required
 />
 </div>
 
 <button
 type="submit"
 disabled={loading || !phoneNumber}
 className={cn(
"w-full py-4 text-white font-bold rounded-2xl transition-all shadow-xl flex items-center justify-center gap-2",
 loading || !phoneNumber ?"bg-slate-300 shadow-none" :"bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20 hover:scale-[1.02] active:scale-95"
)}
 >
 {loading ? (
 <span className="animate-pulse">ندور...</span>
) : (
 <>
 <span>البحث عن الطلب</span>
 <Search size={18} />
 </>
)}
 </button>
 </form>

 {hasSearched && !loading && (
 <div className="mt-8 space-y-4">
 {orders.length === 0 ? (
 <div className="bg-slate-50 border border-slate-100 p-3 md:p-4 rounded-2xl text-center">
 <h3 className="font-bold text-slate-800 mb-2">ماكو طلبات نشطة</h3>
 <p className="text-xs text-slate-500">ما لقينا طلبات حالية على رقم التلفون اللي دخلته.</p>
 </div>
) : (
 orders.map((order: any) => {
 const isZeroOrder = Number(order.totalAmount || order.finalPrice || order.total || order.total_amount || 0) === 0;
 const isPaidOrCompleted = isPaidStatus(order.paymentStatus) || isPaidStatus(order.status);
 const isCancelled = isCancelledStatus(order.paymentStatus) || isCancelledStatus(order.status);
 const isFailed = !isPaidOrCompleted && !isCancelled && (isFailedStatus(order.paymentStatus) || isFailedStatus(order.status));
 const isPending = !isPaidOrCompleted && !isFailed && !isCancelled;
 const isTrulyFree = isZeroOrder && isPaidOrCompleted;
 return (
 <div key={order.id} className={cn("bg-white border-2 p-3 md:p-4 rounded-2xl shadow-sm text-right space-y-4 transition-all", isFailed ?"border-red-100 bg-red-50/5" : isCancelled ?"border-rose-100 bg-rose-50/5" :"border-emerald-100")}>
 <div className="flex justify-between items-center pb-4 border-b border-slate-100">
 <span className="text-sm font-bold text-slate-800">طلب #{order.id.slice(-6)}</span>
 <div className="flex items-center gap-2">
 {(isPending || isFailed) && order.paymentLink && !isCancelled && (
 <button 
 onClick={() => window.location.href = order.paymentLink}
 className="text-xs font-bold px-4 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
 >
 إعادة محاولة الدفع
 </button>
 )}
 <span className={cn("text-xs font-bold px-3 py-1 rounded-full", isPaidOrCompleted ?"bg-emerald-100 text-emerald-800" : isFailed ?"bg-red-100 text-red-800" : isCancelled ?"bg-rose-100 text-rose-800" :"bg-violet-100 text-violet-800 animate-pulse")}>
 {isTrulyFree ? 'طلب مجاني - جاري التجهيز' : (isPaidOrCompleted ? 'تم الدفع بنجاح' : isCancelled ? ((order.status === 'انتهى وقت القطية' || order.status === 'ملغي - انتهى وقت القطية') ? 'ملغي - انتهى وقت القطية' : 'طلب ملغي') : isFailed ? 'فشلت عملية الدفع' : 'بانتظار الدفع')}
 </span>
 </div>
 </div>
 
 {/* Order Details List */}
 <div className="space-y-2">
 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">تفاصيل الطلب:</h4>
 {order.items && order.items.length > 0 ? (
 order.items.map((item: any, idx: number) => (
 <div key={idx} className="flex justify-between items-center text-sm font-bold text-slate-700 bg-slate-50 p-2 rounded-lg">
 <div className="flex items-center gap-2">
 <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-md text-xs">{item.quantity}x</span>
 <span>{item.name || item.productId}</span>
 </div>
 <span>{((item.priceAtTime !== undefined ? item.priceAtTime : item.price || 0) * item.quantity).toFixed(3)} د.ك</span>
 </div>
))
) : (
 <div className="text-sm text-slate-500 text-center py-2">ماكو تفاصيل للمنتجات</div>
)}
 </div>

 {/* Order Summary */}
 <div className="bg-slate-50 p-3 rounded-xl space-y-2 border border-slate-100">
 <div className="flex justify-between text-xs font-bold text-slate-600">
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
 <div className="flex justify-between text-xs font-bold text-slate-600">
 <span>رسوم التوصيل:</span>
 <span>{Number(order.deliveryFee).toFixed(3)} د.ك</span>
 </div>
)}
 {Number(order.discount) > 0 && (
 <div className="flex justify-between text-xs font-bold text-red-500">
 <span>الخصم:</span>
 <span>-{Number(order.discount).toFixed(3)} د.ك</span>
 </div>
)}
 <div className="flex justify-between text-lg font-bold text-emerald-700 pt-2 border-t border-slate-200/60">
 <span>الإجمالي النهائي:</span>
 <span>{Number(order.totalAmount || order.finalPrice || order.total || order.total_amount || 0).toFixed(3)} د.ك</span>
 </div>
 </div>

 {/* Customer Information (optional snapshot) */}
 <div className="text-xs font-bold text-slate-500 flex flex-col gap-1 bg-slate-50 p-3 rounded-lg border border-slate-100">
 <div className="flex justify-between">
 <span>التاريخ:</span>
 <span dir="ltr">{formatKuwaitiDate(order.date || order.createdAt).full}</span>
 </div>
 {order.customerPhone && (
 <div className="flex justify-between">
 <span>رقم التواصل:</span>
 <span dir="ltr">{maskPhoneForCustomer(order.customerPhone)}</span>
 </div>
)}
 {order.address && (
 <div className="flex flex-col mt-1 pt-1 border-t border-slate-200/60">
 <span className="text-slate-500 mb-1">وصف العنوان:</span>
 <span className="text-slate-700">{order.address}</span>
 </div>
)}
 </div>

 </div>
);
 })
)}
 </div>
)}
 </div>
 </div>
);
}
