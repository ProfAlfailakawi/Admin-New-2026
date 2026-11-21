// Keeps payment-status polling from flooding UPayments.
//
// Why: the dashboard re-asks /api/invoice/confirm every few seconds for every pending invoice, from
// every open device, and each confirm can try many identifiers (2 UPayments requests each). Stale
// invoices that UPayments answers with 404 forever turned this into hundreds of requests a minute,
// and UPayments' Cloudflare answered with 429 / a "Just a moment" HTML challenge — which then also
// blocked creating new payment links from the same server.
//
// Two guards, both in-memory per server instance (no data is changed):
//  1. Per-invoice backoff: after an inconclusive check, the same invoice is not re-checked against
//     UPayments until a growing delay has passed (15s, 30s, 1m ... capped at 15m).
//  2. Rate-limit cooldown: any 429 / HTML challenge pauses ALL status lookups for 60s, doubling on
//     repeats (capped at 10m), so the remaining budget is left for creating payment links.

export const STATUS_BACKOFF_BASE_MS = 15_000;
export const STATUS_BACKOFF_MAX_MS = 15 * 60_000;
export const RATE_LIMIT_COOLDOWN_BASE_MS = 60_000;
export const RATE_LIMIT_COOLDOWN_MAX_MS = 10 * 60_000;
const MAX_TRACKED_INVOICES = 2_000;

/** True for a UPayments response that means "slow down" (429, or a Cloudflare challenge page). */
export function isUPaymentsRateLimited(status: number, body?: unknown): boolean {
  if (status === 429) return true;
  if (typeof body === "string" && /<title>\s*Just a moment/i.test(body)) return true;
  return false;
}

type InvoiceEntry = { failures: number; nextAllowedAt: number; lastResult: any };

export function createUPaymentsStatusThrottle(now: () => number = Date.now) {
  const invoices = new Map<string, InvoiceEntry>();
  let cooldownUntil = 0;
  let cooldownStrikes = 0;

  function key(invoiceId: unknown) {
    return String(invoiceId ?? "").trim();
  }

  return {
    /** Remaining cooldown in ms after a rate-limit hit (0 = free to call UPayments). */
    cooldownRemainingMs(): number {
      return Math.max(0, cooldownUntil - now());
    },

    /** Call when UPayments rate-limits us. Returns the cooldown length applied. */
    noteRateLimited(): number {
      const t = now();
      const lengthFor = (strikes: number) =>
        Math.min(RATE_LIMIT_COOLDOWN_BASE_MS * 2 ** strikes, RATE_LIMIT_COOLDOWN_MAX_MS);
      // A hit after a quiet period (the previous cooldown expired + its length again) starts over.
      if (t > cooldownUntil + lengthFor(cooldownStrikes)) cooldownStrikes = 0;
      const ms = lengthFor(cooldownStrikes);
      cooldownStrikes = Math.min(cooldownStrikes + 1, 10);
      cooldownUntil = Math.max(cooldownUntil, t + ms);
      return ms;
    },

    /**
     * If this invoice is still inside its backoff window, returns the cached inconclusive result
     * (and how long until the next real check). Otherwise null: go ahead and ask UPayments.
     */
    cached(invoiceId: unknown): { result: any; retryInMs: number } | null {
      const e = invoices.get(key(invoiceId));
      if (!e) return null;
      const wait = e.nextAllowedAt - now();
      return wait > 0 ? { result: e.lastResult, retryInMs: wait } : null;
    },

    /** Record an inconclusive check (no paid/failed answer); schedules the next allowed check. */
    noteInconclusive(invoiceId: unknown, result: any): number {
      const k = key(invoiceId);
      if (!k) return 0;
      const prev = invoices.get(k);
      const failures = (prev?.failures ?? 0) + 1;
      const delay = Math.min(STATUS_BACKOFF_BASE_MS * 2 ** (failures - 1), STATUS_BACKOFF_MAX_MS);
      invoices.delete(k); // re-insert to keep Map order = recency for the size cap below
      invoices.set(k, { failures, nextAllowedAt: now() + delay, lastResult: result });
      if (invoices.size > MAX_TRACKED_INVOICES) invoices.delete(invoices.keys().next().value as string);
      return delay;
    },

    /** Final answer (paid/failed) or a fresh payment link: forget the backoff for this invoice. */
    reset(invoiceId: unknown) {
      invoices.delete(key(invoiceId));
    },
  };
}

export const upaymentsStatusThrottle = createUPaymentsStatusThrottle();
