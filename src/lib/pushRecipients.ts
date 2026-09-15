// Single source of truth for push-notification recipient authorization.
//
// This logic used to live inline in server.ts with a hand-copied duplicate of the
// allow-list in GeneralSettings.tsx. The two copies drifted during a refactor: two
// approved addresses were dropped, every device belonging to them was filtered out at
// send time, and registration still reported success — so delivery stopped with no
// visible error. Keeping the list and the rules here, covered by tests, is what stops
// that from happening again. Import from this module; never re-declare the list.

export type PushTokenRecordForArchive = {
  token: string;
  tokenDocId: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userRole?: string;
  deviceId?: string;
  deviceLabel: string;
  platform?: string;
  deviceType?: string;
  browser?: string;
  permission?: string;
  notificationPermission?: string;
  active?: boolean;
  invalidReason?: string;
  updatedAtMs?: number;
};

/**
 * Approved push recipients. Removing an address here silently stops delivery to every
 * device that person owns, so treat this list as production configuration: change it
 * deliberately, and expect `pushRecipients.test.ts` to fail until the test is updated
 * to match the intended list.
 */
export const DEFAULT_PUSH_RECIPIENT_EMAILS = [
  "volcanokw@gmail.com",
  "dr.ahmad.alfailakawi@gmail.com",
  "alfailakawidrahmad@gmail.com",
  "mfq241188@gmail.com",
  "omaralawadhi67@gmail.com",
] as const;

function lower(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function normalizeRecipientEmail(value: unknown): string {
  return lower(value);
}

/** Normalizes a Notification.permission string for comparison. */
export function normalizeNotificationPermission(value: unknown): string {
  return lower(value);
}

/**
 * Builds the effective allow-list. `raw` is the PUSH_ALLOWED_RECIPIENT_EMAILS override;
 * a blank or absent value falls back to the defaults rather than to an empty set, so a
 * misconfigured environment variable cannot silently disable every recipient.
 */
export function buildAllowedRecipientEmails(raw?: string | null): Set<string> {
  const source = String(raw ?? "").trim() || DEFAULT_PUSH_RECIPIENT_EMAILS.join(",");
  const emails = source
    .split(",")
    .map(normalizeRecipientEmail)
    .filter(Boolean);

  return new Set(emails.length ? emails : DEFAULT_PUSH_RECIPIENT_EMAILS.map(normalizeRecipientEmail));
}

export function isAllowedPushRecipient(email: unknown, allowed: Set<string>): boolean {
  const normalized = normalizeRecipientEmail(email);
  return Boolean(normalized && allowed.has(normalized));
}

export function pushRecordIsAllowedRecipient(
  record: PushTokenRecordForArchive | null | undefined,
  allowed: Set<string>,
): boolean {
  return isAllowedPushRecipient(record?.userEmail, allowed);
}

/**
 * Keeps every approved, healthy device. Device-level de-duplication happens before this
 * filter; collapsing again by email used to select one stale token and silently exclude
 * another healthy phone or browser belonging to the same account.
 *
 * Returns the skipped count so the caller can log it — the filter itself stays pure and
 * testable.
 */
export function selectAllowedPushRecipientRecords(
  records: PushTokenRecordForArchive[],
  allowed: Set<string>,
): { selected: PushTokenRecordForArchive[]; skipped: number } {
  const uniqueByToken = new Map<string, PushTokenRecordForArchive>();

  for (const record of records) {
    const permission = normalizeNotificationPermission(record.notificationPermission || record.permission);
    if (!pushRecordIsAllowedRecipient(record, allowed)) continue;
    if (record.active === false || permission === "denied") continue;

    const current = uniqueByToken.get(record.token);
    if (!current || Number(record.updatedAtMs || 0) > Number(current.updatedAtMs || 0)) {
      uniqueByToken.set(record.token, record);
    }
  }

  const selected = [...uniqueByToken.values()];
  return { selected, skipped: records.length - selected.length };
}

/**
 * A token is only truly dead when FCM rejected it or a newer registration replaced it.
 * A token that went inactive merely because the allow-list was too narrow must be
 * allowed back once the account is approved again — otherwise narrowing the list even
 * briefly retires every device permanently.
 */
export function wasPushTokenRejectedByFcm(existing: Record<string, any> | null | undefined): boolean {
  return Boolean(
    existing?.invalidReason ||
    existing?.invalidatedAt ||
    existing?.replacedByTokenHash ||
    existing?.replacedAt,
  );
}

export function shouldRequirePushTokenRenewal(
  existing: Record<string, any> | null | undefined,
  context: { exists: boolean; recipientAuthorized: boolean; permissionDenied: boolean },
): boolean {
  if (!context.exists) return false;
  if (existing?.active !== false) return false;
  if (!context.recipientAuthorized || context.permissionDenied) return false;
  return wasPushTokenRejectedByFcm(existing);
}

/**
 * Preserves stored identity when a refresh arrives without it. Background refreshes can
 * post empty user fields; overwriting the stored values with null strips the email that
 * authorization is keyed on, which quietly de-authorizes a working device.
 */
export function resolvePushTokenIdentity(
  incoming: { userId?: unknown; userEmail?: unknown; userName?: unknown; userRole?: unknown },
  existing: Record<string, any> | null | undefined,
): { userId: string | null; userEmail: string | null; userName: string | null; userRole: string | null } {
  const pick = (...values: unknown[]) => {
    for (const value of values) {
      const text = String(value ?? "").trim();
      if (text) return text;
    }
    return null;
  };

  const email = pick(incoming.userEmail, existing?.userEmail, existing?.email);

  return {
    userId: pick(incoming.userId, existing?.userId, existing?.uid),
    userEmail: email ? normalizeRecipientEmail(email) : null,
    userName: pick(incoming.userName, existing?.userName, existing?.displayName),
    userRole: pick(incoming.userRole, existing?.userRole, existing?.role),
  };
}

export type PushAuthorizationVerdict = {
  active: boolean;
  recipientAuthorized: boolean;
  code: "ok" | "recipient-not-approved" | "permission-denied" | "missing-email";
  message: string | null;
};

/**
 * Explains why a token will or will not receive pushes. Registration used to answer a
 * bare `{ success: true }` even when it had just stored `active: false`, so the UI
 * reported success while delivery was impossible. Callers surface `message` instead.
 */
export function describePushTokenAuthorization(context: {
  userEmail: unknown;
  permissionDenied: boolean;
  allowed: Set<string>;
}): PushAuthorizationVerdict {
  const email = normalizeRecipientEmail(context.userEmail);
  const recipientAuthorized = isAllowedPushRecipient(email, context.allowed);

  if (!email) {
    return {
      active: false,
      recipientAuthorized: false,
      code: "missing-email",
      message: "لم يتم التعرف على بريد الحساب؛ سجّل الدخول ثم أعد تفعيل الإشعارات",
    };
  }

  if (!recipientAuthorized) {
    return {
      active: false,
      recipientAuthorized: false,
      code: "recipient-not-approved",
      message: `الحساب ${email} غير مُصرّح له باستقبال الإشعارات؛ راجع قائمة المستلمين المعتمدة`,
    };
  }

  if (context.permissionDenied) {
    return {
      active: false,
      recipientAuthorized: true,
      code: "permission-denied",
      message: "المتصفح رافض للإشعارات على هذا الجهاز؛ فعّلها من إعدادات الموقع",
    };
  }

  return { active: true, recipientAuthorized: true, code: "ok", message: null };
}
