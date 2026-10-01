/**
 * Recovers the approved email for a push token that arrived without one.
 *
 * The server only sends to tokens whose email is on the approved list. A phone that
 * lost its push subscription mints a new token on the next silent refresh, and that
 * refresh can run before Firebase auth has restored the user, so the token arrives
 * with no email and was saved as inactive: the phone stopped receiving until someone
 * reinstalled the app and enabled notifications by hand. The same install (deviceId)
 * or the same account (userId) already has an approved email on an older token.
 */
export type PushTokenLookup = (field: "deviceId" | "userId", value: string) => Promise<Array<Record<string, any>>>;

export async function inheritPushRecipientEmail(
  lookup: PushTokenLookup,
  allowedEmails: Set<string>,
  deviceId: unknown,
  userId: unknown,
): Promise<string> {
  const lookups: Array<["deviceId" | "userId", string]> = [];
  const device = String(deviceId || "").trim();
  const user = String(userId || "").trim();
  if (device) lookups.push(["deviceId", device]);
  // "admin" is the client's placeholder when no uid is known; it identifies nobody.
  if (user && user !== "admin") lookups.push(["userId", user]);

  for (const [field, value] of lookups) {
    let rows: Array<Record<string, any>> = [];
    try {
      rows = await lookup(field, value);
    } catch {
      continue;
    }
    for (const row of rows) {
      const email = String(row?.userEmail || row?.email || "").trim().toLowerCase();
      if (email && allowedEmails.has(email)) return email;
    }
  }
  return "";
}
