import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function worker() {
  const listeners: Record<string, any> = {};
  const entries = new Map();
  const showNotification = vi.fn(async () => {});
  const getNotifications = vi.fn(async () => { throw new Error('unsupported'); });
  const fetch = vi.fn(async () => ({}));
  const caches = { open: async () => ({ match: async (key: string) => entries.get(key), put: async (key: string, value: any) => { entries.set(key, value); } }) };
  const self = { addEventListener: (name: string, fn: any) => { listeners[name] = fn; }, registration: { showNotification, getNotifications }, location: { origin: 'https://example.com' }, caches };
  vm.runInNewContext(readFileSync('public/firebase-messaging-sw.js', 'utf8'), { self, caches, Response, URL, fetch, setTimeout: () => 0, console });
  const push = (data: any) => {
    let done: Promise<any> = Promise.resolve();
    listeners.push({ data: { json: () => ({ data }) }, waitUntil: (promise: Promise<any>) => { done = promise; } });
    return done;
  };
  return { push, showNotification, getNotifications, fetch };
}
const data = { title: 'Payment', body: 'Received', eventId: 'event-1', notificationTag: 'order-1', alertType: 'payment_paid', url: '/?order=1' };

describe('push worker delivery', () => {
  it('displays even when listing old notifications is unsupported', async () => {
    const w = worker();
    await w.push(data);
    expect(w.showNotification).toHaveBeenCalledWith('Payment', expect.objectContaining({ tag: 'order-1', body: 'Received' }));
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });
  it('deduplicates simultaneous and repeated deliveries', async () => {
    const w = worker();
    await Promise.all([w.push(data), w.push(data)]);
    await w.push(data);
    expect(w.showNotification).toHaveBeenCalledTimes(1);
  });
  it('keeps failed display retryable and never acknowledges it as received', async () => {
    const w = worker();
    w.showNotification.mockRejectedValueOnce(new Error('display unavailable'));
    await expect(w.push(data)).rejects.toThrow('display unavailable');
    expect(w.fetch).not.toHaveBeenCalled();
    await w.push(data);
    expect(w.showNotification).toHaveBeenCalledTimes(2);
    expect(w.fetch).toHaveBeenCalledTimes(1);
  });
  it('still displays the paid transition after a pending notification', async () => {
    const w = worker();
    await w.push({ ...data, alertType: 'payment_pending_immediate' });
    await w.push(data);
    expect(w.showNotification).toHaveBeenCalledTimes(2);
  });
  it('ships the same worker in both hosting entry points', () => {
    expect(readFileSync('firebase-messaging-sw.js', 'utf8')).toBe(readFileSync('public/firebase-messaging-sw.js', 'utf8'));
  });
});
