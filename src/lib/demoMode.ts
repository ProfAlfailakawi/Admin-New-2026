import { demoApiResponse } from './demoApi';
/**
 * Demo mode (presentation only).
 *
 * Enabled by opening the app with `?demo=1` (remembered for the browser tab through
 * sessionStorage) or by building with `VITE_DEMO_MODE=true`. Leave it with `?demo=0`.
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

export function exitDemoMode(): void {
  try { window.sessionStorage.removeItem(KEY); } catch {}
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('demo', '0');
    window.location.href = url.toString();
  } catch {}
}

/**
 * Demo safety net: no request to the app's own API ever leaves the browser.
 * Any `/api/*` call resolves locally with a harmless "not available in demo" payload.
 */
export function installDemoNetworkGuard(): void {
  if (!IS_DEMO_MODE || typeof window === 'undefined') return;
  const w = window as any;
  if (w.__ktkDemoFetchGuard) return;
  w.__ktkDemoFetchGuard = true;
  const realFetch = window.fetch.bind(window);
  window.fetch = ((input: any, init?: any) => {
    try {
      const raw = typeof input === 'string' ? input : input?.url || String(input);
      const url = new URL(raw, window.location.origin);
      if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
        const method = String(init?.method || (typeof input !== 'string' ? input?.method : '') || 'GET');
        const canned = demoApiResponse(url.pathname, url.search, method);
        if (canned) {
          return Promise.resolve(new Response(JSON.stringify(canned), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new Response(
          JSON.stringify({ success: false, demo: true, error: 'هذه الميزة غير متاحة في النسخة التجريبية' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ));
      }
    } catch {}
    return realFetch(input, init);
  }) as typeof window.fetch;
}
