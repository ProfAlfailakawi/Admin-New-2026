import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PUSH_RECIPIENT_EMAILS,
  buildAllowedRecipientEmails,
  describePushTokenAuthorization,
  isAllowedPushRecipient,
  resolvePushTokenIdentity,
  selectAllowedPushRecipientRecords,
  shouldRequirePushTokenRenewal,
  wasPushTokenRejectedByFcm,
  type PushTokenRecordForArchive,
} from '../lib/pushRecipients';

// These tests exist because push delivery stopped silently: a refactor dropped two
// approved recipients, erased token identity on refresh, and retired tokens that were
// only inactive because the allow-list had narrowed. None of it was caught, because
// none of it was covered. Each block below locks one of those regressions.

const device = (over: Partial<PushTokenRecordForArchive> = {}): PushTokenRecordForArchive => ({
  token: 'token-default',
  tokenDocId: 'doc-default',
  deviceLabel: 'Push device',
  userEmail: 'volcanokw@gmail.com',
  ...over,
});

describe('approved recipient list', () => {
  it('contains every account that must receive push notifications', () => {
    // Locking the exact list: dropping an entry here stops delivery to every device
    // that person owns, so that change must be deliberate and visible in review.
    expect([...DEFAULT_PUSH_RECIPIENT_EMAILS]).toEqual([
      'volcanokw@gmail.com',
      'dr.ahmad.alfailakawi@gmail.com',
      'alfailakawidrahmad@gmail.com',
      'mfq241188@gmail.com',
      'omaralawadhi67@gmail.com',
    ]);
  });

  it('authorizes the two accounts that an earlier refactor removed', () => {
    const allowed = buildAllowedRecipientEmails();
    expect(isAllowedPushRecipient('dr.ahmad.alfailakawi@gmail.com', allowed)).toBe(true);
    expect(isAllowedPushRecipient('alfailakawidrahmad@gmail.com', allowed)).toBe(true);
  });

  it('matches regardless of casing or surrounding whitespace', () => {
    const allowed = buildAllowedRecipientEmails();
    expect(isAllowedPushRecipient('  Dr.Ahmad.AlFailakawi@Gmail.com ', allowed)).toBe(true);
  });

  it('rejects an unknown address and a blank one', () => {
    const allowed = buildAllowedRecipientEmails();
    expect(isAllowedPushRecipient('stranger@example.com', allowed)).toBe(false);
    expect(isAllowedPushRecipient('', allowed)).toBe(false);
    expect(isAllowedPushRecipient(undefined, allowed)).toBe(false);
  });

  it('falls back to the defaults when the override is blank, never to an empty set', () => {
    // An empty PUSH_ALLOWED_RECIPIENT_EMAILS must not silently mute every recipient.
    for (const raw of ['', '   ', ',', ' , ', undefined, null]) {
      expect(buildAllowedRecipientEmails(raw).size).toBe(DEFAULT_PUSH_RECIPIENT_EMAILS.length);
    }
  });

  it('honours an explicit override', () => {
    const allowed = buildAllowedRecipientEmails(' Only@Example.com , second@example.com ');
    expect([...allowed]).toEqual(['only@example.com', 'second@example.com']);
    expect(isAllowedPushRecipient('volcanokw@gmail.com', allowed)).toBe(false);
  });
});

describe('recipient selection at send time', () => {
  const allowed = buildAllowedRecipientEmails();

  it('keeps every healthy device belonging to one approved account', () => {
    // Collapsing by email used to pick one token and silently drop the person's
    // other phone or browser.
    const { selected } = selectAllowedPushRecipientRecords([
      device({ token: 'phone', tokenDocId: 'a' }),
      device({ token: 'laptop', tokenDocId: 'b' }),
    ], allowed);

    expect(selected.map((r) => r.token).sort()).toEqual(['laptop', 'phone']);
  });

  it('skips unapproved, inactive and permission-denied registrations', () => {
    const { selected, skipped } = selectAllowedPushRecipientRecords([
      device({ token: 'good' }),
      device({ token: 'stranger', userEmail: 'stranger@example.com' }),
      device({ token: 'retired', active: false }),
      device({ token: 'blocked', notificationPermission: 'denied' }),
      device({ token: 'blocked-legacy', permission: 'DENIED' }),
    ], allowed);

    expect(selected.map((r) => r.token)).toEqual(['good']);
    expect(skipped).toBe(4);
  });

  it('keeps the freshest record when the same token appears twice', () => {
    const { selected } = selectAllowedPushRecipientRecords([
      device({ token: 'same', tokenDocId: 'old', updatedAtMs: 100 }),
      device({ token: 'same', tokenDocId: 'new', updatedAtMs: 900 }),
    ], allowed);

    expect(selected).toHaveLength(1);
    expect(selected[0].tokenDocId).toBe('new');
  });

  it('returns nothing rather than throwing on an empty input', () => {
    expect(selectAllowedPushRecipientRecords([], allowed)).toEqual({ selected: [], skipped: 0 });
  });
});

