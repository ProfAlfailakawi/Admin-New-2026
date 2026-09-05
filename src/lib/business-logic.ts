import { AppState } from '../types';
import { isPaidStatus } from './status-utils';
import { computeAddonCost, computeAddonRevenue, computeAddonQuantity, computeInvoiceItemBaseCost, getInvoiceItemAddons, safeParsePrice, addonHasPositiveSelection, computeInvoiceSubtotal, computeInvoiceGatewayFee } from './invoice-calculations';
import { getUnifiedInvoices } from './utils';


const roundKwd = (value: number) => Math.round((Number(value || 0)) * 1000) / 1000;

export const getInvoiceDeliverySettlementForSupplier = (
  inv: any, 
  supId: string, 
  state: AppState,
  productMap?: Map<string, any>,
  supplierMap?: Map<string, any>
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

  const invoiceHasSupplierProduct = (inv?.items || []).some((item: any) => {
    const product = productMap ? productMap.get(String(item.productId)) : (state?.products || []).find((p: any) => String(p.id) === String(item.productId));
    return String(product?.supplierId || '') === String(supId);
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
  transfersBySupplierMap?: Map<string, any[]>
): any[] {
  const transactions: any[] = [];
  
  const pMap = productMap || new Map((state.products || []).map(p => [String(p.id), p]));
  const sMap = supplierMap || new Map((state.suppliers || []).map(s => [String(s.id), s]));

  const supplierProductIds = supplierProductsMap
    ? (supplierProductsMap.get(String(supId)) || new Set<string>())
    : new Set(
        (state.products || [])
          .filter(p => p && p.id && String(p.supplierId) === String(supId))
          .map(p => String(p.id))
      );

  const storedInvoices = getUnifiedInvoices(state).filter(inv => {
    if (!inv || inv.isDeleted) return false;
    if (String(inv.id).startsWith('INV-')) return true;
    return inv.paymentStatus === 'paid';
  });
  const invoiceSource = invoicesBySupplierMap
    ? (invoicesBySupplierMap.get(String(supId)) || [])
    : storedInvoices;

  const invoicesSource = invoiceSource;

  // 1. Invoices and paid website orders awaiting an invoice mirror
  invoicesSource.forEach(inv => {
    // Collect products of this supplier in the invoice
    const itemsForThisSupplier = (inv.items || []).filter(item => {
      const product = pMap.get(String(item.productId));
      return product && String(product.supplierId) === String(supId) && supplierProductIds.has(String(item.productId));
    }).map(item => {
      const product = pMap.get(String(item.productId));
      const cost = computeInvoiceItemBaseCost(item, pMap);
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
    const supplierDelivery = getInvoiceDeliverySettlementForSupplier(inv, supId, state, pMap, sMap);
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

  return transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/*
 * ── محرك تسوية المورد (Supplier settlement engine) ──────────────────────────
 *
 * المشكلة الجذرية التي كان يعاني منها الحساب القديم:
 *   الرصيد = max(0, مجموع كل الفواتير عبر التاريخ − مجموع كل السدادات عبر التاريخ)
 *
 * أي فائض تاريخي (دفعة افتتاحية، سداد مجمّع، أو سداد لفواتير حُذفت أو أُرشفت
 * لاحقاً) كان يبقى حيّاً إلى الأبد ويبتلع صامتاً كل فاتورة جديدة: المورد يطالب
 * بالدفع بينما البرنامج يعرض 0.000 د.ك ولا تظهر له أي حركة.
 *
 * الحل: كل دفعة تُسوّي الفواتير التي كانت موجودة فعلاً وقت تسجيلها (الأقدم أولاً).
 * الدفعة لا تستطيع أبداً سداد فاتورة صدرت بعدها، والفائض يُعرض بشكل صريح
 * كـ "رصيد فائض غير مطابق" بدل أن يخفي المستحقات.
 */

// نافذة سماح: أحياناً يُسجَّل السداد قبل إدخال الفاتورة بيوم أو يومين.
export const SUPPLIER_PAYMENT_GRACE_DAYS = 2;
const SUPPLIER_PAYMENT_GRACE_MS = SUPPLIER_PAYMENT_GRACE_DAYS * 24 * 60 * 60 * 1000;
const SETTLEMENT_EPSILON = 0.0005;

const settlementTime = (value: any): number => {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export interface SupplierSettlementInvoice {
  id: string;
  refId: string;
  date: any;
  time: number;
  due: number;
  supplyDue: number;
  deliveryDue: number;
  paid: number;
  paidToSupply: number;
  paidToDelivery: number;
  remaining: number;
  isPaid: boolean;
  isPartiallyPaid: boolean;
  entry: any;
}

export interface SupplierSettlement {
  ledger: any[];
  invoices: SupplierSettlementInvoice[];
  settlementByEntryId: Map<string, SupplierSettlementInvoice>;
  totalDue: number;
  totalPaid: number;
  appliedPaid: number;
  unappliedCredit: number;
  outstanding: number;
  supplyDue: number;
  deliveryDue: number;
  paidToSupply: number;
  paidToDelivery: number;
  remainingSupply: number;
  remainingDelivery: number;
  totalInvoices: number;
  paidInvoices: number;
  partiallyPaidInvoices: number;
  pendingInvoices: number;
  unpaidInvoices: number;
  paidPercentage: number;
}

/**
 * Centrally matches a supplier's payments to the invoices that existed when each
 * payment was made, so a historical surplus can never hide a newer invoice.
 */
export function getSupplierSettlementForState(
  supId: string,
  state: AppState,
  productMap?: Map<string, any>,
  supplierMap?: Map<string, any>,
  invoicesBySupplierMap?: Map<string, any[]>,
  supplierProductsMap?: Map<string, Set<string>>,
  transfersBySupplierMap?: Map<string, any[]>
): SupplierSettlement {
  const ledger = getSupplierLedgerForState(
    supId,
    state,
    productMap,
    supplierMap,
    invoicesBySupplierMap,
    supplierProductsMap,
    transfersBySupplierMap
  );

  const invoices: SupplierSettlementInvoice[] = ledger
    .filter((t: any) => t.type === 'invoice')
    .map((t: any) => {
      const due = Math.max(0, roundKwd(Number(t.amount || 0)));
      return {
        id: String(t.id || ''),
        refId: String(t.refId || ''),
        date: t.date,
        time: settlementTime(t.date),
        due,
        supplyDue: Math.max(0, roundKwd(Number(t.supplyAmount || 0))),
        deliveryDue: Math.max(0, roundKwd(Number(t.deliveryAmount || 0))),
        paid: 0,
        paidToSupply: 0,
        paidToDelivery: 0,
        remaining: due,
        isPaid: false,
        isPartiallyPaid: false,
        entry: t,
      };
    })
    .filter((inv) => inv.due > SETTLEMENT_EPSILON)
    .sort((a, b) => a.time - b.time || String(a.refId).localeCompare(String(b.refId), 'en', { numeric: true }));

  const payments = ledger
    .filter((t: any) => t.type === 'transfer')
    .map((t: any) => ({
      time: settlementTime(t.date),
      amount: Math.max(0, roundKwd(Math.abs(Number(t.amount || 0)))),
      applied: 0,
    }))
    .filter((p) => p.amount > SETTLEMENT_EPSILON)
    .sort((a, b) => a.time - b.time);

  // Invoices are sorted oldest-first and always filled oldest-first, so everything
  // before `firstOpen` is fully settled and never needs to be visited again.
  let firstOpen = 0;
  payments.forEach((payment) => {
    let left = payment.amount;
    const cutoff = payment.time + SUPPLIER_PAYMENT_GRACE_MS;

    while (firstOpen < invoices.length && invoices[firstOpen].remaining <= SETTLEMENT_EPSILON) firstOpen++;

    for (let i = firstOpen; i < invoices.length; i++) {
      if (left <= SETTLEMENT_EPSILON) break;
      const inv = invoices[i];
      // A payment can only settle invoices that already existed when it was made.
      if (inv.time > cutoff) break;
      if (inv.remaining <= SETTLEMENT_EPSILON) continue;

      const applied = Math.min(left, inv.remaining);
      const toSupply = Math.min(applied, Math.max(0, roundKwd(inv.supplyDue - inv.paidToSupply)));

      inv.paid = roundKwd(inv.paid + applied);
      inv.paidToSupply = roundKwd(inv.paidToSupply + toSupply);
      inv.paidToDelivery = roundKwd(inv.paidToDelivery + (applied - toSupply));
      inv.remaining = roundKwd(inv.remaining - applied);

      left = roundKwd(left - applied);
      payment.applied = roundKwd(payment.applied + applied);
    }
  });

  invoices.forEach((inv) => {
    inv.isPaid = inv.remaining <= SETTLEMENT_EPSILON;
    inv.isPartiallyPaid = !inv.isPaid && inv.paid > SETTLEMENT_EPSILON;
  });

  const sum = (list: any[], pick: (x: any) => number) => roundKwd(list.reduce((acc, x) => acc + Number(pick(x) || 0), 0));

  const totalDue = sum(invoices, (i) => i.due);
  const totalPaid = sum(payments, (p) => p.amount);
  const appliedPaid = sum(payments, (p) => p.applied);
  const outstanding = sum(invoices, (i) => Math.max(0, i.remaining));
  const supplyDue = sum(invoices, (i) => i.supplyDue);
  const deliveryDue = sum(invoices, (i) => i.deliveryDue);
  const paidToSupply = sum(invoices, (i) => i.paidToSupply);
  const paidToDelivery = sum(invoices, (i) => i.paidToDelivery);

  const totalInvoices = invoices.length;
  const paidInvoices = invoices.filter((i) => i.isPaid).length;
  const partiallyPaidInvoices = invoices.filter((i) => i.isPartiallyPaid).length;
  const pendingInvoices = Math.max(0, totalInvoices - paidInvoices);

  return {
    ledger,
    invoices,
    settlementByEntryId: new Map(invoices.map((i) => [String(i.id), i])),
    totalDue,
    totalPaid,
    appliedPaid,
    unappliedCredit: Math.max(0, roundKwd(totalPaid - appliedPaid)),
    outstanding,
    supplyDue,
    deliveryDue,
    paidToSupply,
    paidToDelivery,
    remainingSupply: Math.max(0, roundKwd(supplyDue - paidToSupply)),
    remainingDelivery: Math.max(0, roundKwd(deliveryDue - paidToDelivery)),
    totalInvoices,
    paidInvoices,
    partiallyPaidInvoices,
    pendingInvoices,
    unpaidInvoices: Math.max(0, pendingInvoices - partiallyPaidInvoices),
    paidPercentage: totalInvoices > 0 ? Math.round((paidInvoices / totalInvoices) * 100) : 0,
  };
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
  transfersBySupplierMap?: Map<string, any[]>
): number {
  return getSupplierSettlementForState(
    supId,
    state,
    productMap,
    supplierMap,
    invoicesBySupplierMap,
    supplierProductsMap,
    transfersBySupplierMap
  ).outstanding;
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
  
  const productMap = new Map((newState.products || []).map(p => [String(p.id), p]));
  const supplierMap = new Map((newState.suppliers || []).map(s => [String(s.id), s]));

  // Build a pre-index of invoices by supplier to avoid O(N * M) loops
  const invoicesBySupplierMap = new Map<string, any[]>();
  const unifiedInvoices = getUnifiedInvoices(newState).filter(inv => {
    if (!inv || inv.isDeleted) return false;
    if (String(inv.id).startsWith('INV-')) return true;
    return inv.paymentStatus === 'paid';
  });

  unifiedInvoices.forEach(inv => {
    const seenSuppliers = new Set<string>();
    (inv.items || []).forEach((item: any) => {
      const prod = productMap.get(String(item.productId));
      if (prod && prod.supplierId) {
        seenSuppliers.add(String(prod.supplierId));
      }
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
      set.add(p.id);
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

  // 1. Synchronize supplier balances using the central settlement engine.
  //    `balance` and `status` are stored on the supplier only as a cache for the
  //    dashboard, notifications and the AI engine — this is their ONLY writer, so
  //    they can never drift away from the settlement the Suppliers page shows.
  newState.suppliers = (newState.suppliers || []).map(s => {
    const settlement = getSupplierSettlementForState(
      s.id,
      newState,
      productMap,
      supplierMap,
      invoicesBySupplierMap,
      supplierProductsMap,
      transfersBySupplierMap
    );
    const balance = settlement.outstanding;
    const status: 'paid' | 'pending' | 'partially_paid' =
      balance <= 0 ? 'paid' : (settlement.appliedPaid > 0 ? 'partially_paid' : 'pending');
    return { ...s, balance, status };
  });

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

/*
 * ── مركز السيولة (Cash position) ──────────────────────────────────────────────
 *
 * بطاقة «رصيد السيولة بالبنك والخزينة» تُشتق بالكامل من السجلات الموجودة داخل
 * البرنامج. لذلك هي تساوي رصيدك الفعلي فقط إذا كانت السجلات ممتدة من أول يوم.
 * إذا حُذفت فواتير قديمة وبقيت مصروفاتها وسدادات مورديها، يصير طرف المنصرف كامل
 * وطرف الإيراد ناقص، فيطلع الرصيد سالباً بشكل وهمي.
 *
 * الحل: معايرة رصيد البنك تثبّت فرق السجلات فقط. وهذه الدالة هي المصدر الوحيد
 * لحساب السيولة، تستخدمها لوحة التحكم وشاشة الإعدادات معاً حتى لا يتكرر الرقم
 * بصيغتين مختلفتين.
 */
export interface CashPosition {
  openingBalance: number;
  openingBalanceSource: 'configured' | 'legacy-calibration';
  foodSales: number;
  deliveryFees: number;
  discounts: number;
  netRevenue: number;
  expenses: number;
  supplierPayments: number;
  gatewayFees: number;
  recordedMovement: number;
  balance: number;
  orphanOutflows: number;
  anchorNeeded: boolean;
  paidInvoices: any[];
}

// No bank balance is hardcoded. If the owner enters the current bank/cash amount in
// settings, the app stores only the adjustment the records cannot explain, then future
// sales, supplier payments, expenses and gateway fees keep moving the balance.
const LEGACY_OPENING_CASH_BALANCE = 0;

export function getCashPositionForState(state: AppState): CashPosition {
  const data: any = state || {};
  const settings: any = data.settings || {};
  const rawOpeningBalance = settings.openingCashBalance;
  // `0` is an intentional value (for a new ledger or after pressing "clear"). Only a
  // genuinely absent legacy value receives the confirmed one-time calibration.
  const hasConfiguredOpeningBalance =
    rawOpeningBalance !== undefined &&
    rawOpeningBalance !== null &&
    rawOpeningBalance !== '' &&
    Number.isFinite(Number(rawOpeningBalance));
  const openingBalance = hasConfiguredOpeningBalance
    ? Number(rawOpeningBalance)
    : LEGACY_OPENING_CASH_BALANCE;
  const openingBalanceSource: CashPosition['openingBalanceSource'] =
    hasConfiguredOpeningBalance ? 'configured' : 'legacy-calibration';

  const cashStartTime = (() => {
    if (!settings.cashTrackingStartDate) return null;
    const t = new Date(settings.cashTrackingStartDate).getTime();
    return Number.isFinite(t) ? t : null;
  })();
  // Undated rows are kept rather than dropped — losing a real payment is worse than
  // counting one that sits slightly outside the window.
  const isOnOrAfterStart = (value: any) => {
    if (cashStartTime === null) return true;
    const t = new Date(value).getTime();
    return !Number.isFinite(t) || t >= cashStartTime;
  };

  const cancelledInvoiceIds = new Set(
    (data.orders || [])
      .filter((o: any) => o?.status === 'cancelled' && o?.isConvertedToInvoice && o?.linkedInvoiceId)
      .map((o: any) => o.linkedInvoiceId)
  );

  const paidInvoices = getUnifiedInvoices(data).filter((inv: any) => {
    if (!inv || inv.isDeleted || cancelledInvoiceIds.has(inv.id)) return false;
    if (!isOnOrAfterStart(inv.date)) return false;
    const isPaid = isPaidStatus(inv.paymentStatus);
    const isLegacyPaid =
      (inv.paymentStatus === undefined || inv.paymentStatus === null || inv.paymentStatus === '') &&
      (inv.status === 'completed' || inv.status === 'delivered');
    return (isPaid || isLegacyPaid)
      && !String(inv.status).includes('تجميع القطية')
      && inv.paymentStatus !== 'split_pending'
      && inv.status !== 'split_pending';
  });

  const products = data.products || [];
  const foodSales = paidInvoices.reduce((acc: number, inv: any) => acc + Math.max(0, computeInvoiceSubtotal(inv, products)), 0);
  const deliveryFees = paidInvoices.reduce((acc: number, inv: any) => {
    const fee = Number(inv?.deliveryFee ?? inv?.deliveryPrice ?? inv?.deliveryInfo?.finalPrice ?? inv?.deliveryInfo?.price ?? 0) || 0;
    return acc + Math.max(0, fee);
  }, 0);
  const discounts = paidInvoices.reduce((acc: number, inv: any) => acc + Number(inv.discount || 0), 0);
  const gatewayFees = paidInvoices.reduce((acc: number, inv: any) => acc + computeInvoiceGatewayFee(inv), 0);
  const netRevenue = foodSales + deliveryFees - discounts;

  const expenses = (data.expenses || []).reduce(
    (acc: number, e: any) => acc + (isOnOrAfterStart(e?.date) ? Math.abs(Number(e?.amount || 0)) : 0), 0);
  const supplierPayments = (data.supplierTransfers || []).reduce(
    (acc: number, t: any) => acc + (isOnOrAfterStart(t?.date) ? Math.abs(Number(t?.amount || 0)) : 0), 0);

  const recordedMovement = netRevenue - expenses - supplierPayments - gatewayFees;

  // Outflows dated before the oldest surviving invoice belong to a period whose sales are
  // no longer in the app: their revenue side is missing, so the card cannot be right until
  // an opening balance covers them.
  const oldestRevenueTime = paidInvoices.reduce((min: number, inv: any) => {
    const t = new Date(inv?.date).getTime();
    return Number.isFinite(t) && t < min ? t : min;
  }, Number.POSITIVE_INFINITY);

  const orphanOutflows = Number.isFinite(oldestRevenueTime)
    ? [...(data.expenses || []), ...(data.supplierTransfers || [])].reduce((acc: number, row: any) => {
        if (!isOnOrAfterStart(row?.date)) return acc;
        const t = new Date(row?.date).getTime();
        return Number.isFinite(t) && t < oldestRevenueTime ? acc + Math.abs(Number(row?.amount || 0)) : acc;
      }, 0)
    : 0;

  return {
    openingBalance,
    openingBalanceSource,
    foodSales,
    deliveryFees,
    discounts,
    netRevenue,
    expenses,
    supplierPayments,
    gatewayFees,
    recordedMovement,
    balance: roundKwd(openingBalance + recordedMovement),
    orphanOutflows: roundKwd(orphanOutflows),
    anchorNeeded: openingBalance === 0 && orphanOutflows > 0,
    paidInvoices,
  };
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
