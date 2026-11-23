// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function load(native: boolean, withPlugin = true) {
  vi.resetModules();
  const setStyle = vi.fn(async () => {});
  (globalThis as any).Capacitor = native ? { isNativePlatform: () => true, Plugins: withPlugin ? { StatusBar: { setStyle } } : {} } : { Plugins: { StatusBar: { setStyle } } };
  return { setStyle, m: await import('../lib/nativeStatusBar') };
}
beforeEach(() => { document.body.removeAttribute('style'); document.documentElement.removeAttribute('style'); });
afterEach(() => { (globalThis as any).Capacitor = undefined; vi.restoreAllMocks(); });

describe('status bar inside the native iOS app', () => {
  it('uses light text on the dark shell (#0F172A)', async () => {
    document.body.style.backgroundColor = '#0F172A';
    const { setStyle, m } = await load(true);
    m.installNativeStatusBar();
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
  });
  it('uses dark text on a light page', async () => {
    document.body.style.backgroundColor = 'rgb(251, 247, 238)';
    const { setStyle, m } = await load(true);
    m.syncNativeStatusBar();
    expect(setStyle).toHaveBeenCalledWith({ style: 'LIGHT' });
  });
  it('falls back to the dark shell colour when the page is transparent', async () => {
    const { setStyle, m } = await load(true);
    m.syncNativeStatusBar();
    expect(setStyle).toHaveBeenCalledWith({ style: 'DARK' });
  });
  it('does nothing when the plugin is not in the app build', async () => {
    const { m } = await load(true, false);
    expect(() => m.installNativeStatusBar()).not.toThrow();
  });
});

describe('status bar in a browser (unchanged)', () => {
  it('never touches the plugin or registers listeners', async () => {
    const add = vi.spyOn(document, 'addEventListener');
    const { setStyle, m } = await load(false);
    m.installNativeStatusBar();
    m.syncNativeStatusBar();
    expect(setStyle).not.toHaveBeenCalled();
    expect(add.mock.calls.some((c) => c[0] === 'visibilitychange')).toBe(false);
  });
});
