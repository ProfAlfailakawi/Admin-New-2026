import { describe, it, expect } from 'vitest';
import { registrationOwnsPushSubscription } from '../lib/app-update';

// Notifications stopped for a week with no error: the silent self-update's hard-refresh
// escalation called getRegistrations() and unregistered every service worker, including
// the one that owns the push subscription. Firebase kept the token in IndexedDB, FCM
// kept accepting sends to it, and the device displayed nothing.
//
// The app-shell purge must never take the messaging worker with it.

describe('the purge must spare the worker that owns the push subscription', () => {
  it('recognizes the messaging worker by its active script', () => {
    expect(registrationOwnsPushSubscription([
      'https://admin.example.com/firebase-messaging-sw.js',
    ])).toBe(true);
  });

  it('recognizes it while it is still installing or waiting', () => {
    expect(registrationOwnsPushSubscription([null, '/firebase-messaging-sw.js', null])).toBe(true);
    expect(registrationOwnsPushSubscription([null, null, '/firebase-messaging-sw.js'])).toBe(true);
  });

  it('recognizes it through a cache-busting query or a nested path', () => {
    expect(registrationOwnsPushSubscription(['/firebase-messaging-sw.js?v=42'])).toBe(true);
    expect(registrationOwnsPushSubscription(['https://cdn.example.com/static/firebase-messaging-sw.js'])).toBe(true);
  });

  it('leaves the app-shell worker purgeable', () => {
    expect(registrationOwnsPushSubscription(['https://admin.example.com/service-worker.js'])).toBe(false);
    expect(registrationOwnsPushSubscription(['/sw.js'])).toBe(false);
  });

  it('treats an empty or unknown registration as purgeable', () => {
    expect(registrationOwnsPushSubscription([])).toBe(false);
    expect(registrationOwnsPushSubscription([null, undefined, ''])).toBe(false);
  });

  it('spares a registration where only one of its workers is the messaging worker', () => {
    // A registration mid-update carries two scripts; if either is the messaging worker,
    // unregistering still destroys the subscription.
    expect(registrationOwnsPushSubscription([
      '/service-worker.js',
      '/firebase-messaging-sw.js',
    ])).toBe(true);
  });
});

describe('the purge filter applied to a realistic set of registrations', () => {
  const unregisterable = (registrations: { scripts: (string | null)[]; id: string }[]) =>
    registrations
      .filter((registration) => !registrationOwnsPushSubscription(registration.scripts))
      .map((registration) => registration.id);

  it('removes the shell worker and keeps the messaging worker', () => {
    expect(unregisterable([
      { id: 'shell', scripts: ['/service-worker.js'] },
      { id: 'messaging', scripts: ['/firebase-messaging-sw.js'] },
    ])).toEqual(['shell']);
  });

  it('never returns an empty-handed purge that also kept nothing alive', () => {
    const registrations = [
      { id: 'shell', scripts: ['/service-worker.js'] },
      { id: 'messaging', scripts: ['/firebase-messaging-sw.js'] },
    ];
    const removed = unregisterable(registrations);

    expect(removed).not.toContain('messaging');
    expect(registrations.length - removed.length).toBe(1);
  });
});
