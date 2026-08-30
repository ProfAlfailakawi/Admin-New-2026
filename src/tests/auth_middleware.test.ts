
import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

// Load server.ts as a string to extract the real middleware logic
const serverPath = path.resolve(__dirname, '../../server.ts');
const serverContent = fs.readFileSync(serverPath, 'utf8');

const alertsRequireSecretMatch = serverContent.match(/function alertsRequireSecret[^\{]+\{([\s\S]*?)next\(\);\n  \}/);
let alertsRequireSecret: any;

if (alertsRequireSecretMatch) {
  const functionCode = alertsRequireSecretMatch[0]
      .replace(/req: any, res: any, next: any/, 'req, res, next')
      .replace(/export /, '');

  const functionBody = `
    const ALERTS_ADMIN_TEST_SECRET = envSecret;
    ${functionCode}
    return alertsRequireSecret(req, res, next);
  `;
  alertsRequireSecret = (req: any, res: any, next: any, envSecret: string) => {
      return new Function('req', 'res', 'next', 'envSecret', functionBody)(req, res, next, envSecret);
  };
} else {
  throw new Error("Could not find alertsRequireSecret in server.ts");
}

describe('Authorization Middleware Rules (Production Logic)', () => {

  it('alertsRequireSecret should reject if ADMIN_TEST_SECRET is unconfigured (empty)', () => {


    const req = { headers: { "x-admin-secret": "123456" }, query: {} };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    };
    const next = vi.fn();

    alertsRequireSecret(req, res, next, "");

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "ADMIN_TEST_SECRET is not configured on the server" });
    expect(next).not.toHaveBeenCalled();
  });

  it('alertsRequireSecret should reject if secret does not match', () => {



    const req = { headers: { "x-admin-secret": "wrong_secret" }, query: {} };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    };
    const next = vi.fn();

    alertsRequireSecret(req, res, next, "production_secret");

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it('alertsRequireSecret should call next if secret matches', () => {



    const req = { headers: { "x-admin-secret": "production_secret" }, query: {} };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    };
    const next = vi.fn();

    alertsRequireSecret(req, res, next, "production_secret");

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

});
