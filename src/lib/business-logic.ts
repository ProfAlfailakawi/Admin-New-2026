import { AppState } from '../types';
import { isPaidStatus } from './status-utils';

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
    
    // Only include paid invoices for financial consistency
    const isPaid = isPaidStatus(inv.paymentStatus) || inv.paymentStatus === undefined;
    if (!isPaid) return;

    (inv.items || []).forEach(item => {
      const product = (newState.products || []).find(p => p.id === item.productId);
      if (product?.supplierId) {
        // Use cost from items (costAtTime) * quantity, as designed for accurate historical costs
        const itemCost = (item.costAtTime || product.cost || 0);
        const cost = itemCost * (item.quantity || 0);
        const currentTotal = supplierBalances[product.supplierId] || 0;
        supplierBalances[product.supplierId] = Math.round((currentTotal + cost) * 1000) / 1000;
      } else {
      }
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
