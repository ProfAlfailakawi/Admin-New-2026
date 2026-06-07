import { AppState } from '../types';
import { isPaidStatus } from './status-utils';


const getInvoiceDeliverySettlementAmount = (inv: any, supplierId: string, state: AppState): number => {
  const info = inv?.deliveryInfo || {};
  const target = info.settlementTarget || inv?.deliverySettlementTarget;
  const valueCandidates = [info.cost, inv?.deliveryCost, info.finalPrice, inv?.deliveryFee];
  const value = Number(valueCandidates.find((candidate) => Number(candidate || 0) > 0) || 0) || 0;
  if (value <= 0) return 0;

  const supplier = (state?.suppliers || []).find((s: any) => String(s.id) === String(supplierId));
  if (!supplier) return 0;

  const isDeliveryCompany = (supplier as any).supplierType === 'delivery';
  const isFoodSupplierDelivering = !isDeliveryCompany && (supplier as any).deliverySettlement === 'supplier';
  if (!isDeliveryCompany && !isFoodSupplierDelivering) return 0;

  const invoiceHasSupplierProduct = (inv?.items || []).some((item: any) => {
    const product = (state?.products || []).find((p: any) => String(p.id) === String(item.productId));
    return String(product?.supplierId || '') === String(supplierId);
  });

  const explicitSupplierId = String(info.settlementSupplierId || inv?.deliverySettlementSupplierId || '');
  const supplierName = String((supplier as any)?.name || '').trim();
  const explicitName = String(info.settlementSupplierName || info.company || inv?.deliveryCompany || '').trim();
  const matchesSupplier = explicitSupplierId === String(supplierId) || (!!supplierName && explicitName === supplierName);
  const hasNoExplicitSettlement = !target && !explicitSupplierId && !explicitName;

  if (isDeliveryCompany) {
    if (target && target !== 'delivery_company') return 0;
    return matchesSupplier ? Math.round(value * 1000) / 1000 : 0;
  }

  if (isFoodSupplierDelivering) {
    if (target && target !== 'supplier') return 0;
    return (matchesSupplier || (hasNoExplicitSettlement && invoiceHasSupplierProduct)) ? Math.round(value * 1000) / 1000 : 0;
  }

  return 0;
};


/**
 * Recalculates all derived balances in the application state to ensure consistency.
 * 1. Supplier Balances = Sum(Invoice Item Costs) - Sum(Supplier Transfers)
 * 2. Customer Stats = Sum(Invoice Amounts) & Count(Invoices)
 */
export function recalculateStateBalances(state: AppState): AppState {
  const newState = { ...state };
  
  // 1. Reset Supplier Balances
  const supplierBalances: Record<string, number> = {};
  (newState.suppliers || []).forEach(s => {
    supplierBalances[s.id] = 0;
  });

  // Calculate costs from active invoices
  (newState.invoices || []).forEach(inv => {
    if (inv.isDeleted) return;

    (inv.items || []).forEach(item => {
      const product = (newState.products || []).find(p => p.id === item.productId);
      if (product?.supplierId) {
        // Use cost from items (costAtTime) * quantity, as designed for accurate historical costs
        const itemCost = item.costAtTime !== undefined ? item.costAtTime : (product.cost || 0);
        const qty = item.quantity !== undefined ? item.quantity : ((item as any).qty !== undefined ? (item as any).qty : 1);
        const cost = itemCost * qty;
        const currentTotal = supplierBalances[product.supplierId] || 0;
        supplierBalances[product.supplierId] = Math.round((currentTotal + cost) * 1000) / 1000;
      } else {
      }
    });

    (newState.suppliers || []).forEach((supplier: any) => {
      const deliverySettlementAmount = getInvoiceDeliverySettlementAmount(inv, String(supplier.id), newState);
      if (deliverySettlementAmount <= 0) return;
      const currentTotal = supplierBalances[supplier.id] || 0;
      supplierBalances[supplier.id] = Math.round((currentTotal + deliverySettlementAmount) * 1000) / 1000;
    });
  });

  // Subtract transfers
  (newState.supplierTransfers || []).forEach(t => {
    if (supplierBalances[t.supplierId] !== undefined) {
      const currentTotal = supplierBalances[t.supplierId];
      supplierBalances[t.supplierId] = Math.round((currentTotal - (t.amount || 0)) * 1000) / 1000;
    }
  });

  // Update suppliers
  newState.suppliers = (newState.suppliers || []).map(s => ({
    ...s,
    balance: Math.max(0, Math.round((supplierBalances[s.id] || 0) * 1000) / 1000)
  }));

  // 2. Recalculate Customer Stats
  const customerStats: Record<string, { totalSpent: number, totalOrders: number, lastOrderDate: string }> = {};
  (newState.customers || []).forEach(c => {
    customerStats[c.id] = { totalSpent: 0, totalOrders: 0, lastOrderDate: c.lastOrderDate || '' };
  });

  (newState.invoices || []).forEach(inv => {
    if (inv.isDeleted) return;
    
    const isPaid = isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined;
    if (!isPaid) return;

    if (customerStats[inv.customerId]) {
      customerStats[inv.customerId].totalSpent += (inv.totalAmount || 0);
      customerStats[inv.customerId].totalOrders += 1;
      
      if (!customerStats[inv.customerId].lastOrderDate || new Date(inv.date) > new Date(customerStats[inv.customerId].lastOrderDate)) {
        customerStats[inv.customerId].lastOrderDate = inv.date;
      }
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
