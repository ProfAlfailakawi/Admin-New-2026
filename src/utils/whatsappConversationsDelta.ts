// Delta polling for the WhatsApp inbox. Re-reading 80 conversations every few seconds
// cost ~860k Firestore reads per day for one open screen; asking only for what changed
// since the last sync costs one read when nothing happened.

export type ConversationLike = { id: string; lastMessageAt?: unknown } & Record<string, unknown>;

const iso = (value: unknown) => (typeof value === 'string' ? value : '');

/** Newest lastMessageAt in the list ('' when none), compared as ISO strings. */
export function latestConversationStamp(list: ConversationLike[]): string {
  let latest = '';
  for (const item of list) {
    const stamp = iso(item?.lastMessageAt);
    if (stamp > latest) latest = stamp;
  }
  return latest;
}

/** Merge changed conversations into the current list, newest first, capped at `limit`. */
export function mergeConversationDelta<T extends ConversationLike>(current: T[], changed: T[], limit = 80): T[] {
  if (!changed.length) return current;
  const byId = new Map<string, T>();
  for (const item of current) byId.set(item.id, item);
  for (const item of changed) byId.set(item.id, { ...(byId.get(item.id) || {}), ...item } as T);
  return [...byId.values()]
    .sort((a, b) => (iso(b.lastMessageAt) < iso(a.lastMessageAt) ? -1 : iso(b.lastMessageAt) > iso(a.lastMessageAt) ? 1 : 0))
    .slice(0, limit);
}
