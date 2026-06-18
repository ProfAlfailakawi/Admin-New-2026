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

const isCoverageRangeAddon = (addon: any): boolean => {
    return addon?.calculationType === 'coverage' || (addon?.calculationType === 'per_x_items' && addon?.perXMode === 'coverage_range');
};

const getCoverageUnits = (addon: any, itemQty: number): number => {
    const rule = addon?.quantityRule || {};
    const minProductQty = Math.max(1, Number(rule.minProductQty || addon?.minProductQty || 1));
    const coverToQty = Math.max(minProductQty, Number(rule.maxProductQtyPerAddon || addon?.maxProductQtyPerAddon || addon?.xItemsThreshold || minProductQty));
    const qty = Math.max(0, Number(itemQty || 0));
    if (qty < minProductQty) return 0;
    const span = Math.max(1, coverToQty - minProductQty + 1);
    return Math.max(1, Math.ceil((qty - minProductQty + 1) / span));
};

const getPerXUnits = (addon: any, qty: number): number => {
    if (isCoverageRangeAddon(addon)) return getCoverageUnits(addon, qty);
    const threshold = Math.max(1, Number(addon?.xItemsThreshold || addon?.threshold || 1));
    return addon?.roundingMode === 'ceil' ? Math.ceil(qty / threshold) : Math.floor(qty / threshold);
};

export const computeAddonQuantity = (addon: any, item: any): number => {
    if (addon?.selected === false || addon?.enabled === false || addon?.isSelected === false) return 0;
    const itemQty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
    const qty = Math.max(1, itemQty);
    const hasExplicitQty = addon?.quantity !== undefined || addon?.qty !== undefined || addon?.count !== undefined || addon?.selectedQuantity !== undefined || addon?.value !== undefined;
    const selectedQty = computeAddonSelectedQuantity(addon);
    const multiplier = hasExplicitQty ? selectedQty : Number(addon.quantity !== undefined ? addon.quantity : (addon.qty !== undefined ? addon.qty : 1));

    if (hasExplicitQty && selectedQty <= 0) return 0;
    if (addon.calculationType === 'fixed') {
        return multiplier;
    }
    if (isCoverageRangeAddon(addon)) {
        return hasExplicitQty ? Math.max(selectedQty, getCoverageUnits(addon, qty)) : getCoverageUnits(addon, qty);
    }
    if (addon.calculationType === 'per_x_items') {
        return hasExplicitQty ? selectedQty : getPerXUnits(addon, qty);
    }
    return hasExplicitQty ? selectedQty : qty * multiplier;
};

/**
 * Calculates the total revenue for a single addon.
 */
export const normalizeAddonList = (addons: any): any[] => {
    if (!addons) return [];
    if (Array.isArray(addons)) return addons.filter(Boolean);
    if (typeof addons === 'object') return Object.entries(addons).map(([key, value]: any) => {
        if (value && typeof value === 'object') return { id: value.id || key, ...value };
        if (value === true || value === 1 || value === 'true') return { id: key, selected: true, quantity: 1 };
        return { id: key, quantity: Number(value) || 0 };
    }).filter(Boolean);
    return [];
};

export const getInvoiceItemAddons = (item: any): any[] => {
    const lists = [
        item?.addons,
        item?.selectedAddons,
        item?.addOns,
        item?.extras,
        item?.addonSelections,
        item?.selectedExtras,
        item?.invoiceAddons,
        item?.itemAddons,
        item?.options,
        item?.modifiers,
    ];
    for (const list of lists) {
        const normalized = normalizeAddonList(list);
        if (normalized.length > 0) return normalized;
    }
    return [];
};

export const getInvoiceLevelAddons = (inv: any): any[] => {
    const lists = [
        inv?.addons,
        inv?.selectedAddons,
        inv?.addOns,
        inv?.extras,
        inv?.addonSelections,
        inv?.selectedExtras,
        inv?.invoiceAddons,
        inv?.options,
        inv?.modifiers,
    ];
    for (const list of lists) {
        const normalized = normalizeAddonList(list);
        if (normalized.length > 0) return normalized;
    }
    return [];
};

const mergeAddonWithCatalog = (addon: any, item: any, products: any[] = []) => {
    if (!addon || typeof addon !== 'object') return addon;
    const product = products.find((p: any) => p.id === item?.productId || p.name === item?.productName || p.name === item?.name);
    const catalog = normalizeAddonList(product?.addons).find((a: any) =>
        (addon.id && a.id === addon.id) ||
        (addon.name && a.name === addon.name) ||
        (addon.addonId && a.id === addon.addonId)
    );
    return catalog ? { ...catalog, ...addon } : addon;
};

export const computeAddonSelectedQuantity = (addon: any): number => {
    if (addon?.selected === false || addon?.enabled === false || addon?.isSelected === false || addon?.checked === false) return 0;
    const raw = addon?.quantity ?? addon?.qty ?? addon?.count ?? addon?.selectedQuantity ?? addon?.value ?? addon?.selectedQty;
    if (raw !== undefined && raw !== null && raw !== '') {
        if (raw === true || raw === 'true') return 1;
        return Math.max(0, Number(raw) || 0);
    }
    if (addon?.selected === true || addon?.isSelected === true || addon?.checked === true || addon?.enabled === true) return 1;
    return 0;
};