describe('token identity on refresh', () => {
  it('keeps the stored email when a background refresh posts none', () => {
    // Overwriting these with null stripped the field authorization is keyed on, so a
    // working device de-authorized itself on its next silent refresh.
    const identity = resolvePushTokenIdentity(
      { userId: '', userEmail: '', userName: '', userRole: '' },
      {
        userId: 'uid-1',
        userEmail: 'dr.ahmad.alfailakawi@gmail.com',
        userName: 'Ahmad',
        userRole: 'admin',
      },
    );

    expect(identity).toEqual({
      userId: 'uid-1',
      userEmail: 'dr.ahmad.alfailakawi@gmail.com',
      userName: 'Ahmad',
      userRole: 'admin',
    });
  });

  it('prefers incoming values over stored ones', () => {
    const identity = resolvePushTokenIdentity(
      { userId: 'uid-2', userEmail: 'volcanokw@gmail.com', userName: 'New', userRole: 'partner' },
      { userId: 'uid-1', userEmail: 'dr.ahmad.alfailakawi@gmail.com', userName: 'Old', userRole: 'admin' },
    );

    expect(identity.userId).toBe('uid-2');
    expect(identity.userEmail).toBe('volcanokw@gmail.com');
    expect(identity.userName).toBe('New');
    expect(identity.userRole).toBe('partner');
  });

  it('reads legacy field names and normalizes the email', () => {
    const identity = resolvePushTokenIdentity(
      {},
      { uid: 'uid-legacy', email: '  VolcanoKW@Gmail.com ', displayName: 'Legacy', role: 'admin' },
    );

    expect(identity.userId).toBe('uid-legacy');
    expect(identity.userEmail).toBe('volcanokw@gmail.com');
    expect(identity.userName).toBe('Legacy');
    expect(identity.userRole).toBe('admin');
  });

  it('yields null rather than the string "undefined" when nothing is known', () => {
    expect(resolvePushTokenIdentity({}, undefined)).toEqual({
      userId: null,
      userEmail: null,
      userName: null,
      userRole: null,
    });
  });

  it('survives a refresh without losing authorization', () => {
    const allowed = buildAllowedRecipientEmails();
    const stored = { userEmail: 'alfailakawidrahmad@gmail.com', active: true };

    const identity = resolvePushTokenIdentity({ userId: 'uid' }, stored);
    const verdict = describePushTokenAuthorization({
      userEmail: identity.userEmail,
      permissionDenied: false,
      allowed,
    });

    expect(verdict.active).toBe(true);
  });
});

describe('token renewal guard', () => {
  const context = { exists: true, recipientAuthorized: true, permissionDenied: false };

  it('recognizes only genuine FCM rejection or replacement', () => {
    expect(wasPushTokenRejectedByFcm({ invalidReason: 'unregistered' })).toBe(true);
    expect(wasPushTokenRejectedByFcm({ invalidatedAt: 123 })).toBe(true);
    expect(wasPushTokenRejectedByFcm({ replacedByTokenHash: 'abc' })).toBe(true);
    expect(wasPushTokenRejectedByFcm({ replacedAt: 123 })).toBe(true);
    expect(wasPushTokenRejectedByFcm({ active: false })).toBe(false);
    expect(wasPushTokenRejectedByFcm(null)).toBe(false);
  });

  it('demands renewal for a token FCM actually rejected', () => {
    expect(shouldRequirePushTokenRenewal({ active: false, invalidReason: 'unregistered' }, context)).toBe(true);
  });

  it('revives a token that went inactive only because the allow-list had narrowed', () => {
    // This is the difference that turned a recoverable state into a permanent one:
    // inactive without an FCM rejection must come back once the account is approved.
    expect(shouldRequirePushTokenRenewal({ active: false }, context)).toBe(false);
  });

  it('does not demand renewal for an active token, an unknown one, or an unapproved account', () => {
    expect(shouldRequirePushTokenRenewal({ active: true, invalidReason: 'x' }, context)).toBe(false);
    expect(shouldRequirePushTokenRenewal({ active: false, invalidReason: 'x' }, { ...context, exists: false })).toBe(false);
    expect(shouldRequirePushTokenRenewal({ active: false, invalidReason: 'x' }, { ...context, recipientAuthorized: false })).toBe(false);
    expect(shouldRequirePushTokenRenewal({ active: false, invalidReason: 'x' }, { ...context, permissionDenied: true })).toBe(false);
  });
});

describe('authorization verdict is explicit', () => {
  const allowed = buildAllowedRecipientEmails();

  it('approves an allow-listed account that granted permission', () => {
    const verdict = describePushTokenAuthorization({
      userEmail: 'volcanokw@gmail.com',
      permissionDenied: false,
      allowed,
    });

    expect(verdict).toEqual({ active: true, recipientAuthorized: true, code: 'ok', message: null });
  });

  it('never reports a deliverable token without a reason when it is not', () => {
    // The outage was invisible because registration answered a bare success while
    // storing active:false. Any non-deliverable verdict must carry an explanation.
    const cases = [
      { userEmail: 'stranger@example.com', permissionDenied: false, code: 'recipient-not-approved' },
      { userEmail: '', permissionDenied: false, code: 'missing-email' },
      { userEmail: 'volcanokw@gmail.com', permissionDenied: true, code: 'permission-denied' },
    ];

    for (const { code, ...input } of cases) {
      const verdict = describePushTokenAuthorization({ ...input, allowed });
      expect(verdict.active).toBe(false);
      expect(verdict.code).toBe(code);
      expect(verdict.message).toBeTruthy();
    }
  });

  it('names the account that is not approved so the cause is visible', () => {
    const verdict = describePushTokenAuthorization({
      userEmail: 'stranger@example.com',
      permissionDenied: false,
      allowed,
    });

    expect(verdict.message).toContain('stranger@example.com');
  });

  it('reports a missing email before blaming the allow-list', () => {
    const verdict = describePushTokenAuthorization({ userEmail: null, permissionDenied: true, allowed });
    expect(verdict.code).toBe('missing-email');
  });
});
