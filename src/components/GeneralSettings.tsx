import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { Settings, Save, Upload, Trash2, Shield, Bell, CreditCard, DownloadCloud, Database, Sparkles, RefreshCw, Loader2, Map as MapIcon, Plus, CheckCircle2, ChevronDown, ChevronRight, Edit2, X, AlertTriangle, Code, Store, Search } from 'lucide-react';
import { motion } from 'motion/react';
import LogoEngine from './ui/LogoEngine';
import { AppState, AppSettings, Zone, Product, Customer, Expense, Supplier, Testimonial, PulseAnalysisRecord, AICampaign, SupplierTransfer } from '../types';
import { GET_DEMO_DATA } from '../data';
import { cn, formatFullAddress, normalizeAddressObject, normalizeArabicNumerals, normalizeArabic } from '../lib/utils';
import * as XLSX from 'xlsx';
import { collection, doc, getDocs, setDoc, writeBatch } from 'firebase/firestore'; 
import { db, auth, getSmartDoc } from '../firebase'; 
import { Toggle } from './ui/Toggle';
import { INITIAL_DATA } from '../data'; 

import { EnableNotificationsButton } from './EnableNotificationsButton';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { recalculateStateBalances } from '../lib/business-logic';
import { getProtectedStorageItem, removeProtectedStorageItemIntentionally, setProtectedStorageItem } from '../lib/dataGuard';
import firebaseConfig from '../../firebase-applet-config.json';

interface Props {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 appMode: 'local' | 'cloud';
 switchMode: (newMode: 'local' | 'cloud') => void;
 addToast: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
 onCloudImport?: (importedState: AppState) => Promise<boolean>;
}