/**
 * Calculates the total revenue for a single addon.
 */
export const computeAddonRevenue = (addon: any, item: any, products: any[] = []): number => {
    addon = mergeAddonWithCatalog(addon, item, products);
    const directTotal = safeParsePrice(addon?.total ?? addon?.totalPrice ?? addon?.lineTotal ?? addon?.revenue ?? addon?.amountTotal);
    if (directTotal > 0) return directTotal;

    const itemQty = Math.max(1, Number(item?.quantity !== undefined ? item.quantity : (item?.qty !== undefined ? item.qty : 1)) || 1);
    const threshold = Math.max(1, Number(addon?.xItemsThreshold || addon?.threshold || addon?.maxProductQtyPerAddon || 1));
    const price = safeParsePrice(addon?.price ?? addon?.addonPrice ?? addon?.amount ?? addon?.unitPrice ?? addon?.sellingPrice ?? 0);
    if (price <= 0) return 0;

    const selectedQty = computeAddonSelectedQuantity(addon);
    const hasExplicitQty = addon?.quantity !== undefined || addon?.qty !== undefined || addon?.count !== undefined || addon?.selectedQuantity !== undefined || addon?.value !== undefined;
    if (hasExplicitQty && selectedQty <= 0) return 0;

    let units = 0;
    if (hasExplicitQty) {
        units = isCoverageRangeAddon(addon) ? Math.max(selectedQty, getCoverageUnits(addon, itemQty)) : selectedQty;
    } else if (addon?.calculationType === 'fixed') {
        units = addon?.selected === false ? 0 : 1;
    } else if (isCoverageRangeAddon(addon) || addon?.calculationType === 'per_x_items') {
        units = getPerXUnits(addon, itemQty);
    } else {
        // Default to one addon per item
        units = itemQty;
    }

    const free = Math.max(0, Number(addon?.freeQuantity || addon?.freeQty || 0));
    return price * Math.max(0, units - free);
};

/**
 * Calculates the total cost for a single addon.
 */
export const computeAddonCost = (addon: any, item: any, products: any[] = []): number => {
    addon = mergeAddonWithCatalog(addon, item, products);
    if (addon?.selected === false || addon?.enabled === false || addon?.isSelected === false || addon?.checked === false) return 0;

    const directCostTotal = safeParsePrice(addon?.totalCost ?? addon?.costTotal ?? addon?.lineCost ?? addon?.supplierTotal ?? addon?.supplyTotal ?? addon?.purchaseTotal ?? addon?.addonCostTotal ?? addon?.addonsCostTotal);
    if (directCostTotal > 0) return directCostTotal;

    const itemQty = Math.max(1, Number(item?.quantity !== undefined ? item.quantity : (item?.qty !== undefined ? item.qty : 1)) || 1);
    const cost = safeParsePrice(addon?.cost ?? addon?.addonCost ?? addon?.unitCost ?? addon?.supplierCost ?? addon?.supplyCost ?? addon?.purchaseCost ?? addon?.baseCost ?? addon?.costPrice ?? 0);
    if (cost <= 0) return 0;

    const selectedQty = computeAddonSelectedQuantity(addon);
    const hasExplicitQty = addon?.quantity !== undefined || addon?.qty !== undefined || addon?.count !== undefined || addon?.selectedQuantity !== undefined || addon?.selectedQty !== undefined || addon?.value !== undefined;
    if (hasExplicitQty && selectedQty <= 0) return 0;

    let units = 0;
    if (hasExplicitQty) {
        units = isCoverageRangeAddon(addon) ? Math.max(selectedQty, getCoverageUnits(addon, itemQty)) : selectedQty;
    } else if (addon?.calculationType === 'fixed') {
        units = 1;
    } else if (isCoverageRangeAddon(addon) || addon?.calculationType === 'per_x_items') {
        units = getPerXUnits(addon, itemQty);
    } else {
        units = itemQty;
    }

    const free = Math.max(0, Number(addon?.freeQuantity || addon?.freeQty || 0));
    return cost * Math.max(0, units - free);
};

/**
 * Calculates total addons revenue for an entire invoice.
 * Note: 'fixed' type addons are deduplicated by ID if they are meant to be "Fixed for Order".
 * However, since they are associated with items, we keep the simplest logic unless specified.
 * According to user: "Fixed for full order... regardless of product count".
 */
