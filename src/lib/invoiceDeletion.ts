import { isPaidStatus } from './status-utils';

/**
 * When a soft-deleted invoice copy should hide the invoice in the ledger.
 *
 * Only unpaid invoices can be deleted, so a deletion flag must never hide an invoice
 * that is paid now: either a customer paid the link of an invoice that had been
 * deleted, or a new invoice reused the number of a deleted one and inherited its flag
 * (the mirror doc is written with merge: true). Both showed a paid invoice for a moment
 * and then removed it from سجل الفواتير.
 */

const toMs = (raw: any): number => {
  if (!raw) return 0;
  if (typeof raw?.toDate === 'function') return raw.toDate().getTime();
  if (typeof raw?.seconds === 'number') return raw.seconds * 1000;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

export const isInvoicePaid = (inv: any): boolean =>
  Boolean(inv) && (isPaidStatus(inv.paymentStatus) || isPaidStatus(inv.payment_status) || isPaidStatus(inv.status) || inv.paid === true);

/** Hidden only when flagged deleted and not paid. */
export const isHiddenAsDeleted = (inv: any): boolean =>
  Boolean(inv?.isDeleted) && !isInvoicePaid(inv);

/**
 * Does the deletion recorded on `deletedCopy` apply to `otherCopy` of the same id?
 * Yes unless the other copy was created after the deletion (a reused number) or
 * either copy is paid. Without a deletion time the deletion applies, as before.
 */
export const deletionCovers = (deletedCopy: any, otherCopy: any): boolean => {
  if (isInvoicePaid(deletedCopy) || isInvoicePaid(otherCopy)) return false;
  const deletedAt = toMs(deletedCopy?.deletedAt);
  if (!deletedAt) return true;
  const bornAt = toMs(otherCopy?.createdAt || otherCopy?.date);
  return !bornAt || bornAt <= deletedAt;
};
