import { afterEach, describe, expect, it, vi } from 'vitest';

async function load(native: boolean) {
  vi.resetModules();
  const win = { location: { href: 'https://admin.alturathkw.shop/' }, open: vi.fn(() => null as any) };
  vi.stubGlobal('window', win);
  vi.stubGlobal('Capacitor', native ? { isNativePlatform: () => true } : undefined);
  return { win, m: await import('../lib/nativeExternal') };
}
afterEach(() => { vi.unstubAllGlobals(); });
const URL_ = 'https://api.whatsapp.com/send?phone=96512345678&text=x';

describe('WhatsApp inside the native iOS app', () => {
  it('navigates with location.href and never opens a window', async () => {
    const { win, m } = await load(true);
    m.openWhatsApp(URL_, 'noopener,noreferrer');
    expect(win.location.href).toBe(URL_);
    expect(win.open).not.toHaveBeenCalled();
  });
  it('claims no blank tab for the post-save flow, then navigates', async () => {
    const { win, m } = await load(true);
    const tab = m.claimWhatsAppTab();
    expect(win.open).not.toHaveBeenCalled();
    tab.discard();
    tab.navigate(URL_);
    expect(win.location.href).toBe(URL_);
    expect(win.open).not.toHaveBeenCalled();
  });
});

describe('WhatsApp in a browser (unchanged)', () => {
  it('uses window.open with the same arguments as before', async () => {
    const { win, m } = await load(false);
    m.openWhatsApp(URL_);
    expect(win.open).toHaveBeenLastCalledWith(URL_, '_blank');
    m.openWhatsApp(URL_, 'noopener,noreferrer');
    expect(win.open).toHaveBeenLastCalledWith(URL_, '_blank', 'noopener,noreferrer');
    expect(win.location.href).toBe('https://admin.alturathkw.shop/');
  });
  it('claims the tab inside the click and points it at the link later', async () => {
    const { win, m } = await load(false);
    const tab: any = { closed: false, location: { href: '' }, close: vi.fn() };
    win.open.mockReturnValueOnce(tab);
    const t = m.claimWhatsAppTab();
    expect(win.open).toHaveBeenCalledWith('', '_blank');
    t.navigate(URL_);
    expect(tab.location.href).toBe(URL_);
    const t2 = m.claimWhatsAppTab(); // popup blocked -> null
    win.open.mockClear();
    t2.navigate(URL_);
    expect(win.open).toHaveBeenCalledWith(URL_, '_blank');
  });
});