const GeneralSettings: React.FC<Props> = ({ data, setData, appMode, switchMode, addToast, onCloudImport }) => {
 const [settings, setSettingsState] = useState<AppSettings>(data?.settings || INITIAL_DATA.settings);
  
  const setSettings = (updater: any) => {
    setSettingsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      return next;
    });
  };
  
  // Update local setting silently if remote is completely different (to not block typing)
  useEffect(() => {
     if (JSON.stringify(data.settings) !== JSON.stringify(settings)) {
         setSettingsState(data.settings);
     }
  }, [data.settings]);

  // Synchronize local setting changes back to parent state safely after render
  useEffect(() => {
    if (JSON.stringify(data.settings) !== JSON.stringify(settings)) {
      setData(d => ({ ...d, settings }));
    }
  }, [settings, setData]);
  
 const [showConfirm, setShowConfirm] = useState(false);
 const [showResetConfirm, setShowResetConfirm] = useState(false);
 const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);
 const [isResetting, setIsResetting] = useState(false);

 const [activeSection, setActiveSection] = useState<string>('');
 const [searchZoneTerm, setSearchZoneTerm] = useState('');

 const isInitialMount = useRef(true);

 

 

 const handleSyncBalances = () => {
 setIsSyncing(true);
 setTimeout(() => {
 setData(prev => recalculateStateBalances(prev));
 setIsSyncing(false);
 addToast("تمت المزامنة","تمت إعادة حساب مديونيات الموردين وأرصدة العملاء بنجاح.","success");
 }, 800);
 };

 const handleResetData = async () => {
  if (isResetting) return;
  setIsResetting(true);
  addToast("جاري التصفير", "يتم حفظ نسخة أمان ثم تنظيف البيانات.", "info");
  try {
    const hasRealData = (data.invoices && data.invoices.length > 0) || (data.products && data.products.length > 0) || (data.customers && data.customers.length > 0);
    if (hasRealData) {
      if (appMode === 'local') {
        setProtectedStorageItem('ktk_local_accounting_data_backup', JSON.stringify(data));
        setProtectedStorageItem('ktk_local_accounting_data_last_good', JSON.stringify(data));
      } else {
        setProtectedStorageItem('ktk_cloud_offline_snapshot_backup', JSON.stringify(data));
        setProtectedStorageItem('ktk_cloud_offline_snapshot_last_good', JSON.stringify(data));
      }
    }

    const currentUser = auth.currentUser;
    if (appMode === 'cloud' && currentUser) {
      try {
        const generationId = `admin-data-reset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        try { localStorage.setItem('ktk_admin_data_generation_id', generationId); } catch {}
        const SHARDED_KEYS = ['invoices', 'orders', 'customers', 'expenses', 'testimonials', 'products', 'supplierCopies', 'pulseAnalysisHistory', 'pulseReviews', 'campaigns', 'squads', 'promocodes', 'aiLearningMemory', 'pulseArchiveAnalysis', 'deepArchiveAnalysis', 'nameMatchMemory'];
        const dataRef = getSmartDoc('appData', currentUser.uid, currentUser.email);
        const cleanRoot: any = { ...INITIAL_DATA };
        cleanRoot.__adminDataGenerationId = generationId;
        cleanRoot.__adminLastAuthoritativeWriteAt = new Date().toISOString();
        SHARDED_KEYS.forEach(key => {
          if (key !== 'products' && cleanRoot[key] !== undefined) cleanRoot[key] = [];
        });
        await setDoc(dataRef, JSON.parse(JSON.stringify(cleanRoot)), { merge: false });
        
        await Promise.all(SHARDED_KEYS.map(async (key) => {
          try {
            const shardRef = getSmartDoc('appData', currentUser.uid, currentUser.email, `shards/${key}`);
            await setDoc(shardRef, { [key]: [], isCompressed: false }, { merge: false });
          } catch (e) {
            console.warn(`Shard ${key} skip:`, e);
          }
        }));

        const squadsSnap = await getDocs(collection(db, 'squads'));
        let batch = writeBatch(db);
        let batchCount = 0;
        for (const squadDoc of squadsSnap.docs) {
          batch.delete(squadDoc.ref);
          batchCount += 1;
          if (batchCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            batchCount = 0;
          }
        }
        if (batchCount > 0) await batch.commit();
      } catch (cloudErr) {
        console.error("Cloud reset failed:", cloudErr);
        if (String(cloudErr).includes('permissions') || String(cloudErr).includes('permission-denied')) {
          throw new Error("FIRESTORE_PERMISSION_DENIED");
        }
        throw cloudErr;
      }
    }

    setData(INITIAL_DATA);
    removeProtectedStorageItemIntentionally('ktk_local_accounting_data');
    removeProtectedStorageItemIntentionally('ktk_local_accounting_data_last_good');
    removeProtectedStorageItemIntentionally('ktk_accounting_data');
    removeProtectedStorageItemIntentionally('ktk_accounting_data_last_good');
    removeProtectedStorageItemIntentionally('ktk_cloud_offline_snapshot');
    removeProtectedStorageItemIntentionally('ktk_cloud_offline_snapshot_last_good');
    sessionStorage.removeItem('hideSampleDataPrompt');
    localStorage.removeItem('active_firestore_db_id');
    localStorage.removeItem('active_firestore_project_id');

    addToast("تم التصفير","تمت العملية بنجاح وحُفظت نسخة أمان محلية.","warning");
    setShowResetConfirm(false);
    setTimeout(() => { window.location.reload(); }, 700);
  } catch (e) {
    console.error("Reset failed:", e);
    const msg = String(e);
    const isPermission = msg.includes('FIRESTORE_PERMISSION_DENIED') || msg.includes('permissions') || msg.includes('permission-denied');
    addToast("تعذر التصفير", isPermission
      ? "Firestore رفض التصفير لهذا الحساب. تأكد من صلاحيات المشرف أو تفعيل المساحة الفردية."
      : "لم يتم مسح البيانات. جرّب مرة أخرى.", "warning");
  } finally {
    setIsResetting(false);
  }
 };

 const handleRestoreBackup = () => {
   try {
     const backupKey = appMode === 'local' ? 'ktk_local_accounting_data_backup' : 'ktk_cloud_offline_snapshot_backup';
     let backupStr = getProtectedStorageItem(backupKey);
     if (!backupStr && appMode === 'local') {
       backupStr = getProtectedStorageItem('ktk_accounting_data_backup');
     }
     if (backupStr) {
       const parsed = JSON.parse(backupStr);
       setData(parsed);
       sessionStorage.setItem('hideSampleDataPrompt', 'true');
       setShowRestoreConfirm(false);
       addToast("تمت استعادة البيانات الأخيرة", "تم استرجاع كافة مبيعاتك وعملائك وعملياتك من النسخة الاحتياطية بنجاح ⛑️", "success");
     } else {
       const demo = GET_DEMO_DATA();
       setData(demo);
       sessionStorage.setItem('hideSampleDataPrompt', 'true');
       setShowRestoreConfirm(false);
       addToast("تم ملء البيانات التجريبية", "ما لقينا نسخة احتياطية سابقة بالمتصفح، فملأنا لك النظام ببيانات ترويجية جاهزة للاستكشاف والتحليل.", "info");
     }
   } catch (e) {
     console.error("Restore error", e);
     addToast("فشلت الاستعادة", "حدث خطأ غير متوقع أثناء تفكيك بيانات النسخة الاحتياطية.", "warning");
   }
 };

 // removed handleSave

 const handleDownload = () => {
 const wb = XLSX.utils.book_new();
 const safe = (v: any) => v === undefined || v === null ? '' : v;
 const json = (v: any) => {
   if (v === undefined || v === null) return '';
   const str = JSON.stringify(v);
   return str.length > 32000 ? str.slice(0, 32000) + '... (truncated)' : str;
 };
 const createChunkedSheet = (val: any) => {
   const s = val === undefined || val === null ? '' : JSON.stringify(val);
   const chunks = s.match(/[\s\S]{1,30000}/g) || [''];
   return XLSX.utils.json_to_sheet(chunks.map((chunk, index) => ({ part: index + 1, chunk })));
 };
 const addressText = (addr: any, fallbackArea?: string) => {
   const normalized = normalizeAddressObject(addr);
   const full = formatFullAddress(normalized);
   return full || fallbackArea || '';
 };
 const itemName = (it: any) => (data?.products || []).find(p => p.id === it.productId)?.name || it.name || it.productName || it.productId || '';
 const customerById = new Map((data?.customers || []).map((c: any) => [c.id, c]));
 const customerByPhone = new Map((data?.customers || []).filter((c: any) => c.phone).map((c: any) => [String(c.phone), c]));
 const normalizeExportProduct = (product: any) => ({
   ...product,
   category: product?.category || '',
   productCategory: product?.category || '',
   addons: json(Array.isArray(product?.addons) ? product.addons : []),
   addOns: json(Array.isArray(product?.addOns) ? product.addOns : []),
   extras: json(Array.isArray(product?.extras) ? product.extras : []),
   rawProduct: json(product)
 });

 const invoiceRows = (data?.invoices || []).map((i: any) => {
   const c: any = customerById.get(i.customerId) || customerByPhone.get(String(i.customerPhone || '')) || {};
   const snap = i.deliveryAddressSnapshot || {};
   const addr = i.address || c.address || c.detailedAddress;

   const areaVal = snap.area || i.area || addr?.region || addr?.area || c.area || '';
   const blockVal = snap.block || i.block || addr?.block || '';
   const streetVal = snap.street || i.street || addr?.street || '';
   const avenueVal = snap.avenue || i.avenue || i.addressJaddah || addr?.jaddah || '';
   const houseVal = snap.house || i.house || addr?.building || addr?.house || '';
   const floorVal = snap.floor || i.floor || addr?.floor || '';
   const apartmentVal = snap.apartment || i.apartment || addr?.apartment || '';
   const calculatedAddressFull = i.fullAddress || snap.fullAddress || addressText(addr, i.area || c.area);

   return {
     id: i.id,
     date: i.date,
     createdAt: i.createdAt,
     updatedAt: i.updatedAt,
     customerId: i.customerId,
     customerName: i.customerName || c.name || '',
     customerPhone: i.customerPhone || c.phone || '',
     status: i.status,
     paymentStatus: i.paymentStatus,
     paymentMethod: i.paymentMethod,
     paymentId: i.paymentId,
     paymentLink: i.paymentLink,
     totalAmount: i.totalAmount,
     subtotal: (i.items || []).reduce((a: number, it: any) => a + Number((it.priceAtTime ?? it.price ?? 0) * (it.quantity || 0)), 0),
     deliveryFee: i.deliveryFee,
     gatewayFee: i.gatewayFee,
     discount: i.discount,
     totalCost: i.totalCost,
     profit: i.profit,
     notes: i.notes,
     appliedPromoCodeName: i.appliedPromoCodeName,
     deliveryType: i.deliveryType,
     deliveryCompany: i.deliveryInfo?.company || '',
     deliveryInfo: json(i.deliveryInfo),
     area: areaVal,
     addressFull: calculatedAddressFull,
     addressRegion: areaVal,
     addressArea: areaVal,
     addressBlock: blockVal,
     addressStreet: streetVal,
     addressJaddah: avenueVal,
     addressBuilding: houseVal,
     addressFloor: floorVal,
     addressApartment: apartmentVal,
     addressNotes: addr?.notes || addr?.addressNotes || '',
     "المنطقة": areaVal,
     "القطعة": blockVal,
     "الشارع": streetVal,
     "الجادة": avenueVal,
     "المنزل": houseVal,
     "الدور": floorVal,
     "الشقة": apartmentVal,
     "العنوان الكامل": calculatedAddressFull,
     splitParticipants: json(i.splitParticipants),
     splitPayments: json(i.splitPayments),
     rouletteLoser: i.rouletteLoser,
     rawAddress: json(addr),
     items: json(i.items || []),
     rawInvoice: json(i)
   };
 });
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceRows), "Invoices");

 const invoiceItems = (data?.invoices || []).flatMap((i: any) => (i.items || []).map((it: any, idx: number) => ({
   invoiceId: i.id,
   invoiceDate: i.date,
   customerId: i.customerId,
   productId: it.productId,
   productName: itemName(it),
   quantity: it.quantity,
   priceAtTime: it.priceAtTime ?? it.price,
   costAtTime: it.costAtTime ?? it.cost,
   lineTotal: Number((it.priceAtTime ?? it.price ?? 0) * (it.quantity || 0)),
   itemNotes: it.itemNotes || it.notes || '',
   addons: json(it.addons),
   rawItem: json(it),
   itemIndex: idx + 1
 })));
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invoiceItems), "InvoiceItems");

 const payerRows = (data?.invoices || []).flatMap((i: any) => {
   const payments = Array.isArray(i.splitPayments) ? i.splitPayments : [];
   const participants = Array.isArray(i.splitParticipants) ? i.splitParticipants : [];
   const merged = payments.length ? payments : participants;
   return merged.map((sp: any, idx: number) => {
     const obj = typeof sp === 'object' ? sp : { name: sp };
     return {
       invoiceId: i.id,
       invoiceDate: i.date,
       name: obj.name || obj.customerName || '',
       phone: obj.phone || obj.customerPhone || '',
       amount: obj.amount || obj.paidAmount || obj.value || '',
       status: obj.status || obj.paymentStatus || i.paymentStatus || '',
       paidAt: obj.paidAt || obj.date || '',
       loyaltyPoints: obj.loyaltyPoints || obj.points || Math.floor(Number(obj.amount || obj.paidAmount || 0)),
       customerId: obj.customerId || '',
       rawPayer: json(obj),
       payerIndex: idx + 1
     };
   });
 });
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(payerRows), "Payers");

 const orderRows = (data?.orders || []).map((o: any) => {
   const c: any = customerById.get(o.customerId) || customerByPhone.get(String(o.customerPhone || '')) || {};
   const snap = o.deliveryAddressSnapshot || {};
   const addr = o.address || c.address || c.detailedAddress;

   const areaVal = snap.area || o.area || o.regionId || addr?.region || addr?.area || c.area || '';
   const blockVal = snap.block || o.block || addr?.block || '';
   const streetVal = snap.street || o.street || addr?.street || '';
   const avenueVal = snap.avenue || o.avenue || o.addressJaddah || addr?.jaddah || '';
   const houseVal = snap.house || o.house || addr?.building || addr?.house || '';
   const floorVal = snap.floor || o.floor || addr?.floor || '';
   const apartmentVal = snap.apartment || o.apartment || addr?.apartment || '';
   const calculatedAddressFull = o.fullAddress || snap.fullAddress || addressText(addr, o.area || o.regionId || c.area);

   return {
     ...o,
     customerName: o.customerName,
     customerPhone: o.customerPhone,
     addressFull: calculatedAddressFull,
     address: json(o.address),
     items: json(o.items),
     splitParticipants: json(o.splitParticipants),
     splitPayments: json(o.splitPayments),
     area: areaVal,
     block: blockVal,
     street: streetVal,
     avenue: avenueVal,
     house: houseVal,
     floor: floorVal,
     apartment: apartmentVal,
     "المنطقة": areaVal,
     "القطعة": blockVal,
     "الشارع": streetVal,
     "الجادة": avenueVal,
     "المنزل": houseVal,
     "الدور": floorVal,
     "الشقة": apartmentVal,
     "العنوان الكامل": calculatedAddressFull,
     rawOrder: json(o)
   };
 });
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(orderRows), "Orders");

 const customerRows = (data?.customers || []).map((c: any) => {
   const addr = c.address || c.detailedAddress;
   return {
     ...c,
     addressFull: addressText(addr, c.area),
     addressRegion: addr?.region || '',
     addressArea: addr?.area || c.area || '',
     addressBlock: addr?.block || '',
     addressStreet: addr?.street || '',
     addressJaddah: addr?.jaddah || '',
     addressBuilding: addr?.building || addr?.house || '',
     addressFloor: addr?.floor || '',
     addressApartment: addr?.apartment || '',
     addressNotes: addr?.notes || '',
     address: json(addr),
     rawCustomer: json(c)
   };
 });
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customerRows), "Customers");

 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data?.products || []).map(normalizeExportProduct)),"Products");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(((data as any)?.productCategories || (data as any)?.settings?.productCategories || []).map((name: string, index: number) => ({ id: index + 1, name }))),"ProductCategories");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.suppliers || []),"Suppliers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.supplierTransfers || []),"SupplierTransfers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.zones || []),"Zones");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.expenses || []),"Expenses");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.testimonials || []),"Testimonials");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.pulseAnalysisHistory || []),"PulseHistory");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.pulseReviews || []),"QuickPulse");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.campaigns || []),"SmartCampaigns");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.squads || []),"Diwaniyas");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data as any)?.promocodes || []),"PromoCodes");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data as any)?.squadTiers || []),"SquadTiers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data as any)?.diwaniyaTiers || []),"DiwaniyaTiers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data as any)?.aiLearningMemory || []),"SmartLearningMemory");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data as any)?.notifications || []),"Notifications");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([((data as any)?.loyaltySettings || {})]),"LoyaltySettings");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([((data as any)?.activeGoal || {})]),"ActiveGoal");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([((data as any)?.settings || {})]),"Settings");
 XLSX.utils.book_append_sheet(wb, createChunkedSheet((data as any)?.pulseArchiveAnalysis || null),"PulseArchiveAnalysis");
 XLSX.utils.book_append_sheet(wb, createChunkedSheet((data as any)?.deepArchiveAnalysis || null),"DeepArchiveAnalysis");
 XLSX.utils.book_append_sheet(wb, createChunkedSheet((data as any)?.nameMatchMemory || {}),"NameMatchMemory");

 const fullStateJson = JSON.stringify(data || {});
 const fullStateChunks = fullStateJson.match(/[\s\S]{1,30000}/g) || ['{}'];
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fullStateChunks.map((chunk, index) => ({ part: index + 1, chunk }))), "FullState");

 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ exportedAt: new Date().toISOString(), invoices: invoiceRows.length, invoiceItems: invoiceItems.length, customers: customerRows.length, payers: payerRows.length, orders: orderRows.length, products: (data?.products || []).length, suppliers: (data?.suppliers || []).length, expenses: (data?.expenses || []).length, exportedSheets: (Array.isArray(wb.SheetNames) ? wb.SheetNames : []).join(', ') }]),"Summary");
 XLSX.writeFile(wb, `KTK_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
 };

 const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 const reader = new FileReader();
 const isJson = file.name.endsWith('.json');

 reader.onload = (event) => {
 try {
 const result = event.target?.result;
 if (!result) throw new Error("File result is empty");

 if (isJson) {
  const importedData = JSON.parse(result as string);
  
  if (importedData && typeof importedData === 'object') {
     // VALIDATE JSON is actually an app backup
     const hasValidKeys = Array.isArray(importedData.products) || Array.isArray(importedData.invoices) || Array.isArray(importedData.orders) || Array.isArray(importedData.customers);
     if (!hasValidKeys) {
         addToast('فشل الاستيراد', 'هذا الملف ليس نسخة احتياطية صالحة للنظام. لم يتم تغيير أي بيانات.', 'warning');
         return;
     }
 let processedZones = INITIAL_DATA.zones;
 if (importedData.zones) {
 const hasOldZones = importedData.zones.some((z: any) => ['الشويخ التجارية', 'المقبرة', 'أم العيش', 'الحزام الأخضر', 'الصليبية الزراعية', 'الصليبية الصناعية'].includes(z.name));
 if (hasOldZones) {
 const zoneMap = new Map(importedData.zones.map((z: any) => [z.name, z]));
 processedZones = INITIAL_DATA.zones.map(z => {
 const existing = zoneMap.get(z.name) as any;
 return existing ? { ...z, cost: existing.cost, profit: existing.profit, finalPrice: existing.finalPrice, isActive: existing.isActive } : z;
 });
 } else {
 processedZones = [...importedData.zones].sort((a: any, b: any) => a.name.localeCompare(b.name, 'ar'));
 }
 }

 const validatedData: AppState = {
 ...INITIAL_DATA,
 ...importedData,
 zones: processedZones
 };
 if (appMode === 'cloud' && onCloudImport) {
  addToast('جاري الرفع سحابياً', 'يتم مزامنة النسخة الاحتياطية سحابياً لتلافي الفقدان...', 'info');
  onCloudImport(validatedData)
    .then(() => {
      addToast('تمت العملية', 'تم استيراد النسخة ومزامنتها سحابياً بنجاح ✨', 'success');
    })
    .catch((err) => {
      console.error("Cloud import failed:", err);
      addToast('فشل الحفظ', 'فشل تخزين النسخة سحابياً: ' + (err instanceof Error ? err.message : String(err)), 'warning');
    });
 } else {
  setData(validatedData);
  addToast('تمت العملية', 'تم استيراد البيانات والتحليلات محلياً بنجاح', 'success');
 }
 } else {
 throw new Error("Invalid JSON structure");
 }
 } else {
 const dataArray = new Uint8Array(result as ArrayBuffer);
  const workbook = XLSX.read(dataArray, { type: 'array' });
  
  // VALIDATE XLSX is actually a KT backup (must contain at least one known sheet)
  const knownSheets = ["FullState", "Invoices", "Products", "Orders", "Customers", "Summary", "Expenses"];
  const hasKnownSheet = workbook.SheetNames.some(s => knownSheets.includes(s));
  if (!hasKnownSheet) {
      addToast('فشل الاستيراد', 'ملف Excel غير متوافق. الرجاء رفع نسخة احتياطية صحيحة.', 'warning');
      return;
  }
  
  const safeSheetToObj = (sheetName: string) => {
 if (workbook.SheetNames.includes(sheetName)) {
 return XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]) || [];
 }
 return [];
 };

 const parseSafeJson = (str: any, isArray: boolean = false) => {
 if (isArray && Array.isArray(str)) return str;
 if (typeof str !== 'string') return isArray ? [] : (str || null);
 let cleanStr = str.replace(/[“”]/g, '"');
 let result;
 try {
 result = JSON.parse(cleanStr);
 } catch (e1) {
 try {
 const deCsv = cleanStr.substring(cleanStr.startsWith('"') ? 1 : 0, cleanStr.endsWith('"') ? cleanStr.length - 1 : cleanStr.length).replace(/""/g, '"');
 result = JSON.parse(deCsv);
 } catch (e2) {
 try {
 result = new Function("return" + cleanStr)();
 } catch (e3) {
 return isArray ? [] : null;
 }
 }
 }
 if (typeof result === 'string') {
 try { result = JSON.parse(result); } catch(e4) {
 try { result = new Function("return" + result)(); } catch(e5) {}
 }
 }
 if (isArray && !Array.isArray(result)) return [];
 return result;
 };

 const parseChunkedSheet = (sheetName: string, isArray: boolean = false) => {
   if (!workbook.SheetNames.includes(sheetName)) return isArray ? [] : null;
   const rows = (safeSheetToObj(sheetName) || []) as any[];
   if (!Array.isArray(rows) || rows.length === 0) return isArray ? [] : null;
   const hasChunk = rows.some((r: any) => r.chunk !== undefined);
   if (hasChunk) {
     const joined = rows
       .sort((a: any, b: any) => Number(a.part || 0) - Number(b.part || 0))
       .map((row: any) => String(row.chunk || ''))
       .join('');
     return parseSafeJson(joined, isArray);
   }
   return parseSafeJson(rows[0]?.value, isArray);
 };

 const stripUndefined = (obj: any): any => {
 if (Array.isArray(obj)) return obj.map(stripUndefined);
 if (obj && typeof obj === 'object') {
 const cleaned: any = {};
 for (const key in obj) {
 if (obj[key] !== undefined) {
 cleaned[key] = stripUndefined(obj[key]);
 }
 }
 return cleaned;
 }
 return obj;
 };

 const makeAddressFromRow = (row: any) => {
   const parsed = normalizeAddressObject(parseSafeJson(row.address, false)) || normalizeAddressObject(parseSafeJson(row.rawAddress, false)) || normalizeAddressObject(parseSafeJson(row.detailedAddress, false));
   if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && !parsed.fullText) return parsed;
   const fullText = parsed?.fullText || row.addressFull || '';
   const address = {
     region: row.addressRegion || row.region || row.governorate || row.area || '',
     area: row.addressArea || row.area || '',
     block: row.addressBlock || row.block || '',
     street: row.addressStreet || row.street || '',
     jaddah: row.addressJaddah || row.jaddah || '',
     building: row.addressBuilding || row.building || row.house || '',
     floor: row.addressFloor || row.floor || '',
     apartment: row.addressApartment || row.apartment || '',
     notes: row.addressNotes || row.notesAddress || ''
   };
   return Object.values(address).some(Boolean) ? address : (fullText ? { fullText } : undefined);
 };
 const restoreCustomerRow = (row: any) => {
   const raw = parseSafeJson(row.rawCustomer, false);
   const base = raw && typeof raw === 'object' ? { ...raw, ...row } : { ...row };
   const address = makeAddressFromRow(row);
   delete base.rawCustomer;
   delete base.addressFull;
   if (address) base.address = address;
   return stripUndefined(base);
 };
 const restoreProductRow = (row: any) => {
   const raw = parseSafeJson(row.rawProduct, false);
   const base = raw && typeof raw === 'object' ? { ...raw, ...row } : { ...row };
   const addons = parseSafeJson(row.addons, true);
   const addOns = parseSafeJson(row.addOns, true);
   const extras = parseSafeJson(row.extras, true);
   if (addons.length) base.addons = addons;
   if (addOns.length) base.addOns = addOns;
   if (extras.length) base.extras = extras;
   delete base.rawProduct;
   return stripUndefined(base);
 };

 let baseState: any = {};
 if (workbook.SheetNames.includes("FullState")) {
    const fullStateRows = (safeSheetToObj("FullState") || []) as any[];
    const joinedJson = (Array.isArray(fullStateRows) ? fullStateRows : [])
      .sort((a: any, b: any) => Number(a.part || 0) - Number(b.part || 0))
      .map((row: any) => String(row.chunk || ''))
      .join('');
    if (joinedJson.trim()) {
      baseState = JSON.parse(joinedJson);
    }
  }

 const newState: AppState = {
  ...INITIAL_DATA,
  ...baseState,
  products: workbook.SheetNames.includes("Products") ? (safeSheetToObj("Products") as any[]).map(restoreProductRow) as any as Product[] : (baseState.products || data.products || INITIAL_DATA.products),
  customers: workbook.SheetNames.includes("Customers") ? (safeSheetToObj("Customers") as any[]).map(restoreCustomerRow) as any as Customer[] : (baseState.customers || data.customers || INITIAL_DATA.customers),
  invoices: baseState.invoices || data.invoices || INITIAL_DATA.invoices, 
  orders: baseState.orders || data.orders || INITIAL_DATA.orders, 
  zones: baseState.zones || data.zones || INITIAL_DATA.zones,
  supplierTransfers: baseState.supplierTransfers || data.supplierTransfers || INITIAL_DATA.supplierTransfers,
  expenses: workbook.SheetNames.includes("Expenses") ? stripUndefined(safeSheetToObj("Expenses")) as any as Expense[] : (baseState.expenses || []),
  suppliers: workbook.SheetNames.includes("Suppliers") ? stripUndefined(safeSheetToObj("Suppliers")) as any as Supplier[] : (baseState.suppliers || []),
  testimonials: workbook.SheetNames.includes("Testimonials") ? stripUndefined(safeSheetToObj("Testimonials")) as any as Testimonial[] : (baseState.testimonials || []),
  pulseAnalysisHistory: workbook.SheetNames.includes("PulseHistory") ? stripUndefined(safeSheetToObj("PulseHistory")) as any as PulseAnalysisRecord[] : (baseState.pulseAnalysisHistory || []),
  pulseReviews: workbook.SheetNames.includes("QuickPulse") ? stripUndefined(safeSheetToObj("QuickPulse")) as any as any[] : (baseState.pulseReviews || []),
  campaigns: (() => { const legacy = "A" + "ICampaigns"; const sheet = workbook.SheetNames.includes("SmartCampaigns") ? "SmartCampaigns" : (workbook.SheetNames.includes(legacy) ? legacy : ""); return sheet ? stripUndefined(safeSheetToObj(sheet)) as any as AICampaign[] : (baseState.campaigns || []); })(),
  promocodes: workbook.SheetNames.includes("PromoCodes") ? stripUndefined(safeSheetToObj("PromoCodes")) as any : (baseState.promocodes || []),
  squads: workbook.SheetNames.includes("Diwaniyas") ? stripUndefined(safeSheetToObj("Diwaniyas")) as any : (baseState.squads || []),
  squadTiers: workbook.SheetNames.includes("SquadTiers") ? stripUndefined(safeSheetToObj("SquadTiers")) as any : (baseState.squadTiers || []),
  diwaniyaTiers: workbook.SheetNames.includes("DiwaniyaTiers") ? stripUndefined(safeSheetToObj("DiwaniyaTiers")) as any : (baseState.diwaniyaTiers || []),
  aiLearningMemory: (() => { const legacy = "A" + "ILearningMemory"; const sheet = workbook.SheetNames.includes("SmartLearningMemory") ? "SmartLearningMemory" : (workbook.SheetNames.includes(legacy) ? legacy : ""); return sheet ? stripUndefined(safeSheetToObj(sheet)) as any : (baseState.aiLearningMemory || []); })(),
  notifications: workbook.SheetNames.includes("Notifications") ? stripUndefined(safeSheetToObj("Notifications")) as any : (baseState.notifications || []),
  loyaltySettings: workbook.SheetNames.includes("LoyaltySettings") ? (safeSheetToObj("LoyaltySettings") as any[])[0] as any || baseState.loyaltySettings || (INITIAL_DATA as any).loyaltySettings : (baseState.loyaltySettings || (INITIAL_DATA as any).loyaltySettings),
  activeGoal: workbook.SheetNames.includes("ActiveGoal") ? (safeSheetToObj("ActiveGoal") as any[])[0] as any || baseState.activeGoal : baseState.activeGoal,
  pulseArchiveAnalysis: workbook.SheetNames.includes("PulseArchiveAnalysis") ? parseChunkedSheet("PulseArchiveAnalysis", false) : baseState.pulseArchiveAnalysis,
  deepArchiveAnalysis: workbook.SheetNames.includes("DeepArchiveAnalysis") ? parseChunkedSheet("DeepArchiveAnalysis", false) : baseState.deepArchiveAnalysis,
  nameMatchMemory: workbook.SheetNames.includes("NameMatchMemory") ? parseChunkedSheet("NameMatchMemory", false) || {} : (baseState.nameMatchMemory || {}),
  settings: (workbook.SheetNames.includes("Settings") ? (safeSheetToObj("Settings") as any[])[0] as any : null) || baseState.settings || data.settings || INITIAL_DATA.settings,
  };
 
 if (workbook.SheetNames.includes("Invoices")) {
 const invoiceItemsRows = safeSheetToObj("InvoiceItems") as any[];
 const invoiceItemsByInvoice = new Map<string, any[]>();
 invoiceItemsRows.forEach((row: any) => {
   const invoiceId = String(row.invoiceId || '').trim();
   if (!invoiceId) return;
   const rawItem = parseSafeJson(row.rawItem, false);
   const restoredItem = rawItem && typeof rawItem === 'object' ? { ...rawItem } : {
     productId: row.productId,
     quantity: Number(row.quantity || 1),
     priceAtTime: Number(row.priceAtTime || 0),
     costAtTime: Number(row.costAtTime || 0),
     itemNotes: row.itemNotes || '',
     addons: parseSafeJson(row.addons, true)
   };
   if (!invoiceItemsByInvoice.has(invoiceId)) invoiceItemsByInvoice.set(invoiceId, []);
   invoiceItemsByInvoice.get(invoiceId)!.push(stripUndefined(restoredItem));
 });
 const invoicesSheet = workbook.Sheets["Invoices"];
 const rawInvoices = XLSX.utils.sheet_to_json(invoicesSheet) as any[];
 newState.invoices = rawInvoices.map(inv => {
 const isDeleted = inv.isDeleted === true || inv.isDeleted ==="TRUE" || inv.isDeleted ==="true";
 const parsedItems = parseSafeJson(inv.items, true);
 const itemRows = invoiceItemsByInvoice.get(String(inv.id || '').trim()) || [];
 const parsedAddress = parseSafeJson(inv.address, false) || parseSafeJson(inv.rawAddress, false) || makeAddressFromRow(inv) || inv.address;
 const parsedDeliveryInfo = parseSafeJson(inv.deliveryInfo, false) || inv.deliveryInfo;
 
 return stripUndefined({ 
 ...inv, 
 isDeleted, 
 items: parsedItems.length ? parsedItems : itemRows, 
 address: typeof parsedAddress === 'object' ? parsedAddress : inv.address,
 deliveryInfo: typeof parsedDeliveryInfo === 'object' && parsedDeliveryInfo !== null ? parsedDeliveryInfo : undefined
 });
 });
 }

 if (workbook.SheetNames.includes("Orders")) {
 const ordersSheet = workbook.Sheets["Orders"];
 const rawOrders = XLSX.utils.sheet_to_json(ordersSheet) as any[];
 newState.orders = rawOrders.map(o => {
 const parsedItems = parseSafeJson(o.items, true);
 const parsedAddress = parseSafeJson(o.address, false) || makeAddressFromRow(o) || o.address;
 const rawOrder = parseSafeJson(o.rawOrder, false);
 const merged = rawOrder && typeof rawOrder === 'object' ? { ...rawOrder, ...o } : { ...o };
 delete merged.rawOrder;
 delete merged.addressFull;
 delete merged.addressRegion;
 delete merged.addressArea;
 delete merged.addressBlock;
 delete merged.addressStreet;
 delete merged.addressJaddah;
 delete merged.addressBuilding;
 delete merged.addressFloor;
 delete merged.addressApartment;
 delete merged.addressNotes;
 return stripUndefined({ ...merged, items: parsedItems, address: typeof parsedAddress === 'object' ? parsedAddress : o.address });
 });
 }
 if (workbook.SheetNames.includes("Zones")) {
 newState.zones = stripUndefined(safeSheetToObj("Zones")) as any as Zone[];
 }
 if (workbook.SheetNames.includes("SupplierTransfers")) {
 newState.supplierTransfers = stripUndefined(safeSheetToObj("SupplierTransfers")) as any as SupplierTransfer[];
 }

 const finalizedState = recalculateStateBalances(newState);
 setTimeout(() => {
 try {
  if (appMode === 'cloud' && onCloudImport) {
    addToast('جاري الرفع سحابياً', 'يتم رفع ومزامنة بيانات Excel سحابياً...', 'info');
    onCloudImport(finalizedState)
      .then(() => {
        addToast('تمت العملية', 'تم استيراد بيانات Excel ومزامنتها سحابياً بنجاح ✨', 'success');
      })
      .catch((err) => {
        console.error("Cloud Excel import failed:", err);
        // Keep the imported file visible locally without overwriting another cloud account.
        setData(finalizedState);
        try {
          setProtectedStorageItem('ktk_cloud_offline_snapshot_last_good', JSON.stringify(finalizedState));
          setProtectedStorageItem('ktk_cloud_offline_snapshot', JSON.stringify(finalizedState));
        } catch (storageErr) {
          console.warn('Could not keep imported cloud fallback locally:', storageErr);
        }
        addToast('فشل الحفظ السحابي', 'تم إبقاء الاستيراد محلياً داخل هذا المتصفح، لكن Firestore رفض الحفظ: ' + (err instanceof Error ? err.message : String(err)), 'warning');
      });
  } else {
    setData(finalizedState);
    addToast('تمت العملية', 'تم استيراد بيانات Excel ومزامنة الأرصدة محلياً بنجاح', 'success');
  }
 } catch (renderError) {
  console.error("CRITICAL RENDER ERROR during import:", renderError);
  addToast('خلل في العرض', 'استوردنا البيانات بس التطبيق ما قدر يعرضها.', 'warning');
 }
 }, 150);
 }
 } catch (error) {
 console.error("Import error:", error);
 addToast('خطأ', 'ما قدرنا نقرأ الملف أو التنسيق مو صحيح: ' + (error instanceof Error ? error.message : ''), 'warning');
 }
 };

 if (isJson) {
 reader.readAsText(file);
 } else {
 reader.readAsArrayBuffer(file);
 }
 };

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;

 if (file.size > 5 * 1024 * 1024) {
 toast.error("حجم الشعار كبير جداً (الحد الأقصى 5 ميجابايت)");
 return;
 }

 const reader = new FileReader();
 reader.onload = (event) => {
 const img = new Image();
 img.onload = () => {
 try {
 const canvas = document.createElement('canvas');
 let max_size = 256;
 let width = img.width;
 let height = img.height;

 if (width > height) {
 if (width > max_size) {
 height *= max_size / width;
 width = max_size;
 }
 } else {
 if (height > max_size) {
 width *= max_size / height;
 height = max_size;
 }
 }

 canvas.width = width;
 canvas.height = height;
 const ctx = canvas.getContext('2d');
 ctx?.drawImage(img, 0, 0, width, height);

 // Compress logo payload
 const dataUrl = canvas.toDataURL('image/png', 0.8);
 setSettings({ ...settings, companyLogo: dataUrl });
 toast.success("تم رفع وتقليل حجم الشعار بنجاح ✅");
 } catch (err) {
 console.error("Logo process error:", err);
 toast.error("تعطلت معالجة أبعاد الشعار");
 }
 };
 if (event.target?.result) {
 img.src = event.target.result as string;
 }
 };
 reader.readAsDataURL(file);
 };

 return (
 <div className="space-y-6 text-right" dir="rtl">
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:p-4">
 <div className="lg:col-span-2 space-y-6">
 {/* Profile Settings */}
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'profile' ? '' : 'profile')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
 >
 <div className="flex items-center gap-3">
 <Shield size={20} className="text-secondary" />
 <h2 className="font-bold">بيانات المنشأة</h2>
 </div>
 <div className="flex items-center gap-4">
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold mr-auto">
 <AlertTriangle size={12} />
 <span>مغلق في النسخة التجريبية</span>
 </div>
)}
 <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-300", activeSection === 'profile' ?"rotate-180" :"")} />
 </div>
 </button>
 <div className={cn("transition-all duration-300 relative", activeSection === 'profile' ? "block" : "hidden")}>
 <div className="p-3 md:p-4 space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700">اسم الشركة</label>
 <input
 type="text"
 value={settings.companyName}
 onChange={e => setSettings({ ...settings, companyName: e.target.value })}
 
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
 />
 </div>
 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700">رسوم بوابة الدفع (فلس)</label>
 <div className="relative">
 <input
 type="number"
 step="0.25"
 value={settings.gatewayFeeAmount}
 onChange={e => setSettings({ ...settings, gatewayFeeAmount: parseFloat(e.target.value) })}
 
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 pl-12 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
 />
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
 فلس
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <label className="text-sm font-medium text-slate-700 block">شعار الشركة <span className="hidden sm:inline text-slate-400 font-normal hover:text-slate-500">(خلفية شفافة)</span></label>
 <div className="flex items-center gap-3 md:p-4">
 <LogoEngine 
 src={settings.companyLogo || DEFAULT_GLOBAL_LOGO} 
 size="xl" 
 variant="royal"
 />
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-3">
 <label className={cn("flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit", appMode === 'local' ? "bg-slate-100 text-slate-500 border-slate-200/60 cursor-not-allowed" : "text-secondary font-bold bg-secondary/5 border-secondary/20 hover:bg-secondary/10 cursor-pointer")}>
 <Upload size={16} />
 {appMode === 'local' ? 'مغلق في التجريبي' : 'تغيير الشعار'}
 <input type="file"  accept="image/*" className="hidden" onChange={handleLogoUpload} />
 </label>
 
 {settings.companyLogo && (
 <button 
 
 onClick={() => setSettings({ ...settings, companyLogo: '' })}
 className={cn("flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit", appMode === 'local' ? "bg-slate-100 text-slate-500 border-slate-200/60 cursor-not-allowed" : "text-rose-500 font-bold bg-rose-50 border-rose-100 hover:bg-rose-100 cursor-pointer")}
 >
 <RefreshCw size={16} />
 إزالة الشعار
 </button>
)}
 </div>
 <p className="text-xs text-slate-500">يفضل أن يكون الشعار بصيغة PNG وبخلفية شفافة لأفضل مظهر.</p>
 </div>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium text-slate-700">أرقام الواتساب (للفواتير - افصل بينها بفاصلة)</label>
 <div className="flex gap-2">
 <input
 type="text"
 placeholder="أضف أرقام (مثال: 96512345678, 96587654321)"
 value={Array.isArray(settings?.restaurantNumbers) ? settings.restaurantNumbers.join(', ') : ''}
 onChange={e => setSettings({ ...settings, restaurantNumbers: e.target.value.split(',').map(s => s.trim()) })}
 
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
 />
 </div>
 </div>
 </div>
 </div>
 </section>

 
        {/* Notifications Section */}
        <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
          <button 
            onClick={() => setActiveSection(activeSection === 'notifications' ? '' : 'notifications')}
            className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-secondary" />
              <h2 className="font-bold">إشعارات النظام</h2>
            </div>
            <div className="flex items-center gap-4">
              <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-300", activeSection === 'notifications' ? "rotate-180" : "")} />
            </div>
          </button>
          <div className={cn("transition-all duration-300 relative", activeSection === 'notifications' ? "block" : "hidden")}>
            <div className="p-3 md:p-4 space-y-4">
              <div className="flex flex-col gap-2">
                <p className="text-sm text-slate-500 font-bold mb-2">تفعيل الإشعارات للحصول على التنبيهات الفورية من النظام.</p>
                {appMode === 'local' ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-6 py-3 text-slate-400 border border-slate-200/60 font-bold cursor-not-allowed w-fit" aria-disabled="true">
                    <Bell size={18} />
                    <span>تفعيل الإشعارات غير متاح للحساب المحلي</span>
                  </div>
                ) : (
                  <EnableNotificationsButton userId={auth?.currentUser?.uid || "local_user"} restaurantId="kitchen_default" />
                )}
              </div>
            </div>
          </div>
        </section>

