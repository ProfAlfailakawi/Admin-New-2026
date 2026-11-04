import { describe, expect, it } from 'vitest';
import { deletionCovers, isHiddenAsDeleted, mergedInvoiceIsDeleted } from '../lib/invoiceDeletion';

describe('invoice deletion visibility', () => {
  it('hides a deleted unpaid invoice', () => {
    expect(isHiddenAsDeleted({ id: 'INV-1', isDeleted: true, paymentStatus: 'pending' })).toBe(true);
  });

  it('never hides a paid invoice, even when flagged deleted', () => {
    expect(isHiddenAsDeleted({ id: 'INV-1', isDeleted: true, paymentStatus: 'paid' })).toBe(false);
    expect(isHiddenAsDeleted({ id: 'INV-1', isDeleted: true, status: 'تم الدفع بنجاح' })).toBe(false);
  });

  it('deletion covers the copy it deleted (mirror row written at creation)', () => {
    const archive = { id: 'INV-1', isDeleted: true, deletedAt: '2026-10-01T12:00:00Z', date: '2026-10-01T10:00:00Z' };
    const mirror = { id: 'INV-1', isDeleted: false, date: '2026-10-01T10:00:00Z', paymentStatus: 'pending' };
    expect(deletionCovers(archive, mirror)).toBe(true);
  });

  it('deletion does not cover a new invoice that reused the number later', () => {
    const oldMirror = { id: 'INV-1', isDeleted: true, deletedAt: '2026-10-01T12:00:00Z' };
    const fresh = { id: 'INV-1', date: '2026-10-02T09:00:00Z', paymentStatus: 'pending' };
    expect(deletionCovers(oldMirror, fresh)).toBe(false);
  });

  it('deletion does not cover a copy that got paid', () => {
    const deleted = { id: 'INV-1', isDeleted: true, deletedAt: '2026-10-01T12:00:00Z' };
    const paid = { id: 'INV-1', date: '2026-10-01T10:00:00Z', paymentStatus: 'paid' };
    expect(deletionCovers(deleted, paid)).toBe(false);
  });

  it('keeps the old behaviour when no deletion time is recorded', () => {
    expect(deletionCovers({ id: 'INV-1', isDeleted: true }, { id: 'INV-1', date: '2026-10-02T09:00:00Z' })).toBe(true);
  });

  it('hides an invoice when both archive and mirror confirm deletion despite an old archive tombstone', () => {
    const archive = { id: 'INV-5138', isDeleted: true, deletedAt: '2026-11-03T12:40:39Z', createdAt: '2026-11-03T16:44:26Z', paymentStatus: 'pending' };
    const mirror = { id: 'INV-5138', isDeleted: true, deletedAt: '2026-11-04T21:29:05Z', createdAt: '2026-11-03T16:44:26Z', paymentStatus: 'pending' };
    expect(mergedInvoiceIsDeleted(archive, mirror)).toBe(true);
  });

  it('still shows a new invoice when only the old copy was deleted', () => {
    const old = { id: 'INV-1', isDeleted: true, deletedAt: '2026-10-01T12:00:00Z' };
    const fresh = { id: 'INV-1', isDeleted: false, createdAt: '2026-10-02T09:00:00Z' };
    expect(mergedInvoiceIsDeleted(old, fresh)).toBe(false);
  });
});
