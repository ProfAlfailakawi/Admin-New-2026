import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';
import { isPlatformUpdating, UPDATING_MESSAGE } from '../lib/updatingNotice';

// During a Cloud Run deploy Google's front end answers with an English 5xx HTML page
// our server never wrote. The push worker serves public/updating.html instead for a
// navigation, and the app shows one calm bar for /api. These tests keep both narrow:
// nothing else in the worker's behaviour may change, and push must keep working.

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const ORIGIN = 'https://admin.alturathkw.shop';
const PAGE = read('public/updating.html');
const GOOGLE_502 = '<html><title>Error 502 (Server Error)!!1</title><p>Error: Server Error. Please try again in 30 seconds.</p></html>';
const pathOf = (key: any) => new URL(typeof key === 'string' ? key : key.url, ORIGIN).pathname;
const html = (body: string, status = 200) => new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

type Net = (pathname: string) => Promise<Response>;
function worker(net: Net, options: { online?: boolean } = {}) {
  const handlers: Record<string, (event: any) => void> = {};
  const store = new Map<string, Map<string, Response>>();
  const writes: Array<{ cache: string; key: string; status: number }> = [];
  const open = async (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    const entries = store.get(name)!;
    return {
      put: async (key: any, response: Response) => { writes.push({ cache: name, key: pathOf(key), status: response.status }); entries.set(pathOf(key), response.clone()); },
      match: async (key: any) => entries.get(pathOf(key))?.clone(),
    };
  };
  const caches = { open };
  const self: any = {
    addEventListener: (type: string, fn: any) => { handlers[type] = fn; },
    location: { origin: ORIGIN }, skipWaiting() {}, clients: { claim: async () => {} },
    navigator: { onLine: options.online ?? true }, registration: {},
  };
  vm.runInNewContext(read('public/firebase-messaging-sw.js'), { self, URL, Response, Promise, JSON, String, Number, Date, Math, Set, caches, fetch: (request: any) => net(pathOf(request)), setTimeout, console });
  const lifecycle = async (type: string) => {
    const waits: Promise<unknown>[] = [];
    handlers[type]({ waitUntil: (p: Promise<unknown>) => waits.push(p) });
    await Promise.all(waits);
  };
  const request = async (pathname: string, init: { mode?: string; method?: string; origin?: string } = {}) => {
    let answer: Promise<Response> | null = null;
    handlers.fetch({
      request: { url: `${init.origin ?? ORIGIN}${pathname}`, mode: init.mode ?? 'navigate', method: init.method ?? 'GET' },
      respondWith: (p: Promise<Response>) => { answer = p; },
    });
    let response: Response | null = null, error: unknown = null;
    try { response = answer ? await answer : null; } catch (e) { error = e; }
    await tick(); await tick();
    return { answered: answer !== null, response, error };
  };
  return { lifecycle, request, store, writes, handlers };
}

const deploying = (status: number | 'drop'): Net => async (pathname) => {
  if (pathname === '/updating.html') return html(PAGE);
  if (status === 'drop') throw new TypeError('Failed to fetch');
  return html(GOOGLE_502, status);
};
const isUpdatingPage = async (response: Response | null) =>
  Boolean(response) && response!.status === 503 && response!.headers.get('cache-control') === 'no-store'
  && /text\/html/.test(response!.headers.get('content-type') || '') && (await response!.clone().text()).includes('نُحدّث البرنامج الآن');