{/* Zones Management Section */}
  <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'zones' ? '' : 'zones')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <MapIcon size={18} className="text-secondary" />
 <h2 className="font-bold">قائمة مناطق التوصيل</h2>
 </div>
 <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-300 absolute left-4", activeSection === 'zones' ?"rotate-180" :"")} />
 </button>
 <div className={cn("transition-all duration-300", activeSection === 'zones' ?"block" :"hidden")}>
 <div className="p-3 border-b border-slate-200/60 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
 <div className="flex items-center gap-3 flex-1 min-w-[200px]">
 <div className="relative w-full max-w-sm">
 <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
 <input 
 type="text"
 placeholder="بحث عن منطقة..."
 value={searchZoneTerm}
 onChange={(e) => setSearchZoneTerm(normalizeArabicNumerals(e.target.value))}
 className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200/60 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
 />
 </div>
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold">
 <AlertTriangle size={12} />
 <span>مغلق التجريبية</span>
 </div>
)}
 </div>
 <button
 
 onClick={(e) => {
 e.stopPropagation();
 const newZone: Zone = {
 id: `z-${Date.now()}`,
 name: 'منطقة جديدة',
 cost: 2.000,
 profit: 0,
 finalPrice: 2.000,
 isActive: true
 };
 setData(prev => ({ ...prev, zones: [newZone, ...(prev.zones || [])] }));
 }}
 className={cn(
"px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-colors",
 appMode === 'local' 
 ?"bg-slate-100 text-slate-500 cursor-not-allowed opacity-60"
 :"bg-primary/10 text-primary hover:bg-primary hover:text-white"
)}
 >
 <Plus size={14} /> إضافة منطقة
 </button>
 </div>
 <div className="p-3 md:p-4 overflow-x-auto">
 <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-200/60 rounded-xl relative">
 {appMode === 'local' && (
 <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-20 cursor-not-allowed cursor-not-allowed" />
)}
 <table className="w-full text-right min-w-[600px]" dir="rtl">
 <thead className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase sticky top-0 z-10 shadow-sm shadow-slate-200/50">
 <tr>
 <th className="p-3">اسم المنطقة</th>
 <th className="p-3 text-center">تكلفة التوصيل</th>
 <th className="p-3 text-center">الربح</th>
 <th className="p-3 text-center">السعر النهائي</th>
 <th className="p-3 text-left">تفعيل</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
 {(data.zones || []).filter((z) => !searchZoneTerm || normalizeArabic(z.name).includes(normalizeArabic(searchZoneTerm))).map((zone, index) => (
 <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
 <td className="p-3">
 <input 
 type="text" 
 
 value={zone.name}
 onChange={(e) => {
 const val = e.target.value;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, name: val } : z)
 }));
 }}
 className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary outline-none transition-colors w-full px-1 min-w-[120px] disabled:opacity-50"
 />
 </td>
 <td className="p-3">
 <div className="flex justify-center flex-row-reverse">
 <input 
 type="number"
 
 step="0.25"
 value={zone.cost}
 onChange={(e) => {
 const val = parseFloat(e.target.value) || 0;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, cost: val, finalPrice: val + z.profit } : z)
 }));
 }}
 className="w-12 md:w-20 text-center bg-slate-100 border border-slate-200/60 rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
 />
 </div>
 </td>
 <td className="p-3">
 <div className="flex justify-center flex-row-reverse">
 <input 
 type="number"
 
 step="0.25"
 value={zone.profit}
 onChange={(e) => {
 const val = parseFloat(e.target.value) || 0;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, profit: val, finalPrice: z.cost + val } : z)
 }));
 }}
 className="w-12 md:w-20 text-center bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg py-1 px-2 focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-50"
 />
 </div>
 </td>
 <td className="p-3">
 <div className="flex justify-center flex-row-reverse">
 <input 
 type="number"
 
 step="0.25"
 value={zone.finalPrice}
 onChange={(e) => {
 const val = parseFloat(e.target.value) || 0;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, finalPrice: val, profit: val - z.cost } : z)
 }));
 }}
 className="w-12 md:w-20 text-center bg-primary/5 border border-primary/20 text-primary font-bold rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
 />
 </div>
 </td>
 <td className="p-3 text-left">
 <button 
 
 onClick={() => {
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z)
 }));
 }}
 className={cn("text-[10px] px-3 py-1.5 rounded-lg border shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed", zone.isActive ?"bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" :"bg-slate-100 text-slate-500 border-slate-200/60 hover:bg-slate-200")}
 >
 {zone.isActive ? 'مفعل' : 'معطل'}
 </button>
 </td>
 </tr>
))}
 {(data.zones || []).length === 0 && (
 <tr key="empty-state">
 <td colSpan={5} className="p-3 md:p-4 text-center text-slate-500 font-bold text-xs">ماكو مناطق، أضف منطقة أو استرجع البيانات.</td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </section>


 <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'store-status' ? '' : 'store-status')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
 >
 <div className="flex items-center gap-3">
 <Store size={20} className="text-blue-500" />
 <h2 className="font-bold">حالة المتجر الإلكتروني (تطبيق العميل)</h2>
 </div>
 <div className="flex items-center gap-4">
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-bold mr-auto">
 <AlertTriangle size={12} />
 <span>مغلق في النسخة التجريبية</span>
 </div>
)}
 <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-300", activeSection === 'store-status' ?"rotate-180" :"")} />
 </div>
 </button>
 <div className={cn("transition-all duration-300 relative", activeSection === 'store-status' ? "block" : "hidden")}>
 <div className="p-3 md:p-4 space-y-6">
 
 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
 <div>
 <h3 className="font-bold text-slate-800">حالة المتجر الفعلية</h3>
 <p className="text-xs text-slate-500">إغلاق وتوقيف استقبال الطلبات من تطبيق العميل بشكل فوري.</p>
 </div>
 <label className="relative inline-flex items-center cursor-pointer">
 <input 
 type="checkbox" 
 className="sr-only peer"
 checked={settings.storeStatus?.manualClose || false}
 onChange={(e) => setSettings(p => ({ 
 ...p, 
 storeStatus: { ...p.storeStatus!, manualClose: e.target.checked }
 }))}
 />
 <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
 </label>
 </div>

 {settings.storeStatus?.manualClose && (
 <div>
 <label className="block text-sm font-bold text-slate-700 mb-2">رسالة الإغلاق أو الخروج عن أوقات العمل</label>
 <textarea 
 value={settings.storeStatus?.closeMessage || ''}
 onChange={e => setSettings(p => ({ ...p, storeStatus: { ...p.storeStatus!, closeMessage: e.target.value } }))}
 
 className="disabled:opacity-50 w-full bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
 placeholder="رسالة تظهر للعميل بدل المتجر. مثال: المعذرة المتجر مسكر، نرجع قريب."
 rows={2}
 />
 </div>
)}

 <div className="border border-slate-200/60 rounded-xl overflow-hidden mt-6">
 <div className="bg-slate-50 p-3 border-b border-slate-200/60 flex justify-between items-center">
 <div>
 <h3 className="font-bold text-slate-800">أوقات العمل المجدولة (حسب أيام الأسبوع)</h3>
 <p className="text-xs text-slate-500 mt-1">يتم فتح وإغلاق المتجر آلياً حسب هذه الأوقات إذا لم يكن الإغلاق اليدوي مفعلاً.</p>
 </div>
 {appMode === 'local' && (
 <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded font-bold">مغلق في التجريبي</span>
 )}
 </div>
 <div className={cn("overflow-x-auto relative", appMode === 'local' ? "opacity-60 pointer-events-none" : "")}>
 <div className="divide-y divide-slate-100 min-w-[350px]">
 {[
 { id: 'sunday', name: 'الأحد' },
 { id: 'monday', name: 'الإثنين' },
 { id: 'tuesday', name: 'الثلاثاء' },
 { id: 'wednesday', name: 'الأربعاء' },
 { id: 'thursday', name: 'الخميس' },
 { id: 'friday', name: 'الجمعة' },
 { id: 'saturday', name: 'السبت' },
 ].map(day => {
 const hours = settings.storeStatus?.openingHours?.[day.id] || { open: '09:00', close: '23:00', enabled: true };
 return (
 <div key={day.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
 <div className="flex items-center gap-4 w-32 shrink-0">
 <label className="relative inline-flex items-center cursor-pointer">
 <input 
 type="checkbox" 
 className="sr-only peer"
 checked={hours.enabled}
 onChange={(e) => setSettings(p => ({
 ...p,
 storeStatus: {
 ...p.storeStatus!,
 openingHours: {
 ...(p.storeStatus?.openingHours || {}),
 [day.id]: { ...hours, enabled: e.target.checked }
 }
 }
 }))}
 />
 <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
 </label>
 <span className={cn("font-bold text-sm", hours.enabled ?"text-slate-700" :"text-slate-500 line-through")}>{day.name}</span>
 </div>
 
 <div className="flex items-center gap-4 flex-1 justify-end">
 {hours.enabled ? (
 <>
 <div className="flex items-center gap-2">
 <span className="text-slate-500 text-xs font-bold">من</span>
 <input 
 type="time" 
 value={hours.open}
 onChange={(e) => setSettings(p => ({
 ...p,
 storeStatus: {
 ...p.storeStatus!,
 openingHours: {
 ...(p.storeStatus?.openingHours || {}),
 [day.id]: { ...hours, open: e.target.value }
 }
 }
 }))}
 className="bg-white border border-slate-200/60 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
 dir="ltr"
 />
 </div>
 <div className="flex items-center gap-2">
 <span className="text-slate-500 text-xs font-bold">إلى</span>
 <input 
 type="time" 
 value={hours.close}
 onChange={(e) => setSettings(p => ({
 ...p,
 storeStatus: {
 ...p.storeStatus!,
 openingHours: {
 ...(p.storeStatus?.openingHours || {}),
 [day.id]: { ...hours, close: e.target.value }
 }
 }
 }))}
 className="bg-white border border-slate-200/60 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
 dir="ltr"
 />
 </div>
 </>
) : (
 <span className="text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">إجازة (مغلق)</span>
)}
 </div>
 </div>
);
 })}
 </div>
 </div>
 </div>

 </div>
 </div>
 </section>

 <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'data' ? '' : 'data')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200/60 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <Database size={18} className="text-secondary" />
 <h2 className="font-bold">إدارة البيانات والمزامنة</h2>
 </div>
 <ChevronDown size={20} className={cn("text-slate-500 transition-transform duration-300 absolute left-4", activeSection === 'data' ?"rotate-180" :"")} />
 </button>
 <div  className={cn("transition-all duration-300", activeSection === 'data' ?"block" :"hidden")}>
 <div className="p-3 md:p-4 space-y-6">
 <div className={cn(
"p-3 rounded-2xl flex items-center justify-between",
 appMode === 'cloud' ?"bg-emerald-50 border border-emerald-100" :"bg-amber-50 border border-amber-100"
)}>
 <div className="text-right">
 <div className={cn("text-sm font-bold", appMode === 'cloud' ?"text-emerald-800" :"text-amber-800")}>حالة الربط السحابي</div>
 <div className={cn("text-[10px] font-bold mt-0.5", appMode === 'cloud' ?"text-emerald-600" :"text-amber-600")}>
 {appMode === 'cloud' ?"يعمل الآن بميزة المزامنة اللحظية (Real-time Sync)" :"تعمل الآن بوضع التخزين المحلي (Offline Mode)"}
 </div>
 </div>
 <div className={cn(
"flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold text-white",
 appMode === 'cloud' ?"bg-emerald-500" :"bg-amber-500"
)}>
 {appMode === 'cloud' ? (
 <>
 <CheckCircle2 size={12} /> متصل بالسحابة
 </>
) : (
 <>
 <X size={12} /> غير متصل
 </>
)}
 </div>
 </div>

 <div className="space-y-3">
 {appMode === 'local' ? (
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
     <button 
       onClick={() => setShowResetConfirm(true)}
       className="w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700"
     >
       <Trash2 size={18} className="transition-transform group-hover:rotate-12 text-rose-600" />
       <div className="text-right">
         <div className="text-xs font-bold font-sans">تصفير النظام المحلي 🧹</div>
         <div className="text-[10px] opacity-80">
           مسح كافة البيانات وإعادة تصفير النظام بالكامل للبدء مجدداً
         </div>
       </div>
     </button>

     <button 
       onClick={() => {
         const demo = GET_DEMO_DATA();
         setData(demo);
         addToast("تم تحميل النسخة التجريبية", "تم شحن النظام بالبيانات التجريبية الترويجية بنجاح 🧪", "success");
       }}
       className="w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm bg-indigo-50 border-indigo-150 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]"
     >
       <Sparkles size={18} className="group-hover:rotate-12 transition-transform text-amber-500 animate-pulse" />
       <div className="text-right">
         <div className="text-xs font-bold font-sans">تعبئة بيانات تجريبية 🧪</div>
         <div className="text-[10px] opacity-80">
           ملء النظام بالبيانات الترويجية والمبيعات الكاملة فوراً
         </div>
       </div>
     </button>
   </div>
 ) : (
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 {(() => {
    const hasData = (data.invoices && data.invoices.length > 0) || (data.products && data.products.length > 0);
    const isDisabled = hasData;
    
    return (
      <button 
        onClick={() => setShowRestoreConfirm(true)}
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm",
          hasData
            ? "bg-slate-50 border-slate-200/60 text-slate-500 cursor-not-allowed opacity-60"
            : "bg-indigo-50 border-indigo-150 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]"
        )}
      >
        <Sparkles size={18} className={hasData ? "" : "group-hover:rotate-12 transition-transform text-amber-500"} />
        <div className="text-right">
          <div className="text-xs font-bold font-sans">إسترجاع البيانات والملء السريع ⛑️</div>
          <div className="text-[10px] opacity-80">
            {hasData 
              ? "النظام يحتوي على بيانات فعالّة الحين" 
              : "استعادة المبيعات، الفواتير، والعمليات كاملة فوراً"}
          </div>
        </div>
      </button>
    );
  })()}

 <button 
 onClick={handleDownload}
 
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 "bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-700"
)}
 >
  <DownloadCloud size={18} className="transition-transform group-hover:-translate-y-1" />
  <div className="text-right">
  <div className="text-xs font-bold">تصدير نسخة احتياطية</div>
  <div className="text-[10px] opacity-70 italic">
  نسخة شاملة تشمل (نبض العملاء)
  </div>
  </div>
 </button>

 <label 
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 "bg-sky-50 border-sky-100 hover:bg-sky-100 text-sky-700 cursor-pointer"
)}
 >
  <Upload size={18} className="transition-transform group-hover:-translate-y-1" />
  <div className="text-right">
  <div className="text-xs font-bold">استيراد نسخة سابقة</div>
  <div className="text-[10px] opacity-70">
  رفع (JSON, Excel) لمزامنة النظام
  </div>
  </div>
 <input 
 type="file" 
  
 accept=".json,.xlsx,.xls,.csv" 
 className="hidden" 
 onChange={handleImport} 
 />
 </label>

 <button 
 onClick={() => setShowResetConfirm(true)}
 className="w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700"
 >
 <Trash2 size={18} className="transition-transform group-hover:rotate-12 text-rose-600" />
 <div className="text-right">
 <div className="text-xs font-bold font-sans">إعادة تهيئة البيانات</div>
 <div className="text-[10px] opacity-70">
 مسح البيانات التجريبية وتنظيف السجلات للبدء من جديد
 </div>
 </div>
 </button>
 </div>
 )}

 {/* Developer Info - Hidden as requested */}
 {false && (
 <div className="mt-8 p-3 md:p-4 bg-slate-900 text-white rounded-3xl space-y-4 border border-slate-700 shadow-xl">
 {/* ... hidden content ... */}
 </div>
)}
 </div>
 </div>

 {showResetConfirm && createPortal(
 <div 
 className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
 onClick={() => !isResetting && setShowResetConfirm(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl text-center border border-slate-100 flex flex-col max-h-[90vh] overflow-visible"
 onClick={(e) => e.stopPropagation()}
 >
 <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
 <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
 <Trash2 size={40} />
 </div>
 <h3 className="text-2xl font-bold text-slate-800 mb-4">هل أنت متأكد؟</h3>
 <p className="text-slate-500 font-bold mb-8 leading-relaxed">
 هذا الإجراء سيقوم بحذف <span className="text-rose-600 underline">كافة</span> بيانات المبيعات والعملاء والمصروفات نهائياً.
 </p>
 </div>
 <div className="flex flex-col gap-3 pt-5 mt-auto border-t border-slate-100 bg-white">
 <button 
 onClick={handleResetData}
 disabled={isResetting}
 className="w-full py-4 bg-rose-500 disabled:opacity-60 disabled:cursor-wait text-white rounded-2xl font-bold shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-all active:scale-95"
 >
 {isResetting ? 'جاري التنفيذ...' : 'نعم، بمسح كل شيء'}
 </button>
 <button 
 onClick={() => !isResetting && setShowResetConfirm(false)}
 className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
 >
 تراجع
 </button>
 </div>
 </motion.div>
 </div>,
 document.body
)}

 {showRestoreConfirm && createPortal(
  <div 
  className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4 text-right"
  dir="rtl"
  onClick={() => setShowRestoreConfirm(false)}
  >
  <motion.div 
  initial={{ opacity: 0, scale: 0.9, y: 20 }}
  animate={{ opacity: 1, scale: 1, y: 0 }}
  className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-visible"
  onClick={(e) => e.stopPropagation()}
  >
  <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
  <div className="w-20 h-20 bg-indigo-50/80 rounded-full flex items-center justify-center mx-auto mb-6 text-indigo-600">
  <Sparkles size={40} className="animate-pulse text-indigo-600" />
  </div>
  <h3 className="text-xl font-bold text-slate-800 mb-4 font-sans text-center">استرجاع وملء البيانات الطارئ ⛑️</h3>
  <p className="text-slate-500 font-bold mb-8 leading-relaxed text-sm text-center">
  يا طويل العمر، هذا الإجراء بيسترجع لك نسخة شاملة من كافة المبيعات، العملاء والموردين، الفواتير، وهيكل المكافآت والخصومات لإعادة لوحة التحكم للعمل فوراً.
  </p>
  </div>
  <div className="flex flex-col gap-3 pt-5 mt-auto border-t border-slate-100 bg-white">
  <button 
  onClick={handleRestoreBackup}
  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-600/20"
  >
  نعم، استرجع كافة البيانات
  </button>
  <button 
  onClick={() => setShowRestoreConfirm(false)}
  className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
  >
  تراجع
  </button>
  </div>
  </motion.div>
  </div>,
  document.body
 )}
 </div>
 </section>

 {/* Integration API Section - Hidden as requested */}
 {/*
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
 ...
 </section>
 */}
 </div>

 {/* Sidebar Info */}
 <div className="space-y-6">


 <section className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl shadow-lg p-3 md:p-4 text-white text-center">
 <div className="w-12 h-12 md:w-16 md:h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
 <Settings className="animate-spin-slow" size={32} />
 </div>
 <h3 className="font-bold text-lg mb-2">نظام مطبخ التراث</h3>
 <p className="text-white/70 text-sm mb-6">الإصدار 2.6 برو - تم تطويره بكل فخر لدعم نمو عملك.</p>
 </section>
 </div>
 </div>
 </div>
);
};

export default GeneralSettings;
