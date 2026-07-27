import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { isCancelledStatus, isFailedStatus, isPaidStatus } from './status-utils';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const coerceDateValue = (dateVal: any): Date | null => {
  if (!dateVal) return null;
  try {
    if (dateVal instanceof Date) {
      return Number.isFinite(dateVal.getTime()) ? dateVal : null;
    }
    if (typeof dateVal?.toDate === 'function') {
      const converted = dateVal.toDate();
      return converted instanceof Date && Number.isFinite(converted.getTime()) ? converted : null;
    }
    if (typeof dateVal?.seconds === 'number') {
      const converted = new Date(dateVal.seconds * 1000 + Number(dateVal.nanoseconds || 0) / 1_000_000);
      return Number.isFinite(converted.getTime()) ? converted : null;
    }
    if (typeof dateVal === 'string') {
      const trimmed = dateVal.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed?.seconds === 'number') {
            const converted = new Date(parsed.seconds * 1000 + Number(parsed.nanoseconds || 0) / 1_000_000);
            return Number.isFinite(converted.getTime()) ? converted : null;
          }
        } catch {
          // Fall through to the native date parser for ordinary date strings.
        }
      }
    }
    const converted = new Date(dateVal);
    return Number.isFinite(converted.getTime()) ? converted : null;
  } catch {
    return null;
  }
};

const getKuwaitDateParts = (dateVal: any) => {
  const date = coerceDateValue(dateVal) || new Date();
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
    hour: getPart('hour'),
    minute: getPart('minute'),
    second: getPart('second'),
  };
};

/** Returns the calendar date currently shown in Kuwait, never the UTC date. */
export const getKuwaitDateInputValue = (dateVal: any = new Date()): string => {
  const parts = getKuwaitDateParts(dateVal);
  return `${parts.year}-${parts.month}-${parts.day}`;
};

/**
 * Combines a selected Kuwait calendar day with the current Kuwait clock time.
 * Kuwait is UTC+03:00 year-round, so this avoids the after-midnight UTC rollback
 * that previously stored a new invoice under the previous day.
 */
export const mergeKuwaitDateWithTime = (dateKey: string, timeSource: any = new Date()): string => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const time = coerceDateValue(timeSource) || new Date();
  if (!match) return time.toISOString();

  const clock = getKuwaitDateParts(time);
  const [, year, month, day] = match;
  const utcMillis = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(clock.hour) - 3,
    Number(clock.minute),
    Number(clock.second),
    time.getUTCMilliseconds(),
  );
  return new Date(utcMillis).toISOString();
};

