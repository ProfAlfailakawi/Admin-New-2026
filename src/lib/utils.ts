import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a string or DetailedAddress object into a single human-readable full address string.
 */
export function normalizeAddressObject(address?: any): any {
  if (!address) return null;

  let addr = address;
  if (typeof addr === 'string') {
    const trimmed = addr.trim();
    if (!trimmed) return null;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        addr = JSON.parse(trimmed);
      } catch {
        return { fullText: trimmed };
      }
    } else {
      return { fullText: trimmed };
    }
  }

  if (!addr || typeof addr !== 'object' || Array.isArray(addr)) return null;

  // Some Excel imports stored the address as: { "الأحمدي": { block, street... } }
  const keys = Object.keys(addr);
  const hasDirectFields = ['region', 'area', 'block', 'street', 'jaddah', 'building', 'house', 'floor', 'apartment', 'notes'].some(k => addr[k] !== undefined && addr[k] !== '');
  if (!hasDirectFields && keys.length === 1 && addr[keys[0]] && typeof addr[keys[0]] === 'object') {
    return { region: keys[0], ...(addr[keys[0]] as any) };
  }

  return addr;
}

export function formatFullAddress(address?: any): string {
  const addr = normalizeAddressObject(address);
  if (!addr) return '';
  if (addr.fullText) return String(addr.fullText);

  const parts = [];
  const building = addr.building || addr.house;

  if (addr.region || addr.area) parts.push(`${addr.region || addr.area}`);
  if (addr.block) parts.push(`قطعة ${addr.block}`);
  if (addr.street) parts.push(`شارع ${addr.street}`);
  if (addr.jaddah) parts.push(`جادة ${addr.jaddah}`);
  if (building) parts.push(`منزل ${building}`);
  if (addr.floor) parts.push(`دور ${addr.floor}`);
  if (addr.apartment) parts.push(`شقة ${addr.apartment}`);
  if (addr.notes || addr.addressNotes) parts.push(`${addr.notes || addr.addressNotes}`);

  return parts.filter(Boolean).join(' - ') || '';
}

// Utility to normalize Arabic numerals to English numerals instantly
export const normalizeArabicNumerals = (input: string): string => {
  const ar = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return input.replace(/[٠-٩]/g, (char) => en[ar.indexOf(char)]);
};

// Utility to safely format numbers/currency
export const safeFormatCurrency = (val: number | undefined | null, defaultValue: string = '0.000'): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return defaultValue;
  return Number(val).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
};

export const safeFormatPercent = (val: number | undefined | null, defaultValue: string = '-'): string => {
  if (val === null || val === undefined || isNaN(val) || !isFinite(val)) return defaultValue;
  return (val * 100).toFixed(1) + '%';
};

/**
 * Normalizes Arabic text for searching (removes diacritics, normalizes alif, etc.)
 */
export function normalizeArabic(text: string) {
  if (!text) return "";
  return text
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[ىی]/g, "ي") // Normalize Persian Yeh 'ی' and Alef Maksura 'ى' to Arabic 'ي'
    .replace(/ک/g, "ك") // Normalize Persian Keheh 'ک' to Arabic Kaf 'ك'
    .replace(/[\u064B-\u0652]/g, "") // Remove harakat (diacritics)
    .replace(/[\u200B-\u200D\uFEFF]/g, "") // Remove zero width characters
    .replace(/\s+/g, " "); // Remove extra spaces
}

export function stableStringify(obj: any): string {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return JSON.stringify(obj);
  }
  const keys = Object.keys(obj).sort();
  const sorted: any = {};
  for (const key of keys) {
    sorted[key] = stableStringify(obj[key]);
  }
  return JSON.stringify(sorted);
}

/**
 * Robust normalization specifically for merging duplicate product names
 * Removes symbols, brackets, and ensures uniform spacing.
 */
