import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { purgeShell } from '../lib/app-update';

// Notifications worked on Sep 4, when firebase-messaging-sw.js was the only service
// worker. Two later additions broke them on a device until the app was reinstalled:
// an app-shell worker registered on the same scope "/" (one worker per scope, so it
// replaced the push worker), and a self-update purge that unregistered workers. These
// tests keep both out.

const root = process.cwd();

describe('the self-update purge', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('clears caches but never unregisters a service worker', async () => {
    const deleted: string[] = [];
    const unregister = vi.fn(async () => true);
    vi.stubGlobal('window', { caches: {} });
    vi.stubGlobal('caches', {
      keys: async () => ['alturath-shell-abc', 'alturath-push-dedupe-v1', 'other'],
      delete: async (name: string) => { deleted.push(name); return true; },
    });
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistrations: async () => [
          { active: { scriptURL: '/firebase-messaging-sw.js' }, unregister },
          { active: { scriptURL: '/service-worker.js' }, unregister },
        ],
        getRegistration: async () => ({ active: { scriptURL: '/firebase-messaging-sw.js' }, unregister }),
      },
    });

    await purgeShell();

    expect(unregister).not.toHaveBeenCalled();
    expect(deleted).toEqual(['alturath-shell-abc', 'other']);
  });
});

describe('a single worker on scope "/"', () => {
  it('main.tsx does not register the old app-shell worker', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    expect(main).not.toMatch(/register\(\s*['"]\/service-worker\.js['"]/);
  });

  it('a device still running the old shell worker gets the push handler on its next update', () => {
    const shell = readFileSync(join(root, 'public/service-worker.js'), 'utf8');
    expect(shell).toMatch(/importScripts\(\s*["']\/firebase-messaging-sw\.js["']\s*\)/);
    expect(shell).not.toMatch(/addEventListener\(\s*["']fetch["']/);
  });

  it('the push worker itself shows notifications', () => {
    const push = readFileSync(join(root, 'public/firebase-messaging-sw.js'), 'utf8');
    expect(push).toMatch(/addEventListener\(\s*["']push["']/);
    expect(push).toMatch(/showNotification/);
  });
});
