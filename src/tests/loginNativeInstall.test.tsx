// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';

vi.mock('../firebase', () => ({ loginWithGoogle: vi.fn() }));
vi.mock('../lib/demoMode', () => ({ enterDemoMode: vi.fn() }));
vi.mock('../components/ui/LogoEngine', () => ({ default: () => null }));

import Login from '../components/Login';
import { loginWithGoogle } from '../firebase';

const setNative = (on: boolean, ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1') => {
  (globalThis as any).Capacitor = on ? { isNativePlatform: () => true } : undefined;
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
};

beforeEach(() => {
  vi.useFakeTimers();
  const mem = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) });
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => mem.get('s' + k) ?? null, setItem: (k: string, v: string) => void mem.set('s' + k, v), removeItem: () => {} });
  window.matchMedia = ((q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as any;
});
afterEach(() => { cleanup(); vi.useRealTimers(); (globalThis as any).Capacitor = undefined; });

describe('Login inside the native iOS app', () => {
  it('shows no install button, listener or sheet, and the update message has no browser wording', async () => {
    setNative(true);
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<Login onLogin={() => {}} />);
    await act(async () => { vi.advanceTimersByTime(3000); });
    expect(container.querySelector('.login-install-btn')).toBeNull();
    expect(container.querySelector('.login-ios-prompt')).toBeNull();
    expect(add.mock.calls.some((c) => c[0] === 'beforeinstallprompt')).toBe(false);

    const err = Object.assign(new Error('x'), { code: 'admin/update-app' });
    (loginWithGoogle as any).mockRejectedValueOnce(err);
    const btn = Array.from(container.querySelectorAll('button')).find((b) => /Google|جوجل|قوقل/i.test(b.textContent || '')) || container.querySelector('button.login-google-btn, button');
    await act(async () => { (btn as HTMLElement).click(); });
    const text = container.textContent || '';
    expect(text).toContain('حدّث التطبيق من App Store');
    expect(text).not.toMatch(/TestFlight|Safari/);
  });
});

describe('Login in a browser (unchanged)', () => {
  it('still offers the install button and listens for beforeinstallprompt', async () => {
    setNative(false);
    const add = vi.spyOn(window, 'addEventListener');
    const { container } = render(<Login onLogin={() => {}} />);
    expect(container.querySelector('.login-install-btn')).not.toBeNull();
    expect(add.mock.calls.some((c) => c[0] === 'beforeinstallprompt')).toBe(true);
  });
});
