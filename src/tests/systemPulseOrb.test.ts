import { describe, expect, it } from 'vitest';
import { countActivePending } from '../components/SystemPulseOrb';

describe('countActivePending', () => {
  const now = new Date('2026-10-28T12:00:00Z').getTime();

  it('ignores invoices left unpaid for weeks', () => {
    const data: any = { orders: [], invoices: [{ id: 'INV-5110', date: '2026-09-15T12:18:53Z', paymentStatus: 'pending' }] };
    expect(countActivePending(data, now)).toBe(0);
  });

  it('counts recent pending invoices and orders', () => {
    const data: any = {
      orders: [{ id: 'O1', status: 'failed', createdAt: '2026-10-28T09:00:00Z' }],
      invoices: [
        { id: 'I1', date: '2026-10-27T20:00:00Z', paymentStatus: 'pending' },
        { id: 'I2', date: '2026-10-28T10:00:00Z', paymentStatus: 'pending', isDeleted: true },
      ],
    };
    expect(countActivePending(data, now)).toBe(2);
  });
});
