import { describe, it, expect } from 'vitest';
import { resolveAuthDomain, shouldFallbackToRedirect } from './authDomain';

const CFG = 'proj.firebaseapp.com';

describe('resolveAuthDomain', () => {
  it('uses the serving host on the production domain', () => {
    expect(resolveAuthDomain(CFG, 'admin.alturathkw.shop')).toBe('admin.alturathkw.shop');
  });
  it('keeps configured domain on localhost and unknown hosts', () => {
    expect(resolveAuthDomain(CFG, 'localhost')).toBe(CFG);
    expect(resolveAuthDomain(CFG, 'svc-123.europe-west3.run.app')).toBe(CFG);
    expect(resolveAuthDomain(CFG, undefined)).toBe(CFG);
  });
  it('env override wins', () => {
    expect(resolveAuthDomain(CFG, 'localhost', 'x.example.com')).toBe('x.example.com');
  });
});

describe('shouldFallbackToRedirect', () => {
  it('matches the three environment errors only', () => {
    for (const code of ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported'])
      expect(shouldFallbackToRedirect({ code })).toBe(true);
    expect(shouldFallbackToRedirect({ code: 'auth/popup-closed-by-user' })).toBe(false);
    expect(shouldFallbackToRedirect(null)).toBe(false);
  });
});
