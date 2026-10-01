import { afterEach, describe, expect, it, vi } from 'vitest';

const firebase = vi.hoisted(() => ({ onMessage: vi.fn(), getToken: vi.fn(), deleteToken: vi.fn(), auth: { currentUser: { uid: 'owner', email: 'volcanokw@gmail.com' } } }));
vi.mock('firebase/app', () => ({ initializeApp: vi.fn(), getApps: () => [{}] }));
vi.mock('firebase/messaging', () => ({ getMessaging: () => ({}), isSupported: async () => true, onMessage: firebase.onMessage, getToken: firebase.getToken, deleteToken: firebase.deleteToken }));
vi.mock('../firebase', () => ({ auth: firebase.auth }));

function setup() {
  vi.resetModules();
  vi.clearAllMocks();
  const values = new Map();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) };
  const showNotification = vi.fn(async () => {});
  const registration = { showNotification, update: async () => {}, pushManager: { getSubscription: async () => ({}) } };
  const notificationConstructor = vi.fn(function () { throw new Error('Illegal constructor on mobile'); });
  Object.assign(notificationConstructor, { permission: 'granted' });
  vi.stubGlobal('Notification', notificationConstructor);
  vi.stubGlobal('window', { localStorage: storage, location: { origin: 'https://example.com', href: 'https://example.com/' }, screen: {} });
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('sessionStorage', storage);
  vi.stubGlobal('navigator', { serviceWorker: { ready: Promise.resolve(registration), register: vi.fn(async () => registration) }, userAgent: 'iPhone', language: 'ar' });
  const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ success: true }) }));
  vi.stubGlobal('fetch', fetch);
  firebase.getToken.mockResolvedValue('healthy-token');
  firebase.deleteToken.mockResolvedValue(true);
  return { showNotification, notificationConstructor, fetch };
}

afterEach(() => { vi.unstubAllGlobals(); });

describe('push client', () => {
  it('uses the worker to display foreground notifications on phones', async () => {
    const context = setup();
    const client = await import('../lib/pushNotifications');
    await client.startForegroundPushListenerIfAllowed();
    firebase.onMessage.mock.calls[0][1]({ data: { title: 'Test', body: 'hello', eventId: 'event-1', url: '/?order=1' } });
    await vi.waitFor(() => expect(context.showNotification).toHaveBeenCalledTimes(1));
    expect(context.notificationConstructor).not.toHaveBeenCalled();
    expect(context.showNotification).toHaveBeenCalledWith('Test', expect.objectContaining({ data: expect.objectContaining({ url: '/?order=1' }) }));
  });
  it('deduplicates concurrent foreground deliveries while display is pending', async () => {
    const context = setup();
    let release!: () => void;
    context.showNotification.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const client = await import('../lib/pushNotifications');
    await client.startForegroundPushListenerIfAllowed();
    const receive = firebase.onMessage.mock.calls[0][1];
    receive({ data: { eventId: 'same-event' } });
    receive({ data: { eventId: 'same-event' } });
    await vi.waitFor(() => expect(context.showNotification).toHaveBeenCalledTimes(1));
    release();
    await vi.waitFor(() => expect(context.fetch).toHaveBeenCalledTimes(1));
  });
  it('does not mark failed foreground display as delivered or suppress a retry', async () => {
    const context = setup();
    context.showNotification.mockRejectedValueOnce(new Error('temporary failure'));
    const client = await import('../lib/pushNotifications');
    await client.startForegroundPushListenerIfAllowed();
    const receive = firebase.onMessage.mock.calls[0][1];
    receive({ data: { eventId: 'event-1' } });
    await vi.waitFor(() => expect(context.showNotification).toHaveBeenCalledTimes(1));
    expect(context.fetch).not.toHaveBeenCalled();
    receive({ data: { eventId: 'event-1' } });
    await vi.waitFor(() => expect(context.fetch).toHaveBeenCalledTimes(1));
    expect(context.showNotification).toHaveBeenCalledTimes(2);
  });
  it('serializes a refresh and forced renewal so the old token cannot be saved last', async () => {
    const context = setup();
    let release!: () => void;
    const firstSave = new Promise<void>((resolve) => { release = resolve; });
    context.fetch.mockImplementationOnce(async () => { await firstSave; return { ok: true, json: async () => ({ success: true }) }; });
    const client = await import('../lib/pushNotifications');
    const refresh = client.refreshPushRegistrationIfAlreadyAllowed();
    await vi.waitFor(() => expect(context.fetch).toHaveBeenCalledTimes(1));
    const renewal = client.renewPushRegistrationIfAlreadyAllowed();
    // Both callers reached registration; only the first may touch the FCM token.
    await new Promise((resolve) => setTimeout(resolve, 70));
    expect(firebase.deleteToken).not.toHaveBeenCalled();
    release();
    expect((await refresh).success).toBe(true);
    expect((await renewal).success).toBe(true);
    expect(firebase.deleteToken).toHaveBeenCalledTimes(1);
  });
});
