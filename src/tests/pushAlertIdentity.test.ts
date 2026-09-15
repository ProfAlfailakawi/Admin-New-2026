import { describe, it, expect } from 'vitest';
import {
  alertLockDocId,
  duplicateSuppressionWindowMs,
  isDuplicateAlertSend,
  semanticAlertKey,
} from '../lib/pushAlertIdentity';

// One paid invoice arrived as two identical notifications. Two senders announce it: the
// instant path reads the `invoices` collection, the sweep worker reads the lagging
// `appData/shared_company_data` mirror. Each claims a per-sender event id that embeds an
// "era" derived from its own copy of the record, so when the copies disagree about the
// date the claims miss each other and both sends go out.
//
// These tests pin the property that fixes it: both senders must agree on what the alert
// IS, from data they both already have — the business id in the URL.

const PAID = 'invoice_paid';

describe('two senders agree on the identity of one alert', () => {
  it('collapses the same invoice onto one key despite different event ids', () => {
    const url = 'https://admin.alturathkw.shop/?invoice=INV-5109';

    // The era suffix is exactly what diverged between the two senders.
    const instant = semanticAlertKey(PAID, url, 'safe-worker-invoice-paid-INV-5109@202609151203');
    const sweep = semanticAlertKey(PAID, url, 'safe-worker-invoice-paid-INV-5109');

    expect(instant).toBe(sweep);
    expect(instant).toBe('payment-final-state-invoice-INV-5109');
  });

  it('keeps different invoices apart', () => {
    const key = (id: string) => semanticAlertKey(PAID, `https://x/?invoice=${id}`, 'e');
    expect(key('INV-5109')).not.toBe(key('INV-5110'));
  });

  it('keeps an order distinct from an invoice of the same number', () => {
    expect(semanticAlertKey('payment_paid', 'https://x/?order=5109', 'e'))
      .not.toBe(semanticAlertKey(PAID, 'https://x/?invoice=5109', 'e'));
  });

  it('decodes a percent-encoded id so both senders land on one key', () => {
    expect(semanticAlertKey(PAID, 'https://x/?invoice=INV%2D5109', 'e'))
      .toBe('payment-final-state-invoice-INV-5109');
  });

  it('survives a malformed percent-encoding instead of throwing', () => {
    expect(() => semanticAlertKey(PAID, 'https://x/?invoice=INV-%E0%A4%A', 'fallback')).not.toThrow();
  });

  it('falls back to the event id when the alert is not about a payment', () => {
    expect(semanticAlertKey('daily_summary', 'https://x/?invoice=INV-1', 'summary-1')).toBe('summary-1');
  });

  it('falls back to the event id when the URL carries no business id', () => {
    expect(semanticAlertKey(PAID, 'https://admin.alturathkw.shop/', 'event-9')).toBe('event-9');
  });
});

describe('what counts as a repeat', () => {
  const now = 1_800_000_000_000;

  it('suppresses a second paid alert arriving after the first', () => {
    expect(isDuplicateAlertSend({ alertType: PAID, lastSentAtMs: now - 60_000, nowMs: now })).toBe(true);
  });

  it('suppresses a sweep that reaches the invoice hours after the instant path', () => {
    // The window has to outlast the lag between the two senders, or the duplicate returns.
    expect(isDuplicateAlertSend({ alertType: PAID, lastSentAtMs: now - 5 * 60 * 60 * 1000, nowMs: now })).toBe(true);
  });

  it('lets the same invoice alert again once the window has passed', () => {
    expect(isDuplicateAlertSend({ alertType: PAID, lastSentAtMs: now - 7 * 60 * 60 * 1000, nowMs: now })).toBe(false);
  });

  it('never suppresses an alert that was never sent', () => {
    for (const lastSentAtMs of [0, null, undefined, Number.NaN]) {
      expect(isDuplicateAlertSend({ alertType: PAID, lastSentAtMs, nowMs: now })).toBe(false);
    }
  });

  it('treats a failed alert as a final state too', () => {
    expect(isDuplicateAlertSend({ alertType: 'invoice_payment_failed', lastSentAtMs: now - 1000, nowMs: now })).toBe(true);
  });

  it('never collapses the pending stages into each other', () => {
    // 10-minute and 30-minute alerts are new information about the same invoice.
    for (const alertType of ['invoice_pending_immediate', 'payment_pending_10min', 'payment_pending_30min']) {
      expect(duplicateSuppressionWindowMs(alertType)).toBe(0);
      expect(isDuplicateAlertSend({ alertType, lastSentAtMs: now - 1000, nowMs: now })).toBe(false);
    }
  });

  it('never suppresses a manual device test', () => {
    expect(isDuplicateAlertSend({ alertType: 'admin_device_test', lastSentAtMs: now - 1000, nowMs: now })).toBe(false);
  });

  it('treats a stored timestamp in the future as a repeat rather than waving it through', () => {
    expect(isDuplicateAlertSend({ alertType: PAID, lastSentAtMs: now + 60_000, nowMs: now })).toBe(true);
  });
});

describe('the lock document id', () => {
  it('strips characters Firestore will not accept in a document id', () => {
    expect(alertLockDocId('payment-final-state-invoice-INV/5109')).not.toContain('/');
  });

  it('keeps distinct keys distinct after sanitizing', () => {
    expect(alertLockDocId('payment-final-state-invoice-INV-5109'))
      .not.toBe(alertLockDocId('payment-final-state-invoice-INV-5110'));
  });

  it('stays within a safe length and never returns an empty id', () => {
    expect(alertLockDocId('x'.repeat(500)).length).toBeLessThanOrEqual(180);
    expect(alertLockDocId('')).toBe('unknown');
    expect(alertLockDocId('///')).toBe('___');
  });
});
