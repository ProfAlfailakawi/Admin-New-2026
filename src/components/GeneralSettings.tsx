import React, { useState } from 'react';
import { toast } from 'sonner';
import { Settings, Save, Upload, Trash2, Shield, Bell, CreditCard, DownloadCloud, Database, Sparkles, RefreshCw, Loader2, Map as MapIcon, Plus, CheckCircle2, ChevronDown, ChevronRight, Edit2, X, AlertTriangle, Code, Store, Search } from 'lucide-react';
import { motion } from 'motion/react';
import LogoEngine from './ui/LogoEngine';
import { AppState, AppSettings, Zone, Product, Customer, Expense, Supplier, Testimonial, PulseAnalysisRecord, AICampaign, SupplierTransfer } from '../types';
import { GET_DEMO_DATA } from '../data';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { doc, setDoc, deleteDoc } from 'firebase/firestore'; 
import { db, auth, getSmartDoc } from '../firebase'; 
import { Toggle } from './ui/Toggle';
import { INITIAL_DATA } from '../data'; 

import { EnableNotificationsButton } from './EnableNotificationsButton';
import { DEFAULT_GLOBAL_LOGO } from '../constants';
import { recalculateStateBalances } from '../lib/business-logic';
import firebaseConfig from '../../firebase-applet-config.json';

interface Props {
 data: AppState;
 setData: React.Dispatch<React.SetStateAction<AppState>>;
 appMode: 'local' | 'cloud';
 switchMode: (newMode: 'local' | 'cloud') => void;
 addToast: (title: string, message: string, type: 'info' | 'success' | 'warning') => void;
}

