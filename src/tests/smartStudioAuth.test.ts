import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import ts from 'typescript';
import express from 'express';
import request from 'supertest';

// Every /api/smart-studio/* route calls a paid image/video/text model, so it sits behind the
// same admin/partner gate as /api/ai. The gate is only safe if every studio call in the UI
// carries the Firebase ID token — otherwise legitimate admins would be locked out of the studio.

const authMock = vi.hoisted(() => ({ currentUser: null as null | { getIdToken: () => Promise<string> } }));
vi.mock('../firebase', () => ({ auth: authMock }));
import { apiAuthHeaders } from '../lib/apiAuthHeaders';

const server = readFileSync('server.ts', 'utf8');
const GATE = 'app.use("/api/smart-studio", waRequireConsoleAuth);';
const ROUTE = /app\.(?:post|get|put|patch|delete|all)\(\s*["'`](\/api\/smart-studio\/[^"'`]+)["'`]/g;
const studioRoutes = [...server.matchAll(ROUTE)].map((m) => ({ path: m[1], index: m.index ?? -1 }));

// The real allow-list + middleware from server.ts, run with a fake token verifier:
// no Firebase project, no network, no production data.
let verify: (token: string) => Promise<{ uid?: string; email?: string }>;
const verified: string[] = [];
const gateSource = server.slice(server.indexOf('const WA_CONSOLE_ALLOWED_UIDS'), server.indexOf('// Non-blocking variant'));
const waRequireConsoleAuth = new Function('admin', 'process', `${ts.transpile(gateSource, { target: ts.ScriptTarget.ES2022 })}\nreturn waRequireConsoleAuth;`)(
  { auth: () => ({ verifyIdToken: (token: string) => { verified.push(token); return verify(token); } }) },
  { env: {} },
);

function studioApp() {
  const app = express();
  new Function('app', 'waRequireConsoleAuth', GATE)(app, waRequireConsoleAuth);
  for (const { path } of studioRoutes) app.post(path, (_req, res) => { res.json({ reached: path }); });
  return app;
}

describe('smart-studio server gate', () => {
  beforeEach(() => { verified.length = 0; });

  it('is mounted before every studio route', () => {
    const gateAt = server.indexOf(GATE);
    expect(gateAt).toBeGreaterThan(-1);
    expect(studioRoutes.length).toBeGreaterThanOrEqual(10);
    expect(studioRoutes.filter((r) => r.index < gateAt)).toEqual([]);
  });

  it('rejects anonymous callers on every studio route', async () => {
    const app = studioApp();
    for (const { path } of studioRoutes) {
      const res = await request(app).post(path).send({ prompt: 'x' });
      expect(res.status, path).toBe(401);
    }
    expect(verified).toEqual([]);
  });

  it('rejects an invalid or expired session', async () => {
    verify = async () => { throw new Error('auth/id-token-expired'); };
    const res = await request(studioApp()).post('/api/smart-studio/generate').set('Authorization', 'Bearer stale').send({});
    expect(res.status).toBe(401);
  });

  it('rejects a signed-in account that is not an admin or partner', async () => {
    verify = async () => ({ uid: 'stranger', email: 'someone@example.com' });
    const res = await request(studioApp()).post('/api/smart-studio/generate-reel').set('Authorization', 'Bearer t').send({});
    expect(res.status).toBe(403);
  });

  it('lets admins and partners through to the studio', async () => {
    const app = studioApp();
    verify = async () => ({ uid: 'any', email: 'Volcanokw@gmail.com' });
    const admin = await request(app).post('/api/smart-studio/text-ideas').set('Authorization', 'Bearer a').send({});
    expect(admin.status).toBe(200);
    expect(admin.body).toEqual({ reached: '/api/smart-studio/text-ideas' });
    verify = async () => ({ uid: '2qUU5RXByXPkQASR1mJR9krryPd2', email: '' });
    const partner = await request(app).post('/api/smart-studio/generate').set('Authorization', 'Bearer p').send({});
    expect(partner.status).toBe(200);
  });
});

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return name === 'tests' ? [] : sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe('smart-studio client calls', () => {
  it('every studio request from the UI carries the signed-in token', () => {
    const calls: string[] = [];
    const unauthenticated: string[] = [];
    for (const file of sourceFiles('src')) {
      if (file.endsWith('demoAi.ts')) continue; // demo responder: matches paths, never calls the server
      const text = readFileSync(file, 'utf8');
      if (!text.includes('/api/smart-studio/')) continue;
      const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
      const visit = (node: ts.Node) => {
        if (ts.isStringLiteralLike(node) && node.text.startsWith('/api/smart-studio/')) {
          const call = node.parent;
          const where = `${file}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}`;
          const isFetch = ts.isCallExpression(call) && call.arguments[0] === node && /(^|\.)fetch$/.test(call.expression.getText());
          const options = isFetch ? call.arguments[1] : undefined;
          const headers = options && ts.isObjectLiteralExpression(options)
            ? options.properties.find((p) => p.name?.getText() === 'headers')
            : undefined;
          calls.push(where);
          if (!headers || !/\bapiAuthHeaders\(\)/.test(headers.getText())) unauthenticated.push(where);
        }
        ts.forEachChild(node, visit);
      };
      visit(source);
    }
    expect(calls.length).toBeGreaterThanOrEqual(14);
    expect(unauthenticated).toEqual([]);
  });
});

describe('apiAuthHeaders', () => {
  it('attaches the Firebase ID token of the signed-in user', async () => {
    authMock.currentUser = { getIdToken: async () => 'id-token' };
    expect(await apiAuthHeaders()).toEqual({ 'Content-Type': 'application/json', Authorization: 'Bearer id-token' });
  });

  it('sends plain JSON headers when nobody is signed in', async () => {
    authMock.currentUser = null;
    expect(await apiAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });

  it('never throws when the token refresh fails', async () => {
    authMock.currentUser = { getIdToken: () => Promise.reject(new Error('network')) };
    expect(await apiAuthHeaders()).toEqual({ 'Content-Type': 'application/json' });
  });
});
