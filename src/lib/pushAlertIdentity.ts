// What makes two push alerts "the same alert".
//
// A paid invoice is announced by two independent senders: the instant path, which reads
// the `invoices` collection the moment the gateway confirms, and the sweep worker, which
// reads the `appData/shared_company_data` mirror. Both build their claim id from the
// business id plus an "era" suffix derived from the record's own date field — but each
// reads a different copy of that record. When the copies disagree about the date (the
// mirror lags, stores it as a string, or has not got the field yet), the two eras differ,
// the two claims land on different documents, both succeed, and the owner's phone shows
// the same payment twice.
//
// The fix is to claim on what the alert *means* rather than on which record a sender
// happened to read. Both senders already agree on the semantic key, because both derive
// the notification tag from the business id in the URL.
//
// Note this is deliberately NOT a client-side guard. The service worker's dedupe cache is
// bounded at 250ms and falls back to "show it" on timeout, because a guard that can delay
// a notification can also lose one — the failure mode that silenced delivery for a week.
// A best-effort guard cannot be the thing that makes duplicates impossible; the source can.

/**
 * The identity of an alert, independent of which sender produced it and which copy of the
 * record it read. Payment and invoice alerts collapse onto the business id carried in the
 * URL; everything else keeps its own event id, so unrelated alerts never merge.
 */
export function semanticAlertKey(alertType: string, url: string, fallbackEventId: string): string {
  const type = String(alertType || "").toLowerCase();
  if (!type.includes("payment") && !type.includes("invoice")) return fallbackEventId;

  const text = String(url || "");
  const invoiceMatch = text.match(/[?&]invoice=([^&#]+)/);
  const orderMatch = text.match(/[?&]order=([^&#]+)/);

  let id = "";
  try {
    id = decodeURIComponent(invoiceMatch?.[1] || orderMatch?.[1] || "");
  } catch {
    id = invoiceMatch?.[1] || orderMatch?.[1] || "";
  }
  if (!id) return fallbackEventId;

  return `payment-final-state-${invoiceMatch ? "invoice" : "order"}-${id}`;
}

/**
 * How long one alert stays "already announced".
 *
 * Sized by how far apart two senders can be, not by taste: the sweep worker can reach an
 * invoice long after the instant path announced it, so the window has to outlast that lag.
 * It is not unbounded — a recycled business id must be able to alert again later, which is
 * why the era suffix still guards the per-sender claim.
 *
 * Stage alerts (pending, 10-minute, 30-minute) return 0: each stage is a genuinely new
 * message about the same invoice and must never be collapsed into the previous one.
 */
export function duplicateSuppressionWindowMs(alertType: string): number {
  const type = String(alertType || "").toLowerCase();

  if (type.includes("pending") || type.includes("summary") || type.includes("test")) return 0;

  const isFinalState =
    type.includes("paid") ||
    type.includes("captured") ||
    type.includes("success") ||
    type.includes("failed");

  return isFinalState ? 6 * 60 * 60 * 1000 : 0;
}

/**
 * Is this send a repeat of one already made? `lastSentAtMs` is 0/null when the alert has
 * never been sent. A clock that appears to run backwards (a stored timestamp in the
 * future) is treated as a repeat rather than waved through, since a duplicate is the
 * thing being prevented.
 */
export function isDuplicateAlertSend(context: {
  alertType: string;
  lastSentAtMs: number | null | undefined;
  nowMs: number;
}): boolean {
  const window = duplicateSuppressionWindowMs(context.alertType);
  if (window <= 0) return false;

  const lastSentAtMs = Number(context.lastSentAtMs || 0);
  if (!Number.isFinite(lastSentAtMs) || lastSentAtMs <= 0) return false;

  const elapsed = Number(context.nowMs) - lastSentAtMs;
  if (!Number.isFinite(elapsed)) return false;

  return elapsed < window;
}

/**
 * The stage of the payment story an alert belongs to. Mirrors the service worker's own
 * pushDedupeKey classification, so the server and the device agree on what counts as
 * "the same announcement".
 *
 * This exists because the lock was first keyed on the invoice alone, and every sender
 * stamps the lock: a "not paid yet" reminder stamped it minutes before the customer
 * paid, and the paid alert then read that stamp as "already announced" and silenced
 * itself. The reminders arrived beautifully; the one alert that mattered never did.
 * An unpaid reminder and a payment confirmation are different announcements about the
 * same invoice — they must never share a lock.
 */
export function alertStage(alertType: string): string {
  const type = String(alertType || "general").toLowerCase();
  if (type.includes("pending") && (type.includes("10min") || type.includes("30min"))) return "pending-followup";
  if (type.includes("pending")) return "pending-initial";
  if (type.includes("failed")) return "failed";
  if (type.includes("paid") || type.includes("captured") || type.includes("success")) return "paid";
  return type;
}

/**
 * The identity of one announcement: which invoice AND which stage of its story.
 * Keying on the invoice alone lets any stage silence any other; keying on both keeps
 * "announce each payment once" without ever letting a reminder swallow a confirmation
 * — or a failed attempt swallow the successful retry that follows it.
 */
export function alertAnnouncementKey(alertType: string, semanticKey: string): string {
  return `${semanticKey}::${alertStage(alertType)}`;
}

/** Firestore document ids cannot contain "/" and must stay short. */
export function alertLockDocId(semanticKey: string): string {
  return String(semanticKey || "unknown")
    .replace(/[^A-Za-z0-9_.@-]/g, "_")
    .slice(0, 180) || "unknown";
}