const GeneralSettings: React.FC<Props> = ({ data, setData, appMode, switchMode, addToast }) => {
 const [settings, setSettings] = useState<AppSettings>(data.settings);
 const [saved, setSaved] = useState(false);
 const [showConfirm, setShowConfirm] = useState(false);
 const [showResetConfirm, setShowResetConfirm] = useState(false);
 const [isSyncing, setIsSyncing] = useState(false);

 const [activeSection, setActiveSection] = useState<string>('');
 const [searchZoneTerm, setSearchZoneTerm] = useState('');

 const handleSyncBalances = () => {
 setIsSyncing(true);
 setTimeout(() => {
 setData(prev => recalculateStateBalances(prev));
 setIsSyncing(false);
 addToast("تمت المزامنة","تمت إعادة حساب مديونيات الموردين وأرصدة العملاء بنجاح.","success");
 }, 800);
 };

 const handleResetData = async () => {
 // 1. Reset Internal State
 setData(INITIAL_DATA);
 
 // 2. Clear Local Storage App Data
 localStorage.removeItem('ktk_accounting_data');
 sessionStorage.removeItem('hideSampleDataPrompt');
 
 // 3. Clear Connection Overrides (Force use of new config)
 localStorage.removeItem('active_firestore_db_id');
 localStorage.removeItem('active_firestore_project_id');

 // 4. Clear Cloud Data if the user is in cloud mode
 const currentUser = auth.currentUser;
 if (appMode === 'cloud' && currentUser) {
 try {
 const dataRef = getSmartDoc('appData', currentUser.uid, currentUser.email);
 await deleteDoc(dataRef);
 } catch (e) {
 console.warn("Could not delete cloud data:", e);
 }
 }
 
 addToast("تم التصفير بالكامل","تمت إزالة كافة البيانات وإعادة ضبط إعدادات الاتصال للبدء بصفحة بيضاء.","warning");
 setShowResetConfirm(false);
 
 // 5. Reload to apply config changes
 setTimeout(() => {
 window.location.reload();
 }, 1000);
 };

 const handleLoadDemo = () => {
 if (appMode === 'cloud') {
 addToast("إجراء مرفوض","لا يمكن تحميل البيانات التجريبية الفرضية أثناء التزامن السحابي لتجنب اختلاطها ببيانات السحابة الحقيقية.","warning");
 return;
 }
 const demo = GET_DEMO_DATA();
 setData(demo);
 sessionStorage.setItem('hideSampleDataPrompt', 'true');
  addToast("تم تحميل البيانات","تم ملء النظام ببيانات تجريبية شاملة للمعاينة.","info");
 };

 const handleSave = () => {
 setData(prev => ({ ...prev, settings }));
 setSaved(true);
 addToast("تم الحفظ بنجاح","تم حفظ إعدادات النظام وتحديثها في السحابة.","success");
 setTimeout(() => setSaved(false), 3000);
 };

 const handleDownload = () => {
 const wb = XLSX.utils.book_new();
 
 // Invoices
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data?.invoices || []).map(i => ({
 ...i, 
 items: JSON.stringify(i.items || []), 
 address: i.address ? JSON.stringify(i.address) : '',
 deliveryInfo: i.deliveryInfo ? JSON.stringify(i.deliveryInfo) : ''
 }))),"Invoices");
 
 // Orders
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet((data?.orders || []).map(o => ({
 ...o, 
 items: JSON.stringify(o.items || []), 
 address: o.address ? JSON.stringify(o.address) : ''
 }))),"Orders");

 // Customers (ensure area is always a key!)
 const customerHeaders = ['id', 'name', 'phone', 'email', 'status', 'lastOrderDate', 'lastActive', 'totalOrders', 'totalSpent', 'loyaltyPoints', 'sentiment', 'area'];
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.customers || [], { header: customerHeaders }),"Customers");

 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.products || []),"Products");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.suppliers || []),"Suppliers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.supplierTransfers || []),"SupplierTransfers");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.zones || []),"Zones");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.expenses || []),"Expenses");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.testimonials || []),"Testimonials");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.pulseAnalysisHistory || []),"PulseHistory");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.pulseReviews || []),"QuickPulse");
 XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data?.campaigns || []),"AICampaigns");
 XLSX.writeFile(wb, `KTK_Backup_${new Date().toISOString().split('T')[0]}.xlsx`);
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
 setData(validatedData);
 addToast('تمت العملية', 'تم استيراد البيانات والتحليلات بنجاح', 'success');
 } else {
 throw new Error("Invalid JSON structure");
 }
 } else {
 const dataArray = new Uint8Array(result as ArrayBuffer);
 const workbook = XLSX.read(dataArray, { type: 'array' });
 
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

 const newState: AppState = {
 ...INITIAL_DATA,
 products: stripUndefined(safeSheetToObj("Products")) as any as Product[],
 customers: stripUndefined(safeSheetToObj("Customers")) as any as Customer[],
 invoices: data.invoices || INITIAL_DATA.invoices, 
 orders: data.orders || INITIAL_DATA.orders, 
 zones: data.zones || INITIAL_DATA.zones,
 supplierTransfers: data.supplierTransfers || INITIAL_DATA.supplierTransfers,
 expenses: stripUndefined(safeSheetToObj("Expenses")) as any as Expense[],
 suppliers: stripUndefined(safeSheetToObj("Suppliers")) as any as Supplier[],
 testimonials: stripUndefined(safeSheetToObj("Testimonials")) as any as Testimonial[],
 pulseAnalysisHistory: stripUndefined(safeSheetToObj("PulseHistory")) as any as PulseAnalysisRecord[],
 pulseReviews: stripUndefined(safeSheetToObj("QuickPulse")) as any as any[],
 campaigns: stripUndefined(safeSheetToObj("AICampaigns")) as any as AICampaign[],
 settings: data.settings || INITIAL_DATA.settings
 };
 
 if (workbook.SheetNames.includes("Invoices")) {
 const invoicesSheet = workbook.Sheets["Invoices"];
 const rawInvoices = XLSX.utils.sheet_to_json(invoicesSheet) as any[];
 newState.invoices = rawInvoices.map(inv => {
 const isDeleted = inv.isDeleted === true || inv.isDeleted ==="TRUE" || inv.isDeleted ==="true";
 const parsedItems = parseSafeJson(inv.items, true);
 const parsedAddress = parseSafeJson(inv.address, false) || inv.address;
 const parsedDeliveryInfo = parseSafeJson(inv.deliveryInfo, false) || inv.deliveryInfo;
 
 return stripUndefined({ 
 ...inv, 
 isDeleted, 
 items: parsedItems, 
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
 const parsedAddress = parseSafeJson(o.address, false) || o.address;
 return stripUndefined({ ...o, items: parsedItems, address: typeof parsedAddress === 'object' ? parsedAddress : o.address });
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
 setData(finalizedState);
 addToast('تمت العملية', 'تم استيراد بيانات Excel ومزامنة الأرصدة بنجاح', 'success');
 } catch (renderError) {
 console.error("CRITICAL RENDER ERROR during import:", renderError);
 addToast('خطأ فادح في العرض', 'تم استيراد البيانات ولكن فشل التطبيق في عرضها.', 'warning');
 }
 }, 150);
 }
 } catch (error) {
 console.error("Import error:", error);
 addToast('خطأ', 'فشل في قراءة الملف أو تنسيق غير صالح: ' + (error instanceof Error ? error.message : ''), 'warning');
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
 toast.error("خطأ في معالجة أبعاد الشعار");
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
 <div className="flex items-center justify-between">
 <div>
 <h1 className="text-2xl font-bold text-slate-900">الإعدادات العامة</h1>
 <p className="text-slate-500">تخصيص وتهيئة النظام المحاسبي لشركة مطبخ التراث الكويتي</p>
 </div>
 <button
 onClick={handleSave}
 disabled={appMode === 'local'}
 className={cn(
"flex items-center gap-2 px-6 py-2 rounded-xl font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95",
 appMode === 'local'
 ?"bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
 :"bg-secondary text-white hover:bg-secondary/90"
)}
 >
 <Save size={20} />
 {appMode === 'local' ? 'مغلق في التجريبي' : (saved ? 'تم الحفظ!' : 'حفظ التغييرات')}
 </button>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:p-4">
 <div className="lg:col-span-2 space-y-6">
 {/* Profile Settings */}
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'profile' ? '' : 'profile')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex items-center justify-between"
 >
 <div className="flex items-center gap-3">
 <Shield size={20} className="text-secondary" />
 <h2 className="font-bold">بيانات المنشأة</h2>
 </div>
 <div className="flex items-center gap-4">
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-black mr-auto">
 <AlertTriangle size={12} />
 <span>مغلق في النسخة التجريبية</span>
 </div>
)}
 <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300", activeSection === 'profile' ?"rotate-180" :"")} />
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
 disabled={appMode === 'local'}
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
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
 disabled={appMode === 'local'}
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 pl-12 border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
 />
 <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">
 فلس
 </div>
 </div>
 </div>
 </div>

 <div className="space-y-4">
 <label className="text-sm font-medium text-slate-700 block">شعار الشركة (خلفية شفافة)</label>
 <div className="flex items-center gap-3 md:p-4">
 <LogoEngine 
 src={settings.companyLogo || DEFAULT_GLOBAL_LOGO} 
 size="xl" 
 variant="royal"
 />
 <div className="flex-1 space-y-2">
 <div className="flex items-center gap-3">
 <label className={cn("flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit", appMode === 'local' ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "text-secondary font-bold bg-secondary/5 border-secondary/20 hover:bg-secondary/10 cursor-pointer")}>
 <Upload size={16} />
 {appMode === 'local' ? 'مغلق في التجريبي' : 'تغيير الشعار'}
 <input type="file" disabled={appMode === 'local'} accept="image/*" className="hidden" onChange={handleLogoUpload} />
 </label>
 
 {settings.companyLogo && (
 <button 
 disabled={appMode === 'local'}
 onClick={() => setSettings({ ...settings, companyLogo: '' })}
 className={cn("flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-colors w-fit", appMode === 'local' ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "text-rose-500 font-bold bg-rose-50 border-rose-100 hover:bg-rose-100 cursor-pointer")}
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
 value={settings.restaurantNumbers.join(', ')}
 onChange={e => setSettings({ ...settings, restaurantNumbers: e.target.value.split(',').map(s => s.trim()) })}
 disabled={appMode === 'local'}
 className="disabled:opacity-50 disabled:bg-slate-50 w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary outline-none transition-all"
 />
 </div>
 </div>
 </div>
 </div>
 </section>

 {/* Zones Management Section */}
 <div className="mb-6"><EnableNotificationsButton userId={auth?.currentUser?.uid || "local_user"} restaurantId="kitchen_default" /></div>
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'zones' ? '' : 'zones')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <MapIcon size={18} className="text-secondary" />
 <h2 className="font-bold">قائمة مناطق التوصيل</h2>
 </div>
 <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300 absolute left-4", activeSection === 'zones' ?"rotate-180" :"")} />
 </button>
 <div className={cn("transition-all duration-300", activeSection === 'zones' ?"block" :"hidden")}>
 <div className="p-3 border-b border-slate-200 bg-slate-50/50 flex flex-wrap justify-between items-center gap-3">
 <div className="flex items-center gap-3 flex-1 min-w-[200px]">
 <div className="relative w-full max-w-sm">
 <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
 <input 
 type="text"
 placeholder="بحث عن منطقة..."
 value={searchZoneTerm}
 onChange={(e) => setSearchZoneTerm(e.target.value)}
 className="w-full pl-3 pr-10 py-1.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold"
 />
 </div>
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-black">
 <AlertTriangle size={12} />
 <span>مغلق التجريبية</span>
 </div>
)}
 </div>
 <button
 disabled={appMode === 'local'}
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
"px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-2 transition-colors",
 appMode === 'local' 
 ?"bg-slate-100 text-slate-400 cursor-not-allowed opacity-60"
 :"bg-primary/10 text-primary hover:bg-primary hover:text-white"
)}
 >
 <Plus size={14} /> إضافة منطقة
 </button>
 </div>
 <div className="p-3 md:p-4 overflow-x-auto">
 <div className="max-h-[300px] overflow-y-auto custom-scrollbar border border-slate-200 rounded-xl relative">
 {appMode === 'local' && (
 <div className="absolute inset-0 bg-slate-50/10 backdrop-blur-[0.5px] z-20 cursor-not-allowed cursor-not-allowed" />
)}
 <table className="w-full text-right min-w-[600px]" dir="rtl">
 <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase sticky top-0 z-10 shadow-sm shadow-slate-200/50">
 <tr>
 <th className="p-3">اسم المنطقة</th>
 <th className="p-3 text-center">تكلفة التوصيل</th>
 <th className="p-3 text-center">الربح</th>
 <th className="p-3 text-center">السعر النهائي</th>
 <th className="p-3 text-left">تفعيل</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
 {(data.zones || []).filter((z) => !searchZoneTerm || z.name.toLowerCase().includes(searchZoneTerm.toLowerCase())).map((zone, index) => (
 <tr key={zone.id} className="hover:bg-slate-50 transition-colors">
 <td className="p-3">
 <input 
 type="text" 
 disabled={appMode === 'local'}
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
 disabled={appMode === 'local'}
 step="0.25"
 value={zone.cost}
 onChange={(e) => {
 const val = parseFloat(e.target.value) || 0;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, cost: val, finalPrice: val + z.profit } : z)
 }));
 }}
 className="w-12 md:w-20 text-center bg-slate-100 border border-slate-200 rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
 />
 </div>
 </td>
 <td className="p-3">
 <div className="flex justify-center flex-row-reverse">
 <input 
 type="number"
 disabled={appMode === 'local'}
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
 disabled={appMode === 'local'}
 step="0.25"
 value={zone.finalPrice}
 onChange={(e) => {
 const val = parseFloat(e.target.value) || 0;
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, finalPrice: val, profit: val - z.cost } : z)
 }));
 }}
 className="w-12 md:w-20 text-center bg-primary/5 border border-primary/20 text-primary font-black rounded-lg py-1 px-2 focus:ring-2 focus:ring-primary/20 outline-none disabled:opacity-50"
 />
 </div>
 </td>
 <td className="p-3 text-left">
 <button 
 disabled={appMode === 'local'}
 onClick={() => {
 setData(prev => ({
 ...prev,
 zones: (prev?.zones || []).map(z => z.id === zone.id ? { ...z, isActive: !z.isActive } : z)
 }));
 }}
 className={cn("text-[10px] px-3 py-1.5 rounded-lg border shadow-sm transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed", zone.isActive ?"bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100" :"bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200")}
 >
 {zone.isActive ? 'مفعل' : 'معطل'}
 </button>
 </td>
 </tr>
))}
 {(data.zones || []).length === 0 && (
 <tr key="empty-state">
 <td colSpan={5} className="p-3 md:p-4 text-center text-slate-400 font-bold text-xs">لا يوجد مناطق، الرجاء إضافة منطقة أو استعادة البيانات.</td>
 </tr>
)}
 </tbody>
 </table>
 </div>
 </div>
 </div>
 </section>


 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'store-status' ? '' : 'store-status')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex items-center justify-between"
 >
 <div className="flex items-center gap-3">
 <Store size={20} className="text-blue-500" />
 <h2 className="font-bold">حالة المتجر الإلكتروني (تطبيق العميل)</h2>
 </div>
 <div className="flex items-center gap-4">
 {appMode === 'local' && (
 <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100 text-[10px] font-black mr-auto">
 <AlertTriangle size={12} />
 <span>مغلق في النسخة التجريبية</span>
 </div>
)}
 <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300", activeSection === 'store-status' ?"rotate-180" :"")} />
 </div>
 </button>
 <div className={cn("transition-all duration-300 relative", activeSection === 'store-status' ? "block" : "hidden")}>
 <div className="p-3 md:p-4 space-y-6">
 
 <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
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
 disabled={appMode === 'local'}
 className="disabled:opacity-50 w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
 placeholder="رسالة تظهر للعميل بدلاً من المتجر. مثال: عذراً المتجر مغلق، نعود قريباً."
 rows={2}
 />
 </div>
)}

 <div className="border border-slate-200 rounded-xl overflow-hidden mt-6">
 <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
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
 <span className={cn("font-bold text-sm", hours.enabled ?"text-slate-700" :"text-slate-400 line-through")}>{day.name}</span>
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
 className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
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
 className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:border-blue-500 font-bold w-28 text-center"
 dir="ltr"
 />
 </div>
 </>
) : (
 <span className="text-sm font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-lg">إجازة (مغلق)</span>
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

 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
 <button 
 onClick={() => setActiveSection(activeSection === 'data' ? '' : 'data')}
 className="w-full relative p-3 bg-slate-50 hover:bg-slate-100 transition-colors border-b border-slate-200 flex items-center justify-between"
 >
 <div className="flex items-center gap-2">
 <Database size={18} className="text-secondary" />
 <h2 className="font-bold">إدارة البيانات والمزامنة</h2>
 </div>
 <ChevronDown size={20} className={cn("text-slate-400 transition-transform duration-300 absolute left-4", activeSection === 'data' ?"rotate-180" :"")} />
 </button>
 <div  className={cn("transition-all duration-300", activeSection === 'data' ?"block" :"hidden")}>
 <div className="p-3 md:p-4 space-y-6">
 <div className={cn(
"p-3 rounded-2xl flex items-center justify-between",
 appMode === 'cloud' ?"bg-emerald-50 border border-emerald-100" :"bg-amber-50 border border-amber-100"
)}>
 <div className="text-right">
 <div className={cn("text-sm font-black", appMode === 'cloud' ?"text-emerald-800" :"text-amber-800")}>حالة الربط السحابي</div>
 <div className={cn("text-[10px] font-bold mt-0.5", appMode === 'cloud' ?"text-emerald-600" :"text-amber-600")}>
 {appMode === 'cloud' ?"يعمل الآن بميزة المزامنة اللحظية (Real-time Sync)" :"تعمل الآن بوضع التخزين المحلي (Offline Mode)"}
 </div>
 </div>
 <div className={cn(
"flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black text-white",
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
 {(() => {
    const hasData = (data.invoices && data.invoices.length > 0) || (data.products && data.products.length > 0);
    const isDisabled = appMode === 'cloud' || hasData;
    
    return (
      <button 
        onClick={handleLoadDemo}
        disabled={isDisabled}
        className={cn(
          "w-full flex items-center justify-between p-3 border rounded-2xl group transition-all shadow-sm",
          appMode === 'cloud' 
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : hasData
            ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
            : "bg-indigo-50 border-indigo-100 hover:bg-indigo-100 text-indigo-700 active:scale-[0.98]"
        )}
      >
        <Sparkles size={18} className={appMode === 'cloud' || hasData ? "" : "group-hover:rotate-12 transition-transform"} />
        <div className="text-right">
          <div className="text-xs font-black">تحميل بيانات تجريبية (Demo)</div>
          <div className="text-[9px] opacity-80">
            {appMode === 'cloud' 
              ? "غير متاح في وضع التزامن السحابي" 
              : hasData 
              ? "النظام يحتوي على بيانات مسبقاً" 
              : "لمعاينة النظام ببيانات واقعية جاهزة"}
          </div>
        </div>
      </button>
    );
  })()}

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
 <button 
 onClick={async () => {
 setIsSyncing(true);
 try {
 const { seedClientDatabase } = await import('../scripts/seed-client-db');
 await seedClientDatabase(data);
 addToast("تمت المزامنة","تم تحديث قائمة المنتجات والمناطق في تطبيق العميل بنجاح.","success");
 } catch (error) {
 addToast("فشل التزامن","حدث خطأ أثناء محاولة تحديث بيانات التطبيق.","warning");
 } finally {
 setIsSyncing(false);
 }
 }}
 disabled={isSyncing || appMode === 'local'}
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 appMode === 'local'
 ?"bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
 :"bg-primary/5 border-primary/10 hover:bg-primary/10 text-primary"
)}
 >
 {isSyncing ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} className={cn("transition-transform duration-700", appMode !== 'local' &&"group-hover:rotate-180")} />}
 <div className="text-right">
 <div className="text-xs font-black">مزامنة تطبيق العميل</div>
 <div className="text-[9px] opacity-70 italic">
 {appMode === 'local' ?"مغلق في النسخة التجريبية" :"نشر المنتجات والمناطق للتطبيق"}
 </div>
 </div>
 </button>

 <button 
 onClick={handleDownload}
 disabled={appMode === 'local'}
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 appMode === 'local'
 ?"bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
 :"bg-emerald-50 border-emerald-100 hover:bg-emerald-100 text-emerald-700"
)}
 >
 <DownloadCloud size={18} className={cn("transition-transform", appMode !== 'local' &&"group-hover:-translate-y-1")} />
 <div className="text-right">
 <div className="text-xs font-black">تصدير نسخة احتياطية</div>
 <div className="text-[9px] opacity-70 italic">
 {appMode === 'local' ?"مغلق حماية للبيانات" :"نسخة شاملة تشمل (نبض العملاء)"}
 </div>
 </div>
 </button>

 <label 
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 appMode === 'local'
 ?"bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
 :"bg-sky-50 border-sky-100 hover:bg-sky-100 text-sky-700 cursor-pointer"
)}
 >
 <Upload size={18} className={cn("transition-transform", appMode !== 'local' &&"group-hover:-translate-y-1")} />
 <div className="text-right">
 <div className="text-xs font-black">استيراد نسخة سابقة</div>
 <div className="text-[9px] opacity-70">
 {appMode === 'local' ?"مغلق حماية من العبث" :"رفع (JSON, Excel) لمزامنة النظام"}
 </div>
 </div>
 <input 
 type="file" 
 disabled={appMode === 'local'} 
 accept=".json,.xlsx,.xls,.csv" 
 className="hidden" 
 onChange={handleImport} 
 />
 </label>

 <button 
 onClick={() => setShowResetConfirm(true)}
 disabled={appMode === 'local'}
 className={cn(
"w-full flex items-center justify-between p-3 border rounded-2xl transition-all shadow-sm active:scale-[0.98] group",
 appMode === 'local'
 ?"bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60"
 :"bg-rose-50 border-rose-100 hover:bg-rose-100 text-rose-700"
)}
 >
 <Trash2 size={18} className={cn("transition-transform", appMode !== 'local' &&"group-hover:rotate-12")} />
 <div className="text-right">
 <div className="text-xs font-black">تصفير النظام</div>
 <div className="text-[9px] opacity-70">
 {appMode === 'local' ?"مغلق حماية من العبث" :"مسح كافة البيانات للبدء من جديد"}
 </div>
 </div>
 </button>
 </div>

 {/* Developer Info - Hidden as requested */}
 {false && (
 <div className="mt-8 p-3 md:p-4 bg-slate-900 text-white rounded-3xl space-y-4 border border-slate-700 shadow-xl">
 {/* ... hidden content ... */}
 </div>
)}
 </div>
 </div>

 {showResetConfirm && (
 <div 
 className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-3"
 onClick={() => setShowResetConfirm(false)}
 >
 <motion.div 
 initial={{ opacity: 0, scale: 0.9, y: 20 }}
 animate={{ opacity: 1, scale: 1, y: 0 }}
 className="bg-white rounded-3xl md:rounded-2xl p-3 md:p-4 md:p-3 max-w-sm w-[95%] shadow-2xl text-center border border-slate-100 flex flex-col max-h-[85vh] overflow-hidden"
 
 >
 <div className="overflow-y-auto custom-scrollbar flex-1 px-1">
 <div className="w-12 md:w-20 h-12 md:h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
 <Trash2 size={40} />
 </div>
 <h3 className="text-2xl font-black text-slate-800 mb-4">هل أنت متأكد؟</h3>
 <p className="text-slate-500 font-bold mb-8 leading-relaxed">
 هذا الإجراء سيقوم بحذف <span className="text-rose-600 underline">كافة</span> بيانات المبيعات والعملاء والمصروفات نهائياً.
 </p>
 </div>
 <div className="flex flex-col gap-3 pt-6 mt-auto border-t border-slate-50">
 <button 
 onClick={handleResetData}
 className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black shadow-xl shadow-rose-500/30 hover:bg-rose-600 transition-all active:scale-95"
 >
 نعم، بمسح كل شيء
 </button>
 <button 
 onClick={() => setShowResetConfirm(false)}
 className="w-full py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
 >
 تراجع
 </button>
 </div>
 </motion.div>
 </div>
)}
 </div>
 </section>

 {/* Integration API Section - Hidden as requested */}
 {/*
 <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
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
 <p className="text-white/70 text-sm mb-6">الإصدار 2.1 برو - تم تطويره بكل فخر لدعم نمو عملك.</p>
 </section>
 </div>
 </div>
 </div>
);
};

export default GeneralSettings;
