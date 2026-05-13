import { AppState } from './types';

export function debugSupplierBalances(state: AppState) {
    const supplierBalances: Record<string, number> = {};
    const unassignedProducts: string[] = [];
    let totalInvoicesAmount = 0;

    (state.invoices || []).forEach(inv => {
        if (inv.isDeleted) return;
        totalInvoicesAmount += (inv.totalAmount || 0);

        (inv.items || []).forEach(item => {
            const product = (state.products || []).find(p => p.id === item.productId);
            if (!product) {
                unassignedProducts.push(`Missing product: ${item.productId}`);
            } else if (!product.supplierId) {
                unassignedProducts.push(`Missing supplier for ${product.name}`);
            } else {
                const cost = (item.costAtTime || product.cost || 0) * (item.quantity || 0);
                supplierBalances[product.supplierId] = (supplierBalances[product.supplierId] || 0) + cost;
            }
        });
    });

    return {
        totalInvoicesAmount,
        supplierBalances,
        unassignedProducts
    };
}
