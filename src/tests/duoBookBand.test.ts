import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p: string) => readFileSync(p, 'utf8');
const BOOK = 'screen and (min-width:721px) and (max-width:1000px) and (min-height:520px) and (max-height:960px) and (orientation:landscape)';
const PORTRAIT = 'screen and (display-mode:standalone) and (min-width:640px) and (max-width:720px) and (min-height:520px) and (max-height:960px) and (orientation:portrait)';

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
  it('keeps the widget keep-out standalone-only on the inner screen bands', () => {
    const css = read('src/duo-adaptive.css');
    expect(css).toContain('--duo-cutout-w:116px;--duo-cutout-h:116px');
    expect(css).toContain(`@media ${PORTRAIT}`);
    expect(css).toContain(`screen and (display-mode:standalone) and ${BOOK.replace('screen and ', '')}`);
  });
});
