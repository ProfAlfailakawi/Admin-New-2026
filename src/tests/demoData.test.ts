import { describe, it, expect } from 'vitest';
import { GET_DEMO_DATA } from '../data';

describe('demo dataset', () => {
  const d = GET_DEMO_DATA();

  it('is populated across every collection', () => {
    expect(d.customers.length).toBeGreaterThan(40);
    expect(d.products.length).toBeGreaterThan(20);
    expect(d.suppliers.length).toBeGreaterThan(5);
    expect(d.invoices.length).toBeGreaterThan(400);
    expect(d.orders.length).toBeGreaterThan(30);
    expect(d.expenses.length).toBeGreaterThan(30);
    expect(d.supplierTransfers.length).toBeGreaterThan(10);
    expect((d.promocodes || []).length).toBeGreaterThan(3);
    expect((d.squads || []).length).toBeGreaterThan(3);
    expect(d.testimonials.length).toBeGreaterThan(5);
    expect(d.notifications.length).toBeGreaterThan(5);
  });

  it('keeps cross-entity references consistent', () => {
    const customers = new Set(d.customers.map(c => c.id));
    const products = new Set(d.products.map(p => p.id));
    const suppliers = new Set(d.suppliers.map(s => s.id));
    const invoices = new Set(d.invoices.map(i => i.id));
    d.invoices.forEach(i => {
      expect(customers.has(i.customerId)).toBe(true);
      i.items.forEach(it => expect(products.has(it.productId)).toBe(true));
      expect(Number.isFinite(i.totalAmount)).toBe(true);
    });
    d.products.forEach(p => expect(suppliers.has(p.supplierId)).toBe(true));
    d.supplierTransfers.forEach(t => expect(suppliers.has(t.supplierId)).toBe(true));
    d.orders.forEach(o => { if (o.linkedInvoiceId) expect(invoices.has(o.linkedInvoiceId)).toBe(true); });
    d.testimonials.forEach(t => expect(invoices.has(t.invoiceId as string)).toBe(true));
  });

  it('spreads dates over the last ~6 months and never into the future', () => {
    const now = Date.now();
    const times = d.invoices.map(i => +new Date(i.date));
    expect(Math.max(...times)).toBeLessThanOrEqual(now);
    expect(now - Math.min(...times)).toBeGreaterThan(120 * 86400000);
  });
});
