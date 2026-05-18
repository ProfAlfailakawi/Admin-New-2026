import { normalizeArabicNumerals } from './utils';

/**
 * Safely parses a price/value that could be a string, number, or contain Arabic numerals.
 */
export const safeParsePrice = (val: any): number => {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    try {
        const normalized = normalizeArabicNumerals(String(val)).replace(/,/g, '');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
        return 0;
    }
};

/**
 * Calculates the quantity for an addon based on its calculation type and the item quantity.
 */
export const computeAddonQuantity = (addon: any, item: any): number => {
    const itemQty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
    const qty = Math.max(1, itemQty);
    const threshold = Math.max(1, Number(addon.xItemsThreshold || 1));

    // addon.quantity is the "selected quantity" (multiplier) by the user (e.g. 2 sauces)
    const multiplier = Number(addon.quantity !== undefined ? addon.quantity : 1);

    if (addon.calculationType === 'fixed') {
        return multiplier;
    } else if (addon.calculationType === 'per_x_items') {
        return Math.ceil(qty / threshold) * multiplier;
    } else {
        // Default to 'per_item'
        return qty * multiplier;
    }
};

/**
 * Calculates the total revenue for a single addon.
 */
export const computeAddonRevenue = (addon: any, item: any): number => {
    const itemQty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
    const qty = Math.max(1, itemQty);
    const threshold = Math.max(1, Number(addon.xItemsThreshold || 1));
    const price = safeParsePrice(addon.price || addon.addonPrice || addon.amount || 0);

    const mult = Number(addon.quantity !== undefined ? addon.quantity : 1);
    const free = Number(addon.freeQuantity || 0);
    const paidMult = Math.max(0, mult - free);

    if (addon.calculationType === 'fixed') {
        return price * paidMult;
    } else if (addon.calculationType === 'per_x_items') {
        return price * Math.ceil(qty / threshold) * paidMult;
    } else {
        // per_item
        return price * qty * paidMult;
    }
};

/**
 * Calculates the total cost for a single addon.
 */
export const computeAddonCost = (addon: any, item: any): number => {
    const itemQty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
    const qty = Math.max(1, itemQty);
    const threshold = Math.max(1, Number(addon.xItemsThreshold || 1));
    const cost = safeParsePrice(addon.cost || addon.addonCost || 0);

    const mult = Number(addon.quantity !== undefined ? addon.quantity : 1);
    const free = Number(addon.freeQuantity || 0);
    const paidMult = Math.max(0, mult - free);

    if (addon.calculationType === 'fixed') {
        return cost * paidMult;
    } else if (addon.calculationType === 'per_x_items') {
        return cost * Math.ceil(qty / threshold) * paidMult;
    } else {
        // per_item
        return cost * qty * paidMult;
    }
};

/**
 * Calculates total addons revenue for an entire invoice.
 * Note: 'fixed' type addons are deduplicated by ID if they are meant to be "Fixed for Order".
 * However, since they are associated with items, we keep the simplest logic unless specified.
 * According to user: "Fixed for full order... regardless of product count".
 */
export const computeInvoiceAddonsTotal = (inv: any): number => {
    let total = 0;
    const processedFixedAddons = new Set<string>();

    (inv.items || []).forEach((item: any) => {
        (item.addons || []).forEach((addon: any) => {
            if (addon.calculationType === 'fixed') {
                const key = `${addon.id}-${addon.name}`;
                if (!processedFixedAddons.has(key)) {
                    total += computeAddonRevenue(addon, item);
                    processedFixedAddons.add(key);
                }
            } else {
                total += computeAddonRevenue(addon, item);
            }
        });
    });
    return total;
};

/**
 * Calculates total addons cost for an entire invoice.
 */
export const computeInvoiceAddonsTotalCost = (inv: any): number => {
    let total = 0;
    const processedFixedAddons = new Set<string>();

    (inv.items || []).forEach((item: any) => {
        (item.addons || []).forEach((addon: any) => {
            if (addon.calculationType === 'fixed') {
                const key = `${addon.id}-${addon.name}`;
                if (!processedFixedAddons.has(key)) {
                    total += computeAddonCost(addon, item);
                    processedFixedAddons.add(key);
                }
            } else {
                total += computeAddonCost(addon, item);
            }
        });
    });
    return total;
};

/**
 * Calculates a single item's base price (SNAPSHOT preference).
 */
export const computeInvoiceItemBasePrice = (item: any, dataProducts: any[]) => {
    if (item.priceAtTime !== undefined) return Number(item.priceAtTime);
    if ((item as any).price !== undefined) return Number((item as any).price);
    const product = (dataProducts || []).find((p: any) => p.id === item.productId);
    return Number(product?.price || 0);
};

/**
 * Calculates a single item's total (including its addons).
 */
export const computeInvoiceItemTotal = (item: any, dataProducts: any[]) => {
    const basePrice = computeInvoiceItemBasePrice(item, dataProducts);
    const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
    let addonsTotal = 0;
    (item.addons || []).forEach((addon: any) => {
        addonsTotal += computeAddonRevenue(addon, item);
    });
    return (basePrice * qty) + addonsTotal;
};

/**
 * Calculates the subtotal of an invoice (sum of items + their addons).
 */
export const computeInvoiceSubtotal = (inv: any, dataProducts: any[]) => {
    const baseItemsTotal = (inv.items || []).reduce((acc: number, item: any) => {
        const basePrice = computeInvoiceItemBasePrice(item, dataProducts);
        const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
        return acc + (basePrice * qty);
    }, 0);
    return baseItemsTotal + computeInvoiceAddonsTotal(inv);
};

/**
 * Calculates the final total of an invoice (subtotal + delivery - discount).
 */
export const computeInvoiceTotal = (inv: any, dataProducts: any[]) => {
    const subtotal = computeInvoiceSubtotal(inv, dataProducts);
    return Math.max(0, subtotal + Number(inv.deliveryFee || 0) - Number(inv.discount || 0));
};

/**
 * Calculates the total cost of an invoice.
 */
export const computeInvoiceCost = (inv: any, dataProducts: any[]) => {
    let cost = 0;
    (inv.items || []).forEach((item: any) => {
        const product = (dataProducts || []).find((p: any) => p.id === item.productId);
        const itemCost = item.costAtTime !== undefined ? Number(item.costAtTime) : Number(product?.cost || 0);
        const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
        cost += itemCost * qty;
    });
    return cost + computeInvoiceAddonsTotalCost(inv);
};

/**
 * Calculates the net profit of an invoice.
 */
export const computeInvoiceProfit = (inv: any, dataProducts: any[]) => {
    const total = computeInvoiceTotal(inv, dataProducts);
    const cost = computeInvoiceCost(inv, dataProducts);
    const gatewayFee = Number(inv.gatewayFee || 0);
    
    // Alturath logic: delivery profit only counts if deliveryType != 'company'/'free'/'special'
    // But this depends on implementation. For simple dashboard:
    // Profit = Revenue - Cost - Fees
    return total - cost - gatewayFee;
};
