import { describe, expect, it } from 'vitest';
import { hasRoleFlag, ROLE_MATRIX, type AlturathRole, type RoleFlag } from '../lib/roleMatrix';
import { isCancelledStatus, isFailedStatus, isPaidStatus, isPendingStatus } from '../lib/status-utils';
import { findBestProductMatch, getLevenshteinDistance, getSimilarity } from '../lib/name-matching';
import {
  computeDeliveryBreakdown,
  computeInvoiceCost,
  computeInvoiceGatewayFee,
  computeInvoiceProfit,
  computeInvoiceTotal,
  safeParsePrice,
} from '../lib/invoice-calculations';

// Characterization tests: pin current behaviour of permissions, status
// classification, name matching and invoice money maths.

describe('roleMatrix', () => {
  const roles = Object.keys(ROLE_MATRIX) as AlturathRole[];
  const flags = Object.keys(ROLE_MATRIX.admin) as RoleFlag[];

  it('defines every flag for every role', () => {
    for (const role of roles) expect(Object.keys(ROLE_MATRIX[role]).sort()).toEqual([...flags].sort());
  });

  it('gives admin every permission', () => {
    for (const flag of flags) expect(hasRoleFlag('admin', flag)).toBe(true);
  });

  it('keeps finance and exports away from kitchen and employee roles', () => {
    for (const role of ['kitchen', 'employee'] as AlturathRole[]) {
      expect(hasRoleFlag(role, 'canViewFinance')).toBe(false);
      expect(hasRoleFlag(role, 'canExportReports')).toBe(false);
      expect(hasRoleFlag(role, 'canEditProducts')).toBe(false);
    }
  });

  it('lets only admin and local edit products', () => {
    expect(roles.filter((r) => hasRoleFlag(r, 'canEditProducts')).sort()).toEqual(['admin', 'local']);
  });

  it('falls back to the least-privileged employee role when the role is missing or unknown', () => {
    expect(hasRoleFlag(null, 'canViewFinance')).toBe(false);
    expect(hasRoleFlag(undefined, 'canManageOrders')).toBe(true);
    expect(hasRoleFlag('stranger' as AlturathRole, 'canViewFinance')).toBe(false);
  });
});

describe('payment status classification', () => {
  it('recognises paid statuses in English and Arabic, ignoring case and underscores', () => {
    for (const s of ['paid', 'PAID', 'out_for_delivery', 'تم الدفع', 'تم الدفع بنجاح', 'مدفوع', 'captured']) {
      expect(isPaidStatus(s)).toBe(true);
    }
    expect(isPaidStatus('pending')).toBe(false);
    expect(isPaidStatus('')).toBe(false);
    expect(isPaidStatus(null)).toBe(false);
  });

  it('treats a missing status as pending, and known waiting statuses as pending', () => {
    expect(isPendingStatus(undefined)).toBe(true);
    expect(isPendingStatus('awaiting_payment')).toBe(true);
    expect(isPendingStatus('بانتظار الدفع')).toBe(true);
    expect(isPendingStatus('paid')).toBe(false);
  });

  it('recognises failed and cancelled statuses without mixing them up', () => {
    expect(isFailedStatus('declined')).toBe(true);
    expect(isFailedStatus('فشلت عملية الدفع')).toBe(true);
    expect(isFailedStatus('paid')).toBe(false);
    expect(isFailedStatus(null)).toBe(false);
    expect(isCancelledStatus('Canceled')).toBe(true);
    expect(isCancelledStatus('ملغي - انتهى وقت القطية')).toBe(true);
    expect(isCancelledStatus('paid')).toBe(false);
  });

  it('never classifies a cancelled order as paid', () => {
    for (const s of ['cancelled', 'ملغي', 'تم الإلغاء']) expect(isPaidStatus(s)).toBe(false);
  });
});

