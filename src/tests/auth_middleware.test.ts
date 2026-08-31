import { describe, it, expect, vi } from 'vitest';
import { createAlertsRequireSecret } from '../lib/auth-helpers';

describe('Authorization Middleware Rules (Production Logic)', () => {

  it('alertsRequireSecret should reject if ADMIN_TEST_SECRET is unconfigured (empty)', () => {

    const req = { headers: { "x-admin-secret": "123456" }, query: {} };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    };
    const next = vi.fn();

    const alertsRequireSecret = createAlertsRequireSecret("");
    alertsRequireSecret(req, res, next);

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

    const alertsRequireSecret = createAlertsRequireSecret("production_secret");
    alertsRequireSecret(req, res, next);

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

    const alertsRequireSecret = createAlertsRequireSecret("production_secret");
    alertsRequireSecret(req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

});