export function robustNormalize(text: string) {
  if (!text) return "";
  
  // Normalize Arabic characters (Alif, Ya, Ta Marbuta)
  let normalized = normalizeArabic(text);
  
  // Replace brackets and symbols with space to avoid merging words
  // Include arabic punctuations and different comma types
  normalized = normalized.replace(/[()\[\]{}"'.,،؛\-]/g, " ");
  
  // Remove Kashida
  normalized = normalized.replace(/\u0640/g, "");
  
  // Final whitespace cleanup
  return normalized.replace(/\s+/g, " ").trim();
}

/**
 * Splits products into principal products and supplier copies to prevent duplicates
 * from appearing in the customer app's state JSON.
 */
export function splitProductsForDatabase(data: any): any {
  if (!data?.products || !Array.isArray(data.products)) return data;
  
  const principalMap = new Map();
  const copies: any[] = [];
  const principals: any[] = [];
  
  for (const p of data.products) {
      if (!p || !p.name) continue;
      const key = robustNormalize(p.name);
      if (!principalMap.has(key)) {
          principalMap.set(key, true);
          principals.push(p);
      } else {
          copies.push(p);
      }
  }
  
  return {
      ...data,
      products: principals,
      supplierCopies: copies
  };
}

/**
 * Recombines principal products and supplier copies from the database
 * back into a single products array for the Admin app's local state.
 */
export function joinProductsFromDatabase(data: any): any {
  if (!data) return data;
  const result = { ...data };
  if (result.supplierCopies && Array.isArray(result.supplierCopies)) {
      const combined = [...(result.products || []), ...result.supplierCopies];
      const unique = [];
      const seen = new Set();
      for (const p of combined) {
          if (!p || !p.id) { unique.push(p); continue; }
          if (!seen.has(p.id)) {
              seen.add(p.id);
              unique.push(p);
          }
      }
      result.products = unique;
      delete result.supplierCopies;
  }
  return result;
}

export function getUnifiedInvoices(data: any): any[] {
  const invs = Array.isArray(data?.invoices) ? data.invoices.map((i: any) => {
    // Fix for older invoices that incorrectly got 'standard' default from orders
    if (i.deliveryType === 'standard' && (i.linkedOrderId?.startsWith('ORD-') || (i as any).isConvertedFromWebsite) && !i.manuallyModifiedDeliveryType) {
      return { ...i, deliveryType: 'company' };
    }
    return i;
  }) : [];
  const ords = Array.isArray(data?.orders) ? data.orders : [];

  const invIds = new Set(invs.map((i: any) => i.id));
  const mappedOrdOrders = ords
    .filter((o: any) => o.id?.startsWith('ORD-') && !invIds.has(o.id))
    .map((o: any) => {
    let pStatus = o.paymentStatus || 'pending';
    const sTxt = String(o.status || '').toLowerCase();
    const pTxt = String(o.paymentStatus || '').toLowerCase();
    
    if (sTxt.includes('مدفوع') || sTxt.includes('paid') || sTxt === 'تم الدفع وجاري التوصيل' || pTxt === 'paid') {
      pStatus = 'paid';
    } else if (sTxt.includes('ملغي') || sTxt.includes('انتهى وقت') || sTxt.includes('cancel') || pTxt.includes('cancel')) {
      pStatus = 'cancelled';
    } else if (sTxt.includes('فشل') || sTxt.includes('fail') || pTxt.includes('fail') || sTxt.includes('مرفوض')) {
      pStatus = 'failed';
    }
    
    const itemsCost = (o.items || []).reduce((acc: number, item: any) => acc + ((item.costAtTime || 0) * (item.quantity || 1)), 0);
    const amount = Number(o.totalAmount || 0);

    let finalCustomerName = o.customerName || o.customerInfo?.name || o.customer?.name || '';
    if (finalCustomerName === 'بيانات مفقودة') finalCustomerName = o.customerInfo?.name || o.customer?.name || 'عميل عام';
    
    let finalCustomerPhone = o.customerPhone || o.customerInfo?.phone || o.customer?.phone || '';

    return {
      ...o,
      customerName: finalCustomerName,
      customerPhone: finalCustomerPhone,
      paymentStatus: pStatus,
      isORDOrder: true,
      deliveryType: (o.deliveryType === 'standard' && o.id?.startsWith('ORD-')) ? 'company' : (o.deliveryType || 'company'),
      deliveryFee: o.deliveryInfo?.cost || typeof o.deliveryFee === 'number' ? o.deliveryFee : 0,
      totalCost: itemsCost,
      profit: amount - itemsCost,
      discount: o.discount || 0,
      gatewayFee: 0,
      paymentMethod: o.paymentMethod || 'KNet',
      date: o.date || o.createdAt || new Date().toISOString()
    };
  });

  const combined = [...invs, ...mappedOrdOrders];
  const unique = [];
  const handled = new Set();
  for (const item of combined) {
    if (item && item.id && !handled.has(item.id)) {
      handled.add(item.id);
      unique.push(item);
    } else if (!item || !item.id) {
      unique.push(item);
    }
  }
  return unique;
}




export const normalizePhoneDigits = (value: any): string => {
  const normalized = normalizeArabicNumerals(String(value ?? ''));
  return normalized.replace(/\D/g, '').slice(0, 8);
};

export const normalizeAddressNumber = (value: any): string => {
  const normalized = normalizeArabicNumerals(String(value ?? ''));
  return normalized.replace(/\D/g, '');
};

export const formatCustomerAddress = (address: any): string => {
  if (!address) return '';
  if (typeof address === 'string') {
    const raw = address.trim();
    if (!raw) return '';
    try {
      const parsed = JSON.parse(raw);
      return formatCustomerAddress(parsed);
    } catch {
      return raw.replace(/[{}"\\]/g, '').replace(/[:,]+/g, ' ').replace(/\s+/g, ' ').trim();
    }
  }
  if (typeof address !== 'object') return String(address ?? '');
  const candidate: any = Array.isArray(address) ? address[0] : address;
  const region = candidate.region || candidate.area || candidate.city || candidate.governorate || candidate['المنطقة'] || candidate['المحافظة'] || '';
  const block = candidate.block || candidate.qita || candidate['قطعة'] || candidate['القطعة'] || '';
  const street = candidate.street || candidate['شارع'] || candidate['الشارع'] || '';
  const jaddah = candidate.jaddah || candidate.avenue || candidate['جادة'] || candidate['الجادة'] || '';
  const building = candidate.building || candidate.house || candidate.home || candidate['منزل'] || candidate['المنزل'] || '';
  const floor = candidate.floor || candidate['الدور'] || '';
  const apartment = candidate.apartment || candidate.flat || candidate['الشقة'] || '';
  const notes = candidate.notes || candidate.addressNotes || candidate['ملاحظات'] || '';
  const parts = [region, block && `ق ${block}`, street && `ش ${street}`, jaddah && `ج ${jaddah}`, building && `م ${building}`, floor && `دور ${floor}`, apartment && `شقة ${apartment}`, notes].filter(Boolean);
  if (parts.length) return parts.join(' - ');
  const nested = Object.values(candidate).find((v:any) => v && typeof v === 'object');
  return nested ? formatCustomerAddress(nested) : '';
};