describe('the push worker serves the updating page mid-deploy', () => {
  for (const status of [500, 502, 503, 504]) {
    it(`a navigation answered ${status} gets the updating page (503, no-store)`, async () => {
      const sw = worker(deploying(status));
      await sw.lifecycle('install');
      expect(await isUpdatingPage((await sw.request('/')).response)).toBe(true);
      expect(await isUpdatingPage((await sw.request('/track?invoice=INV-1')).response)).toBe(true);
    });
  }

  it('a dropped navigation while online gets the page; truly offline is left alone', async () => {
    const sw = worker(deploying('drop'));
    await sw.lifecycle('install');
    expect(await isUpdatingPage((await sw.request('/')).response)).toBe(true);
    const offline = worker(deploying('drop'), { online: false });
    await offline.lifecycle('install');
    const result = await offline.request('/');
    expect(result.response).toBeNull();
    expect(result.error).toBeInstanceOf(TypeError);
  });

  it('successful answers and redirects pass through untouched', async () => {
    const sw = worker(async (p) => (p === '/updating.html' ? html(PAGE) : html('<p>the app</p>')));
    await sw.lifecycle('install');
    const ok = await sw.request('/');
    expect(ok.response?.status).toBe(200);
    expect(await ok.response!.text()).toBe('<p>the app</p>');
    const redirect = worker(async () => new Response(null, { status: 302, headers: { Location: '/' } }));
    expect((await redirect.request('/old')).response?.status).toBe(302);
  });

  it('never answers /api, non-GET, non-navigation or cross-origin requests', async () => {
    const sw = worker(deploying(502));
    await sw.lifecycle('install');
    expect((await sw.request('/api/appdata/full', { mode: 'cors' })).answered).toBe(false);
    expect((await sw.request('/api/export.xlsx')).answered).toBe(false);
    expect((await sw.request('/run-alerts')).answered).toBe(false);
    expect((await sw.request('/', { method: 'POST' })).answered).toBe(false);
    expect((await sw.request('/assets/x.js', { mode: 'no-cors' })).answered).toBe(false);
    expect((await sw.request('/', { origin: 'https://example.com' })).answered).toBe(false);
  });

  it('stores only the updating page, never a 5xx', async () => {
    const sw = worker(deploying(503));
    await sw.lifecycle('install');
    expect(sw.store.get('alturath-updating')?.has('/updating.html')).toBe(true);
    await sw.request('/');
    expect(sw.writes.every((w) => w.cache === 'alturath-updating' && w.key === '/updating.html' && w.status === 200)).toBe(true);
  });

  it('without a stored page the original answer comes back; a good navigation refills it', async () => {
    const empty = worker(deploying(502));
    expect((await empty.request('/')).response?.status).toBe(502);
    const refill = worker(async (p) => (p === '/updating.html' ? html(PAGE) : html('<p>ok</p>')));
    await refill.request('/');
    expect(refill.store.get('alturath-updating')?.has('/updating.html')).toBe(true);
  });

  it('push and notification handlers are still there, and service-worker.js still only imports it', () => {
    const sw = worker(deploying(502));
    expect(typeof sw.handlers.push).toBe('function');
    expect(typeof sw.handlers.notificationclick).toBe('function');
    const shell = read('public/service-worker.js');
    expect(shell).toMatch(/importScripts\(\s*["']\/firebase-messaging-sw\.js["']\s*\)/);
    expect(shell).not.toMatch(/addEventListener\(\s*["']fetch["']/);
  });
});

describe('public/updating.html', () => {
  it('is self-contained, RTL, light/dark, and uses the app font from the same origin only', () => {
    expect(/https?:\/\//i.test(PAGE)).toBe(false);
    expect(/\bsrc=|<link\b|@import/i.test(PAGE)).toBe(false);
    expect((PAGE.match(/url\("([^"]+)"\)/g) || []).every((u) => u.startsWith('url("/fonts/'))).toBe(true);
    expect(PAGE).toMatch(/<html lang="ar" dir="rtl">/);
    expect(PAGE).toMatch(/prefers-color-scheme:dark/);
    expect(PAGE).toMatch(/prefers-reduced-motion/);
    expect(PAGE).toMatch(/<title>[^<]*التراث<\/title>/);
    for (const text of ['نُحدّث البرنامج الآن ✨', 'لحظاتٍ ونعود', 'أعد المحاولة الآن']) expect(PAGE).toContain(text);
  });

  const script = /<script>([\s\S]*?)<\/script>/.exec(PAGE)?.[1] || '';
  const run = (options: { health: boolean[]; recent?: number[]; pathname?: string; online?: boolean }) => {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    const asked: string[] = [];
    const nodes: Record<string, any> = {};
    const node = (id: string) => (nodes[id] ??= { textContent: '', addEventListener() {} });
    const store: Record<string, string> = options.recent ? { 'alturath-updating-reloads': JSON.stringify(options.recent) } : {};
    const location = { pathname: options.pathname ?? '/', reloads: 0, replaced: '', reload() { this.reloads++; }, replace(url: string) { this.replaced = url; } };
    let call = 0;
    vm.runInNewContext(script, {
      document: { getElementById: node, addEventListener() {}, hidden: false },
      window: { addEventListener() {} }, navigator: { onLine: options.online ?? true }, location,
      sessionStorage: { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } },
      setTimeout: (fn: () => void, ms: number) => { timers.push({ fn, ms }); return timers.length; }, clearTimeout() {},
      fetch: (url: string, init: any) => { asked.push(`${url}|${init?.cache}`); return Promise.resolve({ ok: options.health[Math.min(call++, options.health.length - 1)] }); },
      AbortController, JSON, Date, Math,
    });
    const step = async () => { const timer = timers.filter((t) => t.ms !== 8000).shift()!; timers.splice(timers.indexOf(timer), 1); timer.fn(); await tick(); await tick(); return timer.ms; };
    return { asked, location, nodes, step };
  };

  it('asks /api/health every 3 s and reopens the same URL when it answers', async () => {
    const page = run({ health: [false, false, true] });
    const delays = [await page.step(), await page.step(), await page.step()];
    expect(delays).toEqual([3000, 3000, 3000]);
    expect(page.asked.every((a) => a === '/api/health|no-store')).toBe(true);
    expect(page.location.reloads).toBe(1);
  });

  it('backs off to at most 15 s while the server is down', async () => {
    const page = run({ health: [false] });
    const delays: number[] = [];
    for (let i = 0; i < 16; i++) delays.push(await page.step());
    expect(delays[0]).toBe(3000);
    expect(delays[delays.length - 1]).toBeGreaterThan(3000);
    expect(delays.every((ms, i) => ms <= 15000 && (i === 0 || ms >= delays[i - 1]))).toBe(true);
    expect(page.location.reloads).toBe(0);
  });

  it('never loops: three reloads in two minutes slow it to every 30 s', async () => {
    const now = Date.now();
    const page = run({ health: [true], recent: [now - 5000, now - 4000, now - 3000] });
    expect(await page.step()).toBe(30000);
    expect(page.nodes.lead.textContent).toContain('وقتاً أطول');
  });

  it('opened by name, it returns to the start; offline, it says so and does not ask', async () => {
    const named = run({ health: [true], pathname: '/updating.html' });
    await named.step();
    expect(named.location.replaced).toBe('/');
    const offline = run({ health: [true], online: false });
    await offline.step();
    expect(offline.asked.length).toBe(0);
    expect(offline.nodes.title.textContent).toContain('لا اتصال');
  });
});

describe('in the app', () => {
  it('only a 5xx that is not JSON counts as the platform updating', () => {
    expect(isPlatformUpdating(502, 'text/html; charset=UTF-8')).toBe(true);
    expect(isPlatformUpdating(503, '')).toBe(true);
    expect(isPlatformUpdating(504, null)).toBe(true);
    expect(isPlatformUpdating(500, 'application/json; charset=utf-8')).toBe(false);
    expect(isPlatformUpdating(404, 'text/html')).toBe(false);
    expect(isPlatformUpdating(200, 'text/html')).toBe(false);
    expect(UPDATING_MESSAGE).toContain('نُحدّث البرنامج');
  });

  it('the watch is installed at boot and passes every response through unchanged', () => {
    const main = read('src/main.tsx');
    expect(main.indexOf('installUpdatingWatch()')).toBeGreaterThan(main.indexOf('installDemoNetworkGuard()'));
    const watch = read('src/lib/updatingNotice.ts');
    expect(watch).toMatch(/return response;\s*\}\);\s*\}\) as typeof window\.fetch;/);
  });

  it('chunk recovery asks the server before purging caches, and server-back checks the version', () => {
    const update = read('src/lib/app-update.ts');
    const recovery = update.slice(update.indexOf('async function recoverFromStaleChunk'), update.indexOf('export function markShellHealthy'));
    expect(recovery.indexOf('await serverAnswers()')).toBeGreaterThan(0);
    expect(recovery.indexOf('await serverAnswers()')).toBeLessThan(recovery.indexOf('purgeShell()'));
    expect(update).toMatch(/SERVER_BACK_EVENT, \(\) => \{ void checkForUpdate\(\); \}/);
  });

  it('the server health probe stays read-only and unauthenticated', () => {
    const server = read('server.ts');
    const start = server.indexOf('app.get("/api/health"');
    expect(start).toBeGreaterThan(0);
    const body = server.slice(start, server.indexOf('});', start));
    expect(body).not.toMatch(/waRequireConsoleAuth|\.set\(|\.update\(|\.add\(/);
  });
});
