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

// ---------------------------------------------------------------------------------
// Regression, 2026-09-17: the 10-minute "not paid yet" reminders arrived beautifully,
// and the payment confirmation that followed never did. The lock was keyed on the
// invoice alone, and every sender stamped it — so the reminder's stamp, minutes old,
// made the paid alert judge itself a duplicate and go silent.
// ---------------------------------------------------------------------------------

import { alertAnnouncementKey, alertStage } from '../lib/pushAlertIdentity';

describe('a reminder must never silence the confirmation that follows it', () => {
  const TAG = 'payment-final-state-invoice-INV-7001';

  it('gives the unpaid reminder and the paid alert different announcement identities', () => {
    expect(alertAnnouncementKey('invoice_pending_immediate', TAG))
      .not.toBe(alertAnnouncementKey('invoice_paid', TAG));
    expect(alertAnnouncementKey('payment_pending_10min', TAG))
      .not.toBe(alertAnnouncementKey('payment_paid', TAG));
  });

  it('replays the production sequence: pending → 10min → paid, with the paid alert delivered', () => {
    // The lock store as the server drives it: read your own stage's stamp, and stamp
    // only when your stage has a suppression window.
    const locks = new Map<string, number>();
    const send = (alertType: string, nowMs: number): boolean => {
      const key = alertAnnouncementKey(alertType, TAG);
      const engaged = duplicateSuppressionWindowMs(alertType) > 0;
      if (engaged && isDuplicateAlertSend({ alertType, lastSentAtMs: locks.get(key) ?? 0, nowMs })) return false;
      if (engaged) locks.set(key, nowMs);
      return true;
    };

    const t0 = 1_800_000_000_000;
    expect(send('invoice_pending_immediate', t0)).toBe(true);          // reminder: delivered
    expect(send('payment_pending_10min', t0 + 10 * 60_000)).toBe(true); // 10min: delivered
    expect(send('invoice_paid', t0 + 14 * 60_000)).toBe(true);          // THE PAYMENT: delivered
    expect(send('invoice_paid', t0 + 15 * 60_000)).toBe(false);         // duplicate paid: suppressed
  });

  it('a failed attempt must not silence the successful retry either', () => {
    expect(alertAnnouncementKey('invoice_payment_failed', TAG))
      .not.toBe(alertAnnouncementKey('invoice_paid', TAG));
  });

  it('still collapses the two senders of one paid alert onto one identity', () => {
    // The INV-5109 duplicate stays fixed: paid, captured and success are one stage.
    expect(alertAnnouncementKey('invoice_paid', TAG)).toBe(alertAnnouncementKey('payment_captured', TAG));
    expect(alertAnnouncementKey('invoice_paid', TAG)).toBe(alertAnnouncementKey('payment_success', TAG));
  });

  it('classifies stages exactly as the service worker does', () => {
    expect(alertStage('payment_pending_10min')).toBe('pending-followup');
    expect(alertStage('payment_pending_30min')).toBe('pending-followup');
    expect(alertStage('invoice_pending_immediate')).toBe('pending-initial');
    expect(alertStage('invoice_payment_failed')).toBe('failed');
    expect(alertStage('invoice_paid')).toBe('paid');
    expect(alertStage('admin_device_test')).toBe('admin_device_test');
  });
});
