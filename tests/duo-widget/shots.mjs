/* لقطات قبل/بعد: node tests/duo-widget/shots.mjs before|after  (before: DUO_ROOT=<نسخة الفرع الأساسي>) */
import { FORCE_ZONE_CSS, startServer, launch, openState, IPHONE_UA } from './guard-lib.mjs';
const tag = process.argv[2] || 'after';
const outDir = process.env.DUO_SHOTS_DIR || 'docs/iphone-duo-widget-corner';
const SHOTS = [[382, 580, 'dashboard'], [382, 580, 'drawer'], [669, 867, 'dashboard'], [951, 585, 'dashboard'], [382, 580, 'login']];
const { server, base } = await startServer();
const { browser, engine } = await launch();
try {
  for (const [w, h, state] of SHOTS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, userAgent: IPHONE_UA, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await openState(page, base, state);
    if (tag === 'before') await page.addStyleTag({ content: FORCE_ZONE_CSS });
    // إطار المنطقة للتوضيح فقط (لا يدخل في الحارس لأنه data-duo-bleed)
    await page.evaluate(() => {
      const d = document.createElement('div');
      d.setAttribute('data-duo-bleed', '');
      d.style.cssText = 'position:fixed;top:0;right:0;width:var(--duo-widget-w);height:var(--duo-widget-h);box-sizing:border-box;border:2px solid #dc2626;background:rgba(220,38,38,.14);pointer-events:none;z-index:2147483647';
      document.body.appendChild(d);
    });
    await page.waitForTimeout(400);
    const name = `${tag}-${w}x${h}${state === 'dashboard' ? '' : '-' + state}.png`;
    await page.screenshot({ path: `${outDir}/${name}` });
    console.log(engine, name);
    await ctx.close();
  }
} finally { await browser.close(); await server.close(); }
