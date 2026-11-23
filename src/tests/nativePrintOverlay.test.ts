// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load(native: boolean) {
  vi.resetModules();
  (globalThis as any).Capacitor = native ? { isNativePlatform: () => true } : undefined;
  return import('../lib/nativeExternal');
}
beforeEach(() => { document.body.innerHTML = '<div id="app">app</div>'; document.head.innerHTML = ''; document.body.className = ''; });
afterEach(() => { (globalThis as any).Capacitor = undefined; vi.restoreAllMocks(); });
const HTML = '<!doctype html><html><body>فاتورة</body></html>';

describe('print inside the native iOS app', () => {
  it('shows an in-page overlay with the document, never opens a window', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    const m = await load(true);
    expect(m.printHtmlDocument(HTML)).toBe(true);
    expect(open).not.toHaveBeenCalled();
    const overlay = document.getElementById('ktk-print-overlay')!;
    expect(overlay).toBeTruthy();
    expect(overlay.querySelector('iframe')!.srcdoc).toBe(HTML);
    expect(document.body.classList.contains('ktk-printing')).toBe(true);
    expect(document.getElementById('ktk-print-overlay-style')!.textContent).toContain('@media print');
    const [print, close] = Array.from(overlay.querySelectorAll('button'));
    expect(print.textContent).toBe('طباعة');
    const winPrint = vi.fn();
    (window as any).print = winPrint;
    print.click();
    expect(winPrint).toHaveBeenCalledTimes(1);
    close.click();
    expect(document.getElementById('ktk-print-overlay')).toBeNull();
    expect(document.body.classList.contains('ktk-printing')).toBe(false);
  });
  it('replaces a previous overlay instead of stacking', async () => {
    const m = await load(true);
    m.printHtmlDocument(HTML);
    m.printHtmlDocument(HTML);
    expect(document.querySelectorAll('#ktk-print-overlay').length).toBe(1);
  });
});

describe('print in a browser (unchanged)', () => {
  it('writes into a new window and adds no overlay', async () => {
    const w = { document: { write: vi.fn(), close: vi.fn() } };
    const open = vi.spyOn(window, 'open').mockReturnValue(w as any);
    const m = await load(false);
    expect(m.printHtmlDocument(HTML)).toBe(true);
    expect(open).toHaveBeenCalledWith('', '_blank');
    expect(w.document.write).toHaveBeenCalledWith(HTML);
    expect(w.document.close).toHaveBeenCalled();
    expect(document.getElementById('ktk-print-overlay')).toBeNull();
  });
  it('returns false when the popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    const m = await load(false);
    expect(m.printHtmlDocument(HTML)).toBe(false);
  });
});