describe('name matching', () => {
  it('computes edit distance', () => {
    expect(getLevenshteinDistance('', '')).toBe(0);
    expect(getLevenshteinDistance('abc', 'abc')).toBe(0);
    expect(getLevenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(getLevenshteinDistance('abc', '')).toBe(3);
  });

  it('scores identical names 1 and unrelated names low', () => {
    expect(getSimilarity('كبسة دجاج', 'كبسة دجاج')).toBe(1);
    expect(getSimilarity('كبسة دجاج', 'عصير برتقال')).toBeLessThan(0.5);
  });

  it('scores a contained name high, and reordered words above the threshold', () => {
    expect(getSimilarity('كبسة', 'كبسة دجاج')).toBeGreaterThan(0.7);
    expect(getSimilarity('دجاج كبسة', 'كبسة دجاج')).toBeGreaterThanOrEqual(0.7);
  });

  it('ignores Arabic spelling variants (alef forms, diacritics)', () => {
    expect(getSimilarity('أرز', 'ارز')).toBe(1);
  });

  describe('findBestProductMatch', () => {
    const products = [{ name: 'كبسة دجاج' }, { name: 'مندي لحم' }];

    it('rejects very short input', () => {
      expect(findBestProductMatch('ab', products)).toBeNull();
      expect(findBestProductMatch('', products)).toBeNull();
    });

    it('prefers learned memory over everything else', () => {
      expect(findBestProductMatch('كبسه دجاج', products, { 'كبسه دجاج': 'مندي لحم' })).toBe('مندي لحم');
    });

    it('returns the existing name on an exact normalised match', () => {
      expect(findBestProductMatch('كبسة دجاج', products)).toBe('كبسة دجاج');
    });

    it('finds a fuzzy match and returns null when nothing is close enough', () => {
      expect(findBestProductMatch('كبسة دجاجة', products)).toBe('كبسة دجاج');
      expect(findBestProductMatch('بيتزا مارغريتا', products)).toBeNull();
    });
  });
});

describe('invoice money maths', () => {
  it('safeParsePrice handles numbers, strings, Arabic digits and junk', () => {
    expect(safeParsePrice(12.5)).toBe(12.5);
    expect(safeParsePrice('1,250.5')).toBe(1250.5);
    expect(safeParsePrice('١٢٫٥')).not.toBeNaN();
    expect(safeParsePrice('abc')).toBe(0);
    expect(safeParsePrice(null)).toBe(0);
    expect(safeParsePrice('')).toBe(0);
    expect(safeParsePrice(undefined)).toBe(0);
  });

  it('computeDeliveryBreakdown splits cost/profit by delivery type', () => {
    const zone = { cost: 1, profit: 0.5, finalPrice: 2 };
    expect(computeDeliveryBreakdown(zone, 'free')).toEqual({ deliveryFee: 0, deliveryCost: 0, deliveryProfit: 0, collectedForCompany: 0 });
    expect(computeDeliveryBreakdown(zone, 'company')).toEqual({ deliveryFee: 2, deliveryCost: 2, deliveryProfit: 0, collectedForCompany: 2 });
    expect(computeDeliveryBreakdown(zone, 'special')).toEqual({ deliveryFee: 2, deliveryCost: 0, deliveryProfit: 0, collectedForCompany: 0 });
    expect(computeDeliveryBreakdown(zone, 'standard')).toEqual({ deliveryFee: 2, deliveryCost: 1, deliveryProfit: 0.5, collectedForCompany: 0 });
    expect(computeDeliveryBreakdown(zone, undefined)).toEqual(computeDeliveryBreakdown(zone, 'company'));
  });

  it('derives the delivery price from cost + profit when no final price exists', () => {
    expect(computeDeliveryBreakdown({ cost: 1, profit: 0.5 }, 'standard').deliveryFee).toBe(1.5);
  });

  const products = [{ id: 'p1', price: 5, cost: 3 }];
  const inv = (over: Record<string, unknown> = {}) => ({
    items: [{ productId: 'p1', quantity: 2 }],
    deliveryFee: 1,
    discount: 0.5,
    ...over,
  });

  it('prices items from the catalog and totals subtotal + delivery - discount', () => {
    expect(computeInvoiceTotal(inv(), products)).toBe(10 + 1 - 0.5);
  });

  it('prefers the price snapshot saved on the invoice over the current catalog price', () => {
    const snapshot = inv({ items: [{ productId: 'p1', quantity: 2, priceAtTime: 4 }] });
    expect(computeInvoiceTotal(snapshot, products)).toBe(8 + 1 - 0.5);
  });

  it('never returns a negative total', () => {
    expect(computeInvoiceTotal(inv({ discount: 999 }), products)).toBe(0);
  });

  it('computes cost from the snapshot when positive, otherwise from the catalog', () => {
    expect(computeInvoiceCost(inv(), products)).toBe(6);
    expect(computeInvoiceCost(inv({ items: [{ productId: 'p1', quantity: 2, costAtTime: 2 }] }), products)).toBe(4);
    // A stored 0 means "not entered", so the catalog cost is used instead.
    expect(computeInvoiceCost(inv({ items: [{ productId: 'p1', quantity: 2, costAtTime: 0 }] }), products)).toBe(6);
  });

  it('charges the gateway fee only on gateway payment methods', () => {
    expect(computeInvoiceGatewayFee({ paymentMethod: 'KNet', gatewayFee: '0.25' })).toBe(0.25);
    expect(computeInvoiceGatewayFee({ paymentMethod: 'Cash', gatewayFee: 0.25 })).toBe(0);
    expect(computeInvoiceGatewayFee({ gatewayFee: 0.25 })).toBe(0);
  });

  it('computes profit = subtotal - cost - gateway fee - discount (+ delivery profit for standard delivery)', () => {
    // subtotal 10, cost 6, fee 0.25, discount 0.5 => 3.25
    expect(computeInvoiceProfit(inv({ paymentMethod: 'KNet', gatewayFee: 0.25 }), products)).toBe(3.25);
    const standard = inv({ deliveryType: 'standard', deliveryInfo: { profit: 0.4 } });
    expect(computeInvoiceProfit(standard, products)).toBeCloseTo(10 - 6 - 0.5 + 0.4, 10);
    // company delivery never adds delivery profit
    expect(computeInvoiceProfit(inv({ deliveryProfit: 9 }), products)).toBe(3.5);
  });

  it('floors profit at zero', () => {
    expect(computeInvoiceProfit(inv({ discount: 50 }), products)).toBe(0);
  });
});
