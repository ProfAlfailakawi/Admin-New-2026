import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8');

function worker(cache) {
  const handlers = {};
  const shown = [];
  const receipts = [];
  const self = {
    caches: cache,
    location: { origin: 'https://example.com' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    registration: {
      showNotification: async (...args) => { shown.push(args); },
      getNotifications: async () => { throw new Error('unavailable'); },
    },
  };
  vm.runInNewContext(source, {
    self, caches: cache, URL, Response, setTimeout, clearTimeout,
    fetch: async (_url, options) => { receipts.push(JSON.parse(options.body)); },
  });
  return {
    shown, receipts,
    push: async () => {
      let done;
      handlers.push({
        data: { json: () => ({ data: { title: 'Test', body: 'Delivery', eventId: 'test-1' } }) },
        waitUntil: (promise) => { done = promise; },
      });
      await done;
    },
  };
}

test('displays and acknowledges when cache access fails', async () => {
  const instance = worker({ open: async () => { throw new Error('storage unavailable'); } });
  await instance.push();
  assert.equal(instance.shown.length, 1);
  assert.equal(instance.receipts[0].status, 'received');
});

test('hanging cache cannot prevent display or receipt', async () => {
  const instance = worker({ open: () => new Promise(() => {}) });
  await instance.push();
  assert.equal(instance.shown.length, 1);
  assert.equal(instance.receipts.length, 1);
});

test('successful delivery remains deduplicated', async () => {
  const entries = new Map();
  const instance = worker({ open: async () => ({
    match: async (key) => entries.get(key),
    put: async (key, value) => { entries.set(key, value); },
  }) });
  await instance.push();
  await instance.push();
  assert.equal(instance.shown.length, 1);
});
