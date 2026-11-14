import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');
const BOOK = 'screen and (min-width:721px) and (max-width:1000px) and (min-height:520px) and (max-height:960px) and (orientation:landscape)';
const PORTRAIT = 'screen and (min-width:640px) and (max-width:720px) and (min-height:520px) and (max-height:960px) and (orientation:portrait)';

describe('iPhone Duo round 2: book = landscape only', () => {
  it('uses the shared BOOK condition in JS, CSS and the preboot splash', () => {
    expect(read('src/App.tsx')).toContain(`BOOK_SPREAD_QUERY = '${BOOK}'`);
    expect(read('src/duo-adaptive.css')).toContain(`@media ${BOOK}{`);
    expect(read('index.html')).toContain(`@media ${BOOK}`);
  });
  it('no longer applies the book to portrait or via em/hinge queries', () => {
    const app = read('src/App.tsx');
    expect(app).not.toMatch(/BOOK_SPREAD_QUERY = '[^']*(63\.99em|viewport-segments)/);
    expect(read('src/duo-adaptive.css')).not.toContain('63.99em');
    expect(read('index.html')).not.toContain('63.99em');
  });
  it('keeps the widget keep-out on the inner screen bands (tab and installed app)', () => {
    const css = read('src/duo-adaptive.css');
    expect(css).toContain('--duo-cutout-w:116px;--duo-cutout-h:116px');
    expect(css).toContain(`@media ${PORTRAIT}`);
    expect(css).toContain(`@media ${BOOK},`);
  });
});

// ---- Guard: the keep-out reads the REAL queries from the stylesheet and evaluates them on sizes ----
type Q = { text: string; vars: boolean };
function cutoutQueries(css: string): Q[] {
  const out: Q[] = [];
  const re = /@media([^{]+)\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) {
    let depth = 1, i = re.lastIndex;
    while (i < css.length && depth) { depth += css[i] === '{' ? 1 : css[i] === '}' ? -1 : 0; i++; }
    const body = css.slice(re.lastIndex, i);
    if (!body.includes('--duo-cutout')) continue;
    for (const q of m[1].split(',')) out.push({ text: q.trim(), vars: /--duo-cutout-w\s*:/.test(body) });
  }
  return out;
}
function matches(q: string, w: number, h: number): boolean {
  const feats = [...q.matchAll(/\(\s*([a-z-]+)\s*:\s*([a-z0-9]+?)(px)?\s*\)/g)];
  if (!/^screen\b/.test(q)) return false;
  return feats.every(([, k, v]) => {
    if (k === 'min-width') return w >= +v;
    if (k === 'max-width') return w <= +v;
    if (k === 'min-height') return h >= +v;
    if (k === 'max-height') return h <= +v;
    if (k === 'orientation') return v === (h >= w ? 'portrait' : 'landscape');
    return false; // any other feature (display-mode, hover...) must not gate the keep-out
  });
}
describe('iPhone Duo keep-out: browser tab AND installed app, inner screen only', () => {
  const css = read('src/duo-adaptive.css');
  const qs = cutoutQueries(css);
  const root = qs.filter((q) => q.vars);
  const applies = (w: number, h: number) => root.some((q) => matches(q.text, w, h));
  it('finds the real queries and never gates them on display-mode', () => {
    expect(root.length).toBeGreaterThanOrEqual(2);
    for (const q of qs) expect(q.text).not.toMatch(/display-mode/);
    const i = css.indexOf('System widget keep-out');
    expect(css.slice(i, css.indexOf('Book pages are sized by the PAGE', i))).not.toMatch(/display-mode/);
    expect(root.map((q) => q.text)).toEqual(expect.arrayContaining([BOOK, PORTRAIT]));
  });
  it.each([[951, 669], [951, 585], [669, 867], [720, 900]])('applies at %ix%i', (w, h) => {
    expect(applies(w, h)).toBe(true);
  });
  it.each([
    [390, 844], [844, 390], [932, 430], // iPhone
    [744, 1024], [820, 1180], [1024, 768], [1180, 820], // iPad
    [1280, 800], [1440, 900], // desktop
    [367, 740], // folded outer screen (indistinguishable from an iPhone)
    [951, 350],
  ])('does not apply at %ix%i', (w, h) => {
    expect(applies(w, h)).toBe(false);
  });
});
