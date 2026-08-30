import { describe, it, expect, vi } from 'vitest';
import { alertsRequireSecret } from '../../server';

describe('Authorization Middleware Rules (Production Logic)', () => {
  it('alertsRequireSecret should reject if secret does not match', () => {
    const req = { headers: { "x-admin-secret": "wrong_secret" }, query: {} };
    const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
    };
    const next = vi.fn();

    alertsRequireSecret(req, res, next);

    // Default test environment config sets it to something other than "wrong_secret"
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: "Forbidden" });
    expect(next).not.toHaveBeenCalled();
  });
});
