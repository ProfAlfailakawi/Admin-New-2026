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

  return newState;
}
