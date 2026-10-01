/**
 * Version rules for the server's in-memory copy of the company data.
 *
 * Every cached value remembers the Firestore update time (ms) of the document it came
 * from; 0 means unknown. These two rules keep that copy from going backwards and tell
 * the server which documents to reload before serving them.
 */

/** A late or replayed listener event must never replace a newer value with an older one. */
export function shouldApplyCachedVersion(incoming: number, current: number): boolean {
  return !(incoming && current && incoming < current);
}

/** Firestore holds a newer version than the cache (or the cache's version is unknown). */
export function isCachedVersionStale(firestoreUpdated: number, cached: number): boolean {
  return Boolean(firestoreUpdated) && firestoreUpdated > (cached || 0);
}
