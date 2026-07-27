import { AppState } from '../types';
import { isCancelledStatus, isFailedStatus, isPaidStatus } from './status-utils';
import { computeAddonCost, computeAddonRevenue, computeAddonQuantity, getInvoiceItemAddons, safeParsePrice, addonHasPositiveSelection } from './invoice-calculations';
import { getUnifiedInvoices } from './utils';


const roundKwd = (value: number) => Math.round((Number(value || 0)) * 1000) / 1000;

const isSupplierChargeableInvoice = (inv: any): boolean => {
  if (!inv || inv.isDeleted) return false;
  const values = [inv.paymentStatus, inv.payment_status, inv.payment?.status, inv.status]
    .filter((value: any) => value !== undefined && value !== null && String(value).trim() !== '');
  const statusText = values.map((value: any) => String(value).toLowerCase().replace(/_/g, ' ').trim()).join(' | ');

  if (inv.failed === true || values.some((value: any) => isFailedStatus(value))) return false;
  if (values.some((value: any) => isCancelledStatus(value))) return false;
  if (statusText.includes('split pending') || statusText.includes('تجميع القطية')) return false;

  const isWebsiteOrder = String(inv.id || '').startsWith('ORD-') || inv.isORDOrder === true || inv.__supplierLedgerSource === 'paid_order';
  if (!isWebsiteOrder && String(inv.id || '').startsWith('INV-')) return true;
  return inv.paid === true || values.some((value: any) => isPaidStatus(value));
};

const firstNonBlankString = (...values: any[]): string => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

