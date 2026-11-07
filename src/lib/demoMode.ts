import { demoApiResponse } from './demoApi';
/**
 * Demo mode (presentation only).
 *
 * Enabled by opening the app with `?demo=1` (remembered for the browser tab through
 * sessionStorage) or by building with `VITE_DEMO_MODE=true`. Leave it with `?demo=0`.
 *
 * The visible entry is the "جرّب النسخة التجريبية" button on the sign-in screen
 * (`enterDemoMode()`): no account, no credentials.
 *
 * In demo mode the app never signs in, never talks to Firebase / the API server and
 * never writes anything: all data is generated in memory by `GET_DEMO_DATA()`.
 */
const KEY = 'ktk_demo_mode';

function detect(): boolean {
  try {
    if ((import.meta as any).env?.VITE_DEMO_MODE === 'true') return true;
    if (typeof window === 'undefined') return false;
    const q = new URLSearchParams(window.location.search).get('demo');
    if (q === '1' || q === 'true') {
      window.sessionStorage.setItem(KEY, '1');
      return true;
    }
    if (q === '0' || q === 'false') {
      window.sessionStorage.removeItem(KEY);
      return false;
    }
    return window.sessionStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export const IS_DEMO_MODE: boolean = detect();

/** Sign-in screen entry: remember demo for this tab and reload so every module boots in demo. */
export function enterDemoMode(): void {
  try { window.sessionStorage.setItem(KEY, '1'); } catch {}
  try {
    const url = new URL(window.location.href);
    url.pathname = '/';
    url.search = '?demo=1';
    url.hash = '';
    window.location.href = url.toString();
  } catch {}
}

export function exitDemoMode(): void {
  try { window.sessionStorage.removeItem(KEY); } catch {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '0');
    window.location.href = url.toString();
  } catch {}
}

/**
 * Demo network guard — FAIL CLOSED.
 *
 * In demo mode nothing may leave the browser toward a real backend:
 *  - same-origin `/api/*` is answered locally with canned fictitious data;
 *  - same-origin static GET/HEAD (the app's own files) is the only thing allowed through;
 *  - EVERYTHING else — any cross-origin fetch (Firebase, UPayments, Gemini, WhatsApp, Google),
 *    XMLHttpRequest, WebSocket, EventSource, sendBeacon, and non-GET same-origin calls — is
 *    refused locally. `window.__ktkDemoBlocked` records what was refused (used by tests).
 *
 * It installs itself when this module is first imported, i.e. before `firebase.ts`
 * initialises, so even the SDK's very first request is covered.
 */
const BLOCK_MESSAGE = 'النسخة التجريبية معزولة: لا تتصل بأي خدمة حقيقية';

function record(kind: string, target: string) {
  try {
    const w = window as any;
    (w.__ktkDemoBlocked ||= []).push({ kind, target: String(target).slice(0, 200) });
  } catch {}
}

export function installDemoNetworkGuard(): void {
  if (!IS_DEMO_MODE || typeof window === 'undefined') return;
  const w = window as any;
  if (w.__ktkDemoFetchGuard) return;
  w.__ktkDemoFetchGuard = true;
  w.__ktkDemoBlocked = [];
  // The guard refuses the Firebase SDK's own background request, which the SDK then reports as an
  // unhandled `auth/network-request-failed` rejection. That is the guard working as designed, so it is
  // swallowed here (demo only; no auth or data behaviour changes, nothing is retried or faked).
  window.addEventListener('unhandledrejection', (ev) => {
    const r: any = (ev as PromiseRejectionEvent).reason;
    const text = String(r?.code || '') + ' ' + String(r?.message || r || '');
    if (/auth\/network-request-failed/.test(text) || text.includes(BLOCK_MESSAGE)) ev.preventDefault();
  });
  const realFetch = window.fetch.bind(window);
  const localJson = (body: unknown) =>
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

  window.fetch = ((input: any, init?: any) => {
    let url: URL;
    let method = 'GET';
    try {
      const raw = typeof input === 'string' ? input : input?.url || String(input);
      url = new URL(raw, window.location.origin);
      method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET').toUpperCase();
    } catch {
      record('fetch', 'unparseable');
      return Promise.resolve(localJson({ success: false, demo: true, error: BLOCK_MESSAGE }));
    }
    if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
      let parsedBody: any;
      try { const b = init?.body; if (typeof b === 'string') parsedBody = JSON.parse(b); } catch {}
      const canned = demoApiResponse(url.pathname, url.search, method, parsedBody);
      return Promise.resolve(localJson(canned || { success: false, demo: true, error: 'هذه الميزة غير متاحة في النسخة التجريبية' }));
    }
    if (url.origin === window.location.origin && (method === 'GET' || method === 'HEAD')) {
      return realFetch(input, init); // the app's own static files only
    }
    record('fetch', `${method} ${url.origin}${url.pathname}`);
    return Promise.resolve(localJson({ success: false, demo: true, error: BLOCK_MESSAGE }));
  }) as typeof window.fetch;

  try {
    const OrigOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, method: string, url: string | URL, ...rest: any[]) {
      const u = new URL(String(url), window.location.origin);
      if (u.origin !== window.location.origin || u.pathname.startsWith('/api/') || String(method).toUpperCase() !== 'GET') {
        record('xhr', `${method} ${u.origin}${u.pathname}`);
        throw new DOMException(BLOCK_MESSAGE, 'NetworkError');
      }
      return (OrigOpen as any).call(this, method, url, ...rest);
    } as any;
  } catch {}

  try {
    const blockedCtor = (kind: string) =>
      function (this: unknown, target: string | URL) {
        record(kind, String(target));
        throw new DOMException(BLOCK_MESSAGE, 'SecurityError');
      } as any;
    w.WebSocket = blockedCtor('websocket');
    if (typeof w.EventSource !== 'undefined') w.EventSource = blockedCtor('eventsource');
  } catch {}

  try {
    navigator.sendBeacon = ((target: string) => { record('beacon', String(target)); return false; }) as any;
  } catch {}
}

installDemoNetworkGuard();
