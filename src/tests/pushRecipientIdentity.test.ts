import { describe, it, expect } from 'vitest';
import { inheritPushRecipientEmail, type PushTokenLookup } from '../lib/pushRecipientIdentity';

const allowed = new Set(['volcanokw@gmail.com', 'mfq241188@gmail.com', 'omaralawadhi67@gmail.com']);

function lookupFrom(rows: Record<string, any>[]): PushTokenLookup {
  return async (field, value) => rows.filter((row) => String(row[field] || '') === value);
}

// A phone whose push subscription was destroyed mints a new token on the next silent
// refresh. If Firebase auth has not restored the user yet, that token has no email and
// used to be saved inactive, so the phone went silent until the app was reinstalled.
describe('a new push token without an email', () => {
  const older = [
    { deviceId: 'omar-iphone', userId: 'uid-omar', userEmail: 'OmarAlawadhi67@gmail.com', active: false },
    { deviceId: 'mfq-iphone', userId: 'uid-mfq', userEmail: 'mfq241188@gmail.com' },
    { deviceId: 'stranger', userId: 'uid-x', userEmail: 'someone@example.com' },
  ];

  it('takes the approved email of an older token from the same install', async () => {
    expect(await inheritPushRecipientEmail(lookupFrom(older), allowed, 'omar-iphone', '')).toBe('omaralawadhi67@gmail.com');
  });

  it('falls back to the same account when the install id is new', async () => {
    expect(await inheritPushRecipientEmail(lookupFrom(older), allowed, 'brand-new-install', 'uid-mfq')).toBe('mfq241188@gmail.com');
  });

  it('never grants an email that is not approved', async () => {
    expect(await inheritPushRecipientEmail(lookupFrom(older), allowed, 'stranger', 'uid-x')).toBe('');
  });

  it('ignores the generic "admin" placeholder and missing ids', async () => {
    const rows = [{ userId: 'admin', userEmail: 'volcanokw@gmail.com' }];
    expect(await inheritPushRecipientEmail(lookupFrom(rows), allowed, '', 'admin')).toBe('');
    expect(await inheritPushRecipientEmail(lookupFrom(rows), allowed, undefined, undefined)).toBe('');
  });

  it('keeps going when one lookup fails', async () => {
    const flaky: PushTokenLookup = async (field, value) => {
      if (field === 'deviceId') throw new Error('index missing');
      return older.filter((row) => row.userId === value);
    };
    expect(await inheritPushRecipientEmail(flaky, allowed, 'omar-iphone', 'uid-omar')).toBe('omaralawadhi67@gmail.com');
  });
});
