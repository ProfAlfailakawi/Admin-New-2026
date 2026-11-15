/*
 * حارس تقاطع ركن الودجت (iPhone Duo): مكتبة القياس المشتركة بين الحارس ولقطات قبل/بعد.
 * يشغّل WebKit (Playwright) على خادم Vite محلي ويقيس: هل يتقاطع أي عنصر مهم مع المستطيل
 * المحجوز (x >= vw - widget-w، y <= widget-h، فيزيائياً يميناً/أعلى) بصرف النظر عن اتجاه الصفحة.
 */
import { createServer } from 'vite';
import { webkit, chromium } from 'playwright-core';

export const SIZES = [
  [382, 580], [470, 780], [594, 368], [669, 867], [951, 585],
];
// المقاسات الخمسة هي مقاسات الجهاز المعروفة (يجب أن تكون المنطقة فيها نشطة)، والمقلوبة منها اختبار «بدّل w/h».
export const WK_APP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
/** سياق التطبيق (Capacitor WKWebView) مُحاكى في WebKit سطح المكتب: UA بلا Safari/، window.Capacitor، بلا navigator.standalone، وارتفاع كامل. */
export async function newContext(browser, kind, { w, h, scheme = 'light' }) {
  const app = kind === 'app';
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, userAgent: app ? WK_APP_UA : IPHONE_UA, hasTouch: true, isMobile: false, deviceScaleFactor: 1 });
  if (app) await ctx.addInitScript(() => {
    window.Capacitor = { isNativePlatform: () => true, getPlatform: () => 'ios', platform: 'ios' };
    try { Object.defineProperty(navigator, 'standalone', { get: () => undefined, configurable: true }); } catch {}
  });
  return ctx;
}
export const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';

export async function startServer() {
  const server = await createServer({ root: process.env.DUO_ROOT || process.cwd(), server: { host: '127.0.0.1', port: 0, strictPort: false }, logLevel: 'error' });
  await server.listen();
  const addr = server.httpServer.address();
  return { server, base: `http://127.0.0.1:${addr.port}` };
}

export async function launch() {
  try { return { browser: await webkit.launch(), engine: 'webkit' }; }
  catch (e) {
    console.error('WEBKIT UNAVAILABLE, falling back to Chromium:', String(e.message).split('\n')[0]);
    return { browser: await chromium.launch(), engine: 'chromium' };
  }
}

/** يُنفَّذ داخل الصفحة: يعيد المنطقة والعناصر المخالفة والمستثناة. */
export function measureInPage() {
  const root = getComputedStyle(document.documentElement);
  const px = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden;pointer-events:none;width:var(--duo-widget-w,0px);height:var(--duo-widget-h,0px)';
  document.body.appendChild(probe);
  const W = probe.getBoundingClientRect().width, H = probe.getBoundingClientRect().height;
  probe.remove();
  const vw = document.documentElement.clientWidth;
  const zone = { x0: vw - W, x1: vw, y0: 0, y1: H, w: W, h: H, active: W > 0 };
  if (!zone.active) return { zone, vw, violations: [], bleed: [], checked: 0 };

  const sel = 'a,button,input,select,textarea,[role=tab],[role=button],[role=link],[role=menuitem],img,svg,canvas,video,[data-logo],[data-badge],label';
  const hiddenBy = (el) => {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity === 0) return true;
    }
    return false;
  };
  const clipRect = (el, r) => {
    let { left, top, right, bottom } = r;
    for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY)) {
        const b = n.getBoundingClientRect();
        if (/(hidden|clip|auto|scroll)/.test(s.overflowX)) { left = Math.max(left, b.left); right = Math.min(right, b.right); }
        if (/(hidden|clip|auto|scroll)/.test(s.overflowY)) { top = Math.max(top, b.top); bottom = Math.min(bottom, b.bottom); }
      }
    }
    return { left, top, right, bottom };
  };
  const hits = (r) => r.right > zone.x0 + 0.5 && r.left < zone.x1 && r.top < zone.y1 - 0.5 && r.bottom > zone.y0 && r.right > r.left && r.bottom > r.top;
  const describe = (el) => {
    const c = (typeof el.className === 'string' ? el.className : el.getAttribute('class') || '').trim().split(/\s+/).slice(0, 3).join('.');
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (c ? '.' + c : '');
  };
  const violations = [], bleed = [];
  let checked = 0;
  const seen = new Set();
  const consider = (el, rect, kind) => {
    if (hiddenBy(el)) return;
    const r = clipRect(el, rect);
    if (!hits(r)) return;
    const key = describe(el) + '|' + Math.round(r.left) + '|' + Math.round(r.top) + '|' + kind;
    if (seen.has(key)) return; seen.add(key);
    const rec = { el: describe(el), kind, text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30), rect: [r.left, r.top, r.right, r.bottom].map(Math.round) };
    if (el.closest('[data-duo-bleed]')) bleed.push(rec); else violations.push(rec);
  };
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest('[data-duo-bleed]') && !el.matches('a,button,input,select,textarea,[role=tab],[role=button]')) continue;
    // svg/img داخل عنصر تفاعلي يُحتسب مع الأب
    if (el.matches('svg,img') && el.closest('a,button,[role=button],[role=tab]')) continue;
    checked++;
    consider(el, el.getBoundingClientRect(), el.tagName.toLowerCase());
  }
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let t = tw.nextNode(); t; t = tw.nextNode()) {
    if (!t.nodeValue.trim()) continue;
    const el = t.parentElement;
    if (!el || /^(script|style|noscript|title)$/i.test(el.tagName)) continue;
    range.selectNodeContents(t);
    for (const r of range.getClientRects()) { checked++; consider(el, r, 'text'); }
  }
  return { zone, vw, violations, bleed, checked };
}

/** «قبل»: يفرض المنطقة بالمتغيرات نفسها فوق كود الفرع الأساسي (الذي لا يعرفها) ليظهر ما كان سيقع داخلها. */
export const FORCE_ZONE_CSS = ':root{--duo-widget-w:96px;--duo-widget-gap:8px;--duo-widget-h:clamp(64px,31vh,270px)}';

export async function openState(page, base, state) {
  const go = async (path) => { await page.goto(base + path, { waitUntil: 'domcontentloaded' }); };
  if (state === 'login') {
    await page.addInitScript(() => { try { localStorage.clear(); sessionStorage.clear(); } catch {} });
    await go('/');
    // بلا خادم API يبقى الإقلاع على شاشة AdminBootShell (.ktk-boot) ثم يظهر الدخول: نقيس ما يظهر أولاً من الاثنين
    try { await page.waitForSelector('.admin-login-showcase', { timeout: 12000 }); }
    catch { await page.waitForSelector('.ktk-boot, #preboot-splash', { timeout: 8000 }); }
    await page.waitForTimeout(700);
    return;
  }
  await go('/?demo=1');
  await page.waitForSelector('.admin-app-header', { timeout: 20000 });
  await page.waitForTimeout(1500);
  if (state === 'drawer') {
    const b = page.locator('button[aria-label="القائمة الجانبية"]');
    if (await b.count() && await b.first().isVisible()) { await b.first().click(); await page.waitForTimeout(800); }
  } else if (state === 'modal') {
    await page.keyboard.press('Control+k');
    await page.waitForTimeout(900);
  } else if (state === 'install') {
    await page.waitForTimeout(5000);
  } else if (state === 'notifications') {
    const n = page.locator('button[aria-label*="إشعار"]');
    if (await n.count()) { await n.first().click({ force: true }); await page.waitForTimeout(700); }
  }
}