export const computeInvoiceAddonsTotal = (inv: any, products: any[] = []): number => {
    let total = 0;
    const directInvoiceTotal = safeParsePrice(inv?.addonsTotal ?? inv?.addOnsTotal ?? inv?.extrasTotal ?? inv?.addonsRevenue ?? inv?.addonsAmount);
    const processedFixedAddons = new Set<string>();
    let foundItemAddons = false;

    (inv.items || []).forEach((item: any) => {
        const directItemAddonsTotal = safeParsePrice(item?.addonsTotal ?? item?.addOnsTotal ?? item?.extrasTotal ?? item?.addonsRevenue ?? item?.addonsAmount);
        let itemAddons: any = getInvoiceItemAddons(item);
        if (directItemAddonsTotal > 0 && (!itemAddons || itemAddons.length === 0)) {
            total += directItemAddonsTotal;
            foundItemAddons = true;
            return;
        }
        if (itemAddons.length > 0) foundItemAddons = true;
        itemAddons.forEach((addon: any) => {
            if (addon.calculationType === 'fixed') {
                const key = `${addon.id || addon.name}-${addon.name || ''}`;
                if (!processedFixedAddons.has(key)) {
                    total += computeAddonRevenue(addon, item, products);
                    processedFixedAddons.add(key);
                }
            } else {
                total += computeAddonRevenue(addon, item, products);
            }
        });
    });

    let invoiceLevelAddons: any = getInvoiceLevelAddons(inv);
    if (!foundItemAddons && invoiceLevelAddons.length > 0) {
        invoiceLevelAddons.forEach((addon: any) => {
            total += computeAddonRevenue(addon, { quantity: inv?.quantity || 1 }, products);
        });
        foundItemAddons = true;
    }

    // Some older invoices store the addons amount on the invoice itself rather than inside each item.
    return total > 0 || foundItemAddons ? total : directInvoiceTotal;
};

/**
 * Calculates total addons cost for an entire invoice.
 */
export const computeInvoiceAddonsTotalCost = (inv: any, products: any[] = []): number => {
    let total = 0;
    const processedFixedAddons = new Set<string>();

    (inv.items || []).forEach((item: any) => {
        const itemAddons = getInvoiceItemAddons(item);
        itemAddons.forEach((addon: any) => {
            if (addon.calculationType === 'fixed') {
                const key = `${addon.id || addon.name}-${addon.name || ''}`;
                if (!processedFixedAddons.has(key)) {
                    total += computeAddonCost(addon, item, products);
                    processedFixedAddons.add(key);
                }
            } else {
                total += computeAddonCost(addon, item, products);
            }
        });
    });
    return total;
};



export const computeDeliveryBreakdown = (zone: any, deliveryType: any) => {
    const cost = safeParsePrice(zone?.cost ?? zone?.companyCost ?? zone?.deliveryCost ?? 0);
    const profit = safeParsePrice(zone?.profit ?? zone?.deliveryProfit ?? 0);
    const finalPrice = safeParsePrice(zone?.finalPrice ?? zone?.price ?? zone?.deliveryFee ?? (cost + profit));
    const type = deliveryType || 'company';
    if (type === 'free') return { deliveryFee: 0, deliveryCost: 0, deliveryProfit: 0, collectedForCompany: 0 };
    if (type === 'company') return { deliveryFee: finalPrice, deliveryCost: finalPrice, deliveryProfit: 0, collectedForCompany: finalPrice };
    if (type === 'special') return { deliveryFee: finalPrice, deliveryCost: 0, deliveryProfit: 0, collectedForCompany: 0 };
    return { deliveryFee: finalPrice, deliveryCost: cost, deliveryProfit: profit, collectedForCompany: 0 };
};

export const getInvoiceBaseItemsTotal = (inv: any, dataProducts: any[] = []) => {
    return (inv?.items || []).reduce((acc: number, item: any) => {
        const basePrice = computeInvoiceItemBasePrice(item, dataProducts);
        const qty = Number(item.quantity !== undefined ? item.quantity : (item.qty !== undefined ? item.qty : 1));
        return acc + (basePrice * qty);
    }, 0);
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
    let itemAddons: any = getInvoiceItemAddons(item);
    itemAddons.forEach((addon: any) => {
        addonsTotal += computeAddonRevenue(addon, item, dataProducts);
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
    return baseItemsTotal + computeInvoiceAddonsTotal(inv, dataProducts);
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
    return cost + computeInvoiceAddonsTotalCost(inv, dataProducts);
};

/**
 * Calculates the net profit of an invoice.
 */
export const computeInvoiceProfit = (inv: any, dataProducts: any[]) => {
    const subtotal = computeInvoiceSubtotal(inv, dataProducts);
    const cost = computeInvoiceCost(inv, dataProducts);
    const gatewayFee = Number(inv.gatewayFee || 0);
    const discount = Number(inv.discount || 0);
    const deliveryType = inv.deliveryType || 'company';
    const storedDeliveryProfit = Number(inv?.deliveryInfo?.profit ?? inv?.deliveryProfit ?? 0);
    const zoneProfit = Number(inv?.deliveryInfo?.zoneProfit ?? 0);
    const deliveryProfit = deliveryType === 'standard' ? (storedDeliveryProfit || zoneProfit) : 0;
    return Math.max(0, subtotal - cost - gatewayFee - discount + deliveryProfit);
};
