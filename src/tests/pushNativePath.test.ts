import { afterEach, describe, expect, it, vi } from 'vitest';
import { pushHealthView } from '../lib/pushHealthView';

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock('firebase/messaging', () => ({ getMessaging: () => ({}), isSupported: async () => true, onMessage: vi.fn(), getToken: vi.fn(), deleteToken: vi.fn() }));
vi.mock('../firebase', () => ({ auth: { currentUser: { uid: 'u', email: 'a@b.c' } } }));

function setup(native: boolean, withPlugin: boolean) {
  vi.resetModules();
  const register = vi.fn(async () => ({}));
  const plugin = {
    checkPermissions: vi.fn(async () => ({ receive: 'granted' })),
    requestPermissions: vi.fn(async () => ({ receive: 'granted' })),
    register: vi.fn(async () => {}),
    addListener: vi.fn(async (ev: string, cb: (p: any) => void) => {
      if (ev === 'registration') setTimeout(() => cb({ value: 'apns-token' }), 0);
      return { remove: async () => {} };
    }),
  };
  vi.stubGlobal('Capacitor', native ? { isNativePlatform: () => true, getPlatform: () => 'ios', Plugins: withPlugin ? { PushNotifications: plugin } : {} } : undefined);
  const values = new Map<string, string>();
  const storage = { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => void values.set(k, v) };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('window', { localStorage: storage, location: { href: 'https://x/' }, screen: {}, matchMedia: () => ({ matches: false }) });
  vi.stubGlobal('Notification', Object.assign(vi.fn(), { permission: 'default', requestPermission: vi.fn(async () => 'granted') }));
  vi.stubGlobal('navigator', { serviceWorker: { register, ready: Promise.resolve({}) }, userAgent: 'iPhone', language: 'ar' });
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
  vi.stubGlobal('fetch', fetch);
  return { register, plugin, fetch };
}
afterEach(() => { vi.unstubAllGlobals(); });

describe('push inside the native iOS app', () => {
  it('registers through the Capacitor plugin only (no service worker, no web permission prompt)', async () => {
    const c = setup(true, true);
    const m = await import('../lib/pushNotifications');
    const r = await m.registerPushNotifications();
    expect(r.success).toBe(true);
    expect(c.plugin.register).toHaveBeenCalled();
    expect(c.register).not.toHaveBeenCalled();
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
    expect(c.fetch.mock.calls[0][0]).toBe('/api/push/save-apns-token');
    const s = await m.getPushSupportStatus();
    expect(s.hasServiceWorker).toBe(false);
  });
  it('never falls back to the web path when the plugin is missing', async () => {
    const c = setup(true, false);
    const m = await import('../lib/pushNotifications');
    const r = await m.registerPushNotifications();
    expect(r).toEqual({ success: false, error: 'حدّث التطبيق من App Store' });
    expect(await m.getPushSupportStatus()).toMatchObject({ supported: false, hasServiceWorker: false });
    await m.startForegroundPushListenerIfAllowed();
    expect(c.register).not.toHaveBeenCalled();
    expect((globalThis as any).Notification.requestPermission).not.toHaveBeenCalled();
  });
  it('hides service-worker and browser wording in the health card', () => {
    const v = pushHealthView(true);
    expect(v.showServiceWorker).toBe(false);
    expect(JSON.stringify(v)).not.toMatch(/متصفح|Safari|Service Worker/);
  });
});

describe('push in a browser (unchanged)', () => {
  it('still registers the service worker and asks the web permission', async () => {
    const c = setup(false, false);
    (globalThis as any).Notification.permission = 'default';
    const m = await import('../lib/pushNotifications');
    await m.registerPushNotifications();
    expect((globalThis as any).Notification.requestPermission).toHaveBeenCalled();
    expect(c.register).toHaveBeenCalledWith('/firebase-messaging-sw.js', expect.anything());
  });
  it('keeps the browser health wording', () => {
    const v = pushHealthView(false);
    expect(v.showServiceWorker).toBe(true);
    expect(v.subject).toBe('هذا المتصفح');
    expect(v.needsActivation).toBe('يحتاج تفعيل من المتصفح');
  });
});
