import { describe, it, expect } from 'vitest';
import {
  createUPaymentsStatusThrottle,
  isUPaymentsRateLimited,
  STATUS_BACKOFF_BASE_MS,
  STATUS_BACKOFF_MAX_MS,
  RATE_LIMIT_COOLDOWN_BASE_MS,
  RATE_LIMIT_COOLDOWN_MAX_MS,
} from '../lib/upaymentsThrottle';

function clock(start = 1_000_000) {
  let t = start;
  return { now: () => t, advance: (ms: number) => { t += ms; } };
}

describe('isUPaymentsRateLimited', () => {
  it('detects 429 and the Cloudflare challenge page', () => {
    expect(isUPaymentsRateLimited(429)).toBe(true);
    expect(isUPaymentsRateLimited(403, '<!DOCTYPE html><html lang="en-US"><head><title>Just a moment...</title>')).toBe(true);
    expect(isUPaymentsRateLimited(404, { status: false })).toBe(false);
    expect(isUPaymentsRateLimited(401, { error: 'Invalid signature' })).toBe(false);
    expect(isUPaymentsRateLimited(201, { status: true })).toBe(false);
  });
});

describe('per-invoice backoff', () => {
  it('serves the cached result until the backoff passes, doubling each time up to the cap', () => {
    const c = clock();
    const th = createUPaymentsStatusThrottle(c.now);
    const unknown = { success: true, verified: false, state: 'unknown' };

    expect(th.cached('INV-1')).toBeNull();
    expect(th.noteInconclusive('INV-1', unknown)).toBe(STATUS_BACKOFF_BASE_MS);
    expect(th.cached('INV-1')?.result).toEqual(unknown);

    c.advance(STATUS_BACKOFF_BASE_MS - 1);
    expect(th.cached('INV-1')).not.toBeNull();
    c.advance(1);
    expect(th.cached('INV-1')).toBeNull();

    expect(th.noteInconclusive('INV-1', unknown)).toBe(STATUS_BACKOFF_BASE_MS * 2);
    expect(th.noteInconclusive('INV-1', unknown)).toBe(STATUS_BACKOFF_BASE_MS * 4);
    for (let i = 0; i < 20; i++) th.noteInconclusive('INV-1', unknown);
    expect(th.noteInconclusive('INV-1', unknown)).toBe(STATUS_BACKOFF_MAX_MS);
  });

  it('keeps invoices independent and reset() forgets the backoff', () => {
    const c = clock();
    const th = createUPaymentsStatusThrottle(c.now);
    th.noteInconclusive('INV-1', {});
    expect(th.cached('INV-2')).toBeNull();
    th.reset('INV-1');
    expect(th.cached('INV-1')).toBeNull();
    expect(th.noteInconclusive('INV-1', {})).toBe(STATUS_BACKOFF_BASE_MS);
  });

  it('turns ~10s polling of a stale invoice into a handful of real checks per hour', () => {
    const c = clock();
    const th = createUPaymentsStatusThrottle(c.now);
    let realChecks = 0;
    for (let s = 0; s < 3600; s += 10) {
      if (!th.cached('INV-stale')) { realChecks++; th.noteInconclusive('INV-stale', {}); }
      c.advance(10_000);
    }
    expect(realChecks).toBeLessThanOrEqual(12); // was 360
  });
});

describe('rate-limit cooldown', () => {
  it('pauses lookups, doubles on repeated hits, caps, and restarts after a quiet period', () => {
    const c = clock();
    const th = createUPaymentsStatusThrottle(c.now);
    expect(th.cooldownRemainingMs()).toBe(0);

    expect(th.noteRateLimited()).toBe(RATE_LIMIT_COOLDOWN_BASE_MS);
    expect(th.cooldownRemainingMs()).toBe(RATE_LIMIT_COOLDOWN_BASE_MS);

    c.advance(RATE_LIMIT_COOLDOWN_BASE_MS);
    expect(th.cooldownRemainingMs()).toBe(0);
    expect(th.noteRateLimited()).toBe(RATE_LIMIT_COOLDOWN_BASE_MS * 2);
    for (let i = 0; i < 10; i++) th.noteRateLimited();
    expect(th.noteRateLimited()).toBe(RATE_LIMIT_COOLDOWN_MAX_MS);

    c.advance(RATE_LIMIT_COOLDOWN_MAX_MS * 50);
    expect(th.noteRateLimited()).toBe(RATE_LIMIT_COOLDOWN_BASE_MS);
  });
});
