/* يشغَّل: npm run test:duo-widget  — يفشل (exit 1) عند أي عنصر مهم داخل ركن الودجت. */
import { newContext, FORCE_ZONE_CSS, startServer, launch, openState, measureInPage, SIZES, IPHONE_UA } from './guard-lib.mjs';
import fs from 'node:fs';

const lite = process.argv.includes('--lite');
const TALL = [[382, 780], [382, 844], [470, 900], [669, 1000], [951, 700], [457, 678], [457, 760], [720, 900], [951, 669], [951, 800], [951, 960]];
const CONTEXTS = lite ? ['safari'] : ['safari', 'app'];
const STATES = ['login', 'dashboard', 'drawer', 'modal', 'install', 'notifications'];
const SCHEMES = lite ? ['light'] : ['light', 'dark'];
const only = process.env.DUO_ONLY ? process.env.DUO_ONLY.split(',') : null; // e.g. 780x470,669x867
const quick = process.argv.includes('--quick') || lite;


const { server, base } = await startServer();
const { browser, engine } = await launch();
const rows = []; const allBleed = []; let violationsTotal = 0, cases = 0, activeCases = 0;
const KNOWN_ACTIVE = new Set(SIZES.map(([w, h]) => `${w}x${h}`));
try {
  for (const kind of CONTEXTS) for (const [w0, h0, tall] of [...SIZES, ...(lite ? [] : TALL.map(([a, b]) => [a, b, true]))]) for (const swap of (lite || tall) ? [false] : [false, true]) {
    const [w, h] = swap ? [h0, w0] : [w0, h0];
    if (only && !only.includes(`${w}x${h}`)) continue;
    const secondary = swap || tall;
    for (const scheme of SCHEMES) for (const scale of (quick || secondary) ? [100] : [100, 200]) {
      const ctx = await newContext(browser, kind, { w, h, scheme });
      const page = await ctx.newPage();
      for (const state of STATES) {
        if ((quick || secondary) && state === 'notifications') continue;
        if (secondary && state === 'install') continue;
        try {
          await openState(page, base, state);
          if (scale !== 100) { await page.addStyleTag({ content: `html{font-size:${scale}%}` }); await page.waitForTimeout(400); }
          if (process.env.DUO_FORCE_ZONE) await page.addStyleTag({ content: FORCE_ZONE_CSS });
          const r = await page.evaluate(measureInPage);
          cases++; if (r.zone.active) activeCases++;
          if (r.zone.active && !(r.zone.h > 0 && r.zone.w > 0)) { violationsTotal++; rows.push({ kind, w, h, scheme, scale, state, error: 'zone has zero size (variable not resolved)' }); }
          console.error(`[${cases}] ${kind} ${w}x${h} ${scheme} ${scale}% ${state} active=${r.zone.active} violations=${r.violations.length}`);
          if (!r.zone.active) { violationsTotal++; rows.push({ kind, w, h, scheme, scale, state, error: 'zone inactive (must be active at every size in the matrix)' }); }
          for (const v of r.violations.slice(0, 6)) console.error('   !', state, v.el, JSON.stringify(v.text), v.rect.join(','));
          for (const v of r.violations) { violationsTotal++; rows.push({ kind, w, h, scheme, scale, state, ...v }); }
          for (const b of r.bleed) allBleed.push({ w, h, state, ...b });
        } catch (e) { violationsTotal++; rows.push({ kind, w, h, scheme, scale, state, error: 'state failed: ' + String(e.message).split('\n')[0] }); cases++; }
      }
      await ctx.close();
    }
  }
} finally { await browser.close(); await server.close(); }

const summary = { engine, cases, activeCases, violations: violationsTotal, bleedLogged: allBleed.length };
console.log(JSON.stringify(summary));
const byKey = new Map();
for (const r of rows) { const k = `${r.kind}|${r.state}|${r.el || r.error}|${r.text || ''}`; byKey.set(k, (byKey.get(k) || 0) + 1); }
for (const [k, n] of [...byKey].slice(0, 60)) console.log(String(n).padStart(4), k);
if (process.env.DUO_GUARD_OUT) fs.writeFileSync(process.env.DUO_GUARD_OUT, JSON.stringify({ summary, rows, bleed: allBleed }, null, 1));
process.exit(violationsTotal ? 1 : 0);