const firstPositiveNumber = (...values: any[]): number => {
  for (const value of values) {
    const parsed = safeParsePrice(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

const normalizeSupplierProductName = (value: any): string =>
  String(value || '')
    .toLowerCase()
    .replace(/[إأآا]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/[ىی]/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const getSupplierProductScore = (product: any): number =>
  (firstNonBlankString(product?.supplierId, product?.supplierID, product?.supplier?.id) ? 100 : 0) +
  (firstPositiveNumber(product?.cost, product?.supplierCost, product?.purchaseCost) > 0 ? 25 : 0) +
  (product?.isActive !== false ? 5 : 0) +
  (product?.isOutOfStock ? 0 : 2);

const mergeSupplierProductRecord = (current: any, incoming: any): any => {
  if (!current) return incoming;
  if (!incoming) return current;
  const preferred = getSupplierProductScore(incoming) >= getSupplierProductScore(current) ? incoming : current;
  const secondary = preferred === incoming ? current : incoming;
  const merged: any = { ...secondary, ...preferred };
  const supplierId = firstNonBlankString(
    preferred?.supplierId,
    preferred?.supplierID,
    preferred?.supplier?.id,
    secondary?.supplierId,
    secondary?.supplierID,
    secondary?.supplier?.id,
  );
  if (supplierId) merged.supplierId = supplierId;
  const cost = firstPositiveNumber(
    preferred?.cost,
    preferred?.supplierCost,
    preferred?.purchaseCost,
    secondary?.cost,
    secondary?.supplierCost,
    secondary?.purchaseCost,
  );
  if (cost > 0) merged.cost = cost;
  return merged;
};

const buildSupplierProductIndexes = (products: any[] = []) => {
  const byId = new Map<string, any>();
  const supplierIdsByName = new Map<string, Set<string>>();
  const bySupplierAndName = new Map<string, any>();

  (Array.isArray(products) ? products : []).forEach((product: any) => {
    if (!product) return;
    const id = firstNonBlankString(product.id, product.productId);
    if (id) byId.set(id, mergeSupplierProductRecord(byId.get(id), product));

    const nameKey = normalizeSupplierProductName(product.name || product.productName || product.nameAr);
    const supplierId = firstNonBlankString(product.supplierId, product.supplierID, product.supplier?.id);
    if (!nameKey || !supplierId) return;

    const supplierIds = supplierIdsByName.get(nameKey) || new Set<string>();
    supplierIds.add(supplierId);
    supplierIdsByName.set(nameKey, supplierIds);

    const supplierNameKey = `${supplierId}::${nameKey}`;
    bySupplierAndName.set(
      supplierNameKey,
      mergeSupplierProductRecord(bySupplierAndName.get(supplierNameKey), product),
    );
  });

  const uniqueSupplierByName = new Map<string, string>();
  supplierIdsByName.forEach((supplierIds, nameKey) => {
    if (supplierIds.size === 1) uniqueSupplierByName.set(nameKey, Array.from(supplierIds)[0]);
  });

  return { byId, uniqueSupplierByName, bySupplierAndName };
};

type SupplierProductIndexes = ReturnType<typeof buildSupplierProductIndexes>;

const supplierProductIndexesCache = new WeakMap<any[], SupplierProductIndexes>();

const getSupplierProductIndexes = (products: any[] = []): SupplierProductIndexes => {
  const safeProducts = Array.isArray(products) ? products : [];
  const cached = supplierProductIndexesCache.get(safeProducts);
  if (cached) return cached;
  const built = buildSupplierProductIndexes(safeProducts);
  supplierProductIndexesCache.set(safeProducts, built);
  return built;
};

const getItemSupplierId = (
  item: any,
  productMap: Map<string, any>,
  uniqueSupplierByName?: Map<string, string>,
): string => {
  const directSupplierId = firstNonBlankString(
    item?.supplierId,
    item?.supplierID,
    item?.supplier?.id,
  );
  if (directSupplierId) return directSupplierId;

  const product = productMap.get(firstNonBlankString(item?.productId, item?.id));
  const catalogSupplierId = firstNonBlankString(
    product?.supplierId,
    product?.supplierID,
    product?.supplier?.id,
  );
  if (catalogSupplierId) return catalogSupplierId;

  const nameKey = normalizeSupplierProductName(
    item?.name || item?.productName || product?.name || product?.productName,
  );
  return nameKey && uniqueSupplierByName ? (uniqueSupplierByName.get(nameKey) || '') : '';
};

const getSupplierCatalogProductForItem = (
  item: any,
  supplierId: string,
  productMap: Map<string, any>,
  bySupplierAndName?: Map<string, any>,
): any => {
  const exact = productMap.get(firstNonBlankString(item?.productId, item?.id));
  const exactSupplierId = firstNonBlankString(
    exact?.supplierId,
    exact?.supplierID,
    exact?.supplier?.id,
  );
  if (exact && exactSupplierId === String(supplierId)) return exact;

  const nameKey = normalizeSupplierProductName(
    item?.name || item?.productName || exact?.name || exact?.productName,
  );
  return (nameKey && bySupplierAndName)
    ? (bySupplierAndName.get(`${String(supplierId)}::${nameKey}`) || exact)
    : exact;
};

export const getInvoiceDeliverySettlementForSupplier = (
  inv: any, 
  supId: string, 
  state: AppState,
  productMap?: Map<string, any>,
  supplierMap?: Map<string, any>,
  uniqueSupplierByNameMap?: Map<string, string>
): number => {
  const info = inv?.deliveryInfo || {};
  const target = info.settlementTarget || inv?.deliverySettlementTarget;
  const valueCandidates = [info.cost, inv?.deliveryCost, info.finalPrice, inv?.deliveryFee];
  const value = Number(valueCandidates.find((candidate) => Number(candidate || 0) > 0) || 0) || 0;
  if (value <= 0) return 0;

  const supplier = supplierMap ? supplierMap.get(String(supId)) : (state?.suppliers || []).find((s: any) => String(s.id) === String(supId));
  if (!supplier) return 0;

  const isDeliveryCompany = (supplier as any).supplierType === 'delivery';
  const isFoodSupplierDelivering = !isDeliveryCompany && (supplier as any).deliverySettlement === 'supplier';
  if (!isDeliveryCompany && !isFoodSupplierDelivering) return 0;

  const deliveryProductIndexes =
    (!productMap || !uniqueSupplierByNameMap)
      ? getSupplierProductIndexes(state?.products || [])
      : null;
  const deliveryProductMap = productMap || deliveryProductIndexes!.byId;
  const uniqueSupplierByName =
    uniqueSupplierByNameMap || deliveryProductIndexes!.uniqueSupplierByName;
  const invoiceHasSupplierProduct = (inv?.items || []).some((item: any) => {
    const itemSupplierId = getItemSupplierId(
      item,
      deliveryProductMap,
      uniqueSupplierByName,
    );
    return itemSupplierId === String(supId);
  });

  const explicitSupplierId = String(info.settlementSupplierId || inv?.deliverySettlementSupplierId || '');
  const supplierName = String((supplier as any)?.name || '').trim();
  const explicitName = String(info.settlementSupplierName || info.company || inv?.deliveryCompany || '').trim();
  const matchesSupplier = explicitSupplierId === String(supId) || (!!supplierName && explicitName === supplierName);
  const hasNoExplicitSettlement = !target && !explicitSupplierId && !explicitName;

  if (isDeliveryCompany) {
    if (target && target !== 'delivery_company') return 0;
    return matchesSupplier ? roundKwd(value) : 0;
  }

  if (isFoodSupplierDelivering) {
    if (target && target !== 'supplier') return 0;
    return (matchesSupplier || (hasNoExplicitSettlement && invoiceHasSupplierProduct)) ? roundKwd(value) : 0;
  }

  return 0;
};

const supplierLedgerCache = new WeakMap<object, Map<string, any[]>>();

/**
 * Centrally calculates the detailed financial ledger (invoices and payments) for a supplier.
 */
export function getSupplierLedgerForState(
  supId: string, 
  state: AppState,
  productMap?: Map<string, any>,
  supplierMap?: Map<string, any>,
  invoicesBySupplierMap?: Map<string, any[]>,
  supplierProductsMap?: Map<string, Set<string>>,
  transfersBySupplierMap?: Map<string, any[]>,
  uniqueSupplierByNameMap?: Map<string, string>,
  supplierProductByNameMap?: Map<string, any>
): any[] {
  const useDefaultLedgerCache =
    !productMap &&
    !supplierMap &&
    !invoicesBySupplierMap &&
    !supplierProductsMap &&
    !transfersBySupplierMap &&
    !uniqueSupplierByNameMap &&
    !supplierProductByNameMap;

  if (useDefaultLedgerCache) {
    const stateCache = supplierLedgerCache.get(state as any);
    const cachedLedger = stateCache?.get(String(supId));
    if (cachedLedger) return cachedLedger;
  }

  const transactions: any[] = [];

  const supplierProductIndexes =
    (!productMap || !uniqueSupplierByNameMap || !supplierProductByNameMap)
      ? getSupplierProductIndexes(state.products || [])
      : null;
  const pMap: Map<string, any> = productMap || supplierProductIndexes!.byId;
  const sMap: Map<string, any> = supplierMap || new Map<string, any>((state.suppliers || []).map(s => [String(s.id), s]));
  const uniqueSupplierByName = uniqueSupplierByNameMap || supplierProductIndexes!.uniqueSupplierByName;
  const supplierProductByName = supplierProductByNameMap || supplierProductIndexes!.bySupplierAndName;

  const storedInvoices = getUnifiedInvoices(state).filter(isSupplierChargeableInvoice);
  const invoiceSource = invoicesBySupplierMap
    ? (invoicesBySupplierMap.get(String(supId)) || [])
    : storedInvoices;

  const invoicesSource = invoiceSource;

  // 1. Invoices and paid website orders awaiting an invoice mirror
  invoicesSource.forEach(inv => {
    // Collect products of this supplier in the invoice
    const itemsForThisSupplier = (inv.items || []).filter(item => {
      const itemSupplierId = getItemSupplierId(item, pMap, uniqueSupplierByName);
      return itemSupplierId === String(supId);
    }).map(item => {
      const product = getSupplierCatalogProductForItem(item, String(supId), pMap, supplierProductByName);
      const cost = firstPositiveNumber(
        item?.costAtTime,
        item?.supplierCost,
        item?.purchaseCost,
        item?.cost,
        product?.cost,
        product?.supplierCost,
        product?.purchaseCost,
      );
      const price = item.priceAtTime !== undefined ? item.priceAtTime : (product?.price || 0);
      const qty = item.quantity !== undefined ? item.quantity : ((item as any).qty !== undefined ? (item as any).qty : 1);
      
      let addonsCostTotal = 0;
      let addonsPriceTotal = 0;
      const itemAddons = getInvoiceItemAddons(item);
      const addonLines = itemAddons.map((addon: any) => {
        if (!addonHasPositiveSelection(addon)) return null;

        const priceTotal = roundKwd(computeAddonRevenue(addon, item, pMap));
        const supplierCostTotal = roundKwd(computeAddonCost(addon, item, pMap));

        // كشف المورد يجب أن يعكس الإضافات كما تظهر في الفاتورة تماماً.
        // إذا لم تكن تكلفة المورد محفوظة للإضافة القديمة، نرجع لقيمة الإضافة المحسوبة في الفاتورة
        // بدلاً من إسقاطها أو تركها خارج المستحقات.
        const costTotal = supplierCostTotal > 0 ? supplierCostTotal : priceTotal;
        const calculatedQty = computeAddonQuantity(addon, item);
        const displayQty = addon.quantity ?? addon.qty ?? addon.count ?? addon.selectedQuantity ?? addon.selectedQty ?? addon.selectedCount ?? addon.addonQuantity ?? (calculatedQty > 0 ? calculatedQty : undefined);
        const addonName = addon.name || addon.title || addon.label || 'إضافة';

        // لا نسقط الإضافات المجانية/الصفرية؛ ظهورها في كشف المورد مهم حتى يطابق تفاصيل الفاتورة.
        if (costTotal <= 0 && priceTotal <= 0 && !addonName) return null;

        addonsCostTotal += costTotal;
        addonsPriceTotal += priceTotal;
        return {
          id: addon.id || addon.addonId || addon.key || addon.name,
          name: addonName,
          quantity: displayQty,
          costTotal,
          priceTotal,
          supplierCostTotal,
        };
      }).filter(Boolean);

      const directItemAddonsCost = roundKwd(safeParsePrice((item as any)?.addonsCost ?? (item as any)?.addOnsCost ?? (item as any)?.extrasCost ?? (item as any)?.addonsSupplyAmount ?? (item as any)?.addonsSupplierCost ?? (item as any)?.addonCostTotal ?? (item as any)?.addonsCostTotal));
      const directItemAddonsRevenue = roundKwd(safeParsePrice((item as any)?.addonsTotal ?? (item as any)?.addOnsTotal ?? (item as any)?.extrasTotal ?? (item as any)?.addonsRevenue ?? (item as any)?.addonsAmount));
      if (addonsCostTotal <= 0) {
        if (directItemAddonsCost > 0) {
          addonsCostTotal = directItemAddonsCost;
        } else if (directItemAddonsRevenue > 0) {
          addonsCostTotal = directItemAddonsRevenue;
        }
      }
      if (addonsPriceTotal <= 0 && directItemAddonsRevenue > 0) {
        addonsPriceTotal = directItemAddonsRevenue;
      }

      return {
        productId: item.productId,
        name: product?.name || (item as any).name || (item as any).productName || 'منتج غير معروف',
        quantity: qty,
        cost,
        price,
        addonsCost: roundKwd(addonsCostTotal),
        addonsRevenue: roundKwd(addonsPriceTotal),
        addons: addonLines,
        totalCost: roundKwd((cost * qty) + addonsCostTotal),
        totalPrice: roundKwd((price * qty) + addonsPriceTotal)
      };
    });

    const supplierCost = roundKwd(itemsForThisSupplier.reduce((acc, item) => acc + item.totalCost, 0));
    const supplierAddonsCost = roundKwd(itemsForThisSupplier.reduce((acc, item) => acc + Number(item.addonsCost || 0), 0));
    const supplierRevenue = roundKwd(itemsForThisSupplier.reduce((acc, item) => acc + item.totalPrice, 0));
    const supplierDelivery = getInvoiceDeliverySettlementForSupplier(
      inv,
      supId,
      state,
      pMap,
      sMap,
      uniqueSupplierByName,
    );
    const supplierDue = roundKwd(supplierCost + supplierDelivery);

    if (supplierDue > 0) {
      const isPaidOrderFallback = (inv as any).__supplierLedgerSource === 'paid_order' || String(inv.id).startsWith('ORD-') || (inv as any).isORDOrder === true;
      const referenceId = String((inv as any).id || (inv as any).orderId || (inv as any).invoiceId || '');
      transactions.push({
        id: `${isPaidOrderFallback ? 'order' : 'inv'}-${referenceId}`,
        supplierId: supId,
        date: inv.date,
        type: 'invoice',
        sourceType: isPaidOrderFallback ? 'paid_order' : 'invoice',
        amount: supplierDue, // Positive (Obligation)
        supplyAmount: supplierCost,
        addonsSupplyAmount: supplierAddonsCost,
        productsSupplyAmount: roundKwd(supplierCost - supplierAddonsCost),
        deliveryAmount: supplierDelivery,
        revenue: supplierRevenue,
        refId: referenceId,
        label: supplierCost > 0
          ? `${isPaidOrderFallback ? 'طلب' : 'فاتورة'} توريد #${referenceId}`
          : `${isPaidOrderFallback ? 'طلب' : 'فاتورة'} توصيل #${referenceId}`,
        items: itemsForThisSupplier
      });
    }
  });

  // 2. Transfers
  const transfers = transfersBySupplierMap
    ? (transfersBySupplierMap.get(String(supId)) || [])
    : (state.supplierTransfers || []).filter(t => t && String(t.supplierId) === String(supId));

  transfers.forEach(t => {
    transactions.push({
      id: `tr-${t.id}`,
      supplierId: supId,
      date: t.date,
      type: 'transfer',
      amount: -t.amount, // Payments are negative in balance terms but positive in rawAmount/transfers
      refId: t.id,
      label: t.notes || 'تحويل مالي (سداد)',
      method: t.method
    });
  });

  const sortedTransactions = transactions.sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
  );

  if (useDefaultLedgerCache) {
    let stateCache = supplierLedgerCache.get(state as any);
    if (!stateCache) {
      stateCache = new Map<string, any[]>();
      supplierLedgerCache.set(state as any, stateCache);
    }
    stateCache.set(String(supId), sortedTransactions);
  }

  return sortedTransactions;
}

/**
 * Centrally calculates the net outstanding/due balance for a supplier.
 */
export function getSupplierLiveBalanceForState(
  supId: string, 
  state: AppState,
  productMap?: Map<string, any>,
  supplierMap?: Map<string, any>,
  invoicesBySupplierMap?: Map<string, any[]>,
  supplierProductsMap?: Map<string, Set<string>>,
  transfersBySupplierMap?: Map<string, any[]>,
  uniqueSupplierByNameMap?: Map<string, string>,
  supplierProductByNameMap?: Map<string, any>
): number {
  const ledger = getSupplierLedgerForState(
    supId, 
    state, 
    productMap, 
    supplierMap, 
    invoicesBySupplierMap, 
    supplierProductsMap, 
    transfersBySupplierMap,
    uniqueSupplierByNameMap,
    supplierProductByNameMap
  );
  const due = ledger.filter(t => t.type === 'invoice').reduce((acc, t) => acc + Number(t.amount || 0), 0);
  const paid = Math.abs(ledger.filter(t => t.type === 'transfer').reduce((acc, t) => acc + Number(t.amount || 0), 0));
  return Math.max(0, roundKwd(due - paid));
}

const recalculateCache = new WeakMap<any, any>();
const recalculatedMarker = new WeakSet<any>();

/**
 * Recalculates all derived balances in the application state to ensure consistency.
 * 1. Supplier Balances = Centrally calculated using unified getSupplierLiveBalanceForState
 * 2. Customer Stats = Sum(Invoice Amounts) & Count(Invoices)
 */
export function recalculateStateBalances(state: AppState): AppState {
  if (!state) return state;
  if (recalculatedMarker.has(state)) {
    return state;
  }
  if (recalculateCache.has(state)) {
    return recalculateCache.get(state);
  }

  const newState = { ...state };
  
  const supplierProductIndexes = getSupplierProductIndexes(newState.products || []);
  const productMap = supplierProductIndexes.byId;
  const supplierMap = new Map<string, any>((newState.suppliers || []).map(s => [String(s.id), s]));

  // Build a pre-index of invoices by supplier to avoid O(N * M) loops
  const invoicesBySupplierMap = new Map<string, any[]>();
  const unifiedInvoices = getUnifiedInvoices(newState).filter(isSupplierChargeableInvoice);

  unifiedInvoices.forEach(inv => {
    const seenSuppliers = new Set<string>();
    (inv.items || []).forEach((item: any) => {
      const supplierId = getItemSupplierId(item, productMap, supplierProductIndexes.uniqueSupplierByName);
      if (supplierId) seenSuppliers.add(supplierId);
    });
    
    // Also check delivery settlement supplier if any
    const info = (inv?.deliveryInfo || {}) as any;
    const deliverySupId = info.settlementSupplierId || inv?.deliverySettlementSupplierId;
    if (deliverySupId) {
      seenSuppliers.add(String(deliverySupId));
    }

    seenSuppliers.forEach(supId => {
      let list = invoicesBySupplierMap.get(supId);
      if (!list) {
        list = [];
        invoicesBySupplierMap.set(supId, list);
      }
      list.push(inv);
    });
  });

  // Pre-index product IDs by supplier to avoid costly array filter scans
  const supplierProductsMap = new Map<string, Set<string>>();
  (newState.products || []).forEach(p => {
    if (p && p.id && p.supplierId) {
      const sId = String(p.supplierId);
      let set = supplierProductsMap.get(sId);
      if (!set) {
        set = new Set();
        supplierProductsMap.set(sId, set);
      }
      set.add(String(p.id));
    }
  });

  // Pre-index transfers by supplier to avoid costly array filter scans
  const transfersBySupplierMap = new Map<string, any[]>();
  (newState.supplierTransfers || []).forEach(t => {
    if (t && t.supplierId) {
      const sId = String(t.supplierId);
      let list = transfersBySupplierMap.get(sId);
      if (!list) {
        list = [];
        transfersBySupplierMap.set(sId, list);
      }
      list.push(t);
    }
  });

  // 1. Synchronize Supplier Balances using the central calculation engine
  newState.suppliers = (newState.suppliers || []).map(s => ({
    ...s,
    balance: getSupplierLiveBalanceForState(
      s.id, 
      newState, 
      productMap, 
      supplierMap, 
      invoicesBySupplierMap, 
      supplierProductsMap, 
      transfersBySupplierMap,
      supplierProductIndexes.uniqueSupplierByName,
      supplierProductIndexes.bySupplierAndName
    )
  }));

  // 2. Recalculate Customer Stats (O(C + M) - string date comparison instead of Slow Date objects)
  const customerStats: Record<string, { totalSpent: number, totalOrders: number, lastOrderDate: string }> = {};
  (newState.customers || []).forEach(c => {
    customerStats[c.id] = { totalSpent: 0, totalOrders: 0, lastOrderDate: c.lastOrderDate || '' };
  });

  (newState.invoices || []).forEach(inv => {
    if (inv.isDeleted) return;
    
    const isPaid = isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined;
    if (!isPaid) return;

    if (!customerStats[inv.customerId]) {
      customerStats[inv.customerId] = { totalSpent: 0, totalOrders: 0, lastOrderDate: '' };
    }

    customerStats[inv.customerId].totalSpent += (inv.totalAmount || 0);
    customerStats[inv.customerId].totalOrders += 1;
    
    if (!customerStats[inv.customerId].lastOrderDate || inv.date > customerStats[inv.customerId].lastOrderDate) {
      customerStats[inv.customerId].lastOrderDate = inv.date;
    }
  });

  newState.customers = (newState.customers || []).map(c => ({
    ...c,
    totalSpent: Math.round((customerStats[c.id]?.totalSpent || 0) * 1000) / 1000,
    totalOrders: customerStats[c.id]?.totalOrders || 0,
    lastOrderDate: customerStats[c.id]?.lastOrderDate || c.lastOrderDate
  }));

  // Synchronize product categories to ensure consistency with current products if they are empty or undefined
  if (!newState.productCategories || newState.productCategories.length === 0) {
    const fromProducts = (newState.products || []).map((p: any) => String(p.category || '').trim()).filter(Boolean);
    const uniqueCats = Array.from(new Set(fromProducts));
    if (uniqueCats.length > 0) {
      newState.productCategories = uniqueCats;
      newState.settings = {
        ...(newState.settings || {}),
        productCategories: uniqueCats
      } as any;
    }
  }

  recalculateCache.set(state, newState);
  recalculatedMarker.add(newState);
  return newState;
}

/**
 * Generates the next sequential invoice ID based on existing records.
 * Prioritizes sequential numeric IDs and ignores timestamp-based IDs.
 */
export function generateNextInvoiceId(invoices: any[]): string {
  const START_OFFSET = 5000;
  if (!invoices || invoices.length === 0) return `INV-${START_OFFSET + 1}`;
  
  // Filter for IDs that fit the INV-XXXX pattern where XXXX is a reasonable sequential number
  const numericIds = invoices
    .map(inv => {
      const match = String(inv.id).match(/INV-(\d+)/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((id): id is number => id !== null && id < 1000000000); // Ignore large timestamps (like Date.now())
    
  if (numericIds.length === 0) {
    // If we only have timestamps or other formats, we base it on count
    return `INV-${START_OFFSET + invoices.length + 1}`;
  }

  const maxId = Math.max(...numericIds);
  // Ensure we don't return an ID that's already taken (just in case)
  let nextIdVal = maxId + 1;
  while (invoices.some(inv => inv.id === `INV-${nextIdVal}`)) {
    nextIdVal++;
  }
  
  return `INV-${nextIdVal}`;
}
