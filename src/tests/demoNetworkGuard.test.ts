// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Demo mode must make ZERO real network calls. The guard is fail-closed: only same-origin
 * static GET passes; /api is answered locally; everything else is refused and recorded.
 */
async function bootDemo() {
  vi.resetModules();
  const realFetch = vi.fn(async () => new Response('static', { status: 200 }));
  (window as any).fetch = realFetch;
  delete (window as any).__ktkDemoFetchGuard;
  window.history.pushState({}, '', '/?demo=1');
  await import('../lib/demoMode');
  return { realFetch };
}

describe('demo network guard (fail closed)', () => {
  beforeEach(() => { try { sessionStorage.clear(); } catch {} });

  it('answers /api locally and never hits the real fetch', async () => {
    const { realFetch } = await bootDemo();
    const r = await fetch('/api/appdata/full');
    expect(r.status).toBe(200);
    const r2 = await fetch('/api/payments/create', { method: 'POST', body: JSON.stringify({ amount: 5 }) });
    expect((await r2.json()).demo).toBe(true);
    expect(realFetch).not.toHaveBeenCalled();
  });

  it.each([
    'https://firestore.googleapis.com/v1/projects/x/databases/(default)/documents',
    'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
    'https://apiv2.upayments.com/api/v1/charge',
    'https://generativelanguage.googleapis.com/v1beta/models/gemini:generateContent',
    'https://graph.facebook.com/v19.0/123/messages',
    'https://admin.alturathkw.shop/not-api-but-post',
  ])('refuses %s without a real call', async (url) => {
    const { realFetch } = await bootDemo();
    const r = await fetch(url, { method: 'POST', body: '{}' });
    expect((await r.json()).demo).toBe(true);
    expect(realFetch).not.toHaveBeenCalled();
    expect((window as any).__ktkDemoBlocked.length).toBeGreaterThan(0);
  });

  it('refuses a cross-origin GET too, but lets the app load its own static files', async () => {
    const { realFetch } = await bootDemo();
    await fetch('https://example.com/data.json');
    expect(realFetch).not.toHaveBeenCalled();
    await fetch('/manifest.json');
    expect(realFetch).toHaveBeenCalledTimes(1);
  });

  it('blocks XHR, WebSocket, EventSource and sendBeacon', async () => {
    await bootDemo();
    expect(() => new XMLHttpRequest().open('GET', 'https://example.com/x')).toThrow();
    expect(() => new XMLHttpRequest().open('POST', '/api/x')).toThrow();
    expect(() => new (window as any).WebSocket('wss://example.com')).toThrow();
    if ((window as any).EventSource) expect(() => new (window as any).EventSource('https://example.com')).toThrow();
    expect(navigator.sendBeacon('https://example.com', 'x')).toBe(false);
    const kinds = (window as any).__ktkDemoBlocked.map((b: any) => b.kind);
    expect(kinds).toEqual(expect.arrayContaining(['xhr', 'websocket', 'beacon']));
  });

  it('does nothing outside demo mode', async () => {
    vi.resetModules();
    const realFetch = vi.fn(async () => new Response('ok'));
    (window as any).fetch = realFetch;
    delete (window as any).__ktkDemoFetchGuard;
    window.history.pushState({}, '', '/');
    const mod = await import('../lib/demoMode');
    expect(mod.IS_DEMO_MODE).toBe(false);
    await fetch('https://example.com/x');
    expect(realFetch).toHaveBeenCalledTimes(1);
  });
});
