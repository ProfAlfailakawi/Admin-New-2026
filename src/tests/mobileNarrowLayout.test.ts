import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');

describe('narrow phone layout guards (320-382px)', () => {
  it('keeps centred modals below the sticky app header on phones', () => {
    const css = read('src/index.css');
    expect(css).toMatch(/\.fixed\.inset-0\.items-center\[class\*="bg-slate-900\/60"\]:is\(\.z-50, \.z-\\\[100\\\]\)\s*\{\s*padding-top:/);
  });

  it('lets the reports time filter shrink instead of overflowing its card', () => {
    const src = read('src/components/ReportsPage.tsx');
    expect(src).toContain('flex w-full min-w-0 md:w-auto p-1 bg-slate-100 rounded-xl');
    expect(src).toContain('flex-1 md:flex-none whitespace-nowrap px-2 sm:px-4');
  });

  it('wraps the dashboard finance header on narrow screens', () => {
    const src = read('src/components/Dashboard.tsx');
    expect(src).toContain('w-full flex flex-wrap items-center justify-between gap-y-2 p-4 md:p-6');
  });

  it('shrinks the hub map on very narrow cards so labels clear the centre', () => {
    const src = read('src/components/dna/DnaKit.tsx');
    expect(src).toContain('const compact = w > 0 && w < 300;');
  });
});
