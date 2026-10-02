/**
 * Display-only Arabic labels for a few English UI words.
 * Never use these for comparisons, storage or payloads: the raw value stays the source of truth.
 */
const LABELS: Record<string, string> = {
  KNET: 'كي-نت',
  KNet: 'كي-نت',
  VIP: 'مميز',
  Ctrl: 'كنترول',
};

/** Returns the Arabic display label for a raw value, or the raw value when none is mapped. */
export function displayLabel<T>(raw: T): T | string {
  if (typeof raw !== 'string') return raw;
  return Object.prototype.hasOwnProperty.call(LABELS, raw) ? LABELS[raw] : raw;
}
