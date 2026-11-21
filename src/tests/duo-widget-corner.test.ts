import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// ركن ودجت iPhone Duo على Duo وحده. استعلامات القسم 6 في src/duo-adaptive.css بحجم النافذة وحده، فتطابق نافذة الحاسوب
// أو الجهاز اللوحي الضيقة (640–720 طولاً مثل 700×900، أو 721–1000 عرضاً). خارج Duo يجب ألا يُحجز شيء.
const css = fs.readFileSync(path.join(process.cwd(), 'src/duo-adaptive.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rules = [...css.matchAll(/([^{};]+)\{([^{}]*)\}/g)].map((m) => ({ sel: m[1].trim(), body: m[2] }));

describe('iPhone Duo widget corner reaches the Duo only', () => {
  it('resets the corner to 0 off the Duo (html:not([data-device="duo"]) beats :root)', () => {
    const reset = rules.filter((r) => r.sel === 'html:not([data-device="duo"])');
    expect(reset, 'the reset is missing: the 116px corner would return on narrow desktop and tablet windows').toHaveLength(1);
    for (const v of ['--duo-cutout-w', '--duo-cutout-h', '--duo-cutout-reach']) expect(reset[0].body).toContain(`${v}:0px`);
  });

  it('scopes every rule that reads the corner to html[data-device="duo"] with no added specificity', () => {
    const offenders = rules.filter((r) => /var\(--duo-cutout-/.test(r.body) && !r.sel.split(/,(?![^(]*\))/).every((p) => /^html:where\(\[data-device="duo"\]\) body/.test(p.trim()) || /^(html|:root)\[data-device="duo"\]/.test(p.trim()) || /^html\[data-device="duo"\]/.test(p.trim())));
    expect(offenders.map((r) => r.sel)).toEqual([]);
  });

  it('keeps a non-zero corner only on :root (inside the size query) or under [data-device="duo"], never !important', () => {
    for (const r of rules) {
      for (const d of r.body.matchAll(/--duo-cutout-(?:w|h|reach)\s*:\s*([^;]+)/g)) {
        expect(d[1]).not.toMatch(/!important/);
        if (d[1].trim() === '0px') continue;
        expect(r.sel === ':root' || (/\[data-device=['"]duo['"]\]/.test(r.sel) && !/:not\(/.test(r.sel)), `${d[0]} via ${r.sel}`).toBe(true);
      }
    }
  });
});
