import { describe, expect, it, vi } from 'vitest';
import { signInWithGoogle } from '../lib/googleSignIn';

const mk = (native: boolean, over: Partial<Parameters<typeof signInWithGoogle<string>>[0]> = {}) => ({
  native,
  nativeSignIn: vi.fn(async () => 'native-cred'),
  popup: vi.fn(async () => 'popup-cred'),
  redirect: vi.fn(async () => undefined),
  shouldFallbackToRedirect: vi.fn(() => true),
  ...over,
});

describe('Google sign-in inside the native iOS app', () => {
  it('uses only the native plugin', async () => {
    const d = mk(true);
    expect(await signInWithGoogle(d)).toBe('native-cred');
    expect(d.popup).not.toHaveBeenCalled();
    expect(d.redirect).not.toHaveBeenCalled();
  });
  it('never falls back to popup or redirect when the plugin fails or is missing', async () => {
    const err = Object.assign(new Error('x'), { code: 'admin/update-app' });
    const d = mk(true, { nativeSignIn: vi.fn(async () => { throw err; }) });
    await expect(signInWithGoogle(d)).rejects.toBe(err);
    expect(d.popup).not.toHaveBeenCalled();
    expect(d.redirect).not.toHaveBeenCalled();
    expect(d.shouldFallbackToRedirect).not.toHaveBeenCalled();
  });
});

describe('Google sign-in in a browser (unchanged)', () => {
  it('uses the popup', async () => {
    const d = mk(false);
    expect(await signInWithGoogle(d)).toBe('popup-cred');
    expect(d.nativeSignIn).not.toHaveBeenCalled();
    expect(d.redirect).not.toHaveBeenCalled();
  });
  it('falls back to redirect (returns null) when the popup is blocked', async () => {
    const d = mk(false, { popup: vi.fn(async () => { throw new Error('blocked'); }) });
    expect(await signInWithGoogle(d)).toBeNull();
    expect(d.redirect).toHaveBeenCalledOnce();
  });
  it('rethrows other popup errors', async () => {
    const e = new Error('boom');
    const d = mk(false, { popup: vi.fn(async () => { throw e; }), shouldFallbackToRedirect: vi.fn(() => false) });
    await expect(signInWithGoogle(d)).rejects.toBe(e);
    expect(d.redirect).not.toHaveBeenCalled();
  });
});