export const getKuwaitDayRange = (dateKey: string): { start: number; end: number } | null => {
  const match = String(dateKey || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match;
  const start = Date.UTC(Number(year), Number(month) - 1, Number(day), -3, 0, 0, 0);
  return { start, end: start + 24 * 60 * 60 * 1000 - 1 };
};

/**
 * Repairs only the recognizable legacy after-midnight timestamp signature for display.
 * It is data-driven and applies to every invoice with the same signature; no invoice ID
 * or payment state is special-cased. New invoices carry invoiceDateKey and never need it.
 */
export const resolveInvoiceDisplayDate = (invoice: any): any => {
  const primary = invoice?.date || invoice?.invoiceDate || invoice?.createdAt || invoice?.issuedAt || invoice?.updatedAtServer || invoice?.updatedAt;
  const primaryDate = coerceDateValue(primary);
  if (!primaryDate) return primary;
  if (invoice?.invoiceDateKey) return primary;

  const updatedRaw = invoice?.issuedAt || invoice?.updatedAtServer || invoice?.updatedAt;
  const updatedDate = coerceDateValue(updatedRaw);
  const createdDate = coerceDateValue(invoice?.createdAt);
  if (!updatedDate || updatedDate <= primaryDate) return primary;

  const delta = updatedDate.getTime() - primaryDate.getTime();
  const oneDaySignature = delta >= 23.75 * 60 * 60 * 1000 && delta <= 24.25 * 60 * 60 * 1000;
  const createdMatchesPrimary = !createdDate || Math.abs(createdDate.getTime() - primaryDate.getTime()) < 60_000;
  const primaryClock = getKuwaitDateParts(primaryDate);
  const updatedClock = getKuwaitDateParts(updatedDate);
  const sameClock = primaryClock.hour === updatedClock.hour && Math.abs(Number(primaryClock.minute) - Number(updatedClock.minute)) <= 2;
  const occurredAfterMidnight = Number(updatedClock.hour) < 3;

  return oneDaySignature && createdMatchesPrimary && sameClock && occurredAfterMidnight
    ? updatedRaw
    : primary;
};

export const getInvoiceSortTimestamp = (invoice: any): number => {
  const resolved = coerceDateValue(resolveInvoiceDisplayDate(invoice));
  return resolved?.getTime() || 0;
};

export const formatKuwaitiDate = (dateVal: any): { date: string; time: string; full: string } => {
  const d = coerceDateValue(dateVal);
  if (!d) return { date: '', time: '', full: '' };

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kuwait',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).formatToParts(d);

  const getPart = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const date = `${getPart('day')}/${getPart('month')}/${getPart('year')}`;
  const time = `${getPart('hour')}:${getPart('minute')} ${getPart('dayPeriod').toUpperCase()}`;

  return { date, time, full: `${date} ${time}` };
};

export const formatKuwaitiDateOnly = (dateVal: any): string => formatKuwaitiDate(dateVal).date;
export const formatKuwaitiTimeOnly = (dateVal: any): string => formatKuwaitiDate(dateVal).time;

export function formatDeliveryTimeDisplay(timeStr?: string): string {
  if (!timeStr) return '';
  let trimmed = String(timeStr).trim();
  if (!trimmed) return '';

  trimmed = normalizeArabicNumerals(trimmed);

  // Detect period
  let period = '';
  if (trimmed.toLowerCase().includes('pm') || trimmed.includes('م') || trimmed.toLowerCase().includes('p')) {
    period = 'PM';
  } else if (trimmed.toLowerCase().includes('am') || trimmed.includes('ص') || trimmed.toLowerCase().includes('a')) {
    period = 'AM';
  }

  // Extract numbers
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return trimmed;

  let hh = 12;
  let mm = 0;

  if (digits.length >= 4) {
    hh = parseInt(digits.slice(0, 2), 10);
    mm = parseInt(digits.slice(2, 4), 10);
  } else if (digits.length === 3) {
    hh = parseInt(digits.slice(0, 1), 10);
    mm = parseInt(digits.slice(1, 3), 10);
  } else {
    hh = parseInt(digits, 10);
    mm = 0;
  }

  if (isNaN(hh)) hh = 12;
  if (isNaN(mm)) mm = 0;

  const originalHh = hh;

  if (hh > 12) {
    if (hh >= 24) {
      hh = hh % 12;
      if (hh === 0) hh = 12;
    } else {
      hh = hh - 12;
    }
  }
  if (hh < 1) hh = 12;
  if (mm > 59) mm = 59;
  if (mm < 0) mm = 0;

  const formattedMm = String(mm).padStart(2, '0');

  // If period was not explicitly detected, determine it from originalHh or default to PM
  if (!period) {
    if (originalHh >= 12 && originalHh < 24) {
      period = 'PM';
    } else if (originalHh === 0 || originalHh === 24) {
      period = 'AM';
    } else {
      period = 'PM'; // Default to PM for typical delivery times
    }
  }
  
  return `${hh}:${formattedMm} ${period}`;
}

export function formatTimeInput(value: string): string {
  const normalized = normalizeArabicNumerals(value);
  const digits = normalized.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) {
    return digits;
  } else if (digits.length === 3) {
    const hh = digits.slice(0, 1);
    const mm = digits.slice(1);
    return `${hh}:${mm}`;
  } else {
    const hh = digits.slice(0, 2);
    const mm = digits.slice(2);
    return `${hh}:${mm}`;
  }
}

export function validateAndCleanTime(value: string): string {
  if (!value) return '';
  const normalized = normalizeArabicNumerals(value).trim();
  
  // Extract AM/PM or ص/م
  const isPm = normalized.includes('م') || normalized.toLowerCase().includes('pm') || normalized.toLowerCase().includes('p');
  const isAm = normalized.includes('ص') || normalized.toLowerCase().includes('am') || normalized.toLowerCase().includes('a');
  let period = isPm ? 'PM' : (isAm ? 'AM' : '');
  
  // Strip all non-digits to get the numbers
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return '';
  
  let hh = 12;
  let mm = 0;
  
  if (digits.length >= 4) {
    hh = parseInt(digits.slice(0, 2), 10);
    mm = parseInt(digits.slice(2, 4), 10);
  } else if (digits.length === 3) {
    hh = parseInt(digits.slice(0, 1), 10);
    mm = parseInt(digits.slice(1, 3), 10);
  } else {
    hh = parseInt(digits, 10);
    mm = 0;
  }
  
  // Normalize hours & minutes
  if (isNaN(hh)) hh = 12;
  if (isNaN(mm)) mm = 0;

  const originalHh = hh;
  
  if (hh > 12) {
    if (hh >= 24) {
      hh = hh % 12;
      if (hh === 0) hh = 12;
    } else {
      hh = hh - 12;
    }
  }
  if (hh < 1) hh = 12;
  if (mm > 59) mm = 59;
  if (mm < 0) mm = 0;
  
  const formattedHh = String(hh);
  const formattedMm = String(mm).padStart(2, '0');

  // If period was not explicitly found in string, determine it from originalHh or default to PM
  if (!period) {
    if (originalHh >= 12 && originalHh < 24) {
      period = 'PM';
    } else if (originalHh === 0 || originalHh === 24) {
      period = 'AM';
    } else {
      period = 'PM'; // Default to PM for typical delivery times
    }
  }
  
  return `${formattedHh}:${formattedMm} ${period}`;
}

