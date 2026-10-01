import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import crypto from 'node:crypto';

// Execute the actual route with an isolated database, without booting the production
// server, connecting to Firestore, or sending notifications to real recipients.
const server = readFileSync('server.ts', 'utf8');
const route = server.slice(server.indexOf('  app.post("/api/push/save-token",'), server.indexOf('\nfunction smartNotificationTag'));
const javascript = ts.transpile(route, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext });
const email = 'volcanokw@gmail.com';

async function save(existing: any, body: any = {}, databaseAvailable = true) {
  let handler: any;
  const tokenRef = { get: vi.fn(async () => ({ exists: existing !== null, data: () => existing })), set: vi.fn(async () => {}) };
  const commit = vi.fn(async () => {});
  const db = { collection: vi.fn(() => ({ doc: () => tokenRef, where: () => ({ limit: () => ({ get: async () => ({ docs: [] }) }) }) })), batch: () => ({ set: vi.fn(), commit }) };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
  new Function('app', 'db', 'admin', 'removeUndefinedDeep', 'ALLOWED_PUSH_RECIPIENT_EMAILS', 'crypto', javascript)(
    { post: (_path: string, fn: any) => { handler = fn; } },
    databaseAvailable ? db : null,
    { firestore: { FieldValue: { serverTimestamp: () => 'timestamp' } } },
    (value: any) => value,
    new Set([email]),
    crypto,
  );
  await handler({ body: { token: 'test-token', ...body } }, res);
  return { res, tokenRef, db };
}

describe('push token registration route', () => {
  it('preserves identity and device during a partial background refresh', async () => {
    const { tokenRef, res } = await save({ userEmail: email, userId: 'owner', userRole: 'admin', deviceId: 'phone', active: true, notificationPermission: 'granted' });
    expect(tokenRef.set).toHaveBeenCalledWith(expect.objectContaining({ userEmail: email, userId: 'owner', userRole: 'admin', deviceId: 'phone', active: true, notificationPermission: 'granted' }), { merge: true });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
  it('recovers a healthy token disabled by missing identity without forcing renewal', async () => {
    const { tokenRef, res } = await save({ active: false }, { userEmail: email, notificationPermission: 'granted' });
    expect(tokenRef.set).toHaveBeenCalledWith(expect.objectContaining({ active: true }), { merge: true });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
  it.each([{ invalidReason: 'messaging/registration-token-not-registered' }, { replacedByTokenHash: 'new-token' }, { invalidatedAt: 'yesterday' }])('requires renewal for genuinely retired tokens: %j', async (retirement) => {
    const { res } = await save({ active: false, ...retirement }, { userEmail: email });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, renewRequired: true }));
  });
  it('does not report success for an unapproved account or retire other registrations', async () => {
    const { res, db } = await save(null, { userEmail: 'unapproved@example.com', deviceId: 'phone' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'recipient-not-approved' }));
    expect(db.collection).toHaveBeenCalledTimes(1);
  });
  it('records permission denial and reports failure', async () => {
    const { res, tokenRef } = await save({ userEmail: email, active: true }, { notificationPermission: 'denied' });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(tokenRef.set).toHaveBeenCalledWith(expect.objectContaining({ active: false }), { merge: true });
  });
  it('reports unavailable storage instead of a successful unsaved token', async () => {
    const { res } = await save(null, {}, false);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
  });
});
