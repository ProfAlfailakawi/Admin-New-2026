import { describe, expect, it } from 'vitest';
import { canOfferInstall, detectInstallPlatform, installStoreUrl } from '../lib/installBanner';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
const urls = { appStore: 'https://apps.apple.com/x', playStore: '' };

describe('smart install button', () => {
  it('detects platforms, incl. iPadOS posing as Mac', () => {
    expect(detectInstallPlatform(IPHONE, 5)).toBe('ios');
    expect(detectInstallPlatform(MAC, 5)).toBe('ios');
    expect(detectInstallPlatform(MAC, 0)).toBe('desktop');
    expect(detectInstallPlatform(ANDROID, 5)).toBe('android');
  });
  it('opens the App Store on iOS browsers', () => {
    expect(installStoreUrl({ userAgent: IPHONE, maxTouchPoints: 5, nativeShell: false }, urls)).toBe(urls.appStore);
  });
  it('keeps the PWA flow on Android until a Play URL exists, then uses it', () => {
    expect(installStoreUrl({ userAgent: ANDROID, nativeShell: false }, urls)).toBeNull();
    expect(installStoreUrl({ userAgent: ANDROID, nativeShell: false }, { ...urls, playStore: 'https://play.google.com/y' })).toBe('https://play.google.com/y');
  });
  it('keeps desktop unchanged and hides everything inside the native app', () => {
    expect(installStoreUrl({ userAgent: MAC, maxTouchPoints: 0, nativeShell: false }, urls)).toBeNull();
    expect(installStoreUrl({ userAgent: IPHONE, nativeShell: true }, urls)).toBeNull();
    expect(canOfferInstall({ nativeShell: true })).toBe(false);
    expect(canOfferInstall({ nativeShell: false })).toBe(true);
  });
});

describe('published store links', () => {
  it('ships both store links', async () => {
    const m = await import('../lib/installBanner');
    expect(m.APP_STORE_URL).toBe('https://apps.apple.com/kw/app/id6834583493');
    expect(m.PLAY_STORE_URL).toBe('https://play.google.com/store/apps/details?id=kw.edu.alturath.admin');
  });
  it('opens Google Play on Android browsers with the shipped links', async () => {
    const m = await import('../lib/installBanner');
    const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36';
    expect(m.installStoreUrl({ userAgent: ANDROID, nativeShell: false })).toBe(m.PLAY_STORE_URL);
  });
});