export function parseTimeTo24h(timeStr?: string): string {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (!trimmed) return '';

  // If it's already exactly HH:MM (24-hour format)
  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{1}:\d{2}$/.test(trimmed)) {
    return '0' + trimmed;
  }

  // Detect PM/AM indicators
  const isPm = trimmed.includes('م') || trimmed.includes('مساءً') || trimmed.toLowerCase().includes('pm');
  const isAm = trimmed.includes('ص') || trimmed.includes('صباحاً') || trimmed.toLowerCase().includes('am');

  const match = trimmed.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isPm && hours < 12) {
      hours += 12;
    } else if (isAm && hours === 12) {
      hours = 0;
    }
    const formattedHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${formattedHours}:${minutes}`;
  }
  return '';
}

export function formatDeliveryDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  }
  return trimmed;
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
  
  const normalizePersistedProductImage = (product: any) => {
      const normalized = { ...product };
      const removedAt = normalized?.imageRemovedAt ? new Date(normalized.imageRemovedAt).getTime() : 0;
      const updatedAt = normalized?.imageUpdatedAt ? new Date(normalized.imageUpdatedAt).getTime() : 0;
      if (Number.isFinite(removedAt) && removedAt > 0 && (!Number.isFinite(updatedAt) || removedAt >= updatedAt)) {
          normalized.imageUrl = '';
          delete normalized.image;
          delete normalized.photo;
          delete normalized.images;
      }
      return normalized;
  };

  for (const rawProduct of data.products) {
      const p = normalizePersistedProductImage(rawProduct);
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

const joinProductsCache = new WeakMap<any, any>();

/**
 * Recombines principal products and supplier copies from the database
 * back into a single products array for the Admin app's local state.
 */
export function joinProductsFromDatabase(data: any): any {
  if (!data) return data;
  if (joinProductsCache.has(data)) {
    return joinProductsCache.get(data);
  }
  const result = { ...data };
  if (result.supplierCopies && Array.isArray(result.supplierCopies)) {
      const combined = [...(result.products || []), ...result.supplierCopies];
      const unique: any[] = [];
      const seenIndex = new Map<string, number>();
      const imageEventTime = (value: any) => {
          const raw = value?.imageRemovedAt || value?.imageUpdatedAt || value?.updatedAt || value?.createdAt;
          const time = raw ? new Date(raw).getTime() : 0;
          return Number.isFinite(time) ? time : 0;
      };
      const mergeProductRecords = (current: any, incoming: any) => {
          const currentTime = imageEventTime(current);
          const incomingTime = imageEventTime(incoming);
          const merged = incomingTime >= currentTime ? { ...current, ...incoming } : { ...incoming, ...current };
          const removedAt = merged?.imageRemovedAt ? new Date(merged.imageRemovedAt).getTime() : 0;
          const updatedAt = merged?.imageUpdatedAt ? new Date(merged.imageUpdatedAt).getTime() : 0;
          if (Number.isFinite(removedAt) && removedAt > 0 && (!Number.isFinite(updatedAt) || removedAt >= updatedAt)) {
              merged.imageUrl = '';
              delete merged.image;
              delete merged.photo;
              delete merged.images;
          }
          return merged;
      };
      for (const p of combined) {
          if (!p || !p.id) { unique.push(p); continue; }
          const id = String(p.id);
          if (!seenIndex.has(id)) {
              seenIndex.set(id, unique.length);
              unique.push(p);
          } else {
              const index = seenIndex.get(id)!;
              unique[index] = mergeProductRecords(unique[index], p);
          }
      }
      result.products = unique;
      delete result.supplierCopies;
  }
  joinProductsCache.set(data, result);
  return result;
}

const unifiedInvoicesCache = new WeakMap<any, any[]>();

type UnifiedPaymentState = 'paid' | 'failed' | 'cancelled' | 'split_pending' | 'pending';

const getNormalizedPaymentState = (record: any): UnifiedPaymentState => {
  if (!record) return 'pending';

  const values = [
    record.paymentStatus,
    record.payment_status,
    record.payment?.status,
    record.transactionStatus,
    record.status,
  ].filter((value) => value !== undefined && value !== null && String(value).trim() !== '');
  const joined = values.map((value) => String(value).toLowerCase().replace(/_/g, ' ').trim()).join(' | ');

  // Failure/cancellation must win over any stale success marker copied into another record.
  if (record.failed === true || values.some((value) => isFailedStatus(value)) || joined.includes('مرفوض')) return 'failed';
  if (values.some((value) => isCancelledStatus(value))) return 'cancelled';
  if (joined.includes('split pending') || joined.includes('تجميع القطية') || joined.includes('بانتظار اكتمال القطية')) return 'split_pending';
  if (record.paid === true || values.some((value) => isPaidStatus(value))) return 'paid';
  return 'pending';
};

const hasAuthoritativePaymentSignal = (record: any): boolean => {
  if (!record) return false;
  if (
    record.paymentStatus !== undefined ||
    record.payment_status !== undefined ||
    record.payment?.status !== undefined ||
    record.transactionStatus !== undefined ||
    record.paid !== undefined ||
    record.failed !== undefined
  ) return true;

  const status = record.status;
  return isPaidStatus(status) || isFailedStatus(status) || isCancelledStatus(status) ||
    String(status || '').toLowerCase().replace(/_/g, ' ').includes('split pending') ||
    String(status || '').includes('تجميع القطية');
};

const mergeOrderItemsWithInvoiceItems = (orderItems: any[], invoiceItems: any[]): any[] => {
  if (!Array.isArray(invoiceItems) || invoiceItems.length === 0) return Array.isArray(orderItems) ? orderItems : [];
  if (!Array.isArray(orderItems) || orderItems.length === 0) return invoiceItems;

  return invoiceItems.map((invoiceItem: any, index: number) => {
    const productId = String(invoiceItem?.productId || invoiceItem?.id || '');
    const orderItem = orderItems.find((item: any) => String(item?.productId || item?.id || '') === productId) || orderItems[index] || {};
    return { ...orderItem, ...invoiceItem };
  });
};

const normalizeWebsiteOrderAsInvoice = (order: any, invoiceMirror?: any) => {
  const merged = invoiceMirror ? { ...order, ...invoiceMirror } : { ...order };
  const authoritativePaymentRecord = invoiceMirror && hasAuthoritativePaymentSignal(invoiceMirror)
    ? invoiceMirror
    : order;
  const paymentStatus = getNormalizedPaymentState(authoritativePaymentRecord);
  const items = mergeOrderItemsWithInvoiceItems(order?.items || [], invoiceMirror?.items || []);

  const itemsCost = items.reduce((acc: number, item: any) => {
    const itemCost = Number(item?.costAtTime ?? item?.cost ?? item?.supplierCost ?? 0) || 0;
    const qty = Number(item?.quantity ?? item?.qty ?? 1) || 1;
    return acc + (itemCost * qty);
  }, 0);

  const amount = Number(
    merged.totalAmount ??
    merged.total ??
    merged.grandTotal ??
    merged.finalTotal ??
    0
  ) || 0;

  let customerName = merged.customerName || merged.customerInfo?.name || merged.customer?.name || '';
  if (!customerName || customerName === 'بيانات مفقودة') {
    customerName = order?.customerName || order?.customerInfo?.name || order?.customer?.name || 'عميل عام';
  }
  const customerPhone = merged.customerPhone || merged.customerInfo?.phone || merged.customer?.phone || order?.customerPhone || '';
  const rawDeliveryFee = merged.deliveryInfo?.cost ?? merged.deliveryFee ?? order?.deliveryInfo?.cost ?? order?.deliveryFee ?? 0;

  return {
    ...merged,
    items,
    customerName,
    customerPhone,
    paymentStatus,
    payment_status: paymentStatus,
    paid: paymentStatus === 'paid',
    failed: paymentStatus === 'failed',
    isORDOrder: true,
    __supplierLedgerSource: 'paid_order',
    deliveryType: (merged.deliveryType === 'standard' && String(order?.id || merged.id || '').startsWith('ORD-'))
      ? 'company'
      : (merged.deliveryType || order?.deliveryType || 'company'),
    deliveryFee: Number(rawDeliveryFee) || 0,
    totalAmount: amount,
    total: Number(merged.total ?? amount) || amount,
    totalCost: itemsCost,
    profit: amount - itemsCost,
    discount: Number(merged.discount || 0) || 0,
    gatewayFee: Number(merged.gatewayFee || 0) || 0,
    paymentMethod: merged.paymentMethod || order?.paymentMethod || 'KNet',
    date: merged.date || merged.createdAt || order?.date || order?.createdAt || new Date().toISOString(),
  };
};

export function getUnifiedInvoices(data: any): any[] {
  if (!data) return [];
  if (unifiedInvoicesCache.has(data)) return unifiedInvoicesCache.get(data)!;

  const rawInvoices = Array.isArray(data?.invoices) ? data.invoices : [];
  const websiteOrders = (Array.isArray(data?.orders) ? data.orders : [])
    .filter((order: any) => String(order?.id || '').startsWith('ORD-'));

  const orderLookup = new Map<string, any>();
  websiteOrders.forEach((order: any) => {
    [order?.id, order?.linkedInvoiceId, order?.invoiceId].forEach((key) => {
      if (key) orderLookup.set(String(key), order);
    });
  });

  const matchedOrderIds = new Set<string>();
  const normalizedInvoices = rawInvoices.map((invoice: any) => {
    let normalizedInvoice = invoice;
    if (
      invoice?.deliveryType === 'standard' &&
      (String(invoice?.linkedOrderId || '').startsWith('ORD-') || invoice?.isConvertedFromWebsite) &&
      !invoice?.manuallyModifiedDeliveryType
    ) {
      normalizedInvoice = { ...invoice, deliveryType: 'company' };
    }

    const linkedOrder = orderLookup.get(String(normalizedInvoice?.linkedOrderId || '')) ||
      orderLookup.get(String(normalizedInvoice?.orderId || '')) ||
      orderLookup.get(String(normalizedInvoice?.id || ''));

    if (!linkedOrder) return normalizedInvoice;
    matchedOrderIds.add(String(linkedOrder.id));
    return normalizeWebsiteOrderAsInvoice(linkedOrder, normalizedInvoice);
  });

  const unmatchedOrders = websiteOrders
    .filter((order: any) => !matchedOrderIds.has(String(order.id)))
    .map((order: any) => normalizeWebsiteOrderAsInvoice(order));

  const combined = [...normalizedInvoices, ...unmatchedOrders];
  const unique: any[] = [];
  const handled = new Set<string>();
  for (const item of combined) {
    const id = item?.id ? String(item.id) : '';
    if (!id) {
      unique.push(item);
      continue;
    }
    if (handled.has(id)) continue;
    handled.add(id);
    unique.push(item);
  }

  unifiedInvoicesCache.set(data, unique);
  return unique;
}




export const normalizePhoneDigits = (value: any): string => {
  const normalized = normalizeArabicNumerals(String(value ?? ''));
  let digits = normalized.replace(/\D/g, '');
  if (digits.startsWith('00965')) digits = digits.slice(5);
  else if (digits.length > 8 && digits.startsWith('965')) digits = digits.slice(3);
  if (digits.length > 8) digits = digits.slice(-8);
  return digits.slice(0, 8);
};

export const phonesMatch = (left: any, right: any): boolean => {
  const a = normalizePhoneDigits(left);
  const b = normalizePhoneDigits(right);
  return a.length === 8 && b.length === 8 && a === b;
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

export function getArabicWeekdayAndDate(dateStr?: string): { weekday: string; date: string } {
  if (!dateStr) return { weekday: '', date: '' };
  let trimmed = String(dateStr).trim();
  if (!trimmed) return { weekday: '', date: '' };

  let dateObj: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const [y, m, d] = trimmed.split('T')[0].split('-');
    dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
  } else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    const parts = trimmed.split('/');
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    dateObj = new Date(y, m - 1, d);
  } else {
    // try standard parser
    const parsed = Date.parse(trimmed);
    if (!isNaN(parsed)) {
      dateObj = new Date(parsed);
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return { weekday: '', date: trimmed };
  }

  // Format date as d/m/yyyy (or standard localized without padding, e.g. 24/7/2026)
  const day = String(dateObj.getDate());
  const month = String(dateObj.getMonth() + 1);
  const year = dateObj.getFullYear();
  const formattedDate = `${day}/${month}/${year}`;

  const daysArabic = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const weekday = daysArabic[dateObj.getDay()];

  return { weekday, date: formattedDate };
}
